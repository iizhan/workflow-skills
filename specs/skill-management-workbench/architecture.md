# Skill Management Workbench Architecture Draft

## 1. Architecture Goal

Build a local-first Skill observability and management application whose database, telemetry, search index, graph data, and workflow bundles all live with the app on the user's machine.

This architecture must prioritize:

- explicit user authorization
- offline usability
- low local operational cost
- safe incremental indexing
- proposal-driven optimization

## 2. Recommended Runtime Shape

Recommended application shape:

- local desktop shell or local-first web app shell
- embedded local backend service
- embedded local SQLite database
- local file watcher and scanner
- local analytics scheduler

Recommended high-level topology:

1. UI layer
2. local API/service layer
3. ingestion layer
4. storage layer
5. analytics and optimization layer

## 3. Main Components

### 3.1 UI Layer

Responsibilities:

- first-run authorization flow
- scan scope setup
- Skills list and details
- runtime analytics dashboard
- graph visualization
- optimization proposal review
- workflow studio

The UI must show whether the app is in:

- limited mode
- approved scan mode
- approved telemetry mode
- background watch mode

### 3.2 Local API / Service Layer

Responsibilities:

- mediate UI requests
- enforce authorization policy
- coordinate indexing jobs
- write telemetry events
- read analytics and graph views
- handle export and packaging

Recommended shape:

- local HTTP server or IPC service
- strongly typed internal commands
- transaction-aware write services

### 3.3 Registry Scanner

Responsibilities:

- traverse approved directories
- locate `SKILL.md`
- parse frontmatter and metadata
- detect source type and ownership
- compute stable fingerprints
- create version records

Rules:

- only scan approved roots
- skip excluded roots
- avoid hidden or large irrelevant directories unless explicitly approved
- support incremental rescans

### 3.4 Telemetry Ingestion Engine

Responsibilities:

- ingest runtime events
- normalize precise and estimated telemetry
- map events to Skills, tools, workspaces, and sessions
- persist raw and normalized records

Recommended input modes:

- native runtime event stream
- log parser
- manual review records

The engine must attach a confidence level to each run:

- precise
- inferred
- manual

### 3.5 Analytics Engine

Responsibilities:

- aggregate daily and weekly metrics
- build top rankings
- detect hotspots
- feed optimization proposals

Recommended strategy:

- raw event writes happen immediately
- heavy aggregations happen asynchronously
- dashboards read from snapshot tables plus selective live queries

### 3.6 Graph Builder

Responsibilities:

- derive relations from registry and runtime events
- update node and edge stores
- support graph traversal for UI

Sources:

- static Skill metadata
- runtime invocation chains
- tool usage relations
- workflow bundle definitions

### 3.7 Optimization Proposal Engine

Responsibilities:

- detect inefficiencies
- cluster repeated issues
- generate proposals instead of silent mutations
- estimate likely impact

Output shape:

- finding
- evidence
- suggested fix
- estimated benefit
- optional patch draft

### 3.8 Bundle / Packaging Engine

Responsibilities:

- export a Skill or chain of Skills
- snapshot metadata and dependencies
- produce versioned bundle manifests
- support import later

## 4. Authorization-First Boot Flow

The app must not start in full-power mode.

Recommended boot sequence:

1. launch app
2. initialize local config and empty database if missing
3. check active authorization policy
4. if no active policy exists, enter limited mode
5. show authorization wizard
6. user approves:
   - scan roots
   - exclusions
   - telemetry mode
   - raw content storage option
   - background watching option
7. persist authorization policy
8. start scanner and approved watchers

Limited mode should allow:

- viewing onboarding
- selecting folders
- reviewing permissions
- importing a backup

Limited mode should not allow:

- background scanning
- telemetry watching
- graph construction from private runtime traces

## 5. Local Storage Design

### 5.1 Primary Database

Use `SQLite` as the primary operational database.

Recommended responsibilities:

- normalized Skill metadata
- scan scope rules
- runtime metrics
- graph nodes and edges
- optimization proposals
- analytics snapshots

### 5.2 Raw Event Logs

Use append-only `JSONL` files for:

- raw telemetry input
- import history
- authorization audit

Why:

- easier debugging
- replay capability
- safer than relying only on transformed rows

### 5.3 File Storage Areas

Suggested logical directories:

- `config/`
- `db/`
- `events/`
- `snapshots/`
- `bundles/`
- `backups/`

## 6. Suggested SQLite Schema Areas

### 6.1 Registry Tables

- `skills`
- `skill_versions`
- `scan_roots`
- `scan_exclusions`
- `scan_runs`

### 6.2 Runtime Tables

- `skill_runs`
- `tool_calls`
- `sessions`
- `workspaces`
- `run_tags`

### 6.3 Graph Tables

- `graph_nodes`
- `graph_edges`
- `edge_evidence`

### 6.4 Optimization Tables

- `optimization_proposals`
- `proposal_evidence`
- `proposal_actions`

### 6.5 Authorization Tables

- `authorization_policies`
- `authorization_events`

### 6.6 Analytics Tables

- `metric_snapshots`
- `daily_skill_metrics`
- `weekly_skill_metrics`
- `leaderboards`

## 7. Data Pipeline

Recommended pipeline:

1. source event or file discovered
2. write raw event or scan result to append-only log
3. normalize into SQLite
4. update derived snapshots asynchronously
5. update graph edges
6. surface analytics and proposals in UI

This keeps:

- raw auditability
- structured queryability
- cheap incremental refresh

## 8. Telemetry Accuracy Model

The product must visibly model telemetry quality.

Recommended fields:

- `capture_mode`
- `confidence_score`
- `source_type`
- `is_billable_estimate`

Examples:

- direct runtime token event: confidence high
- parsed terminal summary: confidence medium
- manual entry: confidence low

## 9. Performance Strategy

Because this is local-first, performance must remain predictable on laptops.

Recommended strategies:

- incremental scanning
- debounce file watcher updates
- batch writes to SQLite
- snapshot heavy analytics
- lazy-load graph neighborhoods
- cap background scan concurrency

## 10. Privacy and Safety Model

Defaults should be conservative.

Recommended defaults:

- store metrics before raw prompt bodies
- hide full file paths in summary dashboards unless expanded
- do not enable background watchers without approval
- allow one-click pause of telemetry
- allow per-root revoke

## 11. Failure and Recovery Model

The app should handle:

- corrupted event logs
- partial schema migrations
- revoked scan roots
- deleted Skill directories
- duplicate Skill identities

Recommended recovery features:

- reindex selected root
- rebuild graph
- rebuild analytics snapshots
- validate local database
- export backup before migration

## 12. MVP Technical Recommendation

For MVP, keep the stack small:

- frontend: local web UI or desktop shell UI
- backend: Node.js local service
- database: SQLite
- raw events: JSONL
- graph queries: SQLite tables first, not a separate graph database

This keeps the first version shippable and local.

## 13. Open Technical Questions

- what exact host runtime can emit Skill invocation events
- whether the app should ship as Electron, Tauri, or web+local daemon
- whether graph rendering should use precomputed neighborhoods or live queries
- how much raw prompt content can be stored by default
- how imported workflow bundles should be versioned and executed
