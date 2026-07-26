# TASK-04 初始化、Project Profile 与接入诊断

## 1. 文档状态

- 任务：`TASK-04`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`high`
- 前置任务：`TASK-01`、`TASK-02`、`TASK-03`
- 目标：定义项目绑定、授权、定向扫描、Workflow 应用、Project Profile 分析、接入验证、修正和日志的完整状态机与用户交互。

本任务先定义流程和数据契约，不立即修改现有项目文件、数据库或界面。

## 2. 产品原则

1. 一次只操作一个用户明确选择的项目目录。
2. 绑定、扫描、应用 Workflow、Profile 分析和监控授权是不同动作。
3. 扫描和诊断默认只读；需要写项目文件时必须进入 Preview-Confirm-Apply。
4. 项目没有 Skill、Profile 缺失或尚未触发 Skill 都不是程序异常，应提供明确下一步。
5. 接入成功不等于 Skill 已触发，必须遵守 TASK-03 的三维状态。
6. 项目文件中的 Profile 是可迁移真值，SQLite 只保存可重建投影和运行状态。

## 3. 标准用户流程

```text
点击“绑定项目”
→ 系统文件夹选择框
→ 显示已选择目录
→ 用户点击“扫描并绑定”
→ 只读接入诊断
→ 展示扫描结果和待处理事项
→ 如需写入，展示 Workflow/Profile 差异预览
→ 用户确认应用
→ 备份 Workflow 资产
→ 写入并验证
→ 生成或刷新 Project Profile
→ Doctor + Profile + Adapter 分项检查
→ 显示最终接入结果
```

选择目录后不能自动扫描；点击“扫描并绑定”即表示用户授权本次目录绑定和只读扫描，但不表示授权写入 Workflow 文件或开启后台监控。

## 4. 接入操作状态机

每次绑定、扫描、应用或修正都创建一个 `operation_id`，统一状态为：

```text
created
→ running
→ awaiting_confirmation
→ applying
→ verifying
→ succeeded | succeeded_with_warnings | failed | blocked | cancelled
```

操作下的步骤状态：

- `pending`
- `running`
- `succeeded`
- `warning`
- `failed`
- `blocked`
- `skipped`
- `cancelled`

每一步记录开始时间、结束时间、错误码、证据摘要、用户动作和下一步建议。

## 5. 项目接入快照

项目管理不再只依赖一个 `workflowApplied` 布尔值。建议形成可持久化快照：

```yaml
project_id: "project_..."
operation_id: "operation_..."
path: "/absolute/project/path"
authorization:
  scan: granted
  telemetry: disabled
  background_monitoring: disabled
scan:
  status: completed
  skills_found: 26
  workflow_markers: 5
workflow:
  status: ready
  version: "0.7.0"
profile:
  status: fresh
  evidence_count: 22
adapter:
  onboarding_status: installed
  connection_status: workspace_matched
  observation_status: no_skill_evidence
verification:
  doctor: passed
  profile: passed
  adapter: warning
updated_at: "..."
```

该快照是 UI 投影，可以从项目文件、扫描记录和 Adapter 事件重建，不替代项目文件真值。

## 6. 绑定与授权

### 6.1 文件夹选择

- 必须使用系统原生文件夹选择框。
- 选择后弹窗显示完整目录和默认项目显示名。
- 用户可以关闭弹窗，不产生绑定记录。
- 默认显示名来自文件夹名，后续可在项目详情修改。

### 6.2 扫描授权

- “扫描并绑定”只授权选中目录，不扩展到父目录或整台电脑。
- 已绑定项目的重扫和修正复用原授权。
- “检测并修正”不能静默新增其他扫描根目录。
- 项目解绑只停止管理和监控，不删除项目文件、Profile、记忆或历史证据；数据清理属于独立确认动作。

### 6.3 监控授权

- 后台监控默认关闭。
- 用户打开监控时单独确认监控来源、频率和存储范围。
- 关闭监控后停止后台刷新，但保留已有历史记录。

## 7. 只读接入诊断

扫描步骤按以下顺序执行：

1. 路径存在性和可读性。
2. TASK-02 项目身份清单和版本兼容性。
3. `AGENTS.md`、`CLAUDE.md` 和 Harness 入口状态。
4. `.agents/skills/*/SKILL.md` 数量、解析和版本。
5. Workflow marker、版本和 Doctor 兼容状态。
6. Project Profile 文件、状态和证据新鲜度。
7. 已授权 Adapter 事件源和目录匹配状态。
8. 文件冲突、未替换占位符和缺失依赖。

扫描结果必须分别展示：

- 已发现能力
- 已验证能力
- 需要用户确认的写入
- 尚未支持或没有证据的能力
- 错误和阻断项

## 8. Workflow 诊断与应用

### 8.1 Workflow 状态

- `missing`：没有完整 Workflow marker。
- `partial`：部分文件存在但不完整。
- `ready`：Doctor 和 marker 均通过。
- `upgrade_available`：当前版本可运行但有可选升级。
- `upgrade_required`：当前客户端不能安全写入。
- `conflicted`：已有文件与 Starter 冲突。
- `invalid`：关键文件损坏或无法解析。

### 8.2 Starter 预览

预览必须显示：

- 将创建的文件和目录
- 将保留的现有文件
- 将安全扩展的入口文件
- 冲突文件
- Workflow 版本
- Skill 数量
- Project Profile 是否会生成候选
- 备份范围
- 应用后验证步骤

已有 `AGENTS.md` 默认保留，仅在缺少 Workflow 路由时追加带稳定标记的入口；不得整文件覆盖。

### 8.3 应用事务

```text
文件指纹复检
→ 备份 Workflow 资产
→ 写临时文件
→ 原子替换/创建
→ 扫描 Skill
→ 运行 Doctor
→ 检查未替换占位符
→ 失败回滚或成功提交
```

应用 Workflow 后不自动宣称 Harness 已连接或 Skill 已调用。

## 9. Project Profile 生命周期

### 9.1 Profile 状态

- `missing`
- `analyzing`
- `candidate_ready`
- `fresh`
- `changed`
- `stale`
- `invalid`
- `blocked`

### 9.2 初次分析

Profile 初次分析只读取已授权项目目录，提取：

- 项目类型、技术栈、语言、框架和运行时
- 模块、入口、请求/事件链路和依赖边界
- 构建、测试、运行命令
- 数据库、缓存、消息和外部集成
- 代码规范、安全红线和交付约束
- 证据路径、未知项和置信度

分析结果先生成候选。若用户在“应用推荐 Workflow”预览中已经确认包含 Profile 写入，可直接保存；否则单独展示 Profile 差异并确认。

### 9.3 Profile 写入边界

- 源码支持的项目事实可以写入 Profile，不需要被当作用户偏好记忆再次确认。
- 无证据判断必须进入 `unknowns`，不能伪装成项目事实。
- 稳定项目决策写入 `decision-memory.yaml` 前仍需要明确确认。
- secrets、原始 `.env` 值和私有会话正文禁止写入。

### 9.4 增量刷新

- 新鲜度脚本比较架构相关证据指纹。
- 只刷新变化证据影响的模块或章节。
- 外部修改后显示变化路径和上次捕获时间。
- Profile 更新必须有差异预览，不能静默覆盖人工补充内容。

## 10. 接入验证

接入完成至少执行：

1. 项目身份和版本兼容检查。
2. Workflow Doctor。
3. Skill 数量和解析错误检查。
4. 未替换模板占位符检查。
5. Profile 状态与证据新鲜度检查。
6. Adapter 事件源可用性检查。
7. 当前或最近会话目录匹配检查。

结果分为：

- `ready`：Workflow 完整、Profile 新鲜、无阻断问题。
- `ready_waiting_session`：项目已就绪，但尚无匹配的 Harness 会话。
- `ready_waiting_skill`：目录已匹配，但没有 Skill 调用证据。
- `ready_with_warnings`：可使用，但 Profile/Adapter/遥测存在非阻断提醒。
- `action_required`：需要用户确认写入或授权。
- `blocked`：版本、冲突、权限或验证失败阻止继续。

“等待会话”和“等待 Skill”是正常等待态，不使用失败颜色。

## 11. 检测并修正

“检测并修正”必须是诊断计划，而不是一个不透明按钮。

流程：

1. 快速只读扫描当前项目。
2. 生成问题列表和影响范围。
3. 自动执行不写项目的安全检查。
4. 若只需刷新本地状态，直接完成并反馈结果。
5. 若需要写项目文件，停止在差异预览并等待确认。
6. 应用后逐项验证并记录成功、警告或失败。

修正按钮不得：

- 自动扫描全部历史会话日志
- 自动打开项目详情代替结果反馈
- 未经确认应用 Starter 或覆盖 Profile
- 长时间停留在“修正中”而没有步骤进度

建议步骤提示：

```text
1/5 检查项目身份与目录
2/5 扫描 Skill 和 Workflow
3/5 检查 Project Profile
4/5 检查 Harness 目录和事件源
5/5 汇总结果与下一步
```

## 12. 错误码与用户动作

| 错误码 | 含义 | 推荐动作 |
| --- | --- | --- |
| `PROJECT_PATH_MISSING` | 项目目录不存在 | 重新选择目录 |
| `PROJECT_PATH_UNREADABLE` | 目录不可读 | 检查权限 |
| `AUTHORIZATION_REQUIRED` | 当前目录未授权 | 重新确认绑定 |
| `PROJECT_ID_CONFLICT` | 项目身份重复 | 选择同项目或新副本 |
| `WORKFLOW_MISSING` | 未安装 Workflow | 预览推荐 Workflow |
| `WORKFLOW_CONFLICT` | 已有文件冲突 | 查看差异并人工处理 |
| `WORKFLOW_UPGRADE_REQUIRED` | 版本不能安全写入 | 先升级客户端或 Workflow |
| `PROFILE_MISSING` | 没有 Profile | 生成分析候选 |
| `PROFILE_STALE` | 证据发生变化 | 增量刷新 Profile |
| `PROFILE_INVALID` | Profile 无法解析 | 查看错误并恢复/重建 |
| `ADAPTER_SOURCE_UNAVAILABLE` | 没有可用事件源 | 配置 Adapter 或保持只读 |
| `WORKSPACE_MISMATCH` | Harness 目录不匹配 | 在目标目录新建/切换任务 |
| `SKILL_EVIDENCE_PENDING` | 尚无 Skill 调用证据 | 提交真实任务等待触发 |
| `WRITE_CONFLICT` | Preview 后文件变化 | 重新生成预览 |
| `VALIDATION_FAILED` | Doctor 或校验失败 | 查看失败步骤并回滚 |

`PROFILE_MISSING`、`WORKSPACE_MISMATCH` 和 `SKILL_EVIDENCE_PENDING` 可以是可恢复状态，不一律按程序异常处理。

## 13. 接入日志

接入日志必须持久化到 SQLite/事件日志，不只保存在前端 `localStorage`。

每条记录包含：

- `operation_id`
- `project_id`
- 阶段和步骤
- 状态和错误码
- 开始/结束时间
- 证据摘要
- 用户确认动作
- 关联备份、迁移或验证记录

日志支持按项目查看、导出和清理；默认不保存项目文件正文。

## 14. 对现有实现的影响

后续实现预计涉及：

- `managed_projects` 拆分接入、Workflow、Profile、Adapter 和观测状态。
- 新增项目操作与步骤日志表，替代仅存 `localStorage` 的接入日志。
- `scanProjectRoot` 不再在非绑定场景中隐式扩展授权。
- Starter Preview 增加身份清单、文件指纹、备份和 Profile 候选信息。
- Starter Apply 增加事务、Doctor、占位符检查和回滚结果。
- Project Profile Service 增加候选、增量刷新和差异预览。
- “检测并修正”改为快速诊断计划，连接检查不导入全部历史日志。
- 项目管理 UI 展示分项状态、步骤进度、错误码和下一步。

## 15. 验收标准

- [ ] 点击绑定项目一定出现系统文件夹选择框。
- [ ] 选择目录后不自动扫描，用户确认后才扫描并绑定。
- [ ] 扫描只作用于选中项目目录，不扩展到整台电脑。
- [ ] 无 Skill 项目会获得推荐 Workflow 预览，不会被静默写入。
- [ ] 已有 `AGENTS.md` 能保留并安全扩展，不被整文件覆盖。
- [ ] Workflow 应用后自动运行 Doctor、Skill 重扫和占位符检查。
- [ ] Project Profile 能生成候选、保存证据并判断 fresh/stale。
- [ ] 项目接入成功、等待会话、等待 Skill 和真正运行能够区分。
- [ ] 检测并修正有逐步反馈，写入动作停在确认预览。
- [ ] 接入日志重启应用后仍可查看。
- [ ] 解绑项目不会删除磁盘项目或隐式清理记忆。

## 16. 不在本任务范围

- 不实现全电脑扫描。
- 不实现任意 Workflow 执行引擎。
- 不自动开启 Codex/Claude Hooks 或 App Server。
- 不自动提交、推送或发布项目文件。
- 不在没有差异预览的情况下批量更新旧项目。
- 不实现记忆永久删除策略，留给 TASK-08。

## 17. 已确认决策

1. 绑定、扫描、应用 Workflow、Profile 分析和监控授权拆成独立动作。
2. “扫描并绑定”授权只读扫描，不自动授权项目写入。
3. 无 Workflow 时展示推荐预览，用户确认后才应用。
4. Profile 初次分析生成候选；写入必须包含在已确认的预览中。
5. 接入结果区分 ready、等待会话、等待 Skill、警告、待操作和阻断。
6. “检测并修正”先只读诊断，需要写入时停止等待确认。
7. 接入日志从 `localStorage` 迁移为持久化操作日志。
8. 解绑项目不等于删除项目文件、记忆和历史证据。

本任务已接受，后续初始化、Profile、接入诊断和修正实现必须遵守以上协议。
