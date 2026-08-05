import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type {
  AuthorizationInput,
  AuthorizationPreferenceInput,
  AuthorizationPolicy,
  LocalAuditEvent,
  ScanExclusion,
  ScanRoot
} from "../shared/types";
import type { WorkbenchDatabase } from "./database";

function nowIso() {
  return new Date().toISOString();
}

function pathHash(path: string) {
  return createHash("sha1").update(resolve(path)).digest("hex");
}

function toPolicy(row: Record<string, unknown>): AuthorizationPolicy {
  return {
    id: String(row.id),
    name: String(row.name),
    status: row.status === "revoked" ? "revoked" : "active",
    telemetryMode: row.telemetry_mode === "precise" ? "precise" : row.telemetry_mode === "disabled" ? "disabled" : "estimated",
    allowRawContent: Number(row.allow_raw_content) === 1,
    allowMessageSummary: Number(row.allow_message_summary) === 1,
    allowBackgroundWatch: Number(row.allow_background_watch) === 1,
    storageRoot: String(row.storage_root),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    activatedAt: row.activated_at ? String(row.activated_at) : null,
    revokedAt: row.revoked_at ? String(row.revoked_at) : null
  };
}

function toRoot(row: Record<string, unknown>): ScanRoot {
  return {
    id: String(row.id),
    policyId: String(row.policy_id),
    path: String(row.path),
    rootType: String(row.root_type),
    isTrusted: Number(row.is_trusted) === 1,
    isEnabled: Number(row.is_enabled) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function toExclusion(row: Record<string, unknown>): ScanExclusion {
  return {
    id: String(row.id),
    policyId: String(row.policy_id),
    path: String(row.path),
    reason: row.reason ? String(row.reason) : null,
    createdAt: String(row.created_at)
  };
}

function parseMetadata(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toAuditEvent(row: Record<string, unknown>): LocalAuditEvent {
  return {
    id: String(row.id),
    policyId: row.policy_id ? String(row.policy_id) : null,
    eventType: String(row.event_type),
    eventSummary: String(row.event_summary),
    actorType: row.actor_type === "system" ? "system" : "user",
    createdAt: String(row.created_at),
    metadata: parseMetadata(row.metadata_json)
  };
}

export class AuthorizationService {
  constructor(private readonly database: WorkbenchDatabase) {}

  recordAuditEvent(input: {
    eventType: string;
    eventSummary: string;
    metadata?: Record<string, unknown>;
    actorType?: "system" | "user";
    policyId?: string | null;
  }): void {
    const policyId = input.policyId === undefined ? this.getActivePolicy()?.id ?? null : input.policyId;
    this.database.db
      .prepare(
        `INSERT INTO authorization_events (
           id, policy_id, event_type, event_summary, actor_type, created_at, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        policyId,
        input.eventType,
        input.eventSummary,
        input.actorType ?? "system",
        nowIso(),
        JSON.stringify(input.metadata ?? {})
      );
  }

  getActivePolicy(): AuthorizationPolicy | null {
    const row = this.database.db
      .prepare(
        `SELECT * FROM authorization_policies
         WHERE status = 'active'
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get() as Record<string, unknown> | undefined;

    return row ? toPolicy(row) : null;
  }

  listRoots(policyId?: string): ScanRoot[] {
    const activePolicyId = policyId ?? this.getActivePolicy()?.id;
    if (!activePolicyId) {
      return [];
    }

    const rows = this.database.db
      .prepare(
        `SELECT * FROM scan_roots
         WHERE policy_id = ? AND is_enabled = 1
         ORDER BY created_at ASC`
      )
      .all(activePolicyId) as Record<string, unknown>[];

    return rows.map(toRoot);
  }

  listExclusions(policyId?: string): ScanExclusion[] {
    const activePolicyId = policyId ?? this.getActivePolicy()?.id;
    if (!activePolicyId) {
      return [];
    }

    const rows = this.database.db
      .prepare(
        `SELECT * FROM scan_exclusions
         WHERE policy_id = ?
         ORDER BY created_at ASC`
      )
      .all(activePolicyId) as Record<string, unknown>[];

    return rows.map(toExclusion);
  }

  listAuditEvents(limit = 12): LocalAuditEvent[] {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const rows = this.database.db
      .prepare(
        `SELECT *
         FROM authorization_events
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(safeLimit) as Record<string, unknown>[];

    return rows.map(toAuditEvent);
  }

  grantAuthorization(input: AuthorizationInput): AuthorizationPolicy {
    if (input.scanRoots.length === 0) {
      throw new Error("At least one scan root is required.");
    }

    const timestamp = nowIso();
    const policyId = randomUUID();
    const currentPolicy = this.getActivePolicy();
    const currentRoots = currentPolicy ? this.listRoots(currentPolicy.id).map((root) => root.path) : [];
    const currentExclusions = currentPolicy
      ? this.listExclusions(currentPolicy.id).map((entry) => entry.path)
      : [];
    const roots = Array.from(
      new Set([...currentRoots, ...input.scanRoots].map((path) => resolve(path.trim())).filter(Boolean))
    );
    const exclusions = Array.from(
      new Set(
        [...currentExclusions, ...input.scanExclusions]
          .map((path) => resolve(path.trim()))
          .filter(Boolean)
      )
    );
    const telemetryMode =
      input.telemetryMode !== "disabled"
        ? input.telemetryMode
        : currentPolicy?.telemetryMode ?? input.telemetryMode;
    const allowRawContent = input.allowRawContent || currentPolicy?.allowRawContent === true;
    const allowBackgroundWatch =
      input.allowBackgroundWatch || currentPolicy?.allowBackgroundWatch === true;

    const transaction = this.database.db.transaction(() => {
      if (currentPolicy) {
        this.database.db
          .prepare(
            `INSERT INTO authorization_events (
               id, policy_id, event_type, event_summary, actor_type, created_at, metadata_json
             ) VALUES (?, ?, 'authorization.revoked', ?, 'user', ?, ?)`
          )
          .run(
            randomUUID(),
            currentPolicy.id,
            `Revoked the previous active authorization policy before applying a new local scope.`,
            timestamp,
            JSON.stringify({
              revokedPolicyId: currentPolicy.id,
              previousTelemetryMode: currentPolicy.telemetryMode,
              previousAllowRawContent: currentPolicy.allowRawContent,
              previousAllowBackgroundWatch: currentPolicy.allowBackgroundWatch
            })
          );
        this.database.db
          .prepare(`DELETE FROM scan_roots WHERE policy_id = ?`)
          .run(currentPolicy.id);
        this.database.db
          .prepare(`DELETE FROM scan_exclusions WHERE policy_id = ?`)
          .run(currentPolicy.id);
        this.database.db
          .prepare(
            `UPDATE authorization_policies
             SET status = 'revoked', revoked_at = ?, updated_at = ?
             WHERE id = ?`
          )
          .run(timestamp, timestamp, currentPolicy.id);
      }

      this.database.db
        .prepare(
          `INSERT INTO authorization_policies (
             id, name, status, telemetry_mode, allow_raw_content, allow_message_summary,
             allow_background_watch, storage_root, created_at, updated_at,
             activated_at, revoked_at
           ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
        )
        .run(
          policyId,
          input.name.trim(),
          telemetryMode,
          allowRawContent ? 1 : 0,
          currentPolicy?.allowMessageSummary ? 1 : 0,
          allowBackgroundWatch ? 1 : 0,
          this.database.paths.root,
          timestamp,
          timestamp,
          timestamp
        );

      const insertRoot = this.database.db.prepare(
        `INSERT INTO scan_roots (
           id, policy_id, path, path_hash, root_type, is_trusted, is_enabled, created_at, updated_at
         ) VALUES (?, ?, ?, ?, 'user_selected', 1, 1, ?, ?)`
      );
      const insertExclusion = this.database.db.prepare(
        `INSERT INTO scan_exclusions (
           id, policy_id, path, path_hash, reason, created_at
         ) VALUES (?, ?, ?, ?, ?, ?)`
      );

      for (const root of roots) {
        insertRoot.run(randomUUID(), policyId, root, pathHash(root), timestamp, timestamp);
      }

      for (const exclusion of exclusions) {
        insertExclusion.run(
          randomUUID(),
          policyId,
          exclusion,
          pathHash(exclusion),
          "user_selected",
          timestamp
        );
      }

      this.database.db
        .prepare(
          `INSERT INTO authorization_events (
             id, policy_id, event_type, event_summary, actor_type, created_at, metadata_json
           ) VALUES (?, ?, 'authorization.granted', ?, 'user', ?, ?)`
        )
        .run(
          randomUUID(),
          policyId,
          `Authorized ${roots.length} scan root(s) with telemetry mode ${telemetryMode}.`,
          timestamp,
          JSON.stringify({
            scanRoots: roots,
            scanExclusions: exclusions,
            telemetryMode,
            allowRawContent,
            allowBackgroundWatch
          })
        );
    });

    transaction();

    const nextPolicy = this.getActivePolicy();
    if (!nextPolicy) {
      throw new Error("Failed to activate authorization policy.");
    }

    return nextPolicy;
  }

  updateActivePreferences(input: AuthorizationPreferenceInput): AuthorizationPolicy {
    const currentPolicy = this.getActivePolicy();
    if (!currentPolicy) {
      throw new Error("Grant authorization before changing local evidence preferences.");
    }

    const timestamp = nowIso();
    const transaction = this.database.db.transaction(() => {
      this.database.db
        .prepare(
          `UPDATE authorization_policies
           SET allow_message_summary = ?, updated_at = ?
           WHERE id = ? AND status = 'active'`
        )
        .run(input.allowMessageSummary ? 1 : 0, timestamp, currentPolicy.id);
      this.database.db
        .prepare(
          `INSERT INTO authorization_events (
             id, policy_id, event_type, event_summary, actor_type, created_at, metadata_json
           ) VALUES (?, ?, 'authorization.preferences_updated', ?, 'user', ?, ?)`
        )
        .run(
          randomUUID(),
          currentPolicy.id,
          input.allowMessageSummary
            ? "Enabled local storage of sanitized user-message summaries."
            : "Disabled local storage of sanitized user-message summaries.",
          timestamp,
          JSON.stringify({
            previousAllowMessageSummary: currentPolicy.allowMessageSummary,
            allowMessageSummary: input.allowMessageSummary,
            rawContentStored: false
          })
        );
    });
    transaction();

    const nextPolicy = this.getActivePolicy();
    if (!nextPolicy) {
      throw new Error("Failed to update local evidence preferences.");
    }
    return nextPolicy;
  }
}
