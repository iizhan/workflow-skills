# 验证记录：Workflow 架构与注册协议

**功能标识**: `workflow-architecture`  
**任务**: `TASK-WF-01` 至 `TASK-WF-07A`  
**验证日期**: 2026-07-22  
**状态**: TASK-WF-01 至 TASK-WF-06 已验收；TASK-WF-07A 通过验证，待用户验收

## TASK-WF-01 已交付范围

- Manifest 1.1 静态校验器、无效 Fixture 与旧 1.0 只读兼容。
- 基础治理、前端角色、后端角色、设计稿到前端、设计稿到 API、Swagger 到前端联调六份声明模板。
- Workflow Registry 配置、路由 Skill、CLI `workflow-validate` 与 Doctor 集成。
- v0.7 至 v0.8 升级兼容说明与对应工程文档。

## TASK-WF-01 已执行验证

| 命令 | 结果 | 证明内容 |
| --- | --- | --- |
| `npm run validate:workflows` | 通过 | 内置 1.1 模板可解析、引用和组合关系有效 |
| `npm run test:workflow-manifests` | 通过 | 旧 1.0 声明以 `WORKFLOW_LEGACY_READ_ONLY` 通过；非法循环、无限 Loop、越权 Fixture 被拒绝 |
| `npm run doctor` | 通过 | 包级 Doctor 能识别当前 Workflow 资产与依赖 |
| `npm run smoke` | 通过 | 包级基本安装/命令路径可用 |
| `workflow-validate --output-dir <新建测试项目>` | 通过 | CLI 能校验生成项目的声明 |
| CLI Doctor 与 shell Doctor | 通过 | 两条健康检查路径都覆盖 Manifest 校验 |
| `bash -n` / `node --check` | 通过 | 新增 Shell 与 Node 脚本语法正确 |
| `npm run pack:dry-run` | 通过 | 发布包清单可生成 |
| `node evaluations/skills-workflow/scripts/check-contract.mjs` | 通过 | 对外契约检查通过 |
| `node evaluations/skills-workflow/scripts/evaluate-task-requirements.mjs --enforce` | 通过 | 任务要求评测通过 |
| `git diff --check` | 通过 | 无空白错误 |

## TASK-WF-01 已知基线问题

`node evaluations/skills-workflow/scripts/estimate-token-cost.mjs --enforce` 仍失败，但失败项是该任务开始前已有的 ordinary-dev、frontend、backend、security bundle Token 预算超限，不是本次新增路由 Skill 引入。新增 `project-workflow-router` 估算为 658 Token，低于 Router 预算 900。

## TASK-WF-02 已交付范围

- 桌面端本地 Template Registry：受控模板扫描、SQLite 索引、稳定 ID/版本/指纹与依赖/Skill 元数据。
- 项目 Binding：读取项目绑定文件与项目声明投影；`TASK-06` 旧声明只读显示且不会被改写。
- 兼容检查：模板静态状态、桌面端核心版本、项目 Workflow 版本、项目 Skill 依赖和模板可用性。
- Preview-Confirm-Apply-Verify：一次性预览令牌、预览过期、模板/绑定变更检测、原子写入、回读验证、失败恢复与升级回滚快照。
- Electron IPC/Preload API：列出模板、读取项目 Binding、生成预览、确认应用。

## TASK-WF-02 已执行验证

| 命令 | 结果 | 证明内容 |
| --- | --- | --- |
| `npm run test:workflow-registry` | 通过 | 未安装 starter 时阻断；显式绑定、回读验证、版本升级回滚、预览失效保护和 TASK-06 只读投影均通过 |
| `npm run test:starter` | 通过 | 保留已有 `AGENTS.md`，安装 27 个 Skill，重复应用保持幂等 |
| `npm run typecheck` | 通过 | 主进程、Preload、共享类型和预览 Mock 一致 |
| `npm run build` | 通过 | Electron 主进程、Preload 和渲染包均可构建 |
| `npm run smoke` | 通过 | 既有桌面端模块、交互和边界检查未回归 |
| `npm run layout:check` | 通过 | 未修改渲染布局且现有布局守卫通过 |
| `git diff --check` | 通过 | 无空白错误 |

## TASK-WF-03 已交付范围

- `Scenario Loop Run` 与 Iteration 的本地 SQLite 状态、稳定 ID、绑定 Template 版本、已确认包、质量、预算、根因/策略、停止原因和关闭时间。
- 默认上限：三轮完整迭代、同一根因两种不同策略；Loop 不是任务状态机，也不能自行修改项目业务代码、长期 Skill 或 Workflow。
- 严格门禁：总分、维度最低分、每个 required check 的证据、总体证据和阻塞缺陷共同决定是否可通过。
- Fail-closed 停止：范围/契约/权限/迁移/外部写入/发布变化、预算未知/临界/耗尽、重复策略、同根因策略耗尽和轮次上限都会停止或转为演进候选。
- 模板治理同步：项目路由、验证、测试报告、工作流状态模板、宪法和 Codex 使用说明都明确 Loop 的证据与停止边界。

## TASK-WF-03 已执行验证

| 命令 | 结果 | 证明内容 |
| --- | --- | --- |
| `npm run test:scenario-loop` | 通过 | 首轮通过、修复收敛、90 分硬门禁、范围变化、预算未知/耗尽、重复策略、策略耗尽与三轮上限均按协议停止或结束 |
| `npm run test:workflow-registry` | 通过 | Loop 前置的显式 Binding、版本锁定与兼容路径未回归 |
| `npm run test:starter` | 通过 | 新项目安装 27 个 Skill，模板可以被重复应用且不覆盖已有入口 |
| `npm run typecheck` | 通过 | 主进程、共享协议与桌面端类型一致 |
| `npm run build` | 通过 | Scenario Loop Service 已进入 Electron 主进程构建 |
| `npm run smoke` | 通过 | 既有工作台交互与模块边界未回归 |
| `npm run validate:workflows` | 通过 | 6 份 Manifest 的 DAG、Loop Policy 与权限约束仍有效 |
| `npm run test:workflow-manifests` | 通过 | 新旧 Manifest 静态验证 fixture 未回归 |
| `git diff --check` | 通过 | 无空白错误 |

## 当前交付边界

## TASK-WF-04 已交付范围

- 兼容与迁移：`TASK-06` 旧声明继续只读；影子迁移只生成新的 Binding 预览，确认后才原子写入 `.skill-os/workflow-bindings.yaml`，旧声明文件不被改写。
- 回退与快照：每次受管 Binding 都保存 Manifest 原始快照；升级、回退与再次回退均经过 Preview-Confirm-Apply-Verify。即使注册表源已升级，已捕获的精确旧版本仍可作为受控回退候选。
- 本地 Doctor：检查模板静态有效性、Binding 文档、当前兼容性、旧声明迁移可用性与版本升级风险；结果只读取项目本地状态。
- 桌面端工作流库：模板完整宽度表格、版本/依赖/Skill 引用、Manifest 组合流程图与脑图、项目 Binding/Doctor、Loop 运行质量/预算/停止原因和证据引用下探。
- 只读边界：Loop 查询已通过 Electron IPC/Preload 暴露；桌面端不提供创建、推进或自动执行 Loop 的入口，更不会启动 Harness 或业务代码。
- 三类标准场景用例：设计稿到前端、设计稿到 API、Swagger 到前端联调均使用已确认包、显式 Binding 和质量门禁通过首轮收敛验证。

## TASK-WF-04 已执行验证

| 命令 / 检查 | 结果 | 证明内容 |
| --- | --- | --- |
| `npm run test:workflow-registry` | 通过 | Starter 缺失阻断、影子迁移不改旧文件、升级快照、源版本缺失时的快照回退、预览过期与并发变更保护均通过 |
| `npm run test:scenario-loop` | 通过 | 设计稿到前端、设计稿到 API、Swagger 联调三类场景可在显式 Binding 与硬门禁下首轮通过；失败、范围、预算、策略与轮次停止规则未回归 |
| `npm run test:starter` / `npm run test:trace` | 通过 | Starter 幂等与现有 Trace 证据隔离未回归 |
| `npm run typecheck` / `npm run build` | 通过 | 主进程、Preload、共享协议、预览 API 和渲染模块一致，Electron 生产构建成功 |
| `npm run smoke` / `npm run layout:check` | 通过 | 新增工作流库被纳入导航与单模块展示；既有布局守卫无回归 |
| 浏览器截图复核 | 通过 | 修正了工作流库在单模块模式初始空白的问题；表格、流程图、脑图和“写入前预览”均可见且可交互 |
| `npm run validate:workflows` / `npm run test:workflow-manifests` | 通过 | 六份 Manifest、DAG、Loop 上限、权限与旧 1.0 兼容 fixture 未回归 |
| `node evaluations/skills-workflow/scripts/check-contract.mjs` | 通过 | Skills Workflow 对外契约仍符合要求 |

## 当前交付边界

本阶段提供声明、校验、Binding、Scenario Loop 和本地可视化控制平面。它不会自动执行 Harness、不会自动创建项目 Binding、不会自动修改业务代码，也不会把日志推断为精确的实际 Workflow 执行事实。工作流图与脑图展示的是 Manifest 组合结构；Loop 面板展示的是已记录的本地证据。真实 Harness 受控执行属于后续独立任务。

## TASK-WF-05 已交付范围

- 统一 Harness 事件信封校验：事件必须包含 Adapter/Harness、项目工作目录、Session、Turn、时间和隐私声明；声明保存原始提示词或输出的事件直接拒绝。
- Trace 关联：可信事件保留 Adapter/Harness、Workflow 模板 ID/版本/节点和 Token 来源，形成精确 Workflow Span。
- 调用边界：`skill.routed`、`skill.loaded` 等精确观测状态可追溯，但不会被算作调用；只有调用或终态事件计入精确调用指标。
- JSONL 导入：新信封和旧 `skill_run.*` 事件走同一幂等本地导入通道，未增加 Hook、后台执行或全局配置写入。

## TASK-WF-05 已执行验证

| 命令 / 检查 | 结果 | 证明内容 |
| --- | --- | --- |
| `npm run test:harness-events` | 通过 | 结构化 JSONL 的精确 Trace、Workflow 节点、Skill 调用、Token 指标和隐私拒绝均通过 |
| `npm run test:trace` | 通过 | 旧推断 Trace、历史聚合、幂等、会话归一化和新增 Adapter 信封不互相回归 |
| `npm run typecheck` | 通过 | 事件校验、遥测、Trace 与渲染层类型一致 |

## TASK-WF-06 已交付范围

- 项目详情运行监控显示独立的 Workflow 安装、Codex 连接和 Skill 观测状态，并单列精确与推断 Trace 数量。
- 就绪诊断是只读操作：它只读取项目文件标记、Workflow Doctor、本地会话来源和 Trace 摘要。
- 精确观测预览只列出用户明确选择 JSONL 的导入路径；“前往导入遥测”只定位到“分析 / 遥测”的文件选择器，实际导入仍须用户确认，不会安装 Hook、App Server 或修改全局 Codex 配置。

## TASK-WF-06 已执行验证

| 命令 / 检查 | 结果 | 证明内容 |
| --- | --- | --- |
| `npm run test:adapter-readiness` | 通过 | 只读保证、来源不可用、目录匹配、推断调用、精确完成和无写入预览均通过 |
| `npm run self-test:ui` | 通过 | 项目详情运行监控的三维状态、精确接入预览和无横向溢出可交互验证 |
| `npm run typecheck` / `npm run build` | 通过 | 主进程、Preload、共享类型、Preview API 和渲染层协议一致 |

## TASK-WF-07A 已执行验证

| 命令 / 检查 | 结果 | 证明内容 |
| --- | --- | --- |
| `npm run test:app-server-observation` | 通过 | Schema 生命周期探测、Token 嵌套总数、Thread 载体、隐私白名单和“无显式 Skill 事件不伪造调用”通过；固定 App Server 服务端拒绝非临时/非只读/非禁网/非 `never` 的验证请求，并验证临时 Thread 归档、Prompt/Output/原始 Thread/Turn ID 不落库，以及受控验证只关联自己的 Turn Trace |
| `npm run test:adapter-readiness` / `npm run test:trace` / `npm run test:harness-events` | 通过 | 接入器状态、精确事件信封、Trace 归因和隐私拒绝未回归 |
| `npm run typecheck` / `npm run build` / `npm run layout:check` | 通过 | 主进程、IPC、Preload、渲染状态和生产包一致，布局守卫通过 |
| `npm run self-test:ui` | 历史浏览器回归通过，当前环境无法启动隔离 Electron | 项目详情 POC 保持显式启用、明确停止入口和“Skill 仍为推断”提示；本次新增源码契约验证，确认受控验证仅打开二次确认弹窗且自测不点击最终“确认并运行” |
| 真实本机 App Server E2E | 通过 | 在 `/Users/bing/MyJob/Project/Codes/mall_side/code` 以 `ephemeral` Thread、`readOnly` 沙箱、`never` 审批完成临时 Turn；收到 `thread/started`、`turn/started`、`item/started`、`item/completed`、`thread/tokenUsage/updated`、`turn/completed`，Item 仅为 `userMessage` 与 `agentMessage`，Token 总数 28,835，项目 Git 状态未变化 |
