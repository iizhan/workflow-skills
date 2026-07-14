---
name: project-profile-router
description: Load or refresh the local project Profile before development work. Use at the start of code, config, architecture, test, or delivery tasks to reuse verified stack, module, command, architecture, and confirmed project-decision context without rereading the whole repository.
---

# Project Profile Router

Run `node .specify/scripts/project-profile.mjs status --json` before broad project reading.

- `fresh`: read only relevant sections of `.specify/project-profile/profile.yaml`, `architecture.md`, and matched decision entries.
- `missing` or `stale`: inspect the reported evidence, use `$project-codebase-onboarding`, update Profile/architecture, then run `capture`.
- Unknown task modules trigger a scoped refresh even when the project-level Profile is fresh.

Read `references/profile-freshness.md` when creating or refreshing facts. Read `references/decision-memory.md` before persisting or reusing choices.

Profile facts are reproducible project cache; never copy secrets, raw environment values, private data, or unsupported inference. Reuse stable confirmed conventions, never task approval, acceptance, destructive action, permission, publish, or external-effect authorization.
