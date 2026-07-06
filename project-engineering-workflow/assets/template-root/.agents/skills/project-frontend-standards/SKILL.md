---
name: project-frontend-standards
description: Apply the default frontend rules for web UI tasks. Use when the request affects browser-facing code and needs shared guidance before framework-specific rules such as JS, React, Vue, or CSS.
---

# Project Frontend Standards

Use this skill for browser-facing work before framework-specific skills.

## Core Rules

- Keep UI changes consistent with the existing app structure.
- Prefer accessible, predictable interactions.
- Keep content, layout, and state changes easy to scan.
- Avoid style drift across screens and components.
- Confirm whether the task is plain JS, React, Vue, or mostly CSS before editing.
- Treat responsiveness, empty states, loading states, disabled states, and error states as part of the task.
- Keep privacy boundaries visible when UI handles user data.

## Frontend Hygiene

- Preserve existing routing, state, and component boundaries.
- Do not introduce a new visual system without a reason.
- Reuse current design tokens, spacing, and text styles when available.
- Do not add analytics, tracking scripts, remote beacons, or third-party widgets without explicit approval.
- Do not log credentials, private user data, personal data, payment data, health data, or private emails.
- Make controls visibly responsive: a click should change state, navigate, open a focused surface, or show local feedback.
- Prefer semantic buttons, links, labels, headings, and form controls.
- Keep text from wrapping into unreadable vertical fragments.

## Verification

- Check desktop and mobile behavior when relevant.
- Confirm the changed path still renders and responds correctly.
- Verify keyboard and screen-reader basics when adding interactive controls.
- For layout-heavy changes, capture or inspect the changed viewport before final delivery.
