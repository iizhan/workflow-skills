---
name: project-engineering-workflow
description: Bootstrap or upgrade the project-engineering-workflow framework for a repository. Use when the user explicitly wants to add AGENTS plus local skills plus spec artifacts to a repo, audit or upgrade an existing project-engineering-workflow installation, or set up this specific engineering workflow starter. Do not use for ordinary feature development, routine bug fixing, generic code review, or broad process advice that does not require installing or upgrading this framework.
---

# Project Engineering Workflow

Use this skill to turn a plain repository into a project with stable engineering flow, clear gates, and low onboarding cost.

This skill combines:

- portable `SKILL.md` packaging
- project-level `AGENTS.md` orchestration
- `spec / plan / tasks / checklist` delivery artifacts
- scoped memory governance, session reflection, and workflow evolution
- governed feature-branch and release flow
- codebase onboarding and scope locking
- implementation constraints, review, and testing closure

## When To Use

- A repository has no project-level AI collaboration rules
- A team wants to standardize requirement -> design -> implementation -> verification
- You want `spec-kit + skills + AGENTS` style workflow, but lighter and easier to adopt
- You need a starter that can be copied into frontend, backend, mobile, data, or Agent projects

## What To Read

- For benchmarking and design rationale, read `references/01-capability-model.md`
- For current engineering best practices, read `references/02-mainstream-rd-workflow.md`
- For first-time setup, read `references/03-quickstart.md`
- For stack-specific tuning, read `references/04-customization-guide.md`
- For Superpowers + GSD + gstack routing, read `references/05-superpowers-upgrade-blueprint.md`
- For ECC benchmarking and selective absorption guidance, read `references/06-ecc-benchmark.md`
- For a filled end-of-task example pack, read `references/06-real-task-example-pack/`
- For the current release notes and release checklist pack, read `references/07-v0.2-release-pack/`
- For backward-compatible upgrade guidance, read `references/08-upgrade-compatibility-pack/`
- For an old-project migration path from `v0.1` to `v0.2.x`, read `references/08-upgrade-compatibility-pack/v0.1-to-v0.2-upgrade-manual.md`
- For an old-project migration path from `v0.2.x` to `v0.3.x`, read `references/08-upgrade-compatibility-pack/v0.2-to-v0.3-upgrade-manual.md`
- For an old-project migration path from `v0.3.x` to `v0.4.x`, read `references/08-upgrade-compatibility-pack/v0.3-to-v0.4-upgrade-manual.md`
- For an old-project migration path from `v0.4.x` to `v0.5.x`, read `references/08-upgrade-compatibility-pack/v0.4-to-v0.5-upgrade-manual.md`
- For project Profile, architecture cache, decision reuse, and evidence freshness, read `references/08-upgrade-compatibility-pack/v0.5-to-v0.6-upgrade-manual.md`
- For versioned design, task, impact confirmation, scope-delta pause, self-check, and user acceptance, read `references/08-upgrade-compatibility-pack/v0.6-to-v0.7-upgrade-manual.md`
- For Workflow Templates, project bindings, Manifest validation, and bounded Scenario Loop Engineering, read `references/08-upgrade-compatibility-pack/v0.7-to-v0.8-upgrade-manual.md`
- For the six-lane onboarding map, read the generated `docs/AI能力地图.md` in a bootstrapped project
- For backend role workflow rules, read the generated `.agents/skills/project-backend-standards/SKILL.md` and only the referenced backend topic required by the changed surface
- For frontend role workflow rules, read the generated `.agents/skills/project-frontend-standards/SKILL.md` and only the referenced frontend topic required by the changed surface

## What This Skill Ships

- a ready-to-copy `assets/template-root/`
- an npm CLI entry: `project-engineering-workflow init`
- a bootstrap script: `scripts/bootstrap-project.sh`
- a validation script: `scripts/doctor.sh`
- a release validation command: `project-engineering-workflow release-doctor --output-dir ...`
- a memory index rebuild command: `project-engineering-workflow memory-index --output-dir ...`
- an upgrade command: `project-engineering-workflow upgrade --mode ... --dry-run`
- feature-branch and release scripts under `.specify/scripts/bash/`
- project-local skills for:
  - requirement gate
  - codebase onboarding
  - scope impact guard
  - tech solution
  - memory router
  - evolution router
  - branch and release
  - superpowers router
  - GSD router
  - gstack router
  - project Profile and architecture routing
  - Workflow Template routing and Manifest validation
  - dev core
  - backend standards and progressive backend references
  - frontend standards and progressive frontend references
  - frontend JS
  - frontend React
  - frontend Vue
  - frontend CSS
  - security review
  - verification loop
  - stack standards
  - code generation
  - code review
  - test and report
  - session summary
  - skill upgrade advisor

## Standard Workflow

### 1. Bootstrap The Project

Recommended npm / npx usage:

```bash
npx @workflow-skills/project-engineering-workflow init \
  --project-name "Your Project" \
  --project-slug "your-project" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/target-repo"
```

Local bash fallback:

```bash
bash scripts/bootstrap-project.sh \
  --project-name "Your Project" \
  --project-slug "your-project" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/target-repo"
```

If the repository has generated env output, also pass:

```bash
--env-output "apps/web/.env.local"
```

### 2. Tune Only Four Required Files

After bootstrap, first customize:

1. `AGENTS.md`
2. `.agents/skills/project-stack-standards/SKILL.md`
3. `.specify/memory/constitution.md`
4. `docs/Codex团队开发说明.md`
5. `docs/ClaudeCode团队开发说明.md`

This keeps onboarding fast and avoids overwhelming the team on day one.

### 3. Validate The Setup

Run:

```bash
bash scripts/doctor.sh /absolute/path/to/target-repo
```

`doctor` checks required files and current-line workflow contract drift, including UI/interaction verification rules that prevent static checks from being reported as full visible-interface coverage.

Or use structured CLI output when an upper workflow needs machine-readable status:

```bash
npx @workflow-skills/project-engineering-workflow doctor \
  --output-dir "/absolute/path/to/target-repo" \
  --json \
  --json-out "docs/workflow-doctor.json"
```

If the repository already uses the governed branch/release lane, validate local release readiness before any remote action:

```bash
npx @workflow-skills/project-engineering-workflow release-doctor \
  --output-dir "/absolute/path/to/target-repo" \
  --release-version "0.7.0" \
  --json \
  --json-out "docs/workflow-release-doctor.json"
```

If the repository already uses `.specify/memory-store`, rebuild the lightweight retrieval index with:

```bash
npx @workflow-skills/project-engineering-workflow memory-index \
  --output-dir "/absolute/path/to/target-repo" \
  --json \
  --json-out "docs/workflow-memory-index.json"
```

### 3.5. Upgrade Existing Projects Safely

When an older generated project wants newer workflow capabilities, prefer:

```bash
npx @workflow-skills/project-engineering-workflow upgrade \
  --output-dir "/absolute/path/to/target-repo" \
  --mode capabilities \
  --dry-run \
  --write-report
```

Rules:

- default to additive upgrade first
- do not touch historical `specs/<feature>/` artifacts
- generate a review report when the team needs explicit signoff
- use `--json` when an upper workflow needs structured decision, actions, checks, and recommended commands
- use `--json-out` when the structured result should be archived for memory, audit, or later automation
- review the dry-run plan before using `--overwrite-existing`
- use `--mode current` only when the project intentionally adopts the full current workflow line
- use `memory-index` to rebuild `.specify/memory-store/index.json` without rewriting durable memory record bodies
- treat branch/release, role, and Profile capabilities as additive for old projects; `0.4.x` keeps adaptive confirmation, `0.5.x` adds backend/frontend roles, and `0.6.x` adds source-backed project context reuse

### 4. Pilot With One Real Requirement

In the target repository, the recommended sequence is:

0. `$project-profile-router`
   - check evidence freshness, reuse only relevant Profile sections and confirmed decisions, and refresh missing/stale module facts before broad rereading
1. `$project-requirement-gate`
   - classify `fast / standard / controlled`, inspect before asking, and bind approval to a versioned requirement/item package
2. `$project-codebase-onboarding`
3. `$project-scope-impact-guard`
   - cover direct/indirect, user, data, contracts, security, compatibility, performance, tests, release, workflow, and explicit non-impact boundaries
4. `$project-tech-solution`
   - decompose confirmed `ITEM-*` into `TASK-*`; controlled work requires plan confirmation before edits
4.5. `$project-workflow-router` for standard or controlled development that matches a declared role, scenario, or integration Workflow
   - validate `.skill-os/workflows`, choose at most one primary scenario, and keep foundation/role flows as dependencies
5. `$project-superpowers-router` when enhanced capabilities are useful
   - `$project-gsd-router` for long-running or context-heavy work
   - `$project-gstack-router` for role-specific product, design, engineering, QA, ship, or reflection judgment
6. `$project-memory-router` when remembering, forgetting, retrieving, sharing, session reflection, or agent self-improvement is involved
7. `$project-evolution-router` when repeated learnings should upgrade skills, workflow rules, templates, or constitution
8. `$project-branch-release` when tracked implementation should start from `feature/*`, or when release/tag/main-merge decisions are involved
9. `bash .specify/scripts/bash/create-feature.sh <feature-slug> "<Feature Name>"`
10. `$project-dev-core`
11. `$project-stack-standards`
12. `$project-backend-standards` when the task changes backend APIs, services, jobs, events, data, integrations, or runtime behavior; load only the matching references
13. `$project-frontend-standards` when the task is frontend; load only the matching experience, data-flow, accessibility, performance, or testing references
14. `$project-frontend-js`, `$project-frontend-react`, `$project-frontend-vue`, or `$project-frontend-css` when the task needs that stack
15. `$project-security-review` when the task touches auth, secrets, user input, APIs, databases, private data, or external effects
16. `$project-code-generation`
17. `$project-code-review`
18. `$project-verification-loop` for meaningful, risky, shared, frontend, backend, security, database, or cross-module changes
   - map every approved item and impact to evidence, failure, or residual risk
19. `$project-test-and-report`
   - publish a versioned report and wait for user acceptance or revision
20. `$project-session-summary`
21. `$project-skill-upgrade-advisor` when the same friction repeats

## Working Principles

- Prefer the smallest safe change over large refactors
- Keep workflow assets and business assets layered
- Require explicit scope awareness before editing
- Use specs and plans as collaboration memory, not ceremony
- Treat durable memory as scoped data that requires retention, retrieval, and confirmation rules
- Treat framework evolution as proposal-driven and validated, not automatic self-editing
- Keep the starter generic; move project-specific rules into project-local skills

## Adoption Guidance

### For An Existing Repository

- bootstrap first
- keep current code structure
- only replace the collaboration layer, not the application layer
- start with one feature and validate the process in practice

### For A New Repository

- bootstrap before the first major feature
- define stack rules early
- use `specs/` from day one to prevent requirement drift

## Output Expectations

When using this skill for a user request, provide:

- a short assessment of the current repository maturity
- which files from the starter should be kept as-is
- which files must be customized immediately
- a recommended first pilot feature
