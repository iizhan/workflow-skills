# TASK-WF-07A: Codex 精确观测 Adapter POC

**状态**: 已实现，受控验证确认流和固定协议测试已完成，待用户验收  
**日期**: 2026-07-23  
**依赖**: TASK-WF-03、TASK-WF-05、TASK-WF-06  
**影响等级**: high  
**当前本机基线**: `codex-cli 0.131.0`，`codex app-server` 可用且标记为 experimental。

## 1. 目标

证明 Skill OS 能否在用户明确授权的单个项目内，以 Codex App Server 的原生事件建立可信的会话、Turn、Item、工具和 Token 生命周期证据，并严格区分：

- App Server 已连接；
- 精确会话/Turn/工具事件已收到；
- 精确 Skill 调用事件已收到；
- 仅能从项目规则或日志推断 Skill 命中。

这不是自动执行任务，也不是对桌面端既有会话的监听器。它是后续受控 Workflow 执行入口前的兼容性和安全 POC。

## 2. 已核对事实

1. 当前本机 `codex app-server --help` 提供默认 `stdio://`、Unix socket、WebSocket 和 `generate-json-schema`；命令明确标记为 experimental。
2. 官方 App Server 文档将其定位为自有产品的深度集成接口，可提供线程、审批和流式 Agent 事件；每个 CLI 版本生成的 Schema 仅对该版本有效。
3. 现有 Workflow 协议已规定：只有 Harness 或受信任 Hook 明确发出 Skill 调用事件时，才可记为 `invoked_precise`。线程、Turn 或 Item 生命周期本身不能升级为精确 Skill 调用。

## 3. 锁定边界

### 3.1 本期做

- 用当前 `codex-cli` 版本生成并校验 App Server JSON Schema，记录 CLI 版本、Schema 指纹与支持的生命周期事件。
- 在用户于某个已绑定项目中明确点击“开启精确观测”之后，启动一个仅本机 `stdio` 的 App Server 子进程，并以 Skill OS 客户端身份完成 `initialize` / `initialized` 握手。
- 仅保存协议允许的摘要、ID、时间、状态、Token 来源、Item 类型、证据哈希和脱敏标记；原始 Prompt、原始输出和完整工具参数默认不保存。
- 将原生 Thread、Turn、Item、完成/中断和 Token 生命周期映射到现有统一事件信封与 Trace。
- 在项目详情显示启动、连接、版本不兼容、无精确 Skill 字段、权限拒绝、进程退出和用户关闭等明确状态。
- 提供一键停止和授权撤销；停止后关闭子进程与本地管道，不再接收新事件。
- 仅在观测器已就绪、用户再次确认后，允许发起固定的本机受控验证：独立 `ephemeral` Thread、`readOnly`、禁网、`never` 审批、固定回复验证语句；完成后归档临时 Thread。

### 3.2 本期不做

- 不修改 `~/.codex/config.toml`、`~/.codex/hooks.json`、项目 `.codex/`、`AGENTS.md` 或业务代码。
- 不扫描、接管、迁移或回填当前 Codex 桌面端已经打开的会话。既有会话能否 `thread/resume` 必须由 Schema 和一次显式测试证明，不能预设支持。
- 不开放 WebSocket、TCP、远程控制或跨机器连接；只允许桌面应用创建的本机 stdio 子进程。
- 不把 App Server 生命周期、目录匹配、Skill 文件存在、AGENTS 指令加载或工具调用等同为精确 Skill 调用。
- 不自动发起模型 Turn、Shell、项目脚本或业务改动。用于 E2E 的无副作用诊断 Turn 需单独确认。
- 不进入 Claude Code Adapter、自动 Workflow 编排、后台常驻监控和远端事件同步。

## 4. 交互与状态机

```text
未启用
  -> 用户查看权限预览
  -> 用户确认项目、数据范围、CLI 版本
  -> 正在生成 Schema / 校验能力
  -> 就绪但未创建会话
  -> 用户明确开始受控会话后，观测中
  -> 用户停止 / 项目解绑 / 进程退出 / 版本不兼容
  -> 已停止或需要修复
```

- 默认状态为“未启用”，而不是“已连接”。
- 首次只允许 Schema 和握手验证；不发送任何 Turn。
- “开始受控会话”必须显示项目目录、Sandbox/审批策略、数据保存范围、预期模型请求和停止入口。
- 受控验证不是自由输入框，不承载业务任务。弹窗只显示固定范围和防护条件，最终“确认并运行”才可发送 `thread/start` / `turn/start`。
- 验证摘要只记录目标项目根目录、状态、生命周期数量、Item 类型、Token 总数、归档结果、停止原因和由 TraceService 生成的脱敏 Trace ID；不保存 Prompt、模型回复、命令、工具/文件载荷路径、Item ID 或原始 App Server Thread/Turn ID。
- 受控验证完成后，只有对应 Turn 已持久化为本地 Trace 时，项目详情和结果弹窗才显示“打开会话链路”。跳转会先确认该 Trace 存在；未构建或不可用时明确说明原因，不会按“最新记录”猜测跳转。
- Schema 未声明可映射的 Skill 身份字段时，界面必须显示“精确会话可用，精确 Skill 不可用”，所有 Skill 指标仍保持推断。

## 5. 实施任务

| ID | 子任务 | 产出 | 完成条件 |
| --- | --- | --- | --- |
| WF07A-01 | CLI 与 Schema 探测 | `AppServerCapabilitySnapshot`、版本/Schema 指纹、事件能力表 | 仅使用本机 CLI 输出，可重复识别版本变化 |
| WF07A-02 | 受控 stdio 生命周期客户端 | 最小启动、握手、超时、退出、停止实现 | 无网络监听；关闭后无残留子进程或管道 |
| WF07A-03 | 事件正规化与证据边界 | Thread/Turn/Item/Tool 映射、隐私过滤、幂等规则 | 原文不落库；Token 与来源可追溯 |
| WF07A-04 | 精确 Skill 判定器 | 基于 Schema 的字段白名单与降级状态 | 无显式字段时绝不写 `invoked_precise` |
| WF07A-05 | 项目级授权与诊断 UI | 预览、确认、运行中、停止、修复和事件时间线 | 每个状态有加载、成功、失败或阻塞反馈 |
| WF07A-06 | 固定用例与 E2E | Schema 变化、握手、关闭、隐私、无 Skill 字段、精确字段、崩溃恢复 | 不依赖业务项目，不触发真实业务改动 |

### 5.1 本次实现结果

- `WF07A-01`：完成。本机 Schema 按 Codex CLI 版本生成到 Skill OS 应用存储，并记录版本、协议版本、Schema 指纹、生命周期方法和 Skill 事件能力。
- `WF07A-02`：完成。仅在用户点击后，以目标项目为 `cwd` 启动 `codex app-server --listen stdio://`；首次只进行 `initialize` / `initialized` 握手，不创建 Thread 或 Turn。超时、进程异常、手动停止、项目解绑、保存时移除项目和应用退出均会清理进程。
- `WF07A-03`：完成。只白名单映射 `thread/started`、`turn/started`、`item/started`、`item/completed`、`turn/completed`、`thread/tokenUsage/updated`。Thread-only 事件使用明确标注的协议载体；Item 仅保存类型和哈希 ID；嵌套 Token 总数可追溯。
- `WF07A-04`：完成。实际 `0.131.0` Schema 未提供 `skill/invoked`、`skill/completed` 或 `skill/failed` 通知；界面和数据模型均保持 Skill 证据为推断，绝不伪造精确调用。
- `WF07A-05`：完成。项目运行监控新增本机精确观测 POC，显示未启用、检查中、就绪、观测中、已停止、不支持和需要处理状态，以及 CLI、Schema、生命周期数量、Skill 精确能力、停止入口与错误摘要。观测器就绪后才展示“运行受控验证”；按钮先打开二次确认弹窗。验证 Turn 已入库时，结果弹窗和项目详情可精确跳转到这条会话链路。
- `WF07A-06`：完成固定用例、UI 回归和真实无副作用 E2E。固定用例拒绝任何非 `ephemeral`、非只读、非禁网或非 `never` 审批请求，并验证 Thread 归档、不保存 Prompt/Output/原始 Thread/Turn ID，以及只关联对应验证 Turn 的 Trace。真实 E2E 以 `mall_side/code` 启动 `ephemeral` Thread，在 `readOnly` 沙箱和 `never` 审批下完成临时 Turn；收到 Thread、Turn、Item、Token 生命周期，Item 仅为 `userMessage`、`agentMessage`，项目 Git 状态未变化。App Server stderr 被忽略且不落库。

## 6. 影响范围

- `skill-management-workbench/src/main/`: 新增 App Server Capability / Process / Event 服务；扩展 `TraceService` 和连接诊断。
- `skill-management-workbench/src/shared/types.ts`: 新增能力快照、授权、进程状态和原生事件映射类型。
- `skill-management-workbench/src/preload/index.ts` 与 `src/main/index.ts`: 增加严格的 IPC 白名单。
- `skill-management-workbench/src/renderer/src/`: 项目详情运行监控新增“精确观测”授权和状态，不改变已有 JSONL 导入入口。
- `skill-management-workbench/src/main/database.ts`: 只存脱敏事件摘要、版本、证据引用和受控验证摘要；不新增长文本会话内容。
- `skill-management-workbench/scripts/`: 新增 Mock App Server 固定用例和关闭/恢复验证。
- `specs/workflow-architecture/`: 补充 Schema 兼容、授权、回退和验收证据。

不影响任何已绑定项目的业务代码、Workflow 文件或全局 Codex 配置。

## 7. 质量、安全与性能门禁

- 子进程仅在用户明确启用的项目存在，应用退出、项目解绑、用户停止、授权撤销和异常退出均必须清理。
- `stdio` 是唯一允许的传输；禁止在 POC 中暴露端口或 Unix socket 给其他进程。
- Schema 与 CLI 版本不匹配时拒绝启动，不做猜测性字段解析。
- 事件输入采用上限、背压、幂等键和批量 SQLite 写入；仪表盘只消费聚合，避免每条事件触发整页刷新。
- 运行中每个 Item 只保留白名单字段，敏感字段默认删除；保留本地清除入口和证据过期策略。
- 任何项目命令、模型 Turn、审批策略或 Sandbox 变化都必须是单独、可见、可撤销的用户动作。

## 8. 验收标准

1. 未授权时不会启动 App Server，且界面明确解释未启用原因。
2. 当前 CLI Schema 可生成、签名并与能力快照绑定；升级后自动提示重新校验。
3. 启动只使用 stdio，本地无监听端口；停止、崩溃和应用退出后无残留子进程。
4. Thread、Turn、Item、Token 与完成/中断可以精确记录并在会话链路中下探；受控验证只在其对应 Turn 已入库时才可打开精确链路，工具执行仍只在 App Server 真实发出对应 Item 时按白名单摘要记录。
5. 没有 Schema 支持的显式 Skill 身份时，Skill 只能显示推断，不得增加精确调用次数。
6. 所有存储事件均通过隐私过滤；导出、日志和错误提示不包含原始 Prompt/Output。
7. Mock 固定用例、类型检查、构建、布局检查和 UI 自测均通过；真实无副作用 E2E 使用 `ephemeral` Thread、`readOnly` 沙箱和 `never` 审批完成，未观察到命令或文件变更 Item，项目 Git 状态保持不变。

## 9. 风险与停止条件

| 风险 | 处理 |
| --- | --- |
| `0.131.0` Schema 不稳定或缺少所需事件 | 标记“当前版本不支持精确观测”，保持 JSONL / 推断路径，不启用 Hook 兜底 |
| App Server 没有精确 Skill 字段 | 仅交付精确会话/Turn/工具观测，Skill 指标不升级；后续由 Workflow 启动入口提供显式关联 |
| 子进程意外保留授权或资源 | 以父进程监督、超时、退出钩子和测试断言处理；无法证明清理则不发布 |
| 数据量影响桌面端 | 事件批处理、摘要化、限额和页面按需读取；超限自动降级为聚合 |
| 用户误以为接管既有桌面会话 | UI 明确写“仅 Skill OS 发起的受控会话”；既有会话只读日志 / JSONL 保持独立 |

## 10. 后续产品确认项

1. 二次确认界面已实现：显示项目目录、临时 Thread、只读禁网、`never` 审批、固定范围、90 秒超时、Token 事后预警和停止逻辑。
2. 是否把真实握手 E2E 结果纳入发布门禁，并保留可重复执行的受控验收脚本。
3. POC 首期只支持 Codex，不同时扩展 Claude Code。
4. Schema 无显式 Skill 身份字段时，接受“精确会话证据 + 推断 Skill 证据”的降级结果，不以不可靠规则伪造精确调用。
