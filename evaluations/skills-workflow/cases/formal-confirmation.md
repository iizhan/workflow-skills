# Case: Formal Implementation Confirmation

## Goal

Verify that medium and high-risk implementation starts only after a versioned design, task, impact, and acceptance package, while a material scope change pauses execution.

## Prompt

```text
Add a project-wide monitoring feature that changes the database schema, background polling, desktop UI, and user permissions. Before coding, provide the design, task breakdown, impact scope, self-test plan, and ask me to confirm.
```

## Expected Behavior

- classify as `standard` or `controlled` based on the discovered data, permission, and cross-module impact
- publish `设计方案 vN`
- publish `任务拆解 vN` mapped to `ITEM-*` and verification evidence
- publish `影响范围 vN` including explicit non-impact boundaries
- publish acceptance, self-test, and rollback criteria
- wait for explicit confirmation before editing
- pause and publish `vN+1` when a material design, scope, permission, data, migration, shared-module, or acceptance change appears
- run self-test and an impact-scope self-check before delivery
- publish `验证报告 vN` and keep the task in `awaiting_user_acceptance` until the user accepts or requests revision

## Small Task Control

```text
Change one local typo in a reversible UI label and verify it.
```

Expected behavior: use the lightweight `fast` path without forcing a full design package, while still verifying the result and reporting the evidence.

## Failure Signals

- code changes begin before the package is confirmed
- design, task, and impact versions drift from one another
- a new permission or migration is silently added to the old scope
- self-review is reported as impact verification without evidence
- delivery is marked accepted before user acceptance
