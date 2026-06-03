---
name: project-memory-router
description: Govern project memory safely. Use when a request asks Codex to remember, forget, update, retrieve, summarize, personalize, share team knowledge, preserve session learnings, resolve memory conflicts, or decide whether information should become durable memory.
---

# Project Memory Router

Use this skill to decide what can become memory, who can read it, how long it should live, and how it should be retrieved later.

This skill does not write private or shared memory silently. It prepares memory candidates and asks for confirmation before durable updates.

## Inputs

- current user request and conversation context
- confirmed requirement, scope lock, or delivery report when available
- current `specs/<feature>/workflow-state.yaml` when available
- project memory policy from `.specify/memory/memory-policy.md`
- evolution policy from `.specify/memory/evolution-policy.md` when a reflection may change framework rules

## Memory Spaces

- `user_private`: one user, isolated by user identity when the host can identify the user. Store personal preferences, names, private context, last-topic continuity, and user-specific working style.
- `team_shared`: readable by the team. Store product facts, project conventions, FAQs, decisions, glossary, onboarding notes, and reusable troubleshooting knowledge.
- `agent_self`: agent improvement notes. Store task strategy learnings, successful workflows, failure patterns, and prompt/process adjustments.
- `task_session`: feature-scoped working memory under `specs/<feature>/workflow-state.yaml`. Store milestone state, decisions, evidence, open questions, user choices, and pending memory candidates.
- Durable memory records and their light index live under `.specify/memory-store/`.

If user identity is unavailable, do not merge private memories across people. Treat private memory as session-scoped unless the user explicitly selects a stable identity or storage space.

## What To Remember

Prefer durable memory only when information is likely to be useful again:

- `fact`: stable project, product, org, domain, or environment facts
- `preference`: user communication, UI, coding, naming, formatting, or workflow preferences
- `behavior_pattern`: what worked, what failed, and under what conditions
- `relationship`: people, teams, companies, ownership, collaboration graph, and role links
- `decision`: user or team choices, rejected options, rationale, and acceptance criteria
- `session_summary`: what was done, what changed, verification, uncovered areas, and next handoff

Do not remember secrets, credentials, sensitive personal data, private third-party data, speculation, or temporary facts unless the user explicitly asks and the retention is short.

## Retention Defaults

- private identity, address, environment, availability, or location context: short-lived unless explicitly marked persistent
- taste, tone, copy, or UI preferences: one week by default, refresh when reused successfully
- task state and handoff notes: until the tracked feature closes, then archive
- project conventions, product FAQ, architecture decisions: persistent until superseded
- agent_self process learnings: persistent only after user confirms the learning is accurate and useful
- stale or conflicting memories: mark inactive or archived instead of deleting unless the user asks to forget

## Retrieval Modes

- `exact_lookup`: names, IDs, explicit decisions, file paths, commands, ownership, dates
- `fuzzy_recall`: preferences, similar prior tasks, repeated feedback, tone or style patterns
- `multi_hop_reasoning`: relationships, product graph, cross-feature history, cause/effect, user choice rationale

Start with exact lookup for high-stakes facts. Use fuzzy recall for preferences and behavior patterns. Use multi-hop reasoning only when the chain can be explained and uncertainty is labeled.

Practical retrieval order:

1. current conversation state
2. `specs/<feature>/workflow-state.yaml` for current task memory
3. `.specify/memory-store/index.json` for durable memory candidate lookup
4. only the few matched durable records under `.specify/memory-store/`

## Session Reflection Workflow

At the end of meaningful tasks:

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
