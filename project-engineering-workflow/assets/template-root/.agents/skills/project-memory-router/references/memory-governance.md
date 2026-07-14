# Memory Governance Reference

Load this reference only when you need to choose which scoped memory reference applies. Do not read every memory reference by default.

## Reference Map

- Data Role Decision: read `references/memory-data-roles.md` for `identity_context`, `user_preference`, `account_reference`, `infrastructure_reference`, `development_workflow`, `project_fact`, `governance_decision`, `verification_evidence`, and `blocked_sensitive`.
- Retention and Retrieval: read `references/memory-retention-retrieval.md` for retention defaults, archival behavior, exact lookup, fuzzy recall, and multi-hop reasoning.
- Conflict and Session Reflection: read `references/memory-conflict-session.md` for correction precedence, session summaries, durable write proposals, and user confirmation.

## First-Pass Decision

1. Keep temporary task state in `task_session`.
2. Block secrets, credentials, tokens, OTPs, cookies, private third-party data, and speculative personal facts as `blocked_sensitive`.
3. For anything durable, identify the likely memory space and then open only the matching scoped reference.

## Durable Write Gate

Before durable writes, prepare candidates with `space`, `type`, `data_role`, `retention`, `confidence`, `source`, and `reason`; then ask the user to confirm.

If the learning should change the framework itself instead of only memory, route it to `$project-evolution-router`.
