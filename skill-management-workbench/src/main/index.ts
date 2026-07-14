import { app, BrowserWindow, dialog, ipcMain } from "electron";
import type { OpenDialogOptions } from "electron";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AuthorizationInput,
  BootstrapState,
  LocalBackupRestoreImpactResult,
  LocalBackupValidationResult,
  LocalToolTelemetryImportResult,
  LocalToolTelemetryPreview,
  LocalToolTelemetrySource,
  OptimizationProposalStatus,
  LocalBackupSummary,
  ProjectRuntimeEvidenceRefreshResult,
  RemoteSkillActivationPreview,
  RemoteSkillCandidateDetail,
  RemoteSkillCandidateSummary,
  RemoteSkillImportResult,
  SkillApplyPreviewInput,
  SkillBundleExportInput,
  SkillHealthScorePolicyInput,
  SkillBundleImportInput,
  WorkflowStarterApplyResult,
  WorkflowStarterPreview
} from "../shared/types";
import { AuthorizationService } from "./authorization-service";
import { ApplyPreviewService } from "./apply-preview-service";
import { BackupService } from "./backup-service";
import { BundleService } from "./bundle-service";
import { WorkbenchDatabase } from "./database";
import { GraphService } from "./graph-service";
import { HealthScorePolicyService } from "./health-score-policy-service";
import { LocalToolTelemetryService } from "./local-tool-telemetry-service";
import { MarketplaceService } from "./marketplace-service";
import { OptimizationService } from "./optimization-service";
import { ProjectService } from "./project-service";
import { ProjectProfileService } from "./project-profile-service";
import { RegistryService } from "./registry-service";
import { RemoteSkillService } from "./remote-skill-service";
import { SkillIntelligenceService } from "./skill-intelligence-service";
import { ensureStorage } from "./storage";
import { TelemetryService } from "./telemetry-service";
import { WorkflowStarterService } from "./workflow-starter-service";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Preserve the existing userData path while the product-facing window/title uses Skill OS.
app.setName("Skill Management Workbench");

let mainWindow: BrowserWindow | null = null;

const storagePaths = ensureStorage(app.getPath("userData"));
const database = new WorkbenchDatabase(storagePaths);
const authorizationService = new AuthorizationService(database);
const healthScorePolicyService = new HealthScorePolicyService(database);
const registryService = new RegistryService(database, authorizationService, healthScorePolicyService);
const telemetryService = new TelemetryService(database, authorizationService);
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
const workflowStarterService = new WorkflowStarterService(
  resolve(appRoot, "../project-engineering-workflow/assets/template-root"),
  resolve(appRoot, "../project-engineering-workflow/package.json")
);

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
  ipcMain.handle("workbench:save-managed-projects", (_event, projects) =>
    projectService.saveAll(projects)
  );
  ipcMain.handle("workbench:delete-managed-project", (_event, projectPath: string) => {
    projectService.delete(projectPath);
  });
  ipcMain.handle("workbench:get-project-profile", (_event, projectRoot: string) =>
    projectProfileService.read(projectRoot)
  );

  ipcMain.handle("workbench:pick-directory", () => {
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

  ipcMain.handle("workbench:list-skills", async () => registryService.listSkills());

  ipcMain.handle("workbench:get-health-score-policy", async () =>
    healthScorePolicyService.getPolicy()
  );

  ipcMain.handle(
    "workbench:update-health-score-policy",
    async (_event, input: SkillHealthScorePolicyInput) => healthScorePolicyService.updatePolicy(input)
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
    async (_event, projectRoot: string): Promise<ProjectRuntimeEvidenceRefreshResult> =>
      localToolTelemetryService.refreshProjectRuntimeEvidence(projectRoot)
  );
  ipcMain.handle(
    "workbench:check-project-connection",
    async (_event, projectRoot: string): Promise<ProjectRuntimeEvidenceRefreshResult> =>
      localToolTelemetryService.checkProjectConnection(projectRoot)
  );

  ipcMain.handle("workbench:list-recent-runs", async (_event, limit?: number) =>
    telemetryService.listRecentRuns(limit)
  );

  ipcMain.handle("workbench:list-skill-runs", async (_event, skillId: string, limit?: number) =>
    telemetryService.listSkillRuns(skillId, limit)
  );

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
  database.close();
});
