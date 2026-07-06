# __PROJECT_NAME__ Evolution Policy

This policy defines how the workflow should summarize itself, propose adjustments, and evolve safely.

## Purpose

The framework should improve from repeated work, but it must not silently rewrite its own rules.

Use a four-step loop:

1. observe
2. reflect
3. propose
4. validate and promote

## Observation Sources

Use these signals as raw input:

- session reflections
- user choices and corrections
- repeated review findings
- repeated test failures or verification gaps
- recurring scope drift
- recurring escalation or approval friction
- successful patterns that consistently reduce risk or effort

## Candidate Types

Use two separate candidate classes:

```yaml
memory_candidates:
  - reusable facts, preferences, behavior patterns, relationships, decisions, summaries

rule_change_candidates:
  - target_level: session | memory_policy | skill_rule | workflow_rule | constitution_rule | template_rule
    title: ""
    problem: ""
    proposed_change: ""
    evidence: []
    expected_benefit: ""
    affected_files: []
    validation_plan: []
    rollback_plan: ""
    status: proposed | approved | rejected | validated | archived
```

For tracked features, expand the candidate into `specs/<feature>/rule-change-proposal.md` so evidence, validation, and rollback details are reviewable in one place.

Draft proposal details should follow `.specify/memory/evolution-prefill-policy.md` so Codex can prefill the first version consistently.
The exact section order and workflow-state sync rules live in `.specify/memory/evolution-draft-protocol.md`.

## Promotion Ladder

Promote learnings through this ladder:

1. `session`
   Store in `workflow-state.yaml` only.
2. `memory_policy`
   Update retention, spaces, retrieval, or confirmation rules.
3. `skill_rule`
   Update one focused skill instruction.
4. `workflow_rule`
   Update `AGENTS.md` or cross-skill orchestration.
5. `constitution_rule`
   Update top-level governance.
6. `template_rule`
   Update feature templates, bootstrap scripts, CLI, or doctor checks.

Do not skip directly to a higher level unless the lower level cannot solve the issue.

## Promotion Conditions

- Promote only when the signal is repeated, high-impact, or clearly missing from the framework.
- One-off preferences usually stay in memory, not workflow rules.
- Safety, privacy, permissions, and authority changes always need explicit approval.
- Constitution-level changes require strong evidence and clear reason.

## Required Confirmation

Before durable framework changes:

- show the candidate
- explain why it should be promoted
- list affected files
- explain how it will be validated
- explain how it can be rolled back

No durable evolution without user confirmation.

## Proposal Prefill Protocol

Before user confirmation, Codex should prepare a half-finished proposal:

- fill directly supported fields with `[auto]`
- fill low-risk synthesis with `[inferred]`
- leave high-impact, ambiguous, or missing decisions as `[needs confirmation]`

The prefill should reduce writing effort, not bypass review.

## Validation Gates

After approved changes:

- run `doctor`
- run smoke bootstrap when templates, CLI, or bootstrap files changed
- run a focused realistic task check when behavior changed
- record what was validated and what remains unvalidated
- update `rule-change-proposal.md` with the final validation result

## Rollback And Retirement

- If the new rule adds noise or friction, archive it or downgrade it.
- If a stronger source of truth appears, supersede the older rule.
- If a rule was useful temporarily, retire it instead of keeping dead policy.

## Reflection Checklist

For each meaningful task, ask:

- what repeated pattern did we observe
- what choice did the user make
- why was that choice better
- what slowed the workflow down
- what should become memory only
- what should become a rule candidate
- what evidence supports the upgrade
