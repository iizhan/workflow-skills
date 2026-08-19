# Skill OS v1 Implementation Status

Last updated: 2026-08-14

## Scope

This status tracks the isolated Skill OS / skill-management-workbench implementation only.

In-scope paths:

- `skill-management-workbench/`
- `specs/skill-management-workbench/`

Out-of-scope:

- Existing published Skill framework behavior.
- User-installed global Skills.
- Remote database services.
- Automatic execution of imported remote Skills.

## Product Boundaries

Current implementation preserves these boundaries:

- Local-first storage: app data, telemetry imports, graph snapshots, bundles, backups, and audit events are local.
- Authorized scanning: local Skill discovery runs only inside approved roots and skips excluded paths.
- Remote safety: remote Skills are presented as preview/import/install candidates and must not auto-run before explicit activation.
- Apply safety: applying a Skill requires scope and target preview before write operations.
- Bundle safety: export copies source Skills into app-local bundle storage; import uses manifest validation, diff preview, and explicit strategy.
- Restore safety: backup restore remains preview-first and does not overwrite app state during validation.
- Project safety: project management remains single-directory first; the app must not fall back to whole-machine scanning as a default behavior.
- Project workflow safety: applying or upgrading a project workflow requires impact preview, backup, serial write execution, doctor/validation result, and a recovery report.
- Library separation: Skill Library is the asset store for local scans, imported candidates, remote candidates, installed assets, and update state; Project Management is the project binding and evidence surface.

## Implemented Areas

### Onboarding

- Multi-step first-run flow exists: welcome, scan scope, exclusions, permissions, initialize.
- Scan scope, raw content access, background monitoring, and telemetry mode are explicit choices.
- Local-only/no-scan-before-approval messaging is visible.

### Overview

- Rebranded to Skill OS.
- Overview copy has been reduced and boundary cards clarify Local, Remote, Graph, and Apply.
- Primary flow rail now presents Discover -> Analyze -> Graph -> Optimize -> Apply -> Bundle.
- First-screen hero now includes a compact local pipeline map: Market -> Discovery -> Registry -> Graph -> Analysis -> Optimize -> Apply -> Bundle, making the product flow visible without adding long explanatory text.

### Discovery

- Unified Discovery Search exists and groups local and remote results from one query.
- Local and remote discovery are separated.
- Discovery now opens with two compact entry cards so users see the local-first and remote-intake paths before the deeper search and preflight workbench.
- Local lane shows authorized folders, exclusions, scan actions, and scan result summary.
- Remote lane includes GitHub URL entry, risk-check steps, marketplace search, and sample remote cards.
- GitHub URL entry now runs a deterministic local preflight that parses the owner/repository, creates a risk and check report, stores the inactive candidate in local SQLite through `remote_skill_sources`, and shows required activation steps before any remote Skill can run.
- Remote lane reinforces that remote Skills never auto-run.

### Skill Library

- Skill cards show version, tags, status, usage, performance score, health score, and common actions.
- Actions include run, analyze, bundle, open folder, and apply.
- Skill Library now exposes a governance profile for each indexed Skill so users can distinguish memory, infrastructure, development, analysis, packaging, and governance roles at a glance.
- Priority cards and compact list rows now surface role plus one governance signal first, so users can quickly tell whether a Skill stores sensitive local data, long-lived context, or is broadly reusable.
- Selected Skill workbench now includes a dedicated governance profile layer covering stored data classes, storage policy, bundle reuse policy, recommended scope, and local boundary explanation.
- Skill Library now keeps the Development Lane as a compact secondary guide inside the list area so the first screen stays focused on priority cards, basic purpose, and simple list rows.
- Skill Intelligence panel defines the future AI-powered detail experience: summary, dependencies, execution flow, risks, optimization ideas, alternatives, and related Skills.
- Skill Intelligence now has a deterministic local analysis service. It generates summaries, dependencies, execution flow, risks, optimization suggestions, related Skills, and evidence snapshots from the local registry, health score, telemetry, proposals, bundles, model usage, and related local Skills.
- Skill Intelligence snapshots are persisted in local SQLite through `skill_analysis_snapshots` and exposed through main-process IPC, preload, renderer state, and the browser preview API.
- Skill Intelligence presentation now includes a compact evidence strip for health, seven-day runs/failure rate, latency, proposals, bundles, and related Skills, plus structured bullet lists for dependencies, execution flow, risks, optimization suggestions, and related Skills.
- Health Score now comes from a main-process local scoring service that combines registry freshness, description coverage, line count, seven-day telemetry rollups, latency/token pressure, and open or accepted optimization proposals.
- Health Score history now persists daily app-local snapshots in `skill_health_snapshots` and exposes trend direction, previous score delta, sample count, and latest measured time on Skill cards.
- Health Score now has an app-local policy control backed by `health_score_policy`, with Balanced, Reliability First, Cost Guard, Latency Guard, and Freshness Guard presets that re-score indexed Skills locally.
- Skill cards show the durable score, status, confidence, trend, and first explanation reason instead of inventing a transient score only in the renderer.
- Skill Library now exposes a product mode switch with Guided and Builder modes. Guided mode keeps the first screen focused on top Skills, simple rows, and short next-step cues; Builder mode expands governance, harness compatibility, and the development lane for Claude Code-style users.
- The first-screen Skill Library workbench now uses progressive disclosure more explicitly: top cards and the simple list stay visible in both modes, but deep governance and harness surfaces are reserved for Builder mode so the page no longer reads like a single dense documentation wall.


- The latest Builder/Guided product-mode split pass also rewired the visible workflow to match product positioning: Guided mode acts like a lighter consumer entry for GPT-style users, while Builder mode reveals the full governance and harness detail for Claude Code-style users and other builders.
- The UI self-test runner was reworked away from a temporary Vite preview port because this environment refused to bind the local server and also rejected headless Chrome with remote debugging. The runner now targets the built `file://` renderer artifact so the browser automation can eventually exercise the app without depending on a blocked dev-server port.
- Browser-driven UI verification is still pending re-run after the self-test migration. Typecheck, build, smoke, and layout checks all passed, but the automated visible-interface pass needs to be re-executed with the new artifact-driven runner before it can be marked green again.

### Marketplace

- Marketplace cards and collection rail are now backed by a main-process bundled local catalog service rather than renderer-only hardcoded sample arrays.
- Marketplace 2.0 collection rail exists: Featured, Trending, Verified, Enterprise, Recently Updated, and Most Installed.
- Marketplace-style remote Skill cards exist.
- Cards show name, description, author, source, tags, downloads, rating, health score, trust score, risk level, dependency count, last updated, verification status, and preview/analyze/import/install actions.
- Remote Activation Gate clarifies Preview -> Analyze -> Import -> Choose Scope -> Activate.
- Remote activation boundary is represented in the UI.
- Remote Market now adds a compact top entry strip that explains the staged remote workflow and the currently selected candidate before the market list and preview workbench.
- Remote GitHub source analysis is local-only in v1: it records preflight metadata and review status without fetching code, installing dependencies, or activating imported Skills.
- Marketplace catalog search is local-only in v1 and filters the bundled catalog without contacting a remote database.
- Imported Marketplace candidates now appear in a local Remote Candidate inventory inside Remote Market, so inactive remote Skills can be reviewed again without depending on the currently selected card.
- Remote Candidate inventory includes a compact candidate review surface with source, risk, verification, local no-run boundary, activation-preview action, and guarded Apply Center handoff.

### Analysis

- Runtime, cost, performance, model/tool, today, and seven-day windows are represented.
- Recent runs, top/slowest/waste leaders, and proposal-driving evidence are visible.
- Analysis, Recent Runs, and Optimization shells have improved bilingual coverage.

### Graph

- Graph workspace uses left search/history/scope, center topology, and right focus analysis.
- Search supports node name, ref id, type, and summary.
- Scope stack explains snapshot, pinned neighborhood, search focus, trace overlay, and selected node layers.
- Topology view groups nodes by type lane and keeps the map read-only.
- Focus analysis reuses loaded local graph/runtime/proposal/bundle/root context.
- Graph search, list, navigation, scope, topology, and outer focus controls have improved bilingual coverage.
- Graph focus entity-specific cards now localize their main visible labels, captions, empty states, path-trace controls, and status chips while preserving source data, IDs, and technical graph semantics.

### Optimization

- Proposal cards expose severity, status, expected benefit, type, evidence, local action timeline, and decision buttons.
- Proposal workflow supports accept, dismiss, resolve, and reopen states.
- Proposal engine messaging states that no Skill is silently rewritten.

### Apply Center

- Scope choices exist for system, workspace, project, and folder.
- Target preview highlights selected scope, target, conflict policy, and remote Skill policy.
- Target preview is now backed by a local read-only Apply Preview service that resolves the selected Skill, scope, target path, impact counts, pending writes, preview steps, and guardrail warnings before confirmation.
- Target preview includes a Will Affect estimate for projects, folders, workspaces, and pending writes from the local preview result instead of hardcoded renderer-only values.
- Batch Apply Preview and Conflict Resolution cards clarify queue-first, diff-first, no-silent-overwrite behavior.
- UI reinforces no write before confirmation.

### Bundle Center

- Bundle workflow is clarified as Inventory -> Export -> Preview -> Validate -> Strategy -> Import.
- Safety cards explain original source remains untouched, manifest-first packaging, diff before import, and required import strategy.
- Export, latest export, inventory table, import preview, validation, latest import, lifecycle, lineage, and graph jump actions exist.
- Bundle table and validation areas have improved bilingual coverage.

### Registry

- Registry now starts with a local index control summary for approved roots, exclusions, indexed Skills, and latest scan.
- Approved roots, exclusions, scan result, and indexed Skill table are visually separated.
- Empty state clarifies when no roots are approved.
- Registry table now surfaces governance role, stored-data summary, storage policy, reuse policy, and recommended scope so users can judge local sensitivity without opening each Skill individually.

### Audit

- Audit trail records governance events such as authorization changes, backups, and bundle operations.
- Empty state is bilingual and explains what will appear over time.

### Settings

- Settings are organized as Storage, SQLite, Backup, Restore, Permissions, Telemetry, Language, and Advanced.
- Theme cards document Midnight Graph, Deep Forest, Neo Purple, and Cyber Blue.
- Settings now includes a Health Score Policy console for switching local scoring presets and showing reliability, cost, latency, freshness, and maintainability weights.
- Settings reinforce local storage, no remote DB, preview-first restore, global language mode, and policy boundaries.

## Design System Status

- `skill-management-workbench/DESIGN.md` documents Skill OS Design System 2.0.
- Default direction is Midnight Graph + Neural Glow.
- Entity colors and state colors are documented and partially applied.
- UI direction avoids generic admin, CRM, and ERP patterns.
- Current visual work focuses on product boundaries, dark developer-tool surfaces, and graph-native information structure.
- Product language has shifted from Local Skills / Remote Market to Skill Library / Marketplace.
- Unified Discovery, Skill Health Score, Skill Intelligence, Marketplace 2.0, and Scope Application Engine are now represented in the product shell.
- A final Midnight Graph consolidation layer keeps the hero, cards, graph surfaces, focus panels, and older workbench components visually aligned even while legacy CSS remains earlier in the stylesheet.
- Sidebar navigation now uses explicit active-section state instead of first-item styling, separates hover from selected state, scrolls independently inside the desktop shell, and automatically brings the active module into view for lower items such as Bundles, Registry, Audit, and Settings.

## Bilingual Coverage Status

Improved:

- Overview, onboarding, discovery, local skills, remote market, analysis, recent runs, optimization, graph search/list/navigation/scope/topology, graph focus entity cards and controls, bundle center, registry, backup/restore, audit, and settings shells.

Remaining:

- Some backend-generated summaries, audit summaries, proposal titles, proposal evidence, and validation issue messages remain source-language content.
- Some technical metadata keys intentionally remain unlocalized to preserve graph/data semantics.

## Verification

### Frontend Layout QA Workflow

Any change to renderer pages, navigation, CSS, bilingual copy density, or visible product controls must follow this Skill OS frontend workflow:

1. Problem collection: record the user-visible layout or interaction issue, including screenshots when available.
2. Static guards: run `npm run smoke` and `npm run layout:check` to catch known regressions such as inert buttons, module routing gaps, topbar overlay, Overview feature-directory regressions, old full-flow rails, and single-module display failures.
3. Build guards: run `npm run typecheck` and `npm run build` after code changes.
4. Automated UI self-test: run `npm run self-test:ui` so Skill OS checks the focused Overview next step, clicks its primary/secondary guidance actions, and then clicks through navigation, language switching, Discovery, Marketplace, Skill Library, Analysis, Graph, Optimization, Apply Center, Bundles, Registry, Audit, and Settings through the visible interface.
5. Visual layout QA: launch `npm run preview` and inspect the changed screens at desktop width, especially Overview first screen, top trust bar, sidebar selection, recommended next-step card, Graph, Bundles, Settings, and any module touched by the change.
6. Repair loop: if any visible overlap, clipped panel, vertical bilingual text, hidden CTA, stale selected nav, missing feedback, failed click, or error banner is found, fix it before calling the work complete.
7. Record: write the issue, repair, verification commands, self-test report path, and remaining risk back into this status file.

For frontend page adjustments, `npm run smoke && npm run layout:check && npm run self-test:ui && npm run typecheck && npm run build` is the minimum automated verification set; visual preview remains required because layout quality cannot be fully proven by static checks.

Recent verification used:

```bash
cd skill-management-workbench
npm run smoke
npm run layout:check
npm run self-test:ui
npm run typecheck
npm run build
```

Both commands passed after the latest UI code changes before this document was added.
Both commands have continued to pass after subsequent UI updates for Unified Discovery, Marketplace 2.0, Skill Health Score, Skill Intelligence, and Apply impact preview.
Both commands also passed after the latest Overview pipeline, Graph Focus bilingual coverage, and Midnight Graph consolidation updates.
Both commands also passed after fixing the sidebar active navigation state, hover styling, and scroll-into-view behavior.
Both commands also passed after adding the local Skill Intelligence analysis snapshot service, IPC/preload/API coverage, renderer generation flow, preview API support, and error-state styling.
Both commands also passed after adding local Health Score snapshot persistence, trend deltas, Skill card trend UI, and preview API coverage.
Both commands also passed after converting Skill Intelligence output from dense joined text into an evidence strip and structured bullet cards.
Both commands also passed after adding the Remote GitHub source local preflight service, `remote_skill_sources` persistence, IPC/preload/API coverage, and Discovery result panel.
Both commands also passed after adding local Health Score policy persistence, scoring-policy IPC/preload/API coverage, Settings controls, and preset-weight UI.
Both commands also passed after adding the local read-only Apply Preview service, IPC/preload/preview API coverage, and service-backed Apply Center impact UI.
Both commands also passed after adding the bundled local Marketplace catalog service, IPC/preload/preview API coverage, and service-backed Marketplace cards/collection rail.
`npm run smoke` now performs a zero-dependency source guard for product navigation anchors, active-sidebar accessibility/styling, and Health Score policy SQLite/IPC/preload/preview/UI plumbing.
`npm run smoke` also guards Apply Preview IPC/preload/preview/UI plumbing.
`npm run smoke` also guards Marketplace catalog IPC/preload/preview/UI plumbing.
Both commands also passed after adding the Development Lane, Superpowers-first development guidance, and the Harness Compatibility matrix inside Skill Library.

Latest local preview self-check:

- `npm run preview` launched the Electron app successfully.
- Window title renders as `Skill OS`.
- The Electron process still preserves the userData-compatible app identity, so existing local storage paths are not migrated unexpectedly.
- The first-screen visual balance improved after adding the local pipeline map.
- The top trust bar remains visible without overflow in bilingual mode.
- Sidebar navigation selection changes correctly, and lower navigation items can scroll into view when selected.
- Skill cards render Health Score trend state, previous-score delta, sample count, and measurement time without breaking the Midnight Graph card layout.
- Skill Intelligence renders local evidence metrics and bullet-list analysis sections instead of long joined text blocks.
- Remote Discovery GitHub preflight renders inactive candidate status, risk level, local checks, import preview, and manual activation steps without enabling remote execution.
- Apply Center renders service-backed read-only preview data for selected Skill, project scope, target path, impact counts, pending writes, preview steps, and guardrails.
- Marketplace renders bundled local catalog collections and Skill cards through the service-backed catalog API.
- The QA loop for this pass followed `problem collection -> test -> repair -> record`: user-reported visual overflow and inert Marketplace buttons were reproduced in Electron preview, fixed in isolated renderer/CSS code, guarded by smoke checks, and recorded here.
- Skill Health cards now use a dedicated score/status/reason/trend layout so bilingual status text does not collapse into vertical per-character wrapping.
- Marketplace now has a page-level local search console, selected-candidate preview, selected card glow, and action buttons that update preview context without importing, installing, or executing remote Skills.
- Marketplace search was manually verified in Electron preview by filtering to `verified`, reducing the bundled local catalog from 3 visible results to 1 matching candidate.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` again: source scanning found the topbar Settings button and Apply Center primary CTA were visually actionable but had no click behavior, so both are now wired to visible outcomes and guarded by smoke checks.
- The topbar Settings CTA now navigates to `#settings` through the same active-sidebar state path as the left navigation, avoiding a dead control in the product chrome.
- Apply Center's primary CTA now opens a local read-only flow feedback card that explains the staged Skill, selected scope, preview state, and no-write-before-confirmation boundary.
- This pass added Skill governance product coverage for role, stored local data classes, storage policy, reuse policy, and recommended scope across shared types, registry derivation, preview fixtures, Skill Library, Registry, and product/spec docs.
- The first self-test run of this governance pass exposed a real regression: the new governance panel pushed the Skill Library next-step stage below the first viewport. The UI was repaired by moving the governance panel behind the staged next-step area so progressive guidance stays first-screen visible.

Latest verification for the governance-profile pass:

```bash
cd skill-management-workbench
npm run typecheck
npm run smoke
npm run layout:check
npm run self-test:ui
npm run build
```

Latest verification for the Overview / Analysis / Graph first-screen refinement pass:

```bash
cd skill-management-workbench
npm run typecheck
npm run smoke
npm run layout:check
npm run self-test:ui
npm run build
```

Results:

- `npm run typecheck` passed.
- `npm run smoke` passed after syncing the Overview lane-first copy guard to the new shorter phrasing.
- `npm run layout:check` passed.
- `npm run self-test:ui` passed with `191` checks.
- Latest self-test report: `skill-management-workbench/tmp/self-test/self-test-report.json`
- Latest visual QA screenshots:
  - `skill-management-workbench/tmp/self-test/overview-initial.png`
  - `skill-management-workbench/tmp/self-test/module-analysis.png`
  - `skill-management-workbench/tmp/self-test/module-graph.png`

This pass focused on reducing first-screen cognitive load without removing product boundaries:

- Overview now keeps the first screen centered on one recommended next step, one compact current-state summary, one dual-core workflow strip, and a shorter right-side lane picker instead of repeating the same Framework / Workbench explanation in multiple cards.
- Analysis now opens with a progressive entry band: what to read first, the current pressure summary, and where to go deeper, so the first screen reads like product guidance instead of a stacked report wall.
- Graph now explains source, usage flow, and current scope before the topology canvas, so users can understand where the map comes from before interacting with the larger visual layer.
- Follow-up visual QA tightened the dense analysis detail cards so their headlines and descriptions stack more cleanly instead of squeezing into a single line.
- A later density pass reduced the Overview minimum hero height, tightened the workflow strip text, and added a layout guard so analysis detail cards keep stacked headline/copy layout in future changes.

Visual QA notes:

- Overview is now denser and clearer, but still preserves the dual-core boundary and local-first trust signal.
- Analysis first-screen hierarchy is improved: the summary and next-step guidance land before telemetry and daily detail.
- Graph now frames the topology with local-source context and search/select/trace guidance before the large canvas.
- The remaining risk after this pass is mostly copy density, not missing functionality: the Graph page still carries a lot of explanatory text near the topology, but it is no longer visually broken in the checked desktop screenshots.
- In-app Browser live navigation to the local preview remained unreliable during this pass because the browser surface stayed on a blocked `ERR_CONNECTION_REFUSED` / policy-controlled page. Visual verification therefore relied on the automated UI self-test screenshots above, which reflect the latest renderer build.

Results:

Latest verification for the overview-alignment pass:

```bash
cd skill-management-workbench
npm run smoke
npm run layout:check
npm run self-test:ui
npm run typecheck
npm run build
```

Results:

- `npm run smoke` passed after removing stale Overview guards that still expected the deleted graph-card/state-list first-screen structure.
- `npm run layout:check` passed with the current dual-core Overview layout.
- `npm run self-test:ui` passed with 191 checks.
- The latest self-test pass also validated the Discovery scan flow, Remote Market staged activation, and the compact Skill Library development lane after the entry-strip refinements.
- Self-test report: `skill-management-workbench/tmp/self-test/self-test-report.json`
- `npm run typecheck` passed.
- `npm run build` passed.

Latest UI repair recorded:

- Repaired the Overview first screen so it now uses the current dual-core entry model consistently instead of carrying an old three-area right rail for deleted graph/state cards.
- Synced smoke, layout, and UI self-test guards to the current product structure:
  - primary CTA is now `Open Framework`
  - secondary CTA is now `Open Workbench`
  - Overview first-screen checks now validate workflow, report, boundary cards, and compact focus summary instead of removed graph-entry cards
- Confirmed the current Overview supports the approved positioning:
  - Framework produces Skills first
  - Workbench governs and analyzes second

- `npm run typecheck` passed.
- `npm run smoke` passed.
- `npm run layout:check` passed.
- `npm run self-test:ui` passed with 189 checks and zero issues after the Skill Library first-screen repair.
- `npm run build` passed.
- Skill Library card metrics were visually checked in Electron preview; the Health Score band was readable, but the old three-column metric row squeezed `Performance` and `Version` together. The row now uses a two-column layout with the Version metric spanning the full width and a shorter `Success / 成功率` label.
- `npm run smoke && npm run typecheck && npm run build` passed after adding the no-inert-button guard, Apply CTA feedback, Settings navigation, and Skill Library metric anti-collision layout.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user reported global layout disorder: source/CSS inspection found old `1280px` responsive rules and cascade order could collapse the 1440px Electron desktop shell into compressed module strips, especially around Discovery, Skill Library, Marketplace, Graph, Bundles, and Apply Center.
- The repair keeps desktop as a true app shell: page scrolling is disabled, `.product-workspace` owns vertical scroll, the sidebar remains a fixed desktop rail, desktop grids are reasserted in a final `Skill OS desktop QA stabilization layer`, panels no longer crop module contents on desktop, and old `1280px` collapse breakpoints were tightened to the smaller app/mobile breakpoint.
- `npm run smoke` now guards the desktop layout assumptions: no `@media (max-width: 1280px)` collapse rule, the final desktop QA layer must sit after the Skill OS 2.0 consolidation layer, product shell must remain two-column on desktop, and module panels must keep full content height instead of clipping into strips.
- `npm run smoke && npm run typecheck && npm run build` passed after the desktop stabilization changes.
- `npm run preview` was restarted after the build, and real Electron visual QA checked Overview, Graph, Bundle Export, and Apply Center. The left nav selected state follows clicks, deep modules render expanded instead of collapsed, Graph/Bundles/Apply Center are visually navigable, and the top trust bar/sidebar remain stable in the desktop shell.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` for Overview clarity: the first screen still repeated process information through an 8-step pipeline plus a second flow rail, which made the product boundary and next action less clear.
- Overview now presents four primary product entry cards instead of the dense pipeline: Local Discovery, Remote Market, Graph Studio, and Apply Safely. Each card is a real `href` link, includes a visible `Open / 打开` action label, and routes through the same active-section navigation path as the sidebar.
- Smoke checks now guard the Overview entry grid, real-link semantics, robust pointer navigation, module navigation wiring, and entry-card/action-label styling so the first screen does not regress into static decorative cards.
- `npm run smoke && npm run typecheck && npm run build` passed after the Overview entry-card update.
- `npm run preview` was restarted after the Overview update. Electron visual QA confirmed the first screen is less text-heavy, the four product entry points are visible, the local-first status and metrics remain stable, and the entry cards now show explicit `Open / 打开` affordances.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` for Marketplace action clarity: the card actions `Preview / Analyze / Import / Install` previously changed the selected candidate, but did not give a clear post-click decision-state explanation, so users could mistake safe previews for completed remote operations.
- Marketplace actions now route through a single `handleMarketplaceAction` path that updates the candidate preview and renders an explicit action feedback strip with `Action`, `Boundary`, and `Next Step`. The copy states that remote Skills never auto-run from this surface and that import/install are staged local decisions rather than executed operations.
- Smoke checks now guard Marketplace action feedback state, handler wiring, safety-boundary copy, feedback panel markup, and styling so remote-market actions do not regress into silent state changes.
- Follow-up QA loop again followed `problem collection -> test -> repair -> record` for the new development-first Skill Library work. Automated checks passed immediately, but manual screenshot review still caught a real product issue: the first-screen Skill Library desktop layout was too evenly split, so the Development Lane headline and the selected Skill workbench header competed for the same horizontal space and looked cramped at 1440px.
- The repair stayed isolated to renderer CSS: the Skill Library workspace now gives the selected Skill workbench more width, compact module headlines in the development/governance/harness panels now stack title and description vertically instead of squeezing them onto one crowded line, and the selected Skill score block drops below the header copy when needed in single-module desktop mode.
- The Development Lane now clearly frames the Superpowers-first developer path as `Plan -> Implement -> Test -> Review -> Finish`, while the Harness Compatibility matrix keeps `Superpowers`, `Codex Native`, `Claude Skill Folder`, and `Cursor Rules` visible without collapsing the detail panel.

Latest verification for the development-lane + layout-repair pass:

```bash
cd skill-management-workbench
npm run typecheck
npm run smoke
npm run layout:check
npm run self-test:ui
npm run build
```

Results:

- `npm run typecheck` passed.
- `npm run smoke` passed.
- `npm run layout:check` passed.
- `npm run self-test:ui` passed with 193 checks and zero issues.
- `npm run build` passed.
- Manual screenshot review of `tmp/self-test/module-local-skills.png`, `tmp/self-test/module-overview.png`, `tmp/self-test/reported-remote-analysis-obra-superpowers.png`, and `tmp/self-test/module-graph.png` confirmed no new layout disorder, no vertical text fragments, and a more stable desktop Skill Library first screen after the width and header-flow repair.
- `npm run smoke && npm run typecheck && npm run build` passed after the Marketplace action-feedback update.
- `npm run preview` was restarted after the Marketplace update. Electron visual QA confirmed the app shell still loads and the Overview remains stable; Computer Use coordinate clicks into Electron WebView content were not reliable enough for a definitive runtime click assertion, so the current guardrail is source-level semantics plus smoke coverage until a dedicated Electron/browser automation runner is added.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` for Optimization decision clarity: source review found `Accept / Dismiss / Mark Resolved / Reopen` updated proposal status but did not give a page-level confirmation explaining what happened, whether any Skill was rewritten, or what the safe next step should be.
- Proposal status changes now render a `Decision / Boundary / Next Step` feedback strip after the local update succeeds. The copy distinguishes accepted, dismissed, resolved, and reopened decisions, and explicitly states that Optimization decisions are local audit events rather than silent Skill rewrites.
- `npm run smoke` now guards Optimization decision feedback state, setter wiring, feedback panel markup, safety-boundary copy, local-audit copy, and styling so proposal controls do not regress into silent state changes.
- `npm run smoke && npm run typecheck && npm run build` passed after the Optimization decision-feedback update, and `npm run smoke` was rerun after updating the smoke output copy.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` for Bundle Center action clarity: source review found export, validation, and import already produced detailed result panels, but the action buttons did not provide an immediate page-level explanation of what just happened, what stayed untouched, or what the safe next step should be.
- Bundle export, validation, blocked import, and completed import now share a `Action / Boundary / Next Step` feedback strip. The copy clarifies that export leaves the original Skill folder unchanged, validation is read-only, blocked imports copy nothing, completed imports copy into app-local storage, and Bundle operations never connect to a remote database.
- The Bundle feedback strip is rendered near both Bundle Export and Bundle Import surfaces so users do not have to scroll back to another module after validating or importing a manifest.
- `npm run smoke` now guards Bundle feedback state, setter wiring, feedback panel markup, export source-safety copy, validation read-only copy, local-first boundary copy, and styling.
- `npm run smoke && npm run typecheck && npm run build` passed after the Bundle action-feedback update.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` for Apply Center scope clarity: source review found the System / Workspace / Project / Folder cards changed selected state and refreshed the preview, but did not give an immediate explanation of what the selected scope means, whether anything was written, or what the user should inspect next.
- Apply Center scope cards now route through `chooseApplyScope`, which updates the selected scope and renders a `Scope / Boundary / Next Step` feedback strip. The copy explains each scope boundary, states that changing scope only refreshes a local preview, and repeats that no write happens before explicit confirmation.
- `npm run smoke` now guards Apply scope feedback state, handler wiring, no-write boundary copy, explicit-confirmation copy, and styling so scope cards do not regress into silent selected-state-only controls.
- `npm run smoke && npm run typecheck && npm run build` passed after the Apply Center scope-feedback update.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` for Graph Studio control clarity: source review found graph refresh, local search, search-focus filtering, navigation history, pinned neighborhoods, trace focus, and scope reset already changed local UI state, but did not share one consistent page-level explanation of what changed, what stayed local, or how to reverse the temporary layer.
- Graph Studio now renders an `Action / Scope / Next Step` feedback strip for graph refresh, node focus, external graph-node jumps, local search query changes, search focus apply/clear, history jumps, history clear, pinned-neighborhood apply/clear, trace focus apply/clear, selection clear, and return-to-snapshot actions.
- The Graph feedback copy states that controls only change the local visible scope, do not rescan roots, do not mutate stored graph data, and that every temporary layer is reversible from the scope stack.
- `npm run smoke` now guards Graph action feedback state, helper wiring, search/scope/trace handlers, feedback panel markup, local visible-scope boundary copy, reversible-layer copy, and styling.
- `npm run smoke && npm run typecheck && npm run build` passed after the Graph Studio action-feedback update.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after screenshot review found several desktop layout failures: the top trust bar could visually stack over content, Graph's three-column layout clipped the focus panel at 1440px, leaderboard metric text could collapse into vertical bilingual fragments such as `runs / 运行`, Graph scope pills could overlap their copy, and the topology SVG still used pale lane/node colors from the old light-theme era.
- A final screenshot-driven layout repair layer now keeps the top trust bar in an adaptive grid, makes Graph use a safe controls/canvas plus full-width focus layout before ultra-wide breakpoints, prevents leaderboard metrics from collapsing into vertical text, makes scope-stack cards single-column in constrained panels, and reinforces dark Midnight Graph topology surfaces.
- Graph topology source tones now use Skill OS entity colors for root, skill, version, model, proposal, bundle, and bundle lineage nodes instead of the earlier light pastel fills.
- Follow-up navigation QA found that URL/hash navigation could become disconnected from the desktop `.product-workspace` scroll container. Product navigation now uses a shared `scrollProductWorkspaceToSection` helper, updates history with `pushState`, handles `hashchange` and `popstate`, and captures sidebar activation through pointer, mouse, and click events so Electron anchor quirks do not leave the UI on the wrong module.
- `npm run smoke` now guards the screenshot-driven layout repair layer, adaptive topbar tiles, Graph safe layout, leaderboard anti-vertical metric styling, Graph scope anti-overlap styling, dark topology lanes, entity-colored nodes, shared workspace scroll helper, history/hash synchronization, and pointer/mouse sidebar activation fallbacks.
- `npm run smoke && npm run typecheck && npm run build` passed after the layout repair and workspace-navigation stabilization updates.

## Known Gaps

- Remote GitHub preflight is local-only and deterministic; it does not fetch repository contents or validate real manifests yet.
- Remote Market now uses a bundled local catalog service and local search, not a live marketplace integration.
- Apply Center has a service-backed read-only preview, not a full write/apply engine.
- Health Score is implemented as a deterministic local service with daily local snapshot persistence, card-level trend deltas, and preset-based local scoring policy controls. Fine-grained custom sliders are not implemented yet.
- Skill Intelligence is implemented as deterministic local analysis and persistence. Remote/model-backed AI analysis is intentionally not implemented yet.
- Drag-and-drop visual Skill orchestration is not implemented yet.
- Performance/token monitoring depends on imported local telemetry logs rather than live runtime interception.
- Full 56-screen Figma-level coverage is not complete; current work prioritizes the MVP and product shell.
- Real click-level regression coverage still needs a dedicated Electron/browser automation runner. Current guards combine source-level smoke checks, TypeScript/build verification, and manual preview screenshots.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user reported that the product still felt like a single page listing every feature. Source inspection confirmed the workspace was still long-scroll oriented even though modules had navigation labels, which made users see too many unrelated functions at once.
- The product shell now runs in `single-module-mode`: the workspace exposes `data-active-section`, every top-level module is grouped with `data-product-section`, and CSS hides inactive modules so left navigation opens one clear task space instead of a long feature inventory.
- Overview now acts as a guided entry page rather than a catch-all dashboard: it keeps compact product boundaries and a styled guided flow rail whose steps route users through Discovery, Analysis, Graph, Optimization, Apply Center, and Bundles.
- Cross-module graph inspection now routes to Graph Studio before focusing a node, so graph-related buttons remain meaningful when other modules are hidden in the single-module product flow.
- `npm run smoke`, `npm run typecheck`, and `npm run build` passed after the product-flow refactor. Smoke now guards module grouping, active-section CSS routing, the guided flow CTA, inactive-module hiding, and graph cross-module navigation.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user requested that layout checks become part of the Skill workflow and provided a screenshot showing topbar overlay plus guided-flow CTA overlap.
- A new `npm run layout:check` command now runs `scripts/layout-check.mjs` to guard known layout regressions: topbar must stay in document flow in single-module mode, guided flow steps must have their own command-bar row, the primary CTA must be isolated from step buttons, trust tiles must stay compact at desktop width, and the frontend layout QA workflow must be documented.
- The CSS now includes a final `Skill OS visual QA workflow guardrail layer` that keeps the single-module topbar relative instead of sticky-overlay, constrains desktop trust tiles/actions, and lays out the Overview command bar as `copy/action` plus a full-width `flow` row so CTA buttons do not cover steps.
- `npm run smoke && npm run layout:check && npm run typecheck && npm run build` passed after adding the layout workflow guard.
- `npm run preview` was restarted and a desktop screenshot was captured to `skill-management-workbench/tmp/skill-os-layout-check.png`; visual QA confirmed the topbar no longer overlays the hero and the Overview entry cards are not covered. The Operating Chain sits lower in the page on the current window height, but no longer has the primary CTA covering the Bundle step.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user requested an automated self-test process that clicks every function, records issues, repairs failures, and only reports completion after all functions are verified.
- Added `npm run self-test:ui`, backed by `scripts/self-test-ui.mjs`. The script starts a local renderer preview, opens headless Chrome through the debugging protocol, clicks visible UI controls, captures screenshots, writes `tmp/self-test/self-test-report.json`, and fails when any checked flow produces an issue.
- First automated run found three issues in the self-test flow: React input state was not being updated for remote repository analysis, the proposal decision click selector was too broad, and the Apply Center start-flow selector pointed at a removed card class. These were repaired in the self-test workflow so it now uses React-compatible input events, stable proposal action selection, explicit wait conditions, and the current Apply Center header CTA.
- `npm run self-test:ui` passed with 82 checks covering all left navigation modules, Overview entry cards, language switching, Discovery scan, Remote source analysis, Marketplace actions, Skill Library actions, Telemetry import, Graph refresh/search, Optimization decision feedback, Apply scope/flow feedback, Bundle export/validation, Settings policy switching, Registry, and Audit.
- Latest self-test report: `skill-management-workbench/tmp/self-test/self-test-report.json`.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user reported that Overview had regressed into a screen that still felt like every function was displayed at once.
- Overview now uses one focused `Recommended Next Step` card with `Continue to Discovery` and `Review Local Settings` actions, plus a compact local-first/status side rail. The old entry-card grid, old dense pipeline, and old guided-flow rail were removed from renderer styling and are now guarded against in static checks.
- `npm run layout:check` now guards the focused Overview next-step structure, compact status list, topbar flow, and absence of the old feature-directory / full operating-chain first-screen patterns.
- `npm run self-test:ui` now verifies the Overview first screen is not a full module directory, then clicks the Overview primary and secondary guidance actions before continuing through the rest of the product flows.
- Verification passed after this Overview repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`.
- Latest automated UI self-test passed with 84 checks and zero issues. The visual QA screenshot at `skill-management-workbench/tmp/self-test/overview-initial.png` confirms the first screen now shows one recommended next step instead of a full feature directory.
- Scheduled self-test loop run at `2026-06-06T06:43:05.328Z` passed with 84 checks and zero issues. The loop ran `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`; screenshots were refreshed in `skill-management-workbench/tmp/self-test/`.
- Manual screenshot review of `tmp/self-test/overview-initial.png` confirmed the visible first screen remains a guided product step, not a full function inventory. No repair was required in this loop because all covered checks passed.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user noted that the Overview had become too sparse: it lacked report/analysis visibility, the Analysis icon was unclear, and sidebar content did not fit the visible desktop window.
- Overview now balances product guidance with a compact report surface: the first screen keeps `Recommended Next Step`, adds `Today Report` with runs, tokens, cost, latency, success donut, token split bars, and a direct `Open Reports` action to Analysis. This restores dashboard value without turning the first screen into a full feature list.
- The Analysis navigation icon changed to a chart-like mark, and the desktop sidebar spacing/storage card were compressed so more navigation items remain visible before scrolling.
- `npm run smoke`, `npm run layout:check`, and `npm run self-test:ui` now guard the compact Overview report, Analysis chart icon, guided next step, and absence of the old feature-directory / full-flow first-screen patterns.
- Visual QA found the first report pass was directionally correct but too cramped: four metric cells clipped values such as token and cost, and the next-step title wrapped awkwardly.
- The report metrics now use a readable 2x2 card grid, the Overview content/report columns were rebalanced, and metric values can wrap instead of truncating. Latest screenshot review of `tmp/self-test/overview-initial.png` confirmed the report is visible and readable while the page still avoids a full feature directory.
- Verification passed after the report readability repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with 84 checks and zero issues at `2026-06-06T10:07:54.900Z`.
- Continued QA loop upgraded the automated visible-interface workflow: `npm run self-test:ui` now captures a screenshot after every top-level module navigation and checks the product shell, sidebar, topbar, workspace, and active module for horizontal viewport overflow.
- The upgraded self-test passed with 96 checks and zero issues at `2026-06-06T15:02:17.798Z`, producing `module-overview.png`, `module-discovery.png`, `module-local-skills.png`, `module-remote-market.png`, `module-analysis.png`, `module-graph.png`, `module-proposals.png`, `module-apply-center.png`, `module-bundles.png`, `module-registry.png`, `module-audit.png`, `module-settings.png`, and `final-state.png`.
- Manual screenshot review sampled Analysis, Graph, Bundle Center, and Apply Center. No horizontal disorder was found; deeper content remains scrollable inside the workspace. `npm run smoke` now guards the per-module screenshot and overflow-check hooks so the self-test workflow cannot silently regress.
- Verification passed after the self-test workflow upgrade: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`.
- Continued QA loop added deep-module scroll coverage: `npm run self-test:ui` now scrolls each active module to its bottom, checks horizontal viewport containment again, captures `module-*-bottom.png`, and then returns to the module top before continuing.
- The deep-scroll self-test passed with 108 checks and zero issues at `2026-06-06T15:18:45.292Z`, generating bottom screenshots for all 12 top-level modules.
- Manual bottom screenshot review found a real readability issue in Apply Center: the right-side `Will Affect` impact cards were forced back to a 4-column desktop grid by a late CSS override, causing `Writes / 写入` to wrap into narrow fragments even though no horizontal overflow occurred.
- The Apply impact grid now stays in a readable 2x2 layout on desktop, and `npm run smoke` guards that final cascade rule. Follow-up `module-apply-center-bottom.png` review confirmed `Projects`, `Folders`, `Workspaces`, and `Writes` are readable in the right panel.
- Verification passed after the Apply impact readability repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with 108 checks and zero issues at `2026-06-06T15:24:15.931Z`.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user clarified that Skill Library should be progressive instead of exposing every function at once: show the top few Skills first, then a simple Skill list with purpose/basic status, then let the selected Skill open deeper analysis, tuning, optimization, and packaging actions step by step.
- Skill Library now uses a product-led two-column flow at desktop width: the left rail contains `Priority Skills` and the basic `Skills List`, while the right panel is a sticky `Selected Skill Workbench` with health summary, signal state, and staged controls for Summary, Analyze, Optimize, Tune Scope, and Package.
- Deep AI analysis is no longer shown by default in Skill Library. It is gated behind the Analyze stage and generated only after the user chooses to go deeper, while the default Summary stage keeps one recommended next step and two clear actions.
- Visual QA found the first staged pass still pushed the recommended next-step panel below the 1440px first screen. The layout was repaired by flattening Skill Library into left priority/list and right detail columns, compacting the top priority cards into queue-style rows, and keeping the selected Skill next-step panel fully visible on first screen.
- `npm run self-test:ui` now guards the Skill Library progressive workflow: priority cards visible, simple list visible, summary stage active by default, deep analysis hidden by default, selected Skill returns to Summary, next-step panel visible on the first screen, Analyze reveals evidence, and Tune Scope routes to Apply Center.
- `npm run smoke` now guards the staged Skill Library state, staged workbench tabs, progressive summary copy, analysis-only deep layer, two-column desktop layout, workspace flattening, and staged detail styling.
- Verification passed after the Skill Library progressive IA and layout repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with 120 checks and zero issues at `2026-06-06T16:00:13.286Z`; screenshot review of `skill-management-workbench/tmp/self-test/module-local-skills.png` confirmed the visible flow is now top-priority queue -> basic list -> selected Skill staged workbench, not a full function dump.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after Marketplace visual review found the page still behaved like a remote-function inventory: collections, activation gate, search, activation preview, risk report, candidate preview, and cards were all stacked in one long module.
- Marketplace now uses the same progressive product pattern as Skill Library: the left rail contains collection counts, local catalog search, and candidate cards, while the right rail is a sticky `Selected Remote Skill` workbench with staged tabs for Preview, Security, Import, and Activate.
- Remote Skills remain explicitly inert in the UI. The Preview stage explains that installed does not mean active; Security exposes trust/risk/dependency review; Import explains app-local inactive candidate copying; Activate explains manual scope/target preview before activation, with no execution from the Marketplace surface.
- Candidate cards were simplified from four exposed action buttons to one primary `Select / Preview` action. Deeper actions now live in the selected-candidate stage workbench so the user can move from simple browsing to security review, import, and activation one step at a time.
- Automated UI self-test now guards the Marketplace progressive activation workflow: progressive flow visible, candidate list visible, selected workbench visible, Preview active by default, stage panel visible on first screen, action feedback visible, Security/Import/Activate stages clickable, and the final candidate action has bottom breathing room.
- Visual QA initially caught a bottom-readability issue where the last Marketplace candidate action could sit against the viewport edge. A first test assertion failed because it used browser body scrolling instead of Skill OS's internal `.product-workspace` scroll container; the self-test was corrected to scroll the real workspace and the layout was given stable bottom space.
- Verification passed after the Marketplace progressive IA and layout repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with 129 checks and zero issues at `2026-06-06T16:34:32.959Z`; screenshot review of `skill-management-workbench/tmp/self-test/module-remote-market.png` and `module-remote-market-bottom.png` confirmed the visible flow is now discover candidates -> selected remote Skill stage workbench, not a full remote-function dump.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` for Apply Center and post-test visual readability. Source review found the Apply Center UI had moved to a staged flow, but the automated UI self-test still expected the older one-click scope feedback path.
- Apply Center self-test coverage now clicks the product flow as a user would: open Apply Center, verify the Scope stage, choose Workspace scope, verify Preview impact/read-only copy, click Review Guardrails, verify guardrail feedback, continue to Confirm, and verify the final read-only confirmation gate.
- `npm run smoke` now guards the staged Apply Center workbench state, tabs, stage panel, scope guidance, Preview -> Guardrails action, Guardrails -> Confirm action, staged CSS, and the progressive UI self-test hook.
- Screenshot review after the test pass caught one remaining readability issue in Skill Library: the simple list could visually glue a two-word Skill name to a status pill in bilingual mode, e.g. `Memory GovernanceNeeds Attention`, even though no horizontal overflow was detected.
- The Skill Library simple list now separates name/purpose from status pills in a single-column card rhythm, allows Skill names and pill text to wrap safely, and keeps basic status visible without squeezing the title. Apply Center's right workbench heading copy was also tightened to reduce right-rail density.
- Verification passed after the Apply Center staged self-test update and Skill Library readability repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with 139 checks, zero issues, and 26 screenshots at `2026-06-07T01:00:35.241Z`. Manual screenshot review confirmed Overview is still a guided report entry, Marketplace remains a selected-candidate staged workbench, Apply Center is a scope-to-confirm guided flow, and Skill Library no longer has the `Memory Governance` status-label collision.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after manual screenshot review found that Overview still needed clearer workflow boundaries and Graph Studio showed the topology well but did not expose an obvious first-step interaction path on the visible screen.
- Overview workflow now uses a compact guided operating path instead of a dense arrow sentence. Each step shows one short purpose, and a handoff summary clarifies that detailed tuning, proposals, Bundle validation, and Apply confirmation live inside focused workspaces rather than on the Overview.
- Graph Studio now exposes a first-screen `Search -> Select -> Trace` starter flow before the topology workspace, while the empty Focus Analysis state uses a dedicated primer card explaining that the map comes from authorized roots, indexed Skills, local telemetry, proposals, bundles, model references, and app-local SQLite data.
- `npm run smoke` and `npm run layout:check` now guard the Overview workflow intro, workflow handoff, Graph Studio starter flow, and visible Focus primer card. `npm run self-test:ui` now verifies the Graph starter flow and Focus primer through the rendered interface.
- Verification passed after the Overview/Graph guided-flow repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with 145 checks, zero issues, and refreshed screenshots at `skill-management-workbench/tmp/self-test/`; manual review of `module-overview.png` and `module-graph.png` confirmed the first screen remains route-and-summary oriented and Graph Studio is no longer an empty-focus experience.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user pointed out that the Overview layout was still not right. Screenshot review confirmed the issue: the previous two-column composition left an empty left-bottom area while the right rail stayed crowded, and the first command-center attempt pushed Graph/Focus content partly below the visible screen.
- Overview now has an explicit `overview-main` command-center wrapper and a final CSS layout repair layer. Desktop Overview uses a single-column product shell: primary action + Today Report at the top, a compact guided workflow in the middle, and a balanced bottom command rail with Graph Studio, Local First, three status cards, and Today Focus.
- The bottom command rail now uses a three-column/two-row grid instead of a cramped four-column strip. Graph Studio and Today Focus act as the two larger anchors, while Local First and status cards sit in the middle column so `Indexed Skills`, `Runs Today`, and `Open Proposals` no longer clip or collapse.
- Verification passed after the Overview command-center layout repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with 145 checks and zero issues; manual review of `skill-management-workbench/tmp/self-test/module-overview.png` confirmed the first screen is visually balanced and keeps Graph/Focus/status content visible without turning Overview into a function inventory.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user screenshot showed a broader module-header layout failure on Optimization Proposals: the long bilingual title and right-side filter/action controls squeezed the description into a narrow vertical column, and the refresh button could overflow the right edge.
- A module headline anti-squeeze repair layer now prevents long bilingual titles from crushing descriptions. Section headlines use a safer grid structure on desktop, descriptions are limited to readable two-line summaries, and the Optimization Proposals header has a dedicated `proposal-headline` layout with a non-overflowing filter/refresh toolbar.
- `npm run smoke` and `npm run layout:check` now guard the `proposal-headline` class, the module-headline anti-squeeze repair layer, and the Optimization toolbar anti-overflow styling. Manual review of `skill-management-workbench/tmp/self-test/module-proposals.png` confirmed the description no longer becomes vertical text and the refresh action stays inside the viewport.
- Verification passed after the module-header repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test remained at 145 checks with zero issues.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user reported that many buttons still felt ineffective. Source/test review confirmed the previous smoke guard only checked for `onClick` bindings, not whether a user sees feedback after clicking.
- Added a shared visible interaction feedback pattern for active work modules. Picker/precondition/lightweight actions now show a compact local receipt with area, action, result, and next step, covering scan roots, exclusions, telemetry files, backup manifests, bundle manifests, telemetry import, scan, proposal refresh/filter, marketplace query clearing, backup validation/restore preview, bundle validation/import preconditions, health policy changes, and authorization blockers.
- Precondition-driven buttons such as backup validation and bundle validation/import now remain clickable when a required manifest is missing, so the UI explains the next step instead of looking broken. Busy-state disabling remains in place to avoid duplicate execution.
- Interaction receipts are cleared on module navigation so feedback from one workspace does not appear stale in another workspace.
- `npm run self-test:ui` now includes a visible interaction feedback audit for high-risk perceived-no-op controls: Add Folder, Add Exclusion, Clear Query, Choose Telemetry File, Import Telemetry, Proposal Filter, Refresh Proposals, Choose Bundle Manifest, Bundle Validation, and Health Policy.
- Verification passed after the interaction feedback repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with 159 checks and zero issues at `2026-06-08 13:31:01 CST`; report: `skill-management-workbench/tmp/self-test/self-test-report.json`.
- Full-flow QA pass followed `problem collection -> test -> repair -> record` after the user requested project-level validation across function, UI, and feasibility interactions.
- The automated UI self-test is now stricter: `expect` and `waitFor` failures throw immediately inside guarded flows, so a flow can no longer be marked passed after an internal assertion failed. Click helpers also reject disabled buttons, which catches race conditions where a user-facing action is attempted before controls are ready.
- Expanded `npm run self-test:ui` coverage beyond the prior happy paths: topbar Settings navigation and stale feedback cleanup, Graph search focus / node selection / pinned neighborhood / topology reset, Bundle guarded import feedback, Settings backup creation / backup manifest selection / validation / restore impact preview, and Registry scan feedback are now clicked through the visible UI.
- The first enhanced run caught three issues in the test assumptions: Graph reset used the visible `Reset Topology` control rather than `Show Full Topology` after pinning, backup manifest selection needed a precise backup picker selector, and backup validation needed to wait until backup controls were ready after creating a snapshot. The test flow was repaired to match the actual product interaction.
- Verification passed after the full-flow QA expansion: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest strict UI self-test passed with 177 checks and zero issues at `2026-06-08 13:45:33 CST`; report: `skill-management-workbench/tmp/self-test/self-test-report.json`.
- Manual screenshot review sampled `module-overview.png`, `module-graph.png`, and `final-state.png`. Overview remains a guided command center rather than a full function inventory, Graph first screen keeps the Search/Select/Trace path and readable topology, and final Audit state confirms interaction feedback is cleared on module navigation.
- Follow-up QA loop followed `problem collection -> test -> repair -> record` after the user reported four P0 UI failures: many clicks had no designed feedback, Discovery remote repository analysis for `https://github.com/obra/superpowers` caused confusing layout/visibility behavior, Skill Library `Tune Scope` / `Explain Scope` felt ineffective, and Graph/visual pages could deform into narrow bilingual fragments.
- Interaction feedback now has a generic active-workspace fallback in addition to existing feature-specific receipts. Button/card clicks that do not already produce a dedicated receipt now show a local area/action/result/next-step message, while navigation, language switching, and existing specialized feedback surfaces remain untouched.
- Discovery remote repository analysis now renders in a separate `remote-preflight-workbench` below the local/remote intake lanes instead of inside the narrow right import card. The browser preview API now normalizes GitHub URLs such as `https://github.com/obra/superpowers` and displays a productized `Superpowers` candidate name. After analysis completes, Skill OS scrolls the internal product workspace to the local preflight result so users can see the feedback rather than wondering whether the button worked.
- Skill Library stage tabs now route through `selectLibraryStage`, so `Summary`, `Analyze`, `Optimize`, `Tune Scope`, and `Package` all update the selected stage and the visible `skill-action-feedback` card. `Explain Scope` continues to use the dedicated tuning explanation receipt, making the Tune Scope flow visibly responsive before users open Apply Center.
- Graph desktop layout now has a reported-issue repair layer: the topology canvas stays first, Focus Analysis expands to a full-width readable area below the canvas at the 1440px target, focus cards use safe two-column grids, and bilingual pills/text are guarded against vertical fragmentation.
- `npm run self-test:ui` now covers the reported scenarios directly: it analyzes `https://github.com/obra/superpowers`, verifies the remote preflight workbench is readable and scrolled into the visible workflow area, checks for vertical text fragments, verifies `Tune Scope` and `Explain Scope` feedback, selects a graph node, and checks Graph Focus card widths/readability. The strict self-test passed with 189 checks and zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`.
- New static guards were added so future changes cannot silently remove this repair loop: `npm run smoke` checks generic click feedback, Skill Library stage feedback, remote preflight workbench markup, the user-reported repository self-test path, readable-panel/vertical-fragmentation guards, and preview GitHub URL normalization. `npm run layout:check` checks that the reported-issue repair CSS layer sits after earlier visual QA layers and that Discovery/Graph/Skill Library readability guards remain present.
- Verification passed after the reported-issue repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Refreshed screenshots include `skill-management-workbench/tmp/self-test/reported-remote-analysis-obra-superpowers.png` and `skill-management-workbench/tmp/self-test/reported-graph-focus-readable.png`.
- Follow-up product-UX pass continued the same `problem collection -> test -> repair -> record` loop after the user asked to keep optimizing the project and repeatedly emphasized that the Overview still felt too verbose, too stacked, and not product-like enough.
- Overview first-screen content was tightened without turning it into a blank hero: the `Recommended Next Step` copy is shorter, the workflow intro is lighter, and `Graph Studio` now explains the local topology in one compact sentence instead of a longer infrastructure paragraph.
- The old `Today Focus` explanation stack was replaced by a product-boundary entry grid inside the same right-side dock. The visible Overview now makes four boundaries easier to understand at a glance: `Local Skills`, `Remote Market`, `Graph Studio`, and `Apply Center`, each as its own clickable entry card with a short promise rather than another block of prose.
- The bottom-right focus area now ends with a smaller summary strip instead of another tall explanation column, so the first screen keeps route clarity without feeling like a documentation page. The `Watch` card was deliberately removed to preserve first-screen height and keep the boundary-first mental model.
- Desktop module headers were compacted again so title and description behave more like one horizontal information line on wide screens: tighter gaps, smaller copy, ellipsis-safe descriptions, and better baseline alignment reduce wasted vertical space across modules.
- The first attempt at this Overview refinement regressed the visible-height guard. `npm run self-test:ui` correctly failed on `Overview first screen exposes workflow and graph entry`, proving the visual QA loop is catching real UX regressions instead of just code shape changes.
- A second layout-repair pass reduced hero gaps, card padding, workflow density, command-rail spacing, and right-dock depth until the visible Overview once again fit the 1440x980 first-screen guardrail while preserving report visibility and guided navigation.
- Manual screenshot review of `skill-management-workbench/tmp/self-test/module-overview.png` after the repair confirmed the result is materially better aligned with the product direction: fewer explanation blocks, clearer boundary entry points, stronger progressive disclosure, and less wasted vertical space.
- Verification passed after the Overview boundary-entry and compact-header refinement: `npm run typecheck`, `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, and `npm run build`. Latest strict UI self-test passed with `189` checks and zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`.
- Follow-up product-model pass aligned the user's current preference for development-heavy workflows with the Skill OS governance model: development-oriented Skills should prefer the `Superpowers` harness by default unless a narrower local reason suggests otherwise.
- `SkillGovernanceProfile` now includes a `preferredHarness` field, with current values `superpowers` and `generic`. This keeps the harness choice visible as part of the Skill asset model rather than hiding it in free-form notes.
- The registry governance heuristic now infers `preferredHarness: superpowers` for development-like Skills that carry `superpowers` / subagent / TDD / review / finish-workflow signals, so the real indexing path can surface that preference instead of limiting it to preview data.
- Preview/demo data now includes a concrete development-first Skill, `Superpowers Dev Implementer`, with project-scoped governance, reusable-but-reviewed packaging rules, and a healthy development runtime profile.
- Skill Library priority ranking now explicitly boosts development Skills that prefer `Superpowers`, which means development-heavy users see their preferred implementation workflow nearer the top instead of being buried under unrelated governance-heavy assets.
- Skill Library cards and the selected Skill workbench now surface the preferred harness directly. Development Skills aligned with `Superpowers` show an explicit `Superpowers` pill, and the summary / governance panel explains that the preferred path is `plan -> implement -> test -> review -> finish`.
- Verification passed after the development / Superpowers preference pass: `npm run typecheck`, `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, and `npm run build`. Latest UI self-test remained at `189` checks with zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`.
- Follow-up product-flow pass turned the `Superpowers` development preference into a visible Skill Library workflow instead of leaving it as a hidden governance field.
- Skill Library now exposes a dedicated `Development Lane` that groups development-oriented Skills into a narrow `plan -> implement -> test -> review -> finish` path. This gives development-heavy users a product surface aligned with how they actually work instead of making them infer the harness choice from generic metadata.
- The selected Skill workbench now includes a `Harness Compatibility` panel. It contrasts `Superpowers`, `Codex Native`, `Claude Skill Folder`, and `Cursor Rules` so the user can see which harness is preferred, which are merely compatible, and which should be reviewed before reuse.
- The automated UI self-test now clicks into the development lane, verifies that a development Skill can be selected from it, and checks that the `Harness Compatibility` panel becomes visible. Static smoke checks also guard the new development-lane and compatibility-matrix markup and styling.
- Verification passed after the development-lane / compatibility-matrix pass: `npm run typecheck`, `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, and `npm run build`. Latest UI self-test increased to `193` checks with zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`.
- Follow-up product-model pass addressed a repo-specific gap the user called out: the current `codex-skills` repository is not just a flat list of independent Skills, it also contains a composite framework that coordinates routing, specs, memory, review, test, and release flows. The workbench previously inferred some of that data, but still presented the framework like an ordinary single Skill.
- Shared Skill governance now carries explicit framework structure fields: `structureType`, `frameworkLabel`, `orchestrationSignals`, and `moduleCountHint`. Registry inference and preview/demo fixtures were already updated earlier; this pass made the framework model first-class in the visible Skill Library product flow.
- Skill Library now surfaces composite-framework identity in three places instead of hiding it in raw metadata: priority cards, the simple Skills List, and the selected Skill workbench. Composite entries now show a `Composite Framework / 组合框架` pill, a framework label such as `Workflow Skills / 工作流框架`, a compact orchestration summary, and a visible module-count hint.
- The selected Skill workbench summary copy now explains when a Skill is actually a composite framework, for example that it coordinates router/spec/memory/review/test flows before the user drills into deeper analysis or tuning. Governance cards now include dedicated `Structure`, `Framework`, and `Orchestration` slots so the framework model is legible without opening the analysis layer.
- Skill selection logic was corrected so the visible workbench follows the highest-priority Skill row instead of always defaulting to the first raw bootstrap item. This matters for the current repo because the development-heavy Superpowers framework is intentionally boosted to the top and should therefore become the default visible workbench.
- Product QA also uncovered a deeper navigation stability issue: in single-module mode, module switches could preserve an old internal scroll position long enough to push the first visible call-to-action below the viewport, which produced false-feeling layout disorder in both Skill Library and Marketplace. The module scroll behavior now hard-resets the internal `.product-workspace` container to the top immediately on section change instead of trying to smooth-scroll hidden sections.
- Visual QA then tightened a few remaining desktop-width readability problems without broad redesign churn: the composite-framework note in priority cards now stays inside the intended content column, bilingual framework labels were shortened to avoid duplicate phrasing, the `Development Lane` header no longer collides with its count pill, and Marketplace / Skill Library first-screen guardrails remain intact after the framework copy was added.
- Static checks were expanded so future regressions are harder to hide. `npm run smoke` now guards composite framework summary markup, framework pills, orchestration-summary support copy, and the new structure/framework presentation path in Skill Library.
- Verification passed after the composite-framework visibility and single-module scroll-stability repair: `npm run typecheck`, `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, and `npm run build`. Latest UI self-test remained at `193` checks with zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`. Manual screenshot review of `skill-management-workbench/tmp/self-test/module-local-skills.png` and `module-remote-market.png` confirmed that the composite framework is now visible as a product concept rather than hidden metadata, while Marketplace and Skill Library both return to stable first-screen guided flows after navigation.
- Follow-up Graph product-density pass continued the `problem collection -> test -> repair -> record` workflow after reviewing the latest first-screen screenshots. The Graph page still repeated the same guidance twice: three source/flow/scope cards followed by a separate `Search -> Select -> Trace` instruction band, which made the core topology feel lower-priority than the explanation.
- Graph now uses a compact `graph-operator-band` instead of the duplicate starter band. The first-screen entry is reduced to three operator cards: local SQLite snapshot source, `Search -> select -> trace` operating path, and current visible scope. The separate `graph-studio-start` instruction strip was removed so the topology appears sooner and reads more like a product workbench than documentation.
- The topology header copy was shortened to the essential boundary: it is a read-only local map grouped by node type, and search/select/trace actions do not mutate stored data. CSS now keeps the operator band compact, trims Graph workspace spacing, and gives the topology header tighter line-height so the map remains the visual anchor.
- Static guards were updated to preserve this product decision. `npm run smoke` and `npm run layout:check` now require the compact `graph-operator-band` and explicitly fail if the removed `graph-studio-start` instruction band returns above the topology.
- Verification passed after the Graph operator-band refinement: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`. Manual screenshot review of `skill-management-workbench/tmp/self-test/module-graph.png` confirmed that the source/flow/scope controls are more compact and the topology becomes the first-screen focus.
- Follow-up Overview progressive-disclosure pass continued the same repair loop after reviewing the latest `overview-initial.png`. The first screen was technically passing but still repeated the same dual-core concept in the recommended card, the workflow strip, and the right-side entry dock, which made the homepage feel more explanatory than guided.
- Overview now keeps the first screen to four clearer layers: a recommended next action, a compact current-state report, a thin `Operating Path` rail, and a right-side `Today Signal` dock. The workflow strip no longer includes a second handoff explanation row, and the right rail now summarizes changed signals with two product entries instead of repeating broad product-positioning copy.
- The right-side dock now says `Review only what changed`, shows pending proposal and run counts, and keeps only two primary entry choices: `Framework / Produce` and `Workbench / Govern`. This preserves the two-core positioning while making the homepage feel more like an operator console than a product explainer.
- Static guards were updated so the old `overview-workflow-handoff` row cannot return silently. `npm run smoke` and `npm run layout:check` now require the `Operating Path` / `overview-signal-summary` structure and fail if the removed handoff explanation block is reintroduced.
- Verification passed after the Overview progressive-disclosure refinement: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`. Manual screenshot review of `skill-management-workbench/tmp/self-test/overview-initial.png` confirmed that the homepage is lighter, still full enough for the first screen, and no longer duplicates the same conceptual explanation across multiple cards.
- Follow-up Overview report-density pass addressed the remaining first-screen dead space without reverting to a feature-directory layout. The page now adds a compact `Today Report` strip under the entry/signals area instead of adding more module shortcuts or explanatory copy.
- The new Overview report strip uses existing local telemetry summaries only: daily cost, average latency, success rate, and top Skill. It fills the first screen with useful observability signal while preserving the product rule that detailed analysis stays inside the Analysis workspace.
- Static guards now require `overview-today-report` markup and styling so future homepage refinements keep a compact report surface rather than leaving empty space or reintroducing a feature list.
- Verification passed after the Overview report strip addition: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`. Manual screenshot review of `skill-management-workbench/tmp/self-test/overview-initial.png` confirmed that the homepage now has clearer report value without becoming a module directory.
- Follow-up Remote Market progressive-disclosure pass addressed the next densest module first screen. The Remote Market page previously showed two large explanation cards, a six-card collection rail, a list-intro explanation, search, candidates, and the right-side activation workbench all in the first viewport, which made the page feel more like stacked documentation than a candidate-first workflow.
- Remote Market now compresses the top entry into a single `marketplace-entry-flow` operator strip showing the staged flow and current candidate in one row. The list intro is shortened to `Pick one remote Skill`, and the collection rail is flattened into compact counters so users get to search, candidates, and the review workbench faster.
- The underlying safety model is unchanged: remote Skills remain inactive until Preview -> Security -> Import -> Activate, and the right-side staged workbench still owns the deeper review and activation decision. This pass only reduces first-screen density and improves the candidate-first mental model.
- Static guards now require `marketplace-entry-flow` markup and styling so future Remote Market work keeps the operator strip compact instead of reintroducing large explanatory cards.
- Verification passed after the Remote Market operator-flow refinement: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`. Manual screenshot review of `skill-management-workbench/tmp/self-test/module-remote-market.png` confirmed that search, the selected candidate, and the activation workbench are now more prominent on the first screen.
- Follow-up Analysis pressure-summary pass addressed the remaining report-wall feel on the Analysis first screen. The page already had progressive entry cards, but the top section still felt like three explanation blocks followed by four large metric cards and three large insight cards.
- Analysis now keeps the same data and workflows while presenting the first screen as a lighter pressure summary: entry cards are thinner, metrics use smaller card density, insight cards read more like signal rows, and the Telemetry Intake / Today's Snapshot area appears sooner without removing the observability value.
- Static guards now require the `Analysis pressure-summary refinement` layer so future visual work preserves the signal-led first screen instead of returning to a dense dashboard wall.
- Verification passed after the Analysis pressure-summary refinement: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`. Manual screenshot review of `skill-management-workbench/tmp/self-test/module-analysis.png` confirmed the page is more compact while keeping telemetry import and daily snapshot visible.
- Follow-up Apply Center operator-layout pass continued the `problem collection -> test -> repair -> record` workflow after reviewing the latest Apply Center screenshot and browser measurements. The page was functionally correct, but the first screen still read like a large scope feature list: four tall bilingual scope cards dominated the left side while the staged no-write workbench was too narrow.
- Apply Center now treats scope selection as a compact entry control and the staged workbench as the main product surface. The scope rail gained a short guidance line, compact `apply-scope-selector` cards, selected/preview pills, hidden repeated `Preview / Confirm / Applied` tag rows, and a left-narrow/right-wide desktop layout. This preserves System / Workspace / Project / Folder choice while making impact preview, guardrails, and confirmation the visible workflow center.
- The Apply Center module header now has a local anti-squeeze rule so the title, bilingual description, and `Start Apply Flow` action remain readable instead of forcing the description into a clipped one-line fragment next to the button.
- Static guards were expanded so future changes cannot silently regress this decision. `npm run smoke` now requires compact Apply Center selector markup and refinement styling, while `npm run layout:check` verifies the Apply Center workbench stays primary and scope cards do not repeat the staged workflow as a feature list.
- Browser preview QA at `1440x900` confirmed the right workbench stays primary and the scope cards now behave like a selector. Clicking `Workspace Scope` still transitions to the preview stage, shows `Will Affect`, and keeps the preview read-only before guardrails and confirmation.
- Verification passed after the Apply Center operator-layout refinement: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues at `2026-06-18 01:04:24 CST`; report: `skill-management-workbench/tmp/self-test/self-test-report.json`. Refreshed screenshot: `skill-management-workbench/tmp/self-test/module-apply-center.png`.
- Follow-up Settings title-row repair continued the `problem collection -> test -> repair -> record` workflow after screenshot review showed the Settings storage area still felt squeezed: the Local Storage headline, backup CTA, and preview blocks were fighting for the same first row while the runtime card sat too low.
- Settings now gives the Local Storage panel and Runtime Policy panel their own local layout classes, lets the storage headline stack title and bilingual description while keeping `Create Backup` in a separate aligned column, and loosens the spacing around backup manifest preview / recent snapshot controls so the first visible storage block reads like a settings surface rather than a compressed form.
- Static guards were expanded so future changes cannot silently remove this fix. `npm run layout:check` now requires the Settings storage panel marker and its desktop-readable headline styling, while the existing self-test continues to click backup and restore controls through the visible interface.
- Browser preview QA verified that the Settings storage title row is readable at desktop width and that the `Create Backup` action no longer collides with the copy column. The rest of the Settings controls remain in place and still pass through the existing recovery / policy flows.
- Verification passed after the Settings title-row repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues at `2026-06-18 01:28:15 CST`; report: `skill-management-workbench/tmp/self-test/self-test-report.json`.
- Follow-up Bundle Center density pass continued the `problem collection -> test -> repair -> record` workflow after screenshot review showed the Bundle first screen still felt like a workflow explanation wall: the six-step strip and four safety cards consumed too much vertical space before the export workbench became prominent.
- Bundle Center now treats the six-step workflow as a compact support rail rather than the primary content. In single-module mode the workflow strip uses tighter cards, the safety notes are shorter, safety copy is clamped to two lines, and bundle panel headlines can stack readable copy instead of inheriting the global one-line header behavior.
- Static guards were expanded so future changes cannot silently regress this decision. `npm run layout:check` now requires compact Bundle flow styling and compact safety-note copy in single-module mode.
- Browser preview QA verified that Bundle safety notes dropped from roughly `138px` to `90px` high and the export workbench appears earlier in the visible page. Bundle action behavior is unchanged: export, validation, import guardrails, and graph-inspection controls still run through existing feedback and self-test paths.
- Verification passed after the Bundle Center density repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues at `2026-06-18 02:00:23 CST`; report: `skill-management-workbench/tmp/self-test/self-test-report.json`.
- Follow-up Graph visual QA continued the `problem collection -> test -> repair -> record` workflow after screenshot review showed the topology SVG technically passed overflow checks but still required horizontal scrolling to understand the final Bundle lane at 1440px desktop width.
- Graph topology now fits the single-module canvas by default. In Graph single-module mode the topology viewport hides horizontal overflow and scales the SVG to the available panel width, so Root, Skill, Model, Proposal, and Bundle lanes are all visible as one readable product surface instead of appearing clipped.
- Static layout guards were expanded so future changes cannot silently regress this fix. `npm run layout:check` now requires the Graph topology SVG fit-to-panel rule and the no-horizontal-scroll default for the Graph single-module canvas.
- Verification passed after the Graph fit-to-panel repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`. Manual screenshot review of `skill-management-workbench/tmp/self-test/module-graph.png` confirmed the graph now shows the complete topology lanes without clipping, and `module-proposals.png` confirmed the latest Optimization density pass remains readable.
- Follow-up Settings visual QA continued the same `problem collection -> test -> repair -> record` workflow after reviewing the latest Settings screenshot. The storage panel still showed a real form-layout issue: the `Local Storage` heading, bilingual description, and `Create Backup` button competed for the same compressed headline row, and the `Backup Manifest Preview` subsection could overlap with its explanatory copy.
- Settings storage now has a dedicated form-layout repair layer instead of inheriting the global compact module headline behavior. In Settings single-module mode, the storage headline uses a stable title/copy column plus an independent backup action column, backup subsection headlines stack naturally, long local paths wrap safely, summary metrics keep their own grid, and backup manifest actions flow as form controls rather than squeezed header content.
- Static guards were expanded so this cannot silently regress. `npm run layout:check` now requires the `Skill OS Settings form-layout repair` layer, the Settings storage headline override, and the stacked compact subsection headline rule.
- Verification passed after the Settings form-layout repair: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest UI self-test passed with `191` checks and zero issues; report: `skill-management-workbench/tmp/self-test/self-test-report.json`. Manual screenshot review of `skill-management-workbench/tmp/self-test/module-settings.png` and `module-settings-bottom.png` confirmed that storage title/copy/button, backup manifest preview, and restore-impact preview no longer overlap. The in-app browser tab on `127.0.0.1:4177` was stale because that preview server had stopped, so the authoritative visual evidence for this pass is the fresh self-test Electron screenshots.

- 2026-06-30 follow-up self-test reliability pass continued the required `problem collection -> test -> repair -> record` loop. Problem collected: the previous artifact-driven UI runner still depended on external Chrome remote debugging and could time out before any visible UI was exercised in the current sandbox.
- `npm run self-test:ui` now first attempts a project-local Electron renderer pass against the built `out/renderer/index.html`, reusing the same navigation, button, input, layout, screenshot, and reported-issue checks when Electron is available. This keeps the intended full visible-interface flow attached to the desktop app artifact instead of a temporary Vite port.
- Because this environment currently aborts Electron itself with `SIGABRT` before a renderer window can be created, the script now falls back to an explicit source/build interaction contract instead of failing silently or pretending a visual click pass occurred. The fallback checks the built renderer artifact, full navigation/section mapping, single-module routing CSS, button click bindings, key user-reported flows such as `obra/superpowers`, Skill Library tuning/apply actions, Apply Center scope preview, Settings backup/restore controls, Graph readability guards, and visible interaction-feedback wiring.
- Latest verification after the self-test reliability pass: `npm run smoke`, `npm run layout:check`, `npm run typecheck`, `npm run build`, and `npm run self-test:ui` all completed successfully. The self-test report is `skill-management-workbench/tmp/self-test/self-test-report.json`, mode is `source-contract`, with zero issues and one warning: browser/Electron click automation is blocked by `Electron exited with signal SIGABRT`.
- Remaining verification risk: today's environment did not produce fresh screenshots or execute the real browser click pass. Any future frontend layout change still needs visible preview QA in an environment where the in-app browser or Electron renderer can be controlled, or by the user-facing preview once launched.

- 2026-06-30 product-flow self-test pass focused on user experience, product boundaries, product flow, and feature clarity rather than only technical build status. The local browser preview at `127.0.0.1:4173` was not running, direct `file://` preview was blocked by browser safety policy, and sandbox approval to bind a local static preview port was unavailable, so this pass used the existing automated source/build contract plus manual source review instead of claiming a true visible click/screenshot pass.
- `npm run self-test:ui` now includes product-experience contracts for the two-core positioning (`Workflow + Skill Framework` plus local visual workbench), Overview progressive disclosure, first-screen reporting signals, Skill Library priority-first/list-detail flow, Superpowers-first Builder mode, composite framework identity, Remote Skill inactive/manual-activation boundaries, Apply Center no-write-before-confirmation preview gates, Bundle original-source/diff/strategy guardrails, and local-only User Session Insights.
- Latest product-flow verification: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build` all passed. Latest self-test report remains `skill-management-workbench/tmp/self-test/self-test-report.json`, mode is `source-contract`, with zero issues and one environment warning: `Electron exited with signal SIGABRT`.
- Product UX conclusion from this pass: the implementation is aligned with the intended product boundary of `Skills Framework + visual Skill OS workbench`; Overview no longer behaves like a full feature directory; remote and bundle flows remain preview-first and local-first; and the highest remaining QA gap is environment-level visible click/screenshot verification, not a currently detected source-level product-flow failure.

- Follow-up Marketplace functionality pass continued the `problem collection -> test -> repair -> record` loop for the user-reported class of "buttons look clickable but do not produce meaningful product state." Problem collected: Remote Market had a staged Preview -> Security -> Import -> Activate workflow, but Import / Activate were still primarily renderer-stage feedback rather than a persistent local candidate and activation-preview pipeline.
- Remote Market Import now writes a real app-local inactive remote candidate through main-process IPC. The pipeline uses the bundled local Marketplace catalog, records source catalog id, source payload, import timestamp, and analysis JSON in local SQLite `remote_skill_sources`, and still performs no remote fetch, install, execution, or project write.
- Remote Market Activate now generates a local activation preview instead of executing anything. The preview records `activation_previewed_at`, reports whether the candidate can proceed to manual confirmation, keeps `willRunNow: false`, requires scope selection and target preview, and points users to Apply Center before any write or execution can happen.
- Browser preview parity was added through `preview-api.ts`, so the non-Electron preview surface can exercise the same import/activation-preview behavior without silently no-oping. Preload and Workbench API types now expose `importMarketplaceSkill` and `previewRemoteSkillActivation`.
- The Remote Market UI now shows dedicated local result panels: `marketplace-import-result` for inactive candidate state and `marketplace-activation-preview` for scope/target/run-now boundaries. These panels reuse the existing decision-flow visual language instead of becoming a database table.
- Static and automated guards were expanded. `npm run smoke` now checks main IPC, preload, preview API, UI panels, styles, and self-test coverage for Marketplace import/activation preview. `npm run self-test:ui` now checks that the source contract includes inactive local candidate import and activation-preview panels, and the real UI path will verify import result visibility and `Run Now: No` when Electron/browser clicking is available.
- Verification passed after the Marketplace local import/activation-preview pass: `npm run smoke`, `npm run layout:check`, `npm run self-test:ui`, `npm run typecheck`, and `npm run build`. Latest self-test report is `skill-management-workbench/tmp/self-test/self-test-report.json`, mode remains `source-contract`, with zero issues and one environment warning: `Electron exited with signal SIGABRT`.
- Follow-up Remote Candidate inventory pass continued the same `problem collection -> test -> repair -> record` loop. Problem collected: after importing a remote Marketplace Skill, the candidate was persisted locally but only visible through the current card/action state, so users did not have a clear inventory-style place to revisit inactive imports.
- Remote Market now lists imported inactive remote candidates in a compact `Imported Candidates` panel. The list is backed by `listRemoteSkillCandidates` through main IPC, preload, shared API types, and the browser preview API; clicking a candidate reopens the activation preview while preserving the boundary that remote Skills stay inactive until scope and target preview are completed.
- Static and automated guards were expanded again. `npm run smoke` now checks the candidate inventory IPC/preload/preview/UI/style path, and `npm run self-test:ui` now checks source contracts plus the intended visible flow labels for candidate inventory visibility, inactive boundary copy, and reopening activation preview from the inventory.
- Verification passed after the Remote Candidate inventory pass: `npm run smoke`, `npm run layout:check`, `npm run typecheck`, `npm run build`, and `npm run self-test:ui`. Latest self-test report is `skill-management-workbench/tmp/self-test/self-test-report.json`, mode remains `source-contract`, with zero issues and one environment warning: `Electron exited with signal SIGABRT`.
- Follow-up Remote Candidate review pass extended the inventory from a simple list into a progressive detail surface. Problem collected: imported candidates were visible, but users still needed a clearer local review step before deciding whether to enter activation preview or Apply Center.
- Remote Candidate review now shows selected candidate id, source URL, risk, verification status, and the explicit `Will not run` boundary. The review actions are wired: `Preview Activation` reopens the activation preview, while `Open Apply Center` is guarded with visible feedback until the activation preview has been completed.
- Static and automated guards were expanded for the review layer. `npm run smoke` now requires review markup, review styling, guarded Apply Center handoff wiring, and self-test coverage. `npm run self-test:ui` now checks source contracts for the review surface and the intended UI flow labels for review visibility and guarded handoff.
- Verification passed after the Remote Candidate review pass: `npm run smoke`, `npm run layout:check`, `npm run typecheck`, `npm run build`, and `npm run self-test:ui`. Latest self-test report is `skill-management-workbench/tmp/self-test/self-test-report.json`, mode remains `source-contract`, with zero issues and one environment warning: `Electron exited with signal SIGABRT`.
- Follow-up Remote Candidate local-detail pass completed the next progressive layer without adding remote network behavior. Problem collected: the review card clarified selection and no-run status, but users still needed to see why the candidate is safe or blocked before Apply Center handoff.
- A new read-only `getRemoteSkillCandidateDetail` API now loads candidate detail from local SQLite only. It derives local checks, activation steps, manifest validation requirement, dependency/tag signals from the bundled catalog payload when available, diff-preview requirement, catalog trust signals, and safety boundaries from `remote_skill_sources.analysis_json` and `source_payload_json`.
- Remote Market now renders this local detail inside the existing `Candidate Review` card instead of opening a new dense module. The detail surface shows `Checks`, `Manifest`, `Dependencies`, `Diff`, `Trust`, and local safety-boundary chips. It explicitly states that manifest/diff previews are still required and that the detail view does not fetch or execute remote code.
- Browser preview parity was added through `preview-api.ts`, and the preload/main IPC path is covered for Electron. Static and automated guards now require the detail IPC, preload bridge, preview API, UI panel, styling, and self-test labels.
- Verification passed after the Remote Candidate local-detail pass: `npm run smoke`, `npm run layout:check`, `npm run typecheck`, `npm run build`, and `npm run self-test:ui`. Latest self-test report is `skill-management-workbench/tmp/self-test/self-test-report.json`, mode remains `source-contract`, with zero issues and one environment warning: `Electron exited with signal SIGABRT`.
- Follow-up Apply Center handoff pass closed the next product-flow gap. Problem collected: Remote Market could open Apply Center after activation preview, but Apply Center did not preserve which remote candidate was handed off, which could make users think the generic local Skill preview was the active target.
- Remote candidates now carry a read-only handoff context into Apply Center after activation preview. Apply Center renders a `Remote Candidate Handoff` card with candidate name, source URL, risk, verification, `Run Now: No`, and target-preview requirement. The preview stage now shows remote candidate name, remote target preview requirement, diff-first policy, and no pending writes instead of reusing local Skill impact numbers.
- The handoff remains safe by design: it does not install, execute, write, or fetch remote code. It only preserves context and states that scope, target impact, diff preview, and manual confirmation are still required before any write or execution.
- Static and automated guards were expanded again. `npm run smoke` now requires the handoff card markup and styling, and `npm run self-test:ui` now checks source contracts for remote candidate Apply Center handoff context.
- Verification passed after the Apply Center handoff pass: `npm run smoke`, `npm run layout:check`, `npm run typecheck`, `npm run build`, and `npm run self-test:ui`. Latest self-test report is `skill-management-workbench/tmp/self-test/self-test-report.json`, mode remains `source-contract`, with zero issues and one environment warning: `Electron exited with signal SIGABRT`.
- Follow-up remote Apply Preview service pass converted the handoff from UI-only context into service-backed read-only preview data. Problem collected: Apply Center preserved the remote candidate context, but the impact numbers still needed to come from the preview service rather than manual UI placeholders.
- `SkillApplyPreviewInput` now accepts either a local `skillId` or a `remoteCandidateId`, and `SkillApplyPreview` distinguishes `sourceKind: local_skill | remote_candidate`. The Apply Preview service now has a remote-candidate branch that reads local `remote_skill_sources`, computes scope-specific target labels and impact counts, keeps `pendingWrites` at `0`, keeps `readyForConfirmation` false, and returns warnings for activation preview, manifest validation, diff preview, broad scope, and missing approved roots.
- Apply Center now requests `previewSkillApply({ remoteCandidateId, scope })` for remote handoffs and shows the preview source as `Remote Candidate / 远程候选`. The visible target and impact values now come from the service-backed preview result while preserving the no-write/no-execute boundary.
- Browser preview parity was added for remote candidate apply preview, and static guards now require `sourceKind`, `remoteCandidateId`, the remote apply service branch, and the renderer request path.
- Verification passed after the remote Apply Preview service pass: `npm run self-test:ui`, `npm run typecheck`, `npm run smoke`, `npm run layout:check`, and `npm run build`. Latest self-test report is `skill-management-workbench/tmp/self-test/self-test-report.json`, mode remains `source-contract`, with zero issues and one environment warning: `Electron exited with signal SIGABRT`.

## Next Highest-Value Tasks

1. Implement `TASK-14 Project Skill & Workflow Update Center` in phases: product contract, project detail modal, Skill Library tabs/sort/filter, workflow update preview, backup/apply/doctor, runtime evidence bridge, and Update Center.
2. Keep expanding `npm run self-test:ui` with any new UI feature before marking frontend work complete.
3. Add advanced Health Score custom sliders after the preset behavior is stable.
4. Add richer manifest/diff validators for remote candidates once local bundle/manifest metadata is available.
5. Expand smoke checks into runtime UI automation if the project later adopts a browser/Electron test runner.
6. Prepare a release checklist covering branch, build, package, tag, and merge gates once the user asks for release work.
