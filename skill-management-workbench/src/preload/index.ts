import { contextBridge, ipcRenderer } from "electron";
import type {
  AuthorizationInput,
  LocalToolTelemetrySource,
  ProjectProfileSummary,
  SkillBundleExportInput,
  SkillBundleImportInput,
  WorkbenchApi
} from "../shared/types";

const api: WorkbenchApi = {
  bootstrap: () => ipcRenderer.invoke("workbench:bootstrap"),
  listManagedProjects: () => ipcRenderer.invoke("workbench:list-managed-projects"),
  saveManagedProjects: (projects) => ipcRenderer.invoke("workbench:save-managed-projects", projects),
  deleteManagedProject: (projectPath: string) =>
    ipcRenderer.invoke("workbench:delete-managed-project", projectPath),
  getProjectProfile: (projectRoot: string): Promise<ProjectProfileSummary> =>
    ipcRenderer.invoke("workbench:get-project-profile", projectRoot),
  pickDirectory: () => ipcRenderer.invoke("workbench:pick-directory"),
  pickTelemetryFile: () => ipcRenderer.invoke("workbench:pick-telemetry-file"),
  pickBackupManifest: () => ipcRenderer.invoke("workbench:pick-backup-manifest"),
  pickBundleManifest: () => ipcRenderer.invoke("workbench:pick-bundle-manifest"),
  grantAuthorization: (input: AuthorizationInput) =>
    ipcRenderer.invoke("workbench:grant-authorization", input),
  listAuditEvents: (limit?: number) => ipcRenderer.invoke("workbench:list-audit-events", limit),
  createBackup: () => ipcRenderer.invoke("workbench:create-backup"),
  listBackups: (limit?: number) => ipcRenderer.invoke("workbench:list-backups", limit),
  validateBackupManifest: (manifestPath: string) =>
    ipcRenderer.invoke("workbench:validate-backup-manifest", manifestPath),
  previewBackupRestoreImpact: (manifestPath: string) =>
    ipcRenderer.invoke("workbench:preview-backup-restore-impact", manifestPath),
  scanSkills: () => ipcRenderer.invoke("workbench:scan-skills"),
  scanProjectSkills: (projectRoot: string) =>
    ipcRenderer.invoke("workbench:scan-project-skills", projectRoot),
  previewRecommendedWorkflowStarter: (projectRoot: string) =>
    ipcRenderer.invoke("workbench:preview-recommended-workflow-starter", projectRoot),
  applyRecommendedWorkflowStarter: (projectRoot: string) =>
    ipcRenderer.invoke("workbench:apply-recommended-workflow-starter", projectRoot),
  listSkills: () => ipcRenderer.invoke("workbench:list-skills"),
  generateSkillAnalysis: (skillId: string) =>
    ipcRenderer.invoke("workbench:generate-skill-analysis", skillId),
  getLatestSkillAnalysis: (skillId: string) =>
    ipcRenderer.invoke("workbench:get-latest-skill-analysis", skillId),
  analyzeRemoteSkillSource: (sourceUrl: string) =>
    ipcRenderer.invoke("workbench:analyze-remote-skill-source", sourceUrl),
  importMarketplaceSkill: (skillId: string) =>
    ipcRenderer.invoke("workbench:import-marketplace-skill", skillId),
  previewRemoteSkillActivation: (candidateId: string) =>
    ipcRenderer.invoke("workbench:preview-remote-skill-activation", candidateId),
  listRemoteSkillCandidates: () => ipcRenderer.invoke("workbench:list-remote-skill-candidates"),
  getRemoteSkillCandidateDetail: (candidateId: string) =>
    ipcRenderer.invoke("workbench:get-remote-skill-candidate-detail", candidateId),
  getHealthScorePolicy: () => ipcRenderer.invoke("workbench:get-health-score-policy"),
  updateHealthScorePolicy: (input) =>
    ipcRenderer.invoke("workbench:update-health-score-policy", input),
  previewSkillApply: (input) => ipcRenderer.invoke("workbench:preview-skill-apply", input),
  listMarketplaceCatalog: (query?: string) =>
    ipcRenderer.invoke("workbench:list-marketplace-catalog", query),
  importTelemetryFile: (filePath: string) =>
    ipcRenderer.invoke("workbench:import-telemetry-file", filePath),
  discoverLocalToolTelemetrySources: () =>
    ipcRenderer.invoke("workbench:discover-local-tool-telemetry-sources"),
  previewLocalToolTelemetrySource: (source: LocalToolTelemetrySource) =>
    ipcRenderer.invoke("workbench:preview-local-tool-telemetry-source", source),
  importLocalToolTelemetrySource: (source: LocalToolTelemetrySource) =>
    ipcRenderer.invoke("workbench:import-local-tool-telemetry-source", source),
  refreshProjectRuntimeEvidence: (projectRoot: string) =>
    ipcRenderer.invoke("workbench:refresh-project-runtime-evidence", projectRoot),
  checkProjectConnection: (projectRoot: string) =>
    ipcRenderer.invoke("workbench:check-project-connection", projectRoot),
  listRecentRuns: (limit?: number) => ipcRenderer.invoke("workbench:list-recent-runs", limit),
  listSkillRuns: (skillId: string, limit?: number) =>
    ipcRenderer.invoke("workbench:list-skill-runs", skillId, limit),
  getDailySummary: (date?: string) => ipcRenderer.invoke("workbench:get-daily-summary", date),
  getWeeklySummary: (endDate?: string) =>
    ipcRenderer.invoke("workbench:get-weekly-summary", endDate),
  refreshOptimizationProposals: (date?: string) =>
    ipcRenderer.invoke("workbench:refresh-optimization-proposals", date),
  listOptimizationProposals: (status?: "all" | "open" | "accepted" | "dismissed" | "resolved") =>
    ipcRenderer.invoke("workbench:list-optimization-proposals", status),
  updateOptimizationProposalStatus: (proposalId: string, status) =>
    ipcRenderer.invoke("workbench:update-optimization-proposal-status", proposalId, status),
  refreshGraph: () => ipcRenderer.invoke("workbench:refresh-graph"),
  getGraphSnapshot: () => ipcRenderer.invoke("workbench:get-graph-snapshot"),
  getGraphNeighborhood: (nodeId: string) =>
    ipcRenderer.invoke("workbench:get-graph-neighborhood", nodeId),
  getGraphPathTrace: (nodeId: string) =>
    ipcRenderer.invoke("workbench:get-graph-path-trace", nodeId),
  listBundles: () => ipcRenderer.invoke("workbench:list-bundles"),
  exportSkillBundle: (input: SkillBundleExportInput) =>
    ipcRenderer.invoke("workbench:export-skill-bundle", input),
  validateSkillBundleImport: (manifestPath: string) =>
    ipcRenderer.invoke("workbench:validate-skill-bundle-import", manifestPath),
  importSkillBundle: (input: SkillBundleImportInput) =>
    ipcRenderer.invoke("workbench:import-skill-bundle", input)
};

contextBridge.exposeInMainWorld("workbench", api);
