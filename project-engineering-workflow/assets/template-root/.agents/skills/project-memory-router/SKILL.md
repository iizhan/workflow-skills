---
name: project-memory-router
description: Govern project memory safely. Use when a request asks Codex to remember, forget, update, retrieve, summarize, personalize, share team knowledge, preserve session learnings, resolve memory conflicts, or decide whether information should become durable memory.
---

# Project Memory Router

Decide whether information stays in task context, becomes durable memory, is forgotten, or is blocked as sensitive.

Do not write private, shared, or agent-self memory silently. Prepare candidates, show them to the user, and wait for confirmation before durable updates.

## Quick Routing

- `task_session`: current feature state, choices, evidence, handoff notes
- `user_private`: stable user's preferences or private working context
- `team_shared`: sourced project facts, conventions, FAQs, decisions, glossary
- `agent_self`: confirmed process learnings for future AI work
- `blocked_sensitive`: secrets, credentials, tokens, OTPs, cookies, private third-party data, speculative personal facts

If identity is unavailable, keep private memory session-scoped unless the user selects a stable identity or storage space.

## When To Read References

- Read `references/memory-governance.md` when unsure which scoped memory reference applies.
- Read `references/memory-data-roles.md` when classifying `data_role`, privacy risk, sensitive fields, or memory space.
- Read `references/memory-retention-retrieval.md` when choosing retention, archive behavior, or retrieval mode.
- Read `references/memory-conflict-session.md` when handling conflicting memories, session summaries, durable write proposals, or user confirmation.
- Read `.specify/memory/memory-policy.md` before writing durable memory in a generated project.
- Read `.specify/memory/evolution-policy.md` or route to `$project-evolution-router` when a learning should change workflow rules instead of memory.

## Minimal Workflow

1. Classify the candidate and decide whether it is useful beyond this task.
2. Assign retention, confidence, source, privacy risk, and retrieval mode.
3. Show candidates under `建议记忆` and blocked items under `不应记忆`.
4. Ask for confirmation before durable writes.
5. Record approved changes in the delivery report.

## Output Format

- `记忆空间`
- `建议记忆`
- `不应记忆`
- `保留期限`
- `检索方式`
- `冲突/隐私风险`
- `需要用户确认`
- `会话复盘`
- `存储位置`
