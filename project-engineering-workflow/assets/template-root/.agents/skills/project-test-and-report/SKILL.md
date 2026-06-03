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
3. If runtime verification depends on local tools or external environments, state the exact manual verification path.
4. Summarize results in Chinese.
5. Fold in key user choices, residual risks, and any memory or evolution follow-up needed for review.

## Suggested Check

Run: `__TEST_COMMAND__`

## Report Format

- `本次完成`
- `关键改动`
- `执行命令`
- `结果说明`
- `未覆盖项`
- `剩余风险`
- `是否存在记忆/规则候选`
