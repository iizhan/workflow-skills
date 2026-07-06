# Case: Dev Core

## Goal

Verify that default development rules improve an ordinary coding task.

## Prompt

```text
In this repository, update the project-engineering-workflow CLI so the init success message tells users to review session history and skill upgrade backlog before running doctor.
```

## Expected Skill Routing

- `project-requirement-gate`
- `project-codebase-onboarding`
- `project-scope-impact-guard`
- `project-dev-core`
- `project-code-generation`
- `project-code-review`
- `project-test-and-report`
- `project-session-summary`

## Evidence To Look For

- relevant CLI file is read before edit
- smallest safe edit is chosen
- naming and copy remain consistent
- generated smoke output is checked
- final report mentions commands and residual risk
- session summary records whether the change revealed a repeated workflow issue

## Common Baseline Failure

- directly edits the CLI message without checking bootstrap script parity
- does not run smoke or doctor
- does not record the memory/update implication
