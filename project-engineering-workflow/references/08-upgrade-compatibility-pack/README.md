# Upgrade Compatibility Pack

This pack documents how `project-engineering-workflow` should evolve without breaking projects that already adopted older starter output.

## Why This Pack Exists

The starter now ships more workflow assets than the original baseline.

That is useful for new projects, but it creates a real compatibility question:

- how do we add new workflow capabilities
- without invalidating old generated artifacts
- and without forcing every existing consumer to upgrade immediately

## What This Pack Covers

- compatibility principles for starter evolution
- how `doctor` should behave for older projects
- how to distinguish optional upgrade files from core baseline files
- how an existing `v0.1`-style project should move to `v0.2.x` safely
- how a `v0.3.x` project should adopt `v0.4.x` confirmation and impact governance explicitly
- how a `v0.4.x` project should adopt `v0.5.x` frontend/backend role workflows explicitly
- how a `v0.5.x` project should adopt `v0.6.x` Profile and decision-memory reuse explicitly

## Current Direction

For `v0.2.x`, `v0.3.x`, `v0.4.x`, `v0.5.x`, and `v0.6.x`, the intended compatibility posture is:

- old projects should continue to pass `doctor` if they contain the baseline workflow
- newer workflow assets should appear as upgrade suggestions, not hard failures
- state file changes should stay additive within the minor line
- new branch/release assets should remain optional until the project explicitly declares the `0.3.0` workflow line
- `0.4.x` content contracts should apply only after a project declares that workflow line
- `0.5.x` role workflow contracts should apply only after a project declares that workflow line
- `0.6.x` Profile contracts should apply only after a project declares that workflow line

## Files In This Pack

- `v0.1-to-v0.2-upgrade-manual.md`
  A practical step-by-step upgrade manual for existing projects.
- `v0.2-to-v0.3-upgrade-manual.md`
  A practical step-by-step upgrade manual for adopting governed branch/release flow.
- `v0.3-to-v0.4-upgrade-manual.md`
  A reviewed migration path for adaptive task lanes, versioned confirmation, impact scope, and user acceptance.
- `v0.4-to-v0.5-upgrade-manual.md`
  A reviewed migration path for adaptive frontend/backend role workflows and progressive role references.
- `v0.5-to-v0.6-upgrade-manual.md`
  A reviewed migration path for project Profile, architecture summaries, decision memory, and evidence freshness.
- `upgrade-report-template.md`
  A review template for `upgrade --dry-run --write-report` plans.
