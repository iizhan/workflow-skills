# Skill OS Desktop App Design PRD

## 1. Document Purpose

This PRD is for generating desktop application design drafts for Skill OS.

The output should be product UI screens, not a marketing website. The target designer or model should produce a polished desktop app design for a local-first AI Skill management tool.

Primary language for the first design version: Chinese.

English labels can be used for product names, model names, file paths, and technical nouns, but the interface should not mix Chinese and English in the same dense label when avoidable.

## 2. Product Summary

Skill OS is a local-first desktop operating system for AI Skills.

It helps developers and AI-heavy users discover, evaluate, analyze, govern, optimize, apply, and package reusable AI Skills inside a selected project.

A Skill means a reusable AI workflow, prompt package, agent behavior, tool workflow, or Codex/Claude-compatible capability that can be indexed, scored, reused, and governed.

Skill OS is not a normal file scanner, not a CRM dashboard, and not a public app store. It is closer to:

- GitHub Desktop for project focus.
- Docker Desktop for local assets and lifecycle.
- Obsidian Graph for relationship visualization.
- Raycast for compact power-user workflows.
- Linear/Cursor for dense but polished developer UI.

## 3. V1 Product Boundary

The v1 boundary is strict:

- The app works around one selected project directory at a time.
- The user binds project folders explicitly.
- The app manages all bound projects in a Project Library.
- Scanning and analysis operate on one selected/current project only.
- The app must not imply full-computer scanning in v1.
- Full-computer discovery is a future capability and should not appear as a primary action.
- Remote Skills from GitHub or Marketplace are never auto-run.
- Remote Skills must go through preview, security review, import as inactive candidate, scope selection, target preview, and manual activation.
- Applying a Skill never writes before explicit preview and confirmation.
- All state is local-first: local SQLite, local project indexes, local telemetry imports, local bundle inventory, local audit trail.

Important naming:

- Use "项目库" for the bound project management area.
- Use "已绑定项目" for all user-bound projects.
- Use "当前项目" for the selected active project.
- Use "绑定项目" for the folder picker action.
- Use "扫描项目" for scanning the selected project.
- Use "技能索引" instead of "注册表".
- Avoid user-facing "root", "approved roots", "registry", or "全电脑扫描" as active product concepts.

## 4. Target Users

Primary users:

- Developers using Codex, Claude Code, Cursor, or local AI tools.
- AI workflow builders who maintain reusable Skills and prompts.
- Technical leads who want governance over AI assets in a project.
- Power users who care about local-first data handling and explicit permissions.

User mindset:

- They want focus, not a giant automatic scan.
- They want to know which Skills exist in the current project.
- They want to know whether a Skill is useful, stale, risky, expensive, or duplicated.
- They want safe ways to apply or reuse Skills without silent writes.
- They want visual relationship maps, but still need practical tables and controls.

## 5. Core User Journey

1. First launch
   - User sees local-first boundary.
   - User binds one project directory.
   - User chooses permissions.
   - User initializes the local Skill index.

2. Project-focused discovery
   - User selects or binds a project folder.
   - User clicks Scan Project.
   - App scans only the selected folder.
   - App shows scan progress and scan result.
   - If no Skills are found, app recommends applying a bundled recommended skills-workflow.

3. Project Library management
   - User sees all bound projects in one table/list.
   - User can switch current project.
   - User can scan a specific bound project.
   - User can unbind a project without deleting anything on disk.
   - The table should fit its area without horizontal scrolling.

4. Skill inventory
   - User reviews indexed Skills from the current project.
   - User reads summaries, roles, health, harness fit, scope, and source path.
   - Chinese users can enable readable Chinese descriptions.

5. Evaluation and runtime evidence
   - User chooses a Skill and evaluates it against use cases and scorecards.
   - User imports or previews Codex/Claude runtime telemetry.
   - App shows tool calls, tokens, latency, failures, repair loops, and waste hotspots.

6. Graph and optimization
   - User views a local graph of project, Skills, models, bundles, runs, and proposals.
   - User selects nodes to inspect relationships.
   - User reviews optimization proposals.
   - Accepted proposals become decisions, not automatic edits.

7. Apply and package
   - User routes a Skill to Apply Center.
   - User chooses system/workspace/project/folder scope.
   - App previews target impact and guardrails.
   - User confirms before write.
   - User can export/import local Skill bundles after validation and diff preview.

## 6. Information Architecture

Use a desktop shell with a left sidebar, top status/trust bar, and main workspace.

Recommended navigation groups:

### Main Flow

- 总览 / Overview
- 发现 / Discover
- 技能库 / Library
- 评测 / Evaluate
- 运行链路 / Runtime
- 优化中心 / Optimize

### Execution

- 应用 / Apply

### Advanced Tools

- 远程市场 / Remote Market
- 图谱 / Graph
- 打包 / Bundles
- 技能索引 / Skill Index
- 审计 / Audit
- 设置 / Settings

## 7. Required Design Screens

The design draft should include at least these desktop screens.

### 7.1 Overview

Goal:

Show product state at a glance without turning the homepage into a feature directory.

Required content:

- Skill OS identity and local-first trust signal.
- Current workflow progress.
- Compact KPI trend cards: runs, tokens, cost, success.
- Health or risk indicators.
- Current recommended next action.
- Product boundary summary: local project, remote inactive, graph, apply preview.

Do:

- Keep it dense, calm, operational.
- Use short labels and metric surfaces.
- Make it obvious that the product is local-first.

Do not:

- Use a landing-page hero.
- Use long educational paragraphs.
- Use big decorative gradients as the main content.

### 7.2 Discover

Goal:

Bind and scan one project, plus offer safe remote intake.

Required content:

- Project First entry card.
- Bind Project button with folder icon.
- Scan Project button with scan icon.
- Current selected project path.
- Scan state: idle, scanning, completed, error.
- Scan result strip or modal: Skills found, files seen, skipped entries.
- Empty project recommendation: recommended skills-workflow.
- Remote intake lane: GitHub URL input, Analyze Repository, risk checks, activation preview.
- Unified discovery search grouped by local and remote sources.
- Project Library full-width management table.

Project Library requirements:

- Use table/list form, not repeated cards.
- Columns: 项目, 路径, 最近扫描, Skill, 状态, 操作.
- Must fit the content area without horizontal scrolling.
- Long paths wrap cleanly.
- Actions are compact and recognizable: 切换, 扫描项目, 解绑.
- On narrow layouts, collapse rows into labeled field blocks.

Project Profile detail requirements:

- Opening a bound project shows a compact Project Profile summary before runtime telemetry.
- Show declared stack, detected language/framework/runtime signals, architecture modules, known commands, and confirmed decision-memory counts.
- Show Profile freshness explicitly: 未创建, 待项目分析, 已就绪 · 新鲜, or 需要刷新.
- Read Profile facts from the selected project directory only. The Profile is a reproducible project-facts cache, not a permission or approval record.
- Keep Profile refresh guidance separate from heartbeat/runtime evidence. Runtime calls, Tokens, and Codex connection state remain in the heartbeat section.
- Keep the Graph module focused on actual relationships and execution evidence; static Profile facts may be inspected from project detail without expanding the runtime graph.

### 7.3 Skill Index

Goal:

Show the current app-local Skill index for the selected project.

Required content:

- Clear title: 技能索引.
- Scope cards:
  - Current project.
  - Boundary: single directory.
  - Inventory count.
  - Latest scan.
- Selected project scope panel.
- Bind Project, Scan Project, Chinese description switch.
- Project Library.
- Recommended workflow card if current project has no Skills.
- Skill index table or empty state.

Critical message:

"技能索引只作用于当前选择的项目文件夹。全电脑发现会在后续版本单独开发。"

### 7.4 Skill Library

Goal:

Help the user understand and act on indexed Skills.

Required content:

- Priority Skills or top Skills.
- Skill list with purpose, source, role, health, status.
- Selected Skill workbench.
- Skill detail summary:
  - Role and governance.
  - Preferred harness.
  - Source path.
  - Description.
  - Health score.
  - Runtime evidence.
  - Related proposals and bundles.
- Actions:
  - Run Preview.
  - Explain Scope.
  - Optimize.
  - Open Apply Center.
  - Open Bundle Center.

### 7.5 Evaluate

Goal:

Turn a Skill into measurable use cases and scorecards.

Required content:

- Evaluation target card.
- Baseline score.
- Dimension cards:
  - Routing Accuracy.
  - Cost Efficiency.
  - Developer Fit.
  - Safety.
- Use cases:
  - Should trigger.
  - Should not trigger.
  - Runtime value.
- Codex and Claude Code fit panels.
- Generate Evaluation action.

### 7.6 Runtime Analysis

Goal:

Analyze runtime evidence from Codex/Claude activity.

Required content:

- Runtime chain entry.
- Runtime pressure summary: tokens, latency, repair loops.
- Runtime sources: Codex app, terminal, Claude Code.
- Discover Sources, Preview Source, Import Source.
- Source list with status and path.
- Preview panel:
  - importable runs.
  - detected events.
  - scanned lines.
  - confidence.
  - token fields.
  - sensitive hits.
  - detected Skills/tools/models.
- Daily snapshot and seven-day window.
- Leaderboards:
  - most used Skills.
  - slowest Skills.
  - highest waste Skills.

### 7.7 Remote Market

Goal:

Safely inspect, import, and activate remote Skills.

Required content:

- Remote Skills are inactive until explicitly activated.
- Flow: Preview -> Security -> Import -> Activate.
- Marketplace collections.
- Candidate list.
- Search.
- Imported inactive candidate inventory.
- Candidate review panel:
  - source.
  - risk.
  - verification.
  - boundary.
  - checks.
  - manifest preview.
  - dependencies.
  - diff gate.
  - trust score.
- Stage tabs:
  - Preview.
  - Security.
  - Import.
  - Activate.
- Clear CTA to open Apply Center after activation preview.

### 7.8 Graph

Goal:

Visualize local relationships around project, Skills, models, bundles, and proposals.

Required content:

- Graph source: local SQLite snapshot.
- Operator flow: Search -> Select -> Trace.
- Current scope summary.
- Left controls:
  - quick search.
  - navigation history.
  - scope stack.
- Center graph canvas.
- Right focus inspector.
- Node/edge summary.
- Visible nodes and visible edges lists.

Graph design guidance:

- Graph is a core product surface, not a minor report.
- Use entity colors consistently.
- Avoid overcrowding the first view.
- Make selected node and related paths obvious.

### 7.9 Optimization Center

Goal:

Convert evidence into reviewable improvement work.

Required content:

- Lifecycle strip: review evidence, accept, route implementation, verify/close.
- Proposal filters.
- Counts: open, accepted, dismissed, resolved.
- Proposal cards with:
  - title.
  - Skill.
  - severity.
  - expected benefit.
  - evidence.
  - recommended action.
- Accepted work queue.
- Decisions are local audit events, not automatic edits.

### 7.10 Apply Center

Goal:

Apply Skills only after selecting scope, previewing target impact, checking guardrails, and confirming.

Required content:

- Scope selector:
  - System.
  - Workspace.
  - Project.
  - Folder.
- Apply workbench stage:
  - Scope.
  - Preview.
  - Guardrails.
  - Confirm.
- Target impact preview.
- Conflict policy.
- Pending writes.
- Warnings.
- Manual confirmation gate.

Critical message:

"确认前不写入。"

### 7.11 Bundles

Goal:

Package and import reusable local Skill assets.

Required content:

- Bundle workflow:
  - Inventory.
  - Export.
  - Preview.
  - Validate.
  - Strategy.
  - Import.
- Export panel:
  - indexed Skill selector.
  - bundle name.
  - export action.
  - latest export summary.
- Bundle inventory table.
- Import preview:
  - choose manifest.
  - validate bundle.
  - import bundle.
  - diff preview.
  - strategy selection.
  - latest import summary.

Critical message:

Original Skill sources are not mutated by export or validation.

### 7.12 Audit

Goal:

Show local governance events.

Required content:

- Timeline of authorization changes, scans, imports, bundle operations, apply decisions, proposal decisions.
- Event details.
- Links to related graph nodes when available.

### 7.13 Settings

Goal:

Manage local storage, runtime policy, language, and permissions.

Required content:

- Local storage root.
- SQLite database path.
- Backups stored.
- Create backup.
- Validate backup manifest.
- Preview restore impact.
- Runtime policy:
  - telemetry mode.
  - raw content allowed/metrics only.
  - background watch approval.
  - excluded paths.
- Language setting: Chinese or English, one language at a time.

## 8. Interaction Requirements

### Folder Selection

Clicking Bind Project must feel like it opens a system folder picker. The UI should show immediate feedback:

- Opening folder chooser.
- Selection cancelled.
- Project bound successfully.
- Next step: scan project.

### Scanning

Clicking Scan Project must show progress and completion feedback:

- Scanning selected project folder.
- Result modal or result panel.
- Found Skills.
- Files seen.
- Skipped entries.
- Empty project recommendation.

### Empty Project Recommendation

If a selected project contains no Skills:

- Show "Recommended skills-workflow".
- Explain that this helps bootstrap a project with recommended workflows.
- Preview before writing.
- Apply only after explicit action.
- After applying, direct user to Skill Library and Evaluate.

### Project Switching

Switching a project should:

- Make it the current project.
- Not scan automatically.
- Prompt the user to scan project if data is stale.
- Preserve all bound projects in Project Library.

### Chinese Description Assist

For Chinese users, Skill descriptions should have a readable Chinese assist mode:

- Switch control, not a plain button.
- It should not break dense layouts.
- Avoid Chinese/English mixed lines that cause wrapping bugs.

## 9. Visual Design Direction

Style:

- Desktop developer tool.
- Calm, premium, technical.
- Dense but readable.
- Dark theme first.
- Operational, not decorative.

Default theme:

- Background: #0A0F1A.
- Secondary background: #121827.
- Card: #182235.
- Border: #263247.
- Primary: #4C8DFF.
- Success: #22C55E.
- Warning: #F59E0B.
- Danger: #EF4444.

Entity colors:

- Skill: blue.
- Workflow: purple.
- Agent: green.
- Bundle: pink.
- Project: cyan.
- Marketplace: gold.
- MCP: orange.
- Proposal: red.

Typography:

- Chinese: HarmonyOS Sans SC or a similar modern Chinese UI font.
- Latin: Inter.
- Code/path/hash: JetBrains Mono.
- Metrics: tabular figures.

Layout:

- 1440px desktop first.
- Left sidebar fixed.
- Top trust/status bar.
- Main workspace scrolls.
- Avoid card-inside-card.
- Tables and lists must fit their container.
- Long paths wrap.
- Buttons should have controlled widths.
- Icons are preferred for common actions, with concise labels when needed.

Avoid:

- Marketing hero page.
- Giant decorative cards.
- Pure purple/blue monotone gradients.
- CRM/admin-dashboard feeling.
- Horizontal scrolling for normal management tables.
- Mixed Chinese/English labels that break layout.
- Long explanatory paragraphs in primary screens.

## 10. State Requirements

Design these states explicitly:

- First launch / no project bound.
- Folder picker opening.
- Project selected but not scanned.
- Scanning.
- Scan success with Skills found.
- Scan success with zero Skills and recommended workflow.
- Scan error.
- Multiple bound projects.
- Current project focused.
- Skill index empty.
- Skill index populated.
- Remote candidate selected.
- Remote import inactive.
- Remote activation previewed.
- Apply preview ready.
- Apply blocked by guardrail.
- Bundle validation safe.
- Bundle validation blocked.
- Runtime source discovered.
- Runtime preview ready.
- Telemetry imported.

## 11. Design Output Request

The design model should output:

1. Desktop app visual direction.
2. Component system:
   - sidebar.
   - top status bar.
   - buttons.
   - icon buttons.
   - switches.
   - tabs.
   - tables.
   - metric cards.
   - status pills.
   - graph nodes.
   - modals.
3. Key desktop screens:
   - Overview.
   - Discover with Project Library.
   - Skill Index.
   - Skill Library detail.
   - Evaluate.
   - Runtime Analysis.
   - Remote Market candidate flow.
   - Graph.
   - Optimization Center.
   - Apply Center.
   - Bundles.
   - Settings.
4. Empty, loading, success, warning, and blocked states for important flows.
5. A Chinese-first UI copy pass.
6. Responsive behavior notes for narrow desktop and tablet-like widths.

## 12. Reference Design Notes

The provided Gemini reference drafts are directionally useful. Treat them as structural inspiration, not as final UI.

Adopt these ideas:

- Desktop shell with macOS-style window frame, fixed left sidebar, and top trust bar.
- Sidebar grouped by workflow: Main Flow, Execution, Advanced Tools.
- A persistent trust signal such as "本地优先 | 本地数据处理中".
- A persistent current project context near the top of the workspace.
- Discover page structure: project operation area, scan status/result area, Project Library, remote intake.
- Project Library as a table/list management surface, not card clutter.
- Scan result feedback with counts for Skills found, files scanned, and skipped items.
- Empty project recommendation for a bundled recommended skills-workflow.
- Overview structure with current project, analysis progress, key metrics, next recommendation, and recent activity.
- Skill Index screen with current scope, inventory count, latest scan, and Chinese description switch.
- Apply Center staged flow: Scope -> Preview -> Guardrails -> Confirm.
- Remote Market staged flow: Preview -> Security -> Import -> Activate.
- Graph screen with left scope/search, center graph canvas, and right inspector.
- Bundles screen with inventory, validation, diff, and strategy preview.

Avoid these problems from the references:

- Do not include fake citation artifacts such as "[cite: 1]".
- Do not use pseudo text, garbled labels, impossible dates, or placeholder English fragments.
- Do not put English in primary headings when the screen is Chinese-first. Use "总览", not "总览 (Overview)".
- Do not mix Chinese and English inside one dense label unless the English is a product name, model name, file path, or technical noun.
- Do not use tiny text that depends on zooming to read.
- Do not make the Project Library require horizontal scrolling.
- Do not overuse small outline buttons in table rows; keep row actions compact and predictable.
- Do not use decorative star/sparkle marks as permanent UI ornaments.
- Do not let the dark visual style become a one-note blue glow system.
- Do not imply full-computer scanning, automatic remote activation, or writes before preview.

Recommended refinements based on the references:

- Keep the dark glass-like panels, but reduce glow and decorative effects.
- Use larger Chinese line height and stable button widths to prevent mixed-language layout drift.
- Use icons plus short Chinese labels for core actions: 绑定项目, 扫描项目, 切换, 解绑.
- Use a switch component for binary settings such as "中文说明".
- Use table density for project and skill management, but reserve cards for metrics, recommendations, warnings, and detail inspectors.
- Let the current project be visible on every major screen.
- Make disabled and pending states visually explicit, especially for remote Skills and Apply Center writes.
- Use clear warning copy for scope boundaries: "仅扫描当前项目文件夹".

## 13. Suggested Prompt For Design Model

Use this prompt when asking another model to generate design drafts:

```text
Design a Chinese-first desktop application UI for "Skill OS", a local-first AI Skill operating system for developers.

The app manages AI Skills inside explicitly bound project folders. V1 must focus on one selected project directory at a time and must not present full-computer scanning as an active feature.

Create a polished dark desktop app design, not a marketing page. It should feel like a professional developer tool inspired by Cursor, Linear, Docker Desktop, Raycast, Obsidian Graph, and Datadog, but with its own Skill OS identity.

Reference direction:
- Use a fixed desktop shell with left grouped navigation and a top local-first trust bar.
- Use dark navy/black panels, thin borders, restrained blue/cyan highlights, and entity colors.
- Keep the current project visible across major screens.
- Prefer dense but readable tool surfaces over oversized marketing sections.
- Do not copy fake citation marks, pseudo text, garbled labels, decorative sparkles, or mixed-language headings from reference images.

Core product concepts:
- 项目库: all bound project folders.
- 当前项目: one selected project used for scanning and analysis.
- 绑定项目: opens a system folder picker.
- 扫描项目: scans only the selected project.
- 技能索引: current local Skill index for the selected project.
- 远程 Skill: remote Skills are imported as inactive candidates and never auto-run.
- 应用中心: no write before target preview and manual confirmation.

Please design the following desktop screens:
1. Overview
2. Discover with selected project controls and full-width Project Library
3. Skill Index
4. Skill Library detail
5. Evaluate
6. Runtime Analysis
7. Remote Market candidate flow
8. Graph
9. Optimization Center
10. Apply Center
11. Bundles
12. Settings

Important UX requirements:
- Chinese-first UI.
- Keep one language visible at a time.
- No horizontal scrolling for normal project management tables.
- Long paths must wrap cleanly.
- Buttons have controlled widths and recognizable icons.
- Project Library should be a table/list with columns: 项目, 路径, 最近扫描, Skill, 状态, 操作.
- The Discover page must clearly say Skill OS v1 only scans the selected project folder.
- Empty projects should recommend "recommended skills-workflow" with preview-before-write behavior.
- Remote Skills must follow Preview -> Security -> Import -> Activate.
- Apply Center must show Scope -> Preview -> Guardrails -> Confirm.

Visual style:
- Dark, local-first, technical, calm, premium.
- 1440px desktop primary canvas.
- Left navigation sidebar and top trust/status bar.
- Use entity colors: Project cyan, Skill blue, Workflow purple, Agent green, Bundle pink, Marketplace gold, Proposal red.
- Avoid CRM/admin dashboard look, decorative landing-page hero, and one-note blue/purple gradients.

Output detailed design directions and screen descriptions suitable for a Figma designer.
```

## 13. Success Criteria

The design is successful if:

- A first-time user understands they must bind one project first.
- The user understands v1 does not scan the whole computer.
- The Project Library clearly manages all bound projects.
- The current project is visually obvious.
- Scanning has clear feedback and result states.
- Empty projects have a helpful recommended workflow path.
- Remote Skills feel safe and inactive by default.
- Apply actions feel preview-first and controlled.
- Dense Chinese UI remains readable.
- The interface feels like a serious desktop developer tool, not a web admin template.
