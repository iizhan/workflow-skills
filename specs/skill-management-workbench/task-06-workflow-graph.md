# TASK-06 声明式 Workflow Graph 与运行轨迹协议

## 1. 文档状态

- 任务：`TASK-06`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`high`
- 前置任务：`TASK-01` 至 `TASK-05`
- 目标：定义 Workflow 声明、图谱投影、运行轨迹、声明与实跑差异、版本治理和桌面端可视化边界。

本任务只定义协议和产品边界，不立即把桌面端改成任意脚本编排器，也不承诺 Codex、Claude 或其他 Harness 一定支持由桌面端直接启动流程。

## 2. 当前事实与核心问题

现有项目已经有两类基础：

1. `project-engineering-workflow` 通过 `AGENTS.md`、项目 Skills、能力地图和 `workflow-state.yaml` 描述真实工程流程。
2. 桌面端 `GraphService` 能展示 Root、Skill、版本、模型、优化建议和 Bundle 的静态关系，并支持搜索、邻域、链路追踪和缩放。

但当前仍有关键缺口：

- 文档中的流程顺序尚未形成稳定、版本化、可校验的机器声明；
- 当前图谱不能区分“规则声明的流程”和“运行证据观察到的流程”；
- 图刷新会删除全部节点和边再重建，`node-1` 一类编号不稳定，无法可靠关联历史证据和 UI 选择；
- `weight` 同时承担静态关系、运行次数和图排序含义，缺少统一口径；
- 没有 `edge_evidence` 实际落地，用户无法判断一条连线来自配置、精确事件还是日志推断；
- Bundle 当前主要是 Skill 包装关系，不等同于可执行 Workflow；
- 现有 Adapter 未必能提供精确 Workflow 节点事件，因此不能把推断轨迹显示为真实执行链。

## 3. 产品与架构原则

1. **声明流程不等于运行事实**：项目文件声明“应该怎样走”，运行证据说明“实际怎样走”。
2. **图谱不等于执行引擎**：第一阶段只做声明、校验、可视化、观测和差异分析。
3. **项目文件是共享真值**：Workflow 定义跟随项目 Git；SQLite 保存可重建图谱、运行轨迹和私有视图状态。
4. **稳定身份优先**：节点、边、Workflow 和版本必须有稳定 ID，刷新不能让历史引用失效。
5. **证据驱动**：每条运行边必须显示来源、时间、样本、捕获方式和置信度。
6. **Skill 中心化**：Workflow 连接受治理的 Skill、门禁和子流程，不提供任意 Prompt/脚本自由画布。
7. **单项目聚焦**：默认只查看一个已绑定项目；跨项目汇总必须显式开启并保持项目隔离。
8. **所有写入可预览**：图上编辑只生成草稿；写回项目必须 Preview-Confirm-Apply-Verify。

## 4. 四类图层

同一项目可以有多个图层，但界面不能把它们混成一张无法解释的图。

### 4.1 Registry Graph

描述项目、Skill、版本、工具、模型、建议、Bundle 和文件归属等结构关系。

典型关系：

- `project contains skill`
- `skill has_version version`
- `skill uses_model model`
- `skill optimized_by proposal`
- `skill packaged_as bundle`

该图层主要来自扫描、注册表和 Bundle 清单，不代表执行顺序。

### 4.2 Declared Workflow Graph

描述某个 Workflow 版本声明的目标流程：节点、依赖、分支、确认门禁、输入输出和失败路径。

它回答：**按照当前工程规范，这个任务应该如何流转？**

### 4.3 Observed Runtime Graph

描述某个 Session、Workflow Run 或时间窗口内实际观察到的 Skill、工具、门禁和产物链路。

它回答：**这一次或这段时间实际发生了什么？**

只有 Harness/Hook 明确上报的节点事件可以标为精确运行轨迹。由日志顺序、文本线索或时间邻近推断的链路必须显示为 `inferred`。

### 4.4 Compare Overlay

将一个声明版本与一个实际运行实例或聚合窗口进行对比，显示：

- 已按声明执行；
- 声明节点缺少证据；
- 出现未声明步骤；
- 顺序偏离；
- 重试或重复执行；
- 使用降级/回退路径；
- 门禁缺少批准证据；
- 无法确定，证据不足。

Compare Overlay 是派生视图，不修改声明图或原始运行证据。

## 5. Workflow 权威来源与文件布局

### 5.1 权威层级

1. 项目内已确认的机器可读 Workflow 定义；
2. 当前 Workflow 版本和项目 Profile；
3. `AGENTS.md`、Skill 路由规则和能力地图；
4. 运行证据形成的推断关系；
5. 用户临时画布草稿。

低层级来源不能静默覆盖高层级来源。

### 5.2 推荐项目结构

```text
.skill-os/
  project.yaml
  workflows/
    engineering-delivery/
      workflow.yaml
      README.md
```

现有 `AGENTS.md`、`.agents/skills/` 和 `.specify/workflow-state.yaml` 保持原职责。引入 `workflow.yaml` 是为了提供可校验的流程声明，不替代 Skill 内容、任务状态或项目 Profile。

旧项目没有 `workflow.yaml` 时：

- 可读取已知 Workflow marker、能力地图和路由文档生成 `inferred declaration`；
- 推断结果只能预览，不能标记为正式声明；
- 用户确认差异后才能写入新的项目 Workflow 定义；
- 原有 `AGENTS.md` 不被整文件覆盖。

## 6. Workflow 定义契约

推荐最小结构：

```yaml
schema_version: "1.0.0"
workflow_id: "wf_engineering_delivery"
project_id: "project_..."
version: "1.0.0"
name: "工程交付流程"
status: "active"
entrypoints:
  task_types: [development, refactor, bugfix]
inputs:
  - name: request
    schema_ref: "skill-os://schemas/user-request"
outputs:
  - name: delivery_report
    artifact_type: "verification_report"
nodes:
  - id: profile
    kind: skill
    skill_ref: "project-profile-router"
    required: true
  - id: requirement_gate
    kind: approval_gate
    policy_ref: "task-lane-confirmation"
  - id: implementation
    kind: skill
    skill_ref: "project-code-generation"
  - id: verification
    kind: subworkflow
    workflow_ref: "wf_verification"
edges:
  - id: edge_profile_requirement
    from: profile
    to: requirement_gate
    outcome: success
  - id: edge_requirement_implementation
    from: requirement_gate
    to: implementation
    condition:
      field: "approval.status"
      op: "eq"
      value: "approved"
```

### 6.1 Workflow 基础字段

- `schema_version`：定义格式版本，与数据库和 Adapter 版本分离。
- `workflow_id`：稳定 ID，不因重命名或目录移动改变。
- `project_id`：所属项目；可复用模板使用独立模板 ID，在应用时生成项目绑定。
- `version`：声明版本；已激活版本不可原地修改。
- `status`：`draft`、`active`、`deprecated`、`archived`、`invalid`。
- `entrypoints`：适用任务类型、角色、项目条件和路由优先级。
- `inputs/outputs`：只声明结构和产物类型，不默认保存正文。

### 6.2 节点类型

MVP 支持：

- `skill`：调用或建议路由到一个受治理 Skill；
- `approval_gate`：等待用户或治理策略确认；
- `decision`：按结构化条件选择分支；
- `subworkflow`：引用另一个 Workflow 版本；
- `checkpoint`：要求生成或验证指定工件；
- `start`、`end`：可选的显式边界节点。

MVP 不支持节点中直接嵌入任意 Shell、JavaScript、Python 或未授权 Prompt。需要工具能力时由 Skill/Harness 按现有权限模型执行。

### 6.3 边类型

- `next`
- `on_success`
- `on_failure`
- `on_approved`
- `on_rejected`
- `on_condition`
- `fallback`

边必须有稳定 `edge_id`。显示顺序、运行频次和证据置信度分别存储，不能继续共用一个含义模糊的 `weight`。

### 6.4 条件规则

条件只允许结构化操作符，例如：

- `eq`、`neq`
- `in`、`not_in`
- `exists`
- `gt`、`gte`、`lt`、`lte`
- `all`、`any`、`not`

禁止 `eval`、动态代码和任意命令。条件只能读取已声明、已授权的 Workflow Context 字段。

### 6.5 重试与循环

第一阶段激活 Workflow 必须是 DAG。循环需求使用节点级有界重试：

```yaml
retry:
  max_attempts: 2
  backoff: fixed
  retry_on: [transient_error]
```

任意循环、无限重试和运行时动态生成节点暂不支持。这样可以保持流程可解释、Token 可预算、失败可终止，也为 TASK-07 的臃肿和预算门禁提供稳定输入。

## 7. Workflow 版本与变更流程

```text
active version
  → create draft
  → validate graph
  → preview node/edge/Skill/version/impact diff
  → user confirms
  → write project file atomically
  → verify references and graph
  → activate new version
  → retain previous version for rollback
```

规则：

- 已激活版本不可原地修改；任何变化生成新版本。
- 草稿可以只保存在本地私有覆盖层，未确认前不进入项目 Git 真值。
- Preview 必须展示新增、删除、重排、分支、门禁、Skill 引用、兼容性和潜在影响。
- 应用前复检文件指纹和项目锁，遵守 TASK-02。
- Workflow 重命名不改变 `workflow_id`。
- 删除使用 `deprecated/archived`，不得破坏历史 Run 的版本引用。

## 8. 运行实例与事件

### 8.1 Workflow Run

每次可识别流程运行至少包含：

- `workflow_run_id`
- `workflow_id`、`workflow_version`
- `project_id`
- `harness_id`、`adapter_id`
- `session_ref`
- `started_at`、`finished_at`
- `status`
- `capture_mode`、`confidence`
- Token 来源与预算引用
- 声明版本指纹

运行状态：

- `pending`
- `running`
- `awaiting_approval`
- `succeeded`
- `succeeded_with_warnings`
- `failed`
- `blocked`
- `cancelled`
- `unknown`

### 8.2 Node Run

每个节点尝试记录：

- `node_run_id`
- `workflow_run_id`
- `node_id`
- `attempt`
- `skill_run_id` 或 `subworkflow_run_id`
- 开始/结束时间和状态
- 输入/输出只保存 schema、摘要或工件引用
- 错误码、门禁批准引用和证据事件 ID

### 8.3 统一事件

在 TASK-05 事件信封之上增加：

- `workflow_run.started`
- `workflow_node.entered`
- `workflow_node.completed`
- `workflow_node.failed`
- `workflow_gate.opened`
- `workflow_gate.approved`
- `workflow_gate.rejected`
- `workflow_branch.selected`
- `workflow_run.completed`
- `workflow_run.failed`

只有原生运行时/受信任 Hook 的明确节点事件可标为 `precise`。日志解析得到的节点序列必须标为 `inferred`，并保留匹配依据。

## 9. 声明与实跑差异模型

每个声明节点/边的对比状态：

- `matched`
- `missing_evidence`
- `unexpected`
- `out_of_order`
- `repeated`
- `fallback_used`
- `gate_bypassed`
- `failed`
- `unknown`

重要规则：

- `missing_evidence` 不自动等于“没有执行”，可能只是 Adapter 无法观测。
- `unexpected` 不自动等于错误，可能是 Harness 内部步骤或未建模工具。
- `gate_bypassed` 只有在声明要求门禁且存在足够精确证据时才可判定。
- 推断链路不能触发自动惩罚、阻断或 Skill 改写。
- 差异结果必须显示声明版本、运行时间、证据来源和置信度。

## 10. 图谱快照与身份模型

### 10.1 稳定身份

图节点和边使用稳定逻辑身份：

```text
node identity = project_id + layer + entity_type + stable_ref + version_scope
edge identity = project_id + layer + edge_type + from_identity + to_identity + declaration_ref
```

实现可使用规范化内容的哈希，但不能继续依赖每次刷新重新生成的递增编号。

### 10.2 快照更新

图更新采用：

```text
build candidate snapshot
→ validate references and evidence
→ calculate diff
→ atomically activate snapshot
→ retain previous snapshot metadata
```

禁止先删除当前图再尝试重建。失败时继续展示上一个有效快照，并标记数据新鲜度。

### 10.3 建议数据结构

- `workflow_definitions`
- `workflow_versions`
- `workflow_nodes`
- `workflow_edges`
- `workflow_runs`
- `workflow_node_runs`
- `graph_snapshots`
- `graph_nodes`
- `graph_edges`
- `edge_evidence`
- `graph_compare_snapshots`

`graph_nodes/graph_edges` 是面向查询和渲染的投影；Workflow 定义和 TASK-05 原始事件仍是可重建来源。

图边字段至少区分：

- `source_layer`
- `relationship_type`
- `occurrence_count`
- `confidence`
- `first_seen_at`
- `last_seen_at`
- `evidence_count`
- `eligibility`

## 11. 桌面端交互协议

### 11.1 默认入口

图谱页默认要求选择一个已绑定项目，并提供三个主视图：

- `声明流程`
- `运行轨迹`
- `差异对比`

Registry Graph 作为“项目关系”辅助视图，不与 Workflow 顺序混画。

### 11.2 顶部控制

- 项目选择器；
- Workflow 和版本选择器；
- 图层分段控制；
- 运行实例或时间范围；
- 捕获方式/置信度筛选；
- 刷新状态和数据时间。

跨项目查看必须是独立入口，默认只显示聚合指标，不连接不同项目的运行节点。

### 11.3 画布能力

- 适配窗口；
- 放大、缩小、重置；
- 拖动画布；
- 搜索并定位节点；
- 展开/折叠子流程；
- 显示图例；
- 节点 Hover 提示名称、类型、状态和时间；
- 点击节点后在侧栏或底部详情区下探；
- 超大图按邻域懒加载，不一次渲染全部节点。

节点尺寸保持紧凑稳定，长文本截断后通过详情查看。界面只能显示当前语言，不能在紧凑节点里并排堆叠中英文。

### 11.4 状态表达

声明节点使用结构类型区分；运行状态使用一致颜色/图标区分；推断证据使用虚线或低置信度标记；Compare 状态使用独立图例。

不能仅靠颜色表达失败、等待确认或证据不足，必须同时提供图标或文字状态。

### 11.5 编辑入口

第一阶段主画布默认只读。点击“编辑流程”后进入草稿模式：

- 允许调整受支持节点、边、条件和门禁；
- 实时校验循环、孤立节点、缺失 Skill、无出口分支和版本冲突；
- 保存只保存草稿；
- “应用到项目”必须进入差异预览和用户确认；
- 未确认草稿不得改变 Harness 行为。

## 12. 执行边界

### 12.1 第一阶段

支持：

- 扫描/导入声明；
- 生成和校验声明图；
- 可视化声明、运行和差异；
- 运行事件归因；
- Workflow Bundle 导出；
- 生成可交给 Harness 的流程上下文或入口提示。

不支持：

- 桌面端自行解释并执行任意脚本节点；
- 绕过 Harness 权限、Sandbox 或用户确认；
- 因为点击“运行”就伪造 Workflow 已执行；
- 无 Adapter 能力时强制把现有会话切换到指定流程。

### 12.2 未来执行能力

若 Adapter 声明并验证 `workflow_launch` 能力，桌面端可以提供显式启动入口，但必须：

- 显示目标 Harness、项目、Workflow 版本和预算；
- 创建独立运行实例；
- 遵守授权、门禁、Sandbox 和 TASK-07 预算；
- 不支持时显示“当前 Harness 仅支持观测/引导”，而不是无响应按钮。

## 13. Workflow Bundle 规则

Workflow Bundle 至少包含：

- Workflow 定义和版本；
- 节点引用的 Skill 身份、版本约束和来源；
- 输入输出 schema；
- 兼容的 Adapter/Harness 能力要求；
- 权限、预算和验证要求摘要；
- 内容清单、哈希、许可证和 lineage。

默认不包含：

- 原始会话正文；
- 运行 Token 账单；
- 用户私有记忆；
- secrets；
- 项目绝对路径。

导出 Bundle 不代表该流程已经可执行。导入后先进入 TASK-10 的供应链检查和 Preview-Confirm-Apply。

## 14. 结构质量信号

TASK-06 只生成结构信号，不在本任务固定惩罚阈值：

- 节点数；
- 最长路径；
- 分支数和最大 fan-out；
- 子流程嵌套深度；
- 重试上限；
- 孤立节点；
- 不可达节点；
- 缺少失败出口；
- 重复 Skill 路径；
- 声明/实跑偏差率。

具体阈值、轻中重分级、Token 预算和阻断策略由 TASK-07 统一定义。

## 15. 状态与错误码

| 错误码 | 含义 | 推荐动作 |
| --- | --- | --- |
| `WORKFLOW_DECLARATION_MISSING` | 没有正式机器声明 | 预览推断结果并确认生成 |
| `WORKFLOW_SCHEMA_INVALID` | 定义格式或版本无效 | 查看字段错误 |
| `WORKFLOW_CYCLE_UNSUPPORTED` | 激活图包含循环 | 改为有界重试或拆分流程 |
| `WORKFLOW_SKILL_UNRESOLVED` | Skill 引用无法解析 | 重新扫描或选择版本 |
| `WORKFLOW_BRANCH_INCOMPLETE` | 分支缺少条件或出口 | 完善分支 |
| `WORKFLOW_GATE_INVALID` | 门禁没有批准策略 | 配置确认规则 |
| `WORKFLOW_VERSION_CONFLICT` | Preview 后定义已变化 | 重新生成差异 |
| `GRAPH_SNAPSHOT_BUILD_FAILED` | 候选图构建失败 | 保留上次有效快照并检查错误 |
| `GRAPH_EVIDENCE_MISSING` | 连线没有可用证据 | 显示未知，不宣称真实调用 |
| `WORKFLOW_TRACE_AMBIGUOUS` | 运行轨迹只能模糊归因 | 保持 inferred 并显示依据 |
| `WORKFLOW_LAUNCH_UNSUPPORTED` | Adapter 不支持启动 | 使用 Harness 引导模式 |

## 16. 对现有实现的影响

后续实现预计涉及：

- 新增项目内 Workflow 声明格式和校验器；
- 将 `GraphService` 从全量删除重建改为稳定 ID、候选快照和原子切换；
- 补齐 `edge_evidence` 和声明/运行图层字段；
- 从 `skill_runs`、工具事件、门禁事件和 Bundle 清单构建不同图层；
- 扩展 TASK-03 Adapter 事件映射，支持 Workflow Run/Node 事件；
- 图谱 UI 增加项目、Workflow、版本、运行实例、图层和置信度过滤；
- 增加声明/实跑差异视图和节点详情；
- Bundle Service 增加 Workflow Bundle，而不是把多 Skill 顺序误当成已执行流程；
- 为旧 `AGENTS.md`/能力地图提供只读推断和确认生成流程；
- 将结构质量信号交给 TASK-07，而不是在 Graph Service 内硬编码阈值。

## 17. 验收标准

- [ ] 声明图、运行图、项目关系图和差异图能够明确区分。
- [ ] 图上每条运行关系都能查看来源、时间、捕获方式、置信度和证据数量。
- [ ] 图刷新后稳定节点/边 ID 不变化，历史引用仍然有效。
- [ ] 图构建失败时保留上一个有效快照，不出现空白图替换有效数据。
- [ ] 正式 Workflow 定义版本化，已激活版本不可原地覆盖。
- [ ] 旧项目推断出的流程不会自动写入或被宣称为正式定义。
- [ ] MVP 能校验 DAG、Skill 引用、分支、门禁、不可达节点和失败出口。
- [ ] 推断轨迹不会被显示为精确执行，也不会直接触发阻断或自动改写。
- [ ] 默认图谱聚焦单项目，跨项目运行数据不会被自动连接。
- [ ] 画布支持适配、缩放、拖动、搜索、折叠、Hover 和详情下探。
- [ ] 图中长文本、单语言显示和节点尺寸在桌面窗口内保持可读。
- [ ] 无 `workflow_launch` 能力时界面给出明确说明，不提供无反馈的运行按钮。
- [ ] Workflow 编辑保存为草稿，写回项目前必须展示差异并确认。
- [ ] Bundle 不携带原始会话、私有记忆、Secrets 和绝对路径。

## 18. 不在本任务范围

- 不实现通用低代码平台。
- 不实现任意代码条件、无限循环和动态节点生成。
- 不保证所有 Harness 都能提供精确 Workflow 节点事件。
- 不定义质量、Token 和臃肿阈值，留给 TASK-07。
- 不定义记忆读写和跨项目复用规则，留给 TASK-08。
- 不定义远程 Workflow/Skill 的供应链准入，留给 TASK-10。
- 不实现多人实时协同编辑，留给 TASK-11。

## 19. 已确认决策

1. 图谱拆为项目关系、声明流程、运行轨迹和差异对比，不再混成一张图。
2. 第一阶段图谱负责声明、校验、可视化和观测，不做任意脚本执行引擎。
3. 项目 Git 中的 `workflow.yaml` 作为正式声明；旧文档只能生成待确认的推断声明。
4. 激活 Workflow 使用 Skill、门禁、结构化分支、子流程和检查点，第一阶段必须是 DAG，循环使用有界重试。
5. 图节点和边采用稳定身份、候选快照和原子切换，废除刷新即全量删除当前图的做法。
6. 精确与推断运行轨迹严格区分；证据不足不等于没有执行。
7. 默认单项目聚焦，Workflow 编辑只生成草稿，写回项目必须 Preview-Confirm-Apply-Verify。
8. Harness 不支持启动时只提供观测/引导，不能出现点击无响应或伪造执行成功。

本任务已接受，Workflow 声明、图谱投影、运行轨迹、差异分析和可视化实现必须遵守以上协议。
