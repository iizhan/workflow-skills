---
name: project-session-summary
description: Summarize a completed or revision-requested Codex project session into durable project memory. Use after a feature, fix, review, investigation, or user acceptance decision to capture outcome, confirmed versions, changed files, verification, dissatisfaction categories, risks, and next action in .specify/memory/session-history.md and related specs.
---

# Project Session Summary

Use this skill at the end of a task to turn the session into reusable project memory.

## Workflow

1. Summarize the request, confirmed requirement/impact/plan versions, result, and user-visible outcome.
2. Record changed files, key decisions, verification state, user acceptance, risks, and remaining work.
3. Update the relevant `specs/<feature>/` artifacts when the task was tracked.
4. Add a short entry to `.specify/memory/session-history.md`.
5. When the user is dissatisfied, classify the reason as `requirement_miss`, `item_breakdown`, `plan_miss`, `implementation_defect`, `ui_interaction`, `verification_gap`, `communication_gap`, `skill_routing`, or `process_overhead`.
6. Record what evidence supports the category and which confirmed version was insufficient.
7. Tag repeated or high-impact friction with domain and severity.
8. Route repeated or high-impact workflow friction to `project-skill-upgrade-advisor`; keep one-off corrections as session evidence.

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
- `确认版本与验收状态`
- `已完成`
- `影响文件`
- `关键决策`
- `升级信号`
- `不满意分类与证据`
- `剩余风险`
- `下一步`
