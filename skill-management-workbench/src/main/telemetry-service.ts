import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import type {
  DailyMetricsSummary,
  SkillMetricLeader,
  SkillRunSummary,
  SkillWasteLeader,
  TelemetryImportResult
} from "../shared/types";
import type { WeeklyMetricsSummary } from "../shared/types";
import type { AuthorizationService } from "./authorization-service";
import type { WorkbenchDatabase } from "./database";

type JsonRecord = Record<string, unknown>;

interface SkillRefHint {
  skillId?: string;
  skillName?: string;
  skillPath?: string;
}

interface MutableRunPatch {
  runId: string;
  skillRef: SkillRefHint;
  startedAt?: string;
  firstOutputAt?: string;
  firstOutputLatencyMs?: number;
  finishedAt?: string;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  modelName?: string;
  toolCallCount?: number;
  status?: "running" | "completed" | "failed";
  captureMode?: string;
  confidenceScore?: number;
  sourceType?: string;
  errorCode?: string;
  errorSummary?: string;
  workspaceRef?: string;
  sessionRef?: string;
  policyRef?: string;
  sourceRef?: string;
  eventCount: number;
}

interface ExistingRunRow {
  id: string;
  skill_id: string;
  skill_version_id: string | null;
  capture_mode: string;
  confidence_score: number;
  source_type: string;
  started_at: string;
  first_output_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  model_name: string | null;
  tool_call_count: number;
  status: string;
  error_code: string | null;
  error_summary: string | null;
  summary_json: string;
}

interface SkillLookupRow {
  id: string;
  canonical_name: string;
  display_name: string;
  source_path: string;
}

interface DailyAggregateRow {
  runs_count: number;
  success_count: number;
  failure_count: number;
  avg_duration_ms: number | null;
  max_duration_ms: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  tool_call_count: number;
}

interface WasteLeaderRow extends Record<string, unknown> {
  skill_id: string;
  display_name: string;
  runs_count: number;
  success_count: number;
  failure_count: number;
  avg_duration_ms: number | null;
  max_duration_ms: number | null;
  total_tokens: number;
  estimated_cost_usd: number;
  failure_rate: number;
  avg_tokens_per_run: number;
  waste_score: number;
}

type RunStatus = SkillRunSummary["status"];

function nowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonLine(value: string): JsonRecord | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getContainers(record: JsonRecord) {
  const payload = isRecord(record.payload) ? record.payload : null;
  const skillRoot = isRecord(record.skill) ? record.skill : null;
  const skillPayload = payload && isRecord(payload.skill) ? payload.skill : null;
  return [record, payload, skillRoot, skillPayload].filter((value): value is JsonRecord => Boolean(value));
}

function readValue(record: JsonRecord, keys: string[]): unknown {
  for (const container of getContainers(record)) {
    for (const key of keys) {
      if (key in container) {
        return container[key];
      }
    }
  }
  return undefined;
}

function readString(record: JsonRecord, keys: string[]): string | undefined {
  const value = readValue(record, keys);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(record: JsonRecord, keys: string[]): number | undefined {
  const value = readValue(record, keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeTimestamp(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString();
}

function pickEarlier(first?: string, second?: string): string | undefined {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }
  return new Date(first).getTime() <= new Date(second).getTime() ? first : second;
}

function pickLater(first?: string, second?: string): string | undefined {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }
  return new Date(first).getTime() >= new Date(second).getTime() ? first : second;
}

function normalizeSkillPath(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const resolved = resolve(value);
  return resolved.endsWith("/SKILL.md") ? dirname(resolved) : resolved;
}

function skillPathHash(path: string) {
  return createHash("sha256").update(resolve(path)).digest("hex");
}

function localDateKey(timestamp: string) {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function localDateOffsetKey(dateKey: string, offsetDays: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return localDateKey(date.toISOString());
}

function mergeNumber(current: number | undefined, next: number | undefined) {
  return typeof next === "number" ? next : current;
}

function normalizeRunStatus(value: string | null | undefined): RunStatus {
  if (value === "completed" || value === "failed") {
    return value;
  }
  return "running";
}

function readSummaryNumber(record: JsonRecord, key: string) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function safeParseSummary(value: string | null | undefined): JsonRecord {
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

function buildLeader(row: Record<string, unknown>): SkillMetricLeader {
  return {
    skillId: String(row.skill_id),
    skillName: String(row.display_name),
    runsCount: Number(row.runs_count ?? 0),
    successCount: Number(row.success_count ?? 0),
    failureCount: Number(row.failure_count ?? 0),
    avgDurationMs:
      typeof row.avg_duration_ms === "number"
        ? row.avg_duration_ms
        : row.avg_duration_ms
          ? Number(row.avg_duration_ms)
          : null,
    maxDurationMs:
      typeof row.max_duration_ms === "number"
        ? row.max_duration_ms
        : row.max_duration_ms
          ? Number(row.max_duration_ms)
          : null,
    totalTokens: Number(row.total_tokens ?? 0),
    estimatedCostUsd: Number(row.estimated_cost_usd ?? 0)
  };
}

function buildWasteLeader(row: WasteLeaderRow): SkillWasteLeader {
  return {
    ...buildLeader(row),
    failureRate: Number(row.failure_rate ?? 0),
    avgTokensPerRun: Number(row.avg_tokens_per_run ?? 0),
    wasteScore: Number(row.waste_score ?? 0)
  };
}

function toRunSummary(row: Record<string, unknown>): SkillRunSummary {
  const startedAt = String(row.started_at);
  const firstOutputAt = row.first_output_at ? String(row.first_output_at) : null;
  const firstOutputLatencyMs =
    firstOutputAt != null
      ? Math.max(new Date(firstOutputAt).getTime() - new Date(startedAt).getTime(), 0)
      : null;
  const summary = safeParseSummary(row.summary_json ? String(row.summary_json) : null);
  const workspaceRef =
    typeof summary.workspaceRef === "string" && summary.workspaceRef.trim()
      ? summary.workspaceRef
      : null;

  return {
    runId: String(row.id),
    skillId: String(row.skill_id),
    skillName: String(row.display_name),
    status: normalizeRunStatus(row.status ? String(row.status) : undefined),
    startedAt,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    durationMs:
      typeof row.duration_ms === "number"
        ? row.duration_ms
        : row.duration_ms
          ? Number(row.duration_ms)
          : null,
    totalTokens: Number(row.total_tokens ?? 0),
    estimatedCostUsd: Number(row.estimated_cost_usd ?? 0),
    modelName: row.model_name ? String(row.model_name) : null,
    toolCallCount: Number(row.tool_call_count ?? 0),
    captureMode: String(row.capture_mode),
    confidenceScore: Number(row.confidence_score ?? 0),
    sourceType: String(row.source_type),
    workspaceRef,
    firstOutputLatencyMs
  };
}

export class TelemetryService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly authorizationService: AuthorizationService
  ) {}

  async importJsonlFile(filePath: string): Promise<TelemetryImportResult> {
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      throw new Error("Grant authorization before importing telemetry.");
    }
    if (policy.telemetryMode === "disabled") {
      throw new Error("Telemetry is disabled in the active authorization policy.");
    }

    const patches = new Map<string, MutableRunPatch>();
    const errors: string[] = [];
    let linesRead = 0;
    let processedEvents = 0;
    let ignoredEvents = 0;

    const input = createReadStream(filePath, { encoding: "utf8" });
    const reader = createInterface({ input, crlfDelay: Infinity });

    try {
      for await (const rawLine of reader) {
        linesRead += 1;
        const line = rawLine.trim();
        if (!line) {
          continue;
        }

        const record = parseJsonLine(line);
        if (!record) {
          errors.push(`Line ${linesRead}: invalid JSON object.`);
          continue;
        }

        const eventType = readString(record, ["event_type", "eventType", "type"]);
        if (!eventType) {
          errors.push(`Line ${linesRead}: missing event_type.`);
          continue;
        }

        if (
          ![
            "skill_run.started",
            "skill_run.first_output",
            "skill_run.tool_called",
            "skill_run.completed",
            "skill_run.failed"
          ].includes(eventType)
        ) {
          ignoredEvents += 1;
          continue;
        }

        const runId = readString(record, ["run_id", "runId", "id"]);
        if (!runId) {
          errors.push(`Line ${linesRead}: ${eventType} is missing run_id.`);
          continue;
        }

        const patch =
          patches.get(runId) ??
          ({
            runId,
            skillRef: {},
            eventCount: 0
          } satisfies MutableRunPatch);

        patch.eventCount += 1;
        patch.sourceType = readString(record, ["source_type", "sourceType"]) ?? patch.sourceType;
        patch.captureMode = readString(record, ["capture_mode", "captureMode"]) ?? patch.captureMode;
        patch.confidenceScore = mergeNumber(
          patch.confidenceScore,
          readNumber(record, ["confidence_score", "confidenceScore"])
        );
        patch.modelName = readString(record, ["model_name", "modelName", "model"]) ?? patch.modelName;
        patch.promptTokens = mergeNumber(
          patch.promptTokens,
          readNumber(record, ["prompt_tokens", "promptTokens"])
        );
        patch.completionTokens = mergeNumber(
          patch.completionTokens,
          readNumber(record, ["completion_tokens", "completionTokens"])
        );
        patch.totalTokens = mergeNumber(
          patch.totalTokens,
          readNumber(record, ["total_tokens", "totalTokens"])
        );
        patch.estimatedCostUsd = mergeNumber(
          patch.estimatedCostUsd,
          readNumber(record, ["estimated_cost_usd", "estimatedCostUsd"])
        );
        const explicitToolCallCount = readNumber(record, ["tool_call_count", "toolCallCount"]) ?? 0;
        patch.toolCallCount = Math.max(patch.toolCallCount ?? 0, explicitToolCallCount);
        patch.workspaceRef = readString(record, ["workspace_ref", "workspaceRef"]) ?? patch.workspaceRef;
        patch.sessionRef = readString(record, ["session_ref", "sessionRef"]) ?? patch.sessionRef;
        patch.policyRef = readString(record, ["policy_ref", "policyRef"]) ?? patch.policyRef;
        patch.sourceRef = readString(record, ["source_ref", "sourceRef"]) ?? patch.sourceRef;

        const skillId = readString(record, ["skill_id", "skillId"]);
        const skillName = readString(record, ["skill_name", "skillName", "name"]);
        const skillPath = normalizeSkillPath(
          readString(record, ["skill_path", "skillPath", "source_path", "sourcePath", "path"])
        );

        patch.skillRef = {
          skillId: skillId ?? patch.skillRef.skillId,
          skillName: skillName ?? patch.skillRef.skillName,
          skillPath: skillPath ?? patch.skillRef.skillPath
        };

        const occurredAt = normalizeTimestamp(
          readString(record, ["occurred_at", "occurredAt", "timestamp", "created_at", "createdAt"])
        );
        const startedAt = normalizeTimestamp(
          readString(record, ["started_at", "startedAt"])
        );
        const finishedAt = normalizeTimestamp(
          readString(record, ["finished_at", "finishedAt"])
        );

        if (eventType === "skill_run.started") {
          patch.startedAt = pickEarlier(patch.startedAt, startedAt ?? occurredAt);
          patch.status = patch.status === "completed" || patch.status === "failed" ? patch.status : "running";
        }

        if (eventType === "skill_run.first_output") {
          patch.firstOutputLatencyMs = mergeNumber(
            patch.firstOutputLatencyMs,
            readNumber(record, ["latency_ms", "latencyMs"])
          );
          patch.firstOutputAt = pickEarlier(patch.firstOutputAt, finishedAt ?? occurredAt);
        }

        if (eventType === "skill_run.tool_called" && explicitToolCallCount === 0) {
          patch.toolCallCount = (patch.toolCallCount ?? 0) + 1;
        }

        if (eventType === "skill_run.completed") {
          patch.startedAt = pickEarlier(patch.startedAt, startedAt);
          patch.finishedAt = pickLater(patch.finishedAt, finishedAt ?? occurredAt);
          patch.durationMs = mergeNumber(
            patch.durationMs,
            readNumber(record, ["duration_ms", "durationMs"])
          );
          patch.status = "completed";
          processedEvents += 1;
        } else if (eventType === "skill_run.failed") {
          patch.startedAt = pickEarlier(patch.startedAt, startedAt);
          patch.finishedAt = pickLater(patch.finishedAt, finishedAt ?? occurredAt);
          patch.durationMs = mergeNumber(
            patch.durationMs,
            readNumber(record, ["duration_ms", "durationMs"])
          );
          patch.errorCode = readString(record, ["error_code", "errorCode"]) ?? patch.errorCode;
          patch.errorSummary = readString(record, ["error_summary", "errorSummary", "message"]) ?? patch.errorSummary;
          patch.status = "failed";
          processedEvents += 1;
        } else if (eventType === "skill_run.started") {
          processedEvents += 1;
        } else if (eventType === "skill_run.first_output") {
          processedEvents += 1;
        } else if (eventType === "skill_run.tool_called") {
          processedEvents += 1;
        }

        patches.set(runId, patch);
      }
    } finally {
      reader.close();
      input.close();
    }

    const importCompletedAt = nowIso();
    const affectedKeys = new Set<string>();
    const affectedSkills = new Set<string>();
    const observedModelNames = new Set<string>();
    let importedRuns = 0;
    let updatedRuns = 0;

    const importTransaction = this.database.db.transaction(() => {
      const skillRows = this.database.db
        .prepare(
          `SELECT id, canonical_name, display_name, source_path
           FROM skills
           WHERE is_active = 1`
        )
        .all() as SkillLookupRow[];
      const versionRows = this.database.db
        .prepare(
          `SELECT skill_id, id
           FROM skill_versions
           WHERE is_current = 1`
        )
        .all() as Array<{ skill_id: string; id: string }>;

      const skillById = new Map<string, SkillLookupRow>();
      const skillByName = new Map<string, SkillLookupRow>();
      const skillByPathHash = new Map<string, SkillLookupRow>();
      const versionBySkillId = new Map<string, string>();

      for (const row of skillRows) {
        skillById.set(row.id, row);
        skillByName.set(row.canonical_name.toLowerCase(), row);
        skillByName.set(row.display_name.toLowerCase(), row);
        skillByPathHash.set(skillPathHash(row.source_path), row);
      }

      for (const row of versionRows) {
        versionBySkillId.set(row.skill_id, row.id);
      }

      const selectRun = this.database.db.prepare(
        `SELECT *
         FROM skill_runs
         WHERE id = ?
         LIMIT 1`
      );
      const upsertRun = this.database.db.prepare(
        `INSERT INTO skill_runs (
           id, skill_id, skill_version_id, capture_mode, confidence_score, source_type,
           started_at, first_output_at, finished_at, duration_ms, prompt_tokens,
           completion_tokens, total_tokens, estimated_cost_usd, model_name,
           tool_call_count, status, error_code, error_summary, summary_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           skill_id = excluded.skill_id,
           skill_version_id = excluded.skill_version_id,
           capture_mode = excluded.capture_mode,
           confidence_score = excluded.confidence_score,
           source_type = excluded.source_type,
           started_at = excluded.started_at,
           first_output_at = excluded.first_output_at,
           finished_at = excluded.finished_at,
           duration_ms = excluded.duration_ms,
           prompt_tokens = excluded.prompt_tokens,
           completion_tokens = excluded.completion_tokens,
           total_tokens = excluded.total_tokens,
           estimated_cost_usd = excluded.estimated_cost_usd,
           model_name = excluded.model_name,
           tool_call_count = excluded.tool_call_count,
           status = excluded.status,
           error_code = excluded.error_code,
           error_summary = excluded.error_summary,
           summary_json = excluded.summary_json`
      );

      const upsertMetric = this.database.db.prepare(
        `UPDATE daily_skill_metrics
         SET runs_count = ?, success_count = ?, failure_count = ?, avg_duration_ms = ?, max_duration_ms = ?,
             prompt_tokens = ?, completion_tokens = ?, total_tokens = ?, estimated_cost_usd = ?,
             tool_call_count = ?, updated_at = ?
         WHERE metric_date = ? AND skill_id = ?`
      );
      const selectMetric = this.database.db.prepare(
        `SELECT id
         FROM daily_skill_metrics
         WHERE metric_date = ? AND skill_id = ?
         LIMIT 1`
      );
      const insertMetric = this.database.db.prepare(
        `INSERT INTO daily_skill_metrics (
           id, metric_date, skill_id, runs_count, success_count, failure_count, avg_duration_ms,
           max_duration_ms, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd,
           tool_call_count, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const deleteMetric = this.database.db.prepare(
        `DELETE FROM daily_skill_metrics
         WHERE metric_date = ? AND skill_id = ?`
      );
      const metricAggregate = this.database.db.prepare(
        `SELECT
           COUNT(*) AS runs_count,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS success_count,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failure_count,
           CAST(AVG(duration_ms) AS INTEGER) AS avg_duration_ms,
           MAX(duration_ms) AS max_duration_ms,
           COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
           COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
           COALESCE(SUM(total_tokens), 0) AS total_tokens,
           COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd,
           COALESCE(SUM(tool_call_count), 0) AS tool_call_count
         FROM skill_runs
         WHERE skill_id = ?
           AND date(started_at, 'localtime') = ?`
      );

      for (const patch of patches.values()) {
        const existing = selectRun.get(patch.runId) as ExistingRunRow | undefined;
        const resolvedSkill =
          (patch.skillRef.skillId ? skillById.get(patch.skillRef.skillId) : undefined) ??
          (patch.skillRef.skillPath ? skillByPathHash.get(skillPathHash(patch.skillRef.skillPath)) : undefined) ??
          (patch.skillRef.skillName ? skillByName.get(patch.skillRef.skillName.toLowerCase()) : undefined) ??
          (existing ? skillById.get(existing.skill_id) : undefined);

        if (!resolvedSkill) {
          errors.push(
            `Run ${patch.runId}: unknown skill reference. Scan approved roots before importing telemetry.`
          );
          continue;
        }

        const startedAt =
          patch.startedAt ??
          existing?.started_at ??
          patch.firstOutputAt ??
          patch.finishedAt;
        if (!startedAt) {
          errors.push(`Run ${patch.runId}: unable to determine started_at.`);
          continue;
        }

        const firstOutputAt =
          patch.firstOutputAt ??
          (patch.firstOutputLatencyMs != null
            ? new Date(new Date(startedAt).getTime() + patch.firstOutputLatencyMs).toISOString()
            : undefined) ??
          existing?.first_output_at ??
          undefined;
        const finishedAt = patch.finishedAt ?? existing?.finished_at ?? undefined;
        const durationMs =
          patch.durationMs ??
          existing?.duration_ms ??
          (finishedAt ? Math.max(new Date(finishedAt).getTime() - new Date(startedAt).getTime(), 0) : undefined);
        const toolCallCount = Math.max(existing?.tool_call_count ?? 0, patch.toolCallCount ?? 0);
        const captureMode = patch.captureMode ?? existing?.capture_mode ?? policy.telemetryMode;
        const confidenceScore = patch.confidenceScore ?? existing?.confidence_score ?? 0.75;
        const sourceType = patch.sourceType ?? existing?.source_type ?? "log_parser";
        const existingSummary = safeParseSummary(existing?.summary_json);
        const previousEventCount = readSummaryNumber(existingSummary, "eventCount") ?? 0;
        const summary = {
          ...existingSummary,
          eventCount: previousEventCount + patch.eventCount,
          importSource: filePath,
          importedAt: importCompletedAt,
          workspaceRef: patch.workspaceRef,
          sessionRef: patch.sessionRef,
          policyRef: patch.policyRef,
          sourceRef: patch.sourceRef
        };
        const status =
          patch.status ??
          (existing?.status === "completed" || existing?.status === "failed" || existing?.status === "running"
            ? existing.status
            : "running");
        const versionId = versionBySkillId.get(resolvedSkill.id) ?? existing?.skill_version_id ?? null;

        if (existing?.started_at && (existing.status === "completed" || existing.status === "failed")) {
          affectedKeys.add(`${existing.skill_id}::${localDateKey(existing.started_at)}`);
        }

        const resolvedModelName = patch.modelName ?? existing?.model_name ?? null;

        upsertRun.run(
          patch.runId,
          resolvedSkill.id,
          versionId,
          captureMode,
          confidenceScore,
          sourceType,
          startedAt,
          firstOutputAt ?? null,
          finishedAt ?? null,
          durationMs ?? null,
          patch.promptTokens ?? existing?.prompt_tokens ?? null,
          patch.completionTokens ?? existing?.completion_tokens ?? null,
          patch.totalTokens ?? existing?.total_tokens ?? null,
          patch.estimatedCostUsd ?? existing?.estimated_cost_usd ?? 0,
          resolvedModelName,
          toolCallCount,
          status,
          patch.errorCode ?? existing?.error_code ?? null,
          patch.errorSummary ?? existing?.error_summary ?? null,
          JSON.stringify(summary)
        );

        if (existing) {
          updatedRuns += 1;
        } else {
          importedRuns += 1;
        }

        affectedSkills.add(resolvedSkill.id);
        if (resolvedModelName && resolvedModelName.trim().length > 0) {
          observedModelNames.add(resolvedModelName);
        }
        affectedKeys.add(`${resolvedSkill.id}::${localDateKey(startedAt)}`);
      }

      for (const key of affectedKeys) {
        const [skillId, metricDate] = key.split("::");
        const aggregate = metricAggregate.get(skillId, metricDate) as DailyAggregateRow | undefined;
        if (!aggregate || aggregate.runs_count === 0) {
          deleteMetric.run(metricDate, skillId);
          continue;
        }

        const timestamp = nowIso();
        const existingMetric = selectMetric.get(metricDate, skillId) as { id: string } | undefined;
        const updateInfo = upsertMetric.run(
          aggregate.runs_count,
          aggregate.success_count,
          aggregate.failure_count,
          aggregate.avg_duration_ms,
          aggregate.max_duration_ms,
          aggregate.prompt_tokens,
          aggregate.completion_tokens,
          aggregate.total_tokens,
          aggregate.estimated_cost_usd,
          aggregate.tool_call_count,
          timestamp,
          metricDate,
          skillId
        );

        if (!existingMetric && updateInfo.changes === 0) {
          insertMetric.run(
            randomUUID(),
            metricDate,
            skillId,
            aggregate.runs_count,
            aggregate.success_count,
            aggregate.failure_count,
            aggregate.avg_duration_ms,
            aggregate.max_duration_ms,
            aggregate.prompt_tokens,
            aggregate.completion_tokens,
            aggregate.total_tokens,
            aggregate.estimated_cost_usd,
            aggregate.tool_call_count,
            timestamp
          );
        }
      }
    });

    importTransaction();

    return {
      filePath,
      importedAt: importCompletedAt,
      linesRead,
      processedEvents,
      ignoredEvents,
      importedRuns,
      updatedRuns,
      affectedSkills: affectedSkills.size,
      affectedSkillIds: Array.from(affectedSkills).sort(),
      observedModelNames: Array.from(observedModelNames).sort((left, right) =>
        left.localeCompare(right)
      ),
      errorCount: errors.length,
      errors: errors.slice(0, 12)
    };
  }

  listRecentRuns(limit = 12): SkillRunSummary[] {
    const safeLimit = Math.min(Math.max(Math.round(limit), 1), 500);
    const rows = this.database.db
      .prepare(
        `SELECT
           skill_runs.id,
           skill_runs.skill_id,
           skills.display_name,
           skill_runs.status,
           skill_runs.started_at,
           skill_runs.first_output_at,
           skill_runs.finished_at,
           skill_runs.duration_ms,
           skill_runs.total_tokens,
           skill_runs.estimated_cost_usd,
           skill_runs.model_name,
           skill_runs.tool_call_count,
           skill_runs.capture_mode,
           skill_runs.confidence_score,
           skill_runs.source_type,
           skill_runs.summary_json
         FROM skill_runs
         INNER JOIN skills ON skills.id = skill_runs.skill_id
         ORDER BY skill_runs.started_at DESC
         LIMIT ?`
      )
      .all(safeLimit) as Record<string, unknown>[];

    return rows.map(toRunSummary);
  }

  listSkillRuns(skillId: string, limit = 100): SkillRunSummary[] {
    const safeLimit = Math.min(Math.max(Math.round(limit), 1), 500);
    const rows = this.database.db
      .prepare(
        `SELECT
           skill_runs.id,
           skill_runs.skill_id,
           skills.display_name,
           skill_runs.status,
           skill_runs.started_at,
           skill_runs.first_output_at,
           skill_runs.finished_at,
           skill_runs.duration_ms,
           skill_runs.total_tokens,
           skill_runs.estimated_cost_usd,
           skill_runs.model_name,
           skill_runs.tool_call_count,
           skill_runs.capture_mode,
           skill_runs.confidence_score,
           skill_runs.source_type,
           skill_runs.summary_json
         FROM skill_runs
         INNER JOIN skills ON skills.id = skill_runs.skill_id
         WHERE skill_runs.skill_id = ?
         ORDER BY skill_runs.started_at DESC
         LIMIT ?`
      )
      .all(skillId, safeLimit) as Record<string, unknown>[];

    return rows.map(toRunSummary);
  }

  getDailySummary(dateKey = localDateKey(nowIso())): DailyMetricsSummary {
    const totals = this.database.db
      .prepare(
        `SELECT
           COALESCE(SUM(runs_count), 0) AS total_runs,
           COALESCE(SUM(success_count), 0) AS success_count,
           COALESCE(SUM(failure_count), 0) AS failure_count,
           COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
           COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
           COALESCE(SUM(total_tokens), 0) AS total_tokens,
           COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd,
           COALESCE(SUM(tool_call_count), 0) AS tool_call_count
         FROM daily_skill_metrics
         WHERE metric_date = ?`
      )
      .get(dateKey) as Record<string, unknown>;

    const slowestRows = this.database.db
      .prepare(
        `SELECT
           daily_skill_metrics.skill_id,
           skills.display_name,
           daily_skill_metrics.runs_count,
           daily_skill_metrics.success_count,
           daily_skill_metrics.failure_count,
           daily_skill_metrics.avg_duration_ms,
           daily_skill_metrics.max_duration_ms,
           daily_skill_metrics.total_tokens,
           daily_skill_metrics.estimated_cost_usd
         FROM daily_skill_metrics
         INNER JOIN skills ON skills.id = daily_skill_metrics.skill_id
         WHERE daily_skill_metrics.metric_date = ?
         ORDER BY (daily_skill_metrics.avg_duration_ms IS NULL), daily_skill_metrics.avg_duration_ms DESC, (daily_skill_metrics.max_duration_ms IS NULL), daily_skill_metrics.max_duration_ms DESC
         LIMIT 5`
      )
      .all(dateKey) as Record<string, unknown>[];
    const mostUsedRows = this.database.db
      .prepare(
        `SELECT
           daily_skill_metrics.skill_id,
           skills.display_name,
           daily_skill_metrics.runs_count,
           daily_skill_metrics.success_count,
           daily_skill_metrics.failure_count,
           daily_skill_metrics.avg_duration_ms,
           daily_skill_metrics.max_duration_ms,
           daily_skill_metrics.total_tokens,
           daily_skill_metrics.estimated_cost_usd
         FROM daily_skill_metrics
         INNER JOIN skills ON skills.id = daily_skill_metrics.skill_id
         WHERE daily_skill_metrics.metric_date = ?
         ORDER BY daily_skill_metrics.runs_count DESC, daily_skill_metrics.total_tokens DESC
         LIMIT 5`
      )
      .all(dateKey) as Record<string, unknown>[];
    const avgDurationRow = this.database.db
      .prepare(
        `SELECT CAST(AVG(duration_ms) AS INTEGER) AS avg_duration_ms
         FROM skill_runs
         WHERE date(started_at, 'localtime') = ?`
      )
      .get(dateKey) as Record<string, unknown>;

    const totalRuns = Number(totals.total_runs ?? 0);
    const successCount = Number(totals.success_count ?? 0);
    const failureCount = Number(totals.failure_count ?? 0);

    return {
      date: dateKey,
      totalRuns,
      successCount,
      failureCount,
      runningCount: Math.max(totalRuns - successCount - failureCount, 0),
      avgDurationMs:
        typeof avgDurationRow.avg_duration_ms === "number"
          ? avgDurationRow.avg_duration_ms
          : avgDurationRow.avg_duration_ms
            ? Number(avgDurationRow.avg_duration_ms)
            : null,
      totalPromptTokens: Number(totals.prompt_tokens ?? 0),
      totalCompletionTokens: Number(totals.completion_tokens ?? 0),
      totalTokens: Number(totals.total_tokens ?? 0),
      totalCostUsd: Number(totals.estimated_cost_usd ?? 0),
      totalToolCalls: Number(totals.tool_call_count ?? 0),
      slowestSkills: slowestRows.map(buildLeader),
      mostUsedSkills: mostUsedRows.map(buildLeader)
    };
  }

  getWeeklySummary(endDateKey = localDateKey(nowIso())): WeeklyMetricsSummary {
    const startDateKey = localDateOffsetKey(endDateKey, -6);

    const totals = this.database.db
      .prepare(
        `SELECT
           COALESCE(SUM(runs_count), 0) AS total_runs,
           COALESCE(SUM(success_count), 0) AS success_count,
           COALESCE(SUM(failure_count), 0) AS failure_count,
           COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
           COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
           COALESCE(SUM(total_tokens), 0) AS total_tokens,
           COALESCE(SUM(estimated_cost_usd), 0) AS estimated_cost_usd,
           COALESCE(SUM(tool_call_count), 0) AS tool_call_count
         FROM daily_skill_metrics
         WHERE metric_date BETWEEN ? AND ?`
      )
      .get(startDateKey, endDateKey) as Record<string, unknown>;

    const slowestRows = this.database.db
      .prepare(
        `SELECT
           daily_skill_metrics.skill_id,
           skills.display_name,
           SUM(daily_skill_metrics.runs_count) AS runs_count,
           SUM(daily_skill_metrics.success_count) AS success_count,
           SUM(daily_skill_metrics.failure_count) AS failure_count,
           CAST(AVG(daily_skill_metrics.avg_duration_ms) AS INTEGER) AS avg_duration_ms,
           MAX(daily_skill_metrics.max_duration_ms) AS max_duration_ms,
           SUM(daily_skill_metrics.total_tokens) AS total_tokens,
           SUM(daily_skill_metrics.estimated_cost_usd) AS estimated_cost_usd
         FROM daily_skill_metrics
         INNER JOIN skills ON skills.id = daily_skill_metrics.skill_id
         WHERE daily_skill_metrics.metric_date BETWEEN ? AND ?
         GROUP BY daily_skill_metrics.skill_id, skills.display_name
         ORDER BY (AVG(daily_skill_metrics.avg_duration_ms) IS NULL), AVG(daily_skill_metrics.avg_duration_ms) DESC, MAX(daily_skill_metrics.max_duration_ms) DESC
         LIMIT 5`
      )
      .all(startDateKey, endDateKey) as Record<string, unknown>[];

    const mostUsedRows = this.database.db
      .prepare(
        `SELECT
           daily_skill_metrics.skill_id,
           skills.display_name,
           SUM(daily_skill_metrics.runs_count) AS runs_count,
           SUM(daily_skill_metrics.success_count) AS success_count,
           SUM(daily_skill_metrics.failure_count) AS failure_count,
           CAST(AVG(daily_skill_metrics.avg_duration_ms) AS INTEGER) AS avg_duration_ms,
           MAX(daily_skill_metrics.max_duration_ms) AS max_duration_ms,
           SUM(daily_skill_metrics.total_tokens) AS total_tokens,
           SUM(daily_skill_metrics.estimated_cost_usd) AS estimated_cost_usd
         FROM daily_skill_metrics
         INNER JOIN skills ON skills.id = daily_skill_metrics.skill_id
         WHERE daily_skill_metrics.metric_date BETWEEN ? AND ?
         GROUP BY daily_skill_metrics.skill_id, skills.display_name
         ORDER BY SUM(daily_skill_metrics.runs_count) DESC, SUM(daily_skill_metrics.total_tokens) DESC
         LIMIT 5`
      )
      .all(startDateKey, endDateKey) as Record<string, unknown>[];

    const highestWasteRows = this.database.db
      .prepare(
        `SELECT
           daily_skill_metrics.skill_id,
           skills.display_name,
           SUM(daily_skill_metrics.runs_count) AS runs_count,
           SUM(daily_skill_metrics.success_count) AS success_count,
           SUM(daily_skill_metrics.failure_count) AS failure_count,
           CAST(AVG(daily_skill_metrics.avg_duration_ms) AS INTEGER) AS avg_duration_ms,
           MAX(daily_skill_metrics.max_duration_ms) AS max_duration_ms,
           SUM(daily_skill_metrics.total_tokens) AS total_tokens,
           SUM(daily_skill_metrics.estimated_cost_usd) AS estimated_cost_usd,
           CASE
             WHEN SUM(daily_skill_metrics.runs_count) = 0 THEN 0
             ELSE CAST(SUM(daily_skill_metrics.failure_count) AS REAL) / SUM(daily_skill_metrics.runs_count)
           END AS failure_rate,
           CASE
             WHEN SUM(daily_skill_metrics.runs_count) = 0 THEN 0
             ELSE CAST(SUM(daily_skill_metrics.total_tokens) AS REAL) / SUM(daily_skill_metrics.runs_count)
           END AS avg_tokens_per_run,
           (
             (CASE
               WHEN SUM(daily_skill_metrics.runs_count) = 0 THEN 0
               ELSE CAST(SUM(daily_skill_metrics.failure_count) AS REAL) / SUM(daily_skill_metrics.runs_count)
             END) * 0.55 +
             MIN(CAST(SUM(daily_skill_metrics.total_tokens) AS REAL) / 20000.0, 1.5) * 0.3 +
             MIN(COALESCE(SUM(daily_skill_metrics.estimated_cost_usd), 0) / 5.0, 1.0) * 0.15
           ) AS waste_score
         FROM daily_skill_metrics
         INNER JOIN skills ON skills.id = daily_skill_metrics.skill_id
         WHERE daily_skill_metrics.metric_date BETWEEN ? AND ?
         GROUP BY daily_skill_metrics.skill_id, skills.display_name
         HAVING SUM(daily_skill_metrics.runs_count) > 0
         ORDER BY waste_score DESC, SUM(daily_skill_metrics.failure_count) DESC, SUM(daily_skill_metrics.total_tokens) DESC
         LIMIT 5`
      )
      .all(startDateKey, endDateKey) as WasteLeaderRow[];

    const avgDurationRow = this.database.db
      .prepare(
        `SELECT CAST(AVG(duration_ms) AS INTEGER) AS avg_duration_ms
         FROM skill_runs
         WHERE date(started_at, 'localtime') BETWEEN ? AND ?`
      )
      .get(startDateKey, endDateKey) as Record<string, unknown>;

    const totalRuns = Number(totals.total_runs ?? 0);
    const successCount = Number(totals.success_count ?? 0);
    const failureCount = Number(totals.failure_count ?? 0);

    return {
      startDate: startDateKey,
      endDate: endDateKey,
      windowDays: 7,
      totalRuns,
      successCount,
      failureCount,
      runningCount: Math.max(totalRuns - successCount - failureCount, 0),
      avgDurationMs:
        typeof avgDurationRow.avg_duration_ms === "number"
          ? avgDurationRow.avg_duration_ms
          : avgDurationRow.avg_duration_ms
            ? Number(avgDurationRow.avg_duration_ms)
            : null,
      totalPromptTokens: Number(totals.prompt_tokens ?? 0),
      totalCompletionTokens: Number(totals.completion_tokens ?? 0),
      totalTokens: Number(totals.total_tokens ?? 0),
      totalCostUsd: Number(totals.estimated_cost_usd ?? 0),
      totalToolCalls: Number(totals.tool_call_count ?? 0),
      slowestSkills: slowestRows.map(buildLeader),
      mostUsedSkills: mostUsedRows.map(buildLeader),
      highestWasteSkills: highestWasteRows.map(buildWasteLeader)
    };
  }
}
