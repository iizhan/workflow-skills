---
name: project-verification-loop
description: Run a staged, traceable project verification loop. Use after meaningful changes, before PRs, commits, or user acceptance, or when a task touches shared behavior, security, frontend layout, data, compatibility, performance, release behavior, workflow assets, or cross-module contracts and every approved item and impact must map to evidence or residual risk.
---

# Project Verification Loop

Use for changes needing more than the minimum check.

## Verification Stages

Use only repository-supported commands: Build or compile, Typecheck, lint/format, unit/integration, visible UI/layout, security/secret scan, and Diff Review as relevant. Do not invent commands.

## Traceability

Build a matrix: approved `ITEM-*`/acceptance, impact dimension, implementation, verification method, evidence/result, uncovered risk.

Build/Typecheck alone is not full verification. UI needs visible evidence when available; data/contracts need migration/compatibility evidence; security/external effects need boundary checks.

## Command Selection

- Prefer scripts from project config, CI, or docs; include `__TEST_COMMAND__` when relevant.
- Record unavailable checks and why. Ask before expensive or destructive checks.

## Diff Review

Review for unrelated/out-of-scope edits, missing errors/tests, misleading UI, unreviewed security changes, unwanted generated files, accepted items without evidence, and new impact.

If verification discovers unapproved impact, stop delivery, publish the scope delta, and route back through `$project-scope-impact-guard`.

## Result States

- `verified`: all acceptance and approved impact have evidence.
- `verified_with_risk`: core acceptance passed, but named non-blocking gaps remain.
- `failed`: one or more acceptance criteria failed.
- `blocked`: required environment, permission, data, or tool is unavailable.

Self-review gathers evidence; it is not proof. Preserve uncertainty and offer acceptance choices.

## Output Format

- `验证范围`
- `关联需求/影响/计划版本`
- `事项与影响证据矩阵`
- `执行命令` · `通过项` · `失败项` · `未执行项`
- `差异审查` · `最终状态` · `用户验收选项`
