# Project Profile And Decision Reuse Validation

## Metadata

- Date: 2026-07-14
- Candidate: `0.6.0`
- Scope: first-use project analysis, Profile reuse, decision-memory boundaries, evidence freshness, incremental refresh, compatibility, and cost
- Behavior measured: lifecycle script behavior measured locally; live model adherence and provider token usage remain unmeasured

## Lifecycle Result

Generated `0.6.0` fixture:

1. Initial `project-profile.mjs status --json` returned `missing` with no captured evidence.
2. After verified Profile/architecture content was marked ready, `capture --json` wrote ignored local evidence state.
3. Next status returned `fresh` and recommended reusing matched Profile sections instead of rereading the repository.
4. Adding a new `package.json` changed status to `stale` and reported only `package.json` as changed evidence.
5. The generated fixture passed CLI Doctor, shell Doctor, and `.specify/scripts/bash/validate-workflow.sh`.

## Contract Result

- Eleven structured task scenarios scored **100 / 100 (A)**.
- New coverage includes first Profile analysis, fresh reuse, evidence conflict, incremental refresh, decision reuse, and approval boundaries.
- Static contracts do not prove that a live model will always refresh at the right moment.

## Context Economics

| Surface | Estimated tokens | Status |
| --- | ---: | --- |
| Profile Router | 309 | pass |
| Fast task with Profile status gate | 2,480 | pass, below 2,500 warning |
| Ordinary task with fresh Profile | 3,499 | advisory warning, below 3,500 failure |
| Frontend task with fresh Profile | 4,657 | advisory warning, below 5,000 failure |
| Backend task with fresh Profile | 4,754 | advisory warning, below 5,000 failure |
| Profile refresh path | 1,144 | pass |

The regular task bundles intentionally omit full `project-codebase-onboarding` when the Profile is fresh. `profile-refresh` measures the conditional cost when the Profile is missing or stale. This models the requested behavior more accurately than adding full onboarding to every task.

Installed Skill entries: 26, estimated 12,566 tokens. Progressive references: 21, estimated 11,103 tokens; they are loaded only when the role router matches the changed surface.

## Memory Boundary

- Source-backed facts go to `.specify/project-profile/profile.yaml` and `architecture.md`.
- Stable, confirmed project choices go to `decision-memory.yaml`.
- Private preferences stay in the existing private memory space.
- Task approvals, deletion, permission, remote write, publish, release readiness, scope expansion, and final acceptance are never reusable decision memory.
- Secrets, raw `.env` values, private data, and unsupported inference are excluded.

## Residual Risk

- The current evidence script fingerprints architecture-relevant files and directory structure, not every implementation file by design.
- A source change that does not match the evidence rules can require explicit scoped onboarding or a future evidence-pattern update.
- Live blind task replay is still needed to measure whether context rereading actually decreases without stale-fact errors.
- Profile files are local project assets; they are not automatically staged, committed, published, or sent to an external service.
