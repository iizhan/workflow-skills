# __PROJECT_NAME__ Evolution Prefill Policy

This policy defines how Codex should draft a half-finished rule change proposal before user confirmation.

For exact draft order and workflow-state sync behavior, also follow `.specify/memory/evolution-draft-protocol.md`.

## Goal

The first draft should save time, but it should stay reviewable.

Codex may prefill a proposal from evidence already produced during the task. Codex must not present guesses as confirmed facts.

## Prefill Markers

Use these markers inside `rule-change-proposal.md` when drafting:

- `[auto]`: directly supported by task evidence
- `[inferred]`: a reasonable synthesis from multiple signals
- `[needs confirmation]`: missing, ambiguous, or high-impact content that requires user review

## Source Mapping

Use these sources to prefill the proposal:

| Proposal Section | Primary Sources | Prefill Rule |
| --- | --- | --- |
| `Trigger Signal` | `session_reflections`, repeated user feedback, repeated review findings | Copy the strongest repeated signal first |
| `Problem Statement` | review findings, test failures, friction notes, failed handoffs | Summarize the concrete workflow gap |
| `Promotion Level` | evolution policy + affected scope | Choose the smallest valid level and mark `[inferred]` if not explicit |
| `Change Summary` | successful workaround, repeated user correction, confirmed best practice | Describe the proposed rule in one paragraph |
| `Affected Files` | current workflow file map | List only files likely to change now |
| `Evidence` | task summary, review notes, test output, user decisions | Prefer concrete evidence over abstract claims |
| `Expected Benefit` | user choice rationale, repeated friction, failure reduction goal | State the benefit in observable terms |
| `Validation Plan` | changed layer + current validation commands | Preselect `doctor`, smoke, or focused task checks based on impact |
| `Rollback Plan` | previous rule path, smaller fallback, session-only fallback | Always include a way to downgrade or archive |
| `User Confirmation` | not auto-filled | Leave as `[needs confirmation]` |
| `Validation Result` | not auto-filled before validation | Leave empty until checks run |

## Drafting Rules

- Prefer short, concrete statements over abstract process language.
- Use the strongest available evidence; do not fabricate repetition.
- If the trigger happened only once, keep the proposal at `session` level or mark the gap clearly.
- If privacy, safety, permissions, or authority are involved, mark the proposal `[needs confirmation]` even if the draft is strong.
- If multiple promotion levels seem valid, draft the lower one first.

## Minimum Draft Quality

A half-finished proposal is good enough when it already includes:

- one clear problem statement
- one proposed promotion level
- one candidate file set
- one validation path
- one rollback path

Everything else can remain marked for confirmation.
