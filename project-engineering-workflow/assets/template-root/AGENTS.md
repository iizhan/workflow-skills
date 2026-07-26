# __PROJECT_NAME__ Agent Workflow

This repository uses project-local skills under `.agents/skills`.
Specification and delivery artifacts live under `.specify` and `specs`.

For any request that may change code, config, scripts, docs, templates, tests, or delivery behavior, follow this sequence:

Before task classification, use `$project-profile-router`. Run the local Profile status check and reuse verified stack, architecture, commands, module boundaries, and matched confirmed decisions. If the Profile is missing, stale, contradicted, or lacks the requested module, perform read-only analysis, update `.specify/project-profile/`, and capture fresh evidence before broad implementation analysis. Source-backed Profile cache refresh is allowed before requirement confirmation; it must not change business assets, copy secrets, stage/commit files, or reuse a prior task's approval.

Use an adaptive task lane before choosing how much ceremony to expose:

- `fast`: one clear, low-risk, reversible outcome. Briefly restate the goal, execute, and verify without forcing separate requirement or child-task approval.
- `standard`: multiple work items or bounded shared impact. Confirm one versioned package containing goal, work items, acceptance criteria, and impact before editing.
- `controlled`: cross-module, architecture, database, security, permissions, migration, external effects, destructive actions, release behavior, or material ambiguity. Confirm requirements and impact first, then confirm child tasks, dependencies, verification, and rollback.

Investigate discoverable project facts before asking questions. Ask only when ambiguity changes outcome, scope, data, permissions, compatibility, delivery behavior, or acceptance. Bind every approval to an explicit artifact version. If approved scope or impact expands during execution, pause and confirm the delta before continuing.

Reassess the task lane after onboarding and impact analysis. Persist state as `clarification -> requirement_impact_pending -> plan_pending -> executing -> verifying -> awaiting_user_acceptance -> accepted | revision_requested`, skipping only gates marked `not_required`. Fast work skips pre-execution approval gates, not verification or final user acceptance.

## Formal Implementation Confirmation

Before formal implementation of `standard` or `controlled` work, publish one aligned confirmation package:

1. `设计方案 vN`: solution structure, UI/API/data behavior, alternatives, tradeoffs, and non-goals.
2. `任务拆解 vN`: ordered `TASK-*` items mapped to confirmed `ITEM-*`, dependencies, allowed paths, completion conditions, and verification evidence.
3. `影响范围 vN`: direct/indirect impact, data, interfaces/config, security/permissions, compatibility, performance, tests, release/rollback, Workflow/Skill assets, and explicit non-impact boundaries.
4. `验收与自测计划`: acceptance criteria, commands, visible interaction path, evidence format, and rollback trigger.

Do not edit business code, configuration, tests, or Workflow assets until the applicable package version is explicitly confirmed. A `fast` task may use the lightweight path: brief solution, affected files, verification method, and recorded confirmation only when the change is clear, local, reversible, and low risk.

If implementation reveals a material design change, a new impact dimension, an expanded path/module, a changed acceptance criterion, or a new permission/data/migration risk, pause. Publish the changed artifact as `vN+1`, record the scope delta, and obtain confirmation before continuing. Ordinary implementation-detail choices that stay inside the approved package do not require a new gate.

After implementation, run self-test and an impact-scope self-check. Publish `验证报告 vN` and keep the task in `awaiting_user_acceptance` until the user confirms acceptance or requests revision.

1. Use `$project-requirement-gate`.
   Classify the task lane using the fresh Project Profile first, check whether the request is clear, inspect only missing task context, and produce versioned Chinese requirements with `ITEM-*` work items and acceptance criteria.
   For standard or controlled work, present concrete choices: confirm execution, modify items, narrow scope, or add requirements.

2. Use `$project-codebase-onboarding` when entering an unfamiliar module.
   Reuse the project-level architecture map, then build or refresh only the unfamiliar module's request path, source of truth, dependencies, and risks before editing.

3. Use `$project-scope-impact-guard` for standard or controlled work; fast work needs it only if inspection reveals shared or uncertain impact.
   Produce a versioned impact report covering direct and indirect impact, users, data/migration, interfaces/config, security/permissions, compatibility, performance, tests, release/rollback, Workflow/Skill assets, and explicit non-impact boundaries.
   Assign `low`, `medium`, `high`, or `blocked`. Map approved impact to work items and verification evidence.

4. Use `$project-tech-solution` for cross-layer, risky, or unclear tasks.
   Turn confirmed requirements and impact into `TASK-*` child tasks with dependencies, completion conditions, verification evidence, and rollback.
   Publish `设计方案 vN` and `任务拆解 vN` before editing. Standard and controlled formal implementation both require explicit confirmation of the aligned design, task, impact, and acceptance package. If decomposition changes scope or impact, publish a new version and reconfirm only the delta.

4.5. Use `$project-workflow-router` after the task lane and Project Profile are known for standard or controlled development that may match a declared role, scenario, or integration Workflow.
   Validate `.skill-os/workflows/` before recommendation, select at most one primary scenario or integration Workflow, and list foundation/role Templates only as dependencies. A declared Workflow is an execution plan and evidence model, not permission to bypass confirmation, Harness controls, scope, budget, security review, verification, or user acceptance. Use its Loop Policy only after the formal package is confirmed; keep every iteration inside approved scope and stop for a `vN+1` confirmation when scope, contract, permission, migration, external effect, or release impact changes.
   Conversation is the only execution entry for Scenario Loop Engineering. When the current standard or controlled request matches a loop-enabled primary Workflow, show the selected Workflow and Loop policy as part of the formal confirmation package; after that same package is explicitly confirmed, start the Loop in this conversation and record it in the feature's `workflow-state.yaml`. The desktop workbench may read and display the record, but it never starts Codex, authorizes implementation, or creates a Loop on the user's behalf.
   A Scenario Loop Run is an operational record linked to the confirmed package and selected Template version, not a second task lifecycle. Each iteration records its root cause, distinct repair strategy, quality dimensions, hard-check evidence, budget state, residual risk, and stop reason. The default ceiling is three iterations and two distinct strategies for one root cause. A score of 90 or more still fails when a required check, evidence, dimension floor, or blocking defect is unresolved. Unknown, critical, or exhausted budget blocks another automatic repair iteration. Repeated root-cause failure creates an evolution candidate; it never silently rewrites a Skill or Workflow.

5. Use `$project-superpowers-router` when a request benefits from enhanced capabilities.
   Route browser automation, asset generation, multi-agent delegation, external tools, GSD long-task orchestration, gstack role review, or recurring work through the confirmed requirement and locked scope.
   For frontend, desktop app, browser, visual, navigation, or user-facing button changes, use the interactive automation path when available and record screenshots or a UI report.
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
   Treat the fresh Project Profile and repository evidence as authoritative; follow the real `__STACK_NAME__` conventions instead of inventing a new structure.

11. Use `$project-dev-core` before implementation.
    Apply default development hygiene: naming, git discipline, smallest safe change, error handling, input validation, and verification awareness.

12. For backend work, use `$project-backend-standards`.
    Trace the real request/job/event path, protect contracts and invariants, and load only the backend references implicated by architecture, API, data, runtime, security, observability, testing, delivery, or the detected stack profile.

13. For frontend work, use `$project-frontend-standards`, then the relevant focused skill:
    `$project-frontend-js`, `$project-frontend-react`, `$project-frontend-vue`, or `$project-frontend-css`.
    Define the observable experience states, preserve intentional state ownership, and load only the references implicated by interaction, accessibility, responsive/i18n, performance/security, or visible verification risk.

14. For security-sensitive work, use `$project-security-review`.
    This includes auth, permissions, secrets, user input, uploads, API endpoints, database queries, payments, private data, and third-party integrations.

15. Use `$project-code-generation` during implementation.
    Reuse existing modules, keep changes minimal, and preserve boundaries.

16. Use `$project-code-review` before merge or delivery.
   Prioritize bugs, regressions, missing edge cases, and unsafe assumptions.

17. Use `$project-verification-loop` for meaningful, risky, shared, frontend, backend, security, database, or cross-module changes.
    Run staged build/typecheck/lint/test/security/diff checks that exist in the target repo. Trace every approved impact and acceptance criterion to evidence or an explicit uncovered risk.

18. Use `$project-test-and-report` before final delivery.
   Return a versioned Chinese verification report with executed commands, impact-to-evidence mapping, results, uncovered areas, and residual risks. Mark delivery as `awaiting_user_acceptance` until the user accepts or requests revision.
   Do not mark a UI path as fully verified unless it was clicked through in a visible interface or the report explicitly states the manual path and automation blocker.

19. Use `$project-session-summary` when a task or session completes.
    Record outcome, changed files, risks, user acceptance, and dissatisfaction categories in `.specify/memory/session-history.md`.

20. Use `$project-skill-upgrade-advisor` when the same friction repeats across sessions.
    Capture evidence, distinguish one-off dissatisfaction from repeated or high-impact workflow failure, propose the smallest useful update, and record it in `.specify/memory/skill-upgrade-backlog.md`.

Repository-specific rules:

- Treat repository source-of-truth config files as authoritative.
- Treat `$project-stack-standards` as the project Profile and the frontend/backend standards as adaptive role workflows. Project facts override generic references; role workflows must record why each optional reference was loaded.
- Treat `.specify/project-profile/profile.yaml` and `architecture.md` as source-backed project cache, not permission. Treat `decision-memory.yaml` as confirmed project-shared choices; retrieve only matched active entries and never reuse task approval, destructive/remote authorization, release readiness, or final acceptance.
- Treat generated runtime config output as generated files: `__ENV_OUTPUT__`
- Treat enhanced capabilities, GSD orchestration, and gstack role review as project-scoped helpers, not permission to bypass requirement, scope, review, or test gates.
- Treat session summaries and upgrade advice as workflow memory, not application logic.
- Treat memory as scoped data, not global truth. User-private memory must be isolated by user identity when available; team-shared memory needs a source or owner; agent-self learning needs user confirmation before durable updates.
- Treat framework evolution as governed change, not automatic self-editing. Repeated feedback becomes a proposal first, then an approved and validated rule change.
- Treat branch and release flow as governed workflow assets. Default tracked development belongs on `feature/*`, release preparation belongs on `release/*`, and merge-to-`main` happens only after review and testing gates pass.
- Treat workflow upgrades as backward-compatible by default. New workflow files should be additive in minor upgrades and must not silently invalidate existing project artifacts.
- Do not load both complete role packs for a single-surface task. Full-stack work may route to both entry skills, but each side loads only references required by its approved impact.
- Keep workflow assets and business assets layered:
  - workflow assets: `AGENTS.md`, `.agents`, `.specify`, `specs`, `docs`
  - business assets: application code, runtime config, scripts, infrastructure files
- Prefer the smallest safe change over broad refactors unless the user explicitly asks for a larger cleanup.
- Do not force multi-round approval on fast tasks. Do not collapse controlled tasks into a vague one-line approval.
- Treat requirement, impact, plan, and verification confirmations as different decisions. A later expanded version is not approved by an earlier unscoped "可以".
- Treat scope drift as a workflow event: stop, describe the delta, update affected `ITEM-*` / `TASK-*`, and reconfirm only the changed impact.
- When architecture, process, stack rules, or delivery expectations change, sync:
  - `AGENTS.md`
  - `.agents/skills/*`
  - `.specify/memory/constitution.md`
  - `.specify/templates/*`
  - `docs/Codex团队开发说明.md`
