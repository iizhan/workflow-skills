# Frontend Experience And States

Use for user journeys, actions, forms, feedback, destructive behavior, or asynchronous UI.

## Experience Contract

Before editing, define:

- user goal, entry point, prerequisite, and primary action
- what changes immediately after the action
- loading, disabled, empty, success, error, retry, cancellation, and recovery behavior
- navigation/back behavior and preservation of user input or selection
- destructive confirmation, undo, or recovery appropriate to consequence
- long content, mixed language, small window, mobile, keyboard, and slow/failing network behavior where relevant

Every actionable control needs an observable result. Avoid clicks that silently start work, ambiguous global loading, success toasts without state reconciliation, and errors that leave users unsure whether work occurred.

## Interaction Decisions

- Keep one clear primary action per focused surface; use familiar icons for compact tool actions and accessible names/tooltips when meaning is not obvious.
- Use inline feedback near the affected field/object for recoverable errors; use broader notices when the whole operation or page is affected.
- Prevent accidental duplicate submission, but do not leave controls permanently disabled after failure.
- Preserve user-entered data after validation or network failure unless retention is unsafe.
- Make optimistic updates reversible and reconcile them with authoritative server results.
- For long operations, show meaningful progress or phase/state, not an indefinite spinner with no escape.
- Empty states should explain the current state and offer the next relevant action without becoming a marketing panel.

## Forms And Validation

- Use visible labels, clear required/optional semantics, appropriate input types, and field-level errors associated with controls.
- Validate at useful times without fighting input; server validation remains authoritative.
- On failed submit, focus or summarize the first actionable error and keep prior valid input.
- For multi-step work, expose progress and preserve recoverable state.

## Completion Check

Walk the journey from entry through success and one realistic failure/recovery path. Confirm visible state matches actual system state and that repeated/back/reload behavior is intentional.
