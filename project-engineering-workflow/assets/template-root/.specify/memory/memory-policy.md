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

## Memory Candidate Schema

Use this shape when proposing memory updates:

```yaml
memory_candidates:
  - space: user_private | team_shared | agent_self | task_session
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
