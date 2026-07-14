# Skills Workflow Evaluation Run

## Metadata

- Date: 2026-07-14
- Evaluator: Codex
- Scope: `0.4.0` adaptive confirmation, impact traceability, acceptance, dissatisfaction learning, token budgets, and `0.3.1` upgrade compatibility
- Mode: release candidate

## Result

- Adaptive confirmation contract: passed.
- Modified Skill structure validation: passed for the package Skill and 10 changed project-local Skills.
- CLI and shell syntax: passed.
- Workflow-state YAML parse: passed.
- Template and generated-project Doctor: passed.
- Package dry-run: passed with 114 files in `workflow-skills-project-engineering-workflow-0.4.0.tgz`.
- Remote publish: not run; publishing remains a separate explicit action.

## Adaptive Behavior Coverage

| Lane / event | Expected behavior | Result |
| --- | --- | --- |
| `fast` | Restate, execute, and verify without forced multi-round approval | Pass by static contract and fixture inspection |
| `standard` | Confirm one versioned requirement, item, acceptance, and impact package | Pass by static contract and template inspection |
| `controlled` | Confirm requirement/impact, then child-task plan and rollback | Pass by static contract and template inspection |
| Scope expansion | Publish a versioned delta and reconfirm only changed impact | Pass by static contract and workflow-state inspection |
| Delivery | Map items and impact to evidence, then wait for user acceptance | Pass by static contract and delivery template inspection |
| Dissatisfaction | Reopen affected work, classify the miss, and avoid silent Skill edits | Pass by evaluation case and Skill contract inspection |

## Compatibility Evidence

- Generated a project with the real `0.3.1` starter exported from Git, rather than relabeling a `0.4.0` fixture.
- Both current CLI Doctor and shell Doctor accepted the untouched `0.3.1` project and reported the eight new progressive references as upgrade suggestions.
- `upgrade --mode current --dry-run --json` blocked unconfirmed overwrites, planned all eight references, and reported `safety.specsUntouched: true`.
- The real `0.3.1 -> 0.4.0` overwrite upgrade completed without extra context flags after test-command inference was added.
- The upgraded project declared `0.4.0`; both Doctors passed, and an existing `specs/` sentinel remained untouched.
- Removing the `Task Lanes` contract from a generated `0.4.0` project was rejected by both Doctors.

## Token Economics

- Enforcement failures: none.
- `fast-task`: 2053 estimated tokens, below the 2500 warning threshold.
- Individual default and router Skills: within enforced budgets.
- Warning only: `ordinary-dev` 3300, `frontend` 4843, and `security` 4342 estimated tokens.
- No provider-level A/B usage data was available, so real token ratio and quality delta remain unmeasured.

## Residual Risk

- Static contracts and generated fixtures do not prove that every model will route correctly in a live conversation.
- Run the fast and controlled prompts in `cases/adaptive-confirmation.md` against both `0.3.1` and `0.4.0` before claiming a measured behavior or token improvement.
- The three warning-level bundles should be monitored and slimmed only when doing so preserves routing and verification quality.
