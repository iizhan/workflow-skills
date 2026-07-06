---
name: project-engineering-workflow
description: Bootstrap a portable R&D workflow for any repository. Use when the user wants to quickly add AGENTS rules, local project skills, spec/plan/tasks artifacts, onboarding docs, implementation gates, code review, and delivery validation to an existing or new project. Also use when the user asks to standardize team collaboration, improve engineering process, or create a low-threshold project engineering starter.
---

# Project Engineering Workflow

Use this skill to turn a plain repository into a project with stable engineering flow, clear gates, and low onboarding cost.

This skill combines:

- portable `SKILL.md` packaging
- project-level `AGENTS.md` orchestration
- `spec / plan / tasks / checklist` delivery artifacts
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

## What This Skill Ships

- a ready-to-copy `assets/template-root/`
- an npm CLI entry: `project-engineering-workflow init`
- a bootstrap script: `scripts/bootstrap-project.sh`
- a validation script: `scripts/doctor.sh`
- project-local skills for:
  - requirement gate
  - codebase onboarding
  - scope impact guard
  - tech solution
  - superpowers router
  - GSD router
  - gstack router
  - dev core
  - frontend standards
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

### 4. Pilot With One Real Requirement

In the target repository, the recommended sequence is:

1. `$project-requirement-gate`
2. `$project-codebase-onboarding`
3. `$project-scope-impact-guard`
4. `$project-tech-solution`
5. `$project-superpowers-router` when enhanced capabilities are useful
   - `$project-gsd-router` for long-running or context-heavy work
   - `$project-gstack-router` for role-specific product, design, engineering, QA, ship, or reflection judgment
6. `bash .specify/scripts/bash/create-feature.sh <feature-slug> "<Feature Name>"`
7. `$project-dev-core`
8. `$project-stack-standards`
9. `$project-frontend-standards` when the task is frontend
10. `$project-frontend-js`, `$project-frontend-react`, `$project-frontend-vue`, or `$project-frontend-css` when the task needs that stack
11. `$project-security-review` when the task touches auth, secrets, user input, APIs, databases, private data, or external effects
12. `$project-code-generation`
13. `$project-code-review`
14. `$project-verification-loop` for meaningful, risky, shared, frontend, security, database, or cross-module changes
15. `$project-test-and-report`
16. `$project-session-summary`
17. `$project-skill-upgrade-advisor` when the same friction repeats

## Working Principles

- Prefer the smallest safe change over large refactors
- Keep workflow assets and business assets layered
- Require explicit scope awareness before editing
- Use specs and plans as collaboration memory, not ceremony
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
