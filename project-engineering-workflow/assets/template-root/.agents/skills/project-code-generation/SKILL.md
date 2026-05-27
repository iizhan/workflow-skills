---
name: project-code-generation
description: Implement the confirmed plan with minimal safe edits. Use after requirement, onboarding, and scope are clear so Codex can change code while preserving repository conventions and reuse.
---

# Project Code Generation

Use this skill only after the task is understood well enough to code safely.

## Rules

- Implement the confirmed scope only.
- Reuse existing pages, modules, services, hooks, stores, scripts, and tests before creating new abstractions.
- Keep shared modules generic; do not smuggle one-off business logic into them.
- Avoid hidden scope expansion.
- When a new pattern becomes necessary, explain why reuse is insufficient.

## Delivery Checklist

Before claiming completion, confirm:

- changed files match the agreed scope
- edge states were considered
- relevant docs or specs were updated when behavior changed
- tests or manual verification paths are ready
