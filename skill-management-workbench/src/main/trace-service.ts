import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { recordAt, stringAt, validateHarnessEventEnvelope } from "./harness-event";
import type {
  SessionTraceDetail,
  SessionTraceListItem,
  SessionTraceQuery,
  SkillHitState,
  TraceCaptureMode,
  TraceEventSummary,
  TraceSkillHitSummary,
  TraceSkillQuickDetail,
  TraceSpanSummary,
  TraceSpanType
} from "../shared/types";
import type { WorkbenchDatabase } from "./database";
import type { RegistryService } from "./registry-service";

type JsonRecord = Record<string, unknown>;

export interface TraceTelemetryEventInput {
  record: JsonRecord;
  lineNumber: number;
}

interface NormalizedTraceEvent {
  id: string;
  traceId: string;
  turnId: string;
  sessionId: string;
  sessionRef: string;
  turnRef: string;
  runId: string;
  eventType: string;
  occurredAt: string;
  sourceType: string;
  sourceRef: string | null;
  workspaceRef: string | null;
  harnessId: string | null;
  adapterId: string | null;
  captureMode: TraceCaptureMode;
  confidence: number;
  payload: JsonRecord;
  sequence: number;
}

interface SkillLookupRow {
  id: string;
  canonical_name: string;
  display_name: string;
  source_path: string;
  version_id: string | null;
}

const scoringVersion = "trace-hit-v1";
const legacyBackfillVersion = 4;
const maxSkillContentBytes = 120_000;
const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeJson(value: string | null | undefined): JsonRecord {
  if (!value) {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function containers(record: JsonRecord) {
  const values: JsonRecord[] = [record];
  for (const key of ["payload", "skill", "metadata"]) {
    if (isRecord(record[key])) {
      values.push(record[key] as JsonRecord);
    }
  }
  return values;
}

function readValue(record: JsonRecord, keys: string[]) {
  for (const container of containers(record)) {
    for (const key of keys) {
      if (key in container) {
        return container[key];
      }
    }
  }
  return undefined;
}

function readString(record: JsonRecord, keys: string[]) {
  const value = readValue(record, keys);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(record: JsonRecord, keys: string[]) {
  const value = readValue(record, keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readStrings(record: JsonRecord, keys: string[]) {
  const value = readValue(record, keys);
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

function hash(value: string, length = 24) {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function hashId(prefix: string, value: string) {
  return `${prefix}_${hash(value)}`;
}

function normalizeSessionRef(value: string) {
  const trimmed = value.trim();
  const matches = Array.from(trimmed.matchAll(uuidPattern));
  return matches.at(-1)?.[1]?.toLowerCase() ?? trimmed;
}

function normalizeTimestamp(value: string | null) {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeCaptureMode(value: string | null): TraceCaptureMode {
  if (value === "precise" || value === "estimated" || value === "inferred") {
    return value;
  }
  return "unknown";
}

function normalizedConfidence(value: number | null) {
  if (value == null) {
    return 0.5;
  }
  return Math.max(0, Math.min(value > 1 ? value / 100 : value, 1));
}

function harnessForSource(sourceType: string) {
  if (sourceType.includes("codex")) {
    return "codex";
  }
  if (sourceType.includes("claude")) {
    return "claude_code";
  }
  return "local_tool";
}

function traceStatus(eventTypes: string[]) {
  if (eventTypes.some((value) => value.endsWith("failed"))) {
    return "failed" as const;
  }
  if (eventTypes.some((value) => value.endsWith("completed"))) {
    return "completed" as const;
  }
  return "running" as const;
}

function preciseSkillHitState(eventTypes: string[]): SkillHitState {
  if (eventTypes.some((value) => value === "skill.failed" || value === "skill_run.failed")) {
    return "failed";
  }
  if (eventTypes.some((value) => value === "skill.completed" || value === "skill_run.completed")) {
    return "completed";
  }
  if (eventTypes.some((value) => value === "skill.invoked" || value === "skill_run.started")) {
    return "invoked";
  }
  if (eventTypes.some((value) => value === "skill.loaded")) {
    return "loaded";
  }
  if (eventTypes.some((value) => value === "skill.routed")) {
    return "selected";
  }
  return "candidate";
}

function isPreciseSkillInvocation(eventTypes: string[]) {
  return eventTypes.some((value) =>
    ["skill.invoked", "skill.completed", "skill.failed", "skill_run.started", "skill_run.completed", "skill_run.failed"].includes(value)
  );
}

function preciseHitIndex(hitState: SkillHitState) {
  if (hitState === "invoked" || hitState === "completed" || hitState === "failed") {
    return 100;
  }
  if (hitState === "selected") {
    return 85;
  }
  if (hitState === "loaded") {
    return 70;
  }
  return 50;
}

function latestTimestamp(values: string[]) {
  return values.slice().sort().at(-1) ?? new Date().toISOString();
}

function earliestTimestamp(values: string[]) {
  return values.slice().sort().at(0) ?? new Date().toISOString();
}

function parseEvidence(value: unknown): TraceSkillHitSummary["evidence"] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const key = typeof entry.key === "string" ? entry.key : "source";
    const label = typeof entry.label === "string" ? entry.label : key;
    const detail = typeof entry.detail === "string" ? entry.detail : "";
    const score = typeof entry.score === "number" ? entry.score : Number(entry.score ?? 0);
    return [{ key, label, detail, score: Number.isFinite(score) ? score : 0 }];
  });
}

function toSpan(row: Record<string, unknown>): TraceSpanSummary {
  return {
    id: String(row.id),
    traceId: String(row.trace_id),
    turnId: String(row.turn_id),
    parentSpanId: row.parent_span_id ? String(row.parent_span_id) : null,
    sequence: Number(row.sequence ?? 0),
    spanType: String(row.span_type) as TraceSpanType,
    phase: String(row.phase),
    name: String(row.name),
    startedAt: String(row.started_at),
    endedAt: row.ended_at ? String(row.ended_at) : null,
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
    status: String(row.status) as TraceSpanSummary["status"],
    captureMode: normalizeCaptureMode(String(row.capture_mode)),
    confidence: Number(row.confidence ?? 0),
    skillId: row.skill_id ? String(row.skill_id) : null,
    skillVersionId: row.skill_version_id ? String(row.skill_version_id) : null,
    workflowId: row.workflow_id ? String(row.workflow_id) : null,
    workflowNodeId: row.workflow_node_id ? String(row.workflow_node_id) : null,
    tokenCount: Number(row.token_count ?? 0),
    toolCallCount: Number(row.tool_call_count ?? 0),
    metadata: safeJson(row.metadata_json ? String(row.metadata_json) : null)
  };
}

export class TraceService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly registryService: RegistryService
  ) {}

  backfillLegacyRuns() {
    this.resetOutdatedLegacyProjection();
    const existingRunIds = new Set(
      (this.database.db.prepare(`SELECT payload_json FROM trace_events`).all() as Array<{ payload_json: string }>)
        .map((row) => safeJson(row.payload_json).runId)
        .filter((value): value is string => typeof value === "string")
    );
    const ingestedTraceIds = new Set<string>();
    const batchSize = 1000;
    let offset = 0;
    while (true) {
      const rows = this.database.db.prepare(
        `SELECT * FROM skill_runs ORDER BY started_at ASC LIMIT ? OFFSET ?`
      ).all(batchSize, offset) as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        break;
      }
      const events: TraceTelemetryEventInput[] = [];
      let lineNumber = offset * 2;
      for (const row of rows) {
      const runId = String(row.id);
      if (existingRunIds.has(runId)) {
        continue;
      }
      const summary = safeJson(row.summary_json ? String(row.summary_json) : null);
      const sourceType = String(row.source_type ?? "legacy_skill_run");
      const sourceRef = typeof summary.sourceRef === "string" ? summary.sourceRef : null;
      const workspaceRef = typeof summary.workspaceRef === "string" ? summary.workspaceRef : null;
      const sessionRef = normalizeSessionRef(
        (typeof summary.sessionRef === "string" ? summary.sessionRef : null) ??
        sourceRef ??
        `legacy:${sourceType}:${workspaceRef ?? "unassigned"}`
      );
      const localRunBase = runId.match(/^(local-tool-[0-9a-f]{16})-[0-9a-f]{16}$/)?.[1] ?? null;
      const turnRef =
        (typeof summary.turnRef === "string" ? summary.turnRef : null) ??
        localRunBase ??
        `legacy:${String(row.started_at)}`;
      const base = {
        run_id: runId,
        turn_ref: turnRef,
        skill_id: String(row.skill_id),
        source_type: sourceType,
        source_ref: sourceRef ?? "legacy-skill-runs",
        session_ref: sessionRef,
        workspace_ref: workspaceRef,
        capture_mode: String(row.capture_mode ?? "estimated"),
        confidence_score: Number(row.confidence_score ?? 0.45),
        model_name: row.model_name ? String(row.model_name) : null,
        prompt_tokens: row.prompt_tokens == null ? null : Number(row.prompt_tokens),
        completion_tokens: row.completion_tokens == null ? null : Number(row.completion_tokens),
        total_tokens: row.total_tokens == null ? null : Number(row.total_tokens),
        tool_call_count: Number(row.tool_call_count ?? 0),
        skill_hit_state: String(row.capture_mode) === "precise" ? "invoked" : "inferred",
        hit_index: String(row.capture_mode) === "precise"
          ? 100
          : Math.min(89, Math.round(normalizedConfidence(Number(row.confidence_score ?? 0.45)) * 100)),
        user_message_summary: "历史运行记录（无原始消息）",
        message_hash: hash(`legacy:${sessionRef}:${turnRef}`, 32),
        legacy_backfill_version: legacyBackfillVersion
      };
      lineNumber += 1;
      events.push({
        lineNumber,
        record: {
          ...base,
          event_id: hashId("event", `${runId}:legacy:started`),
          event_type: "skill_run.started",
          event_order: 1,
          occurred_at: String(row.started_at),
          started_at: String(row.started_at)
        }
      });
      if (String(row.status) === "completed" || String(row.status) === "failed") {
        lineNumber += 1;
        const eventType = String(row.status) === "failed" ? "skill_run.failed" : "skill_run.completed";
        events.push({
          lineNumber,
          record: {
            ...base,
            event_id: hashId("event", `${runId}:legacy:${eventType}`),
            event_type: eventType,
            event_order: 2,
            occurred_at: row.finished_at ? String(row.finished_at) : String(row.started_at),
            started_at: String(row.started_at),
            finished_at: row.finished_at ? String(row.finished_at) : String(row.started_at),
            duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
            error_code: row.error_code ? String(row.error_code) : null,
            error_summary: row.error_summary ? String(row.error_summary) : null
          }
        });
      }
      }
      if (events.length > 0) {
        for (const traceId of this.ingestTelemetryEvents(events, "legacy-skill-runs")) {
          ingestedTraceIds.add(traceId);
        }
      }
      offset += rows.length;
      if (rows.length < batchSize) {
        break;
      }
    }
    return Array.from(ingestedTraceIds);
  }

  private resetOutdatedLegacyProjection() {
    const rows = this.database.db.prepare(
      `SELECT trace_id, payload_json FROM trace_events`
    ).all() as Array<{ trace_id: string; payload_json: string }>;
    const outdatedTraceIds = Array.from(new Set(rows.flatMap((row) => {
      const payload = safeJson(row.payload_json);
      const isLegacy = payload.userMessageSummary === "历史运行记录（无原始消息）";
      const version = typeof payload.legacyBackfillVersion === "number"
        ? payload.legacyBackfillVersion
        : 0;
      return isLegacy && version < legacyBackfillVersion ? [row.trace_id] : [];
    })));
    if (outdatedTraceIds.length === 0) {
      return;
    }

    const transaction = this.database.db.transaction(() => {
      const deleteHits = this.database.db.prepare(`DELETE FROM skill_hit_evidence WHERE trace_id = ?`);
      const deleteSpans = this.database.db.prepare(`DELETE FROM trace_spans WHERE trace_id = ?`);
      const deleteEvents = this.database.db.prepare(`DELETE FROM trace_events WHERE trace_id = ?`);
      const deleteTurn = this.database.db.prepare(`DELETE FROM trace_turns WHERE trace_id = ?`);
      for (const traceId of outdatedTraceIds) {
        deleteHits.run(traceId);
        deleteSpans.run(traceId);
        deleteEvents.run(traceId);
        deleteTurn.run(traceId);
      }
      this.database.db.prepare(
        `DELETE FROM trace_sessions
         WHERE NOT EXISTS (
           SELECT 1 FROM trace_turns WHERE trace_turns.session_id = trace_sessions.id
         )`
      ).run();
    });
    transaction();
  }

  ingestTelemetryEvents(entries: TraceTelemetryEventInput[], importSource: string) {
    const normalized = entries.flatMap((entry) => {
      const record = entry.record;
      const eventType = readString(record, ["event_type", "eventType", "type"]);
      if (!eventType) {
        return [];
      }
      const envelope = validateHarnessEventEnvelope(record);
      if (typeof record.schema_version === "string" && !envelope.valid) {
        return [];
      }
      const project = recordAt(record, "project");
      const sourceType = readString(record, ["source_type", "sourceType"])
        ?? (envelope.valid && envelope.harnessId ? `harness_adapter:${envelope.harnessId}` : "log_parser");
      const workspaceRef = readString(record, ["workspace_ref", "workspaceRef", "cwd"])
        ?? stringAt(project, "workspace_ref")
        ?? stringAt(project, "workspaceRef");
      const sourceRef = readString(record, ["source_ref", "sourceRef"]) ?? importSource;
      const sessionRef = normalizeSessionRef(
        readString(record, ["session_ref", "sessionRef", "session_id", "sessionId"])
          ?? stringAt(record, "session_id")
          ?? `${sourceType}:${workspaceRef ?? sourceRef ?? stringAt(record, "event_id") ?? "unscoped-session"}`
      );
      const turnRef = readString(record, ["turn_ref", "turnRef", "turn_id", "turnId", "request_id", "requestId"])
        ?? stringAt(record, "turn_id")
        ?? stringAt(record, "event_id")
        ?? "unscoped-turn";
      const runId = readString(record, ["run_id", "runId", "id"])
        ?? stringAt(record, "run_id")
        ?? `${sessionRef}:${turnRef}`;
      const occurredAt = normalizeTimestamp(
        readString(record, ["occurred_at", "occurredAt", "timestamp", "started_at", "startedAt"])
          ?? stringAt(record, "occurred_at")
      );
      const sessionId = hashId("session", `${sourceType}:${sessionRef}`);
      const turnId = hashId("turn", `${sessionId}:${turnRef}`);
      const traceId = hashId("trace", turnId);
      const eventId = readString(record, ["event_id", "eventId"])
        ?? hashId("event", `${traceId}:${runId}:${eventType}:${occurredAt}:${entry.lineNumber}`);
      const captureMode = normalizeCaptureMode(readString(record, ["capture_mode", "captureMode"]));
      const payload = this.sanitizePayload(record, runId);
      if (envelope.valid) {
        payload.confidenceScore = 1;
      }

      return [{
        id: eventId,
        traceId,
        turnId,
        sessionId,
        sessionRef,
        turnRef,
        runId,
        eventType,
        occurredAt,
        sourceType,
        sourceRef,
        workspaceRef,
        harnessId: envelope.valid ? envelope.harnessId : null,
        adapterId: envelope.valid ? envelope.adapterId : null,
        captureMode: envelope.valid ? "precise" : captureMode,
        confidence: envelope.valid ? 1 : normalizedConfidence(readNumber(record, ["confidence_score", "confidenceScore"])),
        payload,
        sequence: readNumber(record, ["event_order", "eventOrder", "sequence"]) ?? entry.lineNumber
      } satisfies NormalizedTraceEvent];
    });

    if (normalized.length === 0) {
      return [];
    }

    const byTrace = new Map<string, NormalizedTraceEvent[]>();
    for (const event of normalized) {
      const group = byTrace.get(event.traceId) ?? [];
      group.push(event);
      byTrace.set(event.traceId, group);
    }

    const transaction = this.database.db.transaction(() => {
      for (const group of byTrace.values()) {
        this.persistTrace(group);
      }
    });
    transaction();
    return Array.from(byTrace.keys());
  }

  listSessionTraces(query: SessionTraceQuery = {}): SessionTraceListItem[] {
    const conditions: string[] = [];
    const parameters: Array<string | number> = [];
    if (query.projectId) {
      conditions.push("trace_sessions.project_id = ?");
      parameters.push(query.projectId);
    }
    if (query.harnessId) {
      conditions.push("trace_sessions.harness_id = ?");
      parameters.push(query.harnessId);
    }
    if (query.skillId) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM skill_hit_evidence filter_hit
          WHERE filter_hit.trace_id = trace_turns.trace_id AND filter_hit.skill_id = ?
        )`
      );
      parameters.push(query.skillId);
    }
    if (query.status && query.status !== "all") {
      conditions.push("trace_turns.status = ?");
      parameters.push(query.status);
    }
    if (query.captureMode && query.captureMode !== "all") {
      if (query.captureMode === "inferred") {
        conditions.push("trace_turns.capture_mode IN ('estimated', 'inferred', 'unknown')");
      } else {
        conditions.push("trace_turns.capture_mode = ?");
        parameters.push(query.captureMode);
      }
    }
    const normalizedQuery = query.query?.trim().toLowerCase() ?? "";
    if (normalizedQuery) {
      conditions.push(
        `(lower(trace_turns.user_message_summary) LIKE ?
          OR lower(COALESCE(managed_projects.name, '')) LIKE ?
          OR lower(COALESCE(trace_sessions.workspace_ref, '')) LIKE ?
          OR lower(COALESCE(trace_sessions.source_ref, '')) LIKE ?
          OR lower(COALESCE(trace_sessions.summary_json, '')) LIKE ?
          OR lower(trace_sessions.harness_id) LIKE ?
          OR EXISTS (
            SELECT 1
            FROM skill_hit_evidence search_hit
            JOIN skills search_skill ON search_skill.id = search_hit.skill_id
            WHERE search_hit.trace_id = trace_turns.trace_id
              AND lower(search_skill.display_name) LIKE ?
          ))`
      );
      const searchValue = `%${normalizedQuery}%`;
      parameters.push(searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue);
    }
    const safeLimit = Math.max(1, Math.min(query.limit ?? 100, 200));
    parameters.push(safeLimit);
    const rows = this.database.db.prepare(
      `SELECT trace_turns.*, trace_sessions.project_id, trace_sessions.harness_id,
              trace_sessions.adapter_id, trace_sessions.workspace_ref,
              trace_sessions.source_ref AS session_source_ref,
              trace_sessions.summary_json AS session_summary_json,
              trace_turns.capture_mode AS turn_capture_mode,
              trace_turns.confidence AS turn_confidence,
              managed_projects.name AS project_name
       FROM trace_turns
       JOIN trace_sessions ON trace_sessions.id = trace_turns.session_id
       LEFT JOIN managed_projects ON managed_projects.id = trace_sessions.project_id
       ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY trace_turns.received_at DESC
       LIMIT ?`
    ).all(...parameters) as Array<Record<string, unknown>>;
    const hitsByTrace = this.listHitsForTraces(rows.map((row) => String(row.trace_id)));
    return rows.map((row) => this.toListItem(row, hitsByTrace.get(String(row.trace_id)) ?? []));
  }

  getSessionTrace(traceId: string): SessionTraceDetail | null {
    const row = this.database.db.prepare(
      `SELECT trace_turns.*, trace_sessions.project_id, trace_sessions.harness_id,
              trace_sessions.adapter_id, trace_sessions.workspace_ref,
              trace_sessions.source_ref AS session_source_ref,
              trace_sessions.summary_json AS session_summary_json,
              trace_turns.capture_mode AS turn_capture_mode,
              trace_turns.confidence AS turn_confidence,
              managed_projects.name AS project_name
       FROM trace_turns
       JOIN trace_sessions ON trace_sessions.id = trace_turns.session_id
       LEFT JOIN managed_projects ON managed_projects.id = trace_sessions.project_id
       WHERE trace_turns.trace_id = ? LIMIT 1`
    ).get(traceId) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }
    const spans = this.database.db.prepare(
      `SELECT * FROM trace_spans WHERE trace_id = ? ORDER BY sequence, started_at`
    ).all(traceId).map((entry) => toSpan(entry as Record<string, unknown>));
    const events = this.database.db.prepare(
      `SELECT * FROM trace_events WHERE trace_id = ? ORDER BY sequence, occurred_at`
    ).all(traceId).map((entry) => this.toEvent(entry as Record<string, unknown>));
    const skillHits = this.listHits(traceId);
    return { turn: this.toListItem(row, skillHits), spans, events, skillHits };
  }

  getTraceSkillDetail(traceId: string, skillId: string): TraceSkillQuickDetail {
    const trace = this.getSessionTrace(traceId);
    if (!trace) {
      throw new Error("Session trace was not found.");
    }
    const hit = trace.skillHits.find((entry) => entry.skillId === skillId);
    if (!hit) {
      throw new Error("This Skill is not part of the selected trace.");
    }
    const skill = this.registryService.listSkills().find((entry) => entry.id === skillId);
    if (!skill) {
      throw new Error("The indexed Skill is no longer available.");
    }
    const currentVersion = this.database.db.prepare(
      `SELECT id, version_fingerprint, detected_at FROM skill_versions
       WHERE skill_id = ? AND is_current = 1 LIMIT 1`
    ).get(skillId) as { id: string; version_fingerprint: string; detected_at: string } | undefined;
    const runtimeVersion = hit.skillVersionId
      ? this.database.db.prepare(
          `SELECT id, version_fingerprint, detected_at FROM skill_versions
           WHERE id = ? AND skill_id = ? LIMIT 1`
        ).get(hit.skillVersionId, skillId) as { id: string; version_fingerprint: string; detected_at: string } | undefined
      : currentVersion;
    const versionDrift = Boolean(
      runtimeVersion?.id && currentVersion?.id && runtimeVersion.id !== currentVersion.id
    );
    const sourceFile = this.resolveSkillFile(skill.sourcePath);
    let content = "";
    let contentTruncated = false;
    if (!versionDrift && sourceFile && existsSync(sourceFile)) {
      const size = statSync(sourceFile).size;
      content = readFileSync(sourceFile, "utf8");
      if (size > maxSkillContentBytes || content.length > maxSkillContentBytes) {
        content = `${content.slice(0, maxSkillContentBytes)}\n\n[Content truncated in quick view]`;
        contentTruncated = true;
      }
    }
    return {
      traceId,
      skillId,
      canonicalName: skill.canonicalName,
      displayName: skill.displayName,
      description: skill.description,
      governanceRole: skill.governance.role,
      sourcePath: sourceFile ?? skill.sourcePath,
      versionId: runtimeVersion?.id ?? hit.skillVersionId,
      versionFingerprint: runtimeVersion?.version_fingerprint ?? null,
      currentVersionFingerprint: currentVersion?.version_fingerprint ?? skill.currentVersionFingerprint,
      versionDetectedAt: runtimeVersion?.detected_at ?? null,
      versionDrift,
      contentMode: versionDrift ? "unavailable" : "current_file",
      content,
      contentTruncated,
      hit,
      relatedSpans: trace.spans.filter((span) => span.skillId === skillId || span.parentSpanId === hit.spanId)
    };
  }

  getSkillSourcePath(skillId: string) {
    const skill = this.registryService.listSkills().find((entry) => entry.id === skillId);
    return skill ? this.resolveSkillFile(skill.sourcePath) ?? skill.sourcePath : null;
  }

  private sanitizePayload(record: JsonRecord, runId: string): JsonRecord {
    const skill = recordAt(record, "skill_ref");
    const workflow = recordAt(record, "workflow_ref");
    const usage = recordAt(record, "usage");
    const adapter = recordAt(record, "adapter");
    const harness = recordAt(record, "harness");
    const privacy = recordAt(record, "privacy");
    const skillName = readString(record, ["skill_name", "skillName", "name"]) ?? stringAt(skill, "name");
    const payload: JsonRecord = {
      runId,
      skillId: readString(record, ["skill_id", "skillId"]) ?? stringAt(skill, "id"),
      skillName,
      skillPath: readString(record, ["skill_path", "skillPath", "source_path", "sourcePath"])
        ?? stringAt(skill, "source_path")
        ?? stringAt(skill, "sourcePath"),
      workflowId: stringAt(workflow, "id"),
      workflowVersion: stringAt(workflow, "version"),
      workflowNodeId: stringAt(workflow, "node_id") ?? stringAt(workflow, "nodeId"),
      adapterId: stringAt(adapter, "id"),
      adapterVersion: stringAt(adapter, "version"),
      harnessId: stringAt(harness, "id"),
      modelName: readString(record, ["model_name", "modelName", "model"]),
      promptTokens: readNumber(record, ["prompt_tokens", "promptTokens"]) ?? readNumber(usage ?? {}, ["prompt_tokens", "promptTokens"]),
      completionTokens: readNumber(record, ["completion_tokens", "completionTokens"]) ?? readNumber(usage ?? {}, ["completion_tokens", "completionTokens"]),
      totalTokens: readNumber(record, ["total_tokens", "totalTokens"]) ?? readNumber(usage ?? {}, ["total_tokens", "totalTokens"]),
      tokenSource: stringAt(usage, "source"),
      durationMs: readNumber(record, ["duration_ms", "durationMs"]),
      toolCallCount: readNumber(record, ["tool_call_count", "toolCallCount"]),
      toolNames: readStrings(record, ["tool_names", "toolNames"]),
      workflowSignals: readStrings(record, ["workflow_signals", "workflowSignals"]),
      hitState: readString(record, ["skill_hit_state", "skillHitState", "hit_state", "hitState"]),
      hitIndex: readNumber(record, ["hit_index", "hitIndex"]),
      confidenceScore: readNumber(record, ["confidence_score", "confidenceScore"]),
      legacyBackfillVersion: readNumber(record, ["legacy_backfill_version", "legacyBackfillVersion"]),
      evidenceComponents: readValue(record, ["evidence_components", "evidenceComponents"]),
      userMessageSummary: readString(record, ["user_message_summary", "userMessageSummary", "message_summary", "messageSummary"]),
      messageHash: readString(record, ["message_hash", "messageHash"]),
      errorCode: readString(record, ["error_code", "errorCode"]),
      errorSummary: readString(record, ["error_summary", "errorSummary"])
        ?? stringAt(recordAt(record, "payload"), "error_summary"),
      redactionApplied: privacy?.redaction_applied === true
    };
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value != null));
  }

  private persistTrace(incoming: NormalizedTraceEvent[]) {
    const first = incoming[0];
    const skills = this.skillLookup();
    const project = this.findProject(first.workspaceRef);
    const timestamps = incoming.map((event) => event.occurredAt);
    const startedAt = earliestTimestamp(timestamps);
    const endedAt = latestTimestamp(timestamps);
    const eventTypes = incoming.map((event) => event.eventType);
    const status = traceStatus(eventTypes);
    const confidence = Math.max(...incoming.map((event) => event.confidence));
    const captureMode = incoming.some((event) => event.captureMode === "precise") ? "precise" : "estimated";
    const harnessId = first.harnessId ?? harnessForSource(first.sourceType);
    const adapterId = first.adapterId ?? `${harnessId}_jsonl_v1`;

    const existingSession = this.database.db.prepare(
      `SELECT started_at, last_observed_at, ended_at FROM trace_sessions WHERE id = ?`
    ).get(first.sessionId) as { started_at: string; last_observed_at: string; ended_at: string | null } | undefined;
    const sessionStartedAt = existingSession ? earliestTimestamp([existingSession.started_at, startedAt]) : startedAt;
    const sessionObservedAt = existingSession ? latestTimestamp([existingSession.last_observed_at, endedAt]) : endedAt;
    const sessionEndedAt = status === "running" ? existingSession?.ended_at ?? null : sessionObservedAt;
    this.database.db.prepare(
      `INSERT INTO trace_sessions (
         id, project_id, harness_id, adapter_id, workspace_ref, source_ref,
         started_at, last_observed_at, ended_at, status, capture_mode, confidence, summary_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         project_id = COALESCE(excluded.project_id, trace_sessions.project_id),
         harness_id = excluded.harness_id,
         adapter_id = excluded.adapter_id,
         workspace_ref = COALESCE(excluded.workspace_ref, trace_sessions.workspace_ref),
         source_ref = COALESCE(excluded.source_ref, trace_sessions.source_ref),
         started_at = excluded.started_at,
         last_observed_at = excluded.last_observed_at,
         ended_at = excluded.ended_at,
         status = excluded.status,
         capture_mode = excluded.capture_mode,
         confidence = excluded.confidence,
         summary_json = excluded.summary_json`
    ).run(
      first.sessionId,
      project?.id ?? null,
      harnessId,
      adapterId,
      first.workspaceRef,
      first.sourceRef,
      sessionStartedAt,
      sessionObservedAt,
      sessionEndedAt,
      status,
      captureMode,
      confidence,
      JSON.stringify({ sessionRef: first.sessionRef })
    );

    const existingTurn = this.database.db.prepare(
      `SELECT sequence FROM trace_turns WHERE id = ?`
    ).get(first.turnId) as { sequence: number } | undefined;
    const sequence = existingTurn?.sequence ?? Number(
      (this.database.db.prepare(`SELECT COUNT(*) AS count FROM trace_turns WHERE session_id = ?`)
        .get(first.sessionId) as { count: number }).count
    ) + 1;
    const explicitSummary = incoming
      .map((event) => event.payload.userMessageSummary)
      .find((value): value is string => typeof value === "string" && Boolean(value.trim()));
    const messageSummary = explicitSummary ?? "本地会话证据（未保存原始消息）";
    const messageHash = incoming
      .map((event) => event.payload.messageHash)
      .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
      ?? hash(`${first.turnRef}:${messageSummary}`, 32);

    const upsertEvent = this.database.db.prepare(
      `INSERT INTO trace_events (
         id, trace_id, turn_id, span_id, sequence, event_type, occurred_at,
         source_type, source_ref, capture_mode, evidence_hash, payload_json
       ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         sequence = excluded.sequence,
         event_type = excluded.event_type,
         occurred_at = excluded.occurred_at,
         source_type = excluded.source_type,
         source_ref = excluded.source_ref,
         capture_mode = excluded.capture_mode,
         evidence_hash = excluded.evidence_hash,
         payload_json = excluded.payload_json`
    );
    for (const event of incoming) {
      const payloadJson = JSON.stringify(event.payload);
      upsertEvent.run(
        event.id,
        event.traceId,
        event.turnId,
        event.sequence,
        event.eventType,
        event.occurredAt,
        event.sourceType,
        event.sourceRef,
        event.captureMode,
        hash(`${event.eventType}:${event.occurredAt}:${payloadJson}`, 40),
        payloadJson
      );
    }

    const storedEvents = this.database.db.prepare(
      `SELECT * FROM trace_events WHERE trace_id = ? ORDER BY sequence, occurred_at`
    ).all(first.traceId) as Array<Record<string, unknown>>;
    const storedTimestamps = storedEvents.map((event) => String(event.occurred_at));
    const turnStartedAt = earliestTimestamp(storedTimestamps);
    const turnEndedAt = latestTimestamp(storedTimestamps);
    const turnStatus = traceStatus(storedEvents.map((event) => String(event.event_type)));
    const turnCaptureMode: TraceCaptureMode = storedEvents.some(
      (event) => String(event.capture_mode) === "precise"
    )
      ? "precise"
      : "estimated";
    const turnConfidence = Math.max(
      ...storedEvents.map((event) => {
        const payload = safeJson(String(event.payload_json));
        return normalizedConfidence(
          typeof payload.confidenceScore === "number" ? payload.confidenceScore : null
        );
      }),
      0.45
    );
    const isLegacyAggregate = storedEvents.some((event) => {
      const payload = safeJson(String(event.payload_json));
      return typeof payload.legacyBackfillVersion === "number";
    });
    const tokenByRun = new Map<string, number>();
    for (const event of storedEvents) {
      const payload = safeJson(String(event.payload_json));
      const runId = typeof payload.runId === "string" ? payload.runId : String(event.id);
      const totalTokens = typeof payload.totalTokens === "number" ? payload.totalTokens : 0;
      tokenByRun.set(runId, Math.max(tokenByRun.get(runId) ?? 0, totalTokens));
    }
    const totalTokens = Array.from(tokenByRun.values()).reduce((sum, value) => sum + value, 0);
    const resolvedSkillIds = new Set<string>();
    for (const event of storedEvents) {
      const resolved = this.resolveSkill(safeJson(String(event.payload_json)), skills);
      if (resolved) {
        resolvedSkillIds.add(resolved.id);
      }
    }
    const preciseInvokedSkillIds = new Set<string>();
    for (const event of storedEvents) {
      if (String(event.capture_mode) !== "precise") {
        continue;
      }
      const skill = this.resolveSkill(safeJson(String(event.payload_json)), skills);
      if (skill && isPreciseSkillInvocation([String(event.event_type)])) {
        preciseInvokedSkillIds.add(skill.id);
      }
    }
    const durationMs = Math.max(new Date(turnEndedAt).getTime() - new Date(turnStartedAt).getTime(), 0);
    this.database.db.prepare(
      `INSERT INTO trace_turns (
         id, session_id, trace_id, sequence, user_message_summary, message_hash,
         received_at, completed_at, status, skill_candidate_count, skill_invoked_count,
         total_tokens, duration_ms, capture_mode, confidence, source_run_ref, summary_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         user_message_summary = excluded.user_message_summary,
         message_hash = excluded.message_hash,
         received_at = excluded.received_at,
         completed_at = excluded.completed_at,
         status = excluded.status,
         skill_candidate_count = excluded.skill_candidate_count,
         skill_invoked_count = excluded.skill_invoked_count,
         total_tokens = excluded.total_tokens,
         duration_ms = excluded.duration_ms,
         capture_mode = excluded.capture_mode,
         confidence = excluded.confidence,
         source_run_ref = excluded.source_run_ref,
         summary_json = excluded.summary_json`
    ).run(
      first.turnId,
      first.sessionId,
      first.traceId,
      sequence,
      messageSummary,
      messageHash,
      turnStartedAt,
      turnStatus === "running" ? null : turnEndedAt,
      turnStatus,
      resolvedSkillIds.size,
      preciseInvokedSkillIds.size,
      totalTokens,
      durationMs,
      turnCaptureMode,
      turnConfidence,
      first.runId,
      JSON.stringify({
        turnRef: first.turnRef,
        rawContentStored: false,
        evidenceKind: isLegacyAggregate ? "legacy_aggregate" : "message_turn"
      })
    );
    this.rebuildTraceSpans(first.traceId, first.turnId, storedEvents, skills, project?.id ?? null);
  }

  private rebuildTraceSpans(
    traceId: string,
    turnId: string,
    events: Array<Record<string, unknown>>,
    skills: SkillLookupRow[],
    projectId: string | null
  ) {
    this.database.db.prepare(`DELETE FROM trace_spans WHERE trace_id = ?`).run(traceId);
    this.database.db.prepare(`DELETE FROM skill_hit_evidence WHERE trace_id = ?`).run(traceId);
    const timestamps = events.map((event) => String(event.occurred_at));
    const startedAt = earliestTimestamp(timestamps);
    const endedAt = latestTimestamp(timestamps);
    const status = traceStatus(events.map((event) => String(event.event_type)));
    const isLegacyAggregate = events.some((event) => {
      const payload = safeJson(String(event.payload_json));
      return typeof payload.legacyBackfillVersion === "number";
    });
    const turn = this.database.db.prepare(`SELECT total_tokens FROM trace_turns WHERE id = ?`).get(turnId) as { total_tokens: number };
    let sequence = 0;
    const insertSpan = this.database.db.prepare(
      `INSERT INTO trace_spans (
         id, trace_id, turn_id, parent_span_id, sequence, span_type, phase, name,
         started_at, ended_at, duration_ms, status, capture_mode, confidence,
         skill_id, skill_version_id, workflow_id, workflow_node_id,
         token_count, tool_call_count, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const addSpan = (input: {
      id: string;
      parentSpanId?: string | null;
      spanType: TraceSpanType;
      phase: string;
      name: string;
      startedAt?: string;
      endedAt?: string | null;
      status?: "running" | "completed" | "failed";
      captureMode?: TraceCaptureMode;
      confidence?: number;
      skillId?: string | null;
      skillVersionId?: string | null;
      workflowId?: string | null;
      workflowNodeId?: string | null;
      tokenCount?: number;
      toolCallCount?: number;
      metadata?: JsonRecord;
    }) => {
      sequence += 1;
      const spanStartedAt = input.startedAt ?? startedAt;
      const spanEndedAt = input.endedAt === undefined ? endedAt : input.endedAt;
      insertSpan.run(
        input.id,
        traceId,
        turnId,
        input.parentSpanId ?? null,
        sequence,
        input.spanType,
        input.phase,
        input.name,
        spanStartedAt,
        spanEndedAt,
        spanEndedAt ? Math.max(new Date(spanEndedAt).getTime() - new Date(spanStartedAt).getTime(), 0) : null,
        input.status ?? status,
        input.captureMode ?? "inferred",
        input.confidence ?? 0.6,
        input.skillId ?? null,
        input.skillVersionId ?? null,
        input.workflowId ?? null,
        input.workflowNodeId ?? null,
        input.tokenCount ?? 0,
        input.toolCallCount ?? 0,
        JSON.stringify(input.metadata ?? {})
      );
      return input.id;
    };

    const rootSpanId = addSpan({
      id: hashId("span", `${traceId}:turn`),
      spanType: "turn",
      phase: isLegacyAggregate ? "aggregate" : "request",
      name: isLegacyAggregate ? "历史运行聚合" : "用户消息与响应",
      captureMode: events.some((event) => String(event.capture_mode) === "precise") ? "precise" : "estimated",
      confidence: Math.max(
        ...events.map((event) => {
          const payload = safeJson(String(event.payload_json));
          return normalizedConfidence(
            typeof payload.confidenceScore === "number" ? payload.confidenceScore : null
          );
        }),
        0.45
      ),
      tokenCount: Number(turn.total_tokens ?? 0),
      metadata: { rawContentStored: false, evidenceKind: isLegacyAggregate ? "legacy_aggregate" : "message_turn" }
    });
    const routeSpanId = addSpan({
      id: hashId("span", `${traceId}:route`),
      parentSpanId: rootSpanId,
      spanType: "system_route",
      phase: "route",
      name: "系统路由",
      captureMode: "inferred",
      confidence: 0.55,
      metadata: { evidenceBoundary: "由会话中的 Skill、Tool 与项目路径信号补全，非 Harness 精确路由事件。" }
    });

    const updateEventSpan = this.database.db.prepare(`UPDATE trace_events SET span_id = ? WHERE id = ?`);
    const allWorkflowSignals = Array.from(new Set(events.flatMap((event) => {
      const payload = safeJson(String(event.payload_json));
      return Array.isArray(payload.workflowSignals)
        ? payload.workflowSignals.filter((entry): entry is string => typeof entry === "string")
        : [];
    })));
    const workflowEvents = events.filter((event) => {
      const payload = safeJson(String(event.payload_json));
      return typeof payload.workflowId === "string" && Boolean(payload.workflowId);
    });
    const workflowIds = Array.from(new Set(workflowEvents.map((event) => {
      const payload = safeJson(String(event.payload_json));
      return String(payload.workflowId);
    })));
    let workflowSpanId: string | null = null;
    if (allWorkflowSignals.length > 0 || workflowIds.length > 0) {
      const exactWorkflowEvents = workflowEvents.filter((event) => String(event.capture_mode) === "precise");
      const workflowVersions = Array.from(new Set(workflowEvents.map((event) => {
        const payload = safeJson(String(event.payload_json));
        return typeof payload.workflowVersion === "string" ? payload.workflowVersion : null;
      }).filter((value): value is string => Boolean(value))));
      const workflowNodeIds = Array.from(new Set(workflowEvents.map((event) => {
        const payload = safeJson(String(event.payload_json));
        return typeof payload.workflowNodeId === "string" ? payload.workflowNodeId : null;
      }).filter((value): value is string => Boolean(value))));
      workflowSpanId = addSpan({
        id: hashId("span", `${traceId}:workflow`),
        parentSpanId: routeSpanId,
        spanType: "workflow",
        phase: "orchestrate",
        name: workflowIds[0] ?? "Workflow 信号",
        captureMode: exactWorkflowEvents.length > 0 ? "precise" : "inferred",
        confidence: exactWorkflowEvents.length > 0 ? 1 : 0.68,
        workflowId: workflowIds[0] ?? null,
        workflowNodeId: workflowNodeIds[0] ?? null,
        metadata: {
          workflowIds,
          versions: workflowVersions,
          workflowNodeIds,
          signals: allWorkflowSignals,
          evidenceBoundary: exactWorkflowEvents.length > 0 ? "explicit_event" : "log_inference"
        }
      });
      for (const event of workflowEvents) {
        updateEventSpan.run(workflowSpanId, String(event.id));
      }
    }

    const eventsBySkill = new Map<string, { skill: SkillLookupRow; events: Array<Record<string, unknown>> }>();
    for (const event of events) {
      const skill = this.resolveSkill(safeJson(String(event.payload_json)), skills);
      if (!skill) {
        continue;
      }
      const group = eventsBySkill.get(skill.id) ?? { skill, events: [] };
      group.events.push(event);
      eventsBySkill.set(skill.id, group);
    }

    const insertHit = this.database.db.prepare(
      `INSERT INTO skill_hit_evidence (
         id, trace_id, turn_id, span_id, skill_id, skill_version_id, hit_state,
         hit_index, confidence, capture_mode, scoring_version, evidence_summary,
         evidence_json, occurred_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const sharedInferredTools = new Set<string>();
    const directlyAttachedTools = new Set<string>();

    for (const { skill, events: skillEvents } of eventsBySkill.values()) {
      const payloads = skillEvents.map((event) => safeJson(String(event.payload_json)));
      const precise = skillEvents.some((event) => String(event.capture_mode) === "precise");
      const eventTypes = skillEvents.map((event) => String(event.event_type));
      const skillStatus = traceStatus(eventTypes);
      const skillStartedAt = earliestTimestamp(skillEvents.map((event) => String(event.occurred_at)));
      const skillEndedAt = latestTimestamp(skillEvents.map((event) => String(event.occurred_at)));
      const tools = Array.from(new Set(payloads.flatMap((payload) =>
        Array.isArray(payload.toolNames)
          ? payload.toolNames.filter((entry): entry is string => typeof entry === "string")
          : []
      )));
      const evidence = this.buildHitEvidence(payloads, Boolean(projectId), skillEvents.length);
      const explicitIndex = payloads
        .map((payload) => typeof payload.hitIndex === "number" ? payload.hitIndex : null)
        .find((value): value is number => value != null);
      const hitState: SkillHitState = precise
        ? preciseSkillHitState(eventTypes)
        : "inferred";
      const hitIndex = precise
        ? preciseHitIndex(hitState)
        : Math.min(89, Math.max(0, explicitIndex != null ? (explicitIndex <= 1 ? explicitIndex * 100 : explicitIndex) : evidence.reduce((sum, item) => sum + item.score, 0)));
      const confidence = precise
        ? 1
        : Math.max(
            ...payloads.map((payload) => normalizedConfidence(
              typeof payload.confidenceScore === "number" ? payload.confidenceScore : null
            )),
            0.45
          );
      const attachToolsToSkill = precise || eventsBySkill.size === 1;
      for (const toolName of tools) {
        if (attachToolsToSkill) {
          directlyAttachedTools.add(toolName);
        } else {
          sharedInferredTools.add(toolName);
        }
      }
      const tokenByRun = new Map<string, number>();
      for (const payload of payloads) {
        const runId = typeof payload.runId === "string" ? payload.runId : skill.id;
        const tokens = typeof payload.totalTokens === "number" ? payload.totalTokens : 0;
        tokenByRun.set(runId, Math.max(tokenByRun.get(runId) ?? 0, tokens));
      }
      const skillTokenCount = Array.from(tokenByRun.values()).reduce((sum, value) => sum + value, 0);
      const spanId = addSpan({
        id: hashId("span", `${traceId}:skill:${skill.id}`),
        parentSpanId: workflowSpanId ?? routeSpanId,
        spanType: "skill",
        phase: "execute",
        name: skill.display_name,
        startedAt: skillStartedAt,
        endedAt: skillStatus === "running" ? null : skillEndedAt,
        status: skillStatus,
        captureMode: precise ? "precise" : "estimated",
        confidence,
        skillId: skill.id,
        skillVersionId: skill.version_id,
        tokenCount: skillTokenCount,
        toolCallCount: attachToolsToSkill ? tools.length : 0,
        metadata: { hitState, hitIndex, evidenceBoundary: precise ? "explicit_event" : "log_inference" }
      });
      for (const event of skillEvents) {
        updateEventSpan.run(spanId, String(event.id));
      }
      const hitId = hashId("hit", `${traceId}:${skill.id}`);
      insertHit.run(
        hitId,
        traceId,
        turnId,
        spanId,
        skill.id,
        skill.version_id,
        hitState,
        Math.round(hitIndex),
        confidence,
        precise ? "precise" : "estimated",
        scoringVersion,
        precise
          ? (hitState === "invoked" || hitState === "completed" || hitState === "failed"
              ? "Harness 明确上报 Skill 调用。"
              : `Harness 明确上报 Skill ${hitState} 状态，未计为调用。`)
          : `${evidence.length} 项本地证据支持该 Skill 命中。`,
        JSON.stringify(evidence),
        skillStartedAt
      );

      for (const toolName of attachToolsToSkill ? tools : []) {
        addSpan({
          id: hashId("span", `${traceId}:skill:${skill.id}:tool:${toolName}`),
          parentSpanId: spanId,
          spanType: "tool",
          phase: "tool_call",
          name: toolName,
          startedAt: skillStartedAt,
          endedAt: skillEndedAt,
          status: skillStatus,
          captureMode: precise ? "precise" : "inferred",
          confidence: precise ? 1 : 0.62,
          metadata: { source: "normalized_tool_names" }
        });
      }
    }

    for (const toolName of sharedInferredTools) {
      if (directlyAttachedTools.has(toolName)) {
        continue;
      }
      addSpan({
        id: hashId("span", `${traceId}:shared-tool:${toolName}`),
        parentSpanId: workflowSpanId ?? routeSpanId,
        spanType: "tool",
        phase: "tool_call",
        name: toolName,
        startedAt,
        endedAt,
        status,
        captureMode: "inferred",
        confidence: 0.62,
        metadata: {
          source: "normalized_tool_names",
          association: "turn_shared",
          evidenceBoundary: "日志证明此 Turn 使用了该工具，但不能精确归属到某个推断 Skill。"
        }
      });
    }

    addSpan({
      id: hashId("span", `${traceId}:verification`),
      parentSpanId: rootSpanId,
      spanType: "verification",
      phase: "verify",
      name: status === "failed" ? "执行失败证据" : "执行完成验证",
      status,
      captureMode: "inferred",
      confidence: 0.64,
      metadata: { sourceEventTypes: Array.from(new Set(events.map((event) => String(event.event_type)))) }
    });
    addSpan({
      id: hashId("span", `${traceId}:response`),
      parentSpanId: rootSpanId,
      spanType: "response",
      phase: "respond",
      name: isLegacyAggregate ? "运行记录结束" : "响应完成",
      status,
      captureMode: "inferred",
      confidence: 0.58,
      metadata: { rawResponseStored: false, evidenceKind: isLegacyAggregate ? "legacy_aggregate" : "message_turn" }
    });
  }

  private buildHitEvidence(payloads: JsonRecord[], projectMatched: boolean, eventCount: number) {
    const provided = payloads.flatMap((payload) => parseEvidence(payload.evidenceComponents));
    if (provided.length > 0) {
      return provided;
    }
    const workflowSignals = Array.from(new Set(payloads.flatMap((payload) =>
      Array.isArray(payload.workflowSignals) ? payload.workflowSignals.filter((entry): entry is string => typeof entry === "string") : []
    )));
    const tools = Array.from(new Set(payloads.flatMap((payload) =>
      Array.isArray(payload.toolNames) ? payload.toolNames.filter((entry): entry is string => typeof entry === "string") : []
    )));
    const evidence: TraceSkillHitSummary["evidence"] = [];
    if (workflowSignals.length > 0) {
      evidence.push({ key: "workflow_route", label: "Workflow 路由", score: 30, detail: workflowSignals.join("、") });
    }
    evidence.push({ key: "skill_reference", label: "Skill 引用", score: 25, detail: "日志包含可解析的 Skill 名称或路径。" });
    if (projectMatched) {
      evidence.push({ key: "project_profile", label: "项目匹配", score: 20, detail: "会话目录命中已绑定项目。" });
    }
    if (tools.length > 0) {
      evidence.push({ key: "tool_signal", label: "工具信号", score: 15, detail: tools.join("、") });
    }
    if (eventCount > 1) {
      evidence.push({ key: "temporal_adjacency", label: "时序相邻", score: 10, detail: `${eventCount} 条同 Turn 事件时序一致。` });
    }
    return evidence;
  }

  private skillLookup() {
    return this.database.db.prepare(
      `SELECT skills.id, skills.canonical_name, skills.display_name, skills.source_path,
              skill_versions.id AS version_id
       FROM skills
       LEFT JOIN skill_versions ON skill_versions.skill_id = skills.id AND skill_versions.is_current = 1
       WHERE skills.is_active = 1`
    ).all() as SkillLookupRow[];
  }

  private resolveSkill(payload: JsonRecord, skills: SkillLookupRow[]) {
    const skillId = typeof payload.skillId === "string" ? payload.skillId : null;
    const skillName = typeof payload.skillName === "string" ? payload.skillName.toLowerCase() : null;
    const skillPath = typeof payload.skillPath === "string" ? resolve(payload.skillPath) : null;
    return skills.find((skill) => skill.id === skillId)
      ?? skills.find((skill) => skillName != null && (
        skill.canonical_name.toLowerCase() === skillName || skill.display_name.toLowerCase() === skillName
      ))
      ?? skills.find((skill) => skillPath != null && (
        resolve(skill.source_path) === skillPath || resolve(skill.source_path, "SKILL.md") === skillPath
      ))
      ?? null;
  }

  private findProject(workspaceRef: string | null) {
    if (!workspaceRef) {
      return null;
    }
    const workspace = resolve(workspaceRef);
    const projects = this.database.db.prepare(
      `SELECT id, path FROM managed_projects ORDER BY length(path) DESC`
    ).all() as Array<{ id: string; path: string }>;
    return projects.find((project) => workspace === resolve(project.path) || workspace.startsWith(`${resolve(project.path)}/`)) ?? null;
  }

  private listHits(traceId: string): TraceSkillHitSummary[] {
    return this.listHitsForTraces([traceId]).get(traceId) ?? [];
  }

  private listHitsForTraces(traceIds: string[]) {
    const hitsByTrace = new Map<string, TraceSkillHitSummary[]>();
    if (traceIds.length === 0) {
      return hitsByTrace;
    }
    const placeholders = traceIds.map(() => "?").join(", ");
    const rows = this.database.db.prepare(
      `SELECT skill_hit_evidence.*, skills.display_name
       FROM skill_hit_evidence
       JOIN skills ON skills.id = skill_hit_evidence.skill_id
       WHERE trace_id IN (${placeholders})
       ORDER BY trace_id, hit_index DESC, occurred_at`
    ).all(...traceIds) as Array<Record<string, unknown>>;
    for (const row of rows) {
      const traceId = String(row.trace_id);
      const entries = hitsByTrace.get(traceId) ?? [];
      entries.push(this.toHit(row));
      hitsByTrace.set(traceId, entries);
    }
    return hitsByTrace;
  }

  private toHit(row: Record<string, unknown>): TraceSkillHitSummary {
    let rawEvidence: unknown = [];
    try {
      rawEvidence = JSON.parse(String(row.evidence_json)) as unknown;
    } catch {
      rawEvidence = [];
    }
    return {
      id: String(row.id),
      spanId: String(row.span_id),
      skillId: String(row.skill_id),
      skillName: String(row.display_name),
      skillVersionId: row.skill_version_id ? String(row.skill_version_id) : null,
      hitState: String(row.hit_state) as SkillHitState,
      hitIndex: Number(row.hit_index ?? 0),
      confidence: Number(row.confidence ?? 0),
      captureMode: normalizeCaptureMode(String(row.capture_mode)),
      scoringVersion: String(row.scoring_version),
      evidenceSummary: String(row.evidence_summary),
      evidence: parseEvidence(rawEvidence),
      occurredAt: String(row.occurred_at)
    };
  }

  private toListItem(
    row: Record<string, unknown>,
    skillHits: TraceSkillHitSummary[] = []
  ): SessionTraceListItem {
    const traceId = String(row.trace_id);
    const turnSummary = safeJson(row.summary_json ? String(row.summary_json) : null);
    const sessionSummary = safeJson(row.session_summary_json ? String(row.session_summary_json) : null);
    const sourceRef = row.session_source_ref ? String(row.session_source_ref) : null;
    const sessionRef = normalizeSessionRef(
      typeof sessionSummary.sessionRef === "string"
        ? sessionSummary.sessionRef
        : sourceRef ?? String(row.session_id)
    );
    return {
      sessionId: String(row.session_id),
      sessionRef,
      sourceRef,
      turnId: String(row.id),
      traceId,
      projectId: row.project_id ? String(row.project_id) : null,
      projectName: row.project_name ? String(row.project_name) : null,
      workspaceRef: row.workspace_ref ? String(row.workspace_ref) : null,
      harnessId: String(row.harness_id),
      adapterId: String(row.adapter_id),
      evidenceKind: turnSummary.evidenceKind === "legacy_aggregate" ? "legacy_aggregate" : "message_turn",
      messageSummary: String(row.user_message_summary),
      receivedAt: String(row.received_at),
      completedAt: row.completed_at ? String(row.completed_at) : null,
      status: String(row.status) as SessionTraceListItem["status"],
      durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
      totalTokens: Number(row.total_tokens ?? 0),
      skillCandidateCount: Number(row.skill_candidate_count ?? 0),
      skillInvokedCount: Number(row.skill_invoked_count ?? 0),
      captureMode: normalizeCaptureMode(String(row.turn_capture_mode ?? row.capture_mode)),
      confidence: Number(row.turn_confidence ?? row.confidence ?? 0),
      skillHits
    };
  }

  private toEvent(row: Record<string, unknown>): TraceEventSummary {
    return {
      id: String(row.id),
      traceId: String(row.trace_id),
      turnId: String(row.turn_id),
      spanId: row.span_id ? String(row.span_id) : null,
      sequence: Number(row.sequence ?? 0),
      eventType: String(row.event_type),
      occurredAt: String(row.occurred_at),
      sourceType: String(row.source_type),
      sourceRef: row.source_ref ? String(row.source_ref) : null,
      captureMode: normalizeCaptureMode(String(row.capture_mode)),
      evidenceHash: String(row.evidence_hash)
    };
  }

  private resolveSkillFile(sourcePath: string) {
    const resolved = resolve(sourcePath);
    if (resolved.endsWith("SKILL.md")) {
      return resolved;
    }
    const candidate = join(resolved, "SKILL.md");
    return existsSync(candidate) ? candidate : null;
  }
}
