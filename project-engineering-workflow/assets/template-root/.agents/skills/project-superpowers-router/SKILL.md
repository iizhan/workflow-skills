---
name: project-superpowers-router
description: Route high-leverage AI capabilities safely inside this project. Use when a request may benefit from browser automation, image/document/spreadsheet/presentation tools, multi-agent research, GSD long-task orchestration, gstack role review, recurring checks, external APIs, generated assets, or other enhanced execution capabilities beyond normal code editing.
---

# Project Superpowers Router

Use this skill before invoking enhanced capabilities that read beyond the immediate code path, call tools, create assets, automate interfaces, schedule work, or affect external systems.

Keep the confirmed requirement and scope lock authoritative. Extra capabilities support the normal workflow; they do not replace requirement, scope, review, or verification gates.

## Entry Discipline

Keep this file as the routing entry only. Do not load implementation, UI, or review details until the task actually needs them.

For development-heavy work, preserve the loop:

`plan -> implement -> test -> review -> finish`

The loop is mandatory, but its detailed rules live in references so ordinary routing does not spend context on them.

## Capability Classes

- `read-only discovery`: search, inspect, browse, screenshot, analyze files, inspect schemas, or collect references
- `local execution`: run tests, scripts, builds, formatters, dev servers, dry-run migrations, or local verifiers
- `asset generation`: create or edit images, documents, spreadsheets, presentations, diagrams, fixtures, or mock data
- `interactive automation`: use browser, app, device, simulator, or UI automation to verify behavior
- `external side effect`: call external APIs, publish, deploy, send messages, schedule jobs, mutate remote data, or change credentials
- `multi-agent delegation`: split research, review, migration, or validation across specialist agents
- `gsd orchestration`: hand off to `project-gsd-router` for long-running, multi-session, or context-heavy work
- `gstack role review`: hand off to `project-gstack-router` for product, design, engineering, QA, ship, or reflection judgment

## Routing Rules

1. Pick the smallest capability class that can answer the need.
2. Prefer read-only discovery before execution when risk is unclear.
3. Use local execution before external side effects.
4. Require explicit user confirmation before external side effects, credential changes, publishing, deployment, destructive commands, or recurring automations.
5. Use `project-gsd-router` only when resumable milestones or context control are needed.
6. Use `project-gstack-router` only when role-specific judgment will change quality, scope, or release confidence.
7. Record assumptions, chosen capability, expected output, and rollback or cleanup path before acting.
8. Fold results back into implementation, review, verification, and final report.

## When To Read References

- Read `references/ui-automation-contract.md` when the task touches UI layout, visual hierarchy, browser flow, desktop app screens, navigation, or user-facing buttons.
- Read `references/implementation-contract.md` when the task will edit code, generate files, run local commands, change data models, or alter build/test behavior.
- Read `references/review-contract.md` before reporting completion for non-trivial implementation work, risky edits, multi-file changes, or any task that needs independent bug/risk/test scrutiny.

## Output Format

- `能力需求`
- `推荐能力类型`
- `使用边界`
- `执行步骤`
- `需要确认`
- `结果回收方式`
