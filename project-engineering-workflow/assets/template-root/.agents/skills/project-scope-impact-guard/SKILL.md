---
name: project-scope-impact-guard
description: Lock the smallest safe change scope before implementation. Use when a confirmed request may trigger cross-file or cross-layer edits and Codex must separate direct impact from ripple impact, define out-of-scope items, and prevent accidental overreach.
---

# Project Scope Impact Guard

Use this skill after the requirement is understood and before significant edits.

## Workflow

1. State the smallest deliverable scope.
2. List directly impacted modules and files.
3. List likely ripple impact such as routes, shared components, configs, scripts, tests, docs, or release behavior.
4. List out-of-scope items that should not be pulled in casually.
5. Call out dangerous areas such as auth, permissions, routing, shared UI, config pipeline, generated files, database migrations, or external integrations.
6. If scope expansion becomes necessary, pause and request confirmation.

## Output Format

- `建议锁定范围`
- `直接影响`
- `可能联动`
- `范围外事项`
- `风险说明`
- `是否需要再次确认`
