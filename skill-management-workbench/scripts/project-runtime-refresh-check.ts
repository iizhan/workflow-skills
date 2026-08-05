import { AuthorizationService } from "../src/main/authorization-service";
import { WorkbenchDatabase } from "../src/main/database";
import { HealthScorePolicyService } from "../src/main/health-score-policy-service";
import { LocalToolTelemetryService } from "../src/main/local-tool-telemetry-service";
import { RegistryService } from "../src/main/registry-service";
import { ensureStorage } from "../src/main/storage";
import { TelemetryService } from "../src/main/telemetry-service";
import { TraceService } from "../src/main/trace-service";

const projectRoot = process.argv[2] ?? process.env.SKILL_OS_PROJECT_ROOT;
const storageRoot =
  process.env.SKILL_OS_STORAGE_ROOT ??
  "/Users/bing/Library/Application Support/Skill Management Workbench";

if (!projectRoot) {
  throw new Error("Usage: project-runtime-refresh-check <projectRoot>");
}

async function main() {
  const storagePaths = ensureStorage(storageRoot);
  const database = new WorkbenchDatabase(storagePaths);
  const authorizationService = new AuthorizationService(database);
  const healthScorePolicyService = new HealthScorePolicyService(database);
  const registryService = new RegistryService(database, authorizationService, healthScorePolicyService);
  const traceService = new TraceService(database, registryService, authorizationService);
  const telemetryService = new TelemetryService(database, authorizationService, traceService);
  const localToolTelemetryService = new LocalToolTelemetryService(
    database,
    authorizationService,
    telemetryService,
    storagePaths
  );

  const workspaceLike = `${projectRoot.replace(/\/+$/, "")}/%`;
  const beforeRuns = database.db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM skill_runs
       WHERE workspace_ref = ? OR workspace_ref LIKE ?`
    )
    .get(projectRoot, workspaceLike) as { count: number };
  const beforeTraces = database.db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM trace_sessions
       WHERE workspace_ref = ? OR workspace_ref LIKE ?`
    )
    .get(projectRoot, workspaceLike) as { count: number };

  const result = await localToolTelemetryService.refreshProjectRuntimeEvidence(projectRoot, {
    mode: "full"
  });

  const afterRuns = database.db
    .prepare(
      `SELECT COUNT(*) AS count,
              MAX(started_at) AS latest,
              COALESCE(SUM(total_tokens), 0) AS tokens,
              COALESCE(SUM(tool_call_count), 0) AS tools
       FROM skill_runs
       WHERE workspace_ref = ? OR workspace_ref LIKE ?`
    )
    .get(projectRoot, workspaceLike);
  const afterTraces = database.db
    .prepare(
      `SELECT COUNT(*) AS count,
              MAX(last_observed_at) AS latest
       FROM trace_sessions
       WHERE workspace_ref = ? OR workspace_ref LIKE ?`
    )
    .get(projectRoot, workspaceLike);

  database.close();

  console.log(JSON.stringify({
    projectRoot,
    before: {
      skillRuns: Number(beforeRuns.count ?? 0),
      traceSessions: Number(beforeTraces.count ?? 0)
    },
    result: {
      status: result.status,
      sourcesChecked: result.sourcesChecked,
      importableRuns: result.importableRuns,
      importedRuns: result.importedRuns,
      updatedRuns: result.updatedRuns,
      affectedSkills: result.affectedSkills,
      matchedWorkspaceRef: result.matchedWorkspaceRef ?? null,
      latestObservedWorkspaceRef: result.latestObservedWorkspaceRef ?? null,
      warnings: result.warnings,
      sourcePreviews: result.sourcePreviews.map((preview) => ({
        source: preview.source.id,
        candidateFiles: preview.candidateFiles,
        readableFiles: preview.readableFiles,
        scannedLines: preview.scannedLines,
        detectedRuns: preview.detectedRuns,
        importableRuns: preview.importableRuns,
        detectedSkillNames: preview.detectedSkillNames,
        detectedToolNames: preview.detectedToolNames,
        tokenFieldsDetected: preview.tokenFieldsDetected,
        warnings: preview.warnings
      }))
    },
    after: {
      skillRuns: Number((afterRuns as { count?: number }).count ?? 0),
      latestRunAt: (afterRuns as { latest?: string | null }).latest ?? null,
      tokens: Number((afterRuns as { tokens?: number }).tokens ?? 0),
      toolCalls: Number((afterRuns as { tools?: number }).tools ?? 0),
      traceSessions: Number((afterTraces as { count?: number }).count ?? 0),
      latestTraceAt: (afterTraces as { latest?: string | null }).latest ?? null
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
