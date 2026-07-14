# Skills Workflow Task Requirement Quality Run

## Metadata

- Date: 2026-07-14
- Evaluator: Codex
- Candidate: `0.4.0` after task-quality repairs
- Baseline: real `0.3.1` package exported from Git
- Evaluation kind: deterministic task-requirement contract coverage

## Task Set

| Scenario | Expected lane | Main quality risk |
| --- | --- | --- |
| Visible copy typo | fast | needless pre-execution approval or no evidence |
| Skill-library filter and sort | standard | missing item/acceptance confirmation or duplicate gates |
| Monitoring data migration | controlled | missing data, compatibility, rollback, or second confirmation |
| Ambiguous monitoring improvement | controlled after inspection | assumptions before project investigation |
| Destructive scope expansion | controlled delta | old approval reused for new deletion behavior |
| Frontend button without feedback | standard | handler added without visible result or UI verification |
| Remote private Skill loading | controlled | token leakage or unapproved external effects |
| Historical data loss complaint | controlled revision | Skill edited before current task repair |

## Findings Before Repair

The first expanded suite scored the candidate at **86.3 / 100 (B)** and found four contract gaps:

1. Fast tasks skipped approval in the Skill, but generated templates still defaulted to pending confirmation.
2. Lane selection was not explicitly reassessed after onboarding and impact discovery.
3. `workflow-state` did not persist child tasks or confirmation history.
4. Dissatisfaction handling did not explicitly require current-item repair before framework evolution.

## Repairs

- Added fast-specific `not_required` pre-execution gate semantics while preserving verification and final acceptance.
- Added lane reassessment after onboarding/impact analysis and a reason for lane changes.
- Added `child_tasks`, `confirmation_history`, lane history, and explicit state progression.
- Required reopening, correcting, and verifying the affected item before considering Skill evolution.
- Added Doctor and static-contract checks for the new state fields.

## A/B Result

| Version | Contract score | Band | Failed requirements |
| --- | ---: | --- | ---: |
| `0.3.1` | 15.3 / 100 | D | 23 |
| `0.4.0` repaired | 100 / 100 | A | 0 |

- Delta: **+84.7**
- All eight candidate scenarios passed every declared contract requirement.
- All seven dimensions reached their configured maximum: requirement clarity, routing precision, scope/safety, decomposition/traceability, verification/acceptance, friction control, and learning governance.

## Regression Evidence

- All changed Skills passed `quick_validate.py`.
- Static workflow contract, JavaScript syntax, shell syntax, YAML parsing, template Doctor, and diff checks passed.
- A real Git-exported `0.3.1` project upgraded to `0.4.0`; CLI and shell Doctors passed after upgrade.
- Removing `child_tasks` from a generated `0.4.0` workflow-state template was rejected by both Doctors.
- Package dry-run passed with 114 files.

## Token Guard

- Enforcement failures: none.
- `fast-task`: 2130 estimated tokens, below the 2500 warning threshold.
- `project-requirement-gate`: 625 / 700 estimated-token budget.
- `project-skill-upgrade-advisor`: 629 / 700 estimated-token budget.
- Warning only: ordinary development, frontend, and security bundles remain above their advisory thresholds.

## Interpretation

This result proves that representative task requirements are explicitly covered and that the suite can expose missing contracts before repair. It does not prove live model adherence, correct lane selection in every conversation, or successful real task outcomes.

The next stronger evidence is a blind live replay using the same prompts against baseline and candidate, with actual responses, tool traces, user corrections, elapsed time, and provider token usage scored by an independent evaluator.
