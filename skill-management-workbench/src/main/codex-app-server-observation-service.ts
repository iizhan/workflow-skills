import { createHash } from "node:crypto";
import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import type {
  CodexAppServerCapabilitySnapshot,
  ProjectControlledSessionVerification,
  ProjectControlledSessionVerificationState,
  ProjectControlledSessionVerificationStopReason,
  ProjectAppServerObservation,
  ProjectAppServerObservationState
} from "../shared/types";
import type { WorkbenchDatabase } from "./database";
import type { TraceService } from "./trace-service";

type JsonRecord = Record<string, unknown>;

interface ActiveObservation {
  child: ChildProcessWithoutNullStreams;
  projectRoot: string;
  capability: CodexAppServerCapabilitySnapshot;
  sequence: number;
  initialized: boolean;
  intentionalStop: boolean;
  settleStart: (status: ProjectAppServerObservation) => void;
  startTimer: NodeJS.Timeout;
  pendingRequests: Map<string, PendingRequest>;
  verification: ActiveControlledVerification | null;
}

interface PendingRequest {
  method: string;
  resolve: (result: JsonRecord) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface ActiveControlledVerification {
  snapshot: ProjectControlledSessionVerification;
  threadId: string | null;
  turnId: string | null;
  completion: Promise<ProjectControlledSessionVerification>;
  settleCompletion: (result: ProjectControlledSessionVerification) => void;
  timeout: NodeJS.Timeout;
  completed: boolean;
}

const execFileAsync = promisify(execFile);
const lifecycleMethodNames = [
  "thread/started",
  "turn/started",
  "item/started",
  "item/completed",
  "turn/completed",
  "thread/tokenUsage/updated"
];

export const controlledVerificationPrompt =
  "Reply exactly with SKILL_OS_E2E_OK. Do not read or modify files. Do not run commands or use tools.";
export const controlledVerificationTimeoutMs = 90_000;
// The App Server reports token totals after use, so this is a reactive safety guard.
export const controlledVerificationTokenWatchdogLimit = 32_000;

function notRunControlledVerification(projectRoot: string): ProjectControlledSessionVerification {
  return {
    projectRoot,
    state: "not_run",
    startedAt: null,
    finishedAt: null,
    ephemeral: true,
    sandbox: "readOnly",
    networkAccess: false,
    approvalPolicy: "never",
    timeoutMs: controlledVerificationTimeoutMs,
    tokenWatchdogLimit: controlledVerificationTokenWatchdogLimit,
    tokenWatchdogExceeded: false,
    totalTokens: null,
    lifecycleEventCount: 0,
    itemTypes: [],
    traceId: null,
    threadArchived: false,
    stopReason: null,
    errorCode: null
  };
}

function isUnsafeControlledVerificationItem(itemType: string | null) {
  return Boolean(itemType && /command|exec|file|patch|tool/i.test(itemType));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringAt(record: JsonRecord | null | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberAt(record: JsonRecord | null | undefined, key: string) {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function normalizeProjectRoot(projectRoot: string) {
  const normalized = resolve(projectRoot.trim());
  return normalized === "/" ? normalized : normalized.replace(/\/+$/, "");
}

function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeVersion(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "unknown";
}

function toIsoFromMilliseconds(value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return new Date().toISOString();
  }
  return new Date(value).toISOString();
}

function toIsoFromSeconds(value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return new Date(value * 1_000).toISOString();
}

function collectMethods(value: unknown, methods: Set<string>) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectMethods(entry, methods));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  const propertyMethod = isRecord(value.properties) ? value.properties.method : null;
  if (isRecord(propertyMethod) && Array.isArray(propertyMethod.enum)) {
    propertyMethod.enum.forEach((entry) => {
      if (typeof entry === "string") {
        methods.add(entry);
      }
    });
  }
  Object.values(value).forEach((entry) => collectMethods(entry, methods));
}

export function inspectCodexAppServerSchema(schemaDirectory: string, cliVersion: string): CodexAppServerCapabilitySnapshot {
  const v2Schema = join(schemaDirectory, "codex_app_server_protocol.v2.schemas.json");
  const v1Schema = join(schemaDirectory, "codex_app_server_protocol.schemas.json");
  const notificationSchema = join(schemaDirectory, "ServerNotification.json");
  const selectedSchema = existsSync(v2Schema) ? v2Schema : existsSync(v1Schema) ? v1Schema : null;

  if (!selectedSchema || !existsSync(notificationSchema)) {
    return {
      cliVersion,
      schemaFingerprint: null,
      generatedAt: null,
      protocolVersion: null,
      lifecycleMethods: [],
      supportsSkillCatalog: false,
      supportsExactSkillEvents: false,
      supported: false,
      blockingReason: "The local Codex App Server schema is incomplete."
    };
  }

  const methods = new Set<string>();
  try {
    collectMethods(JSON.parse(readFileSync(notificationSchema, "utf8")) as unknown, methods);
  } catch {
    return {
      cliVersion,
      schemaFingerprint: null,
      generatedAt: null,
      protocolVersion: null,
      lifecycleMethods: [],
      supportsSkillCatalog: false,
      supportsExactSkillEvents: false,
      supported: false,
      blockingReason: "The local Codex App Server notification schema cannot be parsed."
    };
  }

  const lifecycleMethods = lifecycleMethodNames.filter((method) => methods.has(method));
  const schemaText = readFileSync(selectedSchema, "utf8");
  return {
    cliVersion,
    schemaFingerprint: stableHash(schemaText),
    generatedAt: new Date().toISOString(),
    protocolVersion: selectedSchema === v2Schema ? "v2" : "v1",
    lifecycleMethods,
    supportsSkillCatalog: schemaText.includes("skills/list"),
    supportsExactSkillEvents: Array.from(methods).some((method) => /^skill\/(invoked|completed|failed)$/.test(method)),
    supported: lifecycleMethods.includes("turn/started") && lifecycleMethods.includes("turn/completed"),
    blockingReason:
      lifecycleMethods.includes("turn/started") && lifecycleMethods.includes("turn/completed")
        ? null
        : "This Codex version does not expose the required Turn lifecycle notifications."
  };
}

export function normalizeCodexAppServerNotification(input: {
  projectRoot: string;
  capability: CodexAppServerCapabilitySnapshot;
  message: JsonRecord;
  sequence: number;
}): JsonRecord | null {
  const method = stringAt(input.message, "method");
  const params = isRecord(input.message.params) ? input.message.params : null;
  if (!method || !params || !lifecycleMethodNames.includes(method)) {
    return null;
  }

  const thread = isRecord(params.thread) ? params.thread : null;
  const threadId = stringAt(params, "threadId") ?? stringAt(thread, "id");
  const turn = isRecord(params.turn) ? params.turn : null;
  const declaredTurnId = stringAt(params, "turnId") ?? stringAt(turn, "id");
  // Protocol 1.0 requires a turn identifier. Thread-only lifecycle events use a
  // stable carrier ID and remain explicitly labeled in metadata.
  const turnId = declaredTurnId ?? (method === "thread/started" && threadId ? `thread_lifecycle:${stableHash(threadId).slice(0, 24)}` : null);
  if (!threadId || !turnId) {
    return null;
  }

  const item = isRecord(params.item) ? params.item : null;
  const itemType = stringAt(item, "type");
  const itemId = stringAt(item, "id");
  const tokenUsage = isRecord(params.tokenUsage) ? params.tokenUsage : null;
  const totalUsage = isRecord(tokenUsage?.total) ? tokenUsage.total : null;
  const totalTokens =
    numberAt(totalUsage, "totalTokens")
    ?? numberAt(totalUsage, "total_tokens")
    ?? numberAt(tokenUsage, "totalTokens")
    ?? numberAt(tokenUsage, "total_tokens")
    ?? numberAt(tokenUsage, "total");
  const eventMilliseconds =
    numberAt(params, "startedAtMs")
    ?? numberAt(params, "completedAtMs")
    ?? numberAt(params, "updatedAtMs");
  const occurredAt =
    eventMilliseconds == null
      ? toIsoFromSeconds(numberAt(turn, method === "turn/completed" ? "completedAt" : "startedAt")) ?? new Date().toISOString()
      : toIsoFromMilliseconds(eventMilliseconds);
  const eventId = stableHash([
    "codex-app-server",
    input.capability.schemaFingerprint ?? "unknown-schema",
    threadId,
    turnId,
    method,
    itemId ?? "no-item",
    occurredAt
  ].join(":"));

  return {
    schema_version: "1.0",
    event_id: `app_server_${eventId.slice(0, 32)}`,
    event_type: `app_server.${method.replaceAll("/", ".")}`,
    occurred_at: occurredAt,
    event_order: input.sequence,
    session_id: threadId,
    turn_id: turnId,
    adapter: {
      id: "codex-app-server-stdio",
      version: input.capability.cliVersion ?? "unknown",
      protocol_version: input.capability.protocolVersion ?? "unknown"
    },
    harness: { id: "codex", version: input.capability.cliVersion ?? "unknown" },
    project: { workspace_ref: input.projectRoot },
    privacy: {
      raw_prompt_stored: false,
      raw_output_stored: false,
      redaction_applied: true
    },
    capture_mode: "precise",
    confidence_score: 1,
    source_type: "codex_app_server",
    source_ref: `schema:${input.capability.schemaFingerprint?.slice(0, 16) ?? "unknown"}`,
    metadata: {
      app_server_method: method,
      item_type: itemType,
      item_id_hash: itemId ? stableHash(itemId).slice(0, 16) : null,
      thread_lifecycle_carrier: declaredTurnId == null && method === "thread/started",
      token_source: totalTokens == null ? null : "adapter_reported"
    },
    total_tokens: totalTokens
  };
}

export class CodexAppServerObservationService {
  private readonly active = new Map<string, ActiveObservation>();

  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly traceService: TraceService,
    private readonly codexCommand = "codex"
  ) {}

  getProjectStatus(projectRoot: string): ProjectAppServerObservation {
    const root = normalizeProjectRoot(projectRoot);
    const row = this.database.db.prepare(
      `SELECT * FROM project_app_server_observers WHERE project_root = ?`
    ).get(root) as Record<string, unknown> | undefined;
    if (!row) {
      return {
        projectRoot: root,
        enabled: false,
        state: "not_enabled",
        capability: null,
        startedAt: null,
        lastEventAt: null,
        stoppedAt: null,
        lastError: null,
        lastControlledVerification: this.getControlledVerification(root)
      };
    }
    return {
      projectRoot: root,
      enabled: Boolean(row.enabled),
      state: String(row.state) as ProjectAppServerObservationState,
      capability: this.parseCapability(row.capability_json),
      startedAt: row.started_at ? String(row.started_at) : null,
      lastEventAt: row.last_event_at ? String(row.last_event_at) : null,
      stoppedAt: row.stopped_at ? String(row.stopped_at) : null,
      lastError: row.last_error ? String(row.last_error) : null,
      lastControlledVerification: this.getControlledVerification(root)
    };
  }

  getControlledVerification(projectRoot: string): ProjectControlledSessionVerification {
    const root = normalizeProjectRoot(projectRoot);
    const row = this.database.db.prepare(
      `SELECT * FROM project_controlled_session_verifications WHERE project_root = ?`
    ).get(root) as Record<string, unknown> | undefined;
    if (!row) {
      return notRunControlledVerification(root);
    }
    const itemTypes = this.parseItemTypes(row.item_types_json);
    const state = String(row.state) as ProjectControlledSessionVerificationState;
    const stopReason = row.stop_reason
      ? String(row.stop_reason) as ProjectControlledSessionVerificationStopReason
      : null;
    return {
      ...notRunControlledVerification(root),
      state: ["running", "completed", "interrupted", "failed"].includes(state) ? state : "not_run",
      startedAt: row.started_at ? String(row.started_at) : null,
      finishedAt: row.finished_at ? String(row.finished_at) : null,
      tokenWatchdogExceeded: Boolean(row.token_watchdog_exceeded),
      totalTokens: typeof row.total_tokens === "number" ? row.total_tokens : null,
      lifecycleEventCount: typeof row.lifecycle_event_count === "number" ? row.lifecycle_event_count : 0,
      itemTypes,
      traceId: row.trace_id ? String(row.trace_id) : null,
      threadArchived: Boolean(row.thread_archived),
      stopReason,
      errorCode: row.error_code ? String(row.error_code) : null
    };
  }

  async runProjectControlledVerification(projectRoot: string): Promise<ProjectControlledSessionVerification> {
    const root = normalizeProjectRoot(projectRoot);
    const active = this.active.get(root);
    if (!active?.initialized) {
      return this.persistControlledVerification({
        ...notRunControlledVerification(root),
        state: "failed",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        stopReason: "request_failed",
        errorCode: "observer_not_ready"
      });
    }
    if (active.verification) {
      return active.verification.snapshot;
    }

    let settleCompletion: (result: ProjectControlledSessionVerification) => void = () => undefined;
    const snapshot = this.persistControlledVerification({
      ...notRunControlledVerification(root),
      state: "running",
      startedAt: new Date().toISOString()
    });
    const verification: ActiveControlledVerification = {
      snapshot,
      threadId: null,
      turnId: null,
      completion: new Promise<ProjectControlledSessionVerification>((resolve) => {
        settleCompletion = resolve;
      }),
      settleCompletion,
      timeout: setTimeout(() => {
        this.stopControlledVerification(active, "timeout");
      }, controlledVerificationTimeoutMs),
      completed: false
    };
    active.verification = verification;

    try {
      const threadStart = await this.request(active, "thread/start", {
        cwd: root,
        ephemeral: true,
        sandbox: "read-only",
        approvalPolicy: "never",
        personality: "pragmatic"
      }, 15_000);
      verification.threadId = stringAt(isRecord(threadStart.thread) ? threadStart.thread : null, "id");
      if (!verification.threadId) {
        throw new Error("thread_start_missing_id");
      }
      const turnStart = await this.request(active, "turn/start", {
        threadId: verification.threadId,
        cwd: root,
        approvalPolicy: "never",
        effort: "minimal",
        summary: "none",
        sandboxPolicy: { type: "readOnly", networkAccess: false },
        input: [{ type: "text", text: controlledVerificationPrompt }]
      }, 15_000);
      verification.turnId = stringAt(isRecord(turnStart.turn) ? turnStart.turn : null, "id");
      if (!verification.turnId) {
        throw new Error("turn_start_missing_id");
      }
      const completed = await verification.completion;
      return await this.archiveControlledVerification(active, verification, completed);
    } catch {
      const failed = this.finishControlledVerification(active, "failed", "request_failed", "app_server_request_failed");
      return await this.archiveControlledVerification(active, verification, failed);
    }
  }

  async startProjectObservation(projectRoot: string) {
    const root = normalizeProjectRoot(projectRoot);
    if (this.active.has(root)) {
      return this.getProjectStatus(root);
    }
    if (!existsSync(root)) {
      return this.persist(root, false, "error", null, { lastError: "The bound project directory no longer exists." });
    }

    this.persist(root, false, "checking", null, { lastError: null });
    const capability = await this.inspectCapability(root);
    if (!capability.supported) {
      return this.persist(root, false, "unsupported", capability, { lastError: capability.blockingReason });
    }

    return new Promise<ProjectAppServerObservation>((resolve) => {
      let child: ChildProcessWithoutNullStreams;
      try {
        child = spawn(this.codexCommand, ["app-server", "--listen", "stdio://"], {
          cwd: root,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true
        });
      } catch (error) {
        resolve(this.persist(root, false, "error", capability, {
          lastError: error instanceof Error ? error.message : "Codex App Server could not start."
        }));
        return;
      }

      const startTimer = setTimeout(() => {
        const active = this.active.get(root);
        if (!active?.initialized) {
          active?.child.kill("SIGTERM");
          this.active.delete(root);
          resolve(this.persist(root, false, "error", capability, { lastError: "Codex App Server initialization timed out." }));
        }
      }, 10_000);

      const active: ActiveObservation = {
        child,
        projectRoot: root,
        capability,
        sequence: 0,
        initialized: false,
        intentionalStop: false,
        startTimer,
        settleStart: resolve,
        pendingRequests: new Map(),
        verification: null
      };
      this.active.set(root, active);
      this.observeChild(active);
      this.send(active, {
        method: "initialize",
        id: "skill-os-init",
        params: {
          clientInfo: { name: "skill_os", title: "Skill OS", version: "0.0.1" },
          capabilities: { experimentalApi: false }
        }
      });
    });
  }

  stopProjectObservation(projectRoot: string) {
    const root = normalizeProjectRoot(projectRoot);
    const active = this.active.get(root);
    if (active) {
      active.intentionalStop = true;
      clearTimeout(active.startTimer);
      this.finishControlledVerification(active, "interrupted", "observer_stopped", null);
      this.rejectPendingRequests(active, "observer_stopped");
      active.child.stdin.end();
      active.child.kill("SIGTERM");
      this.active.delete(root);
    }
    const status = this.getProjectStatus(root);
    return this.persist(root, false, "stopped", status.capability, {
      stoppedAt: new Date().toISOString(),
      lastError: null
    });
  }

  stopAll() {
    for (const projectRoot of Array.from(this.active.keys())) {
      this.stopProjectObservation(projectRoot);
    }
  }

  private async inspectCapability(projectRoot: string) {
    let cliVersion: string;
    try {
      const version = await execFileAsync(this.codexCommand, ["--version"], {
        cwd: projectRoot,
        maxBuffer: 64 * 1024
      });
      cliVersion = version.stdout.trim();
    } catch (error) {
      return {
        cliVersion: null,
        schemaFingerprint: null,
        generatedAt: null,
        protocolVersion: null,
        lifecycleMethods: [],
        supportsSkillCatalog: false,
        supportsExactSkillEvents: false,
        supported: false,
        blockingReason: error instanceof Error ? `Codex CLI is unavailable: ${error.message}` : "Codex CLI is unavailable."
      } satisfies CodexAppServerCapabilitySnapshot;
    }

    const schemaDirectory = join(this.database.paths.root, "app-server-schemas", safeVersion(cliVersion));
    const schemaFile = join(schemaDirectory, "codex_app_server_protocol.v2.schemas.json");
    if (!existsSync(schemaFile)) {
      try {
        mkdirSync(schemaDirectory, { recursive: true });
        await execFileAsync(this.codexCommand, ["app-server", "generate-json-schema", "--out", schemaDirectory], {
          cwd: projectRoot,
          maxBuffer: 128 * 1024
        });
      } catch (error) {
        return {
          cliVersion,
          schemaFingerprint: null,
          generatedAt: null,
          protocolVersion: null,
          lifecycleMethods: [],
          supportsSkillCatalog: false,
          supportsExactSkillEvents: false,
          supported: false,
          blockingReason: error instanceof Error ? `Codex App Server schema generation failed: ${error.message}` : "Codex App Server schema generation failed."
        } satisfies CodexAppServerCapabilitySnapshot;
      }
    }
    return inspectCodexAppServerSchema(schemaDirectory, cliVersion);
  }

  private observeChild(active: ActiveObservation) {
    let stdoutBuffer = "";
    active.child.stdout.setEncoding("utf8");
    active.child.stdout.on("data", (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.length > 512 * 1024) {
          continue;
        }
        try {
          const message = JSON.parse(line) as unknown;
          if (isRecord(message)) {
            this.handleMessage(active, message);
          }
        } catch {
          // App Server diagnostic text is intentionally not persisted.
        }
      }
    });
    active.child.stderr.setEncoding("utf8");
    active.child.stderr.on("data", () => {
      // Stderr may contain paths or message content, so it is never stored.
    });
    active.child.once("error", (error) => {
      clearTimeout(active.startTimer);
      this.active.delete(active.projectRoot);
      this.finishControlledVerification(active, "failed", "app_server_error", "app_server_process_error");
      this.rejectPendingRequests(active, "app_server_process_error");
      active.settleStart(this.persist(active.projectRoot, false, "error", active.capability, {
        lastError: `Codex App Server process error: ${error.message}`
      }));
    });
    active.child.once("exit", (code, signal) => {
      clearTimeout(active.startTimer);
      this.active.delete(active.projectRoot);
      if (active.intentionalStop) {
        return;
      }
      this.finishControlledVerification(active, "failed", "app_server_error", "app_server_exited");
      this.rejectPendingRequests(active, "app_server_exited");
      const error = active.initialized
        ? `Codex App Server exited unexpectedly (${signal ?? code ?? "unknown"}).`
        : `Codex App Server exited before initialization (${signal ?? code ?? "unknown"}).`;
      active.settleStart(this.persist(active.projectRoot, false, "error", active.capability, { lastError: error }));
    });
  }

  private handleMessage(active: ActiveObservation, message: JsonRecord) {
    if (message.id === "skill-os-init") {
      if (isRecord(message.result)) {
        active.initialized = true;
        clearTimeout(active.startTimer);
        this.send(active, { method: "initialized", params: {} });
        active.settleStart(this.persist(active.projectRoot, true, "ready", active.capability, {
          startedAt: new Date().toISOString(),
          stoppedAt: null,
          lastError: null
        }));
        return;
      }
      if (isRecord(message.error)) {
        clearTimeout(active.startTimer);
        active.child.kill("SIGTERM");
        this.active.delete(active.projectRoot);
        active.settleStart(this.persist(active.projectRoot, false, "error", active.capability, {
          lastError: "Codex App Server rejected initialization."
        }));
        return;
      }
    }

    if (this.resolvePendingRequest(active, message)) {
      return;
    }

    const method = stringAt(message, "method");
    if (!method) {
      return;
    }
    const observedAt = new Date().toISOString();
    const event = normalizeCodexAppServerNotification({
      projectRoot: active.projectRoot,
      capability: active.capability,
      message,
      sequence: ++active.sequence
    });
    if (event) {
      const traceIds = this.traceService.ingestTelemetryEvents(
        [{ record: event, lineNumber: active.sequence }],
        "codex-app-server"
      );
      this.persist(active.projectRoot, true, "observing", active.capability, { lastEventAt: observedAt });
      this.handleControlledVerificationEvent(active, message, traceIds);
      return;
    }
    if (["thread/started", "thread/status/changed"].includes(method)) {
      this.persist(active.projectRoot, true, "ready", active.capability, { lastEventAt: observedAt });
      this.handleControlledVerificationEvent(active, message, []);
    }
  }

  private request(active: ActiveObservation, method: string, params: JsonRecord, timeoutMs: number) {
    return new Promise<JsonRecord>((resolve, reject) => {
      const id = `skill-os-${method.replaceAll("/", "-")}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const timeout = setTimeout(() => {
        active.pendingRequests.delete(id);
        reject(new Error("app_server_request_timeout"));
      }, timeoutMs);
      active.pendingRequests.set(id, { method, resolve, reject, timeout });
      this.send(active, { id, method, params });
    });
  }

  private resolvePendingRequest(active: ActiveObservation, message: JsonRecord) {
    const rawId = message.id;
    const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : null;
    if (!id || id === "skill-os-init") {
      return false;
    }
    const pending = active.pendingRequests.get(id);
    if (!pending) {
      return false;
    }
    active.pendingRequests.delete(id);
    clearTimeout(pending.timeout);
    if (isRecord(message.result)) {
      pending.resolve(message.result);
    } else {
      // App Server error payloads may contain prompt or environment details.
      pending.reject(new Error(`app_server_${pending.method.replaceAll("/", "_")}_rejected`));
    }
    return true;
  }

  private rejectPendingRequests(active: ActiveObservation, errorCode: string) {
    for (const [id, pending] of active.pendingRequests) {
      active.pendingRequests.delete(id);
      clearTimeout(pending.timeout);
      pending.reject(new Error(errorCode));
    }
  }

  private handleControlledVerificationEvent(
    active: ActiveObservation,
    message: JsonRecord,
    traceIds: string[]
  ) {
    const verification = active.verification;
    if (!verification || verification.completed) {
      return;
    }
    const method = stringAt(message, "method");
    const params = isRecord(message.params) ? message.params : null;
    if (!method || !params) {
      return;
    }
    const thread = isRecord(params.thread) ? params.thread : null;
    const turn = isRecord(params.turn) ? params.turn : null;
    const threadId = stringAt(params, "threadId") ?? stringAt(thread, "id");
    const turnId = stringAt(params, "turnId") ?? stringAt(turn, "id");
    if (!threadId || (verification.threadId && verification.threadId !== threadId)) {
      return;
    }
    if (!verification.threadId) {
      verification.threadId = threadId;
    }
    if (turnId && !verification.turnId && method === "turn/started") {
      verification.turnId = turnId;
    }
    if (verification.turnId && turnId && verification.turnId !== turnId) {
      return;
    }

    // A trace is only associated after TraceService has persisted an event for
    // this exact verification Turn. Thread-only lifecycle carriers must never
    // be presented as the verification conversation.
    if (turnId && verification.turnId === turnId && traceIds.length === 1 && !verification.snapshot.traceId) {
      verification.snapshot = {
        ...verification.snapshot,
        traceId: traceIds[0]
      };
    }

    verification.snapshot = {
      ...verification.snapshot,
      lifecycleEventCount: verification.snapshot.lifecycleEventCount + 1
    };
    if (method === "item/started" || method === "item/completed") {
      const item = isRecord(params.item) ? params.item : null;
      const itemType = stringAt(item, "type");
      if (itemType && !verification.snapshot.itemTypes.includes(itemType)) {
        verification.snapshot = { ...verification.snapshot, itemTypes: [...verification.snapshot.itemTypes, itemType] };
      }
      if (isUnsafeControlledVerificationItem(itemType)) {
        this.stopControlledVerification(active, "unsafe_item_detected");
        return;
      }
    }
    if (method === "thread/tokenUsage/updated") {
      const tokenUsage = isRecord(params.tokenUsage) ? params.tokenUsage : null;
      const total = isRecord(tokenUsage?.total) ? tokenUsage.total : null;
      const totalTokens =
        numberAt(total, "totalTokens")
        ?? numberAt(total, "total_tokens")
        ?? numberAt(tokenUsage, "totalTokens")
        ?? numberAt(tokenUsage, "total_tokens")
        ?? numberAt(tokenUsage, "total");
      if (totalTokens != null) {
        verification.snapshot = { ...verification.snapshot, totalTokens };
        if (totalTokens >= controlledVerificationTokenWatchdogLimit) {
          verification.snapshot = { ...verification.snapshot, tokenWatchdogExceeded: true };
          this.stopControlledVerification(active, "token_watchdog");
          return;
        }
      }
    }
    if (method === "turn/completed") {
      const status = stringAt(turn, "status");
      if (status === "completed") {
        this.finishControlledVerification(active, "completed", "completed", null);
      } else if (status === "interrupted") {
        this.finishControlledVerification(active, "interrupted", "observer_stopped", null);
      } else {
        this.finishControlledVerification(active, "failed", "app_server_error", "turn_failed");
      }
      return;
    }
    verification.snapshot = this.persistControlledVerification(verification.snapshot);
  }

  private stopControlledVerification(
    active: ActiveObservation,
    reason: Extract<ProjectControlledSessionVerificationStopReason, "timeout" | "token_watchdog" | "unsafe_item_detected">
  ) {
    const verification = active.verification;
    if (!verification || verification.completed) {
      return;
    }
    if (verification.turnId && verification.threadId) {
      void this.request(active, "turn/interrupt", {
        threadId: verification.threadId,
        turnId: verification.turnId
      }, 5_000).catch(() => undefined);
    }
    this.finishControlledVerification(active, "interrupted", reason, null);
  }

  private finishControlledVerification(
    active: ActiveObservation,
    state: Exclude<ProjectControlledSessionVerificationState, "not_run" | "running">,
    stopReason: ProjectControlledSessionVerificationStopReason,
    errorCode: string | null
  ) {
    const verification = active.verification;
    if (!verification || verification.completed) {
      return verification?.snapshot ?? this.getControlledVerification(active.projectRoot);
    }
    verification.completed = true;
    clearTimeout(verification.timeout);
    verification.snapshot = this.persistControlledVerification({
      ...verification.snapshot,
      state,
      finishedAt: new Date().toISOString(),
      stopReason,
      errorCode
    });
    verification.settleCompletion(verification.snapshot);
    return verification.snapshot;
  }

  private async archiveControlledVerification(
    active: ActiveObservation,
    verification: ActiveControlledVerification,
    result: ProjectControlledSessionVerification
  ) {
    if (verification.threadId && !active.intentionalStop && active.child.stdin.writable) {
      try {
        await this.request(active, "thread/archive", { threadId: verification.threadId }, 5_000);
        verification.snapshot = this.persistControlledVerification({ ...result, threadArchived: true });
      } catch {
        verification.snapshot = this.persistControlledVerification(result);
      }
    }
    if (active.verification === verification) {
      active.verification = null;
    }
    return verification.snapshot;
  }

  private send(active: ActiveObservation, message: JsonRecord) {
    if (!active.child.stdin.writable) {
      return;
    }
    active.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private parseCapability(value: unknown) {
    if (typeof value !== "string" || !value) {
      return null;
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!isRecord(parsed) || typeof parsed.supported !== "boolean") {
        return null;
      }
      const protocolVersion: CodexAppServerCapabilitySnapshot["protocolVersion"] =
        parsed.protocolVersion === "v1" ? "v1" : parsed.protocolVersion === "v2" ? "v2" : null;
      return {
        cliVersion: stringAt(parsed, "cliVersion"),
        schemaFingerprint: stringAt(parsed, "schemaFingerprint"),
        generatedAt: stringAt(parsed, "generatedAt"),
        protocolVersion,
        lifecycleMethods: Array.isArray(parsed.lifecycleMethods)
          ? parsed.lifecycleMethods.filter((entry): entry is string => typeof entry === "string")
          : [],
        supportsSkillCatalog: parsed.supportsSkillCatalog === true,
        supportsExactSkillEvents: parsed.supportsExactSkillEvents === true,
        supported: parsed.supported,
        blockingReason: stringAt(parsed, "blockingReason")
      };
    } catch {
      return null;
    }
  }

  private parseItemTypes(value: unknown) {
    if (typeof value !== "string" || !value) {
      return [];
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
        : [];
    } catch {
      return [];
    }
  }

  private persistControlledVerification(
    input: ProjectControlledSessionVerification
  ): ProjectControlledSessionVerification {
    this.database.db.prepare(
      `INSERT INTO project_controlled_session_verifications (
         project_root, state, started_at, finished_at, token_watchdog_exceeded,
         total_tokens, lifecycle_event_count, item_types_json, thread_archived,
         trace_id, stop_reason, error_code, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_root) DO UPDATE SET
         state = excluded.state,
         started_at = excluded.started_at,
         finished_at = excluded.finished_at,
         token_watchdog_exceeded = excluded.token_watchdog_exceeded,
         total_tokens = excluded.total_tokens,
         lifecycle_event_count = excluded.lifecycle_event_count,
         item_types_json = excluded.item_types_json,
         thread_archived = excluded.thread_archived,
         trace_id = excluded.trace_id,
         stop_reason = excluded.stop_reason,
         error_code = excluded.error_code,
         updated_at = excluded.updated_at`
    ).run(
      input.projectRoot,
      input.state,
      input.startedAt,
      input.finishedAt,
      input.tokenWatchdogExceeded ? 1 : 0,
      input.totalTokens,
      input.lifecycleEventCount,
      JSON.stringify(input.itemTypes),
      input.threadArchived ? 1 : 0,
      input.traceId,
      input.stopReason,
      input.errorCode,
      new Date().toISOString()
    );
    return input;
  }

  private persist(
    projectRoot: string,
    enabled: boolean,
    state: ProjectAppServerObservationState,
    capability: CodexAppServerCapabilitySnapshot | null,
    updates: Partial<Pick<ProjectAppServerObservation, "startedAt" | "lastEventAt" | "stoppedAt" | "lastError">>
  ) {
    const existing = this.getProjectStatus(projectRoot);
    const next: ProjectAppServerObservation = {
      projectRoot,
      enabled,
      state,
      capability: capability ?? existing.capability,
      startedAt: updates.startedAt === undefined ? existing.startedAt : updates.startedAt,
      lastEventAt: updates.lastEventAt === undefined ? existing.lastEventAt : updates.lastEventAt,
      stoppedAt: updates.stoppedAt === undefined ? existing.stoppedAt : updates.stoppedAt,
      lastError: updates.lastError === undefined ? existing.lastError : updates.lastError,
      lastControlledVerification: existing.lastControlledVerification
    };
    this.database.db.prepare(
      `INSERT INTO project_app_server_observers (
         project_root, enabled, state, cli_version, schema_fingerprint, capability_json,
         started_at, last_event_at, stopped_at, last_error, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_root) DO UPDATE SET
         enabled = excluded.enabled,
         state = excluded.state,
         cli_version = excluded.cli_version,
         schema_fingerprint = excluded.schema_fingerprint,
         capability_json = excluded.capability_json,
         started_at = excluded.started_at,
         last_event_at = excluded.last_event_at,
         stopped_at = excluded.stopped_at,
         last_error = excluded.last_error,
         updated_at = excluded.updated_at`
    ).run(
      next.projectRoot,
      next.enabled ? 1 : 0,
      next.state,
      next.capability?.cliVersion ?? null,
      next.capability?.schemaFingerprint ?? null,
      JSON.stringify(next.capability ?? {}),
      next.startedAt,
      next.lastEventAt,
      next.stoppedAt,
      next.lastError,
      new Date().toISOString()
    );
    return next;
  }
}
