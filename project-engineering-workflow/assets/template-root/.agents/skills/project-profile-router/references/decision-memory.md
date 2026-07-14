# Project Decision Memory

Use when a task presents a choice that may recur or when a prior decision might avoid repeated questions.

## What Can Be Reused

Store only stable, project-scoped, user/team-confirmed decisions with evidence and invalidation conditions, for example:

- package manager, build/test commands, target runtime, supported versions
- module ownership, architectural direction, API/error conventions, data source of truth
- UI language, design system, accessibility baseline, supported viewport/device policy
- branch/review/release conventions and preferred verification paths
- approved recurring workflow preferences that do not grant new authority

Use `.specify/project-profile/decision-memory.yaml` for project-shared decisions. Private preferences remain under the existing user-private memory store.

## What Must Never Be Reused As Approval

- permission, credential, secret, or private-data access
- destructive actions, deletion, migration execution, remote writes, publish, push, deployment, payment, or external side effects
- requirement, impact, child-task plan, scope expansion, release readiness, or final acceptance for a new task/version
- temporary debugging choices, incident workarounds, one-off paths, or unsupported assumptions

Remembering a preference can prefill a recommendation; it cannot silently approve the current action.

## Entry Contract

Each reusable decision needs:

- stable ID, title, value, scope, tags, and affected modules
- source/owner and explicit confirmation record
- rationale, alternatives, confidence, created/updated timestamps
- activation conditions and invalidation conditions
- status: `active`, `superseded`, `rejected`, or `archived`

Retrieve by module, task type, and tags. Load only matched entries. If current evidence conflicts, stop reuse, mark the entry stale/superseded, and ask only when the changed choice materially affects outcome or risk.
