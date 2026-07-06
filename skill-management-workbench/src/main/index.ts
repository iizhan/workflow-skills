import { app, BrowserWindow, dialog, ipcMain } from "electron";
import type { OpenDialogOptions } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AuthorizationInput,
  BootstrapState,
  LocalBackupRestoreImpactResult,
  LocalBackupValidationResult,
  OptimizationProposalStatus,
  LocalBackupSummary,
  RemoteSkillActivationPreview,
  RemoteSkillCandidateDetail,
  RemoteSkillCandidateSummary,
  RemoteSkillImportResult,
  SkillApplyPreviewInput,
  SkillBundleExportInput,
  SkillHealthScorePolicyInput,
  SkillBundleImportInput
} from "../shared/types";
import { AuthorizationService } from "./authorization-service";
import { ApplyPreviewService } from "./apply-preview-service";
import { BackupService } from "./backup-service";
import { BundleService } from "./bundle-service";
import { WorkbenchDatabase } from "./database";
import { GraphService } from "./graph-service";
import { HealthScorePolicyService } from "./health-score-policy-service";
import { MarketplaceService } from "./marketplace-service";
import { OptimizationService } from "./optimization-service";
import { RegistryService } from "./registry-service";
import { RemoteSkillService } from "./remote-skill-service";
import { SkillIntelligenceService } from "./skill-intelligence-service";
import { ensureStorage } from "./storage";
import { TelemetryService } from "./telemetry-service";

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
const bundleService = new BundleService(database, authorizationService);
const graphService = new GraphService(database, authorizationService);
const backupService = new BackupService(database, authorizationService);
const applyPreviewService = new ApplyPreviewService(database, authorizationService);
const marketplaceService = new MarketplaceService();
const skillIntelligenceService = new SkillIntelligenceService(database, registryService);
const remoteSkillService = new RemoteSkillService(database);

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
    width: 1320,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    title: "Skill OS",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
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

  ipcMain.handle("workbench:pick-directory", async () => {
    const options: OpenDialogOptions = {
      properties: ["openDirectory", "createDirectory"]
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    return result.canceled ? null : result.filePaths[0] ?? null;
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
    registryService.scanApprovedRoots();
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

  ipcMain.handle("workbench:list-recent-runs", async (_event, limit?: number) =>
    telemetryService.listRecentRuns(limit)
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
