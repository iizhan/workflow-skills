# Skill Management Workbench Tech Selection Draft

## 1. Goal

Choose a practical technical baseline for a local-first Skill observability and management application.

This decision must optimize for:

- fast MVP delivery
- local filesystem access
- embedded SQLite
- explicit startup authorization
- future graph and workflow studio support
- compatibility with a Node-centric Skill ecosystem

## 2. Main Technical Decision Areas

This product needs choices in five areas:

- application shell
- frontend stack
- local backend and scanner runtime
- database and storage
- telemetry ingestion path

## 3. Application Shell Options

### Option A: Local Web App + Local Node Service

Shape:

- browser UI
- local Node backend
- local SQLite file

Pros:

- fastest to prototype
- easiest frontend iteration
- lowest initial complexity
- best for proving data model and telemetry loop

Cons:

- weaker app feel
- weaker packaging story for non-technical users
- local service lifecycle needs separate handling

Best use:

- architecture spike
- internal prototype
- telemetry proof of concept

### Option B: Electron App

Shape:

- Electron shell
- React frontend
- embedded Node process
- embedded SQLite

Pros:

- best alignment with current Node ecosystem
- easy local filesystem access
- easy process management
- good packaging path
- easy integration with local logs, scanners, and SQLite

Cons:

- heavier memory footprint
- larger app bundle
- more security hardening needed

Best use:

- fastest real product MVP
- best fit if the team stays JavaScript-first

### Option C: Tauri App

Shape:

- Tauri shell
- web frontend
- Rust host
- embedded SQLite

Pros:

- smaller footprint
- better native packaging story
- strong local app feel

Cons:

- higher implementation complexity
- Rust bridge work increases delivery cost
- slower if the team is primarily Node/TS oriented

Best use:

- later optimization after product fit is proven

## 4. Recommended Shell Choice

### Recommendation

Use `Electron` for the first real MVP.

Reason:

- this product depends heavily on local filesystem scanning
- this product benefits from direct Node integration
- the current Skill ecosystem is already Node-friendly
- telemetry parsing and SQLite access are simpler in Electron than in Tauri
- future drag-and-drop studio is easy to build with React inside Electron

### Delivery Strategy

- short spike: local web + Node service is acceptable for exploration
- actual MVP baseline: Electron app
- future optimization path: optionally migrate to Tauri if footprint becomes a major product issue

## 5. Frontend Stack Options

### Recommendation

Use:

- `React`
- `TypeScript`
- `Vite`
- `TanStack Query`
- lightweight local state store such as `Zustand`
- graph visualization library later, not in the first commit

Reason:

- mature ecosystem
- fast iteration
- easy local dashboard and studio UX
- good support for drag-and-drop and graph views

## 6. Local Backend Runtime

### Recommendation

Use a local `Node.js` service layer inside the app.

Responsibilities:

- authorization policy enforcement
- scan orchestration
- local filesystem watching
- telemetry ingestion
- SQLite reads and writes
- analytics snapshot jobs

### Suggested Internal Split

- `registry service`
- `telemetry service`
- `analytics service`
- `graph service`
- `bundle service`
- `authorization service`

Do not split these into separate processes in MVP unless needed.

## 7. Database and Storage Selection

### Recommendation

Use:

- `SQLite` as the primary operational database
- append-only `JSONL` for raw event storage
- app-local directories for bundles, backups, and snapshots

### Recommended Node Libraries

- `better-sqlite3` if synchronous local access is acceptable and simplicity is preferred
- alternatively `sqlite3` or `libsql` wrappers if async patterns are strongly preferred

### Recommendation Detail

For MVP, prefer `better-sqlite3`.

Reason:

- very simple local usage
- excellent for desktop-style apps
- predictable transaction handling
- fast enough for this workload

## 8. Telemetry Ingestion Options

This is the most critical technical decision after shell choice.

### Option A: Native Runtime Event Adapter

Best case.

The Skill host emits structured events such as:

- Skill started
- Skill completed
- token usage
- tool call metrics
- error status

Pros:

- precise telemetry
- best analytics quality
- best graph accuracy

Cons:

- depends on host runtime integration support

### Option B: Log Parser Adapter

Fallback path.

The app parses:

- local CLI logs
- local JSON traces
- structured terminal summaries
- run artifacts

Pros:

- usable without deep runtime integration
- MVP-friendly

Cons:

- lower accuracy
- more brittle

### Option C: Manual Review Adapter

Fallback for gaps.

The user can mark:

- useful Skill
- expensive Skill
- failed Skill
- candidate for optimization

Pros:

- low integration cost
- useful for proposal generation

Cons:

- not enough alone for high-quality observability

## 9. Recommended Telemetry Strategy

Use a layered strategy:

### MVP

- start with `log parser adapter`
- support `manual review adapter`

### Phase 2

- add `native runtime event adapter` when host integration becomes possible

This keeps MVP shippable without blocking on deep runtime changes.

## 10. Graph Visualization Selection

The graph view is important, but it should not block MVP.

### Recommendation

Use a graph library only after registry and telemetry are stable.

Good candidates later:

- `React Flow` for workflow editing
- `Cytoscape.js` for relationship graph exploration

Suggested split:

- `Cytoscape.js` for Skill relationship graph
- `React Flow` for drag-and-drop Skill studio

Do not try to force one library to solve both graph analytics and workflow authoring if it hurts UX.

## 11. File Watching and Scanning

### Recommendation

Use:

- one-time initial scan
- incremental rescan
- optional background watcher after approval

Suggested Node tooling:

- native filesystem traversal for deterministic scans
- `chokidar` for background watch mode

Important rule:

- no watcher starts before user authorization

## 12. Packaging and Export Strategy

### Recommendation

Use a local manifest-driven bundle format.

Each bundle should include:

- bundle manifest
- Skill files
- version fingerprint
- dependency summary
- export metadata

This should be a real local engineering package, not just a visual export.

## 13. Security and Authorization Choice

### Recommendation

Treat startup authorization as a product gate and a runtime policy layer.

The app should persist:

- approved roots
- approved telemetry mode
- approved background watch state
- raw content storage preference

The service layer must refuse unauthorized actions even if the UI tries to call them.

## 14. MVP Recommended Stack Summary

Recommended MVP stack:

- shell: `Electron`
- frontend: `React + TypeScript + Vite`
- local backend: `Node.js`
- database: `SQLite`
- SQLite library: `better-sqlite3`
- raw events: `JSONL`
- watcher: `chokidar`
- analytics: local scheduled aggregation jobs

## 15. Build Order Recommendation

Recommended implementation order:

1. Electron shell and config directories
2. authorization flow
3. SQLite initialization and migrations
4. registry scanner
5. log-based telemetry ingestion
6. overview analytics
7. optimization proposal list
8. graph rendering
9. workflow studio

## 16. Technical Decision Summary

Final recommendation for now:

- choose `Electron` over Tauri for the first productized MVP
- choose `SQLite + JSONL` for local persistence
- choose `Node.js` for backend runtime
- choose `log parser first, native runtime adapter later`
- choose `Cytoscape.js` for graph and `React Flow` for orchestration when those phases start

This stack is not the lightest, but it is the highest-probability route to a strong first working version.
