# __PROJECT_NAME__ Claude Code 团队开发说明

这是项目在 Claude Code 中使用 AI 协作底座时的适配说明。

核心规则仍以 `AGENTS.md` 和 `.specify/memory/constitution.md` 为准。Claude Code 可以使用更丰富的 hooks、commands、subagents 或 MCP，但这些能力只能增强执行，不能绕过需求、范围、审查、验证和交付记录。

Claude Code 与 Codex 共用 `fast / standard / controlled` 三档任务通道、版本化确认和影响范围门禁。Hooks 不得把未确认的 controlled 任务自动推进到写入阶段，也不得把旧版本的“可以”解释为对新增范围的批准。

## 与 Codex 的共用层

- `AGENTS.md`
  - 项目最高调度入口
- `.agents/skills`
  - 项目本地 skills，和 Codex 共用同一套 `SKILL.md`
- `.specify`
  - 规格、方案、任务模板、会话历史、升级 backlog
- `specs`
  - 每个需求或功能的交付工件
- `docs/AI协作架构.md`
  - 跨 harness 的整体分层说明

## Claude Code 可选增强层

Claude Code 可以按项目需要增加：

- `.claude/commands`
  - 把常用流程封装成 slash command
- `.claude/settings.json`
  - 配置 hooks、工具权限、MCP 或项目级偏好
- `.claude/agents`
  - 角色化 subagent 配置
- hooks
  - 用于提醒、检查、记录或阻断明显危险操作

默认 starter 不自动生成这些文件，因为 hooks 和全局配置会增加权限面和上下文成本。只有项目明确需要时再接入。

## 推荐工作流

Claude Code 中仍按项目 skills 顺序执行：

1. `project-requirement-gate`
2. `project-codebase-onboarding`
3. `project-scope-impact-guard`
4. `project-tech-solution`
5. `project-superpowers-router`
6. `project-dev-core`
7. `project-stack-standards`
8. 前端任务进入 `project-frontend-standards` 和对应栈 skill
9. 安全敏感任务进入 `project-security-review`
10. `project-code-generation`
11. `project-code-review`
12. 重要变更进入 `project-verification-loop`
13. `project-test-and-report`
14. `project-session-summary`
15. 重复摩擦进入 `project-skill-upgrade-advisor`

## Hooks 使用边界

如果项目后续接入 Claude hooks：

- hooks 可以提醒、检查、记录、阻断危险操作
- hooks 不应自动改业务代码
- hooks 不应自动提交、推送、发布、删除远端资源
- hooks 不应写入 secrets、凭据或用户私有配置
- hooks 的结果必须回收到 review、verification 或 session summary
- hooks 检测到范围漂移时应阻断后续写入，并提示更新影响版本

## 与 Codex 的主要差异

| 维度 | Codex | Claude Code |
| --- | --- | --- |
| 项目入口 | `AGENTS.md` | `AGENTS.md` / `CLAUDE.md` 可选 |
| Skills | `.agents/skills/*/SKILL.md` | `.agents/skills` 或 Claude skill 目录 |
| Hooks | 默认无 Claude 风格 hooks parity | 可用 hooks，但默认不启用 |
| Commands | 指令式 workflow | 可选 slash commands |
| 多代理 | Codex multi-agent / subagents | Claude Code subagents |
| 安全边界 | sandbox / approval / instruction | permissions / hooks / instruction |

## 首轮接入建议

先不要急着加 hooks。

建议顺序：

1. 先确认 `AGENTS.md` 和 `.agents/skills` 能跑通一个真实需求。
2. 再根据重复摩擦补 `project-skill-upgrade-advisor` 记录。
3. 只有当同类检查需要自动化时，再新增 `.claude/settings.json` hooks。
4. hooks 接入后，必须补对应验证 case。
