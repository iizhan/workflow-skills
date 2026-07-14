# Skills Workflow Evaluation

This directory is the repeatable evaluation surface for `project-engineering-workflow`.

Use it after changing workflow skills, template rules, session memory behavior, or cross-harness guidance. The goal is to verify that new skills improve the workflow without making every task slower, noisier, or more fragile.

## What This Evaluates

- Default development rules trigger before implementation.
- Frontend work routes through the generic frontend layer and stack-specific skill.
- Backend work routes through the backend role entry and only the contract/data/runtime references required by the changed path.
- Frontend work loads experience, data-flow, accessibility, performance, and testing references progressively rather than as one permanent context block.
- Every development task checks the project Profile first; fresh context is reused and only stale or uncovered evidence triggers scoped onboarding.
- Security-sensitive work routes through security review.
- Meaningful changes route through staged verification.
- Sessions produce reusable memory and upgrade signals.
- Task confirmation stays adaptive: fast work remains light, while controlled work uses versioned requirement, impact, plan, and acceptance gates.
- Skill quality is better than baseline, not merely present or mentioned.
- The generated project still passes doctor and package checks.

## Evaluation Modes

### 1. Static Contract Check

Run:

```bash
node evaluations/skills-workflow/scripts/check-contract.mjs
```

This verifies that the template, CLI, docs, and generated project workflow mention the expected skills and memory files.

### 2. Generated Fixture Check

Run:

```bash
npm --prefix project-engineering-workflow run smoke
node project-engineering-workflow/bin/project-engineering-workflow.mjs doctor --output-dir /private/tmp/project-engineering-workflow-smoke
```

This verifies that a generated project includes the expected local skills.

### 3. Human A/B Workflow Check

Pick one task from `cases/`.

Run it twice:

- Baseline: use the previous workflow or intentionally ignore the new skill routing.
- Candidate: use the current workflow.

Record the result with `templates/run-record.md`.

### 4. Quality Score

Use `templates/quality-metrics.md` to score candidate behavior against baseline.

The score separates:

- routing precision: did the right skills fire at the right time?
- task outcome: did the user-visible problem actually improve?
- safety and scope: did the workflow prevent risky or broad changes?
- verification strength: was the result backed by evidence?
- friction cost: did the process stay proportional to the task?
- output clarity: could the user understand what happened?
- maintainability: are rules concise, local, and stack-aware?
- learning loop: did repeated friction become an upgrade signal?

### 5. Token Economics

Use `templates/token-economics.md` to compare skill benefit against token cost.

For real A/B tests, record provider usage metadata when available: input tokens, output tokens, cached input tokens, reasoning tokens, and total tokens.

For local static checks, run:

```bash
node evaluations/skills-workflow/scripts/estimate-token-cost.mjs
```

This estimates token cost for generated `SKILL.md` files, docs, and references. It does not replace real provider usage, but it catches oversized skills and over-triggering risk before a full replay.

For CI-style failure on hard budget violations, run:

```bash
node evaluations/skills-workflow/scripts/estimate-token-cost.mjs --enforce
```

### 6. Task Requirement Contract A/B

Use the structured task suite to verify that workflow contracts cover fast, standard, controlled, ambiguous, scope-delta, backend, frontend, security, and dissatisfaction scenarios:

```bash
node evaluations/skills-workflow/scripts/evaluate-task-requirements.mjs \
  --workflow-root project-engineering-workflow \
  --baseline-root /path/to/previous/project-engineering-workflow \
  --label candidate \
  --baseline-label baseline \
  --enforce
```

This is a deterministic contract-coverage check. It catches missing or contradictory workflow rules, but it does not prove live model adherence or real task outcome quality.

## Success Criteria

The workflow is improved when:

- required skills are triggered without user reminders
- irrelevant skills are not loaded for small tasks
- security, verification, and frontend state are caught earlier
- backend contracts, data invariants, runtime failures, and rollout evidence are caught before delivery
- project stack and architecture are not rediscovered on every task, while stale evidence cannot be silently reused
- candidate quality score is at least 80 / 100
- candidate beats baseline by at least 10 points
- small-task token ratio is normally <= 1.20 versus baseline
- estimated skill context share is normally < 25% of candidate input tokens
- final reports include executed commands, uncovered areas, and residual risks
- repeated friction becomes a concrete upgrade signal
- the added process does not dominate small tasks

## Score Bands

| Score | Meaning |
| --- | --- |
| 0 | Missing or harmful |
| 1 | Present but vague |
| 2 | Useful and specific |
| 3 | Strong, timely, and evidence-backed |

Recommended minimum before calling a workflow upgrade successful:

- total score >= 18 across the rubric
- quality score >= 80 / 100
- token economics gates pass for A/B runs
- no missing required skill for the case
- no severe over-triggering for small tasks
- no `0` in Security, Verification, or Scope Control for relevant tasks
- generated fixture check passes

## Files

- `cases/dev-core.md`: general development task.
- `cases/frontend-interaction.md`: frontend interaction/layout task.
- `cases/security-sensitive.md`: security-sensitive task.
- `cases/harness-parity.md`: Codex vs Claude Code workflow distinction.
- `cases/adaptive-confirmation.md`: fast/controlled routing, impact scope, versioned confirmation, acceptance, and dissatisfaction handling.
- `cases/task-requirement-quality.json`: structured multi-scenario requirements and failure signals.
- `runs/2026-07-14-project-profile-validation.md`: Profile lifecycle, reuse, freshness, compatibility, and cost evidence.
- `templates/run-record.md`: manual run record.
- `templates/scorecard.md`: scoring rubric.
- `templates/quality-metrics.md`: quality score, bands, and regression signals.
- `templates/token-economics.md`: token usage, A/B cost comparison, and acceptance gates.
- `scripts/check-contract.mjs`: static contract check.
- `scripts/estimate-token-cost.mjs`: static token-cost estimator for skills, docs, and references.
  It reports individual skill budgets, progressive-disclosure references, bundle costs, and advisory/enforced budget status.
- `scripts/evaluate-task-requirements.mjs`: deterministic candidate/baseline task-requirement contract comparison.
- `runs/`: saved evaluation results over time.
