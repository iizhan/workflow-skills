# 执行任务：Workflow 架构与注册协议

**功能标识**: `workflow-architecture`  
**日期**: 2026-07-22  
**关联需求/设计/影响版本**: v1 / v1 / v1  
**任务拆解版本**: v1  
**确认状态**: TASK-WF-01 to TASK-WF-06 accepted; TASK-WF-07A implemented with no-side-effect E2E verification, pending user acceptance

## 1. 锁定范围

本任务是受控架构演进。它先交付可校验的 Workflow 架构基础，不在未确认前修改业务项目或启动任意 Harness 自动执行。

| 事项 | 子任务 | 依赖 | 完成条件 | 验证证据 |
| --- | --- | --- | --- | --- |
| ITEM-WF-001 | TASK-WF-01：Manifest 与分层协议 | 无 | 模板、绑定、Loop Policy 和质量门禁具备机器可读契约 | 已完成，Schema/fixture 校验通过；见 `verification.md` |
| ITEM-WF-002 | TASK-WF-02：Registry 与项目绑定 | TASK-WF-01 | 可发现、校验、预览和版本锁定 Workflow Binding | 已完成，Registry/兼容/Preview-Confirm-Apply-Verify/升级回滚测试通过；见 `verification.md` |
| ITEM-WF-003 | TASK-WF-03：Scenario Loop 协议 | TASK-WF-01 | Loop 与现有任务状态和 Workflow Run 可关联 | 已完成，状态/质量/预算/停止策略固定用例通过；见 `verification.md` |
| ITEM-WF-004 | TASK-WF-04：验证、迁移与可观察性 | TASK-WF-01 至 03 | 旧声明可读、升级可回退、证据可下探 | 迁移/回退/Trace/UI 测试 |
| ITEM-WF-005 | TASK-WF-05：受控 Harness 事件接入 | TASK-WF-01 至 04 | 精确事件、Workflow 节点和 Skill 调用可追溯且不混淆 | 信封/隐私/幂等/导入固定用例 |
| ITEM-WF-006 | TASK-WF-06：Adapter 就绪诊断 | TASK-WF-03 至 05 | 安装、连接和 Skill 观测分开显示，精确接入保持只读预览 | 就绪诊断/无写入/UI 固定用例 |
| ITEM-WF-007A | TASK-WF-07A：Codex 精确观测 Adapter POC | TASK-WF-03 至 06 | 只在用户明确启用的本地项目中，按本机 Schema 受控观测 App Server 生命周期；不虚构精确 Skill 调用 | Schema/版本/权限/事件映射/E2E 固定用例 |

## 2. TASK-WF-01：Manifest 与分层协议

- 允许路径：
  - `specs/workflow-architecture/`
  - `specs/skill-management-workbench/task-06-workflow-graph.md`
  - `project-engineering-workflow/references/`
  - `project-engineering-workflow/assets/template-root/.skill-os/`
  - `project-engineering-workflow/scripts/`
- 实施内容：
  1. 写入 Workflow Manifest 1.1 规范、示例和静态校验规则。
  2. 将 `TASK-06` 的 DAG 约束与 `Scenario Loop Run` 的跨迭代模型对齐。
  3. 提供基础、角色、场景、项目绑定的最小示例，不启用自动写入。
  4. 为无效 ID、循环依赖、缺失引用、无限 Loop、权限放宽和不兼容版本添加 fixture。
- 完成条件：契约可被脚本读取、静态验证，且旧 1.0 声明仍可识别为只读兼容输入。

## 3. TASK-WF-02：Registry 与项目绑定

- 允许路径：
  - `skill-management-workbench/src/shared/`
  - `skill-management-workbench/src/main/`
  - `skill-management-workbench/src/preload/`
  - `skill-management-workbench/scripts/`
  - `specs/workflow-architecture/`
- 实施内容：
  1. 增加 Template、Version、Binding、Compatibility 和 Validation 类型与本地索引。
  2. 提供只读扫描、校验、绑定预览和版本锁定；写入必须 Preview-Confirm-Apply-Verify。
  3. 保留 `TASK-06` 旧声明投影，不重写项目文件。
- 完成条件：模板与项目绑定可按稳定 ID 查询，升级/不兼容/回退状态可解释。

## 4. TASK-WF-03：Scenario Loop 协议

- 允许路径：
  - `project-engineering-workflow/assets/template-root/AGENTS.md`
  - `project-engineering-workflow/assets/template-root/.agents/skills/`
  - `project-engineering-workflow/assets/template-root/.specify/`
  - `skill-management-workbench/src/shared/`
  - `skill-management-workbench/src/main/`
  - `project-engineering-workflow/tests/`
  - `skill-management-workbench/scripts/`
  - `skill-management-workbench/package.json`
  - `specs/workflow-architecture/`
- 实施内容：
  1. 增加 Loop Run、Iteration、Root Cause、Strategy、Budget、Quality Evaluation 和 Stop Reason 协议。
  2. 将现有正式确认、验证、用户验收和演进提案映射为 Loop 的边界，不建立第二套任务真值状态。
  3. 默认实现三轮、同根因两策略、范围变化停止和硬门禁优先的策略。
- 完成条件：可通过固定样例证明首轮通过、修复收敛、重复策略阻止、范围扩大暂停和预算耗尽升级。

## 5. TASK-WF-04：验证、迁移与可观察性

- 允许路径：
  - `skill-management-workbench/src/renderer/src/`
  - `skill-management-workbench/src/main/`
  - `skill-management-workbench/src/preload/`
  - `skill-management-workbench/src/shared/`
  - `skill-management-workbench/scripts/`
  - `project-engineering-workflow/scripts/`
  - `evaluations/skills-workflow/`
  - `specs/workflow-architecture/`
- 实施内容：
  1. 增加旧声明兼容、影子迁移、备份、回退与 Doctor 检查。
  2. 在桌面端增加独立工作流库和项目 Loop 只读视图，不污染技能库或总览。
  3. 打通流程图、脑图、Trace、质量趋势与证据下探。
  4. 对三类标准场景建立可重复的评测用例。
- 完成条件：用户可在单个项目内查看版本、绑定、运行、Loop、证据和升级风险；所有操作有加载、成功、失败或阻塞反馈。

## 6. 验收与自测计划

1. 执行 TypeScript 类型检查、构建、桌面端 smoke、布局检查和工作流 Doctor。
2. 运行 Manifest fixture、兼容/升级/回退、路由、Loop 和质量门禁的专用测试。
3. 使用三类场景样例验证“设计稿到前端”、“设计稿到 API”、“Swagger 联调”。
4. 通过桌面端可见界面验证工作流库、项目绑定、版本状态、流程图、脑图、Loop 时间线和证据下探。
5. 审查 Git diff，确认没有写入任何未绑定项目、未授权目录、业务代码或原始会话内容。
6. 导入受控 Harness JSONL fixture，验证精确链路、Workflow 关联、调用计数与隐私拒绝。
7. 在项目详情运行监控验证 Adapter 就绪面板、精确/推断分层和无全局配置写入预览。

## 7. 风险与回退

- 风险：Manifest 协议与现有 `TASK-06` 图谱重叠。
  回退：保留旧声明和投影；新字段均为增量可选字段。
- 风险：Loop 被误实现为无限自动重试。
  回退：验证器拒绝无限预算和循环图；运行时默认停止并要求用户决策。
- 风险：大量 Workflow 导致桌面端性能下降。
  回退：只索引元数据、按项目筛选、懒加载图和异步汇总。
- 风险：旧客户端错误写入新格式。
  回退：旧版本只读，升级前建立备份，原子切换失败即恢复。

## 8. 确认与实施状态

- 设计方案版本：v1
- 任务拆解版本：v1
- 影响范围版本：v1
- 验收与自测计划：本文件第 6 节
- 用户确认：已验收 TASK-WF-01 至 TASK-WF-04。
- TASK-WF-01：已完成并验收。
- TASK-WF-02：已完成并验收。
- TASK-WF-03：已完成并验收。
- TASK-WF-04：已完成并验收。
- TASK-WF-05：已完成并验收；详细范围见 `task-wf-05-harness-event-intake.md`。
- TASK-WF-06：已完成并验收；详细范围见 `task-wf-06-adapter-readiness.md`。
- TASK-WF-07A：已实现并通过真实无副作用 E2E，待用户验收；详细范围见 `task-wf-07a-codex-precise-observation.md`。
