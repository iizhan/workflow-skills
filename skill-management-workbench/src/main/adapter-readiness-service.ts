import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  AdapterConnectionStatus,
  AdapterInstallationStatus,
  AdapterPrecisionEnablementPreview,
  AdapterReadinessCheck,
  ProjectAdapterReadiness,
  ProjectRuntimeEvidenceRefreshResult,
  SessionTraceListItem,
  SkillObservationStatus
} from "../shared/types";
import type { LocalToolTelemetryService } from "./local-tool-telemetry-service";
import type { CodexAppServerObservationService } from "./codex-app-server-observation-service";
import type { TraceService } from "./trace-service";
import type { WorkflowRegistryService } from "./workflow-registry-service";

function normalizeProjectPath(path: string) {
  const normalized = resolve(path.trim());
  return normalized === "/" ? normalized : normalized.replace(/\/+$/, "");
}

function isSameOrDescendantPath(candidatePath: string | null | undefined, projectRoot: string) {
  if (!candidatePath) {
    return false;
  }
  const candidate = normalizeProjectPath(candidatePath);
  const root = normalizeProjectPath(projectRoot);
  return candidate === root || candidate.startsWith(`${root}/`);
}

function isOlderThan(value: string | null, days: number) {
  if (!value) {
    return false;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp > days * 24 * 60 * 60 * 1000;
}

function hasExactSkillEvent(trace: SessionTraceListItem) {
  return trace.captureMode === "precise" && trace.skillHits.some((hit) =>
    ["invoked", "completed", "failed"].includes(hit.hitState)
  );
}

function inferredObservation(traces: SessionTraceListItem[]) {
  const hits = traces.flatMap((trace) => trace.skillHits);
  if (hits.some((hit) => hit.hitState === "failed")) {
    return "skill_failed" as const;
  }
  if (hits.some((hit) => hit.hitState === "completed")) {
    return "skill_completed" as const;
  }
  if (hits.some((hit) => ["invoked", "inferred"].includes(hit.hitState))) {
    return "skill_invoked_inferred" as const;
  }
  if (hits.some((hit) => ["candidate", "matched", "selected", "loaded"].includes(hit.hitState))) {
    return "skill_routed_inferred" as const;
  }
  return null;
}

function check(id: string, status: AdapterReadinessCheck["status"], evidenceRefs: string[] = []) {
  return { id, status, evidenceRefs } satisfies AdapterReadinessCheck;
}

type AppServerObservationStatusProvider = Pick<CodexAppServerObservationService, "getProjectStatus">;

function notEnabledAppServerObservation(projectRoot: string): ProjectAdapterReadiness["appServerObservation"] {
  return {
    projectRoot,
    enabled: false,
    state: "not_enabled",
    capability: null,
    startedAt: null,
    lastEventAt: null,
    stoppedAt: null,
    lastError: null,
    lastControlledVerification: {
      projectRoot,
      state: "not_run",
      startedAt: null,
      finishedAt: null,
      ephemeral: true,
      sandbox: "readOnly",
      networkAccess: false,
      approvalPolicy: "never",
      timeoutMs: 90_000,
      tokenWatchdogLimit: 32_000,
      tokenWatchdogExceeded: false,
      totalTokens: null,
      lifecycleEventCount: 0,
      itemTypes: [],
      traceId: null,
      threadArchived: false,
      stopReason: null,
      errorCode: null
    }
  };
}

export class AdapterReadinessService {
  constructor(
    private readonly localToolTelemetryService: LocalToolTelemetryService,
    private readonly workflowRegistryService: WorkflowRegistryService,
    private readonly traceService: TraceService,
    private readonly codexAppServerObservationService?: AppServerObservationStatusProvider
  ) {}

  async diagnoseProject(projectRoot: string): Promise<ProjectAdapterReadiness> {
    const root = normalizeProjectPath(projectRoot);
    let sources: Awaited<ReturnType<LocalToolTelemetryService["discoverSources"]>> = [];
    let workflowBlocked = false;
    try {
      sources = await this.localToolTelemetryService.discoverSources();
    } catch {
      sources = [];
    }
    try {
      workflowBlocked = this.workflowRegistryService.doctorProject(root).summary === "blocked";
    } catch {
      workflowBlocked = true;
    }
    const connection = this.localToolTelemetryService.checkProjectConnection(root);
    const codexSource = sources.find((source) => source.id === "codex-sessions");
    const sourceAvailable = codexSource?.status === "ready";
    const projectTraces = this.traceService
      .listSessionTraces({ harnessId: "codex", limit: 200 })
      .filter((trace) => isSameOrDescendantPath(trace.workspaceRef, root));
    const exactTraces = projectTraces.filter((trace) => trace.captureMode === "precise");
    const inferredTraces = projectTraces.filter((trace) => trace.captureMode !== "precise");
    const latestEvidenceAt = projectTraces
      .map((trace) => trace.completedAt ?? trace.receivedAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
    const hasSkillDirectory = existsSync(join(root, ".agents", "skills"));
    const hasAgentEntry = existsSync(join(root, "AGENTS.md"));
    const hasWorkflowBinding = existsSync(join(root, ".skill-os", "workflow-bindings.yaml"));

    const installationStatus: AdapterInstallationStatus =
      workflowBlocked
        ? "invalid"
        : hasWorkflowBinding || hasSkillDirectory
          ? "installed"
          : hasAgentEntry
            ? "read_only"
            : "not_installed";

    const connectionStatus = this.connectionStatus(connection, sourceAvailable, latestEvidenceAt);
    const observationStatus = this.observationStatus(exactTraces, projectTraces, hasSkillDirectory);
    const appServerObservation = this.codexAppServerObservationService?.getProjectStatus(root)
      ?? notEnabledAppServerObservation(root);
    const checks = this.buildChecks({
      installationStatus,
      connectionStatus,
      observationStatus,
      root,
      connection,
      sourceAvailable,
      workflowBlocked,
      exactTraceCount: exactTraces.length,
      inferredTraceCount: inferredTraces.length,
      appServerObservation
    });

    return {
      projectRoot: root,
      checkedAt: new Date().toISOString(),
      adapterId: exactTraces[0]?.adapterId ?? "codex-local-log",
      harnessId: "codex",
      installationStatus,
      connectionStatus,
      observationStatus,
      sourceAvailable,
      detectedWorkspaceRef:
        connection.matchedWorkspaceRef ?? connection.latestObservedWorkspaceRef ?? null,
      latestEvidenceAt,
      exactTraceCount: exactTraces.length,
      inferredTraceCount: inferredTraces.length,
      checks,
      appServerObservation,
      precisionPreview: this.precisionPreview(root, exactTraces.length, appServerObservation)
    };
  }

  private connectionStatus(
    connection: ProjectRuntimeEvidenceRefreshResult,
    sourceAvailable: boolean,
    latestEvidenceAt: string | null
  ): AdapterConnectionStatus {
    if (connection.status === "unauthorized" || connection.status === "telemetry_disabled") {
      return "error";
    }
    if (!sourceAvailable || connection.status === "no_ready_sources") {
      return "source_unavailable";
    }
    if (connection.matchedWorkspaceRef) {
      return latestEvidenceAt
        ? isOlderThan(latestEvidenceAt, 14)
          ? "stale"
          : "recent_session_observed"
        : "workspace_matched";
    }
    if (connection.latestObservedWorkspaceRef) {
      return "workspace_unmatched";
    }
    return "source_ready";
  }

  private observationStatus(
    exactTraces: SessionTraceListItem[],
    projectTraces: SessionTraceListItem[],
    hasSkillDirectory: boolean
  ): SkillObservationStatus {
    if (exactTraces.some((trace) => trace.skillHits.some((hit) => hit.hitState === "failed"))) {
      return "skill_failed";
    }
    if (exactTraces.some((trace) => trace.skillHits.some((hit) => hit.hitState === "completed"))) {
      return "skill_completed";
    }
    if (exactTraces.some(hasExactSkillEvent)) {
      return "skill_invoked_precise";
    }
    const inferred = inferredObservation(projectTraces);
    if (inferred) {
      return inferred;
    }
    return hasSkillDirectory ? "skill_available" : "no_skill_evidence";
  }

  private buildChecks(input: {
    installationStatus: AdapterInstallationStatus;
    connectionStatus: AdapterConnectionStatus;
    observationStatus: SkillObservationStatus;
    root: string;
    connection: ProjectRuntimeEvidenceRefreshResult;
    sourceAvailable: boolean;
    workflowBlocked: boolean;
    exactTraceCount: number;
    inferredTraceCount: number;
    appServerObservation: ProjectAdapterReadiness["appServerObservation"];
  }) {
    const checks: AdapterReadinessCheck[] = [];
    checks.push(
      check(
        "workflow-installation",
        input.workflowBlocked || input.installationStatus === "invalid"
          ? "fail"
          : input.installationStatus === "installed"
            ? "pass"
            : "warning",
        [input.root]
      )
    );
    checks.push(
      check(
        "codex-source",
        input.sourceAvailable ? "pass" : "warning",
        input.sourceAvailable ? ["codex-sessions"] : []
      )
    );
    checks.push(
      check(
        "workspace-connection",
        input.connectionStatus === "recent_session_observed" || input.connectionStatus === "workspace_matched"
          ? "pass"
          : input.connectionStatus === "workspace_unmatched" || input.connectionStatus === "error"
            ? "fail"
            : "warning",
        [
          input.connection.matchedWorkspaceRef ?? "",
          input.connection.latestObservedWorkspaceRef ?? ""
        ].filter(Boolean)
      )
    );
    checks.push(
      check(
        "skill-observation",
        input.observationStatus === "skill_invoked_precise" || input.observationStatus === "skill_completed"
          ? "pass"
          : input.observationStatus === "skill_failed"
            ? "fail"
            : "info",
        [
          `precise:${input.exactTraceCount}`,
          `inferred:${input.inferredTraceCount}`
        ]
      )
    );
    checks.push(
      check(
        "app-server-observation",
        input.appServerObservation.state === "observing" || input.appServerObservation.state === "ready"
          ? "pass"
          : input.appServerObservation.state === "error"
            ? "fail"
            : input.appServerObservation.state === "unsupported"
              ? "warning"
              : "info",
        input.appServerObservation.capability?.schemaFingerprint
          ? [`schema:${input.appServerObservation.capability.schemaFingerprint.slice(0, 16)}`]
          : []
      )
    );
    return checks;
  }

  private precisionPreview(
    projectRoot: string,
    exactTraceCount: number,
    appServerObservation: ProjectAdapterReadiness["appServerObservation"]
  ): AdapterPrecisionEnablementPreview {
    if (exactTraceCount > 0) {
      return {
        planId: `precision-ready:${projectRoot}`,
        generatedAt: new Date().toISOString(),
        mode: "already_precise",
        noWritesPerformed: true,
        requiresSeparateConfirmation: false,
        affectedPaths: [{
          path: "No configuration change",
          access: "not_applicable",
          purpose: "A trusted protocol 1.0 Adapter already supplied precise events.",
          currentState: "not_planned"
        }],
        requiredSteps: ["Continue importing only redacted protocol 1.0 Adapter events."],
        blockedReasons: [],
        rollbackPoint: "Close this preview. No project, Codex, or adapter configuration was changed."
      };
    }

    if (appServerObservation.state === "ready" || appServerObservation.state === "observing") {
      return {
        planId: `precision-app-server-ready:${projectRoot}`,
        generatedAt: new Date().toISOString(),
        mode: "local_app_server_ready",
        noWritesPerformed: true,
        requiresSeparateConfirmation: false,
        affectedPaths: [{
          path: "Local stdio Codex App Server process",
          access: "not_applicable",
          purpose: "A user-enabled local App Server is connected. No project or Codex configuration was changed.",
          currentState: "available"
        }],
        requiredSteps: ["Start a future controlled Skill OS session to receive App Server lifecycle events."],
        blockedReasons: appServerObservation.capability?.supportsExactSkillEvents
          ? []
          : ["This Codex schema does not expose explicit Skill invocation events. Skill evidence remains inferred."],
        rollbackPoint: "Stop precise observation to close the local stdio process."
      };
    }

    if (this.codexAppServerObservationService && appServerObservation.state !== "unsupported") {
      return {
        planId: `precision-app-server-opt-in:${projectRoot}`,
        generatedAt: new Date().toISOString(),
        mode: "local_app_server_opt_in",
        noWritesPerformed: true,
        requiresSeparateConfirmation: true,
        affectedPaths: [{
          path: "Skill OS local application storage",
          access: "write_after_confirmation",
          purpose: "Store the Codex CLI version, generated schema fingerprint, and redacted lifecycle evidence after the user enables local App Server observation.",
          currentState: "available"
        }],
        requiredSteps: [
          "Confirm the bound project and start a local stdio Codex App Server process.",
          "Verify the generated schema before accepting lifecycle events.",
          "Start a future controlled session only after a separate user confirmation."
        ],
        blockedReasons: [],
        rollbackPoint: "Choose Stop observation. The local process closes and no project or Codex configuration is changed."
      };
    }

    return {
      planId: `precision-import:${projectRoot}`,
      generatedAt: new Date().toISOString(),
      mode: "manual_structured_import",
      noWritesPerformed: true,
      requiresSeparateConfirmation: true,
      affectedPaths: [
        {
          path: "A user-selected JSONL file",
          access: "read",
          purpose: "Import a redacted Harness Adapter protocol 1.0 event file through the native file picker.",
          currentState: "available"
        },
        {
          path: "Codex global configuration",
          access: "not_applicable",
          purpose: "This version does not install Hooks, App Server integrations, or global Codex configuration.",
          currentState: "not_planned"
        }
      ],
      requiredSteps: [
        "Use a trusted Adapter that emits protocol 1.0 events with raw_prompt_stored and raw_output_stored set to false.",
        "Review the selected JSONL file in the native picker before importing it.",
        "Import the file under a precise telemetry authorization policy and inspect the resulting Trace evidence."
      ],
      blockedReasons: [
        "Automatic Hook or App Server setup is intentionally unavailable until a separate security and global-configuration confirmation is approved."
      ],
      rollbackPoint: "Close this preview to cancel. It performed no writes; no project or global configuration needs rollback."
    };
  }
}
