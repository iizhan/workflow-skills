# __PROJECT_NAME__ Agent Workflow

This repository uses project-local skills under `.agents/skills`.
Specification and delivery artifacts live under `.specify` and `specs`.

For any request that may change code, config, scripts, docs, templates, tests, or delivery behavior, follow this sequence:

1. Use `$project-requirement-gate`.
   Produce a Chinese requirement analysis with goal, constraints, acceptance criteria, impacted modules, and risky assumptions.

2. Use `$project-codebase-onboarding` when entering an unfamiliar module.
   Build a read-only map of the request path, source of truth, key dependencies, and likely risks before editing.

3. Use `$project-scope-impact-guard`.
   Lock the smallest safe edit scope and separate direct impact from likely ripple impact.

4. Use `$project-tech-solution` for cross-layer, risky, or unclear tasks.
   Turn the confirmed requirement into a concrete implementation plan.

5. Use `$project-superpowers-router` when a request benefits from enhanced capabilities.
   Route browser automation, asset generation, multi-agent delegation, external tools, GSD long-task orchestration, gstack role review, or recurring work through the confirmed requirement and locked scope.
   Use `$project-gsd-router` only for long-running or context-heavy work. Use `$project-gstack-router` only for role-specific product, design, engineering, QA, ship, or reflection judgment.

6. Create or update delivery artifacts under `specs/` when the task should be tracked:
   `bash .specify/scripts/bash/create-feature.sh <feature-slug> "<Feature Name>"`

7. Use `$project-dev-core` before implementation.
   Apply default development hygiene: naming, git discipline, smallest safe change, error handling, input validation, and verification awareness.

8. Use `$project-stack-standards` before editing `__APP_PATH__`.
   Follow the repository's real `__STACK_NAME__` conventions instead of inventing a new structure.

9. For frontend work, use `$project-frontend-standards`, then the relevant focused skill:
   `$project-frontend-js`, `$project-frontend-react`, `$project-frontend-vue`, or `$project-frontend-css`.

10. For security-sensitive work, use `$project-security-review`.
    This includes auth, permissions, secrets, user input, uploads, API endpoints, database queries, payments, private data, and third-party integrations.

11. Use `$project-code-generation` during implementation.
   Reuse existing modules, keep changes minimal, and preserve boundaries.

12. Use `$project-code-review` before merge or delivery.
   Prioritize bugs, regressions, missing edge cases, and unsafe assumptions.

13. Use `$project-verification-loop` for meaningful, risky, shared, frontend, security, database, or cross-module changes.
    Run staged build/typecheck/lint/test/security/diff checks that exist in the target repo.

14. Use `$project-test-and-report` before final delivery.
   Return a Chinese report with executed commands, results, uncovered areas, and residual risks.

15. Use `$project-session-summary` when a task or session completes.
    Record outcome, changed files, risks, and next actions in `.specify/memory/session-history.md`.

16. Use `$project-skill-upgrade-advisor` when the same friction repeats across sessions.
    Capture evidence, propose the smallest useful skill update, and record it in `.specify/memory/skill-upgrade-backlog.md`.

Repository-specific rules:

- Treat repository source-of-truth config files as authoritative.
- Treat generated runtime config output as generated files: `__ENV_OUTPUT__`
- Treat enhanced capabilities, GSD orchestration, and gstack role review as project-scoped helpers, not permission to bypass requirement, scope, review, or test gates.
- Treat session summaries and upgrade advice as workflow memory, not application logic.
- Keep workflow assets and business assets layered:
  - workflow assets: `AGENTS.md`, `.agents`, `.specify`, `specs`, `docs`
  - business assets: application code, runtime config, scripts, infrastructure files
- Prefer the smallest safe change over broad refactors unless the user explicitly asks for a larger cleanup.
- When architecture, process, stack rules, or delivery expectations change, sync:
  - `AGENTS.md`
  - `.agents/skills/*`
  - `.specify/memory/constitution.md`
  - `.specify/templates/*`
  - `docs/Codex团队开发说明.md`
