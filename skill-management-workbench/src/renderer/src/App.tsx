import {
  createContext,
  startTransition,
  useContext,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode
} from "react";
import type {
  AuthorizationInput,
  BootstrapState,
  BundleValidationSeverity,
  DailyMetricsSummary,
  GraphEdgeSummary,
  GraphNeighborhood,
  GraphNodeSummary,
  GraphPathTrace,
  GraphSnapshot,
  GraphTracePath,
  GraphTypeCount,
  LocalAuditEvent,
  LocalBackupRestoreImpactResult,
  LocalBackupSummary,
  LocalBackupValidationResult,
  LocalBackupValidationSeverity,
  LocalToolTelemetryImportResult,
  LocalToolTelemetryPreview,
  LocalToolTelemetrySource,
  ManagedProjectRecord,
  OptimizationProposal,
  OptimizationProposalRefreshResult,
  OptimizationProposalSeverity,
  OptimizationProposalStatus,
  ProjectProfileSummary,
  ProjectRuntimeEvidenceRefreshResult,
  RemoteMarketplaceCatalog,
  RemoteMarketplaceSkill,
  RemoteSkillCheckStatus,
  RemoteSkillRiskLevel,
  RemoteSkillActivationPreview,
  RemoteSkillCandidateDetail,
  RemoteSkillCandidateSummary,
  RemoteSkillImportResult,
  RemoteSkillSourceAnalysis,
  RemoteSkillVerificationStatus,
  ScanResult,
  SkillApplyPreview,
  SkillApplyScope,
  SkillBundleDiffState,
  SkillBundleExportResult,
  SkillBundleImportStrategy,
  SkillBundleImportResult,
  SkillBundleLifecycleState,
  SkillBundleSafetyClassification,
  SkillBundleSummary,
  SkillBundleValidationResult,
  SkillHealthScorePolicyPreset,
  SkillIntelligenceAnalysis,
  SkillMetricLeader,
  SkillRunSummary,
  SkillSummary,
  SkillWasteLeader,
  TelemetryImportResult,
  TelemetryMode,
  WeeklyMetricsSummary,
  WorkflowStarterApplyResult,
  WorkflowStarterPreview
} from "../../shared/types";

type LanguageMode = "en" | "zh";
type ProductMode = "guided" | "builder";

type InteractionNoticeTone = "default" | "success" | "warning" | "info";

type InteractionNotice = {
  area: string;
  action: string;
  result: string;
  nextStep: string;
  tone?: InteractionNoticeTone;
};

type LibraryStage = "summary" | "analysis" | "optimization" | "tuning" | "packaging";

type ManagedProject = ManagedProjectRecord;

type ProjectHeartbeatTone = "success" | "warning" | "error" | "info";

type ProjectHeartbeatEntry = {
  id: string;
  projectPath: string;
  observedAt: string;
  tone: ProjectHeartbeatTone;
  status: ProjectRuntimeEvidenceRefreshResult["status"] | "error";
  importedRuns: number;
  updatedRuns: number;
  totalRuns: number;
  sourceCount: number;
  message: string;
};

type ProjectRepairFeedback = {
  projectPath: string;
  status:
    | "running"
    | "completed"
    | "connected-awaiting-skill"
    | "needs-action"
    | "connection-required"
    | "failed";
  detail: string;
};

type ProjectOnboardingLogEntry = {
  id: string;
  projectPath: string;
  occurredAt: string;
  stage: "scan" | "skills" | "workflow" | "telemetry" | "connection" | "complete";
  tone: "info" | "success" | "warning" | "error";
  message: string;
};

type SkillLibrarySortKey = "priority" | "name" | "calls" | "tokens" | "score" | "latest";
type SkillLibraryTypeFilter = "all" | SkillSummary["governance"]["role"];
type RemoteLibrarySortKey = "name" | "risk" | "status" | "source";

const defaultPolicyName = "Default local policy";
const managedProjectsStorageKey = "skill-os-managed-projects-v1";
const projectHeartbeatStorageKey = "skill-os-project-heartbeats-v1";
const projectOnboardingLogsStorageKey = "skill-os-project-onboarding-logs-v1";
const maxProjectHeartbeatEntries = 48;
const maxProjectOnboardingLogEntries = 120;
const runtimeRunFetchLimit = 500;
const skillRunDetailLimit = 200;

const healthScorePolicyPresets: SkillHealthScorePolicyPreset[] = [
  "balanced",
  "reliability_first",
  "cost_guard",
  "latency_guard",
  "freshness_guard"
];

const productNavHrefs = [
  "#overview",
  "#discovery",
  "#local-skills",
  "#evaluate",
  "#analysis",
  "#remote-market",
  "#graph",
  "#proposals",
  "#apply-center",
  "#bundles",
  "#registry",
  "#audit",
  "#settings"
] as const;

const uiCopy: Record<string, string> = {
  "Accept": "接受",
  "Accepted": "已接受",
  "Action Events": "操作事件",
  "Action Timeline": "操作时间线",
  "Added Items": "新增项目",
  "Added Top-level Entries": "新增顶层条目",
  "Affected Skills": "受影响 Skill",
  "All visible edges in the current snapshot are rendered in this map.": "当前快照中所有可见边都已渲染到这张图中。",
  "Approved Roots": "已授权项目",
  "Avg Duration": "平均耗时",
  "Avg Tokens/Run": "平均 Token/运行",
  "Back": "后退",
  "Backup Files": "备份文件",
  "Backup Manifest Preview": "备份清单预览",
  "Backup Path": "备份路径",
  "Backup Root": "备份根目录",
  "Baseline Bundle": "基线 Bundle",
  "Bundle": "Bundle",
  "Bundle Coverage": "Bundle 覆盖",
  "Bundle Footprint": "Bundle 足迹",
  "Bundle Import": "Bundle 导入",
  "Bundle Name": "Bundle 名称",
  "Bundle Summary": "Bundle 摘要",
  "Bundles": "Bundle",
  "Can Import": "可导入",
  "Captured Database Path": "捕获的数据库路径",
  "Captured Policy": "捕获的策略",
  "Changed": "已变更",
  "Changed Files": "变更文件",
  "Changed Items": "变更项目",
  "Clear History": "清空历史",
  "Clear Query": "清空查询",
  "Clear Selection": "清除选择",
  "Clear Trace Focus": "清除链路焦点",
  "Compared Bundle": "对比 Bundle",
  "Completion Tokens": "Completion Token",
  "Completed": "已完成",
  "Connected Models": "关联模型",
  "Connected Relationships": "关联关系",
  "Created": "创建时间",
  "Current": "当前",
  "Current Files": "当前文件",
  "Current Graph Scope": "当前图谱范围",
  "Current Stop": "当前位置",
  "Date": "日期",
  "Degree": "度数",
  "Directory Delta": "目录差异",
  "Dismiss": "忽略",
  "Dismissed": "已忽略",
  "Display Name": "显示名称",
  "Duration": "耗时",
  "Edge Types": "边类型",
  "Edges": "边",
  "Entrypoint": "入口",
  "Errors": "错误",
  "Est. Cost": "预估成本",
  "Evidence Items": "证据项",
  "Evidence Signals": "证据信号",
  "Expected Benefit": "预期收益",
  "Export Path": "导出路径",
  "Failed Runs": "失败运行",
  "Failed": "失败",
  "Failures": "失败",
  "Files": "文件",
  "Fingerprint": "指纹",
  "Fingerprint Diff": "指纹差异",
  "Focus Matches in Topology": "在拓扑中聚焦匹配项",
  "Forward": "前进",
  "Generated": "生成时间",
  "Graph": "图谱",
  "Graph Focus Analysis": "图谱焦点分析",
  "Graph Navigation": "图谱导航",
  "Governance": "治理",
  "Highest Waste Skills This Week": "本周最高浪费 Skill",
  "Import Strategy": "导入策略",
  "Imported Runs": "已导入运行",
  "Incoming Fingerprint": "传入指纹",
  "Inspect Bundle": "检查 Bundle",
  "Inspect Exported Bundle": "检查已导出 Bundle",
  "Inspect Imported Bundle": "检查已导入 Bundle",
  "Inspect In Graph": "在图谱中检查",
  "Inspect Matching Skill": "检查匹配 Skill",
  "Inspect Model": "检查模型",
  "Inspect Node": "检查节点",
  "Inspect Primary Skill": "检查主 Skill",
  "Inspect Root": "检查根目录",
  "Inspect Skill": "检查 Skill",
  "Latency": "延迟",
  "Latest Export": "最新导出",
  "Latest Import": "最新导入",
  "Latest scan": "最新扫描",
  "Last Scan": "最近扫描",
  "Lifecycle": "生命周期",
  "Lineage History": "谱系历史",
  "Lineage Key": "谱系 Key",
  "Lineage Members": "谱系成员",
  "Lines": "行数",
  "Linked Skill Context": "关联 Skill 上下文",
  "Linked Skills": "关联 Skill",
  "Local Action Timeline": "本地操作时间线",
  "Local Graph Search": "本地图谱搜索",
  "Manifest": "清单",
  "Manifest Integrity": "清单完整性",
  "Manifest Path": "清单路径",
  "Manifest Storage Root": "清单存储根目录",
  "Mark Resolved": "标记已解决",
  "Metadata Fields": "元数据字段",
  "Model": "模型",
  "Model Context": "模型上下文",
  "Model Name": "模型名称",
  "Name": "名称",
  "No": "否",
  "No bundles stored yet": "还没有存储 Bundle",
  "No graph edges yet": "还没有图谱边",
  "No graph nodes yet": "还没有图谱节点",
  "No graph topology yet": "还没有图谱拓扑",
  "No proposals in this view": "此视图没有建议",
  "No recent telemetry yet": "还没有最近遥测",
  "No skills indexed yet": "还没有索引 Skill",
  "Node Summary": "节点摘要",
  "Node Type": "节点类型",
  "Node Types": "节点类型",
  "Nodes": "节点",
  "Only In Backup": "仅在备份中",
  "Only In Current": "仅在当前中",
  "Open": "待处理",
  "Optimization Work": "优化工作",
  "Package": "打包",
  "Path": "路径",
  "Path Trace": "路径追踪",
  "Policy Match": "策略匹配",
  "Preview Generated": "预览生成时间",
  "Preview Ready": "预览就绪",
  "Processed Events": "已处理事件",
  "Primary Skill": "主 Skill",
  "Prompt Tokens": "Prompt Token",
  "Proposal Spillover": "建议外溢",
  "Proposal Summary": "建议摘要",
  "Proposal Type": "建议类型",
  "Proposals": "建议",
  "Registered Bundle": "已注册 Bundle",
  "Removed Items": "移除项目",
  "Removed Top-level Entries": "移除顶层条目",
  "Reopen": "重新打开",
  "Reset Scope": "重置范围",
  "Reset Topology": "重置拓扑",
  "Resolved": "已解决",
  "Running": "运行中",
  "Restore impact preview found a low-risk file replacement path": "恢复影响预览发现低风险文件替换路径",
  "Return To Snapshot": "返回快照",
  "Root Summary": "项目摘要",
  "Root Type": "项目来源类型",
  "Runs This Week": "本周运行",
  "Runs Today": "今日运行",
  "Safety Class": "安全分类",
  "Scan Status": "扫描状态",
  "Scan Time": "扫描时间",
  "Sample Adds": "新增样例",
  "Sample Overwrites": "覆盖样例",
  "Sample Removals": "移除样例",
  "Search becomes available as soon as the local graph snapshot contains nodes.": "本地图谱快照包含节点后即可搜索。",
  "Selected": "已选择",
  "Selected Node": "已选节点",
  "Show Full Topology": "显示完整拓扑",
  "Show In Topology": "在拓扑中显示",
  "Skill": "Skill",
  "Skill Files": "Skill 文件",
  "Skill Index": "技能索引",
  "Skills": "Skill",
  "Skills Found": "发现 Skill",
  "Skills On This Version": "此版本上的 Skill",
  "Skills Under Root": "项目内 Skill",
  "Skills Using This Model": "使用此模型的 Skill",
  "Slowest Skills This Week": "本周最慢 Skill",
  "Slowest Skills Today": "今日最慢 Skill",
  "Source": "来源",
  "Source Bundle": "来源 Bundle",
  "Source Path": "来源路径",
  "Source Type": "来源类型",
  "Started": "开始时间",
  "Status": "状态",
  "Actions": "操作",
  "Boundary": "边界",
  "Snapshot": "快照",
  "Snapshot Size": "快照大小",
  "Storage Path": "存储路径",
  "Storage Root Match": "存储根目录匹配",
  "Strategy": "策略",
  "Success": "成功",
  "Summary": "摘要",
  "Target Path": "目标路径",
  "Target Storage Root": "目标存储根目录",
  "Tokens": "Token",
  "Tool Calls": "工具调用",
  "Topology Scope": "拓扑范围",
  "Topology View": "拓扑视图",
  "Total Cost": "总成本",
  "Total Files": "文件总数",
  "Total Size": "总大小",
  "Total Tokens": "Token 总数",
  "Unchanged Items": "未变更项目",
  "Updated": "更新时间",
  "Updated Runs": "已更新运行",
  "Version": "版本",
  "Version And Files": "版本与文件",
  "Version Label": "版本标签",
  "Version Summary": "版本摘要",
  "View In Graph": "在图谱中查看",
  "Visible Edges": "可见边",
  "Visible Graph Relationships": "可见图谱关系",
  "Visible Related Nodes": "可见相关节点",
  "Visible Relations": "可见关系",
  "Waste Score": "浪费分",
  "Why This Proposal Appeared": "建议出现原因",
  "Window": "窗口",
  "Vs Indexed Skill": "对比已索引 Skill",
  "Vs Stored Bundle": "对比已存 Bundle",
  "Yes": "是"
};

interface LanguageContextValue {
  mode: LanguageMode;
  tx: (en: string, zh: string) => string;
  t: (en: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  mode: "zh",
  tx: (_en, zh) => zh,
  t: (en) => uiCopy[en] ?? en
});

function normalizeChineseCopy(zh: string) {
  return zh
    .replace(/Skill OS/g, "__SKILL_OS__")
    .replace(/\bskills-workflow\b/gi, "技能工作流")
    .replace(/\bSKILLS\b/g, "技能")
    .replace(/\bSkills\b/g, "技能")
    .replace(/\bSKILL\b/g, "技能")
    .replace(/\bSkill\b/g, "技能")
    .replace(/技能\s+(?=[\u4e00-\u9fa5])/g, "技能")
    .replace(/(?<=[\u4e00-\u9fa5])\s+技能/g, "技能")
    .replace(/__SKILL_OS__/g, "Skill OS");
}

function formatLocalizedText(mode: LanguageMode, en: string, zh: string) {
  if (mode === "zh") {
    return normalizeChineseCopy(zh);
  }
  return en;
}

function formatProductModeText(mode: ProductMode, guided: string, builder: string) {
  return mode === "builder" ? builder : guided;
}

function normalizeProjectPath(path: string) {
  const trimmed = path.trim();
  if (trimmed === "/") {
    return trimmed;
  }
  return trimmed.replace(/\/+$/, "");
}

function getProjectDisplayName(path: string) {
  const normalized = normalizeProjectPath(path);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function isPathInsideProject(path: string, projectPath: string) {
  const normalizedPath = normalizeProjectPath(path);
  const normalizedProjectPath = normalizeProjectPath(projectPath);
  return (
    Boolean(normalizedPath && normalizedProjectPath) &&
    (normalizedPath === normalizedProjectPath || normalizedPath.startsWith(`${normalizedProjectPath}/`))
  );
}

function getLatestObservedWorkspace(result: ProjectRuntimeEvidenceRefreshResult | null) {
  if (!result) {
    return null;
  }
  const directWorkspace = result.matchedWorkspaceRef ?? result.latestObservedWorkspaceRef;
  if (directWorkspace) {
    return normalizeProjectPath(directWorkspace);
  }
  const workspaceWarning = result.warnings.find((warning) =>
    warning.startsWith("No local session cwd matched")
  );
  const observedWorkspace = workspaceWarning?.match(/Latest observed workspace: (.+)\.$/)?.[1];
  return observedWorkspace ? normalizeProjectPath(observedWorkspace) : null;
}

function getManagedProjectId(path: string) {
  return `project:${normalizeProjectPath(path)}`;
}

function createManagedProject(path: string, now = new Date().toISOString()): ManagedProject {
  const normalized = normalizeProjectPath(path);
  return {
    id: getManagedProjectId(normalized),
    name: getProjectDisplayName(normalized),
    path: normalized,
    boundAt: now,
    lastFocusedAt: now,
    lastScanAt: null,
    skillsFound: null,
    filesSeen: null,
    skillsChanged: null,
    workflowApplied: false,
    monitoringEnabled: false,
    monitoringIntervalMs: 60000,
    lastMonitorAt: null,
    lastObservedWorkspaceRef: null,
    lastConnectionCheckAt: null
  };
}

function parseManagedProjects(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Partial<ManagedProject>[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((project) => typeof project.path === "string" && project.path.trim().length > 0)
      .map((project) => ({
        ...createManagedProject(project.path ?? ""),
        ...project,
        path: normalizeProjectPath(project.path ?? ""),
        monitoringEnabled: Boolean(project.monitoringEnabled),
        monitoringIntervalMs:
          project.monitoringIntervalMs === 30000 ||
          project.monitoringIntervalMs === 60000 ||
          project.monitoringIntervalMs === 120000
            ? project.monitoringIntervalMs
            : 60000,
        lastMonitorAt: typeof project.lastMonitorAt === "string" ? project.lastMonitorAt : null,
        lastObservedWorkspaceRef:
          typeof project.lastObservedWorkspaceRef === "string"
            ? normalizeProjectPath(project.lastObservedWorkspaceRef)
            : null,
        lastConnectionCheckAt:
          typeof project.lastConnectionCheckAt === "string" ? project.lastConnectionCheckAt : null
      }))
      .filter((project) => project.path.length > 0);
  } catch {
    return [];
  }
}

function loadManagedProjects() {
  if (typeof window === "undefined") {
    return [];
  }
  return parseManagedProjects(window.localStorage.getItem(managedProjectsStorageKey));
}

function parseProjectHeartbeatEntries(value: string | null): ProjectHeartbeatEntry[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as Partial<ProjectHeartbeatEntry>[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry) => typeof entry.projectPath === "string" && typeof entry.observedAt === "string")
      .map((entry) => ({
        id: entry.id ?? `${entry.projectPath}:${entry.observedAt}`,
        projectPath: normalizeProjectPath(entry.projectPath ?? ""),
        observedAt: entry.observedAt ?? new Date().toISOString(),
        tone:
          entry.tone === "success" ||
          entry.tone === "warning" ||
          entry.tone === "error" ||
          entry.tone === "info"
            ? entry.tone
            : "info",
        status: entry.status ?? "error",
        importedRuns: Number(entry.importedRuns ?? 0),
        updatedRuns: Number(entry.updatedRuns ?? 0),
        totalRuns: Number(entry.totalRuns ?? 0),
        sourceCount: Number(entry.sourceCount ?? 0),
        message: entry.message ?? ""
      }))
      .filter((entry) => entry.projectPath.length > 0)
      .sort((left, right) => left.observedAt.localeCompare(right.observedAt));
  } catch {
    return [];
  }
}

function loadProjectHeartbeats() {
  if (typeof window === "undefined") {
    return [];
  }
  return parseProjectHeartbeatEntries(window.localStorage.getItem(projectHeartbeatStorageKey));
}

function parseProjectOnboardingLogs(value: string | null): ProjectOnboardingLogEntry[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as Partial<ProjectOnboardingLogEntry>[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry) => typeof entry.projectPath === "string" && typeof entry.occurredAt === "string")
      .map((entry) => ({
        id: entry.id ?? `${entry.projectPath}:${entry.occurredAt}`,
        projectPath: normalizeProjectPath(entry.projectPath ?? ""),
        occurredAt: entry.occurredAt ?? new Date().toISOString(),
        stage: entry.stage ?? "scan",
        tone: entry.tone ?? "info",
        message: entry.message ?? ""
      }))
      .filter((entry) => entry.projectPath && entry.message)
      .slice(-maxProjectOnboardingLogEntries);
  } catch {
    return [];
  }
}

function loadProjectOnboardingLogs() {
  if (typeof window === "undefined") {
    return [];
  }
  return parseProjectOnboardingLogs(window.localStorage.getItem(projectOnboardingLogsStorageKey));
}

function heartbeatToneForRuntimeStatus(
  status: ProjectRuntimeEvidenceRefreshResult["status"]
): ProjectHeartbeatTone {
  if (status === "imported") {
    return "success";
  }
  if (status === "no_importable_runs") {
    return "warning";
  }
  if (status === "connected_no_skill_runs") {
    return "info";
  }
  if (status === "telemetry_disabled" || status === "unauthorized" || status === "no_ready_sources") {
    return "error";
  }
  return "info";
}

function upsertProjectHeartbeatEntry(
  entries: ProjectHeartbeatEntry[],
  entry: ProjectHeartbeatEntry
) {
  const normalizedPath = normalizeProjectPath(entry.projectPath);
  const nextEntries = [
    ...entries.filter((item) => item.id !== entry.id),
    {
      ...entry,
      projectPath: normalizedPath
    }
  ];
  const latestByProject = nextEntries
    .filter((item) => item.projectPath === normalizedPath)
    .sort((left, right) => left.observedAt.localeCompare(right.observedAt))
    .slice(-maxProjectHeartbeatEntries);
  return [
    ...nextEntries.filter((item) => item.projectPath !== normalizedPath),
    ...latestByProject
  ].sort((left, right) => left.observedAt.localeCompare(right.observedAt));
}

function upsertManagedProject(
  projects: ManagedProject[],
  path: string,
  updates: Partial<Omit<ManagedProject, "id" | "path" | "boundAt">> = {}
) {
  const normalized = normalizeProjectPath(path);
  if (!normalized) {
    return projects;
  }

  const now = new Date().toISOString();
  const existing = projects.find((project) => project.path === normalized);
  const nextProject: ManagedProject = {
    ...(existing ?? createManagedProject(normalized, now)),
    name: updates.name ?? existing?.name ?? getProjectDisplayName(normalized),
    lastFocusedAt: updates.lastFocusedAt ?? now,
    lastScanAt: updates.lastScanAt ?? existing?.lastScanAt ?? null,
    skillsFound: updates.skillsFound ?? existing?.skillsFound ?? null,
    filesSeen: updates.filesSeen ?? existing?.filesSeen ?? null,
    skillsChanged: updates.skillsChanged ?? existing?.skillsChanged ?? null,
    workflowApplied: updates.workflowApplied ?? existing?.workflowApplied ?? false,
    monitoringEnabled: updates.monitoringEnabled ?? existing?.monitoringEnabled ?? false,
    monitoringIntervalMs: updates.monitoringIntervalMs ?? existing?.monitoringIntervalMs ?? 60000,
    lastMonitorAt: updates.lastMonitorAt ?? existing?.lastMonitorAt ?? null,
    lastObservedWorkspaceRef:
      updates.lastObservedWorkspaceRef ?? existing?.lastObservedWorkspaceRef ?? null,
    lastConnectionCheckAt: updates.lastConnectionCheckAt ?? existing?.lastConnectionCheckAt ?? null
  };
  const withoutCurrent = projects.filter((project) => project.path !== normalized);

  return [nextProject, ...withoutCurrent].sort((left, right) => {
    const leftName = left.name.toLocaleLowerCase();
    const rightName = right.name.toLocaleLowerCase();
    if (leftName !== rightName) {
      return leftName.localeCompare(rightName);
    }
    return left.path.localeCompare(right.path);
  });
}

function buildChineseSkillReadingAid(skill: SkillSummary) {
  const key = skill.displayName.toLowerCase();
  const description = skill.description?.toLowerCase() ?? "";
  const text = `${key} ${description}`;

  const topic = (() => {
    if (text.includes("branch") || text.includes("release") || text.includes("tag")) return "分支、发版和合并流程";
    if (text.includes("code-review") || text.includes("review")) return "代码审查和风险检查";
    if (text.includes("code-generation") || text.includes("implement")) return "按计划进行代码实现";
    if (text.includes("codebase-onboarding") || text.includes("onboarding")) return "进入陌生代码库前的结构梳理";
    if (text.includes("dev-core")) return "日常开发任务的基础规则";
    if (text.includes("evolution") || text.includes("upgrade")) return "把重复经验沉淀为工作流改进";
    if (text.includes("frontend-react")) return "React 前端开发规则";
    if (text.includes("frontend-vue")) return "Vue 前端开发规则";
    if (text.includes("frontend-css")) return "CSS、布局和视觉样式规则";
    if (text.includes("frontend-js")) return "浏览器 JavaScript 开发规则";
    if (text.includes("frontend")) return "前端开发通用规则";
    if (text.includes("gsd") || text.includes("long-running")) return "长任务拆解和可恢复执行";
    if (text.includes("gstack") || text.includes("role")) return "产品、设计、工程、QA 等角色分工";
    if (text.includes("memory")) return "项目记忆的保存、更新和治理";
    if (text.includes("requirement") || text.includes("acceptance")) return "需求澄清、约束和验收标准";
    if (text.includes("scope") || text.includes("impact")) return "变更范围和影响面控制";
    if (text.includes("security")) return "安全敏感改动审查";
    if (text.includes("session-summary")) return "会话结束后的项目记忆沉淀";
    if (text.includes("skill-upgrade")) return "根据重复摩擦提出技能升级建议";
    if (text.includes("stack")) return "按当前项目技术栈约定实现";
    if (text.includes("superpowers")) return "把高阶工具能力安全路由到项目内";
    if (text.includes("tech-solution")) return "把已确认需求转成技术方案";
    if (text.includes("test") || text.includes("verification")) return "变更后的验证和测试报告";
    return "当前项目内可复用的工作流技能";
  })();

  const trigger = (() => {
    if (text.includes("use when")) return "当任务命中对应场景时启用，帮助 Codex 按固定流程工作";
    if (text.includes("after")) return "通常用于前置步骤完成之后，继续推进下一阶段";
    if (text.includes("before")) return "通常用于动手修改前，先锁定规则、范围或风险";
    return "用于让当前项目的 AI 工作流程更稳定、更可复用";
  })();

  return `中文辅助：这个技能主要用于${topic}。适用场景：${trigger}。`;
}

function formatSkillDescriptionForDisplay(
  skill: SkillSummary,
  mode: LanguageMode,
  chineseAssistEnabled: boolean
) {
  if (mode === "zh" && chineseAssistEnabled) {
    return buildChineseSkillReadingAid(skill);
  }

  return skill.description?.trim() ?? "";
}

function LocalizedCopy({
  mode,
  en,
  zh,
  className
}: {
  mode: LanguageMode;
  en: string;
  zh: string;
  className?: string;
}) {
  if (mode === "en") {
    return <span className={className}>{en}</span>;
  }
  return <span className={className}>{normalizeChineseCopy(zh)}</span>;
}

function InteractionFeedback({ notice }: { notice: InteractionNotice }) {
  const { tx } = useLanguage();

  return (
    <article
      className={`interaction-action-feedback tone-${notice.tone ?? "default"}`}
      aria-live="polite"
    >
      <div>
        <span>{tx("Area", "区域")}</span>
        <strong>{notice.area}</strong>
      </div>
      <div>
        <span>{tx("Action", "动作")}</span>
        <strong>{notice.action}</strong>
      </div>
      <div>
        <span>{tx("Result", "结果")}</span>
        <strong>{notice.result}</strong>
      </div>
      <div>
        <span>{tx("Next", "下一步")}</span>
        <strong>{notice.nextStep}</strong>
      </div>
    </article>
  );
}

function LanguageSwitcher({
  value,
  onChange
}: {
  value: LanguageMode;
  onChange: (nextMode: LanguageMode) => void;
}) {
  const options: Array<{ value: LanguageMode; label: string }> = [
    { value: "zh", label: "中" },
    { value: "en", label: "EN" }
  ];

  return (
    <div className="language-switcher" aria-label={value === "zh" ? "语言" : "Language"}>
      {options.map((option) => (
        <button
          type="button"
          className={value === option.value ? "active" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ProductModeSwitcher({
  value,
  onChange
}: {
  value: ProductMode;
  onChange: (nextMode: ProductMode) => void;
}) {
  const { mode } = useLanguage();
  const options: Array<{ value: ProductMode; label: string }> = [
    {
      value: "guided",
      label: formatLocalizedText(mode, "Guided", "引导")
    },
    {
      value: "builder",
      label: formatLocalizedText(mode, "Builder", "构建")
    }
  ];

  return (
    <div className="product-mode-switcher" aria-label="Product mode">
      <span className="product-mode-switcher-label">{formatLocalizedText(mode, "Mode", "模式")}</span>
      <div className="language-switcher product-mode-switcher-group">
        {options.map((option) => (
          <button
            type="button"
            className={value === option.value ? "active" : ""}
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function useLanguage() {
  return useContext(LanguageContext);
}

function T({ en, zh, className }: { en: string; zh?: string; className?: string }) {
  const { mode } = useLanguage();
  return <LocalizedCopy mode={mode} en={en} zh={zh ?? uiCopy[en] ?? en} className={className} />;
}

function FolderIcon() {
  return (
    <svg className="button-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M3.75 6.75h6.1l1.65 2h8.75v8.5a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2v-10.5Z" />
      <path d="M3.75 8.75h16.5" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg className="button-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M5 7V5h2" />
      <path d="M17 5h2v2" />
      <path d="M19 17v2h-2" />
      <path d="M7 19H5v-2" />
      <path d="M7 12h10" />
      <path d="M9 9h6" />
      <path d="M9 15h6" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg className="button-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M2.75 12s3.3-5.75 9.25-5.75S21.25 12 21.25 12s-3.3 5.75-9.25 5.75S2.75 12 2.75 12Z" />
      <path d="M12 9.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Z" />
    </svg>
  );
}

function AnalysisIcon() {
  return (
    <svg className="button-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M4.75 18.25V5.75" />
      <path d="M4.75 18.25h14.5" />
      <path d="M8.25 15.25v-4" />
      <path d="M12 15.25V7.75" />
      <path d="M15.75 15.25v-6" />
      <path d="M18.75 6.25v4h-4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="button-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M4.75 7.25h14.5" />
      <path d="M9.25 7.25v-2h5.5v2" />
      <path d="M7.25 7.25l.7 11a2 2 0 0 0 2 1.85h4.1a2 2 0 0 0 2-1.85l.7-11" />
      <path d="M10.25 10.75v5.75" />
      <path d="M13.75 10.75v5.75" />
    </svg>
  );
}

function RepairIcon() {
  return (
    <svg className="button-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M14.5 6.25a4.25 4.25 0 0 0-5.75 5.5L4.5 16l3.5 3.5 4.25-4.25a4.25 4.25 0 0 0 5.5-5.75l-2.6 2.6-3.25-3.25 2.6-2.6Z" />
    </svg>
  );
}

function BindProjectButton({
  busy,
  onClick
}: {
  busy: boolean;
  onClick: () => void;
}) {
  const { tx } = useLanguage();
  return (
    <button type="button" className="project-action-button" disabled={busy} onClick={onClick}>
      <FolderIcon />
      <span>{tx("Bind Project", "绑定项目")}</span>
    </button>
  );
}

function ScanProjectButton({
  busy,
  scanning,
  primary = false,
  onClick
}: {
  busy: boolean;
  scanning: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  const { tx } = useLanguage();
  return (
    <button
      type="button"
      className={`project-action-button${primary ? " primary" : ""}`}
      disabled={busy}
      onClick={onClick}
    >
      <ScanIcon />
      <span>{scanning ? tx("Scanning...", "扫描中...") : tx("Scan Project", "扫描项目")}</span>
    </button>
  );
}

function ChineseDescriptionSwitch({
  checked,
  disabled,
  onChange
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  const { tx } = useLanguage();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="switch-control"
      onClick={onChange}
      disabled={disabled}
    >
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      <span>{tx("Chinese descriptions", "中文说明")}</span>
      <strong>{checked ? tx("On", "已开") : tx("Off", "已关")}</strong>
    </button>
  );
}

const bundleStrategyOptions: Array<{
  value: SkillBundleImportStrategy;
  label: string;
  description: string;
}> = [
  {
    value: "preserve_existing",
    label: "Preserve Existing",
    description:
      "Keep the current local baseline untouched and store the incoming bundle as a parallel retained revision."
  },
  {
    value: "supersede_current",
    label: "Supersede Current",
    description:
      "Promote the incoming bundle to the current lineage head and mark the prior current bundle as superseded."
  }
];

async function loadBootstrapState() {
  return window.workbench.bootstrap();
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function formatDuration(value: number | null) {
  if (value == null) {
    return "n/a";
  }
  if (value < 1000) {
    return `${value} ms`;
  }
  if (value < 60_000) {
    return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)} s`;
  }
  return `${(value / 60_000).toFixed(1)} min`;
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatUsd(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 10 ? 2 : 4,
    maximumFractionDigits: value >= 10 ? 2 : 4
  }).format(value);
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 ** 2) {
    return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
  }
  if (value < 1024 ** 3) {
    return `${(value / 1024 ** 2).toFixed(value < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  }
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: value > 0 && value < 0.1 ? 1 : 0,
    maximumFractionDigits: value > 0 && value < 0.1 ? 1 : 0
  }).format(value);
}

function buildSparklinePoints(values: number[], width = 132, height = 34) {
  if (values.length === 0) {
    return `0,${height} ${width},${height}`;
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, max);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function formatWasteScore(value: number) {
  return value.toFixed(2);
}

function formatSkillRole(
  role: SkillSummary["governance"]["role"],
  mode: LanguageMode
) {
  return formatLocalizedText(
    mode,
    role === "memory"
      ? "Memory"
      : role === "infrastructure"
        ? "Infrastructure"
        : role === "development"
          ? "Development"
          : role === "analysis"
            ? "Analysis"
            : role === "packaging"
              ? "Packaging"
              : "Governance",
    role === "memory"
      ? "记忆"
      : role === "infrastructure"
        ? "基础设施"
        : role === "development"
          ? "开发"
          : role === "analysis"
            ? "分析"
            : role === "packaging"
              ? "打包"
              : "治理"
  );
}

function formatSkillDataClass(
  dataClass: SkillSummary["governance"]["dataClasses"][number],
  mode: LanguageMode
) {
  return formatLocalizedText(
    mode,
    dataClass === "account_identity"
      ? "Account"
      : dataClass === "server_path"
        ? "Server Path"
        : dataClass === "server_runtime"
          ? "Server Runtime"
          : dataClass === "development_context"
            ? "Dev Context"
            : dataClass === "workflow_state"
              ? "Workflow State"
              : "Local Knowledge",
    dataClass === "account_identity"
      ? "账号"
      : dataClass === "server_path"
        ? "服务器路径"
        : dataClass === "server_runtime"
          ? "服务器信息"
          : dataClass === "development_context"
            ? "开发上下文"
            : dataClass === "workflow_state"
              ? "工作流状态"
              : "本地知识"
  );
}

function formatSkillStoragePolicy(
  policy: SkillSummary["governance"]["storagePolicy"],
  mode: LanguageMode
) {
  return formatLocalizedText(
    mode,
    policy === "session_only"
      ? "Session Only"
      : policy === "local_persisted"
        ? "Local Persisted"
        : "Local Sensitive",
    policy === "session_only"
      ? "仅会话"
      : policy === "local_persisted"
        ? "本地持久化"
        : "本地敏感存储"
  );
}

function formatSkillReusePolicy(
  policy: SkillSummary["governance"]["reusePolicy"],
  mode: LanguageMode
) {
  return formatLocalizedText(
    mode,
    policy === "safe_to_bundle"
      ? "Safe To Bundle"
      : policy === "review_before_bundle"
        ? "Review Before Bundle"
        : "Local Only",
    policy === "safe_to_bundle"
      ? "可安全打包"
      : policy === "review_before_bundle"
        ? "打包前审查"
        : "仅限本地"
  );
}

function formatSkillRecommendedScope(
  scope: SkillSummary["governance"]["recommendedScope"],
  mode: LanguageMode
) {
  return formatLocalizedText(
    mode,
    scope === "system"
      ? "System"
      : scope === "workspace"
        ? "Workspace"
        : scope === "project"
          ? "Project"
          : "Folder",
    scope === "system"
      ? "系统"
      : scope === "workspace"
        ? "工作区"
        : scope === "project"
          ? "项目"
          : "文件夹"
  );
}

function formatSkillGovernanceSignal(
  governance: SkillSummary["governance"],
  mode: LanguageMode
) {
  if (governance.containsSensitiveOperationalData) {
    return formatLocalizedText(mode, "Sensitive Local Data", "敏感本地数据");
  }
  if (governance.storesLongLivedContext) {
    return formatLocalizedText(mode, "Persistent Context", "持久化上下文");
  }
  return formatLocalizedText(mode, "Reusable Asset", "可复用资产");
}

function formatSkillGovernanceDataSummary(
  governance: SkillSummary["governance"],
  mode: LanguageMode
) {
  const labels = governance.dataClasses.map((dataClass) => formatSkillDataClass(dataClass, mode));
  if (labels.length <= 2) {
    return labels.join(" · ");
  }

  const extraCount = labels.length - 2;
  return `${labels.slice(0, 2).join(" · ")} ${formatLocalizedText(
    mode,
    `+${extraCount} more`,
    `另 +${extraCount} 项`
  )}`;
}

function formatSkillGovernanceBoundary(
  governance: SkillSummary["governance"],
  mode: LanguageMode
) {
  if (governance.containsSensitiveOperationalData) {
    return formatLocalizedText(
      mode,
      "Stores operational data locally",
      "会在本地存储运维数据"
    );
  }
  if (governance.storesLongLivedContext) {
    return formatLocalizedText(
      mode,
      "Keeps long-lived local context",
      "会保留长期本地上下文"
    );
  }
  return formatLocalizedText(
    mode,
    "Mainly works as a reusable execution asset",
    "主要作为可复用执行资产"
  );
}

function formatSkillPreferredHarness(
  harness: SkillSummary["governance"]["preferredHarness"],
  mode: LanguageMode
) {
  return formatLocalizedText(
    mode,
    harness === "superpowers" ? "Superpowers" : "Generic",
    harness === "superpowers" ? "Superpowers" : "通用"
  );
}

function formatSkillStructureType(
  structureType: SkillSummary["governance"]["structureType"],
  mode: LanguageMode
) {
  return formatLocalizedText(
    mode,
    structureType === "composite_framework" ? "Composite Framework" : "Single Skill",
    structureType === "composite_framework" ? "组合框架" : "单一 Skill"
  );
}

function formatSkillFrameworkLabel(
  frameworkLabel: SkillSummary["governance"]["frameworkLabel"],
  mode: LanguageMode
) {
  if (!frameworkLabel) {
    return null;
  }

  if (frameworkLabel === "Workflow Skills") {
    return formatLocalizedText(mode, "Workflow Skills", "工作流框架");
  }

  if (frameworkLabel === "Composite Skill Framework") {
    return formatLocalizedText(
      mode,
      "Composite Skill Framework",
      "组合 Skill 框架"
    );
  }

  return frameworkLabel;
}

function formatSkillOrchestrationSignal(
  signal: SkillSummary["governance"]["orchestrationSignals"][number],
  mode: LanguageMode
) {
  return formatLocalizedText(
    mode,
    signal === "router_layer"
      ? "Router"
      : signal === "spec_artifacts"
        ? "Spec"
        : signal === "memory_governance"
          ? "Memory"
          : signal === "review_gate"
            ? "Review"
            : signal === "test_gate"
              ? "Test"
              : signal === "release_flow"
                ? "Release"
                : signal === "long_task_orchestration"
                  ? "Long Task"
                  : "Composition",
    signal === "router_layer"
      ? "路由"
      : signal === "spec_artifacts"
        ? "规格"
        : signal === "memory_governance"
          ? "记忆"
          : signal === "review_gate"
            ? "审查"
            : signal === "test_gate"
              ? "测试"
              : signal === "release_flow"
                ? "发布"
                : signal === "long_task_orchestration"
                  ? "长任务"
                  : "组合"
  );
}

function formatSkillOrchestrationSummary(
  governance: SkillSummary["governance"],
  mode: LanguageMode
) {
  const labels = governance.orchestrationSignals.map((signal) =>
    formatSkillOrchestrationSignal(signal, mode)
  );

  if (labels.length === 0) {
    return governance.structureType === "composite_framework"
      ? formatLocalizedText(
          mode,
          "Multi-step local workflow orchestration",
          "多步骤本地工作流编排"
        )
      : formatLocalizedText(mode, "Direct execution path", "直接执行路径");
  }

  if (labels.length <= 4) {
    return labels.join(" + ");
  }

  return `${labels.slice(0, 3).join(" + ")} ${formatLocalizedText(
    mode,
    `+${labels.length - 3}`,
    `另 +${labels.length - 3}`
  )}`;
}

function formatSkillModuleCount(
  moduleCountHint: SkillSummary["governance"]["moduleCountHint"],
  mode: LanguageMode
) {
  if (moduleCountHint === null) {
    return null;
  }

  return formatLocalizedText(
    mode,
    `${moduleCountHint} modules`,
    `${moduleCountHint} 个模块`
  );
}

function getSkillGovernanceTone(role: SkillSummary["governance"]["role"]) {
  switch (role) {
    case "memory":
      return "memory";
    case "infrastructure":
      return "infrastructure";
    case "development":
      return "development";
    case "analysis":
      return "analysis";
    case "packaging":
      return "packaging";
    default:
      return "governance";
  }
}

function formatReadableEnum(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatProposalStatus(status: OptimizationProposalStatus, mode: LanguageMode) {
  switch (status) {
    case "accepted":
      return formatLocalizedText(mode, "Accepted", "已接受");
    case "dismissed":
      return formatLocalizedText(mode, "Dismissed", "已忽略");
    case "resolved":
      return formatLocalizedText(mode, "Resolved", "已解决");
    default:
      return formatLocalizedText(mode, "Open", "待处理");
  }
}

function formatProposalEvidenceType(
  type: OptimizationProposal["evidence"][number]["evidenceType"],
  mode: LanguageMode
) {
  switch (type) {
    case "daily_metric":
      return formatLocalizedText(mode, "Daily Signal", "每日信号");
    case "weekly_metric":
      return formatLocalizedText(mode, "Weekly Signal", "每周信号");
    case "static_skill":
      return formatLocalizedText(mode, "Static Signal", "静态信号");
    default:
      return formatReadableEnum(type);
  }
}

function formatProposalActionType(
  type: OptimizationProposal["actions"][number]["actionType"],
  mode: LanguageMode
) {
  switch (type) {
    case "created":
      return formatLocalizedText(mode, "Created", "已创建");
    case "accepted":
      return formatLocalizedText(mode, "Accepted", "已接受");
    case "dismissed":
      return formatLocalizedText(mode, "Dismissed", "已忽略");
    case "reopened":
      return formatLocalizedText(mode, "Reopened", "已重新打开");
    case "resolved":
      return formatLocalizedText(mode, "Resolved", "已解决");
    case "auto_resolved":
      return formatLocalizedText(mode, "Auto Resolved", "自动解决");
    default:
      return formatReadableEnum(type);
  }
}

function formatProposalActorType(
  actor: OptimizationProposal["actions"][number]["actorType"],
  mode: LanguageMode
) {
  return actor === "system"
    ? formatLocalizedText(mode, "System", "系统")
    : formatLocalizedText(mode, "User", "用户");
}

function formatProposalType(type: string, mode: LanguageMode) {
  switch (type) {
    case "workflow":
      return formatLocalizedText(mode, "Workflow", "工作流");
    case "token_reduction":
      return formatLocalizedText(mode, "Token Reduction", "Token 降本");
    case "latency":
      return formatLocalizedText(mode, "Latency", "延迟优化");
    case "overlong_skill":
      return formatLocalizedText(mode, "Overlong Skill", "超长 Skill");
    case "high_latency":
      return formatLocalizedText(mode, "High Latency", "高延迟");
    case "high_failure_rate":
      return formatLocalizedText(mode, "High Failure Rate", "高失败率");
    case "high_token_cost":
      return formatLocalizedText(mode, "High Token Cost", "高 Token 成本");
    default:
      return formatReadableEnum(type);
  }
}

function formatProposalTitle(proposal: OptimizationProposal, mode: LanguageMode) {
  if (mode !== "zh") {
    return proposal.title;
  }
  if (proposal.proposalType === "high_latency") {
    return `降低 ${proposal.skillName} 的执行延迟`;
  }
  if (proposal.proposalType === "high_token_cost") {
    return `降低 ${proposal.skillName} 的 Token 成本`;
  }
  if (proposal.proposalType === "token_reduction") {
    return `精简 ${proposal.skillName} 的上下文与 Token 使用`;
  }
  if (proposal.proposalType === "latency") {
    return `优化 ${proposal.skillName} 的响应速度`;
  }
  if (proposal.proposalType === "workflow") {
    return `完善 ${proposal.skillName} 的工作流程`;
  }
  if (proposal.proposalType === "overlong_skill") {
    return `拆分 ${proposal.skillName} 的过长说明`;
  }
  if (proposal.proposalType === "high_failure_rate") {
    return `降低 ${proposal.skillName} 的失败率`;
  }
  return `${proposal.skillName} 优化建议`;
}

function formatProposalSummary(proposal: OptimizationProposal, mode: LanguageMode) {
  if (mode !== "zh") {
    return proposal.summary;
  }
  if (proposal.proposalType === "high_latency") {
    return "当前运行证据显示该技能响应偏慢，建议检查启动步骤、重复读取和等待链路。";
  }
  if (proposal.proposalType === "high_token_cost") {
    return "当前运行证据显示该技能 Token 消耗偏高，建议压缩重复上下文并保留高价值步骤。";
  }
  if (proposal.proposalType === "token_reduction") {
    return "当前证据显示首轮上下文读取偏多，建议把稳定规则拆到按需加载的引用中。";
  }
  if (proposal.proposalType === "latency") {
    return "重复操作正在产生可避免的等待，建议复用已加载结果并减少重复计算。";
  }
  if (proposal.proposalType === "workflow") {
    return "当前工作流仍有可简化或补强的环节，建议按实际运行证据调整步骤。";
  }
  if (proposal.proposalType === "overlong_skill") {
    return "技能说明过长会增加首轮读取负担，建议保留核心入口并拆分详细参考。";
  }
  if (proposal.proposalType === "high_failure_rate") {
    return "当前运行证据显示失败率偏高，建议检查前置条件、工具依赖与异常处理。";
  }
  return "根据当前项目的本地技能、运行和评测证据生成此优化建议。";
}

function formatProposalBenefit(proposal: OptimizationProposal, mode: LanguageMode) {
  if (mode !== "zh") {
    return proposal.estimatedBenefit;
  }
  return proposal.proposalType === "high_latency"
    ? "更快获得首个有效结果，减少重复使用时的等待。"
    : proposal.proposalType === "high_token_cost"
      ? "在保留核心能力的同时降低持续运行成本。"
      : proposal.proposalType === "token_reduction"
        ? "减少首轮上下文与 Token 消耗，同时保留准确的按需检索路径。"
        : proposal.proposalType === "latency"
          ? "降低重复探索时的等待，让下探和切换更顺畅。"
          : proposal.proposalType === "workflow"
            ? "让执行路径更清楚、更稳定，也更容易评测和追踪。"
            : proposal.proposalType === "overlong_skill"
              ? "缩短首轮读取时间，并让维护和复用更简单。"
              : proposal.proposalType === "high_failure_rate"
                ? "提升运行成功率，减少重复尝试和人工排查。"
                : "改善该技能在当前项目中的可用性、效率与可维护性。";
}

function formatProposalEvidenceSummary(
  evidence: OptimizationProposal["evidence"][number],
  mode: LanguageMode
) {
  if (mode !== "zh") {
    return evidence.summary;
  }
  if (evidence.evidenceType === "weekly_metric") {
    return "周运行指标显示该技能存在持续性的优化空间。";
  }
  if (evidence.evidenceType === "daily_metric") {
    return "最近一天的运行指标触发了此优化建议。";
  }
  return "本地技能结构检查发现了需要关注的信号。";
}

function formatProposalActionSummary(
  action: OptimizationProposal["actions"][number],
  mode: LanguageMode
) {
  if (mode !== "zh") {
    return action.summary;
  }
  if (action.actionType === "created") {
    return "系统已根据本地技能与运行证据生成此建议。";
  }
  if (action.actionType === "accepted") {
    return "用户已接受此优化建议。";
  }
  if (action.actionType === "resolved") {
    return "系统已记录该建议的处理结果。";
  }
  return "用户已关闭此建议，记录仍保留在审计时间线中。";
}

function formatSeverity(severity: OptimizationProposalSeverity, mode: LanguageMode) {
  switch (severity) {
    case "high":
      return formatLocalizedText(mode, "High", "高");
    case "medium":
      return formatLocalizedText(mode, "Medium", "中");
    default:
      return formatLocalizedText(mode, "Low", "低");
  }
}

function formatProposalFilterStatus(status: OptimizationProposalStatus | "all", mode: LanguageMode) {
  return status === "all"
    ? formatLocalizedText(mode, "all proposals", "全部建议")
    : formatProposalStatus(status, mode);
}

function formatApplyScope(scope: SkillApplyScope, mode: LanguageMode) {
  switch (scope) {
    case "system":
      return formatLocalizedText(mode, "System Scope", "系统范围");
    case "workspace":
      return formatLocalizedText(mode, "Workspace Scope", "工作区范围");
    case "folder":
      return formatLocalizedText(mode, "Folder Scope", "文件夹范围");
    default:
      return formatLocalizedText(mode, "Project Scope", "项目范围");
  }
}

function formatRemoteRiskLevel(level: RemoteSkillRiskLevel, mode: LanguageMode) {
  switch (level) {
    case "blocked":
      return formatLocalizedText(mode, "Blocked", "已阻断");
    case "high":
      return formatLocalizedText(mode, "High Risk", "高风险");
    case "medium":
      return formatLocalizedText(mode, "Review", "需审查");
    default:
      return formatLocalizedText(mode, "Low Risk", "低风险");
  }
}

function formatRemoteVerificationStatus(status: RemoteSkillVerificationStatus, mode: LanguageMode) {
  switch (status) {
    case "verified":
      return formatLocalizedText(mode, "Verified", "已验证");
    case "review_required":
      return formatLocalizedText(mode, "Review Required", "需要复核");
    default:
      return formatLocalizedText(mode, "Unverified", "未验证");
  }
}

function formatRemoteCheckStatus(status: RemoteSkillCheckStatus, mode: LanguageMode) {
  switch (status) {
    case "pass":
      return formatLocalizedText(mode, "Pass", "通过");
    case "warn":
      return formatLocalizedText(mode, "Warning", "警告");
    default:
      return formatLocalizedText(mode, "Blocked", "已阻断");
  }
}

function formatDiffPreviewStatus(
  status: RemoteSkillCandidateDetail["diffPreview"]["status"] | null | undefined,
  mode: LanguageMode
) {
  if (status === "preview_required") {
    return formatLocalizedText(mode, "Required", "必需");
  }
  if (status === "not_available") {
    return formatLocalizedText(mode, "Not Available", "不可用");
  }
  return formatLocalizedText(mode, "Pending", "待处理");
}

function formatValidationSeverity(severity: BundleValidationSeverity) {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function getBackupValidationSeverity(
  validation: LocalBackupValidationResult
): LocalBackupValidationSeverity {
  if (validation.issues.some((issue) => issue.severity === "error")) {
    return "error";
  }
  if (validation.issues.some((issue) => issue.severity === "warning")) {
    return "warning";
  }
  return "info";
}

function getBackupValidationHeadline(validation: LocalBackupValidationResult) {
  const severity = getBackupValidationSeverity(validation);
  if (severity === "error") {
    return "Backup preview found blocking integrity issues";
  }
  if (severity === "warning") {
    return "Backup preview passed with review warnings";
  }
  return "Backup preview passed integrity checks";
}

function getBackupValidationSummary(validation: LocalBackupValidationResult) {
  if (!validation.manifest) {
    return "The selected file does not yet qualify as a valid recovery snapshot manifest.";
  }
  if (!validation.canRestore) {
    return "One or more required backup areas are missing or no longer match the stored manifest counts.";
  }
  if (validation.issues.some((issue) => issue.severity === "warning")) {
    return "The snapshot structure is intact, but some machine-specific context differs from the current local environment.";
  }
  return "The selected snapshot still matches its manifest and is ready for a future manual restore workflow.";
}

function getRestoreImpactSeverity(
  impact: LocalBackupRestoreImpactResult
): LocalBackupValidationSeverity {
  if (!impact.readyForManualRestore || !impact.validation.canRestore) {
    return "error";
  }
  if (impact.totalChangedFileCount > 0 || impact.totalRemovedFileCount > 0) {
    return "warning";
  }
  return "info";
}

function getRestoreImpactHeadline(impact: LocalBackupRestoreImpactResult) {
  const severity = getRestoreImpactSeverity(impact);
  if (severity === "error") {
    return "Restore impact preview is blocked by backup integrity issues";
  }
  if (severity === "warning") {
    return "A manual restore would overwrite or remove current local files";
  }
  return "Restore impact preview found a low-risk file replacement path";
}

function getRestoreImpactSummary(impact: LocalBackupRestoreImpactResult) {
  if (!impact.readyForManualRestore || !impact.validation.canRestore) {
    return "Fix the blocking backup manifest issues first. This replace-area preview only runs on a restorable snapshot.";
  }
  if (impact.totalRemovedFileCount > 0) {
    return "Some files exist only in current app-local storage and would be removed if this snapshot were restored by replacing each storage area.";
  }
  if (impact.totalChangedFileCount > 0) {
    return "This snapshot would overwrite one or more current local files with backed-up versions during a future confirmed restore.";
  }
  if (impact.totalAddedFileCount > 0) {
    return "This snapshot would add missing files into current app-local storage without removing current-only files.";
  }
  return "Current app-local storage already matches this snapshot at the file level.";
}

function formatBundleSafetyClassification(classification: SkillBundleSafetyClassification) {
  switch (classification) {
    case "no_change":
      return "No Change";
    case "safe_update":
      return "Safe Update";
    case "drift":
      return "Drift";
    case "conflict":
      return "Conflict";
    default:
      return classification;
  }
}

function formatBundleImportStrategy(strategy: SkillBundleImportStrategy) {
  return bundleStrategyOptions.find((option) => option.value === strategy)?.label ?? strategy;
}

function formatBundleLifecycleState(state: SkillBundleLifecycleState) {
  switch (state) {
    case "current":
      return "Current";
    case "retained":
      return "Retained";
    case "superseded":
      return "Superseded";
    default:
      return state;
  }
}

function formatBundleIngestStrategy(strategy: SkillBundleSummary["ingestStrategy"]) {
  switch (strategy) {
    case "export_snapshot":
      return "Export Snapshot";
    case "preserve_existing":
      return "Preserve Existing";
    case "supersede_current":
      return "Supersede Current";
    default:
      return strategy;
  }
}

function formatDiffState(state: SkillBundleDiffState) {
  switch (state) {
    case "same":
      return "Same";
    case "changed":
      return "Changed";
    default:
      return "Unknown";
  }
}

function formatBundleSafetyClassificationText(
  classification: SkillBundleSafetyClassification,
  mode: LanguageMode
) {
  switch (classification) {
    case "no_change":
      return formatLocalizedText(mode, "No Change", "无变化");
    case "safe_update":
      return formatLocalizedText(mode, "Safe Update", "安全更新");
    case "drift":
      return formatLocalizedText(mode, "Drift", "漂移");
    case "conflict":
      return formatLocalizedText(mode, "Conflict", "冲突");
    default:
      return classification;
  }
}

function formatBundleImportStrategyText(strategy: SkillBundleImportStrategy, mode: LanguageMode) {
  switch (strategy) {
    case "preserve_existing":
      return formatLocalizedText(mode, "Preserve Existing", "保留现有");
    case "supersede_current":
      return formatLocalizedText(mode, "Supersede Current", "替代当前");
    default:
      return strategy;
  }
}

function formatBundleIngestStrategyText(
  strategy: SkillBundleSummary["ingestStrategy"],
  mode: LanguageMode
) {
  switch (strategy) {
    case "export_snapshot":
      return formatLocalizedText(mode, "Export Snapshot", "导出快照");
    case "preserve_existing":
      return formatLocalizedText(mode, "Preserve Existing", "保留现有");
    case "supersede_current":
      return formatLocalizedText(mode, "Supersede Current", "替代当前");
    default:
      return strategy;
  }
}

function formatSignedCount(value: number) {
  if (value > 0) {
    return `+${value}`;
  }
  return `${value}`;
}

function formatGraphLabel(value: string) {
  return value.split("_").join(" ");
}

const graphNodeTypePriority = [
  "root",
  "skill",
  "version",
  "model",
  "proposal",
  "bundle",
  "bundle_lineage"
];

const defaultGraphNodeTone = {
  fill: "rgba(76, 141, 255, 0.16)",
  stroke: "rgba(76, 141, 255, 0.58)",
  accent: "#4C8DFF"
};

const graphNodeTypeTones: Record<string, typeof defaultGraphNodeTone> = {
  root: {
    fill: "rgba(6, 182, 212, 0.14)",
    stroke: "rgba(6, 182, 212, 0.58)",
    accent: "#06B6D4"
  },
  skill: {
    fill: "rgba(76, 141, 255, 0.18)",
    stroke: "rgba(76, 141, 255, 0.68)",
    accent: "#4C8DFF"
  },
  version: {
    fill: "rgba(148, 163, 184, 0.14)",
    stroke: "rgba(148, 163, 184, 0.5)",
    accent: "#94A3B8"
  },
  model: {
    fill: "rgba(34, 197, 94, 0.15)",
    stroke: "rgba(34, 197, 94, 0.58)",
    accent: "#22C55E"
  },
  proposal: {
    fill: "rgba(239, 68, 68, 0.15)",
    stroke: "rgba(239, 68, 68, 0.6)",
    accent: "#EF4444"
  },
  bundle: {
    fill: "rgba(236, 72, 153, 0.16)",
    stroke: "rgba(236, 72, 153, 0.62)",
    accent: "#EC4899"
  },
  bundle_lineage: {
    fill: "rgba(139, 92, 246, 0.16)",
    stroke: "rgba(139, 92, 246, 0.6)",
    accent: "#8B5CF6"
  }
};

const graphEdgeTypeTones: Record<string, string> = {
  contains: "rgba(6, 182, 212, 0.52)",
  has_version: "rgba(148, 163, 184, 0.46)",
  uses_model: "rgba(34, 197, 94, 0.5)",
  optimized_by: "rgba(239, 68, 68, 0.5)",
  packaged_as: "rgba(236, 72, 153, 0.5)",
  belongs_to_lineage: "rgba(139, 92, 246, 0.52)",
  supersedes: "rgba(245, 158, 11, 0.5)"
};

interface GraphTopologyLane {
  nodeType: string;
  label: string;
  count: number;
  x: number;
}

interface GraphTopologyNodeLayout {
  node: GraphNodeSummary;
  x: number;
  y: number;
  width: number;
  height: number;
  laneIndex: number;
  tone: {
    fill: string;
    stroke: string;
    accent: string;
  };
}

interface GraphTopologyEdgeLayout {
  edge: GraphEdgeSummary;
  path: string;
  color: string;
}

interface GraphTopologyScene {
  width: number;
  height: number;
  lanes: GraphTopologyLane[];
  nodes: GraphTopologyNodeLayout[];
  edges: GraphTopologyEdgeLayout[];
  hiddenEdgeCount: number;
}

interface GraphSelectionContext {
  node: GraphNodeSummary | null;
  connectedEdges: GraphEdgeSummary[];
  relatedNodes: GraphNodeSummary[];
}

interface GraphSelectionGraph {
  nodes: GraphNodeSummary[];
  edges: GraphEdgeSummary[];
}

function truncateGraphLabel(value: string, maxLength = 22) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function getGraphNodeTone(nodeType: string) {
  return graphNodeTypeTones[nodeType] ?? defaultGraphNodeTone;
}

function getGraphEdgeTone(edgeType: string) {
  return graphEdgeTypeTones[edgeType] ?? "#6b7d78";
}

function getSnapshotGraph(snapshot: GraphSnapshot | null): GraphSelectionGraph | null {
  if (!snapshot) {
    return null;
  }

  return {
    nodes: snapshot.nodes,
    edges: snapshot.edges
  };
}

function buildGraphTopologyScene(graph: GraphSelectionGraph | null): GraphTopologyScene | null {
  if (!graph || graph.nodes.length === 0) {
    return null;
  }

  const grouped = new Map<string, GraphNodeSummary[]>();
  for (const node of graph.nodes) {
    const existing = grouped.get(node.nodeType) ?? [];
    existing.push(node);
    grouped.set(node.nodeType, existing);
  }

  const sortedNodeTypes = [...grouped.keys()].sort((left, right) => {
    const leftIndex = graphNodeTypePriority.indexOf(left);
    const rightIndex = graphNodeTypePriority.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });

  const nodeWidth = 142;
  const nodeHeight = 50;
  const laneGap = 34;
  const rowGap = 16;
  const leftPad = 34;
  const rightPad = 34;
  const topPad = 58;
  const bottomPad = 28;

  const lanes = sortedNodeTypes.map((nodeType, index) => ({
    nodeType,
    label: formatGraphLabel(nodeType),
    count: grouped.get(nodeType)?.length ?? 0,
    x: leftPad + index * (nodeWidth + laneGap)
  }));

  const positionedNodes: GraphTopologyNodeLayout[] = [];
  for (const lane of lanes) {
    const laneIndex = lanes.findIndex((entry) => entry.nodeType === lane.nodeType);
    const laneNodes = [...(grouped.get(lane.nodeType) ?? [])].sort((left, right) => {
      if (right.degree !== left.degree) {
        return right.degree - left.degree;
      }
      return left.displayName.localeCompare(right.displayName);
    });

    laneNodes.forEach((node, index) => {
      positionedNodes.push({
        node,
        x: lane.x,
        y: topPad + index * (nodeHeight + rowGap),
        width: nodeWidth,
        height: nodeHeight,
        laneIndex,
        tone: getGraphNodeTone(node.nodeType)
      });
    });
  }

  const nodeById = new Map(positionedNodes.map((entry) => [entry.node.id, entry] as const));
  const visibleEdges: GraphTopologyEdgeLayout[] = [];
  let hiddenEdgeCount = 0;

  for (const edge of graph.edges) {
    const fromNode = nodeById.get(edge.fromNodeId);
    const toNode = nodeById.get(edge.toNodeId);
    if (!fromNode || !toNode) {
      hiddenEdgeCount += 1;
      continue;
    }

    const sameLane = fromNode.laneIndex === toNode.laneIndex;
    let path = "";

    if (sameLane) {
      const startX = fromNode.x + fromNode.width;
      const startY = fromNode.y + fromNode.height / 2;
      const endX = toNode.x + toNode.width;
      const endY = toNode.y + toNode.height / 2;
      path = `M ${startX} ${startY} C ${startX + 56} ${startY}, ${endX + 56} ${endY}, ${endX} ${endY}`;
    } else if (fromNode.laneIndex < toNode.laneIndex) {
      const startX = fromNode.x + fromNode.width;
      const startY = fromNode.y + fromNode.height / 2;
      const endX = toNode.x;
      const endY = toNode.y + toNode.height / 2;
      const curve = Math.max(42, (endX - startX) * 0.45);
      path = `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`;
    } else {
      const startX = fromNode.x;
      const startY = fromNode.y + fromNode.height / 2;
      const endX = toNode.x + toNode.width;
      const endY = toNode.y + toNode.height / 2;
      const curve = Math.max(56, (startX - endX) * 0.45);
      path = `M ${startX} ${startY} C ${startX - curve} ${startY}, ${endX + curve} ${endY}, ${endX} ${endY}`;
    }

    visibleEdges.push({
      edge,
      path,
      color: getGraphEdgeTone(edge.edgeType)
    });
  }

  const maxLaneSize = Math.max(...lanes.map((lane) => lane.count), 1);
  const width = leftPad + rightPad + lanes.length * nodeWidth + Math.max(0, lanes.length - 1) * laneGap;
  const height =
    topPad + bottomPad + maxLaneSize * nodeHeight + Math.max(0, maxLaneSize - 1) * rowGap;

  return {
    width,
    height,
    lanes,
    nodes: positionedNodes,
    edges: visibleEdges,
    hiddenEdgeCount
  };
}

function matchesPathScope(sourcePath: string, scopePath: string) {
  return (
    sourcePath === scopePath ||
    sourcePath.startsWith(`${scopePath}/`) ||
    sourcePath.startsWith(`${scopePath}\\`)
  );
}

function mergeGraphSelectionGraph(
  graph: GraphSelectionGraph | null,
  graphGeneratedAt: string | null,
  neighborhood: GraphNeighborhood | null,
  selectedNodeId: string | null
): GraphSelectionGraph | null {
  if (
    !graph ||
    !neighborhood ||
    neighborhood.centerNodeId !== selectedNodeId ||
    neighborhood.generatedAt !== graphGeneratedAt
  ) {
    return graph;
  }

  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node] as const));
  for (const node of neighborhood.nodes) {
    nodeMap.set(node.id, node);
  }

  const edgeMap = new Map(graph.edges.map((edge) => [edge.id, edge] as const));
  for (const edge of neighborhood.edges) {
    edgeMap.set(edge.id, edge);
  }

  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()]
  };
}

function getGraphNeighborhoodCacheKey(nodeId: string, generatedAt: string | null) {
  return `${generatedAt ?? "no-snapshot"}::${nodeId}`;
}

function mergeGraphVisibleGraph(
  graph: GraphSelectionGraph | null,
  graphGeneratedAt: string | null,
  neighborhood: GraphNeighborhood | null
): GraphSelectionGraph | null {
  if (!graph) {
    return null;
  }

  if (!neighborhood || neighborhood.generatedAt !== graphGeneratedAt) {
    return graph;
  }

  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node] as const));
  for (const node of neighborhood.nodes) {
    nodeMap.set(node.id, node);
  }

  const edgeMap = new Map(graph.edges.map((edge) => [edge.id, edge] as const));
  for (const edge of neighborhood.edges) {
    edgeMap.set(edge.id, edge);
  }

  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()]
  };
}

function mergeGraphTracePathGraph(
  graph: GraphSelectionGraph | null,
  tracePath: GraphTracePath | null
): GraphSelectionGraph | null {
  if (!graph) {
    return null;
  }

  if (!tracePath) {
    return graph;
  }

  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node] as const));
  for (const node of tracePath.nodes) {
    nodeMap.set(node.id, node);
  }

  const edgeMap = new Map(graph.edges.map((edge) => [edge.id, edge] as const));
  for (const edge of tracePath.edges) {
    edgeMap.set(edge.id, edge);
  }

  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()]
  };
}

function getGraphSelectionContext(
  graph: GraphSelectionGraph | null,
  selectedNodeId: string | null
): GraphSelectionContext {
  if (!graph || !selectedNodeId) {
    return {
      node: null,
      connectedEdges: [],
      relatedNodes: []
    };
  }

  const node = graph.nodes.find((entry) => entry.id === selectedNodeId) ?? null;
  if (!node) {
    return {
      node: null,
      connectedEdges: [],
      relatedNodes: []
    };
  }

  const connectedEdges = graph.edges.filter(
    (entry) => entry.fromNodeId === selectedNodeId || entry.toNodeId === selectedNodeId
  );
  const nodeMap = new Map(graph.nodes.map((entry) => [entry.id, entry] as const));
  const seen = new Set<string>();
  const relatedNodes: GraphNodeSummary[] = [];

  for (const edge of connectedEdges) {
    for (const nodeId of [edge.fromNodeId, edge.toNodeId]) {
      if (nodeId === selectedNodeId || seen.has(nodeId)) {
        continue;
      }

      const relatedNode = nodeMap.get(nodeId);
      if (relatedNode) {
        seen.add(nodeId);
        relatedNodes.push(relatedNode);
      }
    }
  }

  return {
    node,
    connectedEdges,
    relatedNodes
  };
}

function formatAuditEventType(eventType: string) {
  switch (eventType) {
    case "authorization.granted":
      return "Authorization Granted";
    case "authorization.revoked":
      return "Authorization Revoked";
    case "bundle.created":
      return "Bundle Created";
    case "bundle.imported":
      return "Bundle Imported";
    case "backup.created":
      return "Backup Created";
    default:
      return formatGraphLabel(eventType);
  }
}

function countMetadataArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getMetadataStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0)
    )
  );
}

function getAuditEventMetaSummary(event: LocalAuditEvent) {
  if (event.eventType === "authorization.granted") {
    const rootsCount = countMetadataArray(event.metadata.scanRoots);
    const exclusionsCount = countMetadataArray(event.metadata.scanExclusions);
    const telemetryMode =
      typeof event.metadata.telemetryMode === "string" ? event.metadata.telemetryMode : "n/a";
    return `roots ${rootsCount} · exclusions ${exclusionsCount} · telemetry ${telemetryMode}`;
  }

  if (event.eventType === "authorization.revoked") {
    const telemetryMode =
      typeof event.metadata.previousTelemetryMode === "string"
        ? event.metadata.previousTelemetryMode
        : "n/a";
    return `previous telemetry ${telemetryMode}`;
  }

  if (event.eventType === "bundle.created") {
    const itemCount =
      typeof event.metadata.itemCount === "number" ? event.metadata.itemCount : 0;
    const lifecycleState =
      typeof event.metadata.lifecycleState === "string" ? event.metadata.lifecycleState : "n/a";
    return `${itemCount} item${itemCount === 1 ? "" : "s"} · state ${lifecycleState}`;
  }

  if (event.eventType === "bundle.imported") {
    const strategy =
      typeof event.metadata.strategy === "string" ? event.metadata.strategy : "n/a";
    const importedItemCount =
      typeof event.metadata.importedItemCount === "number" ? event.metadata.importedItemCount : 0;
    return `${importedItemCount} item${importedItemCount === 1 ? "" : "s"} · strategy ${strategy}`;
  }

  if (event.eventType === "backup.created") {
    const totalFiles = typeof event.metadata.totalFiles === "number" ? event.metadata.totalFiles : 0;
    const totalBytes = typeof event.metadata.totalBytes === "number" ? event.metadata.totalBytes : 0;
    const areaCount = typeof event.metadata.areaCount === "number" ? event.metadata.areaCount : 0;
    return `${totalFiles} file${totalFiles === 1 ? "" : "s"} · ${formatBytes(totalBytes)} · ${areaCount} areas`;
  }

  return null;
}

function getAuditEventGraphTargets(
  event: LocalAuditEvent,
  resolveGraphNode: (nodeType: string, refId: string | null | undefined) => GraphNodeSummary | null,
  resolveGraphRootNodeByPath: (rootPath: string | null | undefined) => GraphNodeSummary | null
) {
  const targets: Array<{
    key: string;
    label: string;
    node: GraphNodeSummary;
  }> = [];
  const seenNodeIds = new Set<string>();

  function pushTarget(node: GraphNodeSummary | null, key: string, label: string) {
    if (!node || seenNodeIds.has(node.id)) {
      return;
    }

    seenNodeIds.add(node.id);
    targets.push({ key, label, node });
  }

  if (event.eventType === "bundle.created") {
    const bundleId = typeof event.metadata.bundleId === "string" ? event.metadata.bundleId : null;
    pushTarget(resolveGraphNode("bundle", bundleId), `bundle:${bundleId ?? "unknown"}`, "Inspect Bundle");
    return targets;
  }

  if (event.eventType === "bundle.imported") {
    const bundleId = typeof event.metadata.bundleId === "string" ? event.metadata.bundleId : null;
    pushTarget(
      resolveGraphNode("bundle", bundleId),
      `bundle:${bundleId ?? "unknown"}`,
      "Inspect Imported Bundle"
    );
    return targets;
  }

  if (event.eventType === "authorization.granted") {
    const rootPaths = getMetadataStringArray(event.metadata.scanRoots);
    rootPaths.forEach((rootPath, index) => {
      const node = resolveGraphRootNodeByPath(rootPath);
      const label =
        node && node.displayName.trim().length > 0
          ? `Inspect Root · ${node.displayName}`
          : rootPaths.length > 1
            ? `Inspect Root ${index + 1}`
            : "Inspect Root";
      pushTarget(node, `root:${rootPath}`, label);
    });
  }

  return targets;
}

function getAuditEventGraphHint(event: LocalAuditEvent, targetCount: number) {
  if (event.eventType === "authorization.granted") {
    const rootCount = getMetadataStringArray(event.metadata.scanRoots).length;
    if (rootCount === 0) {
      return null;
    }
    if (targetCount === 0) {
      return "The selected project appears in the graph after a successful project scan refreshes the current snapshot.";
    }
    if (targetCount < rootCount) {
      return `${targetCount}/${rootCount} selected project source${rootCount === 1 ? "" : "s"} currently visible in the graph snapshot.`;
    }
    return null;
  }

  if (event.eventType === "bundle.created" || event.eventType === "bundle.imported") {
    const hasBundleId = typeof event.metadata.bundleId === "string" && event.metadata.bundleId.length > 0;
    if (hasBundleId && targetCount === 0) {
      return "The related bundle is not visible in the current graph snapshot yet.";
    }
  }

  return null;
}

function getTelemetryImportGraphTargets(
  result: TelemetryImportResult,
  resolveGraphNode: (nodeType: string, refId: string | null | undefined) => GraphNodeSummary | null
) {
  const targets: Array<{
    key: string;
    label: string;
    node: GraphNodeSummary;
  }> = [];
  const seenNodeIds = new Set<string>();

  function pushTarget(node: GraphNodeSummary | null, key: string, label: string) {
    if (!node || seenNodeIds.has(node.id)) {
      return;
    }

    seenNodeIds.add(node.id);
    targets.push({ key, label, node });
  }

  result.affectedSkillIds.forEach((skillId, index) => {
    const node = resolveGraphNode("skill", skillId);
    const label =
      node && node.displayName.trim().length > 0
        ? `Inspect Skill · ${node.displayName}`
        : result.affectedSkillIds.length > 1
          ? `Inspect Skill ${index + 1}`
          : "Inspect Skill";
    pushTarget(node, `skill:${skillId}`, label);
  });

  result.observedModelNames.forEach((modelName, index) => {
    const node = resolveGraphNode("model", modelName);
    const label =
      node && node.displayName.trim().length > 0
        ? `Inspect Model · ${node.displayName}`
        : result.observedModelNames.length > 1
          ? `Inspect Model ${index + 1}`
          : "Inspect Model";
    pushTarget(node, `model:${modelName}`, label);
  });

  return targets;
}

function getTelemetryImportGraphHint(result: TelemetryImportResult, targetCount: number) {
  const expectedTargetCount = result.affectedSkillIds.length + result.observedModelNames.length;
  if (expectedTargetCount === 0) {
    return null;
  }
  if (targetCount === 0) {
    return "The current graph snapshot does not expose any affected skill or model node yet.";
  }
  if (targetCount < expectedTargetCount) {
    return `${targetCount}/${expectedTargetCount} affected skill or model node${expectedTargetCount === 1 ? "" : "s"} currently visible in the graph snapshot.`;
  }
  return null;
}

function getGraphNodeMetaSummary(node: GraphNodeSummary) {
  switch (node.nodeType) {
    case "bundle": {
      const lifecycleState =
        typeof node.metadata.lifecycleState === "string"
          ? formatBundleLifecycleState(node.metadata.lifecycleState as SkillBundleLifecycleState)
          : null;
      const lineageKey =
        typeof node.metadata.lineageKey === "string" ? node.metadata.lineageKey : null;
      return [lifecycleState ? `state ${lifecycleState}` : null, lineageKey]
        .filter((value): value is string => Boolean(value))
        .join(" · ");
    }
    case "bundle_lineage": {
      const currentCount = Number(node.metadata.currentCount ?? 0);
      const retainedCount = Number(node.metadata.retainedCount ?? 0);
      const supersededCount = Number(node.metadata.supersededCount ?? 0);
      return `current ${currentCount} · retained ${retainedCount} · superseded ${supersededCount}`;
    }
    case "root":
      return typeof node.metadata.path === "string" ? node.metadata.path : null;
    case "version":
      return typeof node.metadata.fingerprint === "string" ? node.metadata.fingerprint : null;
    default:
      return null;
  }
}

function getGraphEdgeMetaSummary(edge: GraphEdgeSummary) {
  switch (edge.edgeType) {
    case "uses_model":
      return typeof edge.metadata.runs === "number" ? `${edge.metadata.runs} runs` : null;
    case "optimized_by":
      return [edge.metadata.status, edge.metadata.severity]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .join(" · ");
    case "packaged_as":
      return typeof edge.metadata.versionLabel === "string"
        ? edge.metadata.versionLabel
        : null;
    case "belongs_to_lineage":
      return typeof edge.metadata.lifecycleState === "string"
        ? `state ${formatBundleLifecycleState(edge.metadata.lifecycleState as SkillBundleLifecycleState)}`
        : null;
    case "supersedes":
      return "promoted lineage head";
    default:
      return null;
  }
}

function normalizeGraphSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function getGraphSearchMatchLabel(node: GraphNodeSummary, normalizedQuery: string) {
  const normalizedName = normalizeGraphSearchValue(node.displayName);
  const normalizedRefId = normalizeGraphSearchValue(node.refId);
  const normalizedType = normalizeGraphSearchValue(formatGraphLabel(node.nodeType));
  const normalizedMeta = normalizeGraphSearchValue(getGraphNodeMetaSummary(node) ?? "");

  if (normalizedName === normalizedQuery) {
    return "exact name";
  }
  if (normalizedRefId === normalizedQuery) {
    return "exact ref";
  }
  if (normalizedName.startsWith(normalizedQuery)) {
    return "name prefix";
  }
  if (normalizedRefId.startsWith(normalizedQuery)) {
    return "ref prefix";
  }
  if (normalizedType === normalizedQuery || normalizedType.startsWith(normalizedQuery)) {
    return "type";
  }
  if (normalizedName.includes(normalizedQuery)) {
    return "name";
  }
  if (normalizedRefId.includes(normalizedQuery)) {
    return "ref";
  }
  if (normalizedMeta.includes(normalizedQuery)) {
    return "metadata";
  }
  return "token match";
}

function getGraphSearchScore(node: GraphNodeSummary, normalizedQuery: string, terms: string[]) {
  const normalizedName = normalizeGraphSearchValue(node.displayName);
  const normalizedRefId = normalizeGraphSearchValue(node.refId);
  const normalizedType = normalizeGraphSearchValue(formatGraphLabel(node.nodeType));
  const normalizedMeta = normalizeGraphSearchValue(getGraphNodeMetaSummary(node) ?? "");
  const haystack = [normalizedName, normalizedRefId, normalizedType, normalizedMeta]
    .filter(Boolean)
    .join(" ");

  if (!terms.every((term) => haystack.includes(term))) {
    return null;
  }

  let score = 240;

  if (normalizedName === normalizedQuery) {
    score += 1200;
  } else if (normalizedRefId === normalizedQuery) {
    score += 1120;
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 860;
  } else if (normalizedRefId.startsWith(normalizedQuery)) {
    score += 800;
  } else if (normalizedType === normalizedQuery || normalizedType.startsWith(normalizedQuery)) {
    score += 700;
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 620;
  } else if (normalizedRefId.includes(normalizedQuery)) {
    score += 560;
  } else if (normalizedMeta.includes(normalizedQuery)) {
    score += 420;
  }

  score += Math.min(node.degree, 48);
  return score;
}

function sortGraphNodesByPriority(left: GraphNodeSummary, right: GraphNodeSummary) {
  if (right.degree !== left.degree) {
    return right.degree - left.degree;
  }

  if (left.nodeType !== right.nodeType) {
    return left.nodeType.localeCompare(right.nodeType);
  }

  return left.displayName.localeCompare(right.displayName);
}

interface GraphSearchMatchEntry {
  node: GraphNodeSummary;
  score: number;
  matchLabel: string;
}

interface GraphScopeLayerEntry {
  key: string;
  tone: "baseline" | "pinned" | "search" | "trace" | "selection";
  title: string;
  detail: string;
  description: string;
  pills: string[];
  actionLabel?: string;
  onAction?: () => void;
}

interface GraphNavigationState {
  entries: string[];
  index: number;
}

function getGraphNodeIdentityKey(nodeType: string, refId: string) {
  return `${nodeType}::${refId}`;
}

function getGraphSearchMatches(
  nodes: GraphNodeSummary[],
  query: string,
  limit = 8
): GraphSearchMatchEntry[] {
  const normalizedQuery = normalizeGraphSearchValue(query);
  if (normalizedQuery.length === 0) {
    return [];
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

  return [...nodes]
    .sort(sortGraphNodesByPriority)
    .map((node) => {
      const score = getGraphSearchScore(node, normalizedQuery, queryTerms);
      if (score == null) {
        return null;
      }

      return {
        node,
        score,
        matchLabel: getGraphSearchMatchLabel(node, normalizedQuery)
      };
    })
    .filter((entry): entry is GraphSearchMatchEntry => entry !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return sortGraphNodesByPriority(left.node, right.node);
    })
    .slice(0, limit);
}

function buildGraphSearchScopeGraph(
  graph: GraphSelectionGraph | null,
  matchedNodeIds: ReadonlySet<string>
): GraphSelectionGraph | null {
  if (!graph) {
    return null;
  }

  if (matchedNodeIds.size === 0) {
    return graph;
  }

  const visibleNodeIds = new Set<string>(matchedNodeIds);
  const visibleEdges = graph.edges.filter((edge) => {
    const touchesMatch =
      matchedNodeIds.has(edge.fromNodeId) || matchedNodeIds.has(edge.toNodeId);

    if (!touchesMatch) {
      return false;
    }

    visibleNodeIds.add(edge.fromNodeId);
    visibleNodeIds.add(edge.toNodeId);
    return true;
  });

  const visibleNodes = graph.nodes.filter((node) => visibleNodeIds.has(node.id));

  return {
    nodes: visibleNodes,
    edges: visibleEdges
  };
}

function formatGraphMetadataValue(value: unknown) {
  if (value == null) {
    return "n/a";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "[]";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function describeBundleStrategyOutcome(
  validation: SkillBundleValidationResult,
  strategy: SkillBundleImportStrategy
) {
  const baseline = validation.diff.comparedBundle;

  if (!baseline || baseline.lifecycleState !== "current") {
    return "No current lineage baseline is active for this package yet, so the incoming bundle will become the current local revision when added.";
  }

  if (strategy === "preserve_existing") {
    return `Keep ${baseline.bundleName} as the current local baseline and add the incoming bundle as a retained parallel revision.`;
  }

  return `Promote the incoming bundle to current and move ${baseline.bundleName} into the superseded history chain.`;
}

function describeBundleStrategyOutcomeText(
  validation: SkillBundleValidationResult,
  strategy: SkillBundleImportStrategy,
  mode: LanguageMode
) {
  const baseline = validation.diff.comparedBundle;

  if (!baseline || baseline.lifecycleState !== "current") {
    return formatLocalizedText(
      mode,
      "No current lineage baseline is active for this package yet, so the incoming bundle will become the current local revision when added.",
      "此包尚无当前谱系基线，因此传入 Bundle 添加后会成为当前本地修订。"
    );
  }

  if (strategy === "preserve_existing") {
    return formatLocalizedText(
      mode,
      `Keep ${baseline.bundleName} as the current local baseline and add the incoming bundle as a retained parallel revision.`,
      `保留 ${baseline.bundleName} 作为当前本地基线，并把传入 Bundle 添加为并行保留修订。`
    );
  }

  return formatLocalizedText(
    mode,
    `Promote the incoming bundle to current and move ${baseline.bundleName} into the superseded history chain.`,
    `把传入 Bundle 提升为当前版本，并将 ${baseline.bundleName} 移入已替代历史链。`
  );
}

function StatusPill({ status }: { status: SkillRunSummary["status"] }) {
  const { t } = useLanguage();
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`status-pill status-${status}`}>{t(label)}</span>;
}

function ProposalStatusPill({ status }: { status: OptimizationProposalStatus }) {
  const { mode } = useLanguage();
  return (
    <span className={`proposal-status-pill proposal-status-${status}`}>
      {formatProposalStatus(status, mode)}
    </span>
  );
}

function SeverityPill({ severity }: { severity: OptimizationProposalSeverity }) {
  const { mode } = useLanguage();
  return <span className={`severity-pill severity-${severity}`}>{formatSeverity(severity, mode)}</span>;
}

function SkillTable({
  skills,
  chineseAssistEnabled,
  selectedGraphNodeId,
  resolveGraphNode,
  onInspectGraphNode
}: {
  skills: SkillSummary[];
  chineseAssistEnabled: boolean;
  selectedGraphNodeId: string | null;
  resolveGraphNode: (nodeType: string, refId: string | null | undefined) => GraphNodeSummary | null;
  onInspectGraphNode: (node: GraphNodeSummary) => void;
}) {
  const { mode, t } = useLanguage();

  if (skills.length === 0) {
    return (
      <div className="empty-state">
        <h3>{t("No skills indexed yet")}</h3>
        <p>
          <T
            en="Bind a project folder, then run a project scan to populate the skill index."
            zh="绑定项目目录并运行扫描后，即可填充技能索引。"
          />
        </p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>{t("Skill")}</th>
            <th>{t("Governance")}</th>
            <th>{t("Boundary")}</th>
            <th>{t("Path")}</th>
            <th>{t("Graph")}</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => {
            const skillNode = resolveGraphNode("skill", skill.id);
            const governanceTone = getSkillGovernanceTone(skill.governance.role);
            const governanceSignal = formatSkillGovernanceSignal(skill.governance, mode);
            const governanceDataSummary = formatSkillGovernanceDataSummary(skill.governance, mode);
            const displayDescription = formatSkillDescriptionForDisplay(skill, mode, chineseAssistEnabled);

            return (
              <tr key={skill.id}>
                <td>
                  <strong>{skill.displayName}</strong>
                  {displayDescription ? <div className="muted">{displayDescription}</div> : null}
                  <div className="registry-skill-meta">
                    <span>{skill.sourceType}</span>
                    <span>
                      {t("Lines")}: {skill.lineCount ?? "n/a"}
                    </span>
                    <span>{skill.currentVersionFingerprint ?? "n/a"}</span>
                  </div>
                </td>
                <td>
                  <div className="registry-governance-block">
                    <strong>{formatSkillRole(skill.governance.role, mode)}</strong>
                    <div className="registry-governance-pills">
                      <span className={`skill-governance-pill tone-${governanceTone}`}>
                        {governanceSignal}
                      </span>
                      <span className="skill-governance-pill">{governanceDataSummary}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="registry-governance-block">
                    <strong>{formatSkillStoragePolicy(skill.governance.storagePolicy, mode)}</strong>
                    <div className="muted">
                      {formatSkillReusePolicy(skill.governance.reusePolicy, mode)} ·{" "}
                      {formatSkillRecommendedScope(skill.governance.recommendedScope, mode)}
                    </div>
                  </div>
                </td>
                <td className="path-cell">{skill.sourcePath}</td>
                <td>
                  <div className="table-inline-actions">
                    <GraphPanelInspectAction
                      targetNode={skillNode}
                      selectedNodeId={selectedGraphNodeId}
                      onInspectNode={onInspectGraphNode}
                      label={t("Skill")}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MetricStrip({ summary }: { summary: DailyMetricsSummary | null }) {
  const { t } = useLanguage();
  const items = [
    {
      label: "Runs Today",
      value: summary ? formatCount(summary.totalRuns) : "0"
    },
    {
      label: "Total Tokens",
      value: summary ? formatCount(summary.totalTokens) : "0"
    },
    {
      label: "Est. Cost",
      value: summary ? formatUsd(summary.totalCostUsd) : formatUsd(0)
    },
    {
      label: "Avg Duration",
      value: summary ? formatDuration(summary.avgDurationMs) : "n/a"
    }
  ];

  return (
    <div className="metric-grid">
      {items.map((item) => (
        <div className="metric-card" key={item.label}>
          <span className="stat-label">{t(item.label)}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function WeeklyMetricStrip({ summary }: { summary: WeeklyMetricsSummary | null }) {
  const { t } = useLanguage();
  const items = [
    {
      label: "Runs This Week",
      value: summary ? formatCount(summary.totalRuns) : "0"
    },
    {
      label: "Total Tokens",
      value: summary ? formatCount(summary.totalTokens) : "0"
    },
    {
      label: "Est. Cost",
      value: summary ? formatUsd(summary.totalCostUsd) : formatUsd(0)
    },
    {
      label: "Avg Duration",
      value: summary ? formatDuration(summary.avgDurationMs) : "n/a"
    }
  ];

  return (
    <div className="metric-grid">
      {items.map((item) => (
        <div className="metric-card" key={item.label}>
          <span className="stat-label">{t(item.label)}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function Leaderboard({
  title,
  items,
  emptyCopy,
  mode,
  selectedGraphNodeId,
  resolveGraphNode,
  onInspectGraphNode
}: {
  title: string;
  items: SkillMetricLeader[];
  emptyCopy: string;
  mode: "speed" | "usage";
  selectedGraphNodeId: string | null;
  resolveGraphNode: (nodeType: string, refId: string | null | undefined) => GraphNodeSummary | null;
  onInspectGraphNode: (node: GraphNodeSummary) => void;
}) {
  const { mode: languageMode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(languageMode, en, zh);

  return (
    <div className="leaderboard-card">
      <div className="section-headline compact">
        <h3>{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="muted">{emptyCopy}</p>
      ) : (
        <div className="leaderboard-list">
          {items.map((item) => {
            const skillNode = resolveGraphNode("skill", item.skillId);

            return (
              <div className="leaderboard-item" key={`${title}-${item.skillId}`}>
                <div className="leaderboard-item-main">
                  <div>
                    <strong>{item.skillName}</strong>
                    <div className="muted">
                      {formatCount(item.runsCount)} {tx("runs", "运行")} ·{" "}
                      {item.totalTokens.toLocaleString()} {tx("tokens", "Token")}
                    </div>
                  </div>
                  <GraphPanelInspectAction
                    targetNode={skillNode}
                    selectedNodeId={selectedGraphNodeId}
                    onInspectNode={onInspectGraphNode}
                    label={tx("Inspect Skill", "检查 Skill")}
                  />
                </div>
                <div className="leaderboard-metric">
                  <strong>
                    {mode === "speed"
                      ? formatDuration(item.avgDurationMs)
                      : `${formatCount(item.runsCount)} ${tx("runs", "运行")}`}
                  </strong>
                  <span className="muted">
                    {mode === "speed"
                      ? `${tx("max", "最大")} ${formatDuration(item.maxDurationMs)}`
                      : `${formatUsd(item.estimatedCostUsd)} ${tx("cost", "成本")}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WasteLeaderboard({
  title,
  items,
  emptyCopy,
  selectedGraphNodeId,
  resolveGraphNode,
  onInspectGraphNode
}: {
  title: string;
  items: SkillWasteLeader[];
  emptyCopy: string;
  selectedGraphNodeId: string | null;
  resolveGraphNode: (nodeType: string, refId: string | null | undefined) => GraphNodeSummary | null;
  onInspectGraphNode: (node: GraphNodeSummary) => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  return (
    <div className="leaderboard-card">
      <div className="section-headline compact">
        <h3>{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="muted">{emptyCopy}</p>
      ) : (
        <div className="waste-list">
          {items.map((item) => {
            const skillNode = resolveGraphNode("skill", item.skillId);

            return (
              <div className="waste-item" key={`${title}-${item.skillId}`}>
                <div className="waste-item-main">
                  <div>
                    <strong>{item.skillName}</strong>
                    <div className="muted">
                      {formatCount(item.runsCount)} {tx("runs", "运行")} ·{" "}
                      {formatPercent(item.failureRate)} {tx("failure rate", "失败率")}
                    </div>
                  </div>
                  <GraphPanelInspectAction
                    targetNode={skillNode}
                    selectedNodeId={selectedGraphNodeId}
                    onInspectNode={onInspectGraphNode}
                    label={tx("Inspect Skill", "检查 Skill")}
                  />
                </div>
                <div className="waste-metrics">
                  <div className="mini-stat">
                    <span className="stat-label">{tx("Avg Tokens/Run", "平均 Token/运行")}</span>
                    <strong>{formatCount(Math.round(item.avgTokensPerRun))}</strong>
                  </div>
                  <div className="mini-stat">
                    <span className="stat-label">{tx("Waste Score", "浪费评分")}</span>
                    <strong>{formatWasteScore(item.wasteScore)}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentRunsTable({
  runs,
  selectedGraphNodeId,
  resolveGraphNode,
  onInspectGraphNode
}: {
  runs: SkillRunSummary[];
  selectedGraphNodeId: string | null;
  resolveGraphNode: (nodeType: string, refId: string | null | undefined) => GraphNodeSummary | null;
  onInspectGraphNode: (node: GraphNodeSummary) => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (runs.length === 0) {
    return (
      <div className="empty-state">
        <h3>{tx("No recent telemetry yet", "还没有最近遥测")}</h3>
        <p>{tx("Import a local JSONL telemetry file after indexing skills to populate runtime analytics.", "索引 Skill 后导入本地 JSONL 遥测文件，即可生成运行分析。")}</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>{tx("Skill", "技能")}</th>
            <th>{tx("Status", "状态")}</th>
            <th>{tx("Started", "开始时间")}</th>
            <th>{tx("Latency", "延迟")}</th>
            <th>{tx("Duration", "耗时")}</th>
            <th>{tx("Tokens", "Token")}</th>
            <th>{tx("Model", "模型")}</th>
            <th>{tx("Source", "来源")}</th>
            <th>{tx("Graph", "图谱")}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const skillNode = resolveGraphNode("skill", run.skillId);
            const modelNode = resolveGraphNode("model", run.modelName);

            return (
              <tr key={run.runId}>
                <td>
                  <strong>{run.skillName}</strong>
                  <div className="muted">
                    {formatCount(run.toolCallCount)} {tx("tool calls", "工具调用")}
                  </div>
                </td>
                <td>
                  <StatusPill status={run.status} />
                </td>
                <td>{formatDateTime(run.startedAt)}</td>
                <td>{formatDuration(run.firstOutputLatencyMs)}</td>
                <td>{formatDuration(run.durationMs)}</td>
                <td>{formatCount(run.totalTokens)}</td>
                <td>{run.modelName ?? "n/a"}</td>
                <td>
                  <span className="muted">{run.captureMode}</span>
                  <div className="muted">{run.sourceType}</div>
                </td>
                <td>
                  <div className="table-inline-actions">
                    <GraphPanelInspectAction
                      targetNode={skillNode}
                      selectedNodeId={selectedGraphNodeId}
                      onInspectNode={onInspectGraphNode}
                      label={tx("Skill", "技能")}
                    />
                    <GraphPanelInspectAction
                      targetNode={modelNode}
                      selectedNodeId={selectedGraphNodeId}
                      onInspectNode={onInspectGraphNode}
                      label={tx("Model", "模型")}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProjectLibraryPanel({
  projects,
  recentRuns,
  telemetryReady,
  repairFeedback,
  onboardingLogs,
  currentProjectRoot,
  busyAction,
  busy,
  onBindProject,
  onInspectProject,
  onAnalyzeProject,
  onScanProject,
  onRepairProject,
  onViewOnboardingLog,
  onToggleMonitoring,
  onUnbindProject
}: {
  projects: ManagedProject[];
  recentRuns: SkillRunSummary[];
  telemetryReady: boolean;
  repairFeedback: ProjectRepairFeedback | null;
  onboardingLogs: ProjectOnboardingLogEntry[];
  currentProjectRoot: string;
  busyAction: string | null;
  busy: boolean;
  onBindProject: () => void;
  onInspectProject: (project: ManagedProject) => void;
  onAnalyzeProject: (project: ManagedProject) => void;
  onScanProject: (project: ManagedProject) => void;
  onRepairProject: (project: ManagedProject) => void;
  onViewOnboardingLog: (project: ManagedProject) => void;
  onToggleMonitoring: (project: ManagedProject, enabled: boolean) => void;
  onUnbindProject: (project: ManagedProject) => void;
}) {
  const { tx } = useLanguage();
  const currentPath = normalizeProjectPath(currentProjectRoot);

  return (
    <article className="project-library-panel entity-project">
      <div className="project-library-head">
        <div>
          <span className="os-module-kicker">{tx("Project Management", "项目管理")}</span>
          <h3>{tx("Bound Projects", "已绑定项目")}</h3>
          <p>
            {tx(
              "Bound projects are managed here. Scanning and analysis still run on one selected project only.",
              "已绑定项目在这里统一管理。扫描和分析仍然一次只作用于一个选中项目。"
            )}
          </p>
        </div>
        <BindProjectButton busy={busy} onClick={onBindProject} />
      </div>

      {projects.length === 0 ? (
        <div className="project-library-empty">
          <strong>{tx("No bound projects yet", "还没有已绑定项目")}</strong>
          <p>{tx("Bind a project folder to add it to the Project Library.", "绑定一个项目文件夹后，它会加入项目库。")}</p>
        </div>
      ) : (
        <div className="project-library-table-shell">
          <table className="project-library-table">
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>{tx("Project", "项目")}</th>
                <th>{tx("Scan Time", "扫描时间")}</th>
                <th>{tx("Skills", "技能")}</th>
                <th>{tx("Onboarding Status", "接入状态")}</th>
                <th>{tx("Monitor", "监控")}</th>
                <th>{tx("Actions", "操作")}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const isCurrent = project.path === currentPath;
                const isScanningProject = busyAction === "project-scan" && isCurrent;
                const projectRepairFeedback =
                  repairFeedback?.projectPath === project.path ? repairFeedback : null;
                const isRepairingProject = projectRepairFeedback?.status === "running";
                const projectLogCount = onboardingLogs.filter((entry) => entry.projectPath === project.path).length;
                const matchingWorkspaceRuns = recentRuns.filter(
                  (run) =>
                    run.workspaceRef &&
                    isPathInsideProject(run.workspaceRef, project.path)
                );
                const hasExplicitSkillRun = matchingWorkspaceRuns.some((run) => run.confidenceScore > 0.68);
                const latestMatchingWorkspaceRef = matchingWorkspaceRuns
                  .slice()
                  .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0]?.workspaceRef;
                const detectedWorkspaceRef = latestMatchingWorkspaceRef ?? project.lastObservedWorkspaceRef;
                const workspaceMatchesProject = Boolean(
                  detectedWorkspaceRef && isPathInsideProject(detectedWorkspaceRef, project.path)
                );
                const onboardingStatus = projectRepairFeedback?.status === "running"
                  ? "repairing"
                  : projectRepairFeedback?.status === "completed"
                    ? "repair-completed"
                    : projectRepairFeedback?.status === "connected-awaiting-skill"
                      ? "connected-awaiting-skill"
                    : projectRepairFeedback?.status === "needs-action"
                      ? "repair-needs-action"
                      : projectRepairFeedback?.status === "connection-required"
                        ? "repair-connection-required"
                      : projectRepairFeedback?.status === "failed"
                        ? "repair-failed"
                  : isScanningProject
                    ? "scanning"
                  : !project.lastScanAt
                    ? "pending"
                    : (project.skillsFound ?? 0) === 0 || !project.workflowApplied
                      ? "needs-repair"
                      : !telemetryReady
                        ? "needs-authorization"
                      : hasExplicitSkillRun
                        ? "healthy"
                        : workspaceMatchesProject
                          ? "connected-awaiting-skill"
                          : "needs-connection";
                const statusText =
                  onboardingStatus === "repairing"
                    ? tx("Repairing", "修正中")
                    : onboardingStatus === "repair-completed"
                      ? tx("Repair complete", "修正完成")
                      : onboardingStatus === "repair-needs-action"
                        ? tx("Action required", "需要确认")
                        : onboardingStatus === "repair-connection-required"
                          ? tx("Connection incomplete", "连接未完成")
                        : onboardingStatus === "repair-failed"
                          ? tx("Repair failed", "修正失败")
                  : onboardingStatus === "scanning"
                    ? tx("Checking", "检测中")
                    : onboardingStatus === "pending"
                      ? tx("Pending scan", "待扫描")
                      : onboardingStatus === "needs-repair"
                        ? tx("Needs repair", "需要修正")
                        : onboardingStatus === "needs-authorization"
                          ? tx("Needs authorization", "需要授权")
                        : onboardingStatus === "connected-awaiting-skill"
                          ? tx("Connected, awaiting Skill", "已连接待触发")
                        : onboardingStatus === "healthy"
                          ? tx("Running normally", "运行正常")
                          : tx("Ready, not connected", "已配置待连接");
                const statusDetail =
                  projectRepairFeedback?.detail ??
                  (onboardingStatus === "needs-repair"
                    ? tx("Skills or workflow configuration is incomplete.", "技能或工作流配置不完整。")
                    : onboardingStatus === "needs-authorization"
                      ? tx("Runtime telemetry permission is required before connection checks can run.", "执行连接检查前，需要先授权运行遥测。")
                    : onboardingStatus === "needs-connection"
                      ? detectedWorkspaceRef
                        ? tx(
                            `Detected Codex directory: ${detectedWorkspaceRef}. Expected: ${project.path}.`,
                            `检测到 Codex 目录：${detectedWorkspaceRef}；期望目录：${project.path}。`
                          )
                        : tx(
                            `No Codex task directory was detected. Expected: ${project.path}.`,
                            `尚未检测到 Codex 任务目录；期望目录：${project.path}。`
                          )
                      : onboardingStatus === "connected-awaiting-skill"
                        ? tx(
                            `Codex directory matches ${project.path}, but no explicit Skill invocation has been detected yet.`,
                            `Codex 目录已匹配 ${project.path}，但尚未检测到明确的技能调用。`
                          )
                      : onboardingStatus === "healthy"
                        ? tx("A matching workspace and explicit Skill evidence were detected.", "已检测到匹配的工作目录和明确 Skill 证据。")
                        : tx("Run project detection to verify this binding.", "请运行项目检测以验证绑定。"))

                return (
                  <tr className={isCurrent ? "is-current" : undefined} key={project.id}>
                    <td data-label={tx("Project", "项目")}>
                      <div className="project-name-cell">
                        <strong>{project.name}</strong>
                        <span>{project.path}</span>
                      </div>
                    </td>
                    <td data-label={tx("Scan Time", "扫描时间")}>{formatDateTime(project.lastScanAt)}</td>
                    <td data-label={tx("Skills", "技能")}>
                      <button
                        type="button"
                        className="project-skill-count-button"
                        onClick={() => onInspectProject(project)}
                      >
                        {project.skillsFound == null ? tx("Not scanned", "未扫描") : formatCount(project.skillsFound)}
                      </button>
                    </td>
                    <td data-label={tx("Onboarding Status", "接入状态")}>
                      <div className="project-onboarding-status-cell">
                        <span
                          className={`project-status-pill status-${onboardingStatus}${isScanningProject ? " is-scanning" : ""}`}
                          title={statusDetail}
                        >
                          {statusText}
                        </span>
                        {projectRepairFeedback ? <small>{projectRepairFeedback.detail}</small> : null}
                        {!projectRepairFeedback && onboardingStatus === "needs-connection" ? (
                          <small className="project-connection-workspace" title={statusDetail}>
                            {detectedWorkspaceRef
                              ? tx(
                                  `Codex: ${getProjectDisplayName(detectedWorkspaceRef)} (mismatch)`,
                                  `Codex：${getProjectDisplayName(detectedWorkspaceRef)}（不匹配）`
                                )
                              : tx("Codex directory not detected", "未检测到 Codex 目录")}
                          </small>
                        ) : null}
                        {onboardingStatus === "connected-awaiting-skill" ? (
                          <small className="project-connection-workspace is-matched" title={statusDetail}>
                            {tx("Codex directory matched; Skill not triggered", "Codex 目录已匹配，技能待触发")}
                          </small>
                        ) : null}
                        {onboardingStatus === "healthy" ? (
                          <small className="project-connection-workspace is-matched">
                            {tx("Codex directory matched", "Codex 目录已匹配")}
                          </small>
                        ) : null}
                        <button
                          type="button"
                          className="project-onboarding-log-link"
                          onClick={() => onViewOnboardingLog(project)}
                        >
                          {tx("View log", "查看日志")} {projectLogCount > 0 ? `(${projectLogCount})` : ""}
                        </button>
                      </div>
                    </td>
                    <td data-label={tx("Monitor", "监控")}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={project.monitoringEnabled}
                        aria-label={project.monitoringEnabled ? tx("Turn monitoring off", "关闭项目监控") : tx("Turn monitoring on", "开启项目监控")}
                        title={project.monitoringEnabled ? tx("Monitoring is on", "项目监控已开启") : tx("Monitoring is off", "项目监控已关闭")}
                        className="switch-control table-switch"
                        onClick={() => onToggleMonitoring(project, !project.monitoringEnabled)}
                        disabled={busy}
                      >
                        <span className="switch-track" aria-hidden="true">
                          <span className="switch-thumb" />
                        </span>
                      </button>
                    </td>
                    <td data-label={tx("Actions", "操作")}>
                      <div className="project-library-actions">
                        <button
                          type="button"
                          className="project-table-icon-action"
                          aria-label={tx("View project detail", "查看项目详情")}
                          title={tx("View project detail", "查看项目详情")}
                          onClick={() => onInspectProject(project)}
                          disabled={busy}
                        >
                          <ViewIcon />
                        </button>
                        <button
                          type="button"
                          className="project-table-icon-action"
                          aria-label={tx("Open analysis report", "打开分析报告")}
                          title={tx("Open analysis report", "打开分析报告")}
                          onClick={() => onAnalyzeProject(project)}
                          disabled={busy}
                        >
                          <AnalysisIcon />
                        </button>
                        <button
                          type="button"
                          className="project-table-icon-action primary"
                          aria-label={tx("Scan Project", "扫描项目")}
                          title={tx("Scan Project", "扫描项目")}
                          onClick={() => onScanProject(project)}
                          disabled={busy}
                        >
                          <ScanIcon />
                        </button>
                        {onboardingStatus !== "healthy" ? (
                          <button
                            type="button"
                            className={`project-table-icon-action repair${isRepairingProject ? " is-loading" : ""}`}
                            aria-label={isRepairingProject
                              ? tx("Project repair in progress", "项目修正进行中")
                              : tx("Detect and repair project", "检测并修正项目")}
                            aria-busy={isRepairingProject}
                            title={isRepairingProject
                              ? tx("Project repair in progress", "项目修正进行中")
                              : tx("Detect and repair project", "检测并修正项目")}
                            onClick={() => onRepairProject(project)}
                            disabled={busy}
                          >
                            {isRepairingProject ? <span className="project-action-spinner" aria-hidden="true" /> : <RepairIcon />}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="project-table-icon-action danger"
                          aria-label={tx("Unbind Project", "解绑项目")}
                          title={tx("Unbind Project", "解绑项目")}
                          onClick={() => onUnbindProject(project)}
                          disabled={busy}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function ProjectHeartbeatChart({
  entries,
  latestRunCount,
  totalTokens
}: {
  entries: ProjectHeartbeatEntry[];
  latestRunCount: number;
  totalTokens: number;
}) {
  const { tx } = useLanguage();
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const visibleEntries = entries.slice(-24);
  const width = 360;
  const height = 118;
  const chartPaddingX = 30;
  const chartPaddingTop = 18;
  const chartPaddingBottom = 24;
  const entryValue = (entry: ProjectHeartbeatEntry) =>
    Math.max(entry.importedRuns + entry.updatedRuns, entry.totalRuns, 1);
  const maxValue = Math.max(1, latestRunCount, ...visibleEntries.map(entryValue));
  const points = visibleEntries.map((entry, index) => {
    const x =
      visibleEntries.length <= 1
        ? width - chartPaddingX
        : chartPaddingX + (index / (visibleEntries.length - 1)) * (width - chartPaddingX * 2);
    const value = entryValue(entry);
    const y =
      height -
      chartPaddingBottom -
      (value / maxValue) * (height - chartPaddingTop - chartPaddingBottom);
    return {
      entry,
      value,
      x,
      y: Number.isFinite(y) ? y : height - chartPaddingBottom
    };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const successCount = visibleEntries.filter((entry) => entry.tone === "success").length;
  const warningCount = visibleEntries.filter((entry) => entry.tone === "warning").length;
  const errorCount = visibleEntries.filter((entry) => entry.tone === "error").length;
  const latestEntry = visibleEntries.length > 0 ? visibleEntries[visibleEntries.length - 1] : null;
  const latestValue = latestEntry ? entryValue(latestEntry) : 0;
  const peakValue = Math.max(0, ...visibleEntries.map(entryValue));
  const firstEntry = visibleEntries[0] ?? null;
  const hoveredPoint =
    (hoveredPointId ? points.find((point) => point.entry.id === hoveredPointId) : null) ?? null;
  const timeRangeLabel =
    firstEntry && latestEntry
      ? `${formatDateTime(firstEntry.observedAt)} - ${formatDateTime(latestEntry.observedAt)}`
      : "n/a";

  return (
    <div className="project-heartbeat-chart-panel">
      <div className="project-heartbeat-chart-head">
        <div>
          <strong>{tx("Heartbeat Trend", "心跳趋势")}</strong>
          <small>
            {latestEntry
              ? tx(
                  "Shows recent project Skill calls and runtime refresh pulses.",
                  "展示最近的项目 Skill 调用和运行证据刷新脉冲。"
                )
              : tx("No runtime heartbeat yet", "还没有运行心跳记录")}
          </small>
        </div>
        <div className="project-heartbeat-chart-legend">
          <span className="tone-success">{tx("OK", "正常")} {successCount}</span>
          <span className="tone-warning">{tx("Warn", "提醒")} {warningCount}</span>
          <span className="tone-error">{tx("Error", "异常")} {errorCount}</span>
        </div>
      </div>
      <div className="project-heartbeat-chart-metrics" aria-label={tx("Heartbeat metrics", "心跳指标")}>
        <div>
          <span>{tx("Latest Pulse", "最近脉冲")}</span>
          <strong>{formatCount(latestValue)}</strong>
        </div>
        <div>
          <span>{tx("Peak Pulse", "峰值脉冲")}</span>
          <strong>{formatCount(peakValue)}</strong>
        </div>
        <div>
          <span>{tx("Recent Points", "近期点位")}</span>
          <strong>{formatCount(visibleEntries.length)}</strong>
        </div>
        <div>
          <span>{tx("Total Runs", "总调用")}</span>
          <strong>{formatCount(latestRunCount)}</strong>
        </div>
        <div>
          <span>{tx("Total Tokens", "总 Token")}</span>
          <strong>{formatCount(totalTokens)}</strong>
        </div>
      </div>
      {visibleEntries.length > 0 ? (
        <div className="project-heartbeat-chart-frame" onMouseLeave={() => setHoveredPointId(null)}>
          <svg
            className="project-heartbeat-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={tx("Recent heartbeat status chart", "最近心跳状态图")}
          >
            <line
              x1={chartPaddingX}
              y1={height - chartPaddingBottom}
              x2={width - chartPaddingX}
              y2={height - chartPaddingBottom}
            />
            <line x1={chartPaddingX} y1={chartPaddingTop} x2={chartPaddingX} y2={height - chartPaddingBottom} />
            <line
              className="grid-line"
              x1={chartPaddingX}
              y1={chartPaddingTop}
              x2={width - chartPaddingX}
              y2={chartPaddingTop}
            />
            <text x={4} y={chartPaddingTop + 4}>{formatCount(maxValue)}</text>
            <text x={12} y={height - chartPaddingBottom + 4}>0</text>
            <polyline points={polyline} />
            {points.map((point) => (
              <circle
                key={point.entry.id}
                className={`tone-${point.entry.tone}${hoveredPointId === point.entry.id ? " active" : ""}`}
                cx={point.x}
                cy={point.y}
                r={hoveredPointId === point.entry.id ? 5.5 : 4}
                tabIndex={0}
                onFocus={() => setHoveredPointId(point.entry.id)}
                onMouseEnter={() => setHoveredPointId(point.entry.id)}
              />
            ))}
          </svg>
          <div className="project-heartbeat-chart-range">
            <span>{timeRangeLabel}</span>
            <span>{tx("Value = calls or imported/updated runs per pulse", "数值 = 单次调用或本次导入/更新运行数")}</span>
          </div>
          {hoveredPoint ? (
            <div
              className="project-heartbeat-tooltip"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${Math.max(10, hoveredPoint.y - 6)}px`
              }}
            >
              <strong>{formatDateTime(hoveredPoint.entry.observedAt)}</strong>
              <span>{tx("Value", "数值")} {formatCount(hoveredPoint.value)} · {hoveredPoint.entry.status}</span>
              <p>{hoveredPoint.entry.message}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="project-heartbeat-chart-empty">
          {tx("Refresh runtime evidence once to start the heartbeat timeline.", "刷新一次运行证据后，这里会开始记录心跳时间线。")}
        </div>
      )}
    </div>
  );
}

function buildProjectRunHeartbeatEntries(
  projectPath: string,
  projectRuns: SkillRunSummary[],
  formatMessage: (run: SkillRunSummary) => string
): ProjectHeartbeatEntry[] {
  return projectRuns.map((run) => ({
    id: `${projectPath}:run:${run.runId}`,
    projectPath,
    observedAt: run.finishedAt ?? run.startedAt,
    tone: run.status === "failed" ? "error" : run.status === "completed" ? "success" : "info",
    status: run.status === "failed" ? "no_importable_runs" : "imported",
    importedRuns: 0,
    updatedRuns: 0,
    totalRuns: 1,
    sourceCount: 0,
    message: formatMessage(run)
  }));
}

function SkillRunDetailModal({
  skill,
  runs,
  loading,
  onClose
}: {
  skill: SkillSummary;
  runs: SkillRunSummary[];
  loading: boolean;
  onClose: () => void;
}) {
  const { tx } = useLanguage();
  const completedRuns = runs.filter((run) => run.status === "completed").length;
  const totalToolCalls = runs.reduce((sum, run) => sum + run.toolCallCount, 0);
  const visibleRunTokens = runs.reduce((sum, run) => sum + run.totalTokens, 0);
  const totalTokens = Math.max(skill.runtime.totalTokens, visibleRunTokens);
  const latestRunAt = runs[0]?.startedAt ?? null;

  return (
    <div className="skill-run-modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="skill-run-modal entity-skill"
        role="dialog"
        aria-modal="true"
        aria-label={tx("Skill run details", "技能调用详情")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="skill-run-modal-head">
          <div>
            <span className="os-module-kicker">{tx("Run Details", "调用详情")}</span>
            <h2>{skill.displayName}</h2>
            <p>{skill.sourcePath}</p>
          </div>
          <button type="button" className="icon-button" aria-label={tx("Close", "关闭")} onClick={onClose}>
            ×
          </button>
        </div>

        <div className="skill-run-modal-metrics">
          <div>
            <span>{tx("Calls", "调用")}</span>
            <strong>{loading ? "..." : formatCount(runs.length)}</strong>
          </div>
          <div>
            <span>{tx("Success", "成功")}</span>
            <strong>{loading || runs.length === 0 ? "n/a" : `${Math.round((completedRuns / runs.length) * 100)}%`}</strong>
          </div>
          <div>
            <span>{tx("Tool Calls", "工具调用")}</span>
            <strong>{loading ? "..." : formatCount(totalToolCalls)}</strong>
          </div>
          <div>
            <span>{tx("Tokens", "Token")}</span>
            <strong>{loading ? "..." : formatCount(totalTokens)}</strong>
          </div>
          <div>
            <span>{tx("Latest", "最近")}</span>
            <strong>{formatDateTime(latestRunAt)}</strong>
          </div>
        </div>

        <div className="skill-run-detail-table-shell">
          <table className="skill-run-detail-table">
            <thead>
              <tr>
                <th>{tx("Time", "时间")}</th>
                <th>{tx("Status", "状态")}</th>
                <th>{tx("Duration", "耗时")}</th>
                <th>{tx("Tools", "工具")}</th>
                <th>{tx("Tokens", "Token")}</th>
                <th>{tx("Model", "模型")}</th>
                <th>{tx("Source", "来源")}</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.runId}>
                  <td>
                    <strong>{formatDateTime(run.startedAt)}</strong>
                    <span>{run.finishedAt ? `${tx("Finished", "结束")} ${formatDateTime(run.finishedAt)}` : tx("Running", "运行中")}</span>
                  </td>
                  <td><StatusPill status={run.status} /></td>
                  <td>{formatDuration(run.durationMs)}</td>
                  <td>{formatCount(run.toolCallCount)}</td>
                  <td>{formatCount(run.totalTokens)}</td>
                  <td>{run.modelName ?? "n/a"}</td>
                  <td>
                    <strong>{run.captureMode}</strong>
                    <span>{run.sourceType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? (
            <p className="skill-run-detail-empty">{tx("Loading run details...", "正在加载调用详情...")}</p>
          ) : runs.length === 0 ? (
            <p className="skill-run-detail-empty">{tx("No run detail has been imported for this Skill yet.", "这个技能还没有导入调用明细。")}</p>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function ProjectProfileSummaryPanel({ profile }: { profile: ProjectProfileSummary | null }) {
  const { tx } = useLanguage();

  if (!profile) {
    return (
      <section className="project-profile-summary project-profile-loading">
        <strong>{tx("Loading project Profile...", "正在读取项目 Profile...")}</strong>
      </section>
    );
  }

  const profileStatus =
    profile.status === "ready"
      ? profile.evidenceState === "changed"
        ? tx("Refresh needed", "需要刷新")
        : profile.evidenceState === "fresh"
          ? tx("Ready · Fresh", "已就绪 · 新鲜")
          : tx("Ready · Capture pending", "已就绪 · 待捕获")
      : profile.status === "pending_analysis"
        ? tx("Analysis pending", "待项目分析")
        : profile.status === "invalid"
          ? tx("Invalid Profile", "Profile 配置无效")
          : tx("Not created", "未创建");
  const profileTone =
    profile.status === "ready" && profile.evidenceState === "fresh"
      ? "ready"
      : profile.status === "ready"
        ? "attention"
        : "pending";
  const stackItems = [
    ...profile.detectedLanguages,
    ...profile.frameworks,
    ...profile.runtimes
  ].filter((item, index, items) => items.indexOf(item) === index);
  const commandEntries = Object.entries(profile.commands).filter(([, values]) => values.length > 0);
  const conventionEntries = Object.entries(profile.conventions).filter(([, values]) => values.length > 0);

  return (
    <section className="project-profile-summary">
      <div className="project-profile-head">
        <div>
          <span className="os-module-kicker">{tx("Project Profile", "项目 Profile")}</span>
          <strong>{profile.projectName ?? tx("Project facts", "项目事实")}</strong>
          <small>
            {tx(
              "Cached project facts reused by the Skills Workflow.",
              "供 skills-workflow 复用的项目事实缓存。"
            )}
          </small>
        </div>
        <span className={`project-profile-status tone-${profileTone}`}>{profileStatus}</span>
      </div>

      <div className="project-profile-meta-grid">
        <div>
          <span>{tx("Declared stack", "声明技术栈")}</span>
          <strong>{profile.declaredStack ?? tx("Not analyzed", "尚未分析")}</strong>
        </div>
        <div>
          <span>{tx("Evidence", "证据")}</span>
          <strong>{profile.evidenceCount ? formatCount(profile.evidenceCount) : "-"}</strong>
          <small>{formatDateTime(profile.capturedAt ?? profile.lastCheckedAt)}</small>
        </div>
        <div>
          <span>{tx("Decisions", "决策记忆")}</span>
          <strong>{formatCount(profile.activeDecisionCount)} / {formatCount(profile.decisionCount)}</strong>
          <small>{tx("active / total", "有效 / 总数")}</small>
        </div>
      </div>

      {stackItems.length > 0 ? (
        <div className="project-profile-chip-group">
          <span>{tx("Stack signals", "技术栈信号")}</span>
          <div>{stackItems.slice(0, 8).map((item) => <span key={item}>{item}</span>)}</div>
        </div>
      ) : null}

      {profile.modules.length > 0 ? (
        <div className="project-profile-modules">
          <div className="project-profile-subhead">
            <strong>{tx("Architecture modules", "架构模块")}</strong>
            <span>{formatCount(profile.modules.length)}</span>
          </div>
          <div className="project-profile-module-list">
            {profile.modules.slice(0, 4).map((module) => (
              <div key={`${module.name}-${module.entry ?? "module"}`}>
                <strong>{module.name}</strong>
                <span>{module.responsibility ?? module.entry ?? tx("No summary", "暂无摘要")}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {(commandEntries.length > 0 || conventionEntries.length > 0) ? (
        <div className="project-profile-footer-grid">
          <div>
            <span>{tx("Known commands", "已知命令")}</span>
            <p>
              {commandEntries.slice(0, 3).map(([name, values]) => `${name}: ${values[0]}`).join(" · ") ||
                tx("Not recorded", "未记录")}
            </p>
          </div>
          <div>
            <span>{tx("Unknowns", "待确认项")}</span>
            <p>
              {profile.unknowns.slice(0, 2).join(" · ") || tx("No open unknowns recorded", "没有记录待确认项")}
            </p>
          </div>
        </div>
      ) : null}

      {profile.changedEvidence.length > 0 ? (
        <div className="project-profile-change-notice">
          <strong>{tx("Changed evidence", "发生变化的证据")}</strong>
          <span>{profile.changedEvidence.slice(0, 3).join(" · ")}</span>
        </div>
      ) : null}
    </section>
  );
}

function ProjectAssetDetailPanel({
  project,
  profile,
  currentProjectRoot,
  localSkills,
  recentRuns,
  heartbeatEntries,
  telemetryMode,
  backgroundWatchAllowed,
  runtimeRefreshResult,
  busyAction,
  busy,
  onScanProject,
  onRefreshRuntimeEvidence,
  onEnableTelemetry,
  onToggleMonitoring,
  onUpdateMonitoringInterval,
  onRenameProject,
  onClose
}: {
  project: ManagedProject | null;
  profile: ProjectProfileSummary | null;
  currentProjectRoot: string;
  localSkills: SkillSummary[];
  recentRuns: SkillRunSummary[];
  heartbeatEntries: ProjectHeartbeatEntry[];
  telemetryMode: TelemetryMode | "missing";
  backgroundWatchAllowed: boolean;
  runtimeRefreshResult: ProjectRuntimeEvidenceRefreshResult | null;
  busyAction: string | null;
  busy: boolean;
  onScanProject: (project: ManagedProject) => void;
  onRefreshRuntimeEvidence: (project: ManagedProject) => void;
  onEnableTelemetry: (project: ManagedProject) => void;
  onToggleMonitoring: (project: ManagedProject, enabled: boolean) => void;
  onUpdateMonitoringInterval: (project: ManagedProject, intervalMs: number) => void;
  onRenameProject: (project: ManagedProject, name: string) => void;
  onClose?: () => void;
}) {
  const { tx } = useLanguage();
  const [projectNameDraft, setProjectNameDraft] = useState(project?.name ?? "");
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(project?.lastScanAt ?? null);
  const projectPath = normalizeProjectPath(project?.path ?? "");
  const visibleSkills = projectPath
    ? localSkills.filter((skill) => isPathInsideProject(skill.sourcePath, projectPath))
    : [];
  const isLoadedProject = visibleSkills.length > 0 || Boolean(project && project.path === normalizeProjectPath(currentProjectRoot));
  const projectSkillIds = new Set(visibleSkills.map((skill) => skill.id));
  const projectRuns = visibleSkills.length > 0
    ? recentRuns.filter((run) => projectSkillIds.has(run.skillId))
    : [];
  const projectTotalRuns = visibleSkills.reduce((sum, skill) => sum + skill.runtime.totalRuns, 0);
  const projectTotalTokens = visibleSkills.reduce((sum, skill) => sum + skill.runtime.totalTokens, 0);
  const projectCompletedRuns = projectRuns.filter((run) => run.status === "completed").length;
  const projectSuccessRate = projectRuns.length > 0 ? `${Math.round((projectCompletedRuns / projectRuns.length) * 100)}%` : "n/a";
  const workflowStatus = project?.workflowApplied
    ? tx("Recommended workflow applied", "推荐工作流已应用")
    : tx("Workflow not applied", "未应用工作流");
  const projectRuntimeResult =
    runtimeRefreshResult?.projectRoot === projectPath ? runtimeRefreshResult : null;
  const detectedWorkspaceRef = getLatestObservedWorkspace(projectRuntimeResult) ?? project?.lastObservedWorkspaceRef ?? null;
  const workspaceMatchesProject = Boolean(
    detectedWorkspaceRef && isPathInsideProject(detectedWorkspaceRef, projectPath)
  );
  const connectionCheckedAt = projectRuntimeResult?.refreshedAt ?? project?.lastConnectionCheckAt ?? null;
  const projectHeartbeatEntries = heartbeatEntries.filter((entry) => entry.projectPath === projectPath);
  const telemetryReady = telemetryMode !== "missing" && telemetryMode !== "disabled";
  const runtimeRefreshBusy = busyAction === "runtime-refresh";
  const projectScanBusy = busyAction === "project-scan";
  const skillCount = isLoadedProject
    ? visibleSkills.length
    : project?.skillsFound ?? 0;
  const projectRunTimes = projectRuns
    .map((run) => run.finishedAt ?? run.startedAt)
    .filter(Boolean)
    .sort();
  const latestProjectRunAt = projectRunTimes.length > 0 ? projectRunTimes[projectRunTimes.length - 1] : null;
  const projectRunHeartbeatEntries = buildProjectRunHeartbeatEntries(projectPath, projectRuns, (run) =>
    tx(
      `${run.skillName} · ${run.status} · ${formatCount(run.toolCallCount)} tool call(s)`,
      `${run.skillName} · ${run.status} · ${formatCount(run.toolCallCount)} 次工具调用`
    )
  );
  const combinedHeartbeatEntries = [...projectRunHeartbeatEntries, ...projectHeartbeatEntries].sort(
    (left, right) => new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime()
  );
  const heartbeatObservedAt = latestProjectRunAt ?? project?.lastScanAt ?? lastHeartbeatAt;
  const heartbeatIntervalLabel =
    project?.monitoringIntervalMs === 30000
      ? tx("30 seconds", "30 秒")
      : project?.monitoringIntervalMs === 120000
        ? tx("2 minutes", "2 分钟")
      : tx("1 minute", "1 分钟");
  const runtimeDiagnostics = (() => {
    if (!project) {
      return [];
    }
    if (skillCount === 0) {
      return [
        {
          tone: "warning",
          title: tx("No project Skills indexed", "尚未索引项目技能"),
          detail: tx(
            "Scan this project first. If the folder is empty, apply the recommended skills-workflow.",
            "请先扫描该项目。如果目录为空，可应用推荐技能工作流。"
          )
        }
      ];
    }
    if (!telemetryReady) {
      return [
        {
          tone: "warning",
          title: tx("Runtime telemetry is not enabled", "运行遥测未开启"),
          detail: tx(
            `${skillCount} Skill(s) were indexed, but usage counts cannot refresh until telemetry is enabled.`,
            `已索引 ${skillCount} 个技能，但开启遥测前无法刷新调用次数。`
          )
        }
      ];
    }
    if (detectedWorkspaceRef && !workspaceMatchesProject) {
      return [
        {
          tone: "warning",
          title: tx("Codex directory does not match", "Codex 目录不匹配"),
          detail: tx(
            `Detected ${detectedWorkspaceRef}; expected ${projectPath}. Start a new Codex task from the expected directory, then refresh runtime evidence.`,
            `检测目录：${detectedWorkspaceRef}；期望目录：${projectPath}。请从期望目录新建 Codex 任务，再刷新运行证据。`
          )
        }
      ];
    }
    if (projectRuntimeResult?.errors.length) {
      return [
        {
          tone: "warning",
          title: tx("Runtime import needs attention", "运行导入需要处理"),
          detail: projectRuntimeResult.errors[0]
        }
      ];
    }
    if (projectRuntimeResult?.status === "no_ready_sources") {
      return [
        {
          tone: "warning",
          title: tx("No readable local session source", "没有可读取的本地会话来源"),
          detail: tx(
            "Codex or Claude Code session logs were not found. Open a session in this project, then refresh again.",
            "未找到 Codex 或 Claude Code 会话日志。请在该项目中打开会话后再次刷新。"
          )
        }
      ];
    }
    if (projectRuntimeResult?.status === "no_importable_runs") {
      return [
        {
          tone: "warning",
          title: tx("No project Skill run detected", "未检测到项目技能运行"),
          detail: tx(
            "The sessions were readable, but no imported event matched this project and its local Skills. Check whether Codex loaded or referenced the project Skill names.",
            "会话可读取，但没有事件同时命中该项目和本地技能。请检查 Codex 是否加载或引用了项目技能名称。"
          )
        }
      ];
    }
    if (projectRuntimeResult?.status === "connected_no_skill_runs") {
      return [
        {
          tone: "info",
          title: tx("Codex directory connected", "Codex 目录已连接"),
          detail: tx(
            "A Codex session matches this project. No project Skill invocation has been detected yet.",
            "已检测到该项目的 Codex 会话，但尚未检测到项目技能调用。"
          )
        }
      ];
    }
    if (projectTotalRuns === 0) {
      return [
        {
          tone: "info",
          title: tx("Runtime evidence not imported yet", "尚未导入运行证据"),
          detail: tx(
            "Refresh runtime evidence to read local Codex sessions for this project.",
            "刷新运行证据，读取该项目对应的本地 Codex 会话。"
          )
        }
      ];
    }
    return [
      {
        tone: "success",
        title: tx("Runtime evidence is linked", "运行证据已关联"),
        detail: tx(
          `${projectTotalRuns} run(s) are linked to this project's Skills.`,
          `已有 ${projectTotalRuns} 条运行关联到该项目技能。`
        )
      }
    ];
  })();

  useEffect(() => {
    setProjectNameDraft(project?.name ?? "");
    setLastHeartbeatAt(project?.lastScanAt ?? null);
  }, [project?.id, project?.name]);

  useEffect(() => {
    setLastHeartbeatAt(project?.lastScanAt ?? null);
  }, [project?.lastScanAt]);

  function refreshProjectHeartbeat() {
    if (!project || busy) {
      return;
    }
    setLastHeartbeatAt(new Date().toISOString());
    onRefreshRuntimeEvidence(project);
  }

  return (
    <article className="project-asset-detail-panel entity-project">
      <div className="project-asset-detail-head">
        <div>
          <span className="os-module-kicker">{tx("Project Detail", "项目详情")}</span>
          <h3>{project ? project.name : tx("Select a project", "选择一个项目")}</h3>
          <p>
            {project
              ? tx("Review this project's collected Skills, workflow state, and heartbeat summary.", "查看这个项目已收集的技能、工作流状态和心跳摘要。")
              : tx("Click the Skills column or View action in the bound project table.", "点击已绑定项目表里的技能列或查看按钮。")}
          </p>
        </div>
        {project ? (
          <div className="project-asset-detail-actions">
            <button type="button" className="primary" disabled={busy} onClick={() => onScanProject(project)}>
              {projectScanBusy ? tx("Scanning...", "扫描中...") : tx("Scan Project", "扫描项目")}
            </button>
            {onClose ? (
              <button type="button" className="icon-button" aria-label={tx("Close project detail", "关闭项目详情")} onClick={onClose}>
                ×
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {project ? (
        <>
          <ProjectProfileSummaryPanel profile={profile} />
          <form
            className="project-detail-rename-panel"
            onSubmit={(event) => {
              event.preventDefault();
              onRenameProject(project, projectNameDraft);
            }}
          >
            <label>
              <span>{tx("Display Name", "显示名称")}</span>
              <input
                value={projectNameDraft}
                onChange={(event) => setProjectNameDraft(event.currentTarget.value)}
                placeholder={tx("Project display name", "项目显示名称")}
              />
            </label>
            <button type="submit" disabled={busy || !projectNameDraft.trim()}>
              {tx("Save Name", "保存名称")}
            </button>
          </form>
          <div className="project-heartbeat-panel">
            <div className="project-heartbeat-status">
              <span className={`heartbeat-dot${project.monitoringEnabled ? " live" : ""}`} aria-hidden="true" />
              <div>
                <strong>{tx("Heartbeat Monitor", "心跳监控")}</strong>
                <small>
                  {tx(
                    "Imports local Codex or Claude session evidence for this project.",
                    "导入该项目对应的本地 Codex 或 Claude 会话证据。"
                  )}
                </small>
              </div>
            </div>
            <div className="project-heartbeat-metrics">
              <div>
                <span>{tx("Latest data", "最新数据")}</span>
                <strong>{formatDateTime(heartbeatObservedAt)}</strong>
              </div>
              <div>
                <span>{tx("Interval", "刷新间隔")}</span>
                <strong>{heartbeatIntervalLabel}</strong>
              </div>
              <div>
                <span>{tx("Runs", "运行")}</span>
                <strong>{formatCount(projectTotalRuns)}</strong>
              </div>
              <div>
                <span>{tx("Tokens", "Token")}</span>
                <strong>{formatCount(projectTotalTokens)}</strong>
              </div>
              <div>
                <span>{tx("Mode", "模式")}</span>
                <strong>{telemetryMode}</strong>
              </div>
            </div>
            <div className="project-heartbeat-controls">
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(project.monitoringEnabled)}
                className="switch-control compact"
                onClick={() => onToggleMonitoring(project, !project.monitoringEnabled)}
                disabled={busy || !telemetryReady || !backgroundWatchAllowed}
              >
                <span className="switch-track" aria-hidden="true">
                  <span className="switch-thumb" />
                </span>
                <span>{tx("Auto refresh", "自动刷新")}</span>
                <strong>{project.monitoringEnabled ? tx("On", "已开") : tx("Off", "已关")}</strong>
              </button>
              <label className="project-heartbeat-select">
                <span>{tx("Refresh every", "刷新时间")}</span>
                <select
                  value={project.monitoringIntervalMs}
                  onChange={(event) => onUpdateMonitoringInterval(project, Number(event.currentTarget.value))}
                  disabled={busy}
                >
                  <option value={30000}>{tx("30 seconds", "30 秒")}</option>
                  <option value={60000}>{tx("1 minute", "1 分钟")}</option>
                  <option value={120000}>{tx("2 minutes", "2 分钟")}</option>
                </select>
              </label>
              <button type="button" className="primary" disabled={busy} onClick={refreshProjectHeartbeat}>
                {runtimeRefreshBusy ? tx("Refreshing...", "刷新中...") : tx("Refresh Runtime", "刷新运行")}
              </button>
              {!telemetryReady ? (
                <button type="button" disabled={busy} onClick={() => onEnableTelemetry(project)}>
                  {tx("Enable Telemetry", "开启遥测")}
                </button>
              ) : null}
            </div>
          </div>
          <div className={`project-connection-check${workspaceMatchesProject ? " is-matched" : " needs-connection"}`}>
            <div>
              <span>{tx("Codex connection", "Codex 连接检测")}</span>
              <strong>
                {workspaceMatchesProject
                  ? tx("Project directory matched", "项目目录已匹配")
                  : detectedWorkspaceRef
                    ? tx("Directory mismatch", "目录不匹配")
                    : tx("No project task detected", "未检测到项目任务")}
              </strong>
            </div>
            <div>
              <span>{tx("Detected directory", "检测目录")}</span>
              <code title={detectedWorkspaceRef ?? undefined}>
                {detectedWorkspaceRef ?? tx("No Codex task directory detected", "尚未检测到 Codex 任务目录")}
              </code>
            </div>
            <div>
              <span>{tx("Expected directory", "期望目录")}</span>
              <code title={project.path}>{project.path}</code>
            </div>
            <div>
              <span>{tx("Last checked", "最近检查")}</span>
              <strong>{formatDateTime(connectionCheckedAt)}</strong>
            </div>
          </div>
          <ProjectHeartbeatChart
            entries={combinedHeartbeatEntries}
            latestRunCount={projectTotalRuns}
            totalTokens={projectTotalTokens}
          />
          <div className="project-runtime-diagnostic-list">
            {runtimeDiagnostics.map((item) => (
              <div className={`project-runtime-diagnostic tone-${item.tone}`} key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
            {projectRuntimeResult?.warnings.slice(0, 3).map((warning) => (
              <div className="project-runtime-diagnostic tone-info" key={warning}>
                <strong>{tx("Configuration hint", "配置提示")}</strong>
                <p>{warning}</p>
              </div>
            ))}
          </div>
          <div className="project-asset-detail-metrics">
            <div>
              <span>{tx("Skills", "技能")}</span>
              <strong>{formatCount(skillCount)}</strong>
              <small>{isLoadedProject ? tx("Detailed list loaded", "已加载明细") : tx("Last scan summary", "最近扫描摘要")}</small>
            </div>
            <div>
              <span>{tx("Workflow", "工作流")}</span>
              <strong>{workflowStatus}</strong>
              <small>{tx("Project-level skills-workflow", "项目级 skills-workflow")}</small>
            </div>
            <div>
              <span>{tx("Heartbeat", "心跳")}</span>
              <strong>{formatCount(projectTotalRuns)}</strong>
              <small>{formatCount(projectTotalTokens)} {tx("tokens", "Token")}</small>
            </div>
            <div>
              <span>{tx("Last Scan", "最近扫描")}</span>
              <strong>{formatDateTime(project.lastScanAt)}</strong>
              <small>{project.path}</small>
            </div>
          </div>

          <div className="project-asset-detail-body">
            <section>
              <div className="project-asset-detail-subhead">
                <strong>{tx("Project Skills", "项目技能")}</strong>
                <span>{formatCount(skillCount)}</span>
              </div>
              {visibleSkills.length > 0 ? (
                <div className="project-skill-detail-list">
                  {visibleSkills.slice(0, 8).map((skill) => (
                    <div className="project-skill-detail-row" key={skill.id}>
                      <strong>{skill.displayName}</strong>
                      <span>{skill.sourceType}</span>
                      <span>{tx("Health", "健康")} {skill.health.score}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="project-asset-detail-empty">
                  {project.skillsFound
                    ? tx("This project has a scan summary. Scan it again to load the full Skill list in this session.", "这个项目已有扫描摘要。再次扫描该项目后，可在当前会话加载完整技能列表。")
                    : tx("No Skills recorded yet. Scan this project to collect Skills.", "还没有记录技能。扫描该项目后会收集技能。")}
                </p>
              )}
            </section>

            <section>
              <div className="project-asset-detail-subhead">
                <strong>{tx("Workflow & Evaluation", "工作流与评测")}</strong>
                <span>{isLoadedProject ? tx("Live", "当前") : tx("Summary", "摘要")}</span>
              </div>
              <div className="project-workflow-detail-list">
                <div>
                  <span>{tx("Workflow process", "工作流流程")}</span>
                  <strong>{workflowStatus}</strong>
                </div>
                <div>
                  <span>{tx("Run count", "运行次数")}</span>
                  <strong>{formatCount(projectTotalRuns)}</strong>
                </div>
                <div>
                  <span>{tx("Evaluation effect", "评测效果")}</span>
                  <strong>{projectSuccessRate}</strong>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </article>
  );
}

function WorkflowStarterCard({
  projectRoot,
  preview,
  result,
  busyAction,
  highlighted,
  onPreview,
  onApply,
  onOpenLibrary,
  onOpenEvaluate
}: {
  projectRoot: string;
  preview: WorkflowStarterPreview | null;
  result: WorkflowStarterApplyResult | null;
  busyAction: string | null;
  highlighted?: boolean;
  onPreview: () => void;
  onApply: () => void;
  onOpenLibrary: () => void;
  onOpenEvaluate: () => void;
}) {
  const { tx } = useLanguage();
  const visibleConflicts = preview?.fileConflicts.slice(0, 4) ?? [];
  const visibleFiles = preview?.filesToCreate.slice(0, 6) ?? [];
  const isApplied = result !== null;

  return (
    <article className={`workflow-starter-card entity-project ${highlighted ? "is-highlighted" : ""}`}>
      <div className="workflow-starter-head">
        <div>
          <span className="os-module-kicker">{tx("Recommended skills-workflow", "推荐 skills-workflow")}</span>
          <h3>
            {isApplied
              ? tx("Recommended Skills Workflow Applied", "推荐 skills-workflow 已应用")
              : tx("Apply Recommended Skills Workflow", "应用推荐 skills-workflow")}
          </h3>
          <p>
            {isApplied
              ? tx(
                  "This project now has a local skills-workflow. Review its project Skills in the asset library whenever needed.",
                  "这个项目现在已经有本地 skills-workflow。需要时可在技能库查看它的项目技能。"
                )
              : tx(
                  "This project has no indexed Skills yet. Preview the bundled skills-workflow before adding it into this project folder.",
                  "这个项目还没有已索引 Skill。可以先预览内置 skills-workflow，再应用到该项目文件夹。"
                )}
          </p>
        </div>
        <span className="remote-safety-pill">
          {isApplied ? tx("Ready", "已就绪") : tx("Project only", "仅此项目")}
        </span>
      </div>

      <p className="inline-code">
        {projectRoot || tx("Choose a project folder first.", "请先选择项目文件夹。")}
      </p>

      <div className="workflow-starter-metrics">
        <div>
          <span className="stat-label">{tx("Skills", "技能")}</span>
          <strong>{preview ? preview.skillCount : "24"}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Files", "文件")}</span>
          <strong>{preview ? preview.totalFileCount : "..."}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Conflicts", "冲突")}</span>
          <strong>{preview ? preview.fileConflicts.length : "..."}</strong>
        </div>
      </div>

      {preview ? (
        <div className={`workflow-starter-preview ${preview.canApply ? "ready" : "blocked"}`}>
          <strong>
            {preview.canApply
              ? tx("Preview ready", "预览可应用")
              : tx("Conflicts detected", "检测到冲突")}
          </strong>
          <p>
            {preview.canApply
              ? tx(
                  `${preview.filesToCreate.length} file(s) will be created without overwriting existing files.`,
                  `将创建 ${preview.filesToCreate.length} 个文件，不会覆盖已有文件。`
                )
              : tx(
                  "Existing files must be resolved before this starter can write anything.",
                  "应用前必须先处理已有文件冲突。"
                )}
          </p>
          <div className="workflow-starter-file-list">
            {(visibleConflicts.length > 0 ? visibleConflicts : visibleFiles).map((file) => (
              <span key={file}>{file}</span>
            ))}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="workflow-starter-applied">
          <strong>{tx("Workflow applied", "工作流已应用")}</strong>
          <p>
            {tx(
              `${result.copiedFileCount} file(s) copied into the selected project.`,
              `已复制 ${result.copiedFileCount} 个文件到所选项目。`
            )}
          </p>
          <div className="workflow-starter-next">
            <span>{tx("Next", "下一步")}</span>
            <strong>{tx("Review the indexed project Skills or open the project report.", "查看已索引的项目技能，或打开项目报告。")}</strong>
          </div>
        </div>
      ) : null}

      <div className="os-card-actions">
        {isApplied ? (
          <>
            <button type="button" onClick={onOpenLibrary} disabled={busyAction !== null}>
              {tx("Review Project Skills", "查看项目技能")}
            </button>
            <button type="button" className="primary" onClick={onOpenEvaluate} disabled={busyAction !== null}>
              {tx("Open Reports", "打开评测报告")}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onPreview} disabled={busyAction !== null}>
              {busyAction === "workflow-preview"
                ? tx("Previewing...", "预览中...")
                : tx("Preview skills-workflow", "预览 skills-workflow")}
            </button>
            <button
              type="button"
              className="primary"
              onClick={onApply}
              disabled={busyAction !== null || !preview?.canApply}
            >
              {busyAction === "workflow-apply"
                ? tx("Applying...", "应用中...")
                : preview
                  ? tx("Apply skills-workflow", "应用 skills-workflow")
                  : tx("Preview First", "先预览")}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function ProposalCards({
  proposals,
  busy,
  activeProposalId,
  selectedGraphNodeId,
  resolveGraphNode,
  onInspectGraphNode,
  onStatusChange
}: {
  proposals: OptimizationProposal[];
  busy: boolean;
  activeProposalId: string | null;
  selectedGraphNodeId: string | null;
  resolveGraphNode: (nodeType: string, refId: string | null | undefined) => GraphNodeSummary | null;
  onInspectGraphNode: (node: GraphNodeSummary) => void;
  onStatusChange: (proposalId: string, status: OptimizationProposalStatus) => Promise<void>;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (proposals.length === 0) {
    return (
      <div className="empty-state">
        <h3>{tx("No proposals in this view", "此视图没有建议")}</h3>
        <p>
          {tx(
            "Refresh the proposal engine after scanning or importing telemetry to generate actionable optimization ideas.",
            "扫描或导入遥测后刷新建议引擎，即可生成可执行的优化思路。"
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="proposal-grid">
      {proposals.map((proposal) => {
        const isActive = busy && activeProposalId === proposal.id;
        const proposalSkillNode = resolveGraphNode("skill", proposal.skillId);
        const nextStep =
          proposal.status === "open"
            ? tx("Next: inspect evidence, then accept or dismiss this work.", "下一步：先看证据，再接受或忽略这项工作。")
            : proposal.status === "accepted"
              ? tx("Next: implement through Apply Center or a manual code change, then verify.", "下一步：通过应用中心或手动代码变更实现，然后验证。")
              : proposal.status === "resolved"
                ? tx("Closed: keep it for audit; reopen only if new telemetry says it regressed.", "已关闭：保留审计；只有新遥测显示回退时再重新打开。")
                : tx("Dismissed: evidence is retained locally and can be reopened later.", "已忽略：证据仍保留在本地，后续可重新打开。");

        return (
          <article className="proposal-card" key={proposal.id}>
            <div className="proposal-card-head">
              <div>
                <div className="proposal-pills">
                  <SeverityPill severity={proposal.severity} />
                  <ProposalStatusPill status={proposal.status} />
                </div>
                <h3>{formatProposalTitle(proposal, mode)}</h3>
                <p className="muted">
                  {proposal.skillName} · {tx("updated", "更新于")} {formatDateTime(proposal.updatedAt)}
                </p>
              </div>
              <GraphPanelInspectAction
                targetNode={proposalSkillNode}
                selectedNodeId={selectedGraphNodeId}
                onInspectNode={onInspectGraphNode}
                label={tx("Inspect Skill", "检查 Skill")}
              />
            </div>

            <p>{formatProposalSummary(proposal, mode)}</p>

            <div className="proposal-next-step">
              <span>{tx("Workflow State", "流程状态")}</span>
              <strong>{nextStep}</strong>
            </div>

            <div className="proposal-meta">
              <div>
                <span className="stat-label">{tx("Expected Benefit", "预期收益")}</span>
                <strong>{formatProposalBenefit(proposal, mode)}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Proposal Type", "建议类型")}</span>
                <strong>{formatProposalType(proposal.proposalType, mode)}</strong>
              </div>
            </div>

            {proposal.evidence.length > 0 ? (
              <div className="proposal-evidence">
                <span className="stat-label">{tx("Why This Proposal Appeared", "为什么出现此建议")}</span>
                <div className="proposal-evidence-list">
                  {proposal.evidence.map((evidence) => (
                    <div className="proposal-evidence-item" key={evidence.id}>
                      <div className="proposal-evidence-head">
                        <span className="mini-pill">{formatProposalEvidenceType(evidence.evidenceType, mode)}</span>
                        <span className="muted">
                          {evidence.refId ?? tx("local evidence", "本地证据")} · {formatDateTime(evidence.createdAt)}
                        </span>
                      </div>
                      <p>{formatProposalEvidenceSummary(evidence, mode)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {proposal.actions.length > 0 ? (
              <div className="proposal-timeline">
                <span className="stat-label">{tx("Local Action Timeline", "本地动作时间线")}</span>
                <div className="proposal-timeline-list">
                  {proposal.actions.map((action) => (
                    <div className="proposal-timeline-item" key={action.id}>
                      <div className="proposal-timeline-head">
                        <span className="mini-pill mini-pill-strong">
                          {formatProposalActionType(action.actionType, mode)}
                        </span>
                        <span className="muted">
                          {formatProposalActorType(action.actorType, mode)} · {formatDateTime(action.createdAt)}
                        </span>
                      </div>
                      <p>{formatProposalActionSummary(action, mode)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="proposal-actions">
              {proposal.status === "open" ? (
                <>
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => void onStatusChange(proposal.id, "accepted")}
                  >
                    {isActive ? tx("Updating...", "更新中...") : tx("Accept", "接受")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onStatusChange(proposal.id, "dismissed")}
                  >
                    {tx("Dismiss", "忽略")}
                  </button>
                </>
              ) : null}

              {proposal.status === "accepted" ? (
                <>
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => void onStatusChange(proposal.id, "resolved")}
                  >
                    {isActive ? tx("Updating...", "更新中...") : tx("Mark Resolved", "标记解决")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onStatusChange(proposal.id, "open")}
                  >
                    {tx("Reopen", "重新打开")}
                  </button>
                </>
              ) : null}

              {(proposal.status === "dismissed" || proposal.status === "resolved") ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onStatusChange(proposal.id, "open")}
                >
                  {isActive ? tx("Updating...", "更新中...") : tx("Reopen", "重新打开")}
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CountBadges({
  items,
  emptyCopy
}: {
  items: GraphTypeCount[];
  emptyCopy: string;
}) {
  if (items.length === 0) {
    return <p className="muted">{emptyCopy}</p>;
  }

  return (
    <div className="count-badge-list">
      {items.map((item) => (
        <div className="count-badge" key={`${item.key}-${item.count}`}>
          <span className="stat-label">{formatGraphLabel(item.key)}</span>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

function GraphNodeList({
  nodes,
  selectedNodeId,
  interactiveNodeIds,
  emptyCopy,
  onSelectedNodeChange
}: {
  nodes: GraphNodeSummary[];
  selectedNodeId?: string | null;
  interactiveNodeIds?: ReadonlySet<string>;
  emptyCopy?: string;
  onSelectedNodeChange?: (nodeId: string | null) => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (nodes.length === 0) {
    return (
      <div className="empty-state">
        <h3>{tx("No graph nodes yet", "还没有图谱节点")}</h3>
        <p>
          {emptyCopy ??
            tx("Refresh the graph after scanning skills to generate the first relationship snapshot.", "扫描 Skill 后刷新图谱，即可生成第一份关系快照。")}
        </p>
      </div>
    );
  }

  return (
    <div className="graph-list">
      {nodes.map((node) => {
        const metaSummary = getGraphNodeMetaSummary(node);
        const isSelected = selectedNodeId === node.id;
        const isInteractive =
          interactiveNodeIds && onSelectedNodeChange ? interactiveNodeIds.has(node.id) : false;
        const content = (
          <>
            <div>
              <strong>{node.displayName}</strong>
              <div className="muted">
                {formatGraphLabel(node.nodeType)} · {tx("degree", "度")} {node.degree}
              </div>
              {metaSummary ? <div className="muted">{metaSummary}</div> : null}
            </div>
            <div className="graph-item-side">
              <div className="proposal-pills">
                {isSelected ? <span className="mini-pill mini-pill-strong">{tx("selected", "已选择")}</span> : null}
                {!isInteractive && interactiveNodeIds ? (
                  <span className="mini-pill">{tx("projected", "投影")}</span>
                ) : null}
              </div>
              <span className="graph-ref">{node.refId}</span>
            </div>
          </>
        );

        if (isInteractive && onSelectedNodeChange) {
          return (
            <button
              key={node.id}
              type="button"
              className={[
                "graph-item",
                "graph-item-button",
                isSelected ? "selected" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectedNodeChange(isSelected ? null : node.id)}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            className={["graph-item", isSelected ? "selected" : "", !isInteractive && interactiveNodeIds ? "projected" : ""]
              .filter(Boolean)
              .join(" ")}
            key={node.id}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

function GraphEdgeList({
  edges,
  selectedNodeId,
  emptyCopy
}: {
  edges: GraphEdgeSummary[];
  selectedNodeId?: string | null;
  emptyCopy?: string;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (edges.length === 0) {
    return (
      <div className="empty-state">
        <h3>{tx("No graph edges yet", "还没有图谱边")}</h3>
        <p>
          {emptyCopy ??
            tx("Import telemetry or generate proposals so the graph has relationships to show.", "导入遥测或生成建议后，图谱会展示关系。")}
        </p>
      </div>
    );
  }

  return (
    <div className="graph-list">
      {edges.map((edge) => {
        const metaSummary = getGraphEdgeMetaSummary(edge);
        const isSelectedEdge = Boolean(
          selectedNodeId &&
            (edge.fromNodeId === selectedNodeId || edge.toNodeId === selectedNodeId)
        );

        return (
          <div
            className={[
              "graph-item",
              selectedNodeId ? (isSelectedEdge ? "selected" : "dimmed") : ""
            ]
              .filter(Boolean)
              .join(" ")}
            key={edge.id}
          >
            <div>
              <strong>
                {edge.fromDisplayName} → {edge.toDisplayName}
              </strong>
              <div className="muted">
                {formatGraphLabel(edge.edgeType)} · {tx("weight", "权重")} {edge.weight}
              </div>
              {metaSummary ? <div className="muted">{metaSummary}</div> : null}
            </div>
            <div className="graph-item-side">
              <div className="proposal-pills">
                {isSelectedEdge ? <span className="mini-pill mini-pill-strong">{tx("selected", "已选择")}</span> : null}
              </div>
              <span className="graph-ref">{formatDateTime(edge.lastSeenAt)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GraphQuickSearch({
  nodes,
  query,
  matches,
  searchScopeEnabled,
  selectedNodeId,
  hasPinnedNeighborhood,
  onQueryChange,
  onSearchScopeEnabledChange,
  onSelectedNodeChange
}: {
  nodes: GraphNodeSummary[];
  query: string;
  matches: GraphSearchMatchEntry[];
  searchScopeEnabled: boolean;
  selectedNodeId: string | null;
  hasPinnedNeighborhood: boolean;
  onQueryChange: (value: string) => void;
  onSearchScopeEnabledChange: (next: boolean) => void;
  onSelectedNodeChange: (nodeId: string | null) => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);
  const normalizedQuery = normalizeGraphSearchValue(query);
  const sortedNodes = [...nodes].sort(sortGraphNodesByPriority);
  const suggestedNodes = sortedNodes.slice(0, 6);
  const resultCount = normalizedQuery.length > 0 ? matches.length : suggestedNodes.length;

  if (nodes.length === 0) {
    return (
      <article className="leaderboard-card graph-search-panel">
        <div className="section-headline compact">
          <div>
            <h3>{tx("Local Graph Search", "本地图谱搜索")}</h3>
            <p className="muted">
              {tx("Search becomes available as soon as the local graph snapshot contains nodes.", "本地图谱快照包含节点后即可搜索。")}
            </p>
          </div>
        </div>

        <div className="empty-inline graph-focus-empty">
          <span className="muted">
            {tx("Refresh the graph after indexing or telemetry import to enable local node jump.", "索引或导入遥测后刷新图谱，即可启用本地节点跳转。")}
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className="leaderboard-card graph-search-panel">
      <div className="section-headline compact">
        <div>
          <h3>{tx("Local Graph Search", "本地图谱搜索")}</h3>
          <p className="muted">
            {tx(
              "Jump to a node by display name, ref id, or type without rescanning directories or rereading `SKILL.md` files.",
              "可按显示名、ref id 或类型跳转节点，无需重新扫描目录或重读 `SKILL.md` 文件。"
            )}
          </p>
        </div>
      </div>

      <div className="graph-search-toolbar">
        <label className="graph-search-field">
          <span>{tx("Jump To Node", "跳转到节点")}</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={tx("Search node name, ref id, type, or summary", "搜索节点名称、ref id、类型或摘要")}
          />
        </label>

        <div className="graph-search-actions">
          <div className="proposal-pills">
            <span className="mini-pill mini-pill-strong">
              {hasPinnedNeighborhood ? tx("snapshot + pinned scope", "快照 + 固定范围") : tx("snapshot scope", "快照范围")}
            </span>
            <span className="mini-pill">
              {resultCount} {normalizedQuery.length > 0 ? tx("matches", "匹配") : tx("suggestions", "建议")}
            </span>
            {searchScopeEnabled ? (
              <span className="mini-pill">{tx("topology filtered", "拓扑已过滤")}</span>
            ) : null}
          </div>

          <div className="toolbar wrap graph-search-button-row">
            {normalizedQuery.length > 0 && matches.length > 0 ? (
              <button
                type="button"
                className={searchScopeEnabled ? undefined : "primary"}
                onClick={() => onSearchScopeEnabledChange(!searchScopeEnabled)}
              >
                {searchScopeEnabled ? tx("Show Full Topology", "显示完整拓扑") : tx("Focus Matches in Topology", "在拓扑中聚焦匹配")}
              </button>
            ) : null}
            {query.length > 0 ? (
              <button type="button" onClick={() => onQueryChange("")}>
                {tx("Clear Query", "清空查询")}
              </button>
            ) : null}
            {selectedNodeId ? (
              <button type="button" onClick={() => onSelectedNodeChange(null)}>
                {tx("Clear Selection", "清除选择")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {searchScopeEnabled && normalizedQuery.length > 0 ? (
        <div className="graph-search-scope-banner">
          <div>
            <span className="stat-label">{tx("Topology Scope", "拓扑范围")}</span>
            <strong>{resultCount} {tx("matches", "匹配")} + {tx("direct relationships", "直接关系")}</strong>
            <div className="muted">
              {tx("The topology view is temporarily narrowed to the current local matches for this query.", "拓扑视图会临时收窄到当前查询的本地匹配结果。")}
            </div>
          </div>
          <button type="button" onClick={() => onSearchScopeEnabledChange(false)}>
            {tx("Reset Scope", "重置范围")}
          </button>
        </div>
      ) : null}

      <div className="graph-search-results">
        {normalizedQuery.length > 0 ? (
          matches.length > 0 ? (
            matches.map((entry) => (
              <button
                key={entry.node.id}
                type="button"
                className={[
                  "graph-search-item",
                  selectedNodeId === entry.node.id ? "selected" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelectedNodeChange(entry.node.id)}
              >
                <div className="graph-search-item-main">
                  <div className="graph-search-item-head">
                    <strong>{entry.node.displayName}</strong>
                    <div className="proposal-pills">
                      {selectedNodeId === entry.node.id ? (
                        <span className="mini-pill mini-pill-strong">{tx("selected", "已选择")}</span>
                      ) : null}
                      <span className="mini-pill">{entry.matchLabel}</span>
                    </div>
                  </div>
                  <div className="muted graph-search-item-copy">
                    {formatGraphLabel(entry.node.nodeType)} · {tx("degree", "度")} {entry.node.degree}
                  </div>
                  {getGraphNodeMetaSummary(entry.node) ? (
                    <div className="muted graph-search-item-copy">
                      {getGraphNodeMetaSummary(entry.node)}
                    </div>
                  ) : null}
                </div>
                <span className="graph-ref">{entry.node.refId}</span>
              </button>
            ))
          ) : (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">
                {tx("No node in the current local graph scope matches this query.", "当前本地图谱范围内没有节点匹配此查询。")}
              </span>
            </div>
          )
        ) : (
          suggestedNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className={[
                "graph-search-item",
                selectedNodeId === node.id ? "selected" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectedNodeChange(node.id)}
            >
              <div className="graph-search-item-main">
                <div className="graph-search-item-head">
                  <strong>{node.displayName}</strong>
                  <div className="proposal-pills">
                    {selectedNodeId === node.id ? (
                      <span className="mini-pill mini-pill-strong">{tx("selected", "已选择")}</span>
                    ) : null}
                    <span className="mini-pill">{tx("top degree", "高连接度")}</span>
                  </div>
                </div>
                <div className="muted graph-search-item-copy">
                  {formatGraphLabel(node.nodeType)} · {tx("degree", "度")} {node.degree}
                </div>
                {getGraphNodeMetaSummary(node) ? (
                  <div className="muted graph-search-item-copy">{getGraphNodeMetaSummary(node)}</div>
                ) : null}
              </div>
              <span className="graph-ref">{node.refId}</span>
            </button>
          ))
        )}
      </div>
    </article>
  );
}

function GraphScopeStack({
  snapshot,
  selectedNode,
  pinnedNeighborhood,
  searchScopeSummary,
  selectedTracePath,
  onResetToSnapshot,
  onResetTopology,
  onClearSearchScope,
  onClearTraceSelection,
  onClearSelection
}: {
  snapshot: GraphSnapshot | null;
  selectedNode: GraphNodeSummary | null;
  pinnedNeighborhood: GraphNeighborhood | null;
  searchScopeSummary: { query: string; matchCount: number } | null;
  selectedTracePath: GraphTracePath | null;
  onResetToSnapshot: () => void;
  onResetTopology: () => void;
  onClearSearchScope: () => void;
  onClearTraceSelection: () => void;
  onClearSelection: () => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (!snapshot) {
    return null;
  }

  const hasPinnedNeighborhood = Boolean(
    pinnedNeighborhood &&
      pinnedNeighborhood.generatedAt === snapshot.generatedAt &&
      pinnedNeighborhood.centerNode
  );
  const layers: GraphScopeLayerEntry[] = [
    {
      key: "snapshot",
      tone: "baseline",
      title: tx("Snapshot Baseline", "快照基线"),
      detail: `${formatCount(snapshot.totalNodes)} ${tx("nodes", "节点")} · ${formatCount(snapshot.totalEdges)} ${tx("edges", "边")}`,
      description:
        tx("The topology starts from the latest local graph snapshot before temporary focus layers are applied.", "拓扑会先从最新本地图谱快照开始，再叠加临时焦点层。"),
      pills: [formatDateTime(snapshot.generatedAt)]
    }
  ];

  if (hasPinnedNeighborhood && pinnedNeighborhood?.centerNode) {
    layers.push({
      key: "pinned",
      tone: "pinned",
      title: tx("Pinned Neighborhood", "固定邻域"),
      detail: pinnedNeighborhood.centerNode.displayName,
      description:
        pinnedNeighborhood.hiddenNodeCount > 0 || pinnedNeighborhood.hiddenEdgeCount > 0
          ? tx(
              `Adds a bounded local neighborhood around the pinned node while keeping ${pinnedNeighborhood.hiddenNodeCount} node(s) and ${pinnedNeighborhood.hiddenEdgeCount} edge(s) outside this visible window.`,
              `围绕固定节点添加有界本地邻域，同时仍有 ${pinnedNeighborhood.hiddenNodeCount} 个节点和 ${pinnedNeighborhood.hiddenEdgeCount} 条边位于当前可见窗口之外。`
            )
          : tx("Expands the snapshot with the complete bounded local neighborhood around the pinned node.", "用固定节点周围完整的有界本地邻域扩展快照。"),
      pills: [
        `${formatCount(pinnedNeighborhood.totalNodeCount)} ${tx("nodes", "节点")}`,
        `${formatCount(pinnedNeighborhood.totalEdgeCount)} ${tx("edges", "边")}`
      ],
      actionLabel: tx("Reset Topology", "重置拓扑"),
      onAction: onResetTopology
    });
  }

  if (searchScopeSummary) {
    layers.push({
      key: "search",
      tone: "search",
      title: tx("Search Focus", "搜索焦点"),
      detail: `"${searchScopeSummary.query}"`,
      description:
        tx(
          `Narrows the current topology to ${searchScopeSummary.matchCount} matched node(s) and their direct relationships without rescanning local roots.`,
          `不重新扫描本地根目录，将当前拓扑收窄到 ${searchScopeSummary.matchCount} 个匹配节点及其直接关系。`
        ),
      pills: [
        `${formatCount(searchScopeSummary.matchCount)} ${tx("matches", "匹配")}`
      ],
      actionLabel: tx("Show Full Topology", "显示完整拓扑"),
      onAction: onClearSearchScope
    });
  }

  if (selectedTracePath) {
    layers.push({
      key: "trace",
      tone: "trace",
      title: tx("Trace Overlay", "链路投影"),
      detail: selectedTracePath.targetNode.displayName,
      description:
        tx("Projects one bounded multi-hop explanation path on top of the current topology while keeping the underlying map read-only.", "在当前拓扑上投影一条有界多跳解释路径，同时保持底层地图只读。"),
      pills: [
        `${selectedTracePath.hopCount} ${tx("hops", "跳")}`,
        `${tx("weight", "权重")} ${selectedTracePath.aggregateWeight}`
      ],
      actionLabel: tx("Clear Trace Focus", "清除链路焦点"),
      onAction: onClearTraceSelection
    });
  }

  if (selectedNode) {
    layers.push({
      key: "selection",
      tone: "selection",
      title: tx("Selected Node", "选中节点"),
      detail: selectedNode.displayName,
      description:
        tx("Drives the focus analysis and relationship highlighting for the current local graph view without loading extra remote context.", "驱动当前本地图谱视图的焦点分析与关系高亮，不加载额外远程上下文。"),
      pills: [
        formatGraphLabel(selectedNode.nodeType),
        `${tx("degree", "度")} ${selectedNode.degree}`
      ],
      actionLabel: tx("Clear Selection", "清除选择"),
      onAction: onClearSelection
    });
  }

  const activeLayerCount = Math.max(layers.length - 1, 0);
  const currentLayerKey = layers[layers.length - 1]?.key;

  return (
    <article className="leaderboard-card graph-scope-card">
      <div className="section-headline compact">
        <div>
          <h3>{tx("Current Graph Scope", "当前图谱范围")}</h3>
          <p className="muted">
            {tx(
              "This stack shows how the current local topology was narrowed or expanded from the base snapshot. Every layer is reversible and stays inside the already loaded graph window.",
              "此范围栈展示当前本地拓扑如何从基础快照被收窄或扩展。每一层都可撤销，并且只在已加载图谱窗口内生效。"
            )}
          </p>
        </div>
        <div className="proposal-pills">
          <span className="mini-pill mini-pill-strong">
            {activeLayerCount} {tx("active layers", "活动层")}
          </span>
          <span className="mini-pill">{layers.length} {tx("total steps", "总步骤")}</span>
          {activeLayerCount > 0 ? (
            <button type="button" onClick={onResetToSnapshot}>
              {tx("Return To Snapshot", "返回快照")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="graph-scope-list">
        {layers.map((layer, index) => {
          const isCurrentLayer = currentLayerKey === layer.key;

          return (
            <div
              className={[
                "graph-scope-item",
                `graph-scope-item-${layer.tone}`,
                isCurrentLayer ? "current" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              key={layer.key}
            >
              <div className="graph-scope-item-main">
                <div className="graph-scope-item-head">
                  <span className="graph-scope-step">{index + 1}</span>
                  <div>
                    <strong>{layer.title}</strong>
                    <div className="muted">{layer.detail}</div>
                  </div>
                </div>
                <p className="muted graph-scope-item-copy">{layer.description}</p>
              </div>

              <div className="graph-scope-item-side">
                <div className="proposal-pills">
                  {isCurrentLayer ? <span className="mini-pill mini-pill-strong">{tx("current", "当前")}</span> : null}
                  {layer.pills.map((pill) => (
                    <span className="mini-pill" key={`${layer.key}-${pill}`}>
                      {pill}
                    </span>
                  ))}
                </div>
                {layer.actionLabel && layer.onAction ? (
                  <div className="graph-scope-item-actions">
                    <button type="button" onClick={layer.onAction}>
                      {layer.actionLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {activeLayerCount === 0 ? (
        <p className="muted graph-scope-note">
          {tx(
            "The topology currently renders directly from the base snapshot. Search text in the jump field stays local and can be re-applied later without changing stored graph data.",
            "当前拓扑直接从基础快照渲染。跳转输入框中的搜索文本保持本地，可稍后重新应用，不会改变已存图谱数据。"
          )}
        </p>
      ) : (
        <p className="muted graph-scope-note">
          <span className="inline-code">{tx("Return To Snapshot", "返回快照")}</span>
          {tx(
            " clears the temporary topology layers and node selection together, but does not rescan roots or mutate the stored local graph snapshot.",
            " 会同时清除临时拓扑层和节点选择，但不会重新扫描根目录，也不会修改已存本地图谱快照。"
          )}
        </p>
      )}
    </article>
  );
}

function GraphTopologyView({
  snapshot,
  visibleGraph,
  interactiveNodeIds,
  navigableNodeIds,
  pinnedNeighborhood,
  selectedNodeId,
  selectedTracePath,
  searchScopeSummary,
  neighborhoodStatus,
  onResetTopology,
  onClearSearchScope,
  onClearTraceSelection,
  onSelectedNodeChange
}: {
  snapshot: GraphSnapshot | null;
  visibleGraph: GraphSelectionGraph | null;
  interactiveNodeIds: ReadonlySet<string>;
  navigableNodeIds: ReadonlySet<string>;
  pinnedNeighborhood: GraphNeighborhood | null;
  selectedNodeId: string | null;
  selectedTracePath: GraphTracePath | null;
  searchScopeSummary: { query: string; matchCount: number } | null;
  neighborhoodStatus: "idle" | "loading" | "ready" | "error";
  onResetTopology: () => void;
  onClearSearchScope: () => void;
  onClearTraceSelection: () => void;
  onSelectedNodeChange: (nodeId: string | null) => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);
  const [topologyZoom, setTopologyZoom] = useState(0.82);
  const scene = buildGraphTopologyScene(visibleGraph);
  const selection = getGraphSelectionContext(visibleGraph, selectedNodeId);

  if (!snapshot || !visibleGraph || !scene) {
    return (
      <div className="empty-state">
        <h3>{tx("No graph topology yet", "还没有图谱拓扑")}</h3>
        <p>{tx("Refresh the graph after scanning skills to render the first local relationship map.", "扫描 Skill 后刷新图谱，即可渲染第一张本地关系地图。")}</p>
      </div>
    );
  }

  const visibleNodeCount = scene.nodes.length;
  const visibleEdgeCount = scene.edges.length;
  const selectedNodeLayout = scene.nodes.find((entry) => entry.node.id === selectedNodeId) ?? null;
  const selectedNode = selectedNodeLayout?.node ?? null;
  const connectedEdgeIds = new Set(selection.connectedEdges.map((entry) => entry.id));
  const connectedEdges = scene.edges.filter((entry) => connectedEdgeIds.has(entry.edge.id));
  const connectedNodeIds = new Set(selection.relatedNodes.map((entry) => entry.id));
  const visibleNodeMap = new Map(scene.nodes.map((entry) => [entry.node.id, entry] as const));
  const selectedNodeMetadata = selectedNode ? Object.entries(selectedNode.metadata).slice(0, 6) : [];
  const selectedNodeMetaSummary = selectedNode ? getGraphNodeMetaSummary(selectedNode) : null;
  const hasPinnedNeighborhood = Boolean(
    pinnedNeighborhood &&
      pinnedNeighborhood.generatedAt === snapshot.generatedAt &&
      pinnedNeighborhood.centerNode
  );
  const hasTraceSelection = Boolean(selectedTracePath);
  const traceNodeIds = new Set(selectedTracePath?.nodes.map((entry) => entry.id) ?? []);
  const traceEdgeIds = new Set(selectedTracePath?.edges.map((entry) => entry.id) ?? []);
  const traceTargetNodeId = selectedTracePath?.targetNode.id ?? null;
  const projectedTraceNodeCount = scene.nodes.filter(
    (entry) => traceNodeIds.has(entry.node.id) && !interactiveNodeIds.has(entry.node.id)
  ).length;
  const hiddenNodeCountFromBase = Math.max(snapshot.totalNodes - visibleNodeCount, 0);
  const hiddenEdgeCountFromBase = Math.max(snapshot.totalEdges - visibleEdgeCount, 0);
  const topologyZoomPercent = Math.round(topologyZoom * 100);
  const setBoundedTopologyZoom = (nextZoom: number) => {
    setTopologyZoom(Math.min(1.4, Math.max(0.55, Number(nextZoom.toFixed(2)))));
  };

  return (
    <div className="graph-topology-shell">
      <div className="graph-topology-head">
        <div>
          <h3>{tx("Topology View", "拓扑视图")}</h3>
          <p className="muted">
            {tx(
              "Read-only local map grouped by node type. Search, select, and trace without changing stored data.",
              "按节点类型分组的只读本地地图。可搜索、选择、追踪，但不会修改已存数据。"
            )}
          </p>
        </div>
        <div className="proposal-pills">
          <span className="mini-pill mini-pill-strong">
            {visibleNodeCount}/{snapshot.totalNodes} {tx("nodes", "节点")}
          </span>
          <span className="mini-pill">
            {visibleEdgeCount}/{snapshot.totalEdges} {tx("edges", "边")}
          </span>
          {hasPinnedNeighborhood ? (
            <span className="mini-pill">
              {tx("pinned", "已固定")} {pinnedNeighborhood?.centerNode?.displayName ?? tx("neighborhood", "邻域")}
            </span>
          ) : null}
          {searchScopeSummary ? (
            <span className="mini-pill">
              {tx("search focus", "搜索焦点")} {searchScopeSummary.matchCount} {tx("matches", "匹配")}
            </span>
          ) : null}
          {hasTraceSelection ? (
            <span className="mini-pill">
              {tx("trace to", "链路到")} {truncateGraphLabel(selectedTracePath?.targetNode.displayName ?? tx("target", "目标"), 18)}
            </span>
          ) : null}
          {neighborhoodStatus === "loading" ? (
            <span className="mini-pill mini-pill-muted">{tx("loading neighborhood", "邻域加载中")}</span>
          ) : null}
          {hasPinnedNeighborhood ? (
            <button type="button" onClick={onResetTopology}>
              {tx("Reset Topology", "重置拓扑")}
            </button>
          ) : null}
          {searchScopeSummary ? (
            <button type="button" onClick={onClearSearchScope}>
              {tx("Show Full Topology", "显示完整拓扑")}
            </button>
          ) : null}
          {hasTraceSelection ? (
            <button type="button" onClick={onClearTraceSelection}>
              {tx("Clear Trace Focus", "清除链路焦点")}
            </button>
          ) : null}
          {selectedNodeLayout ? (
            <button type="button" onClick={() => onSelectedNodeChange(null)}>
              {tx("Clear Selection", "清除选择")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="graph-topology-toolbar" aria-label={tx("Topology view controls", "拓扑视图控制")}>
        <div className="graph-topology-zoom-control">
          <button
            type="button"
            aria-label={tx("Zoom out", "缩小")}
            title={tx("Zoom out", "缩小")}
            onClick={() => setBoundedTopologyZoom(topologyZoom - 0.1)}
          >
            −
          </button>
          <input
            aria-label={tx("Topology zoom", "拓扑缩放")}
            type="range"
            min="0.55"
            max="1.4"
            step="0.05"
            value={topologyZoom}
            onChange={(event) => setBoundedTopologyZoom(Number(event.target.value))}
          />
          <button
            type="button"
            aria-label={tx("Zoom in", "放大")}
            title={tx("Zoom in", "放大")}
            onClick={() => setBoundedTopologyZoom(topologyZoom + 0.1)}
          >
            +
          </button>
          <strong>{topologyZoomPercent}%</strong>
        </div>
        <div className="graph-topology-view-actions">
          <button type="button" onClick={() => setBoundedTopologyZoom(0.82)}>
            {tx("Fit", "适配")}
          </button>
          <button type="button" onClick={() => setBoundedTopologyZoom(1)}>
            1:1
          </button>
        </div>
      </div>

      <div className="graph-topology-scroll">
        <svg
          className="graph-topology-svg"
          width={Math.round(scene.width * topologyZoom)}
          height={Math.round(scene.height * topologyZoom)}
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          role="img"
          aria-label={tx("Skill graph topology view", "Skill 图谱拓扑视图")}
        >
          <defs>
            <marker
              id="graph-topology-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#8ea39d" />
            </marker>
          </defs>

          {scene.lanes.map((lane) => (
            <g key={`lane-${lane.nodeType}`}>
              <rect
                x={lane.x - 12}
                y={18}
                width={200}
                height={scene.height - 34}
                rx={22}
                fill="rgba(10, 15, 26, 0.74)"
                stroke="rgba(76, 141, 255, 0.18)"
              />
              <text
                className="graph-topology-lane-title"
                x={lane.x}
                y={42}
              >
                {truncateGraphLabel(lane.label, 18)}
              </text>
              <text
                className="graph-topology-lane-meta"
                x={lane.x}
                y={60}
              >
                {lane.count} {tx("nodes", "节点")}
              </text>
            </g>
          ))}

          {scene.edges.map((entry) => {
            const isTraceEdge = hasTraceSelection && traceEdgeIds.has(entry.edge.id);

            return (
              <path
                key={entry.edge.id}
                d={entry.path}
                className={[
                  "graph-topology-edge",
                  hasTraceSelection
                    ? isTraceEdge
                      ? "trace-selected"
                      : "dimmed"
                    : selectedNodeId
                      ? entry.edge.fromNodeId === selectedNodeId ||
                        entry.edge.toNodeId === selectedNodeId
                        ? "active"
                        : "dimmed"
                      : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                stroke={isTraceEdge ? "#f3b34c" : entry.color}
                strokeWidth={
                  isTraceEdge
                    ? Math.min(5.2, 2.3 + Math.log2(Math.max(entry.edge.weight, 1)))
                    : Math.min(4, 1.4 + Math.log2(Math.max(entry.edge.weight, 1)))
                }
                markerEnd="url(#graph-topology-arrow)"
              >
                <title>
                  {entry.edge.fromDisplayName} → {entry.edge.toDisplayName} ·{" "}
                  {formatGraphLabel(entry.edge.edgeType)}
                  {isTraceEdge ? " · trace focus" : ""}
                </title>
              </path>
            );
          })}

          {scene.nodes.map((entry) => {
            const isSelectedNode = selectedNodeId === entry.node.id;
            const isInteractive = interactiveNodeIds.has(entry.node.id);
            const isTraceNode = hasTraceSelection && traceNodeIds.has(entry.node.id);
            const isTraceTarget = traceTargetNodeId === entry.node.id;

            return (
              <g
                key={entry.node.id}
                className={[
                  "graph-topology-node",
                  isSelectedNode
                    ? "selected"
                    : hasTraceSelection
                      ? isTraceNode
                        ? "trace-related"
                        : "dimmed"
                      : selectedNodeId
                        ? connectedNodeIds.has(entry.node.id)
                          ? "related"
                          : "dimmed"
                        : "",
                  isTraceTarget ? "trace-target" : "",
                  !isInteractive ? "trace-projected" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                transform={`translate(${entry.x}, ${entry.y})`}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive ? 0 : -1}
                onClick={() => {
                  if (!isInteractive) {
                    return;
                  }
                  onSelectedNodeChange(selectedNodeId === entry.node.id ? null : entry.node.id);
                }}
                onKeyDown={(event) => {
                  if (!isInteractive) {
                    return;
                  }
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectedNodeChange(selectedNodeId === entry.node.id ? null : entry.node.id);
                  }
                }}
              >
                <title>
                  {entry.node.displayName} · {formatGraphLabel(entry.node.nodeType)} · {tx("degree", "度")}{" "}
                  {entry.node.degree}
                  {!isInteractive && isTraceNode
                    ? ` · ${tx("projected from the selected bounded trace", "来自选中有界链路的投影")}`
                    : ""}
                </title>
                <rect
                  width={entry.width}
                  height={entry.height}
                  rx={18}
                  fill={entry.tone.fill}
                  stroke={entry.tone.stroke}
                />
                <rect
                  x={0}
                  y={0}
                  width={8}
                  height={entry.height}
                  rx={18}
                  fill={entry.tone.accent}
                />
                <text className="graph-topology-node-title" x={18} y={26}>
                  {truncateGraphLabel(entry.node.displayName, 15)}
                </text>
                <text className="graph-topology-node-meta" x={18} y={45}>
                  {truncateGraphLabel(formatGraphLabel(entry.node.nodeType), 12)} · {tx("degree", "度")}{" "}
                  {entry.node.degree}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="graph-topology-footer">
        <div className="graph-topology-legend">
          {snapshot.edgeTypeCounts.map((item) => (
            <span className="graph-edge-chip" key={`graph-edge-${item.key}`}>
              <span
                className="graph-edge-chip-swatch"
                style={{ backgroundColor: getGraphEdgeTone(item.key) }}
              />
              {formatGraphLabel(item.key)} · {item.count}
            </span>
          ))}
        </div>

        <p className="muted graph-topology-note">
          {hasTraceSelection && selectedTracePath
            ? tx(
                `${searchScopeSummary ? `Search focus narrows the base topology to ${searchScopeSummary.matchCount} matched node(s) and their direct relationships for "${searchScopeSummary.query}" before the trace overlay. ` : ""}This view projects one bounded path from ${
                  selectedNode?.displayName ?? "the current selection"
                } to ${selectedTracePath.targetNode.displayName}. ${
                  projectedTraceNodeCount > 0
                    ? `${projectedTraceNodeCount} projected node(s) sit outside the current pinned or snapshot topology window. `
                    : ""
                }${scene.hiddenEdgeCount > 0 ? `${scene.hiddenEdgeCount} other edge(s) still remain outside the rendered map.` : "No additional rendered edge is omitted from this focused trace view."}`,
                `${searchScopeSummary ? `搜索焦点会在链路叠加前，把基础拓扑收窄到 "${searchScopeSummary.query}" 的 ${searchScopeSummary.matchCount} 个匹配节点及其直接关系。` : ""}此视图会从 ${
                  selectedNode?.displayName ?? "当前选择"
                } 到 ${selectedTracePath.targetNode.displayName} 投影一条有界路径。${
                  projectedTraceNodeCount > 0
                    ? `${projectedTraceNodeCount} 个投影节点位于当前固定或快照拓扑窗口之外。`
                    : ""
                }${scene.hiddenEdgeCount > 0 ? `仍有 ${scene.hiddenEdgeCount} 条其他边位于渲染地图之外。` : "该焦点链路视图没有省略额外渲染边。"}`
              )
            : searchScopeSummary
              ? tx(
                  `This topology is locally filtered to ${searchScopeSummary.matchCount} matched node(s) and their direct relationships for "${searchScopeSummary.query}". ${
                    scene.hiddenEdgeCount > 0
                      ? `${scene.hiddenEdgeCount} other edge(s) still remain outside this focused search scope.`
                      : "All edges inside this focused search scope are rendered."
                  }`,
                  `该拓扑已在本地过滤为 "${searchScopeSummary.query}" 的 ${searchScopeSummary.matchCount} 个匹配节点及其直接关系。${
                    scene.hiddenEdgeCount > 0
                      ? `仍有 ${scene.hiddenEdgeCount} 条其他边位于该搜索焦点范围之外。`
                      : "该搜索焦点范围内的所有边都已渲染。"
                  }`
                )
            : hasPinnedNeighborhood
            ? hiddenNodeCountFromBase > 0 || hiddenEdgeCountFromBase > 0
              ? tx(
                  `This expanded view adds a bounded pinned neighborhood on top of the base snapshot. ${hiddenNodeCountFromBase} snapshot-hidden node(s) and ${Math.max(scene.hiddenEdgeCount, hiddenEdgeCountFromBase)} edge(s) still remain outside the current visible map.`,
                  `该扩展视图会在基础快照上叠加有界固定邻域。仍有 ${hiddenNodeCountFromBase} 个快照隐藏节点和 ${Math.max(scene.hiddenEdgeCount, hiddenEdgeCountFromBase)} 条边位于当前可见地图之外。`
                )
              : tx(
                  "This expanded view currently exposes every node and edge already available in the local graph snapshot window.",
                  "该扩展视图当前已显示本地图谱快照窗口中可用的全部节点和边。"
                )
            : scene.hiddenEdgeCount > 0
              ? tx(
                  `${scene.hiddenEdgeCount} edge(s) connect to nodes outside the current top-node snapshot and are omitted from this map.`,
                  `${scene.hiddenEdgeCount} 条边连接到当前 top-node 快照之外的节点，因此未在地图中渲染。`
                )
              : tx(
                  "All visible edges in the current snapshot are rendered in this map.",
                  "当前快照中所有可见边都已渲染到这张图中。"
                )}
        </p>
      </div>

      <div className="graph-topology-detail-grid">
        <article className="graph-topology-detail-card">
          <div className="section-headline compact">
            <div>
              <h4>{tx("Selected Node", "选中节点")}</h4>
            </div>
          </div>

          {selectedNode ? (
            <div className="graph-topology-detail-body">
              <div className="proposal-pills">
                <span className="mini-pill mini-pill-strong">
                  {formatGraphLabel(selectedNode.nodeType)}
                </span>
                <span className="mini-pill">{tx("degree", "度")} {selectedNode.degree}</span>
              </div>

              <strong>{selectedNode.displayName}</strong>

              <dl className="graph-topology-meta-list">
                <div>
                  <dt>{tx("Ref Id", "Ref Id")}</dt>
                  <dd>{selectedNode.refId}</dd>
                </div>
                <div>
                  <dt>{tx("Updated", "更新时间")}</dt>
                  <dd>{formatDateTime(selectedNode.updatedAt)}</dd>
                </div>
                {selectedNodeMetaSummary ? (
                  <div>
                    <dt>{tx("Summary", "摘要")}</dt>
                    <dd>{selectedNodeMetaSummary}</dd>
                  </div>
                ) : null}
                {selectedNodeMetadata.map(([key, value]) => (
                  <div key={`${selectedNode.id}-${key}`}>
                    <dt>{formatGraphLabel(key)}</dt>
                    <dd>{formatGraphMetadataValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="empty-inline">
              <span className="muted">
                {tx(
                  "Select a node in the topology map to inspect its local metadata and connected relationships.",
                  "在拓扑地图中选择节点，即可查看其本地元数据和连接关系。"
                )}
              </span>
            </div>
          )}
        </article>

        <article className="graph-topology-detail-card">
          <div className="section-headline compact">
            <div>
              <h4>{tx("Connected Relationships", "连接关系")}</h4>
            </div>
          </div>

          {selectedNode && connectedEdges.length > 0 ? (
            <div className="graph-topology-relation-list">
              {connectedEdges.map((entry) => {
                const isOutgoing = entry.edge.fromNodeId === selectedNode.id;
                const relatedNodeId = isOutgoing ? entry.edge.toNodeId : entry.edge.fromNodeId;
                const relatedNode = visibleNodeMap.get(relatedNodeId);
                const canInspectRelatedNode = navigableNodeIds.has(relatedNodeId);

                return (
                  <div className="graph-topology-relation-item" key={entry.edge.id}>
                    <div className="graph-topology-relation-head">
                      <span className="mini-pill">
                        {formatGraphLabel(entry.edge.edgeType)}
                      </span>
                      <span className="muted">
                        {isOutgoing ? tx("outgoing", "出边") : tx("incoming", "入边")} · {tx("weight", "权重")} {entry.edge.weight}
                      </span>
                    </div>
                    <strong>
                      {selectedNode.displayName} {isOutgoing ? "→" : "←"}{" "}
                      {relatedNode?.node.displayName ?? tx("hidden node", "隐藏节点")}
                    </strong>
                    {getGraphEdgeMetaSummary(entry.edge) ? (
                      <p className="muted">{getGraphEdgeMetaSummary(entry.edge)}</p>
                    ) : null}
                    {canInspectRelatedNode ? (
                      <div className="graph-topology-relation-actions">
                        <button type="button" onClick={() => onSelectedNodeChange(relatedNodeId)}>
                          {tx("Inspect Node", "检查节点")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-inline">
              <span className="muted">
                {selectedNode
                  ? tx(
                      "No visible relationships connect this node inside the current top-node snapshot.",
                      "当前 top-node 快照中没有可见关系连接到该节点。"
                    )
                  : tx(
                      "Select a node to highlight and inspect its visible relationships.",
                      "选择一个节点后，即可高亮并检查它的可见关系。"
                    )}
              </span>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

function GraphFocusMetrics({
  items
}: {
  items: Array<{
    label: string;
    value: string;
  }>;
}) {
  return (
    <div className="summary-grid graph-focus-metric-grid">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`}>
          <span className="stat-label">{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function GraphFocusCard({
  title,
  caption,
  children
}: {
  title: ReactNode;
  caption?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="graph-focus-card">
      <div className="section-headline compact">
        <div>
          <h4>{title}</h4>
          {caption ? <p className="muted">{caption}</p> : null}
        </div>
      </div>
      {children}
    </article>
  );
}

function GraphFocusInspectAction({
  targetNode,
  selectedNodeId,
  onSelectedNodeChange,
  label = "Inspect In Graph"
}: {
  targetNode: GraphNodeSummary | null;
  selectedNodeId: string | null;
  onSelectedNodeChange: (nodeId: string | null) => void;
  label?: string;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (!targetNode) {
    return null;
  }

  const isSelected = selectedNodeId === targetNode.id;

  return (
    <div className="graph-focus-item-actions">
      {isSelected ? <span className="mini-pill mini-pill-strong">{tx("selected in graph", "已在图谱中选择")}</span> : null}
      <button
        type="button"
        onClick={() => onSelectedNodeChange(isSelected ? null : targetNode.id)}
      >
        {isSelected ? tx("Clear Selection", "清除选择") : label}
      </button>
    </div>
  );
}

function GraphPanelInspectAction({
  targetNode,
  selectedNodeId,
  onInspectNode,
  label = "Inspect In Graph"
}: {
  targetNode: GraphNodeSummary | null;
  selectedNodeId: string | null;
  onInspectNode: (node: GraphNodeSummary) => void;
  label?: string;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (!targetNode) {
    return null;
  }

  const isSelected = selectedNodeId === targetNode.id;

  return (
    <div className="graph-focus-item-actions">
      {isSelected ? <span className="mini-pill mini-pill-strong">{tx("selected in graph", "已在图谱中选择")}</span> : null}
      <button type="button" onClick={() => onInspectNode(targetNode)}>
        {isSelected ? tx("View In Graph", "在图谱中查看") : label}
      </button>
    </div>
  );
}

function GraphNavigationHistory({
  currentNode,
  historyNodes,
  historyIndex,
  onNavigateBack,
  onNavigateForward,
  onJumpToHistory,
  onClearHistory
}: {
  currentNode: GraphNodeSummary | null;
  historyNodes: GraphNodeSummary[];
  historyIndex: number;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onJumpToHistory: (index: number) => void;
  onClearHistory: () => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);
  const hasHistory = historyNodes.length > 0;
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex >= 0 && historyIndex < historyNodes.length - 1;
  const currentHistoryNode =
    historyIndex >= 0 && historyIndex < historyNodes.length ? historyNodes[historyIndex] : null;

  return (
    <article className="leaderboard-card graph-navigation-card">
      <div className="section-headline compact">
        <div>
          <h3>{tx("Graph Navigation", "图谱导航")}</h3>
          <p className="muted">
            {tx(
              "Recent graph stops are kept locally in this session so you can rewind and replay your exploration path without rescanning or re-querying the graph.",
              "最近访问过的图谱节点会保留在本次会话本地，便于回退和重放探索路径，无需重新扫描或重新查询图谱。"
            )}
          </p>
        </div>
        <div className="proposal-pills">
          <span className="mini-pill mini-pill-strong">
            {historyNodes.length} {tx("stored stops", "已存停靠点")}
          </span>
          {hasHistory ? (
            <button type="button" onClick={onClearHistory}>
              {tx("Clear History", "清空历史")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="graph-navigation-toolbar">
        <div className="graph-navigation-current">
          <span className="stat-label">{tx("Current Stop", "当前停靠点")}</span>
          <strong>{currentNode?.displayName ?? currentHistoryNode?.displayName ?? tx("Focus cleared", "焦点已清除")}</strong>
          <div className="muted">
            {currentNode
              ? `${formatGraphLabel(currentNode.nodeType)} · ${tx("degree", "度")} ${currentNode.degree}`
              : currentHistoryNode
                ? tx("The current selection is cleared. Use back, forward, or a recent stop to reopen this node.", "当前选择已清除。可使用后退、前进或最近停靠点重新打开此节点。")
                : tx("Select a node to start building a reversible local graph trail.", "选择一个节点后，将开始构建可回退的本地图谱轨迹。")}
          </div>
        </div>

        <div className="toolbar wrap">
          <button type="button" disabled={!canGoBack} onClick={onNavigateBack}>
            {tx("Back", "后退")}
          </button>
          <button type="button" disabled={!canGoForward} onClick={onNavigateForward}>
            {tx("Forward", "前进")}
          </button>
        </div>
      </div>

      {hasHistory ? (
        <div className="graph-navigation-list">
          {historyNodes.map((node, index) => {
            const isCurrent = index === historyIndex;
            const isAhead = historyIndex >= 0 && index > historyIndex;

            return (
              <button
                key={`${node.id}-${index}`}
                type="button"
                className={[
                  "graph-navigation-item",
                  isCurrent ? "current" : "",
                  isAhead ? "future" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onJumpToHistory(index)}
              >
                <div className="graph-navigation-item-head">
                  <strong>{node.displayName}</strong>
                  <div className="proposal-pills">
                    {isCurrent ? <span className="mini-pill mini-pill-strong">{tx("current", "当前")}</span> : null}
                    {isAhead ? <span className="mini-pill">{tx("forward", "前方")}</span> : null}
                    <span className="mini-pill">{formatGraphLabel(node.nodeType)}</span>
                  </div>
                </div>
                <div className="muted">
                  {tx("stop", "停靠点")} {index + 1} · {tx("degree", "度")} {node.degree}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="graph-focus-primer-card graph-focus-empty">
          <span className="muted">
            {tx(
              "This local trail starts filling as soon as you inspect nodes from topology, search, scope, or focus cards.",
              "当你从拓扑、搜索、范围或焦点卡检查节点时，本地轨迹会开始填充。"
            )}
          </span>
        </div>
      )}
    </article>
  );
}

function GraphTracePathPreview({
  path,
  selected,
  targetNavigable,
  onToggleTopologyFocus,
  onInspectTarget
}: {
  path: GraphTracePath;
  selected: boolean;
  targetNavigable: boolean;
  onToggleTopologyFocus: () => void;
  onInspectTarget?: () => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);
  const sequence: ReactNode[] = [];

  path.nodes.forEach((node, index) => {
    sequence.push(
      <span className="graph-trace-node-chip" key={`node-${path.targetNode.id}-${node.id}`}>
        {truncateGraphLabel(node.displayName, 20)}
      </span>
    );

    const edge = path.edges[index];
    if (edge) {
      sequence.push(
        <span className="graph-trace-edge-chip" key={`edge-${path.targetNode.id}-${edge.id}`}>
          {formatGraphLabel(edge.edgeType)}
        </span>
      );
    }
  });

  return (
    <div className={["graph-trace-item", selected ? "selected" : ""].filter(Boolean).join(" ")}>
      <div className="graph-trace-item-head">
        <strong>{path.targetNode.displayName}</strong>
        <div className="proposal-pills">
          <span className={selected ? "mini-pill mini-pill-strong" : "mini-pill"}>
            {selected ? tx("topology focus", "拓扑焦点") : tx("trace candidate", "链路候选")}
          </span>
          <span className="mini-pill">{formatGraphLabel(path.targetNode.nodeType)}</span>
          <span className="mini-pill">{path.hopCount} {tx("hops", "跳")}</span>
          <span className="mini-pill">{tx("weight", "权重")} {path.aggregateWeight}</span>
        </div>
      </div>
      <div className="graph-trace-item-actions">
        <div className="graph-trace-action-row">
          <button
            type="button"
            className={selected ? undefined : "primary"}
            onClick={onToggleTopologyFocus}
            aria-pressed={selected}
          >
            {selected ? tx("Hide Topology Focus", "隐藏拓扑焦点") : tx("Show In Topology", "在拓扑中显示")}
          </button>
          {targetNavigable && onInspectTarget ? (
            <button type="button" onClick={onInspectTarget}>
              {tx("Inspect Target", "检查目标")}
            </button>
          ) : (
            <span className="graph-trace-state">{tx("outside current scope", "超出当前范围")}</span>
          )}
        </div>
        <span className="graph-trace-state">
          {selected ? tx("Trace overlay active", "链路叠加已激活") : tx("Read-only local path preview", "只读本地路径预览")}
        </span>
      </div>
      <div className="graph-trace-sequence">{sequence}</div>
    </div>
  );
}

function GraphFocusAnalysis({
  snapshot,
  visibleGraph,
  navigableNodeIds,
  selectedNodeId,
  neighborhood,
  pinnedNeighborhood,
  pathTrace,
  selectedTraceTargetNodeId,
  neighborhoodStatus,
  neighborhoodError,
  pathTraceStatus,
  pathTraceError,
  recentRuns,
  proposals,
  bundles,
  roots,
  skills,
  onPinNeighborhood,
  onResetTopology,
  onSelectedNodeChange,
  onSelectedTraceTargetNodeChange,
  onClearSelection
}: {
  snapshot: GraphSnapshot | null;
  visibleGraph: GraphSelectionGraph | null;
  navigableNodeIds: ReadonlySet<string>;
  selectedNodeId: string | null;
  neighborhood: GraphNeighborhood | null;
  pinnedNeighborhood: GraphNeighborhood | null;
  pathTrace: GraphPathTrace | null;
  selectedTraceTargetNodeId: string | null;
  neighborhoodStatus: "idle" | "loading" | "ready" | "error";
  neighborhoodError: string | null;
  pathTraceStatus: "idle" | "loading" | "ready" | "error";
  pathTraceError: string | null;
  recentRuns: SkillRunSummary[];
  proposals: OptimizationProposal[];
  bundles: SkillBundleSummary[];
  roots: BootstrapState["roots"];
  skills: SkillSummary[];
  onPinNeighborhood: () => void;
  onResetTopology: () => void;
  onSelectedNodeChange: (nodeId: string | null) => void;
  onSelectedTraceTargetNodeChange: (nodeId: string | null) => void;
  onClearSelection: () => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);
  const tl = (en: string, zh?: string) => tx(en, zh ?? uiCopy[en] ?? en);
  const selectionGraph = mergeGraphSelectionGraph(
    visibleGraph,
    snapshot?.generatedAt ?? null,
    neighborhood,
    selectedNodeId
  );
  const selection = getGraphSelectionContext(selectionGraph, selectedNodeId);

  if (!snapshot || !selection.node) {
    return (
      <article className="leaderboard-card graph-focus-panel">
        <div className="section-headline">
          <div>
            <h3>{tx("Graph Focus Analysis", "图谱焦点分析")}</h3>
            <p className="section-copy">
              {tx(
                "Select a topology node to connect the graph snapshot with loaded local runs, proposals, bundle history, project context, and an on-demand local neighborhood drill-down.",
                "选择拓扑节点后，可把图谱快照与已加载的本地运行、建议、Bundle 历史、项目上下文，以及按需本地邻域钻取连接起来。"
              )}
            </p>
          </div>
        </div>

        <div className="empty-inline graph-focus-empty">
          <div className="graph-focus-primer">
            <span className="os-module-kicker">{tx("How to read it", "如何理解")}</span>
            <strong>{tx("This is your local Skill relationship map", "这是你的本地技能关系地图")}</strong>
            <p>
              {tx(
                "It is generated from the selected project, indexed Skills, recent local telemetry, proposals, bundles, and model references stored in the app-local SQLite database.",
                "它由已选择项目、已索引技能、最近本地遥测、建议、Bundle 和模型引用生成，并存储在应用本地 SQLite 数据库中。"
              )}
            </p>
          </div>
          <div className="graph-focus-primer-steps">
            <div>
              <span>01</span>
              <strong>{tx("Click a node", "点击节点")}</strong>
              <small>{tx("Show local runs, proposals, bundles, projects, and connected models.", "查看本地运行、建议、Bundle、项目和关联模型。")}</small>
            </div>
            <div>
              <span>02</span>
              <strong>{tx("Search or pin", "搜索或固定")}</strong>
              <small>{tx("Narrow the visible topology without changing stored graph data.", "收窄可见拓扑，但不修改已存图谱数据。")}</small>
            </div>
            <div>
              <span>03</span>
              <strong>{tx("Trace workflow", "追踪工作流")}</strong>
              <small>{tx("Explain how a Skill connects to models, proposals, bundles, or projects.", "解释 Skill 如何连接模型、建议、Bundle 或项目。")}</small>
            </div>
          </div>
        </div>
      </article>
    );
  }

  const node = selection.node;
  const navigableGraphNodes = selectionGraph?.nodes.filter((entry) => navigableNodeIds.has(entry.id)) ?? [];
  const navigableGraphNodeById = new Map(
    navigableGraphNodes.map((entry) => [entry.id, entry] as const)
  );
  const navigableGraphNodeByIdentity = new Map(
    navigableGraphNodes.map((entry) => [
      getGraphNodeIdentityKey(entry.nodeType, entry.refId),
      entry
    ] as const)
  );
  function getNavigableGraphNode(nodeType: string, refId: string) {
    return navigableGraphNodeByIdentity.get(getGraphNodeIdentityKey(nodeType, refId)) ?? null;
  }
  function getNavigableGraphNodeFromSummary(candidate: GraphNodeSummary) {
    return navigableGraphNodeById.get(candidate.id) ?? null;
  }
  function getNavigableGraphNodeFromEdge(edge: GraphEdgeSummary) {
    const relatedNodeId = edge.fromNodeId === node.id ? edge.toNodeId : edge.fromNodeId;
    return navigableGraphNodeById.get(relatedNodeId) ?? null;
  }
  const relatedSkills = selection.relatedNodes.filter((entry) => entry.nodeType === "skill");
  const relatedModels = selection.relatedNodes.filter((entry) => entry.nodeType === "model");
  const relatedBundles = selection.relatedNodes.filter((entry) => entry.nodeType === "bundle");
  const relatedLineages = selection.relatedNodes.filter(
    (entry) => entry.nodeType === "bundle_lineage"
  );
  const hasNeighborhood = Boolean(
    neighborhood?.centerNode &&
      neighborhood.centerNodeId === selectedNodeId &&
      neighborhood.generatedAt === snapshot.generatedAt
  );
  const neighborhoodDrilldownCopy =
    neighborhoodStatus === "loading"
      ? tl("Loading additional local relationships for the selected node...", "正在为选中节点加载额外本地关系...")
      : neighborhoodStatus === "error"
        ? neighborhoodError ?? tl("Local neighborhood drill-down failed.", "本地邻域钻取失败。")
        : hasNeighborhood && neighborhood
          ? neighborhood.hiddenNodeCount > 0 || neighborhood.hiddenEdgeCount > 0
            ? tx(
                `${neighborhood.hiddenNodeCount} more node(s) or ${neighborhood.hiddenEdgeCount} more edge(s) remain outside the bounded local drill-down window.`,
                `仍有 ${neighborhood.hiddenNodeCount} 个节点或 ${neighborhood.hiddenEdgeCount} 条边位于有界本地钻取窗口之外。`
              )
            : tl("The complete bounded local neighborhood for this node is visible below.", "该节点的完整有界本地邻域已在下方显示。")
          : tl("Focus analysis starts from the current snapshot and expands only the selected node on demand.", "焦点分析从当前快照开始，并且只按需展开选中节点。");
  const visibleNodeCount = selectionGraph?.nodes.length ?? 0;
  const visibleEdgeCount = selectionGraph?.edges.length ?? 0;
  const drilldownNodeTotal = hasNeighborhood
    ? neighborhood?.totalNodeCount ?? visibleNodeCount
    : snapshot.totalNodes;
  const drilldownEdgeTotal = hasNeighborhood
    ? neighborhood?.totalEdgeCount ?? visibleEdgeCount
    : snapshot.totalEdges;
  const hasPinnedNeighborhood = Boolean(
    pinnedNeighborhood &&
      pinnedNeighborhood.centerNode &&
      pinnedNeighborhood.generatedAt === snapshot.generatedAt
  );
  const hasPathTrace = Boolean(
    pathTrace &&
      pathTrace.centerNode &&
      pathTrace.centerNodeId === selectedNodeId &&
      pathTrace.generatedAt === snapshot.generatedAt
  );
  const selectedTracePath =
    hasPathTrace && selectedTraceTargetNodeId
      ? pathTrace?.paths.find((path) => path.targetNode.id === selectedTraceTargetNodeId) ?? null
      : null;
  const isPinnedSelection =
    hasPinnedNeighborhood && pinnedNeighborhood?.centerNodeId === selectedNodeId;
  const pathTraceCopy =
    pathTraceStatus === "loading"
      ? tl("Tracing bounded multi-hop local relationships for the selected node...", "正在追踪选中节点的有界多跳本地关系...")
      : pathTraceStatus === "error"
        ? pathTraceError ?? tl("Local graph path tracing failed.", "本地图谱路径追踪失败。")
        : hasPathTrace && pathTrace
          ? pathTrace.paths.length > 0
            ? pathTrace.truncated
              ? tx(
                  `Showing ${pathTrace.paths.length} representative path(s) from ${pathTrace.totalCandidateCount} candidate traces within ${pathTrace.maxDepth} hops.`,
                  `正在显示 ${pathTrace.totalCandidateCount} 条候选链路中的 ${pathTrace.paths.length} 条代表路径，限制在 ${pathTrace.maxDepth} 跳内。`
                )
              : tx(
                  `Showing ${pathTrace.paths.length} bounded path(s) within ${pathTrace.maxDepth} hops for this node.`,
                  `正在显示该节点 ${pathTrace.maxDepth} 跳内的 ${pathTrace.paths.length} 条有界路径。`
                )
            : tx(
                `No bounded multi-hop path leaves this node within ${pathTrace.maxDepth} hops.`,
                `该节点在 ${pathTrace.maxDepth} 跳内没有可离开的有界多跳路径。`
              )
          : tl("Path tracing stays local and bounded. It explains why this node connects to other graph entities without expanding the full topology.", "路径追踪保持本地且有界，用来解释该节点为何连接到其他图谱实体，而不展开完整拓扑。");

  let metrics: Array<{ label: string; value: string }> = [];
  let cards: ReactNode[] = [];

  switch (node.nodeType) {
    case "skill": {
      const skillSummary = skills.find((entry) => entry.id === node.refId) ?? null;
      const skillRuns = recentRuns.filter((entry) => entry.skillId === node.refId);
      const skillProposals = proposals.filter((entry) => entry.skillId === node.refId);
      const skillBundles = bundles.filter((entry) => entry.primarySkillId === node.refId);
      const connectedModelNames = new Set<string>(relatedModels.map((entry) => entry.refId));
      for (const run of skillRuns) {
        if (run.modelName) {
          connectedModelNames.add(run.modelName);
        }
      }

      metrics = [
        { label: tl("Recent Runs"), value: formatCount(skillRuns.length) },
        { label: tl("Connected Models"), value: formatCount(connectedModelNames.size) },
        { label: tl("Proposals"), value: formatCount(skillProposals.length) },
        { label: tl("Bundles"), value: formatCount(skillBundles.length) }
      ];

      cards = [
        <GraphFocusCard
          key="skill-runs"
          title={tl("Recent Runs")}
          caption={tl("Latest captured executions for this skill in the current local window.", "当前本地窗口中该 Skill 最近捕获的执行记录。")}
        >
          {skillRuns.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No recent runtime records are loaded for this skill.", "该 Skill 尚未加载最近运行记录。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {skillRuns.slice(0, 4).map((run) => (
                <div className="graph-focus-item" key={run.runId}>
                  <div className="graph-focus-item-head">
                    <strong>{formatDateTime(run.startedAt)}</strong>
                    <StatusPill status={run.status} />
                  </div>
                  <div className="proposal-pills">
                    <span className="mini-pill">{run.modelName ?? tl("model n/a", "模型 n/a")}</span>
                    <span className="mini-pill">{formatCount(run.totalTokens)} {tl("tokens", "Token")}</span>
                    <span className="mini-pill">{formatDuration(run.durationMs)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="skill-proposals"
          title={tl("Optimization Work")}
          caption={tl("Suggestions already attached to this skill.", "已关联到该 Skill 的优化建议。")}
        >
          {skillProposals.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No proposal currently targets this skill.", "当前没有建议指向该 Skill。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {skillProposals.slice(0, 4).map((proposal) => (
                <div className="graph-focus-item" key={proposal.id}>
                  <div className="graph-focus-item-head">
                    <div className="proposal-pills">
                      <SeverityPill severity={proposal.severity} />
                      <ProposalStatusPill status={proposal.status} />
                    </div>
                    <span className="muted">{formatDateTime(proposal.updatedAt)}</span>
                  </div>
                  <strong>{formatProposalTitle(proposal, mode)}</strong>
                  <p className="muted">{formatProposalBenefit(proposal, mode)}</p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("proposal", proposal.id)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="skill-bundles"
          title={tl("Bundle Footprint")}
          caption={tl("App-local package revisions anchored to this skill.", "锚定到该 Skill 的应用本地包版本。")}
        >
          {skillBundles.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("This skill has not been bundled in the local inventory yet.", "该 Skill 尚未进入本地 Bundle 清单。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {skillBundles.slice(0, 4).map((bundle) => (
                <div className="graph-focus-item" key={bundle.id}>
                  <div className="graph-focus-item-head">
                    <strong>{bundle.bundleName}</strong>
                    <BundleLifecyclePill state={bundle.lifecycleState} />
                  </div>
                  <div className="proposal-pills">
                    <span className="mini-pill">{bundle.versionLabel}</span>
                    <span className="mini-pill">{bundle.itemCount} {tl("items", "项")}</span>
                    <span className="mini-pill">
                      {formatBundleIngestStrategy(bundle.ingestStrategy)}
                    </span>
                  </div>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("bundle", bundle.id)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="skill-registry"
          title={tl("Skill Index Context", "技能索引上下文")}
          caption={tl("Indexed source metadata from the current project scan.", "来自当前项目扫描的索引源元数据。")}
        >
          <dl className="graph-topology-meta-list">
            <div>
              <dt>{tl("Source Path")}</dt>
              <dd>{skillSummary?.sourcePath ?? String(node.metadata.sourcePath ?? "n/a")}</dd>
            </div>
            <div>
              <dt>{tl("Source Type")}</dt>
              <dd>{skillSummary?.sourceType ?? String(node.metadata.sourceType ?? "n/a")}</dd>
            </div>
            <div>
              <dt>{tl("Fingerprint")}</dt>
              <dd>{skillSummary?.currentVersionFingerprint ?? "n/a"}</dd>
            </div>
            <div>
              <dt>{tl("Visible Graph Relationships")}</dt>
              <dd>{selection.connectedEdges.length}</dd>
            </div>
          </dl>
        </GraphFocusCard>
      ];
      break;
    }

    case "model": {
      const modelRuns = recentRuns.filter((entry) => entry.modelName === node.refId);
      const skillRunCounts = new Map<string, number>();
      for (const run of modelRuns) {
        skillRunCounts.set(run.skillId, (skillRunCounts.get(run.skillId) ?? 0) + 1);
      }

      const seenSkillIds = new Set<string>();
      const modelSkills = [
        ...relatedSkills,
        ...Array.from(skillRunCounts.keys()).map((skillId) => ({
          id: `runtime-skill-${skillId}`,
          nodeType: "skill",
          refId: skillId,
          displayName: skills.find((entry) => entry.id === skillId)?.displayName ?? skillId,
          degree: 0,
          updatedAt: "",
          metadata: {}
        }))
      ].filter((entry) => {
        if (seenSkillIds.has(entry.refId)) {
          return false;
        }
        seenSkillIds.add(entry.refId);
        return true;
      });

      const modelSkillIds = new Set(modelSkills.map((entry) => entry.refId));
      const relatedProposals = proposals.filter((entry) => modelSkillIds.has(entry.skillId));
      const totalModelTokens = modelRuns.reduce((sum, run) => sum + run.totalTokens, 0);
      const failureCount = modelRuns.filter((run) => run.status === "failed").length;

      metrics = [
        { label: tl("Recent Runs"), value: formatCount(modelRuns.length) },
        { label: tl("Distinct Skills", "不同 Skill"), value: formatCount(modelSkillIds.size) },
        { label: tl("Total Tokens"), value: formatCount(totalModelTokens) },
        { label: tl("Related Proposals", "相关建议"), value: formatCount(relatedProposals.length) }
      ];

      cards = [
        <GraphFocusCard
          key="model-runs"
          title={tl("Recent Runs")}
          caption={tl("Executions in the current local view that used this model.", "当前本地视图中使用该模型的执行记录。")}
        >
          {modelRuns.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No recent local runs reference this model yet.", "尚无最近本地运行引用该模型。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {modelRuns.slice(0, 4).map((run) => (
                <div className="graph-focus-item" key={run.runId}>
                  <div className="graph-focus-item-head">
                    <strong>{run.skillName}</strong>
                    <StatusPill status={run.status} />
                  </div>
                  <div className="proposal-pills">
                    <span className="mini-pill">{formatDateTime(run.startedAt)}</span>
                    <span className="mini-pill">{formatCount(run.totalTokens)} {tl("tokens", "Token")}</span>
                    <span className="mini-pill">{formatDuration(run.durationMs)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="model-skills"
          title={tl("Skills Using This Model")}
          caption={tl("Union of visible graph links and recent runtime evidence.", "可见图谱链接与最近运行证据的合并结果。")}
        >
          {modelSkills.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No skill linkage is visible for this model yet.", "尚未看到该模型的 Skill 连接。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {modelSkills.slice(0, 5).map((skillNode) => (
                <div className="graph-focus-item" key={`${node.id}-${skillNode.refId}`}>
                  <div className="graph-focus-item-head">
                    <strong>{skillNode.displayName}</strong>
                    <span className="mini-pill">
                      {formatCount(skillRunCounts.get(skillNode.refId) ?? 0)} {tl("runs", "次运行")}
                    </span>
                  </div>
                  <p className="muted">
                    {skills.find((entry) => entry.id === skillNode.refId)?.sourcePath ?? skillNode.refId}
                  </p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("skill", skillNode.refId)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="model-proposals"
          title={tl("Proposal Spillover")}
          caption={tl("Open or accepted work attached to the skills using this model.", "使用该模型的 Skill 上仍打开或已接受的工作。")}
        >
          {relatedProposals.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No active proposal is linked to the visible skill set.", "可见 Skill 集合没有关联活跃建议。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {relatedProposals.slice(0, 4).map((proposal) => (
                <div className="graph-focus-item" key={proposal.id}>
                  <div className="graph-focus-item-head">
                    <strong>{proposal.skillName}</strong>
                    <ProposalStatusPill status={proposal.status} />
                  </div>
                  <p className="muted">
                    {formatProposalTitle(proposal, mode)} · {formatSeverity(proposal.severity, mode)}
                  </p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("proposal", proposal.id)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="model-context"
          title={tl("Model Context")}
          caption={tl("Local rollup from the already-loaded runtime window.", "基于已加载运行窗口的本地汇总。")}
        >
          <dl className="graph-topology-meta-list">
            <div>
              <dt>{tl("Model Name")}</dt>
              <dd>{node.refId}</dd>
            </div>
            <div>
              <dt>{tl("Failed Runs")}</dt>
              <dd>{failureCount}</dd>
            </div>
            <div>
              <dt>{tl("Visible Graph Relationships")}</dt>
              <dd>{selection.connectedEdges.length}</dd>
            </div>
            <div>
              <dt>{tl("Snapshot Updated", "快照更新时间")}</dt>
              <dd>{formatDateTime(node.updatedAt)}</dd>
            </div>
          </dl>
        </GraphFocusCard>
      ];
      break;
    }

    case "bundle": {
      const bundle = bundles.find((entry) => entry.id === node.refId) ?? null;
      const lineageKey =
        bundle?.lineageKey ??
        (typeof node.metadata.lineageKey === "string" ? node.metadata.lineageKey : null);
      const lineageBundles = lineageKey
        ? bundles.filter((entry) => entry.lineageKey === lineageKey)
        : [];
      const bundleSkills = [
        ...relatedSkills,
        ...(bundle?.primarySkillId
          ? [
              {
                id: `bundle-skill-${bundle.primarySkillId}`,
                nodeType: "skill",
                refId: bundle.primarySkillId,
                displayName: bundle.primarySkillName ?? bundle.primarySkillId,
                degree: 0,
                updatedAt: "",
                metadata: {}
              }
            ]
          : [])
      ];

      metrics = [
        {
          label: tl("Lifecycle"),
          value: bundle ? formatBundleLifecycleState(bundle.lifecycleState) : "Unknown"
        },
        {
          label: tl("Lineage Members"),
          value: formatCount(lineageBundles.length)
        },
        {
          label: tl("Packaged Items", "已打包项目"),
          value: formatCount(bundle?.itemCount ?? Number(node.metadata.itemCount ?? 0))
        },
        { label: tl("Visible Relations"), value: formatCount(selection.connectedEdges.length) }
      ];

      cards = [
        <GraphFocusCard
          key="bundle-summary"
          title={tl("Bundle Summary")}
          caption={tl("Current local packaging record for this bundle.", "该 Bundle 当前的本地打包记录。")}
        >
          <dl className="graph-topology-meta-list">
            <div>
              <dt>{tl("Bundle Name")}</dt>
              <dd>{bundle?.bundleName ?? node.displayName}</dd>
            </div>
            <div>
              <dt>{tl("Version Label")}</dt>
              <dd>{bundle?.versionLabel ?? String(node.metadata.versionLabel ?? "n/a")}</dd>
            </div>
            <div>
              <dt>{tl("Manifest Path")}</dt>
              <dd>{bundle?.manifestPath ?? "n/a"}</dd>
            </div>
            <div>
              <dt>{tl("Export Path")}</dt>
              <dd>{bundle?.exportPath ?? "n/a"}</dd>
            </div>
          </dl>
        </GraphFocusCard>,
        <GraphFocusCard
          key="bundle-lineage"
          title={tl("Lineage History")}
          caption={tl("Other local revisions that belong to the same bundle lineage.", "同一 Bundle 谱系下的其他本地版本。")}
        >
          {lineageBundles.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No lineage history is available in the current local store.", "当前本地存储中没有可用谱系历史。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {lineageBundles.slice(0, 5).map((entry) => (
                <div className="graph-focus-item" key={entry.id}>
                  <div className="graph-focus-item-head">
                    <strong>{entry.bundleName}</strong>
                    <BundleLifecyclePill state={entry.lifecycleState} />
                  </div>
                  <div className="proposal-pills">
                    <span className="mini-pill">{entry.versionLabel}</span>
                    <span className="mini-pill">{formatDateTime(entry.createdAt)}</span>
                  </div>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("bundle", entry.id)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="bundle-skills"
          title={tl("Linked Skills")}
          caption={tl("Skills that package into or connect through this bundle.", "被打包进该 Bundle 或通过该 Bundle 连接的 Skill。")}
        >
          {bundleSkills.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No linked skill is visible for this bundle.", "该 Bundle 当前没有可见的关联 Skill。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {bundleSkills.slice(0, 4).map((skillNode) => (
                <div className="graph-focus-item" key={`${node.id}-${skillNode.refId}`}>
                  <div className="graph-focus-item-head">
                    <strong>{skillNode.displayName}</strong>
                    <span className="mini-pill">{formatGraphLabel(skillNode.nodeType)}</span>
                  </div>
                  <p className="muted">
                    {skills.find((entry) => entry.id === skillNode.refId)?.sourcePath ?? skillNode.refId}
                  </p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("skill", skillNode.refId)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="bundle-relationships"
          title={tl("Relationship Trail", "关系轨迹")}
          caption={tl("Visible graph edges around this bundle in the current snapshot.", "当前快照中围绕该 Bundle 的可见图谱边。")}
        >
          {selection.connectedEdges.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No visible graph relationship is loaded for this bundle.", "该 Bundle 尚未加载可见图谱关系。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {selection.connectedEdges.map((edge) => (
                <div className="graph-focus-item" key={edge.id}>
                  <div className="graph-focus-item-head">
                    <strong>{formatGraphLabel(edge.edgeType)}</strong>
                    <span className="mini-pill">{tl("weight", "权重")} {edge.weight}</span>
                  </div>
                  <p className="muted">
                    {edge.fromDisplayName} → {edge.toDisplayName}
                  </p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNodeFromEdge(edge)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>
      ];
      break;
    }

    case "proposal": {
      const proposal = proposals.find((entry) => entry.id === node.refId) ?? null;
      const linkedSkill = proposal ? skills.find((entry) => entry.id === proposal.skillId) ?? null : null;
      const linkedRuns = proposal ? recentRuns.filter((entry) => entry.skillId === proposal.skillId) : [];
      const evidenceItems = proposal?.evidence ?? [];
      const recentActions = proposal ? [...proposal.actions].slice(-4).reverse() : [];

      metrics = [
        {
          label: tl("Status"),
          value: proposal ? formatProposalStatus(proposal.status, mode) : String(node.metadata.status ?? "n/a")
        },
        {
          label: tl("Severity", "严重级别"),
          value: proposal
            ? formatSeverity(proposal.severity, mode)
            : String(node.metadata.severity ?? "n/a")
        },
        { label: tl("Evidence Items"), value: formatCount(evidenceItems.length) },
        { label: tl("Action Events"), value: formatCount(proposal?.actions.length ?? 0) }
      ];

      cards = [
        <GraphFocusCard
          key="proposal-summary"
          title={tl("Proposal Summary")}
          caption={tl("The local optimization suggestion without any automatic skill rewrite.", "本地优化建议，不会自动重写任何 Skill。")}
        >
          {proposal ? (
            <div className="graph-focus-detail-stack">
              <div className="proposal-pills">
                <SeverityPill severity={proposal.severity} />
                <ProposalStatusPill status={proposal.status} />
                <span className="mini-pill">{formatProposalType(proposal.proposalType, mode)}</span>
              </div>
              <strong>{formatProposalTitle(proposal, mode)}</strong>
              <p className="muted">{formatProposalSummary(proposal, mode)}</p>
              <dl className="graph-topology-meta-list">
                <div>
                  <dt>{tl("Expected Benefit")}</dt>
                  <dd>{formatProposalBenefit(proposal, mode)}</dd>
                </div>
                <div>
                  <dt>{tl("Updated")}</dt>
                  <dd>{formatDateTime(proposal.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("The selected proposal is not present in the current local list.", "当前本地列表中没有选中的建议。")}</span>
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="proposal-skill"
          title={tl("Linked Skill Context")}
          caption={tl("The skill and runtime trail this proposal is attached to.", "该建议所关联的 Skill 与运行轨迹。")}
        >
          {proposal ? (
            <div className="graph-focus-detail-stack">
              <strong>{proposal.skillName}</strong>
              <p className="muted">{linkedSkill?.sourcePath ?? proposal.skillId}</p>
              <GraphFocusInspectAction
                targetNode={getNavigableGraphNode("skill", proposal.skillId)}
                selectedNodeId={selectedNodeId}
                onSelectedNodeChange={onSelectedNodeChange}
              />
              {linkedRuns.length > 0 ? (
                <div className="graph-focus-list">
                  {linkedRuns.slice(0, 3).map((run) => (
                    <div className="graph-focus-item" key={run.runId}>
                      <div className="graph-focus-item-head">
                        <strong>{formatDateTime(run.startedAt)}</strong>
                        <StatusPill status={run.status} />
                      </div>
                      <div className="proposal-pills">
                        <span className="mini-pill">{run.modelName ?? tl("model n/a", "模型 n/a")}</span>
                        <span className="mini-pill">{formatDuration(run.durationMs)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-inline graph-focus-empty">
                  <span className="muted">{tl("No recent run is loaded for the linked skill.", "关联 Skill 尚未加载最近运行。")}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("The linked skill context is unavailable in this view.", "当前视图无法获得关联 Skill 上下文。")}</span>
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="proposal-evidence"
          title={tl("Evidence Signals")}
          caption={tl("Signals that caused the proposal engine to surface this recommendation.", "促使建议引擎提出该推荐的证据信号。")}
        >
          {evidenceItems.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No evidence item is attached to this proposal.", "该建议没有关联证据项。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {evidenceItems.slice(0, 4).map((evidence) => (
                <div className="graph-focus-item" key={evidence.id}>
                  <div className="graph-focus-item-head">
                    <span className="mini-pill">
                      {formatProposalEvidenceType(evidence.evidenceType, mode)}
                    </span>
                    <span className="muted">{formatDateTime(evidence.createdAt)}</span>
                  </div>
                  <p className="muted">{formatProposalEvidenceSummary(evidence, mode)}</p>
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="proposal-actions"
          title={tl("Action Timeline")}
          caption={tl("Human and system decisions already recorded for this proposal.", "该建议已经记录的人为与系统决策。")}
        >
          {recentActions.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No action history is available yet.", "暂无可用操作历史。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {recentActions.map((action) => (
                <div className="graph-focus-item" key={action.id}>
                  <div className="graph-focus-item-head">
                    <span className="mini-pill mini-pill-strong">
                      {formatProposalActionType(action.actionType, mode)}
                    </span>
                    <span className="muted">{formatDateTime(action.createdAt)}</span>
                  </div>
                  <p className="muted">{formatProposalActionSummary(action, mode)}</p>
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>
      ];
      break;
    }

    case "root": {
      const root = roots.find((entry) => entry.id === node.refId) ?? null;
      const rootPath =
        root?.path ?? (typeof node.metadata.path === "string" ? node.metadata.path : null);
      const rootSkills = rootPath
        ? skills.filter((entry) => matchesPathScope(entry.sourcePath, rootPath))
        : [];
      const rootSkillIds = new Set(rootSkills.map((entry) => entry.id));
      const rootRuns = recentRuns.filter((entry) => rootSkillIds.has(entry.skillId));
      const rootProposals = proposals.filter((entry) => rootSkillIds.has(entry.skillId));
      const rootBundles = bundles.filter(
        (entry) => entry.primarySkillId !== null && rootSkillIds.has(entry.primarySkillId)
      );

      metrics = [
        { label: tl("Indexed Skills"), value: formatCount(rootSkills.length) },
        { label: tl("Recent Runs"), value: formatCount(rootRuns.length) },
        { label: tl("Proposals"), value: formatCount(rootProposals.length) },
        { label: tl("Bundles"), value: formatCount(rootBundles.length) }
      ];

      cards = [
        <GraphFocusCard
          key="root-summary"
          title={tl("Project Summary", "项目摘要")}
          caption={tl("Selected project details in the current local policy.", "当前本地策略中的已选择项目详情。")}
        >
          <dl className="graph-topology-meta-list">
            <div>
              <dt>{tl("Path")}</dt>
              <dd>{rootPath ?? "n/a"}</dd>
            </div>
            <div>
              <dt>{tl("Project Source Type", "项目来源类型")}</dt>
              <dd>{root?.rootType ?? String(node.metadata.rootType ?? "n/a")}</dd>
            </div>
            <div>
              <dt>{tl("Visible Graph Relationships")}</dt>
              <dd>{selection.connectedEdges.length}</dd>
            </div>
          </dl>
        </GraphFocusCard>,
        <GraphFocusCard
          key="root-skills"
          title={tl("Skills In Project", "项目内 Skill")}
          caption={tl("Indexed skills that resolve inside the selected project path.", "解析到已选择项目路径内的已索引 Skill。")}
        >
          {rootSkills.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No indexed skill currently maps into this project.", "当前没有已索引 Skill 映射到该项目。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {rootSkills.slice(0, 5).map((skill) => (
                <div className="graph-focus-item" key={skill.id}>
                  <div className="graph-focus-item-head">
                    <strong>{skill.displayName}</strong>
                    <span className="mini-pill">{skill.sourceType}</span>
                  </div>
                  <p className="muted">{skill.sourcePath}</p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("skill", skill.id)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="root-runs"
          title={tl("Runtime Activity", "运行活动")}
          caption={tl("Recent runs for skills that belong to this project.", "属于该项目的 Skill 最近运行记录。")}
        >
          {rootRuns.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No recent run is loaded for this project.", "该项目尚未加载最近运行。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {rootRuns.slice(0, 4).map((run) => (
                <div className="graph-focus-item" key={run.runId}>
                  <div className="graph-focus-item-head">
                    <strong>{run.skillName}</strong>
                    <StatusPill status={run.status} />
                  </div>
                  <div className="proposal-pills">
                    <span className="mini-pill">{run.modelName ?? tl("model n/a", "模型 n/a")}</span>
                    <span className="mini-pill">{formatCount(run.totalTokens)} {tl("tokens", "Token")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="root-bundles"
          title={tl("Bundle Coverage")}
          caption={tl("Bundles whose primary skill lives under this project.", "主 Skill 位于该项目下的 Bundle。")}
        >
          {rootBundles.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No bundle currently traces back to this project.", "当前没有 Bundle 可追溯到该项目。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {rootBundles.slice(0, 4).map((bundle) => (
                <div className="graph-focus-item" key={bundle.id}>
                  <div className="graph-focus-item-head">
                    <strong>{bundle.bundleName}</strong>
                    <BundleLifecyclePill state={bundle.lifecycleState} />
                  </div>
                  <div className="proposal-pills">
                    <span className="mini-pill">{bundle.primarySkillName ?? bundle.primarySkillId}</span>
                    <span className="mini-pill">{bundle.versionLabel}</span>
                  </div>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("bundle", bundle.id)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>
      ];
      break;
    }

    case "version": {
      const versionSkills = relatedSkills.filter((entry) => entry.nodeType === "skill");
      const versionSkillIds = new Set(versionSkills.map((entry) => entry.refId));
      const versionBundles = bundles.filter(
        (entry) => entry.primarySkillId !== null && versionSkillIds.has(entry.primarySkillId)
      );

      metrics = [
        {
          label: tl("Fingerprint"),
          value: truncateGraphLabel(String(node.metadata.fingerprint ?? node.displayName), 18)
        },
        { label: tl("Skills"), value: formatCount(versionSkills.length) },
        { label: tl("Bundles"), value: formatCount(versionBundles.length) },
        { label: tl("Relations", "关系"), value: formatCount(selection.connectedEdges.length) }
      ];

      cards = [
        <GraphFocusCard
          key="version-summary"
          title={tl("Version Summary")}
          caption={tl("Current version fingerprint node generated from indexed skill state.", "由已索引 Skill 状态生成的当前版本指纹节点。")}
        >
          <dl className="graph-topology-meta-list">
            <div>
              <dt>{tl("Ref Id", "引用 ID")}</dt>
              <dd>{node.refId}</dd>
            </div>
            <div>
              <dt>{tl("Fingerprint")}</dt>
              <dd>{String(node.metadata.fingerprint ?? "n/a")}</dd>
            </div>
            <div>
              <dt>{tl("Updated")}</dt>
              <dd>{formatDateTime(node.updatedAt)}</dd>
            </div>
          </dl>
        </GraphFocusCard>,
        <GraphFocusCard
          key="version-skills"
          title={tl("Skills On This Version")}
          caption={tl("Visible skills attached to this fingerprint node.", "连接到该指纹节点的可见 Skill。")}
        >
          {versionSkills.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No linked skill is visible for this version node.", "该版本节点没有可见的关联 Skill。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {versionSkills.map((skillNode) => (
                <div className="graph-focus-item" key={skillNode.id}>
                  <div className="graph-focus-item-head">
                    <strong>{skillNode.displayName}</strong>
                    <span className="mini-pill">{tl("degree", "度")} {skillNode.degree}</span>
                  </div>
                  <p className="muted">{skillNode.refId}</p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("skill", skillNode.refId)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="version-bundles"
          title={tl("Bundle Coverage")}
          caption={tl("Bundles whose primary skill resolves to the visible linked skills.", "主 Skill 可解析到可见关联 Skill 的 Bundle。")}
        >
          {versionBundles.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No bundle is visible for the linked skills in this snapshot.", "该快照中关联 Skill 没有可见 Bundle。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {versionBundles.slice(0, 4).map((bundle) => (
                <div className="graph-focus-item" key={bundle.id}>
                  <div className="graph-focus-item-head">
                    <strong>{bundle.bundleName}</strong>
                    <BundleLifecyclePill state={bundle.lifecycleState} />
                  </div>
                  <p className="muted">{bundle.versionLabel}</p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("bundle", bundle.id)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="version-relationships"
          title={tl("Visible Relationships", "可见关系")}
          caption={tl("The graph edges currently loaded for this version node.", "当前为该版本节点加载的图谱边。")}
        >
          {selection.connectedEdges.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No visible edge is loaded for this version node.", "该版本节点尚未加载可见边。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {selection.connectedEdges.map((edge) => (
                <div className="graph-focus-item" key={edge.id}>
                  <div className="graph-focus-item-head">
                    <strong>{formatGraphLabel(edge.edgeType)}</strong>
                    <span className="mini-pill">{tl("weight", "权重")} {edge.weight}</span>
                  </div>
                  <p className="muted">
                    {edge.fromDisplayName} → {edge.toDisplayName}
                  </p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNodeFromEdge(edge)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>
      ];
      break;
    }

    case "bundle_lineage": {
      const lineageBundles = bundles.filter((entry) => entry.lineageKey === node.refId);
      const currentCount = lineageBundles.filter((entry) => entry.lifecycleState === "current").length;
      const retainedCount = lineageBundles.filter((entry) => entry.lifecycleState === "retained").length;
      const supersededCount = lineageBundles.filter(
        (entry) => entry.lifecycleState === "superseded"
      ).length;
      const lineageSkillIds = new Set(
        lineageBundles
          .map((entry) => entry.primarySkillId)
          .filter((entry): entry is string => typeof entry === "string")
      );
      const lineageSkills = skills.filter((entry) => lineageSkillIds.has(entry.id));

      metrics = [
        { label: tl("Current"), value: formatCount(currentCount) },
        { label: tl("Retained", "已保留"), value: formatCount(retainedCount) },
        { label: tl("Superseded", "已被取代"), value: formatCount(supersededCount) },
        { label: tl("Bundles"), value: formatCount(lineageBundles.length) }
      ];

      cards = [
        <GraphFocusCard
          key="lineage-summary"
          title={tl("Lineage Summary", "谱系摘要")}
          caption={tl("App-local lineage rollup for packaged skill revisions.", "打包 Skill 版本的应用本地谱系汇总。")}
        >
          <dl className="graph-topology-meta-list">
            <div>
              <dt>{tl("Lineage Key")}</dt>
              <dd>{node.refId}</dd>
            </div>
            <div>
              <dt>{tl("Display Name")}</dt>
              <dd>{node.displayName}</dd>
            </div>
            <div>
              <dt>{tl("Visible Graph Relationships")}</dt>
              <dd>{selection.connectedEdges.length}</dd>
            </div>
          </dl>
        </GraphFocusCard>,
        <GraphFocusCard
          key="lineage-bundles"
          title={tl("Lineage Members")}
          caption={tl("Bundles that belong to this lineage in the local inventory.", "本地清单中属于该谱系的 Bundle。")}
        >
          {lineageBundles.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No bundle currently resolves to this lineage key.", "当前没有 Bundle 可解析到该谱系 Key。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {lineageBundles.slice(0, 5).map((bundle) => (
                <div className="graph-focus-item" key={bundle.id}>
                  <div className="graph-focus-item-head">
                    <strong>{bundle.bundleName}</strong>
                    <BundleLifecyclePill state={bundle.lifecycleState} />
                  </div>
                  <div className="proposal-pills">
                    <span className="mini-pill">{bundle.versionLabel}</span>
                    <span className="mini-pill">{bundle.primarySkillName ?? bundle.primarySkillId}</span>
                  </div>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("bundle", bundle.id)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="lineage-skills"
          title={tl("Skills In Lineage", "谱系中的 Skill")}
          caption={tl("Primary skills represented by the lineage members.", "该谱系成员所代表的主 Skill。")}
        >
          {lineageSkills.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No indexed skill is linked to this lineage yet.", "尚无已索引 Skill 关联到该谱系。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {lineageSkills.map((skill) => (
                <div className="graph-focus-item" key={skill.id}>
                  <div className="graph-focus-item-head">
                    <strong>{skill.displayName}</strong>
                    <span className="mini-pill">{skill.sourceType}</span>
                  </div>
                  <p className="muted">{skill.sourcePath}</p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNode("skill", skill.id)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>,
        <GraphFocusCard
          key="lineage-relationships"
          title={tl("Visible Relationships", "可见关系")}
          caption={tl("Visible snapshot nodes that connect to this lineage.", "连接到该谱系的可见快照节点。")}
        >
          {relatedBundles.length === 0 && relatedLineages.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No related visible node is loaded for this lineage.", "该谱系尚未加载相关可见节点。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {[...relatedBundles, ...relatedLineages].map((relatedNode) => (
                <div className="graph-focus-item" key={relatedNode.id}>
                  <div className="graph-focus-item-head">
                    <strong>{relatedNode.displayName}</strong>
                    <span className="mini-pill">{formatGraphLabel(relatedNode.nodeType)}</span>
                  </div>
                  <p className="muted">{relatedNode.refId}</p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNodeFromSummary(relatedNode)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>
      ];
      break;
    }

    default: {
      metrics = [
        { label: tl("Node Type"), value: formatGraphLabel(node.nodeType) },
        { label: tl("Degree"), value: formatCount(node.degree) },
        { label: tl("Relations", "关系"), value: formatCount(selection.connectedEdges.length) },
        {
          label: tl("Metadata Fields"),
          value: formatCount(Object.keys(node.metadata).length)
        }
      ];

      cards = [
        <GraphFocusCard
          key="fallback-summary"
          title={tl("Node Summary")}
          caption={tl("Generic local summary for this graph node.", "该图谱节点的通用本地摘要。")}
        >
          <dl className="graph-topology-meta-list">
            <div>
              <dt>{tl("Display Name")}</dt>
              <dd>{node.displayName}</dd>
            </div>
            <div>
              <dt>{tl("Ref Id", "引用 ID")}</dt>
              <dd>{node.refId}</dd>
            </div>
            <div>
              <dt>{tl("Updated")}</dt>
              <dd>{formatDateTime(node.updatedAt)}</dd>
            </div>
          </dl>
        </GraphFocusCard>,
        <GraphFocusCard
          key="fallback-related"
          title={tl("Visible Related Nodes")}
          caption={tl("Nodes already loaded in the current graph snapshot.", "当前图谱快照中已经加载的节点。")}
        >
          {selection.relatedNodes.length === 0 ? (
            <div className="empty-inline graph-focus-empty">
              <span className="muted">{tl("No related visible node is available in this snapshot.", "该快照中没有可用的相关可见节点。")}</span>
            </div>
          ) : (
            <div className="graph-focus-list">
              {selection.relatedNodes.map((relatedNode) => (
                <div className="graph-focus-item" key={relatedNode.id}>
                  <div className="graph-focus-item-head">
                    <strong>{relatedNode.displayName}</strong>
                    <span className="mini-pill">{formatGraphLabel(relatedNode.nodeType)}</span>
                  </div>
                  <p className="muted">{relatedNode.refId}</p>
                  <GraphFocusInspectAction
                    targetNode={getNavigableGraphNodeFromSummary(relatedNode)}
                    selectedNodeId={selectedNodeId}
                    onSelectedNodeChange={onSelectedNodeChange}
                  />
                </div>
              ))}
            </div>
          )}
        </GraphFocusCard>
      ];
    }
  }

  return (
    <article className="leaderboard-card graph-focus-panel">
      <div className="graph-focus-head">
        <div>
          <h3>{tx("Graph Focus Analysis", "图谱焦点分析")}</h3>
          <p className="section-copy">
            {tx(
              "Read-only contextual rollup for the selected node. This panel reuses the current graph snapshot, runtime tables, proposal inventory, bundle history, and selected project index already loaded locally, then pulls a bounded neighborhood only for the node you select.",
              "选中节点的只读上下文汇总。此面板会复用已在本地加载的当前图谱快照、运行表、建议清单、Bundle 历史和当前项目索引，并只为你选择的节点拉取有界邻域。"
            )}
          </p>
        </div>
        <div className="proposal-pills">
          <span className="mini-pill mini-pill-strong">{formatGraphLabel(node.nodeType)}</span>
          <span className="mini-pill">{tx("degree", "度")} {node.degree}</span>
          {isPinnedSelection ? <span className="mini-pill">{tx("pinned in topology", "已固定到拓扑")}</span> : null}
          {hasNeighborhood ? (
            <button type="button" onClick={onPinNeighborhood}>
              {isPinnedSelection ? tx("Refresh Pinned View", "刷新固定视图") : tx("Pin Neighborhood", "固定邻域")}
            </button>
          ) : null}
          {hasPinnedNeighborhood ? (
            <button type="button" onClick={onResetTopology}>
              {tx("Reset Topology", "重置拓扑")}
            </button>
          ) : null}
          <button type="button" onClick={onClearSelection}>
            {tx("Clear Selection", "清除选择")}
          </button>
        </div>
      </div>

      <div className="graph-focus-selection">
        <strong>{node.displayName}</strong>
        <span className="graph-ref graph-focus-ref">{node.refId}</span>
      </div>

      <div className="graph-focus-drilldown">
        <div className="proposal-pills">
          <span className="mini-pill">
            {tx("visible", "可见")} {visibleNodeCount}/{drilldownNodeTotal} {tx("nodes", "节点")}
          </span>
          <span className="mini-pill">
            {tx("visible", "可见")} {visibleEdgeCount}/{drilldownEdgeTotal} {tx("edges", "边")}
          </span>
          {hasNeighborhood ? (
            <span className="mini-pill mini-pill-strong">{tx("Neighborhood Loaded", "邻域已加载")}</span>
          ) : null}
          {hasPinnedNeighborhood ? (
            <span className="mini-pill">
              {tx("topology pinned to", "拓扑固定到")} {pinnedNeighborhood?.centerNode?.displayName ?? tx("selection", "选择")}
            </span>
          ) : null}
        </div>
        <p className="muted graph-focus-drilldown-copy">
          {neighborhoodDrilldownCopy}
        </p>
      </div>

      <GraphFocusMetrics items={metrics} />

      <div className="graph-focus-grid">
        {cards}
        <GraphFocusCard
          title={tx("Path Trace", "路径追踪")}
          caption={tx("Bounded multi-hop explanations from the selected node into other local graph entities.", "从选中节点到其它本地图谱实体的有界多跳解释。")}
        >
          <div className="graph-trace-panel">
            <div className="proposal-pills">
              <span className="mini-pill mini-pill-strong">
                {hasPathTrace ? formatCount(pathTrace?.paths.length ?? 0) : "0"} {tx("shown", "已显示")}
              </span>
              <span className="mini-pill">
                {hasPathTrace ? formatCount(pathTrace?.totalCandidateCount ?? 0) : "0"} {tx("candidates", "候选")}
              </span>
              <span className="mini-pill">
                {tx("depth", "深度")} {hasPathTrace ? pathTrace?.maxDepth ?? 0 : 0}
              </span>
              {hasPathTrace && pathTrace?.truncated ? (
                <span className="mini-pill">{tx("limited to", "限制为")} {pathTrace.pathLimit}</span>
              ) : null}
            </div>

            <p className="muted graph-trace-copy">{pathTraceCopy}</p>

            {selectedTracePath ? (
              <div className="graph-trace-selection">
                <div>
                  <span className="stat-label">{tx("Topology Focus", "拓扑焦点")}</span>
                  <strong>{selectedTracePath.targetNode.displayName}</strong>
                  <div className="muted">
                    {selectedTracePath.hopCount} {tx("hops", "跳")} · {tx("aggregate weight", "聚合权重")}{" "}
                    {selectedTracePath.aggregateWeight}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectedTraceTargetNodeChange(null)}
                >
                  {tx("Clear Trace Focus", "清除链路焦点")}
                </button>
              </div>
            ) : null}

            {hasPathTrace && pathTrace && pathTrace.targetTypeCounts.length > 0 ? (
              <CountBadges
                items={pathTrace.targetTypeCounts}
                emptyCopy={tx("No target node types were reached.", "没有抵达目标节点类型。")}
              />
            ) : null}

            {pathTraceStatus === "loading" ? (
              <div className="empty-inline graph-focus-empty">
                <span className="muted">{tx("Tracing local graph paths...", "正在追踪本地图谱路径...")}</span>
              </div>
            ) : hasPathTrace && pathTrace && pathTrace.paths.length > 0 ? (
              <div className="graph-trace-list">
                {pathTrace.paths.map((path) => {
                  const isSelectedTraceTarget = selectedTracePath?.targetNode.id === path.targetNode.id;
                  const canInspectTraceTarget = navigableNodeIds.has(path.targetNode.id);

                  return (
                    <GraphTracePathPreview
                      key={`${path.targetNode.id}-${path.hopCount}`}
                      path={path}
                      selected={isSelectedTraceTarget}
                      targetNavigable={canInspectTraceTarget}
                      onToggleTopologyFocus={() =>
                        onSelectedTraceTargetNodeChange(
                          isSelectedTraceTarget ? null : path.targetNode.id
                        )
                      }
                      onInspectTarget={
                        canInspectTraceTarget
                          ? () => onSelectedNodeChange(path.targetNode.id)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <div className="empty-inline graph-focus-empty">
                <span className="muted">
                  {hasPathTrace
                    ? tx("No candidate path is available inside the current bounded trace window.", "当前有界追踪窗口内没有可用候选路径。")
                    : tx("Select a node to derive a bounded explanation trail from the local graph.", "选择一个节点，从本地图谱中推导有界解释路径。")}
                </span>
              </div>
            )}
          </div>
        </GraphFocusCard>
      </div>

      <p className="muted graph-focus-note">
        {tx(
          "This focused view stays token-light: it does not read extra `SKILL.md` files or rescan the machine. It only derives insight from the currently loaded local snapshot and inventories.",
          "此焦点视图保持 token 轻量：不会读取额外 `SKILL.md` 文件，也不会重新扫描机器。它只从当前已加载的本地快照和清单中推导洞察。"
        )}
      </p>
    </article>
  );
}

function AuditTrail({
  events,
  selectedGraphNodeId,
  resolveGraphNode,
  resolveGraphRootNodeByPath,
  onInspectGraphNode
}: {
  events: LocalAuditEvent[];
  selectedGraphNodeId: string | null;
  resolveGraphNode: (nodeType: string, refId: string | null | undefined) => GraphNodeSummary | null;
  resolveGraphRootNodeByPath: (rootPath: string | null | undefined) => GraphNodeSummary | null;
  onInspectGraphNode: (node: GraphNodeSummary) => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <h3>{tx("No audit events yet", "还没有审计事件")}</h3>
        <p>
          {tx(
            "Authorization changes, bundle operations, and other local governance events will appear here as the workbench is used.",
            "随着工作台使用，授权变更、Bundle 操作和其它本地治理事件会出现在这里。"
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="audit-list">
      {events.map((event) => {
        const metaSummary = getAuditEventMetaSummary(event);
        const graphTargets = getAuditEventGraphTargets(
          event,
          resolveGraphNode,
          resolveGraphRootNodeByPath
        );
        const graphHint = getAuditEventGraphHint(event, graphTargets.length);

        return (
          <div className="audit-item" key={event.id}>
            <div className="audit-item-main">
              <div className="proposal-pills">
                <span className="mini-pill mini-pill-strong">
                  {formatAuditEventType(event.eventType)}
                </span>
                <span className="mini-pill">{formatProposalActorType(event.actorType, mode)}</span>
              </div>
              <strong>{event.eventSummary}</strong>
              {metaSummary ? <div className="muted">{metaSummary}</div> : null}
              {graphHint ? <div className="muted">{graphHint}</div> : null}
            </div>
            <div className="audit-item-side">
              <span className="audit-stamp">{formatDateTime(event.createdAt)}</span>
              {graphTargets.length > 0 ? (
                <div className="panel-graph-actions audit-item-actions">
                  {graphTargets.map((target) => (
                    <GraphPanelInspectAction
                      key={`${event.id}-${target.key}`}
                      targetNode={target.node}
                      selectedNodeId={selectedGraphNodeId}
                      onInspectNode={onInspectGraphNode}
                      label={target.label}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BackupList({ backups }: { backups: LocalBackupSummary[] }) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (backups.length === 0) {
    return (
      <div className="empty-inline">
        <span className="muted">
          {tx(
            "No local recovery snapshots yet. Create one before larger schema or packaging changes so this app state can be restored manually later.",
            "还没有本地恢复快照。建议在较大的 schema 或打包变更前先创建快照，后续可手动恢复应用状态。"
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="backup-list">
      {backups.map((backup) => (
        <div className="backup-item" key={backup.backupId}>
          <div className="backup-item-main">
            <div className="proposal-pills">
              <span className="mini-pill mini-pill-strong">{tx("Snapshot", "快照")}</span>
              <span className="mini-pill">{backup.areaCount} {tx("areas", "区域")}</span>
            </div>
            <strong>{formatDateTime(backup.createdAt)}</strong>
            <div className="muted">
              {formatCount(backup.totalFiles)} {tx("files", "文件")} · {formatBytes(backup.totalBytes)} · schema{" "}
              {backup.schemaVersion}
            </div>
            <div className="backup-area-row">
              {backup.areas.map((area) => (
                <span className="delta-chip" key={`${backup.backupId}-${area.area}`}>
                  {area.area} · {formatCount(area.totalFiles)} {tx("files", "文件")}
                </span>
              ))}
            </div>
            <div className="muted">
              {tx("Excluded", "已排除")}:{" "}
              {backup.excludedRelativePaths.length > 0
                ? backup.excludedRelativePaths.join(", ")
                : tx("none", "无")}
            </div>
          </div>
          <span className="graph-ref">{backup.backupPath}</span>
        </div>
      ))}
    </div>
  );
}

function BackupValidationPanel({ validation }: { validation: LocalBackupValidationResult | null }) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (!validation) {
    return (
      <div className="empty-inline">
        <span className="muted">
          {tx(
            "Choose a local `backup.manifest.json` file to verify snapshot integrity before any manual recovery work. This preview is read-only and does not overwrite anything.",
            "选择本地 `backup.manifest.json` 文件，在任何手动恢复前验证快照完整性。此预览只读，不会覆盖任何内容。"
          )}
        </span>
      </div>
    );
  }

  const severity = getBackupValidationSeverity(validation);

  return (
    <div className="backup-validation-panel">
      <div className={`backup-integrity-card validation-${severity}`}>
        <div className="backup-integrity-head">
          <div className="proposal-pills">
            <ValidationSeverityPill severity={severity} />
            <span className="mini-pill mini-pill-strong">
              {validation.canRestore ? tx("Ready For Preview", "可预览") : tx("Blocked", "已阻止")}
            </span>
          </div>
          <div>
            <h3>{getBackupValidationHeadline(validation)}</h3>
            <p>{getBackupValidationSummary(validation)}</p>
          </div>
        </div>
      </div>

      <div className="summary-grid secondary">
        <div>
          <span className="stat-label">{tx("Manifest Integrity", "清单完整性")}</span>
          <strong>{validation.canRestore ? tx("Pass", "通过") : tx("Blocked", "已阻止")}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Areas Present", "区域存在")}</span>
          <strong>
            {validation.presentAreaCount}/{validation.expectedAreaCount || validation.areaChecks.length}
          </strong>
        </div>
        <div>
          <span className="stat-label">{tx("Backup Age", "备份年龄")}</span>
          <strong>{validation.backupAgeDays == null ? "n/a" : `${validation.backupAgeDays} ${tx("day(s)", "天")}`}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Storage Root Match", "存储根匹配")}</span>
          <strong>
            {validation.storageRootMatchesCurrent == null
              ? "n/a"
              : validation.storageRootMatchesCurrent
                ? tx("Same Machine Root", "同一机器根目录")
                : tx("Different Root", "不同根目录")}
          </strong>
        </div>
        <div>
          <span className="stat-label">{tx("Policy Match", "策略匹配")}</span>
          <strong>
            {validation.policyMatchesCurrent == null
              ? "n/a"
              : validation.policyMatchesCurrent
                ? tx("Same Policy", "同一策略")
                : tx("Different Policy", "不同策略")}
          </strong>
        </div>
        <div>
          <span className="stat-label">{tx("Total Files", "文件总数")}</span>
          <strong>
            {validation.actualTotalFiles}
            {validation.expectedTotalFiles != null ? ` / ${validation.expectedTotalFiles}` : ""}
          </strong>
        </div>
        <div>
          <span className="stat-label">{tx("Total Size", "总大小")}</span>
          <strong>
            {formatBytes(validation.actualTotalBytes)}
            {validation.expectedTotalBytes != null
              ? ` / ${formatBytes(validation.expectedTotalBytes)}`
              : ""}
          </strong>
        </div>
      </div>

      <dl className="meta-list">
        <div>
          <dt>{tx("Backup Root", "备份根目录")}</dt>
          <dd>{validation.backupRoot}</dd>
        </div>
        {validation.manifest ? (
          <>
            <div>
              <dt>{tx("Manifest Storage Root", "清单存储根目录")}</dt>
              <dd>{validation.manifest.storageRoot}</dd>
            </div>
            <div>
              <dt>{tx("Captured Policy", "捕获策略")}</dt>
              <dd>{validation.manifest.policyId ?? "n/a"}</dd>
            </div>
            <div>
              <dt>{tx("Captured Database Path", "捕获数据库路径")}</dt>
              <dd>{validation.manifest.source.databasePath}</dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="backup-area-grid">
        {validation.areaChecks.map((areaCheck) => (
          <div className="bundle-diff-card" key={areaCheck.area}>
            <div className="section-headline compact">
              <h4>{areaCheck.area}</h4>
              <ValidationSeverityPill severity={areaCheck.exists ? "info" : "error"} />
            </div>
            <div className="diff-meta-list">
              <div>
                <span className="stat-label">{tx("Relative Path", "相对路径")}</span>
                <strong>{areaCheck.relativePath}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Files", "文件")}</span>
                <strong>
                  {areaCheck.actualFiles ?? tx("missing", "缺失")} / {areaCheck.manifestFiles}
                </strong>
              </div>
              <div>
                <span className="stat-label">{tx("Size", "大小")}</span>
                <strong>
                  {areaCheck.actualBytes == null ? tx("missing", "缺失") : formatBytes(areaCheck.actualBytes)} /{" "}
                  {formatBytes(areaCheck.manifestBytes)}
                </strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="validation-issue-list">
        {validation.issues.length === 0 ? (
          <div className="validation-issue validation-info">
            <div className="validation-issue-head">
              <ValidationSeverityPill severity="info" />
              <strong>backup_preview_ready</strong>
            </div>
            <p>{tx("No blocking integrity issues were found in this backup manifest preview.", "备份清单预览中未发现阻塞完整性问题。")}</p>
          </div>
        ) : (
          validation.issues.map((issue, index) => (
            <div
              className={`validation-issue validation-${issue.severity}`}
              key={`${issue.code}-${index}`}
            >
              <div className="validation-issue-head">
                <ValidationSeverityPill severity={issue.severity} />
                <strong>{issue.code}</strong>
              </div>
              <p>{issue.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BackupRestoreImpactPanel({
  impact
}: {
  impact: LocalBackupRestoreImpactResult | null;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (!impact) {
    return (
      <div className="empty-inline">
        <span className="muted">
          {tx(
            "Run a restore impact preview to see how a future replace-area recovery would affect the current local `config/`, `db/`, `events/`, and `bundles/` storage areas.",
            "运行恢复影响预览，查看未来按区域替换恢复会如何影响当前本地 `config/`、`db/`、`events/` 和 `bundles/` 存储区域。"
          )}
        </span>
      </div>
    );
  }

  const severity = getRestoreImpactSeverity(impact);

  return (
    <div className="restore-impact-panel">
      <div className={`backup-integrity-card validation-${severity}`}>
        <div className="backup-integrity-head">
          <div className="proposal-pills">
            <ValidationSeverityPill severity={severity} />
            <span className="mini-pill mini-pill-strong">{tx("Replace-Area Preview", "按区域替换预览")}</span>
          </div>
          <div>
            <h3>{getRestoreImpactHeadline(impact)}</h3>
            <p>{getRestoreImpactSummary(impact)}</p>
          </div>
        </div>
      </div>

      <div className="summary-grid secondary">
        <div>
          <span className="stat-label">{tx("Preview Ready", "预览就绪")}</span>
          <strong>{impact.readyForManualRestore ? tx("Yes", "是") : tx("No", "否")}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Destructive Areas", "破坏性区域")}</span>
          <strong>{impact.destructiveAreaCount}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Changed Files", "变化文件")}</span>
          <strong>{impact.totalChangedFileCount}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Only In Backup", "仅在备份中")}</span>
          <strong>{impact.totalAddedFileCount}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Only In Current", "仅在当前中")}</span>
          <strong>{impact.totalRemovedFileCount}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Unchanged Files", "未变化文件")}</span>
          <strong>{impact.totalUnchangedFileCount}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Backup Files", "备份文件")}</span>
          <strong>{impact.totalBackupFileCount}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Current Files", "当前文件")}</span>
          <strong>{impact.totalCurrentFileCount}</strong>
        </div>
      </div>

      <dl className="meta-list">
        <div>
          <dt>{tx("Target Storage Root", "目标存储根目录")}</dt>
          <dd>{impact.targetStorageRoot}</dd>
        </div>
        <div>
          <dt>{tx("Preview Generated", "预览生成时间")}</dt>
          <dd>{formatDateTime(impact.previewGeneratedAt)}</dd>
        </div>
        <div>
          <dt>{tx("Comparison Mode", "对比模式")}</dt>
          <dd>{impact.comparisonMode}</dd>
        </div>
      </dl>

      <div className="backup-area-grid">
        {impact.areas.map((area) => {
          const areaSeverity: LocalBackupValidationSeverity =
            area.changedFileCount > 0 || area.removedFileCount > 0 ? "warning" : "info";

          return (
            <div className="bundle-diff-card" key={`${area.area}-${area.targetPath}`}>
              <div className="section-headline compact">
                <h4>{area.area}</h4>
                <ValidationSeverityPill severity={areaSeverity} />
              </div>

              <div className="diff-meta-list">
                <div>
                  <span className="stat-label">{tx("Backup Path", "备份路径")}</span>
                  <strong>{area.backupRelativePath}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Target Path", "目标路径")}</span>
                  <strong>{area.targetPath}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Changed", "已变化")}</span>
                  <strong>{area.changedFileCount}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Only In Backup", "仅在备份中")}</span>
                  <strong>{area.addedFileCount}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Only In Current", "仅在当前中")}</span>
                  <strong>{area.removedFileCount}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Unchanged", "未变化")}</span>
                  <strong>{area.unchangedFileCount}</strong>
                </div>
              </div>

              {area.sampleChangedPaths.length > 0 ? (
                <div className="impact-sample-group">
                  <span className="stat-label">{tx("Sample Overwrites", "覆盖样例")}</span>
                  <div className="delta-chip-list">
                    {area.sampleChangedPaths.map((path) => (
                      <span className="delta-chip" key={`${area.area}-changed-${path}`}>
                        {path}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {area.sampleAddedPaths.length > 0 ? (
                <div className="impact-sample-group">
                  <span className="stat-label">{tx("Sample Adds", "新增样例")}</span>
                  <div className="delta-chip-list">
                    {area.sampleAddedPaths.map((path) => (
                      <span className="delta-chip" key={`${area.area}-added-${path}`}>
                        {path}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {area.sampleRemovedPaths.length > 0 ? (
                <div className="impact-sample-group">
                  <span className="stat-label">{tx("Sample Removals", "移除样例")}</span>
                  <div className="delta-chip-list">
                    {area.sampleRemovedPaths.map((path) => (
                      <span className="delta-chip" key={`${area.area}-removed-${path}`}>
                        {path}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BundleTable({
  bundles,
  selectedGraphNodeId,
  resolveGraphNode,
  onInspectGraphNode
}: {
  bundles: SkillBundleSummary[];
  selectedGraphNodeId: string | null;
  resolveGraphNode: (nodeType: string, refId: string | null | undefined) => GraphNodeSummary | null;
  onInspectGraphNode: (node: GraphNodeSummary) => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (bundles.length === 0) {
    return (
      <div className="empty-state">
        <h3>{tx("No bundles stored yet", "还没有存储 Bundle")}</h3>
        <p>{tx("Export or import a bundle to build a local package inventory with manifest history.", "导出或导入 Bundle 后，会生成带清单历史的本地包库存。")}</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>{tx("Bundle", "Bundle")}</th>
            <th>{tx("State", "状态")}</th>
            <th>{tx("Primary Skill", "主 Skill")}</th>
            <th>{tx("Version", "版本")}</th>
            <th>{tx("Lineage", "谱系")}</th>
            <th>{tx("Storage Path", "存储路径")}</th>
          </tr>
        </thead>
        <tbody>
          {bundles.map((bundle) => {
            const bundleNode = resolveGraphNode("bundle", bundle.id);
            const primarySkillNode = resolveGraphNode("skill", bundle.primarySkillId);

            return (
              <tr key={bundle.id}>
                <td>
                  <strong>{bundle.bundleName}</strong>
                  <div className="muted">
                    {bundle.bundleType} · {formatCount(bundle.itemCount)} {tx("items", "项")}
                  </div>
                  <div className="muted">{tx("Created", "创建于")} {formatDateTime(bundle.createdAt)}</div>
                  <div className="bundle-row-actions">
                    <GraphPanelInspectAction
                      targetNode={bundleNode}
                      selectedNodeId={selectedGraphNodeId}
                      onInspectNode={onInspectGraphNode}
                      label={tx("Inspect Bundle", "检查 Bundle")}
                    />
                    <GraphPanelInspectAction
                      targetNode={primarySkillNode}
                      selectedNodeId={selectedGraphNodeId}
                      onInspectNode={onInspectGraphNode}
                      label={tx("Inspect Skill", "检查 Skill")}
                    />
                    {!bundleNode && !primarySkillNode ? (
                      <span className="muted">{tx("Not visible in the current graph snapshot.", "当前图谱快照中不可见。")}</span>
                    ) : null}
                  </div>
                </td>
                <td className="bundle-state-cell">
                  <BundleLifecyclePill state={bundle.lifecycleState} />
                  <div className="muted">{tx("via", "来源")} {formatBundleIngestStrategyText(bundle.ingestStrategy, mode)}</div>
                  {bundle.supersedesBundleId ? (
                    <div className="bundle-relation-note">
                      {tx("Supersedes", "替代")} {bundle.supersedesBundleId}
                    </div>
                  ) : null}
                  {bundle.supersededByBundleId ? (
                    <div className="bundle-relation-note">
                      {tx("Replaced by", "被替代为")} {bundle.supersededByBundleId}
                    </div>
                  ) : null}
                </td>
                <td>{bundle.primarySkillName ?? "n/a"}</td>
                <td>{bundle.versionLabel}</td>
                <td className="bundle-lineage-cell">
                  <div>
                    <span className="stat-label">{tx("Source Bundle", "来源 Bundle")}</span>
                    <div className="muted bundle-meta-value">{bundle.sourceBundleId}</div>
                  </div>
                  <div>
                    <span className="stat-label">{tx("Lineage Key", "谱系键")}</span>
                    <div className="muted bundle-meta-value">{bundle.lineageKey}</div>
                  </div>
                </td>
                <td className="path-cell">
                  <div>{bundle.exportPath}</div>
                  <div className="muted bundle-meta-value">{bundle.manifestPath}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ValidationSeverityPill({ severity }: { severity: BundleValidationSeverity }) {
  const { mode } = useLanguage();
  const label =
    severity === "error"
      ? formatLocalizedText(mode, "Error", "错误")
      : severity === "warning"
        ? formatLocalizedText(mode, "Warning", "警告")
        : formatLocalizedText(mode, "Info", "信息");

  return (
    <span className={`validation-pill validation-${severity}`}>
      {label}
    </span>
  );
}

function BundleSafetyPill({
  classification
}: {
  classification: SkillBundleSafetyClassification;
}) {
  const { mode } = useLanguage();
  const label =
    classification === "no_change"
      ? formatLocalizedText(mode, "No Change", "无变化")
      : classification === "safe_update"
        ? formatLocalizedText(mode, "Safe Update", "安全更新")
        : classification === "drift"
          ? formatLocalizedText(mode, "Drift", "漂移")
          : classification === "conflict"
            ? formatLocalizedText(mode, "Conflict", "冲突")
            : classification;

  return (
    <span className={`validation-pill bundle-safety-pill bundle-safety-${classification}`}>
      {label}
    </span>
  );
}

function BundleLifecyclePill({ state }: { state: SkillBundleLifecycleState }) {
  const { mode } = useLanguage();
  const label =
    state === "current"
      ? formatLocalizedText(mode, "Current", "当前")
      : state === "retained"
        ? formatLocalizedText(mode, "Retained", "保留")
        : state === "superseded"
          ? formatLocalizedText(mode, "Superseded", "已替代")
          : state;

  return (
    <span className={`bundle-lifecycle-pill bundle-lifecycle-${state}`}>
      {label}
    </span>
  );
}

function BundleStrategyPill({ strategy }: { strategy: SkillBundleImportStrategy }) {
  const { mode } = useLanguage();
  const label =
    strategy === "preserve_existing"
      ? formatLocalizedText(mode, "Preserve Existing", "保留现有")
      : strategy === "supersede_current"
        ? formatLocalizedText(mode, "Supersede Current", "替代当前")
        : strategy;

  return (
    <span className={`bundle-strategy-pill bundle-strategy-${strategy}`}>
      {label}
    </span>
  );
}

function DiffStatePill({ state }: { state: SkillBundleDiffState }) {
  const { mode } = useLanguage();
  const label =
    state === "same"
      ? formatLocalizedText(mode, "Same", "相同")
      : state === "changed"
        ? formatLocalizedText(mode, "Changed", "已变化")
        : formatLocalizedText(mode, "Unknown", "未知");

  return <span className={`diff-state-pill diff-state-${state}`}>{label}</span>;
}

function DeltaList({
  title,
  items,
  emptyCopy
}: {
  title: string;
  items: string[];
  emptyCopy: string;
}) {
  return (
    <div className="bundle-diff-card">
      <div className="section-headline compact">
        <h4>{title}</h4>
      </div>
      {items.length === 0 ? (
        <p className="muted">{emptyCopy}</p>
      ) : (
        <div className="delta-chip-list">
          {items.map((item) => (
            <span className="delta-chip" key={`${title}-${item}`}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BundleValidationPanel({
  validation,
  selectedStrategy,
  onStrategyChange
}: {
  validation: SkillBundleValidationResult | null;
  selectedStrategy: SkillBundleImportStrategy;
  onStrategyChange: (strategy: SkillBundleImportStrategy) => void;
}) {
  const { mode } = useLanguage();
  const tx = (en: string, zh: string) => formatLocalizedText(mode, en, zh);

  if (!validation) {
    return (
      <div className="empty-inline">
        <span className="muted">
          {tx(
            "Choose a local `bundle.manifest.json` file to preview import safety checks and drift signals before copying anything into app storage.",
            "选择本地 `bundle.manifest.json` 文件，在复制到应用存储前预览导入安全检查与漂移信号。"
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="bundle-validation-panel">
      <div className={`bundle-safety-card bundle-safety-${validation.diff.classification}`}>
        <div className="bundle-safety-head">
          <div className="proposal-pills">
            <BundleSafetyPill classification={validation.diff.classification} />
            <ValidationSeverityPill severity={validation.canImport ? "info" : "error"} />
          </div>
          <div>
            <h3>{validation.diff.title}</h3>
            <p>{validation.diff.summary}</p>
          </div>
        </div>

        <div className="bundle-safety-reasons">
          {validation.diff.reasons.map((reason, index) => (
            <div className="bundle-safety-reason" key={`${reason}-${index}`}>
              {reason}
            </div>
          ))}
        </div>
      </div>

      <div className="summary-grid secondary">
        <div>
          <span className="stat-label">{tx("Can Import", "可导入")}</span>
          <strong>{validation.canImport ? tx("Yes", "是") : tx("No", "否")}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Safety Class", "安全分类")}</span>
          <strong>{formatBundleSafetyClassificationText(validation.diff.classification, mode)}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Recommended", "推荐")}</span>
          <strong>{formatBundleImportStrategyText(validation.recommendedStrategy, mode)}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Selected", "已选择")}</span>
          <strong>{formatBundleImportStrategyText(selectedStrategy, mode)}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Files Seen", "已发现文件")}</span>
          <strong>{validation.discoveredFileCount}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Strategies", "策略数")}</span>
          <strong>{validation.availableStrategies.length}</strong>
        </div>
        <div>
          <span className="stat-label">{tx("Compared Bundle", "对比 Bundle")}</span>
          <strong>{validation.diff.comparedBundle?.bundleName ?? "n/a"}</strong>
        </div>
      </div>

      <div className="bundle-strategy-panel">
        <div className="section-headline compact">
          <div>
            <h4>{tx("Import Strategy", "导入策略")}</h4>
            <p className="muted">
              {tx(
                "Choose whether this bundle should sit alongside the current local baseline or take over as the lineage head.",
                "选择此 Bundle 是与当前本地基线并存，还是接管为谱系头版本。"
              )}
            </p>
          </div>
        </div>

        <div className="strategy-grid">
          {bundleStrategyOptions.map((option) => {
            const isAvailable = validation.availableStrategies.includes(option.value);
            const isSelected = selectedStrategy === option.value;
            const isRecommended = validation.recommendedStrategy === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={[
                  "strategy-card",
                  isSelected ? "selected" : "",
                  isAvailable ? "" : "unavailable"
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!isAvailable || validation.availableStrategies.length === 1}
                onClick={() => onStrategyChange(option.value)}
              >
                <div className="strategy-card-head">
                  <BundleStrategyPill strategy={option.value} />
                  <div className="strategy-card-tags">
                    {isRecommended ? <span className="mini-pill">{tx("Recommended", "推荐")}</span> : null}
                    {isSelected ? <span className="mini-pill mini-pill-strong">{tx("Selected", "已选择")}</span> : null}
                    {!isAvailable ? <span className="mini-pill mini-pill-muted">{tx("Unavailable", "不可用")}</span> : null}
                  </div>
                </div>
                <p>
                  {option.value === "preserve_existing"
                    ? tx(
                        "Keep the current local baseline untouched and store the incoming bundle as a parallel retained revision.",
                        "保持当前本地基线不变，并把传入 Bundle 保存为并行保留修订。"
                      )
                    : tx(
                        "Promote the incoming bundle to the current lineage head and mark the prior current bundle as superseded.",
                        "把传入 Bundle 提升为当前谱系头版本，并将之前的当前版本标记为已替代。"
                      )}
                </p>
                <span className="strategy-card-note">
                  {describeBundleStrategyOutcomeText(validation, option.value, mode)}
                </span>
              </button>
            );
          })}
        </div>

        {validation.availableStrategies.length === 1 ? (
          <p className="bundle-strategy-lock muted">
            {tx(
              "This preview only supports one safe strategy right now, so the bundle add plan is locked automatically.",
              "当前预览只支持一种安全策略，因此 Bundle 添加计划会自动锁定。"
            )}
          </p>
        ) : null}
      </div>

      <dl className="meta-list">
        <div>
          <dt>{tx("Bundle Root", "Bundle 根目录")}</dt>
          <dd>{validation.bundleRoot}</dd>
        </div>
        {validation.manifest ? (
          <>
            <div>
              <dt>{tx("Bundle Name", "Bundle 名称")}</dt>
              <dd>
                {validation.manifest.bundleName} · {validation.manifest.versionLabel}
              </dd>
            </div>
            <div>
              <dt>{tx("Entrypoint", "入口")}</dt>
              <dd>{validation.manifest.entrypoint}</dd>
            </div>
          </>
        ) : null}
        {validation.existingBundle ? (
          <div>
            <dt>{tx("Registered Bundle", "已注册 Bundle")}</dt>
            <dd>
              {validation.existingBundle.bundleName} · {validation.existingBundle.versionLabel}
            </dd>
          </div>
        ) : null}
        {validation.diff.comparedBundle ? (
          <div>
            <dt>{tx("Baseline Bundle", "基线 Bundle")}</dt>
            <dd>
              <span className="meta-pill-row">
                <span>
                  {validation.diff.comparedBundle.bundleName} ·{" "}
                  {validation.diff.comparedBundle.versionLabel}
                </span>
                <BundleLifecyclePill state={validation.diff.comparedBundle.lifecycleState} />
              </span>
            </dd>
          </div>
        ) : null}
        {validation.matchingSkill ? (
          <div>
            <dt>{tx("Matching Local Skill", "匹配本地技能")}</dt>
            <dd>
              {validation.matchingSkill.skillName} ·{" "}
              {validation.matchingSkill.currentVersionFingerprint ?? "n/a"}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="bundle-diff-grid">
        <div className="bundle-diff-card">
          <div className="section-headline compact">
            <h4>{tx("Fingerprint Diff", "指纹差异")}</h4>
          </div>
          <div className="diff-meta-list">
            <div>
              <span className="stat-label">{tx("Vs Stored Bundle", "对比已存 Bundle")}</span>
              <div className="diff-meta-row">
                <DiffStatePill state={validation.diff.comparedBundleFingerprintDelta} />
                <strong>{validation.diff.storedBundleFingerprint ?? "n/a"}</strong>
              </div>
            </div>
            <div>
              <span className="stat-label">{tx("Vs Indexed Skill", "对比已索引 Skill")}</span>
              <div className="diff-meta-row">
                <DiffStatePill state={validation.diff.localSkillFingerprintDelta} />
                <strong>{validation.diff.localSkillFingerprint ?? "n/a"}</strong>
              </div>
            </div>
            <div>
              <span className="stat-label">{tx("Incoming Fingerprint", "传入指纹")}</span>
              <strong>{validation.diff.incomingFingerprint ?? "n/a"}</strong>
            </div>
          </div>
        </div>

        <div className="bundle-diff-card">
          <div className="section-headline compact">
            <h4>{tx("Version And Files", "版本与文件")}</h4>
          </div>
          <div className="diff-meta-list">
            <div>
              <span className="stat-label">{tx("Version Label", "版本标签")}</span>
              <div className="diff-meta-row">
                <DiffStatePill state={validation.diff.versionDelta} />
                <strong>{validation.manifest?.versionLabel ?? "n/a"}</strong>
              </div>
            </div>
            <div>
              <span className="stat-label">{tx("File Count Delta", "文件数量变化")}</span>
              <strong>{formatSignedCount(validation.diff.dependencyDelta.totalFilesDelta)}</strong>
            </div>
            <div>
              <span className="stat-label">{tx("Unchanged Items", "未变化项")}</span>
              <strong>{validation.diff.itemDelta.unchangedCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="bundle-diff-grid">
        <DeltaList
          title={tx("Added Items", "新增项")}
          items={validation.diff.itemDelta.added}
          emptyCopy={tx("No new packaged items were added.", "没有新增打包项。")}
        />
        <DeltaList
          title={tx("Removed Items", "移除项")}
          items={validation.diff.itemDelta.removed}
          emptyCopy={tx("No packaged items were removed.", "没有移除打包项。")}
        />
        <DeltaList
          title={tx("Changed Items", "变化项")}
          items={validation.diff.itemDelta.changed}
          emptyCopy={tx("No packaged items changed shape.", "没有打包项结构变化。")}
        />
        <DeltaList
          title={tx("Added Top-level Entries", "新增顶层条目")}
          items={validation.diff.dependencyDelta.addedTopLevelEntries}
          emptyCopy={tx("No new top-level files or folders were added.", "没有新增顶层文件或文件夹。")}
        />
        <DeltaList
          title={tx("Removed Top-level Entries", "移除顶层条目")}
          items={validation.diff.dependencyDelta.removedTopLevelEntries}
          emptyCopy={tx("No top-level files or folders were removed.", "没有移除顶层文件或文件夹。")}
        />
        <DeltaList
          title={tx("Directory Delta", "目录变化")}
          items={[
            ...validation.diff.dependencyDelta.addedDirectories.map((item) => `+ ${item}`),
            ...validation.diff.dependencyDelta.removedDirectories.map((item) => `- ${item}`)
          ]}
          emptyCopy={tx("No directory structure changes were detected.", "没有检测到目录结构变化。")}
        />
      </div>

      <div className="validation-issue-list">
        {validation.issues.length === 0 ? (
          <div className="validation-issue validation-info">
            <div className="validation-issue-head">
              <ValidationSeverityPill severity="info" />
              <strong>ready_to_import</strong>
            </div>
            <p>{tx("No blocking issues were found in this bundle manifest preview.", "Bundle 清单预览中未发现阻塞问题。")}</p>
          </div>
        ) : (
          validation.issues.map((issue, index) => (
            <div
              className={`validation-issue validation-${issue.severity}`}
              key={`${issue.code}-${index}`}
            >
              <div className="validation-issue-head">
                <ValidationSeverityPill severity={issue.severity} />
                <strong>{issue.code}</strong>
              </div>
              <p>{issue.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function App() {
  const skillGraphSectionRef = useRef<HTMLElement | null>(null);
  const productWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const graphNeighborhoodCacheRef = useRef<Map<string, GraphNeighborhood>>(new Map());
  const pendingNavigationHrefRef = useRef<(typeof productNavHrefs)[number] | null>(null);
  const productNavLinkRefs = useRef<
    Partial<Record<(typeof productNavHrefs)[number], HTMLAnchorElement>>
  >({});
  const [boot, setBoot] = useState<BootstrapState | null>(null);
  const [loading, setLoading] = useState(true);
  const [languageMode, setLanguageMode] = useState<LanguageMode>("zh");
  const [productMode, setProductMode] = useState<ProductMode>("guided");
  const [activeSectionHref, setActiveSectionHref] = useState<(typeof productNavHrefs)[number]>("#overview");
  const [busyAction, setBusyAction] = useState<
    | "authorize"
    | "scan"
    | "project-scan"
    | "workflow-preview"
    | "workflow-apply"
    | "import"
    | "local-tool-discovery"
    | "local-tool-preview"
    | "local-tool-import"
    | "runtime-refresh"
    | "proposals"
    | "proposal-status"
    | "graph"
    | "backup"
    | "backup-validate"
    | "backup-impact"
    | "bundle-export"
    | "bundle-validate"
    | "bundle-import"
    | "skill-analysis"
    | "remote-analysis"
    | "marketplace-import"
    | "marketplace-activation-preview"
    | "health-policy"
    | null
  >(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanResultDialog, setScanResultDialog] = useState<ScanResult | null>(null);
  const [scanResultProjectName, setScanResultProjectName] = useState("");
  const [targetProjectRoot, setTargetProjectRoot] = useState("");
  const [pendingBindProjectRoot, setPendingBindProjectRoot] = useState("");
  const [managedProjects, setManagedProjects] = useState<ManagedProject[]>(() => loadManagedProjects());
  const [projectRepairFeedback, setProjectRepairFeedback] = useState<ProjectRepairFeedback | null>(null);
  const [projectOnboardingLogs, setProjectOnboardingLogs] =
    useState<ProjectOnboardingLogEntry[]>(() => loadProjectOnboardingLogs());
  const [selectedProjectLogPath, setSelectedProjectLogPath] = useState("");
  const [projectHeartbeatEntries, setProjectHeartbeatEntries] =
    useState<ProjectHeartbeatEntry[]>(() => loadProjectHeartbeats());
  const [inspectedProjectPath, setInspectedProjectPath] = useState("");
  const [workflowStarterPreview, setWorkflowStarterPreview] =
    useState<WorkflowStarterPreview | null>(null);
  const [workflowStarterResult, setWorkflowStarterResult] =
    useState<WorkflowStarterApplyResult | null>(null);
  const [workflowStarterHighlighted, setWorkflowStarterHighlighted] = useState(false);
  const [telemetryResult, setTelemetryResult] = useState<TelemetryImportResult | null>(null);
  const [localToolSources, setLocalToolSources] = useState<LocalToolTelemetrySource[]>([]);
  const [selectedLocalToolSourceId, setSelectedLocalToolSourceId] = useState("");
  const [localToolPreview, setLocalToolPreview] = useState<LocalToolTelemetryPreview | null>(null);
  const [localToolImportResult, setLocalToolImportResult] =
    useState<LocalToolTelemetryImportResult | null>(null);
  const [projectRuntimeRefreshResult, setProjectRuntimeRefreshResult] =
    useState<ProjectRuntimeEvidenceRefreshResult | null>(null);
  const [projectProfile, setProjectProfile] = useState<ProjectProfileSummary | null>(null);
  const [proposalRefreshResult, setProposalRefreshResult] =
    useState<OptimizationProposalRefreshResult | null>(null);
  const [backupResult, setBackupResult] = useState<LocalBackupSummary | null>(null);
  const [backupValidation, setBackupValidation] = useState<LocalBackupValidationResult | null>(null);
  const [backupRestoreImpact, setBackupRestoreImpact] =
    useState<LocalBackupRestoreImpactResult | null>(null);
  const [bundleExportResult, setBundleExportResult] = useState<SkillBundleExportResult | null>(null);
  const [bundleImportResult, setBundleImportResult] = useState<SkillBundleImportResult | null>(null);
  const [bundleValidation, setBundleValidation] = useState<SkillBundleValidationResult | null>(null);
  const [backups, setBackups] = useState<LocalBackupSummary[]>([]);
  const [bundles, setBundles] = useState<SkillBundleSummary[]>([]);
  const [backupManifestPath, setBackupManifestPath] = useState("");
  const [telemetryFilePath, setTelemetryFilePath] = useState("");
  const [dailySummary, setDailySummary] = useState<DailyMetricsSummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklyMetricsSummary | null>(null);
  const [graphSnapshot, setGraphSnapshot] = useState<GraphSnapshot | null>(null);
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null);
  const [graphNavigationState, setGraphNavigationState] = useState<GraphNavigationState>({
    entries: [],
    index: -1
  });
  const [graphNeighborhood, setGraphNeighborhood] = useState<GraphNeighborhood | null>(null);
  const [pinnedGraphNeighborhood, setPinnedGraphNeighborhood] = useState<GraphNeighborhood | null>(
    null
  );
  const [graphPathTrace, setGraphPathTrace] = useState<GraphPathTrace | null>(null);
  const [selectedTraceTargetNodeId, setSelectedTraceTargetNodeId] = useState<string | null>(null);
  const [graphSearchQuery, setGraphSearchQuery] = useState("");
  const [graphSearchScopeEnabled, setGraphSearchScopeEnabled] = useState(false);
  const [graphActionNotice, setGraphActionNotice] = useState<{
    action: string;
    scope: string;
    nextStep: string;
  } | null>(null);
  const [graphNeighborhoodStatus, setGraphNeighborhoodStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  const [graphNeighborhoodError, setGraphNeighborhoodError] = useState<string | null>(null);
  const [graphPathTraceStatus, setGraphPathTraceStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  const [graphPathTraceError, setGraphPathTraceError] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<SkillRunSummary[]>([]);
  const [skillRunDetail, setSkillRunDetail] = useState<{
    skill: SkillSummary;
    runs: SkillRunSummary[];
    loading: boolean;
  } | null>(null);
  const [auditEvents, setAuditEvents] = useState<LocalAuditEvent[]>([]);
  const [proposals, setProposals] = useState<OptimizationProposal[]>([]);
  const [skillAnalysis, setSkillAnalysis] = useState<SkillIntelligenceAnalysis | null>(null);
  const [skillAnalysisStatus, setSkillAnalysisStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  const [skillAnalysisError, setSkillAnalysisError] = useState<string | null>(null);
  const [proposalFilter, setProposalFilter] =
    useState<OptimizationProposalStatus | "all">("all");

  const [policyName, setPolicyName] = useState(defaultPolicyName);
  const [scanRoots, setScanRoots] = useState<string[]>([]);
  const [scanExclusions, setScanExclusions] = useState<string[]>([]);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedSkillAnalysisSkillId, setSelectedSkillAnalysisSkillId] = useState("");
  const [selectedLibraryStage, setSelectedLibraryStage] = useState<LibraryStage>("summary");
  const [activeSkillAssetTab, setActiveSkillAssetTab] = useState<"local" | "remote">("local");
  const [skillLibraryQuery, setSkillLibraryQuery] = useState("");
  const [skillLibraryProjectFilter, setSkillLibraryProjectFilter] = useState("all");
  const [skillLibraryTypeFilter, setSkillLibraryTypeFilter] = useState<SkillLibraryTypeFilter>("all");
  const [skillLibrarySortKey, setSkillLibrarySortKey] = useState<SkillLibrarySortKey>("priority");
  const [remoteLibraryQuery, setRemoteLibraryQuery] = useState("");
  const [remoteLibrarySortKey, setRemoteLibrarySortKey] = useState<RemoteLibrarySortKey>("name");
  const [skillChineseAssistEnabled, setSkillChineseAssistEnabled] = useState(true);
  const [remoteRepositoryUrl, setRemoteRepositoryUrl] = useState("");
  const [remoteSourceAnalysis, setRemoteSourceAnalysis] =
    useState<RemoteSkillSourceAnalysis | null>(null);
  const [remoteSourceError, setRemoteSourceError] = useState<string | null>(null);
  const [skillActionNotice, setSkillActionNotice] = useState<{
    skillId: string;
    skillName: string;
    action: string;
    summary: string;
    detail: string;
  } | null>(null);
  const [marketplaceQuery, setMarketplaceQuery] = useState("");
  const [marketplaceCatalog, setMarketplaceCatalog] = useState<RemoteMarketplaceCatalog | null>(null);
  const [selectedMarketplaceSkillId, setSelectedMarketplaceSkillId] = useState<string | null>(null);
  const [selectedMarketplaceAction, setSelectedMarketplaceAction] =
    useState<"preview" | "analyze" | "import" | "install">("preview");
  const [marketplaceActionNotice, setMarketplaceActionNotice] = useState<{
    skillName: string;
    action: string;
    summary: string;
    nextStep: string;
  } | null>(null);
  const [marketplaceImportResult, setMarketplaceImportResult] =
    useState<RemoteSkillImportResult | null>(null);
  const [marketplaceActivationPreview, setMarketplaceActivationPreview] =
    useState<RemoteSkillActivationPreview | null>(null);
  const [remoteCandidates, setRemoteCandidates] = useState<RemoteSkillCandidateSummary[]>([]);
  const [selectedRemoteCandidateId, setSelectedRemoteCandidateId] = useState<string | null>(null);
  const [remoteCandidateDetail, setRemoteCandidateDetail] =
    useState<RemoteSkillCandidateDetail | null>(null);
  const [remoteCandidateDetailError, setRemoteCandidateDetailError] = useState<string | null>(null);
  const [proposalDecisionNotice, setProposalDecisionNotice] = useState<{
    proposalTitle: string;
    skillName: string;
    action: string;
    summary: string;
    nextStep: string;
  } | null>(null);
  const [applyScope, setApplyScope] = useState<SkillApplyScope>("project");
  const [applyPreview, setApplyPreview] = useState<SkillApplyPreview | null>(null);
  const [applyPreviewError, setApplyPreviewError] = useState<string | null>(null);
  const [applyWorkbenchStage, setApplyWorkbenchStage] =
    useState<"scope" | "preview" | "guardrails" | "confirm">("scope");
  const [applyFlowNotice, setApplyFlowNotice] = useState<{
    title: string;
    summary: string;
    detail: string;
  } | null>(null);
  const [applyScopeNotice, setApplyScopeNotice] = useState<{
    scope: string;
    summary: string;
    nextStep: string;
  } | null>(null);
  const [remoteApplyCandidate, setRemoteApplyCandidate] =
    useState<RemoteSkillCandidateSummary | null>(null);
  const [remoteApplyCandidateDetail, setRemoteApplyCandidateDetail] =
    useState<RemoteSkillCandidateDetail | null>(null);
  const [telemetryMode, setTelemetryMode] = useState<TelemetryMode>("estimated");
  const [allowRawContent, setAllowRawContent] = useState(false);
  const [allowBackgroundWatch, setAllowBackgroundWatch] = useState(false);
  const [selectedBundleSkillId, setSelectedBundleSkillId] = useState("");
  const [bundleExportName, setBundleExportName] = useState("");
  const [bundleManifestPath, setBundleManifestPath] = useState("");
  const [bundleImportStrategy, setBundleImportStrategy] =
    useState<SkillBundleImportStrategy>("preserve_existing");
  const [bundleActionNotice, setBundleActionNotice] = useState<{
    action: string;
    bundleName: string;
    summary: string;
    nextStep: string;
  } | null>(null);
  const [interactionNotice, setInteractionNotice] = useState<InteractionNotice | null>(null);
  const interactionNoticeRef = useRef<InteractionNotice | null>(null);
  const monitoringRefreshInFlightRef = useRef<Set<string>>(new Set());
  const monitoringSessionStartedAtRef = useRef(Date.now());
  const projectDatabaseHydratedRef = useRef(false);

  const busy = busyAction !== null;
  const tx = (en: string, zh: string) => formatLocalizedText(languageMode, en, zh);
  const compactTx = (en: string, zh: string) => tx(en, zh);
  const t = (en: string) => (uiCopy[en] ? formatLocalizedText(languageMode, en, uiCopy[en]) : en);
  const languageContextValue: LanguageContextValue = {
    mode: languageMode,
    tx,
    t
  };
  const selectedLocalToolSource =
    localToolSources.find((source) => source.id === selectedLocalToolSourceId) ?? null;
  const baseGraph = getSnapshotGraph(graphSnapshot);
  const deferredGraphSearchQuery = useDeferredValue(graphSearchQuery);
  const baseVisibleGraph = mergeGraphVisibleGraph(
    baseGraph,
    graphSnapshot?.generatedAt ?? null,
    pinnedGraphNeighborhood
  );
  const graphSearchMatches = getGraphSearchMatches(
    baseVisibleGraph?.nodes ?? [],
    deferredGraphSearchQuery
  );
  const graphSearchMatchNodeIds = new Set(graphSearchMatches.map((entry) => entry.node.id));
  const navigableGraphNodeIds = new Set(baseVisibleGraph?.nodes.map((node) => node.id) ?? []);
  const baseVisibleGraphNodeMap = new Map(
    (baseVisibleGraph?.nodes ?? []).map((node) => [node.id, node] as const)
  );
  const graphSnapshotNodeByIdentity = new Map(
    (graphSnapshot?.nodes ?? []).map((node) => [
      getGraphNodeIdentityKey(node.nodeType, node.refId),
      node
    ] as const)
  );
  const topologyBaseGraph =
    graphSearchScopeEnabled && graphSearchMatchNodeIds.size > 0
      ? buildGraphSearchScopeGraph(baseVisibleGraph, graphSearchMatchNodeIds)
      : baseVisibleGraph;
  const activeGraphPathTrace =
    graphPathTrace &&
    graphSnapshot &&
    selectedGraphNodeId &&
    graphPathTrace.centerNodeId === selectedGraphNodeId &&
    graphPathTrace.generatedAt === graphSnapshot.generatedAt
      ? graphPathTrace
      : null;
  const selectedTracePath =
    selectedTraceTargetNodeId && activeGraphPathTrace
      ? activeGraphPathTrace.paths.find((path) => path.targetNode.id === selectedTraceTargetNodeId) ??
        null
      : null;
  const selectedGraphNode =
    selectedGraphNodeId && baseVisibleGraphNodeMap.size > 0
      ? baseVisibleGraphNodeMap.get(selectedGraphNodeId) ?? null
      : null;
  const graphNavigationHistoryNodes = graphNavigationState.entries
    .map((nodeId) => baseVisibleGraphNodeMap.get(nodeId) ?? null)
    .filter((node): node is GraphNodeSummary => node !== null);
  const visibleGraph = mergeGraphTracePathGraph(topologyBaseGraph, selectedTracePath);
  const interactiveGraphNodeIds = new Set(topologyBaseGraph?.nodes.map((node) => node.id) ?? []);
  const searchScopeSummary =
    graphSearchScopeEnabled &&
    graphSearchMatches.length > 0 &&
    normalizeGraphSearchValue(graphSearchQuery).length > 0
      ? {
          query: graphSearchQuery.trim(),
          matchCount: graphSearchMatches.length
        }
      : null;
  const visibleNodeCount = visibleGraph?.nodes.length ?? 0;
  const visibleEdgeCount = visibleGraph?.edges.length ?? 0;
  const telemetryImportGraphTargets = telemetryResult
    ? getTelemetryImportGraphTargets(telemetryResult, resolveGraphNode)
    : [];
  const telemetryImportGraphHint = telemetryResult
    ? getTelemetryImportGraphHint(telemetryResult, telemetryImportGraphTargets.length)
    : null;
  const graphListScopePills = (
    <>
      <span className="mini-pill mini-pill-strong">{visibleNodeCount} nodes</span>
      <span className="mini-pill">{visibleEdgeCount} edges</span>
      {searchScopeSummary ? <span className="mini-pill">search focus</span> : null}
      {selectedTracePath ? <span className="mini-pill">trace overlay</span> : null}
      {!searchScopeSummary && pinnedGraphNeighborhood?.centerNode ? (
        <span className="mini-pill">pinned scope</span>
      ) : null}
    </>
  );
  const librarySkillRows = (boot?.skills ?? [])
    .map((skill) => {
      const skillRuns = recentRuns.filter((run) => run.skillId === skill.id);
      const completedRuns = skillRuns.filter((run) => run.status === "completed").length;
      const failedRuns = skillRuns.filter((run) => run.status === "failed").length;
      const openProposalCount = proposals.filter(
        (proposal) => proposal.skillId === skill.id && proposal.status === "open"
      ).length;
      const performanceScore =
        skillRuns.length === 0 ? "n/a" : `${Math.round((completedRuns / skillRuns.length) * 100)}%`;
      const healthTrend = skill.health.trend;
      const healthDelta =
        healthTrend.delta === null
          ? tx("New baseline", "新基线")
          : `${healthTrend.delta > 0 ? "+" : ""}${healthTrend.delta} ${tx("vs previous", "较上次")}`;
      const healthTrendLabel =
        healthTrend.direction === "up"
          ? tx("Improving", "改善中")
          : healthTrend.direction === "down"
            ? tx("Declining", "下降中")
            : healthTrend.direction === "flat"
              ? tx("Stable", "稳定")
              : tx("Baseline", "基线");
      const healthLabel =
        skill.health.status === "healthy"
          ? tx("Healthy", "健康")
          : skill.health.status === "needs_attention"
            ? tx("Needs Attention", "需要关注")
            : skill.health.status === "deprecated"
              ? tx("Deprecated", "已过时")
              : tx("Unknown", "未知");
      const roleLabel = formatSkillRole(skill.governance.role, languageMode);
      const governanceSignal = formatSkillGovernanceSignal(skill.governance, languageMode);
      const governanceDataSummary = formatSkillGovernanceDataSummary(
        skill.governance,
        languageMode
      );
      const governanceStorageLabel = formatSkillStoragePolicy(
        skill.governance.storagePolicy,
        languageMode
      );
      const governanceReuseLabel = formatSkillReusePolicy(
        skill.governance.reusePolicy,
        languageMode
      );
      const governanceScopeLabel = formatSkillRecommendedScope(
        skill.governance.recommendedScope,
        languageMode
      );
      const preferredHarnessLabel = formatSkillPreferredHarness(
        skill.governance.preferredHarness,
        languageMode
      );
      const structureLabel = formatSkillStructureType(
        skill.governance.structureType,
        languageMode
      );
      const frameworkLabel = formatSkillFrameworkLabel(
        skill.governance.frameworkLabel,
        languageMode
      );
      const orchestrationSummary = formatSkillOrchestrationSummary(
        skill.governance,
        languageMode
      );
      const moduleCountLabel = formatSkillModuleCount(
        skill.governance.moduleCountHint,
        languageMode
      );
      const governanceBoundary = formatSkillGovernanceBoundary(
        skill.governance,
        languageMode
      );
      const rawPurposeSummary =
        skill.description ??
        tx("Indexed local Skill ready for analysis and scoped apply.", "已索引本地技能，可分析并按范围应用。");
      const purposeSummary =
        languageMode === "zh" && skillChineseAssistEnabled
          ? buildChineseSkillReadingAid(skill)
          : rawPurposeSummary;
      const developmentBoost =
        skill.governance.role === "development" && skill.governance.preferredHarness === "superpowers"
          ? 18
          : 0;
      const priorityScore =
        skill.health.score +
        Math.min(24, skillRuns.length * 2) -
        openProposalCount * 8 -
        failedRuns * 6 +
        developmentBoost;

      return {
        skill,
        skillRuns,
        completedRuns,
        failedRuns,
        openProposalCount,
        performanceScore,
        healthTrend,
        healthDelta,
        healthTrendLabel,
        healthLabel,
        healthReason: skill.health.reasons[0] ?? tx("No material risk signal detected", "未发现明显风险信号"),
        roleLabel,
        governanceSignal,
        governanceDataSummary,
        governanceStorageLabel,
        governanceReuseLabel,
        governanceScopeLabel,
        preferredHarnessLabel,
        structureLabel,
        frameworkLabel,
        orchestrationSummary,
        moduleCountLabel,
        governanceBoundary,
        rawPurposeSummary,
        purposeSummary,
        priorityScore
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore);
  const filteredLibrarySkillRows = librarySkillRows
    .filter((row) => {
      const query = skillLibraryQuery.trim().toLocaleLowerCase();
      const sourceProject = managedProjects.find((project) =>
        isPathInsideProject(row.skill.sourcePath, project.path)
      );
      const queryMatches =
        query.length === 0 ||
        [
          row.skill.displayName,
          row.skill.canonicalName,
          row.skill.sourcePath,
          row.purposeSummary,
          sourceProject?.name ?? ""
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      const projectMatches =
        skillLibraryProjectFilter === "all" ||
        (skillLibraryProjectFilter === "unbound" && !sourceProject) ||
        sourceProject?.path === skillLibraryProjectFilter;
      const typeMatches =
        skillLibraryTypeFilter === "all" ||
        row.skill.governance.role === skillLibraryTypeFilter;

      return queryMatches && projectMatches && typeMatches;
    })
    .sort((left, right) => {
      if (skillLibrarySortKey === "name") {
        return left.skill.displayName.localeCompare(right.skill.displayName);
      }
      if (skillLibrarySortKey === "calls") {
        return right.skill.runtime.totalRuns - left.skill.runtime.totalRuns;
      }
      if (skillLibrarySortKey === "tokens") {
        return right.skill.runtime.totalTokens - left.skill.runtime.totalTokens;
      }
      if (skillLibrarySortKey === "score") {
        return right.skill.health.score - left.skill.health.score;
      }
      if (skillLibrarySortKey === "latest") {
        return (right.skill.runtime.latestRunAt ?? right.skill.lastSeenAt).localeCompare(
          left.skill.runtime.latestRunAt ?? left.skill.lastSeenAt
        );
      }
      return right.priorityScore - left.priorityScore;
    });
  const filteredRemoteCandidates = remoteCandidates
    .filter((candidate) => {
      const query = remoteLibraryQuery.trim().toLocaleLowerCase();
      return (
        query.length === 0 ||
        [
          candidate.displayName,
          candidate.normalizedUrl,
          candidate.catalogSkillId ?? "",
          candidate.sourceType,
          candidate.status
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)
      );
    })
    .sort((left, right) => {
      if (remoteLibrarySortKey === "risk") {
        const riskRank: Record<RemoteSkillRiskLevel, number> = {
          low: 1,
          medium: 2,
          high: 3,
          blocked: 4
        };
        return riskRank[right.riskLevel] - riskRank[left.riskLevel];
      }
      if (remoteLibrarySortKey === "status") {
        return right.status.localeCompare(left.status);
      }
      if (remoteLibrarySortKey === "source") {
        return left.normalizedUrl.localeCompare(right.normalizedUrl);
      }
      return left.displayName.localeCompare(right.displayName);
    });
  const primaryLibrarySkill =
    librarySkillRows.find((row) => row.skill.id === selectedSkillAnalysisSkillId)?.skill ??
    filteredLibrarySkillRows[0]?.skill ??
    librarySkillRows[0]?.skill ??
    null;
  const topLibrarySkillRows = librarySkillRows.slice(0, 3);
  const developmentLibrarySkillRows = librarySkillRows.filter(
    (row) => row.skill.governance.role === "development"
  );
  const selectedLibrarySkillRow =
    librarySkillRows.find((row) => row.skill.id === primaryLibrarySkill?.id) ?? librarySkillRows[0] ?? null;
  const selectedLibraryOpenProposals = selectedLibrarySkillRow
    ? proposals.filter(
        (proposal) =>
          proposal.skillId === selectedLibrarySkillRow.skill.id && proposal.status === "open"
      )
    : [];
  const evaluationTargetRow = selectedLibrarySkillRow ?? librarySkillRows[0] ?? null;
  const evaluationTargetHasAnalysis =
    Boolean(skillAnalysis && evaluationTargetRow && skillAnalysis.skillId === evaluationTargetRow.skill.id);
  const evaluationRoutingScore = evaluationTargetRow
    ? Math.min(100, Math.max(38, evaluationTargetRow.skill.health.score + (evaluationTargetRow.skillRuns.length > 0 ? 8 : -8)))
    : 0;
  const evaluationCostScore = evaluationTargetRow
    ? Math.min(
        100,
        Math.max(
          35,
          88 -
            Math.round(
              (evaluationTargetRow.skillRuns.reduce((sum, run) => sum + run.totalTokens, 0) /
                Math.max(evaluationTargetRow.skillRuns.length, 1)) /
                220
            )
        )
      )
    : 0;
  const evaluationDeveloperFitScore = evaluationTargetRow
    ? Math.min(
        100,
        evaluationTargetRow.skill.health.score +
          (evaluationTargetRow.skill.governance.role === "development" ? 10 : 0) +
          (evaluationTargetHasAnalysis ? 6 : 0)
      )
    : 0;
  const evaluationSafetyScore = evaluationTargetRow
    ? Math.min(
        100,
        Math.max(
          40,
          92 -
            (evaluationTargetRow.skill.governance.containsSensitiveOperationalData ? 18 : 0) -
            evaluationTargetRow.openProposalCount * 6
        )
      )
    : 0;
  const evaluationOverallScore = evaluationTargetRow
    ? Math.round(
        (evaluationRoutingScore +
          evaluationCostScore +
          evaluationDeveloperFitScore +
          evaluationSafetyScore) /
          4
      )
    : 0;
  const overviewActionItems = [
    ...managedProjects
      .filter((project) => !project.lastScanAt)
      .map((project) => ({
        id: `project-scan-${project.id}`,
        tone: "project",
        projectName: project.name,
        title: tx("Scan this project", "扫描这个项目"),
        detail: tx("Project is bound but has no scan result yet.", "项目已绑定，但还没有扫描结果。"),
        href: "#discovery" as const,
        onClick: () => {
          setInspectedProjectPath(project.path);
          navigateToProductSection("#discovery");
        }
      })),
    ...managedProjects
      .filter((project) => project.lastScanAt && !project.monitoringEnabled)
      .map((project) => ({
        id: `project-monitor-${project.id}`,
        tone: "agent",
        projectName: project.name,
        title: tx("Enable heartbeat monitor", "开启心跳监控"),
        detail: tx("Runtime evidence will not keep refreshing until monitoring is enabled.", "开启监控后，运行证据才会持续刷新。"),
        href: "#discovery" as const,
        onClick: () => {
          setInspectedProjectPath(project.path);
          navigateToProductSection("#discovery");
        }
      })),
    ...proposals
      .filter(
        (proposal) =>
          proposal.status === "open" &&
          boot?.skills.some(
            (skill) =>
              skill.id === proposal.skillId &&
              managedProjects.some((project) => isPathInsideProject(skill.sourcePath, project.path))
          )
      )
      .map((proposal) => {
        const skill = boot?.skills.find((entry) => entry.id === proposal.skillId) ?? null;
        const project = skill
          ? managedProjects.find((entry) => isPathInsideProject(skill.sourcePath, entry.path)) ?? null
          : null;
        return {
          id: `proposal-${proposal.id}`,
          tone: proposal.severity === "high" ? "proposal" : "skill",
          projectName: project?.name ?? tx("Unbound", "未绑定"),
          title: formatProposalTitle(proposal, languageMode),
          detail: formatProposalBenefit(proposal, languageMode),
          href: "#proposals" as const,
          onClick: () => {
            setProposalFilter("open");
            setActiveProposalId(proposal.id);
            navigateToProductSection("#proposals");
          }
        };
      }),
    ...librarySkillRows
      .filter(
        (row) =>
          row.skill.runtime.totalRuns > 0 &&
          row.skill.health.score < 70 &&
          managedProjects.some((project) => isPathInsideProject(row.skill.sourcePath, project.path))
      )
      .map((row) => {
        const project = managedProjects.find((entry) => isPathInsideProject(row.skill.sourcePath, entry.path)) ?? null;
        return {
          id: `skill-health-${row.skill.id}`,
          tone: "skill",
          projectName: project?.name ?? tx("Unbound", "未绑定"),
          title: tx("Review low-score Skill", "复查低分技能"),
          detail: `${row.skill.displayName} · ${row.skill.health.score}`,
          href: "#local-skills" as const,
          onClick: () => {
            setActiveSkillAssetTab("local");
            setSelectedSkillAnalysisSkillId(row.skill.id);
            navigateToProductSection("#local-skills");
          }
        };
      })
  ];
  const guidedFlowSteps = [
    {
      href: "#discovery" as const,
      label: tx("Projects", "项目管理"),
      compactLabel: compactTx("Projects", "项目"),
      title: tx("Manage one project", "管理一个项目"),
      instruction: tx(
        "Bind one project folder, scan only that directory, and use the project list as the main entry.",
        "绑定一个项目文件夹，只扫描该目录，并把项目列表作为主入口。"
      ),
      cta: tx("Open Projects", "进入项目管理"),
      doneWhen: tx("Done when one project directory has been scanned.", "完成标准：已扫描一个项目目录。"),
      isDone: managedProjects.some((project) => Boolean(project.lastScanAt))
    },
    {
      href: "#local-skills" as const,
      label: tx("Library", "技能库"),
      compactLabel: compactTx("Library", "技能库"),
      title: tx("Manage the Skill assets", "管理技能资产"),
      instruction: tx(
        "Store scanned local Skills and imported remote candidates in one asset library.",
        "把扫描到的本地技能和远程导入候选统一收纳到技能库。"
      ),
      cta: tx("Open Library", "进入技能库"),
      doneWhen: tx("Done when one Skill is selected as the evaluation target.", "完成标准：选中一个 Skill 作为评测对象。"),
      isDone: Boolean(
        evaluationTargetRow &&
        targetProjectRoot &&
        isPathInsideProject(evaluationTargetRow.skill.sourcePath, targetProjectRoot)
      )
    },
    {
      href: "#evaluate" as const,
      label: tx("Reports", "评测报告"),
      compactLabel: compactTx("Reports", "报告"),
      title: tx("Read project and Skill reports", "查看项目与技能报告"),
      instruction: tx(
        "Review project health, Skill quality, heartbeat monitoring, and workflow effect.",
        "查看项目健康、技能质量、心跳监控和工作流效果。"
      ),
      cta: tx("Open Reports", "进入评测报告"),
      doneWhen: tx("Done when the selected Skill has an analysis snapshot or baseline score.", "完成标准：选中 Skill 有分析快照或基线评分。"),
      isDone: Boolean(
        evaluationTargetHasAnalysis &&
        evaluationTargetRow &&
        targetProjectRoot &&
        isPathInsideProject(evaluationTargetRow.skill.sourcePath, targetProjectRoot)
      )
    },
    {
      href: "#analysis" as const,
      label: tx("Runtime", "运行链路"),
      compactLabel: compactTx("Runtime", "链路"),
      title: tx("Verify real Codex / Claude value", "验证真实 Codex / Claude 价值"),
      instruction: tx(
        "Discover local tool sources, preview measurable sessions, then import normalized runtime evidence.",
        "发现本地工具来源，预览可测会话，再导入规范化运行证据。"
      ),
      cta: tx("Open Runtime", "进入运行链路"),
      doneWhen: tx("Done when recent runs or local tool telemetry are available.", "完成标准：已有最近运行或本地工具遥测。"),
      isDone: Boolean(
        targetProjectRoot &&
        recentRuns.some((run) => {
          const skill = boot?.skills.find((entry) => entry.id === run.skillId);
          return Boolean(skill && isPathInsideProject(skill.sourcePath, targetProjectRoot));
        })
      )
    }
  ];
  const activeFlowStepIndex = guidedFlowSteps.findIndex((step) => step.href === activeSectionHref);
  const firstIncompleteFlowStepIndex = guidedFlowSteps.findIndex((step) => !step.isDone);
  const isGuidedFlowComplete = firstIncompleteFlowStepIndex < 0;
  const recommendedFlowStep =
    guidedFlowSteps[
      activeFlowStepIndex >= 0
        ? activeFlowStepIndex
        : firstIncompleteFlowStepIndex >= 0
          ? firstIncompleteFlowStepIndex
          : guidedFlowSteps.length - 1
    ];
  const recommendedFlowTitle = isGuidedFlowComplete
    ? tx("Core workflow ready", "核心流程已就绪")
    : recommendedFlowStep.title;
  const recommendedFlowInstruction = isGuidedFlowComplete
    ? tx(
        "Project assets, reports, and runtime evidence are available. Review monitoring signals or pick one Skill to improve.",
        "项目资产、报告与运行证据都已具备。建议查看监控信号，或挑一个技能继续打磨。"
      )
    : recommendedFlowStep.instruction;
  const recommendedFlowCta = isGuidedFlowComplete
    ? tx("Review Runtime", "查看运行链路")
    : recommendedFlowStep.cta;
  const getGuidedFlowStepState = (step: (typeof guidedFlowSteps)[number], index: number) => {
    const isActive =
      step.href === activeSectionHref || (activeSectionHref === "#overview" && step.href === recommendedFlowStep.href);
    const firstIncompleteIndex =
      firstIncompleteFlowStepIndex >= 0 ? firstIncompleteFlowStepIndex : guidedFlowSteps.length - 1;
    if (isActive) return "active";
    if (step.isDone) return "done";
    if (index === firstIncompleteIndex) return "next";
    return "pending";
  };
  const selectedDevelopmentSkillRow =
    (selectedLibrarySkillRow?.skill.governance.role === "development"
      ? selectedLibrarySkillRow
      : developmentLibrarySkillRows[0]) ?? null;
  const selectedSkillHarnessCompatibility = selectedLibrarySkillRow
    ? [
        {
          harness: "Superpowers",
          status:
            selectedLibrarySkillRow.skill.governance.preferredHarness === "superpowers"
              ? tx("Preferred", "优先")
              : tx("Compatible", "兼容"),
          tone:
            selectedLibrarySkillRow.skill.governance.preferredHarness === "superpowers"
              ? "preferred"
              : "compatible",
          note:
            selectedLibrarySkillRow.skill.governance.preferredHarness === "superpowers"
              ? tx(
                  "Best fit for plan, implement, test, review, and finish loops.",
                  "最适合计划、实现、测试、审查、收尾这一条开发闭环。"
                )
              : tx(
                  "Works as a reusable local Skill, but not the primary development harness.",
                  "可以作为本地复用 Skill 使用，但不是首选开发框架。"
                )
        },
        {
          harness: "Codex Native",
          status: tx("Compatible", "兼容"),
          tone: "compatible",
          note: tx(
            "Good for local-first execution, previews, and scoped apply flows.",
            "适合本地优先执行、预览和按范围应用流程。"
          )
        },
        {
          harness: "Claude Skill Folder",
          status: tx("Review", "审查"),
          tone: "review",
          note: tx(
            "Portable after checking prompts, scripts, and resource assumptions.",
            "检查提示词、脚本和资源假设后可迁移。"
          )
        },
        {
          harness: "Cursor Rules",
          status: tx("Review", "审查"),
          tone: "review",
          note: tx(
            "Useful for editor guidance, but often loses workflow and governance detail.",
            "适合编辑器内指导，但常会丢失工作流与治理细节。"
          )
        }
      ]
    : [];
  const activeApplyPreview = (() => {
    if (!applyPreview || applyPreview.scope !== applyScope) {
      return null;
    }

    if (remoteApplyCandidate) {
      return applyPreview.remoteCandidateId === remoteApplyCandidate.candidateId ? applyPreview : null;
    }

    return applyPreview.skillId === primaryLibrarySkill?.id ? applyPreview : null;
  })();
  const visibleMarketplaceCollections = marketplaceCatalog?.collections ?? [];
  const visibleMarketplaceSkills = marketplaceCatalog?.skills ?? [];
  const selectedMarketplaceSkill: RemoteMarketplaceSkill | null =
    visibleMarketplaceSkills.find((skill) => skill.id === selectedMarketplaceSkillId) ??
    visibleMarketplaceSkills[0] ??
    null;
  const selectedRemoteCandidate =
    remoteCandidates.find((candidate) => candidate.candidateId === selectedRemoteCandidateId) ??
    remoteCandidates[0] ??
    null;
  const selectedRemoteCandidateDetail =
    remoteCandidateDetail?.candidate.candidateId === selectedRemoteCandidate?.candidateId
      ? remoteCandidateDetail
      : null;
  const selectedMarketplaceActionLabel =
    selectedMarketplaceAction === "analyze"
      ? tx("Analyze", "分析")
      : selectedMarketplaceAction === "import"
        ? tx("Import", "导入")
        : selectedMarketplaceAction === "install"
          ? tx("Install", "安装")
          : tx("Preview", "预览");
  const currentProductSection = activeSectionHref.slice(1);
  const hasSelectedProject = targetProjectRoot.trim().length > 0;
  const normalizedTargetProjectRoot = normalizeProjectPath(targetProjectRoot);
  const focusedManagedProject = managedProjects.find((project) => project.path === normalizedTargetProjectRoot) ?? null;
  const focusedProjectDisplayName = targetProjectRoot
    ? focusedManagedProject?.name ?? getProjectDisplayName(targetProjectRoot)
    : "";
  const inspectedProject = inspectedProjectPath
    ? managedProjects.find((project) => project.path === normalizeProjectPath(inspectedProjectPath)) ?? null
    : null;
  const selectedProjectLog = selectedProjectLogPath
    ? managedProjects.find((project) => project.path === normalizeProjectPath(selectedProjectLogPath)) ?? null
    : null;
  const selectedProjectLogEntries = selectedProjectLog
    ? projectOnboardingLogs
        .filter((entry) => entry.projectPath === selectedProjectLog.path)
        .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    : [];
  const currentProjectSkills = hasSelectedProject
    ? (boot?.skills ?? []).filter((skill) =>
        isPathInsideProject(skill.sourcePath, normalizedTargetProjectRoot)
      )
    : [];
  const currentProjectSkillIds = new Set(currentProjectSkills.map((skill) => skill.id));
  const currentProjectSkillCount = currentProjectSkills.length;
  const currentProjectRuns = hasSelectedProject
    ? recentRuns.filter((run) => currentProjectSkillIds.has(run.skillId))
    : [];
  const activeScanTargetLabel =
    scanResult?.scanScope === "project"
      ? tx("Project scan", "项目扫描")
      : tx("Project workspace", "项目工作区");
  const isEmptyTargetProject =
    scanResult?.scanScope === "project" &&
    scanResult.skillsFound === 0 &&
    scanResult.rootPaths.length > 0;
  const workflowStarterProjectRoot =
    scanResult?.scanScope === "project" && scanResult.rootPaths[0]
      ? scanResult.rootPaths[0]
      : targetProjectRoot;
  const isEmptyScanDialogProject =
    scanResultDialog?.scanScope === "project" &&
    scanResultDialog.skillsFound === 0;
  const isWorkflowAppliedToScanDialogProject =
    scanResultDialog?.scanScope === "project" &&
    workflowStarterResult?.preview.projectRoot === scanResultDialog.rootPaths[0];
  const scanResultDialogProjectRoot = scanResultDialog?.rootPaths[0]
    ? normalizeProjectPath(scanResultDialog.rootPaths[0])
    : "";
  const scanResultDialogProject =
    managedProjects.find((project) => project.path === scanResultDialogProjectRoot) ?? null;

  useEffect(() => {
    if (!inspectedProject) {
      setProjectProfile(null);
      return undefined;
    }

    let cancelled = false;
    setProjectProfile(null);
    void window.workbench
      .getProjectProfile(inspectedProject.path)
      .then((nextProfile) => {
        if (!cancelled) {
          setProjectProfile(nextProfile);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjectProfile(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inspectedProject?.path]);

  useEffect(() => {
    interactionNoticeRef.current = interactionNotice;
  }, [interactionNotice]);

  useEffect(() => {
    window.localStorage.setItem(managedProjectsStorageKey, JSON.stringify(managedProjects));
  }, [managedProjects]);

  useEffect(() => {
    let cancelled = false;
    const localProjects = loadManagedProjects();
    if (typeof window.workbench.listManagedProjects !== "function") {
      projectDatabaseHydratedRef.current = true;
      return undefined;
    }
    void window.workbench
      .listManagedProjects()
      .then(async (storedProjects) => {
        if (cancelled) {
          return;
        }
        const projects =
          storedProjects.length > 0
            ? storedProjects
            : localProjects.length > 0
              ? await window.workbench.saveManagedProjects(localProjects)
              : [];
        if (cancelled) {
          return;
        }
        projectDatabaseHydratedRef.current = true;
        setManagedProjects(projects);
      })
      .catch(() => {
        projectDatabaseHydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !projectDatabaseHydratedRef.current ||
      typeof window.workbench.saveManagedProjects !== "function"
    ) {
      return;
    }
    void window.workbench.saveManagedProjects(managedProjects).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Failed to save project library");
    });
  }, [managedProjects]);

  useEffect(() => {
    window.localStorage.setItem(projectHeartbeatStorageKey, JSON.stringify(projectHeartbeatEntries));
  }, [projectHeartbeatEntries]);

  useEffect(() => {
    window.localStorage.setItem(projectOnboardingLogsStorageKey, JSON.stringify(projectOnboardingLogs));
  }, [projectOnboardingLogs]);

  useEffect(() => {
    if (targetProjectRoot.trim() || managedProjects.length === 0) {
      return;
    }

    const restoredProject = managedProjects[0];
    setTargetProjectRoot(restoredProject.path);
    setScanRoots([restoredProject.path]);
  }, [managedProjects, targetProjectRoot]);

  useEffect(() => {
    if (!scanResultDialog) {
      return;
    }

    const projectRoot = normalizeProjectPath(scanResultDialog.rootPaths[0] ?? "");
    const projectName =
      managedProjects.find((project) => project.path === projectRoot)?.name ??
      getProjectDisplayName(projectRoot);
    setScanResultProjectName(projectName);

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setScanResultDialog(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [scanResultDialog]);

  useEffect(() => {
    if (!inspectedProjectPath) {
      return;
    }

    function closeProjectDetailOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setInspectedProjectPath("");
      }
    }

    window.addEventListener("keydown", closeProjectDetailOnEscape);
    return () => window.removeEventListener("keydown", closeProjectDetailOnEscape);
  }, [inspectedProjectPath]);

  useEffect(() => {
    if (!pendingBindProjectRoot || busyAction === "project-scan") {
      return;
    }

    function closeBindDialogOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setPendingBindProjectRoot("");
      }
    }

    window.addEventListener("keydown", closeBindDialogOnEscape);
    return () => window.removeEventListener("keydown", closeBindDialogOnEscape);
  }, [pendingBindProjectRoot, busyAction]);

  useEffect(() => {
    const monitoredProjects = managedProjects.filter((project) => project.monitoringEnabled);
    if (
      monitoredProjects.length === 0 ||
      boot?.policy?.telemetryMode === "disabled" ||
      !boot?.policy?.allowBackgroundWatch
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const now = Date.now();
      monitoredProjects.forEach((project) => {
        if (now - monitoringSessionStartedAtRef.current < project.monitoringIntervalMs) {
          return;
        }
        const lastMonitorAt = project.lastMonitorAt ?? project.lastScanAt ?? project.boundAt;
        const elapsedMs = lastMonitorAt ? now - new Date(lastMonitorAt).getTime() : Number.POSITIVE_INFINITY;
        if (
          elapsedMs < project.monitoringIntervalMs ||
          monitoringRefreshInFlightRef.current.has(project.path)
        ) {
          return;
        }

        monitoringRefreshInFlightRef.current.add(project.path);
        void checkProjectConnectionHeartbeat(project).finally(() => {
          monitoringRefreshInFlightRef.current.delete(project.path);
        });
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [
    boot?.policy?.allowBackgroundWatch,
    boot?.policy?.telemetryMode,
    managedProjects
  ]);

  useEffect(() => {
    if (remoteCandidates.length === 0) {
      if (selectedRemoteCandidateId !== null) {
        setSelectedRemoteCandidateId(null);
      }
      return;
    }

    if (!selectedRemoteCandidateId || !remoteCandidates.some((candidate) => candidate.candidateId === selectedRemoteCandidateId)) {
      setSelectedRemoteCandidateId(remoteCandidates[0].candidateId);
    }
  }, [remoteCandidates, selectedRemoteCandidateId]);

  useEffect(() => {
    if (activeSkillAssetTab !== "local" || filteredLibrarySkillRows.length === 0) {
      return;
    }
    if (!filteredLibrarySkillRows.some((row) => row.skill.id === selectedSkillAnalysisSkillId)) {
      setSelectedSkillAnalysisSkillId(filteredLibrarySkillRows[0].skill.id);
    }
  }, [activeSkillAssetTab, filteredLibrarySkillRows, selectedSkillAnalysisSkillId]);

  useEffect(() => {
    if (!selectedRemoteCandidateId) {
      setRemoteCandidateDetail(null);
      setRemoteCandidateDetailError(null);
      return;
    }

    let cancelled = false;
    setRemoteCandidateDetailError(null);
    window.workbench
      .getRemoteSkillCandidateDetail(selectedRemoteCandidateId)
      .then((detail) => {
        if (!cancelled) {
          setRemoteCandidateDetail(detail);
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setRemoteCandidateDetail(null);
          setRemoteCandidateDetailError(
            nextError instanceof Error ? nextError.message : "Remote candidate detail failed"
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRemoteCandidateId]);

  useEffect(() => {
    if (!remoteSourceAnalysis || currentProductSection !== "discovery") {
      return;
    }

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollProductWorkspaceToElement(".remote-preflight-workbench", "smooth");
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
    };
  }, [currentProductSection, remoteSourceAnalysis]);

  useEffect(() => {
    void refreshWorkbench();
  }, []);

  useEffect(() => {
    const getCurrentHash = () => {
      const hash = window.location.hash;
      return productNavHrefs.includes(hash as (typeof productNavHrefs)[number])
        ? (hash as (typeof productNavHrefs)[number])
        : "#overview";
    };

    const getSectionForScrollPosition = () => {
      const workspace = productWorkspaceRef.current;
      if (!workspace) {
        return getCurrentHash();
      }

      if (workspace.classList.contains("single-module-mode")) {
        return getCurrentHash();
      }

      const scrollBottom =
        workspace.scrollTop + workspace.clientHeight >= workspace.scrollHeight - 4;
      if (scrollBottom) {
        return productNavHrefs[productNavHrefs.length - 1];
      }

      const workspaceRect = workspace.getBoundingClientRect();
      const anchorY = workspaceRect.top + Math.max(180, workspace.clientHeight * 0.38);
      let activeHref: (typeof productNavHrefs)[number] = "#overview";

      for (const href of productNavHrefs) {
        const section = document.getElementById(href.slice(1));
        if (!section) {
          continue;
        }

        const sectionRect = section.getBoundingClientRect();
        if (sectionRect.top <= anchorY && sectionRect.bottom > workspaceRect.top + 80) {
          activeHref = href;
        }
      }

      return activeHref;
    };

    const syncHash = () => {
      const nextHref = getCurrentHash();
      pendingNavigationHrefRef.current = nextHref;
      setActiveSectionHref(nextHref);
      window.requestAnimationFrame(() => {
        scrollProductWorkspaceToSection(nextHref, "auto");
      });
    };

    let animationFrameId = 0;
    const syncScrollPosition = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(() => {
        const pendingHref = pendingNavigationHrefRef.current;
        if (pendingHref) {
          const pendingSection = document.getElementById(pendingHref.slice(1));
          const workspace = productWorkspaceRef.current;
          if (pendingSection && workspace) {
            const workspaceRect = workspace.getBoundingClientRect();
            const sectionRect = pendingSection.getBoundingClientRect();
            const isSettled =
              sectionRect.top >= workspaceRect.top - 8 &&
              sectionRect.top <= workspaceRect.top + Math.max(180, workspace.clientHeight * 0.32);

            if (!isSettled) {
              setActiveSectionHref(pendingHref);
              return;
            }
          }

          pendingNavigationHrefRef.current = null;
        }

        setActiveSectionHref(getSectionForScrollPosition());
      });
    };

    syncScrollPosition();
    const workspace = productWorkspaceRef.current;
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    workspace?.addEventListener("scroll", syncScrollPosition, { passive: true });
    window.addEventListener("resize", syncScrollPosition);

    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
      workspace?.removeEventListener("scroll", syncScrollPosition);
      window.removeEventListener("resize", syncScrollPosition);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    productNavLinkRefs.current[activeSectionHref]?.scrollIntoView({
      block: "nearest",
      inline: "nearest"
    });
  }, [activeSectionHref]);

  useEffect(() => {
    if (!primaryLibrarySkill) {
      setSkillAnalysis(null);
      setSkillAnalysisStatus("idle");
      setSkillAnalysisError(null);
      return;
    }

    let cancelled = false;
    setSkillAnalysisStatus("loading");
    setSkillAnalysisError(null);

    window.workbench
      .getLatestSkillAnalysis(primaryLibrarySkill.id)
      .then((analysis) => {
        if (cancelled) {
          return;
        }
        setSkillAnalysis(analysis);
        setSkillAnalysisStatus(analysis ? "ready" : "idle");
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }
        setSkillAnalysis(null);
        setSkillAnalysisStatus("error");
        setSkillAnalysisError(
          nextError instanceof Error ? nextError.message : "Failed to load skill analysis"
        );
      });

    return () => {
      cancelled = true;
    };
  }, [primaryLibrarySkill?.id]);

  useEffect(() => {
    if (activeSectionHref !== "#apply-center") {
      setApplyPreview(null);
      setApplyPreviewError(null);
      return;
    }

    const previewInput = remoteApplyCandidate
      ? { remoteCandidateId: remoteApplyCandidate.candidateId, scope: applyScope }
      : primaryLibrarySkill
        ? { skillId: primaryLibrarySkill.id, scope: applyScope }
        : null;

    if (!previewInput || boot?.status !== "ready") {
      setApplyPreview(null);
      setApplyPreviewError(null);
      return;
    }

    let cancelled = false;
    setApplyPreviewError(null);

    window.workbench
      .previewSkillApply(previewInput)
      .then((preview) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setApplyPreview(preview);
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setApplyPreview(null);
          setApplyPreviewError(
            nextError instanceof Error ? nextError.message : "Apply preview failed"
          );
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeSectionHref, applyScope, boot?.status, primaryLibrarySkill?.id, remoteApplyCandidate?.candidateId]);

  useEffect(() => {
    let cancelled = false;

    window.workbench
      .listMarketplaceCatalog(marketplaceQuery)
      .then((catalog) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setMarketplaceCatalog(catalog);
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setMarketplaceCatalog(null);
        });
      });

    return () => {
      cancelled = true;
    };
  }, [marketplaceQuery]);

  useEffect(() => {
    if (visibleMarketplaceSkills.length === 0) {
      if (selectedMarketplaceSkillId !== null) {
        setSelectedMarketplaceSkillId(null);
      }
      return;
    }

    if (!selectedMarketplaceSkillId || !visibleMarketplaceSkills.some((skill) => skill.id === selectedMarketplaceSkillId)) {
      setSelectedMarketplaceSkillId(visibleMarketplaceSkills[0].id);
      setSelectedMarketplaceAction("preview");
    }
  }, [selectedMarketplaceSkillId, visibleMarketplaceSkills]);

  useEffect(() => {
    if (!selectedGraphNodeId) {
      return;
    }

    if (!topologyBaseGraph?.nodes.some((node) => node.id === selectedGraphNodeId)) {
      setSelectedGraphNodeId(null);
    }
  }, [topologyBaseGraph, selectedGraphNodeId]);

  useEffect(() => {
    setGraphNavigationState((current) => {
      if (current.entries.length === 0) {
        return current;
      }

      const nextEntries = current.entries.filter((nodeId) => navigableGraphNodeIds.has(nodeId));
      if (nextEntries.length === 0) {
        return current.index === -1 ? current : { entries: [], index: -1 };
      }

      const currentNodeId = current.entries[current.index] ?? null;
      const nextIndex =
        currentNodeId && nextEntries.includes(currentNodeId)
          ? nextEntries.indexOf(currentNodeId)
          : Math.min(Math.max(current.index, 0), nextEntries.length - 1);

      if (
        nextEntries.length === current.entries.length &&
        nextEntries.every((entry, index) => entry === current.entries[index]) &&
        nextIndex === current.index
      ) {
        return current;
      }

      return {
        entries: nextEntries,
        index: nextIndex
      };
    });
  }, [graphSnapshot?.generatedAt, pinnedGraphNeighborhood?.generatedAt, pinnedGraphNeighborhood?.centerNodeId]);

  useEffect(() => {
    if (!pinnedGraphNeighborhood) {
      return;
    }

    if (!graphSnapshot || pinnedGraphNeighborhood.generatedAt !== graphSnapshot.generatedAt) {
      startTransition(() => {
        setPinnedGraphNeighborhood(null);
      });
    }
  }, [graphSnapshot, pinnedGraphNeighborhood]);

  useEffect(() => {
    graphNeighborhoodCacheRef.current.clear();
  }, [graphSnapshot?.generatedAt]);

  useEffect(() => {
    if (!graphSearchScopeEnabled) {
      return;
    }

    if (
      normalizeGraphSearchValue(graphSearchQuery).length === 0 ||
      graphSearchMatches.length === 0
    ) {
      startTransition(() => {
        setGraphSearchScopeEnabled(false);
      });
    }
  }, [graphSearchMatches.length, graphSearchQuery, graphSearchScopeEnabled]);

  useEffect(() => {
    if (!selectedTraceTargetNodeId) {
      return;
    }

    startTransition(() => {
      setSelectedTraceTargetNodeId(null);
    });
  }, [selectedGraphNodeId, graphSnapshot?.generatedAt]);

  useEffect(() => {
    if (!selectedTraceTargetNodeId) {
      return;
    }

    if (!activeGraphPathTrace?.paths.some((path) => path.targetNode.id === selectedTraceTargetNodeId)) {
      startTransition(() => {
        setSelectedTraceTargetNodeId(null);
      });
    }
  }, [activeGraphPathTrace, selectedTraceTargetNodeId]);

  function applyGraphNodeFocus(nodeId: string | null) {
    if (!nodeId) {
      setSelectedGraphNodeId(null);
      return;
    }

    if (
      graphSearchScopeEnabled &&
      !interactiveGraphNodeIds.has(nodeId) &&
      navigableGraphNodeIds.has(nodeId)
    ) {
      setGraphSearchScopeEnabled(false);
    }

    setSelectedGraphNodeId(nodeId);
  }

  function showGraphActionNotice(action: string, scope: string, nextStep: string) {
    setGraphActionNotice({
      action,
      scope,
      nextStep
    });
  }

  function handleGraphSearchQueryChange(value: string) {
    setGraphSearchQuery(value);

    const trimmedValue = value.trim();
    showGraphActionNotice(
      trimmedValue.length > 0 ? tx("Search Query Updated", "搜索查询已更新") : tx("Search Query Cleared", "搜索查询已清空"),
      trimmedValue.length > 0
        ? tx(
            "The graph search stays local and only filters the already loaded snapshot.",
            "图谱搜索保持本地执行，只过滤已加载快照。"
          )
        : tx(
            "The topology remains on the current snapshot and any pinned or selected scope.",
            "拓扑保持在当前快照以及已有固定或选中范围上。"
          ),
      trimmedValue.length > 0
        ? tx(
            "Select a result or focus matches in topology when the match list looks right.",
            "匹配列表符合预期后，可选择结果或在拓扑中聚焦匹配项。"
          )
        : tx(
            "Use the suggestion list or type another node name, ref id, type, or summary.",
            "可使用建议列表，或输入另一个节点名称、ref id、类型或摘要。"
          )
    );
  }

  function handleGraphSearchScopeChange(next: boolean) {
    setGraphSearchScopeEnabled(next);
    showGraphActionNotice(
      next ? tx("Search Focus Applied", "搜索焦点已应用") : tx("Search Focus Cleared", "搜索焦点已清除"),
      next
        ? tx(
            `${graphSearchMatches.length} local match(es) and their direct relationships are now projected into topology.`,
            `${graphSearchMatches.length} 个本地匹配及其直接关系已投影到拓扑中。`
          )
        : tx(
            "The topology returned to the full visible graph window without rescanning roots.",
            "拓扑已回到完整可见图谱窗口，不会重新扫描根目录。"
          ),
      next
        ? tx(
            "Review the scope stack or clear search focus when you need the full map again.",
            "查看范围栈；需要完整地图时可清除搜索焦点。"
          )
        : tx(
            "Search text is preserved so you can reapply focus later.",
            "搜索文本会保留，稍后可再次应用焦点。"
          )
    );
  }

  function clearGraphSearchScope() {
    handleGraphSearchScopeChange(false);
  }

  function handleGraphTraceTargetChange(nodeId: string | null) {
    setSelectedTraceTargetNodeId(nodeId);
    const targetNode = nodeId ? baseVisibleGraphNodeMap.get(nodeId) ?? null : null;

    showGraphActionNotice(
      nodeId ? tx("Trace Focus Applied", "链路焦点已应用") : tx("Trace Focus Cleared", "链路焦点已清除"),
      nodeId
        ? tx(
            `A bounded path overlay is projected toward ${targetNode?.displayName ?? "the selected target"}.`,
            `有界路径投影已指向 ${targetNode?.displayName ?? "选中目标"}。`
          )
        : tx(
            "The trace overlay was removed while the underlying graph snapshot stayed unchanged.",
            "链路投影已移除，底层图谱快照保持不变。"
          ),
      nodeId
        ? tx(
            "Use Focus Analysis to inspect path evidence, then clear trace focus when done.",
            "在焦点分析中检查路径证据，完成后可清除链路焦点。"
          )
        : tx(
            "Continue with node selection, pinned neighborhoods, or search focus.",
            "可继续使用节点选择、固定邻域或搜索焦点。"
          )
    );
  }

  function clearGraphTraceFocus() {
    handleGraphTraceTargetChange(null);
  }

  function handleSelectedGraphNodeChange(nodeId: string | null) {
    startTransition(() => {
      if (!nodeId) {
        setSelectedGraphNodeId(null);
        setGraphActionNotice({
          action: tx("Selection Cleared", "选择已清除"),
          scope: tx(
            "Focus Analysis no longer follows a selected node, but the local graph snapshot is unchanged.",
            "焦点分析不再跟随选中节点，但本地图谱快照未改变。"
          ),
          nextStep: tx(
            "Select a topology node, search result, or history item to inspect context again.",
            "选择拓扑节点、搜索结果或历史项，即可再次检查上下文。"
          )
        });
        return;
      }

      applyGraphNodeFocus(nodeId);
      const nextNode = baseVisibleGraphNodeMap.get(nodeId) ?? null;
      setGraphActionNotice({
        action: tx("Node Focused", "节点已聚焦"),
        scope: tx(
          `${nextNode?.displayName ?? "Selected node"} now drives Focus Analysis and relationship highlighting.`,
          `${nextNode?.displayName ?? "选中节点"} 现在驱动焦点分析与关系高亮。`
        ),
        nextStep: tx(
          "Pin its neighborhood, inspect path traces, or jump through graph history as needed.",
          "可按需固定其邻域、检查路径追踪，或通过图谱历史跳转。"
        )
      });
      setGraphNavigationState((current) => {
        const committedEntries =
          current.index >= 0 ? current.entries.slice(0, current.index + 1) : [];
        if (committedEntries[committedEntries.length - 1] === nodeId) {
          if (
            committedEntries.length === current.entries.length &&
            current.index === committedEntries.length - 1
          ) {
            return current;
          }
          return {
            entries: committedEntries,
            index: committedEntries.length - 1
          };
        }

        const nextEntries = [...committedEntries, nodeId];
        const trimmedEntries = nextEntries.slice(-12);
        return {
          entries: trimmedEntries,
          index: trimmedEntries.length - 1
        };
      });
    });
  }

  function scrollToSkillGraphSection() {
    if (productWorkspaceRef.current?.classList.contains("single-module-mode")) {
      navigateToProductSection("#graph");
      return;
    }

    skillGraphSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function scrollProductWorkspaceToElement(selector: string, behavior: ScrollBehavior = "smooth") {
    const workspace = productWorkspaceRef.current;
    const target = document.querySelector<HTMLElement>(selector);

    if (!workspace || !target) {
      target?.scrollIntoView({ block: "nearest", behavior });
      return;
    }

    const workspaceRect = workspace.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetTop = workspace.scrollTop + targetRect.top - workspaceRect.top - 24;

    workspace.scrollTo({
      top: Math.max(0, targetTop),
      behavior
    });
  }

  function resolveGraphNode(nodeType: string, refId: string | null | undefined) {
    if (!refId) {
      return null;
    }

    return graphSnapshotNodeByIdentity.get(getGraphNodeIdentityKey(nodeType, refId)) ?? null;
  }

  function resolveGraphRootNodeByPath(rootPath: string | null | undefined) {
    if (!rootPath) {
      return null;
    }

    return (
      (graphSnapshot?.nodes ?? []).find(
        (node) => node.nodeType === "root" && node.metadata.path === rootPath
      ) ?? null
    );
  }

  function inspectGraphNodeFromPanels(node: GraphNodeSummary) {
    scrollToSkillGraphSection();

    startTransition(() => {
      setPinnedGraphNeighborhood(null);
      setGraphSearchScopeEnabled(false);
      setSelectedTraceTargetNodeId(null);
      setSelectedGraphNodeId(node.id);
      setGraphActionNotice({
        action: tx("Graph Node Opened", "图谱节点已打开"),
        scope: tx(
          `${node.displayName} is focused from another module, with temporary search and pinned scopes cleared.`,
          `${node.displayName} 已从其他模块聚焦，临时搜索与固定范围已清除。`
        ),
        nextStep: tx(
          "Use Focus Analysis to inspect related runs, proposals, bundles, and path traces.",
          "使用焦点分析检查相关运行、建议、Bundle 和路径追踪。"
        )
      });
      setGraphNavigationState((current) => {
        const committedEntries =
          current.index >= 0 ? current.entries.slice(0, current.index + 1) : [];
        if (committedEntries[committedEntries.length - 1] === node.id) {
          if (
            committedEntries.length === current.entries.length &&
            current.index === committedEntries.length - 1
          ) {
            return current;
          }
          return {
            entries: committedEntries,
            index: committedEntries.length - 1
          };
        }

        const nextEntries = [...committedEntries, node.id];
        const trimmedEntries = nextEntries.slice(-12);
        return {
          entries: trimmedEntries,
          index: trimmedEntries.length - 1
        };
      });
    });
  }

  function jumpToGraphNavigationIndex(index: number) {
    const nodeId = graphNavigationState.entries[index];
    if (!nodeId) {
      return;
    }

    startTransition(() => {
      applyGraphNodeFocus(nodeId);
      const nextNode = baseVisibleGraphNodeMap.get(nodeId) ?? null;
      setGraphActionNotice({
        action: tx("History Jump", "历史跳转"),
        scope: tx(
          `${nextNode?.displayName ?? "Graph history node"} is restored from this session's local navigation stack.`,
          `${nextNode?.displayName ?? "图谱历史节点"} 已从本次会话的本地导航栈恢复。`
        ),
        nextStep: tx(
          "Move backward or forward again, or clear history when this exploration path is done.",
          "可继续前进/后退，或在探索完成后清空历史。"
        )
      });
      setGraphNavigationState((current) =>
        current.index === index
          ? current
          : {
              entries: current.entries,
              index
            }
      );
    });
  }

  function clearGraphNavigationHistory() {
    startTransition(() => {
      setGraphNavigationState({
        entries: [],
        index: -1
      });
      setGraphActionNotice({
        action: tx("Navigation History Cleared", "导航历史已清空"),
        scope: tx(
          "Only this session's graph navigation stack was cleared; the local graph snapshot was not changed.",
          "仅清空了本次会话的图谱导航栈；本地图谱快照未改变。"
        ),
        nextStep: tx(
          "Select a new node to start a fresh graph exploration trail.",
          "选择新节点即可开始新的图谱探索轨迹。"
        )
      });
    });
  }

  function resetGraphScopeToSnapshot() {
    startTransition(() => {
      setPinnedGraphNeighborhood(null);
      setGraphSearchScopeEnabled(false);
      setSelectedTraceTargetNodeId(null);
      setSelectedGraphNodeId(null);
      setGraphActionNotice({
        action: tx("Returned To Snapshot", "已返回快照"),
        scope: tx(
          "Pinned neighborhoods, search focus, trace focus, and node selection were cleared from the visible topology.",
          "可见拓扑中的固定邻域、搜索焦点、链路焦点和节点选择已清除。"
        ),
        nextStep: tx(
          "Use search, node selection, or Focus Analysis to build a new temporary scope.",
          "使用搜索、节点选择或焦点分析来构建新的临时范围。"
        )
      });
    });
  }

  useEffect(() => {
    if (!selectedGraphNodeId || !graphSnapshot) {
      setGraphNeighborhood(null);
      setGraphNeighborhoodStatus("idle");
      setGraphNeighborhoodError(null);
      return;
    }

    const cacheKey = getGraphNeighborhoodCacheKey(selectedGraphNodeId, graphSnapshot.generatedAt);
    const cachedNeighborhood = graphNeighborhoodCacheRef.current.get(cacheKey);
    if (cachedNeighborhood) {
      startTransition(() => {
        setGraphNeighborhood(cachedNeighborhood);
        setGraphNeighborhoodStatus("ready");
        setGraphNeighborhoodError(null);
      });
      return;
    }

    let cancelled = false;
    setGraphNeighborhoodStatus("loading");
    setGraphNeighborhood(null);
    setGraphNeighborhoodError(null);

    void window.workbench
      .getGraphNeighborhood(selectedGraphNodeId)
      .then((nextNeighborhood) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          graphNeighborhoodCacheRef.current.set(cacheKey, nextNeighborhood);
          setGraphNeighborhood(nextNeighborhood);
          setGraphNeighborhoodStatus("ready");
          setGraphNeighborhoodError(null);
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setGraphNeighborhood(null);
          setGraphNeighborhoodStatus("error");
          setGraphNeighborhoodError(
            nextError instanceof Error ? nextError.message : "Failed to load graph neighborhood"
          );
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGraphNodeId, graphSnapshot?.generatedAt]);

  useEffect(() => {
    if (!selectedGraphNodeId || !graphSnapshot) {
      setGraphPathTrace(null);
      setGraphPathTraceStatus("idle");
      setGraphPathTraceError(null);
      return;
    }

    let cancelled = false;
    setGraphPathTraceStatus("loading");
    setGraphPathTrace(null);
    setGraphPathTraceError(null);

    void window.workbench
      .getGraphPathTrace(selectedGraphNodeId)
      .then((nextTrace) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setGraphPathTrace(nextTrace);
          setGraphPathTraceStatus("ready");
          setGraphPathTraceError(null);
        });
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setGraphPathTrace(null);
          setGraphPathTraceStatus("error");
          setGraphPathTraceError(
            nextError instanceof Error ? nextError.message : "Failed to trace graph paths"
          );
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGraphNodeId, graphSnapshot?.generatedAt]);

  function pinSelectedNeighborhood() {
    if (
      !graphNeighborhood ||
      !graphSnapshot ||
      graphNeighborhood.centerNodeId !== selectedGraphNodeId ||
      graphNeighborhood.generatedAt !== graphSnapshot.generatedAt ||
      !graphNeighborhood.centerNode
    ) {
      return;
    }

    const centerNode = graphNeighborhood.centerNode;
    startTransition(() => {
      setPinnedGraphNeighborhood(graphNeighborhood);
      setGraphActionNotice({
        action: tx("Neighborhood Pinned", "邻域已固定"),
        scope: tx(
          `${centerNode.displayName} now expands the visible topology with a bounded local neighborhood.`,
          `${centerNode.displayName} 现在会用有界本地邻域扩展可见拓扑。`
        ),
        nextStep: tx(
          "Use Reset Topology or Return To Snapshot when you want the base map again.",
          "需要回到基础地图时，可使用重置拓扑或返回快照。"
        )
      });
    });
  }

  function resetPinnedTopology() {
    startTransition(() => {
      setPinnedGraphNeighborhood(null);
      setGraphActionNotice({
        action: tx("Pinned Scope Cleared", "固定范围已清除"),
        scope: tx(
          "The topology no longer includes the pinned neighborhood overlay; stored graph data remains unchanged.",
          "拓扑不再包含固定邻域投影；已存图谱数据保持不变。"
        ),
        nextStep: tx(
          "Continue with the base snapshot, search focus, or another selected node.",
          "可继续使用基础快照、搜索焦点或另一个选中节点。"
        )
      });
    });
  }

  async function refreshWorkbench(showLoader = true) {
    if (showLoader) {
      setLoading(true);
    }
    setError(null);

    try {
      const next = await loadBootstrapState();
      const [nextAuditEvents, nextBackups, nextRemoteCandidates] = await Promise.all([
        window.workbench.listAuditEvents(12),
        window.workbench.listBackups(8),
        window.workbench.listRemoteSkillCandidates()
      ]);
      let summary: DailyMetricsSummary | null = null;
      let nextWeeklySummary: WeeklyMetricsSummary | null = null;
      let runs: SkillRunSummary[] = [];
      let nextProposals: OptimizationProposal[] = [];
      let nextGraph: GraphSnapshot | null = null;
      let nextBundles: SkillBundleSummary[] = [];

      if (next.status === "ready") {
        [summary, nextWeeklySummary, runs, nextProposals, nextGraph, nextBundles] =
          await Promise.all([
            window.workbench.getDailySummary(),
            window.workbench.getWeeklySummary(),
            window.workbench.listRecentRuns(runtimeRunFetchLimit),
            window.workbench.listOptimizationProposals("all"),
            window.workbench.getGraphSnapshot(),
            window.workbench.listBundles()
          ]);
      }

      startTransition(() => {
        setBoot(next);
        setDailySummary(summary);
        setWeeklySummary(nextWeeklySummary);
        setGraphSnapshot(nextGraph);
        setRecentRuns(runs);
        setAuditEvents(nextAuditEvents);
        setBackups(nextBackups);
        setRemoteCandidates(nextRemoteCandidates);
        setProposals(nextProposals);
        setBundles(nextBundles);
        if (next.status === "ready") {
          setScanRoots(next.roots.map((root) => root.path));
          setScanExclusions(next.exclusions.map((entry) => entry.path));
        } else {
          setScanRoots([]);
          setScanExclusions([]);
        }
        setSelectedBundleSkillId((current) => {
          if (current && next.skills.some((skill) => skill.id === current)) {
            return current;
          }
          return next.skills[0]?.id ?? "";
        });
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unknown bootstrap error");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  async function createBackup() {
    setBusyAction("backup");
    setError(null);

    try {
      const result = await window.workbench.createBackup();
      startTransition(() => {
        setBackupResult(result);
        setInteractionNotice({
          area: tx("Settings / Local Storage", "设置 / 本地存储"),
          action: tx("Create Backup", "创建备份"),
          result: tx(
            `${result.totalFiles} local file(s) captured in an app-local snapshot.`,
            `已在应用本地快照中捕获 ${result.totalFiles} 个本地文件。`
          ),
          nextStep: tx(
            "Review the manifest path below or validate a backup manifest before restore planning.",
            "查看下方清单路径，或先验证备份清单再规划恢复。"
          ),
          tone: "success"
        });
      });
      await refreshWorkbench(false);
      return result;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Backup creation failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshGraph() {
    setBusyAction("graph");
    setError(null);
    setGraphActionNotice(null);

    try {
      const nextGraph = await window.workbench.refreshGraph();
      startTransition(() => {
        setGraphSnapshot(nextGraph);
        setGraphActionNotice({
          action: tx("Graph Refreshed", "图谱已刷新"),
          scope: tx(
            `${nextGraph.totalNodes} node(s) and ${nextGraph.totalEdges} edge(s) were regenerated from the local skill index, telemetry, proposals, and bundle state.`,
            `${nextGraph.totalNodes} 个节点和 ${nextGraph.totalEdges} 条边已从本地技能索引、遥测、建议和 Bundle 状态重新生成。`
          ),
          nextStep: tx(
            "Search, select a node, or inspect the scope stack to continue graph exploration.",
            "可继续搜索、选择节点，或检查范围栈。"
          )
        });
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Graph refresh failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshProposals() {
    setBusyAction("proposals");
    setError(null);
    setProposalDecisionNotice(null);

    try {
      const result = await window.workbench.refreshOptimizationProposals();
      const nextGraph = await window.workbench.refreshGraph();
      startTransition(() => {
        setProposalRefreshResult(result);
        setProposals(result.proposals);
        setGraphSnapshot(nextGraph);
        setInteractionNotice({
          area: tx("Optimization", "优化"),
          action: tx("Refresh Proposals", "刷新建议"),
          result: tx(
            `${result.createdCount} created, ${result.updatedCount} updated, ${result.resolvedCount} resolved.`,
            `已创建 ${result.createdCount} 条，更新 ${result.updatedCount} 条，解决 ${result.resolvedCount} 条。`
          ),
          nextStep: tx(
            "Filter the queue, then accept, ignore, resolve, or reopen proposals with evidence.",
            "筛选队列，然后基于证据接受、忽略、解决或重开建议。"
          ),
          tone: "success"
        });
      });
      await refreshWorkbench(false);
      return result;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Proposal refresh failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function chooseTelemetryFile() {
    const picked = await window.workbench.pickTelemetryFile();
    if (!picked) {
      showInteractionNotice({
        area: tx("Analysis / Telemetry", "分析 / 遥测"),
        action: tx("Choose Telemetry File", "选择遥测文件"),
        result: tx("File selection was cancelled; no telemetry was imported.", "已取消选择文件；未导入遥测。"),
        nextStep: tx("Choose a local JSONL or NDJSON log file, then import telemetry.", "选择本地 JSONL 或 NDJSON 日志文件，然后导入遥测。"),
        tone: "info"
      });
      return null;
    }

    startTransition(() => {
      setTelemetryFilePath(picked);
      setInteractionNotice({
        area: tx("Analysis / Telemetry", "分析 / 遥测"),
        action: tx("Choose Telemetry File", "选择遥测文件"),
        result: tx(`Selected ${picked}`, `已选择 ${picked}`),
        nextStep: tx("Click Import Telemetry to write parsed run metrics into local SQLite.", "点击导入遥测，将解析后的运行指标写入本地 SQLite。"),
        tone: "success"
      });
    });
    return picked;
  }

  async function chooseBackupManifest() {
    const picked = await window.workbench.pickBackupManifest();
    if (!picked) {
      showInteractionNotice({
        area: tx("Settings / Backup", "设置 / 备份"),
        action: tx("Choose Backup Manifest", "选择备份清单"),
        result: tx("Manifest selection was cancelled; validation did not run.", "已取消选择清单；未执行校验。"),
        nextStep: tx("Choose a local backup.manifest.json before validating restore impact.", "请先选择本地 backup.manifest.json，再验证恢复影响。"),
        tone: "info"
      });
      return null;
    }

    startTransition(() => {
      setBackupManifestPath(picked);
      setBackupValidation(null);
      setBackupRestoreImpact(null);
      setInteractionNotice({
        area: tx("Settings / Backup", "设置 / 备份"),
        action: tx("Choose Backup Manifest", "选择备份清单"),
        result: tx(`Selected ${picked}`, `已选择 ${picked}`),
        nextStep: tx("Validate the backup before previewing any restore impact.", "请先验证备份，再预览任何恢复影响。"),
        tone: "success"
      });
    });
    return picked;
  }

  async function chooseBundleManifest() {
    const picked = await window.workbench.pickBundleManifest();
    if (!picked) {
      showInteractionNotice({
        area: tx("Bundles / Import", "Bundle / 导入"),
        action: tx("Choose Bundle Manifest", "选择 Bundle 清单"),
        result: tx("Manifest selection was cancelled; import remains inactive.", "已取消选择清单；导入仍保持未激活。"),
        nextStep: tx("Choose a local bundle.manifest.json before validation or import.", "请先选择本地 bundle.manifest.json，再校验或导入。"),
        tone: "info"
      });
      return null;
    }

    startTransition(() => {
      setBundleManifestPath(picked);
      setBundleValidation(null);
      setBundleImportResult(null);
      setBundleImportStrategy("preserve_existing");
      setBundleActionNotice(null);
      setInteractionNotice({
        area: tx("Bundles / Import", "Bundle / 导入"),
        action: tx("Choose Bundle Manifest", "选择 Bundle 清单"),
        result: tx(`Selected ${picked}`, `已选择 ${picked}`),
        nextStep: tx("Run read-only validation before choosing an import strategy.", "选择导入策略前，请先执行只读校验。"),
        tone: "success"
      });
    });
    return picked;
  }

  async function generateSkillAnalysis(skillId: string | null | undefined = primaryLibrarySkill?.id) {
    if (!skillId) {
      return;
    }

    setBusyAction("skill-analysis");
    setSkillAnalysisStatus("loading");
    setSkillAnalysisError(null);

    try {
      const analysis = await window.workbench.generateSkillAnalysis(skillId);
      startTransition(() => {
        setSelectedSkillAnalysisSkillId(skillId);
        setSelectedLibraryStage("analysis");
        setSkillAnalysis(analysis);
        setSkillAnalysisStatus("ready");
      });
    } catch (nextError) {
      setSkillAnalysis(null);
      setSkillAnalysisStatus("error");
      setSkillAnalysisError(
        nextError instanceof Error ? nextError.message : "Skill analysis failed"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function analyzeRemoteSource() {
    const sourceUrl = remoteRepositoryUrl.trim();
    if (!sourceUrl) {
      setRemoteSourceError(tx("Enter a GitHub repository URL first.", "请先输入 GitHub 仓库 URL。"));
      return;
    }

    setBusyAction("remote-analysis");
    setRemoteSourceError(null);

    try {
      const analysis = await window.workbench.analyzeRemoteSkillSource(sourceUrl);
      startTransition(() => {
        setRemoteSourceAnalysis(analysis);
        setInteractionNotice({
          area: tx("Remote Market", "远程市场"),
          action: tx("Analyze Repository", "分析仓库"),
          result: tx(
            `${analysis.displayName} was analyzed locally as an inactive remote candidate.`,
            `${analysis.displayName} 已作为未激活远程候选在本地完成分析。`
          ),
          nextStep: tx(
            "Review the preflight result below before import or activation decisions.",
            "导入或激活决策前，请先查看下方预检结果。"
          ),
          tone: analysis.riskLevel === "blocked" || analysis.riskLevel === "high" ? "warning" : "success"
        });
      });
    } catch (nextError) {
      setRemoteSourceAnalysis(null);
      setRemoteSourceError(
        nextError instanceof Error ? nextError.message : tx("Remote source analysis failed.", "远程来源分析失败。")
      );
      showInteractionNotice({
        area: tx("Remote Market", "远程市场"),
        action: tx("Analyze Repository", "分析仓库"),
        result: tx("Remote source analysis failed in local preflight.", "远程来源本地预检失败。"),
        nextStep: tx("Check the GitHub URL format, then run analysis again.", "检查 GitHub URL 格式后重新分析。"),
        tone: "warning"
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function updateHealthScorePolicy(preset: SkillHealthScorePolicyPreset) {
    if (boot?.healthScorePolicy.preset === preset) {
      showInteractionNotice({
        area: tx("Settings / Health Score", "设置 / 健康评分"),
        action: tx("Select Policy", "选择策略"),
        result: tx("This policy is already active.", "该策略已处于生效状态。"),
        nextStep: tx("Choose another preset if you want to rebalance health scoring.", "如需重新平衡健康评分，请选择其他预设。"),
        tone: "info"
      });
      return;
    }

    setBusyAction("health-policy");
    setError(null);

    try {
      await window.workbench.updateHealthScorePolicy({ preset });
      showInteractionNotice({
        area: tx("Settings / Health Score", "设置 / 健康评分"),
        action: tx("Update Policy", "更新策略"),
        result: tx(
          `${healthPolicyLabel(preset)} is now the active local scoring preset.`,
          `${healthPolicyLabel(preset)} 已成为当前本地评分预设。`
        ),
        nextStep: tx("Skill health scores will be recalculated locally from this weighting.", "Skill 健康分会按此权重在本地重新计算。"),
        tone: "success"
      });
      await refreshWorkbench(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Health Score policy update failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function grantAuthorization() {
    if (!targetProjectRoot.trim()) {
      setError("Choose one project directory before authorizing.");
      showInteractionNotice({
        area: tx("First-Run Authorization", "首次授权"),
        action: tx("Authorize and Initialize", "授权并初始化"),
        result: tx("Initialization needs one selected project directory.", "初始化前需要选择一个项目目录。"),
        nextStep: tx("Go to Project, choose one folder, then initialize again.", "回到项目步骤，选择一个文件夹后再初始化。"),
        tone: "warning"
      });
      return;
    }

    setBusyAction("authorize");
    setError(null);

    try {
      const input: AuthorizationInput = {
        name: policyName.trim() || defaultPolicyName,
        scanRoots,
        scanExclusions,
        telemetryMode,
        allowRawContent,
        allowBackgroundWatch
      };
      await window.workbench.grantAuthorization(input);
      const nextGraph = await window.workbench.refreshGraph();
      startTransition(() => {
        setScanResult(null);
        setTelemetryResult(null);
        setProposalRefreshResult(null);
        setGraphSnapshot(nextGraph);
        setInteractionNotice({
          area: tx("First-Run Authorization", "首次授权"),
          action: tx("Authorize and Initialize", "授权并初始化"),
          result: tx("The selected project directory is authorized locally.", "已在本地授权所选项目目录。"),
          nextStep: tx("Open Project Management to scan this project, or Skill Library to review indexed Skills.", "打开项目管理扫描该项目，或进入技能库查看已索引技能。"),
          tone: "success"
        });
      });
      await refreshWorkbench(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authorization failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function scanSkills() {
    if (targetProjectRoot.trim()) {
      showInteractionNotice({
        area: tx("Project Management", "项目管理"),
        action: tx("Scan Project", "扫描项目"),
        result: tx("Skill OS v1 scans only the selected project directory.", "Skill OS v1 只扫描已选择的项目目录。"),
        nextStep: tx("The project scan is starting now.", "项目扫描正在开始。"),
        tone: "info"
      });
      await scanTargetProject();
      return;
    }

    showInteractionNotice({
      area: tx("Project Management", "项目管理"),
      action: tx("Scan Project", "扫描项目"),
      result: tx("There is no project folder selected yet.", "尚未选择项目文件夹。"),
      nextStep: tx("Choose one project folder first; full-computer scan is reserved for a later version.", "请先选择一个项目文件夹；全电脑扫描会在后续版本单独开发。"),
      tone: "warning"
    });
  }

  function inspectManagedProject(project: ManagedProject) {
    startTransition(() => {
      setInspectedProjectPath(project.path);
      setInteractionNotice({
        area: tx("Project Management", "项目管理"),
        action: tx("View Project", "查看项目"),
        result: tx(`${project.name} project details are open.`, `${project.name} 的项目详情已打开。`),
        nextStep: tx("Use the Skills column to inspect project Skills, workflow, and heartbeat summary.", "可通过技能列查看项目技能、工作流和心跳摘要。"),
        tone: "info"
      });
    });
  }

  function renameManagedProject(project: ManagedProject, name: string) {
    const nextName = name.trim();
    if (!nextName) {
      showInteractionNotice({
        area: tx("Project Management", "项目管理"),
        action: tx("Rename Project", "重命名项目"),
        result: tx("Project name cannot be empty.", "项目名称不能为空。"),
        nextStep: tx("Enter a short display name for this project.", "请输入一个简短的项目显示名。"),
        tone: "warning"
      });
      return;
    }

    setManagedProjects((projects) =>
      upsertManagedProject(projects, project.path, {
        name: nextName,
        lastFocusedAt: new Date().toISOString()
      })
    );
    showInteractionNotice({
      area: tx("Project Management", "项目管理"),
      action: tx("Rename Project", "重命名项目"),
      result: tx(`Project renamed to ${nextName}.`, `项目已重命名为 ${nextName}。`),
      nextStep: tx("The bound project list and report pages now use this display name.", "已绑定项目列表和报告页会使用这个显示名。"),
      tone: "success"
    });
  }

  function analyzeManagedProject(project: ManagedProject) {
    startTransition(() => {
      setInspectedProjectPath("");
      setInteractionNotice({
        area: tx("Evaluation Reports", "评测报告"),
        action: tx("Open Project Report", "打开项目报告"),
        result: tx(`${project.name} report view is open.`, `${project.name} 的报告视图已打开。`),
        nextStep: tx("Reports are organized by project, Skill, heartbeat, and workflow effect.", "报告按项目、技能、心跳和工作流效果组织。"),
        tone: "info"
      });
    });
    navigateToProductSection("#evaluate");
  }

  function unbindManagedProject(project: ManagedProject) {
    startTransition(() => {
      const nextProjects = managedProjects.filter((entry) => entry.path !== project.path);
      setManagedProjects(nextProjects);
      if (normalizeProjectPath(inspectedProjectPath) === project.path) {
        setInspectedProjectPath(nextProjects[0]?.path ?? "");
      }
      if (normalizeProjectPath(targetProjectRoot) === project.path) {
        const nextProject = nextProjects[0] ?? null;
        setTargetProjectRoot(nextProject?.path ?? "");
        setScanRoots(nextProject ? [nextProject.path] : []);
        setScanExclusions([]);
        setWorkflowStarterPreview(null);
        setWorkflowStarterResult(null);
        setWorkflowStarterHighlighted(false);
        setScanResultDialog(null);
        setScanResult(null);
      }
      setInteractionNotice({
        area: tx("Project Management", "项目管理"),
        action: tx("Unbind Project", "解绑项目"),
        result: tx(`${project.name} was removed from bound projects.`, `${project.name} 已从已绑定项目中移除。`),
        nextStep: tx("The project folder on disk was not deleted.", "磁盘上的项目文件夹不会被删除。"),
        tone: "info"
      });
    });
  }

  function scanManagedProject(project: ManagedProject) {
    void scanTargetProject(project.path);
  }

  function appendProjectOnboardingLog(
    projectPath: string,
    stage: ProjectOnboardingLogEntry["stage"],
    tone: ProjectOnboardingLogEntry["tone"],
    message: string
  ) {
    const occurredAt = new Date().toISOString();
    setProjectOnboardingLogs((entries) =>
      [
        ...entries,
        {
          id: `${projectPath}:${occurredAt}:${stage}`,
          projectPath,
          occurredAt,
          stage,
          tone,
          message
        }
      ].slice(-maxProjectOnboardingLogEntries)
    );
  }

  async function repairManagedProject(project: ManagedProject) {
    try {
      await performProjectRepair(project);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : tx("Project repair failed.", "项目修正失败。");
      setProjectRepairFeedback({
        projectPath: project.path,
        status: "failed",
        detail: tx(`Repair failed: ${message}`, `修正失败：${message}`)
      });
      appendProjectOnboardingLog(
        project.path,
        "complete",
        "error",
        tx(`Project repair failed: ${message}`, `项目修正失败：${message}`)
      );
      showInteractionNotice({
        area: tx("Project Onboarding", "项目接入"),
        action: tx("Detect and Repair", "检测并修正"),
        result: tx(`${project.name} repair failed.`, `${project.name} 修正失败。`),
        nextStep: message,
        tone: "warning"
      });
    }
  }

  async function performProjectRepair(project: ManagedProject) {
    setProjectRepairFeedback({
      projectPath: project.path,
      status: "running",
      detail: tx("Step 1/4: scanning the project folder...", "第 1/4 步：正在扫描项目目录...")
    });
    appendProjectOnboardingLog(
      project.path,
      "scan",
      "info",
      tx(`Started project onboarding repair for ${project.path}.`, `开始检测并修正项目：${project.path}`)
    );
    showInteractionNotice({
      area: tx("Project Onboarding", "项目接入"),
      action: tx("Detect and Repair", "检测并修正"),
      result: tx(`${project.name} repair is running.`, `${project.name} 正在修正中。`),
      nextStep: tx("The project list will show the repair result when checks finish.", "检测结束后，项目列表会直接显示修正结果。"),
      tone: "info"
    });

    const result = await scanTargetProject(project.path, {
      showResultDialog: false,
      suppressInteractionNotice: true
    });
    if (!result) {
      setProjectRepairFeedback({
        projectPath: project.path,
        status: "failed",
        detail: tx("Project scan failed. Check folder access and try again.", "项目扫描失败，请检查目录权限后重试。")
      });
      appendProjectOnboardingLog(
        project.path,
        "scan",
        "error",
        tx("Project folder scan failed. Check whether the folder exists and is readable.", "项目目录扫描失败，请检查目录是否存在且可读。")
      );
      return;
    }

    appendProjectOnboardingLog(
      project.path,
      "skills",
      result.skillsFound > 0 ? "success" : "warning",
      result.skillsFound > 0
        ? tx(`${result.skillsFound} project Skill(s) were indexed.`, `已索引 ${result.skillsFound} 个项目技能。`)
        : tx("No project Skill was found.", "未发现项目技能。")
    );
    appendProjectOnboardingLog(
      project.path,
      "workflow",
      result.workflowDetected ? "success" : "warning",
      result.workflowDetected
        ? tx("Project workflow markers were detected.", "已检测到项目工作流标记。")
        : tx("Project workflow is incomplete and needs confirmation before files are written.", "项目工作流不完整，写入文件前需要用户确认。")
    );

    if (result.skillsFound === 0 || !result.workflowDetected) {
      setProjectRepairFeedback({
        projectPath: project.path,
        status: "needs-action",
        detail: tx("A workflow repair plan is ready for confirmation.", "工作流修正方案已生成，等待确认。")
      });
      await previewRecommendedWorkflowStarter("card", result.rootPaths[0] ?? project.path);
      return;
    }

    const repairedProject = {
      ...project,
      lastScanAt: result.completedAt,
      skillsFound: result.skillsFound,
      filesSeen: result.filesSeen,
      skillsChanged: result.skillsChanged,
      workflowApplied: result.workflowDetected
    };
    if (boot?.policy?.telemetryMode === "disabled") {
      setProjectRepairFeedback({
        projectPath: project.path,
        status: "completed",
        detail: tx("Configuration repaired. Runtime monitoring still needs authorization.", "配置修正完成，运行监控仍需授权。")
      });
      appendProjectOnboardingLog(
        project.path,
        "telemetry",
        "warning",
        tx("Project configuration is ready, but runtime telemetry is not authorized.", "项目配置已就绪，但运行遥测尚未授权。")
      );
      showInteractionNotice({
        area: tx("Project Onboarding", "项目接入"),
        action: tx("Detect and Repair", "检测并修正"),
        result: tx("Project indexing and workflow are ready, but runtime monitoring is not authorized.", "项目索引和工作流已就绪，但运行监控尚未授权。"),
        nextStep: tx("Use the monitor switch when you are ready to grant runtime permission.", "需要时可点击监控开关授权运行监控。"),
        tone: "warning"
      });
      return;
    }

    setProjectRepairFeedback({
      projectPath: project.path,
      status: "running",
      detail: tx("Step 3/4: checking local Codex sessions...", "第 3/4 步：正在检查本地 Codex 会话...")
    });
    appendProjectOnboardingLog(
      project.path,
      "connection",
      "info",
      tx("Started matching local session cwd and explicit Skill evidence.", "开始匹配本地会话目录和明确的 Skill 调用证据。")
    );
    const runtimeResult = await refreshProjectRuntimeEvidence(repairedProject);
    const observedWorkspace = getLatestObservedWorkspace(runtimeResult);
    const connectionComplete = runtimeResult?.status === "imported";
    const directoryConnected = connectionComplete || runtimeResult?.status === "connected_no_skill_runs";
    const repairDetail = connectionComplete
      ? tx("Configuration and Codex project connection were verified.", "配置和 Codex 项目连接均已验证。")
      : directoryConnected
        ? tx(
            "The Codex project directory is connected; waiting for a project Skill invocation.",
            "Codex 项目目录已连接，正在等待项目技能触发。"
          )
      : observedWorkspace
        ? tx(
            `Codex is currently using ${observedWorkspace}; expected ${project.path}.`,
            `检测到 Codex 当前目录为 ${observedWorkspace}；期望目录为 ${project.path}。`
          )
        : tx(
            "Configuration repaired. Start a Codex task from this project directory.",
            "配置修正完成，请从该项目目录启动 Codex 任务。"
          );
    setProjectRepairFeedback({
      projectPath: project.path,
      status: connectionComplete
        ? "completed"
        : directoryConnected
          ? "connected-awaiting-skill"
          : "connection-required",
      detail: repairDetail
    });
    appendProjectOnboardingLog(
      project.path,
      "connection",
      directoryConnected ? "success" : "warning",
      repairDetail
    );
    appendProjectOnboardingLog(
      project.path,
      "complete",
      directoryConnected ? "success" : "warning",
      connectionComplete
        ? tx("Project onboarding and connection verification completed.", "项目接入和连接验证完成。")
        : directoryConnected
          ? tx("Project connection is ready and awaiting a Skill invocation.", "项目连接已就绪，等待技能触发。")
        : tx("Configuration repair completed, but the Codex task directory still needs correction.", "配置修正完成，但仍需修正 Codex 任务目录。")
    );
    showInteractionNotice({
      area: tx("Project Onboarding", "项目接入"),
      action: tx("Detect and Repair", "检测并修正"),
      result: connectionComplete
        ? tx(`${project.name} repair and connection checks are complete.`, `${project.name} 修正和连接检查均已完成。`)
        : directoryConnected
          ? tx(`${project.name} is connected and awaiting a Skill invocation.`, `${project.name} 已连接，等待技能触发。`)
        : tx(`${project.name} configuration is repaired, but Codex is not connected to this project.`, `${project.name} 配置已修正，但 Codex 尚未连接到该项目。`),
      nextStep: repairDetail,
      tone: directoryConnected ? "success" : "warning"
    });
  }

  function toggleProjectMonitoring(project: ManagedProject, enabled: boolean) {
    if (
      enabled &&
      (boot?.policy?.telemetryMode === "disabled" || !boot?.policy?.allowBackgroundWatch)
    ) {
      setInspectedProjectPath(project.path);
      showInteractionNotice({
        area: tx("Project Runtime Evidence", "项目运行证据"),
        action: tx("Heartbeat Monitor", "心跳监控"),
        result: tx("Monitoring needs telemetry and background watch permission first.", "监控需要先开启遥测和后台监听权限。"),
        nextStep: tx("Open the project detail dialog and enable telemetry, then turn monitoring on.", "请在项目详情弹窗开启遥测，再打开监控。"),
        tone: "warning"
      });
      return;
    }

    const nextMonitorAt = enabled ? new Date().toISOString() : project.lastMonitorAt;
    setManagedProjects((projects) =>
      upsertManagedProject(projects, project.path, {
        monitoringEnabled: enabled,
        monitoringIntervalMs: project.monitoringIntervalMs,
        lastMonitorAt: nextMonitorAt
      })
    );
    showInteractionNotice({
      area: tx("Project Runtime Evidence", "项目运行证据"),
      action: tx("Heartbeat Monitor", "心跳监控"),
      result: enabled
        ? tx(`${project.name} monitoring is now on.`, `${project.name} 的监控已开启。`)
        : tx(`${project.name} monitoring is now off.`, `${project.name} 的监控已关闭。`),
      nextStep: enabled
        ? tx("The app will keep refreshing runtime evidence while it is open.", "应用打开期间会持续刷新运行证据。")
        : tx("Manual refresh is still available from project detail.", "仍可在项目详情里手动刷新。"),
      tone: enabled ? "success" : "info"
    });
  }

  function updateProjectMonitoringInterval(project: ManagedProject, intervalMs: number) {
    const safeInterval =
      intervalMs === 30000 || intervalMs === 60000 || intervalMs === 120000
        ? intervalMs
        : 60000;
    setManagedProjects((projects) =>
      upsertManagedProject(projects, project.path, {
        monitoringIntervalMs: safeInterval
      })
    );
    showInteractionNotice({
      area: tx("Project Runtime Evidence", "项目运行证据"),
      action: tx("Refresh Interval", "刷新间隔"),
      result: tx("Heartbeat refresh interval was updated.", "心跳刷新间隔已更新。"),
      nextStep: project.monitoringEnabled
        ? tx("The next automatic refresh will use the new interval.", "下一次自动刷新会使用新的间隔。")
        : tx("Turn monitoring on when you want continuous refresh.", "需要持续刷新时再开启监控。"),
      tone: "info"
    });
  }

  async function enableProjectTelemetry(project: ManagedProject) {
    setBusyAction("authorize");
    setError(null);

    try {
      const input: AuthorizationInput = {
        name: `${project.name} runtime evidence`,
        scanRoots: [project.path],
        scanExclusions: [],
        telemetryMode: "estimated",
        allowRawContent: false,
        allowBackgroundWatch: true
      };
      await window.workbench.grantAuthorization(input);
      showInteractionNotice({
        area: tx("Project Runtime Evidence", "项目运行证据"),
        action: tx("Enable Telemetry", "开启遥测"),
        result: tx(
          "Estimated telemetry is enabled for this project. Raw prompt content remains disabled.",
          "已为该项目开启估算遥测，原始提示内容仍保持关闭。"
        ),
        nextStep: tx(
          "Refresh runtime evidence to import local Codex session signals.",
          "刷新运行证据，导入本地 Codex 会话信号。"
        ),
        tone: "success"
      });
      await refreshWorkbench(false);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to enable telemetry";
      setError(message);
      showInteractionNotice({
        area: tx("Project Runtime Evidence", "项目运行证据"),
        action: tx("Enable Telemetry", "开启遥测"),
        result: message,
        nextStep: tx("Check the selected project path and try again.", "检查所选项目路径后重试。"),
        tone: "warning"
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshProjectRuntimeEvidence(
    project: ManagedProject,
    options: { silent?: boolean } = {}
  ) {
    if (!options.silent) {
      setBusyAction("runtime-refresh");
    }
    setError(null);

    try {
      const result = await window.workbench.refreshProjectRuntimeEvidence(project.path);
      const proposalResult = await window.workbench.refreshOptimizationProposals();
      const nextGraph = await window.workbench.refreshGraph();
      const runs = await window.workbench.listRecentRuns(runtimeRunFetchLimit);
      const latestMatchingWorkspaceRef = runs
        .filter((run) => run.workspaceRef && isPathInsideProject(run.workspaceRef, project.path))
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0]?.workspaceRef;
      const latestObservedWorkspaceRef =
        latestMatchingWorkspaceRef ?? getLatestObservedWorkspace(result) ?? project.lastObservedWorkspaceRef;
      const sourceCount = result.sourcesChecked;
      const resultText =
        result.status === "imported"
          ? tx(
              `${result.importedRuns} run(s) imported and ${result.updatedRuns} updated from local sessions.`,
              `已从本地会话导入 ${result.importedRuns} 条运行，更新 ${result.updatedRuns} 条。`
            )
          : result.status === "connected_no_skill_runs"
            ? tx(
                `Codex directory connected: ${result.matchedWorkspaceRef ?? project.path}.`,
                `Codex 目录已连接：${result.matchedWorkspaceRef ?? project.path}。`
              )
          : result.status === "telemetry_disabled"
            ? tx("Runtime evidence is blocked because telemetry is disabled.", "运行证据刷新被阻止，因为遥测未开启。")
            : result.status === "no_ready_sources"
              ? tx("No readable Codex or Claude Code session source was found.", "没有发现可读取的 Codex 或 Claude Code 会话来源。")
              : result.status === "unauthorized"
                ? tx("This project is not authorized yet.", "该项目尚未授权。")
                : tx(
                    `Checked ${sourceCount} local source(s), but no project Skill run was importable.`,
                    `已检查 ${sourceCount} 个本地来源，但没有可导入的项目技能运行。`
                  );
      const nextStep =
        result.status === "imported"
          ? tx("Open Evaluation Reports to inspect project and Skill usage.", "打开评测报告查看项目与技能使用情况。")
          : result.status === "connected_no_skill_runs"
            ? tx(
                "Continue using the project; the status will become healthy after a project Skill is invoked.",
                "继续使用该项目；项目技能触发后，状态会自动变为运行正常。"
              )
          : result.status === "telemetry_disabled"
            ? tx("Click Enable Telemetry in the project detail dialog, then refresh runtime evidence again.", "在项目详情弹窗点击开启遥测，然后再次刷新运行证据。")
            : result.status === "no_importable_runs"
              ? tx(
                  "Make sure Codex sessions are opened inside this project and that project-local Skill names are actually referenced.",
                  "请确认 Codex 会话是在这个项目内打开，并且项目本地技能名称确实被引用。"
                )
              : tx("Review the diagnostic message in project detail before retrying.", "重试前请先查看项目详情中的诊断信息。");
      const heartbeatEntry: ProjectHeartbeatEntry = {
        id: `${project.path}:${result.refreshedAt}`,
        projectPath: project.path,
        observedAt: result.refreshedAt,
        tone: heartbeatToneForRuntimeStatus(result.status),
        status: result.status,
        importedRuns: result.importedRuns,
        updatedRuns: result.updatedRuns,
        totalRuns: result.importedRuns + result.updatedRuns,
        sourceCount: result.sourcesChecked,
        message: resultText
      };

      startTransition(() => {
        setManagedProjects((projects) =>
          upsertManagedProject(projects, project.path, {
            lastMonitorAt: result.refreshedAt,
            lastObservedWorkspaceRef: latestObservedWorkspaceRef,
            lastConnectionCheckAt: result.refreshedAt
          })
        );
        setProjectRuntimeRefreshResult(result);
        setProjectHeartbeatEntries((entries) => upsertProjectHeartbeatEntry(entries, heartbeatEntry));
        setProposalRefreshResult(proposalResult);
        setProposals(proposalResult.proposals);
        setGraphSnapshot(nextGraph);
        setRecentRuns(runs);
        if (!options.silent) {
          setInteractionNotice({
            area: tx("Project Runtime Evidence", "项目运行证据"),
            action: tx("Refresh Runtime Evidence", "刷新运行证据"),
            result: resultText,
            nextStep,
            tone:
              result.status === "imported"
                ? "success"
                : result.status === "connected_no_skill_runs"
                  ? "info"
                  : "warning"
          });
        }
      });
      await refreshWorkbench(false);
      return result;
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Runtime evidence refresh failed";
      const observedAt = new Date().toISOString();
      setError(message);
      setProjectHeartbeatEntries((entries) =>
        upsertProjectHeartbeatEntry(entries, {
          id: `${project.path}:${observedAt}`,
          projectPath: project.path,
          observedAt,
          tone: "error",
          status: "error",
          importedRuns: 0,
          updatedRuns: 0,
          totalRuns: 0,
          sourceCount: 0,
          message
        })
      );
      setManagedProjects((projects) =>
        upsertManagedProject(projects, project.path, {
          lastMonitorAt: observedAt
        })
      );
      if (!options.silent) {
        showInteractionNotice({
          area: tx("Project Runtime Evidence", "项目运行证据"),
          action: tx("Refresh Runtime Evidence", "刷新运行证据"),
          result: message,
          nextStep: tx("Check telemetry authorization and local Codex session logs, then retry.", "检查遥测授权和本地 Codex 会话日志后重试。"),
          tone: "warning"
        });
      }
      return null;
    } finally {
      if (!options.silent) {
        setBusyAction(null);
      }
    }
  }

  async function checkProjectConnectionHeartbeat(project: ManagedProject) {
    try {
      const result = await window.workbench.checkProjectConnection(project.path);
      const observedWorkspaceRef =
        result.matchedWorkspaceRef ?? result.latestObservedWorkspaceRef ?? project.lastObservedWorkspaceRef;
      const message = result.matchedWorkspaceRef
        ? tx(
            `Codex directory connected: ${result.matchedWorkspaceRef}.`,
            `Codex 目录已连接：${result.matchedWorkspaceRef}。`
          )
        : tx("No matching Codex project directory was detected.", "未检测到匹配的 Codex 项目目录。");
      setManagedProjects((projects) =>
        upsertManagedProject(projects, project.path, {
          lastMonitorAt: result.refreshedAt,
          lastObservedWorkspaceRef: observedWorkspaceRef,
          lastConnectionCheckAt: result.refreshedAt
        })
      );
      setProjectRuntimeRefreshResult(result);
      setProjectHeartbeatEntries((entries) =>
        upsertProjectHeartbeatEntry(entries, {
          id: `${project.path}:${result.refreshedAt}`,
          projectPath: project.path,
          observedAt: result.refreshedAt,
          tone: heartbeatToneForRuntimeStatus(result.status),
          status: result.status,
          importedRuns: 0,
          updatedRuns: 0,
          totalRuns: 0,
          sourceCount: result.sourcesChecked,
          message
        })
      );
      return result;
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Connection heartbeat failed";
      const observedAt = new Date().toISOString();
      setProjectHeartbeatEntries((entries) =>
        upsertProjectHeartbeatEntry(entries, {
          id: `${project.path}:${observedAt}`,
          projectPath: project.path,
          observedAt,
          tone: "error",
          status: "error",
          importedRuns: 0,
          updatedRuns: 0,
          totalRuns: 0,
          sourceCount: 0,
          message
        })
      );
      return null;
    }
  }

  async function beginBindProjectFlow() {
    try {
      showInteractionNotice({
        area: tx("Project Management", "项目管理"),
        action: tx("Bind Project", "绑定项目"),
        result: tx("Opening the system folder chooser...", "正在打开系统文件夹选择窗口..."),
        nextStep: tx("Select one project folder, then confirm scan and bind.", "选择一个项目文件夹后，再确认扫描并绑定。"),
        tone: "info"
      });
      const picked = await window.workbench.pickDirectory();
      if (!picked) {
        showInteractionNotice({
          area: tx("Project Management", "项目管理"),
          action: tx("Bind Project", "绑定项目"),
          result: tx("Project folder selection was cancelled.", "已取消选择项目文件夹。"),
          nextStep: tx("Click Bind Project again when you are ready.", "准备好后可再次点击绑定项目。"),
          tone: "info"
        });
        return;
      }

      const normalizedPicked = normalizeProjectPath(picked);
      startTransition(() => {
        setPendingBindProjectRoot(normalizedPicked);
        setScanResultDialog(null);
        setInteractionNotice({
          area: tx("Project Management", "项目管理"),
          action: tx("Select Project Folder", "选择项目文件夹"),
          result: tx(`Selected ${normalizedPicked}.`, `已选择 ${normalizedPicked}。`),
          nextStep: tx("Confirm Scan and Bind to add it to the project list.", "点击扫描并绑定后，它才会加入项目列表。"),
          tone: "info"
        });
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Project folder picker failed");
      showInteractionNotice({
        area: tx("Project Management", "项目管理"),
        action: tx("Bind Project", "绑定项目"),
        result: tx("The folder picker did not open successfully.", "文件夹选择器没有成功打开。"),
        nextStep: tx("Try Bind Project again.", "请再次尝试绑定项目。"),
        tone: "warning"
      });
    }
  }

  function closePendingBindProjectDialog() {
    if (busyAction === "project-scan") {
      return;
    }
    const projectRoot = normalizeProjectPath(pendingBindProjectRoot);
    setPendingBindProjectRoot("");
    if (projectRoot) {
      showInteractionNotice({
        area: tx("Project Management", "项目管理"),
        action: tx("Bind Project", "绑定项目"),
        result: tx("Project binding was closed before scanning.", "已关闭绑定确认，项目没有加入列表。"),
        nextStep: tx("Click Bind Project again to choose a folder.", "需要时可再次点击绑定项目选择目录。"),
        tone: "info"
      });
    }
  }

  async function scanAndBindPendingProject() {
    const projectRoot = normalizeProjectPath(pendingBindProjectRoot);
    if (!projectRoot) {
      return;
    }
    await scanTargetProject(projectRoot, { deferBindUntilComplete: true, closeBindDialogOnComplete: true });
  }

  async function chooseTargetProjectRoot() {
    await beginBindProjectFlow();
    return null;
  }

  function updateTargetProjectRoot(path: string) {
    startTransition(() => {
      setTargetProjectRoot(path);
      setScanRoots(path.trim() ? [path.trim()] : []);
      setScanExclusions([]);
      setWorkflowStarterPreview(null);
	      setWorkflowStarterResult(null);
	      setWorkflowStarterHighlighted(false);
	      setScanResultDialog(null);
	      setScanResult(null);
	    });
	  }

  function saveScanResultProjectName() {
    const projectRoot = scanResultDialogProjectRoot;
    const nextName = scanResultProjectName.trim();
    if (!projectRoot) {
      return;
    }

    if (!nextName) {
      showInteractionNotice({
        area: tx("Project Management", "项目管理"),
        action: tx("Rename Project", "重命名项目"),
        result: tx("Project name cannot be empty.", "项目名称不能为空。"),
        nextStep: tx("Enter a short display name for this project.", "请输入一个简短的项目显示名。"),
        tone: "warning"
      });
      return;
    }

    setManagedProjects((projects) =>
      upsertManagedProject(projects, projectRoot, {
        name: nextName,
        lastFocusedAt: new Date().toISOString()
      })
    );
    setScanResultProjectName(nextName);
    showInteractionNotice({
      area: tx("Project Management", "项目管理"),
      action: tx("Rename Project", "重命名项目"),
      result: tx(`Project renamed to ${nextName}.`, `项目已重命名为 ${nextName}。`),
      nextStep: tx("The bound project list and report pages now use this display name.", "已绑定项目列表和报告页会使用这个显示名。"),
      tone: "success"
    });
  }

  async function scanTargetProject(
    projectRootOverride?: string,
    options: {
      deferBindUntilComplete?: boolean;
      closeBindDialogOnComplete?: boolean;
      showResultDialog?: boolean;
      suppressInteractionNotice?: boolean;
    } = {}
  ) {
    let projectRoot = normalizeProjectPath(projectRootOverride ?? targetProjectRoot);
    if (!projectRoot) {
      const picked = await chooseTargetProjectRoot();
      if (!picked) {
        return;
      }
      projectRoot = picked;
    }

    startTransition(() => {
      setTargetProjectRoot(projectRoot);
      setScanRoots([projectRoot]);
      if (!options.deferBindUntilComplete) {
        setManagedProjects((projects) => upsertManagedProject(projects, projectRoot));
      }
    });

    setBusyAction("project-scan");
    setError(null);
    if (!options.suppressInteractionNotice) {
      showInteractionNotice({
        area: tx("Project Management", "项目管理"),
        action: tx("Scan Project", "扫描项目"),
        result: tx(`Scanning ${projectRoot}...`, `正在扫描 ${projectRoot}...`),
        nextStep: tx("Only this project folder is being inspected.", "当前只会检查这个项目文件夹。"),
        tone: "info"
      });
    }

    try {
      const result = await window.workbench.scanProjectSkills(projectRoot);
      const proposalResult = await window.workbench.refreshOptimizationProposals();
      const nextGraph = await window.workbench.refreshGraph();
      startTransition(() => {
        const scannedProjectRoot = normalizeProjectPath(result.rootPaths[0] ?? projectRoot);
        setTargetProjectRoot(scannedProjectRoot);
        setScanRoots([scannedProjectRoot]);
        setScanResult(result);
        setScanResultDialog(options.showResultDialog === false ? null : result);
        setManagedProjects((projects) =>
          upsertManagedProject(projects, scannedProjectRoot, {
            lastScanAt: new Date().toISOString(),
            skillsFound: result.skillsFound,
            filesSeen: result.filesSeen,
            skillsChanged: result.skillsChanged,
            workflowApplied: result.workflowDetected
          })
        );
        if (options.closeBindDialogOnComplete) {
          setPendingBindProjectRoot("");
        }
        if (result.skillsFound > 0) {
          setWorkflowStarterPreview(null);
          setWorkflowStarterResult(null);
        }
        setProposalRefreshResult(proposalResult);
        setProposals(proposalResult.proposals);
        setGraphSnapshot(nextGraph);
        if (!options.suppressInteractionNotice) setInteractionNotice({
          area: tx("Project Management", "项目管理"),
          action: tx("Scan Project", "扫描项目"),
          result: tx(
            `${result.skillsFound} Skill(s) found inside the selected project folder.`,
            `已在选中的项目文件夹内发现 ${result.skillsFound} 个 Skill。`
          ),
          nextStep:
            result.skillsFound > 0 && boot?.policy?.telemetryMode === "disabled"
              ? tx(
                  "Telemetry is still disabled. Open project detail and enable telemetry before usage counts can refresh.",
                  "遥测仍未开启。请打开项目详情并开启遥测，调用次数才会刷新。"
                )
              : tx(
                  "Review this project-only skill index snapshot, then refresh runtime evidence for local usage signals.",
                  "查看这个仅限项目的技能索引快照，然后刷新运行证据获取本地使用信号。"
                ),
          tone: result.skillsFound > 0 && boot?.policy?.telemetryMode === "disabled" ? "warning" : "success"
        });
      });
      await refreshWorkbench(false);
      return result;
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Project scan failed";
      setError(message);
      if (!options.suppressInteractionNotice) {
        showInteractionNotice({
          area: tx("Project Management", "项目管理"),
          action: tx("Scan Project", "扫描项目"),
          result: message,
          nextStep: tx("Check that the folder still exists and is readable, then scan again.", "请确认文件夹仍存在且可读取，然后重新扫描。"),
          tone: "warning"
        });
      }
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  function focusWorkflowStarterCard() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const activeSection = document.querySelector(
          `[data-product-section="${currentProductSection}"]`
        );
        const card =
          activeSection?.querySelector<HTMLElement>(".workflow-starter-card") ??
          document.querySelector<HTMLElement>("#discovery .workflow-starter-card");
        card?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    });
  }

  async function previewRecommendedWorkflowStarter(
    source: "card" | "scan-dialog" = "card",
    projectRootOverride?: string
  ) {
    let projectRoot = normalizeProjectPath(projectRootOverride ?? targetProjectRoot);
    if (!projectRoot) {
      const picked = await chooseTargetProjectRoot();
      if (!picked) {
        return;
      }
      projectRoot = picked;
    }

    setBusyAction("workflow-preview");
    setError(null);
    setWorkflowStarterHighlighted(true);
    showInteractionNotice({
      area: tx("Workflow Starter", "工作流 Starter"),
      action:
        source === "scan-dialog"
          ? tx("Use recommended skills-workflow", "使用推荐 skills-workflow")
          : tx("Preview skills-workflow", "预览 skills-workflow"),
      result: tx("Previewing the recommended workflow. No files are being written yet.", "正在预览推荐工作流；现在还不会写入任何文件。"),
      nextStep: tx("After the preview, review the file list and then apply if it looks right.", "预览完成后，先检查文件列表，确认无误后再应用。"),
      tone: "info"
    });
    focusWorkflowStarterCard();

    try {
	      const preview = await window.workbench.previewRecommendedWorkflowStarter(projectRoot);
	      startTransition(() => {
	        setTargetProjectRoot(preview.projectRoot);
	        setScanRoots([preview.projectRoot]);
	        setWorkflowStarterPreview(preview);
	        setWorkflowStarterResult(null);
	        setWorkflowStarterHighlighted(true);
	        setManagedProjects((projects) => upsertManagedProject(projects, preview.projectRoot));
        setInteractionNotice({
          area: tx("Workflow Starter", "工作流 Starter"),
          action:
            source === "scan-dialog"
              ? tx("Use recommended skills-workflow", "使用推荐 skills-workflow")
              : tx("Preview Recommended Workflow", "预览推荐工作流"),
          result: preview.canApply
            ? tx(
                `${preview.totalFileCount} file(s), ${preview.skillCount} Skill(s), and ${preview.totalDirectoryCount} folder(s) are ready to add.`,
                `将新增 ${preview.totalFileCount} 个文件、${preview.skillCount} 个 Skill 和 ${preview.totalDirectoryCount} 个目录。`
              )
            : tx(
                `${preview.fileConflicts.length} existing file conflict(s) block this starter.`,
                `有 ${preview.fileConflicts.length} 个已有文件冲突，暂不能应用。`
              ),
          nextStep: preview.canApply
            ? tx("Review the starter preview, then apply it to this project.", "检查 Starter 预览，然后应用到该项目。")
            : tx("Resolve conflicts or choose another project folder before applying.", "请先解决冲突，或选择另一个项目文件夹。"),
          tone: preview.canApply ? "success" : "warning"
        });
      });
      focusWorkflowStarterCard();
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Workflow starter preview failed";
      setError(message);
      showInteractionNotice({
        area: tx("Workflow Starter", "工作流 Starter"),
        action: tx("Preview skills-workflow", "预览 skills-workflow"),
        result: message,
        nextStep: tx("Check the selected project path, then try the recommended workflow again.", "请检查已选择的项目路径，然后重新尝试推荐工作流。"),
        tone: "warning"
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function applyRecommendedWorkflowStarter() {
    let projectRoot = targetProjectRoot.trim();
    if (!projectRoot) {
      const picked = await chooseTargetProjectRoot();
      if (!picked) {
        return;
      }
      projectRoot = picked;
    }

    if (workflowStarterResult && workflowStarterResult.preview.projectRoot === projectRoot) {
      setProjectRepairFeedback({
        projectPath: projectRoot,
        status: "completed",
        detail: tx("Recommended workflow is already applied and project Skills are ready.", "推荐工作流已应用，项目技能已就绪。")
      });
      showInteractionNotice({
        area: tx("Workflow Starter", "工作流 Starter"),
        action: tx("Apply Recommended Workflow", "应用推荐工作流"),
        result: tx("This skills-workflow has already been applied to the selected project.", "推荐 skills-workflow 已经应用到所选项目。"),
        nextStep: tx("Review project Skills in the library, or open reports for monitoring.", "可在技能库查看项目技能，或打开评测报告查看监控。"),
        tone: "success"
      });
      navigateToProductSection("#local-skills");
      return;
    }

    setBusyAction("workflow-apply");
    setError(null);

    try {
      const result = await window.workbench.applyRecommendedWorkflowStarter(projectRoot);
      const scan = await window.workbench.scanProjectSkills(result.preview.projectRoot);
      const proposalResult = await window.workbench.refreshOptimizationProposals();
      const nextGraph = await window.workbench.refreshGraph();
	      startTransition(() => {
	        setTargetProjectRoot(result.preview.projectRoot);
	        setScanRoots([result.preview.projectRoot]);
	        setWorkflowStarterPreview(result.preview);
	        setWorkflowStarterResult(result);
	        setScanResult(scan);
	        setProjectRepairFeedback({
	          projectPath: result.preview.projectRoot,
	          status: "completed",
	          detail: tx(
	            `Workflow applied successfully; ${scan.skillsFound} project Skill(s) are ready.`,
	            `工作流应用成功，${scan.skillsFound} 个项目技能已就绪。`
	          )
	        });
	        setManagedProjects((projects) =>
	          upsertManagedProject(projects, result.preview.projectRoot, {
	            lastScanAt: new Date().toISOString(),
	            skillsFound: scan.skillsFound,
	            filesSeen: scan.filesSeen,
	            skillsChanged: scan.skillsChanged,
	            workflowApplied: true
	          })
	        );
	        setProposalRefreshResult(proposalResult);
        setProposals(proposalResult.proposals);
        setGraphSnapshot(nextGraph);
        setInteractionNotice({
          area: tx("Workflow Starter", "工作流 Starter"),
          action: tx("Apply Recommended Workflow", "应用推荐工作流"),
          result: tx(
            `${result.copiedFileCount} file(s) copied and ${scan.skillsFound} Skill(s) indexed from this project.`,
            `已复制 ${result.copiedFileCount} 个文件，并从该项目索引到 ${scan.skillsFound} 个 Skill。`
          ),
          nextStep: tx("Open Skill Library, Analysis, or Graph to continue from the project workflow.", "打开 Skill 库、分析或图谱，继续使用这个项目工作流。"),
          tone: "success"
        });
      });
      appendProjectOnboardingLog(
        result.preview.projectRoot,
        "workflow",
        "success",
        tx(
          `Recommended workflow applied; ${scan.skillsFound} project Skill(s) were indexed.`,
          `推荐工作流已应用，已索引 ${scan.skillsFound} 个项目技能。`
        )
      );
      appendProjectOnboardingLog(
        result.preview.projectRoot,
        "complete",
        "success",
        tx("Project configuration repair completed successfully.", "项目配置修正成功完成。")
      );
      await refreshWorkbench(false);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Workflow starter apply failed";
      setError(message);
      setProjectRepairFeedback({
        projectPath: projectRoot,
        status: "failed",
        detail: tx(`Workflow apply failed: ${message}`, `工作流应用失败：${message}`)
      });
      appendProjectOnboardingLog(
        projectRoot,
        "workflow",
        "error",
        tx(`Recommended workflow apply failed: ${message}`, `推荐工作流应用失败：${message}`)
      );
      showInteractionNotice({
        area: tx("Workflow Starter", "工作流 Starter"),
        action: tx("Apply Recommended Workflow", "应用推荐工作流"),
        result: tx("Workflow apply failed.", "工作流应用失败。"),
        nextStep: message,
        tone: "warning"
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function importTelemetry() {
    if (boot?.status !== "ready") {
      setError("Authorize one project directory before importing telemetry.");
      showInteractionNotice({
        area: tx("Analysis / Telemetry", "分析 / 遥测"),
        action: tx("Import Telemetry", "导入遥测"),
        result: tx("Import is blocked until a project directory is authorized.", "项目目录授权前，导入会被阻止。"),
        nextStep: tx("Finish first-run authorization, then import the local telemetry file.", "先完成首次授权，再导入本地遥测文件。"),
        tone: "warning"
      });
      return;
    }

    setBusyAction("import");
    setError(null);

    try {
      const targetPath = telemetryFilePath || (await chooseTelemetryFile());
      if (!targetPath) {
        return;
      }

      const result = await window.workbench.importTelemetryFile(targetPath);
      const proposalResult = await window.workbench.refreshOptimizationProposals();
      const nextGraph = await window.workbench.refreshGraph();
      startTransition(() => {
        setTelemetryResult(result);
        setProposalRefreshResult(proposalResult);
        setProposals(proposalResult.proposals);
        setGraphSnapshot(nextGraph);
        setInteractionNotice({
          area: tx("Analysis / Telemetry", "分析 / 遥测"),
          action: tx("Import Telemetry", "导入遥测"),
          result: tx(
            `${result.importedRuns} run(s) imported and ${result.updatedRuns} updated.`,
            `已导入 ${result.importedRuns} 条运行记录，更新 ${result.updatedRuns} 条。`
          ),
          nextStep: tx(
            "Review Today Snapshot, Seven-Day Window, and Optimization Signals below.",
            "查看下方今日快照、七日窗口和优化信号。"
          ),
          tone: "success"
        });
      });
      await refreshWorkbench(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Telemetry import failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function discoverLocalToolTelemetrySources() {
    if (boot?.status !== "ready") {
      setError("Authorize one project directory before discovering local tool telemetry.");
      showInteractionNotice({
        area: tx("Analysis / Local Tools", "分析 / 本地工具"),
        action: tx("Discover Sources", "发现来源"),
        result: tx("Discovery is blocked until a project directory is authorized.", "项目目录授权前，来源发现会被阻止。"),
        nextStep: tx("Finish first-run authorization with telemetry enabled, then discover sources again.", "先完成首次授权并启用遥测，再重新发现来源。"),
        tone: "warning"
      });
      return;
    }

    setBusyAction("local-tool-discovery");
    setError(null);

    try {
      const sources = await window.workbench.discoverLocalToolTelemetrySources();
      const firstReadySource = sources.find((source) => source.status === "ready");
      startTransition(() => {
        setLocalToolSources(sources);
        setSelectedLocalToolSourceId((current) =>
          current && sources.some((source) => source.id === current)
            ? current
            : firstReadySource?.id ?? sources[0]?.id ?? ""
        );
        setLocalToolPreview(null);
        setLocalToolImportResult(null);
        setInteractionNotice({
          area: tx("Analysis / Local Tools", "分析 / 本地工具"),
          action: tx("Discover Sources", "发现来源"),
          result: tx(
            `${sources.filter((source) => source.status === "ready").length} ready local tool source(s) found.`,
            `发现 ${sources.filter((source) => source.status === "ready").length} 个可读取的本地工具来源。`
          ),
          nextStep: tx("Select a source below and run Preview before importing anything.", "在下方选择来源，并先预览，再导入任何内容。"),
          tone: "success"
        });
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Local tool source discovery failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function previewLocalToolTelemetrySource() {
    if (!selectedLocalToolSource) {
      showInteractionNotice({
        area: tx("Analysis / Local Tools", "分析 / 本地工具"),
        action: tx("Preview Source", "预览来源"),
        result: tx("Choose a discovered source first.", "请先选择一个已发现的来源。"),
        nextStep: tx("Click Discover Sources, then select Codex or Claude Code logs.", "点击发现来源，然后选择 Codex 或 Claude Code 日志。"),
        tone: "warning"
      });
      return;
    }

    setBusyAction("local-tool-preview");
    setError(null);

    try {
      const preview = await window.workbench.previewLocalToolTelemetrySource(selectedLocalToolSource);
      startTransition(() => {
        setLocalToolPreview(preview);
        setLocalToolImportResult(null);
        setInteractionNotice({
          area: tx("Analysis / Local Tools", "分析 / 本地工具"),
          action: tx("Preview Source", "预览来源"),
          result: tx(
            `${preview.importableRuns} importable run(s), ${preview.detectedToolNames.length} tool signal(s), confidence ${preview.confidence}.`,
            `可导入 ${preview.importableRuns} 条运行，发现 ${preview.detectedToolNames.length} 类工具信号，置信度 ${preview.confidence}。`
          ),
          nextStep:
            preview.importableRuns > 0
              ? tx("Review the preview metrics, then import normalized telemetry.", "查看预览指标，然后导入规范化遥测。")
              : tx("Scan the selected project first or choose another source with explicit Skill evidence.", "请先扫描已选择项目，或选择包含明确技能证据的其他来源。"),
          tone: preview.importableRuns > 0 ? "success" : "warning"
        });
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Local tool telemetry preview failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function importLocalToolTelemetrySource() {
    const source = localToolPreview?.source ?? selectedLocalToolSource;
    if (!source) {
      showInteractionNotice({
        area: tx("Analysis / Local Tools", "分析 / 本地工具"),
        action: tx("Import Source", "导入来源"),
        result: tx("Choose and preview a source before importing.", "请先选择并预览一个来源，再导入。"),
        nextStep: tx("Run Discover Sources and Preview Source first.", "请先执行发现来源和预览来源。"),
        tone: "warning"
      });
      return;
    }

    setBusyAction("local-tool-import");
    setError(null);

    try {
      const result = await window.workbench.importLocalToolTelemetrySource(source);
      const proposalResult = await window.workbench.refreshOptimizationProposals();
      const nextGraph = await window.workbench.refreshGraph();
      startTransition(() => {
        setLocalToolPreview(result.preview);
        setLocalToolImportResult(result);
        setTelemetryResult(result.telemetry);
        setProposalRefreshResult(proposalResult);
        setProposals(proposalResult.proposals);
        setGraphSnapshot(nextGraph);
        setInteractionNotice({
          area: tx("Analysis / Local Tools", "分析 / 本地工具"),
          action: tx("Import Source", "导入来源"),
          result: tx(
            `${result.telemetry.importedRuns} run(s) imported and ${result.telemetry.updatedRuns} updated from ${result.source.label}.`,
            `已从 ${result.source.label} 导入 ${result.telemetry.importedRuns} 条运行，更新 ${result.telemetry.updatedRuns} 条。`
          ),
          nextStep: tx("Review Today Snapshot, Seven-Day Window, and Optimization Signals below.", "查看下方今日快照、七日窗口和优化信号。"),
          tone: "success"
        });
      });
      await refreshWorkbench(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Local tool telemetry import failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function updateProposalStatus(proposalId: string, status: OptimizationProposalStatus) {
    setBusyAction("proposal-status");
    setActiveProposalId(proposalId);
    setError(null);

    try {
      const updated = await window.workbench.updateOptimizationProposalStatus(proposalId, status);
      const nextGraph = await window.workbench.refreshGraph();
      const action =
        status === "accepted"
          ? tx("Accept", "接受")
          : status === "dismissed"
            ? tx("Dismiss", "忽略")
            : status === "resolved"
              ? tx("Mark Resolved", "标记解决")
              : tx("Reopen", "重新打开");
      const summary =
        status === "accepted"
          ? tx(
              "Decision recorded only; Skill OS has not rewritten the Skill or applied changes.",
              "仅记录决策；Skill OS 没有改写 Skill，也没有应用变更。"
            )
          : status === "dismissed"
            ? tx(
                "Removed from the active queue while preserving local evidence and history.",
                "已移出待处理队列，同时保留本地证据和历史。"
              )
            : status === "resolved"
              ? tx(
                  "Marked handled after review; this confirms the issue is no longer active.",
                  "已在审查后标记为已处理；表示该问题不再处于活跃状态。"
                )
              : tx(
                  "Returned to the active decision queue for another review cycle.",
                  "已回到活跃决策队列，进入下一轮审查。"
                );
      const nextStep =
        status === "accepted"
          ? tx(
              "Route implementation through Apply Center or a manual code change after reviewing evidence.",
              "审查证据后，通过应用中心或手动代码变更来执行实现。"
            )
          : status === "dismissed"
            ? tx(
                "Use Reopen if new telemetry makes this proposal relevant again.",
                "如果新的遥测让该建议重新相关，可使用重新打开。"
              )
            : status === "resolved"
              ? tx(
                  "Refresh proposals after the next telemetry import to verify the signal stays quiet.",
                  "下次导入遥测后刷新建议，确认该信号保持安静。"
                )
              : tx(
                  "Review evidence again, then accept, dismiss, or mark resolved.",
                  "重新审查证据，然后选择接受、忽略或标记解决。"
                );
      startTransition(() => {
        setProposals((current) =>
          current.map((proposal) => (proposal.id === updated.id ? updated : proposal))
        );
        setGraphSnapshot(nextGraph);
        setProposalDecisionNotice({
          proposalTitle: updated.title,
          skillName: updated.skillName,
          action,
          summary,
          nextStep
        });
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update proposal");
    } finally {
      setActiveProposalId(null);
      setBusyAction(null);
    }
  }

  async function validateBackupManifest(manifestPathOverride?: string) {
    const targetPath = manifestPathOverride ?? backupManifestPath;
    if (!targetPath) {
      setError("Choose a backup manifest before validating.");
      showInteractionNotice({
        area: tx("Settings / Backup", "设置 / 备份"),
        action: tx("Validate Backup", "验证备份"),
        result: tx("Validation needs a backup.manifest.json file first.", "验证前需要先选择 backup.manifest.json 文件。"),
        nextStep: tx("Click Choose Manifest, then run validation again.", "点击选择清单，然后再次运行验证。"),
        tone: "warning"
      });
      return null;
    }

    setBusyAction("backup-validate");
    setError(null);

    try {
      const result = await window.workbench.validateBackupManifest(targetPath);
      startTransition(() => {
        setBackupManifestPath(targetPath);
        setBackupValidation(result);
        setBackupRestoreImpact(null);
        setInteractionNotice({
          area: tx("Settings / Backup", "设置 / 备份"),
          action: tx("Validate Backup", "验证备份"),
          result: result.canRestore
            ? tx("Backup manifest passed read-only integrity validation.", "备份清单已通过只读完整性校验。")
            : tx("Backup manifest has validation issues; restore preview remains guarded.", "备份清单存在校验问题；恢复预览仍受保护。"),
          nextStep: result.canRestore
            ? tx("Preview restore impact before doing any manual recovery work.", "在任何手动恢复前先预览恢复影响。")
            : tx("Review blocking issues and choose another manifest if needed.", "检查阻塞问题，必要时选择另一个清单。"),
          tone: result.canRestore ? "success" : "warning"
        });
      });
      return result;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Backup validation failed");
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function previewBackupRestoreImpact(manifestPathOverride?: string) {
    const targetPath = manifestPathOverride ?? backupManifestPath;
    if (!targetPath) {
      setError("Choose a backup manifest before previewing restore impact.");
      showInteractionNotice({
        area: tx("Settings / Backup", "设置 / 备份"),
        action: tx("Preview Restore Impact", "预览恢复影响"),
        result: tx("Restore impact preview needs a backup manifest first.", "恢复影响预览需要先选择备份清单。"),
        nextStep: tx("Choose and validate a backup.manifest.json file first.", "请先选择并验证 backup.manifest.json 文件。"),
        tone: "warning"
      });
      return null;
    }

    setBusyAction("backup-impact");
    setError(null);

    try {
      const result = await window.workbench.previewBackupRestoreImpact(targetPath);
      startTransition(() => {
        setBackupManifestPath(targetPath);
        setBackupValidation(result.validation);
        setBackupRestoreImpact(result);
        setInteractionNotice({
          area: tx("Settings / Backup", "设置 / 备份"),
          action: tx("Preview Restore Impact", "预览恢复影响"),
          result: tx(
            `${result.totalBackupFileCount + result.totalCurrentFileCount} file reference(s) compared without restoring data.`,
            `已比较 ${result.totalBackupFileCount + result.totalCurrentFileCount} 个文件引用，未恢复任何数据。`
          ),
          nextStep: tx(
            "Use the preview to plan recovery manually; Skill OS did not overwrite state.",
            "用该预览规划手动恢复；Skill OS 未覆盖任何状态。"
          ),
          tone: "info"
        });
      });
      return result;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Restore impact preview failed");
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function exportBundle() {
    if (boot?.status !== "ready") {
      setError("Authorize one project directory before exporting bundles.");
      showInteractionNotice({
        area: tx("Bundles / Export", "Bundle / 导出"),
        action: tx("Export Skill Bundle", "导出 Skill Bundle"),
        result: tx("Export is blocked until local authorization is ready.", "本地授权就绪前，导出会被阻止。"),
        nextStep: tx("Complete first-run authorization and index at least one local Skill.", "完成首次授权，并至少索引一个本地技能。"),
        tone: "warning"
      });
      return;
    }

    if (!selectedBundleSkillId) {
      setError("Choose an indexed skill before exporting a bundle.");
      showInteractionNotice({
        area: tx("Bundles / Export", "Bundle / 导出"),
        action: tx("Export Skill Bundle", "导出 Skill Bundle"),
        result: tx("Export needs an indexed Skill selection first.", "导出前需要先选择已索引 Skill。"),
        nextStep: tx("Scan the selected project, select a Skill, then export again.", "扫描已选择项目、选择 Skill，然后再次导出。"),
        tone: "warning"
      });
      return;
    }

    setBusyAction("bundle-export");
    setError(null);
    setBundleActionNotice(null);

    try {
      const result = await window.workbench.exportSkillBundle({
        skillId: selectedBundleSkillId,
        bundleName: bundleExportName.trim() || undefined
      });
      const [nextGraph, nextBundles] = await Promise.all([
        window.workbench.refreshGraph(),
        window.workbench.listBundles()
      ]);
      startTransition(() => {
        setBundleExportResult(result);
        setBundles(nextBundles);
        setGraphSnapshot(nextGraph);
        setBundleExportName("");
        setBundleActionNotice({
          action: tx("Export Complete", "导出完成"),
          bundleName: result.bundle.bundleName,
          summary: tx(
            "Original Skill folder was not changed; files were copied into app-local bundle storage.",
            "原始 Skill 文件夹未被修改；文件已复制到应用本地 Bundle 存储。"
          ),
          nextStep: tx(
            "Inspect the manifest or jump to the graph node before sharing or reusing this bundle.",
            "共享或复用前，可先检查清单或跳转到图谱节点。"
          )
        });
      });
      await refreshWorkbench(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Bundle export failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function validateBundleManifest(manifestPathOverride?: string) {
    const targetPath = manifestPathOverride ?? bundleManifestPath;
    if (!targetPath) {
      setError("Choose a bundle manifest before validating.");
      showInteractionNotice({
        area: tx("Bundles / Import", "Bundle / 导入"),
        action: tx("Validate Bundle", "验证 Bundle"),
        result: tx("Validation needs a bundle.manifest.json file first.", "验证前需要先选择 bundle.manifest.json 文件。"),
        nextStep: tx("Click Choose Manifest, then validate the bundle import preview.", "点击选择清单，然后校验 Bundle 导入预览。"),
        tone: "warning"
      });
      return null;
    }

    setBusyAction("bundle-validate");
    setError(null);
    setBundleActionNotice(null);

    try {
      const result = await window.workbench.validateSkillBundleImport(targetPath);
      startTransition(() => {
        setBundleManifestPath(targetPath);
        setBundleValidation(result);
        setBundleImportStrategy((current) =>
          result.availableStrategies.includes(current) ? current : result.recommendedStrategy
        );
        setBundleActionNotice({
          action: tx("Validation Complete", "校验完成"),
          bundleName: result.manifest?.bundleName ?? tx("Unknown Bundle", "未知 Bundle"),
          summary: result.canImport
            ? tx(
                "Read-only validation passed; nothing has been copied or activated yet.",
                "只读校验已通过；目前还没有复制或激活任何内容。"
              )
            : tx(
                "Read-only validation found blocking issues; import remains disabled.",
                "只读校验发现阻塞问题；导入仍保持禁用。"
              ),
          nextStep: result.canImport
            ? tx(
                "Review the diff and selected strategy, then import only if the preview matches your intent.",
                "审查差异和已选策略；只有预览符合预期时再导入。"
              )
            : tx(
                "Resolve blocking issues or choose another bundle.manifest.json file.",
                "先解决阻塞问题，或选择另一个 bundle.manifest.json 文件。"
              )
        });
      });
      return result;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Bundle validation failed");
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function importBundle() {
    if (boot?.status !== "ready") {
      setError("Authorize one project directory before importing bundles.");
      showInteractionNotice({
        area: tx("Bundles / Import", "Bundle / 导入"),
        action: tx("Import Bundle", "导入 Bundle"),
        result: tx("Import is blocked until local authorization is ready.", "本地授权就绪前，导入会被阻止。"),
        nextStep: tx("Complete authorization, then validate the local bundle manifest.", "完成授权后，再校验本地 Bundle 清单。"),
        tone: "warning"
      });
      return;
    }

    const targetPath = bundleManifestPath || (await chooseBundleManifest());
    if (!targetPath) {
      showInteractionNotice({
        area: tx("Bundles / Import", "Bundle / 导入"),
        action: tx("Import Bundle", "导入 Bundle"),
        result: tx("Import did not start because no manifest was selected.", "未选择清单，因此导入未开始。"),
        nextStep: tx("Choose a bundle.manifest.json file and run validation first.", "选择 bundle.manifest.json 文件，并先运行校验。"),
        tone: "info"
      });
      return;
    }

    setBusyAction("bundle-import");
    setError(null);
    setBundleActionNotice(null);

    try {
      const validation = await window.workbench.validateSkillBundleImport(targetPath);
      const resolvedStrategy = validation.availableStrategies.includes(bundleImportStrategy)
        ? bundleImportStrategy
        : validation.recommendedStrategy;
      startTransition(() => {
        setBundleValidation(validation);
        setBundleImportStrategy(resolvedStrategy);
        setBundleActionNotice({
          action: tx("Validation Complete", "校验完成"),
          bundleName: validation.manifest?.bundleName ?? tx("Unknown Bundle", "未知 Bundle"),
          summary: tx(
            "Import is blocked by validation; no bundle was copied into app storage.",
            "导入被校验阻止；没有 Bundle 被复制到应用存储。"
          ),
          nextStep: tx(
            "Resolve the blocking issues shown in the validation panel before importing.",
            "导入前请先解决校验面板中显示的阻塞问题。"
          )
        });
      });

      if (!validation.canImport) {
        setError("Resolve the blocking bundle validation issues before importing.");
        return;
      }

      const result = await window.workbench.importSkillBundle({
        manifestPath: targetPath,
        importMode: "copy",
        strategy: resolvedStrategy
      });
      const [nextGraph, nextBundles] = await Promise.all([
        window.workbench.refreshGraph(),
        window.workbench.listBundles()
      ]);
      startTransition(() => {
        setBundleImportResult(result);
        setBundleValidation(result.validation);
        setBundleImportStrategy(result.appliedStrategy);
        setBundles(nextBundles);
        setGraphSnapshot(nextGraph);
        setBundleActionNotice({
          action: tx("Import Complete", "导入完成"),
          bundleName: result.bundle.bundleName,
          summary: tx(
            `Bundle copied into app-local storage using ${formatBundleImportStrategy(result.appliedStrategy)} strategy.`,
            `Bundle 已按 ${formatBundleImportStrategy(result.appliedStrategy)} 策略复制到应用本地存储。`
          ),
          nextStep: result.bundle.supersedesBundleId
            ? tx(
                "Inspect the bundle lineage to confirm the previous baseline moved into superseded history.",
                "检查 Bundle 谱系，确认之前的基线已进入已替代历史。"
              )
            : tx(
                "Inspect inventory or graph context; the existing baseline was preserved.",
                "检查清单或图谱上下文；现有基线已保留。"
              )
        });
      });
      await refreshWorkbench(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Bundle import failed");
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return (
      <main className="page-shell centered">
        <div className="panel">
          <h1>Skill OS</h1>
          <p>
            <LocalizedCopy
              mode={languageMode}
              en="Loading local authorization and storage state..."
              zh="正在加载本地授权与存储状态..."
            />
          </p>
        </div>
      </main>
    );
  }

  if (!boot) {
    return (
      <main className="page-shell centered">
        <div className="panel bootstrap-fallback">
          <div className="hero-toolbar">
            <p className="eyebrow">{tx("Initialization Check", "初始化检查")}</p>
            <LanguageSwitcher value={languageMode} onChange={setLanguageMode} />
          </div>
          <h1>
            <LocalizedCopy
              mode={languageMode}
              en="Workbench could not initialize"
              zh="工作台无法初始化"
            />
          </h1>
          <p className="section-copy">
            <LocalizedCopy
              mode={languageMode}
              en="The local API did not return a usable bootstrap state. In browser preview this should fall back to demo data; in Electron this usually means the preload bridge failed."
              zh="本地 API 没有返回可用的启动状态。浏览器预览时这里应该回退到演示数据；Electron 中通常表示 preload 桥接失败。"
            />
          </p>
          {error ? <div className="error-banner">{error}</div> : null}
          <div className="toolbar">
            <button type="button" className="primary" onClick={() => void refreshWorkbench()}>
              {tx("Retry Initialization", "重试初始化")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const proposalCounts = {
    open: proposals.filter((proposal) => proposal.status === "open").length,
    accepted: proposals.filter((proposal) => proposal.status === "accepted").length,
    dismissed: proposals.filter((proposal) => proposal.status === "dismissed").length,
    resolved: proposals.filter((proposal) => proposal.status === "resolved").length
  };
  const acceptedProposals = proposals.filter((proposal) => proposal.status === "accepted");
  const proposalLifecycleSteps = [
    {
      key: "open",
      label: tx("Review", "审查"),
      detail: tx("Evidence is waiting for a decision", "证据等待决策"),
      count: proposalCounts.open
    },
    {
      key: "accepted",
      label: tx("Plan", "排期"),
      detail: tx("Accepted work needs implementation", "已接受事项需要实现"),
      count: proposalCounts.accepted
    },
    {
      key: "apply",
      label: tx("Apply / Verify", "应用 / 验证"),
      detail: tx("Preview target impact before writing", "写入前预览目标影响"),
      count: proposalCounts.accepted
    },
    {
      key: "resolved",
      label: tx("Close", "关闭"),
      detail: tx("Resolved work stays auditable", "已解决事项保留审计"),
      count: proposalCounts.resolved
    }
  ];
  const visibleProposals =
    proposalFilter === "all"
      ? proposals
      : proposals.filter((proposal) => proposal.status === proposalFilter);
  const bundleLifecycleCounts = {
    current: bundles.filter((bundle) => bundle.lifecycleState === "current").length,
    retained: bundles.filter((bundle) => bundle.lifecycleState === "retained").length,
    superseded: bundles.filter((bundle) => bundle.lifecycleState === "superseded").length
  };
  const latestBackup = backups[0] ?? null;
  const observedModelNames = Array.from(
    new Set(recentRuns.map((run) => run.modelName).filter((name): name is string => Boolean(name)))
  );
  const topUsedSkill = weeklySummary?.mostUsedSkills[0] ?? dailySummary?.mostUsedSkills[0] ?? null;
  const slowestSkill = weeklySummary?.slowestSkills[0] ?? dailySummary?.slowestSkills[0] ?? null;
  const highestWasteSkill = weeklySummary?.highestWasteSkills[0] ?? null;
  const overviewTodayKey = new Date().toISOString().slice(0, 10);
  const overviewWeekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const overviewTodayRuns = currentProjectRuns.filter((run) => run.startedAt.slice(0, 10) === overviewTodayKey);
  const overviewWeeklyRuns = currentProjectRuns.filter(
    (run) => new Date(run.startedAt).getTime() >= overviewWeekStart
  );
  const dailySuccessRate =
    overviewTodayRuns.length > 0
      ? overviewTodayRuns.filter((run) => run.status === "completed").length / overviewTodayRuns.length
      : 0;
  const weeklySuccessRate =
    overviewWeeklyRuns.length > 0
      ? overviewWeeklyRuns.filter((run) => run.status === "completed").length / overviewWeeklyRuns.length
      : 0;
  const overviewTrendBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
      runs: 0,
      tokens: 0,
      cost: 0,
      success: 0,
      total: 0
    };
  });
  const overviewTrendBucketMap = new Map(overviewTrendBuckets.map((bucket) => [bucket.key, bucket]));
  currentProjectRuns.forEach((run) => {
    const startedAt = new Date(run.startedAt);
    if (Number.isNaN(startedAt.getTime())) {
      return;
    }
    const key = startedAt.toISOString().slice(0, 10);
    const bucket = overviewTrendBucketMap.get(key);
    if (!bucket) {
      return;
    }
    bucket.runs += 1;
    bucket.tokens += run.totalTokens;
    bucket.cost += run.estimatedCostUsd;
    bucket.total += 1;
    if (run.status === "completed") {
      bucket.success += 1;
    }
  });
  const overviewRunTrendValues = overviewTrendBuckets.map((bucket) => bucket.runs);
  const overviewTokenTrendValues = overviewTrendBuckets.map((bucket) => bucket.tokens);
  const overviewCostTrendValues = overviewTrendBuckets.map((bucket) => bucket.cost);
  const overviewSuccessTrendValues = overviewTrendBuckets.map((bucket) =>
    bucket.total > 0 ? Math.round((bucket.success / bucket.total) * 100) : 0
  );
  const weeklyAverageRuns = Math.round(overviewWeeklyRuns.length / 7);
  const weeklyAverageTokens = Math.round(
    overviewWeeklyRuns.reduce((sum, run) => sum + run.totalTokens, 0) / 7
  );
  const overviewTodayTokens = overviewTodayRuns.reduce((sum, run) => sum + run.totalTokens, 0);
  const overviewTodayCost = overviewTodayRuns.reduce((sum, run) => sum + run.estimatedCostUsd, 0);
  const overviewWeeklyCost = overviewWeeklyRuns.reduce((sum, run) => sum + run.estimatedCostUsd, 0);
  const overviewMetricCards = [
    {
      icon: "◉",
      label: tx("Runs Today", "今日运行"),
      value: formatCount(overviewTodayRuns.length),
      trend: tx(`${formatCount(weeklyAverageRuns)} daily avg`, `${formatCount(weeklyAverageRuns)} 日均`),
      points: buildSparklinePoints(overviewRunTrendValues),
      tone: "skill"
    },
    {
      icon: "▣",
      label: tx("Tokens", "Token"),
      value: formatCount(overviewTodayTokens),
      trend: tx(`${formatCount(weeklyAverageTokens)} daily avg`, `${formatCount(weeklyAverageTokens)} 日均`),
      points: buildSparklinePoints(overviewTokenTrendValues),
      tone: "project"
    },
    {
      icon: "◇",
      label: tx("Cost", "成本"),
      value: formatUsd(overviewTodayCost),
      trend: tx(`${formatUsd(overviewWeeklyCost)} this week`, `本周 ${formatUsd(overviewWeeklyCost)}`),
      points: buildSparklinePoints(overviewCostTrendValues),
      tone: "market"
    },
    {
      icon: "✓",
      label: tx("Success", "成功率"),
      value: formatPercent(dailySuccessRate),
      trend: tx(`${formatPercent(weeklySuccessRate)} weekly`, `本周 ${formatPercent(weeklySuccessRate)}`),
      points: buildSparklinePoints(overviewSuccessTrendValues),
      tone: "agent"
    }
  ];
  const overviewHealthSignals = [
    {
      label: tx("Evaluation Coverage", "评测覆盖"),
      value: currentProjectSkillCount > 0 ? Math.min(100, Math.round(((skillAnalysis ? 1 : 0) / currentProjectSkillCount) * 100)) : 0,
      detail: tx(`${formatCount(Math.max(currentProjectSkillCount - (skillAnalysis ? 1 : 0), 0))} pending`, `${formatCount(Math.max(currentProjectSkillCount - (skillAnalysis ? 1 : 0), 0))} 待评测`)
    },
    {
      label: tx("Runtime Evidence", "运行证据"),
      value: currentProjectRuns.length > 0 ? Math.min(100, Math.round((currentProjectRuns.length / Math.max(currentProjectSkillCount, 1)) * 25)) : 0,
      detail: tx(`${formatCount(currentProjectRuns.length)} recent runs`, `${formatCount(currentProjectRuns.length)} 最近运行`)
    },
    {
      label: tx("Open Proposals", "待处理建议"),
      value: currentProjectSkillCount > 0
        ? Math.max(
            8,
            100 - proposals.filter((proposal) => proposal.status === "open" && currentProjectSkillIds.has(proposal.skillId)).length * 18
          )
        : 0,
      detail: currentProjectSkillCount > 0
        ? tx(
            `${proposals.filter((proposal) => proposal.status === "open" && currentProjectSkillIds.has(proposal.skillId)).length} need review`,
            `${proposals.filter((proposal) => proposal.status === "open" && currentProjectSkillIds.has(proposal.skillId)).length} 个待处理`
          )
        : tx("Select a project first", "请先选择项目")
    }
  ];
  const overviewDashboardProgress = Math.round(
    overviewHealthSignals.reduce((sum, signal) => sum + signal.value, 0) / Math.max(overviewHealthSignals.length, 1)
  );
  const overviewProjectCoverageItems = managedProjects.map((project) => {
    const projectSkills = boot.skills.filter((skill) => isPathInsideProject(skill.sourcePath, project.path));
    const projectSkillIds = new Set(projectSkills.map((skill) => skill.id));
    const openProposalCount = proposals.filter(
      (proposal) => proposal.status === "open" && projectSkillIds.has(proposal.skillId)
    ).length;
    const runCount = recentRuns.filter((run) => projectSkillIds.has(run.skillId)).length;
    return {
      project,
      skillCount: project.skillsFound ?? projectSkills.length,
      openProposalCount,
      runCount
    };
  });
  const resolveProjectFromMetadata = (metadata: Record<string, unknown>) => {
    const candidatePaths = [
      metadata.projectRoot,
      metadata.projectPath,
      metadata.rootPath,
      metadata.path,
      metadata.sourcePath
    ].filter((value): value is string => typeof value === "string");
    return managedProjects.find((project) =>
      candidatePaths.some(
        (candidatePath) =>
          isPathInsideProject(candidatePath, project.path) || isPathInsideProject(project.path, candidatePath)
      )
    ) ?? null;
  };
  const overviewActivityItems = [
    ...recentRuns.map((run) => {
      const skill = boot.skills.find((entry) => entry.id === run.skillId) ?? null;
      const project = skill
        ? managedProjects.find((entry) => isPathInsideProject(skill.sourcePath, entry.path)) ?? null
        : null;
      return {
        id: `run-${run.runId}`,
        title: run.skillName,
        label: tx("Runtime captured", "运行已捕获"),
        projectName: project?.name ?? tx("Unbound", "未绑定"),
        occurredAt: run.startedAt,
        time: formatDateTime(run.startedAt)
      };
    }),
    ...auditEvents.map((event) => {
      const project = resolveProjectFromMetadata(event.metadata);
      return {
        id: `audit-${event.id}`,
        title:
          event.eventType === "authorization.granted"
            ? tx("Authorization granted", "授权已生效")
            : event.eventType === "backup.created"
              ? tx("Backup created", "备份已创建")
              : event.eventType === "bundle.created"
                ? tx("Bundle created", "Bundle 已创建")
                : tx("Local event recorded", "本地事件已记录"),
        label: tx("Audit trail", "审计轨迹"),
        projectName: project?.name ?? tx("System", "系统"),
        occurredAt: event.createdAt,
        time: formatDateTime(event.createdAt)
      };
    })
  ]
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, 8);
  const remoteSkillCount = marketplaceCatalog?.skills.length ?? 0;
  const topbarStatusItems = [
    {
      icon: "●",
      label: tx("Auth", "授权"),
      value: boot.status === "ready" ? tx("Active", "生效") : tx("Limited", "受限")
    },
    {
      icon: "▣",
      label: tx("DB", "数据库"),
      value: "SQLite"
    },
    {
      icon: "◉",
      label: tx("Telemetry", "遥测"),
      value: boot.policy?.telemetryMode ?? "disabled"
    },
    {
      icon: "◎",
      label: tx("Graph", "图谱"),
      value: graphSnapshot?.totalNodes ? tx("Ready", "就绪") : tx("Pending", "待生成")
    },
    {
      icon: "◒",
      label: tx("Remote", "远程"),
      value: tx("Manual only", "仅手动")
    }
  ];
  const isBuilderMode = productMode === "builder";
  const productModeLabel = formatProductModeText(
    productMode,
    tx("Guided Mode", "引导模式"),
    tx("Builder Mode", "构建模式")
  );
  const activeHealthPolicy = boot.healthScorePolicy;
  const healthPolicyLabel = (preset: SkillHealthScorePolicyPreset) =>
    preset === "balanced"
      ? tx("Balanced", "均衡")
      : preset === "reliability_first"
        ? tx("Reliability First", "可靠性优先")
        : preset === "cost_guard"
          ? tx("Cost Guard", "成本守卫")
          : preset === "latency_guard"
            ? tx("Latency Guard", "速度守卫")
            : tx("Freshness Guard", "新鲜度守卫");
  const healthPolicyDescription = (preset: SkillHealthScorePolicyPreset) =>
    preset === "balanced"
      ? tx(
          "Balanced scoring across reliability, cost, latency, freshness, and maintainability.",
          "在可靠性、成本、速度、新鲜度和可维护性之间保持均衡。"
        )
      : preset === "reliability_first"
        ? tx(
            "Failures and unresolved proposals affect the score more aggressively.",
            "失败率和未解决建议会更明显地影响分数。"
          )
        : preset === "cost_guard"
          ? tx(
              "High token pressure is treated as a stronger health risk.",
              "高 Token 压力会被视为更强的健康风险。"
            )
          : preset === "latency_guard"
            ? tx(
                "Slow interactive Skills lose score sooner.",
                "交互较慢的 Skill 会更早扣分。"
              )
            : tx(
                "Stale or unseen Skills are treated as higher governance risk.",
                "长期未见或过期 Skill 会被视为更高治理风险。"
              );
  const healthPolicyWeights = [
    {
      label: tx("Reliability", "可靠性"),
      value: activeHealthPolicy.reliabilityWeight
    },
    {
      label: tx("Cost", "成本"),
      value: activeHealthPolicy.costWeight
    },
    {
      label: tx("Latency", "速度"),
      value: activeHealthPolicy.latencyWeight
    },
    {
      label: tx("Freshness", "新鲜度"),
      value: activeHealthPolicy.freshnessWeight
    },
    {
      label: tx("Maintain", "维护"),
      value: activeHealthPolicy.maintainabilityWeight
    }
  ];
  function scrollProductWorkspaceToSection(
    href: (typeof productNavHrefs)[number],
    behavior: ScrollBehavior = "smooth"
  ) {
    const workspace = productWorkspaceRef.current;
    if (workspace?.classList.contains("single-module-mode")) {
      workspace.scrollTop = 0;
      workspace.scrollTo({
        top: 0,
        behavior: "auto"
      });
      return;
    }

    const target = document.getElementById(href.slice(1));

    if (!workspace || !target) {
      window.requestAnimationFrame(() => {
        document.getElementById(href.slice(1))?.scrollIntoView({ block: "start", behavior });
      });
      return;
    }

    const workspaceRect = workspace.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextTop = workspace.scrollTop + targetRect.top - workspaceRect.top - 12;

    workspace.scrollTo({
      top: Math.max(0, nextTop),
      behavior
    });
  }

  function navigateToProductSection(href: (typeof productNavHrefs)[number]) {
    pendingNavigationHrefRef.current = href;
    setActiveSectionHref(href);
    setInteractionNotice(null);
    if (window.location.hash !== href) {
      window.history.pushState(null, "", href);
    }
    scrollProductWorkspaceToSection(href, "smooth");
  }

  function showInteractionNotice(notice: InteractionNotice) {
    setInteractionNotice(notice);
  }

  function announceGenericInteraction(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const interactive = target.closest<HTMLElement>(
      "button, [role='button'], .skill-top-card, .skill-simple-row, .graph-search-item, .graph-navigation-item, .graph-scope-item"
    );
    if (!interactive || interactive.closest(".product-nav, .language-switcher, .product-topbar-actions")) {
      return;
    }

    if (
      interactive.closest(
        ".interaction-action-feedback, .skill-action-feedback, .graph-action-feedback, .proposal-decision-feedback, .bundle-action-feedback, .apply-flow-feedback, .marketplace-action-feedback"
      )
    ) {
      return;
    }

    const beforeNotice = interactionNoticeRef.current;
    const text = (interactive.textContent ?? "").replace(/\s+/g, " ").trim();
    const action = text.slice(0, 72) || tx("Control Activated", "控件已触发");

    window.setTimeout(() => {
      if (interactionNoticeRef.current !== beforeNotice) {
        return;
      }

      setInteractionNotice({
        area: currentAreaLabel(),
        action,
        result: tx(
          "The interface registered this click and kept the action in preview or local state.",
          "界面已响应此次点击，并将动作保持在预览或本地状态。"
        ),
        nextStep: tx(
          "Review the highlighted panel, selected state, or staged next action before continuing.",
          "继续前请查看高亮面板、选中状态或已暂存的下一步动作。"
        ),
        tone: "info"
      });
    }, 80);
  }

  function currentAreaLabel() {
    const activeItem = productNavGroups.flatMap((group) => group.items).find((item) => item.href === activeSectionHref);
    return activeItem?.label ?? tx("Current Module", "当前模块");
  }

  function showSkillActionNotice(
    skill: SkillSummary,
    action: string,
    summary: string,
    detail: string
  ) {
    setSelectedSkillAnalysisSkillId(skill.id);
    setSkillActionNotice({
      skillId: skill.id,
      skillName: skill.displayName,
      action,
      summary,
      detail
    });
  }

  function libraryStageMeta(stage: LibraryStage) {
    return stage === "analysis"
      ? {
          action: tx("Analyze Stage", "分析阶段"),
          summary: tx("Deep evidence is now the active Skill workbench layer.", "深层证据已成为当前 Skill 工作台层。"),
          detail: tx("Generate analysis to inspect dependencies, risks, alternatives, and optimization ideas.", "生成分析以查看依赖、风险、替代方案与优化想法。")
        }
      : stage === "optimization"
        ? {
            action: tx("Optimize Stage", "优化阶段"),
            summary: tx("The decision queue for this Skill is now in focus.", "此 Skill 的决策队列已进入焦点。"),
            detail: tx("Review proposal evidence before accepting, ignoring, resolving, or reopening work.", "接受、忽略、解决或重开前，请先查看建议证据。")
          }
        : stage === "tuning"
          ? {
              action: tx("Tune Scope Stage", "调校范围阶段"),
              summary: tx("Scope tuning is now active for the selected Skill.", "所选 Skill 的范围调校已激活。"),
              detail: tx("Choose the narrowest safe scope in Apply Center after checking target preview.", "查看目标预览后，在应用中心选择最小安全范围。")
            }
          : stage === "packaging"
            ? {
                action: tx("Package Stage", "打包阶段"),
                summary: tx("Bundle packaging context is now active for the selected Skill.", "所选 Skill 的 Bundle 打包上下文已激活。"),
                detail: tx("Bundle export previews manifests and dependencies without changing the source folder.", "Bundle 导出会预览清单与依赖，不会修改源目录。")
              }
            : {
                action: tx("Summary Stage", "摘要阶段"),
                summary: tx("The compact Skill summary is now active.", "紧凑 Skill 摘要已激活。"),
                detail: tx("Start here for purpose, health, usage, success rate, and next recommended action.", "从这里查看作用、健康、使用、成功率与推荐下一步。")
              };
  }

  function selectLibraryStage(stage: LibraryStage, skill = selectedLibrarySkillRow?.skill ?? null) {
    setSelectedLibraryStage(stage);
    if (!skill) {
      return;
    }

    const meta = libraryStageMeta(stage);
    showSkillActionNotice(skill, meta.action, meta.summary, meta.detail);
  }

  function selectLibrarySkill(skillId: string) {
    setSelectedSkillAnalysisSkillId(skillId);
    setSelectedLibraryStage("summary");
    const skill = librarySkillRows.find((row) => row.skill.id === skillId)?.skill;
    if (skill) {
      const meta = libraryStageMeta("summary");
      showSkillActionNotice(skill, meta.action, meta.summary, meta.detail);
    }
  }

  async function openSkillRunDetails(skill: SkillSummary, fallbackRuns: SkillRunSummary[]) {
    setSkillRunDetail({
      skill,
      runs: fallbackRuns,
      loading: true
    });

    try {
      const runs = await window.workbench.listSkillRuns(skill.id, skillRunDetailLimit);
      setSkillRunDetail({
        skill,
        runs,
        loading: false
      });
    } catch (nextError) {
      setSkillRunDetail({
        skill,
        runs: fallbackRuns,
        loading: false
      });
      showInteractionNotice({
        area: tx("Skill Library", "技能库"),
        action: tx("Open Run Details", "打开调用详情"),
        result: nextError instanceof Error ? nextError.message : tx("Run details failed to load.", "调用详情加载失败。"),
        nextStep: tx("The table still shows the locally cached recent run count.", "表格仍会显示本地缓存的最近调用次数。"),
        tone: "warning"
      });
    }
  }

  function previewSkillRun(skill: SkillSummary) {
    setSelectedLibraryStage("summary");
    showSkillActionNotice(
      skill,
      tx("Run", "运行"),
      tx("Manual execution preview only", "仅手动运行预览"),
      tx(
        "Skill OS will not auto-run a Skill from the library. Runtime execution needs an explicit engine and target confirmation.",
        "Skill OS 不会从 Skill 库自动运行 Skill。真正运行需要显式运行引擎和目标确认。"
      )
    );
  }

  function showSkillOptimization(skill: SkillSummary) {
    setSelectedLibraryStage("optimization");
    showSkillActionNotice(
      skill,
      tx("Optimize", "优化"),
      tx("Optimization queue opened for this Skill", "已打开此 Skill 的优化队列"),
      tx(
        "Review evidence first, then accept, ignore, resolve, or reopen proposals in the Optimization workspace.",
        "先查看证据，再在优化工作区接受、忽略、解决或重开建议。"
      )
    );
  }

  function showSkillTuning(skill: SkillSummary) {
    setSelectedLibraryStage("tuning");
    showSkillActionNotice(
      skill,
      tx("Tune Scope", "调校范围"),
      tx("Apply scope tuning preview selected", "已选择应用范围调校预览"),
      tx(
        "Tune the target scope before applying. Skill OS previews affected projects, folders, workspaces, and writes before confirmation.",
        "应用前先调校目标范围。Skill OS 会在确认前预览受影响项目、文件夹、工作区与写入。"
      )
    );
  }

  function showSkillPackaging(skill: SkillSummary) {
    setSelectedLibraryStage("packaging");
    setSelectedBundleSkillId(skill.id);
    showSkillActionNotice(
      skill,
      tx("Package", "打包"),
      tx("Bundle packaging preview selected", "已选择 Bundle 打包预览"),
      tx(
        "Packaging creates a local reusable asset preview and does not mutate the original Skill folder.",
        "打包会创建本地可复用资产预览，不会修改原始 Skill 目录。"
      )
    );
  }

  function previewSkillFolder(skill: SkillSummary) {
    showSkillActionNotice(
      skill,
      tx("Open Folder", "打开目录"),
      tx("Source path selected", "已选中来源路径"),
      skill.sourcePath
    );
  }

  function sendSkillToBundle(skill: SkillSummary) {
    setSelectedBundleSkillId(skill.id);
    setSelectedLibraryStage("packaging");
    showSkillActionNotice(
      skill,
      tx("Bundle", "打包"),
      tx("Bundle export target selected", "已选择 Bundle 导出目标"),
      tx(
        "The Bundle Center now points at this Skill. Export still requires explicit confirmation.",
        "Bundle 中心已指向此 Skill。导出仍需要显式确认。"
      )
    );
    navigateToProductSection("#bundles");
  }

  function sendSkillToApply(skill: SkillSummary) {
    setRemoteApplyCandidate(null);
    setRemoteApplyCandidateDetail(null);
    setSelectedLibraryStage("tuning");
    showSkillActionNotice(
      skill,
      tx("Apply", "应用"),
      tx("Apply preview target selected", "已选择应用预览目标"),
      tx(
        "The Apply Center now previews this Skill against the selected scope before any write can happen.",
        "应用中心会先按当前范围预览此 Skill，确认前不会写入。"
      )
    );
    navigateToProductSection("#apply-center");
  }

  async function handleMarketplaceAction(
    skill: RemoteMarketplaceSkill,
    action: "preview" | "analyze" | "import" | "install"
  ) {
    setSelectedMarketplaceSkillId(skill.id);
    setSelectedMarketplaceAction(action);
    setError(null);

    const actionLabel =
      action === "analyze"
        ? tx("Analyze", "分析")
        : action === "import"
          ? tx("Import", "导入")
          : action === "install"
            ? tx("Install", "安装")
            : tx("Preview", "预览");
    const summary =
      action === "install"
        ? tx(
            "Install is staged as a local activation decision, not executed.",
            "安装已进入本地激活决策预检，不会直接执行。"
          )
        : action === "import"
          ? tx(
              "Import is staged as an inactive local candidate preview.",
              "导入已进入非活跃本地候选预览。"
            )
          : action === "analyze"
            ? tx(
                "Analysis reviews trust, risk, dependencies, and activation boundaries locally.",
                "分析会在本地审查信任、风险、依赖和激活边界。"
              )
            : tx(
                "Preview keeps the remote Skill inert while showing source, trust, and risk context.",
                "预览会保持远程 Skill 静默，仅展示来源、信任和风险上下文。"
              );
    const nextStep =
      action === "install"
        ? tx("Choose scope, preview target, then activate manually.", "选择范围、预览目标，然后手动激活。")
        : action === "import"
          ? tx("Run validation before copying into app-local storage.", "复制到应用本地存储前先运行校验。")
          : action === "analyze"
            ? tx("Review the candidate preview and risk report below.", "查看下方候选预览和风险报告。")
            : tx("Use Analyze, Import, or Install when you are ready to decide.", "准备决策时再使用分析、导入或安装。");

    if (action === "import") {
      setBusyAction("marketplace-import");
      try {
        const result = await window.workbench.importMarketplaceSkill(skill.id);
        const nextRemoteCandidates = await window.workbench.listRemoteSkillCandidates();
        startTransition(() => {
          setMarketplaceImportResult(result);
          setMarketplaceActivationPreview(null);
          setRemoteCandidates(nextRemoteCandidates);
          setSelectedRemoteCandidateId(result.candidateId);
          setMarketplaceActionNotice({
            skillName: result.displayName,
            action: tx("Import", "导入"),
            summary: tx(
              "Imported as an inactive app-local candidate.",
              "已作为非活跃应用本地候选导入。"
            ),
            nextStep: tx(
              "Open activation preview, choose scope, then confirm manually before execution.",
              "打开激活预览，选择范围，然后在执行前手动确认。"
            )
          });
        });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Marketplace import failed");
      } finally {
        setBusyAction(null);
      }
      return;
    }

    if (action === "install") {
      setBusyAction("marketplace-activation-preview");
      try {
        let imported = marketplaceImportResult?.catalogSkillId === skill.id ? marketplaceImportResult : null;
        if (!imported) {
          imported = await window.workbench.importMarketplaceSkill(skill.id);
        }
        const preview = await window.workbench.previewRemoteSkillActivation(imported.candidateId);
        const nextRemoteCandidates = await window.workbench.listRemoteSkillCandidates();
        startTransition(() => {
          setMarketplaceImportResult(imported);
          setMarketplaceActivationPreview(preview);
          setRemoteCandidates(nextRemoteCandidates);
          setSelectedRemoteCandidateId(imported.candidateId);
          setMarketplaceActionNotice({
            skillName: preview.displayName,
            action: tx("Activation Preview", "激活预览"),
            summary: preview.boundarySummary,
            nextStep: tx(
              "Open Apply Center to preview target impact before any write or execution.",
              "打开应用中心预览目标影响，然后才允许任何写入或执行。"
            )
          });
        });
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Remote activation preview failed");
      } finally {
        setBusyAction(null);
      }
      return;
    }

    setMarketplaceActionNotice({
      skillName: skill.name,
      action: actionLabel,
      summary,
      nextStep
    });
  }

  async function openRemoteCandidate(candidate: RemoteSkillCandidateSummary) {
    setSelectedMarketplaceAction("install");
    setSelectedRemoteCandidateId(candidate.candidateId);
    if (candidate.catalogSkillId) {
      setSelectedMarketplaceSkillId(candidate.catalogSkillId);
    }
    setBusyAction("marketplace-activation-preview");
    setError(null);

    try {
      const preview = await window.workbench.previewRemoteSkillActivation(candidate.candidateId);
      const nextRemoteCandidates = await window.workbench.listRemoteSkillCandidates();
      startTransition(() => {
        setRemoteCandidates(nextRemoteCandidates);
        setSelectedRemoteCandidateId(candidate.candidateId);
        setMarketplaceImportResult({
          candidateId: candidate.candidateId,
          catalogSkillId: candidate.catalogSkillId ?? candidate.candidateId,
          sourceType: candidate.sourceType,
          sourceUrl: candidate.sourceUrl,
          normalizedUrl: candidate.normalizedUrl,
          displayName: candidate.displayName,
          importedAt: candidate.importedAt,
          status: "inactive_remote_candidate",
          storageMode: "app_local_copy",
          executionPolicy: "manual_until_activated",
          riskLevel: candidate.riskLevel,
          verificationStatus: candidate.verificationStatus,
          nextSteps: [
            tx("Review activation preview.", "查看激活预览。"),
            tx("Open Apply Center for target preview.", "打开应用中心进行目标预览。")
          ]
        });
        setMarketplaceActivationPreview(preview);
        setMarketplaceActionNotice({
          skillName: preview.displayName,
          action: tx("Open Candidate", "打开候选"),
          summary: preview.boundarySummary,
          nextStep: tx(
            "Review activation preview, then open Apply Center before any execution.",
            "查看激活预览，然后在任何执行前打开应用中心。"
          )
        });
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Remote candidate preview failed");
    } finally {
      setBusyAction(null);
    }
  }

  function openRemoteCandidateApplyHandoff(candidate: RemoteSkillCandidateSummary) {
    if (candidate.status === "activation_previewed") {
      setRemoteApplyCandidate(candidate);
      setRemoteApplyCandidateDetail(selectedRemoteCandidateDetail);
      setApplyWorkbenchStage("preview");
      setApplyFlowNotice(null);
      setApplyScopeNotice({
        scope: tx("Remote Candidate", "远程候选"),
        summary: tx(
          "This handoff only stages a remote target preview; it does not write, install, or execute.",
          "此交接只会暂存远程目标预览，不会写入、安装或执行。"
        ),
        nextStep: tx("Choose the narrowest scope and inspect target impact before confirmation.", "选择最小范围，并在确认前检查目标影响。")
      });
      navigateToProductSection("#apply-center");
      return;
    }

    showInteractionNotice({
      area: tx("Remote Candidate", "远程候选"),
      action: tx("Apply Handoff", "应用交接"),
      result: tx(
        "Activation preview is required before opening Apply Center for this remote Skill.",
        "此远程 Skill 进入应用中心前必须先完成激活预览。"
      ),
      nextStep: tx("Click Preview Activation first, then choose scope and target preview.", "先点击激活预览，然后选择范围并预览目标。"),
      tone: "warning"
    });
  }

  function startApplyFlowPreview() {
    const skill = primaryLibrarySkill;
    setApplyWorkbenchStage("guardrails");
    setApplyFlowNotice({
      title: tx("Apply flow is in read-only preview", "应用流程处于只读预览"),
      summary: remoteApplyCandidate
        ? formatLocalizedText(
            languageMode,
            `${remoteApplyCandidate.displayName} is staged as a remote candidate for ${formatApplyScope(applyScope, "en")}.`,
            `${remoteApplyCandidate.displayName} 已作为远程候选暂存到${formatApplyScope(applyScope, "zh")}。`
          )
        : skill
        ? formatLocalizedText(
            languageMode,
            `${skill.displayName} is staged for ${formatApplyScope(applyScope, "en")}.`,
            `${skill.displayName} 已准备进入${formatApplyScope(applyScope, "zh")}。`
          )
        : tx("Choose or index a Skill before applying.", "应用前请先选择或索引一个 Skill。"),
      detail: remoteApplyCandidate
        ? tx(
            "Remote candidate apply is still read-only here: target preview, diff, scope, and explicit confirmation are required before any write or execution.",
            "远程候选应用在此仍为只读：任何写入或执行前都需要目标预览、差异预览、范围和显式确认。"
          )
        : activeApplyPreview
        ? tx(
            "Target impact, conflict policy, warnings, and preview steps are visible below. No write happens until a later explicit confirmation step.",
            "下方已展示目标影响、冲突策略、警告与预览步骤。后续显式确认前不会发生写入。"
          )
        : tx(
            "Skill OS is still resolving the local target preview from policy and skill index data.",
            "Skill OS 正在根据策略和技能索引数据解析本地目标预览。"
          )
    });
  }

  function chooseApplyScope(scope: SkillApplyScope) {
    setApplyScope(scope);
    setApplyWorkbenchStage("preview");

    const scopeLabel = formatApplyScope(scope, languageMode);
    const summary =
      scope === "system"
        ? tx(
            "System scope prepares a user-level apply preview, but still requires explicit confirmation before any write.",
            "系统范围会准备用户级应用预览，但任何写入前仍需要显式确认。"
          )
        : scope === "workspace"
          ? tx(
              "Workspace scope limits the preview to the chosen workspace.",
              "工作区范围会把预览限制在已选择工作区内。"
            )
          : scope === "project"
            ? tx(
                "Project scope attaches the Skill to one project target and keeps sibling projects untouched.",
                "项目范围会把 Skill 绑定到一个项目目标，不影响同级项目。"
              )
            : tx(
                "Folder scope targets the current folder only and avoids sibling paths.",
                "文件夹范围只面向当前文件夹，避免影响同级路径。"
              );
    const nextStep = activeApplyPreview?.scope === scope
      ? tx(
          "Review the target preview, impact counts, guardrails, and pending writes below.",
          "查看下方目标预览、影响数量、安全护栏和待确认写入。"
        )
      : tx(
          "Skill OS is refreshing the local target preview before confirmation can appear.",
          "Skill OS 正在刷新本地目标预览，完成后才会出现确认条件。"
        );

    setApplyScopeNotice({
      scope: scopeLabel,
      summary,
      nextStep
    });
  }

  const productNavGroups = [
    {
      label: tx("Workspace", "工作台"),
      items: [
        { href: "#overview", icon: "⌂", label: tx("Overview", "总览"), detail: tx("Project health at a glance", "项目健康总览") },
        { href: "#discovery", icon: "▣", label: tx("Projects", "项目管理"), detail: tx("Bind, view, scan", "绑定、查看、扫描") }
      ]
    },
    {
      label: tx("Assets", "资产"),
      items: [
        { href: "#local-skills", icon: "▥", label: tx("Skill Library", "技能库"), detail: tx("Local and remote assets", "本地与远程资产") },
        { href: "#remote-market", icon: "◈", label: tx("Remote Market", "远程市场"), detail: tx("GitHub and marketplace", "GitHub 与市场") },
        { href: "#bundles", icon: "⬡", label: tx("Bundles", "打包"), detail: tx("Export and import", "导出与导入") }
      ]
    },
    {
      label: tx("Reports", "报告"),
      items: [
        { href: "#evaluate", icon: "◎", label: tx("Reports", "评测报告"), detail: tx("Project and Skill reports", "项目与技能报告") },
        { href: "#analysis", icon: "▤", label: tx("Monitoring", "运行监控"), detail: tx("Heartbeat and telemetry", "心跳与遥测") },
        { href: "#graph", icon: "⌘", label: tx("Graph", "图谱"), detail: tx("Relationships and focus", "关系与焦点") }
      ]
    },
    {
      label: tx("Governance", "治理"),
      items: [
        { href: "#proposals", icon: "◇", label: tx("Optimize", "优化中心"), detail: tx("Review and route work", "审查并流转任务") },
        { href: "#apply-center", icon: "⇥", label: tx("Apply", "应用"), detail: tx("Scope preview and verify", "范围预览与验证") },
        { href: "#registry", icon: "▦", label: tx("Skill Index", "技能索引"), detail: tx("Runs and indexed skills", "运行与已索引 Skill") },
        { href: "#audit", icon: "◷", label: tx("Audit", "审计"), detail: tx("Local governance events", "本地治理事件") },
        { href: "#settings", icon: "⚙", label: tx("Settings", "设置"), detail: tx("Storage and permissions", "存储与权限") }
      ]
    }
  ];
  const onboardingSteps = [
    {
      id: "welcome",
      label: tx("Welcome", "欢迎"),
      title: tx("Skill OS stays local by default", "Skill OS 默认本地优先"),
      summary: tx("No scan, telemetry, or background monitor starts before approval.", "授权前不会扫描、采集遥测或启动后台监听。")
    },
    {
      id: "scope",
      label: tx("Project", "项目"),
      title: tx("Choose one project directory", "选择一个项目目录"),
      summary: tx("Version 1 only scans the selected project folder.", "v1 只扫描已选择的项目文件夹。")
    },
    {
      id: "permissions",
      label: tx("Permissions", "权限"),
      title: tx("Set data and monitoring permissions", "设置数据与监听权限"),
      summary: tx("Raw content, background monitoring, and telemetry stay explicit choices.", "原始内容、后台监听和遥测始终由用户显式选择。")
    },
    {
      id: "initialize",
      label: tx("Initialize", "初始化"),
      title: tx("Initialize local Skill index", "初始化本地技能索引"),
      summary: tx("Create local policy, initialize SQLite, and bind the selected project.", "创建本地策略、初始化 SQLite，并绑定已选择项目。")
    }
  ];
  const maxOnboardingStep = onboardingSteps.length - 1;
  const currentOnboardingStep = onboardingSteps[Math.min(onboardingStep, maxOnboardingStep)];

  return (
    <LanguageContext.Provider value={languageContextValue}>
    <main className="page-shell">
      <div className="product-shell">
        <aside className="product-sidebar" aria-label={tx("Workbench navigation", "工作台导航")}>
          <div className="product-brand">
            <span className="product-brand-mark">OS</span>
            <div>
              <strong>Skill OS</strong>
              <span>{tx("Projects · Skills · Reports", "项目 · 技能 · 报告")}</span>
            </div>
          </div>
          <nav className="product-nav">
            {productNavGroups.map((group) => (
              <div className="product-nav-group" key={group.label}>
                <span className="product-nav-group-label">{group.label}</span>
                {group.items.map((item) => (
                  <a
                    className={activeSectionHref === item.href ? "active" : undefined}
                    href={item.href}
                    key={item.href}
                    onPointerDown={(event) => {
                      if (event.button !== 0) {
                        return;
                      }

                      event.preventDefault();
                      navigateToProductSection(item.href as (typeof productNavHrefs)[number]);
                    }}
                    onMouseDown={(event) => {
                      if (event.button !== 0) {
                        return;
                      }

                      event.preventDefault();
                      navigateToProductSection(item.href as (typeof productNavHrefs)[number]);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      navigateToProductSection(item.href as (typeof productNavHrefs)[number]);
                    }}
                    aria-current={activeSectionHref === item.href ? "page" : undefined}
                    ref={(node) => {
                      productNavLinkRefs.current[item.href as (typeof productNavHrefs)[number]] =
                        node ?? undefined;
                    }}
                  >
                    <span className="product-nav-icon">{item.icon}</span>
                    <span className="product-nav-copy">
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </span>
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <div className="product-sidebar-card">
            <span className="stat-label">{tx("Local Storage", "本地存储")}</span>
            <strong>{latestBackup ? formatBytes(latestBackup.totalBytes) : tx("Ready", "已就绪")}</strong>
            <div className="storage-meter" aria-hidden="true">
              <span style={{ width: `${latestBackup ? Math.min(100, Math.max(12, latestBackup.totalBytes / 1024 / 1024)) : 18}%` }} />
            </div>
            <dl>
              <div>
                <dt>{tx("Database", "数据库")}</dt>
                <dd>{boot.databasePath.split("/").pop() ?? "app.sqlite"}</dd>
              </div>
              <div>
                <dt>{tx("Snapshots", "快照数量")}</dt>
                <dd>{backups.length}</dd>
              </div>
              <div>
                <dt>{tx("Last Backup", "最后备份")}</dt>
                <dd>{latestBackup ? formatDateTime(latestBackup.createdAt) : "n/a"}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div
          className="product-workspace single-module-mode"
          data-active-section={currentProductSection}
          onClickCapture={announceGenericInteraction}
          ref={productWorkspaceRef}
        >
      <div className="product-topbar" aria-label={tx("Local trust status", "本地信任状态")}>
        <div className="reference-trust-bar" aria-label={tx("Trust bar", "信任栏")}>
          <span>{tx("Trust bar", "信任栏")}</span>
          <strong>{tx("Local first | Local data processing", "本地优先 | 本地数据处理中")}</strong>
        </div>
        <div className="product-status-strip">
          {topbarStatusItems.map((item) => (
            <div className="product-status-tile" key={item.label}>
              <span className="product-status-icon">{item.icon}</span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.value}</small>
              </span>
            </div>
          ))}
        </div>
        <div className="product-topbar-actions">
          <ProductModeSwitcher value={productMode} onChange={setProductMode} />
          <LanguageSwitcher value={languageMode} onChange={setLanguageMode} />
          <button
            type="button"
            className="ghost-button topbar-settings-button"
            aria-label={tx("Settings", "设置")}
            title={tx("Settings", "设置")}
            onClick={() => navigateToProductSection("#settings")}
          >
            ⚙
          </button>
        </div>
      </div>
      <section className="guided-flow-panel" aria-label={tx("Guided Skill workflow", "Skill 引导流程")}>
        <div className="guided-flow-copy">
          <span className="os-module-kicker">
            {isGuidedFlowComplete ? tx("Ready", "已就绪") : tx("Next Step", "下一步")}
          </span>
          <strong>{recommendedFlowTitle}</strong>
          <small>{recommendedFlowInstruction}</small>
        </div>
        <div className="guided-stepper" role="list">
          {guidedFlowSteps.map((step, index) => {
            const state = getGuidedFlowStepState(step, index);
            return (
              <button
                type="button"
                className={`guided-step guided-step-${state}`}
                key={step.href}
                onClick={() => navigateToProductSection(step.href)}
                title={`${step.title} - ${step.doneWhen}`}
                role="listitem"
                aria-current={state === "active" ? "step" : undefined}
              >
                <span className="guided-step-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="guided-step-label">{step.compactLabel}</span>
                <span className="guided-step-state">
                  {state === "done"
                    ? tx("Done", "已完成")
                    : state === "active"
                      ? tx("Current", "当前")
                      : state === "next"
                        ? tx("Next", "下一步")
                        : tx("Pending", "待处理")}
                </span>
              </button>
            );
          })}
        </div>
        <div className="guided-flow-actions">
          <button
            type="button"
            className="primary"
            onClick={() => navigateToProductSection(recommendedFlowStep.href)}
          >
            {recommendedFlowCta}
          </button>
          <small>{recommendedFlowStep.doneWhen}</small>
        </div>
      </section>
      {interactionNotice && currentProductSection !== "overview" ? (
        <InteractionFeedback notice={interactionNotice} />
      ) : null}
      <header className="hero" data-product-section="overview" id="overview">
        <div className="overview-dashboard-reference">
          <section className="overview-dashboard-hero">
            <div>
              <span className="os-module-kicker">{tx("Project Path", "项目路径")}</span>
              <h1>{tx("Overview", "总览")}</h1>
              <p>
                {targetProjectRoot
                  ? `${tx("Current workspace", "当前工作区")}：${targetProjectRoot}`
                  : tx("No project selected. Bind one project folder to start project analysis.", "尚未选择项目。绑定一个项目文件夹后开始项目分析。")}
              </p>
            </div>
            <div className="overview-dashboard-progress">
              <span>{tx("Project analysis progress", "项目分析进度")}</span>
              <strong>{overviewDashboardProgress}%</strong>
              <i style={{ "--value": `${overviewDashboardProgress}%` } as CSSProperties} />
            </div>
          </section>

          <section className="overview-dashboard-metrics" aria-label={tx("Dashboard metrics", "仪表盘指标")}>
            {overviewMetricCards.map((metric) => (
              <button
                type="button"
                className={`overview-dashboard-metric overview-kpi-${metric.tone}`}
                key={metric.label}
                onClick={() => navigateToProductSection(metric.label === tx("Success", "成功率") ? "#evaluate" : "#analysis")}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.trend}</small>
                <svg className="overview-sparkline" viewBox="0 0 132 34" role="img" aria-label={metric.label}>
                  <polyline points={metric.points} />
                </svg>
              </button>
            ))}
          </section>

          <section className="overview-dashboard-body">
            <article className="overview-dashboard-card-main">
              <div className="overview-dashboard-card-head">
                <div>
                  <span className="os-module-kicker">
                    {tx("Actionable recommendations", "待处理建议")} · {formatCount(overviewActionItems.length)}
                  </span>
                  <h2>{recommendedFlowTitle}</h2>
                  <p>{recommendedFlowInstruction}</p>
                </div>
                <button type="button" className="primary" onClick={() => navigateToProductSection(recommendedFlowStep.href)}>
                  {recommendedFlowCta}
                </button>
              </div>
              <div className="overview-action-list" aria-label={tx("Actionable recommendations", "待处理建议")}>
                {(overviewActionItems.length > 0
                  ? overviewActionItems
                  : [
                      {
                        id: "overview-next-default",
                        tone: "project",
                        projectName: focusedProjectDisplayName || tx("No Project", "未选项目"),
                        title: recommendedFlowTitle,
                        detail: recommendedFlowInstruction,
                        href: recommendedFlowStep.href,
                        onClick: () => navigateToProductSection(recommendedFlowStep.href)
                      }
                    ]).map((item) => (
                  <button
                    type="button"
                    className={`overview-action-item tone-${item.tone}`}
                    key={item.id}
                    onClick={item.onClick}
                  >
                    <span>{item.projectName}</span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </button>
                ))}
              </div>
              <div className="overview-dashboard-boundary">
                <div>
                  <span>{tx("Local Project", "本地项目")}</span>
                  <strong>{focusedProjectDisplayName || tx("Not bound", "未绑定")}</strong>
                </div>
                <div>
                  <span>{tx("Indexed Skills", "已索引技能")}</span>
                  <strong>{formatCount(currentProjectSkillCount)}</strong>
                </div>
                <div>
                  <span>{tx("Remote Candidates", "远程候选")}</span>
                  <strong>{formatCount(remoteSkillCount)}</strong>
                </div>
                <div>
                  <span>{tx("Open Proposals", "待处理建议")}</span>
                  <strong>{formatCount(proposalCounts.open)}</strong>
                </div>
              </div>
            </article>

            <aside className="overview-dashboard-side">
              <article className="overview-dashboard-health-card">
                <span className="os-module-kicker">{tx("Health", "健康度")}</span>
                <div className="overview-dashboard-donut" style={{ "--value": `${overviewDashboardProgress}%` } as CSSProperties}>
                  <strong>{overviewDashboardProgress}%</strong>
                </div>
                <div className="overview-dashboard-health-list">
                  {overviewHealthSignals.map((signal) => (
                    <div key={signal.label}>
                      <span>{signal.label}</span>
                      <strong>{formatPercent(signal.value / 100)}</strong>
                      <i style={{ "--value": `${signal.value}%` } as CSSProperties} />
                    </div>
                  ))}
                </div>
              </article>

              <article className="overview-project-coverage">
                <div className="overview-section-head">
                  <span className="os-module-kicker">{tx("Project Coverage", "项目覆盖")}</span>
                  <strong>{formatCount(managedProjects.length)}</strong>
                </div>
                <div className="overview-project-coverage-list">
                  {overviewProjectCoverageItems.length > 0 ? (
                    overviewProjectCoverageItems.map(({ project, skillCount, openProposalCount, runCount }) => (
                      <button
                        type="button"
                        className="overview-project-row"
                        key={project.id}
                        onClick={() => {
                          setInspectedProjectPath(project.path);
                          navigateToProductSection("#discovery");
                        }}
                      >
                        <span>
                          <strong>{project.name}</strong>
                          <small>{project.lastScanAt ? tx("Scanned", "已扫描") : tx("Not scanned", "待扫描")}</small>
                        </span>
                        <span className="overview-project-stats">
                          <small>{formatCount(skillCount)} {tx("Skills", "技能")}</small>
                          <small>{formatCount(runCount)} {tx("Runs", "运行")}</small>
                          <small className={openProposalCount > 0 ? "has-action" : ""}>
                            {openProposalCount > 0
                              ? `${formatCount(openProposalCount)} ${tx("actions", "待处理")}`
                              : tx("No actions", "暂无待处理")}
                          </small>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p>{tx("No project is bound yet.", "尚未绑定项目。")}</p>
                  )}
                </div>
              </article>
            </aside>

            <article className="overview-dashboard-activity">
              <span className="os-module-kicker">{tx("Recent Activity", "最近活动")}</span>
              {overviewActivityItems.length > 0 ? (
                overviewActivityItems.map((item) => (
                  <div className="overview-dashboard-activity-row" key={item.id}>
                    <i />
                    <div>
                      <strong>{item.title}</strong>
                      <span className="overview-activity-meta">
                        <b>{item.projectName}</b>
                        {item.label}
                      </span>
                    </div>
                    <small>{item.time}</small>
                  </div>
                ))
              ) : (
                <p>{tx("No recent activity yet. Scan a project or import runtime evidence to populate this timeline.", "暂无最近活动。扫描项目或导入运行证据后，这里会显示时间线。")}</p>
              )}
            </article>
          </section>
        </div>
        <div className="overview-main">
          <div className="hero-toolbar">
            <p className="eyebrow">
              {languageMode === "zh" ? "本地优先" : "LOCAL FIRST"}
            </p>
            <span className="hero-mode-pill">{productModeLabel}</span>
          </div>
          <h1>Skill OS</h1>
          <p className="hero-copy">
            <LocalizedCopy
              mode={languageMode}
              en={
                isBuilderMode
                  ? "A local-first workbench for discovering Skills, evaluating quality, and observing real Codex / Claude runtime chains."
                  : "Find your Skills, score them with use cases, then verify whether they help in real Codex and Claude sessions."
              }
              zh={
                isBuilderMode
                  ? "本地优先的工作台，用于发现 Skill、评测质量，并观测真实 Codex / Claude 运行链路。"
                  : "发现你的 Skills，用用例评分，再验证它们是否真的帮助 Codex 和 Claude 会话。"
              }
            />
          </p>
          <div className="overview-primary-grid overview-dashboard-grid">
            <article className="overview-dashboard-card entity-skill">
              <div className="overview-dashboard-head">
                <div>
                  <span className="os-module-kicker">{tx("Overview Metrics", "总览指标")}</span>
                  <h2>{tx("Skill workflow health", "Skill 工作流健康度")}</h2>
                </div>
                <button type="button" className="ghost-button compact" onClick={() => navigateToProductSection("#analysis")}>
                  {tx("Runtime Detail", "运行详情")} ▤
                </button>
              </div>
              <div className="overview-kpi-grid" aria-label={tx("Overview KPI trends", "总览指标趋势")}>
                {overviewMetricCards.map((metric) => (
                  <button
                    type="button"
                    className={`overview-kpi-card overview-kpi-${metric.tone}`}
                    key={metric.label}
                    onClick={() => navigateToProductSection(metric.label === tx("Success", "成功率") ? "#evaluate" : "#analysis")}
                  >
                    <span className="overview-kpi-icon">{metric.icon}</span>
                    <span className="overview-kpi-label">{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.trend}</small>
                    <svg className="overview-sparkline" viewBox="0 0 132 34" role="img" aria-label={metric.label}>
                      <polyline points={metric.points} />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="overview-next-actions overview-dashboard-actions">
                <button type="button" className="primary" onClick={() => navigateToProductSection(recommendedFlowStep.href)}>
                  {recommendedFlowCta}
                </button>
                <button
                  type="button"
                  onClick={() => navigateToProductSection(isGuidedFlowComplete ? "#local-skills" : "#evaluate")}
                >
                  {isGuidedFlowComplete ? tx("Improve a Skill", "打磨 Skill") : tx("Evaluate Quality", "评测质量")}
                </button>
              </div>
            </article>
            <article className="overview-report-card">
              <div className="overview-report-head">
                <div>
                  <span className="os-module-kicker">{tx("Current State", "当前状态")}</span>
                  <strong>{tx("Coverage and risk", "覆盖与风险")}</strong>
                </div>
                <button type="button" className="ghost-button compact" onClick={() => navigateToProductSection("#evaluate")}>
                  {tx("Evaluate", "评测")} ◎
                </button>
              </div>
              <div className="overview-health-list" aria-label={tx("Overview health indicators", "总览健康指标")}>
                {overviewHealthSignals.map((signal) => (
                  <div className="overview-health-row" key={signal.label}>
                    <div>
                      <span>{signal.label}</span>
                      <strong>{formatPercent(signal.value / 100)}</strong>
                    </div>
                    <small>{signal.detail}</small>
                    <i style={{ "--value": `${signal.value}%` } as CSSProperties} />
                  </div>
                ))}
              </div>
              <div className="overview-report-metrics overview-compact-metrics">
                <div>
                  <span>{tx("Skills", "Skills")}</span>
                  <strong>{formatCount(boot.skills.length)}</strong>
                </div>
                <div>
                  <span>{tx("Models", "模型")}</span>
                  <strong>{formatCount(observedModelNames.length)}</strong>
                </div>
                <div>
                  <span>{tx("Tool Calls", "工具调用")}</span>
                  <strong>{formatCount(dailySummary?.totalToolCalls ?? 0)}</strong>
                </div>
                <div>
                  <span>{tx("Slowest", "最慢")}</span>
                  <strong>{slowestSkill ? formatDuration(slowestSkill.avgDurationMs) : "n/a"}</strong>
                </div>
              </div>
              <div className="overview-summary-row">
                <small>
                  {tx(
                    highestWasteSkill
                      ? `Waste hotspot: ${highestWasteSkill.skillName} at ${formatWasteScore(highestWasteSkill.wasteScore)}.`
                      : "Local report: inventory, evaluation readiness, runtime evidence, and improvement queue.",
                    highestWasteSkill
                      ? `浪费热点：${highestWasteSkill.skillName}，${formatWasteScore(highestWasteSkill.wasteScore)}。`
                      : "本地报表：资产、评测就绪度、运行证据和改进队列。"
                  )}
                </small>
              </div>
            </article>
          </div>
          <div className="overview-workflow-strip" aria-label={tx("Skill OS workflow", "Skill OS 工作流")}>
            <div className="overview-workflow-intro">
              <span className="os-module-kicker">{tx("Operating Path", "操作路径")}</span>
              <strong>{recommendedFlowTitle}</strong>
              <small>{recommendedFlowCta}</small>
            </div>
            {guidedFlowSteps.map((step, index) => {
              const state = getGuidedFlowStepState(step, index);
              return (
                <button
                  type="button"
                  className={`overview-workflow-step overview-workflow-step-${state}`}
                  key={step.href}
                  onClick={() => navigateToProductSection(step.href)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.compactLabel}</strong>
                  <small>
                    {state === "done"
                      ? tx("Done", "已完成")
                      : state === "active"
                        ? tx("Current", "当前")
                        : state === "next"
                          ? tx("Next", "下一步")
                          : tx("Pending", "待处理")}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="hero-side">
          <div className="local-first-card overview-trust-card">
            <div className="local-first-mark">✓</div>
            <div>
              <strong>{tx("LOCAL FIRST", "本地优先")}</strong>
              <p>{tx("All data stays on your device.", "所有数据保留在本设备。")}</p>
            </div>
          </div>
          <div className="overview-focus-dock">
            <div className="overview-focus-head overview-focus-inline">
              <span className="os-module-kicker">{tx("Today Signal", "今日信号")}</span>
              <strong>{tx("Review only what changed", "只审查发生变化的部分")}</strong>
              <small>
                {proposalCounts.open > 0
                  ? tx("Optimization has pending decisions.", "优化区有待决策事项。")
                  : tx("No urgent governance action.", "暂无紧急治理动作。")}
              </small>
            </div>
        <div className="overview-boundary-grid" aria-label={tx("Product boundaries", "产品边界")}>
              <button
                type="button"
                className="overview-boundary-card entity-skill"
                onClick={() => navigateToProductSection("#discovery")}
              >
                <span>{tx("Projects", "项目管理")}</span>
                <strong>{tx("Managed Projects", "项目管理")}</strong>
                <small>{tx("Bind, view, and scan one folder", "绑定、查看、扫描单目录")}</small>
              </button>
              <button
                type="button"
                className="overview-boundary-card entity-project"
                onClick={() => navigateToProductSection("#analysis")}
              >
                <span>{tx("Runtime", "运行链路")}</span>
                <strong>{tx("Real Usage", "真实使用")}</strong>
                <small>{tx("Skill hits, tools, tokens", "Skill 命中、工具、Token")}</small>
              </button>
            </div>
            <div className="overview-focus-summary overview-signal-summary">
              <div>
                <strong>{proposalCounts.open}</strong>
                <small>{tx("open proposals", "待处理建议")}</small>
              </div>
              <div>
                <strong>{formatCount(dailySummary?.totalRuns ?? 0)}</strong>
                <small>{tx("runs today", "今日运行")}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="overview-today-report" aria-label={tx("Today report", "今日报表")}>
          <div>
            <span>{tx("Cost", "成本")}</span>
            <strong>{formatUsd(dailySummary?.totalCostUsd ?? 0)}</strong>
            <small>{formatCount(dailySummary?.totalTokens ?? 0)} {tx("tokens", "Token")}</small>
          </div>
          <div>
            <span>{tx("Latency", "延迟")}</span>
            <strong>{formatDuration(dailySummary?.avgDurationMs ?? null)}</strong>
            <small>{tx("avg runtime", "平均耗时")}</small>
          </div>
          <div>
            <span>{tx("Success", "成功率")}</span>
            <strong>{formatPercent(dailySuccessRate)}</strong>
            <small>
              {dailySummary?.successCount ?? 0}/{dailySummary?.totalRuns ?? 0} {tx("runs", "运行")}
            </small>
          </div>
          <div>
            <span>{tx("Top Skill", "高频 Skill")}</span>
            <strong>{topUsedSkill?.skillName ?? "n/a"}</strong>
            <small>{topUsedSkill ? `${formatCount(topUsedSkill.runsCount)} ${tx("runs", "运行")}` : tx("import telemetry", "导入遥测")}</small>
          </div>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel os-module-panel" data-product-section="discovery" id="discovery">
        <div className="section-headline">
          <div>
            <h2>{tx("Project Management", "项目管理")}</h2>
            <p className="section-copy">
              <LocalizedCopy
                mode={languageMode}
                en={
                  isBuilderMode
                    ? "Bind projects here, focus one active project, and scan only that selected directory."
                    : "Start with one project folder. This version does not scan the whole computer."
                }
                zh={
                  isBuilderMode
                    ? "在这里绑定项目、查看项目详情，并且只扫描选中的项目目录。"
                    : "先从一个项目文件夹开始。本版本不扫描整台电脑。"
                }
              />
            </p>
          </div>
        </div>
        <ProjectLibraryPanel
          projects={managedProjects}
          recentRuns={recentRuns}
          telemetryReady={Boolean(boot?.policy && boot.policy.telemetryMode !== "disabled")}
          repairFeedback={projectRepairFeedback}
          onboardingLogs={projectOnboardingLogs}
          currentProjectRoot={targetProjectRoot}
          busyAction={busyAction}
          busy={busy}
          onBindProject={() => void beginBindProjectFlow()}
          onInspectProject={inspectManagedProject}
          onAnalyzeProject={analyzeManagedProject}
          onScanProject={scanManagedProject}
          onRepairProject={(project) => void repairManagedProject(project)}
          onViewOnboardingLog={(project) => setSelectedProjectLogPath(project.path)}
          onToggleMonitoring={toggleProjectMonitoring}
          onUnbindProject={unbindManagedProject}
        />

        {isEmptyTargetProject || workflowStarterPreview || workflowStarterResult ? (
          <WorkflowStarterCard
            projectRoot={workflowStarterProjectRoot}
            preview={workflowStarterPreview}
            result={workflowStarterResult}
            busyAction={busyAction}
            highlighted={workflowStarterHighlighted}
            onPreview={() => void previewRecommendedWorkflowStarter()}
            onApply={() => void applyRecommendedWorkflowStarter()}
            onOpenLibrary={() => navigateToProductSection("#local-skills")}
            onOpenEvaluate={() => navigateToProductSection("#evaluate")}
          />
        ) : null}

        {remoteSourceAnalysis ? (
          <article className={`remote-analysis-panel remote-preflight-workbench risk-${remoteSourceAnalysis.riskLevel}`}>
            <div className="remote-analysis-head">
              <div>
                <span className="os-module-kicker">{tx("Local Preflight", "本地预检")}</span>
                <h4>{remoteSourceAnalysis.displayName}</h4>
                <p>{remoteSourceAnalysis.normalizedUrl}</p>
              </div>
              <span className="remote-risk-pill">
                {formatRemoteRiskLevel(remoteSourceAnalysis.riskLevel, languageMode)}
              </span>
            </div>
            <div className="remote-analysis-meta">
              <span>
                {remoteSourceAnalysis.canImport
                  ? tx("Can import as inactive candidate", "可作为未激活候选导入")
                  : tx("Import blocked until URL is fixed", "修复 URL 前阻止导入")}
              </span>
              <span>{tx("Manual activation required", "需要手动激活")}</span>
              <span>{tx("App-local copy", "应用本地副本")}</span>
            </div>
            <div className="remote-check-grid">
              {remoteSourceAnalysis.checks.map((check) => (
                <div className={`remote-check-item check-${check.status}`} key={check.label}>
                  <strong>{check.label}</strong>
                  <p>{check.summary}</p>
                </div>
              ))}
            </div>
            <div className="remote-activation-preview">
              <strong>{tx("Activation Preview", "激活预览")}</strong>
              {remoteSourceAnalysis.activationSteps.map((step, index) => (
                <span key={step}>{String(index + 1).padStart(2, "0")} · {step}</span>
              ))}
            </div>
          </article>
        ) : null}
      </section>

      <section className="panel os-module-panel" data-product-section="local-skills" id="local-skills">
        <div className="section-headline">
          <div>
            <h2>{tx("Skill Library", "技能库")}</h2>
            <p className="section-copy">
              <LocalizedCopy
                mode={languageMode}
                en="An asset library for scanned local Skills and imported remote candidates. It stores assets; it does not auto-run them."
                zh="用于收纳本地扫描技能和远程导入候选的资产库。这里负责存储资产，不会自动运行。"
              />
            </p>
          </div>
          <div className="toolbar wrap">
            <ChineseDescriptionSwitch
              checked={skillChineseAssistEnabled}
              disabled={languageMode !== "zh"}
              onChange={() => setSkillChineseAssistEnabled((current) => !current)}
            />
          </div>
        </div>
        <div className="skill-asset-overview-grid">
          <button
            type="button"
            className="skill-asset-card entity-skill"
            onClick={() => {
              setActiveSkillAssetTab("local");
              setSkillLibraryProjectFilter("all");
            }}
          >
            <span className="os-module-kicker">{tx("Local Scanned Skills", "本地扫描技能")}</span>
            <strong>{formatCount(librarySkillRows.length)} {tx("local Skills", "本地技能")}</strong>
            <small>{tx("Collected from scanned project folders.", "来自已扫描项目目录的技能资产。")}</small>
          </button>
          <button
            type="button"
            className="skill-asset-card entity-marketplace"
            onClick={() => setActiveSkillAssetTab("remote")}
          >
            <span className="os-module-kicker">{tx("Remote Candidates", "远程候选")}</span>
            <strong>{formatCount(remoteCandidates.length)} {tx("inactive", "未激活")}</strong>
            <small>{tx("Imported remote Skills stay inactive until Apply Center confirmation.", "远程技能导入后保持未激活，直到在应用中心确认。")}</small>
          </button>
          <button
            type="button"
            className="skill-asset-card entity-project"
            onClick={() => navigateToProductSection("#discovery")}
          >
            <span className="os-module-kicker">{tx("Bound Projects", "已绑定项目")}</span>
            <strong>{formatCount(managedProjects.length)} {tx("projects", "项目")}</strong>
            <small>{tx("Project Management records which folders are bound and scanned.", "项目管理记录哪些目录已绑定、已扫描。")}</small>
          </button>
          <button
            type="button"
            className="skill-asset-card entity-agent"
            onClick={() => navigateToProductSection("#analysis")}
          >
            <span className="os-module-kicker">{tx("Runtime Evidence", "运行证据")}</span>
            <strong>{formatCount(recentRuns.length)} {tx("runs", "运行")}</strong>
            <small>{tx("Evidence is linked back to Skills and projects in reports.", "证据会在报告中关联回技能和项目。")}</small>
          </button>
        </div>
        <div className="skill-asset-tabs" role="tablist" aria-label={tx("Skill asset views", "技能资产视图")}>
          <button
            type="button"
            role="tab"
            aria-selected={activeSkillAssetTab === "local"}
            className={activeSkillAssetTab === "local" ? "active" : undefined}
            onClick={() => setActiveSkillAssetTab("local")}
          >
            <span>{tx("Local Scanned Skills", "本地扫描技能")}</span>
            <strong>{formatCount(librarySkillRows.length)}</strong>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSkillAssetTab === "remote"}
            className={activeSkillAssetTab === "remote" ? "active" : undefined}
            onClick={() => setActiveSkillAssetTab("remote")}
          >
            <span>{tx("Remote Loaded Skills", "远程加载技能")}</span>
            <strong>{formatCount(remoteCandidates.length)}</strong>
          </button>
        </div>
        <div className="skill-asset-catalog-grid is-tabbed">
          {activeSkillAssetTab === "local" ? (
          <article className="skill-asset-catalog-panel entity-skill">
            <div className="skill-asset-catalog-head">
              <div>
                <span className="os-module-kicker">{tx("Local Scanned Skills", "本地扫描技能")}</span>
                <h3>{tx("Collected Skills Table", "已收集技能表")}</h3>
              </div>
              <span className="mini-pill">{formatCount(filteredLibrarySkillRows.length)} / {formatCount(librarySkillRows.length)} {tx("items", "项")}</span>
            </div>
            <div className="skill-library-controls">
              <label className="skill-library-search">
                <span>{tx("Search", "搜索")}</span>
                <input
                  value={skillLibraryQuery}
                  onChange={(event) => setSkillLibraryQuery(event.currentTarget.value)}
                  placeholder={tx("Skill, path, project", "技能、路径、项目")}
                />
              </label>
              <label>
                <span>{tx("Project", "项目")}</span>
                <select
                  value={skillLibraryProjectFilter}
                  onChange={(event) => setSkillLibraryProjectFilter(event.currentTarget.value)}
                >
                  <option value="all">{tx("All Projects", "全部项目")}</option>
                  {managedProjects.map((project) => (
                    <option key={project.path} value={project.path}>{project.name}</option>
                  ))}
                  <option value="unbound">{tx("Unbound", "未绑定")}</option>
                </select>
              </label>
              <label>
                <span>{tx("Type", "类型")}</span>
                <select
                  value={skillLibraryTypeFilter}
                  onChange={(event) => setSkillLibraryTypeFilter(event.currentTarget.value as SkillLibraryTypeFilter)}
                >
                  <option value="all">{tx("All Types", "全部类型")}</option>
                  <option value="development">{tx("Development", "开发")}</option>
                  <option value="analysis">{tx("Analysis", "分析")}</option>
                  <option value="memory">{tx("Memory", "记忆")}</option>
                  <option value="infrastructure">{tx("Infrastructure", "基础设施")}</option>
                  <option value="packaging">{tx("Packaging", "打包")}</option>
                  <option value="governance">{tx("Governance", "治理")}</option>
                </select>
              </label>
              <label>
                <span>{tx("Sort", "排序")}</span>
                <select
                  value={skillLibrarySortKey}
                  onChange={(event) => setSkillLibrarySortKey(event.currentTarget.value as SkillLibrarySortKey)}
                >
                  <option value="priority">{tx("Recommended", "推荐")}</option>
                  <option value="calls">{tx("Calls", "调用")}</option>
                  <option value="tokens">{tx("Tokens", "Token")}</option>
                  <option value="score">{tx("Score", "评分")}</option>
                  <option value="latest">{tx("Latest Run", "最近运行")}</option>
                  <option value="name">{tx("Name", "名称")}</option>
                </select>
              </label>
            </div>
            <div className="skill-asset-table-shell">
              <table className="skill-asset-data-table local">
                <thead>
                  <tr>
                    <th>{tx("Skill", "技能")}</th>
                    <th>{tx("Project", "项目")}</th>
                    <th>{tx("Type", "类型")}</th>
                    <th>{tx("Calls", "调用")}</th>
                    <th>{tx("Tokens", "Token")}</th>
                    <th>{tx("Score", "评分")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLibrarySkillRows.map((row) => {
                    const sourceProject = managedProjects.find((project) => isPathInsideProject(row.skill.sourcePath, project.path));
                    return (
                      <tr
                        className={selectedLibrarySkillRow?.skill.id === row.skill.id ? "selected" : undefined}
                        key={row.skill.id}
                        onClick={() => selectLibrarySkill(row.skill.id)}
                      >
                        <td>
                          <button type="button" className="skill-asset-name-button" onClick={() => selectLibrarySkill(row.skill.id)}>
                            <strong>{row.skill.displayName}</strong>
                            <span>{row.purposeSummary}</span>
                          </button>
                        </td>
                        <td>
                          <strong>{sourceProject?.name || focusedProjectDisplayName || tx("Unbound project", "未绑定项目")}</strong>
                          <span>{row.skill.sourcePath}</span>
                        </td>
                        <td>{row.roleLabel}</td>
                        <td>
                          <button
                            type="button"
                            className="skill-run-count-button"
                            title={tx("View call details", "查看调用详情")}
                            onClick={(event) => {
                              event.stopPropagation();
                              void openSkillRunDetails(row.skill, row.skillRuns);
                            }}
                          >
                            {formatCount(row.skill.runtime.totalRuns)}
                          </button>
                        </td>
                        <td>{formatCount(row.skill.runtime.totalTokens)}</td>
                        <td>
                          <span className="project-status-pill">{row.skill.health.score}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredLibrarySkillRows.length === 0 ? (
                <p className="skill-asset-empty">{tx("Scan a bound project to collect local Skills.", "扫描已绑定项目后会收集本地技能。")}</p>
              ) : null}
            </div>
          </article>
          ) : (
          <article className="skill-asset-catalog-panel entity-marketplace">
            <div className="skill-asset-catalog-head">
              <div>
                <span className="os-module-kicker">{tx("Remote Loaded Skills", "远程加载技能")}</span>
                <h3>{tx("Imported candidates stay inactive", "远程候选保持未激活")}</h3>
              </div>
              <span className="mini-pill">{formatCount(filteredRemoteCandidates.length)} / {formatCount(remoteCandidates.length)} {tx("items", "项")}</span>
            </div>
            <div className="skill-library-controls remote">
              <label className="skill-library-search">
                <span>{tx("Search", "搜索")}</span>
                <input
                  value={remoteLibraryQuery}
                  onChange={(event) => setRemoteLibraryQuery(event.currentTarget.value)}
                  placeholder={tx("Remote Skill, URL, status", "远程技能、URL、状态")}
                />
              </label>
              <label>
                <span>{tx("Sort", "排序")}</span>
                <select
                  value={remoteLibrarySortKey}
                  onChange={(event) => setRemoteLibrarySortKey(event.currentTarget.value as RemoteLibrarySortKey)}
                >
                  <option value="name">{tx("Name", "名称")}</option>
                  <option value="risk">{tx("Risk", "风险")}</option>
                  <option value="status">{tx("Status", "状态")}</option>
                  <option value="source">{tx("Source", "来源")}</option>
                </select>
              </label>
            </div>
            <div className="skill-asset-table-shell">
              <table className="skill-asset-data-table remote">
                <thead>
                  <tr>
                    <th>{tx("Skill", "技能")}</th>
                    <th>{tx("Source", "来源")}</th>
                    <th>{tx("Risk", "风险")}</th>
                    <th>{tx("Verification", "验证")}</th>
                    <th>{tx("Status", "状态")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRemoteCandidates.map((candidate) => (
                    <tr key={candidate.candidateId} onClick={() => void openRemoteCandidate(candidate)}>
                      <td>
                        <button type="button" className="skill-asset-name-button" onClick={() => void openRemoteCandidate(candidate)}>
                          <strong>{candidate.displayName}</strong>
                          <span>{candidate.catalogSkillId ?? candidate.sourceType}</span>
                        </button>
                      </td>
                      <td>{candidate.normalizedUrl}</td>
                      <td>{formatRemoteRiskLevel(candidate.riskLevel, languageMode)}</td>
                      <td>{formatRemoteVerificationStatus(candidate.verificationStatus, languageMode)}</td>
                      <td>{candidate.status === "activation_previewed" ? tx("Previewed", "已预览") : tx("Inactive", "未激活")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRemoteCandidates.length === 0 ? (
                <p className="skill-asset-empty">{tx("Import remote Skills from Remote Market to list them here.", "从远程市场导入技能后会显示在这里。")}</p>
              ) : null}
            </div>
          </article>
          )}
        </div>
        {activeSkillAssetTab === "local" && selectedLibrarySkillRow ? (
          <article className="skill-asset-selected-summary entity-skill">
            <div>
              <span className="os-module-kicker">{tx("Selected Asset", "当前选中资产")}</span>
              <h3>{selectedLibrarySkillRow.skill.displayName}</h3>
              <p>{selectedLibrarySkillRow.purposeSummary}</p>
            </div>
            <div className="skill-asset-selected-metrics">
              <div>
                <span>{tx("Calls", "调用")}</span>
                <button
                  type="button"
                  className="skill-run-count-button metric"
                  onClick={() => void openSkillRunDetails(selectedLibrarySkillRow.skill, selectedLibrarySkillRow.skillRuns)}
                >
                  {formatCount(selectedLibrarySkillRow.skill.runtime.totalRuns)}
                </button>
              </div>
              <div>
                <span>{tx("Score", "评分")}</span>
                <strong>{selectedLibrarySkillRow.skill.health.score}</strong>
              </div>
              <div>
                <span>{tx("Status", "状态")}</span>
                <strong>{selectedLibrarySkillRow.healthLabel}</strong>
              </div>
              <div>
                <span>{tx("Workflow", "工作流")}</span>
                <strong>{selectedLibrarySkillRow.orchestrationSummary}</strong>
              </div>
            </div>
          </article>
        ) : null}
        {activeSkillAssetTab === "remote" && selectedRemoteCandidate ? (
          <article className="skill-asset-selected-summary entity-marketplace">
            <div>
              <span className="os-module-kicker">{tx("Selected Remote Candidate", "当前远程候选")}</span>
              <h3>{selectedRemoteCandidate.displayName}</h3>
              <p>{selectedRemoteCandidate.normalizedUrl}</p>
            </div>
            <div className="skill-asset-selected-metrics">
              <div>
                <span>{tx("Risk", "风险")}</span>
                <strong>{formatRemoteRiskLevel(selectedRemoteCandidate.riskLevel, languageMode)}</strong>
              </div>
              <div>
                <span>{tx("Verification", "验证")}</span>
                <strong>{formatRemoteVerificationStatus(selectedRemoteCandidate.verificationStatus, languageMode)}</strong>
              </div>
              <div>
                <span>{tx("Status", "状态")}</span>
                <strong>{selectedRemoteCandidate.status === "activation_previewed" ? tx("Previewed", "已预览") : tx("Inactive", "未激活")}</strong>
              </div>
              <div>
                <span>{tx("Activation", "激活")}</span>
                <strong>{tx("Manual only", "仅手动")}</strong>
              </div>
            </div>
          </article>
        ) : null}
        <div className="skill-library-flow">
          <section className="skill-library-top">
            <div className="section-headline compact">
              <div>
                <span className="os-module-kicker">{tx("Skill Detail", "技能详情")}</span>
                <h3>
                  {formatProductModeText(
                    productMode,
                    tx("Select an asset to inspect details", "选择一个资产查看细节"),
                    tx("Inspect the selected local Skill", "查看选中的本地技能")
                  )}
                </h3>
              </div>
            </div>
            <div className="skill-top-grid">
              {topLibrarySkillRows.map((row, index) => (
                <button
                  type="button"
                  className={`skill-top-card${selectedLibrarySkillRow?.skill.id === row.skill.id ? " selected" : ""}`}
                  key={row.skill.id}
                  onClick={() => selectLibrarySkill(row.skill.id)}
                >
                  <span className="skill-rank">#{index + 1}</span>
                  <strong>{row.skill.displayName}</strong>
                  <small>{row.purposeSummary}</small>
                  {isBuilderMode ? (
                    <>
                      {row.skill.governance.structureType === "composite_framework" ? (
                        <div className="skill-framework-note">
                          <span>{row.frameworkLabel ?? row.structureLabel}</span>
                          <small>
                            {[row.moduleCountLabel, row.orchestrationSummary]
                              .filter((value): value is string => Boolean(value))
                              .join(" · ")}
                          </small>
                        </div>
                      ) : null}
                      <div className="skill-governance-pills">
                        <span className={`skill-governance-pill tone-${getSkillGovernanceTone(row.skill.governance.role)}`}>
                          {row.roleLabel}
                        </span>
                        {row.skill.governance.structureType === "composite_framework" ? (
                          <span className="skill-governance-pill tone-framework">{row.structureLabel}</span>
                        ) : null}
                        {row.frameworkLabel ? (
                          <span className="skill-governance-pill tone-framework">{row.frameworkLabel}</span>
                        ) : null}
                        {row.skill.governance.preferredHarness === "superpowers" ? (
                          <span className="skill-governance-pill">Superpowers</span>
                        ) : null}
                        <span className="skill-governance-pill">{row.governanceSignal}</span>
                      </div>
                    </>
                  ) : (
                    <div className="skill-top-mode-line">
                      <span className={`skill-governance-pill tone-${getSkillGovernanceTone(row.skill.governance.role)}`}>
                        {row.roleLabel}
                      </span>
                      <span className="skill-top-mode-note">
                        {formatProductModeText(
                          productMode,
                          tx("Open for details", "点开看细节"),
                          row.skill.governance.structureType === "composite_framework"
                            ? tx("Framework", "框架")
                            : tx("Direct Skill", "直接 Skill")
                        )}
                      </span>
                    </div>
                  )}
                  <div className="skill-top-meta">
                    <span>{tx("Health", "健康")} {row.skill.health.score}</span>
                    <span>{formatCount(row.skill.runtime.totalRuns)} {tx("runs", "运行")}</span>
                    <span>{row.openProposalCount} {tx("open", "待处理")}</span>
                  </div>
                </button>
              ))}
              {topLibrarySkillRows.length === 0 ? (
                <article className="skill-top-card skill-empty-card">
                  <span className="skill-rank">00</span>
                  <strong>{tx("No local Skills", "暂无本地技能")}</strong>
                  <small>{tx("Authorize and scan folders first.", "请先授权并扫描目录。")}</small>
                </article>
              ) : null}
            </div>
          </section>

          <section className="skill-library-workspace">
            <article className="skill-list-panel">
              <div className="section-headline compact">
                <div>
                  <span className="os-module-kicker">{tx("Skills List", "技能列表")}</span>
                  <h3>{tx("Basic purpose and status only", "只看作用与基础状态")}</h3>
                </div>
                <span className="mini-pill">{formatCount(librarySkillRows.length)} {tx("indexed", "已索引")}</span>
              </div>
              <div className="skill-simple-list">
                {librarySkillRows.map((row) => (
                  <button
                    type="button"
                    className={`skill-simple-row${selectedLibrarySkillRow?.skill.id === row.skill.id ? " selected" : ""}`}
                    key={row.skill.id}
                    onClick={() => selectLibrarySkill(row.skill.id)}
                  >
                    <span className="skill-simple-main">
                      <strong>{row.skill.displayName}</strong>
                      <small>{row.purposeSummary}</small>
                      <span className="skill-simple-support">
                        <span className={`skill-governance-pill tone-${getSkillGovernanceTone(row.skill.governance.role)}`}>
                          {row.roleLabel}
                        </span>
                        <span className="skill-governance-pill">{row.healthLabel}</span>
                        {isBuilderMode && row.skill.governance.preferredHarness === "superpowers" ? (
                          <span className="skill-governance-pill">Superpowers</span>
                        ) : null}
                      </span>
                      {isBuilderMode ? (
                        <>
                          {row.skill.governance.structureType === "composite_framework" ? (
                            <span className="skill-simple-framework">
                              {row.orchestrationSummary}
                              {row.moduleCountLabel ? ` · ${row.moduleCountLabel}` : ""}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </span>
                    <span className="skill-simple-meta">
                      <span>{row.healthLabel}</span>
                      <span>{tx("Health", "健康")} {row.skill.health.score}</span>
                      <span>{formatCount(row.skill.runtime.totalRuns)} {tx("runs", "运行")}</span>
                    </span>
                  </button>
                ))}
                {librarySkillRows.length === 0 ? (
                  <div className="empty-inline">
                    {tx("Local Skills appear here after the selected project directory is scanned.", "扫描已选择项目目录后，本地技能会显示在这里。")}
                  </div>
                ) : null}
              </div>
              {isBuilderMode ? (
                <article className="skill-development-lane entity-development compact">
                  <div className="section-headline compact">
                    <div>
                      <span className="os-module-kicker">{tx("Development Lane", "开发通道")}</span>
                      <h3>{tx("Superpowers-first development flow", "Superpowers 优先开发流")}</h3>
                    </div>
                    <span className="mini-pill">
                      {formatCount(developmentLibrarySkillRows.length)} {tx("dev skills", "开发型 Skill")}
                    </span>
                  </div>
                  <p className="skill-development-copy">
                    {tx(
                      "Development Skills stay on one narrow path: plan, implement, test, review, then finish. Superpowers is the default harness when development depth matters.",
                      "开发型 Skill 只走一条窄而清晰的路径：计划、实现、测试、审查、收尾。只要开发深度足够，就默认优先走 Superpowers。"
                    )}
                  </p>
                  <div className="skill-development-steps" aria-label={tx("Development workflow", "开发工作流")}>
                    {[
                      tx("Plan", "计划"),
                      tx("Implement", "实现"),
                      tx("Test", "测试"),
                      tx("Review", "审查"),
                      tx("Finish", "收尾")
                    ].map((step) => (
                      <span key={step}>{step}</span>
                    ))}
                  </div>
                  <div className="skill-development-list">
                    {developmentLibrarySkillRows.slice(0, 3).map((row) => (
                      <button
                        type="button"
                        key={row.skill.id}
                        className={`skill-development-row${selectedDevelopmentSkillRow?.skill.id === row.skill.id ? " selected" : ""}`}
                        onClick={() => selectLibrarySkill(row.skill.id)}
                      >
                        <strong>{row.skill.displayName}</strong>
                        <small>{row.purposeSummary}</small>
                        {row.skill.governance.structureType === "composite_framework" ? (
                          <span>
                            {row.frameworkLabel ?? row.structureLabel}
                            {row.moduleCountLabel ? ` · ${row.moduleCountLabel}` : ""}
                          </span>
                        ) : null}
                        <span>{tx("Harness", "框架")}: {row.preferredHarnessLabel}</span>
                      </button>
                    ))}
                    {developmentLibrarySkillRows.length === 0 ? (
                      <div className="empty-inline">
                        {tx(
                          "Development Skills appear here once discovery finds repo- or implementation-heavy assets.",
                          "发现流程识别到仓库型或实现型资产后，开发型 Skill 会显示在这里。"
                        )}
                      </div>
                    ) : null}
                  </div>
                </article>
              ) : (
                <article className="skill-development-teaser entity-development compact">
                  <div className="section-headline compact">
                    <div>
                      <span className="os-module-kicker">{tx("Builder Detail", "构建详情")}</span>
                      <h3>{tx("Switch modes to reveal harness and governance", "切到构建模式后显示框架与治理")}</h3>
                    </div>
                  </div>
                  <p className="skill-development-copy">
                    {tx(
                      "Guided mode keeps this area quiet so you can focus on top Skills and simple rows first.",
                      "引导模式会让这里保持安静，先专注于 Top Skill 和简单列表。"
                    )}
                  </p>
                  <div className="skill-development-steps">
                    <span>{tx("Read", "阅读")}</span>
                    <span>{tx("Select", "选择")}</span>
                    <span>{tx("Analyze", "分析")}</span>
                    <span>{tx("Tune", "调校")}</span>
                    <span>{tx("Package", "打包")}</span>
                  </div>
                  <div className="os-card-actions">
                    <button type="button" className="primary" onClick={() => setProductMode("builder")}>
                      {tx("Open Builder Mode", "打开构建模式")}
                    </button>
                  </div>
                </article>
              )}
            </article>

            <article className="skill-detail-panel">
              <div className="skill-detail-head">
                <div>
                  <span className="os-module-kicker">{tx("Selected Skill Workbench", "选中 Skill 工作台")}</span>
                  <h3>{selectedLibrarySkillRow?.skill.displayName ?? tx("Select a Skill", "选择一个 Skill")}</h3>
                  <p>
                    {selectedLibrarySkillRow
                      ? selectedLibrarySkillRow.purposeSummary
                      : tx("Choose a Skill from the priority cards or list to tune it step by step.", "从优先卡片或列表中选择一个 Skill，再逐步调校。")}
                  </p>
                  {selectedLibrarySkillRow ? (
                    <div className="skill-governance-pills">
                      <span className={`skill-governance-pill tone-${getSkillGovernanceTone(selectedLibrarySkillRow.skill.governance.role)}`}>
                        {selectedLibrarySkillRow.roleLabel}
                      </span>
                      {isBuilderMode ? (
                        <>
                          <span className="skill-governance-pill tone-framework">
                            {selectedLibrarySkillRow.structureLabel}
                          </span>
                          {selectedLibrarySkillRow.frameworkLabel ? (
                            <span className="skill-governance-pill tone-framework">
                              {selectedLibrarySkillRow.frameworkLabel}
                            </span>
                          ) : null}
                          <span className="skill-governance-pill">{selectedLibrarySkillRow.preferredHarnessLabel}</span>
                          <span className="skill-governance-pill">{selectedLibrarySkillRow.governanceSignal}</span>
                          <span className="skill-governance-pill">{selectedLibrarySkillRow.governanceScopeLabel}</span>
                        </>
                      ) : (
                        <span className="skill-governance-pill tone-framework">
                          {tx("Simple view", "简明视图")}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
                {selectedLibrarySkillRow ? (
                  <div className="skill-detail-score">
                    <span>{tx("Health", "健康")}</span>
                    <strong>{selectedLibrarySkillRow.skill.health.score}</strong>
                  </div>
                ) : null}
              </div>
              {selectedLibrarySkillRow ? (
                <>
                  <div className="skill-detail-summary-grid">
                    <div>
                      <span>{tx("Status", "状态")}</span>
                      <strong>{selectedLibrarySkillRow.healthLabel}</strong>
                    </div>
                    <div>
                      <span>{tx("Usage", "使用")}</span>
                      <button
                        type="button"
                        className="skill-run-count-button metric"
                        onClick={() => void openSkillRunDetails(selectedLibrarySkillRow.skill, selectedLibrarySkillRow.skillRuns)}
                      >
                        {formatCount(selectedLibrarySkillRow.skill.runtime.totalRuns)}
                      </button>
                    </div>
                    <div>
                      <span>{tx("Success", "成功率")}</span>
                      <strong>{selectedLibrarySkillRow.performanceScore}</strong>
                    </div>
                    <div>
                      <span>{tx("Open Proposals", "待处理建议")}</span>
                      <strong>{selectedLibrarySkillRow.openProposalCount}</strong>
                    </div>
                  </div>
                  <div className="skill-health-band compact">
                    <div className="skill-health-band-head">
                      <div className="skill-health-score">
                        <span>{tx("Signal", "信号")}</span>
                        <strong>{selectedLibrarySkillRow.healthTrendLabel}</strong>
                      </div>
                      <div className="skill-health-status">
                        <strong>{selectedLibrarySkillRow.healthDelta}</strong>
                        <span>{selectedLibrarySkillRow.healthReason}</span>
                      </div>
                    </div>
                  </div>
                  <div className="skill-detail-stage-tabs" aria-label={tx("Skill workbench stages", "Skill 工作台阶段")}>
                    {[
                      { key: "summary", label: tx("Summary", "摘要") },
                      { key: "analysis", label: tx("Analyze", "分析") },
                      { key: "optimization", label: tx("Optimize", "优化") },
                      { key: "tuning", label: tx("Tune Scope", "调校范围") },
                      { key: "packaging", label: tx("Package", "打包") }
                    ].map((stage) => (
                      <button
                        type="button"
                        className={selectedLibraryStage === stage.key ? "active" : ""}
                        key={stage.key}
                        onClick={() => selectLibraryStage(stage.key as LibraryStage)}
                      >
                        {stage.label}
                      </button>
                    ))}
                  </div>
                  <div className={`skill-detail-stage-panel stage-${selectedLibraryStage}`}>
                    {selectedLibraryStage === "summary" ? (
                      <>
                        <div>
                          <span className="os-module-kicker">{tx("Recommended Next Step", "推荐下一步")}</span>
                          <h4>
                            {selectedLibraryOpenProposals.length > 0
                              ? tx("Review open optimization evidence", "查看待处理优化证据")
                              : tx("Generate a local analysis snapshot", "生成本地分析快照")}
                          </h4>
                          <p>
                            {formatProductModeText(
                              productMode,
                              selectedLibraryOpenProposals.length > 0
                                ? tx("Open proposals exist. Review them only when you need to decide.", "已有待处理建议，需要时再查看。")
                                : tx("Start here, then open analysis only when evidence is needed.", "从这里开始，只有需要证据时再打开分析。"),
                              selectedLibraryOpenProposals.length > 0
                                ? tx("This Skill already has pending suggestions. Open the optimization stage when you are ready to decide.", "此 Skill 已有待处理建议。准备决策时进入优化阶段。")
                                : selectedLibrarySkillRow.skill.governance.structureType === "composite_framework"
                                  ? tx(
                                      `This is a composite framework that coordinates ${selectedLibrarySkillRow.orchestrationSummary}${selectedLibrarySkillRow.moduleCountLabel ? ` across ${selectedLibrarySkillRow.moduleCountLabel}` : ""}. Start with summary first, then go deeper only when you need evidence or tuning.`,
                                      `这是一个组合框架，会协调 ${selectedLibrarySkillRow.orchestrationSummary}${selectedLibrarySkillRow.moduleCountLabel ? `，覆盖 ${selectedLibrarySkillRow.moduleCountLabel}` : ""}。先从摘要理解整体，再按需进入分析或调校。`
                                    )
                                  : selectedLibrarySkillRow.skill.governance.preferredHarness === "superpowers"
                                    ? tx("This development Skill prefers the Superpowers workflow: plan, implement, test, review, then finish.", "这个开发型 Skill 优先走 Superpowers 工作流：计划、实现、测试、审查、收尾。")
                                    : tx("Start with analysis only when you need deeper evidence. The list keeps basic purpose and health visible first.", "需要更深证据时再开始分析。列表先保留作用和健康状态。")
                            )}
                          </p>
                        </div>
                        <div className="skill-detail-actions">
                          <button type="button" onClick={() => previewSkillRun(selectedLibrarySkillRow.skill)}>{tx("Run Preview", "运行预览")}</button>
                          <button type="button" className="primary" onClick={() => void generateSkillAnalysis(selectedLibrarySkillRow.skill.id)}>
                            {skillAnalysisStatus === "loading"
                              ? tx("Analyzing...", "分析中...")
                              : tx("Start Analysis", "开始分析")}
                          </button>
                        </div>
                      </>
                    ) : null}
                    {selectedLibraryStage === "analysis" ? (
                      <>
                        <div>
                          <span className="os-module-kicker">{tx("Analysis Layer", "分析层")}</span>
                          <h4>{tx("Evidence appears below after generation", "生成后在下方展示证据")}</h4>
                          <p>{tx("Use this only when the basic list is not enough: dependencies, execution flow, risks, alternatives, and optimization ideas stay in the deep layer.", "仅在基础列表不够时使用：依赖、执行流、风险、替代与优化想法会留在深层。")}</p>
                        </div>
                        <div className="skill-detail-actions">
                          <button type="button" className="primary" onClick={() => void generateSkillAnalysis(selectedLibrarySkillRow.skill.id)}>
                            {busyAction === "skill-analysis"
                              ? tx("Generating...", "生成中...")
                              : skillAnalysisStatus === "ready" && skillAnalysis?.skillId === selectedLibrarySkillRow.skill.id
                                ? tx("Regenerate Analysis", "重新生成分析")
                                : tx("Generate Analysis", "生成分析")}
                          </button>
                        </div>
                      </>
                    ) : null}
                    {selectedLibraryStage === "optimization" ? (
                      <>
                        <div>
                          <span className="os-module-kicker">{tx("Optimization Queue", "优化队列")}</span>
                          <h4>{tx("Decide one suggestion at a time", "一次决策一个建议")}</h4>
                        </div>
                        <div className="skill-detail-proposals">
                          {selectedLibraryOpenProposals.length > 0 ? (
                            selectedLibraryOpenProposals.slice(0, 2).map((proposal) => (
                              <div className="skill-detail-proposal" key={proposal.id}>
                                <strong>{formatProposalTitle(proposal, languageMode)}</strong>
                                <small>{formatProposalBenefit(proposal, languageMode)}</small>
                              </div>
                            ))
                          ) : (
                            <p>{tx("No open proposal for this Skill. Generate analysis or refresh Optimization to look deeper.", "此 Skill 暂无待处理建议。可生成分析或刷新优化继续深入。")}</p>
                          )}
                        </div>
                        <div className="skill-detail-actions">
                          <button type="button" onClick={() => showSkillOptimization(selectedLibrarySkillRow.skill)}>{tx("Explain Optimization", "说明优化")}</button>
                          <button type="button" className="primary" onClick={() => navigateToProductSection("#proposals")}>{tx("Open Optimization", "打开优化")}</button>
                        </div>
                      </>
                    ) : null}
                    {selectedLibraryStage === "tuning" ? (
                      <>
                        <div>
                          <span className="os-module-kicker">{tx("Scope Tuning", "范围调校")}</span>
                          <h4>{tx("Preview impact before applying", "应用前先预览影响")}</h4>
                          <p>{tx("Choose System, Workspace, Project, or Folder scope only after checking affected targets and write boundaries.", "先检查受影响目标和写入边界，再选择系统、工作区、项目或文件夹范围。")}</p>
                        </div>
                        <div className="skill-detail-actions">
                          <button type="button" onClick={() => showSkillTuning(selectedLibrarySkillRow.skill)}>{tx("Explain Scope", "说明范围")}</button>
                          <button type="button" className="primary" onClick={() => sendSkillToApply(selectedLibrarySkillRow.skill)}>{tx("Open Apply Center", "打开应用中心")}</button>
                        </div>
                      </>
                    ) : null}
                    {selectedLibraryStage === "packaging" ? (
                      <>
                        <div>
                          <span className="os-module-kicker">{tx("Packaging", "打包")}</span>
                          <h4>{tx("Create reusable local assets safely", "安全创建本地复用资产")}</h4>
                          <p>{tx("Bundle export previews manifests and dependencies first. It does not mutate the original Skill folder.", "Bundle 导出会先预览清单与依赖，不会修改原始 Skill 目录。")}</p>
                        </div>
                        <div className="skill-detail-actions">
                          <button type="button" onClick={() => showSkillPackaging(selectedLibrarySkillRow.skill)}>{tx("Explain Package", "说明打包")}</button>
                          <button type="button" className="primary" onClick={() => sendSkillToBundle(selectedLibrarySkillRow.skill)}>{tx("Open Bundle Center", "打开打包中心")}</button>
                        </div>
                      </>
                    ) : null}
                  </div>
                  {isBuilderMode ? (
                    <>
                      <article className="skill-governance-panel">
                        <div className="section-headline compact">
                          <div>
                            <span className="os-module-kicker">{tx("Governance Profile", "治理画像")}</span>
                            <h4>{tx("What this Skill stores and where it should be used", "这个 Skill 会存什么，以及更适合用在哪里")}</h4>
                          </div>
                        </div>
                        <div className="skill-governance-grid">
                          <div className="skill-governance-card">
                            <span>{tx("Structure", "结构")}</span>
                            <strong>{selectedLibrarySkillRow.structureLabel}</strong>
                            <small>
                              {selectedLibrarySkillRow.skill.governance.structureType === "composite_framework"
                                ? tx(
                                    "This item coordinates multiple workflow modules instead of acting like a single isolated Skill.",
                                    "这个条目会协调多个工作流模块，而不是一个孤立的单点技能。"
                                  )
                                : tx(
                                    "This item behaves like one direct local Skill with a narrower execution surface.",
                                    "这个条目更像一个直接执行的本地技能，执行面更窄。"
                                  )}
                            </small>
                          </div>
                          <div className="skill-governance-card">
                            <span>{tx("Framework", "框架")}</span>
                            <strong>{selectedLibrarySkillRow.frameworkLabel ?? tx("Direct local Skill", "直接本地技能")}</strong>
                            <small>
                              {selectedLibrarySkillRow.moduleCountLabel
                                ? tx(
                                    `Visible operating footprint: ${selectedLibrarySkillRow.moduleCountLabel}.`,
                                    `可见运行足迹：${selectedLibrarySkillRow.moduleCountLabel}。`
                                  )
                                : tx(
                                    "No broader framework wrapper is required for this Skill.",
                                    "这个 Skill 不依赖更大的框架外壳。"
                                  )}
                            </small>
                          </div>
                          <div className="skill-governance-card">
                            <span>{tx("Role", "角色")}</span>
                            <strong>{selectedLibrarySkillRow.roleLabel}</strong>
                            <small>{selectedLibrarySkillRow.purposeSummary}</small>
                          </div>
                          <div className="skill-governance-card">
                            <span>{tx("Preferred Harness", "优先框架")}</span>
                            <strong>{selectedLibrarySkillRow.preferredHarnessLabel}</strong>
                            <small>
                              {selectedLibrarySkillRow.skill.governance.preferredHarness === "superpowers"
                                ? tx("Development-first flow should align with Superpowers before broader reuse.", "开发优先流应先对齐 Superpowers，再考虑更广泛复用。")
                                : tx("This Skill currently follows the generic local harness path.", "这个 Skill 当前走通用本地框架路径。")}
                            </small>
                          </div>
                          <div className="skill-governance-card">
                            <span>{tx("Stores", "存储内容")}</span>
                            <strong>{selectedLibrarySkillRow.governanceDataSummary}</strong>
                            <small>{selectedLibrarySkillRow.governanceBoundary}</small>
                          </div>
                          <div className="skill-governance-card">
                            <span>{tx("Storage", "存储策略")}</span>
                            <strong>{selectedLibrarySkillRow.governanceStorageLabel}</strong>
                            <small>{selectedLibrarySkillRow.governanceSignal}</small>
                          </div>
                          <div className="skill-governance-card">
                            <span>{tx("Bundle Reuse", "打包复用")}</span>
                            <strong>{selectedLibrarySkillRow.governanceReuseLabel}</strong>
                            <small>
                              {selectedLibrarySkillRow.skill.governance.containsSensitiveOperationalData
                                ? tx("Review local account, path, or runtime data before reuse.", "复用前先检查本地账号、路径或运行信息。")
                                : tx("This Skill is safer to reuse after local review.", "本地审查后更适合复用。")}
                            </small>
                          </div>
                          <div className="skill-governance-card">
                            <span>{tx("Recommended Scope", "推荐范围")}</span>
                            <strong>{selectedLibrarySkillRow.governanceScopeLabel}</strong>
                            <small>
                              {selectedLibrarySkillRow.skill.governance.recommendedScope === "folder"
                                ? tx("Best for highly personal or narrow context.", "更适合高度个人化或上下文很窄的场景。")
                                : selectedLibrarySkillRow.skill.governance.recommendedScope === "project"
                                  ? tx("Best when the Skill follows one repository or delivery unit.", "更适合围绕单个仓库或交付单元使用。")
                                  : tx("Best when multiple local projects share the same boundary.", "更适合多个本地项目共享同一边界时使用。")}
                            </small>
                          </div>
                          <div className="skill-governance-card">
                            <span>{tx("Orchestration", "编排")}</span>
                            <strong>{selectedLibrarySkillRow.orchestrationSummary}</strong>
                            <small>
                              {selectedLibrarySkillRow.skill.governance.structureType === "composite_framework"
                                ? tx(
                                    "This shows which local workflow layers the framework coordinates together.",
                                    "这里显示这个框架会把哪些本地工作流层协调在一起。"
                                  )
                                : selectedLibrarySkillRow.healthReason}
                            </small>
                          </div>
                        </div>
                      </article>
                      <article className="skill-harness-panel">
                        <div className="section-headline compact">
                          <div>
                            <span className="os-module-kicker">{tx("Harness Compatibility", "框架兼容矩阵")}</span>
                            <h4>{tx("Where this Skill fits best", "这个 Skill 最适合落在哪里")}</h4>
                          </div>
                        </div>
                        <div className="skill-harness-grid">
                          {selectedSkillHarnessCompatibility.map((entry) => (
                            <div className={`skill-harness-card tone-${entry.tone}`} key={entry.harness}>
                              <div className="skill-harness-head">
                                <strong>{entry.harness}</strong>
                                <span>{entry.status}</span>
                              </div>
                              <small>{entry.note}</small>
                            </div>
                          ))}
                        </div>
                      </article>
                    </>
                  ) : (
                    <article className="skill-guided-summary">
                      <div className="section-headline compact">
                        <div>
                          <span className="os-module-kicker">{tx("Guided Details", "引导式详情")}</span>
                          <h4>{tx("Open Builder Mode for governance and harness details", "打开构建模式查看治理和框架详情")}</h4>
                        </div>
                      </div>
                      <div className="skill-governance-grid">
                        <div className="skill-guided-card">
                          <span>{tx("Stores", "存储内容")}</span>
                          <strong>{selectedLibrarySkillRow.governanceDataSummary}</strong>
                          <small>{selectedLibrarySkillRow.governanceBoundary}</small>
                        </div>
                        <div className="skill-guided-card">
                          <span>{tx("Recommended Scope", "推荐范围")}</span>
                          <strong>{selectedLibrarySkillRow.governanceScopeLabel}</strong>
                          <small>{selectedLibrarySkillRow.governanceSignal}</small>
                        </div>
                        <div className="skill-guided-card">
                          <span>{tx("Next Step", "下一步")}</span>
                          <strong>{tx("Analyze or tune when needed", "需要时再分析或调校")}</strong>
                          <small>{tx("Keep the first pass simple, then open Builder Mode for deeper governance and harness data.", "先保持首轮简单，需要更深治理和框架信息时再打开构建模式。")}</small>
                        </div>
                      </div>
                      <div className="skill-detail-actions">
                        <button type="button" className="primary" onClick={() => setProductMode("builder")}>
                          {tx("Open Builder Mode", "打开构建模式")}
                        </button>
                      </div>
                    </article>
                  )}
                </>
              ) : null}
            </article>
          </section>
        </div>
        {skillActionNotice ? (
          <article className="skill-action-feedback">
            <div>
              <span className="os-module-kicker">{tx("Skill Action Feedback", "Skill 操作反馈")}</span>
              <h3>{skillActionNotice.skillName}</h3>
              <p>{skillActionNotice.summary}</p>
            </div>
            <div className="skill-action-feedback-grid">
              <div>
                <span>{tx("Action", "动作")}</span>
                <strong>{skillActionNotice.action}</strong>
              </div>
              <div>
                <span>{tx("Boundary", "边界")}</span>
                <strong>{tx("Preview first", "先预览")}</strong>
              </div>
              <div>
                <span>{tx("Detail", "详情")}</span>
                <strong>{skillActionNotice.detail}</strong>
              </div>
            </div>
          </article>
        ) : null}
        {selectedLibraryStage === "analysis" ? (
        <div className="skill-intelligence-panel">
          <div className="skill-intelligence-head">
            <div>
              <span className="os-module-kicker">{tx("AI-Powered Skill Analysis", "AI 驱动 Skill 分析")}</span>
              <h3>{primaryLibrarySkill?.displayName ?? tx("Analyze the first indexed Skill", "分析第一个已索引 Skill")}</h3>
              <p>
                {skillAnalysis
                  ? tx(
                      `Generated locally at ${formatDateTime(skillAnalysis.generatedAt)} from skill index, telemetry, proposals, bundles, and graph evidence.`,
                      `已在本地于 ${formatDateTime(skillAnalysis.generatedAt)} 基于技能索引、遥测、建议、Bundle 与图谱证据生成。`
                    )
                  : tx(
                      "Generate a local evidence snapshot for summary, dependencies, execution flow, risks, optimization ideas, alternatives, and related Skills.",
                      "生成本地证据快照，用于摘要、依赖、执行流、风险、优化建议、替代与相关 Skill。"
                    )}
              </p>
              {skillAnalysisError ? <p className="error-text">{skillAnalysisError}</p> : null}
            </div>
            <button
              type="button"
              className="primary"
              disabled={!primaryLibrarySkill || busyAction === "skill-analysis"}
              onClick={() => void generateSkillAnalysis()}
            >
              {busyAction === "skill-analysis"
                ? tx("Generating...", "生成中...")
                : skillAnalysisStatus === "ready"
                  ? tx("Regenerate Analysis", "重新生成分析")
                  : tx("Generate Analysis", "生成分析")}
            </button>
          </div>
          {skillAnalysis ? (
            <div className="skill-intelligence-evidence-row">
              {[
                {
                  label: tx("Health", "健康"),
                  value: `${skillAnalysis.evidence.healthScore}/100`,
                  detail: skillAnalysis.evidence.healthStatus
                },
                {
                  label: tx("Runs 7d", "7 日运行"),
                  value: formatCount(skillAnalysis.evidence.runs7d),
                  detail:
                    skillAnalysis.evidence.failureRate7d === null
                      ? tx("no failure signal", "暂无失败信号")
                      : `${formatPercent(skillAnalysis.evidence.failureRate7d)} ${tx("failure", "失败")}`
                },
                {
                  label: tx("Latency", "延迟"),
                  value: formatDuration(skillAnalysis.evidence.avgDurationMs7d),
                  detail: tx("local telemetry", "本地遥测")
                },
                {
                  label: tx("Context", "上下文"),
                  value: `${formatCount(skillAnalysis.evidence.openProposalCount)} / ${formatCount(skillAnalysis.evidence.bundleCount)} / ${formatCount(skillAnalysis.evidence.relatedSkillCount)}`,
                  detail: tx("proposal / bundle / related", "建议 / Bundle / 相关")
                }
              ].map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </div>
              ))}
            </div>
          ) : null}
          <div className="skill-intelligence-grid">
            {[
              {
                title: tx("Skill Summary", "Skill 摘要"),
                copy:
                  skillAnalysis?.summary ??
                  primaryLibrarySkill?.description ??
                  tx("Summarize what this Skill does and when to use it.", "总结此 Skill 的作用和适用场景。"),
                items: null,
                tone: "skill"
              },
              {
                title: tx("Dependencies", "依赖"),
                copy:
                  tx("Identify referenced tools, MCP servers, files, models, and runtime assumptions.", "识别引用的工具、MCP 服务、文件、模型和运行假设。"),
                items: skillAnalysis?.dependencies ?? null,
                tone: "mcp"
              },
              {
                title: tx("Execution Flow", "执行流"),
                copy:
                  tx("Explain trigger, required context, expected actions, and output contract.", "解释触发条件、所需上下文、预期动作和输出契约。"),
                items: skillAnalysis?.executionFlow ?? null,
                tone: "workflow"
              },
              {
                title: tx("Potential Risks", "潜在风险"),
                copy:
                  tx("Surface stale paths, broad permissions, hidden cost, and unsafe write behavior.", "暴露过期路径、过宽权限、隐藏成本和不安全写入行为。"),
                items: skillAnalysis?.risks ?? null,
                tone: "proposal"
              },
              {
                title: tx("Optimization Suggestions", "优化建议"),
                copy:
                  tx("Propose token, latency, reliability, and reuse improvements with evidence.", "基于证据提出 token、延迟、可靠性和复用优化。"),
                items: skillAnalysis?.optimizationSuggestions ?? null,
                tone: "agent"
              },
              {
                title: tx("Alternatives & Related", "替代与相关"),
                copy:
                  tx("Find duplicated, similar, newer, or complementary Skills in the local graph.", "在本地图谱中找出重复、相似、更新或互补的 Skill。"),
                items: skillAnalysis?.alternativesAndRelated ?? null,
                tone: "marketplace"
              }
            ].map((item) => (
              <article className={`skill-intelligence-card entity-${item.tone}`} key={item.title}>
                <strong>{item.title}</strong>
                {item.items && item.items.length > 0 ? (
                  <ul>
                    {item.items.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{item.copy}</p>
                )}
              </article>
            ))}
          </div>
        </div>
        ) : null}
      </section>

      <section className="panel os-module-panel evaluate-module-panel" data-product-section="evaluate" id="evaluate">
        <div className="section-headline">
          <div>
            <h2>{tx("Evaluation Reports", "评测报告")}</h2>
            <p className="section-copy">
              <LocalizedCopy
                mode={languageMode}
                en="Reports are organized by project, Skill, heartbeat monitoring, and workflow effect."
                zh="报告按项目、技能、心跳监控和工作流效果组织。"
              />
            </p>
          </div>
          <div className="toolbar wrap">
            <button type="button" onClick={() => navigateToProductSection("#local-skills")}>
              {tx("Choose Skill", "选择技能")}
            </button>
            <button
              type="button"
              className="primary"
              disabled={!evaluationTargetRow || busyAction === "skill-analysis"}
              onClick={() => void generateSkillAnalysis(evaluationTargetRow?.skill.id)}
            >
              {busyAction === "skill-analysis" ? tx("Generating...", "生成中...") : tx("Generate Report", "生成报告")}
            </button>
          </div>
        </div>
        <div className="evaluation-report-grid">
          <article className="evaluation-report-card entity-project">
            <span className="os-module-kicker">{tx("Project Report", "项目报告")}</span>
            <strong>{focusedProjectDisplayName || tx("No project", "未绑定项目")}</strong>
            <small>{formatCount(currentProjectSkillCount)} {tx("Skills indexed in the selected project.", "个技能已索引到已选择项目。")}</small>
          </article>
          <article className="evaluation-report-card entity-skill">
            <span className="os-module-kicker">{tx("Skill Report", "技能报告")}</span>
            <strong>{evaluationTargetRow?.skill.displayName ?? tx("No Skill selected", "未选择技能")}</strong>
            <small>{tx("Quality score, trigger fit, cost, and safety live here.", "质量评分、触发适配、成本和安全边界在这里查看。")}</small>
          </article>
          <article className="evaluation-report-card entity-agent">
            <span className="os-module-kicker">{tx("Heartbeat", "心跳监控")}</span>
            <strong>{formatPercent(dailySuccessRate)}</strong>
            <small>{formatCount(dailySummary?.totalRuns ?? 0)} {tx("runs today or latest import.", "次运行，来自今日或最近导入。")}</small>
          </article>
          <article className="evaluation-report-card entity-development">
            <span className="os-module-kicker">{tx("Workflow Effect", "工作流效果")}</span>
            <strong>{workflowStarterResult ? tx("Workflow ready", "工作流就绪") : tx("Baseline", "基线")}</strong>
            <small>{tx("Track process counts, usage, and evaluation effect by project.", "按项目追踪流程次数、使用情况和评测效果。")}</small>
          </article>
        </div>
        <div className="evaluation-monitor-grid">
          <article className="evaluation-monitor-panel entity-project">
            <div className="skill-asset-catalog-head">
              <div>
                <span className="os-module-kicker">{tx("Project Monitoring", "项目监控")}</span>
                <h3>{tx("Project / Workflow / Heartbeat", "项目 / 工作流 / 心跳")}</h3>
              </div>
              <span className="mini-pill">{formatCount(managedProjects.length)} {tx("projects", "项目")}</span>
            </div>
            <div className="skill-asset-table-shell">
              <table className="skill-asset-data-table">
                <thead>
                  <tr>
                    <th>{tx("Project", "项目")}</th>
                    <th>{tx("Skills", "技能")}</th>
                    <th>{tx("Calls", "调用")}</th>
                    <th>{tx("Score", "评分")}</th>
                    <th>{tx("Workflow", "工作流")}</th>
                  </tr>
                </thead>
                <tbody>
                  {managedProjects.map((project) => {
                    const projectSkills = (boot?.skills ?? []).filter((skill) => isPathInsideProject(skill.sourcePath, project.path));
                    const projectSkillIdSet = new Set(projectSkills.map((skill) => skill.id));
                    const projectRuns = recentRuns.filter((run) => projectSkillIdSet.has(run.skillId));
                    const completedRuns = projectRuns.filter((run) => run.status === "completed").length;
                    const score = projectRuns.length > 0 ? `${Math.round((completedRuns / projectRuns.length) * 100)}%` : "n/a";
                    return (
                      <tr key={project.id} onClick={() => inspectManagedProject(project)}>
                        <td>
                          <strong>{project.name}</strong>
                          <span>{project.path}</span>
                        </td>
                        <td>{formatCount(project.skillsFound ?? projectSkills.length)}</td>
                        <td>{formatCount(projectRuns.length)}</td>
                        <td>{score}</td>
                        <td>{project.workflowApplied ? tx("Ready", "就绪") : tx("Baseline", "基线")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {managedProjects.length === 0 ? (
                <p className="skill-asset-empty">{tx("Bind and scan a project to create monitoring rows.", "绑定并扫描项目后会生成监控行。")}</p>
              ) : null}
            </div>
          </article>
          <article className="evaluation-monitor-panel entity-skill">
            <div className="skill-asset-catalog-head">
              <div>
                <span className="os-module-kicker">{tx("Skill Monitoring", "技能监控")}</span>
                <h3>{tx("Calls and score from Skill Library", "来自技能库的调用与评分")}</h3>
              </div>
              <span className="mini-pill">{formatCount(librarySkillRows.length)} {tx("skills", "技能")}</span>
            </div>
            <div className="skill-asset-table-shell">
              <table className="skill-asset-data-table">
                <thead>
                  <tr>
                    <th>{tx("Skill", "技能")}</th>
                    <th>{tx("Type", "类型")}</th>
                    <th>{tx("Calls", "调用")}</th>
                    <th>{tx("Score", "评分")}</th>
                    <th>{tx("Status", "状态")}</th>
                  </tr>
                </thead>
                <tbody>
                  {librarySkillRows.slice(0, 8).map((row) => (
                    <tr key={row.skill.id} onClick={() => selectLibrarySkill(row.skill.id)}>
                      <td>
                        <strong>{row.skill.displayName}</strong>
                        <span>{row.skill.sourcePath}</span>
                      </td>
                      <td>{row.roleLabel}</td>
                      <td>{formatCount(row.skill.runtime.totalRuns)}</td>
                      <td>{row.skill.health.score}</td>
                      <td>{row.healthLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        {evaluationTargetRow ? (
          <>
            <div className="evaluate-hero-band">
              <article className="evaluate-target-card entity-skill">
                <span className="os-module-kicker">{tx("Evaluation Target", "评测对象")}</span>
                <h3>{evaluationTargetRow.skill.displayName}</h3>
                <p>{evaluationTargetRow.purposeSummary}</p>
                <div className="settings-pill-row">
                  <span className={`skill-governance-pill tone-${getSkillGovernanceTone(evaluationTargetRow.skill.governance.role)}`}>
                    {evaluationTargetRow.roleLabel}
                  </span>
                  <span className="skill-governance-pill">{evaluationTargetRow.preferredHarnessLabel}</span>
                  <span className="skill-governance-pill">{evaluationTargetRow.governanceScopeLabel}</span>
                </div>
              </article>
              <article className="evaluate-score-card entity-project">
                <span className="os-module-kicker">{tx("Baseline Score", "基线评分")}</span>
                <strong>{evaluationOverallScore}</strong>
                <small>
                  {tx(
                    "Static + runtime evidence baseline. Full use-case execution comes next.",
                    "静态 + 运行证据基线。完整用例执行将在下一步接入。"
                  )}
                </small>
              </article>
            </div>

            <div className="evaluate-score-grid">
              {[
                {
                  label: tx("Routing Accuracy", "命中准确性"),
                  value: evaluationRoutingScore,
                  detail: tx("Trigger clarity and observed run evidence.", "触发清晰度与已观测运行证据。")
                },
                {
                  label: tx("Cost Efficiency", "成本效率"),
                  value: evaluationCostScore,
                  detail: tx("Token pressure estimated from imported runtime data.", "根据已导入运行数据估算 Token 压力。")
                },
                {
                  label: tx("Developer Fit", "开发适配度"),
                  value: evaluationDeveloperFitScore,
                  detail: tx("Development role, harness fit, and generated analysis readiness.", "开发角色、框架适配与分析就绪度。")
                },
                {
                  label: tx("Safety", "安全边界"),
                  value: evaluationSafetyScore,
                  detail: tx("Sensitive data, scope risk, and open proposal pressure.", "敏感数据、范围风险与待处理建议压力。")
                }
              ].map((item) => (
                <article className="evaluate-score-dimension" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>

            <div className="evaluate-usecase-grid">
              <article className="evaluate-usecase-card">
                <span className="os-module-kicker">{tx("Use Case 01", "用例 01")}</span>
                <h3>{tx("Should trigger", "应该命中")}</h3>
                <p>
                  {tx(
                    `Ask the assistant to perform a task matching ${evaluationTargetRow.roleLabel} and verify this Skill is selected with the narrowest useful context.`,
                    `让助手执行匹配 ${evaluationTargetRow.roleLabel} 的任务，并验证此 Skill 是否以最小有效上下文被选中。`
                  )}
                </p>
              </article>
              <article className="evaluate-usecase-card">
                <span className="os-module-kicker">{tx("Use Case 02", "用例 02")}</span>
                <h3>{tx("Should not trigger", "不应误触发")}</h3>
                <p>{tx("Run a nearby but different task and check whether the Skill stays out of the context path.", "运行一个相近但不同的任务，检查此 Skill 是否不会进入上下文链路。")}</p>
              </article>
              <article className="evaluate-usecase-card">
                <span className="os-module-kicker">{tx("Use Case 03", "用例 03")}</span>
                <h3>{tx("Runtime value", "运行价值")}</h3>
                <p>{tx("Compare token use, tool calls, failure rate, and repair loops before and after this Skill is active.", "比较此 Skill 生效前后的 Token、工具调用、失败率和反复修复次数。")}</p>
              </article>
            </div>

            <div className="evaluate-harness-row">
              <article>
                <span className="os-module-kicker">Codex</span>
                <strong>
                  {evaluationTargetRow.skill.governance.preferredHarness === "superpowers"
                    ? tx("Development-depth fit", "适合深度开发")
                    : tx("General workflow fit", "适合通用工作流")}
                </strong>
                <p>{tx("Evaluate with Codex sessions, tool calls, file edits, tests, and commit outcomes.", "通过 Codex 会话、工具调用、文件编辑、测试和提交结果评测。")}</p>
              </article>
              <article>
                <span className="os-module-kicker">Claude Code</span>
                <strong>{tx("Project-log fit", "项目日志适配")}</strong>
                <p>{tx("Evaluate with Claude project JSONL sessions, tool use, cwd, and generated changes.", "通过 Claude 项目 JSONL 会话、工具使用、cwd 和生成变更评测。")}</p>
              </article>
            </div>

            {skillAnalysis && skillAnalysis.skillId === evaluationTargetRow.skill.id ? (
              <div className="evaluate-analysis-summary">
                <strong>{tx("Latest Analysis", "最近分析")}</strong>
                <p>{skillAnalysis.summary}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="empty-inline">
            {tx("Discover and index at least one Skill before evaluation.", "请先发现并索引至少一个 Skill，再开始评测。")}
          </div>
        )}
      </section>

      <section className="panel os-module-panel" data-product-section="remote-market" id="remote-market">
        <div className="section-headline">
          <div>
            <h2>{tx("Remote Market", "远程市场")}</h2>
            <p className="section-copy">
              <LocalizedCopy
                mode={languageMode}
                en="Remote Skills are inactive until explicitly activated."
                zh="远程 Skill 在显式激活前保持非活跃。"
              />
            </p>
          </div>
        </div>
        <div className="marketplace-entry-strip">
          <article className="marketplace-entry-card entity-marketplace marketplace-entry-flow">
            <div>
              <span className="os-module-kicker">{tx("How it works", "使用方式")}</span>
              <strong>{tx("Preview -> Security -> Import -> Activate", "预览 -> 安全 -> 导入 -> 激活")}</strong>
            </div>
            <div>
              <span className="os-module-kicker">{tx("Current candidate", "当前候选")}</span>
              <strong>{selectedMarketplaceSkill ? selectedMarketplaceSkill.name : tx("No candidate selected", "尚未选择候选")}</strong>
            </div>
            <small>
              {selectedMarketplaceSkill
                ? tx(
                    `${selectedMarketplaceActionLabel} stage is active for the selected remote Skill.`,
                    `当前已在所选远程 Skill 的 ${selectedMarketplaceActionLabel} 阶段。`
                  )
                : tx("Select a remote Skill below to open the decision workspace.", "从下方列表选择一个远程 Skill，打开决策工作台。")}
            </small>
          </article>
        </div>
        <div className="marketplace-progressive-flow">
          <aside className="marketplace-discovery-rail">
            <div className="marketplace-collection-rail" aria-label={tx("Marketplace collections", "市场集合")}>
              {visibleMarketplaceCollections.map((collection) => (
                <article className={`marketplace-collection-card entity-${collection.tone}`} key={collection.key}>
                  <span>{tx(collection.label, collection.labelZh)}</span>
                  <strong>{formatCount(collection.count)}</strong>
                </article>
              ))}
            </div>
            <div className="marketplace-list-intro">
              <strong>{tx("Pick one remote Skill", "先选一个远程 Skill")}</strong>
              <small>{tx("Then review, import, and activate on the right.", "然后在右侧审查、导入、激活。")}</small>
            </div>
            <div className="marketplace-search-console">
              <label className="control">
                <span>{tx("Search Marketplace", "搜索市场")}</span>
                <input
                  type="search"
                  placeholder={tx("Search Skills, tags, authors, risk...", "搜索 Skill、标签、作者、风险...")}
                  value={marketplaceQuery}
                  onChange={(event) => setMarketplaceQuery(event.currentTarget.value)}
                />
              </label>
              <div className="marketplace-search-status">
                <span className="mini-pill mini-pill-strong">
                  {formatCount(visibleMarketplaceSkills.length)} {tx("local results", "本地结果")}
                </span>
                <span className="mini-pill">
                  {tx("Source", "来源")}: {marketplaceCatalog?.sourceMode ?? "bundled_local_catalog"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMarketplaceQuery("");
                    showInteractionNotice({
                      area: tx("Marketplace", "市场"),
                      action: tx("Clear Query", "清空查询"),
                      result: tx("Marketplace search returned to the bundled local catalog.", "市场搜索已回到内置本地目录。"),
                      nextStep: tx("Select a candidate to preview, analyze, import, or install manually.", "选择候选项后，可手动预览、分析、导入或安装。"),
                      tone: "info"
                    });
                  }}
                >
                  {tx("Clear Query", "清空查询")}
                </button>
              </div>
            </div>
            <div className="remote-candidate-inventory" aria-label={tx("Imported remote candidates", "已导入远程候选")}>
              <div className="remote-candidate-inventory-head">
                <div>
                  <span className="os-module-kicker">{tx("Imported Candidates", "已导入候选")}</span>
                  <strong>{formatCount(remoteCandidates.length)} {tx("inactive", "未激活")}</strong>
                </div>
                <small>{tx("Stored locally; activation still needs preview.", "本地保存；激活仍需预览。")}</small>
              </div>
              {remoteCandidates.length > 0 ? (
                <div className="remote-candidate-list">
                  {remoteCandidates.slice(0, 4).map((candidate) => (
                    <button
                      type="button"
                      className={`remote-candidate-item${selectedRemoteCandidate?.candidateId === candidate.candidateId ? " selected" : ""}`}
                      key={candidate.candidateId}
                      onClick={() => void openRemoteCandidate(candidate)}
                    >
                      <span>
                        <strong>{candidate.displayName}</strong>
                        <small>{candidate.catalogSkillId ?? candidate.sourceType}</small>
                      </span>
                      <span>
                        <small>
                          {candidate.status === "activation_previewed"
                            ? tx("previewed", "已预览")
                            : tx("inactive", "未激活")}
                        </small>
                        <small>{formatDateTime(candidate.importedAt)}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  {tx(
                    "Imported remote Skills appear here as inactive candidates before activation.",
                    "导入的远程 Skill 会先以未激活候选显示在这里。"
                  )}
                </p>
              )}
              {selectedRemoteCandidate ? (
                <div className="remote-candidate-review" aria-label={tx("Remote candidate review", "远程候选复核")}>
                  <div className="remote-candidate-review-head">
                    <div>
                      <span className="os-module-kicker">{tx("Candidate Review", "候选复核")}</span>
                      <strong>{selectedRemoteCandidate.displayName}</strong>
                      <small>{selectedRemoteCandidate.candidateId}</small>
                    </div>
                    <span className="remote-candidate-status-pill">
                      {selectedRemoteCandidate.status === "activation_previewed"
                        ? tx("previewed", "已预览")
                        : tx("inactive", "未激活")}
                    </span>
                  </div>
                  <div className="remote-candidate-review-grid">
                    <div>
                      <span>{tx("Source", "来源")}</span>
                      <strong>{selectedRemoteCandidate.sourceType}</strong>
                      <small>{selectedRemoteCandidate.normalizedUrl}</small>
                    </div>
                    <div>
                      <span>{tx("Risk", "风险")}</span>
                      <strong>{formatRemoteRiskLevel(selectedRemoteCandidate.riskLevel, languageMode)}</strong>
                      <small>{tx("Review before activation", "激活前复核")}</small>
                    </div>
                    <div>
                      <span>{tx("Verification", "验证")}</span>
                      <strong>
                        {formatRemoteVerificationStatus(
                          selectedRemoteCandidate.verificationStatus,
                          languageMode
                        )}
                      </strong>
                      <small>{tx("Bundled/local signal only", "仅为内置/本地信号")}</small>
                    </div>
                    <div>
                      <span>{tx("Boundary", "边界")}</span>
                      <strong>{selectedRemoteCandidate.willRunNow ? tx("Runs now", "立即运行") : tx("Will not run", "不会运行")}</strong>
                      <small>{tx("Stored locally; no project write yet.", "本地保存；尚未写入项目。")}</small>
                    </div>
                  </div>
                  <div className="remote-candidate-detail-panel">
                    <div className="remote-candidate-detail-head">
                      <div>
                        <span className="os-module-kicker">{tx("Local Detail", "本地详情")}</span>
                        <strong>{tx("Checks, manifest, dependencies, diff gate", "检查、清单、依赖、差异闸门")}</strong>
                      </div>
                      <small>
                        {selectedRemoteCandidateDetail
                          ? tx("Read-only local metadata", "只读本地元数据")
                          : remoteCandidateDetailError ?? tx("Loading local detail...", "正在加载本地详情...")}
                      </small>
                    </div>
                    {selectedRemoteCandidateDetail ? (
                      <>
                        <div className="remote-candidate-check-list">
                          {selectedRemoteCandidateDetail.checks.slice(0, 4).map((check) => (
                            <div className={`remote-candidate-check status-${check.status}`} key={check.label}>
                              <span>{formatRemoteCheckStatus(check.status, languageMode)}</span>
                              <strong>{check.label}</strong>
                              <small>{check.summary}</small>
                            </div>
                          ))}
                        </div>
                        <div className="remote-candidate-gate-grid">
                          <div>
                            <span>{tx("Manifest", "清单")}</span>
                            <strong>
                              {formatRemoteCheckStatus(
                                selectedRemoteCandidateDetail.manifestPreview.status,
                                languageMode
                              )}
                            </strong>
                            <small>{selectedRemoteCandidateDetail.manifestPreview.summary}</small>
                          </div>
                          <div>
                            <span>{tx("Dependencies", "依赖")}</span>
                            <strong>
                              {selectedRemoteCandidateDetail.dependencyPreview.dependencyCount ?? tx("Unknown", "未知")}
                            </strong>
                            <small>
                              {selectedRemoteCandidateDetail.dependencyPreview.tags.length > 0
                                ? selectedRemoteCandidateDetail.dependencyPreview.tags.slice(0, 4).join(" · ")
                                : selectedRemoteCandidateDetail.dependencyPreview.summary}
                            </small>
                          </div>
                          <div>
                            <span>{tx("Diff", "差异")}</span>
                            <strong>{tx("Preview required", "需要预览")}</strong>
                            <small>{selectedRemoteCandidateDetail.diffPreview.summary}</small>
                          </div>
                          <div>
                            <span>{tx("Trust", "信任")}</span>
                            <strong>
                              {selectedRemoteCandidateDetail.catalogSignals.trustScore ??
                                formatRemoteVerificationStatus(
                                  selectedRemoteCandidate.verificationStatus,
                                  languageMode
                                )}
                            </strong>
                            <small>
                              {selectedRemoteCandidateDetail.catalogSignals.author ??
                                tx("No catalog author metadata", "暂无目录作者元数据")}
                            </small>
                          </div>
                        </div>
                        <div className="remote-candidate-boundaries">
                          {selectedRemoteCandidateDetail.safetyBoundaries.slice(0, 3).map((boundary) => (
                            <span key={boundary}>{boundary}</span>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="remote-candidate-review-actions">
                    <button type="button" className="primary" onClick={() => void openRemoteCandidate(selectedRemoteCandidate)}>
                      {tx("Preview Activation", "预览激活")}
                    </button>
                    <button type="button" onClick={() => openRemoteCandidateApplyHandoff(selectedRemoteCandidate)}>
                      {tx("Open Apply Center", "打开应用中心")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="os-market-grid marketplace-candidate-list">
              {visibleMarketplaceSkills.map((entry) => (
                <article
                  className={`os-market-card${selectedMarketplaceSkill?.id === entry.id ? " selected" : ""}`}
                  key={entry.id}
                >
                  <div className="market-card-head">
                    <span className="os-module-kicker">{entry.source}</span>
                    <span className="remote-safety-pill">{tx(entry.statusLabel, entry.statusLabelZh)}</span>
                  </div>
                  <h3>{entry.name}</h3>
                  <p>{tx(entry.description, entry.descriptionZh)}</p>
                  <div className="market-card-meta">
                    <span>{tx("Author", "作者")}: {entry.author}</span>
                    <span>{tx("Downloads", "下载")}: {entry.downloadsLabel}</span>
                    <span>{tx("Rating", "评分")}: {entry.ratingLabel}</span>
                  </div>
                  <div className="market-score-grid">
                    <div>
                      <span>{tx("Health", "健康度")}</span>
                      <strong>{entry.healthScore}</strong>
                    </div>
                    <div>
                      <span>{tx("Trust", "信任")}</span>
                      <strong>{entry.trustScore}</strong>
                    </div>
                    <div>
                      <span>{tx("Risk", "风险")}</span>
                      <strong>{tx(entry.riskLabel, entry.riskLabelZh)}</strong>
                    </div>
                    <div>
                      <span>{tx("Deps", "依赖")}</span>
                      <strong>{entry.dependencyCount}</strong>
                    </div>
                  </div>
                  <p className="market-updated">
                    {tx("Last updated", "最近更新")}: {tx(entry.updatedLabel, entry.updatedLabelZh)}
                  </p>
                  <div className="os-tag-row">
                    {entry.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="os-card-actions">
                    <button
                      className="primary"
                      type="button"
                      onClick={() => void handleMarketplaceAction(entry, "preview")}
                    >
                      {tx("Select / Preview", "选择 / 预览")}
                    </button>
                  </div>
                </article>
              ))}
              {visibleMarketplaceSkills.length === 0 ? (
                <div className="empty-state">
                  {tx("No marketplace Skill matches the local catalog query.", "本地市场目录中没有匹配的 Skill。")}
                </div>
              ) : null}
            </div>
          </aside>
          {selectedMarketplaceSkill ? (
            <article className="marketplace-candidate-preview">
              <div className="marketplace-candidate-head">
                <div>
                  <span className="os-module-kicker">{tx("Selected Remote Skill", "选中远程 Skill")}</span>
                  <h3>{selectedMarketplaceSkill.name}</h3>
                  <p>{tx(selectedMarketplaceSkill.description, selectedMarketplaceSkill.descriptionZh)}</p>
                </div>
                <div className="marketplace-candidate-score">
                  <span>{tx("Current Stage", "当前阶段")}</span>
                  <strong>{selectedMarketplaceActionLabel}</strong>
                </div>
              </div>
              <div className="marketplace-stage-tabs" aria-label={tx("Marketplace activation stages", "市场激活阶段")}>
                {[
                  { key: "preview", label: tx("Preview", "预览") },
                  { key: "analyze", label: tx("Security", "安全") },
                  { key: "import", label: tx("Import", "导入") },
                  { key: "install", label: tx("Activate", "激活") }
                ].map((stage) => (
                  <button
                    className={selectedMarketplaceAction === stage.key ? "active" : ""}
                    key={stage.key}
                    type="button"
                    onClick={() => void handleMarketplaceAction(selectedMarketplaceSkill, stage.key as typeof selectedMarketplaceAction)}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
              <div className={`marketplace-stage-panel stage-${selectedMarketplaceAction}`}>
                {selectedMarketplaceAction === "preview" ? (
                  <>
                    <div>
                      <span className="os-module-kicker">{tx("Activation Preview", "激活预览")}</span>
                      <h4>{tx("Installed does not mean active", "已安装不等于已激活")}</h4>
                      <p>
                        {tx(
                          "Remote Skills stay inert until you review risk, choose scope, preview the target, and activate manually.",
                          "远程 Skill 会保持静默，直到你审查风险、选择范围、预览目标并手动激活。"
                        )}
                      </p>
                    </div>
                    <div className="marketplace-preview-matrix">
                      <div>
                        <span>{tx("Source", "来源")}</span>
                        <strong>{selectedMarketplaceSkill.source}</strong>
                        <small>{selectedMarketplaceSkill.sourceUrl}</small>
                      </div>
                      <div>
                        <span>{tx("Boundary", "边界")}</span>
                        <strong>{tx("Inactive candidate", "非活跃候选")}</strong>
                        <small>{tx("No install, import, or run is executed from this preview.", "此预览不会执行安装、导入或运行。")}</small>
                      </div>
                    </div>
                    <div className="skill-detail-actions">
                      <button type="button" className="primary" onClick={() => void handleMarketplaceAction(selectedMarketplaceSkill, "analyze")}>
                        {tx("Run Security Review", "运行安全审查")}
                      </button>
                    </div>
                  </>
                ) : null}
                {selectedMarketplaceAction === "analyze" ? (
                  <>
                    <div>
                      <span className="os-module-kicker">{tx("Security Report", "安全报告")}</span>
                      <h4>{tx("Block before trust", "信任前先阻断")}</h4>
                      <p>{tx("Manifest drift, missing entrypoints, unknown authors, and unsafe scopes must surface before activation.", "清单漂移、缺失入口、未知作者和不安全范围必须在激活前暴露。")}</p>
                    </div>
                    <div className="marketplace-preview-matrix">
                      <div>
                        <span>{tx("Verification", "验证")}</span>
                        <strong>{tx(selectedMarketplaceSkill.statusLabel, selectedMarketplaceSkill.statusLabelZh)}</strong>
                        <small>
                          {formatRemoteVerificationStatus(
                            selectedMarketplaceSkill.verificationStatus,
                            languageMode
                          )}
                        </small>
                      </div>
                      <div>
                        <span>{tx("Trust / Risk", "信任 / 风险")}</span>
                        <strong>
                          {selectedMarketplaceSkill.trustScore} /{" "}
                          {tx(selectedMarketplaceSkill.riskLabel, selectedMarketplaceSkill.riskLabelZh)}
                        </strong>
                        <small>
                          {tx("Health", "健康度")} {selectedMarketplaceSkill.healthScore} · {tx("Deps", "依赖")}{" "}
                          {selectedMarketplaceSkill.dependencyCount}
                        </small>
                      </div>
                    </div>
                    <div className="skill-detail-actions">
                      <button type="button" className="primary" onClick={() => void handleMarketplaceAction(selectedMarketplaceSkill, "import")}>
                        {tx("Continue to Import", "继续导入")}
                      </button>
                    </div>
                  </>
                ) : null}
                {selectedMarketplaceAction === "import" ? (
                  <>
                    <div>
                      <span className="os-module-kicker">{tx("Import Gate", "导入闸门")}</span>
                      <h4>{tx("Copy only after validation", "校验后才复制")}</h4>
                      <p>{tx("Import creates an inactive app-local candidate. It still does not activate execution or write into projects.", "导入只会创建非活跃的应用本地候选，不会激活执行，也不会写入项目。")}</p>
                    </div>
                    <div className="settings-pill-row">
                      <span className="mini-pill mini-pill-strong">{tx("App-local copy", "应用本地副本")}</span>
                      <span className="mini-pill">{tx("No auto-run", "不自动运行")}</span>
                      <span className="mini-pill">{tx("No remote DB", "无远程数据库")}</span>
                    </div>
                    {marketplaceImportResult?.catalogSkillId === selectedMarketplaceSkill.id ? (
                      <div className="marketplace-import-result">
                        <div>
                          <span>{tx("Candidate", "候选")}</span>
                          <strong>{marketplaceImportResult.displayName}</strong>
                          <small>{marketplaceImportResult.candidateId}</small>
                        </div>
                        <div>
                          <span>{tx("Status", "状态")}</span>
                          <strong>{tx("Inactive remote candidate", "非活跃远程候选")}</strong>
                          <small>{formatDateTime(marketplaceImportResult.importedAt)}</small>
                        </div>
                        <div>
                          <span>{tx("Policy", "策略")}</span>
                          <strong>{tx("Manual until activated", "激活前仅手动")}</strong>
                          <small>{tx("Stored in local SQLite", "已写入本地 SQLite")}</small>
                        </div>
                      </div>
                    ) : null}
                    <div className="skill-detail-actions">
                      <button
                        type="button"
                        className="primary"
                        disabled={busyAction === "marketplace-import" || busyAction === "marketplace-activation-preview"}
                        onClick={() => void handleMarketplaceAction(selectedMarketplaceSkill, "install")}
                      >
                        {busyAction === "marketplace-activation-preview"
                          ? tx("Preparing Preview...", "正在准备预览...")
                          : tx("Choose Activation Scope", "选择激活范围")}
                      </button>
                    </div>
                  </>
                ) : null}
                {selectedMarketplaceAction === "install" ? (
                  <>
                    <div>
                      <span className="os-module-kicker">{tx("Activation Gate", "激活闸门")}</span>
                      <h4>{tx("Manual activation only", "仅手动激活")}</h4>
                      <p>{tx("Choose scope, preview target impact, then activate manually. This screen still stages the decision and performs no execution.", "选择范围、预览目标影响，然后手动激活。此界面仍只暂存决策，不执行运行。")}</p>
                    </div>
                    <div className="remote-gate-steps compact">
                      {[
                        tx("Preview", "预览"),
                        tx("Security", "安全"),
                        tx("Import", "导入"),
                        tx("Choose Scope", "选择范围"),
                        tx("Activate", "激活")
                      ].map((step, index) => (
                        <span key={step}>{String(index + 1).padStart(2, "0")} · {step}</span>
                      ))}
                    </div>
                    {marketplaceActivationPreview?.catalogSkillId === selectedMarketplaceSkill.id ? (
                      <div className="marketplace-activation-preview">
                        <div>
                          <span>{tx("Activation State", "激活状态")}</span>
                          <strong>
                            {marketplaceActivationPreview.canActivateAfterConfirmation
                              ? tx("Ready for manual confirmation", "可进入手动确认")
                              : tx("Blocked before confirmation", "确认前已阻断")}
                          </strong>
                          <small>{formatDateTime(marketplaceActivationPreview.previewedAt)}</small>
                        </div>
                        <div>
                          <span>{tx("Recommended Scope", "推荐范围")}</span>
                          <strong>{marketplaceActivationPreview.recommendedScope}</strong>
                          <small>{tx("Target preview still required", "仍需目标预览")}</small>
                        </div>
                        <div>
                          <span>{tx("Run Now", "立即运行")}</span>
                          <strong>{marketplaceActivationPreview.willRunNow ? tx("Yes", "是") : tx("No", "否")}</strong>
                          <small>{marketplaceActivationPreview.boundarySummary}</small>
                        </div>
                      </div>
                    ) : null}
                    <div className="skill-detail-actions">
                      <button type="button" className="primary" onClick={() => navigateToProductSection("#apply-center")}>
                        {tx("Open Apply Center", "打开应用中心")}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
              {marketplaceActionNotice ? (
                <div className="marketplace-action-feedback" aria-live="polite">
                  <div>
                    <span>{tx("Action", "动作")}</span>
                    <strong>{marketplaceActionNotice.action}</strong>
                    <small>{marketplaceActionNotice.skillName}</small>
                  </div>
                  <div>
                    <span>{tx("Boundary", "边界")}</span>
                    <strong>{marketplaceActionNotice.summary}</strong>
                    <small>{tx("Remote Skills never auto-run from this surface.", "远程 Skill 不会从此界面自动运行。")}</small>
                  </div>
                  <div>
                    <span>{tx("Next Step", "下一步")}</span>
                    <strong>{marketplaceActionNotice.nextStep}</strong>
                    <small>{tx("Preview-first workflow", "预览优先工作流")}</small>
                  </div>
                </div>
              ) : null}
            </article>
          ) : null}
        </div>
      </section>

      <section className="panel os-module-panel" data-product-section="analysis" id="analysis">
        <div className="section-headline">
          <div>
            <h2>{tx("Runtime Analysis", "运行链路分析")}</h2>
            <p className="section-copy">
              <LocalizedCopy
                mode={languageMode}
                en="Bind or import Codex and Claude Code activity, then analyze Skill hits, tool calls, tokens, latency, and failures across the runtime chain."
                zh="绑定或导入 Codex 与 Claude Code 活动，然后分析运行链路里的 Skill 命中、工具调用、Token、延迟和失败。"
              />
            </p>
          </div>
        </div>
        <div className="analysis-entry-band" aria-label={tx("Analysis starting flow", "分析起步流程")}>
          <article className="analysis-entry-card entity-skill">
            <span className="os-module-kicker">{tx("Runtime Chain", "运行链路")}</span>
            <strong>{tx("Bind tools, then inspect sessions", "先绑定工具，再看会话")}</strong>
            <small>{tx("Start with Codex or Claude logs, preview what can be measured, then import normalized runtime evidence.", "从 Codex 或 Claude 日志开始，先预览可测内容，再导入规范化运行证据。")}</small>
            <div className="analysis-entry-actions">
              <button type="button" className="primary" onClick={() => navigateToProductSection("#analysis")}>
                {tx("Open Tool Sources", "打开工具来源")}
              </button>
              <button type="button" onClick={() => navigateToProductSection("#analysis")}>
                {tx("View Sessions", "查看会话")}
              </button>
            </div>
          </article>
          <article className="analysis-entry-card">
            <span className="os-module-kicker">{tx("Runtime Pressure", "运行压力")}</span>
            <strong>{tx("Token, latency, repair loops", "Token、延迟、修复循环")}</strong>
            <div className="analysis-entry-pills">
              <span className="mini-pill">{formatUsd(weeklySummary?.totalCostUsd ?? dailySummary?.totalCostUsd ?? 0)}</span>
              <span className="mini-pill">{formatDuration(weeklySummary?.avgDurationMs ?? dailySummary?.avgDurationMs ?? null)}</span>
              <span className="mini-pill">
                {highestWasteSkill ? `${tx("Waste", "浪费")} ${formatWasteScore(highestWasteSkill.wasteScore)}` : tx("No waste hotspot", "暂无浪费热点")}
              </span>
            </div>
          </article>
          <article className="analysis-entry-card">
            <span className="os-module-kicker">{tx("Runtime Sources", "运行来源")}</span>
            <strong>{tx("Codex app, terminal, Claude Code", "Codex 应用、终端、Claude Code")}</strong>
            <small>{tx("The app stays read-only until you explicitly preview and import a source.", "应用保持只读，直到你显式预览并导入来源。")}</small>
          </article>
        </div>
        <div className="analysis-metric-grid">
          <article className="analysis-metric-card entity-skill">
            <span className="os-module-kicker">{tx("Runtime", "运行")}</span>
            <strong>{formatCount(weeklySummary?.totalRuns ?? dailySummary?.totalRuns ?? 0)}</strong>
            <p>{tx("executions across the active window", "当前窗口内执行次数")}</p>
          </article>
          <article className="analysis-metric-card entity-workflow">
            <span className="os-module-kicker">{tx("Cost", "成本")}</span>
            <strong>{formatUsd(weeklySummary?.totalCostUsd ?? dailySummary?.totalCostUsd ?? 0)}</strong>
            <p>{formatCount(weeklySummary?.totalTokens ?? dailySummary?.totalTokens ?? 0)} {tx("tokens", "Token")}</p>
          </article>
          <article className="analysis-metric-card entity-agent">
            <span className="os-module-kicker">{tx("Performance", "性能")}</span>
            <strong>{formatDuration(weeklySummary?.avgDurationMs ?? dailySummary?.avgDurationMs ?? null)}</strong>
            <p>{tx("average latency", "平均延迟")}</p>
          </article>
          <article className="analysis-metric-card entity-project">
            <span className="os-module-kicker">{tx("Models / Tools", "模型 / 工具")}</span>
            <strong>{observedModelNames.length}</strong>
            <p>{formatCount(weeklySummary?.totalToolCalls ?? dailySummary?.totalToolCalls ?? 0)} {tx("tool calls", "工具调用")}</p>
          </article>
        </div>
        <div className="analysis-insight-grid">
          <article className="analysis-insight-card">
            <span className="os-module-kicker">{tx("Top Skill", "最高频 Skill")}</span>
            <h3>{topUsedSkill?.skillName ?? "n/a"}</h3>
            <p>{topUsedSkill ? `${formatCount(topUsedSkill.runsCount)} ${tx("runs", "运行")}` : tx("Import telemetry to rank usage.", "导入遥测后可排行使用量。")}</p>
          </article>
          <article className="analysis-insight-card">
            <span className="os-module-kicker">{tx("Slowest", "最慢")}</span>
            <h3>{slowestSkill?.skillName ?? "n/a"}</h3>
            <p>{slowestSkill ? formatDuration(slowestSkill.avgDurationMs) : tx("No latency signal yet.", "暂无延迟信号。")}</p>
          </article>
          <article className="analysis-insight-card">
            <span className="os-module-kicker">{tx("Highest Waste", "最高浪费")}</span>
            <h3>{highestWasteSkill?.skillName ?? "n/a"}</h3>
            <p>{highestWasteSkill ? `${tx("Waste score", "浪费分")} ${formatWasteScore(highestWasteSkill.wasteScore)}` : tx("No waste hotspot yet.", "暂无浪费热点。")}</p>
          </article>
        </div>
      </section>

      <section className="panel-grid" data-product-section="settings" id="storage">
        <article className="os-module-card user-session-insights-card settings-session-card">
          <div className="user-session-insights-head">
            <div>
              <span className="os-module-kicker">{tx("User Session Insights", "用户会话洞察")}</span>
              <h3>{tx("Learns product preferences from local feedback", "从本地反馈学习产品偏好")}</h3>
              <p>
                {tx(
                  "The workbench converts repeated feedback into local UI rules, such as compact module headers, progressive disclosure, screenshot QA, and bilingual density guards.",
                  "工作台会把反复出现的反馈转成本地 UI 规则，例如紧凑模块标题、渐进式披露、截图 QA 和双语密度保护。"
                )}
              </p>
            </div>
            <div className="user-session-insights-score">
              <span>{tx("Applied Signals", "已应用信号")}</span>
              <strong>4</strong>
              <small>{tx("local rules", "本地规则")}</small>
            </div>
          </div>
          <div className="settings-pill-row">
            <span className="mini-pill">{tx("Compact title + description", "标题 + 描述紧凑同行")}</span>
            <span className="mini-pill">{tx("Overview is route + summary", "总览只放路径 + 摘要")}</span>
            <span className="mini-pill">{tx("Visual QA required", "必须视觉自测")}</span>
            <span className="mini-pill">{tx("Local only", "仅本地")}</span>
          </div>
        </article>
        <article className="panel settings-storage-panel">
          <div className="section-headline">
            <div>
              <h2>{tx("Local Storage", "本地存储")}</h2>
              <p className="section-copy">
                <LocalizedCopy
                  mode={languageMode}
                  en="The workbench stores its state locally and can snapshot its own config, SQLite, event logs, and bundle inventory without touching the original skill sources."
                  zh="工作台会把状态保存在本机，并可快照自身配置、SQLite、事件日志和 bundle 清单，不触碰原始 skill 来源。"
                />
              </p>
            </div>
            <button type="button" className="primary" disabled={busy} onClick={() => void createBackup()}>
              {busyAction === "backup" ? tx("Creating...", "创建中...") : tx("Create Backup", "创建备份")}
            </button>
          </div>
          <dl className="meta-list">
            <div>
              <dt>{tx("Storage Root", "存储根目录")}</dt>
              <dd>{boot.storageRoot}</dd>
            </div>
            <div>
              <dt>{tx("SQLite Database", "SQLite 数据库")}</dt>
              <dd>{boot.databasePath}</dd>
            </div>
          </dl>

          <div className="summary-grid secondary storage-summary-grid">
            <div>
              <span className="stat-label">{tx("Backups Stored", "已存备份")}</span>
              <strong>{backups.length}</strong>
            </div>
            <div>
              <span className="stat-label">{tx("Latest Snapshot", "最新快照")}</span>
              <strong>{latestBackup ? formatDateTime(latestBackup.createdAt) : "n/a"}</strong>
            </div>
            <div>
              <span className="stat-label">{tx("Latest Size", "最新大小")}</span>
              <strong>{latestBackup ? formatBytes(latestBackup.totalBytes) : "n/a"}</strong>
            </div>
          </div>

          {backupResult ? (
            <div className="import-summary backup-summary">
              <div className="summary-grid secondary">
                <div>
                  <span className="stat-label">{tx("Created", "创建时间")}</span>
                  <strong>{formatDateTime(backupResult.createdAt)}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Files Captured", "已捕获文件")}</span>
                  <strong>{formatCount(backupResult.totalFiles)}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Snapshot Size", "快照大小")}</span>
                  <strong>{formatBytes(backupResult.totalBytes)}</strong>
                </div>
              </div>
              <dl className="meta-list">
                <div>
                  <dt>{tx("Backup Path", "备份路径")}</dt>
                  <dd>{backupResult.backupPath}</dd>
                </div>
                <div>
                  <dt>{tx("Manifest", "清单")}</dt>
                  <dd>{backupResult.manifestPath}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="section-headline compact">
            <div>
              <h3>{tx("Backup Manifest Preview", "备份清单预览")}</h3>
              <p className="section-copy">
                <LocalizedCopy
                  mode={languageMode}
                  en="Preview a local `backup.manifest.json` before any manual recovery work. This check is read-only and never restores or overwrites app state."
                  zh="在任何手动恢复前预览本地 `backup.manifest.json`。这个检查只读，不会恢复或覆盖应用状态。"
                />
              </p>
            </div>
          </div>

          <div className="file-picker">
            <label>
              <span>{tx("Backup Manifest", "备份清单")}</span>
              <input
                readOnly
                value={backupManifestPath}
                placeholder={tx("Choose a local backup.manifest.json file", "选择本地 backup.manifest.json 文件")}
              />
            </label>
            <div className="toolbar wrap">
              <button type="button" disabled={busy} onClick={() => void chooseBackupManifest()}>
                {tx("Choose Manifest", "选择清单")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void validateBackupManifest()}
              >
                {busyAction === "backup-validate" ? tx("Validating...", "验证中...") : tx("Validate Backup", "验证备份")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void previewBackupRestoreImpact()}
              >
                {busyAction === "backup-impact" ? tx("Previewing...", "预览中...") : tx("Preview Restore Impact", "预览恢复影响")}
              </button>
            </div>
          </div>

          <BackupValidationPanel validation={backupValidation} />
          <BackupRestoreImpactPanel impact={backupRestoreImpact} />

          <div className="section-headline compact">
            <div>
              <h3>{tx("Recent Recovery Snapshots", "最近恢复快照")}</h3>
              <p className="section-copy">
                <LocalizedCopy
                  mode={languageMode}
                  en="Snapshots exclude the `backups/` directory itself so the archive chain stays stable and does not recursively grow."
                  zh="快照会排除 `backups/` 目录本身，避免归档链递归增长并保持稳定。"
                />
              </p>
            </div>
          </div>
          <BackupList backups={backups} />
        </article>

        <article className="panel settings-runtime-panel">
          <h2>{tx("Runtime Policy", "运行策略")}</h2>
          <dl className="meta-list">
            <div>
              <dt>{tx("Telemetry Mode", "遥测模式")}</dt>
              <dd>{boot.policy?.telemetryMode ?? "disabled"}</dd>
            </div>
            <div>
              <dt>{tx("Raw Content", "原始内容")}</dt>
              <dd>{boot.policy?.allowRawContent ? tx("Allowed", "允许") : tx("Metrics only", "仅指标")}</dd>
            </div>
            <div>
              <dt>{tx("Background Watch", "后台监听")}</dt>
              <dd>{boot.policy?.allowBackgroundWatch ? tx("Approved", "已批准") : tx("Not approved", "未批准")}</dd>
            </div>
            <div>
              <dt>{tx("Excluded Paths", "排除路径")}</dt>
              <dd>{boot.exclusions.length}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="panel" data-product-section="audit" id="audit">
        <div className="section-headline">
          <div>
            <h2>{tx("Local Audit Trail", "本地审计轨迹")}</h2>
            <p className="section-copy">
              <LocalizedCopy
                mode={languageMode}
                en="This machine keeps an auditable trail of authorization changes, recovery backups, and local bundle operations so scope decisions stay reviewable over time."
                zh="本机会保留授权变更、恢复备份和本地 bundle 操作的审计轨迹，让范围决策长期可复查。"
              />
            </p>
          </div>
        </div>

        <AuditTrail
          events={auditEvents}
          selectedGraphNodeId={selectedGraphNodeId}
          resolveGraphNode={resolveGraphNode}
          resolveGraphRootNodeByPath={resolveGraphRootNodeByPath}
          onInspectGraphNode={inspectGraphNodeFromPanels}
        />
      </section>

      {boot.status === "limited" ? (
        <section className="panel onboarding-panel" data-product-section="discovery" id="onboarding">
          <div className="section-headline">
            <div>
              <p className="eyebrow">{tx("Onboarding A01-A07", "首启 A01-A07")}</p>
              <h2>{currentOnboardingStep.title}</h2>
              <p className="section-copy">{currentOnboardingStep.summary}</p>
            </div>
          </div>

          <div className="onboarding-shell">
            <aside className="onboarding-steps" aria-label={tx("Onboarding steps", "首启步骤")}>
              {onboardingSteps.map((step, index) => (
                <button
                  type="button"
                  key={step.id}
                  className={[
                    "onboarding-step",
                    index === onboardingStep ? "active" : "",
                    index < onboardingStep ? "done" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setOnboardingStep(index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.label}</strong>
                </button>
              ))}
            </aside>

            <div className="onboarding-content">
              <div className="onboarding-progress">
                <span style={{ width: `${((onboardingStep + 1) / onboardingSteps.length) * 100}%` }} />
              </div>

              {onboardingStep === 0 ? (
                <div className="onboarding-card-grid">
                  <article className="onboarding-choice entity-skill">
                    <span className="os-module-kicker">{tx("Local First", "本地优先")}</span>
                    <h3>{tx("Everything starts with consent", "一切从授权开始")}</h3>
                    <p>{tx("Skill OS will not scan folders, read raw content, import telemetry, or start background monitoring before approval.", "授权前，Skill OS 不会扫描目录、读取原始内容、导入遥测或启动后台监听。")}</p>
                  </article>
                  <article className="onboarding-choice entity-project">
                    <span className="os-module-kicker">{tx("Recommended", "推荐")}</span>
                    <h3>{tx("Start with selected directories", "从选择目录开始")}</h3>
                    <p>{tx("Narrow scope makes indexing faster and keeps early results easier to trust.", "较小范围索引更快，早期结果也更容易信任。")}</p>
                  </article>
                </div>
              ) : null}

              {onboardingStep === 1 ? (
                <div className="onboarding-stack">
                  <div className="onboarding-choice-grid">
                    <div className="onboarding-choice selected">
                      <span className="os-module-kicker">{tx("Recommended", "推荐")}</span>
                      <h3>{tx("Single Project Directory", "单项目目录")}</h3>
                      <p>{tx("Skill OS will inspect only the selected folder. Full-device discovery is not available in this version.", "Skill OS 只检查已选择文件夹。本版本不开放整机发现。")}</p>
                    </div>
                  </div>

                  <div className="section-headline compact">
                    <h3>{tx("Project Directory", "项目目录")}</h3>
                    <button type="button" onClick={() => void beginBindProjectFlow()}>
                      {tx("Bind Project", "绑定项目")}
                    </button>
                  </div>

                  <div className="root-list">
                    {targetProjectRoot ? (
                      <div className="root-chip">
                        <span>{targetProjectRoot}</span>
                        <button type="button" onClick={() => updateTargetProjectRoot("")}>
                          {tx("Remove", "移除")}
                        </button>
                      </div>
                    ) : (
                      <p className="muted">{tx("No project directory selected yet.", "尚未选择项目目录。")}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {onboardingStep === 2 ? (
                <div className="onboarding-stack">
                  <div className="form-grid">
                    <label>
                      <span>{tx("Policy Name", "策略名称")}</span>
                      <input
                        value={policyName}
                        onChange={(event) => setPolicyName(event.target.value)}
                        placeholder={tx("Default local policy", "默认本地策略")}
                      />
                    </label>

                    <label>
                      <span>{tx("Telemetry Mode", "遥测模式")}</span>
                      <select
                        value={telemetryMode}
                        onChange={(event) => setTelemetryMode(event.target.value as TelemetryMode)}
                      >
                        <option value="disabled">disabled</option>
                        <option value="estimated">estimated</option>
                        <option value="precise">precise</option>
                      </select>
                    </label>
                  </div>

                  <div className="permission-grid">
                    <label>
                      <input
                        type="checkbox"
                        checked={allowRawContent}
                        onChange={(event) => setAllowRawContent(event.target.checked)}
                      />
                      <span>
                        <strong>{tx("Allow Raw Content Access", "允许原始内容访问")}</strong>
                        <small>{tx("Disabled by default.", "默认关闭。")}</small>
                      </span>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={allowBackgroundWatch}
                        onChange={(event) => setAllowBackgroundWatch(event.target.checked)}
                      />
                      <span>
                        <strong>{tx("Allow Background Monitoring", "允许后台监听")}</strong>
                        <small>{tx("Starts only after approval.", "仅授权后启动。")}</small>
                      </span>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={telemetryMode !== "disabled"}
                        onChange={(event) => setTelemetryMode(event.target.checked ? "estimated" : "disabled")}
                      />
                      <span>
                        <strong>{tx("Allow Telemetry Collection", "允许遥测采集")}</strong>
                        <small>{tx("Local SQLite only.", "仅写入本地 SQLite。")}</small>
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}

              {onboardingStep === 3 ? (
                <div className="onboarding-stack">
                  <div className="summary-grid">
                    <div>
                      <span className="stat-label">{tx("Scan Scope", "扫描范围")}</span>
                      <strong>{tx("Single project", "单项目")}</strong>
                    </div>
                    <div>
                      <span className="stat-label">{tx("Project Directory", "项目目录")}</span>
                      <strong>{targetProjectRoot ? "1" : "0"}</strong>
                    </div>
                    <div>
                      <span className="stat-label">{tx("Boundary", "边界")}</span>
                      <strong>{tx("No full scan", "不整机扫描")}</strong>
                    </div>
                    <div>
                      <span className="stat-label">{tx("Telemetry Mode", "遥测模式")}</span>
                      <strong>{telemetryMode}</strong>
                    </div>
                  </div>
                  <div className="onboarding-final-card entity-agent">
                    <span className="os-module-kicker">{tx("Ready to initialize", "准备初始化")}</span>
                    <h3>{tx("Create local policy and project index", "创建本地策略与项目索引")}</h3>
                    <p>{tx("This creates local state for the selected project only. Remote Skills remain inactive until you import and activate them later.", "这只会为已选择项目创建本地状态。远程 Skill 仍保持非活跃，直到之后导入并激活。")}</p>
                  </div>
                </div>
              ) : null}

              <div className="onboarding-actions">
                <button
                  type="button"
                  disabled={onboardingStep === 0 || busy}
                  onClick={() => setOnboardingStep((step) => Math.max(0, step - 1))}
                >
                  {tx("Back", "上一步")}
                </button>
                {onboardingStep < maxOnboardingStep ? (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => setOnboardingStep((step) => Math.min(maxOnboardingStep, step + 1))}
                  >
                    {tx("Continue", "继续")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => void grantAuthorization()}
                  >
                    {busyAction === "authorize" ? tx("Initializing...", "初始化中...") : tx("Authorize and Initialize", "授权并初始化")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="panel-grid" data-product-section="analysis" id="telemetry">
            <article className="panel">
              <div className="section-headline">
                <div>
                  <h2>{tx("Telemetry Intake", "遥测导入")}</h2>
                  <p className="section-copy">
                    <LocalizedCopy
                      mode={languageMode}
                      en="Import local runtime logs or discover Codex / Claude Code sources after indexing Skills. Data stays inside local SQLite and respects the current policy boundary."
                      zh="索引 Skills 后导入本地运行日志，或发现 Codex / Claude Code 来源。数据保留在本地 SQLite，并遵守当前策略边界。"
                    />
                  </p>
                </div>
              </div>

              <div className="file-picker">
                <label>
                  <span>{tx("Telemetry File", "遥测文件")}</span>
                  <input
                    readOnly
                    value={telemetryFilePath}
                    placeholder={tx("Choose a local JSONL or NDJSON file", "选择本地 JSONL 或 NDJSON 文件")}
                  />
                </label>
                <div className="toolbar">
                  <button type="button" disabled={busy} onClick={() => void chooseTelemetryFile()}>
                    {tx("Choose File", "选择文件")}
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || boot.policy?.telemetryMode === "disabled"}
                    onClick={() => void importTelemetry()}
                  >
                    {busyAction === "import" ? tx("Importing...", "导入中...") : tx("Import Telemetry", "导入遥测")}
                  </button>
                </div>
              </div>

              {boot.policy?.telemetryMode === "disabled" ? (
                <p className="muted">
                  <LocalizedCopy
                    mode={languageMode}
                    en="Telemetry import is disabled by the active policy. Re-authorize with `estimated` or `precise` mode to enable imports."
                    zh="当前策略已禁用遥测导入。请用 `estimated` 或 `precise` 模式重新授权后再启用导入。"
                  />
                </p>
              ) : null}

              <div className="local-tool-intake">
                <div className="section-headline compact">
                  <div>
                    <h3>{tx("Local Tool Sources", "本地工具来源")}</h3>
                    <p className="section-copy">
                      <LocalizedCopy
                        mode={languageMode}
                        en="Discover Codex and Claude Code logs, preview what can be measured, then import normalized Skill run metrics. Terminal history is not scanned automatically."
                        zh="发现 Codex 和 Claude Code 日志，先预览能测到什么，再导入规范化 Skill 运行指标。终端历史不会被自动扫描。"
                      />
                    </p>
                  </div>
                  <div className="toolbar wrap">
                    <button
                      type="button"
                      disabled={busy || boot.policy?.telemetryMode === "disabled"}
                      onClick={() => void discoverLocalToolTelemetrySources()}
                    >
                      {busyAction === "local-tool-discovery"
                        ? tx("Discovering...", "发现中...")
                        : tx("Discover Sources", "发现来源")}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !selectedLocalToolSource || selectedLocalToolSource.status !== "ready"}
                      onClick={() => void previewLocalToolTelemetrySource()}
                    >
                      {busyAction === "local-tool-preview" ? tx("Previewing...", "预览中...") : tx("Preview Source", "预览来源")}
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={busy || !localToolPreview || localToolPreview.importableRuns === 0}
                      onClick={() => void importLocalToolTelemetrySource()}
                    >
                      {busyAction === "local-tool-import" ? tx("Importing...", "导入中...") : tx("Import Source", "导入来源")}
                    </button>
                  </div>
                </div>

                <div className="local-tool-trust-row">
                  <span className="mini-pill">{tx("Read-only preview", "只读预览")}</span>
                  <span className="mini-pill">{tx("No raw prompts stored", "不保存原始 Prompt")}</span>
                  <span className="mini-pill">{tx("No background watcher", "不启用后台监听")}</span>
                </div>

                {localToolSources.length > 0 ? (
                  <div className="local-tool-source-list">
                    {localToolSources.map((source) => (
                      <button
                        type="button"
                        key={source.id}
                        className={`local-tool-source ${selectedLocalToolSourceId === source.id ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedLocalToolSourceId(source.id);
                          setLocalToolPreview(null);
                          setLocalToolImportResult(null);
                        }}
                      >
                        <span>
                          <strong>{source.label}</strong>
                          <small>{source.description}</small>
                          {source.path ? <small className="inline-code">{source.path}</small> : null}
                        </span>
                        <span className={`source-status source-status-${source.status}`}>
                          {source.status}
                        </span>
                        <span className="local-tool-source-meta">
                          {formatCount(source.fileCount)} {tx("files", "文件")} · {formatCount(source.byteCount)} B
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-inline compact">
                    <span className="muted">
                      {tx("Click Discover Sources to list local Codex and Claude Code telemetry candidates.", "点击发现来源，列出本机 Codex 和 Claude Code 遥测候选。")}
                    </span>
                  </div>
                )}

                {localToolPreview ? (
                  <div className="import-summary local-tool-preview">
                    <div className="summary-grid">
                      <div>
                        <span className="stat-label">{tx("Importable Runs", "可导入运行")}</span>
                        <strong>{localToolPreview.importableRuns}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Detected Events", "发现事件")}</span>
                        <strong>{formatCount(localToolPreview.detectedEvents)}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Scanned Lines", "扫描行数")}</span>
                        <strong>{formatCount(localToolPreview.scannedLines)}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Confidence", "置信度")}</span>
                        <strong>{localToolPreview.confidence}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Token Fields", "Token 字段")}</span>
                        <strong>{localToolPreview.tokenFieldsDetected ? tx("yes", "有") : tx("no", "无")}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Sensitive Hits", "敏感命中")}</span>
                        <strong>{localToolPreview.sensitiveFieldCount}</strong>
                      </div>
                    </div>
                    <div className="local-tool-signal-row">
                      <span className="stat-label">{tx("Skills", "技能")}</span>
                      {(localToolPreview.detectedSkillNames.length > 0
                        ? localToolPreview.detectedSkillNames
                        : [tx("No explicit Skill evidence", "没有明确技能证据")]
                      ).map((item) => (
                        <span className="mini-pill" key={`skill-${item}`}>{item}</span>
                      ))}
                    </div>
                    <div className="local-tool-signal-row">
                      <span className="stat-label">{tx("Tools", "工具")}</span>
                      {(localToolPreview.detectedToolNames.length > 0
                        ? localToolPreview.detectedToolNames
                        : [tx("No tool calls detected", "未发现工具调用")]
                      ).map((item) => (
                        <span className="mini-pill" key={`tool-${item}`}>{item}</span>
                      ))}
                    </div>
                    {localToolPreview.warnings.length > 0 ? (
                      <div className="issue-list">
                        {localToolPreview.warnings.map((warning) => (
                          <div className="issue-item" key={warning}>{warning}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {localToolImportResult ? (
                  <p className="muted">
                    {tx("Last local tool import", "最近本地工具导入")}: {localToolImportResult.source.label} ·
                    {` ${localToolImportResult.telemetry.importedRuns} `}
                    {tx("runs imported", "条运行已导入")}
                  </p>
                ) : null}
              </div>

              {telemetryResult ? (
                <div className="import-summary">
                  <div className="summary-grid">
                    <div>
                      <span className="stat-label">{tx("Imported Runs", "已导入运行")}</span>
                      <strong>{telemetryResult.importedRuns}</strong>
                    </div>
                    <div>
                      <span className="stat-label">{tx("Updated Runs", "已更新运行")}</span>
                      <strong>{telemetryResult.updatedRuns}</strong>
                    </div>
                    <div>
                      <span className="stat-label">{tx("Processed Events", "已处理事件")}</span>
                      <strong>{telemetryResult.processedEvents}</strong>
                    </div>
                    <div>
                      <span className="stat-label">{tx("Ignored Events", "已忽略事件")}</span>
                      <strong>{telemetryResult.ignoredEvents}</strong>
                    </div>
                    <div>
                      <span className="stat-label">{tx("Affected Skills", "受影响 Skill")}</span>
                      <strong>{telemetryResult.affectedSkills}</strong>
                    </div>
                    <div>
                      <span className="stat-label">{tx("Observed Models", "观测模型")}</span>
                      <strong>{telemetryResult.observedModelNames.length}</strong>
                    </div>
                  </div>
                  <p className="muted">
                    {tx("Imported", "导入时间")} {formatDateTime(telemetryResult.importedAt)} {tx("from", "来源")}
                    <span className="inline-code"> {telemetryResult.filePath}</span>.
                  </p>
                  {telemetryImportGraphTargets.length > 0 ? (
                    <div className="panel-graph-actions">
                      {telemetryImportGraphTargets.map((target) => (
                        <GraphPanelInspectAction
                          key={`telemetry-${target.key}`}
                          targetNode={target.node}
                          selectedNodeId={selectedGraphNodeId}
                          onInspectNode={inspectGraphNodeFromPanels}
                          label={target.label}
                        />
                      ))}
                    </div>
                  ) : null}
                  {telemetryImportGraphHint ? (
                    <p className="muted">{telemetryImportGraphHint}</p>
                  ) : null}
                  {telemetryResult.errors.length > 0 ? (
                    <div className="issue-list">
                      {telemetryResult.errors.map((item) => (
                        <div className="issue-item" key={item}>
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="empty-inline">
                  <span className="muted">
                    {tx("Quick test file", "快速测试文件")}: `skill-management-workbench/fixtures/sample-telemetry.jsonl`
                  </span>
                </div>
              )}
            </article>

            <article className="panel">
              <div className="section-headline">
                <div>
                  <h2>{tx("Today's Snapshot", "今日快照")}</h2>
                  <p className="section-copy">
                    <LocalizedCopy
                      mode={languageMode}
                      en="Daily aggregates are materialized in SQLite so the workbench can hit local analytics quickly without rereading raw logs."
                      zh="每日聚合会物化到 SQLite 中，因此工作台可以快速命中本地分析结果，不需要反复读取原始日志。"
                    />
                  </p>
                </div>
              </div>

              <MetricStrip summary={dailySummary} />

              <div className="summary-grid secondary">
                <div>
                  <span className="stat-label">{tx("Success", "成功")}</span>
                  <strong>{dailySummary?.successCount ?? 0}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Failures", "失败")}</span>
                  <strong>{dailySummary?.failureCount ?? 0}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Prompt Tokens", "Prompt Token")}</span>
                  <strong>{formatCount(dailySummary?.totalPromptTokens ?? 0)}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Completion Tokens", "Completion Token")}</span>
                  <strong>{formatCount(dailySummary?.totalCompletionTokens ?? 0)}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Tool Calls", "工具调用")}</span>
                  <strong>{formatCount(dailySummary?.totalToolCalls ?? 0)}</strong>
                </div>
                <div>
                  <span className="stat-label">{tx("Date", "日期")}</span>
                  <strong>{dailySummary?.date ?? "n/a"}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="panel" data-product-section="analysis" id="signals">
            <div className="section-headline">
              <div>
                <h2>{tx("Optimization Signals", "优化信号")}</h2>
                <p className="section-copy">
                  <LocalizedCopy
                    mode={languageMode}
                    en="These leaderboards show where performance and usage concentrate before we commit to a concrete proposal."
                    zh="这些排行榜会先展示性能和使用量集中在哪里，再进入具体优化建议。"
                  />
                </p>
              </div>
            </div>

            <div className="leaderboard-grid">
              <Leaderboard
                title={tx("Slowest Skills Today", "今日最慢 Skill")}
                items={dailySummary?.slowestSkills ?? []}
                emptyCopy={tx("No completed runs are available for latency ranking yet.", "还没有可用于延迟排行的已完成运行。")}
                mode="speed"
                selectedGraphNodeId={selectedGraphNodeId}
                resolveGraphNode={resolveGraphNode}
                onInspectGraphNode={inspectGraphNodeFromPanels}
              />
              <Leaderboard
                title={tx("Most Used Skills Today", "今日最常用 Skill")}
                items={dailySummary?.mostUsedSkills ?? []}
                emptyCopy={tx("No imported usage data is available yet.", "还没有可用的已导入使用数据。")}
                mode="usage"
                selectedGraphNodeId={selectedGraphNodeId}
                resolveGraphNode={resolveGraphNode}
                onInspectGraphNode={inspectGraphNodeFromPanels}
              />
            </div>
          </section>

          <section className="panel" data-product-section="analysis" id="trends">
            <div className="section-headline">
              <div>
                <h2>{tx("Seven-Day Window", "七日窗口")}</h2>
                <p className="section-copy">
                  <LocalizedCopy
                    mode={languageMode}
                    en="Weekly rankings reuse the materialized daily aggregates, so the workbench can surface trend and waste hotspots quickly without rereading raw telemetry files."
                    zh="周排行会复用已物化的每日聚合，让工作台快速发现趋势和浪费热点，而不需要重读原始遥测文件。"
                  />
                </p>
              </div>
            </div>

            <WeeklyMetricStrip summary={weeklySummary} />

            <div className="summary-grid secondary">
              <div>
                <span className="stat-label">{tx("Success", "成功")}</span>
                <strong>{weeklySummary?.successCount ?? 0}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Failures", "失败")}</span>
                <strong>{weeklySummary?.failureCount ?? 0}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Prompt Tokens", "Prompt Token")}</span>
                <strong>{formatCount(weeklySummary?.totalPromptTokens ?? 0)}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Completion Tokens", "Completion Token")}</span>
                <strong>{formatCount(weeklySummary?.totalCompletionTokens ?? 0)}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Tool Calls", "工具调用")}</span>
                <strong>{formatCount(weeklySummary?.totalToolCalls ?? 0)}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Window", "窗口")}</span>
                <strong>
                  {weeklySummary
                    ? `${weeklySummary.startDate} → ${weeklySummary.endDate}`
                    : "n/a"}
                </strong>
              </div>
            </div>

            <div className="leaderboard-grid">
              <Leaderboard
                title={tx("Slowest Skills This Week", "本周最慢 Skill")}
                items={weeklySummary?.slowestSkills ?? []}
                emptyCopy={tx("No completed weekly runs are available for latency ranking yet.", "还没有可用于周延迟排行的已完成运行。")}
                mode="speed"
                selectedGraphNodeId={selectedGraphNodeId}
                resolveGraphNode={resolveGraphNode}
                onInspectGraphNode={inspectGraphNodeFromPanels}
              />
              <Leaderboard
                title={tx("Most Used Skills This Week", "本周最常用 Skill")}
                items={weeklySummary?.mostUsedSkills ?? []}
                emptyCopy={tx("No weekly usage data is available yet.", "还没有可用的周使用数据。")}
                mode="usage"
                selectedGraphNodeId={selectedGraphNodeId}
                resolveGraphNode={resolveGraphNode}
                onInspectGraphNode={inspectGraphNodeFromPanels}
              />
            </div>

            <WasteLeaderboard
              title={tx("Highest Waste Skills This Week", "本周最高浪费 Skill")}
              items={weeklySummary?.highestWasteSkills ?? []}
              emptyCopy={tx("No weekly waste hotspots were detected yet.", "还没有检测到本周浪费热点。")}
              selectedGraphNodeId={selectedGraphNodeId}
              resolveGraphNode={resolveGraphNode}
              onInspectGraphNode={inspectGraphNodeFromPanels}
            />
          </section>

          <section className="panel" data-product-section="graph" id="graph" ref={skillGraphSectionRef}>
            <div className="section-headline">
              <div>
                <h2>{tx("Skill Graph", "Skill 图谱")}</h2>
                <p className="section-copy">
              <LocalizedCopy
                mode={languageMode}
                en="A local relationship map built from the selected project, indexed skills, models, bundles, and proposals."
                zh="一张由已选择项目、已索引 skill、模型、bundle 与建议生成的本地关系图。"
              />
            </p>
          </div>
          <button
            type="button"
            className="primary"
                disabled={busy}
                onClick={() => void refreshGraph()}
              >
                {busyAction === "graph" ? tx("Refreshing...", "刷新中...") : tx("Refresh Graph", "刷新图谱")}
              </button>
            </div>

            {graphActionNotice ? (
              <article className="graph-action-feedback" aria-live="polite">
                <div>
                  <span>{tx("Action", "动作")}</span>
                  <strong>{graphActionNotice.action}</strong>
                  <small>{tx("Graph Studio", "图谱工作室")}</small>
                </div>
                <div>
                  <span>{tx("Scope", "范围")}</span>
                  <strong>{graphActionNotice.scope}</strong>
                  <small>
                    {tx(
                      "Graph controls only change the local visible scope; they do not rescan roots or mutate stored data.",
                      "图谱控制只改变本地可见范围，不会重新扫描根目录或修改已存数据。"
                    )}
                  </small>
                </div>
                <div>
                  <span>{tx("Next Step", "下一步")}</span>
                  <strong>{graphActionNotice.nextStep}</strong>
                  <small>{tx("Every temporary layer is reversible from the scope stack.", "每个临时层都可从范围栈撤销。")}</small>
                </div>
              </article>
            ) : null}

            <div className="graph-entry-band graph-operator-band" aria-label={tx("Graph source and flow", "图谱来源与流程")}>
              <article className="graph-entry-card entity-project">
                <span className="os-module-kicker">{tx("Source", "来源")}</span>
                <strong>{tx("Local SQLite snapshot", "本地 SQLite 快照")}</strong>
                <small>
                  {graphSnapshot?.generatedAt
                    ? `${tx("Generated", "生成于")} ${formatDateTime(graphSnapshot.generatedAt)}`
                    : tx("Refresh to generate the first snapshot.", "刷新后生成第一份快照。")}
                </small>
              </article>
              <article className="graph-entry-card entity-skill">
                <span className="os-module-kicker">{tx("Operator Flow", "操作路径")}</span>
                <strong>{tx("Search -> select -> trace", "搜索 -> 选择 -> 追踪")}</strong>
                <small>{tx("Find one node, inspect focus, then expand scope only when needed.", "先找一个节点，看焦点，再按需扩展范围。")}</small>
              </article>
              <article className="graph-entry-card">
                <span className="os-module-kicker">{tx("Current Scope", "当前范围")}</span>
                <div className="analysis-entry-pills">
                  <span className="mini-pill">{formatCount(graphSnapshot?.totalNodes ?? 0)} {tx("nodes", "节点")}</span>
                  <span className="mini-pill">{formatCount(graphSnapshot?.totalEdges ?? 0)} {tx("edges", "边")}</span>
                  <span className="mini-pill">{selectedGraphNode ? selectedGraphNode.displayName : tx("No node selected", "尚未选择节点")}</span>
                </div>
              </article>
            </div>

            <div className="skill-graph-workspace">
              <div className="skill-graph-controls">
                <GraphQuickSearch
                  nodes={baseVisibleGraph?.nodes ?? []}
                  query={graphSearchQuery}
                  matches={graphSearchMatches}
                  searchScopeEnabled={graphSearchScopeEnabled}
                  selectedNodeId={selectedGraphNodeId}
                  hasPinnedNeighborhood={Boolean(
                    pinnedGraphNeighborhood &&
                      pinnedGraphNeighborhood.centerNode &&
                      pinnedGraphNeighborhood.generatedAt === graphSnapshot?.generatedAt
                  )}
                  onQueryChange={handleGraphSearchQueryChange}
                  onSearchScopeEnabledChange={handleGraphSearchScopeChange}
                  onSelectedNodeChange={handleSelectedGraphNodeChange}
                />
                <GraphNavigationHistory
                  currentNode={selectedGraphNode}
                  historyNodes={graphNavigationHistoryNodes}
                  historyIndex={graphNavigationState.index}
                  onNavigateBack={() => jumpToGraphNavigationIndex(graphNavigationState.index - 1)}
                  onNavigateForward={() => jumpToGraphNavigationIndex(graphNavigationState.index + 1)}
                  onJumpToHistory={jumpToGraphNavigationIndex}
                  onClearHistory={clearGraphNavigationHistory}
                />
                <GraphScopeStack
                  snapshot={graphSnapshot}
                  selectedNode={selectedGraphNode}
                  pinnedNeighborhood={pinnedGraphNeighborhood}
                  searchScopeSummary={searchScopeSummary}
                  selectedTracePath={selectedTracePath}
                  onResetToSnapshot={resetGraphScopeToSnapshot}
                  onResetTopology={resetPinnedTopology}
                  onClearSearchScope={clearGraphSearchScope}
                  onClearTraceSelection={clearGraphTraceFocus}
                  onClearSelection={() => handleSelectedGraphNodeChange(null)}
                />
              </div>

              <article className="leaderboard-card graph-topology-card skill-graph-canvas">
                <GraphTopologyView
                  snapshot={graphSnapshot}
                  visibleGraph={visibleGraph}
                  interactiveNodeIds={interactiveGraphNodeIds}
                  navigableNodeIds={navigableGraphNodeIds}
                  pinnedNeighborhood={pinnedGraphNeighborhood}
                  selectedNodeId={selectedGraphNodeId}
                  selectedTracePath={selectedTracePath}
                  searchScopeSummary={searchScopeSummary}
                  neighborhoodStatus={graphNeighborhoodStatus}
                  onResetTopology={resetPinnedTopology}
                  onClearSearchScope={clearGraphSearchScope}
                  onClearTraceSelection={clearGraphTraceFocus}
                  onSelectedNodeChange={handleSelectedGraphNodeChange}
                />
              </article>

              <div className="skill-graph-focus">
                <GraphFocusAnalysis
                  snapshot={graphSnapshot}
                  visibleGraph={baseVisibleGraph}
                  navigableNodeIds={navigableGraphNodeIds}
                  selectedNodeId={selectedGraphNodeId}
                  neighborhood={graphNeighborhood}
                  pinnedNeighborhood={pinnedGraphNeighborhood}
                  pathTrace={activeGraphPathTrace}
                  selectedTraceTargetNodeId={selectedTraceTargetNodeId}
                  neighborhoodStatus={graphNeighborhoodStatus}
                  neighborhoodError={graphNeighborhoodError}
                  pathTraceStatus={graphPathTraceStatus}
                  pathTraceError={graphPathTraceError}
                  recentRuns={recentRuns}
                  proposals={proposals}
                  bundles={bundles}
                  roots={boot.roots}
                  skills={boot.skills}
                  onPinNeighborhood={pinSelectedNeighborhood}
                  onResetTopology={resetPinnedTopology}
                  onSelectedNodeChange={handleSelectedGraphNodeChange}
                  onSelectedTraceTargetNodeChange={handleGraphTraceTargetChange}
                  onClearSelection={() => handleSelectedGraphNodeChange(null)}
                />
              </div>
            </div>

            <div className="summary-grid proposal-summary graph-snapshot-summary">
              <div>
                <span className="stat-label">{tx("Nodes", "节点")}</span>
                <strong>{graphSnapshot?.totalNodes ?? 0}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Edges", "边")}</span>
                <strong>{graphSnapshot?.totalEdges ?? 0}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Generated", "生成时间")}</span>
                <strong>{graphSnapshot?.generatedAt ? formatDateTime(graphSnapshot.generatedAt) : "n/a"}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Source", "来源")}</span>
                <strong>{tx("Local SQLite snapshot", "本地 SQLite 快照")}</strong>
              </div>
            </div>

            <div className="panel-grid graph-panel-grid graph-detail-summary">
              <article className="leaderboard-card">
                <div className="section-headline compact">
                  <h3>{tx("Node Types", "节点类型")}</h3>
                </div>
                <CountBadges
                  items={graphSnapshot?.nodeTypeCounts ?? []}
                  emptyCopy={tx("No graph nodes have been generated yet.", "还没有生成图谱节点。")}
                />
              </article>

              <article className="leaderboard-card">
                <div className="section-headline compact">
                  <h3>{tx("Edge Types", "边类型")}</h3>
                </div>
                <CountBadges
                  items={graphSnapshot?.edgeTypeCounts ?? []}
                  emptyCopy={tx("No graph edges have been generated yet.", "还没有生成图谱边。")}
                />
              </article>
            </div>

            <div className="leaderboard-grid graph-panel-grid">
              <article className="leaderboard-card">
                <div className="section-headline compact">
                  <div>
                    <h3>{tx("Visible Nodes", "可见节点")}</h3>
                    <p className="muted">
                      <LocalizedCopy
                        mode={languageMode}
                        en="Follows the current topology scope so search focus, pinned neighborhoods, and trace projection stay aligned."
                        zh="跟随当前拓扑范围，让搜索焦点、固定邻域和链路投影保持一致。"
                      />
                    </p>
                  </div>
                  <div className="proposal-pills">{graphListScopePills}</div>
                </div>
                <GraphNodeList
                  nodes={visibleGraph?.nodes ?? []}
                  selectedNodeId={selectedGraphNodeId}
                  interactiveNodeIds={interactiveGraphNodeIds}
                  emptyCopy={tx("No node is visible inside the current topology scope.", "当前拓扑范围内没有可见节点。")}
                  onSelectedNodeChange={handleSelectedGraphNodeChange}
                />
              </article>

              <article className="leaderboard-card">
                <div className="section-headline compact">
                  <div>
                    <h3>{tx("Visible Edges", "可见边")}</h3>
                    <p className="muted">
                      <LocalizedCopy
                        mode={languageMode}
                        en="Uses the same scoped graph as the topology view, so the relationship list matches what the map is currently showing."
                        zh="使用与拓扑视图相同的范围图谱，因此关系列表会匹配地图当前展示内容。"
                      />
                    </p>
                  </div>
                  <div className="proposal-pills">{graphListScopePills}</div>
                </div>
                <GraphEdgeList
                  edges={visibleGraph?.edges ?? []}
                  selectedNodeId={selectedGraphNodeId}
                  emptyCopy={tx("No edge is visible inside the current topology scope.", "当前拓扑范围内没有可见边。")}
                />
              </article>
            </div>
          </section>

          <section className="panel" data-product-section="proposals" id="proposals">
            <div className="section-headline proposal-headline">
              <div>
                <h2>{tx("Optimization Center", "优化中心")}</h2>
                <p className="section-copy">
                  <LocalizedCopy
                    mode={languageMode}
                    en="Review evidence, accept useful work, route implementation, then close it after verification. Skill OS records decisions locally and never rewrites skills silently."
                    zh="先审查证据，接受有价值的工作，再流转实现，验证后关闭。Skill OS 只在本地记录决策，不会静默改写 skill。"
                  />
                </p>
              </div>
              <div className="toolbar wrap">
                <select
                  value={proposalFilter}
                  onChange={(event) => {
                    const nextFilter = event.target.value as OptimizationProposalStatus | "all";
                    setProposalFilter(nextFilter);
                    showInteractionNotice({
                      area: tx("Optimization", "优化"),
                      action: tx("Filter Proposals", "筛选建议"),
                      result: formatLocalizedText(
                        languageMode,
                        `Showing ${formatProposalFilterStatus(nextFilter, "en")} proposal queue.`,
                        `正在展示 ${formatProposalFilterStatus(nextFilter, "zh")} 建议队列。`
                      ),
                      nextStep: tx("Open a proposal card to review evidence and choose a decision.", "打开建议卡片查看证据并选择决策。"),
                      tone: "info"
                    });
                  }}
                >
                  <option value="all">{formatProposalFilterStatus("all", languageMode)}</option>
                  <option value="open">{formatProposalStatus("open", languageMode)}</option>
                  <option value="accepted">{formatProposalStatus("accepted", languageMode)}</option>
                  <option value="dismissed">{formatProposalStatus("dismissed", languageMode)}</option>
                  <option value="resolved">{formatProposalStatus("resolved", languageMode)}</option>
                </select>
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() => void refreshProposals()}
                >
                  {busyAction === "proposals" ? tx("Refreshing...", "刷新中...") : tx("Refresh Proposals", "刷新建议")}
                </button>
              </div>
            </div>

            <div className="proposal-lifecycle-strip" aria-label={tx("Optimization lifecycle", "优化生命周期")}>
              {proposalLifecycleSteps.map((step, index) => (
                <div className="proposal-lifecycle-step" key={step.key}>
                  <span className="proposal-lifecycle-index">{index + 1}</span>
                  <div>
                    <strong>{step.label}</strong>
                    <span>{step.detail}</span>
                  </div>
                  <em>{step.count}</em>
                </div>
              ))}
            </div>

            <div className="summary-grid proposal-summary">
              <div>
                <span className="stat-label">{tx("Open", "待处理")}</span>
                <strong>{proposalCounts.open}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Accepted", "已接受")}</span>
                <strong>{proposalCounts.accepted}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Dismissed", "已忽略")}</span>
                <strong>{proposalCounts.dismissed}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Resolved", "已解决")}</span>
                <strong>{proposalCounts.resolved}</strong>
              </div>
            </div>

            {proposalRefreshResult ? (
              <div className="import-summary">
                <div className="summary-grid">
                  <div>
                    <span className="stat-label">{tx("Created", "已创建")}</span>
                    <strong>{proposalRefreshResult.createdCount}</strong>
                  </div>
                  <div>
                    <span className="stat-label">{tx("Updated", "已更新")}</span>
                    <strong>{proposalRefreshResult.updatedCount}</strong>
                  </div>
                  <div>
                    <span className="stat-label">{tx("Resolved", "已解决")}</span>
                    <strong>{proposalRefreshResult.resolvedCount}</strong>
                  </div>
                  <div>
                    <span className="stat-label">{tx("Skipped", "已跳过")}</span>
                    <strong>{proposalRefreshResult.skippedCount}</strong>
                  </div>
                </div>
                <p className="muted">
                  {tx("Proposal engine last ran on", "建议引擎上次运行于")} {formatDateTime(proposalRefreshResult.generatedAt)}
                  {tx(" for ", "，日期 ")}{proposalRefreshResult.date}.
                </p>
              </div>
            ) : (
              <div className="empty-inline">
                <span className="muted">
                  {tx(
                    "Scan indexed skills or import telemetry to generate optimization proposals automatically.",
                    "扫描已索引 skill 或导入遥测后，会自动生成优化建议。"
                  )}
                </span>
              </div>
            )}

            {acceptedProposals.length > 0 ? (
              <article className="proposal-work-queue">
                <div>
                  <span className="stat-label">{tx("Accepted Work Queue", "已接受工作队列")}</span>
                  <strong>{tx("Ready for implementation", "等待实现")}</strong>
                  <p className="muted">
                    {tx(
                      "Accepted proposals are decisions, not automatic edits. Route them through Apply Center or your code workflow.",
                      "已接受建议只是决策，不是自动编辑。请通过应用中心或代码工作流执行。"
                    )}
                  </p>
                </div>
                <div className="proposal-work-list">
                  {acceptedProposals.slice(0, 3).map((proposal) => (
                    <div className="proposal-work-item" key={proposal.id}>
                      <strong>{formatProposalTitle(proposal, languageMode)}</strong>
                      <span>
                        {proposal.skillName} · {formatProposalType(proposal.proposalType, languageMode)}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="primary"
                  onClick={() => navigateToProductSection("#apply-center")}
                >
                  {tx("Open Apply Center", "打开应用中心")}
                </button>
              </article>
            ) : null}

            {proposalDecisionNotice ? (
              <article className="proposal-decision-feedback" aria-live="polite">
                <div>
                  <span>{tx("Decision", "决策")}</span>
                  <strong>{proposalDecisionNotice.action}</strong>
                  <small>{proposalDecisionNotice.proposalTitle}</small>
                </div>
                <div>
                  <span>{tx("Boundary", "边界")}</span>
                  <strong>{proposalDecisionNotice.summary}</strong>
                  <small>{proposalDecisionNotice.skillName}</small>
                </div>
                <div>
                  <span>{tx("Next Step", "下一步")}</span>
                  <strong>{proposalDecisionNotice.nextStep}</strong>
                  <small>
                    {tx(
                      "Optimization decisions are local audit events, not silent rewrites.",
                      "优化决策是本地审计事件，不是静默改写。"
                    )}
                  </small>
                </div>
              </article>
            ) : null}

            <ProposalCards
              proposals={visibleProposals}
              busy={busy}
              activeProposalId={activeProposalId}
              selectedGraphNodeId={selectedGraphNodeId}
              resolveGraphNode={resolveGraphNode}
              onInspectGraphNode={inspectGraphNodeFromPanels}
              onStatusChange={updateProposalStatus}
            />
          </section>

          <section className="panel" data-product-section="bundles" id="bundles">
            <div className="section-headline">
              <div>
                <h2>{tx("Bundle Export", "Bundle 导出")}</h2>
                <p className="section-copy">
                  <LocalizedCopy
                    mode={languageMode}
                    en="Package a proven local skill into a reusable engineering bundle with a manifest, copied skill files, and a durable SQLite record that stays on this machine."
                    zh="把验证过的本地 skill 打包成可复用工程 bundle，包含清单、复制后的 skill 文件，以及保留在本机的 SQLite 记录。"
                  />
                </p>
              </div>
            </div>

            <div className="bundle-flow-strip" aria-label={tx("Bundle workflow", "Bundle 工作流")}>
              {[
                { step: "01", label: tx("Inventory", "清单"), copy: tx("See local bundle lineage.", "查看本地 Bundle 谱系。") },
                { step: "02", label: tx("Export", "导出"), copy: tx("Copy Skill into app storage.", "复制 Skill 到应用存储。") },
                { step: "03", label: tx("Preview", "预览"), copy: tx("Inspect manifest before use.", "使用前检查清单。") },
                { step: "04", label: tx("Validate", "校验"), copy: tx("Run safety and drift checks.", "执行安全与漂移检查。") },
                { step: "05", label: tx("Strategy", "策略"), copy: tx("Choose keep or replace.", "选择保留或替代。") },
                { step: "06", label: tx("Import", "导入"), copy: tx("Write only after approval.", "确认后才写入。") }
              ].map((item) => (
                <div className="bundle-flow-step" key={item.step}>
                  <span>{item.step}</span>
                  <strong>{item.label}</strong>
                  <small>{item.copy}</small>
                </div>
              ))}
            </div>

            <div className="bundle-safety-grid">
              {[
                {
                  title: tx("Original Untouched", "原产物不变"),
                  copy: tx("Export copies the Skill into app-local bundle storage instead of mutating the source folder.", "导出只会把 Skill 复制到应用本地 Bundle 存储，不修改来源文件夹。"),
                  tone: "bundle"
                },
                {
                  title: tx("Manifest First", "清单优先"),
                  copy: tx("Every package is represented by bundle.manifest.json before it becomes reusable inventory.", "每个包都先通过 bundle.manifest.json 表达，再进入可复用清单。"),
                  tone: "skill"
                },
                {
                  title: tx("Diff Before Import", "导入前 Diff"),
                  copy: tx("Validation compares fingerprints, files, and folders against the local baseline before import.", "导入前会校验指纹、文件和目录相对本地基线的差异。"),
                  tone: "proposal"
                },
                {
                  title: tx("Strategy Required", "策略必选"),
                  copy: tx("Imports must keep the existing baseline, replace it, or create a retained revision explicitly.", "导入必须明确保留当前基线、替代当前基线，或创建保留修订。"),
                  tone: "marketplace"
                }
              ].map((card) => (
                <article className={`bundle-safety-note entity-${card.tone}`} key={card.title}>
                  <strong>{card.title}</strong>
                  <p>{card.copy}</p>
                </article>
              ))}
            </div>

            {bundleActionNotice ? (
              <article className="bundle-action-feedback" aria-live="polite">
                <div>
                  <span>{tx("Action", "动作")}</span>
                  <strong>{bundleActionNotice.action}</strong>
                  <small>{bundleActionNotice.bundleName}</small>
                </div>
                <div>
                  <span>{tx("Boundary", "边界")}</span>
                  <strong>{bundleActionNotice.summary}</strong>
                  <small>
                    {tx(
                      "Bundle operations stay local and never connect to a remote database.",
                      "Bundle 操作保持本地优先，不连接远程数据库。"
                    )}
                  </small>
                </div>
                <div>
                  <span>{tx("Next Step", "下一步")}</span>
                  <strong>{bundleActionNotice.nextStep}</strong>
                  <small>
                    {tx(
                      "Original Skill sources are not mutated by export or validation.",
                      "导出或校验不会修改原始 Skill 来源。"
                    )}
                  </small>
                </div>
              </article>
            ) : null}

            <div className="panel-grid bundle-panel-grid">
              <article className="leaderboard-card">
                <div className="section-headline compact">
                  <h3>{tx("Export Package", "导出包")}</h3>
                </div>

                {boot.skills.length === 0 ? (
                  <p className="muted">
                    {tx("Index at least one skill before exporting a local package bundle.", "导出本地包 bundle 前，请至少索引一个 skill。")}
                  </p>
                ) : (
                  <>
                    <div className="form-grid">
                      <label>
                        <span>{tx("Indexed Skill", "已索引 Skill")}</span>
                        <select
                          value={selectedBundleSkillId}
                          onChange={(event) => setSelectedBundleSkillId(event.target.value)}
                        >
                          {boot.skills.map((skill) => (
                            <option key={skill.id} value={skill.id}>
                              {skill.displayName}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>{tx("Bundle Name", "Bundle 名称")}</span>
                        <input
                          value={bundleExportName}
                          onChange={(event) => setBundleExportName(event.target.value)}
                          placeholder={tx("Optional custom bundle name", "可选自定义 bundle 名称")}
                        />
                      </label>
                    </div>

                    <div className="toolbar">
                      <button
                        type="button"
                        className="primary"
                        disabled={busy || !selectedBundleSkillId}
                        onClick={() => void exportBundle()}
                      >
                        {busyAction === "bundle-export" ? tx("Exporting...", "导出中...") : tx("Export Skill Bundle", "导出 Skill Bundle")}
                      </button>
                    </div>
                  </>
                )}
              </article>

              <article className="leaderboard-card">
                <div className="section-headline compact">
                  <h3>{tx("Latest Export", "最新导出")}</h3>
                </div>

                {bundleExportResult ? (
                  <div className="import-summary bundle-export-summary">
                    <div className="summary-grid secondary">
                      <div>
                        <span className="stat-label">{tx("Bundle", "Bundle")}</span>
                        <strong>{bundleExportResult.bundle.bundleName}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Files Copied", "已复制文件")}</span>
                        <strong>{bundleExportResult.copiedFileCount}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Created", "创建时间")}</span>
                        <strong>{formatDateTime(bundleExportResult.bundle.createdAt)}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Lifecycle", "生命周期")}</span>
                        <strong>{formatBundleLifecycleState(bundleExportResult.bundle.lifecycleState)}</strong>
                      </div>
                    </div>

                    <dl className="meta-list">
                      <div>
                        <dt>{tx("Manifest", "清单")}</dt>
                        <dd>{bundleExportResult.bundle.manifestPath}</dd>
                      </div>
                      <div>
                        <dt>{tx("Export Path", "导出路径")}</dt>
                        <dd>{bundleExportResult.bundle.exportPath}</dd>
                      </div>
                      <div>
                        <dt>{tx("Entrypoint", "入口")}</dt>
                        <dd>{bundleExportResult.manifest.entrypoint}</dd>
                      </div>
                    </dl>

                    <div className="panel-graph-actions">
                      <GraphPanelInspectAction
                        targetNode={resolveGraphNode("bundle", bundleExportResult.bundle.id)}
                        selectedNodeId={selectedGraphNodeId}
                        onInspectNode={inspectGraphNodeFromPanels}
                        label="Inspect Exported Bundle"
                      />
                      <GraphPanelInspectAction
                        targetNode={resolveGraphNode(
                          "skill",
                          bundleExportResult.bundle.primarySkillId
                        )}
                        selectedNodeId={selectedGraphNodeId}
                        onInspectNode={inspectGraphNodeFromPanels}
                        label="Inspect Primary Skill"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="empty-inline">
                    <span className="muted">
                      {tx(
                        "Your next export will create a local manifest and copy the skill folder into the app's bundle storage.",
                        "下一次导出会创建本地清单，并把 skill 文件夹复制到应用的 bundle 存储中。"
                      )}
                    </span>
                  </div>
                )}
              </article>
            </div>

            <div className="summary-grid proposal-summary">
              <div>
                <span className="stat-label">{tx("Total Bundles", "Bundle 总数")}</span>
                <strong>{bundles.length}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Current Baselines", "当前基线")}</span>
                <strong>{bundleLifecycleCounts.current}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Retained Revisions", "保留修订")}</span>
                <strong>{bundleLifecycleCounts.retained}</strong>
              </div>
              <div>
                <span className="stat-label">{tx("Superseded Revisions", "已替代修订")}</span>
                <strong>{bundleLifecycleCounts.superseded}</strong>
              </div>
            </div>

            <BundleTable
              bundles={bundles}
              selectedGraphNodeId={selectedGraphNodeId}
              resolveGraphNode={resolveGraphNode}
              onInspectGraphNode={inspectGraphNodeFromPanels}
            />
          </section>

          <section className="panel" data-product-section="bundles" id="bundle-import">
            <div className="section-headline">
              <div>
                <h2>{tx("Bundle Import", "Bundle 导入")}</h2>
                <p className="section-copy">
                  <LocalizedCopy
                    mode={languageMode}
                    en="Review a local bundle manifest before import, inspect drift against indexed skills, then copy the package into app-local storage only when the preview is safe."
                    zh="导入前先审查本地 bundle 清单，检查它与已索引 skill 的漂移；只有预览安全时才复制进应用本地存储。"
                  />
                </p>
              </div>
            </div>

            {bundleActionNotice ? (
              <article className="bundle-action-feedback" aria-live="polite">
                <div>
                  <span>{tx("Action", "动作")}</span>
                  <strong>{bundleActionNotice.action}</strong>
                  <small>{bundleActionNotice.bundleName}</small>
                </div>
                <div>
                  <span>{tx("Boundary", "边界")}</span>
                  <strong>{bundleActionNotice.summary}</strong>
                  <small>
                    {tx(
                      "Bundle operations stay local and never connect to a remote database.",
                      "Bundle 操作保持本地优先，不连接远程数据库。"
                    )}
                  </small>
                </div>
                <div>
                  <span>{tx("Next Step", "下一步")}</span>
                  <strong>{bundleActionNotice.nextStep}</strong>
                  <small>
                    {tx(
                      "Original Skill sources are not mutated by export or validation.",
                      "导出或校验不会修改原始 Skill 来源。"
                    )}
                  </small>
                </div>
              </article>
            ) : null}

            <div className="panel-grid bundle-panel-grid">
              <article className="leaderboard-card">
                <div className="section-headline compact">
                  <h3>{tx("Import Preview", "导入预览")}</h3>
                </div>

                <div className="file-picker">
                  <label>
                    <span>{tx("Bundle Manifest", "Bundle 清单")}</span>
                    <input
                      readOnly
                      value={bundleManifestPath}
                      placeholder={tx("Choose a local bundle.manifest.json file", "选择本地 bundle.manifest.json 文件")}
                    />
                  </label>

                  <div className="toolbar wrap">
                    <button type="button" disabled={busy} onClick={() => void chooseBundleManifest()}>
                      {tx("Choose Manifest", "选择清单")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void validateBundleManifest()}
                    >
                      {busyAction === "bundle-validate" ? tx("Validating...", "验证中...") : tx("Validate Bundle", "验证 Bundle")}
                    </button>
                    <button
                      type="button"
                      className="primary"
                      disabled={busy}
                      onClick={() => void importBundle()}
                    >
                      {busyAction === "bundle-import" ? tx("Importing...", "导入中...") : tx("Import Bundle", "导入 Bundle")}
                    </button>
                  </div>
                </div>

                <BundleValidationPanel
                  validation={bundleValidation}
                  selectedStrategy={bundleImportStrategy}
                  onStrategyChange={setBundleImportStrategy}
                />
              </article>

              <article className="leaderboard-card">
                <div className="section-headline compact">
                  <h3>{tx("Latest Import", "最新导入")}</h3>
                </div>

                {bundleImportResult ? (
                  <div className="import-summary bundle-import-summary">
                    <div className="summary-grid secondary">
                      <div>
                        <span className="stat-label">{tx("Bundle", "Bundle")}</span>
                        <strong>{bundleImportResult.bundle.bundleName}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Files Copied", "已复制文件")}</span>
                        <strong>{bundleImportResult.copiedFileCount}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Imported", "导入时间")}</span>
                        <strong>{formatDateTime(bundleImportResult.importedAt)}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Strategy", "策略")}</span>
                        <strong>{formatBundleImportStrategy(bundleImportResult.appliedStrategy)}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Lifecycle", "生命周期")}</span>
                        <strong>{formatBundleLifecycleState(bundleImportResult.bundle.lifecycleState)}</strong>
                      </div>
                      <div>
                        <span className="stat-label">{tx("Baseline Change", "基线变化")}</span>
                        <strong>{bundleImportResult.bundle.supersedesBundleId ? tx("Promoted", "已提升") : tx("Preserved", "已保留")}</strong>
                      </div>
                    </div>

                    <dl className="meta-list">
                      <div>
                        <dt>{tx("Manifest", "清单")}</dt>
                        <dd>{bundleImportResult.bundle.manifestPath}</dd>
                      </div>
                      <div>
                        <dt>{tx("Storage Path", "存储路径")}</dt>
                        <dd>{bundleImportResult.bundle.exportPath}</dd>
                      </div>
                      <div>
                        <dt>{tx("Matching Skill", "匹配 Skill")}</dt>
                        <dd>{bundleImportResult.validation.matchingSkill?.skillName ?? "n/a"}</dd>
                      </div>
                      <div>
                        <dt>{tx("Source Bundle", "来源 Bundle")}</dt>
                        <dd>{bundleImportResult.bundle.sourceBundleId}</dd>
                      </div>
                      <div>
                        <dt>{tx("Bundle Transition", "Bundle 迁移")}</dt>
                        <dd>
                          {bundleImportResult.bundle.supersedesBundleId
                            ? `${tx("Superseded", "已替代")} ${bundleImportResult.bundle.supersedesBundleId}`
                            : tx("Current baseline preserved; imported as parallel history.", "当前基线已保留；本次导入作为并行历史保存。")}
                        </dd>
                      </div>
                    </dl>

                    <div className="panel-graph-actions">
                      <GraphPanelInspectAction
                        targetNode={resolveGraphNode("bundle", bundleImportResult.bundle.id)}
                        selectedNodeId={selectedGraphNodeId}
                        onInspectNode={inspectGraphNodeFromPanels}
                        label="Inspect Imported Bundle"
                      />
                      <GraphPanelInspectAction
                        targetNode={resolveGraphNode(
                          "skill",
                          bundleImportResult.validation.matchingSkill?.skillId ??
                            bundleImportResult.bundle.primarySkillId
                        )}
                        selectedNodeId={selectedGraphNodeId}
                        onInspectNode={inspectGraphNodeFromPanels}
                        label="Inspect Matching Skill"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="empty-inline">
                    <span className="muted">
                      {tx(
                        "Import keeps bundles local to the app, records the manifest in SQLite, and adds the artifact to the same inventory as exported packages.",
                        "导入会让 bundle 保持在应用本地，清单写入 SQLite，并把 artifact 加入与导出包相同的清单。"
                      )}
                    </span>
                  </div>
                )}
              </article>
            </div>
          </section>

          <section className="panel os-module-panel" data-product-section="apply-center" id="apply-center">
            <div className="section-headline">
              <div>
                <h2>{tx("Apply Center", "应用中心")}</h2>
                <p className="section-copy">
                  <LocalizedCopy
                    mode={languageMode}
                    en="Every Skill can be applied to system, workspace, project, or folder scope only after a target preview confirms what will change."
                    zh="每个 Skill 都可以应用到系统、工作区、项目或文件夹范围，但必须先通过目标预览确认会发生什么变化。"
                  />
                </p>
              </div>
              <button type="button" className="primary" onClick={startApplyFlowPreview}>
                {tx("Start Apply Flow", "开始应用流程")}
              </button>
            </div>
            <div className="apply-center-workspace">
              <aside className="apply-scope-rail">
                <span className="os-module-kicker">{tx("Choose Scope", "选择范围")}</span>
                <h3>{tx("Start with the target boundary", "先确定目标边界")}</h3>
                <p className="apply-scope-rail-copy">
                  {tx("Select one boundary, then use the workbench to inspect impact, guardrails, and confirmation.", "先选择一个边界，再在工作台检查影响、安全护栏与确认。")}
                </p>
                <div className="os-apply-grid apply-scope-selector">
                  {[
                    { value: "system" as const, label: tx("System Scope", "系统范围"), copy: tx("Install globally for the current user after confirmation.", "确认后为当前用户全局安装。") },
                  { value: "workspace" as const, label: tx("Workspace Scope", "工作区范围"), copy: tx("Apply to the chosen workspace after preview.", "预览后应用到已选择工作区。") },
                    { value: "project" as const, label: tx("Project Scope", "项目范围"), copy: tx("Attach Skill behavior to one project.", "将 Skill 行为绑定到单个项目。") },
                    { value: "folder" as const, label: tx("Folder Scope", "文件夹范围"), copy: tx("Target the current folder without touching siblings.", "只作用于当前文件夹，不影响同级目录。") }
                  ].map((scope) => (
                    <button
                      type="button"
                      className={`os-apply-card ${applyScope === scope.value ? "selected" : ""}`}
                      key={scope.value}
                      onClick={() => chooseApplyScope(scope.value)}
                    >
                      <span className="os-module-kicker">{formatApplyScope(scope.value, languageMode)}</span>
                      <h3>{scope.label}</h3>
                      <p>{scope.copy}</p>
                      <div className="os-tag-row apply-scope-progress">
                        <span>{tx("Preview", "预览")}</span>
                        <span>{tx("Confirm", "确认")}</span>
                        <span>{tx("Applied", "已应用")}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>
              <article className="apply-preview-card apply-workbench-panel entity-project">
                <div className="apply-workbench-head">
                  <div>
                    <span className="os-module-kicker">{tx("Apply Workbench", "应用工作台")}</span>
                    <h3>{tx("No write before confirmation", "确认前不写入")}</h3>
                    <p>{tx("Move from scope selection to local target preview, guardrail review, and explicit confirmation.", "从范围选择进入本地目标预览、安全护栏检查和显式确认。")}</p>
                  </div>
                  <div className="marketplace-candidate-score">
                    <span>{tx("Stage", "阶段")}</span>
                    <strong>
                      {applyWorkbenchStage === "guardrails"
                        ? tx("Guardrails", "安全护栏")
                        : applyWorkbenchStage === "confirm"
                          ? tx("Confirm", "确认")
                          : applyWorkbenchStage === "preview"
                            ? tx("Preview", "预览")
                            : tx("Scope", "范围")}
                    </strong>
                  </div>
                </div>
                {remoteApplyCandidate ? (
                  <div className="remote-apply-handoff-card" aria-label={tx("Remote candidate handoff", "远程候选交接")}>
                    <div>
                      <span className="os-module-kicker">{tx("Remote Candidate Handoff", "远程候选交接")}</span>
                      <strong>{remoteApplyCandidate.displayName}</strong>
                      <small>{remoteApplyCandidate.normalizedUrl}</small>
                    </div>
                    <div className="remote-apply-handoff-grid">
                      <span>{tx("Risk", "风险")}: {formatRemoteRiskLevel(remoteApplyCandidate.riskLevel, languageMode)}</span>
                      <span>
                        {tx("Verification", "验证")}:{" "}
                        {formatRemoteVerificationStatus(remoteApplyCandidate.verificationStatus, languageMode)}
                      </span>
                      <span>{tx("Run Now", "立即运行")}: {remoteApplyCandidate.willRunNow ? tx("Yes", "是") : tx("No", "否")}</span>
                      <span>
                        {tx("Target Preview", "目标预览")}:{" "}
                        {formatDiffPreviewStatus(
                          remoteApplyCandidateDetail?.diffPreview.status,
                          languageMode
                        )}
                      </span>
                    </div>
                    <p>
                      {tx(
                        "This is a read-only handoff from Remote Market. Scope, target impact, diff preview, and manual confirmation are still required before any write or execution.",
                        "这是来自远程市场的只读交接。任何写入或执行前仍需要范围、目标影响、差异预览和手动确认。"
                      )}
                    </p>
                  </div>
                ) : null}
                <div className="apply-workbench-tabs" aria-label={tx("Apply workflow stages", "应用流程阶段")}>
                  {[
                    { key: "scope", label: tx("Scope", "范围") },
                    { key: "preview", label: tx("Preview", "预览") },
                    { key: "guardrails", label: tx("Guardrails", "安全护栏") },
                    { key: "confirm", label: tx("Confirm", "确认") }
                  ].map((stage) => (
                    <button
                      className={applyWorkbenchStage === stage.key ? "active" : ""}
                      key={stage.key}
                      type="button"
                      onClick={() => setApplyWorkbenchStage(stage.key as typeof applyWorkbenchStage)}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
                <div className={`apply-workbench-stage stage-${applyWorkbenchStage}`}>
                  {applyWorkbenchStage === "scope" ? (
                    <>
                      <div>
                        <span className="os-module-kicker">{tx("Recommended First Step", "推荐第一步")}</span>
                        <h4>{tx("Pick the narrowest safe scope", "选择最小安全范围")}</h4>
                        <p>{tx("Project or folder scope is safer for first application. System and workspace scopes should be previewed with extra care.", "首次应用更适合项目或文件夹范围。系统和工作区范围需要更谨慎预览。")}</p>
                      </div>
                      {applyScopeNotice ? (
                        <article className="apply-scope-feedback" aria-live="polite">
                          <div>
                            <span>{tx("Scope", "范围")}</span>
                            <strong>{applyScopeNotice.scope}</strong>
                            <small>{primaryLibrarySkill?.displayName ?? tx("No Skill selected", "未选择技能")}</small>
                          </div>
                          <div>
                            <span>{tx("Boundary", "边界")}</span>
                            <strong>{applyScopeNotice.summary}</strong>
                            <small>{tx("Changing scope only refreshes a local preview; it does not apply or write anything.", "切换范围只会刷新本地预览，不会应用或写入任何内容。")}</small>
                          </div>
                          <div>
                            <span>{tx("Next Step", "下一步")}</span>
                            <strong>{applyScopeNotice.nextStep}</strong>
                            <small>{tx("No write before explicit confirmation.", "显式确认前不写入。")}</small>
                          </div>
                        </article>
                      ) : null}
                      <div className="skill-detail-actions">
                        <button type="button" className="primary" onClick={() => setApplyWorkbenchStage("preview")}>
                          {tx("Review Target Preview", "查看目标预览")}
                        </button>
                      </div>
                    </>
                  ) : null}
                  {applyWorkbenchStage === "preview" ? (
                    <>
                      <dl className="apply-preview-list">
                        <div>
                          <dt>{tx("Source", "来源")}</dt>
                          <dd>
                            {activeApplyPreview?.sourceKind === "remote_candidate"
                              ? tx("Remote Candidate", "远程候选")
                              : tx("Local Skill", "本地技能")}
                          </dd>
                        </div>
                        <div>
                          <dt>{tx("Skill", "技能")}</dt>
                          <dd>{remoteApplyCandidate?.displayName ?? activeApplyPreview?.skillName ?? primaryLibrarySkill?.displayName ?? "n/a"}</dd>
                        </div>
                        <div>
                          <dt>{tx("Selected Scope", "已选范围")}</dt>
                          <dd>{formatApplyScope(applyScope, languageMode)}</dd>
                        </div>
                        <div>
                          <dt>{tx("Target", "目标")}</dt>
                          <dd>
                            {activeApplyPreview?.targetPath ??
                              activeApplyPreview?.targetLabel ??
                              tx("Resolving local target", "正在解析本地目标")}
                          </dd>
                        </div>
                        <div>
                          <dt>{tx("Conflict Policy", "冲突策略")}</dt>
                          <dd>
                            {activeApplyPreview?.conflictPolicy === "preview_diff_first"
                              ? tx("Preview diff first", "先预览差异")
                              : tx("Preview pending", "等待预览")}
                          </dd>
                        </div>
                      </dl>
                      {applyPreviewError ? <div className="error-banner">{applyPreviewError}</div> : null}
                      <div className="apply-impact-preview">
                        <span className="os-module-kicker">{tx("Will Affect", "将影响")}</span>
                        <div className="apply-impact-grid">
                          <div>
                            <span>{tx("Projects", "项目")}</span>
                            <strong>{activeApplyPreview?.impact.projects ?? "..."}</strong>
                          </div>
                          <div>
                            <span>{tx("Folders", "文件夹")}</span>
                            <strong>{activeApplyPreview?.impact.folders ?? "..."}</strong>
                          </div>
                          <div>
                            <span>{tx("Workspaces", "工作区")}</span>
                            <strong>{activeApplyPreview?.impact.workspaces ?? "..."}</strong>
                          </div>
                          <div>
                            <span>{tx("Writes", "写入")}</span>
                            <strong>
                              {activeApplyPreview
                                ? `${activeApplyPreview.impact.pendingWrites} ${tx("pending", "待确认")}`
                                : tx("Pending", "待确认")}
                            </strong>
                          </div>
                        </div>
                        <p>{tx("This preview is generated locally and remains read-only until manual confirmation.", "此预览在本地生成，在手动确认前保持只读。")}</p>
                      </div>
                      <div className="skill-detail-actions">
                        <button type="button" className="primary" onClick={startApplyFlowPreview}>
                          {tx("Review Guardrails", "查看安全护栏")}
                        </button>
                      </div>
                    </>
                  ) : null}
                  {applyWorkbenchStage === "guardrails" ? (
                    <>
                      {applyFlowNotice ? (
                        <article className="apply-flow-feedback entity-agent" aria-live="polite">
                          <span className="os-module-kicker">{tx("Apply Flow Feedback", "应用流程反馈")}</span>
                          <h3>{applyFlowNotice.title}</h3>
                          <p>{applyFlowNotice.summary}</p>
                          <small>{applyFlowNotice.detail}</small>
                        </article>
                      ) : null}
                      {activeApplyPreview ? (
                        <div className="apply-preview-flow">
                          <div>
                            <strong>{tx("Preview Steps", "预览步骤")}</strong>
                            <ol>
                              {activeApplyPreview.previewSteps.map((step) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <strong>{tx("Guardrails", "安全护栏")}</strong>
                            <ul>
                              {(activeApplyPreview.warnings.length > 0
                                ? activeApplyPreview.warnings
                                : [tx("No blocking warning for this preview.", "当前预览没有阻断性警告。")]
                              ).map((warning) => (
                                <li key={warning}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : null}
                      <div className="skill-detail-actions">
                        <button type="button" className="primary" onClick={() => setApplyWorkbenchStage("confirm")}>
                          {tx("Continue to Confirm", "继续确认")}
                        </button>
                      </div>
                    </>
                  ) : null}
                  {applyWorkbenchStage === "confirm" ? (
                    <>
                      <div>
                        <span className="os-module-kicker">{tx("Manual Confirmation Gate", "手动确认闸门")}</span>
                        <h4>{tx("Still read-only in this preview", "此预览仍然只读")}</h4>
                        <p>{tx("Skill OS has staged the target, impact, conflict policy, and guardrails. A future write step must require explicit user confirmation and a backup recommendation.", "Skill OS 已暂存目标、影响、冲突策略与安全护栏。未来写入步骤必须要求用户显式确认，并建议先备份。")}</p>
                      </div>
                      <dl className="apply-preview-list compact">
                        <div>
                          <dt>{tx("Pending Writes", "待确认写入")}</dt>
                          <dd>{activeApplyPreview ? activeApplyPreview.impact.pendingWrites : 0}</dd>
                        </div>
                        <div>
                          <dt>{tx("Remote Skill Policy", "远程 Skill 策略")}</dt>
                          <dd>
                            {activeApplyPreview?.remoteSkillPolicy === "activation_required"
                              ? tx("Activation required", "需要激活")
                              : tx("Manual only", "仅手动")}
                          </dd>
                        </div>
                      </dl>
                    </>
                  ) : null}
                </div>
              </article>
            </div>
            <div className="apply-safety-grid">
              <article className="apply-safety-card entity-agent">
                <span className="os-module-kicker">{tx("Batch Apply Preview", "批量应用预览")}</span>
                <h3>{tx("Queue first, write later", "先排队，后写入")}</h3>
                <div className="apply-stage-row">
                  {[
                    tx("Select Skills", "选择 Skill"),
                    tx("Group Targets", "分组目标"),
                    tx("Preview Diff", "预览差异"),
                    tx("Confirm Batch", "确认批量")
                  ].map((step, index) => (
                    <span key={step}>{index + 1}. {step}</span>
                  ))}
                </div>
                <p>{tx("Batch mode should show every target and proposed file change before any scope is modified.", "批量模式必须在修改任何范围前展示每个目标和拟议文件变化。")}</p>
              </article>
              <article className="apply-safety-card entity-proposal">
                <span className="os-module-kicker">{tx("Conflict Resolution", "冲突处理")}</span>
                <h3>{tx("No silent overwrite", "不静默覆盖")}</h3>
                <dl className="apply-preview-list compact">
                  <div>
                    <dt>{tx("Existing Skill", "已有 Skill")}</dt>
                    <dd>{tx("Keep, replace, or create version", "保留、替换或创建版本")}</dd>
                  </div>
                  <div>
                    <dt>{tx("Remote Skill", "远程 Skill")}</dt>
                    <dd>{tx("Installed inactive until activated", "安装后仍保持未激活")}</dd>
                  </div>
                  <div>
                    <dt>{tx("Rollback", "回滚")}</dt>
                    <dd>{tx("Snapshot recommended before write", "写入前建议创建快照")}</dd>
                  </div>
                </dl>
              </article>
            </div>
          </section>

          <section className="panel" data-product-section="analysis" id="recent-runs">
            <div className="section-headline">
              <div>
                <h2>{tx("Recent Runs", "最近运行")}</h2>
                <p className="section-copy">
                  <LocalizedCopy
                    mode={languageMode}
                    en="Recent executions keep the runtime chain visible while we work toward a richer graph view and drag-and-drop skill orchestration."
                    zh="最近执行记录会保持运行链路可见，同时为后续更丰富的图谱视图和拖拽式 skill 编排打基础。"
                  />
                </p>
              </div>
            </div>

            <RecentRunsTable
              runs={recentRuns}
              selectedGraphNodeId={selectedGraphNodeId}
              resolveGraphNode={resolveGraphNode}
              onInspectGraphNode={inspectGraphNodeFromPanels}
            />
          </section>

          <section className="panel" data-product-section="registry" id="registry">
            <div className="section-headline">
              <div>
                <h2>{tx("Skill Index", "技能索引")}</h2>
                <p className="section-copy">
                  <LocalizedCopy
                    mode={languageMode}
                    en="The skill index is scoped to the currently selected project folder. Full-computer discovery is reserved for a later version."
                    zh="技能索引只作用于当前选择的项目文件夹。全电脑发现会在后续版本单独开发。"
                  />
                </p>
              </div>
              <div className="toolbar wrap project-toolbar-actions">
                <BindProjectButton busy={busy} onClick={() => void beginBindProjectFlow()} />
                <ScanProjectButton
                  busy={busy}
                  scanning={busyAction === "project-scan"}
                  primary
                  onClick={() => void scanTargetProject()}
                />
                <ChineseDescriptionSwitch
                  checked={skillChineseAssistEnabled}
                  disabled={languageMode !== "zh"}
                  onChange={() => setSkillChineseAssistEnabled((current) => !current)}
                />
              </div>
            </div>

            <div className="registry-control-grid" aria-label={tx("Skill index controls", "技能索引控制")}>
              <article className="registry-control-card entity-project">
                <span>{tx("Scope", "范围")}</span>
                <strong>{targetProjectRoot ? tx("Current project", "当前项目") : tx("No project selected", "未选择项目")}</strong>
                <p>{tx("The local indexer is limited to one selected project directory.", "本地索引器仅限一个已选择项目目录。")}</p>
              </article>
              <article className="registry-control-card entity-agent">
                <span>{tx("Boundary", "边界")}</span>
                <strong>{tx("Single directory", "单目录")}</strong>
                <p>{tx("Sibling folders and other projects are ignored unless you scan another bound project.", "同级目录和其他项目会被忽略，除非你扫描另一个已绑定项目。")}</p>
              </article>
              <article className="registry-control-card entity-skill">
                <span>{tx("Inventory", "库存")}</span>
                <strong>{formatCount(currentProjectSkillCount)} {tx("indexed skills", "已索引 Skill")}</strong>
                <p>{tx("The table below is the current app-local skill index snapshot.", "下方表格是当前应用本地技能索引快照。")}</p>
              </article>
              <article className="registry-control-card entity-bundle">
                <span>{tx("Latest Scan", "最近扫描")}</span>
                <strong>
                  {scanResult
                    ? activeScanTargetLabel
                    : currentProjectSkillCount > 0
                      ? tx("Snapshot loaded", "已加载快照")
                      : tx("Not scanned", "未扫描")}
                </strong>
                <p>
                  {scanResult
                    ? tx("Scan result is shown before the skill index table.", "扫描结果会展示在技能索引表格之前。")
                    : tx("Choose one project folder, then run a project scan.", "选择一个项目文件夹，然后运行项目扫描。")}
                </p>
              </article>
            </div>

            <div className="registry-project-scope">
              <div className="project-scope-main">
                <div className="project-scope-title-row">
                  <span className="stat-label">{tx("Selected Project", "已选项目")}</span>
                  <strong>
                    {targetProjectRoot
                      ? tx("Selected project", "已选择项目")
                      : tx("No project selected", "未选择项目")}
                  </strong>
                </div>
                <p className={targetProjectRoot ? "inline-code" : "project-scope-help"}>
                  {targetProjectRoot ||
                    tx("No project folder selected yet.", "尚未选择项目文件夹。")}
                </p>
                <p className="project-scope-help">
                  {tx(
                    "Click Bind Project to open the system folder picker. After selecting a project root, click Scan Project; only that directory is indexed.",
                    "点击“绑定项目”会打开系统目录选择框。选中项目根目录后点击“扫描项目”，系统只索引这个目录。"
                  )}
                </p>
                <label className="project-scope-path-input">
                  <span>{tx("Project Folder Path", "项目文件夹路径")}</span>
                  <input
                    value={targetProjectRoot}
                    onChange={(event) => updateTargetProjectRoot(event.target.value)}
                    placeholder="/Users/name/path/to/project"
                  />
                </label>
              </div>
              <div className="os-card-actions project-toolbar-actions">
                <BindProjectButton busy={busy} onClick={() => void beginBindProjectFlow()} />
                <ScanProjectButton
                  busy={busy}
                  scanning={busyAction === "project-scan"}
                  primary
                  onClick={() => void scanTargetProject()}
                />
              </div>
              {busyAction === "project-scan" || busyAction === "scan" ? (
                <p className="project-scope-status" aria-live="polite">
                  {tx("Scanning the selected project folder...", "正在扫描已选择的项目文件夹...")}
                </p>
              ) : null}
            </div>

            <ProjectLibraryPanel
              projects={managedProjects}
              recentRuns={recentRuns}
              telemetryReady={Boolean(boot?.policy && boot.policy.telemetryMode !== "disabled")}
              repairFeedback={projectRepairFeedback}
              onboardingLogs={projectOnboardingLogs}
              currentProjectRoot={targetProjectRoot}
              busyAction={busyAction}
              busy={busy}
              onBindProject={() => void beginBindProjectFlow()}
              onInspectProject={inspectManagedProject}
              onAnalyzeProject={analyzeManagedProject}
              onScanProject={scanManagedProject}
              onRepairProject={(project) => void repairManagedProject(project)}
              onViewOnboardingLog={(project) => setSelectedProjectLogPath(project.path)}
              onToggleMonitoring={toggleProjectMonitoring}
              onUnbindProject={unbindManagedProject}
            />

            {isEmptyTargetProject || workflowStarterPreview || workflowStarterResult ? (
              <WorkflowStarterCard
                projectRoot={workflowStarterProjectRoot}
                preview={workflowStarterPreview}
                result={workflowStarterResult}
                busyAction={busyAction}
                highlighted={workflowStarterHighlighted}
                onPreview={() => void previewRecommendedWorkflowStarter()}
                onApply={() => void applyRecommendedWorkflowStarter()}
                onOpenLibrary={() => navigateToProductSection("#local-skills")}
                onOpenEvaluate={() => navigateToProductSection("#evaluate")}
              />
            ) : null}

            {scanResult ? (
              <div className="scan-summary">
                <strong>
                  {tx("Latest project scan", "最新项目扫描")}
                </strong>
                <p className="inline-code">{scanResult.rootPaths.join(" · ")}</p>
                <div className="summary-grid secondary">
                  <div>
                    <span className="stat-label">{tx("Skill Files", "Skill 文件")}</span>
                    <strong>{scanResult.filesSeen}</strong>
                  </div>
                  <div>
                    <span className="stat-label">{tx("Skills Found", "发现 Skill")}</span>
                    <strong>{scanResult.skillsFound}</strong>
                  </div>
                  <div>
                    <span className="stat-label">{tx("Skills Changed", "变更 Skill")}</span>
                    <strong>{scanResult.skillsChanged}</strong>
                  </div>
                  <div>
                    <span className="stat-label">{tx("Excluded Paths", "排除路径")}</span>
                    <strong>{scanResult.excludedPathCount}</strong>
                  </div>
                  <div>
                    <span className="stat-label">{tx("Skipped Entries", "跳过条目")}</span>
                    <strong>{scanResult.skippedEntryCount}</strong>
                  </div>
                  <div>
                    <span className="stat-label">{tx("Errors", "错误")}</span>
                    <strong>{scanResult.errorCount}</strong>
                  </div>
                </div>
              </div>
            ) : null}

            <SkillTable
              skills={hasSelectedProject ? boot.skills : []}
              chineseAssistEnabled={skillChineseAssistEnabled}
              selectedGraphNodeId={selectedGraphNodeId}
              resolveGraphNode={resolveGraphNode}
              onInspectGraphNode={inspectGraphNodeFromPanels}
            />
          </section>

          <section className="panel os-module-panel" data-product-section="settings" id="settings">
            <div className="section-headline">
              <div>
                <h2>{tx("Settings", "设置")}</h2>
                <p className="section-copy">
                  <LocalizedCopy
                    mode={languageMode}
                    en="Settings keep local database, storage, telemetry, backup, restore, permissions, and security controls in one place."
                    zh="设置集中管理本地数据库、存储、遥测、备份、恢复、权限与安全控制。"
                  />
                </p>
              </div>
            </div>
            <div className="os-theme-grid" aria-label={tx("Theme system", "主题体系")}>
              {[
                { name: "Midnight Graph", tone: tx("Default", "默认"), className: "theme-midnight" },
                { name: "Deep Forest", tone: tx("Privacy", "隐私") , className: "theme-forest" },
                { name: "Neo Purple", tone: tx("AI / Market", "AI / 市场"), className: "theme-purple" },
                { name: "Cyber Blue", tone: tx("Observability", "可观测"), className: "theme-cyber" }
              ].map((theme) => (
                <article className={`os-theme-card ${theme.className}`} key={theme.name}>
                  <span>{theme.tone}</span>
                  <strong>{theme.name}</strong>
                </article>
              ))}
            </div>
            <article className="os-module-card user-session-insights-card">
              <div className="user-session-insights-head">
                <div>
                  <span className="os-module-kicker">{tx("User Session Insights", "用户会话洞察")}</span>
                  <h3>{tx("Learns product preferences from local feedback", "从本地反馈学习产品偏好")}</h3>
                  <p>
                    {tx(
                      "Skill OS should remember repeated product guidance from the current workbench session and convert it into layout, workflow, and QA rules. This preview stays local and does not upload conversation data.",
                      "Skill OS 应记住当前工作台会话里反复出现的产品建议，并转成布局、工作流和 QA 规则。此预览保持本地，不上传会话数据。"
                    )}
                  </p>
                </div>
                <div className="user-session-insights-score">
                  <span>{tx("Applied Signals", "已应用信号")}</span>
                  <strong>4</strong>
                  <small>{tx("local rules", "本地规则")}</small>
                </div>
              </div>
              <div className="user-session-insights-grid">
                {[
                  {
                    title: tx("Compact module headers", "紧凑模块标题"),
                    signal: tx("Title and description should share one readable row when space allows.", "空间允许时，标题和描述应在一行内可读呈现。"),
                    applied: tx("Applied to section headlines", "已应用到模块标题")
                  },
                  {
                    title: tx("Progressive disclosure", "渐进式披露"),
                    signal: tx("Overview should keep route and summary, while detailed controls stay inside focused modules.", "总览保留路径和摘要，详细控制放进聚焦模块。"),
                    applied: tx("Applied to Overview and staged workbenches", "已应用到总览和分阶段工作区")
                  },
                  {
                    title: tx("Visual QA after UI changes", "UI 变更后视觉自测"),
                    signal: tx("Frontend changes need screenshot review, not only typecheck/build.", "前端变更不能只跑类型检查和构建，还需要截图复核。"),
                    applied: tx("Applied to self-test workflow", "已应用到自测流程")
                  },
                  {
                    title: tx("Single-language layout guard", "单语言布局保护"),
                    signal: tx("The interface should render either Chinese or English, so dense controls do not clip or wrap into fragments.", "界面应只渲染中文或英文，避免密集控件被撑破、裁切或碎片化换行。"),
                    applied: tx("Applied to headline and action layouts", "已应用到标题和操作布局")
                  }
                ].map((insight) => (
                  <div className="user-session-insight" key={insight.title}>
                    <strong>{insight.title}</strong>
                    <p>{insight.signal}</p>
                    <span>{insight.applied}</span>
                  </div>
                ))}
              </div>
              <div className="settings-pill-row">
                <span className="mini-pill">{tx("Local only", "仅本地")}</span>
                <span className="mini-pill">{tx("No remote analytics", "无远程分析")}</span>
                <span className="mini-pill">{tx("Feeds layout QA", "输入布局 QA")}</span>
              </div>
            </article>
            <article className="os-module-card health-policy-card">
              <div>
                <span className="os-module-kicker">{tx("Health Score Policy", "健康评分策略")}</span>
                <h3>{healthPolicyLabel(activeHealthPolicy.preset)}</h3>
                <p>{healthPolicyDescription(activeHealthPolicy.preset)}</p>
              </div>
              <div className="health-policy-buttons" aria-label={tx("Health Score presets", "健康评分预设")}>
                {healthScorePolicyPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    className={activeHealthPolicy.preset === preset ? "active" : undefined}
                    onClick={() => void updateHealthScorePolicy(preset)}
                    disabled={busyAction === "health-policy"}
                  >
                    {healthPolicyLabel(preset)}
                  </button>
                ))}
              </div>
              <div className="health-policy-weight-grid">
                {healthPolicyWeights.map((entry) => (
                  <span className="health-policy-weight" key={entry.label}>
                    <small>{entry.label}</small>
                    <strong>{entry.value.toFixed(2)}x</strong>
                  </span>
                ))}
              </div>
              <div className="settings-pill-row">
                <span className="mini-pill">{tx("SQLite backed", "SQLite 持久化")}</span>
                <span className="mini-pill">{tx("Re-scores locally", "本地重算")}</span>
                <span className="mini-pill">
                  {tx("Updated", "更新时间")} {formatDateTime(activeHealthPolicy.updatedAt)}
                </span>
              </div>
            </article>
            <div className="os-settings-grid">
              <article className="os-module-card">
                <span className="os-module-kicker">{tx("Storage", "存储")}</span>
                <h3>{tx("App-local root", "应用本地根目录")}</h3>
                <p className="inline-code">{boot.storageRoot}</p>
                <div className="settings-pill-row">
                  <span className="mini-pill">{tx("No remote DB", "无远程数据库")}</span>
                  <span className="mini-pill">{formatCount(backups.length)} {tx("snapshots", "快照")}</span>
                </div>
              </article>
              <article className="os-module-card">
                <span className="os-module-kicker">{tx("SQLite", "SQLite")}</span>
                <h3>{boot.databasePath.split("/").pop() ?? "app.sqlite"}</h3>
                <p className="inline-code">{boot.databasePath}</p>
                <div className="settings-pill-row">
                  <span className="mini-pill">{tx("Local index", "本地索引")}</span>
                  <span className="mini-pill">{formatCount(boot.skills.length)} {tx("skills", "技能")}</span>
                </div>
              </article>
              <article className="os-module-card">
                <span className="os-module-kicker">{tx("Backup", "备份")}</span>
                <h3>{latestBackup ? formatBytes(latestBackup.totalBytes) : tx("No snapshot yet", "暂无快照")}</h3>
                <p>{latestBackup ? formatDateTime(latestBackup.createdAt) : tx("Create a local snapshot from Storage.", "可在存储区创建本地快照。")}</p>
                <div className="settings-pill-row">
                  <span className="mini-pill">{formatCount(backups.length)} {tx("total", "总数")}</span>
                  <span className="mini-pill">{tx("Preview safe", "预览安全")}</span>
                </div>
              </article>
              <article className="os-module-card">
                <span className="os-module-kicker">{tx("Restore", "恢复")}</span>
                <h3>
                  {backupRestoreImpact
                    ? tx("Impact previewed", "影响已预览")
                    : backupValidation
                      ? tx("Manifest checked", "清单已检查")
                      : tx("Preview first", "先预览")}
                </h3>
                <p>{tx("Restore never overwrites app state before validation and impact preview.", "恢复在校验和影响预览前不会覆盖应用状态。")}</p>
                <div className="settings-pill-row">
                  <span className="mini-pill">{backupValidation?.canRestore ? tx("Restorable", "可恢复") : tx("Read-only check", "只读检查")}</span>
                </div>
              </article>
              <article className="os-module-card">
                <span className="os-module-kicker">{tx("Permissions", "权限")}</span>
                <h3>{boot.status === "ready" ? tx("Authorized", "已授权") : tx("Limited", "受限")}</h3>
                <p>{tx("Raw content and background monitoring stay explicit choices.", "原始内容和后台监听始终是显式选择。")}</p>
                <div className="settings-pill-row">
                  <span className="mini-pill">{boot.policy?.allowRawContent ? tx("Raw allowed", "允许原文") : tx("Metrics only", "仅指标")}</span>
                  <span className="mini-pill">{boot.policy?.allowBackgroundWatch ? tx("Watch approved", "监听已批准") : tx("Watch off", "监听关闭")}</span>
                </div>
              </article>
              <article className="os-module-card">
                <span className="os-module-kicker">{tx("Telemetry", "遥测")}</span>
                <h3>{boot.policy?.telemetryMode ?? tx("disabled", "已禁用")}</h3>
                <p>{tx("Telemetry import reads local JSONL files into SQLite only when policy allows it.", "只有策略允许时，遥测导入才会把本地 JSONL 写入 SQLite。")}</p>
                <div className="settings-pill-row">
                  <span className="mini-pill">{formatCount(recentRuns.length)} {tx("recent runs", "最近运行")}</span>
                </div>
              </article>
              <article className="os-module-card">
                <span className="os-module-kicker">{tx("Language", "语言")}</span>
                <h3>{languageMode === "zh" ? "中文" : "English"}</h3>
                <p>{tx("The interface shows one language at a time to keep dense layouts stable.", "界面一次只显示一种语言，避免密集布局被混排撑乱。")}</p>
                <div className="settings-pill-row">
                  <span className="mini-pill">{tx("Global UI", "全局 UI")}</span>
                </div>
              </article>
              <article className="os-module-card">
                <span className="os-module-kicker">{tx("Advanced", "高级")}</span>
                <h3>{tx("Policy boundaries", "策略边界")}</h3>
                <p>{tx("Remote skills never auto-run, and scans stay inside the selected project directory.", "远程 Skill 永不自动运行，扫描始终限制在已选择项目目录内。")}</p>
                <div className="settings-pill-row">
                  <span className="mini-pill">{formatCount(managedProjects.length)} {tx("bound projects", "已绑定项目")}</span>
                  <span className="mini-pill">{tx("Single project scan", "单项目扫描")}</span>
                </div>
              </article>
            </div>
          </section>
        </>
      )}
        </div>
      </div>
      {inspectedProject ? (
        <div
          className="project-detail-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setInspectedProjectPath("");
            }
          }}
        >
          <section
            className="project-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-detail-modal-title"
          >
            <ProjectAssetDetailPanel
              project={inspectedProject}
              profile={projectProfile}
              currentProjectRoot={targetProjectRoot}
              localSkills={boot.skills}
              recentRuns={recentRuns}
              heartbeatEntries={projectHeartbeatEntries}
              telemetryMode={boot.policy?.telemetryMode ?? "missing"}
              backgroundWatchAllowed={Boolean(boot.policy?.allowBackgroundWatch)}
              runtimeRefreshResult={projectRuntimeRefreshResult}
              busyAction={busyAction}
              busy={busy}
              onScanProject={scanManagedProject}
              onRefreshRuntimeEvidence={(project) => void refreshProjectRuntimeEvidence(project)}
              onEnableTelemetry={(project) => void enableProjectTelemetry(project)}
              onToggleMonitoring={toggleProjectMonitoring}
              onUpdateMonitoringInterval={updateProjectMonitoringInterval}
              onRenameProject={renameManagedProject}
              onClose={() => setInspectedProjectPath("")}
            />
          </section>
        </div>
      ) : null}
      {selectedProjectLog ? (
        <div
          className="project-log-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedProjectLogPath("");
            }
          }}
        >
          <section
            className="project-log-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-log-modal-title"
          >
            <div className="project-log-modal-head">
              <div>
                <span className="os-module-kicker">{tx("Onboarding Log", "接入日志")}</span>
                <h2 id="project-log-modal-title">{selectedProjectLog.name}</h2>
                <p>{selectedProjectLog.path}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={tx("Close onboarding log", "关闭接入日志")}
                onClick={() => setSelectedProjectLogPath("")}
              >
                ×
              </button>
            </div>
            {projectRepairFeedback?.projectPath === selectedProjectLog.path ? (
              <div className={`project-log-current status-${projectRepairFeedback.status}`}>
                <strong>
                  {projectRepairFeedback.status === "running"
                    ? tx("Repairing", "修正中")
                    : projectRepairFeedback.status === "completed"
                      ? tx("Repair complete", "修正完成")
                      : projectRepairFeedback.status === "connected-awaiting-skill"
                        ? tx("Connected, awaiting Skill", "已连接待触发")
                      : projectRepairFeedback.status === "connection-required"
                        ? tx("Connection incomplete", "连接未完成")
                        : projectRepairFeedback.status === "failed"
                          ? tx("Repair failed", "修正失败")
                          : tx("Action required", "需要确认")}
                </strong>
                <p>{projectRepairFeedback.detail}</p>
              </div>
            ) : null}
            <div className="project-log-list">
              {selectedProjectLogEntries.length > 0 ? (
                selectedProjectLogEntries.map((entry) => (
                  <div className={`project-log-entry tone-${entry.tone}`} key={entry.id}>
                    <i aria-hidden="true" />
                    <div>
                      <span>
                        {entry.stage === "scan"
                          ? tx("Folder Scan", "目录扫描")
                          : entry.stage === "skills"
                            ? tx("Skill Index", "技能索引")
                            : entry.stage === "workflow"
                              ? tx("Workflow", "工作流")
                              : entry.stage === "telemetry"
                                ? tx("Permission", "监控授权")
                                : entry.stage === "connection"
                                  ? tx("Codex Connection", "Codex 连接")
                                  : tx("Complete", "完成")}
                      </span>
                      <p>{entry.message}</p>
                    </div>
                    <time>{formatDateTime(entry.occurredAt)}</time>
                  </div>
                ))
              ) : (
                <div className="project-log-empty">
                  <strong>{tx("No onboarding log yet", "还没有接入日志")}</strong>
                  <p>{tx("Run Detect and Repair to generate a step-by-step log.", "点击“检测并修正”后，这里会逐步记录检查过程。")}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
      {skillRunDetail ? (
        <SkillRunDetailModal
          skill={skillRunDetail.skill}
          runs={skillRunDetail.runs}
          loading={skillRunDetail.loading}
          onClose={() => setSkillRunDetail(null)}
        />
      ) : null}
      {pendingBindProjectRoot ? (
        <div
          className="bind-project-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && busyAction !== "project-scan") {
              closePendingBindProjectDialog();
            }
          }}
        >
          <section
            className="bind-project-modal entity-project"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bind-project-modal-title"
          >
            <div className="bind-project-modal-head">
              <div>
                <span className="os-module-kicker">{tx("Bind Project", "绑定项目")}</span>
                <h2 id="bind-project-modal-title">{tx("Confirm Project Folder", "确认项目目录")}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={tx("Close bind project dialog", "关闭绑定项目弹窗")}
                disabled={busyAction === "project-scan"}
                onClick={closePendingBindProjectDialog}
              >
                ×
              </button>
            </div>
            <p className="bind-project-modal-copy">
              {tx(
                "This folder has only been selected. It will be added to Project Management after scan completes.",
                "当前只是选中了这个目录。扫描完成后，它才会加入项目管理列表。"
              )}
            </p>
            <div className="bind-project-path" aria-label={tx("Selected folder", "已选择目录")}>
              <span>{pendingBindProjectRoot}</span>
            </div>
            {busyAction === "project-scan" ? (
              <div className="bind-project-loading" role="status" aria-live="polite">
                <span className="loading-dot" />
                <strong>{tx("Scanning and binding project...", "正在扫描并绑定项目...")}</strong>
              </div>
            ) : null}
            <div className="bind-project-modal-actions">
              <button
                type="button"
                disabled={busyAction === "project-scan"}
                onClick={closePendingBindProjectDialog}
              >
                {tx("Close", "关闭")}
              </button>
              <button
                type="button"
                className="primary"
                disabled={busyAction === "project-scan"}
                onClick={() => void scanAndBindPendingProject()}
              >
                <ScanIcon />
                <span>
                  {busyAction === "project-scan"
                    ? tx("Scanning...", "扫描中...")
                    : tx("Scan and Bind", "扫描并绑定")}
                </span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {scanResultDialog ? (
        <div
          className="scan-result-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setScanResultDialog(null);
            }
          }}
        >
          <section
            className="scan-result-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-result-modal-title"
          >
            <div className="scan-result-modal-head">
              <div>
                <span className="os-module-kicker">
                  {scanResultDialog.scanScope === "project"
                    ? tx("Project scan complete", "项目扫描完成")
                    : tx("Project scan complete", "项目扫描完成")}
                </span>
                <h2 id="scan-result-modal-title">{tx("Scan Result", "扫描结果")}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={tx("Close scan result", "关闭扫描结果")}
                onClick={() => setScanResultDialog(null)}
              >
                ×
              </button>
            </div>
            <p className="scan-result-modal-copy">
              {scanResultDialog.scanScope === "project"
                ? tx("Skill OS only inspected the selected project folder.", "Skill OS 只检查了已选择的项目文件夹。")
                : tx("Skill OS only inspected the selected project folder.", "Skill OS 只检查了已选择的项目文件夹。")}
            </p>
            <div className="scan-result-modal-paths">
              {scanResultDialog.rootPaths.map((rootPath) => (
                <span key={rootPath}>{rootPath}</span>
              ))}
            </div>
            <form
              className="scan-result-rename-panel"
              onSubmit={(event) => {
                event.preventDefault();
                saveScanResultProjectName();
              }}
            >
              <div>
                <span className="os-module-kicker">{tx("Project Name", "项目名称")}</span>
                <strong>{tx("Rename this project for easier management", "给这个项目起个方便管理的名字")}</strong>
                <small>
                  {scanResultDialogProject
                    ? tx("This only changes the display name inside Skill OS.", "这里只修改 Skill OS 内的显示名称。")
                    : tx("The project will be kept in the bound project list.", "该项目会保留在已绑定项目列表中。")}
                </small>
              </div>
              <label>
                <span>{tx("Display Name", "显示名称")}</span>
                <input
                  value={scanResultProjectName}
                  onChange={(event) => setScanResultProjectName(event.currentTarget.value)}
                  placeholder={tx("Project display name", "项目显示名称")}
                />
              </label>
              <button type="submit" disabled={!scanResultDialogProjectRoot || !scanResultProjectName.trim()}>
                {tx("Save Name", "保存名称")}
              </button>
            </form>
            <div className="scan-result-modal-grid">
              <div>
                <span>{tx("Skills", "技能")}</span>
                <strong>{scanResultDialog.skillsFound}</strong>
              </div>
              <div>
                <span>{tx("Files", "文件")}</span>
                <strong>{scanResultDialog.filesSeen}</strong>
              </div>
              <div>
                <span>{tx("Changed", "变化")}</span>
                <strong>{scanResultDialog.skillsChanged}</strong>
              </div>
              <div>
                <span>{tx("Skipped", "跳过")}</span>
                <strong>{scanResultDialog.skippedEntryCount}</strong>
              </div>
              <div>
                <span>{tx("Errors", "错误")}</span>
                <strong>{scanResultDialog.errorCount}</strong>
              </div>
            </div>
            <div className="project-onboarding-checklist" aria-label={tx("Project onboarding checks", "项目接入检查") }>
              <div className="is-ready">
                <span>✓</span>
                <strong>{tx("Project folder bound", "项目目录已绑定")}</strong>
                <small>{scanResultDialogProjectRoot}</small>
              </div>
              <div className={scanResultDialog.skillsFound > 0 ? "is-ready" : "needs-action"}>
                <span>{scanResultDialog.skillsFound > 0 ? "✓" : "!"}</span>
                <strong>{tx("Project Skills indexed", "项目技能已索引")}</strong>
                <small>
                  {scanResultDialog.skillsFound > 0
                    ? tx(`${scanResultDialog.skillsFound} Skill(s) found`, `发现 ${scanResultDialog.skillsFound} 个技能`)
                    : tx("No Skill found; repair is required", "未发现技能，需要修正")}
                </small>
              </div>
              <div className={scanResultDialog.workflowDetected ? "is-ready" : "needs-action"}>
                <span>{scanResultDialog.workflowDetected ? "✓" : "!"}</span>
                <strong>{tx("Workflow configuration", "工作流配置")}</strong>
                <small>
                  {scanResultDialog.workflowDetected
                    ? tx("Workflow markers detected", "已检测到工作流标记")
                    : tx("Workflow is incomplete; preview a repair plan", "工作流不完整，请预览修正方案")}
                </small>
              </div>
              <div className="needs-connection">
                <span>→</span>
                <strong>{tx("Codex project connection", "Codex 项目连接")}</strong>
                <small>{tx("Start a Codex task from this exact project directory, then refresh evidence.", "请从该项目目录启动 Codex 任务，然后刷新运行证据。")}</small>
              </div>
              <div className={boot?.policy?.telemetryMode !== "disabled" ? "is-ready" : "needs-action"}>
                <span>{boot?.policy?.telemetryMode !== "disabled" ? "✓" : "!"}</span>
                <strong>{tx("Runtime monitoring permission", "运行监控授权")}</strong>
                <small>
                  {boot?.policy?.telemetryMode !== "disabled"
                    ? tx("Runtime evidence import is authorized", "运行证据导入已授权")
                    : tx("Open project detail and enable telemetry", "请打开项目详情并开启遥测")}
                </small>
              </div>
            </div>
            <div className={`scan-result-modal-next ${isEmptyScanDialogProject && !isWorkflowAppliedToScanDialogProject ? "tone-empty" : "tone-ready"}`}>
              {isEmptyScanDialogProject ? (
                <span className="scan-result-recommendation-badge">
                  {isWorkflowAppliedToScanDialogProject
                    ? tx("Workflow applied", "工作流已应用")
                    : tx("Selected recommendation", "已选择推荐")}
                </span>
              ) : null}
              <strong>
                {isWorkflowAppliedToScanDialogProject
                    ? tx("Project skills-workflow is ready.", "项目技能工作流已就绪。")
                  : isEmptyScanDialogProject
                  ? tx("No Skills found. Recommended skills-workflow is available.", "未发现 Skill。可应用推荐 skills-workflow。")
                  : tx("Indexed results are ready.", "索引结果已就绪。")}
              </strong>
              <p>
                {isWorkflowAppliedToScanDialogProject
                  ? tx("Review the project assets in Skill Library or return to Project Management.", "可在技能库查看项目资产，也可以返回项目管理。")
                  : isEmptyScanDialogProject
                  ? tx("Preview the bundled skills-workflow before writing anything into this project.", "写入任何内容前，可以先预览内置 skills-workflow。")
                  : tx("The indexed Skills are now stored in Skill Library and attached to this project.", "已索引技能会存入技能库，并关联到这个项目。")}
              </p>
            </div>
            <div className="scan-result-modal-actions">
              <button type="button" onClick={() => setScanResultDialog(null)}>
                {tx("Stay in Project Management", "留在项目管理")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScanResultDialog(null);
                  navigateToProductSection("#local-skills");
                }}
              >
                {tx("Review Project Skills", "查看项目技能")}
              </button>
              {isWorkflowAppliedToScanDialogProject ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setScanResultDialog(null);
                      navigateToProductSection("#evaluate");
                    }}
                  >
                    {tx("Open Reports", "打开评测报告")}
                  </button>
                  {scanResultDialogProject ? (
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        setScanResultDialog(null);
                        void repairManagedProject(scanResultDialogProject);
                      }}
                    >
                      <RepairIcon />
                      {tx("Check connection", "检查连接")}
                    </button>
                  ) : null}
                </>
              ) : isEmptyScanDialogProject ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setScanResultDialog(null);
                    void previewRecommendedWorkflowStarter("scan-dialog");
                  }}
                >
                  {tx("Use recommended skills-workflow", "使用推荐 skills-workflow")}
                </button>
              ) : !scanResultDialog.workflowDetected && scanResultDialogProject ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setScanResultDialog(null);
                    void repairManagedProject(scanResultDialogProject);
                  }}
                >
                  <RepairIcon />
                  {tx("Detect and repair", "检测并修正")}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
    </LanguageContext.Provider>
  );
}
