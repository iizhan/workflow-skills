# Review Contract

Load this reference before reporting completion for non-trivial implementation work, risky edits, multi-file changes, or any task that needs independent bug, risk, or test scrutiny.

Use this loop:

1. Re-read the final diff, not only the intended plan.
2. Check behavior first: regressions, missing states, stale data, wrong assumptions, and broken user flows.
3. Check boundaries: permissions, local vs remote effects, privacy, filesystem writes, and rollback paths.
4. Check verification: typecheck, tests, build, smoke checks, UI automation, or manual paths appropriate to the change.
5. Check maintainability: duplicated logic, unclear names, oversized entry files, and references that should be progressively disclosed.
6. Fix blocking findings or clearly report why they remain.

Review output rules:

- Lead with findings when problems remain.
- If no blocking issue is found, say what was reviewed and what risk remains.
- Do not treat static checks as a full UI pass when visible UI behavior changed.
- Do not mark an accepted optimization proposal resolved until the implementation and verification evidence match the proposal.

Accepted proposal closure:

- `accepted` means the direction is approved.
- `resolved` means the corresponding implementation has been made and verified.
- If implementation is partial, leave the proposal accepted and record the missing verification.
