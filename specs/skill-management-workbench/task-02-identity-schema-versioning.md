# TASK-02 稳定 ID、Schema、版本协商与迁移协议

## 1. 文档状态

- 任务：`TASK-02`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`high`
- 前置任务：`TASK-01`
- 目标：定义项目、Skill、Workflow、Harness、Profile、运行证据和本地数据库的稳定身份、版本兼容、并发写入、迁移、回滚和降级规则。

本任务是协议设计，不立即修改生产数据库或批量迁移用户项目。

## 2. 当前实现风险

当前 `managed_projects` 以本地数据库中的随机 ID 和路径唯一约束为主。路径移动、项目复制、数据库恢复或多客户端并行操作时，可能出现：

- 同一个项目被识别成两个项目。
- 项目复制后两个目录继续共用同一个身份。
- 旧客户端覆盖新客户端写入的 Profile 或 Workflow 文件。
- 数据库迁移成功但项目文件迁移失败，导致两边版本不一致。
- 预览生成后项目文件被其他进程修改，旧预览仍被应用。

## 3. 版本模型

不同版本含义必须分开，禁止用一个 `version` 字段混合所有协议。

| 版本字段 | 负责内容 | 示例 |
| --- | --- | --- |
| `format_version` | 项目控制清单的文件格式 | `1.0` |
| `db_schema_version` | Skill OS SQLite 表结构 | `3` |
| `workflow_version` | 项目本地 Workflow 语义和模板 | `0.7.0` |
| `adapter_protocol_version` | Harness 事件和能力协议 | `1.0` |
| `content_version` | Skill/Workflow 内容版本或指纹 | `sha256:...` |
| `client_version` | Skill OS 客户端版本 | `1.1.0` |

### 3.1 项目控制清单

在用户确认接入后，项目可生成轻量、可提交 Git 的：

`.skill-os/project.yaml`

建议最小字段：

```yaml
format_version: "1.0"
project_id: "project-..."
project_slug: "example-project"
workflow_version: "0.7.0"
default_harness: "codex"
supported_harnesses:
  - codex
schema_compatibility:
  min_reader_version: "1.0.0"
  min_writer_version: "1.1.0"
identity:
  origin_project_id: "project-..."
  lineage_kind: "original"
```

该文件只保存身份、版本、适配器和策略引用，不保存密钥、原始环境变量、Token 明细或运行正文。

## 4. 稳定身份规则

### 4.1 Project ID

- `project_id` 是项目身份，不是路径身份。
- 项目目录移动后，读取控制清单仍应保持同一个 `project_id`。
- 项目复制后若检测到相同 ID 但路径不同，必须提示用户选择“继续作为同一项目”或“创建项目副本”。
- 创建副本时生成新的 `project_id`，保留 `origin_project_id` 记录血缘。
- 没有控制清单的旧项目首次绑定时，可生成 ID；生成前必须提供预览，不能凭路径静默推断。

### 4.2 Skill ID

Skill 逻辑身份按以下优先级确定：

1. Skill 自身声明的稳定 ID。
2. Bundle manifest 或远程来源提供的稳定 ID。
3. 项目 ID、规范化相对路径和 canonical name 的组合指纹。

文件移动或重命名时，如果内容指纹和来源血缘高度匹配，标记为“可能移动”，不立即创建新 Skill。无法确认时保留两个记录并要求用户合并，不自动覆盖历史运行记录。

### 4.3 Workflow、Harness 与证据 ID

以下对象都必须具备独立 ID 和版本/指纹：

- `workflow_id` / `workflow_version`
- `adapter_id` / `adapter_protocol_version`
- `profile_snapshot_id`
- `run_id`
- `evidence_id`
- `migration_id`

`display_name`、本地路径和 UI 标签不能作为跨版本关联主键。

## 5. 兼容性协商

### 5.1 读取和写入能力

客户端打开项目时先读取 `schema_compatibility`：

| 情况 | 行为 |
| --- | --- |
| 当前版本满足最小读写要求 | 正常读写 |
| 可以读取但不满足最小写入版本 | 只读，显示升级入口 |
| 无法读取格式 | 阻止加载，提供备份、升级或导出 |
| 项目声明未知的未来字段 | 保留未知字段，不静默丢弃 |
| 版本和内容指纹矛盾 | 标记 `compatibility_conflict`，禁止写入 |

旧客户端不能因为“文件能打开”就继续写入不认识的字段。

### 5.2 Harness 兼容性

Harness Adapter 必须声明：

- 支持的入口文件
- 支持的 Skill 目录
- 能否提供精确运行事件
- Token 字段是否精确
- 能否提供写入前预览
- 是否支持目录/文件权限限制
- 当前 Adapter 协议版本

缺失能力必须显示为“未支持”或“推断”，不能伪装成已完成连接。

## 6. 迁移状态机

所有项目文件和 Skill OS 数据迁移统一使用以下状态：

```text
detected
→ backup_created
→ preflight_passed
→ shadow_migrating
→ validating
→ ready_to_commit
→ committed
```

失败路径：

```text
任何阶段失败
→ rollback_requested
→ rolled_back
```

不可自动恢复时：

```text
blocked
```

### 6.1 迁移要求

- 迁移前备份 `.skill-os`、`.specify`、`.agents`、`AGENTS.md`、`CLAUDE.md` 等 Workflow 资产。
- 默认不备份或修改业务代码，除非用户在目标预览中明确选择。
- 先写临时目录或影子副本，校验通过后再原子切换。
- 迁移必须幂等，重复执行不能重复生成记录或破坏历史版本。
- 迁移失败必须保留失败原因、迁移 ID、备份位置和恢复动作。
- 历史 `specs/<feature>/` 文件默认只读保留，不因新版本自动重写。

## 7. 并发写入与冲突

### 7.1 项目文件

每次 Preview 必须记录：

- 目标文件路径
- 目标文件内容哈希
- Profile/Workflow 基线指纹
- 生成预览的客户端和 Workflow 版本

Apply 前重新比较基线。发现项目文件已变化时：

1. 终止旧预览应用。
2. 显示“项目已发生变化”。
3. 重新扫描受影响文件。
4. 生成新的差异预览。

MVP 不对 `AGENTS.md`、Workflow 和权限规则做无提示三方自动合并。

### 7.2 Skill OS SQLite

- 使用事务和 WAL 保证本地原子写入。
- 迁移和批量导入使用单独事务。
- 事件写入必须支持幂等事件 ID，重复导入不重复计数。
- 并发写入遇到锁时有限重试，超时后返回可解释错误。
- 任何 destructive 操作都必须先写审计事件或进入 Preview 状态。

### 7.3 多客户端或多进程

同一项目的写入互斥以 `project_id` 为边界。Skill OS 使用本机应用数据目录中的项目锁，不在项目 Git 目录写入临时锁文件。

锁只保护短时 Apply/Migration 临界区，不允许长期占用，也不把锁当成团队远程协作机制。

## 8. 降级与回滚

| 场景 | 默认处理 |
| --- | --- |
| 新客户端打开旧项目 | 只读检查后提供增量升级预览 |
| 旧客户端打开新项目 | 满足读版本则只读，不满足则阻止加载 |
| Profile 迁移失败 | 恢复迁移前 Profile 和本地索引 |
| 数据库迁移失败 | 回滚事务并恢复迁移前数据库备份 |
| 项目文件被外部修改 | 丢弃旧 Preview，重新生成 |
| 项目复制导致 ID 冲突 | 提示选择同项目或新副本 |
| 备份校验失败 | 禁止恢复，保留原数据不动 |

任何降级都必须明确显示“当前数据是否已写入”和“下一步能做什么”。

## 9. 对现有实现的影响

后续实现预计涉及：

- `managed_projects` 增加稳定项目身份和控制清单状态。
- Registry 将路径唯一性与逻辑 Skill 身份分离。
- Profile 读取增加 `format_version`、快照指纹和冲突状态。
- Starter 生成控制清单时继续使用 Preview-Confirm-Apply。
- Database 增加显式迁移版本和迁移审计记录，而不是只依赖 `ensureColumn`。
- Telemetry 导入增加幂等事件 ID、Adapter ID 和协议版本。
- Backup/Restore 增加迁移前后版本和兼容性检查。
- Renderer 增加只读、冲突、迁移中、回滚完成等状态展示。

## 10. 验收标准

- [ ] 项目移动目录后仍能识别为同一个项目。
- [ ] 项目复制后能检测 ID 冲突并支持创建新副本。
- [ ] 旧客户端不会写入自己不理解的新字段。
- [ ] Preview 生成后项目文件变化会阻止旧预览应用。
- [ ] 迁移失败能够回滚，且重复迁移不会产生重复记录。
- [ ] 运行事件重复导入不会重复计算运行次数和 Token。
- [ ] 数据库迁移与项目文件迁移有明确的状态和审计记录。
- [ ] 备份恢复前能够检查客户端、Schema、Workflow 和 Adapter 兼容性。
- [ ] 方案不要求 MVP 引入远程数据库或中心化协作服务。

## 11. 不在本任务范围

- 不实现真正的远程团队锁和中心化权限。
- 不实现远程 Skill 下载和沙箱。
- 不修改业务项目的业务代码。
- 不在没有用户确认的情况下给现有项目生成控制清单。
- 不把路径变化、Skill 改名或内容相似自动当成确定的身份迁移。

## 12. 待用户确认项

1. 使用 `.skill-os/project.yaml` 作为轻量项目身份与版本清单。
2. Project ID 与路径解耦，项目移动保留身份，项目复制必须确认是否生成新 ID。
3. 使用 `format_version`、`db_schema_version`、`workflow_version`、`adapter_protocol_version` 分离版本语义。
4. 所有迁移采用备份、影子迁移、校验、原子切换和失败回滚。
5. Preview 应用前重新检查文件指纹，外部修改后必须重新生成预览。
6. MVP 不做 Workflow/权限文件的无提示自动合并。
7. 本地 SQLite 事件导入以幂等 ID 防止重复统计。

本任务已接受，后续身份、Schema、Adapter 和迁移实现必须遵守以上协议。
