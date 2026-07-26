---
name: project-requirement-gate
description: Route project requests before implementation with clarity checks, versioned work items, acceptance, and required confirmation gates.
---

# Project Requirement Gate

Use before implementation unless the same scope is already confirmed.

## Task Lanes

- `fast`: one clear, low-risk, reversible outcome. Restate it; no separate approval unless requested.
- `standard`: multiple items or bounded shared impact. Confirm goal, items, acceptance, and impact once.
- `controlled`: cross-module, architecture, data, security, permission, compatibility, migration, external/destructive effect, release, or material ambiguity. Confirm requirement/impact, then the child-task plan.

Classify by uncertainty and impact, not word count. "直接做" never bypasses safety, privacy, permission, release, destructive, or irreversible confirmation.

## Workflow

1. Restate Chinese goal/outcome; load fresh Profile and matched decisions.
2. Inspect code/config/logs/docs before asking; ask only when ambiguity changes outcome, scope, data, permission, compatibility, delivery, or acceptance. Stop on material ambiguity.
3. Reassess the lane after onboarding and impact analysis; record the reason for any change.
4. Create versioned `ITEM-*` with outcome and acceptance; record constraints, assumptions, non-goals, dependencies.
5. `fast`: mark pre-execution gates `not_required`, record item and verification. Final user acceptance remains separate.
6. `standard`/`controlled`: obtain `$project-scope-impact-guard`, publish `需求与事项 vN` with `确认执行` / `修改事项` / `缩小范围` / `补充需求`.
7. `controlled`: Confirm requirement/impact, then child-task plan; require a second confirmation of child tasks, dependencies, validation, and rollback. Bind approval to its version; reconfirm only changed items/impact.

## Formal Implementation Handoff

For `standard`/`controlled`, hand off `需求 vN` / `影响范围 vN` / `设计方案 vN` / `任务拆解 vN` / `验收与自测计划`; code only after explicit confirmation. On changed goal, acceptance, area, or constraints, stop and issue a new version. `fast` records solution, affected files, and verification.

## Output Format

- `需求目标`
- `任务通道与原因`
- `已知约束`
- `事项清单与验收标准`
- `待调查/待确认项` · `需求版本` · `需要的确认门禁` · `确认选项`
- `正式实现前置包`：设计方案版本 · 任务拆解版本 · 影响范围版本 · 验收与自测计划
