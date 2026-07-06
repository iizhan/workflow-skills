# Case: Codex And Claude Code Harness Parity

## Goal

Verify that generated projects distinguish Codex and Claude Code workflow behavior without forking the core project rules.

## Prompt

```text
In a generated project, explain how the same project-local skills workflow should be used from Codex and from Claude Code. Make sure hooks, commands, MCP, agents, and security boundaries are not treated as identical.
```

## Expected Contract

- Shared authority remains `AGENTS.md` and `.specify/memory/constitution.md`.
- Shared reusable skills live under `.agents/skills`.
- Codex-specific guidance lives in `docs/Codex团队开发说明.md`.
- Claude Code-specific guidance lives in `docs/ClaudeCode团队开发说明.md`.
- Codex guidance relies on `AGENTS.md`, sandbox/approval, project-local skills, optional MCP, and optional multi-agent.
- Claude Code guidance may mention hooks, slash commands, subagents, and Claude-specific settings as opt-in extensions.
- Hooks are not enabled by default and cannot bypass requirement, scope, review, verification, or test-report gates.

## Evidence To Look For

- `doctor` requires both Codex and Claude Code docs.
- Generated `docs/AI协作架构.md` describes the shared layer and harness-specific layer.
- Generated Claude Code doc warns against default hooks and unsafe external effects.
- Generated Codex doc includes security review, verification loop, session summary, and upgrade advisor in the workflow.

## Common Baseline Failure

- assumes Codex and Claude Code have identical hook support
- installs global MCP/hook defaults into every generated project
- puts harness-specific rules into `AGENTS.md` instead of docs
- lets Claude hooks write, push, publish, or mutate remote resources automatically
