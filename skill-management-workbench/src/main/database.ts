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

CREATE INDEX IF NOT EXISTS idx_graph_nodes_type_ref
  ON graph_nodes(node_type, ref_id);

CREATE INDEX IF NOT EXISTS idx_graph_edges_type_weight
  ON graph_edges(edge_type, weight DESC);
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
