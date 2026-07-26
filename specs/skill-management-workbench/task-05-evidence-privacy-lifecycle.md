# TASK-05 Evidence Events, Storage, Privacy and Lifecycle

## 1. Document Status

- Task: `TASK-05`
- Version: `1.0.0`
- Status: `accepted`
- Accepted at: `2026-07-14`
- Impact: `high`
- Prerequisites: `TASK-01`, `TASK-02`, `TASK-03`, `TASK-04`
- Goal: define one evidence contract for ingestion, privacy filtering, persistence, scoring eligibility, archive, recovery and user-requested cleanup.

This task defines the data and lifecycle protocol first. It does not immediately migrate the database, enable raw prompt capture, or delete existing local data.

## 2. Problem Statement

The current workbench has the right basic direction but leaves lifecycle decisions implicit:

- raw JSONL events are append-only, but there is no formal event deduplication index or corrupt-line quarantine;
- SQLite stores operational projections and metrics, but it cannot distinguish current scoring evidence from historical evidence;
- telemetry authorization controls whether imports are allowed, but does not define retention, quota, redaction or purge behavior;
- backups contain local event data, so cleaning the active store does not automatically remove old copies;
- raw prompt/output content is normally not persisted, but the contract for optional raw content, secrets and private paths is not centralized.

Without these rules, long-running projects can accumulate unbounded data, score against stale or duplicated evidence, or give users no reliable way to understand and remove sensitive records.

## 3. Design Principles

1. Evidence is append-first and replayable; normalized tables are rebuildable projections.
2. Collection, storage, scoring and export are separate permissions and lifecycle decisions.
3. Default collection is metadata-only. Raw prompt, model output and file content are opt-in and separately authorized.
4. Every score-affecting record carries source, capture mode, confidence, age and eligibility information.
5. Archive is not deletion. Purge is explicit, scoped, previewed and audited.
6. A retention default is configurable policy, not a hidden hard limit or a promise of permanent retention.
7. Project scope remains bounded by the authorized project/root policy from TASK-04; lifecycle operations cannot expand scan scope.

## 4. Evidence Classes

Every persisted record belongs to exactly one primary class. Derived projections may reference several classes but must retain those references.

| Class | Examples | Default persistence | Current scoring |
| --- | --- | --- | --- |
| `runtime_metadata` | Skill run state, duration, tool count, workspace/session refs | hot SQLite + raw event | eligible when validated |
| `provider_usage` | prompt/completion/total tokens, model/provider and cost source | hot SQLite + raw event | eligible with source/confidence rules |
| `tool_events` | tool started/completed/failed, latency and status | raw event; selected aggregates hot | eligible for flow/latency metrics |
| `user_feedback` | confirmed rating, rejection reason, correction or acceptance | hot SQLite + raw event | eligible after validation |
| `onboarding_audit` | binding, authorization, preview, apply, verify, cleanup actions | audit table + raw event | not a quality score input |
| `profile_evidence` | detected stack, architecture facts, commands, fingerprints and unknowns | project Profile + evidence reference | eligible for freshness/coverage only |
| `raw_content_optional` | raw prompt/output or selected file excerpt | encrypted/isolated optional store | never directly eligible |

The application must never infer that a full conversation is available merely because runtime metadata exists.

## 5. Unified Evidence Envelope

TASK-03's event envelope remains the transport contract. TASK-05 adds lifecycle fields:

```json
{
  "event_id": "evt_01",
  "event_schema_version": "1.0.0",
  "event_type": "skill_run.completed",
  "occurred_at": "2026-07-14T12:00:00.000Z",
  "ingested_at": "2026-07-14T12:00:02.000Z",
  "source_type": "runtime",
  "source_ref": "codex-local-runtime",
  "workspace_ref": "ws_01",
  "session_ref": "sess_01",
  "policy_ref": "policy_01",
  "capture_mode": "precise",
  "confidence": "high",
  "content_class": "runtime_metadata",
  "redaction_status": "not_applicable",
  "retention_class": "runtime_hot",
  "eligibility": "current",
  "payload": {}
}
```

Required rules:

- `event_id` is stable across retries and imports; re-importing the same event is a no-op.
- `event_schema_version` is independent from database and Workflow versions.
- `occurred_at` is source time; `ingested_at` is local receipt time.
- `capture_mode` and `confidence` must not be silently upgraded by a parser.
- `content_class` controls redaction and retention defaults.
- `eligibility` is a projection decision and may be recalculated; it is not a claim that the source event was false.
- `source_ref` stores a hash or approved relative reference by default, never an uncontrolled absolute private path in user-facing views.

## 6. Evidence Pipeline

```text
Adapter / scanner / user action
  → validate envelope and scope
  → redact sensitive fields
  → append raw JSONL event
  → register event_id and checksum
  → normalize hot SQLite projection
  → update aggregates and evidence references
  → classify current/archive eligibility
  → expose status, score and audit trail
```

### 6.1 Ingest

- Reject events outside the active authorization policy or approved project scope.
- Validate required fields, timestamp format, event type and schema version.
- Store rejected input only as a non-content error summary; do not retain the rejected raw line by default.
- A duplicate `event_id` with the same checksum is idempotently ignored.
- A duplicate `event_id` with a different checksum is quarantined as `EVENT_ID_COLLISION` and never replaces the first event.

### 6.2 Redaction

Before persistence, redact API keys, bearer tokens, passwords, private environment values, cookies, authorization headers and secret-like fields. Preserve only field names, redaction marker and a stable hash where correlation is useful.

Project paths are represented as a project-relative path or stable path hash unless the user explicitly asks to reveal the path in a local detail view. Raw content remains disabled unless separately authorized.

### 6.3 Normalize and aggregate

SQLite stores query-oriented records such as `skill_runs`, `daily_skill_metrics`, operation logs and audit events. Every normalized record must retain:

- source event id(s) or an evidence reference;
- project/workspace/session identity;
- capture mode, confidence and source type;
- first and last observed timestamps;
- current eligibility and exclusion reason, if excluded.

Aggregates must be rebuildable from raw events. Rebuilding must not create duplicate runs or double-count provider and estimated token values.

## 7. Storage Tiers

### 7.1 Hot operational store

SQLite contains current project state, normalized runs, recent evidence summaries, daily metrics, operation logs, cleanup jobs and indexes required by the UI. It is optimized for current dashboards and bounded by a configurable hot-window policy.

### 7.2 Append-only event store

The `events/` directory contains immutable JSONL segments. Segment files should be partitioned by project, content class and UTC month rather than growing one unlimited file. A segment manifest records schema version, event count, byte count, checksum, time range and archive status.

### 7.3 Cold archive

Archived segments are compressed and checksum-protected under an `events/archive/` area or an equivalent configured local archive root. The archive is read-only to normal scoring and dashboard writes. Archive index metadata remains queryable without loading raw payloads.

### 7.4 Optional raw-content store

Raw prompt/output evidence, when explicitly enabled, is isolated from metadata events, encrypted where the platform supports it, excluded from default backups and never sent to a remote source by this local-first MVP. The UI must show whether a record contains optional raw content before export or deletion.

### 7.5 Backups

Backups are a separate retention domain. A cleanup operation must show whether active data, archive data and existing backups are affected. Deleting active evidence does not silently rewrite old backups; backup deletion or expiration requires a separate explicit scope.

## 8. Privacy and Authorization Defaults

Default policy:

- raw prompt body: off;
- raw model output: off;
- full file content: off;
- secrets and private environment values: always redacted;
- absolute private paths in summaries: off;
- metadata telemetry: only after project/source authorization;
- background watch: off, as already defined by TASK-04;
- export of raw content: off unless the user explicitly includes it.

Changing raw-content authorization must not retroactively reconstruct content that was never stored. Revoking it stops future collection; existing raw content remains subject to the selected cleanup policy and is clearly listed in the privacy screen.

## 9. Retention, Quota and Archive Policy

### 9.1 Policy shape

Retention is configurable globally and may be overridden per project or evidence class when the user has permission. The policy must expose:

```yaml
retention:
  hot_days: 90
  archive_after_days: 90
  purge_after_days: null
  max_raw_events: 100000
  max_hot_bytes: 1073741824
  max_archive_bytes: 5368709120
  raw_content_days: 7
  keep_audit_events: true
```

These values are initial defaults for a local desktop install, not universal compliance requirements. `null` means no automatic time-based purge for that class, subject to disk quotas and user action.

### 9.2 Lifecycle rules

- Recent evidence remains hot while inside the hot window and quota.
- Evidence outside the hot window is archived when archive is enabled and the record is valid.
- Archive records are excluded from current health, optimization and automatic Skill selection by default.
- Archived evidence may be used for explicit historical trend views or a user-requested offline report, with an “historical” label.
- Audit events are retained by default, but their payload must remain metadata-only and support user-requested export/cleanup according to local policy.
- Optional raw content has a shorter default retention and is purged before metadata unless the user changes the policy.
- Quota pressure is surfaced before automatic archive or purge; automatic purge is disabled by default for important audit and Profile evidence.

### 9.3 Eligibility calculation

Current scoring eligibility considers:

1. source authorization is still valid or the event was valid when collected;
2. event schema and payload passed validation;
3. event is inside the current hot window, unless explicitly included as historical evidence;
4. capture mode and confidence meet the metric's minimum threshold;
5. sample size is sufficient for the metric;
6. event has not already been represented by a stronger duplicate;
7. token values have a source and are not estimated and provider-reported values for the same run at the same time.

When a record is excluded, store a machine-readable reason such as `stale`, `low_confidence`, `duplicate`, `redacted_required`, `insufficient_sample`, `archived` or `policy_revoked`.

## 10. Cleanup and User Controls

Cleanup is a separate workflow from unbinding a project.

```text
choose scope
  → calculate affected hot records, archive segments and backups
  → show counts, bytes, content classes and score impact
  → optional export
  → user confirms destructive step
  → delete or archive atomically per scope
  → rebuild projections and metrics
  → write cleanup audit record
  → show completed, partial or failed result
```

Supported scopes:

- selected project;
- selected evidence class;
- selected time range;
- active hot data only;
- archive segments;
- optional-content records;
- local backups, as a separate explicit scope;
- all local evidence, with a stronger confirmation.

The preview must show:

- event/record count and estimated bytes;
- whether current scores, trends or proposals will change;
- whether backups still retain copies;
- records that are protected by policy or require a separate action;
- exact irreversible steps.

If deletion fails partway through, the operation remains visible as `partial`, the untouched data is not reported as deleted, and a retry/recovery action is available.

## 11. Replay, Corruption and Recovery

- Raw event segments are immutable after sealing.
- A malformed JSONL line is moved to a quarantine record with file, line number, checksum and error category; it is not silently discarded.
- A checksum mismatch marks the segment `corrupt` and blocks it from scoring until repaired or explicitly excluded.
- Replaying an empty SQLite database from valid raw events must reproduce normalized run identity and aggregate totals within the documented rounding rules.
- Projection rebuilds use event ids and deterministic aggregation keys, so retries are safe.
- Migration or repair never overwrites raw evidence; it creates a new projection or archive manifest.
- Cleanup and restore actions record the backup id, segment id or event range they touched.

## 12. Suggested States and Error Codes

Evidence lifecycle states:

- `received`
- `validated`
- `redacted`
- `projected`
- `eligible`
- `excluded`
- `archived`
- `quarantined`
- `purge_pending`
- `purged`
- `purge_failed`

Error codes:

| Code | Meaning | User action |
| --- | --- | --- |
| `EVIDENCE_SCOPE_DENIED` | Event is outside authorized project/source scope | Review authorization |
| `EVIDENCE_SCHEMA_INVALID` | Required field or version is invalid | Inspect source adapter |
| `EVENT_ID_COLLISION` | Same event id has different content | Keep first event and inspect source |
| `EVIDENCE_REDACTION_FAILED` | Sensitive field could not be safely filtered | Do not persist payload; review source |
| `EVIDENCE_SEGMENT_CORRUPT` | Checksum or sealed segment is invalid | Restore or quarantine segment |
| `EVIDENCE_QUOTA_REACHED` | Storage quota is reached | Archive, export or clean selected data |
| `PURGE_CONFIRMATION_REQUIRED` | Destructive cleanup has no confirmed preview | Review and confirm scope |
| `PURGE_PARTIAL` | Cleanup completed only for part of the scope | Review failed items and retry |
| `PROJECTION_REBUILD_REQUIRED` | SQLite view cannot be trusted after change | Rebuild from raw events |

## 13. Implementation Impact

Expected follow-up changes:

- extend `event-model.md` with lifecycle fields and redaction rules;
- add event registry/idempotency and evidence references to the database schema;
- add archive manifests, segment rotation and quarantine handling below `events/`;
- split authorization for metadata telemetry, raw content and source categories;
- add retention policy and cleanup operation records;
- extend `TelemetryService` so provider and estimated token fields retain source and eligibility instead of being merged blindly;
- add historical/excluded labels to health, trend and proposal queries;
- replace frontend-only onboarding logs with the persistent operation log required by TASK-04;
- make backup listings report whether they contain affected evidence classes;
- add a privacy/retention panel with preview-before-delete behavior.

## 14. Acceptance Criteria

- [ ] Every persisted evidence event has stable id, schema version, source, capture mode, confidence, content class and retention metadata.
- [ ] Re-importing the same event is idempotent; event-id collisions are quarantined.
- [ ] Raw prompt/output and file content are disabled by default and never enter normal FTS or scoring.
- [ ] Secrets are redacted before raw event persistence.
- [ ] Raw JSONL is append-only, segmented, checksummed and replayable.
- [ ] Corrupt lines/segments are visible and excluded from scoring instead of silently ignored.
- [ ] Hot SQLite projections can be rebuilt from valid raw events without double-counting.
- [ ] Current scores use explicit eligibility rules and distinguish precise, inferred and historical evidence.
- [ ] Retention and quota defaults are configurable, visible and do not silently purge protected audit/Profile data.
- [ ] Cleanup previews scope, count, bytes, score impact and backup implications before confirmation.
- [ ] Cleanup is audited and reports complete, partial or failed outcomes.
- [ ] Unbinding a project does not delete its evidence; evidence cleanup is a separate confirmed action.

## 15. Out of Scope

- No remote evidence synchronization or team-wide data lake.
- No claim of legal/compliance retention defaults for every jurisdiction.
- No automatic permanent deletion of decision memory; memory lifecycle remains governed by `TASK-08`.
- No mandatory encryption scheme beyond platform-supported local protection in this task.
- No automatic raw prompt/output capture.
- No deletion of project source files as part of evidence cleanup.

## 16. Accepted Decisions

1. Evidence is classified into runtime metadata, provider usage, tool events, user feedback, onboarding audit, Profile evidence and optional raw content.
2. The event envelope adds schema version, ingest time, capture/confidence, content class, retention class and scoring eligibility.
3. Raw events remain append-only and replayable; duplicate ids are idempotent and collisions are quarantined.
4. SQLite is a hot projection; JSONL is the raw event source; compressed archives are historical and excluded from current scoring by default.
5. Raw prompt/output and full file content are off by default, with secrets always redacted.
6. Retention, quota and archive are configurable policies with local defaults; automatic purge of important audit/Profile evidence is off by default.
7. Cleanup is a separate preview-confirm-audit workflow and does not happen implicitly during unbind.
8. Historical evidence can be used only in explicitly labeled trend/report views and cannot silently influence current health or optimization decisions.

This task is accepted. Evidence ingestion, storage, scoring, archive, privacy and cleanup implementation must follow this protocol.
