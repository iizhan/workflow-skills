---
name: project-stack-standards
description: Implement changes using the repository's actual stack conventions. Use when editing the main application under `__APP_PATH__` and Codex needs stack-specific guidance for `__STACK_NAME__`.
---

# Project Stack Standards

Use this skill when the confirmed scope includes `__APP_PATH__`.

## Follow The Existing Stack

- Work within `__APP_PATH__`.
- Preserve the repository's real `__STACK_NAME__` conventions rather than imposing a new structure.
- Prefer the smallest safe change over broad refactors unless explicitly requested.
- Read existing modules, naming, folder layout, state shape, config loading, and testing style before editing.

## Fill These Project-Specific Rules First

Before broad team use, customize this file with the project's real answers:

- main directory layout
- component or module layering
- state management style
- API/service boundary rules
- config source-of-truth
- test entry points
- review red lines

## Config Rules

- Treat repository source-of-truth config files as authoritative.
- Treat `__ENV_OUTPUT__` as generated output when that path exists in the project.
- Do not hardcode environment values inside feature code when the repository already has a config pipeline.

## Implementation Rules

- Reuse existing abstractions before creating new ones.
- Keep business rules close to the module that owns them.
- Preserve project language, naming, copy style, and delivery conventions.
- If stack-specific rules are missing, update this skill first so future work stays aligned.

## Verification

- Run the lowest-cost meaningful checks that fit the changed area.
- If runtime verification depends on an IDE, browser, device, simulator, or external system, explain the manual path clearly.
