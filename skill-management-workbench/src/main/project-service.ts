import { randomUUID } from "node:crypto";
import { basename, resolve } from "node:path";
import type { ManagedProjectRecord } from "../shared/types";
import type { WorkbenchDatabase } from "./database";

function normalizeProjectPath(path: string) {
  const normalized = resolve(path.trim());
  return normalized === "/" ? normalized : normalized.replace(/\/+$/, "");
}

function toProject(row: Record<string, unknown>): ManagedProjectRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    path: String(row.path),
    boundAt: String(row.bound_at),
    lastFocusedAt: String(row.last_focused_at),
    lastScanAt: row.last_scan_at ? String(row.last_scan_at) : null,
    skillsFound: row.skills_found == null ? null : Number(row.skills_found),
    filesSeen: row.files_seen == null ? null : Number(row.files_seen),
    skillsChanged: row.skills_changed == null ? null : Number(row.skills_changed),
    workflowApplied: Boolean(row.workflow_applied),
    monitoringEnabled: Boolean(row.monitoring_enabled),
    monitoringIntervalMs: Number(row.monitoring_interval_ms ?? 60000),
    lastMonitorAt: row.last_monitor_at ? String(row.last_monitor_at) : null,
    lastObservedWorkspaceRef: row.last_observed_workspace_ref
      ? String(row.last_observed_workspace_ref)
      : null,
    lastConnectionCheckAt: row.last_connection_check_at
      ? String(row.last_connection_check_at)
      : null
  };
}

export class ProjectService {
  constructor(private readonly database: WorkbenchDatabase) {}

  list(): ManagedProjectRecord[] {
    const rows = this.database.db
      .prepare(`SELECT * FROM managed_projects ORDER BY lower(name), path`)
      .all() as Record<string, unknown>[];
    return rows.map(toProject);
  }

  saveAll(projects: ManagedProjectRecord[]): ManagedProjectRecord[] {
    const save = this.database.db.prepare(`
      INSERT INTO managed_projects (
        id, name, path, bound_at, last_focused_at, last_scan_at,
        skills_found, files_seen, skills_changed, workflow_applied,
        monitoring_enabled, monitoring_interval_ms, last_monitor_at,
        last_observed_workspace_ref, last_connection_check_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        name = excluded.name,
        last_focused_at = excluded.last_focused_at,
        last_scan_at = excluded.last_scan_at,
        skills_found = excluded.skills_found,
        files_seen = excluded.files_seen,
        skills_changed = excluded.skills_changed,
        workflow_applied = excluded.workflow_applied,
        monitoring_enabled = excluded.monitoring_enabled,
        monitoring_interval_ms = excluded.monitoring_interval_ms,
        last_monitor_at = excluded.last_monitor_at,
        last_observed_workspace_ref = excluded.last_observed_workspace_ref,
        last_connection_check_at = excluded.last_connection_check_at,
        updated_at = excluded.updated_at
    `);
    const now = new Date().toISOString();
    const transaction = this.database.db.transaction(() => {
      this.database.db.prepare(`DELETE FROM managed_projects`).run();
      for (const project of projects) {
        const path = normalizeProjectPath(project.path);
        save.run(
          project.id || randomUUID(),
          project.name.trim() || basename(path),
          path,
          project.boundAt || now,
          project.lastFocusedAt || now,
          project.lastScanAt,
          project.skillsFound,
          project.filesSeen,
          project.skillsChanged,
          project.workflowApplied ? 1 : 0,
          project.monitoringEnabled ? 1 : 0,
          project.monitoringIntervalMs,
          project.lastMonitorAt,
          project.lastObservedWorkspaceRef,
          project.lastConnectionCheckAt,
          now
        );
      }
    });
    transaction();
    return this.list();
  }

  delete(projectPath: string) {
    this.database.db
      .prepare(`DELETE FROM managed_projects WHERE path = ?`)
      .run(normalizeProjectPath(projectPath));
  }
}
