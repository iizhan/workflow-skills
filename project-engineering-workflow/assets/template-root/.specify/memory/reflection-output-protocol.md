# __PROJECT_NAME__ Reflection Output Protocol

This protocol defines the fixed output format Codex should use at the end of a meaningful task.

## Purpose

The reflection output should do three jobs at once:

1. give the user a readable post-task summary
2. update workflow memory in a structured way
3. feed possible framework evolution into `rule-change-proposal.md`

## Required Artifacts

For tracked tasks under `specs/<feature>/`, produce or update:

- `task-reflection.md`
- `workflow-state.yaml`
- `rule-change-proposal.md` when a rule candidate exists

## Fixed Output Order

Write the reflection in this order:

1. `Meta`
2. `Task Outcome`
3. `User Choices`
4. `Verification Summary`
5. `What Worked Well`
6. `What Should Change`
7. `Memory Candidates`
8. `Rule Change Candidates`
9. `Workflow State Sync`
10. `Next Recommendation`

## State Mapping

Map the reflection into workflow state like this:

| Reflection Section | Workflow State Target |
| --- | --- |
| `Task Outcome` | `session_reflections[].summary` |
| `User Choices` | `session_reflections[].user_choices`, `choice_rationale` |
| `What Worked Well` | `session_reflections[].worked_well` |
| `What Should Change` | `session_reflections[].should_change` |
| `Memory Candidates` | `memory_candidates` |
| `Rule Change Candidates` | `rule_change_candidates` |
| generated proposal path | `evolution_updates.drafted` |
| missing data or follow-up | `handoff_notes` |

## Drafting Rules

- Keep the reflection factual and compact.
- Prefer observed outcomes over generic commentary.
- If a section has no useful content, leave a short explicit note instead of padding it.
- When a rule candidate exists, link the proposal file path explicitly.
- When no rule candidate exists, say that the learning stays at memory or session level.

## Escalation Rules

- If the task only produced personal or one-off learnings, stop at `Memory Candidates`.
- If the task exposed repeated workflow friction or a reusable best practice, also fill `Rule Change Candidates`.
- If the rule candidate is still weak, mark it as `proposed` and keep the recommendation conservative.

## User-Facing Summary Rule

When sharing the reflection with the user, emphasize:

- what was accomplished
- what the user chose
- what was verified
- what learnings may become memory
- whether a framework rule proposal should be reviewed
