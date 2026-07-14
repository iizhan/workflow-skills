# Project Profile Freshness

Use when the project Profile is missing, stale, incomplete for the requested module, or contradicted by repository evidence.

## Initial Analysis

Inspect the smallest sufficient evidence set before asking the user:

- repository instructions and README/architecture documents
- package/build/workspace manifests and lockfiles
- application roots, module/package/service layout, and entry points
- framework bootstraps, routes/controllers/providers, state/data boundaries, and configuration sources
- database/migration, messaging, external integration, test, CI, container, and deployment entry points when present
- existing naming, error, logging, testing, release, and generated-file conventions

Write confirmed facts to `profile.yaml`, explain execution and ownership boundaries in `architecture.md`, and record each fact's source paths and confidence. Mark unknowns explicitly; do not fill gaps from generic stack assumptions.

## Freshness Rules

`project-profile.mjs status` fingerprints architecture evidence, not every implementation file. Reuse a Profile only when:

- status is `ready`
- local evidence state is `fresh`
- the requested module and path are represented
- current source evidence does not contradict the cached fact

Refresh only affected sections when manifests, architecture docs, module structure, key entry/config files, build/test commands, data/runtime boundaries, or project instructions change. A normal feature implementation should not invalidate the full Profile merely because source files changed.

## Conflict And Scope

- Repository source of truth overrides Profile facts.
- Newer verified evidence supersedes older summaries; keep the old decision/history only where useful for compatibility.
- Project-level freshness does not prove an unfamiliar module is understood. Run scoped onboarding and append that module.
- If evidence is ambiguous, preserve `unknown` and confidence instead of inventing certainty.
- Do not stage, commit, or publish Profile updates automatically.

## Capture Sequence

1. Update `profile.yaml` and `architecture.md`.
2. Verify no secrets, raw `.env` values, private data, or machine-specific credentials were copied.
3. Run `node .specify/scripts/project-profile.mjs capture --json`.
4. Record refreshed sections and changed evidence in the current `workflow-state.yaml`.
