# TASK-12 数据恢复、版本发布、灰度升级与 E2E 验收协议

## 1. 文档状态

- 任务：`TASK-12`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`critical`
- 前置任务：`TASK-01` 至 `TASK-11`
- 目标：定义桌面端数据备份与恢复、Schema/Workflow 迁移、客户端高低版本共存、灰度发布、失败回滚和全链路 E2E 验收。

本任务是当前方案的上线与恢复收口，不立即执行真实迁移、删除数据、发布安装包或切换用户项目。

## 2. 恢复对象与失败假设

需要分别保护和恢复：

- 用户项目文件和 Workflow/Skill 资产；
- `.skill-os/project.yaml`、Workflow 声明和 Project Profile；
- `.specify` 项目共享记忆、决策和任务工件；
- SQLite 数据库及迁移版本；
- JSONL 原始事件、归档、隔离和清理记录；
- 用户私有记忆、远程候选、Bundle 和导出包；
- 授权策略、已绑定项目清单和本地配置；
- App、DB、事件、Workflow、Adapter 和 Bundle 版本关联。

必须假设以下情况会发生：

- 应用升级中断、磁盘空间不足或进程崩溃；
- SQLite 迁移成功但投影/索引不完整；
- JSONL 事件行损坏或归档 checksum 不一致；
- 项目文件在 Preview 后被其他工具修改；
- 一部分成员使用新客户端、一部分使用旧客户端；
- 旧项目缺少新 Profile/Workflow 文件；
- 新规则灰度后出现错误、权限扩大或用户拒绝；
- 恢复备份版本与当前 Schema/Workflow 不兼容。

## 3. 版本兼容矩阵

以下版本必须独立记录：

| 版本维度 | 作用 | 不兼容时 |
| --- | --- | --- |
| App version | 桌面端代码和 UI | 阻止启动或回退 App |
| DB schema version | SQLite 表和投影 | 影子迁移/恢复旧 DB |
| Event schema version | JSONL 原始事件 | 保留原始事件，使用适配器重放 |
| Workflow schema/version | 项目流程定义 | 项目级 Preview/迁移 |
| Adapter protocol/version | Codex/Claude 事件和能力 | 降级为观测/引导 |
| Skill/Bundle version | 能力内容和依赖 | 保留旧版本或阻止激活 |
| Memory schema version | durable memory 格式 | 只允许向后兼容扩展 |

高低版本规则：

- 旧客户端遇到未知项目字段只能只读，不得覆盖写回；
- 新客户端读取旧数据先做影子迁移，验证通过后原子切换；
- 新客户端写入后旧客户端只能读取兼容部分，不能双向盲写同一文件；
- Git 冲突和版本漂移必须在写入前显示；
- 不因可选升级文件缺失把健康旧项目误报为失败项目。

## 4. 迁移协议

```text
detect versions
  → acquire project/app lock where possible
  → verify disk space and permissions
  → create backup manifest
  → build shadow migration
  → validate schema, references, checksums and projections
  → preview files/tables/records/compatibility impact
  → user or policy confirms
  → atomically switch active pointer
  → rebuild indexes/graph/analytics
  → run Doctor and E2E smoke
  → mark migrated or rollback
```

要求：

- 每个迁移有唯一 `migration_id`、源/目标版本、开始/结束时间和日志；
- 迁移前备份 Project Profile、记忆、事件、DB、Bundle 和配置；
- 影子迁移不改变源数据；
- 所有文件写入临时路径并校验 checksum 后原子替换；
- SQLite 使用事务和可恢复 migration marker；
- 失败时保留源版本可读，不留下“部分完成但显示成功”的状态；
- Graph、Metrics 和 Memory Index 都视为可重建投影，必要时从源数据重建。

## 5. 备份与恢复策略

### 5.1 备份类型

- `pre_write`：任何项目文件/规则/激活/迁移前；
- `pre_upgrade`：App、DB、Workflow 或 Starter 升级前；
- `scheduled_local`：用户配置的本地周期备份；
- `manual_export`：用户主动导出，便于迁移设备；
- `incident_snapshot`：发现数据损坏或回归时冻结现场。

备份 manifest 至少记录：

- backup/app/schema/event/workflow/memory 版本；
- 项目 ID、项目路径哈希和 Git/base fingerprint；
- 包含的数据域、文件数、字节数、checksum、创建时间；
- 排除的数据域和隐私原因；
- 关联操作、迁移和回滚 ID；
- 是否包含可选 raw content、私有记忆或远程候选。

### 5.2 恢复预览

恢复前必须展示：

- 当前与备份版本差异；
- 将替换/保留/合并的文件、表、事件和记忆；
- 数据丢失、评分变化、Graph/Index 重建影响；
- 项目文件 Git 未提交变化；
- 恢复后需要运行的 Doctor、迁移和 E2E 检查；
- 恢复失败的再次回退点。

恢复不是“点击按钮立即覆盖”。高风险恢复必须先创建当前现场备份，再经确认执行。

### 5.3 可用性目标

每个部署包/项目策略可以声明 RPO/RTO；没有配置时只显示“未定义”，不编造保证。桌面端默认优先保证：

- 原始项目文件可恢复；
- DB 可从事件/备份重建；
- 旧 Workflow/Skill 版本可回退；
- 恢复后的投影状态可验证。

## 6. 发布渠道与灰度

渠道：

- `development`：内部开发和自动化验证；
- `preview`：选定测试项目/用户；
- `stable`：通过发布门禁的正式版本；
- `rollback`：恢复上一稳定版本的紧急渠道。

灰度范围可以按 App、项目、Workflow 版本、Feature Flag、Harness Adapter 和用户选择控制。灰度配置必须有过期时间，不能永久停留在半启用状态。

发布前后：

```text
candidate build
  → artifact checksum/signature
  → static and dependency scan
  → migration shadow test
  → backup/restore test
  → preview-project E2E
  → selected-project rollout
  → monitor errors/latency/token/feedback
  → accept or rollback
  → stable release
```

灰度升级不得偷偷改变项目 Workflow active 版本。App 升级、Workflow 升级、远程 Skill 激活和记忆迁移分别展示。

## 7. E2E 验收主链

至少覆盖一个空项目、一个已有 Workflow 项目、一个有冲突的项目和一个有历史遥测的项目：

```text
launch app
  → choose one project folder
  → grant scoped authorization
  → scan and bind
  → show result/operation log
  → recommend Workflow for empty project
  → preview and apply with backup
  → run Doctor/Profile/Adapter checks
  → enable/disable monitoring
  → import or observe Harness telemetry
  → distinguish workspace/connection/Skill evidence
  → view project Skill/Workflow details
  → view Graph declared/observed/compare layers
  → view quality/token/bloat report
  → create memory candidate and confirm/reject
  → create evolution proposal and run validation
  → review remote candidate without execution
  → create private collaboration proposal
  → backup, restore preview and verify
  → produce Chinese delivery report
```

每个主链节点都必须有：

- 进入、进行中、成功、警告、失败、取消和阻断状态；
- 可读的下一步；
- operation/task ID；
- 证据或明确的未覆盖说明；
- 刷新/重试不会重复写入或重复计账。

## 8. 验收场景矩阵

| 场景 | 必须证明 |
| --- | --- |
| 空目录 | 推荐 Workflow 只预览，确认后才写入 |
| 已有 `AGENTS.md` | 原文件保留，入口扩展可追溯 |
| 目录不可读 | 明确授权/权限错误，不假装扫描完成 |
| 项目路径不匹配 | 显示 workspace mismatch 和修正动作 |
| 无 Skill 事件 | 显示等待 Skill 证据，不报连接失败 |
| Codex/Claude 双 Harness | Session、缓存、Token、适配器隔离 |
| 远程高风险候选 | inactive/review/block，不执行 |
| 私有规则与公共规则冲突 | 字段差异和人工审核 |
| DB/JSONL 损坏 | 保留上次快照，隔离坏数据并可恢复 |
| 升级中断 | 下次启动可继续或回到旧版本 |
| 新规则试运行回归 | 停止灰度并恢复旧版本 |
| 删除/解绑 | 不误删项目文件，清理范围需单独确认 |

## 9. 发布门禁

### 9.1 文档与契约

- TASK 文档状态、版本、前置依赖和验收项完整；
- event/schema/workflow/adapter/memory 版本兼容矩阵更新；
- 影响范围、迁移、隐私和回滚方案已记录。

### 9.2 自动验证

- `git diff --check`；
- 合约检查；
- typecheck/build/lint（项目已有项）；
- smoke/doctor/bootstrap；
- 单元和集成测试；
- 备份、恢复、迁移和重放测试；
- 远程候选恶意样例和许可证检查；
- 多项目/私有公共/冲突样例；
- UI self-test、截图和布局检查。

### 9.3 人工验证

- 真实选目录弹窗和单目录扫描；
- 绑定、扫描、应用、修正、监控和失败反馈；
- Graph 缩放、搜索、详情下探和声明/实跑区分；
- Token、预算、质量、臃肿和建议跳转；
- 记忆候选、冲突和显式删除；
- 远程 Skill 不执行的边界；
- 私有变更不会污染公共基准；
- 恢复后项目和应用可继续工作。

## 10. 失败、暂停与回滚

统一操作状态：

- `planned`
- `preflight`
- `backup_created`
- `migrating`
- `verifying`
- `trial_running`
- `awaiting_acceptance`
- `succeeded`
- `succeeded_with_warnings`
- `paused`
- `failed`
- `rollback_pending`
- `rolled_back`
- `blocked`

必须暂停/回滚的情况：

- 数据 checksum 或文件指纹不匹配；
- 权限/范围扩大；
- 迁移无法验证；
- 质量、Token、失败率或 UI 关键路径严重回归；
- 远程候选出现供应链阻断；
- 备份不可读取；
- 用户/管理员拒绝接受结果。

回滚要区分：

- App 版本回滚；
- DB Schema/Projection 回滚；
- 项目 Workflow/Skill 版本回滚；
- Feature Flag/灰度配置回滚；
- 远程候选撤销；
- 记忆/事件清理回滚（不能恢复已明确永久删除的内容，需依赖备份）。

## 11. 事故与诊断报告

每次失败/回滚输出中文报告：

- 发生时间、项目、版本、操作 ID；
- 失败阶段、错误码、用户可见影响；
- 已完成和未完成步骤；
- 保留的数据和可能丢失的数据；
- 使用的备份/恢复点；
- 诊断证据路径和隐私过滤状态；
- 是否影响其他项目/成员；
- 下一步、重试、回滚或人工处理；
- 剩余风险和未覆盖测试。

报告不包含 secrets、原始 Prompt、完整回复和未授权项目正文。

## 12. 状态与错误码

| 错误码 | 含义 | 推荐动作 |
| --- | --- | --- |
| `RECOVERY_BACKUP_REQUIRED` | 高风险操作尚未创建备份 | 创建并验证备份 |
| `RECOVERY_BACKUP_INVALID` | 备份缺字段、损坏或版本不支持 | 选择其他备份 |
| `MIGRATION_SHADOW_FAILED` | 影子迁移失败 | 保留旧版本并查看日志 |
| `MIGRATION_VERSION_CONFLICT` | App/DB/Workflow/Memory 版本不兼容 | 选择兼容路径 |
| `MIGRATION_PARTIAL_STATE` | 上次迁移中断 | 恢复 marker 或回滚 |
| `ROLLOUT_ARTIFACT_UNTRUSTED` | 发布包摘要/签名不匹配 | 停止发布 |
| `ROLLOUT_CANARY_REGRESSION` | 灰度指标触发停止条件 | 回滚灰度 |
| `E2E_REQUIRED_PATH_FAILED` | 核心主链验证失败 | 阻止 stable 发布 |
| `RECOVERY_RESTORE_CONFLICT` | 当前文件/数据在恢复前发生变化 | 生成差异并确认 |
| `RECOVERY_PROJECTION_REBUILD_FAILED` | Graph/Index/Metrics 重建失败 | 保留源数据并人工处理 |
| `ROLLBACK_INCOMPLETE` | 回滚未完成 | 保持 blocked，使用恢复点 |

## 13. 对现有实现的影响

后续实现预计涉及：

- 扩展 Backup Service manifest 和数据域选择，覆盖 Workflow、Memory、Profile、事件和版本矩阵；
- 增加 migration registry、shadow migration、marker、atomic switch 和 rollback 服务；
- 增加发布渠道、灰度配置、Feature Flag 和 rollout metrics；
- 将 UI self-test 从源契约逐步扩展到可点击真实路径，记录截图/报告；
- 将 TASK-10/11 的供应链和协作状态接入发布门禁；
- 统一操作日志、错误码、下一步和回滚状态；
- 增加空项目、已有项目、冲突项目、历史遥测项目的 E2E fixture；
- 发布前重建 Graph、Metrics、Memory Index 并验证与原始证据一致；
- 为旧客户端只读未知字段、旧项目可选升级和新旧版本共存增加测试。

## 14. 验收标准

- [ ] App、DB、事件、Workflow、Adapter、Bundle、Memory 版本独立记录并可判断兼容性。
- [ ] 高风险写入、迁移、恢复和发布前都有备份与可读 manifest。
- [ ] 迁移先影子执行、预览、确认，再原子切换；失败保留旧版本。
- [ ] 旧客户端不会覆盖未知字段或破坏新版本项目文件。
- [ ] 恢复前显示文件、数据、评分、Graph、Memory 和备份影响。
- [ ] 支持 development、preview、stable、rollback 渠道和有期限灰度。
- [ ] 空项目、已有项目、冲突项目、历史遥测项目均有 E2E 验收路径。
- [ ] 核心操作均有进行中、成功、警告、失败、暂停和回滚反馈。
- [ ] 发布门禁覆盖契约、构建、测试、迁移、恢复、隐私、供应链、协作和 UI 可见验证。
- [ ] E2E 失败阻止 stable 发布，不使用“构建成功”替代完整验收。
- [ ] 回滚可区分 App、DB、项目规则、灰度、远程候选和数据清理范围。
- [ ] 事故报告不泄露 secrets、原始 Prompt、完整回复和未授权项目正文。

## 15. 不在本任务范围

- 不实现云端备份、远程团队协调或集中式灾备服务。
- 不承诺未配置 RPO/RTO 的固定恢复时间和数据零丢失。
- 不自动删除用户项目文件、记忆或事件。
- 不把稳定发布标记为所有用户已升级，除非存在可验证的发布回执。
- 不替代 TASK-10 的远程内容安全扫描和 TASK-11 的公共版本审核。

## 16. 已确认决策

1. App、DB、事件、Workflow、Adapter、Bundle、Memory 分别维护版本和兼容矩阵。
2. 迁移采用备份、影子迁移、预览、确认、原子切换、验证、失败回滚。
3. 新旧客户端共存时旧客户端只读未知字段，禁止盲写新项目文件。
4. 恢复前必须展示替换/保留/合并范围、评分/Graph/Memory 影响和再次回退点。
5. 发布采用 development、preview、stable、rollback 渠道，灰度有范围、期限、指标和停止条件。
6. 空项目、已有项目、冲突项目、历史遥测项目都纳入 E2E 主链验收。
7. 构建成功不等于发布成功，迁移、恢复、隐私、供应链、协作和可见 UI 路径都必须通过门禁。
8. 回滚按 App、DB、项目规则、灰度、远程候选和数据清理分别处理，并保留事故证据。

本任务已接受，恢复、迁移、灰度发布、回滚和 E2E 验收实现必须遵守以上协议。
