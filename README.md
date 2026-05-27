# Workflow Skills

Workflow Skills is a lightweight project engineering starter for AI-assisted software teams.

It bootstraps a reusable workflow layer around:

- `AGENTS.md` project orchestration
- project-local `.agents/skills`
- spec-kit style `spec / plan / tasks / checklist` artifacts
- Superpowers-style enhanced execution routing
- GSD-style long-task orchestration
- gstack-style role review
- delivery review and test reporting

The goal is not to stack many frameworks side by side. The goal is to route them through one project constitution so AI collaboration stays scoped, reviewable, and recoverable.

## Quick Start

```bash
npx @workflow-skills/project-engineering-workflow init \
  --project-name "CRM Platform" \
  --project-slug "crm-platform" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/your-repo"
```

Then validate the generated workflow:

```bash
npx @workflow-skills/project-engineering-workflow doctor \
  --output-dir "/absolute/path/to/your-repo"
```

For local development inside this repository:

```bash
node project-engineering-workflow/bin/project-engineering-workflow.mjs init \
  --project-name "CRM Platform" \
  --project-slug "crm-platform" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/your-repo"
```

## Architecture

```text
spec-kit + Superpowers + GSD + gstack + project-local skills
```

More precisely:

- `AGENTS.md` and `constitution.md` are the project-level control layer.
- `.specify` and `specs` provide spec-kit style delivery artifacts.
- `project-superpowers-router` routes enhanced execution capabilities.
- `project-gsd-router` handles long-running, resumable work.
- `project-gstack-router` handles PM, design, engineering, QA, ship, and reflection review.
- `project-code-generation`, `project-code-review`, and `project-test-and-report` close the delivery loop.

## Repository Layout

```text
project-engineering-workflow/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── assets/
│   └── template-root/
│       ├── AGENTS.md
│       ├── .agents/skills/
│       ├── .specify/
│       ├── docs/
│       └── specs/
├── bin/
│   └── project-engineering-workflow.mjs
├── references/
├── scripts/
│   ├── bootstrap-project.sh
│   └── doctor.sh
└── package.json
```

## Generated Project Layout

```text
.
├── AGENTS.md
├── .agents/
│   └── skills/
├── .specify/
│   ├── memory/
│   ├── templates/
│   └── scripts/
├── specs/
│   └── <feature>/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       ├── quickstart.md
│       ├── workflow-state.yaml
│       └── checklists/
└── docs/
    ├── Codex团队开发说明.md
    └── AI协作架构.md
```

## Local Checks

```bash
npm --prefix project-engineering-workflow run doctor
```

Package dry-run:

```bash
npm pack --dry-run --package-lock=false --cache /private/tmp/npm-cache-workflow-skills
```

## Status

This repository currently ships the `project-engineering-workflow` skill and npm CLI package:

```text
@workflow-skills/project-engineering-workflow
```
