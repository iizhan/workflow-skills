# 设计方案：Workflow 架构与注册协议

**功能标识**: `workflow-architecture`  
**日期**: 2026-07-22  
**需求版本**: v1  
**设计方案版本**: v1  
**影响范围版本**: v1  
**确认状态**: TASK-WF-01 to TASK-WF-06 accepted; TASK-WF-07A implemented with no-side-effect E2E verification, pending user acceptance

## 1. 目标与边界

建立一个本地优先、声明式、可版本化的 Workflow 控制平面。它负责发现、校验、绑定、组合、观测和升级 Workflow；Harness 仍然负责真正的模型执行与工具权限。

成功不等于“能画出流程图”，而是以下对象使用同一套稳定身份和证据模型：

```text
原子 Skill -> Workflow Template -> Project Binding -> Workflow Run -> Scenario Loop Run
```

本次不把 Workflow 变成任意脚本执行器，也不允许 Loop Engineering 自动越过确认、权限、安全、预算和项目边界。

## 2. 当前事实与约束

- `TASK-06` 已定义声明图、运行图、差异图、`workflow_id`、`workflow_version` 和基础运行事件。
- 当前 `TASK-06` 为保持可解释性，要求激活图为 DAG，只允许节点级有限重试。
- 当前工程治理已经拥有需求确认、影响范围、计划、验证、用户验收、Session Trace 和演进提案。
- 当前桌面端已有本地注册表、图谱、会话链路、项目绑定和 Workflow Template Registry；项目绑定、Doctor 与 Loop 仅提供受控的本地观测和写入前预览。

因此本设计采用“上层场景循环、下层声明 DAG”的兼容模型：单次迭代的执行路径仍为 DAG；跨迭代的有界回环由 `Scenario Loop Run` 表达，而不把图谱变为无限环。

## 3. 分层与职责

| 层级 | 对象 | 责任 | 是否可直接执行 |
| --- | --- | --- | --- |
| 治理内核 | confirmation / scope / permission / verification | 定义不可绕过的确认、权限、验证和验收边界 | 否 |
| 原子能力 | Skill | 完成一个受治理的分析、设计、实现或检查动作 | 经 Harness |
| 角色层 | Role Workflow | 组织前端、后端、产品、UI、测试等角色规则 | 经场景引用 |
| 场景层 | Scenario Workflow | 组织可交付场景，例如设计稿还原、API 开发、联调 | 经 Harness |
| 项目覆盖层 | Project Binding | 固定版本、技术栈条件、项目规则、预算和已确认决策 | 否 |
| 运行时 | Loop Engineering | 在批准范围内管理迭代、修复、评分、预算、停止和证据 | 不直接执行工具 |

Workflow 只能编排受治理的 Skill、审批门禁、检查点、决策和子 Workflow。它不能嵌入任意可执行脚本、动态 Prompt 或绕过 Harness 的工具调用。

## 4. 核心对象与稳定身份

### 4.1 Workflow Template

可跨项目复用的版本化流程定义。

- `template_id`：稳定、全局唯一，例如 `scenario.design-to-frontend`。
- `template_version`：不可变语义版本。
- `kind`：`foundation`、`role`、`scenario`、`integration`。
- `status`：`draft`、`sandbox`、`trial`、`approved`、`recommended`、`deprecated`、`retired`、`invalid`。
- `manifest_fingerprint`：规范化清单内容指纹。

### 4.2 Project Workflow Binding

项目对模板的显式绑定，不复制模板内容。

- `binding_id`：稳定 ID。
- `project_id`、`template_id`、`template_version`。
- `binding_status`：`draft`、`active`、`needs_upgrade`、`incompatible`、`disabled`。
- `overrides_ref`：项目覆盖文件引用，仅允许白名单字段。
- `activation_evidence_ref` 与 `rollback_ref`。

### 4.3 Workflow Run 与 Scenario Loop Run

`Workflow Run` 沿用 `TASK-06`，表示一轮声明流程的可观测运行。`Scenario Loop Run` 是其上层容器，表示同一已确认场景从分析到质量收敛的有限迭代。

```text
Scenario Loop Run
  iteration 1 -> Workflow Run (DAG)
  iteration 2 -> Workflow Run (DAG)
  iteration 3 -> Workflow Run (DAG)
```

它们通过 `loop_run_id`、`iteration`、`root_cause_key`、`strategy_fingerprint` 和证据引用关联，不能替代任务的正式生命周期。

## 5. Manifest 契约

权威项目声明继续放在 `.skill-os/workflows/`。模板仓库提供只读模板，项目绑定只存引用和已批准覆盖；已激活版本不可原地改写。

```yaml
schema_version: "1.1.0"
template_id: "scenario.design-to-frontend"
template_version: "1.0.0"
name: "设计稿到前端"
kind: "scenario"
status: "approved"
entrypoints:
  task_types: [development]
  required_inputs: [requirement, prototype_or_design]
  profile_conditions:
    surfaces: [frontend]
composition:
  requires:
    - template_id: "foundation.engineering-governance"
      version: "^1.0.0"
    - template_id: "role.frontend-engineering"
      version: "^1.0.0"
skills:
  - skill_ref: "project-profile-router"
  - skill_ref: "project-frontend-standards"
  - skill_ref: "project-verification-loop"
inputs:
  - name: "design_source"
    required: true
outputs:
  - name: "ui_delivery"
  - name: "verification_report"
quality_gate:
  score_policy_ref: "quality.frontend-reconstruction.v1"
  pass_score: 90
  dimension_floors:
    coverage: 75
    correctness: 75
    verification: 75
  required_checks:
    - no_blocking_issue
    - evidence_for_all_confirmed_acceptance
    - visual_or_interaction_evidence
loop_policy:
  enabled: true
  max_iterations: 3
  max_same_root_cause_strategies: 2
  on_scope_change: "require_reconfirmation"
  on_budget_exhausted: "needs_user_decision"
permissions:
  capabilities: [read_project, write_project_after_confirmation]
compatibility:
  core: ">=0.8.0 <1.0.0"
  manifest_schema: ">=1.1.0 <2.0.0"
```

### 5.1 静态校验规则

- ID、版本、状态和类型必须合法且稳定。
- 场景组合图必须无循环；Loop 只能通过 `loop_policy` 表达。
- 所有 `skill_ref`、`template_id`、版本范围、输入输出和质量策略必须可解析。
- `loop_policy` 上限必须是有限正整数；禁止无限值和动态表达式。
- `pass_score` 不能覆盖 `required_checks` 或关键维度最低分。
- 项目覆盖只能修改版本、开关、预算、允许的质量阈值收紧和项目事实；不能新增权限、删除门禁或引用未声明 Skill。

## 6. 路由、组合与确认

路由步骤固定为：

```text
Project Profile -> task lane -> candidate filters -> primary scenario -> dependencies -> confirmation gates -> execution plan
```

- 项目 Profile 是技术栈、架构、目录和已确认决策的缓存，不是执行授权。
- 路由器必须解释候选、选择和拒绝原因；低置信度时只建议，不自动激活。
- 一个请求只有一个主场景；例如“设计稿到前端”可依赖前端角色层和基础治理层，但不会同时无序启动全部角色 Workflow。
- 首次正式实施遵守现有设计/计划/影响范围确认。循环内仅可处理已批准范围内的已知问题。
- 发生范围扩大、接口契约破坏、迁移、权限、外部写入、发布或预算耗尽时，Loop 停止并回到 `vN+1` 确认。

## 7. Scenario Loop Engineering

每次迭代执行下列有限过程：

```text
分析 -> 设计 -> 计划 -> 执行 -> 验证 -> 自测 -> 质量判定
                                             |              |
                                             |              +-> 达标：待用户验收/下一场景
                                             +-> 未达标：根因分析 -> 新策略 -> 下一迭代
```

结果只能是：`verified`、`verified_with_risk`、`needs_user_decision`、`blocked`、`budget_exhausted`、`cancelled` 或 `evolution_candidate`。

默认质量通过条件：总分不低于 90、所有关键维度达到最低分、没有阻塞缺陷、所有已确认验收项都有证据。所谓“没有问题”只能表述为“没有已知且未处理的问题”，不能承诺发现所有隐藏问题。

相同根因的相同策略指纹不得重复执行；超过两种策略后必须提供证据、剩余风险和用户决策选项。一次失败不能自动修改任何全局 Skill 或 Workflow。

## 8. 版本、迁移与兼容

`TASK-06` 的 `workflow_id` 与 `workflow_version` 保持有效。新增字段缺失时被投影为：

```text
kind = project_legacy
status = active or unknown
loop_policy = disabled
compatibility = legacy_read_only
```

升级路径：

```text
读取旧声明 -> 生成候选 Manifest -> 静态校验 -> 显示差异与影响 -> 用户确认
-> 原子写入新版本 -> 重新扫描 -> 保留旧文件/版本 -> 可回滚
```

旧声明永远不被后台改写。不同客户端版本共存时，无法识别新 Manifest Schema 的旧客户端只能只读，不允许写入或激活新版本。

## 9. 桌面端契约

新增“工作流库”，与“技能库”分离：

- 工作流库管理模板、版本、类型、适用条件、依赖、生命周期、试用/推荐状态和兼容性。
- 项目详情管理项目绑定、覆盖项、当前版本、运行记录、Loop 进度、流程图和脑图。
- 评测按项目、Workflow、场景和 Skill 聚合首轮通过率、循环轮次、修复率、Token/耗时和回归率。

总览只显示跨项目的待处理风险、预算预警和需要决策事项，不展示某个项目的流程细节。

## 10. 备选方案与取舍

| 方案 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- |
| 每个 Workflow 独立 Markdown | 最快开始 | 无法校验、组合、升级或稳定追溯 | 不采用 |
| 桌面端通用脚本编排器 | 灵活 | 绕过 Harness 权限，安全和成本不可控 | 不采用 |
| 全部流程合成一个超大 Workflow | 用户看似简单 | 路由、版本、成本和维护失控 | 不采用 |
| 分层 Manifest + 项目绑定 + 有界 Loop | 可组合、可追踪、可升级 | 初期协议设计成本较高 | 采用 |

## 11. 验收与自测计划

- 静态：Manifest schema、引用、版本范围、组合图、Loop 上限、权限白名单校验。
- 兼容：加载 `TASK-06` 旧声明，确认能读、能展示、不会被写回修改。
- 路由：使用前端还原、后端 API、Swagger 联调和不适用任务的固定样例验证候选与拒绝原因。
- 循环：模拟首轮通过、修复后通过、同策略重复、范围扩大、预算耗尽和用户停止。
- 可视：桌面端验证工作流库、项目绑定、流程图/脑图、运行时间线和证据下探。
- 回退：移除新绑定或恢复旧声明后，旧图谱和历史证据仍可读取。

## 12. 实施状态

- `TASK-WF-01` 至 `TASK-WF-04` 已验收：Manifest 1.1、Registry、项目绑定、Scenario Loop、影子迁移、回退、Doctor、独立工作流库和只读可观测性均已落地；真实 Harness 自动编排未被提前启用。
- `TASK-WF-05` 已完成：受控的统一事件信封可通过本地 JSONL 导入精确 Trace，显式 Workflow/Skill 状态与推断证据分层保存；不合规的原文存储声明会在导入前被拒绝。
- `TASK-WF-06` 已验收：项目详情将 Workflow 安装、Codex 工作目录连接和 Skill 观测拆成独立状态；精确接入仅显示用户选择 JSONL 的只读预览，不自动安装外部 Adapter。
- `TASK-WF-07A` 已完成受控 App Server 观测实现和真实无副作用 E2E：目标项目通过 `ephemeral` Thread、`readOnly` 沙箱与 `never` 审批完成临时 Turn，收到 Thread、Turn、Item、Token 生命周期；未接入既有会话，项目 Git 状态未变化。当前 Schema 没有官方显式 Skill 调用事件，Skill 仍保持推断。
- 真实 Harness 编排仍不属于此阶段：界面只显示本地已记录的 Binding、Loop、质量、预算和证据引用，不会自动启动 Codex、Claude 或业务代码执行。
- 可复现命令、结果与已知基线问题见 `verification.md`。
