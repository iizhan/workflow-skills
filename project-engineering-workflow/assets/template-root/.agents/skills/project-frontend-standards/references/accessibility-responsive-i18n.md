# Frontend Accessibility, Responsive Layout, And I18n

Use for interactive controls, layout, keyboard/focus, assistive technology, localization, or mixed-language content.

## Accessibility

- Start with semantic HTML/control roles and native behavior before adding ARIA.
- Every interactive element needs an accessible name, keyboard operation, visible focus, and state communicated beyond color alone.
- Keep DOM and visual order coherent. Manage focus when dialogs, drawers, menus, route changes, errors, or removed content change context.
- Associate labels, descriptions, errors, table headers, and grouped controls programmatically.
- Announce meaningful asynchronous status without making routine updates noisy.
- Preserve readable contrast, target size, zoom/reflow, reduced-motion preference, and media alternatives appropriate to the product.

## Responsive Layout

- Test the actual supported window/viewports, including constrained desktop windows rather than only phone and wide desktop.
- Define stable grid/flex tracks, min/max sizes, wrapping, truncation, and overflow ownership.
- Prefer one responsive information hierarchy over hiding critical actions or duplicating divergent desktop/mobile implementations.
- Tables need an intentional small-width strategy: column priority, wrapping, row detail, sticky context, or bounded horizontal overflow. Do not let the whole page drift sideways accidentally.
- Dynamic labels, status, loading indicators, and hover states must not resize controls or shift surrounding layout unexpectedly.

## Language And Content

- Do not concatenate translated fragments into sentences with language-dependent order.
- Allow text expansion and mixed CJK/Latin content; avoid fixed text heights and unreadable vertical fragments.
- Use locale-aware date, number, currency, plural, and sorting APIs.
- Keep one interface language coherent unless bilingual content is a product requirement.
- Check long names, paths, identifiers, and unbroken tokens with wrapping, truncation plus disclosure, or copy affordances.

## Evidence

Keyboard-walk the changed path, inspect focus/state names, and capture representative supported widths and longest realistic content. Automated accessibility checks supplement rather than replace interaction inspection.
