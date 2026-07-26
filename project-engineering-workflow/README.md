# Project Engineering Workflow

This package is part of [Workflow Skills](../README.md).

It provides the npm CLI and template payload for bootstrapping a reusable project engineering workflow:

```bash
npx @workflow-skills/project-engineering-workflow init \
  --project-name "CRM Platform" \
  --project-slug "crm-platform" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/your-repo"
```

Validate a generated project:

```bash
npx @workflow-skills/project-engineering-workflow doctor \
  --output-dir "/absolute/path/to/your-repo" \
  --json \
  --json-out "docs/workflow-doctor.json"
```

Validate branch/release readiness before any remote push or publish:

```bash
npx @workflow-skills/project-engineering-workflow release-doctor \
  --output-dir "/absolute/path/to/your-repo" \
  --release-version "0.7.0" \
  --json \
  --json-out "docs/workflow-release-doctor.json"
```

Rebuild the lightweight memory index without rewriting durable memory record bodies:

```bash
npx @workflow-skills/project-engineering-workflow memory-index \
  --output-dir "/absolute/path/to/your-repo" \
  --json \
  --json-out "docs/workflow-memory-index.json"
```

Validate the project-local Workflow Template registry before recommending or activating a scenario:

```bash
npx @workflow-skills/project-engineering-workflow workflow-validate \
  --output-dir "/absolute/path/to/your-repo" \
  --json \
  --json-out "docs/workflow-manifest-validation.json"
```

Upgrade an existing generated project without touching historical `specs/` artifacts:

```bash
npx @workflow-skills/project-engineering-workflow upgrade \
  --output-dir "/absolute/path/to/your-repo" \
  --mode capabilities \
  --dry-run \
  --write-report
```

Available upgrade modes:

- `governance`: refresh project-level workflow entry docs and constitution
- `capabilities`: add memory / evolution / branch-release lanes and related docs
- `templates`: upgrade future-feature templates plus feature-branch and release scripts
- `current`: adopt the full current workflow line and add `.specify/workflow-version.txt`

By default, `upgrade` only adds missing workflow files and preserves existing ones. Use `--overwrite-existing` only after reviewing the dry-run plan.
If you want a reviewable document, add `--write-report`; the default report path is `docs/workflow-upgrade-report.md`.
Upgrade plans also emit an explicit decision level: `ready`, `pilot-recommended`, `needs-confirmation`, `blocked`, or `completed`.
If you want machine-readable output for wrappers, skills, or UI orchestration, add `--json`.
If you also want an auditable artifact on disk, add `--json-out`.
`doctor --json` returns structured compatibility status for baseline-missing, upgrade-available, current-incomplete, or current-complete states.
`release-doctor --json` returns structured branch/release readiness, git-state blockers, release-artifact checks, and remote-action guard status.
`memory-index` only scans the configured JSONL durable-memory sources, rebuilds `.specify/memory-store/index.json`, and fails closed when records are malformed or IDs collide.
If a project has not adopted `.specify/memory-store` yet, upgrade it with `--mode capabilities` first.
`0.3.x` also introduces a governed git flow: default tracked work should move through `feature/* -> release/* -> v<version> -> merge main`.
`0.4.x` adds adaptive `fast / standard / controlled` task lanes, versioned confirmation gates, full impact analysis, scope-delta handling, and impact-to-evidence user acceptance reports.
`0.5.x` adds adaptive backend and frontend role workflows. Each role covers the full delivery path but loads architecture, contract, data, runtime, experience, accessibility, performance, and testing references only when the approved change needs them.
`0.6.x` adds a source-backed project Profile, architecture summary, confirmed decision memory, and evidence fingerprints so later tasks reuse fresh context instead of rereading the whole repository.
`0.7.x` adds a formal pre-implementation confirmation loop: versioned design, task breakdown, impact scope, acceptance/self-test plan, scope-delta pause, impact self-check, and explicit user acceptance.
`0.8.x` adds versioned Workflow Templates, project-local declarations, one-primary-workflow routing, bounded Scenario Loop Engineering, and a static Manifest validator. `0.8.1` adds the generic Feature delivery scenario for ordinary features, fixes, and refactors that do not start from a design or API contract. `0.8.2` makes the Codex project conversation the only Loop execution entry: it starts after the confirmed package and writes task evidence locally; the desktop workbench only observes imported evidence. The declared graph stays acyclic and represents repair as bounded iterations rather than arbitrary script retries.
Remote push and npm publish are still explicit manual steps; the shipped release scripts now refuse extra push/publish flags and keep remote actions outside local release preparation.

The generated workflow combines `AGENTS.md`, project-local skills, spec-kit style artifacts, memory governance, workflow evolution, branch/release governance, Superpowers routing, GSD state, gstack role review, adaptive backend/frontend role workflows, development rules, Codex and Claude Code harness guidance, security review, staged verification, code review, and test reporting.

Evaluate workflow changes with the repository `evaluations/skills-workflow` harness. A useful skill upgrade should improve routing precision, task outcome, safety, verification strength, friction cost, output clarity, maintainability, and learning-loop quality, not only trigger more skills.

Use the token economics template and estimator in the repository evaluation harness to compare quality gain against token cost. Prefer real provider usage metadata for final A/B decisions.

For the full framework description, see the repository root README.
For a filled closeout example pack, see [`references/06-real-task-example-pack/`](./references/06-real-task-example-pack/).
For release notes and checklists covering `0.2.x` through `0.6.x`, see [`references/07-v0.2-release-pack/`](./references/07-v0.2-release-pack/).
For the onboarding map of Delivery / Memory / Evolution / Reflection / Final Output / Branch-Release, see the generated `docs/AI能力地图.md`.
For backward-compatible upgrade rules, see the generated `docs/升级兼容策略.md` and [`references/08-upgrade-compatibility-pack/`](./references/08-upgrade-compatibility-pack/).
For practical old-project migration guides, see [`references/08-upgrade-compatibility-pack/v0.1-to-v0.2-upgrade-manual.md`](./references/08-upgrade-compatibility-pack/v0.1-to-v0.2-upgrade-manual.md) and [`references/08-upgrade-compatibility-pack/v0.2-to-v0.3-upgrade-manual.md`](./references/08-upgrade-compatibility-pack/v0.2-to-v0.3-upgrade-manual.md).
For adaptive confirmation migration, see [`references/08-upgrade-compatibility-pack/v0.3-to-v0.4-upgrade-manual.md`](./references/08-upgrade-compatibility-pack/v0.3-to-v0.4-upgrade-manual.md).
For adaptive frontend/backend role workflow migration, see [`references/08-upgrade-compatibility-pack/v0.4-to-v0.5-upgrade-manual.md`](./references/08-upgrade-compatibility-pack/v0.4-to-v0.5-upgrade-manual.md).
For project Profile and decision-memory migration, see [`references/08-upgrade-compatibility-pack/v0.5-to-v0.6-upgrade-manual.md`](./references/08-upgrade-compatibility-pack/v0.5-to-v0.6-upgrade-manual.md).
For Workflow Template and Loop Engineering migration, see [`references/08-upgrade-compatibility-pack/v0.7-to-v0.8-upgrade-manual.md`](./references/08-upgrade-compatibility-pack/v0.7-to-v0.8-upgrade-manual.md).
