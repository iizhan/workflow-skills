---
name: project-verification-loop
description: Verify meaningful or risky changes with staged commands, impact evidence, scope review, and acceptance reporting.
---

# Project Verification Loop

Use for changes needing more than a minimum check.

## Verification Stages

Use repository-supported Build or compile, Typecheck, lint/format, unit/integration, visible UI/layout, security/secret scan, and Diff Review commands. Do not invent commands.

## Traceability

Build `事项与影响证据矩阵`: approved `ITEM-*`/acceptance, impact dimension, implementation, method, evidence/result, uncovered risk. Build/typecheck alone is insufficient: UI needs visible evidence; data/contracts need migration/compatibility evidence; security/external effects need boundary checks.

Perform an impact-scope self-check: compare diff, runtime, Workflow/Skill assets, permissions, data paths, and visible states with confirmed `设计方案 vN` / `任务拆解 vN` / `影响范围 vN`. A new impact blocks delivery until its scope delta is confirmed.

## Command Selection

- Prefer project config, CI, or documented scripts; include `__TEST_COMMAND__` when relevant.
- Record unavailable checks and why; ask before expensive or destructive checks.

## Diff Review

Review out-of-scope edits, missing errors/tests, misleading UI, security changes, generated files, evidence gaps, and new impact. On unapproved impact, stop, publish a scope delta, and route back through `$project-scope-impact-guard`.

## Scenario Loop Evidence

Attach results to the current conversation-initiated Scenario Loop Run in the feature's `workflow-state.yaml`. Continue only for a verified in-scope issue with a distinct root-cause strategy. Record `initiation_source: conversation`, session reference, confirmed artifact versions, score/floors/hard checks/evidence/blockers/risk/budget. A threshold score passes only with all required evidence/floors and no blockers. Stop for a scope, contract, permission, migration, external, release, budget, repeated-strategy/root-cause, or iteration-limit signal; request `vN+1` when scope changes. Repeated failure may create an evolution candidate, never a global Skill/Template/long-lived-memory edit. Desktop monitoring may display imported evidence but cannot create or advance this record.

## Result States

- `verified`: all acceptance and approved impact have evidence.
- `verified_with_risk`: core acceptance passed, but named non-blocking gaps remain.
- `failed`: one or more acceptance criteria failed.
- `blocked`: required environment, permission, data, or tool is unavailable.

Self-review gathers evidence, not proof. Preserve uncertainty and offer acceptance choices.

## Output Format

- `验证范围`
- `关联需求/设计/任务/影响/计划版本`
- `事项与影响证据矩阵` · `执行命令` · `通过/失败/未执行`
- `差异审查` · `影响范围自查` · `Loop 轮次/质量/预算/停止原因` · `最终状态` · `用户验收选项`
