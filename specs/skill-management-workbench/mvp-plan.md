# Skill Management Workbench MVP Plan

## 1. MVP Goal

Deliver a local-first application that can:

- ask for startup authorization
- scan approved Skill directories
- index local Skills
- ingest at least one usable telemetry source
- show daily top analysis
- produce optimization suggestions

This MVP should prove the product loop:

discover -> observe -> analyze -> optimize

## 2. What MVP Must Include

### 2.1 Authorization Gate

Before anything else, MVP must include:

- first-run authorization wizard
- scan root approval
- telemetry mode approval
- background watcher approval
- local storage location review

### 2.2 Local Registry

MVP must:

- find `SKILL.md`
- parse frontmatter
- fingerprint versions
- show Skill inventory
- support manual rescan

### 2.3 Local Database

MVP must:

- initialize local SQLite
- run schema migrations
- store registry metadata
- store runtime metrics
- store authorization records

### 2.4 Telemetry Ingestion

MVP only needs one stable ingestion mode.

Recommended order:

1. parse available runtime or local logs
2. if native runtime events become available, upgrade later

### 2.5 Analytics Dashboard

MVP dashboard should include:

- indexed Skills
- runs today
- total tokens today
- top used Skills
- top slowest Skills
- top optimization candidates

### 2.6 Optimization List

MVP should generate simple proposal cards from data such as:

- high token cost
- high latency
- repeated failures
- overlong SKILL content
- repeated chain patterns

## 3. What MVP Should Exclude

- full drag-and-drop workflow studio
- multi-user sync
- remote database
- automatic Skill rewriting
- advanced package marketplace
- real-time collaborative graph editing

## 4. Suggested MVP Screens

- Onboarding / Authorization
- Overview
- Skills
- Skill Detail
- Runs
- Analytics
- Optimization
- Settings

## 5. Suggested MVP Milestones

### Milestone 1: Local Foundation

- app skeleton
- config directory creation
- SQLite initialization
- authorization model

### Milestone 2: Skill Registry

- scan roots
- Skill discovery
- metadata parsing
- version fingerprinting

### Milestone 3: Telemetry

- define run event schema
- implement one ingestion path
- normalize into database

### Milestone 4: Analytics

- daily aggregates
- top rankings
- overview dashboard

### Milestone 5: Optimization

- proposal rules
- proposal list UI
- evidence display

## 6. MVP Success Criteria

The MVP is successful if a user can:

1. install and launch the app locally
2. explicitly approve scan scope and telemetry mode
3. index Skills from selected folders
4. see which Skills are used most, cost most, and fail most
5. identify at least one concrete Skill optimization candidate

## 7. Recommended Technical Baseline

- local-first app
- SQLite database
- JSONL raw event log
- one-way proposal engine
- no silent mutations

## 8. Key MVP Risks

### 8.1 No Stable Telemetry Source

If the runtime cannot expose enough data, MVP may need to begin with estimated metrics only.

### 8.2 Overscanning

If onboarding does not constrain scope tightly, local indexing will become noisy and slow.

### 8.3 UI Overreach

If workflow studio is started too early, MVP delivery will slip badly.

## 9. Immediate Build Questions

- what runtime are we integrating with first
- do we prefer desktop shell or local web app shell
- what logs or event streams are already accessible today
- what fields are mandatory for a valid `skill_run`
