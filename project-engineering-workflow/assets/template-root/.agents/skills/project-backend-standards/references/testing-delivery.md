# Backend Testing And Delivery

Use for meaningful backend work. Select evidence by risk and changed boundary; do not run every category mechanically.

## Risk-To-Evidence Matrix

| Change | Minimum meaningful evidence |
| --- | --- |
| Pure domain rule | focused unit tests including boundaries and invalid states |
| Transport validation/error mapping | handler/controller test plus representative protocol request |
| Database query or transaction | repository/integration test with realistic schema and rollback/constraint cases |
| Public API/RPC/event contract | schema or consumer contract test plus compatibility check |
| External integration | adapter test with timeout/error mapping; sandbox/contract path when available |
| Migration/backfill | forward migration, invariant/count checks, restartability, compatibility, rollback or repair rehearsal |
| Concurrency/idempotency | duplicate and race-oriented test or deterministic simulation |
| Performance claim | reproducible benchmark/load evidence with baseline |
| Runtime/config change | startup/config validation and deployment/health evidence |

## Review Pass

Review the full changed path for:

- contract correctness and authorization
- invariant preservation, transactions, concurrency, and idempotency
- dependency failure, timeout, retry, and partial success
- data/query cost and resource bounds
- compatibility, migration order, rollout, and rollback
- logs, metrics, traces, health, and diagnosability
- tests that can fail for the bug/risk instead of merely executing code

## Delivery Strategy

- Prefer backward-compatible, independently deployable steps.
- Separate schema/data rollout from irreversible cleanup.
- Use feature flags only with ownership, default state, observability, expiry, and removal plan.
- Define pre-deploy checks, post-deploy signals, abort thresholds, and rollback/roll-forward ownership.
- Do not call a backend change verified when required infrastructure or contract consumers were unavailable; report `verified_with_risk` or `blocked` with the exact gap.

Map each protected invariant and approved impact to evidence in the final verification report.
