# Implementation Contract

Load this reference only when a task will edit code, generate files, run local commands, change data models, or alter build/test behavior.

Use this loop:

1. Restate the requested change and the files or modules likely in scope.
2. Inspect existing patterns before editing.
3. Choose the smallest change that satisfies the request and preserves local conventions.
4. Keep implementation separate from review. Do not claim review quality while still actively editing.
5. Run the narrowest useful checks first, then broader checks when the blast radius is larger.
6. Record commands, failures, fixes, and any skipped verification.
7. Hand the changed surface to review before final delivery.

Implementation guardrails:

- Prefer existing helpers, naming, structure, and test style.
- Avoid unrelated refactors and metadata churn.
- Do not rewrite user changes unless explicitly requested.
- Treat generated assets and bulk rewrites as implementation artifacts that still need verification.
- If a change touches UI behavior, also read `ui-automation-contract.md`.
- If a change touches permissions, external effects, credentials, user data, or destructive behavior, route through the security review skill before execution.

Completion handoff:

- List changed files or modules.
- List verification already run.
- List residual risks or unchecked paths.
- State the exact review target.
