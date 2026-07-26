# TASK-08 记忆分层、跨项目复用与生命周期治理协议

## 1. 文档状态

- 任务：`TASK-08`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`high`
- 前置任务：`TASK-01` 至 `TASK-07`
- 目标：定义会话、用户、项目、全局和 Agent 记忆的边界、候选确认、检索优先级、冲突处理、跨项目复用、过期归档和删除流程。

本任务只定义记忆治理协议，不立即把历史会话全部转成长期记忆，不自动跨项目复制记忆，也不把记忆当作权限或当前任务批准。

## 2. 当前问题

项目 Workflow 已经具备：

- `.specify/project-profile/` 的项目 Profile 和架构缓存；
- `.specify/project-profile/decision-memory.yaml` 的项目共享决策；
- `.specify/memory-store/` 的用户私有、团队共享、Agent 自身和任务会话空间；
- `index.json` 轻索引和 JSONL durable record；
- 记忆候选需用户确认、敏感信息禁止持久化的基本原则。

桌面端还缺少统一落地边界：

- 哪些内容属于可从源码重新分析的 Profile，哪些内容才值得记忆；
- 项目 A 的记忆能否被项目 B 读取；
- 全局公共记忆如何判断适配当前项目；
- 解绑、删除、源文件变更和用户纠正后如何停用旧记忆；
- 多条记忆冲突时谁优先、是否自动覆盖；
- 会话历史、验证证据、用户偏好和工程决策的保存期限不同，不能共用一个永久缓存。

## 3. 记忆与 Profile 的边界

### 3.1 Project Profile 不是普通记忆

以下内容如果能由项目源码、配置、构建文件和测试命令重复验证，应写入 Project Profile，而不是复制到一般记忆：

- 技术栈、框架、运行时和包管理器；
- 模块、入口、请求/事件链路和数据边界；
- 构建、测试、运行命令；
- 工程目录和源代码中的规范事实；
- 证据指纹、未知项和新鲜度。

Profile 是项目事实缓存，源代码优先，证据变化时增量刷新。Profile 事实可以在没有重复用户确认的情况下刷新，但不能包含 secrets、原始环境值、完整会话正文或未经证实的推断。

### 3.2 Durable Memory 的适用内容

只有无法安全、低成本地从当前项目重新推导，且未来复用确实有价值的内容才进入 durable memory：

- 用户稳定的沟通、界面和交付偏好；
- 项目已确认但不直接存在于源码中的产品/工程决策；
- 多次验证有效的开发流程习惯；
- 会话结束后的摘要、选择理由和后续事项；
- 需要跨任务复用的领域词汇、团队约定和故障处理经验。

同一事实已经在 Profile 或项目源文件中存在时，记忆只保存指向和复用理由，不复制一份可能过期的正文。

## 4. 记忆空间模型

逻辑上分为六类，兼容现有 `user_private`、`team_shared`、`agent_self`、`task_session` 四类存储：

| 空间 | 读取者 | 典型内容 | 默认是否跨项目 |
| --- | --- | --- | --- |
| `task_session` | 当前任务参与者 | 当前需求、事项、影响、选择、证据、交接 | 否，任务结束归档 |
| `user_private` | 已识别的当前用户 | 语言、UI 密度、沟通风格、个人工作偏好 | 仅经兼容性检查后可复用 |
| `project_shared` | 当前项目协作者 | 项目决策、产品事实、团队约定、项目术语 | 否 |
| `global_shared` | 明确允许的项目/团队 | 通用工程流程、公共 Skill 使用原则、通用检查规则 | 是，但需适配条件 |
| `agent_self` | Workflow/Skill 维护者 | 已确认的过程学习、失败模式、改进策略 | 可复用，但不能覆盖项目规则 |
| `project_profile` | 当前项目流程 | 源码可验证的技术栈、架构和命令 | 只属于当前项目 |

兼容规则：

- `project_shared` 可映射到现有 `team_shared`，但必须带 `project_id`/`scope_ref`；
- `global_shared` 是不带项目绑定的受控 `team_shared`，必须带 owner、来源和适配条件；
- `project_profile` 不进入一般 memory JSONL，继续由 `.specify/project-profile/` 管理；
- SQLite 只保存检索投影、状态和统计，不能成为项目共享记忆的唯一真值。

## 5. 数据角色与禁止持久化内容

每个候选必须先标记 `data_role`：

- `identity_context`
- `user_preference`
- `account_reference`
- `infrastructure_reference`
- `development_workflow`
- `project_fact`
- `governance_decision`
- `verification_evidence`
- `blocked_sensitive`

以下内容默认进入 `blocked_sensitive`，不保存正文：

- API Key、密码、Token、Cookie、OTP、Authorization header；
- 原始 `.env` 值、私有密钥、凭证文件内容；
- 私人或第三方的敏感信息；
- 没有证据的个人推断、心理判断和身份猜测；
- 不具备复用价值的单次调试输出和临时路径；
- 完整 Prompt、模型回复和项目文件正文，除非 TASK-05 的单独授权明确开启。

路径、账号和环境信息默认使用项目相对路径、稳定哈希或非敏感标签。不能因为内容被写入记忆，就绕过 TASK-05 的隐私授权。

## 6. 候选、确认与写入门禁

### 6.1 候选生成

记忆候选由会话反思、用户反馈、Workflow 结果、Profile 差异和重复行为产生，但先进入候选，不直接写 durable memory：

```yaml
memory_candidate:
  id: "memcand_..."
  space: "project_shared"
  project_id: "project_..."
  data_role: "development_workflow"
  type: "behavior_pattern"
  summary: "本项目的后端修改先走契约检查，再运行集成测试"
  content_ref: "candidate://..."
  source_refs: ["event_...", "session_..."]
  reason: "在三次已验收任务中重复出现"
  confidence: "high"
  retention: "persistent_until_superseded"
  retrieval_mode: "exact_lookup"
  compatible_projects: ["project_..."]
  activation_conditions: ["backend_change", "project_profile.stack includes spring"]
  invalidation_conditions: ["project decision superseded", "profile contradicts"]
  privacy_risk: "low"
  status: "pending_confirm"
```

### 6.2 自动候选与显式要求

- 用户明确说“记住这个”时，可以直接生成候选，但仍需展示作用域、保存内容、期限和跨项目范围；
- 系统从行为推断时，默认至少需要三次相似行为、无反向纠正、结果被用户接受或验证通过；
- 单次行为不得自动变成跨项目长期记忆；
- 用户拒绝或修改候选时，只保留任务会话反馈，不得把拒绝内容写入长期记忆作为事实；
- 任何 `user_private`、`project_shared`、`global_shared`、`agent_self` durable write 都需要用户或明确 owner 确认；
- Profile 源码事实刷新不属于 durable memory write，但必须保留证据和新鲜度。

### 6.3 写入原子性

确认后的写入流程：

```text
recheck candidate sources
  → check conflict and current project fingerprint
  → preview exact record and scope
  → write immutable version
  → update index projection
  → record confirmation/audit event
  → mark previous record superseded when applicable
```

如果候选来源在确认前发生变化，必须回到预览，不得沿用旧批准。

## 7. 检索与加载规则

### 7.1 优先级

当前任务执行时按以下优先级解释上下文：

1. 当前用户明确指令；
2. 项目源代码、配置和实时验证结果；
3. 当前项目 Profile；
4. 当前项目已确认决策和项目共享记忆；
5. 已明确适配的全局共享记忆；
6. 当前用户私有偏好；
7. Agent 自身流程建议；
8. 推断或低置信度旧记录。

任何记忆都不能覆盖当前用户明确指令、安全边界、项目源事实或本次权限/确认门禁。

### 7.2 轻索引优先

每次会话不扫描全部记忆正文：

1. 读取当前任务状态和已选项目；
2. 读取项目 Profile 新鲜度；
3. 读取 memory index 的摘要、scope、tags、更新时间和适配条件；
4. 只加载匹配的少量记录，默认 3-8 条摘要；
5. 需要正文时按 record ID 和路径精确读取。

如果 Profile 新鲜且当前任务模块已覆盖，不重新读取整个工程。只有证据指纹变化、模块未知或记忆冲突时才做增量分析。

### 7.3 记忆加载不是权限

加载一条记忆不能自动授权：

- 读取项目文件；
- 修改 Workflow/Skill；
- 删除数据；
- 远程下载、发布、推送或部署；
- 扩大扫描目录；
- 通过 Harness 启动任务。

记忆只可预填建议和上下文，真正动作仍走对应的 Preview-Confirm-Apply 或 Harness 门禁。

## 8. 跨项目复用规则

### 8.1 默认隔离

- 项目级记忆只能被同一个 `project_id` 读取；
- 一个项目解绑后，其项目记忆默认停止检索；
- 不允许因为用户同时绑定了 A、B 两个项目就自动合并记忆；
- 运行证据、项目路径、架构细节和项目决策不能直接跨项目复制。

### 8.2 允许跨项目的内容

只有以下类别可以申请全局复用：

- 用户语言和界面显示偏好；
- 通用开发流程偏好，如先测试、先评审、视觉 QA；
- 不依赖具体技术栈的通用质量检查原则；
- 已脱敏、已泛化、明确有 owner 的团队规范。

跨项目记录必须带：

- `reuse_scope: global`；
- 适配条件，如角色、技术栈、Harness、Workflow 版本；
- 禁止适用的项目类型；
- 来源、owner、确认时间；
- 失效条件。

### 8.3 复用前适配检查

加载全局记忆前检查：

1. 当前项目是否允许读取该全局空间；
2. 当前 Profile 是否满足技术栈/角色/模块条件；
3. 当前项目是否存在更高优先级的冲突决策；
4. 记录是否过期、被撤销或证据不足；
5. 是否可能将个人偏好误当成项目规范。

不满足条件时只显示“存在未适配的全局记忆”，不加载其内容，也不报成项目错误。

## 9. 冲突与纠正

### 9.1 冲突优先级

- 当前用户明确纠正优先于旧用户私有记忆；
- 项目源代码/配置优先于 Profile 旧缓存和记忆推断；
- 新的有来源项目决策优先于旧项目决策；
- 团队规范不能被个人私有偏好覆盖；
- 低置信度推断不能覆盖已确认决策。

### 9.2 处理流程

```text
detect conflict
  → show both records and source evidence
  → classify safe presentation conflict vs behavior-changing conflict
  → keep current source truth active
  → ask user/owner when behavior would change
  → create new version or supersede old record
  → archive weaker record with reason
```

安全的展示偏好冲突可以按当前用户指令临时处理；会改变工程行为、权限、数据访问、发布或 Workflow 路由的冲突必须暂停确认。

不允许静默覆盖旧记忆、不允许把“最近使用”当成“用户确认”。

## 10. 生命周期、归档与忘记

### 10.1 默认期限

| 内容 | 默认策略 |
| --- | --- |
| `task_session` | 功能关闭前有效，关闭后归档 |
| 用户语言/UI/沟通偏好 | 30 天未复用则降为 inactive；重新确认或成功复用可刷新 |
| 项目决策和团队事实 | 持久保存，直到被新来源 supersede |
| 全局共享流程偏好 | 持久保存，直到 owner 撤销或适配条件失效 |
| Agent 自身学习 | 用户确认后持久保存，未确认只留候选 |
| 验证证据和临时路径 | 通常保留到任务结束，随后归档 |

“归档”表示默认不加载，不代表已经删除。期限可以由项目/用户策略调整，但必须可见。

### 10.2 项目解绑和删除

项目解绑只执行：

- 停止项目记忆的默认检索；
- 标记项目相关记录为 `inactive_unbound`；
- 保留记录的来源和版本，方便恢复绑定；
- 在项目管理中显示仍有多少记忆、证据和备份关联。

默认进入 30 天隔离归档期。隔离期后：

- 若用户开启自动清理策略，按预览结果清理项目记忆索引和正文；
- 若未开启自动清理，继续保留归档，不自动永久删除；
- 永久删除必须使用独立的清理流程，并说明备份是否仍保留副本。

这与 TASK-04 的“解绑不删除项目文件、记忆和历史证据”一致。

### 10.3 显式忘记

用户请求“忘记/删除”时进入独立流程：

```text
select exact records or scope
  → show content class, projects, copies, backups and impact
  → optional export
  → user confirms destructive action
  → purge source record and index
  → handle archive/backup separately
  → write cleanup audit without retaining deleted content
```

删除一条记录不删除其项目源文件，也不自动删除相关证据事件；证据清理继续遵守 TASK-05。

## 11. 存储与版本

建议的权威存储：

- `task_session`：项目 `specs/<feature>/workflow-state.yaml`；
- `project_profile`：项目 `.specify/project-profile/`；
- `project_shared`：项目 `.specify/project-profile/decision-memory.yaml` 或带项目 scope 的 memory JSONL；
- `global_shared`：应用级受控 shared memory store；
- `user_private`：按用户身份隔离的应用本地 store；
- `agent_self`：应用级 agent store；
- SQLite：上述内容的检索、冲突、使用次数和状态投影。

每条 durable record 至少需要：

- 稳定 `id`、`version`、`scope`、`scope_ref`、`owner_id`；
- `project_id` 或 `compatible_projects`；
- `data_role`、`type`、摘要和内容引用；
- 来源事件/文件引用、置信度、确认记录；
- retention、expires、last_used、activation/invalidation conditions；
- `status`、`supersedes`、`superseded_by` 和隐私等级。

Memory schema minor 版本只能向后兼容增加字段。索引可重建，durable 正文不能被 Starter 升级静默覆盖。

## 12. 评估与记忆质量

记忆质量不等于被加载次数。应观察：

- 来源是否可追溯；
- 是否仍与当前 Profile 一致；
- 被复用后是否减少重复分析或返工；
- 用户是否纠正、拒绝或绕过；
- 是否与其他记忆冲突；
- 是否产生错误的跨项目影响。

系统可以生成“记忆质量/淘汰建议”，但不能仅因长时间未使用就删除用户未授权删除的内容。错误记忆先降级、停用或生成修正候选，再根据确认结果归档或删除。

## 13. 状态与错误码

记忆状态：

- `candidate`
- `pending_confirm`
- `active`
- `inactive_unbound`
- `stale`
- `conflicted`
- `superseded`
- `archived`
- `revoked`
- `purge_pending`
- `purged`
- `blocked_sensitive`

| 错误码 | 含义 | 推荐动作 |
| --- | --- | --- |
| `MEMORY_SCOPE_DENIED` | 当前项目/用户无权读取该空间 | 检查作用域和身份 |
| `MEMORY_IDENTITY_UNAVAILABLE` | 无法识别用户身份 | 保持任务会话级或请求选择身份 |
| `MEMORY_SOURCE_MISSING` | 来源项目/证据已不存在 | 标记 stale，不直接当事实 |
| `MEMORY_PROFILE_CONFLICT` | 记忆与当前 Profile/源码冲突 | 显示差异并确认 |
| `MEMORY_DUPLICATE_CANDIDATE` | 候选与已有记录重复 | 合并预览或拒绝新增 |
| `MEMORY_CROSS_PROJECT_BLOCKED` | 项目级记忆不允许跨项目加载 | 只使用当前项目或申请泛化 |
| `MEMORY_CONFIRMATION_REQUIRED` | durable write 缺少确认 | 展示候选并等待确认 |
| `MEMORY_SENSITIVE_BLOCKED` | 包含禁止持久化敏感内容 | 脱敏或保持会话级 |
| `MEMORY_CONFLICT_REVIEW_REQUIRED` | 记忆会改变工程行为且存在冲突 | 暂停并让 owner/用户裁决 |
| `MEMORY_PURGE_CONFIRMATION_REQUIRED` | 删除范围未确认 | 重新生成清理预览 |
| `MEMORY_INDEX_REBUILD_REQUIRED` | 索引与正文不一致 | 从权威 JSONL 重建索引 |

## 14. 对现有实现的影响

后续实现预计涉及：

- 增加统一 Memory Service、候选管理、检索和冲突预览；
- 扩展现有 memory record schema，增加 `project_id/scope_ref`、兼容条件和确认审计；
- 将 Project Profile、Decision Memory 和 durable memory 的读取入口分开；
- 在桌面端提供“建议记忆 / 不应记忆 / 已确认 / 冲突 / 归档”视图；
- 在项目详情显示项目记忆数量、来源、新鲜度和解绑状态；
- 记忆加载先读 index，再精确读取少量正文；
- 实现跨项目复用前的兼容性检查和权限隔离；
- 将显式忘记接入 TASK-05 的预览、清理和审计能力；
- 将重复流程学习转交 TASK-09 Evolution，而不是直接写 Agent/Skill/Workflow；
- 为旧项目保留现有 `.specify` memory 文件，升级只增量增加字段和索引。

## 15. 验收标准

- [ ] Project Profile、项目决策、用户私有记忆、全局共享记忆和 Agent 自身学习不会混为一个默认上下文。
- [ ] 单次行为不会自动生成跨项目长期记忆；显式“记住”也必须展示作用域、期限和内容后确认。
- [ ] 用户身份不可识别时，用户私有记忆不会跨用户混用。
- [ ] 项目级记忆默认只能在同一 `project_id` 下检索。
- [ ] 全局共享记忆具有 owner、来源、适配条件、失效条件和跨项目授权范围。
- [ ] 记忆加载遵循当前指令、源码/Profile、项目决策、全局记忆、用户偏好和 Agent 建议的优先级。
- [ ] 记忆不能作为权限、删除、发布、推送、部署或当前任务验收批准。
- [ ] 记忆候选展示来源、理由、置信度、隐私风险、期限和检索方式。
- [ ] 记忆与 Profile/源码冲突时不会静默覆盖，必须显示差异并按规则处理。
- [ ] 解绑项目只停止默认检索并进入隔离归档，不删除项目文件、证据或记忆正文。
- [ ] 显式忘记支持范围预览、确认、索引/正文清理和备份影响说明。
- [ ] 默认只读取索引和少量命中记录，不全量扫描所有记忆正文。
- [ ] Starter 升级不会静默覆盖 durable memory 正文。
- [ ] 敏感候选被阻止，原始 Prompt/回复/环境密钥不进入默认记忆。

## 16. 不在本任务范围

- 不实现跨设备实时同步和团队中心化权限服务。
- 不把所有历史会话自动转成长效记忆。
- 不定义 Workflow/Skill 规则自动进化，留给 TASK-09。
- 不定义远程 Skill/记忆供应链，留给 TASK-10。
- 不实现多人记忆冲突仲裁服务，留给 TASK-11。
- 不替代 TASK-05 的原始证据留存、清理和隐私策略。
- 不把项目 Profile 当作用户可随意修改的个人偏好缓存。

## 17. 已确认决策

1. Project Profile 负责可从源码验证的项目事实，Durable Memory 只保存不可轻易重建且有复用价值的上下文。
2. 记忆空间拆为任务会话、用户私有、项目共享、全局共享、Agent 自身和项目 Profile，并保持作用域隔离。
3. 长期记忆默认需要候选展示和用户/owner 确认；隐式行为至少重复三次且结果被接受后才具备高质量候选资格。
4. 默认检索只读取索引和 3-8 条匹配摘要，不全量扫描记忆正文。
5. 项目记忆默认不跨项目；全局共享记忆只有在适配条件和授权范围满足时才复用。
6. 当前用户、源码/Profile、项目决策优先于旧记忆；冲突会显示差异并暂停高风险行为。
7. 解绑只停用默认检索并进入 30 天隔离归档；永久删除需要独立预览确认，未开启自动清理时不自动清除。
8. 记忆不能替代权限、范围、删除、发布、推送、部署和验收确认。

本任务已接受，记忆分层、候选确认、检索、跨项目复用、冲突、归档和清理实现必须遵守以上协议。
