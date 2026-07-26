# TASK-03 Codex / Claude Harness Adapter 统一协议

## 1. 文档状态

- 任务：`TASK-03`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`high`
- 前置任务：`TASK-01`、`TASK-02`
- 目标：统一 Codex、Claude Code 和未来 Harness 的能力声明、项目匹配、事件上报、Skill 归因、Token 口径、心跳、隐私和并行隔离规则。

本任务只定义 Adapter 协议，不立即安装 Hooks，不启动 App Server，不修改用户全局 Codex/Claude 配置。

## 2. 当前问题

当前 Skill OS 能从本地日志推断项目目录、工具调用、Skill 名称和 Token，但一个综合状态同时承担了多种含义：

- 项目是否已经安装 Workflow
- Harness 是否能发现项目入口
- 当前会话目录是否匹配项目
- Skill 是否出现在可用列表
- Skill 是否真正被路由或调用
- 运行证据是精确事件还是日志推断

这导致“已配置待连接”“已连接待触发”“有运行但没有调用”等状态难以解释。统一协议必须把这些维度拆开。

## 3. Adapter 架构

```text
Harness 原生事件 / Hooks / Session Logs
  → Harness Adapter
  → 统一事件校验与隐私过滤
  → 幂等事件日志
  → SQLite 运行、Token、图谱和质量视图
  → Skill OS 项目管理与评测界面
```

每个 Adapter 只负责把一个 Harness 的真实能力映射到统一协议，不复制项目业务规则，不修改共享 Skill 内容。

## 4. Adapter 能力清单

每个 Adapter 必须声明能力，不能根据厂商名称假设功能一定存在。

建议配置：

```yaml
adapter_id: "codex-local"
harness_id: "codex"
adapter_protocol_version: "1.0"
adapter_version: "0.1.0"
entry_files:
  - "AGENTS.md"
skill_roots:
  - ".agents/skills"
capabilities:
  native_session_events: true
  native_turn_events: true
  native_tool_events: true
  native_skill_events: false
  provider_usage_tokens: conditional
  project_cwd: true
  hooks: optional
  write_preview: external
  filesystem_sandbox: harness_managed
privacy:
  raw_prompt_body: false
  raw_output_body: false
```

能力值统一使用：

- `true`：当前版本已验证支持
- `false`：当前版本不支持
- `optional`：需要用户启用或安装
- `conditional`：依赖运行入口、账号或事件源
- `inferred`：只能通过日志推断
- `unknown`：尚未验证

## 5. 状态模型

不再用一个状态字段表达全部问题，拆成三个维度。

### 5.1 接入状态

- `not_installed`
- `installed`
- `invalid`
- `upgrade_required`
- `read_only`

### 5.2 连接状态

- `source_unavailable`
- `source_ready`
- `workspace_unmatched`
- `workspace_matched`
- `recent_session_observed`
- `stale`
- `error`

### 5.3 Skill 观测状态

- `no_skill_evidence`
- `skill_available`
- `skill_routed_inferred`
- `skill_invoked_inferred`
- `skill_invoked_precise`
- `skill_completed`
- `skill_failed`

UI 可以合成一个简短标签，但详情必须显示三个维度和证据。例如：

```text
已安装 · 目录已匹配 · 等待 Skill 触发
已安装 · 最近会话已连接 · 推断触发 3 次
已安装 · 最近会话已连接 · 精确触发 1 次
```

## 6. 统一事件信封

```json
{
  "schema_version": "1.0",
  "event_id": "evt_...",
  "event_type": "skill.invoked",
  "occurred_at": "2026-07-14T10:00:00.000Z",
  "adapter": {
    "id": "codex-local",
    "version": "0.1.0",
    "protocol_version": "1.0"
  },
  "harness": {
    "id": "codex",
    "version": "..."
  },
  "project": {
    "project_id": "project_...",
    "workspace_ref": "hash:...",
    "cwd_match": "exact"
  },
  "session_id": "session_...",
  "turn_id": "turn_...",
  "run_id": "run_...",
  "workflow_ref": {
    "id": "workflow_...",
    "version": "0.7.0"
  },
  "skill_ref": {
    "id": "skill_...",
    "version": "sha256:...",
    "name": "project-profile-router"
  },
  "capture_mode": "precise",
  "confidence_score": 1,
  "source_ref": "hash:...",
  "usage": {
    "source": "provider_reported",
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "cached_input_tokens": 0,
    "reasoning_tokens": 0,
    "total_tokens": 0
  },
  "privacy": {
    "raw_prompt_stored": false,
    "raw_output_stored": false,
    "redaction_applied": true
  },
  "payload": {}
}
```

## 7. 标准事件类型

### 7.1 Adapter 和连接

- `adapter.discovered`
- `adapter.capabilities_reported`
- `adapter.connection_checked`
- `adapter.connection_lost`
- `workspace.matched`
- `workspace.unmatched`

### 7.2 会话和任务

- `session.started`
- `session.resumed`
- `turn.started`
- `turn.completed`
- `turn.failed`
- `session.ended`

### 7.3 Workflow 和 Skill

- `workflow.routed`
- `workflow.started`
- `workflow.completed`
- `workflow.failed`
- `skill.available`
- `skill.routed`
- `skill.invoked`
- `skill.completed`
- `skill.failed`

### 7.4 工具与验证

- `tool.started`
- `tool.completed`
- `tool.failed`
- `verification.recorded`
- `user.accepted`
- `user.revision_requested`

事件导入必须以 `event_id + adapter_id` 幂等，重复扫描同一日志不得重复计费或重复增加调用次数。

## 8. Skill 归因规则

必须区分：

| 层级 | 含义 | 是否计入调用次数 |
| --- | --- | --- |
| `available` | Skill 出现在 Harness 可发现范围 | 否 |
| `routed` | 任务被判断应进入该 Skill | 单独统计，不算完成调用 |
| `invoked_inferred` | 日志、文本或行为强烈表明 Skill 被调用 | 是，但标记推断 |
| `invoked_precise` | Harness/Hook 明确发出 Skill 调用事件 | 是，标记精确 |
| `completed` | Skill 调用有结束证据 | 是 |
| `failed` | Skill 调用有失败证据 | 是 |

以下情况不能单独证明 Skill 已触发：

- 项目存在 `.agents/skills`
- `AGENTS.md` 提到了 Skill 名称
- 当前会话目录匹配项目
- 任务执行了文件读取或命令
- Skill 名称只出现在系统可用列表

推断归因必须保存命中证据和置信度，不得覆盖精确事件。

## 9. Token 与成本口径

Token 数据分为：

- `provider_reported`：Harness/provider 返回的真实 usage
- `adapter_reported`：Adapter 从结构化运行事件读取
- `log_parsed`：从日志字段提取
- `estimated`：本地分词或启发式估算
- `unavailable`：没有数据

规则：

- 不把估算 Token 与真实 Token 相加。
- 同一运行出现更高质量来源时，用更高质量来源替换展示值，保留原证据。
- 模型、缓存、reasoning token 和计费口径不同，必须保留 Harness/provider 来源。
- 质量评分必须同时展示 Token 来源和置信度。

## 10. Codex Adapter Profile

### 10.1 项目入口

- Codex 在每次新运行或新会话开始时构建 `AGENTS.md` 指令链。
- 从项目根目录到当前工作目录逐层加载入口，较近目录规则覆盖较远规则。
- 仓库 Skill 从当前目录向上到仓库根目录的 `.agents/skills` 中发现。
- Skill 可显式调用，也可根据 `description` 隐式匹配。

因此项目刚应用 Workflow 后，旧会话不能默认视为已重新加载；Skill OS 应提示用户新建或重启目标目录中的任务。

### 10.2 事件来源分级

1. Codex App Server：线程、轮次、Item、工具等原生流事件，优先作为精确生命周期来源。
2. 受信任 Hooks：在用户明确启用和信任后提供生命周期或策略事件。
3. Session JSONL/TUI 日志：用于兼容已有 Codex 桌面端和 CLI，会话、目录和 Skill 归因按证据标记推断。

App Server 能提供精确线程/轮次/Item 生命周期，不代表每个版本都提供精确 Skill 调用事件；必须由能力清单报告。

## 11. Claude Code Adapter Profile

- 共享项目规则仍以项目 Git 中的工程契约和 Skill 为准。
- `CLAUDE.md`、Claude Skill 目录、Hooks、Commands 和权限能力由 Adapter 声明，不假设与 Codex 完全对等。
- Hooks 默认不自动启用；任何命令 Hook 必须经过信任、权限和隐私检查。
- 无原生 Skill 调用事件时，同样使用 `inferred`，不能因为 Claude 支持 Hooks 就自动标记为精确。
- Claude Adapter 的字段映射、事件名称和权限能力在实现阶段必须用对应版本文档和真实运行样本验证。

## 12. 双 Harness 并行隔离

同一项目并行运行 Codex 和 Claude Code 时：

- 使用不同 `adapter_id`、`session_id`、`turn_id` 和 `run_id`。
- 运行缓存按 `project_id + adapter_id + session_id` 隔离。
- Token 预算和成本先按 Adapter 分账，再汇总项目视图。
- Profile 可以共享读取，但每次运行记录使用的 Profile 指纹。
- 写项目文件必须经过 TASK-02 的项目锁和文件指纹复检。
- 两个 Harness 同时修改同一 Workflow/Skill 时生成冲突，不自动选择胜者。

## 13. 心跳和运行中状态

心跳表示“最近收到可信事件”，不等于模型进程永远运行。

建议：

- `live`：最近 2 个监控周期内有会话/轮次事件
- `fresh`：最近 15 分钟有事件
- `stale`：超过 15 分钟无事件
- `offline`：事件源不可用或被用户关闭
- `unknown`：只有历史日志，无法判断实时状态

阈值可配置，界面必须显示最后事件时间、来源和置信度。

## 14. 隐私和授权

- 默认只保存元数据、哈希、Token、状态和错误摘要。
- 原始 Prompt、完整回复和文件正文默认不保存。
- 用户开启原文存储时必须单独授权，并提供清理入口。
- Adapter 在写入前执行敏感字段清理。
- `source_ref` 默认保存哈希或受控相对路径，不在总览暴露完整私有路径。
- Hooks、App Server 和日志目录分别授权，不能因绑定项目自动获得全部权限。

## 15. 对现有实现的影响

后续实现预计涉及：

- `event-model.md` 升级统一事件信封。
- `LocalToolTelemetryService` 拆为 Adapter Discovery、Parser 和 Normalizer。
- `TelemetryService` 增加 Adapter、Harness、Project、Session、Turn 和事件幂等字段。
- `ManagedProjectRecord` 将接入、连接和 Skill 观测状态拆分。
- 项目管理界面显示状态维度、证据来源和最后观测时间。
- Token 报告区分 provider、adapter、日志解析和估算。
- Starter/Doctor 检查 Adapter 配置但不自动启用 Hooks。

## 16. 验收标准

- [ ] 项目安装 Workflow 不再自动等同于 Harness 已连接。
- [ ] 目录匹配不再自动等同于 Skill 已触发。
- [ ] Skill 可用、路由、推断调用和精确调用能够分别统计。
- [ ] Codex/Claude 的事件能够映射到同一信封，同时保留厂商原始来源。
- [ ] 同一项目双 Harness 并行不会混用 Session、Token 或缓存。
- [ ] 心跳显示最后事件时间、来源和置信度。
- [ ] Token 报告不会把估算值与真实值重复累计。
- [ ] 关闭遥测或事件源不可用时显示明确状态，不伪造运行中。
- [ ] 默认不保存原始 Prompt 和完整模型回复。

## 17. 不在本任务范围

- 不立即启用 Codex App Server 或项目 Hooks。
- 不自动修改用户全局 Codex/Claude 配置。
- 不保证所有 Harness 都能提供精确 Skill 事件。
- 不把 Skill OS 变成代理模型请求的强制网关。
- 不实现远程团队事件同步。

## 18. 官方依据与实现验证要求

Codex Adapter 实现时以对应客户端版本生成的 App Server Schema 和官方说明为准：

- [Build skills](https://learn.chatgpt.com/docs/build-skills.md)
- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md.md)
- [Hooks](https://learn.chatgpt.com/docs/hooks.md)
- [Codex App Server](https://learn.chatgpt.com/docs/app-server.md)

Claude Adapter 实现前必须补对应版本的官方能力核对和真实事件样本，不以 Codex 协议反推 Claude 行为。

## 19. 待用户确认项

1. 将项目状态拆为接入、连接、Skill 观测三个维度。
2. 目录匹配只表示 `workspace_matched`，不表示 Skill 已调用。
3. Codex 事件来源优先级为 App Server、受信任 Hooks、Session 日志。
4. 精确 Skill 调用只接受 Harness/Hook 明确事件；其他证据必须标记推断。
5. Token 按 provider、adapter、日志解析、估算分别标记，禁止重复相加。
6. 双 Harness 的 Session、缓存和 Token 分账隔离，项目 Profile 可共享读取。
7. 心跳表示最近事件，不等于模型进程持续运行。
8. 默认不保存原始 Prompt 和完整模型回复。

本任务已接受，后续 Adapter、遥测和项目状态实现必须遵守以上协议。
