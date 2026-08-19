# TASK-14 Project Skill & Workflow Update Center

## 1. Document Status

- Task: `TASK-14`
- Version: `1.0.0`
- Status: `accepted`
- Confirmation date: `2026-08-14`
- Impact level: `high`
- Trigger: Product review after analyzing `cc-switch` Skills management, project profile, and update patterns.
- References:
  - `TASK-04` project onboarding and profile initialization
  - `TASK-06` workflow graph
  - `TASK-10` remote Skill supply chain
  - `TASK-12` recovery, rollout, and end-to-end validation
  - `TASK-13` session trace explorer

This task turns project-scoped Skill and Workflow management into a first-class product loop. It should not be implemented as a whole-machine scanner or as a generic CLI configuration switcher.

## 2. Objective

Skill OS should let a user bind one real project directory, discover and apply recommended `skills-workflow` assets to that project, observe runtime evidence, and safely update or roll back the project binding later.

The user should be able to answer:

- Which projects have been bound?
- Which Skills and Workflows are installed, discovered, recommended, or active for each project?
- Is a project running the latest recommended workflow version?
- What changed between the current project binding and the latest template?
- What will be written before the app applies an update?
- Was a backup created before the update?
- Did doctor/validation pass after the update?
- Which user sessions, Skill hits, and Workflow traces prove that the project is actually using the framework?

## 3. Benchmark Takeaways From cc-switch

The following patterns are worth adapting:

| Pattern | cc-switch behavior | Skill OS adaptation |
| --- | --- | --- |
| Unified Skill inventory | Maintains installed Skills with per-app enable flags. | Maintain local Skill inventory with per-project binding state and runtime evidence. |
| Source of truth | Uses an app-managed SSOT directory and syncs to app folders. | Use an app-local Skill/Workflow source store plus explicit project projections into `.agents/skills` and `.skill-os/workflows`. |
| Discovery | Supports configured GitHub repos, `skills.sh`, ZIP, and existing imports. | Support local scan, bundled recommendations, remote candidates, ZIP/bundle import, and future registry sources. |
| Update detection | Compares SHA-256 content hashes and shows available updates. | Compare Skill file hashes, Workflow manifest versions, starter fingerprints, and project binding fingerprints. |
| Backup/restore | Creates backups before destructive Skill uninstall or restore. | Create project-scoped backup snapshots before workflow apply, upgrade, rollback, or overwrite. |
| Batch operations | Runs batch toggles serially to avoid config-write races. | Run project apply/upgrade actions serially and report item-level success/failure. |
| Search and filters | Skills panel exposes search and app-count controls. | Skill Library should expose search, tabs, source filters, status filters, sort, and project filters. |

The following parts should not be copied directly:

- cc-switch `Profile` is a configuration snapshot for provider/MCP/Skills/Prompt switching. Skill OS `Project` is a real filesystem project directory with workflow bindings, project profile, telemetry, and evidence.
- cc-switch can operate as an AI CLI configuration manager. Skill OS must stay focused on project-scoped Skill governance, workflow application, runtime trace, update safety, and visual explanation.

## 4. Product Boundary

### 4.1 In Scope

- Binding a single user-selected project directory.
- Scanning only the bound directory and explicitly authorized Skill roots.
- Maintaining a project list with status, scan time, detected Skills, workflow binding status, and runtime evidence status.
- Managing local and remote Skill candidates from a Skill Library.
- Applying Skills/Workflows to a specific project only after preview and confirmation.
- Detecting project workflow version drift.
- Generating project upgrade previews, backups, doctor reports, and rollback previews.
- Showing project-level Session Trace evidence and Skill hit details.

### 4.2 Out of Scope

- Whole-machine scan by default.
- Silent project mutation.
- Installing or executing remote Skills without activation preview.
- Treating project switching as provider switching.
- Running updates concurrently against the same project.
- Claiming precise Skill invocation when only inferred log evidence exists.

## 5. Core Concepts

### 5.1 Skill Source Store

The app maintains the source inventory of Skills and Workflow templates. Sources may include:

- bundled recommended workflow templates
- project-local Skills discovered from `.agents/skills`
- app-local imported Skills
- remote candidates imported as inactive records
- ZIP or bundle imports
- future registry or marketplace sources

The source store is not the same thing as a project application. A Skill can exist in the library without being active in any project.

### 5.2 Project Binding

A project binding is a durable record:

- project id
- display name
- project root path
- bound time
- last scan time
- current workflow binding fingerprint
- detected Skills and Workflows
- adapter readiness state
- runtime evidence state
- monitoring preference

The project list is the primary management surface. A project detail modal owns deeper inspection.

### 5.3 Project Projection

A project projection is the concrete write target inside a project:

- `.agents/skills/*`
- `.skill-os/workflows/*`
- `.skill-os/workflow-bindings.yaml`
- `.specify/workflow-version.txt`
- generated usage guide and doctor reports

Projection always requires preview, confirmation, backup, and post-apply validation.

### 5.4 Workflow Template Registry

Workflow templates are versioned product assets. A template must expose:

- template id
- version
- kind
- status
- target role or scenario
- required Skills
- compatibility range
- migration policy
- rollback policy
- manifest fingerprint

Templates should support both flowchart and mindmap visualization.

### 5.5 Update Center

Update Center is not only application auto-update. It includes three layers:

1. App update: desktop binary and packaged assets.
2. Library update: Skill sources, remote candidates, bundled templates, and workflow registry metadata.
3. Project update: bound project workflow binding, projected files, project-local Skills, and adapter readiness.

Each layer needs status, diff, backup/rollback handling, and a result report.

## 6. Required User Flows

### 6.1 Bind Project and Apply Recommended Workflow

1. User clicks `Bind Project`.
2. Native folder picker opens.
3. User selects a project root.
4. App opens a confirmation modal showing selected folder, detected repo signal, and scan scope.
5. User clicks `Scan and Bind`.
6. Modal enters loading state and writes onboarding logs.
7. Scan completes.
8. App asks for optional project display name.
9. Project list refreshes.
10. Project detail modal can show recommended `skills-workflow`.
11. User previews the recommendation.
12. App shows affected files, added Skills, updated Workflow bindings, risk, and backup plan.
13. User confirms.
14. App applies serial writes, creates backup, runs doctor, and reports result.

### 6.2 Check Project Upgrade

1. User opens a project detail modal.
2. App checks current workflow fingerprint against latest template registry.
3. If drift exists, app shows `Upgrade Available`.
4. User opens upgrade preview.
5. Preview shows add/update/preserve/delete candidates, compatibility notes, and required confirmations.
6. User confirms upgrade.
7. App backs up current project projection.
8. App applies updates serially.
9. App runs doctor and workflow validation.
10. App shows success, partial success, blocked, or failed report.

### 6.3 Skill Library Project Application

1. User opens Skill Library.
2. Tabs show local scanned Skills, remote candidates, installed/app-local Skills, and updates.
3. User searches or filters.
4. User chooses a Skill.
5. User clicks `Apply to Project`.
6. App asks for target project and scope.
7. App shows project impact preview.
8. User confirms.
9. App projects the Skill into the target project or binds it as a candidate, depending on source safety.

### 6.4 Runtime Evidence Review

1. User opens a project detail modal.
2. `Runtime Evidence` shows latest status: connected, awaiting Skill evidence, inferred evidence, precise evidence, blocked, or unknown.
3. User opens Session Trace.
4. Trace shows user turn, system route, Workflow, Skill candidates, selected Skills, tools, token usage, and validation spans.
5. Skill hits are clickable and open a read-only Skill source/detail drawer.

## 7. UI Requirements

### 7.1 Project Management

Project Management should keep the page focused:

- top action: `Bind Project`
- project table
- status chips
- scan time
- workflow status
- evidence status
- monitoring toggle
- compact icon actions with hover tooltips

Deep content should open in a modal:

- Overview
- Skills & Workflows
- Runtime Evidence
- Session Trace
- Upgrade / Doctor
- Settings

The page should not show selected-folder panels or scan-only panels after binding is complete.

### 7.2 Skill Library

Skill Library should act as the asset store, not as a project scan wizard.

Recommended tabs:

- `Local Scanned`
- `Remote Candidates`
- `Installed`
- `Updates`

Required table controls:

- search
- source filter
- role filter
- project filter
- status filter
- sort by name, calls, tokens, health score, last updated, update state

Rows should support:

- open detail
- open source
- view runs
- view update diff
- apply to project
- backup/restore when applicable

### 7.3 Workflow Library

Workflow Library should expose:

- templates
- project bindings
- latest version
- compatible projects
- upgrade availability
- flowchart preview
- mindmap preview
- binding preview modal
- doctor report

`Preview Project Binding` must open a modal or drawer with a clear selected project context. It should not silently change the current page state.

### 7.4 Update Center

Update Center can live inside Settings first, then graduate to a top-level module if needed.

It should show:

- app version
- packaged workflow template version
- local registry freshness
- projects with upgrade drift
- Skills with content-hash drift
- last backup
- last doctor result
- failed update logs

## 8. Data Model Additions

The current implementation already has useful foundations such as `managed_projects`, `skill_versions`, `skill_runs`, `remote_skill_sources`, and workflow binding records. TASK-14 should extend or normalize around these concepts:

- `skill_sources`: source identity, source type, trust state, last checked, update channel.
- `skill_source_versions`: content hash, manifest hash, remote reference, imported at.
- `project_skill_bindings`: project id, skill id, source version id, projection path, status.
- `project_workflow_versions`: project id, template id, template version, fingerprint, applied at.
- `project_update_plans`: preview id, project id, plan type, status, generated at, expires at.
- `project_update_actions`: plan id, action type, relative path, risk, requires confirmation.
- `project_update_results`: plan id, backup id, doctor result, completed at, warnings, errors.
- `project_projection_backups`: project id, backup path, manifest, created at, retention policy.

All write plans must be immutable after confirmation. A changed plan must be regenerated.

## 9. Safety Requirements

- Folder selection must use a native directory picker.
- Every write must be previewed first.
- Every project apply or upgrade must create a backup unless the user explicitly runs a dry-run only.
- Remote Skills must remain inactive until preview, import, scope selection, and activation confirmation.
- ZIP/bundle imports must reject path traversal, oversized archives, and ambiguous manifests.
- Project updates must run serially per project.
- Failed partial updates must produce a recovery report.
- Doctor must run after apply/upgrade unless the project lacks required runtime tooling; in that case the result is `validation unavailable`, not `success`.

## 10. Acceptance Criteria

### Phase 1: Product Contract

- TASK-14 exists and is linked from implementation status.
- Product spec distinguishes Skill OS project bindings from cc-switch-style config profiles.
- Product boundary explicitly rejects whole-machine scanning as a default behavior.

### Phase 2: Project Detail Modal

- Project table actions open modal detail instead of dumping detail content into the page.
- Modal shows Skills, Workflows, runtime evidence, and upgrade status.
- Modal has refresh controls and last refreshed time.

### Phase 3: Skill Library Management

- Skill Library supports local/remote/installed/update tabs.
- Tables fill available width without horizontal dead space.
- Rows can open detail and apply preview.
- Calls/tokens/health columns can sort and filter.

### Phase 4: Workflow Update Pipeline

- Workflow template registry exposes latest version and fingerprint.
- Bound projects can detect upgrade drift.
- Upgrade preview shows add/update/preserve/delete actions.
- Apply creates backup, writes serially, runs doctor, and stores result.

### Phase 5: Evidence Integration

- Project status distinguishes `connected_no_skill_runs`, `inferred_skill_runs`, and `precise_skill_runs`.
- Session Trace can jump from a project to the relevant user turns.
- Skill hit details are clickable and show evidence scoring.

### Phase 6: Update Center

- App, Skill source, Workflow template, and project binding updates are visible in one place.
- Failed updates have logs and recovery actions.
- Users can retry, roll back, or open the affected project.

## 11. Task Breakdown

1. Define project-scoped Skill source and projection vocabulary across specs.
2. Add UI contract for Project Management modal detail and Update Center.
3. Extend database schema for project Skill bindings and project update plans.
4. Add read-only project upgrade preview service.
5. Add project backup snapshot service for workflow projections.
6. Add serial project apply/upgrade executor.
7. Add doctor/result report persistence.
8. Add Skill Library tabs, filters, sorting, and update-state columns.
9. Add Workflow Library flowchart/mindmap previews with project binding modals.
10. Add runtime evidence bridge from Session Trace to project detail.
11. Add smoke checks for preview-before-write and no whole-machine scan regressions.
12. Add end-to-end controlled fixture for bind -> scan -> preview -> apply -> doctor -> update -> rollback.

## 12. Open Questions

- Should the app-local source store default to `~/.skill-os/skills` or reuse `~/.agents/skills` when the user opts into the open standard?
- Should bundled recommended workflow templates update only with app releases, or also through a signed remote manifest?
- How much raw Skill content can the app store for diff previews when raw content storage is disabled?
- Should project upgrades support automatic patch merge, or should v1 only support add/update/preserve with explicit overwrite confirmation?
- Should project monitoring be per-project always-on, or scheduled with a visible countdown and manual refresh first?

## 13. Implementation Notes

- Treat cc-switch as a benchmark for management ergonomics, not as the product authority.
- Preserve Skill OS's current local-first, preview-first, evidence-first principles.
- Do not add a generic "current project switcher" unless it is clearly separate from bound project management.
- Keep heavy inspection in modals/drawers to reduce page-level re-render cost and visual overload.
- Prefer deterministic local services before any model-generated recommendation.
