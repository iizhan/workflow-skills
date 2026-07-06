# __PROJECT_NAME__ Final Output Protocol

This protocol defines the standard Chinese delivery summary Codex should produce at the end of a task.

## Purpose

The final output should unify:

1. what was completed
2. what was verified
3. what the user chose
4. what remains risky or uncovered
5. what learnings may become memory or framework evolution

## Required Artifacts

For tracked tasks under `specs/<feature>/`, produce or update:

- `delivery-summary.md`
- `task-reflection.md`
- `workflow-state.yaml`

If a rule candidate exists, also update:

- `rule-change-proposal.md`

## Fixed Output Order

Write the delivery summary in this order:

1. `Meta`
2. `本次完成`
3. `关键改动`
4. `验证结果`
5. `用户选择与原因`
6. `复盘结论`
7. `记忆与进化后续`
8. `下一步建议`

## Source Mapping

Use these sources when drafting the final output:

| Delivery Section | Primary Sources |
| --- | --- |
| `本次完成` | requirement summary, implementation result, scope lock |
| `关键改动` | changed files, plan, implementation notes |
| `验证结果` | test report, commands run, manual verification path |
| `用户选择与原因` | `task-reflection.md`, session reflections |
| `复盘结论` | `task-reflection.md` |
| `记忆与进化后续` | `memory_candidates`, `rule_change_candidates`, proposal status |
| `下一步建议` | residual risks, uncovered areas, pending confirmations |

## Drafting Rules

- Output in Chinese.
- Keep it concise and outcome-focused.
- Prefer specific facts over generic process commentary.
- If something was not verified, say so explicitly.
- If no memory or rule candidate exists, state that the learning remains at session/task level.

## Workflow State Sync

After producing the final output:

- append the summary path to `delivery_artifacts`
- ensure `reflection_artifacts` includes the reflection path when present
- keep residual risks and handoff notes aligned with the summary

## User-Facing Rule

When sharing the final output with the user, prioritize:

- what changed
- whether it works
- what was not covered
- what decisions still need user confirmation
