# __PROJECT_NAME__ Memory Policy

This policy defines how Codex should handle memory for this project.

## Memory Spaces

| Space | Reader | Writer | Typical Content | Default Retention |
| --- | --- | --- | --- | --- |
| `user_private` | the identified user only | user-approved updates | names, preferences, private context, last-topic continuity | short by default; persistent only when approved |
| `team_shared` | project team | team-approved updates | product facts, FAQs, conventions, decisions, ownership, glossary | persistent until superseded |
| `agent_self` | agent/workflow maintainers | user-approved updates | process learnings, effective strategies, failure patterns | persistent until retired |
| `task_session` | current feature/task collaborators | task workflow | milestone state, handoff, evidence, user choices, memory candidates | archive when feature closes |

Durable memory should be stored under `.specify/memory-store/`, while short-lived task state can stay in `specs/<feature>/workflow-state.yaml`.

If the host cannot identify the user, do not mix `user_private` memories across people. Keep them in `task_session` or ask the user to choose a stable identity.

## Remembering Rules

- Remember stable, reusable information that will improve future work.
- Prefer short retention for environment, location, availability, address, taste, and temporary preferences.
- Prefer persistent retention for project conventions, architecture decisions, product FAQ, and team-approved domain facts.
- Do not remember secrets, credentials, sensitive personal data, third-party private data, or unsupported speculation.
- Never write durable `user_private`, `team_shared`, or `agent_self` memory without first showing the candidate and asking for confirmation.

## Data Role Classification

Classify every memory candidate with a `data_role` before deciding retention:

| Data Role | Examples | Default Space | Default Retention |
| --- | --- | --- | --- |
| `identity_context` | user name, team role, collaboration identity | `user_private` or `team_shared` with owner/source | short unless approved |
| `user_preference` | tone, language, UI density, workflow preference | `user_private` | `7d` or `30d` |
| `account_reference` | account name, non-secret account id, login target label | `user_private` or `task_session` | short; never store passwords/tokens |
| `infrastructure_reference` | server name, server path, local path, environment label, non-secret URL | `team_shared` for project-owned info, `user_private` for personal machines, `task_session` for temporary paths | `30d` or persistent only when source-owned |
| `development_workflow` | preferred harness, test loop, branch habit, review pattern | `agent_self` or `team_shared` | persistent after confirmation |
| `project_fact` | product fact, architecture fact, team convention | `team_shared` | persistent until superseded |
| `governance_decision` | accepted/rejected option, scope decision, release gate | `team_shared` or `task_session` | persistent or until feature closes |
| `verification_evidence` | command result, screenshot path, UI report path, residual risk | `task_session` | until feature closes |
| `blocked_sensitive` | secret, token, password, private third-party data, unsupported sensitive detail | do not persist | n/a |

Rules:

- Store account references only as labels or non-secret identifiers. Never store passwords, tokens, API keys, OTPs, cookies, or credential material.
- Store server paths and server metadata only when they help future work and the owner/source is clear.
- Prefer `task_session` for temporary local paths, transient logs, one-off screenshots, and current debugging state.
- Prefer `development_workflow` for reusable engineering preferences such as Superpowers usage, TDD loops, visual QA, and release habits.
- Mark uncertain or sensitive candidates as `blocked_sensitive` and report why they should not become durable memory.

## Memory Candidate Schema

Use this shape when proposing memory updates:

```yaml
memory_candidates:
  - space: user_private | team_shared | agent_self | task_session
    data_role: identity_context | user_preference | account_reference | infrastructure_reference | development_workflow | project_fact | governance_decision | verification_evidence | blocked_sensitive
    type: fact | preference | behavior_pattern | relationship | decision | session_summary
    content: ""
    source: ""
    reason: ""
    confidence: low | medium | high
    retention: ephemeral | 7d | 30d | persistent | until_feature_closed
    activation: ""
    privacy_risk: low | medium | high
    status: proposed | approved | rejected | archived
```

## Retrieval Rules

- Use exact lookup for names, decisions, dates, commands, ownership, and file paths.
- Use fuzzy recall for repeated preferences, successful work patterns, and similar prior tasks.
- Use multi-hop reasoning only when relationship or product context requires it; explain the chain and uncertainty.
- Treat memories as hints unless they are backed by project source-of-truth files.
- Read `.specify/memory-store/index.json` first. Only open the matched durable memory records instead of scanning whole Markdown collections.
- Keep recall small by default: prefer 3-8 summaries before reading full durable memory content.

## Conflict Handling

- User correction supersedes older private memory.
- Project source-of-truth supersedes remembered inference.
- A newer team decision supersedes an older team memory only when the source or owner is clear.
- Archive stale memory instead of deleting it, unless the user explicitly asks to forget.

## Session Reflection

For meaningful tasks, record:

- what was done
- what the user chose
- why the choice mattered
- what worked or failed
- verification status
- proposed memory updates
- user feedback before durable memory updates

If a reflection implies the workflow itself should change, do not store it as memory only. Create a `rule_change_candidate` and evaluate it through `.specify/memory/evolution-policy.md`.

## Storage Compatibility

- Treat `.specify/memory-store/` as project data, not starter template content.
- Minor upgrades may add fields or rebuild `index.json`, but should not overwrite durable memory records.
- Keep user-private memory isolated under `users/<user_id>/`.
