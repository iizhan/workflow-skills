# TASK-13 Session Trace 会话链路与 Skill 证据浏览器

## 1. 文档状态

- 任务：`TASK-13`
- 版本：`1.0.0`
- 状态：`accepted`
- 确认日期：`2026-07-15`
- 影响等级：`high`
- 前置任务：`TASK-03`、`TASK-05`、`TASK-06`、`TASK-07`、`TASK-08`、`TASK-12`
- 目标：把每条用户消息还原为可解释的路由、Workflow、Skill、Tool 和验证执行链，并支持点击命中的 Skill 快捷查看内容、版本、命中证据和关联指标。

本任务先定义协议与交互，不立即宣称现有 Codex/Claude 日志能够精确提供所有步骤。

### 1.1 实施进度（2026-07-15）

- `Phase 1 已完成`：Session/Turn/Trace/Span/Event 持久化、旧运行记录回填、消息边界识别、时间线/链路树、精确/推断标记、Skill 只读快捷抽屉和跨模块返回上下文已落地。
- `Phase 2 部分完成`：命中指数、分项证据、四 Tabs、当前文件只读查看、运行/当前版本漂移保护已落地；候选淘汰对比、命中章节高亮、历史内容快照和版本差异仍待实现。
- `Phase 3 未开始`：实时 Harness/App Server/Hook、运行中 Span 增量更新和精确 Workflow 节点事件仍待适配器提供证据。
- `兼容边界`：历史 `skill_runs` 会回填成低置信推断链；新导入的本地 JSONL 使用稳定 Session/Turn/Event ID，重复刷新不会生成随机重复事件。

## 2. 产品目标

用户应能回答：

- 这条消息属于哪个项目、会话和 Turn？
- 最外层系统路由做了什么判断？
- 选择了哪个 Workflow 和节点？
- 哪些 Skill 被候选匹配、路由、加载或真实调用？
- 每一步何时开始、耗时多久、成功还是失败？
- 调用了什么 Tool、用了多少 Token、产生了什么验证结果？
- Skill 是精确调用还是日志推断？
- 为什么命中这个 Skill，命中指数如何计算？
- 能否不离开当前会话，直接查看 Skill 内容和命中位置？

## 3. 当前能力与缺口

当前实现已有 `session_ref`、`run_id`、Skill 名称、Tool 名称、运行时间、Token、状态、捕获方式和置信度；本地遥测也能从 Codex/Claude JSONL 中推断项目、Skill 和 Workflow 信号。

但目前事件会被聚合成 `skill_runs`，缺少：

- 一条用户消息对应的稳定 `turn_id`；
- 整条链路的 `trace_id`；
- 步骤的 `span_id/parent_span_id`；
- 原始执行顺序和每一步独立时间；
- 路由候选、命中原因和未选原因；
- Skill 内容、版本和命中位置的快捷下探；
- 会话路由、声明 Workflow 和真实运行的统一对照。

因此当前可以展示运行摘要，但不能把推断日志伪装成完整精确调用链。

## 4. 核心概念

| 概念 | 含义 |
| --- | --- |
| Session | 一段连续会话/任务上下文 |
| Turn | 一条用户消息及其对应的一次响应链 |
| Trace | 一个 Turn 的完整执行链 |
| Span | Trace 中一个有开始、结束、父子关系的步骤 |
| Event | Span 内发生的不可变事实 |
| Route Candidate | 路由阶段考虑过的 Skill/Workflow |
| Skill Hit | 候选、匹配、加载、调用或完成中的一种明确状态 |
| Evidence | 支撑路由、调用、时间、Token 和结果的原始事件引用 |

系统路由、Workflow 节点、Skill 和 Tool 必须分类型展示。最外层导航/路由不是 Skill，不能混算为 Skill 调用。

## 5. Trace 数据模型

### 5.1 Session

- `session_id`
- `project_id`
- `harness_id`、`adapter_id`
- `workspace_ref`
- `started_at`、`last_observed_at`、`ended_at`
- `status`
- `turn_count`
- `capture_mode`、`confidence`

### 5.2 Turn

- `turn_id`
- `session_id`
- `sequence`
- `user_message_summary`
- `message_hash`
- `received_at`、`completed_at`
- `status`
- `trace_id`
- `skill_candidate_count`
- `skill_invoked_count`
- `total_tokens`、`duration_ms`

默认只保存消息摘要和哈希，不保存完整用户消息。

### 5.3 Span

```json
{
  "trace_id": "trace_01",
  "span_id": "span_skill_01",
  "parent_span_id": "span_route_01",
  "sequence": 4,
  "span_type": "skill",
  "phase": "execute",
  "name": "project-code-review",
  "started_at": "2026-07-15T10:00:03.120Z",
  "ended_at": "2026-07-15T10:00:05.310Z",
  "status": "succeeded",
  "capture_mode": "precise",
  "confidence": "high",
  "skill_id": "skill_...",
  "skill_version_id": "skill_version_...",
  "workflow_id": "wf_...",
  "workflow_node_id": "review",
  "evidence_refs": ["event_..."]
}
```

Span 类型：

- `turn`
- `system_route`
- `context_load`
- `workflow`
- `workflow_node`
- `skill_candidate`
- `skill`
- `tool`
- `approval_gate`
- `verification`
- `memory`
- `response`

### 5.4 Event

在 TASK-05 统一事件信封上增加：

- `session.started/completed`
- `turn.received/completed/failed`
- `route.started/candidate_evaluated/selected/completed`
- `context.profile_loaded/memory_loaded`
- `workflow.selected`
- `workflow_node.entered/completed/failed`
- `skill.candidate_matched/rejected`
- `skill.loaded`
- `skill_run.started/completed/failed`
- `tool_call.started/completed/failed`
- `verification.started/completed/failed`
- `response.started/completed`

## 6. Skill 命中状态

命中不是单一布尔值，统一分为：

- `candidate`：进入路由候选；
- `matched`：规则/上下文匹配；
- `selected`：被路由选择；
- `loaded`：Skill 内容被加载；
- `invoked`：有明确调用事件；
- `completed`：调用完成；
- `failed`：调用失败；
- `inferred`：只能从日志推断；
- `rejected`：候选未采用，并有可解释原因；
- `unknown`：证据不足。

界面不能把 `matched/loaded/inferred` 统一显示为“已调用”。调用次数只统计满足 TASK-03 精确/推断规则的运行记录。

## 7. 命中置信度指数

### 7.1 命名

统一使用“命中指数”和“证据置信度”，不使用“命中率”或“调用概率”。指数是路由证据的可解释归一化结果，不是统计概率。

### 7.2 精确命中

Harness/App Server/受信任 Hook 明确上报 Skill 调用时：

- 状态：`invoked`；
- 命中指数：`100`；
- 置信度：`high`；
- 必须保留原始事件引用。

### 7.3 推断命中

没有明确调用事件时，默认评分组件：

| 证据 | 最大分值 |
| --- | ---: |
| Workflow/AGENTS 明确路由匹配 | 30 |
| Skill trigger/name/description 与任务匹配 | 25 |
| 当前项目、目录和 Profile 技术栈匹配 | 20 |
| Tool/文件/角色信号与 Skill 能力匹配 | 15 |
| 时间顺序和相邻 Span 支持 | 10 |

反向证据可扣分：

- 明确路由到其他 Skill；
- Skill 不适配当前技术栈/目录；
- Skill 版本不可用；
- Tool/输出与 Skill 声明明显冲突；
- 时间顺序无法成立。

推断指数最高显示 `89`，避免与精确调用混淆。评分策略必须有版本，并展示每个加/扣分项。

推荐等级：

- `80-89`：高置信推断；
- `60-79`：中置信推断；
- `1-59`：弱匹配，仅作候选；
- `0`：未匹配或被排除。

## 8. 界面结构

### 8.1 会话列表

使用表格或虚拟列表，字段：

- 时间；
- 项目；
- Harness；
- 用户消息摘要；
- Skill 候选/调用数量；
- Token；
- 耗时；
- 状态；
- 证据置信度。

支持按项目、Session、时间、Harness、Skill、状态、精确/推断和置信度筛选。

### 8.2 Turn 执行链

点击一条消息后显示：

```text
用户消息
  └─ 系统路由
      ├─ Project Profile
      ├─ Workflow 选择
      └─ Skill 候选评估
          └─ Skill 调用
              ├─ Tool 调用
              └─ 验证
                  └─ 响应完成
```

主视图提供两种切换：

- `时间线`：适合按时间阅读每一步；
- `链路树`：适合查看父子调用和 Workflow 层级。

每个步骤显示时间、耗时、状态、类型、精确/推断标记和关键指标。实时监控时新增 Span 原位更新，不改变已有步骤顺序。

### 8.3 Skill 命中快捷查看

点击时间线、链路树或命中 Skill 列表中的 Skill 名称，在当前页面右侧打开只读详情抽屉，不跳离会话、不重置滚动位置。

抽屉包含四个 Tabs：

1. `概览`
   - Skill 名称、角色、当前/运行版本；
   - 命中状态、命中指数、置信度；
   - 触发时间、耗时、Token、Tool；
   - 项目、Workflow 和节点。
2. `内容`
   - 只读查看本次运行版本的 `SKILL.md`；
   - 优先定位并高亮命中的 trigger、description 或相关章节；
   - 大文件按章节懒加载，不一次渲染全文；
   - 显示行号和项目相对路径。
3. `命中证据`
   - 每个指数加/扣分项；
   - 精确/推断来源；
   - 事件、路由、Profile、Tool 和时间证据；
   - 未采用其他候选的原因。
4. `版本`
   - 本次运行版本、当前磁盘版本和版本指纹；
   - 文件已变化时显示“当前版本与运行版本不同”；
   - 支持查看差异或历史快照，不用当前内容冒充历史内容。

抽屉顶部提供带 Tooltip 的图标操作：

- 在技能库打开完整详情；
- 在图谱中定位；
- 打开项目相对源文件；
- 复制 Skill 引用；
- 关闭。

关闭按钮、`Esc` 和返回操作必须可用；关闭后焦点回到原 Skill 节点，当前 Session、Turn、筛选和滚动位置保持不变。

### 8.4 完整 Skill 详情

“在技能库打开”进入完整 Skill 详情，并携带 `return_context`：

- 原 Session/Turn/Trace；
- 原 Span；
- 原筛选和滚动位置。

返回后恢复会话链路，不要求用户重新搜索。

## 9. 内容访问与异常状态

- Skill 内容只有在项目/root 已授权时可读取；
- 远程 inactive candidate 显示候选内容和供应链状态，不标为已调用；
- 文件已移动或删除时显示历史版本/摘要和明确错误；
- 没有历史快照时不能用当前文件替代历史版本；
- 内容解析失败时仍显示事件、版本和证据；
- secrets、私有路径和未授权引用继续按 TASK-05 脱敏。

## 10. 精确链路与推断链路

事件来源优先级：

1. Harness/App Server 原生 Turn/Tool/Usage 事件；
2. 受信任 Hook；
3. 结构化 Session JSONL；
4. 普通日志解析；
5. 时间/关键词启发式推断。

只有前两类明确 Skill 事件可以证明精确调用。结构化 JSONL 如果没有 Skill 调用字段，只能证明会话和 Tool 事实，Skill 仍标为推断。

## 11. 存储与查询

原始事件继续使用 append-only JSONL；SQLite 增加：

- `sessions`
- `turns`
- `traces`
- `trace_spans`
- `span_events`
- `skill_route_candidates`
- `skill_hit_evidence`
- `skill_content_snapshots`

索引：

- `session_id, turn_sequence`
- `trace_id, sequence`
- `project_id, received_at`
- `skill_id, started_at`
- `capture_mode, confidence`

大列表使用游标分页和虚拟滚动；Span 详情、Skill 内容和历史版本按需加载。

## 12. 隐私与生命周期

- 默认不保存完整用户消息、模型回复和 Tool 参数；
- 保存摘要、哈希、状态、时间、Token、Skill/Tool 标识和证据引用；
- 用户可以按项目、Session、时间和内容类型清理；
- 删除 Session Trace 需要预览其评分、图谱和建议影响；
- 关闭监控停止新增实时事件，但保留已有可清理记录；
- 归档 Trace 默认不参与当前健康和自动进化。

## 13. 实施阶段

### Phase 1：可回放会话链

- 保留现有 Session JSONL 的事件顺序；
- 建立 Session、Turn、Trace、Span 表；
- 支持时间线、精确/推断标记和 Skill 快捷抽屉；
- 不要求实时 App Server。

### Phase 2：命中指数与版本下探

- 增加路由候选和命中证据；
- 增加 Skill 内容高亮、历史版本和差异；
- 与技能库、图谱、评测报告互相跳转。

### Phase 3：实时精确链路

- 接入支持的 App Server/Hook；
- 增量更新运行中的 Span；
- 显示门禁、Workflow 节点和 Provider Token；
- 不支持时降级为刷新式日志观察。

## 14. 状态与错误码

| 错误码 | 含义 | 推荐动作 |
| --- | --- | --- |
| `TRACE_SESSION_UNMATCHED` | Session 无法归属当前项目 | 选择项目或保持未归属 |
| `TRACE_TURN_BOUNDARY_UNKNOWN` | 无法识别消息边界 | 按 Session 展示并标记推断 |
| `TRACE_SPAN_ORDER_AMBIGUOUS` | 步骤顺序证据不足 | 显示推断链，不伪造顺序 |
| `TRACE_SKILL_INVOCATION_UNPROVEN` | 只有命中线索，没有明确调用 | 标记 inferred |
| `TRACE_SKILL_CONTENT_UNAVAILABLE` | Skill 文件或历史快照不可用 | 显示证据和版本错误 |
| `TRACE_SKILL_VERSION_DRIFT` | 当前版本不同于运行版本 | 打开版本差异 |
| `TRACE_SOURCE_PERMISSION_DENIED` | 未授权读取日志或 Skill 内容 | 查看授权范围 |
| `TRACE_EVENT_CORRUPT` | 事件损坏或无法重放 | 隔离坏事件并保留其他步骤 |
| `TRACE_INDEX_REBUILD_REQUIRED` | SQLite Trace 投影不一致 | 从 JSONL 重建 |

## 15. 对现有实现的影响

后续实现预计涉及：

- `TelemetryService` 从仅聚合 Run 扩展为保留有序 Session/Turn/Span 事件；
- `LocalToolTelemetryService` 保留事件顺序、消息边界、候选和证据，不只生成 Skill Run 汇总；
- 扩展 TASK-03 Adapter 协议的 Turn、Route、Skill、Tool 和 Verification 事件；
- 增加 Trace 查询、分页、Skill 内容和历史版本 API；
- 新增会话列表、时间线/链路树、Skill 快捷抽屉和跨模块返回上下文；
- Skill 库调用次数、项目心跳、Graph 和评测报告统一跳转到同一个 Trace Explorer；
- 命中指数策略版本化，并与精确调用状态分开存储。

## 16. 验收标准

- [ ] 一条用户消息能够映射到 Session、Turn、Trace 和有序 Span。
- [ ] 系统路由、Workflow、Skill、Tool、验证和响应使用不同节点类型。
- [ ] 每一步展示时间、耗时、状态、来源、精确/推断和证据。
- [ ] Skill 候选、匹配、选择、加载、调用和完成不会混为一个状态。
- [ ] 命中指数显示分项证据和策略版本，不被描述成概率。
- [ ] 精确调用为 100；推断命中最高 89，并清楚标记 inferred。
- [ ] 点击命中的 Skill 在当前页面打开只读快捷抽屉，不丢失 Session 上下文。
- [ ] 抽屉支持概览、内容、命中证据和版本四个 Tabs。
- [ ] 内容视图定位命中章节，显示运行版本；版本漂移时提供差异。
- [ ] 可以从抽屉进入技能库、图谱和源文件，并能返回原 Trace 位置。
- [ ] 无历史内容时不会使用当前文件伪装历史版本。
- [ ] 默认不保存完整 Prompt/回复，Session 日志支持按范围清理。
- [ ] 大量会话、Turn 和 Span 使用分页、虚拟滚动和懒加载。
- [ ] 仅有日志推断时不会宣称完整精确执行链。

## 17. 不在本任务范围

- 不保证所有 Harness 都能提供精确 Skill 调用事件。
- 不默认保存完整用户消息、模型回复或 Tool 参数。
- 不把系统路由当成 Skill 调用。
- 不从时间邻近关系自动生成高置信精确链路。
- 不在快捷抽屉中直接编辑或覆盖 Skill。
- 不替代 TASK-05 的证据生命周期和 TASK-06 的 Workflow Graph。

## 18. 已确认设计决策

1. 日志产品形态采用“会话列表 + Turn 时间线/链路树 + 步骤详情”，不以原始 JSONL 作为主要界面。
2. 系统路由、Workflow、Skill、Tool 和验证分类型记录，Skill 具有候选、匹配、选择、加载、调用、完成等状态。
3. 命中指数不是概率；精确调用为 100，推断指数最高 89，并显示加/扣分证据。
4. 点击命中的 Skill 在当前会话右侧打开只读快捷抽屉，包含概览、内容、命中证据和版本。
5. Skill 内容优先定位命中章节，显示本次运行版本；当前版本变化时提供差异而非替代历史内容。
6. 技能库、图谱、项目心跳和评测报告统一跳转到同一个 Trace Explorer，并保留返回上下文。
7. 默认只保存摘要、哈希和结构化事件，不保存完整 Prompt/回复。

以上设计决策已确认；实现按第 1.1 节的阶段状态持续推进。
