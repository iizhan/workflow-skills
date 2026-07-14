# Frontend And Backend Role Workflows Validation

## Metadata

- Date: 2026-07-14
- Candidate: `0.5.0`
- Scope: adaptive backend/frontend role workflows, progressive disclosure, static quality, token budgets, generated project, package contents, and `0.4.0` compatibility
- Behavior measured: no; live model adherence and provider token usage remain unmeasured

## Result

- Backend and frontend role `SKILL.md` files passed `quick_validate.py`.
- JavaScript syntax, shell syntax, JSON parsing, workflow static contract, and task-requirement enforcement passed.
- Ten structured task scenarios scored **100 / 100 (A)** with no failed contract requirements.
- A generated `0.5.0` project passed CLI Doctor and shell Doctor with no missing files or contract issues.
- Package dry-run included 127 files, including all role entries and 11 new role references.
- A real Git-exported `0.4.0` template passed both current Doctors with 12 additive role files reported as upgrade suggestions.
- A real `0.4.0 -> 0.5.0` current upgrade added 12 files, updated 26 governed files, reported `specsUntouched: true`, and passed both Doctors after upgrade.

## Role Coverage

Backend covers request/job/event tracing, module/domain boundaries, API/RPC/event contracts, data/transactions/migrations/cache/concurrency, runtime resilience, security, observability, performance, risk-based testing, rollout/rollback, and a conditional Java/Spring/MyBatis/Dubbo profile.

Frontend covers user journeys, complete async/interaction states, component/data/state ownership, accessibility, responsive and mixed-language layout, performance, security/privacy, observability, risk-based visible verification, and conditional JS/React/Vue/CSS implementation guidance.

Both role entries reuse the existing requirement, impact, implementation, review, verification, and acceptance core rather than copying it.

## Token Economics

| Surface | Estimated tokens | Budget/status |
| --- | ---: | --- |
| `project-backend-standards` entry | 682 | pass, <= 700 |
| `project-frontend-standards` entry | 690 | pass, <= 700 |
| `project-dev-core` | 677 | pass, <= 700 |
| fast task bundle | 2,148 | pass, < 2,500 warning |
| ordinary development bundle | 3,395 | warning, < 3,500 failure |
| backend role bundle | 4,643 | warning, < 5,000 failure |
| frontend role bundle | 4,651 | warning, < 5,000 failure |

- Installed skill entries: 25, estimated 12,089 tokens in total.
- Progressive references: 19, estimated 10,026 tokens in total; they are excluded from default bundle cost and must be loaded only by matching signals.
- Focused React/Vue/CSS skills are measured separately instead of pretending every frontend task loads all frameworks.

## Compatibility Repair

The previous candidate required `confirmation_history` and `child_tasks` from every project declaring `0.4.0`, although early `0.4.0` output did not contain those fields. Their strict Doctor contract now begins at `0.5.0`, so a real early `0.4.0` project remains valid and receives role-workflow upgrade suggestions instead of a false contract-drift failure.

## Residual Risk

- Static contract coverage does not prove that a live model selects the correct role/reference or obeys it at the right time.
- Run blind backend and frontend task replays against `0.4.0` and `0.5.0`, capturing tool traces, user corrections, elapsed time, and provider token usage before claiming global or best-in-class behavior.
- Backend stack-specific guidance currently has a Java/Spring profile. Node.js, Python, Go, .NET, and other profiles should be added only from validated project evidence.
- Full role bundles remain above advisory warning thresholds; reference loading and live telemetry should be monitored for over-triggering.
- Workflow visualization and runtime event projection were not implemented in this role-workflow change.
