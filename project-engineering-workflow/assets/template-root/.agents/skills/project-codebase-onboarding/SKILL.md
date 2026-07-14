---
name: project-codebase-onboarding
description: Build a read-only codebase map before editing unfamiliar areas. Use when Codex is entering a new module, inherited project, or complex repository and must explain request flow, ownership boundaries, source of truth, reuse points, and likely risks.
---

# Project Codebase Onboarding

Use when the changed area is absent from or conflicts with the fresh Project Profile. Reuse `.specify/project-profile/architecture.md`; do not remap known modules without changed evidence.

## Workflow

1. Locate the request entry point.
2. Identify the main execution path, upstream inputs, downstream side effects, and the source of truth.
3. Find the nearest reusable implementation instead of inventing a new pattern.
4. Distinguish confirmed structure from reasonable inference.
5. Explain why the current structure likely exists, especially around state, cache, async flow, permissions, generated config, or deployment boundaries.
6. Summarize what can be changed safely first and what should stay untouched.
7. Update only the affected Profile/architecture sections and capture evidence when this analysis discovers reusable project facts.

## Output Format

- `模块入口`
- `关键链路`
- `数据真值/配置真值`
- `可复用点`
- `危险区`
- `建议切入点`
