export type TelemetryMode = "disabled" | "estimated" | "precise";

export interface AuthorizationPolicy {
  id: string;
  name: string;
  status: "active" | "revoked";
  telemetryMode: TelemetryMode;
  allowRawContent: boolean;
  allowBackgroundWatch: boolean;
  storageRoot: string;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  revokedAt: string | null;
}

export interface ScanRoot {
  id: string;
  policyId: string;
  path: string;
  rootType: string;
  isTrusted: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScanExclusion {
  id: string;
  policyId: string;
  path: string;
  reason: string | null;
  createdAt: string;
}

export interface LocalAuditEvent {
  id: string;
  policyId: string | null;
  eventType: string;
  eventSummary: string;
  actorType: "system" | "user";
  createdAt: string;
  metadata: Record<string, unknown>;
}

export type LocalBackupArea = "config" | "db" | "events" | "bundles";

export interface LocalBackupAreaSummary {
  area: LocalBackupArea;
  relativePath: string;
  totalFiles: number;
  totalBytes: number;
  topLevelEntries: string[];
}

export interface LocalBackupSummary {
  backupId: string;
  schemaVersion: string;
  createdAt: string;
  backupPath: string;
  manifestPath: string;
  storageRoot: string;
  policyId: string | null;
  totalFiles: number;
  totalBytes: number;
  areaCount: number;
  excludedRelativePaths: string[];
  areas: LocalBackupAreaSummary[];
}

export interface LocalBackupManifest extends LocalBackupSummary {
  source: {
    configDir: string;
    dbDir: string;
    databasePath: string;
    eventsDir: string;
    bundlesDir: string;
  };
}

export type LocalBackupValidationSeverity = "error" | "warning" | "info";

export interface LocalBackupValidationIssue {
  severity: LocalBackupValidationSeverity;
  code: string;
  message: string;
}

export interface LocalBackupValidationAreaCheck {
  area: LocalBackupArea;
  relativePath: string;
  exists: boolean;
  manifestFiles: number;
  actualFiles: number | null;
  manifestBytes: number;
  actualBytes: number | null;
}

export interface LocalBackupValidationResult {
  manifestPath: string;
  backupRoot: string;
  canRestore: boolean;
  manifest: LocalBackupManifest | null;
  issues: LocalBackupValidationIssue[];
  areaChecks: LocalBackupValidationAreaCheck[];
  expectedAreaCount: number;
  presentAreaCount: number;
  expectedTotalFiles: number | null;
  actualTotalFiles: number;
  expectedTotalBytes: number | null;
  actualTotalBytes: number;
  storageRootMatchesCurrent: boolean | null;
  policyMatchesCurrent: boolean | null;
  backupAgeDays: number | null;
}

export interface LocalBackupRestoreImpactAreaSummary {
  area: LocalBackupArea;
  backupRelativePath: string;
  targetPath: string;
  backupFileCount: number;
  currentFileCount: number;
  changedFileCount: number;
  unchangedFileCount: number;
  addedFileCount: number;
  removedFileCount: number;
  sampleChangedPaths: string[];
  sampleAddedPaths: string[];
  sampleRemovedPaths: string[];
}

export interface LocalBackupRestoreImpactResult {
  manifestPath: string;
  previewGeneratedAt: string;
  comparisonMode: "replace_area";
  targetStorageRoot: string;
  validation: LocalBackupValidationResult;
  readyForManualRestore: boolean;
  totalBackupFileCount: number;
  totalCurrentFileCount: number;
  totalChangedFileCount: number;
  totalUnchangedFileCount: number;
  totalAddedFileCount: number;
  totalRemovedFileCount: number;
  destructiveAreaCount: number;
  areas: LocalBackupRestoreImpactAreaSummary[];
}

export interface SkillSummary {
  id: string;
  canonicalName: string;
  displayName: string;
  sourceType: string;
  sourcePath: string;
  currentVersionFingerprint: string | null;
  description: string | null;
  lineCount: number | null;
  lastSeenAt: string;
  governance: SkillGovernanceProfile;
  health: SkillHealthSummary;
}

export type SkillRole =
  | "memory"
  | "infrastructure"
  | "development"
  | "analysis"
  | "packaging"
  | "governance";

export type SkillDataClass =
  | "account_identity"
  | "server_path"
  | "server_runtime"
  | "development_context"
  | "workflow_state"
  | "local_knowledge";

export type SkillStoragePolicy = "session_only" | "local_persisted" | "local_sensitive";

export type SkillReusePolicy = "safe_to_bundle" | "review_before_bundle" | "local_only";

export type SkillPreferredHarness = "superpowers" | "generic";

export type SkillStructureType = "single_skill" | "composite_framework";

export type SkillOrchestrationSignal =
  | "router_layer"
  | "spec_artifacts"
  | "memory_governance"
  | "review_gate"
  | "test_gate"
  | "release_flow"
  | "long_task_orchestration"
  | "multi_skill_composition";

export interface SkillGovernanceProfile {
  role: SkillRole;
  preferredHarness: SkillPreferredHarness;
  structureType: SkillStructureType;
  frameworkLabel: string | null;
  orchestrationSignals: SkillOrchestrationSignal[];
  moduleCountHint: number | null;
  dataClasses: SkillDataClass[];
  storagePolicy: SkillStoragePolicy;
  reusePolicy: SkillReusePolicy;
  recommendedScope: "system" | "workspace" | "project" | "folder";
  storesLongLivedContext: boolean;
  containsSensitiveOperationalData: boolean;
}

export type SkillHealthStatus = "healthy" | "needs_attention" | "deprecated" | "unknown";

export type SkillHealthScorePolicyPreset =
  | "balanced"
  | "reliability_first"
  | "cost_guard"
  | "latency_guard"
  | "freshness_guard";

export interface SkillHealthScorePolicy {
  id: "default";
  preset: SkillHealthScorePolicyPreset;
  label: string;
  description: string;
  reliabilityWeight: number;
  costWeight: number;
  latencyWeight: number;
  freshnessWeight: number;
  maintainabilityWeight: number;
  healthyScore: number;
  attentionScore: number;
  updatedAt: string;
}

export interface SkillHealthScorePolicyInput {
  preset: SkillHealthScorePolicyPreset;
}

export interface SkillHealthTrend {
  latestScore: number;
  previousScore: number | null;
  delta: number | null;
  direction: "up" | "down" | "flat" | "new";
  measuredAt: string | null;
  previousMeasuredAt: string | null;
  sampleCount: number;
}

export interface SkillHealthSummary {
  score: number;
  status: SkillHealthStatus;
  confidence: number;
  reasons: string[];
  calculatedAt: string;
  trend: SkillHealthTrend;
  signals: {
    runs7d: number;
    failureRate7d: number | null;
    avgDurationMs7d: number | null;
    avgTokensPerRun7d: number | null;
    openProposalCount: number;
    acceptedProposalCount: number;
    highSeverityProposalCount: number;
    hasDescription: boolean;
    lineCount: number | null;
    freshnessDays: number | null;
  };
}

export interface SkillIntelligenceAnalysis {
  id: string;
  skillId: string;
  skillName: string;
  generatedAt: string;
  summary: string;
  dependencies: string[];
  executionFlow: string[];
  risks: string[];
  optimizationSuggestions: string[];
  alternativesAndRelated: string[];
  evidence: {
    healthScore: number;
    healthStatus: SkillHealthStatus;
    runs7d: number;
    failureRate7d: number | null;
    avgDurationMs7d: number | null;
    avgTokensPerRun7d: number | null;
    openProposalCount: number;
    bundleCount: number;
    relatedSkillCount: number;
  };
}

export type SkillApplyScope = "system" | "workspace" | "project" | "folder";

export interface SkillApplyPreviewInput {
  skillId?: string;
  remoteCandidateId?: string;
  scope: SkillApplyScope;
}

export interface SkillApplyPreview {
  id: string;
  skillId: string | null;
  sourceKind: "local_skill" | "remote_candidate";
  remoteCandidateId: string | null;
  skillName: string;
  scope: SkillApplyScope;
  generatedAt: string;
  targetLabel: string;
  targetPath: string | null;
  conflictPolicy: "preview_diff_first";
  remoteSkillPolicy: "activation_required";
  readyForConfirmation: boolean;
  requiresBackupRecommendation: boolean;
  impact: {
    projects: number;
    folders: number;
    workspaces: number;
    pendingWrites: number;
  };
  previewSteps: string[];
  warnings: string[];
}

export interface BootstrapState {
  status: "limited" | "ready";
  storageRoot: string;
  databasePath: string;
  healthScorePolicy: SkillHealthScorePolicy;
  policy: AuthorizationPolicy | null;
  roots: ScanRoot[];
  exclusions: ScanExclusion[];
  skills: SkillSummary[];
  lastScanAt: string | null;
}

export interface AuthorizationInput {
  name: string;
  scanRoots: string[];
  scanExclusions: string[];
  telemetryMode: TelemetryMode;
  allowRawContent: boolean;
  allowBackgroundWatch: boolean;
}

export interface ScanResult {
  scanRunId: string;
  filesSeen: number;
  skillsFound: number;
  skillsChanged: number;
  errorCount: number;
  excludedPathCount: number;
  skippedEntryCount: number;
  completedAt: string;
  skills: SkillSummary[];
}

export interface TelemetryImportResult {
  filePath: string;
  importedAt: string;
  linesRead: number;
  processedEvents: number;
  ignoredEvents: number;
  importedRuns: number;
  updatedRuns: number;
  affectedSkills: number;
  affectedSkillIds: string[];
  observedModelNames: string[];
  errorCount: number;
  errors: string[];
}

export interface SkillRunSummary {
  runId: string;
  skillId: string;
  skillName: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  totalTokens: number;
  estimatedCostUsd: number;
  modelName: string | null;
  toolCallCount: number;
  captureMode: string;
  sourceType: string;
  firstOutputLatencyMs: number | null;
}

export interface SkillMetricLeader {
  skillId: string;
  skillName: string;
  runsCount: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number | null;
  maxDurationMs: number | null;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface SkillWasteLeader extends SkillMetricLeader {
  failureRate: number;
  avgTokensPerRun: number;
  wasteScore: number;
}

export interface DailyMetricsSummary {
  date: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  avgDurationMs: number | null;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalToolCalls: number;
  slowestSkills: SkillMetricLeader[];
  mostUsedSkills: SkillMetricLeader[];
}

export interface WeeklyMetricsSummary {
  startDate: string;
  endDate: string;
  windowDays: number;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  avgDurationMs: number | null;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalToolCalls: number;
  slowestSkills: SkillMetricLeader[];
  mostUsedSkills: SkillMetricLeader[];
  highestWasteSkills: SkillWasteLeader[];
}

export type OptimizationProposalSeverity = "low" | "medium" | "high";

export type OptimizationProposalStatus = "open" | "accepted" | "dismissed" | "resolved";

export type OptimizationProposalEvidenceType = "static_skill" | "daily_metric" | "weekly_metric";

export type OptimizationProposalActionType =
  | "created"
  | "accepted"
  | "dismissed"
  | "reopened"
  | "resolved"
  | "auto_resolved";

export type OptimizationProposalActorType = "system" | "user";

export interface OptimizationProposalEvidence {
  id: string;
  proposalId: string;
  evidenceType: OptimizationProposalEvidenceType;
  refId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface OptimizationProposalAction {
  id: string;
  proposalId: string;
  actionType: OptimizationProposalActionType;
  actorType: OptimizationProposalActorType;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface OptimizationProposal {
  id: string;
  skillId: string;
  skillName: string;
  skillVersionId: string | null;
  proposalType: string;
  severity: OptimizationProposalSeverity;
  status: OptimizationProposalStatus;
  title: string;
  summary: string;
  estimatedBenefit: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  evidence: OptimizationProposalEvidence[];
  actions: OptimizationProposalAction[];
}

export interface OptimizationProposalRefreshResult {
  generatedAt: string;
  date: string;
  createdCount: number;
  updatedCount: number;
  resolvedCount: number;
  skippedCount: number;
  proposals: OptimizationProposal[];
}

export interface GraphTypeCount {
  key: string;
  count: number;
}

export interface GraphNodeSummary {
  id: string;
  nodeType: string;
  refId: string;
  displayName: string;
  degree: number;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdgeSummary {
  id: string;
  edgeType: string;
  fromNodeId: string;
  toNodeId: string;
  fromDisplayName: string;
  toDisplayName: string;
  weight: number;
  firstSeenAt: string;
  lastSeenAt: string;
  metadata: Record<string, unknown>;
}

export interface GraphSnapshot {
  generatedAt: string | null;
  totalNodes: number;
  totalEdges: number;
  nodeTypeCounts: GraphTypeCount[];
  edgeTypeCounts: GraphTypeCount[];
  nodes: GraphNodeSummary[];
  edges: GraphEdgeSummary[];
}

export interface GraphNeighborhood {
  centerNodeId: string;
  centerNode: GraphNodeSummary | null;
  generatedAt: string | null;
  totalNodeCount: number;
  totalEdgeCount: number;
  hiddenNodeCount: number;
  hiddenEdgeCount: number;
  nodes: GraphNodeSummary[];
  edges: GraphEdgeSummary[];
}

export interface GraphTracePath {
  targetNode: GraphNodeSummary;
  nodes: GraphNodeSummary[];
  edges: GraphEdgeSummary[];
  hopCount: number;
  aggregateWeight: number;
}

export interface GraphPathTrace {
  centerNodeId: string;
  centerNode: GraphNodeSummary | null;
  generatedAt: string | null;
  maxDepth: number;
  pathLimit: number;
  totalCandidateCount: number;
  truncated: boolean;
  targetTypeCounts: GraphTypeCount[];
  paths: GraphTracePath[];
}

export type SkillBundleType = "skill_package";
export type SkillBundleImportStrategy = "preserve_existing" | "supersede_current";
export type SkillBundleLifecycleState = "current" | "retained" | "superseded";
export type SkillBundleIngestStrategy = "export_snapshot" | SkillBundleImportStrategy;

export interface SkillBundleExportInput {
  skillId: string;
  bundleName?: string;
}

export interface SkillBundleImportInput {
  manifestPath: string;
  importMode?: "copy";
  strategy?: SkillBundleImportStrategy;
}

export interface SkillBundleManifestItem {
  itemType: string;
  refId: string;
  displayName: string;
  relativeSourcePath: string;
  relativeExportPath: string;
  versionFingerprint: string | null;
  sourceType: string;
  metadata: Record<string, unknown>;
}

export interface SkillBundleManifest {
  schemaVersion: string;
  bundleId: string;
  bundleName: string;
  bundleType: SkillBundleType;
  versionLabel: string;
  createdAt: string;
  exportRoot: string;
  entrypoint: string;
  exportedFrom: {
    policyId: string;
    storageRoot: string;
  };
  dependencySummary: {
    totalFiles: number;
    topLevelEntries: string[];
    directories: string[];
    hasScripts: boolean;
    hasReferences: boolean;
    hasAssets: boolean;
  };
  items: SkillBundleManifestItem[];
}

export interface SkillBundleSummary {
  id: string;
  sourceBundleId: string;
  lineageKey: string;
  bundleName: string;
  bundleType: SkillBundleType;
  versionLabel: string;
  lifecycleState: SkillBundleLifecycleState;
  ingestStrategy: SkillBundleIngestStrategy;
  createdAt: string;
  createdFromPolicyId: string;
  exportPath: string;
  manifestPath: string;
  itemCount: number;
  primarySkillId: string | null;
  primarySkillName: string | null;
  supersedesBundleId: string | null;
  supersededByBundleId: string | null;
}

export interface SkillBundleExportResult {
  bundle: SkillBundleSummary;
  manifest: SkillBundleManifest;
  copiedFileCount: number;
}

export type BundleValidationSeverity = "error" | "warning" | "info";
export type SkillBundleDiffState = "same" | "changed" | "unknown";
export type SkillBundleSafetyClassification =
  | "no_change"
  | "safe_update"
  | "drift"
  | "conflict";

export interface SkillBundleValidationIssue {
  severity: BundleValidationSeverity;
  code: string;
  message: string;
}

export interface SkillBundleMatchingSkill {
  skillId: string;
  skillName: string;
  sourcePath: string;
  currentVersionFingerprint: string | null;
  sameVersionFingerprint: boolean;
}

export interface SkillBundleChangeList {
  added: string[];
  removed: string[];
  changed: string[];
  unchangedCount: number;
}

export interface SkillBundleDependencyDelta {
  totalFilesDelta: number;
  addedTopLevelEntries: string[];
  removedTopLevelEntries: string[];
  addedDirectories: string[];
  removedDirectories: string[];
}

export interface SkillBundleDiffSummary {
  classification: SkillBundleSafetyClassification;
  title: string;
  summary: string;
  reasons: string[];
  comparedBundle: SkillBundleSummary | null;
  versionDelta: SkillBundleDiffState;
  comparedBundleFingerprintDelta: SkillBundleDiffState;
  localSkillFingerprintDelta: SkillBundleDiffState;
  incomingFingerprint: string | null;
  storedBundleFingerprint: string | null;
  localSkillFingerprint: string | null;
  itemDelta: SkillBundleChangeList;
  dependencyDelta: SkillBundleDependencyDelta;
}

export interface SkillBundleValidationResult {
  manifestPath: string;
  bundleRoot: string;
  canImport: boolean;
  manifest: SkillBundleManifest | null;
  issues: SkillBundleValidationIssue[];
  existingBundle: SkillBundleSummary | null;
  matchingSkill: SkillBundleMatchingSkill | null;
  diff: SkillBundleDiffSummary;
  recommendedStrategy: SkillBundleImportStrategy;
  availableStrategies: SkillBundleImportStrategy[];
  discoveredFileCount: number;
}

export interface SkillBundleImportResult {
  bundle: SkillBundleSummary;
  manifest: SkillBundleManifest;
  importedAt: string;
  copiedFileCount: number;
  appliedStrategy: SkillBundleImportStrategy;
  validation: SkillBundleValidationResult;
}

export type RemoteSkillSourceType = "github" | "marketplace";
export type RemoteSkillRiskLevel = "low" | "medium" | "high" | "blocked";
export type RemoteSkillCheckStatus = "pass" | "warn" | "block";
export type RemoteSkillVerificationStatus = "unverified" | "verified" | "review_required";

export interface RemoteSkillSourceCheck {
  label: string;
  status: RemoteSkillCheckStatus;
  summary: string;
}

export interface RemoteSkillSourceAnalysis {
  id: string;
  sourceType: RemoteSkillSourceType;
  sourceUrl: string;
  normalizedUrl: string;
  owner: string | null;
  repo: string | null;
  displayName: string;
  generatedAt: string;
  riskLevel: RemoteSkillRiskLevel;
  canImport: boolean;
  verificationStatus: RemoteSkillVerificationStatus;
  checks: RemoteSkillSourceCheck[];
  activationSteps: string[];
  importPreview: {
    storageMode: "app_local_copy";
    executionPolicy: "manual_until_activated";
    targetState: "inactive_remote_candidate";
    requiresScopeSelection: boolean;
    requiresManifestValidation: boolean;
  };
}

export interface RemoteSkillImportResult {
  candidateId: string;
  catalogSkillId: string;
  sourceType: RemoteSkillSourceType;
  sourceUrl: string;
  normalizedUrl: string;
  displayName: string;
  importedAt: string;
  status: "inactive_remote_candidate";
  storageMode: "app_local_copy";
  executionPolicy: "manual_until_activated";
  riskLevel: RemoteSkillRiskLevel;
  verificationStatus: RemoteSkillVerificationStatus;
  nextSteps: string[];
}

export interface RemoteSkillActivationPreview {
  candidateId: string;
  catalogSkillId: string | null;
  displayName: string;
  previewedAt: string;
  status: "activation_preview";
  canActivateAfterConfirmation: boolean;
  willRunNow: false;
  scopeRequired: true;
  targetPreviewRequired: true;
  recommendedScope: "project";
  scopeOptions: SkillApplyScope[];
  requiredSteps: string[];
  boundarySummary: string;
}

export interface RemoteSkillCandidateSummary {
  candidateId: string;
  catalogSkillId: string | null;
  sourceType: RemoteSkillSourceType;
  sourceUrl: string;
  normalizedUrl: string;
  displayName: string;
  importedAt: string;
  activationPreviewedAt: string | null;
  status: "inactive_remote_candidate" | "activation_previewed";
  riskLevel: RemoteSkillRiskLevel;
  verificationStatus: RemoteSkillVerificationStatus;
  canImport: boolean;
  willRunNow: false;
  nextStep: "review" | "preview_activation" | "open_apply_center";
}

export interface RemoteSkillCandidateDetail {
  candidate: RemoteSkillCandidateSummary;
  generatedAt: string;
  sourceOwner: string | null;
  sourceRepo: string | null;
  checks: RemoteSkillSourceCheck[];
  activationSteps: string[];
  manifestPreview: {
    status: RemoteSkillCheckStatus;
    summary: string;
    requiresValidation: boolean;
  };
  dependencyPreview: {
    dependencyCount: number | null;
    tags: string[];
    summary: string;
  };
  diffPreview: {
    status: "preview_required" | "not_available";
    summary: string;
    changedFiles: number | null;
  };
  catalogSignals: {
    author: string | null;
    healthScore: number | null;
    trustScore: number | null;
    downloadsLabel: string | null;
    ratingLabel: string | null;
    updatedLabel: string | null;
  };
  safetyBoundaries: string[];
}

export interface RemoteMarketplaceCollection {
  key: string;
  label: string;
  labelZh: string;
  count: number;
  tone: "marketplace" | "workflow" | "agent" | "project" | "skill" | "bundle";
}

export interface RemoteMarketplaceSkill {
  id: string;
  name: string;
  description: string;
  descriptionZh: string;
  author: string;
  source: "GitHub" | "Marketplace";
  sourceUrl: string;
  tags: string[];
  downloadsLabel: string;
  ratingLabel: string;
  healthScore: number;
  trustScore: number;
  riskLabel: string;
  riskLabelZh: string;
  dependencyCount: number;
  updatedLabel: string;
  updatedLabelZh: string;
  verificationStatus: "unverified" | "verified" | "review_required";
  statusLabel: string;
  statusLabelZh: string;
  collectionKeys: string[];
}

export interface RemoteMarketplaceCatalog {
  generatedAt: string;
  query: string;
  sourceMode: "bundled_local_catalog";
  collections: RemoteMarketplaceCollection[];
  skills: RemoteMarketplaceSkill[];
}

export interface WorkbenchApi {
  bootstrap: () => Promise<BootstrapState>;
  pickDirectory: () => Promise<string | null>;
  pickTelemetryFile: () => Promise<string | null>;
  pickBackupManifest: () => Promise<string | null>;
  pickBundleManifest: () => Promise<string | null>;
  grantAuthorization: (input: AuthorizationInput) => Promise<BootstrapState>;
  listAuditEvents: (limit?: number) => Promise<LocalAuditEvent[]>;
  createBackup: () => Promise<LocalBackupSummary>;
  listBackups: (limit?: number) => Promise<LocalBackupSummary[]>;
  validateBackupManifest: (manifestPath: string) => Promise<LocalBackupValidationResult>;
  previewBackupRestoreImpact: (manifestPath: string) => Promise<LocalBackupRestoreImpactResult>;
  scanSkills: () => Promise<ScanResult>;
  listSkills: () => Promise<SkillSummary[]>;
  generateSkillAnalysis: (skillId: string) => Promise<SkillIntelligenceAnalysis>;
  getLatestSkillAnalysis: (skillId: string) => Promise<SkillIntelligenceAnalysis | null>;
  analyzeRemoteSkillSource: (sourceUrl: string) => Promise<RemoteSkillSourceAnalysis>;
  importMarketplaceSkill: (skillId: string) => Promise<RemoteSkillImportResult>;
  previewRemoteSkillActivation: (candidateId: string) => Promise<RemoteSkillActivationPreview>;
  listRemoteSkillCandidates: () => Promise<RemoteSkillCandidateSummary[]>;
  getRemoteSkillCandidateDetail: (candidateId: string) => Promise<RemoteSkillCandidateDetail>;
  getHealthScorePolicy: () => Promise<SkillHealthScorePolicy>;
  updateHealthScorePolicy: (
    input: SkillHealthScorePolicyInput
  ) => Promise<SkillHealthScorePolicy>;
  previewSkillApply: (input: SkillApplyPreviewInput) => Promise<SkillApplyPreview>;
  listMarketplaceCatalog: (query?: string) => Promise<RemoteMarketplaceCatalog>;
  importTelemetryFile: (filePath: string) => Promise<TelemetryImportResult>;
  listRecentRuns: (limit?: number) => Promise<SkillRunSummary[]>;
  getDailySummary: (date?: string) => Promise<DailyMetricsSummary>;
  getWeeklySummary: (endDate?: string) => Promise<WeeklyMetricsSummary>;
  refreshOptimizationProposals: (date?: string) => Promise<OptimizationProposalRefreshResult>;
  listOptimizationProposals: (
    status?: OptimizationProposalStatus | "all"
  ) => Promise<OptimizationProposal[]>;
  updateOptimizationProposalStatus: (
    proposalId: string,
    status: OptimizationProposalStatus
  ) => Promise<OptimizationProposal>;
  refreshGraph: () => Promise<GraphSnapshot>;
  getGraphSnapshot: () => Promise<GraphSnapshot>;
  getGraphNeighborhood: (nodeId: string) => Promise<GraphNeighborhood>;
  getGraphPathTrace: (nodeId: string) => Promise<GraphPathTrace>;
  listBundles: () => Promise<SkillBundleSummary[]>;
  exportSkillBundle: (input: SkillBundleExportInput) => Promise<SkillBundleExportResult>;
  validateSkillBundleImport: (manifestPath: string) => Promise<SkillBundleValidationResult>;
  importSkillBundle: (input: SkillBundleImportInput) => Promise<SkillBundleImportResult>;
}
