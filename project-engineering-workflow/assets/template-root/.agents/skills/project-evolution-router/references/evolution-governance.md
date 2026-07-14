# Evolution Governance Reference

Load this reference only when a task needs a durable framework change proposal, validation plan, or rollback decision.

## Inputs

- current `session_reflections`, `memory_candidates`, and `rule_change_candidates`
- recent delivery reports, review findings, and validation results
- current project rules from `AGENTS.md`
- current policy files under `.specify/memory/`
- proposal drafting rules from `.specify/memory/evolution-prefill-policy.md`
- first-draft workflow from `.specify/memory/evolution-draft-protocol.md`
- reflection output workflow from `.specify/memory/reflection-output-protocol.md`
- final delivery output workflow from `.specify/memory/final-output-protocol.md`
- relevant project-local skills and templates

## What Counts As Evolution

Evolution means changing the framework layer, not just storing a memory.

Typical triggers:

- the same user preference appears repeatedly and should become a rule
- the same failure or review finding appears across tasks
- a workaround should become a standard path
- a skill is too vague, too rigid, or missing a gate
- memory policy, retention, or retrieval rules are incomplete
- the workflow is missing rollback, validation, or escalation guidance

## Proposal Workflow

1. Review the latest task reflections and identify repeated signals.
2. Separate one-off noise from candidate framework improvements.
3. Create `rule_change_candidates` with target level, affected files, rationale, evidence, expected benefit, and rollback path.
4. When the task is tracked under `specs/<feature>/`, draft `rule-change-proposal.md` from the project template.
5. Prefill the proposal with the strongest available evidence:
   - use `[auto]` for directly supported content
   - use `[inferred]` for synthesized but reasonable content
   - use `[needs confirmation]` for ambiguous or high-impact fields
6. Produce or update `task-reflection.md` so task outcome, user choices, verification, memory candidates, and rule candidates are visible in one place.
7. Follow the draft protocol to turn reflections into the first proposal version and sync proposal state back into `workflow-state.yaml`.
8. Show the candidate to the user before durable framework changes.
9. After approval, update the smallest valid file set.
10. Run validation such as `doctor`, smoke bootstrap, or a focused real-task check.
11. Record outcome, residual risk, and whether the change should stay, be revised, or be rolled back.

## Promotion Heuristics

- Repeated within one task only: keep as `session`
- Repeated across similar tasks for one user: consider `memory_policy` or `skill_rule`
- Repeated across users or features: consider `workflow_rule` or `template_rule`
- Changes that alter authority, scope, safety, or confirmation behavior: require `constitution_rule`

## Validation Requirements

- Skill changes should be checked by reading the updated workflow path end-to-end.
- Template or bootstrap changes should be validated with `doctor` and a smoke init.
- Behavior-changing rules should be tested against at least one realistic task pattern.
- If validation is partial, keep the candidate in proposed state and note the gap.

## Rollback Rules

- If a new rule increases friction without reducing failure, downgrade or archive it.
- If a rule conflicts with source-of-truth project behavior, revert the framework change and keep only a task-local note.
- If user feedback contradicts the new rule, pause promotion and request clarification.
