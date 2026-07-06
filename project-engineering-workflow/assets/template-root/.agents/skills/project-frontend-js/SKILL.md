---
name: project-frontend-js
description: Apply JavaScript-focused frontend rules. Use when browser code is plain JS or when framework-specific behavior depends on idiomatic JavaScript structure, naming, and module boundaries.
---

# Project Frontend JS

Use this skill for frontend tasks that are primarily JavaScript.

## Rules

- Keep functions small and intention-revealing.
- Prefer structured data over ad hoc string manipulation.
- Match the repo's module style and export shape.
- Avoid unnecessary abstraction.
- Keep DOM, event, and state code close to the owning feature.
- Prefer immutable updates when changing arrays or objects used by UI state.
- Validate external payloads before rendering or storing them.
- Keep event handlers explicit about what state they change.
- Debounce or throttle noisy input only when the UX or performance actually needs it.
- Clean up timers, subscriptions, observers, and event listeners.
