# Memory Conflict And Session Reflection

Load this reference when handling conflicting memories, session summaries, durable write proposals, or user confirmation.

## Session Reflection Workflow

1. Summarize the task outcome, user choices, why those choices mattered, and verification status.
2. Identify memory candidates with `space`, `type`, `retention`, `confidence`, `source`, and `reason`.
3. Ask the user before writing durable `user_private`, `team_shared`, or `agent_self` memory.
4. If the user rejects or edits a candidate, record the feedback in `task_session` only.
5. If approved, update the selected memory space and record the update in the delivery report.
6. If the learning should change the framework itself instead of only memory, route it to `$project-evolution-router`.

## Conflict Rules

- New user correction beats old memory.
- Explicit project source of truth beats remembered inference.
- Private memory cannot override team policy for shared work.
- Team memory needs a source or owner when it changes delivery behavior.
- When two memories conflict, surface both, ask for confirmation, and archive the weaker one after approval.

## Durable Write Proposal

Show proposed writes under `建议记忆` and blocked items under `不应记忆`.

Each proposed write should include:

- memory space
- memory type
- retention
- retrieval mode
- confidence
- source
- privacy or conflict risk

Do not write durable memory until the user confirms the exact candidate or approved edit.
