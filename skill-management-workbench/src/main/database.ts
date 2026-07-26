import Database from "better-sqlite3";
import type { AppStoragePaths } from "./storage";

const schema = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS authorization_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  telemetry_mode TEXT NOT NULL,
  allow_raw_content INTEGER NOT NULL,
  allow_background_watch INTEGER NOT NULL,
  storage_root TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  activated_at TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS authorization_events (
  id TEXT PRIMARY KEY,
  policy_id TEXT,
  event_type TEXT NOT NULL,
  event_summary TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS managed_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  bound_at TEXT NOT NULL,
  last_focused_at TEXT NOT NULL,
  last_scan_at TEXT,
  skills_found INTEGER,
  files_seen INTEGER,
  skills_changed INTEGER,
  workflow_applied INTEGER NOT NULL DEFAULT 0,
  monitoring_enabled INTEGER NOT NULL DEFAULT 0,
  monitoring_interval_ms INTEGER NOT NULL DEFAULT 60000,
  last_monitor_at TEXT,
  last_observed_workspace_ref TEXT,
  last_connection_check_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_roots (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  path TEXT NOT NULL,
  path_hash TEXT NOT NULL UNIQUE,
  root_type TEXT NOT NULL,
  is_trusted INTEGER NOT NULL,
  is_enabled INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_exclusions (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  path TEXT NOT NULL,
  path_hash TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_runs (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  roots_scanned INTEGER NOT NULL,
  files_seen INTEGER NOT NULL,
  skills_found INTEGER NOT NULL,
  skills_changed INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  summary_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_path_hash TEXT NOT NULL UNIQUE,
  owner_label TEXT NOT NULL,
  is_active INTEGER NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  version_fingerprint TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  frontmatter_name TEXT,
  frontmatter_description TEXT,
  line_count INTEGER NOT NULL,
  detected_at TEXT NOT NULL,
  is_current INTEGER NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_runs (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  skill_version_id TEXT,
  capture_mode TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  source_type TEXT NOT NULL,
  workspace_ref TEXT,
  started_at TEXT NOT NULL,
  first_output_at TEXT,
  finished_at TEXT,
  duration_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd REAL,
  model_name TEXT,
  tool_call_count INTEGER NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  error_summary TEXT,
  summary_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trace_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  harness_id TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  workspace_ref TEXT,
  source_ref TEXT,
  started_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL,
  capture_mode TEXT NOT NULL,
  confidence REAL NOT NULL,
  summary_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trace_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  trace_id TEXT NOT NULL UNIQUE,
  sequence INTEGER NOT NULL,
  user_message_summary TEXT NOT NULL,
  message_hash TEXT,
  received_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  skill_candidate_count INTEGER NOT NULL,
  skill_invoked_count INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  duration_ms INTEGER,
  capture_mode TEXT NOT NULL DEFAULT 'unknown',
  confidence REAL NOT NULL DEFAULT 0,
  source_run_ref TEXT,
  summary_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trace_spans (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  parent_span_id TEXT,
  sequence INTEGER NOT NULL,
  span_type TEXT NOT NULL,
  phase TEXT NOT NULL,
  name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL,
  capture_mode TEXT NOT NULL,
  confidence REAL NOT NULL,
  skill_id TEXT,
  skill_version_id TEXT,
  workflow_id TEXT,
  workflow_node_id TEXT,
  token_count INTEGER NOT NULL,
  tool_call_count INTEGER NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trace_events (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  span_id TEXT,
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_ref TEXT,
  capture_mode TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_hit_evidence (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  skill_version_id TEXT,
  hit_state TEXT NOT NULL,
  hit_index INTEGER NOT NULL,
  confidence REAL NOT NULL,
  capture_mode TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  evidence_summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_skill_metrics (
  id TEXT PRIMARY KEY,
  metric_date TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  runs_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  failure_count INTEGER NOT NULL,
  avg_duration_ms INTEGER,
  max_duration_ms INTEGER,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  estimated_cost_usd REAL NOT NULL,
  tool_call_count INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_analysis_snapshots (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  skill_version_id TEXT,
  generated_at TEXT NOT NULL,
  summary TEXT NOT NULL,
  dependencies_json TEXT NOT NULL,
  execution_flow_json TEXT NOT NULL,
  risks_json TEXT NOT NULL,
  optimization_suggestions_json TEXT NOT NULL,
  alternatives_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_health_snapshots (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  measured_at TEXT NOT NULL,
  score INTEGER NOT NULL,
  status TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasons_json TEXT NOT NULL,
  signals_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_score_policy (
  id TEXT PRIMARY KEY,
  preset TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  reliability_weight REAL NOT NULL,
  cost_weight REAL NOT NULL,
  latency_weight REAL NOT NULL,
  freshness_weight REAL NOT NULL,
  maintainability_weight REAL NOT NULL,
  healthy_score INTEGER NOT NULL,
  attention_score INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_evaluation_config (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_label TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  model_name TEXT NOT NULL,
  encrypted_api_key BLOB,
  enabled INTEGER NOT NULL DEFAULT 0,
  allow_source_upload INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  last_tested_at TEXT,
  last_test_status TEXT NOT NULL DEFAULT 'not_tested',
  last_test_message TEXT
);

CREATE TABLE IF NOT EXISTS remote_skill_sources (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  normalized_url TEXT NOT NULL UNIQUE,
  owner TEXT,
  repo TEXT,
  display_name TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  can_import INTEGER NOT NULL,
  verification_status TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  imported_at TEXT,
  activation_previewed_at TEXT,
  source_catalog_id TEXT,
  source_payload_json TEXT,
  analysis_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS optimization_proposals (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  skill_version_id TEXT,
  proposal_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  estimated_benefit TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS proposal_evidence (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  ref_id TEXT,
  summary TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposal_actions (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  action_summary TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_bundles (
  id TEXT PRIMARY KEY,
  source_bundle_id TEXT,
  lineage_key TEXT,
  bundle_name TEXT NOT NULL,
  bundle_type TEXT NOT NULL,
  version_label TEXT NOT NULL,
  lifecycle_state TEXT,
  ingest_strategy TEXT,
  created_at TEXT NOT NULL,
  created_from_policy_id TEXT NOT NULL,
  export_path TEXT NOT NULL,
  manifest_path TEXT NOT NULL,
  supersedes_bundle_id TEXT,
  superseded_by_bundle_id TEXT,
  manifest_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bundle_items (
  id TEXT PRIMARY KEY,
  workflow_bundle_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  position_index INTEGER NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_template_registry (
  template_key TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  template_version TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  source_path TEXT NOT NULL UNIQUE,
  manifest_fingerprint TEXT NOT NULL,
  dependencies_json TEXT NOT NULL,
  skill_refs_json TEXT NOT NULL,
  validation_json TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  indexed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_workflow_bindings (
  binding_id TEXT PRIMARY KEY,
  project_root TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_version TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_kind TEXT NOT NULL,
  manifest_fingerprint TEXT,
  binding_status TEXT NOT NULL,
  binding_source TEXT NOT NULL,
  binding_file_path TEXT,
  overrides_json TEXT NOT NULL,
  activated_at TEXT,
  rollback_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_root, template_id)
);

CREATE TABLE IF NOT EXISTS project_workflow_binding_events (
  id TEXT PRIMARY KEY,
  binding_id TEXT NOT NULL,
  project_root TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_summary TEXT NOT NULL,
  preview_id TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scenario_loop_runs (
  id TEXT PRIMARY KEY,
  project_root TEXT NOT NULL,
  binding_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_version TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_kind TEXT NOT NULL,
  manifest_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL,
  stop_reason TEXT,
  formal_package_json TEXT NOT NULL,
  policy_json TEXT NOT NULL,
  latest_quality_json TEXT,
  latest_budget_json TEXT,
  current_iteration INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS scenario_loop_iterations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  iteration INTEGER NOT NULL,
  status TEXT NOT NULL,
  workflow_run_ref TEXT,
  root_cause_key TEXT,
  strategy_fingerprint TEXT,
  change_signals_json TEXT NOT NULL,
  quality_json TEXT NOT NULL,
  budget_json TEXT NOT NULL,
  stop_reason TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  UNIQUE(run_id, iteration)
);

CREATE TABLE IF NOT EXISTS project_app_server_observers (
  project_root TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL,
  cli_version TEXT,
  schema_fingerprint TEXT,
  capability_json TEXT NOT NULL,
  started_at TEXT,
  last_event_at TEXT,
  stopped_at TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_controlled_session_verifications (
  project_root TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  token_watchdog_exceeded INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER,
  lifecycle_event_count INTEGER NOT NULL DEFAULT 0,
  item_types_json TEXT NOT NULL,
  trace_id TEXT,
  thread_archived INTEGER NOT NULL DEFAULT 0,
  stop_reason TEXT,
  error_code TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  edge_type TEXT NOT NULL,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  weight REAL NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_skill_current
  ON skill_versions(skill_id, is_current);

CREATE INDEX IF NOT EXISTS idx_skill_runs_skill_started
  ON skill_runs(skill_id, started_at);

CREATE INDEX IF NOT EXISTS idx_trace_sessions_observed
  ON trace_sessions(last_observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trace_sessions_project
  ON trace_sessions(project_id, last_observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trace_turns_session_received
  ON trace_turns(session_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_trace_turns_trace
  ON trace_turns(trace_id);

CREATE INDEX IF NOT EXISTS idx_trace_spans_trace_sequence
  ON trace_spans(trace_id, sequence);

CREATE INDEX IF NOT EXISTS idx_trace_events_trace_sequence
  ON trace_events(trace_id, sequence);

CREATE INDEX IF NOT EXISTS idx_skill_hit_trace
  ON skill_hit_evidence(trace_id, hit_index DESC);

CREATE INDEX IF NOT EXISTS idx_skill_hit_skill_time
  ON skill_hit_evidence(skill_id, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_skill_metrics_date_skill
  ON daily_skill_metrics(metric_date, skill_id);

CREATE INDEX IF NOT EXISTS idx_skill_analysis_skill_generated
  ON skill_analysis_snapshots(skill_id, generated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_health_skill_date
  ON skill_health_snapshots(skill_id, metric_date);

CREATE INDEX IF NOT EXISTS idx_skill_health_skill_measured
  ON skill_health_snapshots(skill_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_remote_skill_sources_generated
  ON remote_skill_sources(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_optimization_proposals_skill_status
  ON optimization_proposals(skill_id, status);

CREATE INDEX IF NOT EXISTS idx_proposal_evidence_proposal
  ON proposal_evidence(proposal_id, created_at);

CREATE INDEX IF NOT EXISTS idx_proposal_actions_proposal
  ON proposal_actions(proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_exclusions_policy_path
  ON scan_exclusions(policy_id, path);

CREATE INDEX IF NOT EXISTS idx_workflow_bundles_created_at
  ON workflow_bundles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_bundles_lineage_state
  ON workflow_bundles(lineage_key, lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_workflow_bundles_source_bundle
  ON workflow_bundles(source_bundle_id);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_position
  ON bundle_items(workflow_bundle_id, position_index);

CREATE INDEX IF NOT EXISTS idx_workflow_template_registry_id_version
  ON workflow_template_registry(template_id, template_version DESC);

CREATE INDEX IF NOT EXISTS idx_project_workflow_bindings_project_status
  ON project_workflow_bindings(project_root, binding_status);

CREATE INDEX IF NOT EXISTS idx_project_workflow_binding_events_binding_time
  ON project_workflow_binding_events(binding_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scenario_loop_runs_project_updated
  ON scenario_loop_runs(project_root, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_scenario_loop_runs_binding_status
  ON scenario_loop_runs(binding_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_scenario_loop_iterations_run_iteration
  ON scenario_loop_iterations(run_id, iteration ASC);

CREATE INDEX IF NOT EXISTS idx_project_app_server_observers_state
  ON project_app_server_observers(state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_controlled_session_verifications_state
  ON project_controlled_session_verifications(state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_type_ref
  ON graph_nodes(node_type, ref_id);

CREATE INDEX IF NOT EXISTS idx_graph_edges_type_weight
  ON graph_edges(edge_type, weight DESC);

CREATE INDEX IF NOT EXISTS idx_managed_projects_last_focused
  ON managed_projects(last_focused_at DESC);
`;

export class WorkbenchDatabase {
  readonly db: Database.Database;
  readonly paths: AppStoragePaths;

  constructor(paths: AppStoragePaths) {
    this.paths = paths;
    this.db = new Database(paths.databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = OFF");
    this.db.exec(schema);
    this.ensureSchemaMigrations();
  }

  close() {
    this.db.close();
  }

  private ensureSchemaMigrations() {
    this.ensureColumn("workflow_bundles", "source_bundle_id", "TEXT");
    this.ensureColumn("workflow_bundles", "lineage_key", "TEXT");
    this.ensureColumn("workflow_bundles", "lifecycle_state", "TEXT");
    this.ensureColumn("workflow_bundles", "ingest_strategy", "TEXT");
    this.ensureColumn("workflow_bundles", "supersedes_bundle_id", "TEXT");
    this.ensureColumn("workflow_bundles", "superseded_by_bundle_id", "TEXT");
    this.ensureColumn("remote_skill_sources", "imported_at", "TEXT");
    this.ensureColumn("remote_skill_sources", "activation_previewed_at", "TEXT");
    this.ensureColumn("remote_skill_sources", "source_catalog_id", "TEXT");
    this.ensureColumn("remote_skill_sources", "source_payload_json", "TEXT");
    this.ensureColumn("skill_runs", "workspace_ref", "TEXT");
    this.ensureColumn("trace_turns", "capture_mode", "TEXT NOT NULL DEFAULT 'unknown'");
    this.ensureColumn("trace_turns", "confidence", "REAL NOT NULL DEFAULT 0");
    this.ensureColumn("project_controlled_session_verifications", "trace_id", "TEXT");

    this.db.exec(`
      UPDATE workflow_bundles
      SET source_bundle_id = id
      WHERE source_bundle_id IS NULL OR trim(source_bundle_id) = '';

      UPDATE workflow_bundles
      SET lineage_key = 'source:' || COALESCE(source_bundle_id, id)
      WHERE lineage_key IS NULL OR trim(lineage_key) = '';

      UPDATE workflow_bundles
      SET lifecycle_state = 'current'
      WHERE lifecycle_state IS NULL OR trim(lifecycle_state) = '';

      UPDATE workflow_bundles
      SET ingest_strategy = 'export_snapshot'
      WHERE ingest_strategy IS NULL OR trim(ingest_strategy) = '';

      UPDATE trace_turns
      SET capture_mode = COALESCE(
        NULLIF(capture_mode, 'unknown'),
        (SELECT trace_sessions.capture_mode FROM trace_sessions WHERE trace_sessions.id = trace_turns.session_id),
        'unknown'
      );

      UPDATE trace_turns
      SET confidence = CASE
        WHEN confidence > 0 THEN confidence
        ELSE COALESCE(
          (SELECT trace_sessions.confidence FROM trace_sessions WHERE trace_sessions.id = trace_turns.session_id),
          0
        )
      END;

      UPDATE skill_runs
      SET workspace_ref = json_extract(summary_json, '$.workspaceRef')
      WHERE (workspace_ref IS NULL OR trim(workspace_ref) = '')
        AND json_valid(summary_json)
        AND json_extract(summary_json, '$.workspaceRef') IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_skill_runs_workspace_started
        ON skill_runs(workspace_ref, started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_workflow_bundles_lineage_state
        ON workflow_bundles(lineage_key, lifecycle_state);

      CREATE INDEX IF NOT EXISTS idx_workflow_bundles_source_bundle
        ON workflow_bundles(source_bundle_id);

      CREATE INDEX IF NOT EXISTS idx_skill_analysis_skill_generated
        ON skill_analysis_snapshots(skill_id, generated_at DESC);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_health_skill_date
        ON skill_health_snapshots(skill_id, metric_date);

      CREATE INDEX IF NOT EXISTS idx_skill_health_skill_measured
        ON skill_health_snapshots(skill_id, measured_at DESC);

      CREATE INDEX IF NOT EXISTS idx_remote_skill_sources_generated
        ON remote_skill_sources(generated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_remote_skill_sources_imported
        ON remote_skill_sources(imported_at DESC);
    `);
  }

  private ensureColumn(tableName: string, columnName: string, definition: string) {
    const rows = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
      name: string;
    }>;

    if (rows.some((row) => row.name === columnName)) {
      return;
    }

    this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}
