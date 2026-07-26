import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import type { OpenDialogOptions } from "electron";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AuthorizationInput,
  ManagedProjectRecord,
  ModelEvaluationCaseGenerationInput,
  ModelEvaluationConfigInput,
  ProjectAdapterReadiness,
  BootstrapState,
  LocalBackupRestoreImpactResult,
  LocalBackupValidationResult,
  LocalToolTelemetryImportResult,
  LocalToolTelemetryPreview,
  LocalToolTelemetrySource,
  OptimizationProposalStatus,
  LocalBackupSummary,
  ProjectRuntimeEvidenceRefreshOptions,
  ProjectRuntimeEvidenceRefreshResult,
  ProjectRuntimeSummary,
  ProjectWorkflowBindingApplyInput,
  ProjectWorkflowBindingApplyResult,
  ProjectWorkflowBindingPreview,
  ProjectWorkflowBindingPreviewInput,
  ProjectWorkflowBindingRollbackPreviewInput,
  ProjectWorkflowBindingSummary,
  ProjectWorkflowDoctorResult,
  ProjectWorkflowLegacyMigrationPreviewInput,
  RemoteSkillActivationPreview,
  RemoteSkillCandidateDetail,
  RemoteSkillCandidateSummary,
  RemoteSkillImportResult,
  SkillApplyPreviewInput,
  SkillBundleExportInput,
  SkillHealthScorePolicyInput,
  SkillBundleImportInput,
  SessionTraceQuery,
  WorkflowTemplateSummary,
  WorkflowStarterApplyResult,
  WorkflowStarterPreview
} from "../shared/types";
import { AuthorizationService } from "./authorization-service";
import { ApplyPreviewService } from "./apply-preview-service";
import { AdapterReadinessService } from "./adapter-readiness-service";
import { CodexAppServerObservationService } from "./codex-app-server-observation-service";
import { BackupService } from "./backup-service";
import { BundleService } from "./bundle-service";
import { WorkbenchDatabase } from "./database";
import { GraphService } from "./graph-service";
import { HealthScorePolicyService } from "./health-score-policy-service";
import { LocalToolTelemetryService } from "./local-tool-telemetry-service";
import { MarketplaceService } from "./marketplace-service";
import { ModelEvaluationService } from "./model-evaluation-service";
import { OptimizationService } from "./optimization-service";
import { ProjectService } from "./project-service";
import { ProjectProfileService } from "./project-profile-service";
import { RegistryService } from "./registry-service";
import { RemoteSkillService } from "./remote-skill-service";
import { ScenarioLoopService } from "./scenario-loop-service";
import { SkillIntelligenceService } from "./skill-intelligence-service";
import { ensureStorage } from "./storage";
import { TelemetryService } from "./telemetry-service";
import { TraceService } from "./trace-service";
import { WorkflowStarterService } from "./workflow-starter-service";
import { WorkflowRegistryService } from "./workflow-registry-service";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Preserve the existing userData path while the product-facing window/title uses Skill OS.
app.setName("Skill Management Workbench");
const singleInstanceLockAcquired = app.requestSingleInstanceLock();
if (!singleInstanceLockAcquired) {
  app.exit(0);
}

let mainWindow: BrowserWindow | null = null;

app.on("second-instance", () => {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
});

const storagePaths = ensureStorage(app.getPath("userData"));
const database = new WorkbenchDatabase(storagePaths);
const authorizationService = new AuthorizationService(database);
const healthScorePolicyService = new HealthScorePolicyService(database);
const registryService = new RegistryService(database, authorizationService, healthScorePolicyService);
const traceService = new TraceService(database, registryService);
traceService.backfillLegacyRuns();
const telemetryService = new TelemetryService(database, authorizationService, traceService);
const optimizationService = new OptimizationService(database, authorizationService);
const projectService = new ProjectService(database);
const projectProfileService = new ProjectProfileService();
const bundleService = new BundleService(database, authorizationService);
const graphService = new GraphService(database, authorizationService);
const backupService = new BackupService(database, authorizationService);
const applyPreviewService = new ApplyPreviewService(database, authorizationService);
const marketplaceService = new MarketplaceService();
const skillIntelligenceService = new SkillIntelligenceService(database, registryService);
const remoteSkillService = new RemoteSkillService(database);
const localToolTelemetryService = new LocalToolTelemetryService(
  database,
  authorizationService,
  telemetryService,
  storagePaths
);
const appRoot = app.getAppPath();
const workflowTemplateRoot = resolve(
  appRoot,
  "../project-engineering-workflow/assets/template-root/.skill-os/workflows"
);
const workflowPackagePath = resolve(appRoot, "../project-engineering-workflow/package.json");
const workflowStarterService = new WorkflowStarterService(
  resolve(appRoot, "../project-engineering-workflow/assets/template-root"),
  workflowPackagePath
);
const workflowRegistryService = new WorkflowRegistryService(
  database,
  workflowTemplateRoot,
  workflowPackagePath
);
const scenarioLoopService = new ScenarioLoopService(database, workflowRegistryService);
const codexAppServerObservationService = new CodexAppServerObservationService(database, traceService);
const adapterReadinessService = new AdapterReadinessService(
  localToolTelemetryService,
  workflowRegistryService,
  traceService,
  codexAppServerObservationService
);
const modelEvaluationService = new ModelEvaluationService(database, {
  isAvailable: () => safeStorage.isEncryptionAvailable(),
  encrypt: (value) => safeStorage.encryptString(value),
  decrypt: (value) => safeStorage.decryptString(value)
});

function resolveModelEvaluationTarget(input: ModelEvaluationCaseGenerationInput) {
  if (input.targetType === "skill") {
    const skill = registryService.listSkills().find((entry) => entry.id === input.targetId);
    if (!skill) {
      throw new Error("The selected Skill is no longer available in the local index.");
    }
    try {
      return {
        targetName: skill.displayName,
        sourceText: readFileSync(skill.sourcePath, "utf8")
      };
    } catch {
      throw new Error("The selected Skill source could not be read locally.");
    }
  }

  const template = workflowRegistryService
    .listTemplates()
    .find((entry) => `${entry.templateId}@${entry.templateVersion}` === input.targetId || entry.templateId === input.targetId);
  if (!template) {
    throw new Error("The selected workflow template is no longer available locally.");
  }
  try {
    return {
      targetName: template.name,
      sourceText: readFileSync(template.sourcePath, "utf8")
    };
  } catch {
    throw new Error("The selected workflow source could not be read locally.");
  }
}

function buildBootstrapState(): BootstrapState {
  const policy = authorizationService.getActivePolicy();
  return {
    status: policy ? "ready" : "limited",
    storageRoot: storagePaths.root,
    databasePath: storagePaths.databasePath,
    healthScorePolicy: healthScorePolicyService.getPolicy(),
    policy,
    roots: policy ? authorizationService.listRoots(policy.id) : [],
    exclusions: policy ? authorizationService.listExclusions(policy.id) : [],
    skills: policy ? registryService.listSkills() : [],
    lastScanAt: policy ? registryService.getLastScanCompletedAt() : null
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 740,
    minWidth: 960,
    minHeight: 640,
    title: "Skill OS",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: "#050814",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function registerIpcHandlers() {
  ipcMain.handle("workbench:bootstrap", () => buildBootstrapState());
  ipcMain.handle("workbench:list-managed-projects", () => projectService.list());
  ipcMain.handle("workbench:save-managed-projects", (_event, projects: ManagedProjectRecord[]) => {
    const retainedPaths = new Set(projects.map((project) => project.path));
    projectService.list()
      .filter((project) => !retainedPaths.has(project.path))
      .forEach((project) => codexAppServerObservationService.stopProjectObservation(project.path));
    return projectService.saveAll(projects);
  });
  ipcMain.handle("workbench:delete-managed-project", (_event, projectPath: string) => {
    codexAppServerObservationService.stopProjectObservation(projectPath);
    projectService.delete(projectPath);
  });
  ipcMain.handle("workbench:get-project-profile", (_event, projectRoot: string) =>
    projectProfileService.read(projectRoot)
  );

  ipcMain.handle("workbench:pick-directory", () => {
    if (process.env.SKILL_OS_SELF_TEST_RUNTIME === "electron") {
      const selfTestProjectRoot = join(storagePaths.root, "self-test-project");
      mkdirSync(selfTestProjectRoot, { recursive: true });
      return selfTestProjectRoot;
    }
    const options: OpenDialogOptions = {
      title: "Choose Project Folder",
      buttonLabel: "Choose Project",
      defaultPath: app.getPath("home"),
      message: "Choose the project folder to analyze",
      properties: ["openDirectory", "dontAddToRecent"]
    };
    mainWindow?.show();
    mainWindow?.focus();
    app.focus({ steal: true });
    console.info("[workbench] opening project directory picker");
    const filePaths = dialog.showOpenDialogSync(options);
    console.info("[workbench] project directory picker result", filePaths?.[0] ?? "canceled");

    return filePaths?.[0] ?? null;
  });

  ipcMain.handle("workbench:pick-telemetry-file", async () => {
    const options: OpenDialogOptions = {
      properties: ["openFile"],
      filters: [
        {
          name: "Telemetry Logs",
          extensions: ["jsonl", "ndjson", "json"]
        },
        {
          name: "All Files",
          extensions: ["*"]
        }
      ]
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle("workbench:pick-backup-manifest", async () => {
    const options: OpenDialogOptions = {
      properties: ["openFile"],
      filters: [
        {
          name: "Backup Manifest",
          extensions: ["json"]
        },
        {
          name: "All Files",
          extensions: ["*"]
        }
      ]
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle("workbench:pick-bundle-manifest", async () => {
    const options: OpenDialogOptions = {
      properties: ["openFile"],
      filters: [
        {
          name: "Bundle Manifest",
          extensions: ["json"]
        },
        {
          name: "All Files",
          extensions: ["*"]
        }
      ]
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle("workbench:grant-authorization", async (_event, input: AuthorizationInput) => {
    authorizationService.grantAuthorization(input);
    if (input.scanRoots[0]) {
      registryService.scanProjectRoot(input.scanRoots[0]);
    }
    return buildBootstrapState();
  });

  ipcMain.handle("workbench:list-audit-events", async (_event, limit?: number) =>
    authorizationService.listAuditEvents(limit)
  );

  ipcMain.handle("workbench:create-backup", async (): Promise<LocalBackupSummary> =>
    backupService.createBackup()
  );

  ipcMain.handle("workbench:list-backups", async (_event, limit?: number) =>
    backupService.listBackups(limit)
  );

  ipcMain.handle(
    "workbench:validate-backup-manifest",
    async (_event, manifestPath: string): Promise<LocalBackupValidationResult> =>
      backupService.validateBackupManifest(manifestPath)
  );

  ipcMain.handle(
    "workbench:preview-backup-restore-impact",
    async (_event, manifestPath: string): Promise<LocalBackupRestoreImpactResult> =>
      backupService.previewBackupRestoreImpact(manifestPath)
  );

  ipcMain.handle("workbench:scan-skills", async () => registryService.scanApprovedRoots());

  ipcMain.handle("workbench:scan-project-skills", async (_event, projectRoot: string) =>
    registryService.scanProjectRoot(projectRoot)
  );

  ipcMain.handle(
    "workbench:preview-recommended-workflow-starter",
    async (_event, projectRoot: string): Promise<WorkflowStarterPreview> =>
      workflowStarterService.previewRecommendedStarter(projectRoot)
  );

  ipcMain.handle(
    "workbench:apply-recommended-workflow-starter",
    async (_event, projectRoot: string): Promise<WorkflowStarterApplyResult> =>
      workflowStarterService.applyRecommendedStarter(projectRoot)
  );

  ipcMain.handle("workbench:list-workflow-templates", async (): Promise<WorkflowTemplateSummary[]> =>
    workflowRegistryService.listTemplates()
  );

  ipcMain.handle(
    "workbench:list-project-workflow-bindings",
    async (_event, projectRoot: string): Promise<ProjectWorkflowBindingSummary[]> =>
      workflowRegistryService.listProjectBindings(projectRoot)
  );

  ipcMain.handle(
    "workbench:preview-project-workflow-binding",
    async (_event, input: ProjectWorkflowBindingPreviewInput): Promise<ProjectWorkflowBindingPreview> =>
      workflowRegistryService.previewBinding(input)
  );

  ipcMain.handle(
    "workbench:preview-project-workflow-legacy-migration",
    async (
      _event,
      input: ProjectWorkflowLegacyMigrationPreviewInput
    ): Promise<ProjectWorkflowBindingPreview> => workflowRegistryService.previewLegacyMigration(input)
  );

  ipcMain.handle(
    "workbench:preview-project-workflow-binding-rollback",
    async (
      _event,
      input: ProjectWorkflowBindingRollbackPreviewInput
    ): Promise<ProjectWorkflowBindingPreview> => workflowRegistryService.previewBindingRollback(input)
  );

  ipcMain.handle(
    "workbench:apply-project-workflow-binding",
    async (_event, input: ProjectWorkflowBindingApplyInput): Promise<ProjectWorkflowBindingApplyResult> =>
      workflowRegistryService.applyBinding(input)
  );

  ipcMain.handle(
    "workbench:doctor-project-workflow",
    async (_event, projectRoot: string): Promise<ProjectWorkflowDoctorResult> =>
      workflowRegistryService.doctorProject(projectRoot)
  );

  ipcMain.handle(
    "workbench:list-project-scenario-loop-runs",
    async (_event, projectRoot: string) => scenarioLoopService.listProjectRuns(projectRoot)
  );

  ipcMain.handle(
    "workbench:get-scenario-loop-run",
    async (_event, runId: string) => scenarioLoopService.getRun(runId)
  );

  ipcMain.handle("workbench:list-skills", async () => registryService.listSkills());

  ipcMain.handle("workbench:get-health-score-policy", async () =>
    healthScorePolicyService.getPolicy()
  );

  ipcMain.handle(
    "workbench:update-health-score-policy",
    async (_event, input: SkillHealthScorePolicyInput) => healthScorePolicyService.updatePolicy(input)
  );

  ipcMain.handle("workbench:get-model-evaluation-config", async () =>
    modelEvaluationService.getConfig()
  );

  ipcMain.handle(
    "workbench:save-model-evaluation-config",
    async (_event, input: ModelEvaluationConfigInput) => modelEvaluationService.saveConfig(input)
  );

  ipcMain.handle("workbench:test-model-evaluation-connection", async () =>
    modelEvaluationService.testConnection()
  );

  ipcMain.handle(
    "workbench:generate-model-evaluation-cases",
    async (_event, input: ModelEvaluationCaseGenerationInput) => {
      const target = resolveModelEvaluationTarget(input);
      return modelEvaluationService.generateTestCases({ ...input, ...target });
    }
  );

  ipcMain.handle("workbench:preview-skill-apply", async (_event, input: SkillApplyPreviewInput) =>
    applyPreviewService.previewSkillApply(input)
  );

  ipcMain.handle("workbench:list-marketplace-catalog", async (_event, query?: string) =>
    marketplaceService.listCatalog(query)
  );

  ipcMain.handle("workbench:generate-skill-analysis", async (_event, skillId: string) =>
    skillIntelligenceService.generateAnalysis(skillId)
  );

  ipcMain.handle("workbench:get-latest-skill-analysis", async (_event, skillId: string) =>
    skillIntelligenceService.getLatestAnalysis(skillId)
  );

  ipcMain.handle("workbench:analyze-remote-skill-source", async (_event, sourceUrl: string) =>
    remoteSkillService.analyzeSource(sourceUrl)
  );

  ipcMain.handle(
    "workbench:import-marketplace-skill",
    async (_event, skillId: string): Promise<RemoteSkillImportResult> => {
      const skill = marketplaceService.getSkill(skillId);
      if (!skill) {
        throw new Error("Marketplace Skill was not found in the bundled local catalog.");
      }
      return remoteSkillService.importMarketplaceSkill(skill);
    }
  );

  ipcMain.handle(
    "workbench:preview-remote-skill-activation",
    async (_event, candidateId: string): Promise<RemoteSkillActivationPreview> =>
      remoteSkillService.previewActivation(candidateId)
  );

  ipcMain.handle(
    "workbench:list-remote-skill-candidates",
    async (): Promise<RemoteSkillCandidateSummary[]> => remoteSkillService.listCandidates()
  );

  ipcMain.handle(
    "workbench:get-remote-skill-candidate-detail",
    async (_event, candidateId: string): Promise<RemoteSkillCandidateDetail> =>
      remoteSkillService.getCandidateDetail(candidateId)
  );

  ipcMain.handle("workbench:list-bundles", async () => bundleService.listBundles());

  ipcMain.handle(
    "workbench:export-skill-bundle",
    async (_event, input: SkillBundleExportInput) => bundleService.exportSkillBundle(input)
  );

  ipcMain.handle("workbench:validate-skill-bundle-import", async (_event, manifestPath: string) =>
    bundleService.validateSkillBundleImport(manifestPath)
  );

  ipcMain.handle(
    "workbench:import-skill-bundle",
    async (_event, input: SkillBundleImportInput) => bundleService.importSkillBundle(input)
  );

  ipcMain.handle("workbench:import-telemetry-file", async (_event, filePath: string) =>
    telemetryService.importJsonlFile(filePath)
  );

  ipcMain.handle(
    "workbench:discover-local-tool-telemetry-sources",
    async (): Promise<LocalToolTelemetrySource[]> => localToolTelemetryService.discoverSources()
  );

  ipcMain.handle(
    "workbench:preview-local-tool-telemetry-source",
    async (_event, source: LocalToolTelemetrySource): Promise<LocalToolTelemetryPreview> =>
      localToolTelemetryService.previewSource(source)
  );

  ipcMain.handle(
    "workbench:import-local-tool-telemetry-source",
    async (_event, source: LocalToolTelemetrySource): Promise<LocalToolTelemetryImportResult> =>
      localToolTelemetryService.importSource(source)
  );

  ipcMain.handle(
    "workbench:refresh-project-runtime-evidence",
    async (
      _event,
      projectRoot: string,
      options?: ProjectRuntimeEvidenceRefreshOptions
    ): Promise<ProjectRuntimeEvidenceRefreshResult> =>
      localToolTelemetryService.refreshProjectRuntimeEvidence(projectRoot, options)
  );
  ipcMain.handle(
    "workbench:check-project-connection",
    async (_event, projectRoot: string): Promise<ProjectRuntimeEvidenceRefreshResult> =>
      localToolTelemetryService.checkProjectConnection(projectRoot)
  );
  ipcMain.handle(
    "workbench:diagnose-project-adapter-readiness",
    async (_event, projectRoot: string): Promise<ProjectAdapterReadiness> =>
      adapterReadinessService.diagnoseProject(projectRoot)
  );
  ipcMain.handle(
    "workbench:start-project-app-server-observation",
    async (_event, projectRoot: string) => codexAppServerObservationService.startProjectObservation(projectRoot)
  );
  ipcMain.handle(
    "workbench:stop-project-app-server-observation",
    async (_event, projectRoot: string) => codexAppServerObservationService.stopProjectObservation(projectRoot)
  );
  ipcMain.handle(
    "workbench:run-project-controlled-verification",
    async (_event, projectRoot: string) => codexAppServerObservationService.runProjectControlledVerification(projectRoot)
  );

  ipcMain.handle("workbench:list-recent-runs", async (_event, limit?: number) =>
    telemetryService.listRecentRuns(limit)
  );
  ipcMain.handle(
    "workbench:list-project-runtime-summaries",
    async (_event, projectPaths: string[]): Promise<ProjectRuntimeSummary[]> =>
      telemetryService.listProjectRuntimeSummaries(projectPaths)
  );

  ipcMain.handle("workbench:list-skill-runs", async (_event, skillId: string, limit?: number) =>
    telemetryService.listSkillRuns(skillId, limit)
  );

  ipcMain.handle("workbench:list-session-traces", async (_event, query?: SessionTraceQuery) =>
    traceService.listSessionTraces(query)
  );

  ipcMain.handle("workbench:get-session-trace", async (_event, traceId: string) =>
    traceService.getSessionTrace(traceId)
  );

  ipcMain.handle("workbench:get-trace-skill-detail", async (_event, traceId: string, skillId: string) =>
    traceService.getTraceSkillDetail(traceId, skillId)
  );

  ipcMain.handle("workbench:reveal-skill-source", async (_event, skillId: string) => {
    const sourcePath = traceService.getSkillSourcePath(skillId);
    if (!sourcePath) {
      return false;
    }
    shell.showItemInFolder(sourcePath);
    return true;
  });

  ipcMain.handle("workbench:get-daily-summary", async (_event, date?: string) =>
    telemetryService.getDailySummary(date)
  );

  ipcMain.handle("workbench:get-weekly-summary", async (_event, endDate?: string) =>
    telemetryService.getWeeklySummary(endDate)
  );

  ipcMain.handle("workbench:refresh-optimization-proposals", async (_event, date?: string) =>
    optimizationService.refreshProposals(date)
  );

  ipcMain.handle(
    "workbench:list-optimization-proposals",
    async (_event, status?: OptimizationProposalStatus | "all") =>
      optimizationService.listProposals(status)
  );

  ipcMain.handle(
    "workbench:update-optimization-proposal-status",
    async (_event, proposalId: string, status: OptimizationProposalStatus) =>
      optimizationService.updateProposalStatus(proposalId, status)
  );

  ipcMain.handle("workbench:refresh-graph", async () => graphService.refreshGraph());

  ipcMain.handle("workbench:get-graph-snapshot", async () => graphService.getGraphSnapshot());

  ipcMain.handle("workbench:get-graph-neighborhood", async (_event, nodeId: string) =>
    graphService.getGraphNeighborhood(nodeId)
  );

  ipcMain.handle("workbench:get-graph-path-trace", async (_event, nodeId: string) =>
    graphService.getGraphPathTrace(nodeId)
  );
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  codexAppServerObservationService.stopAll();
  database.close();
});
