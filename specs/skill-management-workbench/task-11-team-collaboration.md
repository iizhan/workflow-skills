# TASK-11 多人协作、私有覆盖与公共基准治理协议

## 1. 文档状态

- 任务：`TASK-11`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`high`
- 前置任务：`TASK-01` 至 `TASK-10`
- 目标：定义个人私有迭代、项目公共基准、角色权限、冲突检测、量化择优、人工审核、灰度合并和公共版本回滚。

本任务以本地优先和 Git 协作为 MVP 前提，不假设应用已经有实时团队服务器、成员账号或跨设备强一致锁。

## 2. 协作模型

### 2.1 两层资产

个人私有层：

- 用户本地偏好、私有记忆、实验 Skill、试验 Workflow、未提交草稿；
- 默认只在本用户、本机或明确的项目私有范围生效；
- 不自动写入团队公共文件；
- 可导出为提案、补丁或待审核分支。

团队公共层：

- Git 中的项目 Workflow、共享 Skill、Project Profile 决策、阈值和公共模板；
- 经过验证、审核和合并后，成为团队基准；
- 共享变更有版本、来源、owner、影响和回滚记录。

SQLite、事件日志和个人本地覆盖不是团队公共真值。公共真值仍由项目 Git 和已确认项目文件决定。

### 2.2 不支持的假设

- 没有中心服务时，不能宣称实时知道所有成员最新状态；
- 没有分布式锁时，不能宣称两个客户端不会同时修改同一个文件；
- Git 未同步时，本地评分不能代表团队全局评分；
- 本地管理员身份不能自动等同于远程仓库管理员。

## 3. 公共基准与分支流程

推荐流程：

```text
public baseline on Git
  → create private/feature branch
  → local scan and Profile compatibility check
  → private draft / proposal
  → static + realistic validation
  → compare with baseline
  → reviewer approval
  → bounded trial
  → merge public baseline
  → notify/update other projects
```

任何公共 Skill/Workflow/Policy 修改必须绑定：

- source commit/base fingerprint；
- target project and module；
- proposal version；
- validation report；
- reviewer/owner；
- trial scope；
- rollback version。

## 4. 角色与权限

MVP 使用项目文件中的角色声明和本地审核记录；未来可由远程团队身份服务提供更强认证。

| 能力 | 只读成员 | 普通成员 | 审核者 | 管理员 |
| --- | --- | --- | --- | --- |
| 查看公共 Skill/Workflow/报告 | 允许 | 允许 | 允许 | 允许 |
| 使用公共能力 | 允许 | 允许 | 允许 | 允许 |
| 创建个人草稿 | 不允许/可配置 | 允许 | 允许 | 允许 |
| 修改本地私有覆盖 | 不允许 | 允许 | 允许 | 允许 |
| 提交公共变更提案 | 不允许 | 允许 | 允许 | 允许 |
| 审核公共合并 | 不允许 | 不允许 | 允许 | 允许 |
| 调整公共阈值/权限 | 不允许 | 不允许 | 按授权 | 允许 |
| 激活远程 Skill | 不允许 | 按授权 | 按授权 | 按授权 |
| 删除/撤销公共版本 | 不允许 | 不允许 | 不允许 | 允许 |
| 修改核心系统 Skill | 禁止 | 禁止 | 禁止 | 仅走发行升级 |

权限必须按动作、作用域和目标版本校验。记忆中的“管理员”“历史批准”不能作为当前权限凭证。

## 5. 私有覆盖规则

私有覆盖可以调整：

- 个人展示、语言和交付偏好；
- 本地实验版本；
- 未进入公共基准的 Skill/Workflow 草稿；
- 个人预算提醒和非治理性排序。

私有覆盖不得默认改变：

- 项目公共权限和安全门禁；
- 必须执行的验证、影响分析和回滚规则；
- 公共 Workflow 的输入输出契约；
- 远程供应链阻断；
- 核心系统 Skill。

当私有覆盖与公共基准冲突时，项目公共规则在共享任务中优先，私有覆盖可以显示为“不可应用/需提案”，不能静默覆盖。

## 6. 冲突检测

冲突识别至少比较：

- 同一稳定 Skill/Workflow/Policy ID；
- base commit、文件指纹和版本；
- 同一节点、边、触发条件、权限、输入输出和阈值；
- Profile 技术栈、角色和项目适配条件；
- 依赖、许可证、远程来源和安全阻断；
- memory/decision scope 和 owner。

冲突类型：

- `text_conflict`：同一文本区域不同修改；
- `semantic_conflict`：顺序、权限、条件、输出或安全含义变化；
- `policy_conflict`：改变项目门禁、预算、隐私或授权；
- `version_drift`：基准已在提案创建后变化；
- `scope_conflict`：目标项目/角色/适用范围不同；
- `evidence_conflict`：两版本证据时间、样本或来源不可比较。

文本差异可以自动展示；语义、策略、权限和证据冲突默认禁止自动合并。

## 7. 量化择优与人工审核

在**同一任务场景、相同项目 Profile、可比较样本和兼容权限**下，系统可以计算合并推荐分：

```text
recommendation_score =
  test_pass_rate * 60%
  + token_efficiency * 25%
  + compactness * 15%
```

约束：

- 任一指标没有足够有效证据时不得自动推荐为更优；
- `test_pass_rate` 优先使用精确测试结果；
- Token 能效遵守 TASK-07 来源、去重和置信度；
- 臃肿度遵守 TASK-07 的结构指标；
- 分数只产生“推荐候选”，不直接合并公共版本；
- 同分、场景不一致、策略/权限变化和高影响差异必须人工审核；
- 任何涉及安全、隐私、权限、确认门禁和数据迁移的冲突，禁止自动合并。

人工审核页必须逐字段显示：

- base、ours、theirs、candidate 四方差异；
- 冲突字段和影响范围；
- 三项指标、证据时间、样本和置信度；
- 选择某版本、手工编辑或拒绝的理由；
- 合并后的验证和回滚计划。

## 8. 公共版本晋级

```text
private draft
  → proposal
  → conflict check
  → reviewer review
  → validation
  → bounded project trial
  → public candidate
  → admin/owner approval
  → merge/tag
  → downstream compatibility check
```

公共版本必须：

- 有明确 owner 和维护责任；
- 有适用项目/角色/技术栈范围；
- 通过 Doctor、测试、质量、Token、臃肿和安全检查；
- 有旧版本保留和回滚；
- 记录哪些项目可以自动升级、哪些只能提示；
- 不携带私有记忆、用户路径、会话正文、Token 账单和秘密。

## 9. 公共记忆与项目 Profile 协作

- 项目 Profile 中的源事实可以随项目 Git 共享，但必须带证据路径和新鲜度；
- 项目共享决策必须有 owner、确认记录和失效条件；
- 用户私有记忆不能进入公共层，除非用户明确泛化并确认；
- 全局共享记忆必须符合 TASK-08 的 `global_shared` 条件；
- 共享记忆不能成为公共 Skill/Workflow 修改的隐式批准；
- 项目删除、解绑和迁移必须分别展示公共文件、私有覆盖、记忆和证据影响。

## 10. 并发与离线协作

离线状态下：

- 使用上次已同步的公共基准 fingerprint；
- 本地提案标记为 `base_stale_possible`；
- 不得把本地评分宣称为最新团队评分；
- 重新同步后执行三方差异和冲突检查；
- 公共文件冲突时保留本地草稿，不自动覆盖任一方。

没有远程协调服务时，Git merge/rebase/PR 是最终公共并发协调点。

## 11. 审计与可视化

协作日志记录：

- actor/owner（非秘密身份）；
- base fingerprint、分支/提交和目标版本；
- 私有草稿、公共提案、审核、试运行、合并、撤销和回滚；
- 冲突字段、择优分数和人工理由；
- 影响范围、验证结果和剩余风险。

界面提供：

- 私有/公共分层切换；
- 基准版本、当前本地版本和差异；
- 冲突列表和字段级详情；
- 提案状态、审核人、试运行指标和回滚入口；
- 项目/角色/Skill/Workflow 过滤。

## 12. 状态与错误码

协作状态：

- `private_draft`
- `proposal_open`
- `base_stale_possible`
- `conflict_detected`
- `review_required`
- `trial_ready`
- `trial_running`
- `public_candidate`
- `merged`
- `rejected`
- `rolled_back`
- `archived`

| 错误码 | 含义 | 推荐动作 |
| --- | --- | --- |
| `COLLAB_BASE_STALE` | 本地提案基于旧公共基准 | 同步并重新生成差异 |
| `COLLAB_SEMANTIC_CONFLICT` | 规则语义存在冲突 | 字段级人工审核 |
| `COLLAB_POLICY_CONFLICT` | 权限/安全/门禁冲突 | 阻止自动合并 |
| `COLLAB_EVIDENCE_NOT_COMPARABLE` | 两版本证据不可比较 | 补充同场景试验 |
| `COLLAB_PERMISSION_DENIED` | 当前角色无此操作权限 | 联系 owner/管理员 |
| `COLLAB_PRIVATE_OVERLAY_BLOCKED` | 私有覆盖影响公共强制规则 | 转为公共提案或调整范围 |
| `COLLAB_REVIEW_REQUIRED` | 需要人工审核 | 打开冲突详情 |
| `COLLAB_PUBLIC_ROLLBACK_REQUIRED` | 公共版本出现回归 | 恢复稳定版本 |

## 13. 对现有实现的影响

后续实现预计涉及：

- 增加公共基准 fingerprint、私有 overlay、角色和操作权限模型；
- 提案和 Bundle 增加 base version、owner、review、trial、merge 和 rollback 记录；
- 实现文本差异、结构差异、语义冲突和证据可比性检查；
- 将 60/25/15 推荐分接入 TASK-07，但只作为人工审核排序依据；
- 项目管理和 Skill/Workflow 详情展示私有/公共状态与冲突；
- 将 Git 分支/提交作为 MVP 公共协作入口；
- 未来团队服务接入时保留本地离线模式，不改变项目文件权威边界。

## 14. 验收标准

- [ ] 私有迭代默认不污染公共基准。
- [ ] 公共基准、私有覆盖、SQLite 投影和事件证据的权威边界清晰。
- [ ] 角色权限覆盖只读、私有编辑、提案、审核、合并、阈值和撤销。
- [ ] 基准漂移、文本冲突、语义冲突、策略冲突和证据冲突可区分。
- [ ] 测试 60%、Token 25%、臃肿 15%只用于同场景推荐排序，不自动合并核心规则。
- [ ] 安全、权限、隐私、门禁和迁移冲突强制人工审核。
- [ ] 公共版本合并前有验证、试运行、owner、适用范围和回滚版本。
- [ ] 离线/无中心服务时不会伪造团队最新状态或全局锁定能力。
- [ ] 审核、冲突、择优、合并和回滚均有证据和审计。
- [ ] 私有记忆不会未经确认进入公共 Skill/Workflow/Memory。

## 15. 不在本任务范围

- 不实现团队账号、远程权限服务和实时协同编辑。
- 不实现自动语义合并核心 Skill/Workflow。
- 不实现跨设备强一致预算或灰度，留给 TASK-12/未来服务。
- 不允许本地管理员绕过远程仓库保护规则。
- 不把推荐分当作最终审核结论。

## 16. 已确认决策

1. MVP 采用 Git 公共基准 + 本地私有覆盖，SQLite/事件只做本地投影和证据。
2. 只读、普通成员、审核者、管理员和核心系统 Skill 采用分级权限。
3. 私有变更先草稿/提案，公共合并经过冲突检查、验证、有限试运行和审核。
4. 同场景下使用测试 60%、Token 能效 25%、臃肿度 15%作为推荐排序，但不自动合并核心规则。
5. 权限、安全、隐私、门禁和迁移冲突一律人工审核。
6. 离线无中心服务时，不宣称团队实时状态、分布式锁或全局预算强制。

本任务已接受，多人协作、私有覆盖、公共基准、冲突审核和公共版本治理实现必须遵守以上协议。
