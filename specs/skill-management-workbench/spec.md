# Skill Management Workbench Spec Draft

## 1. Product Positioning

Skill Management Workbench is a local-first Skill asset management and observability application.

It should help users:

- discover and index Skills on the current machine within user-approved scan ranges
- observe Skill runtime cost, latency, reliability, and usage patterns
- analyze daily and weekly top Skills by value and by waste
- understand Skill relationships as a graph
- optimize weak Skills through proposal-driven improvement
- package strong Skills into reusable engineering assets
- visually orchestrate Skills through drag-and-drop flows

This product is not a remote SaaS control plane.
It is a local application whose data storage, telemetry, analytics, and graph views travel with the app on the user's machine.

### 1.1 Primary Personas

The product should serve two dominant user groups without becoming two different products.

#### Builder Mode

Best for Claude Code users and other development-heavy operators.

They typically want to:

- build and refine workflow-driven Skills
- inspect governance, harness compatibility, and stored data classes
- package reusable assets
- verify graph relationships and optimization proposals
- move from analysis to apply/bundle actions quickly

Builder Mode should surface technical structure earlier and make Superpowers-style development flows easy to reach.

#### Guided Mode

Best for GPT users and lighter-weight Skill consumers.

They typically want to:

- understand what a Skill does before seeing its internals
- start from top Skills and simple summaries
- follow guided steps for analysis, tuning, application, and packaging
- avoid being forced to read registry, graph, or bundle jargon too early

Guided Mode should reduce jargon on the first screen, keep the path stepwise, and reveal deeper controls only on demand.

#### Shared Product Rule

Both modes must use the same local registry, graph, telemetry, apply, and bundle system.
The difference is only in default entry, language density, and how quickly deep technical layers are revealed.

The first screen should follow this progression:

1. top Skills
2. simple Skill list
3. deeper analysis and tuning on selection

## 2. Core Constraint

### 2.1 Local Database Only

The database must follow the application, not an external server.

Implications:

- no required dependency on a remote database such as MySQL, PostgreSQL, or cloud-hosted storage
- application startup, indexing, analytics, and graph views must work offline
- local upgrade must include schema migration capability
- local backup, export, import, and reset must be first-class features
- all telemetry and Skill metadata should default to local persistence

### 2.2 User-Controlled Scope

The app must not scan the whole machine by default.

The app must not begin indexing, telemetry collection, or runtime observation before the user explicitly authorizes it.

Initialization should require the user to lock scan scope, for example:

- `~/.codex/skills`
- repo-local skills directories
- plugin cache directories
- custom folders added by the user

The scope model should support:

- include paths
- exclude paths
- trusted paths
- one-click pause or rescan

### 2.3 Explicit Startup Authorization

The first startup must require explicit user authorization before the app does any of the following:

- scanning local directories
- indexing Skill files
- collecting runtime telemetry
- watching logs or local run traces
- building graph relations

This authorization step should be:

- visible
- revocable
- scoped
- auditable

Minimum authorization controls:

- approve selected scan roots
- approve telemetry mode
- approve whether raw content can be stored
- approve whether background watching is enabled
- review local storage location

If the user does not approve, the app must remain in a safe limited mode.

## 3. Product Modules

The product should be split into six major modules.

### 3.1 Skill Registry

Purpose:

- discover Skills on the machine
- normalize Skill metadata
- detect changes across versions
- manage scan scope and trust boundaries
- classify Skills by governance role and retained local information

Minimum outputs:

- Skill list
- source path
- skill type
- owner or source
- version fingerprint
- last indexed time
- governance role
- stored data classes
- storage sensitivity
- recommended scope
- bundle reuse policy

Important product rule:

- the registry should help users understand why a Skill that stores account information, server paths, runtime details, or other operational context must be handled differently from a development-only Skill

### 3.2 Skill Runtime Telemetry

Purpose:

- record runtime metrics for each Skill invocation
- measure cost, latency, success rate, and tool usage

Tracked fields should include:

- Skill id
- run id
- session id
- workspace
- start time
- end time
- duration
- first output latency if available
- prompt tokens
- completion tokens
- total tokens
- estimated cost
- model
- tool calls count
- error code
- success or failure

Important split:

- precise mode: when runtime emits direct Skill invocation events
- estimated mode: when only higher-level logs are available

The UI must clearly distinguish these two modes.

### 3.3 Analytics Center

Purpose:

- produce ranked daily and weekly analysis
- help users find both high-value and high-waste Skills

Example rankings:

- Top most used Skills
- Top highest token consumption
- Top slowest average latency
- Top highest failure rate
- Top best ROI Skills
- Top optimization candidates

### 3.4 Skill Graph

Purpose:

- visualize relations between Skills, tools, workspaces, outputs, and users
- make temporary local graph focus layers visible and reversible during exploration

Graph node candidates:

- Skill
- tool
- workspace
- artifact
- execution flow
- optimization proposal

Graph edge candidates:

- invokes
- depends_on
- co_occurs_with
- produces
- optimized_by
- packaged_as

Exploration UX should keep temporary scope layers explicit, for example:

- snapshot baseline
- pinned neighborhood
- search focus
- bounded trace overlay
- selected node context
- session-local navigation trail for back/forward node jumps
- cross-panel graph inspection so approved roots, indexed skills, analytics leaderboards, recent
  runs, telemetry intake import results, proposals, bundle inventory, recent packaging results,
  and local audit trail entries for root authorization or bundle lifecycle activity can jump back
  into the same local graph exploration flow without rescanning

These layers should be read-only, reversible, and must not silently mutate the stored graph snapshot.

### 3.5 Skill Optimization Engine

Purpose:

- convert telemetry and usage evidence into structured improvement suggestions

Important rule:

- the engine should not silently rewrite Skills
- it should generate proposals, patch drafts, and expected benefit estimates
- the user confirms before any real update

Example outputs:

- SKILL.md is too long and should be split
- repeated file reads should be replaced by a script
- a slow Skill should narrow its discovery scope
- a high-token Skill should move detailed content into references
- a commonly chained set of Skills should become a bundled workflow

### 3.6 Skill Studio

Purpose:

- visually compose Skills into reusable local workflows

Initial scope:

- drag-and-drop DAG-like orchestration
- explicit inputs and outputs
- execution order
- branching and retry policy
- reusable packaged workflow export

Do not start with a full general-purpose prompt canvas.
Start with Skill-centric orchestration.

## 4. Recommended Local Architecture

### 4.1 Data Storage

Recommended baseline:

- `SQLite` as the primary local database
- `JSONL` append-only event logs for raw telemetry intake
- optional local artifact directory for snapshots, exports, and packaged bundles

Why SQLite first:

- ships with the app easily
- single-file local storage
- supports transactions
- supports migrations
- supports FTS for search
- low operational cost
- easy local backup and export

Do not use a remote database as a baseline dependency.

### 4.2 Database Layout

Recommended local data layout:

- app database file
- raw telemetry event log files
- derived analytics snapshots
- packaged Skill exports
- user config and scope rules

Suggested host locations by OS:

- macOS: `~/Library/Application Support/<app-name>/`
- Windows: `%AppData%\\<app-name>\\`
- Linux: `~/.local/share/<app-name>/`

### 4.3 Storage Layers

Use three layers:

- config layer: scan roots, exclusions, UI preferences
- operational layer: normalized Skill metadata and runtime metrics
- archival layer: exports, snapshots, and bundle packages

### 4.4 Authorization Layer

Authorization must be a first-class local layer, not a one-time setup note.

Recommended authorization records:

- granted scan roots
- denied scan roots
- telemetry mode approval
- raw content storage approval
- background watcher approval
- authorization timestamp
- last modified by user timestamp

The app should not perform sensitive actions outside the approved policy state.

## 5. Core Data Model

Minimum tables or entities:

- `skills`
- `skill_versions`
- `skill_runs`
- `tool_calls`
- `invocation_edges`
- `workspaces`
- `artifacts`
- `metric_snapshots`
- `optimization_proposals`
- `workflow_bundles`
- `scan_roots`
- `scan_exclusions`
- `authorization_policies`
- `authorization_events`

Important Skill entity fields beyond the file system snapshot:

- governance role
- handled data classes
- storage policy
- reuse policy
- recommended scope
- persistent-context flag
- sensitive-operational-data flag

Important entity notes:

- `skills`: stable logical identity
- `skill_versions`: file fingerprint and parsed metadata per version
- `skill_runs`: per invocation metrics
- `invocation_edges`: Skill-to-Skill and Skill-to-tool runtime relations
- `metric_snapshots`: pre-aggregated daily and weekly rankings
- `workflow_bundles`: exported packaged Skills or orchestrated flows
- `authorization_policies`: active approved local behavior boundaries
- `authorization_events`: history of grant, deny, revoke, or update actions

## 6. Telemetry Ingestion Strategy

This product depends on having runtime observability.

There are three possible ingestion levels:

### Level A: Native Runtime Events

Best case.

The host runtime emits:

- Skill started
- Skill ended
- tool called
- token usage
- model info
- latency

This enables precise analytics.

### Level B: CLI / Log Parsing

Fallback case.

The app parses:

- terminal logs
- local run logs
- JSON traces
- output artifacts

This enables estimated analytics.

### Level C: Manual Review Records

Worst case but still useful.

The user manually records:

- whether the Skill was useful
- whether it should be optimized
- what failed

This is useful for optimization ranking even if token precision is missing.

## 7. MVP Proposal

The MVP should not start with drag-and-drop orchestration.

### MVP Scope

- local scan range setup
- first-run authorization gate
- Skill registry and indexing
- Skill metadata parsing
- local SQLite store
- telemetry ingestion in at least one usable mode
- daily top analysis
- Skill detail page
- optimization suggestion list

### MVP Exclusions

- full workflow canvas
- multi-user cloud sync
- remote database
- auto-rewrite of Skills
- large-scale team governance

## 8. Visual Product Structure

Recommended main tabs:

- Overview
- Skills
- Runs
- Analytics
- Graph
- Optimization
- Bundles
- Settings

Recommended first dashboard cards:

- Skills indexed
- runs today
- total tokens today
- slowest top Skills
- failure hotspots
- latest optimization proposals

## 9. Packaging Good Skills

The app should support turning strong local Skills into reusable engineering assets.

Packaging modes:

- export Skill folder as a reusable package
- export multiple chained Skills as a workflow bundle
- export metadata, references, and dependency manifest
- generate release notes and version fingerprint

The product should treat this as engineering packaging, not just zip download.

## 10. Non-Functional Requirements

- local-first
- offline-capable
- schema migration safe
- no silent destructive rewrites
- append-only raw event history
- fast local search
- safe large-directory scanning
- user-visible privacy controls

## 11. Main Risks

### 11.1 Observability Gap

If the runtime does not expose Skill-level invocation events, token and latency metrics may only be estimated.

### 11.2 Privacy Leakage

Prompt bodies and workspace paths may contain private content.

Default approach:

- store metrics and summaries first
- store raw content only with explicit consent
- require explicit startup authorization before any telemetry watcher is enabled

### 11.3 Scope Explosion

Scanning too many directories can create noise and performance problems.

Default approach:

- user-approved roots only
- lazy indexing
- incremental rescans

### 11.4 Optimization Drift

If optimization is automatic, it may damage working Skills.

Default approach:

- proposal first
- diff preview
- rollback path

## 12. Suggested Delivery Phases

### Phase 1

- startup authorization and consent policy
- local registry
- SQLite schema
- one telemetry source
- daily analytics

### Phase 2

- graph view
- optimization proposals
- bundle export

### Phase 3

- visual orchestration
- flow execution
- replay and debug

## 13. Immediate Next Design Questions

- what runtime or host emits the Skill execution events
- whether this app is desktop-first, web-local, or hybrid
- whether graph rendering is static analytics or live runtime graph
- whether workflow bundles are export-only or directly executable
- whether optimization proposals can patch SKILL files automatically after approval
