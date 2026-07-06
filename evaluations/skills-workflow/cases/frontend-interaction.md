# Case: Frontend Interaction

## Goal

Verify that frontend work routes through general frontend rules and stack-specific rules.

## Prompt

```text
In a generated React project using this workflow, fix a button that appears clickable but gives no visible feedback after it is clicked. Keep the UI local-first and avoid adding a new design system.
```

## Expected Skill Routing

- `project-requirement-gate`
- `project-codebase-onboarding`
- `project-scope-impact-guard`
- `project-dev-core`
- `project-frontend-standards`
- `project-frontend-react`
- `project-frontend-css` when styling changes
- `project-code-generation`
- `project-verification-loop`
- `project-test-and-report`
- `project-session-summary`
- `project-skill-upgrade-advisor` if this problem repeats

## Evidence To Look For

- the button gets a visible result, state change, navigation, or local receipt
- loading/disabled/error/empty states are considered when relevant
- accessibility basics are checked
- layout and text wrapping are inspected
- verification includes render or manual UI check when automation is unavailable
- repeated no-feedback issue becomes an upgrade signal

## Common Baseline Failure

- adds only an `onClick` handler without user-visible feedback
- ignores layout or bilingual text wrapping
- final answer says "done" without UI verification
