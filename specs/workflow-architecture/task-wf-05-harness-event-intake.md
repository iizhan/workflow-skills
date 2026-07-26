# TASK-WF-05：受控 Harness 事件接入与 Workflow 运行关联

**状态**: 已完成并验收  
**日期**: 2026-07-22  
**依赖**: TASK-WF-01 至 TASK-WF-04、`TASK-03` Harness Adapter 协议、`TASK-13` 会话链路  
**影响等级**: high

## 目标

让本地导入的、受协议约束的 Harness 事件进入与现有 JSONL 推断相同的 Trace 数据平面，同时明确区分精确事件、路由状态和真实 Skill 调用。

## 范围

1. 校验 `schema_version: 1.0` 的统一事件信封：稳定事件 ID、时间、Adapter、Harness、项目工作目录、Session、Turn 与隐私声明必须齐全。
2. 只接受声明 `raw_prompt_stored: false` 和 `raw_output_stored: false` 的精确事件；不合规事件不进入 Trace 或指标库。
3. 保留 Adapter/Harness、Workflow 模板 ID/版本/节点、Skill 版本、Token 来源和脱敏状态。
4. `skill.routed`、`skill.loaded` 等精确观测状态可见，但不计入调用次数；只有 `skill.invoked`、`skill.completed`、`skill.failed` 计为精确调用。
5. 保持既有本地 Codex/Claude 日志推断、旧 `skill_run.*` 事件和重复导入幂等行为不变。

## 明确不做

- 不安装 Codex/Claude Hook，不修改用户全局配置。
- 不从桌面端启动 Harness、模型、Shell 或项目脚本。
- 不保存原始提示词、原始输出或未授权 Tool 参数。
- 不把 Workflow 路由、Skill 发现或目录匹配误报为 Skill 调用。

## 数据流

```text
可信 Adapter JSONL
  -> 信封与隐私校验
  -> 本地幂等遥测导入
  -> Session / Turn / Trace / Span
  -> 工作流节点、Skill 状态、Token 与证据视图
```

## 验收

- 有效 JSONL 可产生精确 Trace、Workflow Span、节点和 Skill 完成状态。
- `skill.routed` 不增加精确调用数。
- Provider Token 可进入本地指标与 Trace。
- 带原始内容存储声明的事件被拒绝，且不写入 Trace。
- 重复导入不重复事件、不重复运行或重复计费。

## 验证证据

- `npm run test:harness-events`
- `npm run test:trace`
- `npm run typecheck`
- `npm run build`
- `npm run self-test:ui`
- `git diff --check`
