---
name: project-test-and-report
description: Validate project changes before delivery. Use after implementation to run low-cost automated checks, summarize manual verification steps, and provide a Chinese test report.
---

# Project Test And Report

Use this skill before final delivery.

When the task is tracked under `specs/<feature>/`, follow `.specify/memory/final-output-protocol.md` and update `delivery-summary.md` so the user-facing closeout, verification result, reflection outcome, and memory/evolution follow-up stay aligned.

## Workflow

1. Identify changed areas and their risk level.
2. Run the lowest-cost meaningful automated checks.
3. For frontend, desktop app, browser, visual, or user-facing interaction changes, verify the changed path through the visible interface when automation is available.
4. If runtime or UI verification depends on local tools, browser/app automation, devices, simulators, credentials, or external environments, state the exact manual verification path and do not claim full coverage.
5. Summarize results in Chinese.
6. Fold in key user choices, residual risks, and any memory or evolution follow-up needed for review.

## UI / Interaction Reporting Rules

- Report visible UI checks separately from typecheck, build, lint, or unit tests.
- Include screenshot paths, UI self-test report paths, or the exact manual click path when the task changes frontend pages.
- Record any blocked automation as a verification risk, not as a passing UI result.
- If a user reported a concrete broken interaction, name that scenario in the report and state whether it was clicked, statically guarded, or still blocked.

## Suggested Check

Run: `__TEST_COMMAND__`

## Report Format

- `本次完成`
- `关键改动`
- `执行命令`
- `结果说明`
- `界面/交互验证`
- `未覆盖项`
- `剩余风险`
- `是否存在记忆/规则候选`
