# Workflow Manifest Contract

## Selection Order

```text
Project Profile -> task lane -> candidate filters -> one primary scenario/integration -> dependencies -> confirmation -> execution plan
```

`foundation` and `role` Templates supply common governance and specialist rules. They are dependencies of a primary `scenario` or `integration` Template; do not route all of them as separate user tasks.

## Manifest Rules

- `template_id` and `template_version` are stable identities.
- Activated versions are immutable. Create a draft, preview the diff, confirm, apply atomically, verify, and retain a rollback target.
- A project binding pins a Template version and may only restrict budgets, thresholds, and permissions. It cannot remove gates or add capability.
- The declared node graph remains a DAG. Cross-iteration repair is represented by a bounded `Scenario Loop Run`, not a graph back-edge.
- Legacy 1.0 declarations are read-only until an explicit migration is confirmed.

## Loop Quality Gate

An iteration may finish only when the scenario score reaches its threshold, every dimension floor passes, required checks have evidence, and no blocking issue remains. Otherwise record root cause, strategy, evidence, and the next stop or repair decision.
