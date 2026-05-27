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
  --output-dir "/absolute/path/to/your-repo"
```

The generated workflow combines `AGENTS.md`, project-local skills, spec-kit style artifacts, Superpowers routing, GSD state, gstack role review, code review, and test reporting.

For the full framework description, see the repository root README.
