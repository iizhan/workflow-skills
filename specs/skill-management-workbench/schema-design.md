# Skill Management Workbench Schema Design Draft

## 1. Schema Goals

The local database schema must support:

- Skill discovery and version tracking
- scan scope and authorization boundaries
- runtime telemetry and aggregation
- graph relation building
- optimization proposal generation
- bundle export records
- local-first upgrade and migration

The schema should be optimized for:

- SQLite compatibility
- append-friendly write patterns
- incremental indexing
- offline analytics

## 2. Design Principles

- use UUID-like text ids for portable local records
- keep raw events outside the normalized schema when possible
- use normalized tables for operational queries
- use snapshot tables for dashboard speed
- avoid premature microservices-style fragmentation

## 3. Core Table Groups

### 3.1 Authorization and Scope

#### `authorization_policies`

Purpose:

- current active local consent boundary

Suggested fields:

- `id`
- `name`
- `status`
- `telemetry_mode`
- `allow_raw_content`
- `allow_background_watch`
- `storage_root`
- `created_at`
- `updated_at`
- `activated_at`
- `revoked_at`

Notes:

- only one active policy should exist at a time
- policy changes should not overwrite audit history

#### `authorization_events`

Purpose:

- audit trail of grant, deny, revoke, and modify actions

Suggested fields:

- `id`
- `policy_id`
- `event_type`
- `event_summary`
- `actor_type`
- `created_at`
- `metadata_json`

#### `scan_roots`

Purpose:

- approved scan roots

Suggested fields:

- `id`
- `policy_id`
- `path`
- `path_hash`
- `root_type`
- `is_trusted`
- `is_enabled`
- `created_at`
- `updated_at`

#### `scan_exclusions`

Purpose:

- excluded paths under or outside a root

Suggested fields:

- `id`
- `scan_root_id`
- `path`
- `path_hash`
- `reason`
- `created_at`

#### `scan_runs`

Purpose:

- execution record for each indexing pass

Suggested fields:

- `id`
- `policy_id`
- `trigger_type`
- `started_at`
- `finished_at`
- `status`
- `roots_scanned`
- `files_seen`
- `skills_found`
- `skills_changed`
- `error_count`
- `summary_json`

### 3.2 Skill Registry

#### `skills`

Purpose:

- stable logical Skill identity

Suggested fields:

- `id`
- `canonical_name`
- `display_name`
- `source_type`
- `source_path`
- `source_path_hash`
- `owner_label`
- `is_active`
- `first_seen_at`
- `last_seen_at`

Notes:

- one record per logical Skill path identity
- not one record per version

#### `skill_versions`

Purpose:

- immutable-ish versioned snapshots of a Skill

Suggested fields:

- `id`
- `skill_id`
- `version_fingerprint`
- `content_hash`
- `frontmatter_name`
- `frontmatter_description`
- `tokenized_size_estimate`
- `references_count`
- `scripts_count`
- `assets_count`
- `line_count`
- `detected_at`
- `is_current`
- `metadata_json`

#### `skill_parse_issues`

Purpose:

- parse errors or warnings that affect indexing quality

Suggested fields:

- `id`
- `skill_version_id`
- `severity`
- `issue_type`
- `message`
- `created_at`

### 3.3 Runtime and Telemetry

#### `sessions`

Purpose:

- conversation or execution session boundary

Suggested fields:

- `id`
- `source_type`
- `workspace_id`
- `started_at`
- `ended_at`
- `metadata_json`

#### `workspaces`

Purpose:

- local project or execution location context

Suggested fields:

- `id`
- `name`
- `root_path`
- `root_path_hash`
- `source_type`
- `created_at`
- `updated_at`

#### `skill_runs`

Purpose:

- per invocation runtime record

Suggested fields:

- `id`
- `skill_id`
- `skill_version_id`
- `session_id`
- `workspace_id`
- `capture_mode`
- `confidence_score`
- `source_type`
- `started_at`
- `first_output_at`
- `finished_at`
- `duration_ms`
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `estimated_cost_usd`
- `model_name`
- `tool_call_count`
- `status`
- `error_code`
- `error_summary`
- `summary_json`

Indexes recommended:

- by `skill_id, started_at`
- by `workspace_id, started_at`
- by `status, started_at`

#### `tool_calls`

Purpose:

- tool-level breakdown under a Skill run

Suggested fields:

- `id`
- `skill_run_id`
- `tool_name`
- `tool_namespace`
- `started_at`
- `finished_at`
- `duration_ms`
- `status`
- `summary_json`

#### `run_tags`

Purpose:

- attach local labels to runs

Suggested fields:

- `id`
- `skill_run_id`
- `tag`
- `created_at`

### 3.4 Graph and Relations

#### `graph_nodes`

Purpose:

- normalized node storage for graph rendering

Suggested fields:

- `id`
- `node_type`
- `ref_id`
- `display_name`
- `metadata_json`
- `updated_at`

#### `graph_edges`

Purpose:

- normalized graph edge storage

Suggested fields:

- `id`
- `edge_type`
- `from_node_id`
- `to_node_id`
- `weight`
- `first_seen_at`
- `last_seen_at`
- `metadata_json`

#### `edge_evidence`

Purpose:

- evidence backing an edge

Suggested fields:

- `id`
- `graph_edge_id`
- `evidence_type`
- `ref_id`
- `created_at`

### 3.5 Analytics and Snapshots

#### `daily_skill_metrics`

Purpose:

- pre-aggregated daily per-Skill metrics

Suggested fields:

- `id`
- `metric_date`
- `skill_id`
- `runs_count`
- `success_count`
- `failure_count`
- `avg_duration_ms`
- `max_duration_ms`
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `estimated_cost_usd`
- `tool_call_count`
- `updated_at`

#### `weekly_skill_metrics`

Purpose:

- pre-aggregated weekly per-Skill metrics

Suggested fields:

- `id`
- `metric_week`
- `skill_id`
- `runs_count`
- `success_count`
- `failure_count`
- `avg_duration_ms`
- `max_duration_ms`
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `estimated_cost_usd`
- `tool_call_count`
- `updated_at`

#### `leaderboards`

Purpose:

- ranked result cache for UI

Suggested fields:

- `id`
- `period_type`
- `period_key`
- `board_type`
- `rank_position`
- `entity_type`
- `entity_id`
- `score_value`
- `score_unit`
- `generated_at`
- `metadata_json`

#### `metric_snapshots`

Purpose:

- snapshot registry and operational status

Suggested fields:

- `id`
- `snapshot_type`
- `snapshot_key`
- `generated_at`
- `status`
- `metadata_json`

### 3.6 Optimization

#### `optimization_proposals`

Purpose:

- generated improvement proposals

Suggested fields:

- `id`
- `skill_id`
- `skill_version_id`
- `proposal_type`
- `severity`
- `status`
- `title`
- `summary`
- `estimated_benefit`
- `created_at`
- `updated_at`
- `closed_at`

Statuses should include:

- `open`
- `accepted`
- `rejected`
- `applied`
- `expired`

#### `proposal_evidence`

Purpose:

- evidence records linked to proposals

Suggested fields:

- `id`
- `proposal_id`
- `evidence_type`
- `ref_id`
- `summary`
- `metadata_json`

#### `proposal_actions`

Purpose:

- user actions on proposals

Suggested fields:

- `id`
- `proposal_id`
- `action_type`
- `created_at`
- `metadata_json`

### 3.7 Packaging and Bundles

#### `workflow_bundles`

Purpose:

- exported Skill bundles or orchestration bundles

Suggested fields:

- `id`
- `bundle_name`
- `bundle_type`
- `version_label`
- `created_at`
- `created_from_policy_id`
- `export_path`
- `manifest_json`

#### `bundle_items`

Purpose:

- item membership within a bundle

Suggested fields:

- `id`
- `workflow_bundle_id`
- `item_type`
- `ref_id`
- `position_index`
- `metadata_json`

## 4. Indexing Recommendations

### 4.1 Skill Governance Derivation

The registry layer should derive a lightweight governance profile for each indexed Skill so the product can separate memory-like, infrastructure-like, and development-like assets.

Suggested fields on the normalized Skill summary:

- `role`
- `data_classes`
- `storage_policy`
- `reuse_policy`
- `recommended_scope`
- `stores_long_lived_context`
- `contains_sensitive_operational_data`

Recommended semantic intent:

- `memory`: may preserve account, session, profile, or other user-memory context locally
- `infrastructure`: may preserve server paths, server runtime, deploy, host, or operational environment context locally
- `development`: mainly preserves repository, code, build, test, review, and implementation context
- `analysis`: mainly preserves runtime/telemetry interpretation and derived workflow evidence
- `packaging`: mainly preserves export/import/bundle workflow state
- `governance`: local policy, registry, or boundary-management-oriented logic

Recommended UI usage:

- first layer: show role plus one governance signal
- detail layer: show data classes, storage policy, reuse policy, and recommended scope

Recommended indexes:

- `skills(source_path_hash)`
- `skills(canonical_name)`
- `skill_versions(skill_id, is_current)`
- `skill_versions(content_hash)`
- `skill_runs(skill_id, started_at)`
- `skill_runs(session_id)`
- `skill_runs(workspace_id, started_at)`
- `daily_skill_metrics(metric_date, skill_id)`
- `weekly_skill_metrics(metric_week, skill_id)`
- `optimization_proposals(skill_id, status)`
- `leaderboards(period_type, period_key, board_type, rank_position)`

## 5. FTS Recommendations

SQLite FTS can be used later for:

- Skill name search
- description search
- proposal search
- parse issue search

Do not put raw prompt bodies into FTS by default.

## 6. Migration Strategy

The schema must evolve safely with the app.

Recommended rules:

- use explicit migration versions
- every migration is forward-only
- backup database before major migrations
- rebuild snapshots after incompatible aggregation changes

## 7. Deletion and Retention Strategy

Do not hard-delete important operational records by default.

Recommended approach:

- mark inactive Skills instead of deleting
- keep run records unless the user requests cleanup
- allow retention policy for raw event logs
- support compact or archive operations

## 8. MVP Minimum Table Set

If MVP needs a smaller first cut, start with:

- `authorization_policies`
- `authorization_events`
- `scan_roots`
- `scan_exclusions`
- `scan_runs`
- `skills`
- `skill_versions`
- `skill_runs`
- `daily_skill_metrics`
- `optimization_proposals`

Then add graph, bundles, and richer evidence tables in the next phase.
