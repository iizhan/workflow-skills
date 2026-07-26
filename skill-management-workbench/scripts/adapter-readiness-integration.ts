import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ProjectRuntimeEvidenceRefreshResult,
  ProjectWorkflowDoctorResult,
  SessionTraceListItem
} from "../src/shared/types";
import { AdapterReadinessService } from "../src/main/adapter-readiness-service";
import type { LocalToolTelemetryService } from "../src/main/local-tool-telemetry-service";
import type { TraceService } from "../src/main/trace-service";
import type { WorkflowRegistryService } from "../src/main/workflow-registry-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function emptyConnection(projectRoot: string): ProjectRuntimeEvidenceRefreshResult {
  return {
    projectRoot,
    refreshedAt: "2026-07-22T08:00:00.000Z",
    status: "connected_no_skill_runs",
    telemetryMode: "precise",
    sourcesChecked: 1,
    importableRuns: 0,
    importedRuns: 0,
    updatedRuns: 0,
    affectedSkills: 0,
    affectedSkillIds: [],
    matchedWorkspaceRef: projectRoot,
    latestObservedWorkspaceRef: projectRoot,
    warnings: [],
    errors: [],
    sourcePreviews: []
  };
}

function doctor(projectRoot: string): ProjectWorkflowDoctorResult {
  return {
    projectRoot,
    checkedAt: "2026-07-22T08:00:00.000Z",
    bindingFilePath: join(projectRoot, ".skill-os", "workflow-bindings.yaml"),
    templateCount: 1,
    bindingCount: 1,
    legacyReadOnlyCount: 0,
    readyMigrationCount: 0,
    checks: [],
    summary: "healthy"
  };
}

function trace(projectRoot: string, captureMode: "precise" | "estimated", hitState: "invoked" | "completed"): SessionTraceListItem {
  return {
    sessionId: `session-${captureMode}`,
    sessionRef: `session-${captureMode}`,
    sourceRef: null,
    turnId: `turn-${captureMode}`,
    traceId: `trace-${captureMode}`,
    projectId: null,
    projectName: null,
    workspaceRef: projectRoot,
    harnessId: "codex",
    adapterId: captureMode === "precise" ? "codex-local" : "codex-local-log",
    evidenceKind: "message_turn",
    messageSummary: "Adapter readiness fixture",
    receivedAt: "2026-07-22T08:00:00.000Z",
    completedAt: "2026-07-22T08:00:01.000Z",
    status: "completed",
    durationMs: 1000,
    totalTokens: 12,
    skillCandidateCount: 1,
    skillInvokedCount: 1,
    captureMode,
    confidence: captureMode === "precise" ? 1 : 0.72,
    skillHits: [{
      id: `hit-${captureMode}`,
      spanId: `span-${captureMode}`,
      skillId: "skill-fixture",
      skillName: "Fixture Skill",
      skillVersionId: null,
      hitState,
      hitIndex: captureMode === "precise" ? 100 : 72,
      confidence: captureMode === "precise" ? 1 : 0.72,
      captureMode,
      scoringVersion: "fixture",
      evidenceSummary: "fixture",
      evidence: [],
      occurredAt: "2026-07-22T08:00:00.000Z"
    }]
  };
}

const root = mkdtempSync(join(tmpdir(), "skill-os-adapter-readiness-test-"));
const projectRoot = join(root, "project");
mkdirSync(join(projectRoot, ".agents", "skills", "fixture"), { recursive: true });
mkdirSync(join(projectRoot, ".skill-os"), { recursive: true });
writeFileSync(join(projectRoot, "AGENTS.md"), "# Fixture\n", "utf8");
writeFileSync(join(projectRoot, ".skill-os", "workflow-bindings.yaml"), "bindings: []\n", "utf8");

let traces: SessionTraceListItem[] = [trace(projectRoot, "estimated", "invoked")];
const localTelemetry = {
  discoverSources: async () => [{ id: "codex-sessions", status: "ready" }],
  checkProjectConnection: () => emptyConnection(projectRoot)
} as unknown as LocalToolTelemetryService;
const workflowRegistry = {
  doctorProject: () => doctor(projectRoot)
} as unknown as WorkflowRegistryService;
const traceService = {
  listSessionTraces: () => traces
} as unknown as TraceService;
const service = new AdapterReadinessService(localTelemetry, workflowRegistry, traceService);

try {
  const filesBefore = readdirSync(projectRoot, { recursive: true }).sort();
  const inferred = await service.diagnoseProject(projectRoot);
  const filesAfter = readdirSync(projectRoot, { recursive: true }).sort();
  assert(JSON.stringify(filesAfter) === JSON.stringify(filesBefore), "Readiness diagnosis must not write project files.");
  assert(inferred.installationStatus === "installed", "Project workflow installation must be independently reported.");
  assert(inferred.connectionStatus === "recent_session_observed", "Matched workspace with fresh evidence must be connected.");
  assert(inferred.observationStatus === "skill_invoked_inferred", "Estimated evidence must remain inferred.");
  assert(inferred.precisionPreview.noWritesPerformed, "Precision preview must explicitly guarantee no writes.");
  assert(inferred.precisionPreview.affectedPaths.some((entry) => entry.path === "Codex global configuration" && entry.currentState === "not_planned"), "Preview must state that global Codex configuration is untouched.");

  traces = [trace(projectRoot, "precise", "completed")];
  const precise = await service.diagnoseProject(projectRoot);
  assert(precise.observationStatus === "skill_completed", "Precise completion must have a distinct observed state.");
  assert(precise.exactTraceCount === 1 && precise.inferredTraceCount === 0, "Precise and inferred evidence must stay separate.");
  assert(precise.precisionPreview.mode === "already_precise", "Existing precise evidence must not offer unnecessary setup.");

  const unavailable = new AdapterReadinessService(
    {
      discoverSources: async () => [{ id: "codex-sessions", status: "missing" }],
      checkProjectConnection: () => ({ ...emptyConnection(projectRoot), status: "no_ready_sources", matchedWorkspaceRef: null })
    } as unknown as LocalToolTelemetryService,
    workflowRegistry,
    traceService
  );
  const unavailableResult = await unavailable.diagnoseProject(projectRoot);
  assert(unavailableResult.connectionStatus === "source_unavailable", "Unavailable Codex session source must be clearly diagnosed.");

  const unavailableProject = new AdapterReadinessService(
    localTelemetry,
    {
      doctorProject: () => {
        throw new Error("Project directory is unavailable.");
      }
    } as unknown as WorkflowRegistryService,
    traceService
  );
  const missingResult = await unavailableProject.diagnoseProject(join(root, "missing-project"));
  assert(missingResult.installationStatus === "invalid", "A missing project directory must remain diagnosable instead of crashing the panel.");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("Adapter readiness integration passed: read-only diagnosis, inferred versus precise evidence, and no-write preview are covered.");
