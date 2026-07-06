---
name: project-frontend-vue
description: Apply Vue frontend rules. Use when browser code uses Vue or single-file components and needs guidance on composition, reactivity, component boundaries, and Vue-specific hygiene.
---

# Project Frontend Vue

Use this skill for Vue and single-file component tasks.

## Rules

- Keep components focused and readable.
- Use composition and reactivity in the repo's existing style.
- Keep state and side effects close to the owning feature.
- Prefer clear props, emits, and local composables.
- Avoid mixing unrelated concerns inside a single component.
- Avoid mutating props directly.
- Prefer computed values for derived state.
- Keep watchers narrow and justified.
- Keep async loading, empty, error, disabled, and success states visible.
- Clean up external listeners or timers in lifecycle hooks.
- Sanitize user-controlled HTML before using `v-html`.
