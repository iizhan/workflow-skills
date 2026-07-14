---
name: project-test-and-report
description: Validate project changes before delivery and user acceptance. Use after implementation to run proportional automated and visible checks, map approved work items and impact to evidence, disclose uncovered areas and residual risks, and provide a versioned Chinese verification report with explicit accept or revise choices.
---

# Project Test And Report

Use this skill before final delivery.

For tracked work, follow `.specify/memory/final-output-protocol.md` and update `delivery-summary.md`.

## Workflow

1. Identify changed areas/risk and run the lowest-cost meaningful checks.
2. Verify user-facing changes through the visible interface when available; otherwise state the exact manual path and blocker.
3. Map each approved item, acceptance, and impact to evidence, failure, or uncovered risk.
4. Publish Chinese `验证报告 vN` with choices/risks/memory or evolution follow-up.
5. Set `awaiting_user_acceptance`; offer `确认验收`, `继续修正`, `补充验证`, or `重新打开事项`.

## UI / Interaction Reporting Rules

- Separate visible UI evidence from static checks; include screenshots, reports, click path, or blocker.
- Record any blocked automation as a verification risk, not a pass. Name reported broken interactions and verification method.
- Do not substitute self-review claims for paths, commands, screenshots, reports, results, or a precise blocker.

## Suggested Check

Run: `__TEST_COMMAND__`

## Report Format

- `本次完成`
- `关联版本`
- `事项/影响验证矩阵`
- `关键改动` · `执行命令` · `结果说明` · `界面/交互验证`
- `未覆盖项` · `剩余风险` · `是否存在记忆/规则候选`
- `验收状态与用户选项`
