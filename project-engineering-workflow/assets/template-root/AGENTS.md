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

6. Use `$project-memory-router` when a request involves remembering, forgetting, retrieving, updating, sharing, or reflecting on reusable context.
   Separate user-private memory, team-shared memory, agent-self learning, and task-session memory. Do not write durable memory without showing the candidate and getting user confirmation.

7. Use `$project-evolution-router` when repeated feedback suggests the workflow itself should change.
   Promote learnings through the smallest valid level: session, memory policy, skill rule, workflow rule, constitution rule, or template rule. Validate approved changes before keeping them.

8. Use `$project-branch-release` when starting tracked implementation, preparing a release branch, cutting a version tag, or deciding whether a change is ready to merge into `main`.
   Default development flow is `main -> feature/<feature-slug> -> release/<version> -> tag -> merge main`.
   Do not develop on `main` by default. Do not tag or merge to `main` before review and test reporting are complete.

9. Create or update delivery artifacts under `specs/` when the task should be tracked:
   `bash .specify/scripts/bash/create-feature.sh <feature-slug> "<Feature Name>"`
   By default, `create-feature.sh` also creates `feature/<feature-slug>` before writing new specs artifacts when the repository is clean.
   Use `rule-change-proposal.md` when an evolution candidate needs detailed evidence, validation, and rollback notes.
   Follow `evolution-prefill-policy.md` and `evolution-draft-protocol.md` to auto-draft the first proposal version before review.
   Use `task-reflection.md` and `reflection-output-protocol.md` to produce the fixed end-of-task reflection and sync it back into workflow state.
   Use `delivery-summary.md` and `final-output-protocol.md` to produce the final Chinese closeout for the user.

10. Use `$project-stack-standards` before editing `__APP_PATH__`.
   Follow the repository's real `__STACK_NAME__` conventions instead of inventing a new structure.

11. Use `$project-code-generation` during implementation.
   Reuse existing modules, keep changes minimal, and preserve boundaries.

12. Use `$project-code-review` before merge or delivery.
   Prioritize bugs, regressions, missing edge cases, and unsafe assumptions.

13. Use `$project-test-and-report` before final delivery.
   Return a Chinese report with executed commands, results, uncovered areas, and residual risks.

Repository-specific rules:

- Treat repository source-of-truth config files as authoritative.
- Treat generated runtime config output as generated files: `__ENV_OUTPUT__`
- Treat enhanced capabilities, GSD orchestration, and gstack role review as project-scoped helpers, not permission to bypass requirement, scope, review, or test gates.
- Treat memory as scoped data, not global truth. User-private memory must be isolated by user identity when available; team-shared memory needs a source or owner; agent-self learning needs user confirmation before durable updates.
- Treat framework evolution as governed change, not automatic self-editing. Repeated feedback becomes a proposal first, then an approved and validated rule change.
- Treat branch and release flow as governed workflow assets. Default tracked development belongs on `feature/*`, release preparation belongs on `release/*`, and merge-to-`main` happens only after review and testing gates pass.
- Treat workflow upgrades as backward-compatible by default. New workflow files should be additive in minor upgrades and must not silently invalidate existing project artifacts.
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
