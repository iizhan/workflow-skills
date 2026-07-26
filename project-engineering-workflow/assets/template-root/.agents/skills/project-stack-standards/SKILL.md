---
name: project-stack-standards
description: Apply verified `__STACK_NAME__` conventions inside `__APP_PATH__` for confirmed implementation work.
---

# Project Stack Standards

Use when confirmed scope includes `__APP_PATH__`. Read fresh Profile facts, matched architecture, and decisions; if missing or stale, route through `$project-profile-router`.

## Rules

- Work only in `__APP_PATH__`; preserve the repository's actual `__STACK_NAME__` structure, language, naming, state, API/service boundaries, config, tests, and review red lines.
- Inspect relevant modules before editing. Prefer the smallest safe change, existing abstractions, and business rules owned by the affected module.
- Repository source-of-truth config wins. Treat `__ENV_OUTPUT__` as generated output where present; do not hardcode environment values when a config pipeline exists.
- Curate only stable, verified Profile facts. If a required stack rule is missing, refresh the Profile before writing or reusing it.
- Run the lowest-cost meaningful check for the changed area; document the manual path when an IDE, browser, device, simulator, or external system is required.
