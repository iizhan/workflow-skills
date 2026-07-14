# Memory Data Roles

Load this reference when classifying memory space, `data_role`, privacy risk, or sensitive fields.

## Memory Spaces

- `user_private`: one user, isolated by user identity when the host can identify the user. Store personal preferences, names, private context, last-topic continuity, and user-specific working style.
- `team_shared`: readable by the team. Store product facts, project conventions, FAQs, decisions, glossary, onboarding notes, and reusable troubleshooting knowledge.
- `agent_self`: agent improvement notes. Store task strategy learnings, successful workflows, failure patterns, and prompt/process adjustments.
- `task_session`: feature-scoped working memory under `specs/<feature>/workflow-state.yaml`. Store milestone state, decisions, evidence, open questions, user choices, and pending memory candidates.
- Durable memory records and their light index live under `.specify/memory-store/`.

## What To Remember

Prefer durable memory only when information is likely to be useful again:

- `fact`: stable project, product, org, domain, or environment facts
- `preference`: user communication, UI, coding, naming, formatting, or workflow preferences
- `behavior_pattern`: what worked, what failed, and under what conditions
- `relationship`: people, teams, companies, ownership, collaboration graph, and role links
- `decision`: user or team choices, rejected options, rationale, and acceptance criteria
- `session_summary`: what was done, what changed, verification, uncovered areas, and next handoff

Do not remember secrets, credentials, sensitive personal data, private third-party data, speculation, or temporary facts unless the user explicitly asks and retention is short.

## Data Role Decision

Before proposing a memory candidate, classify the information with `data_role`:

- `identity_context`: names, team role, stable collaboration identity
- `user_preference`: tone, language, UI density, workflow preference
- `account_reference`: account labels or non-secret IDs only; never passwords, tokens, OTPs, cookies, or API keys
- `infrastructure_reference`: server names, server paths, local paths, environment labels, and non-secret URLs
- `development_workflow`: reusable engineering workflow, harness preference, test loop, visual QA, branch/release habit
- `project_fact`: product, architecture, domain, or team convention
- `governance_decision`: accepted/rejected option, rationale, scope or release decision
- `verification_evidence`: command result, screenshot path, UI report path, residual risk
- `blocked_sensitive`: information that should not become durable memory

Routing rules:

- Account references default to `user_private` or `task_session`; store only non-secret labels and short retention unless the user confirms otherwise.
- Project-owned server paths or environment labels may be `team_shared` when the source or owner is clear; personal machine paths should remain `user_private` or `task_session`.
- Development workflow learnings should usually be `agent_self` or `team_shared`, and only persist after user confirmation.
- Verification evidence should usually remain `task_session` and be summarized in the delivery report instead of durable memory.
- `blocked_sensitive` candidates should be reported under `不应记忆` with the reason.
