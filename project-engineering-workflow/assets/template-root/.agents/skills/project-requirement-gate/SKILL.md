---
name: project-requirement-gate
description: Analyze and route project requests before implementation. Use when a user describes a feature, bug, refactor, integration, or workflow update and Codex must assess clarity and complexity, investigate discoverable context, produce versioned requirements and work items, define acceptance criteria, and decide which user confirmation gates are required.
---

# Project Requirement Gate

Use before implementation unless the same scope is already confirmed.

## Task Lanes

- `fast`: one clear, low-risk, reversible outcome. Restate briefly; no separate approval unless requested.
- `standard`: multiple items or bounded shared impact. Confirm goal, items, acceptance, and impact once.
- `controlled`: cross-module, architecture, data, security, permission, migration, external/destructive effect, release, or material ambiguity. Confirm requirement/impact, then child-task plan.

Classify by uncertainty and impact, not word count. "直接做" may skip low-risk ceremony, never safety, permission, privacy, release, destructive, or irreversible confirmation.

## Workflow

1. Restate the Chinese goal and visible outcome.
2. Load the fresh Project Profile and matched decisions. Inspect code/config/logs/docs before asking, limited to missing or changed context; ask only when ambiguity changes outcome, scope, data, permission, compatibility, delivery, or acceptance. Stop on material ambiguity.
3. Reassess the lane after onboarding and impact analysis; record the reason for any change. Escalate when discovered uncertainty or impact requires it.
4. Select a lane and create versioned `ITEM-*` with outcome and acceptance.
5. Record constraints, assumptions, non-goals, and dependencies.
6. For fast work, mark pre-execution gates `not_required`, record the restated item, and proceed. Final user acceptance remains separate after verification.
7. For standard/controlled work, obtain `$project-scope-impact-guard` output and publish `需求与事项 vN` with `确认执行`, `修改事项`, `缩小范围`, or `补充需求`.
8. For controlled work, require a second confirmation of child tasks, dependencies, validation, and rollback.
9. Bind approval to the artifact version. Reconfirm only changed items/impact; an earlier unscoped "可以" does not approve expansion.

## Output Format

- `需求目标`
- `任务通道与原因`
- `已知约束`
- `事项清单与验收标准`
- `待调查/待确认项` · `需求版本` · `需要的确认门禁` · `确认选项`
