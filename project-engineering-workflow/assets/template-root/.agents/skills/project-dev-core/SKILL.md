---
name: project-dev-core
description: Apply the default development rules for any coding task. Use before implementation to enforce git commit hygiene, naming consistency, smallest-safe-change edits, and verification discipline across all project work.
---

# Project Dev Core

Use this skill for every development task unless the work is strictly non-code.

## Core Rules

- Prefer the smallest safe change.
- Read the relevant code before editing.
- Keep variable, function, file, and branch names descriptive and consistent with the repo.
- Keep one change per commit when practical.
- Use conventional commit style unless the project says otherwise.
- Do not mix unrelated refactors into the same change.
- Verify the lowest-cost meaningful path before handoff.
- Validate inputs at system boundaries.
- Handle errors explicitly; do not silently swallow failures.
- Prefer simple, readable code over clever abstractions.

## Git Hygiene

- Use short, focused commits.
- Mention the user-visible intent in the commit message.
- Avoid placeholder messages like "fix stuff".
- If the task touches multiple unrelated areas, split the work or explain why it must stay together.
- Review `git diff` before commit or delivery.
- Do not revert unrelated user changes.

## Naming

- Use intent-revealing names.
- Keep boolean names readable as conditions.
- Avoid abbreviations unless they are standard in the codebase.
- Match existing language and casing conventions in the repo.
- Prefer verb-noun function names for actions.
- Prefer `is`, `has`, `should`, or `can` prefixes for booleans.

## Code Quality

- KISS: choose the simplest implementation that satisfies the requirement.
- DRY: extract duplication only when repeated logic is real.
- YAGNI: do not add speculative features or generic frameworks.
- Keep functions focused; split large functions when a smaller unit has a clear name.
- Keep files cohesive; move helpers only when it improves ownership and readability.
- Prefer immutable updates for shared data structures unless the local codebase clearly uses mutation.
- Use structured data and parsers instead of fragile string manipulation when practical.

## Verification

- Run the cheapest check that exercises the changed path.
- Expand only when the change has broader impact.
- For risky or cross-layer changes, run `$project-verification-loop` before final delivery.

## Routing

- For frontend work, continue with `$project-frontend-standards` and the relevant stack skill.
- For security-sensitive work, continue with `$project-security-review`.
- For final delivery, continue with `$project-test-and-report`.
