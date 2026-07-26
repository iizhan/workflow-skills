# TASK-09 Skill / Workflow 进化治理、灰度验证与回滚协议

## 1. 文档状态

- 任务：`TASK-09`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`high`
- 前置任务：`TASK-01` 至 `TASK-08`
- 目标：定义反馈和运行证据如何形成规则变更候选，如何选择最小晋级层级，如何生成草稿、评审、灰度验证、正式发布、回滚和淘汰。

本任务中的“自愈/进化”是受控改进，不是应用静默改写自己的 Skill、Workflow、模板或宪法规则。

## 2. 当前基础与缺口

`project-engineering-workflow` 已经具备：

- `session_reflections`、`rule_change_candidates` 和 `evolution_updates`；
- `session → memory_policy → skill_rule → workflow_rule → constitution_rule → template_rule` 的晋级阶梯；
- `rule-change-proposal.md` 草稿协议；
- `[auto]`、`[inferred]`、`[needs confirmation]` 预填标记；
- Doctor、Smoke、真实任务验证和回滚要求。

桌面端目前主要有 `optimization_proposals`，仍缺少：

- 优化建议与正式规则进化候选之间的边界；
- 用户显性/隐性反馈的置信度和误判保护；
- 规则版本、草稿差异、作用范围、试运行组和对照指标；
- 真实任务失败时优先修复当前任务，而不是用“以后改 Skill”代替交付；
- 灰度验证成功/失败标准和已授权自动回滚边界；
- 新规则对旧项目、其他角色 Workflow 和历史版本的兼容策略。

## 3. 核心原则

1. **先修任务，再谈进化**：当前任务仍错误或不完整时，先修正并验证任务结果。
2. **一次反馈不是全局规则**：弱信号先留在会话或记忆层，不直接改 Skill/Workflow。
3. **最小晋级**：能改一个 reference，就不改整个 Skill；能改项目 Skill，就不改全局模板。
4. **证据优先**：每个候选必须能追溯到反馈、测试、评审、运行或质量证据。
5. **草稿不等于批准**：自动预填可以节省工作，但不能替代用户确认。
6. **试运行不等于正式发布**：灰度结果通过且获得接受后，才能晋级 active。
7. **可回滚优先**：没有明确回滚路径的规则变更不能进入试运行。
8. **不以减少步骤为唯一目标**：减少确认、Token 或时长不能牺牲权限、安全、范围和验证质量。

## 4. 反馈与观察信号

### 4.1 强信号

- 用户明确纠正：“不对”“重新来”“这里应该先确认”“没有验证”；
- 用户明确认可某个新流程并要求后续复用；
- 代码评审发现真实缺陷或安全问题；
- 自动化测试、Doctor、Smoke、契约或 UI 真实操作失败；
- 任务验收被拒绝或同一问题造成明显返工；
- 误用权限、范围扩张、数据风险、伪造验证等高影响事故。

### 4.2 中等信号

- 同类问题在两个以上任务/会话重复；
- 同一个 workaround 多次成功；
- 质量报告持续出现相同高/中级建议；
- Workflow 声明与实跑多次出现相同偏差；
- Token、失败率或人工修改量持续异常。

### 4.3 弱信号

- 用户没有回复；
- 用户没有手动修改输出；
- 用户跳过某一步但没有解释；
- 一次运行时间较长；
- 文本相似或模型推断的情绪。

弱信号只能生成低置信度观察，不得直接被解释为正/负反馈或触发规则改写。

## 5. 触发门槛与置信度

候选置信度：

| 级别 | 条件 | 默认处理 |
| --- | --- | --- |
| `low` | 单次弱信号或无明确结果 | 只留 `session` 观察 |
| `medium` | 两个独立信号，或一个有具体测试/评审证据的问题 | 可生成项目级候选草稿 |
| `high` | 三次以上跨会话重复、跨项目重复，或一个高影响且证据明确的事故 | 可建议 Skill/Workflow/治理层晋级 |

规则：

- 一个高影响安全/权限/伪验证事故可以直接生成高优先级候选，但仍不能自动应用；
- 同一事件被多个派生指标引用时只能算一个独立信号；
- 归档、重复或低资格证据遵守 TASK-05，不进入自动晋级判断；
- 用户明确说“这是一次特殊情况”时，候选必须降级为 session 或短期记忆。

## 6. 进化与记忆、优化建议的边界

| 类型 | 适用情况 | 输出 |
| --- | --- | --- |
| Task 修复 | 当前交付不正确 | 修复当前 ITEM/TASK 并重新验证 |
| Session Reflection | 一次任务经验 | `workflow-state.yaml` 反思 |
| Durable Memory | 稳定偏好、事实、选择理由 | TASK-08 记忆候选 |
| Optimization Proposal | Token、延迟、失败、臃肿等可量化问题 | 优化建议/修复草稿 |
| Evolution Proposal | 需要改变 Skill、Workflow、Policy、Template 或 Constitution | 规则变更提案 |

现有 `optimization_proposals` 可以成为 Evolution Proposal 的证据，但不能自动升级为规则变更。一个高 Token Skill 可能需要内容优化，也可能只是任务复杂，必须先分析影响和反例。

## 7. 最小晋级阶梯

### 7.1 晋级层级

1. `session`
   - 仅当前任务的反思、提醒和临时 workaround。
2. `memory_policy`
   - 调整记忆分类、期限、检索、确认或冲突规则。
3. `skill_reference`
   - 在一个 Skill 的 reference 中补充细节，不扩大主入口。
4. `skill_rule`
   - 修改一个项目级 Skill 的触发、步骤、门禁或输出。
5. `workflow_rule`
   - 修改多个 Skill 的顺序、路由、确认或 Workflow 定义。
6. `constitution_rule`
   - 修改权限、范围、安全、数据、确认或发布等顶层治理。
7. `template_rule`
   - 修改 Starter、模板、CLI、Doctor、默认 Workflow 或全局发行资产。

`skill_reference` 作为现有阶梯的细化层，用于防止所有问题都塞进 `SKILL.md` 主文件。

### 7.2 选择规则

- 一次特殊场景保持 session；
- 用户个人偏好优先进入 TASK-08，不直接变项目规则；
- 项目特有问题优先改项目本地 Skill/Workflow；
- 只有跨项目重复且已泛化，才建议模板或全局规则；
- 能调整现有 Skill 就不新建 Skill；
- 能增加 reference 就不扩张主 Skill；
- 影响权限、安全、写入和确认的规则必须进入 constitution 评审；
- 新层级必须说明为什么较低层级无法解决问题。

## 8. Evolution Proposal 契约

```yaml
proposal_id: "evo_..."
proposal_version: 1
project_id: "project_..."
target_level: "skill_rule"
target_ref: "project-code-review"
scope: "project"
status: "drafted"
confidence: "high"
problem: "UI 修改多次通过静态检查，但未进行真实点击验证"
trigger_signals:
  - kind: "user_correction"
    evidence_ref: "event_..."
proposed_change:
  summary: "前端交付必须记录可见界面操作证据"
  patch_ref: "draft://evo_.../v1"
affected_files: []
affected_roles: ["frontend", "qa"]
affected_projects: ["project_..."]
impact:
  direct: []
  indirect: []
  compatibility: []
baseline_metrics: {}
expected_benefit: []
validation_plan: []
counterexamples: []
rollback_plan: {}
trial_policy: {}
confirmation_ref: null
```

必填信息：

- 问题和最强触发信号；
- 建议晋级层级及为何不是更低层级；
- 精确目标和版本；
- 文件、角色、Workflow、项目和用户影响；
- 当前基线和预期改善；
- 正向场景、反例和不应触发场景；
- 验证、试运行、回滚和停止条件；
- 证据置信度、owner 和确认记录。

## 9. 草稿预填与差异预览

自动草稿继续使用：

- `[auto]`：直接由证据支持；
- `[inferred]`：由多个信号综合推断；
- `[needs confirmation]`：缺失、高影响或需要用户选择。

草稿必须显示：

- 新增、删除和修改的规则；
- 触发条件变化；
- 确认次数、适用角色和项目范围变化；
- 可能增加/减少的 Token 和耗时；
- 旧项目兼容性；
- 对 Profile、Memory、Workflow Graph、质量门禁和 Adapter 的影响；
- 未覆盖的反例和风险。

不能只展示自然语言总结而隐藏真实文件差异。

## 10. 状态机

```text
observed
  → candidate
  → drafted
  → awaiting_confirmation
  → approved
  → applying
  → validating
  → trial
  → accepted | needs_revision | rolled_back | rejected | archived
```

状态规则：

- `observed/candidate/drafted` 不改变正式规则；
- `approved` 只批准指定 proposal version、文件指纹和影响范围；
- `applying` 使用 TASK-02 的 Preview-Confirm-Apply 和备份；
- `validating` 通过后才能进入 trial；
- `trial` 是限定范围的临时 active，不是全局正式版本；
- `accepted` 需要验证结果和用户/owner 接受；
- 修改提案内容后增加 `proposal_version`，旧批准失效；
- `rolled_back` 保留失败证据，不把失败结果写成“已解决”。

## 11. 验证矩阵

### 11.1 静态验证

- Schema、格式、链接和引用完整；
- Skill/Workflow 触发条件无冲突；
- 没有 secrets、占位符和无效路径；
- 目录、Token 和臃肿符合 TASK-07；
- 旧版本兼容和迁移规则清晰。

### 11.2 行为验证

- 至少一个真实或高保真任务场景；
- 至少一个应触发场景；
- 至少一个不应触发场景；
- 高风险规则必须有失败/回滚路径；
- UI/桌面交互规则需要可见界面操作证据；
- Adapter/Harness 规则必须区分精确与推断事件。

### 11.3 对照指标

根据提案目标选择：

- 任务失败率、返工次数、用户修正次数；
- 误触发率、漏触发率；
- 确认次数和等待时间；
- Token、延迟、工具调用；
- 验证覆盖率和残余风险；
- 规则文件/Workflow 节点臃肿；
- 用户接受率。

减少确认次数不能作为安全门禁删除的唯一依据；降低 Token 不能以丢失验收、影响范围或权限检查为代价。

## 12. 灰度与试运行

### 12.1 阶段

1. `shadow`
   - 在历史任务、示例和当前输入上只计算新规则结果，不改变真实路由。
2. `project_pilot`
   - 仅一个选定项目、角色、Workflow 或用户启用。
3. `bounded_trial`
   - 限定任务类型、时间、次数和版本，记录旧/新对照。
4. `promote`
   - 通过验证和用户接受后成为新的 active 版本。

### 12.2 试运行策略

```yaml
trial_policy:
  mode: "bounded_trial"
  projects: ["project_..."]
  roles: ["frontend"]
  task_types: ["ui_change"]
  max_runs: 10
  expires_at: "..."
  success_criteria:
    minimum_runs: 5
    no_high_severity_regression: true
  stop_conditions:
    - "permission_or_scope_regression"
    - "false_verification"
    - "failure_rate_increase"
```

本地 MVP 只能可靠控制本机/当前项目试运行，不能宣称跨设备团队灰度已经一致执行。

## 13. 回滚协议

应用前必须保存：

- 旧 active 版本和文件指纹；
- 已确认差异和目标版本；
- 备份位置；
- 数据/Schema 影响；
- 回滚命令或原子恢复动作；
- 回滚后需要重建的索引、Profile、Graph 和评分。

回滚触发：

- Doctor、Smoke、契约或真实任务验证失败；
- 发生权限、范围、数据或安全回归；
- 误触发/漏触发超过预设停止条件；
- 新规则显著增加摩擦但没有减少失败；
- 用户/owner 明确拒绝试运行结果。

自动回滚仅在用户批准提案时同时批准了明确的回滚条件，并且回滚只恢复已备份的旧版本时允许。否则停止试运行、展示结果并等待确认。

回滚后：

- previous active version 恢复；
- 失败版本标记 `rolled_back`，不删除；
- 证据、验证和回滚原因保留；
- 可降级为 session/memory 或生成修订版提案；
- 不重复使用原批准执行新的修订版本。

## 14. 版本、兼容与旧项目

- 所有规则目标使用稳定 ID 和独立版本；
- 已 active 的 Skill/Workflow/Policy/Template 不原地覆盖；
- 项目本地规则优先于兼容的全局模板；
- Starter 新规则对旧项目默认作为可选升级，不立即变成硬失败；
- 破坏性变更需要 major 版本、迁移预览和回滚；
- 旧项目的历史任务工件不被批量重写；
- 一个角色 Workflow 的优化不能在没有影响分析时扩散到其他角色；
- 进化完成后更新 lineage、变更记录和适用范围。

## 15. 规则淘汰与降级

规则不仅能晋级，也必须能够降级：

- `active → deprecated`：仍兼容但不再推荐；
- `active → archived`：不再加载，仅历史追溯；
- `workflow_rule → skill_rule`：规则只对一个能力有效；
- `skill_rule → reference`：主入口过重，细节下沉；
- `rule → memory`：只是偏好或经验，不应强制执行；
- `rule → session`：只适合一次特殊任务。

长期未命中不能单独证明规则无效；需结合适用场景、替代规则、用户反馈和兼容风险。

## 16. 桌面端产品交互

“进化建议”按项目、目标层级、严重度、状态和置信度管理，不能只是一条不可解释的建议列表。

列表至少显示：

- 项目/全局作用域；
- 目标 Skill/Workflow/Policy；
- 最强触发信号；
- 置信度和证据数量；
- 预期收益和主要风险；
- 当前状态和更新时间。

详情支持：

- 查看证据和相关任务；
- 查看真实差异；
- 修改提案范围；
- 批准、拒绝、暂缓、归档；
- 启动验证或试运行；
- 查看旧/新指标；
- 接受、修订或回滚。

按钮必须有加载、成功、失败和下一步反馈。应用提案不得直接打开无关详情页代替执行状态。

## 17. 建议数据结构

- `evolution_observations`
- `evolution_candidates`
- `evolution_proposals`
- `evolution_proposal_versions`
- `evolution_evidence`
- `evolution_impacts`
- `evolution_validations`
- `evolution_trials`
- `evolution_trial_metrics`
- `evolution_actions`
- `rule_versions`
- `rule_rollbacks`

现有 `optimization_proposals` 可以保留并通过 `source_proposal_id` 关联，不必混成同一张表。所有状态变更写入 TASK-05 事件和审计日志。

## 18. 状态与错误码

| 错误码 | 含义 | 推荐动作 |
| --- | --- | --- |
| `EVOLUTION_SIGNAL_INSUFFICIENT` | 信号弱或缺少独立证据 | 保持 session 观察 |
| `EVOLUTION_TASK_REPAIR_REQUIRED` | 当前任务尚未修复/验证 | 先修复当前交付 |
| `EVOLUTION_PROMOTION_TOO_BROAD` | 建议层级高于证据支持范围 | 降到更小层级 |
| `EVOLUTION_TARGET_CONFLICT` | 目标文件/版本在预览后变化 | 重新生成差异 |
| `EVOLUTION_CONFIRMATION_REQUIRED` | 规则写入没有有效批准 | 等待确认 |
| `EVOLUTION_VALIDATION_FAILED` | 静态或行为验证失败 | 修订或回滚 |
| `EVOLUTION_TRIAL_STOPPED` | 触发试运行停止条件 | 恢复旧版本并查看证据 |
| `EVOLUTION_ROLLBACK_FAILED` | 无法完整恢复旧版本 | 保持 blocked 并执行恢复计划 |
| `EVOLUTION_COMPATIBILITY_BLOCKED` | 旧项目/版本无法安全升级 | 保持旧版并提供迁移方案 |
| `EVOLUTION_GLOBAL_SCOPE_UNSUPPORTED` | 本地应用无法证明全局团队灰度 | 限定本机/项目范围 |

## 19. 对现有实现的影响

后续实现预计涉及：

- 将 Session Reflection、Skill Upgrade Backlog、优化建议和规则提案关联为可追溯链路；
- 新增 Evolution Proposal、版本、影响、验证、试运行和回滚数据模型；
- 为 Skill、Workflow、Memory Policy、Constitution 和 Template 建立稳定 target/version 引用；
- 提案应用复用 TASK-02 的文件指纹、备份、原子切换和回滚；
- 验证复用 Doctor、Smoke、契约、真实任务、UI 操作和 TASK-07 指标；
- 增加 shadow/project pilot/bounded trial 和旧/新指标对照；
- 桌面端提供证据、差异、批准、验证、试运行和回滚的完整反馈；
- 旧项目升级遵守可选升级和版本兼容，不批量重写历史工件；
- 将团队审批、冲突合并和批量发布继续交给 TASK-11/TASK-12。

## 20. 验收标准

- [ ] 当前任务错误时先修复任务，不用规则提案代替交付。
- [ ] 显性反馈、测试失败和隐性行为信号具有不同强度与置信度。
- [ ] 单次弱信号不会直接修改 Skill/Workflow；高影响事故也必须先提案确认。
- [ ] 每个候选选择最小晋级层级，并说明为何更低层级不足。
- [ ] 提案具有稳定 ID、版本、目标、证据、影响、差异、验证、试运行和回滚计划。
- [ ] 自动预填使用 `[auto]`、`[inferred]`、`[needs confirmation]`，不伪造用户批准。
- [ ] 提案修改后旧批准失效，应用前复检目标文件指纹。
- [ ] 静态验证包含规则/Schema/兼容检查，行为验证包含正向和反向场景。
- [ ] 灰度支持 shadow、项目试点、有限试运行和正式晋级。
- [ ] 试运行显示旧/新对照和停止条件，不把本机灰度宣称为团队全局灰度。
- [ ] 回滚恢复已备份旧版本，失败版本和失败证据仍可追溯。
- [ ] 新规则对旧项目默认可选升级，不批量重写历史工件。
- [ ] 项目特有规则不会未经验证升级为全局模板。
- [ ] 桌面端所有提案操作都有进行中、成功、失败和下一步反馈。

## 21. 不在本任务范围

- 不自动写入或发布未经确认的 Skill/Workflow/Policy/Template。
- 不把用户未回复、未修改或跳过视为确定正负反馈。
- 不实现远程 Skill/Workflow 供应链，留给 TASK-10。
- 不实现多人冲突合并、角色审批和权限服务，留给 TASK-11。
- 不实现跨设备灰度协调、批量发布和最终 E2E 上线，留给 TASK-12。
- 不替代 TASK-08 的记忆候选和跨项目复用规则。

## 22. 已确认决策

1. 当前任务必须先修复验证，进化提案不能成为延后交付的借口。
2. 反馈分为强、中、弱信号；隐性反馈只是弱证据，不能自动视为满意或不满。
3. 晋级遵循 session、memory policy、skill reference、skill rule、workflow、constitution、template 的最小层级。
4. 自动生成草稿可以，但规则写入、试运行和正式晋级必须绑定明确版本和确认。
5. 验证必须包含真实/高保真任务、应触发场景和不应触发场景，不能只跑格式检查。
6. 灰度分为 shadow、项目试点、有限试运行、正式晋级，本地应用不宣称全局团队灰度。
7. 回滚条件在批准时预先展示；触发高风险回归时恢复旧版本并保留失败证据。
8. 项目规则优先在项目内验证，只有跨项目重复且已泛化后才进入全局模板。

本任务已接受，反馈、规则提案、灰度、验证、晋级和回滚实现必须遵守以上协议。
