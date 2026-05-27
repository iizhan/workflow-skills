---
name: project-gstack-router
description: Route role-based product, design, engineering, QA, release, and reflection decisions. Use when a task needs explicit role separation, product judgment, design review, engineering tradeoff review, QA gates, ship readiness, or post-delivery reflection.
---

# Project gstack Router

Use this skill when the task needs role-specific judgment instead of one blended implementation voice.

This skill creates focused role passes. It should stay lightweight and only activate the roles needed for the current task.

## Inputs

- confirmed requirement analysis
- scope lock result
- technical solution or implementation diff when available
- relevant `specs/<feature>/` files
- current risk level and delivery target

## Role Lanes

- `PM`: clarify user outcome, acceptance criteria, priority, and scope tradeoffs
- `Design`: review UI, UX, information architecture, content, and interaction quality
- `Engineering`: review architecture, maintainability, contracts, performance, and rollback
- `QA`: define edge cases, regression surface, test matrix, and manual verification
- `Ship`: decide release readiness, docs, migration notes, and follow-up work
- `Reflect`: capture lessons, reusable patterns, and workflow updates after delivery

## Routing Rules

1. Activate only roles that add useful judgment for the task.
2. Keep role output grounded in project files, specs, and changed behavior.
3. Turn role disagreements into explicit tradeoffs or user confirmation points.
4. Do not let role review expand implementation scope without passing `project-scope-impact-guard`.
5. Feed engineering changes back into `project-code-generation`.
6. Feed review findings into `project-code-review`.
7. Feed QA and ship findings into `project-test-and-report`.

## Output Format

- `启用角色`
- `角色结论`
- `冲突与取舍`
- `需要确认`
- `进入实现的要求`
- `进入交付的要求`
