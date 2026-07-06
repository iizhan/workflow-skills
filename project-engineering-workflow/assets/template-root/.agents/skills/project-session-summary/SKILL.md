---
name: project-session-summary
description: Summarize a completed Codex project session into durable project memory. Use after a feature, fix, review, or investigation to capture outcome, changed files, decisions, risks, and the next action in .specify/memory/session-history.md and related specs.
---

# Project Session Summary

Use this skill at the end of a task to turn the session into reusable project memory.

## Workflow

1. Summarize the request, result, and user-visible outcome.
2. Record changed files, key decisions, risks, and remaining work.
3. Update the relevant `specs/<feature>/` artifacts when the task was tracked.
4. Add a short entry to `.specify/memory/session-history.md`.
5. Tag repeated friction signals with domain and severity.
6. If the session reveals repeated friction, hand it to `project-skill-upgrade-advisor`.

## Friction Signals

Record a signal when the user corrected, repeated, or emphasized a workflow issue, such as:

- unclear UI interaction
- missing verification
- repeated code style correction
- repeated frontend layout failure
- repeated git or commit hygiene issue
- missing project-specific rule
- missing skill trigger or routing rule

Use project-scoped evidence. Do not upload session data or write global memory from this skill.

## Output Format

- `会话摘要`
- `已完成`
- `影响文件`
- `关键决策`
- `升级信号`
- `剩余风险`
- `下一步`
