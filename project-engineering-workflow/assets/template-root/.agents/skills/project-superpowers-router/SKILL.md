---
name: project-superpowers-router
description: Route high-leverage AI capabilities safely inside this project. Use when a request may benefit from browser automation, image/document/spreadsheet/presentation tools, multi-agent research, GSD long-task orchestration, gstack role review, recurring checks, external APIs, generated assets, or other enhanced execution capabilities beyond normal code editing.
---

# Project Superpowers Router

Use this skill before invoking enhanced capabilities that can read outside the immediate code path, call tools, create assets, automate browsers, schedule work, or affect external systems.

This skill does not replace the normal engineering workflow. It decides how extra capabilities should be used within the confirmed requirement, locked scope, and project standards.

## Inputs

- confirmed requirement analysis
- codebase onboarding summary when available
- scope lock result
- current tool or capability request
- relevant project rules from `AGENTS.md`

## Capability Classes

- `read-only discovery`: search, inspect, browse, screenshot, analyze files, inspect schemas, or collect references
- `local execution`: run tests, scripts, builds, formatters, dev servers, migrations in dry-run mode, or local verifiers
- `asset generation`: create or edit images, documents, spreadsheets, presentations, diagrams, fixtures, or mock data
- `interactive automation`: use browser, app, device, simulator, or UI automation to verify behavior
- `external side effect`: call external APIs, publish, deploy, send messages, schedule jobs, mutate remote data, or change credentials
- `multi-agent delegation`: split research, review, migration, or validation across specialist agents
- `gsd orchestration`: hand off to `project-gsd-router` for long-running, multi-session, or context-heavy work
- `gstack role review`: hand off to `project-gstack-router` for product, design, engineering, QA, ship, or reflection judgment

## Routing Rules

1. Keep the original requirement and scope lock authoritative.
2. Pick the smallest capability class that can answer the need.
3. Prefer read-only discovery before execution when the risk is unclear.
4. Use local execution before external side effects.
5. Require an explicit user confirmation before external side effects, credential changes, publishing, deployment, destructive commands, or recurring automations.
6. Use `project-gsd-router` only when resumable milestones or context control are needed.
7. Use `project-gstack-router` only when role-specific judgment will change quality, scope, or release confidence.
8. Record assumptions, chosen capability, expected output, and rollback or cleanup path before acting.
9. After the capability runs, fold the result back into the normal workflow:
   - implementation uses `project-code-generation`
   - review uses `project-code-review`
   - validation uses `project-test-and-report`

## Frontend / UI Interaction Contract

When the change touches UI layout, visual hierarchy, browser flow, desktop app screens, navigation, or user-facing buttons, route it as `interactive automation` unless the user explicitly says not to test visually.

Use this loop (`problem collection -> test -> repair -> record`):

1. Collect the visible issue or risk, including user screenshots, reported broken clicks, or unclear flows.
2. Run the lowest-cost static and build checks first.
3. Exercise the changed user path through the visible interface when browser, app, device, or simulator automation is available.
4. Capture screenshots or a machine-readable UI report for changed first screens and high-risk actions.
5. Record every failed click, layout overlap, clipped label, stale selection, missing feedback, or blocked automation.
6. Repair, rerun the checks, and only then mark the UI path verified.
7. If interactive automation is blocked by the environment, state that clearly and provide the exact manual verification path. Do not report a full UI pass from static checks alone.

## Output Format

- `能力需求`
- `推荐能力类型`
- `使用边界`
- `执行步骤`
- `需要确认`
- `结果回收方式`
