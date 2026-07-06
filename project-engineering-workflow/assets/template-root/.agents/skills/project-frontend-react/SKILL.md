---
name: project-frontend-react
description: Apply React frontend rules. Use when browser code uses React or JSX and needs guidance on component boundaries, hooks, state ownership, rendering flow, and React-specific hygiene.
---

# Project Frontend React

Use this skill for React and JSX tasks.

## Rules

- Keep components focused and composable.
- Use hooks consistently with existing patterns.
- Keep state as local as possible.
- Lift state only when sharing truly requires it.
- Prefer explicit props and clear component boundaries.
- Avoid introducing a new state library without a real need.
- Use stable keys for lists; avoid index keys when order can change.
- Keep effects for synchronization with external systems, not derived render state.
- Memoize only when there is a real render or referential-stability reason.
- Keep async loading, empty, error, disabled, and success states visible.
- Avoid `dangerouslySetInnerHTML`; sanitize user-controlled markup if it is unavoidable.
- Keep accessibility attributes in sync with visible state.
