import type {
  AuthorizationInput,
  BootstrapState,
  DailyMetricsSummary,
  GraphEdgeSummary,
  GraphNeighborhood,
  GraphNodeSummary,
  GraphPathTrace,
  LocalAuditEvent,
  LocalBackupRestoreImpactResult,
  LocalBackupSummary,
  LocalBackupValidationResult,
  RemoteMarketplaceCatalog,
  OptimizationProposal,
  OptimizationProposalRefreshResult,
  OptimizationProposalStatus,
  RemoteSkillActivationPreview,
  RemoteSkillCandidateDetail,
  RemoteSkillCandidateSummary,
  RemoteSkillImportResult,
  RemoteSkillSourceAnalysis,
  ScanResult,
  SkillApplyPreview,
  SkillApplyPreviewInput,
  SkillBundleExportInput,
  SkillBundleExportResult,
  SkillBundleImportInput,
  SkillBundleImportResult,
  SkillBundleSummary,
  SkillBundleValidationResult,
  SkillHealthScorePolicy,
  SkillHealthScorePolicyInput,
  SkillHealthSummary,
  SkillIntelligenceAnalysis,
  SkillRunSummary,
  SkillSummary,
  WeeklyMetricsSummary,
  WorkbenchApi
} from "../../shared/types";

const now = new Date("2026-06-05T09:30:00+08:00").toISOString();
const storageRoot = "/Users/demo/Library/Application Support/Skill Management Workbench";

const previewHealthScorePolicies: Record<SkillHealthScorePolicy["preset"], SkillHealthScorePolicy> = {
  balanced: {
    id: "default",
    preset: "balanced",
    label: "Balanced",
    description: "Equal attention to reliability, cost, latency, freshness, and maintainability.",
    reliabilityWeight: 1,
    costWeight: 1,
    latencyWeight: 1,
    freshnessWeight: 1,
    maintainabilityWeight: 1,
    healthyScore: 82,
    attentionScore: 55,
    updatedAt: now
  },
  reliability_first: {
    id: "default",
    preset: "reliability_first",
    label: "Reliability First",
    description: "Failure rate and unresolved proposals have stronger impact on Health Score.",
    reliabilityWeight: 1.35,
    costWeight: 0.85,
    latencyWeight: 0.95,
    freshnessWeight: 1,
    maintainabilityWeight: 1.1,
    healthyScore: 84,
    attentionScore: 58,
    updatedAt: now
  },
  cost_guard: {
    id: "default",
    preset: "cost_guard",
    label: "Cost Guard",
    description: "Token pressure is weighted higher for teams watching spend and waste.",
    reliabilityWeight: 0.95,
    costWeight: 1.45,
    latencyWeight: 0.95,
    freshnessWeight: 0.9,
    maintainabilityWeight: 1,
    healthyScore: 82,
    attentionScore: 55,
    updatedAt: now
  },
  latency_guard: {
    id: "default",
    preset: "latency_guard",
    label: "Latency Guard",
    description: "Slow Skills lose score sooner so interactive workflows stay responsive.",
    reliabilityWeight: 1,
    costWeight: 0.95,
    latencyWeight: 1.45,
    freshnessWeight: 0.9,
    maintainabilityWeight: 1,
    healthyScore: 82,
    attentionScore: 55,
    updatedAt: now
  },
  freshness_guard: {
    id: "default",
    preset: "freshness_guard",
    label: "Freshness Guard",
    description: "Recently unseen or stale Skills are treated as higher governance risk.",
    reliabilityWeight: 0.95,
    costWeight: 0.9,
    latencyWeight: 0.9,
    freshnessWeight: 1.5,
    maintainabilityWeight: 1.1,
    healthyScore: 82,
    attentionScore: 56,
    updatedAt: now
  }
};

let activePreviewHealthScorePolicy = previewHealthScorePolicies.balanced;
let previewRemoteCandidates: RemoteSkillCandidateSummary[] = [];
const previewDirectoryChoices = [
  "/Users/demo/projects/skill-playground/skills",
  "/Users/demo/projects/codex-skills/node_modules",
  "/Users/demo/projects/skill-os-lab/skills",
  "/Users/demo/projects/codex-skills/dist",
  "/Users/demo/.codex/skills/archive"
] as const;
let previewDirectoryChoiceIndex = 0;

function nextPreviewDirectory() {
  const nextPath =
    previewDirectoryChoices[previewDirectoryChoiceIndex % previewDirectoryChoices.length];
  previewDirectoryChoiceIndex += 1;
  return nextPath;
}

function previewHealth(
  score: number,
  status: SkillHealthSummary["status"],
  reasons: string[],
  signals: Partial<SkillHealthSummary["signals"]>
): SkillHealthSummary {
  return {
    score,
    status,
    confidence: 0.88,
    reasons,
    calculatedAt: now,
    trend: {
      latestScore: score,
      previousScore: score - 3,
      delta: 3,
      direction: "up",
      measuredAt: now,
      previousMeasuredAt: "2026-06-04T09:30:00+08:00",
      sampleCount: 2
    },
    signals: {
      runs7d: 0,
      failureRate7d: null,
      avgDurationMs7d: null,
      avgTokensPerRun7d: null,
      openProposalCount: 0,
      acceptedProposalCount: 0,
      highSeverityProposalCount: 0,
      hasDescription: true,
      lineCount: null,
      freshnessDays: 0,
      ...signals
    }
  };
}

const skills: SkillSummary[] = [
  {
    id: "skill-memory",
    canonicalName: "memory-governance",
    displayName: "Memory Governance",
    sourceType: "user",
    sourcePath: "/Users/demo/.codex/skills/memory-governance",
    currentVersionFingerprint: "mem-8f42c1",
    description: "Routes user, team, and agent memory into scoped local stores.",
    lineCount: 188,
    lastSeenAt: now,
    governance: {
      role: "memory",
      preferredHarness: "generic",
      structureType: "single_skill",
      frameworkLabel: null,
      orchestrationSignals: ["memory_governance"],
      moduleCountHint: null,
      dataClasses: ["account_identity", "local_knowledge", "workflow_state"],
      storagePolicy: "local_sensitive",
      reusePolicy: "local_only",
      recommendedScope: "folder",
      storesLongLivedContext: true,
      containsSensitiveOperationalData: true
    },
    health: previewHealth(72, "needs_attention", ["High-severity optimization work is open"], {
      runs7d: 18,
      failureRate7d: 0.056,
      avgDurationMs7d: 1420,
      avgTokensPerRun7d: 2367,
      openProposalCount: 1,
      highSeverityProposalCount: 1,
      lineCount: 188
    })
  },
  {
    id: "skill-bundle",
    canonicalName: "bundle-publisher",
    displayName: "Bundle Publisher",
    sourceType: "repo",
    sourcePath: "/Users/demo/projects/codex-skills/skills/bundle-publisher",
    currentVersionFingerprint: "bun-2a91e7",
    description: "Packages stable skills into versioned local engineering assets.",
    lineCount: 142,
    lastSeenAt: now,
    governance: {
      role: "packaging",
      preferredHarness: "generic",
      structureType: "single_skill",
      frameworkLabel: null,
      orchestrationSignals: ["test_gate"],
      moduleCountHint: null,
      dataClasses: ["workflow_state", "development_context"],
      storagePolicy: "session_only",
      reusePolicy: "safe_to_bundle",
      recommendedScope: "project",
      storesLongLivedContext: false,
      containsSensitiveOperationalData: false
    },
    health: previewHealth(58, "needs_attention", ["No recent runtime evidence"], {
      runs7d: 7,
      failureRate7d: 0,
      avgDurationMs7d: 980,
      avgTokensPerRun7d: 1729,
      lineCount: 142
    })
  },
  {
    id: "skill-graph",
    canonicalName: "graph-analyzer",
    displayName: "Graph Analyzer",
    sourceType: "repo",
    sourcePath: "/Users/demo/projects/codex-skills/skills/graph-analyzer",
    currentVersionFingerprint: "gra-71b39d",
    description: "Builds local topology views for skills, models, bundles, and proposals.",
    lineCount: 231,
    lastSeenAt: now,
    governance: {
      role: "analysis",
      preferredHarness: "generic",
      structureType: "single_skill",
      frameworkLabel: null,
      orchestrationSignals: ["spec_artifacts", "multi_skill_composition"],
      moduleCountHint: null,
      dataClasses: ["development_context", "workflow_state", "local_knowledge"],
      storagePolicy: "local_persisted",
      reusePolicy: "review_before_bundle",
      recommendedScope: "project",
      storesLongLivedContext: true,
      containsSensitiveOperationalData: false
    },
    health: previewHealth(84, "healthy", ["No material risk signal detected"], {
      runs7d: 11,
      failureRate7d: 0.091,
      avgDurationMs7d: 2180,
      avgTokensPerRun7d: 2891,
      acceptedProposalCount: 1,
      lineCount: 231
    })
  },
  {
    id: "skill-superpowers-dev",
    canonicalName: "superpowers-dev-implementer",
    displayName: "Superpowers Dev Implementer",
    sourceType: "repo",
    sourcePath: "/Users/demo/projects/codex-skills/skills/superpowers-dev-implementer",
    currentVersionFingerprint: "sup-42de11",
    description: "Development-first Skill aligned with the Superpowers workflow for plan, implement, test, review, and finish loops.",
    lineCount: 264,
    lastSeenAt: now,
    governance: {
      role: "development",
      preferredHarness: "superpowers",
      structureType: "composite_framework",
      frameworkLabel: "Workflow Skills",
      orchestrationSignals: [
        "router_layer",
        "spec_artifacts",
        "memory_governance",
        "review_gate",
        "test_gate",
        "release_flow",
        "long_task_orchestration",
        "multi_skill_composition"
      ],
      moduleCountHint: 12,
      dataClasses: ["development_context", "workflow_state", "local_knowledge"],
      storagePolicy: "local_persisted",
      reusePolicy: "review_before_bundle",
      recommendedScope: "project",
      storesLongLivedContext: true,
      containsSensitiveOperationalData: false
    },
    health: previewHealth(91, "healthy", ["Preferred development workflow is stable"], {
      runs7d: 23,
      failureRate7d: 0.043,
      avgDurationMs7d: 1540,
      avgTokensPerRun7d: 2540,
      acceptedProposalCount: 1,
      lineCount: 264
    })
  }
];

function makeSkillAnalysis(skillId: string): SkillIntelligenceAnalysis {
  const skill = skills.find((entry) => entry.id === skillId) ?? skills[0];
  return {
    id: `analysis-${skill.id}`,
    skillId: skill.id,
    skillName: skill.displayName,
    generatedAt: now,
    summary: `${skill.displayName} is an indexed ${skill.sourceType} Skill. ${skill.description ?? "No description is available."} Current local health is ${skill.health.score}/100 with ${skill.health.signals.runs7d} seven-day run signal(s).`,
    dependencies: [
      `Source path: ${skill.sourcePath}`,
      `Current version fingerprint: ${skill.currentVersionFingerprint ?? "n/a"}`,
      `Skill file size: ${skill.lineCount ?? 0} lines.`,
      "Observed model usage: gpt-5 (2)."
    ],
    executionFlow: [
      "Trigger: user selects this Skill from the local registry, Skill Library, graph, or apply flow.",
      "Inputs: local Skill metadata, optional telemetry summaries, proposals, bundle inventory, and graph relationships.",
      "Output contract: explain the Skill, surface risk, recommend optimizations, and preserve no-write-before-confirmation behavior."
    ],
    risks: [
      ...skill.health.reasons,
      skill.health.signals.runs7d === 0
        ? "No recent runtime evidence is available for reliability assessment."
        : "Runtime evidence exists and should be used before applying changes."
    ],
    optimizationSuggestions: [
      "Keep apply operations preview-first so analysis never silently modifies the original Skill.",
      "Use recent telemetry as the latency and token baseline before accepting optimization work."
    ],
    alternativesAndRelated: [
      skill.governance.preferredHarness === "superpowers"
        ? "Preferred harness: Superpowers for development-oriented execution."
        : "Preferred harness: generic local execution.",
      "Graph Analyzer (repo)",
      "Bundle Publisher (repo)",
      "This preview analysis stays local and does not call a remote model."
    ],
    evidence: {
      healthScore: skill.health.score,
      healthStatus: skill.health.status,
      runs7d: skill.health.signals.runs7d,
      failureRate7d: skill.health.signals.failureRate7d,
      avgDurationMs7d: skill.health.signals.avgDurationMs7d,
      avgTokensPerRun7d: skill.health.signals.avgTokensPerRun7d,
      openProposalCount: skill.health.signals.openProposalCount,
      bundleCount: skill.id === "skill-memory" ? 1 : 0,
      relatedSkillCount: 2
    }
  };
}

function makeRemoteSkillSourceAnalysis(sourceUrl: string): RemoteSkillSourceAnalysis {
  const inputUrl = sourceUrl.trim() || "https://github.com/demo/skill-preview-agent";
  const match = inputUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/?#]+)(?:[/?#].*)?$/i);
  const isGitHub = Boolean(match);
  const owner = match?.[1] ?? "demo";
  const repo = (match?.[2] ?? "skill-preview-agent").replace(/\.git$/i, "");
  const normalizedUrl = isGitHub ? `https://github.com/${owner}/${repo}` : inputUrl;
  const displayName = repo
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

  return {
    id: `remote-preview-${repo}`,
    sourceType: "github",
    sourceUrl,
    normalizedUrl,
    owner: isGitHub ? owner : null,
    repo: isGitHub ? repo : null,
    displayName: isGitHub ? displayName : "Blocked Remote Candidate",
    generatedAt: now,
    riskLevel: isGitHub ? "medium" : "blocked",
    canImport: isGitHub,
    verificationStatus: "unverified",
    checks: isGitHub
      ? [
          { label: "Source URL", status: "pass", summary: "Repository URL uses HTTPS." },
          { label: "Repository Identity", status: "pass", summary: `Parsed repository ${repo}.` },
          { label: "Manifest Detection", status: "warn", summary: "Manifest must be validated before import." },
          { label: "Activation Boundary", status: "pass", summary: "Candidate remains inactive until manual activation." }
        ]
      : [
          { label: "Source URL", status: "block", summary: "Use a full https://github.com/org/repo URL." }
        ],
    activationSteps: [
      "Analyze repository metadata.",
      "Validate manifest and Skill entrypoint.",
      "Import as inactive app-local candidate.",
      "Choose scope and preview impact.",
      "Activate manually after confirmation."
    ],
    importPreview: {
      storageMode: "app_local_copy",
      executionPolicy: "manual_until_activated",
      targetState: "inactive_remote_candidate",
      requiresScopeSelection: true,
      requiresManifestValidation: true
    }
  };
}

const boot: BootstrapState = {
  status: "ready",
  storageRoot,
  databasePath: `${storageRoot}/db/workbench.sqlite`,
  healthScorePolicy: activePreviewHealthScorePolicy,
  policy: {
    id: "policy-preview",
    name: "Preview local policy",
    status: "active",
    telemetryMode: "estimated",
    allowRawContent: false,
    allowBackgroundWatch: false,
    storageRoot,
    createdAt: now,
    updatedAt: now,
    activatedAt: now,
    revokedAt: null
  },
  roots: [
    {
      id: "root-user",
      policyId: "policy-preview",
      path: "/Users/demo/.codex/skills",
      rootType: "user",
      isTrusted: true,
      isEnabled: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "root-repo",
      policyId: "policy-preview",
      path: "/Users/demo/projects/codex-skills/skills",
      rootType: "repo",
      isTrusted: true,
      isEnabled: true,
      createdAt: now,
      updatedAt: now
    }
  ],
  exclusions: [
    {
      id: "exclude-cache",
      policyId: "policy-preview",
      path: "/Users/demo/projects/codex-skills/skills/.cache",
      reason: "preview_cache",
      createdAt: now
    }
  ],
  skills,
  lastScanAt: now
};

const leaders = [
  {
    skillId: "skill-superpowers-dev",
    skillName: "Superpowers Dev Implementer",
    runsCount: 23,
    successCount: 22,
    failureCount: 1,
    avgDurationMs: 1540,
    maxDurationMs: 2980,
    totalTokens: 58420,
    estimatedCostUsd: 0.924
  },
  {
    skillId: "skill-memory",
    skillName: "Memory Governance",
    runsCount: 18,
    successCount: 17,
    failureCount: 1,
    avgDurationMs: 1420,
    maxDurationMs: 3210,
    totalTokens: 42600,
    estimatedCostUsd: 0.684
  },
  {
    skillId: "skill-graph",
    skillName: "Graph Analyzer",
    runsCount: 11,
    successCount: 10,
    failureCount: 1,
    avgDurationMs: 2180,
    maxDurationMs: 4880,
    totalTokens: 31800,
    estimatedCostUsd: 0.512
  },
  {
    skillId: "skill-bundle",
    skillName: "Bundle Publisher",
    runsCount: 7,
    successCount: 7,
    failureCount: 0,
    avgDurationMs: 980,
    maxDurationMs: 1500,
    totalTokens: 12100,
    estimatedCostUsd: 0.194
  }
];

const dailySummary: DailyMetricsSummary = {
  date: "2026-06-05",
  totalRuns: 36,
  successCount: 34,
  failureCount: 2,
  runningCount: 0,
  avgDurationMs: 1660,
  totalPromptTokens: 56200,
  totalCompletionTokens: 30300,
  totalTokens: 86500,
  totalCostUsd: 1.39,
  totalToolCalls: 92,
  slowestSkills: leaders.slice(0, 2).reverse(),
  mostUsedSkills: leaders
};

const weeklySummary: WeeklyMetricsSummary = {
  startDate: "2026-05-30",
  endDate: "2026-06-05",
  windowDays: 7,
  totalRuns: 214,
  successCount: 203,
  failureCount: 11,
  runningCount: 0,
  avgDurationMs: 1830,
  totalPromptTokens: 349000,
  totalCompletionTokens: 188000,
  totalTokens: 537000,
  totalCostUsd: 8.72,
  totalToolCalls: 611,
  slowestSkills: leaders.slice(0, 2).reverse(),
  mostUsedSkills: leaders,
  highestWasteSkills: [
    {
      ...leaders[1],
      failureRate: 0.09,
      avgTokensPerRun: 2891,
      wasteScore: 0.74
    },
    {
      ...leaders[0],
      failureRate: 0.055,
      avgTokensPerRun: 2367,
      wasteScore: 0.51
    }
  ]
};

const recentRuns: SkillRunSummary[] = [
  {
    runId: "run-preview-000",
    skillId: "skill-superpowers-dev",
    skillName: "Superpowers Dev Implementer",
    status: "completed",
    startedAt: "2026-06-05T09:02:00+08:00",
    finishedAt: "2026-06-05T09:02:03+08:00",
    durationMs: 1680,
    totalTokens: 3180,
    estimatedCostUsd: 0.051,
    modelName: "gpt-5",
    toolCallCount: 5,
    captureMode: "estimated",
    sourceType: "preview_log",
    firstOutputLatencyMs: 380
  },
  {
    runId: "run-preview-001",
    skillId: "skill-memory",
    skillName: "Memory Governance",
    status: "completed",
    startedAt: "2026-06-05T08:55:00+08:00",
    finishedAt: "2026-06-05T08:55:02+08:00",
    durationMs: 1740,
    totalTokens: 2650,
    estimatedCostUsd: 0.042,
    modelName: "gpt-5",
    toolCallCount: 4,
    captureMode: "estimated",
    sourceType: "preview_log",
    firstOutputLatencyMs: 420
  },
  {
    runId: "run-preview-002",
    skillId: "skill-graph",
    skillName: "Graph Analyzer",
    status: "completed",
    startedAt: "2026-06-05T08:41:00+08:00",
    finishedAt: "2026-06-05T08:41:04+08:00",
    durationMs: 3920,
    totalTokens: 4180,
    estimatedCostUsd: 0.067,
    modelName: "gpt-5",
    toolCallCount: 6,
    captureMode: "estimated",
    sourceType: "preview_log",
    firstOutputLatencyMs: 610
  },
  {
    runId: "run-preview-003",
    skillId: "skill-bundle",
    skillName: "Bundle Publisher",
    status: "failed",
    startedAt: "2026-06-05T08:15:00+08:00",
    finishedAt: "2026-06-05T08:15:01+08:00",
    durationMs: 910,
    totalTokens: 1320,
    estimatedCostUsd: 0.021,
    modelName: "gpt-4.1",
    toolCallCount: 2,
    captureMode: "estimated",
    sourceType: "preview_log",
    firstOutputLatencyMs: 280
  }
];

const proposals: OptimizationProposal[] = [
  {
    id: "proposal-superpowers-split",
    skillId: "skill-superpowers-dev",
    skillName: "Superpowers Dev Implementer",
    skillVersionId: null,
    proposalType: "workflow",
    severity: "medium",
    status: "open",
    title: "Split implementation and review steps into narrower references",
    summary: "The development Skill is healthy but still mixes planning, implementation, and review guidance into one entry path.",
    estimatedBenefit: "Improve edit precision while preserving the Superpowers development loop.",
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    evidence: [],
    actions: []
  },
  {
    id: "proposal-memory-split",
    skillId: "skill-memory",
    skillName: "Memory Governance",
    skillVersionId: null,
    proposalType: "token_reduction",
    severity: "high",
    status: "open",
    title: "Split long memory policy into scoped references",
    summary: "The memory skill is doing too much first-pass reading. Move durable policy details into targeted references.",
    estimatedBenefit: "Reduce first-turn context by roughly 28% while keeping exact retrieval paths.",
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    evidence: [
      {
        id: "evidence-memory-weekly",
        proposalId: "proposal-memory-split",
        evidenceType: "weekly_metric",
        refId: "skill-memory",
        summary: "Highest weekly token use across active preview skills.",
        metadata: { totalTokens: 219000 },
        createdAt: now
      }
    ],
    actions: [
      {
        id: "action-memory-created",
        proposalId: "proposal-memory-split",
        actionType: "created",
        actorType: "system",
        summary: "Generated from weekly token and line-count evidence.",
        metadata: {},
        createdAt: now
      }
    ]
  },
  {
    id: "proposal-graph-cache",
    skillId: "skill-graph",
    skillName: "Graph Analyzer",
    skillVersionId: null,
    proposalType: "latency",
    severity: "medium",
    status: "accepted",
    title: "Cache graph neighborhood summaries between panel jumps",
    summary: "Repeated panel-to-graph inspection can reuse the loaded graph snapshot instead of deriving the same neighborhood twice.",
    estimatedBenefit: "Improve perceived graph inspection latency for repeated exploration.",
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    evidence: [],
    actions: []
  }
];

const bundles: SkillBundleSummary[] = [
  {
    id: "bundle-memory-001",
    sourceBundleId: "bundle-memory-001",
    lineageKey: "memory-governance",
    bundleName: "Memory Governance Bundle",
    bundleType: "skill_package",
    versionLabel: "v2026.06.05",
    lifecycleState: "current",
    ingestStrategy: "export_snapshot",
    createdAt: now,
    createdFromPolicyId: "policy-preview",
    exportPath: `${storageRoot}/bundles/memory-governance`,
    manifestPath: `${storageRoot}/bundles/memory-governance/bundle.manifest.json`,
    itemCount: 1,
    primarySkillId: "skill-memory",
    primarySkillName: "Memory Governance",
    supersedesBundleId: null,
    supersededByBundleId: null
  },
  {
    id: "bundle-graph-001",
    sourceBundleId: "bundle-graph-001",
    lineageKey: "graph-analyzer",
    bundleName: "Graph Analyzer Bundle",
    bundleType: "skill_package",
    versionLabel: "v2026.06.04",
    lifecycleState: "retained",
    ingestStrategy: "preserve_existing",
    createdAt: "2026-06-04T21:10:00+08:00",
    createdFromPolicyId: "policy-preview",
    exportPath: `${storageRoot}/bundles/graph-analyzer`,
    manifestPath: `${storageRoot}/bundles/graph-analyzer/bundle.manifest.json`,
    itemCount: 1,
    primarySkillId: "skill-graph",
    primarySkillName: "Graph Analyzer",
    supersedesBundleId: null,
    supersededByBundleId: null
  }
];

const graphNodes: GraphNodeSummary[] = [
  { id: "root:root-user", nodeType: "root", refId: "root-user", displayName: "skills", degree: 1, updatedAt: now, metadata: { path: boot.roots[0].path, rootType: "user" } },
  { id: "root:root-repo", nodeType: "root", refId: "root-repo", displayName: "repo skills", degree: 2, updatedAt: now, metadata: { path: boot.roots[1].path, rootType: "repo" } },
  { id: "skill:skill-memory", nodeType: "skill", refId: "skill-memory", displayName: "Memory Governance", degree: 5, updatedAt: now, metadata: { sourcePath: skills[0].sourcePath, sourceType: "user" } },
  { id: "skill:skill-bundle", nodeType: "skill", refId: "skill-bundle", displayName: "Bundle Publisher", degree: 3, updatedAt: now, metadata: { sourcePath: skills[1].sourcePath, sourceType: "repo" } },
  { id: "skill:skill-graph", nodeType: "skill", refId: "skill-graph", displayName: "Graph Analyzer", degree: 5, updatedAt: now, metadata: { sourcePath: skills[2].sourcePath, sourceType: "repo" } },
  { id: "skill:skill-superpowers-dev", nodeType: "skill", refId: "skill-superpowers-dev", displayName: "Superpowers Dev Implementer", degree: 4, updatedAt: now, metadata: { sourcePath: skills[3].sourcePath, sourceType: "repo", preferredHarness: "superpowers" } },
  { id: "model:gpt-5", nodeType: "model", refId: "gpt-5", displayName: "gpt-5", degree: 2, updatedAt: now, metadata: { modelName: "gpt-5" } },
  { id: "model:gpt-4.1", nodeType: "model", refId: "gpt-4.1", displayName: "gpt-4.1", degree: 1, updatedAt: now, metadata: { modelName: "gpt-4.1" } },
  { id: "proposal:proposal-memory-split", nodeType: "proposal", refId: "proposal-memory-split", displayName: "Split long memory policy", degree: 1, updatedAt: now, metadata: { status: "open", severity: "high" } },
  { id: "bundle:bundle-memory-001", nodeType: "bundle", refId: "bundle-memory-001", displayName: "Memory Governance Bundle", degree: 2, updatedAt: now, metadata: { lifecycleState: "current", lineageKey: "memory-governance", itemCount: 1 } },
  { id: "bundle:bundle-graph-001", nodeType: "bundle", refId: "bundle-graph-001", displayName: "Graph Analyzer Bundle", degree: 2, updatedAt: now, metadata: { lifecycleState: "retained", lineageKey: "graph-analyzer", itemCount: 1 } }
];

const graphEdges: GraphEdgeSummary[] = [
  { id: "edge-root-memory", edgeType: "contains", fromNodeId: "root:root-user", toNodeId: "skill:skill-memory", fromDisplayName: "skills", toDisplayName: "Memory Governance", weight: 1, firstSeenAt: now, lastSeenAt: now, metadata: { rootPath: boot.roots[0].path } },
  { id: "edge-root-bundle", edgeType: "contains", fromNodeId: "root:root-repo", toNodeId: "skill:skill-bundle", fromDisplayName: "repo skills", toDisplayName: "Bundle Publisher", weight: 1, firstSeenAt: now, lastSeenAt: now, metadata: { rootPath: boot.roots[1].path } },
  { id: "edge-root-graph", edgeType: "contains", fromNodeId: "root:root-repo", toNodeId: "skill:skill-graph", fromDisplayName: "repo skills", toDisplayName: "Graph Analyzer", weight: 1, firstSeenAt: now, lastSeenAt: now, metadata: { rootPath: boot.roots[1].path } },
  { id: "edge-root-superpowers", edgeType: "contains", fromNodeId: "root:root-repo", toNodeId: "skill:skill-superpowers-dev", fromDisplayName: "repo skills", toDisplayName: "Superpowers Dev Implementer", weight: 1, firstSeenAt: now, lastSeenAt: now, metadata: { rootPath: boot.roots[1].path } },
  { id: "edge-memory-model", edgeType: "uses_model", fromNodeId: "skill:skill-memory", toNodeId: "model:gpt-5", fromDisplayName: "Memory Governance", toDisplayName: "gpt-5", weight: 18, firstSeenAt: now, lastSeenAt: now, metadata: { runs: 18 } },
  { id: "edge-graph-model", edgeType: "uses_model", fromNodeId: "skill:skill-graph", toNodeId: "model:gpt-5", fromDisplayName: "Graph Analyzer", toDisplayName: "gpt-5", weight: 11, firstSeenAt: now, lastSeenAt: now, metadata: { runs: 11 } },
  { id: "edge-bundle-model", edgeType: "uses_model", fromNodeId: "skill:skill-bundle", toNodeId: "model:gpt-4.1", fromDisplayName: "Bundle Publisher", toDisplayName: "gpt-4.1", weight: 7, firstSeenAt: now, lastSeenAt: now, metadata: { runs: 7 } },
  { id: "edge-superpowers-model", edgeType: "uses_model", fromNodeId: "skill:skill-superpowers-dev", toNodeId: "model:gpt-5", fromDisplayName: "Superpowers Dev Implementer", toDisplayName: "gpt-5", weight: 23, firstSeenAt: now, lastSeenAt: now, metadata: { runs: 23, harness: "superpowers" } },
  { id: "edge-memory-proposal", edgeType: "optimized_by", fromNodeId: "skill:skill-memory", toNodeId: "proposal:proposal-memory-split", fromDisplayName: "Memory Governance", toDisplayName: "Split long memory policy", weight: 1, firstSeenAt: now, lastSeenAt: now, metadata: { status: "open", severity: "high" } },
  { id: "edge-superpowers-proposal", edgeType: "optimized_by", fromNodeId: "skill:skill-superpowers-dev", toNodeId: "proposal:proposal-superpowers-split", fromDisplayName: "Superpowers Dev Implementer", toDisplayName: "Split implementation and review steps", weight: 1, firstSeenAt: now, lastSeenAt: now, metadata: { status: "open", severity: "medium" } },
  { id: "edge-memory-bundle", edgeType: "packaged_as", fromNodeId: "skill:skill-memory", toNodeId: "bundle:bundle-memory-001", fromDisplayName: "Memory Governance", toDisplayName: "Memory Governance Bundle", weight: 1, firstSeenAt: now, lastSeenAt: now, metadata: { lifecycleState: "current" } },
  { id: "edge-graph-bundle", edgeType: "packaged_as", fromNodeId: "skill:skill-graph", toNodeId: "bundle:bundle-graph-001", fromDisplayName: "Graph Analyzer", toDisplayName: "Graph Analyzer Bundle", weight: 1, firstSeenAt: now, lastSeenAt: now, metadata: { lifecycleState: "retained" } }
];

const graphSnapshot = {
  generatedAt: now,
  totalNodes: graphNodes.length,
  totalEdges: graphEdges.length,
  nodeTypeCounts: [
    { key: "skill", count: 4 },
    { key: "root", count: 2 },
    { key: "model", count: 2 },
    { key: "proposal", count: 2 },
    { key: "bundle", count: 2 }
  ],
  edgeTypeCounts: [
    { key: "contains", count: 4 },
    { key: "uses_model", count: 4 },
    { key: "packaged_as", count: 2 },
    { key: "optimized_by", count: 2 }
  ],
  nodes: graphNodes,
  edges: graphEdges
};

const backups: LocalBackupSummary[] = [
  {
    backupId: "backup-preview-001",
    schemaVersion: "1",
    createdAt: "2026-06-05T08:50:00+08:00",
    backupPath: `${storageRoot}/backups/backup-preview-001`,
    manifestPath: `${storageRoot}/backups/backup-preview-001/backup.manifest.json`,
    storageRoot,
    policyId: "policy-preview",
    totalFiles: 28,
    totalBytes: 834112,
    areaCount: 4,
    excludedRelativePaths: ["backups"],
    areas: [
      { area: "config", relativePath: "config", totalFiles: 4, totalBytes: 10240, topLevelEntries: ["policy.json"] },
      { area: "db", relativePath: "db", totalFiles: 2, totalBytes: 602112, topLevelEntries: ["workbench.sqlite"] },
      { area: "events", relativePath: "events", totalFiles: 9, totalBytes: 81120, topLevelEntries: ["telemetry.jsonl"] },
      { area: "bundles", relativePath: "bundles", totalFiles: 13, totalBytes: 140640, topLevelEntries: ["memory-governance"] }
    ]
  }
];

const auditEvents: LocalAuditEvent[] = [
  {
    id: "audit-preview-authorization",
    policyId: "policy-preview",
    eventType: "authorization.granted",
    eventSummary: "Authorized 2 scan root(s) with telemetry mode estimated.",
    actorType: "user",
    createdAt: "2026-06-05T08:00:00+08:00",
    metadata: { scanRoots: boot.roots.map((root) => root.path), scanExclusions: boot.exclusions.map((entry) => entry.path), telemetryMode: "estimated" }
  },
  {
    id: "audit-preview-bundle",
    policyId: "policy-preview",
    eventType: "bundle.created",
    eventSummary: "Created bundle Memory Governance Bundle with 1 packaged skill.",
    actorType: "system",
    createdAt: now,
    metadata: { bundleId: "bundle-memory-001", itemCount: 1, lifecycleState: "current" }
  }
];

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), 80);
  });
}

function connectedEdges(nodeId: string) {
  return graphEdges.filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId);
}

function uniqueNodesForEdges(edges: GraphEdgeSummary[]) {
  const ids = new Set(edges.flatMap((edge) => [edge.fromNodeId, edge.toNodeId]));
  return graphNodes.filter((node) => ids.has(node.id));
}

function makeNeighborhood(nodeId: string): GraphNeighborhood {
  const edges = connectedEdges(nodeId);
  const nodes = uniqueNodesForEdges(edges);
  return {
    centerNodeId: nodeId,
    centerNode: graphNodes.find((node) => node.id === nodeId) ?? null,
    generatedAt: graphSnapshot.generatedAt,
    totalNodeCount: nodes.length,
    totalEdgeCount: edges.length,
    hiddenNodeCount: 0,
    hiddenEdgeCount: 0,
    nodes,
    edges
  };
}

function makePathTrace(nodeId: string): GraphPathTrace {
  const centerNode = graphNodes.find((node) => node.id === nodeId) ?? null;
  const paths = connectedEdges(nodeId).slice(0, 5).map((edge) => {
    const targetId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId;
    const targetNode = graphNodes.find((node) => node.id === targetId) ?? graphNodes[0];
    return {
      targetNode,
      nodes: centerNode ? [centerNode, targetNode] : [targetNode],
      edges: [edge],
      hopCount: 1,
      aggregateWeight: edge.weight
    };
  });
  const targetTypeCounts = Array.from(
    paths.reduce((counts, path) => {
      counts.set(path.targetNode.nodeType, (counts.get(path.targetNode.nodeType) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())
  ).map(([key, count]) => ({ key, count }));

  return {
    centerNodeId: nodeId,
    centerNode,
    generatedAt: graphSnapshot.generatedAt,
    maxDepth: 3,
    pathLimit: 5,
    totalCandidateCount: paths.length,
    truncated: false,
    targetTypeCounts,
    paths
  };
}

const manifest = {
  schemaVersion: "1",
  bundleId: bundles[0].id,
  bundleName: bundles[0].bundleName,
  bundleType: "skill_package" as const,
  versionLabel: bundles[0].versionLabel,
  createdAt: bundles[0].createdAt,
  exportRoot: ".",
  entrypoint: "skill/SKILL.md",
  exportedFrom: { policyId: "policy-preview", storageRoot },
  dependencySummary: {
    totalFiles: 6,
    topLevelEntries: ["skill", "references"],
    directories: ["skill", "references"],
    hasScripts: false,
    hasReferences: true,
    hasAssets: false
  },
  items: [
    {
      itemType: "skill",
      refId: "skill-memory",
      displayName: "Memory Governance",
      relativeSourcePath: "memory-governance",
      relativeExportPath: "skill",
      versionFingerprint: "mem-8f42c1",
      sourceType: "user",
      metadata: {}
    }
  ]
};

function makeBundleValidation(): SkillBundleValidationResult {
  return {
    manifestPath: `${storageRoot}/preview/bundle.manifest.json`,
    bundleRoot: `${storageRoot}/preview`,
    canImport: true,
    manifest,
    issues: [],
    existingBundle: bundles[0],
    matchingSkill: {
      skillId: "skill-memory",
      skillName: "Memory Governance",
      sourcePath: skills[0].sourcePath,
      currentVersionFingerprint: "mem-8f42c1",
      sameVersionFingerprint: true
    },
    diff: {
      classification: "safe_update",
      title: "Preview bundle matches the indexed skill",
      summary: "The incoming manifest lines up with the local skill fingerprint.",
      reasons: ["Same primary skill", "No removed dependency directories"],
      comparedBundle: bundles[0],
      versionDelta: "same",
      comparedBundleFingerprintDelta: "same",
      localSkillFingerprintDelta: "same",
      incomingFingerprint: "mem-8f42c1",
      storedBundleFingerprint: "mem-8f42c1",
      localSkillFingerprint: "mem-8f42c1",
      itemDelta: { added: [], removed: [], changed: [], unchangedCount: 1 },
      dependencyDelta: {
        totalFilesDelta: 0,
        addedTopLevelEntries: [],
        removedTopLevelEntries: [],
        addedDirectories: [],
        removedDirectories: []
      }
    },
    recommendedStrategy: "preserve_existing",
    availableStrategies: ["preserve_existing", "supersede_current"],
    discoveredFileCount: 6
  };
}

function makeApplyPreview(input: SkillApplyPreviewInput): SkillApplyPreview {
  if (input.remoteCandidateId) {
    const candidate = previewRemoteCandidates.find((entry) => entry.candidateId === input.remoteCandidateId);
    if (!candidate) {
      throw new Error("Import the remote Skill before previewing apply impact.");
    }

    const remoteTarget = {
      system: {
        targetLabel: "Remote candidate system-scope target preview",
        targetPath: storageRoot,
        projects: 2,
        folders: 2,
        workspaces: 2,
        requiresBackupRecommendation: true
      },
      workspace: {
        targetLabel: "Remote candidate workspace target preview",
        targetPath: boot.roots[0]?.path ?? null,
        projects: 2,
        folders: 2,
        workspaces: 1,
        requiresBackupRecommendation: true
      },
      project: {
        targetLabel: "Remote candidate project target preview",
        targetPath: boot.roots[1]?.path ?? boot.roots[0]?.path ?? null,
        projects: 1,
        folders: 1,
        workspaces: 0,
        requiresBackupRecommendation: false
      },
      folder: {
        targetLabel: "Remote candidate folder target preview",
        targetPath: boot.roots[1]?.path ?? boot.roots[0]?.path ?? null,
        projects: 0,
        folders: 1,
        workspaces: 0,
        requiresBackupRecommendation: false
      }
    } satisfies Record<SkillApplyPreviewInput["scope"], {
      targetLabel: string;
      targetPath: string | null;
      projects: number;
      folders: number;
      workspaces: number;
      requiresBackupRecommendation: boolean;
    }>;
    const target = remoteTarget[input.scope];
    return {
      id: `remote-apply-preview-${input.scope}-${candidate.candidateId}`,
      skillId: null,
      sourceKind: "remote_candidate",
      remoteCandidateId: candidate.candidateId,
      skillName: candidate.displayName,
      scope: input.scope,
      generatedAt: now,
      targetLabel: target.targetLabel,
      targetPath: target.targetPath,
      conflictPolicy: "preview_diff_first",
      remoteSkillPolicy: "activation_required",
      readyForConfirmation: false,
      requiresBackupRecommendation: target.requiresBackupRecommendation,
      impact: {
        projects: target.projects,
        folders: target.folders,
        workspaces: target.workspaces,
        pendingWrites: 0
      },
      previewSteps: [
        "Review imported inactive remote candidate.",
        "Confirm activation preview has run.",
        "Choose the narrowest safe scope.",
        "Preview target impact and diff before any write.",
        "Confirm manually only after manifest validation."
      ],
      warnings: [
        "Manifest validation and diff preview are required before any write.",
        target.requiresBackupRecommendation
          ? "Broad remote candidate scope requires backup and extra review."
          : "Project/folder scope is safer for first activation."
      ]
    };
  }

  const skill = skills.find((entry) => entry.id === input.skillId) ?? skills[0];
  const scopeTargets = {
    system: {
      targetLabel: "Current user system profile",
      targetPath: storageRoot,
      projects: 3,
      folders: 2,
      workspaces: 2,
      pendingWrites: 3,
      requiresBackupRecommendation: true
    },
    workspace: {
      targetLabel: "Approved workspace root",
      targetPath: boot.roots[0]?.path ?? null,
      projects: 2,
      folders: 2,
      workspaces: 1,
      pendingWrites: 2,
      requiresBackupRecommendation: true
    },
    project: {
      targetLabel: "Active project root",
      targetPath: boot.roots[1]?.path ?? boot.roots[0]?.path ?? null,
      projects: 1,
      folders: 2,
      workspaces: 0,
      pendingWrites: 1,
      requiresBackupRecommendation: false
    },
    folder: {
      targetLabel: "Current folder only",
      targetPath: boot.roots[1]?.path ?? boot.roots[0]?.path ?? null,
      projects: 0,
      folders: 1,
      workspaces: 0,
      pendingWrites: 1,
      requiresBackupRecommendation: false
    }
  } satisfies Record<SkillApplyPreviewInput["scope"], {
    targetLabel: string;
    targetPath: string | null;
    projects: number;
    folders: number;
    workspaces: number;
    pendingWrites: number;
    requiresBackupRecommendation: boolean;
  }>;
  const target = scopeTargets[input.scope];
  return {
    id: `apply-preview-${input.scope}-${skill.id}`,
    skillId: skill.id,
    sourceKind: "local_skill",
    remoteCandidateId: null,
    skillName: skill.displayName,
    scope: input.scope,
    generatedAt: now,
    targetLabel: target.targetLabel,
    targetPath: target.targetPath,
    conflictPolicy: "preview_diff_first",
    remoteSkillPolicy: "activation_required",
    readyForConfirmation: true,
    requiresBackupRecommendation: target.requiresBackupRecommendation,
    impact: {
      projects: target.projects,
      folders: target.folders,
      workspaces: target.workspaces,
      pendingWrites: target.pendingWrites
    },
    previewSteps: [
      "Select Skill and scope.",
      "Resolve target path inside approved local boundaries.",
      "Preview file and policy changes.",
      "Create backup if the scope is broad.",
      "Confirm manually before any write."
    ],
    warnings: target.requiresBackupRecommendation
      ? ["Create or verify a local backup before confirming broad-scope apply."]
      : []
  };
}

function makeMarketplaceCatalog(query = ""): RemoteMarketplaceCatalog {
  const catalog: RemoteMarketplaceCatalog = {
    generatedAt: now,
    query: query.trim(),
    sourceMode: "bundled_local_catalog",
    collections: [
      { key: "featured", label: "Featured", labelZh: "精选", count: 18, tone: "marketplace" },
      { key: "trending", label: "Trending", labelZh: "趋势", count: 42, tone: "workflow" },
      { key: "verified", label: "Verified", labelZh: "已验证", count: 27, tone: "agent" },
      { key: "enterprise", label: "Enterprise", labelZh: "企业", count: 11, tone: "project" },
      { key: "recent", label: "Recently Updated", labelZh: "最近更新", count: 33, tone: "skill" },
      { key: "installed", label: "Most Installed", labelZh: "安装最多", count: 64, tone: "bundle" }
    ],
    skills: [
      {
        id: "repo-skill-import",
        name: "Repo Skill Import",
        description: "Detect manifests and Skill files from a GitHub repository.",
        descriptionZh: "从 GitHub 仓库检测清单和 Skill 文件。",
        author: "open-source",
        source: "GitHub",
        sourceUrl: "https://github.com/example/repo-skill-import",
        tags: ["import", "manifest", "risk"],
        downloadsLabel: "12.4k",
        ratingLabel: "4.7",
        healthScore: 84,
        trustScore: 72,
        riskLabel: "Medium",
        riskLabelZh: "中",
        dependencyCount: 3,
        updatedLabel: "2 days ago",
        updatedLabelZh: "2 天前",
        verificationStatus: "review_required",
        statusLabel: "Risk check required",
        statusLabelZh: "需要风险检查",
        collectionKeys: ["featured", "recent"]
      },
      {
        id: "marketplace-verified",
        name: "Marketplace Verified",
        description: "Curated Skill package with verification metadata.",
        descriptionZh: "带验证元数据的精选 Skill 包。",
        author: "Skill Market",
        source: "Marketplace",
        sourceUrl: "skill-market://verified/marketplace-verified",
        tags: ["verified", "starter", "safe"],
        downloadsLabel: "8.9k",
        ratingLabel: "4.9",
        healthScore: 94,
        trustScore: 91,
        riskLabel: "Low",
        riskLabelZh: "低",
        dependencyCount: 1,
        updatedLabel: "Today",
        updatedLabelZh: "今天",
        verificationStatus: "verified",
        statusLabel: "Activation required",
        statusLabelZh: "需要激活",
        collectionKeys: ["featured", "verified", "installed"]
      },
      {
        id: "trending-automation",
        name: "Trending Automation",
        description: "Popular automation Skill ready for preview and analysis.",
        descriptionZh: "热门自动化 Skill，可预览和分析。",
        author: "community",
        source: "Marketplace",
        sourceUrl: "skill-market://trending/trending-automation",
        tags: ["workflow", "agent", "popular"],
        downloadsLabel: "5.1k",
        ratingLabel: "4.6",
        healthScore: 76,
        trustScore: 68,
        riskLabel: "Review",
        riskLabelZh: "需审查",
        dependencyCount: 5,
        updatedLabel: "6 days ago",
        updatedLabelZh: "6 天前",
        verificationStatus: "review_required",
        statusLabel: "Preview only",
        statusLabelZh: "仅预览",
        collectionKeys: ["trending"]
      }
    ]
  };

  const normalizedQuery = query.trim().toLowerCase();
  return {
    ...catalog,
    skills: catalog.skills.filter((skill) => {
      if (!normalizedQuery) {
        return true;
      }
      return [
        skill.name,
        skill.description,
        skill.descriptionZh,
        skill.author,
        skill.source,
        skill.riskLabel,
        skill.riskLabelZh,
        skill.statusLabel,
        skill.statusLabelZh,
        ...skill.tags
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
  };
}

function findPreviewMarketplaceSkill(skillId: string) {
  return makeMarketplaceCatalog().skills.find((skill) => skill.id === skillId) ?? null;
}

function previewMarketplaceRiskLevel(skill: NonNullable<ReturnType<typeof findPreviewMarketplaceSkill>>) {
  const risk = `${skill.riskLabel} ${skill.riskLabelZh}`.toLowerCase();
  if (risk.includes("high") || risk.includes("高")) {
    return "high" as const;
  }
  if (risk.includes("medium") || risk.includes("review") || risk.includes("中") || risk.includes("审查")) {
    return "medium" as const;
  }
  return "low" as const;
}

function makePreviewMarketplaceImport(skillId: string): RemoteSkillImportResult {
  const skill = findPreviewMarketplaceSkill(skillId);
  if (!skill) {
    throw new Error("Marketplace Skill was not found in the bundled local catalog.");
  }

  const result: RemoteSkillImportResult = {
    candidateId: `remote-preview-${skill.id}`,
    catalogSkillId: skill.id,
    sourceType: skill.source === "GitHub" ? "github" : "marketplace",
    sourceUrl: skill.sourceUrl,
    normalizedUrl: skill.sourceUrl,
    displayName: skill.name,
    importedAt: new Date().toISOString(),
    status: "inactive_remote_candidate",
    storageMode: "app_local_copy",
    executionPolicy: "manual_until_activated",
    riskLevel: previewMarketplaceRiskLevel(skill),
    verificationStatus: skill.verificationStatus,
    nextSteps: [
      "Review the imported inactive candidate.",
      "Open activation preview.",
      "Choose scope in Apply Center.",
      "Confirm manually before any execution."
    ]
  };

  const candidate: RemoteSkillCandidateSummary = {
    candidateId: result.candidateId,
    catalogSkillId: result.catalogSkillId,
    sourceType: result.sourceType,
    sourceUrl: result.sourceUrl,
    normalizedUrl: result.normalizedUrl,
    displayName: result.displayName,
    importedAt: result.importedAt,
    activationPreviewedAt: null,
    status: "inactive_remote_candidate",
    riskLevel: result.riskLevel,
    verificationStatus: result.verificationStatus,
    canImport: true,
    willRunNow: false,
    nextStep: "preview_activation"
  };
  previewRemoteCandidates = [
    candidate,
    ...previewRemoteCandidates.filter((entry) => entry.candidateId !== candidate.candidateId)
  ].slice(0, 24);

  return result;
}

function makePreviewRemoteActivation(candidateId: string): RemoteSkillActivationPreview {
  const catalogSkillId = candidateId.replace(/^remote-preview-/, "");
  const skill = findPreviewMarketplaceSkill(catalogSkillId);
  if (!skill) {
    throw new Error("Remote candidate must be imported before activation preview.");
  }

  const preview: RemoteSkillActivationPreview = {
    candidateId,
    catalogSkillId: skill.id,
    displayName: skill.name,
    previewedAt: new Date().toISOString(),
    status: "activation_preview",
    canActivateAfterConfirmation: true,
    willRunNow: false,
    scopeRequired: true,
    targetPreviewRequired: true,
    recommendedScope: "project",
    scopeOptions: ["system", "workspace", "project", "folder"],
    requiredSteps: [
      "Inactive candidate is stored locally.",
      "Choose the narrowest safe scope.",
      "Preview target impact and pending writes.",
      "Review risk, verification, and dependency signals.",
      "Confirm activation manually."
    ],
    boundarySummary:
      "Activation is ready for a manual scope and target-preview decision; no execution has run."
  };
  previewRemoteCandidates = previewRemoteCandidates.map((entry) =>
    entry.candidateId === candidateId
      ? {
          ...entry,
          activationPreviewedAt: preview.previewedAt,
          status: "activation_previewed",
          nextStep: "open_apply_center"
        }
      : entry
  );
  return preview;
}

function makePreviewRemoteCandidateDetail(candidateId: string): RemoteSkillCandidateDetail {
  const candidate = previewRemoteCandidates.find((entry) => entry.candidateId === candidateId);
  if (!candidate) {
    throw new Error("Remote candidate detail is available only after import.");
  }

  const catalogSkillId = candidate.catalogSkillId ?? candidateId.replace(/^remote-preview-/, "");
  const skill = findPreviewMarketplaceSkill(catalogSkillId);
  return {
    candidate,
    generatedAt: candidate.importedAt,
    sourceOwner: skill?.source === "Marketplace" ? "Skill Market" : null,
    sourceRepo: skill?.id ?? candidate.catalogSkillId,
    checks: [
      {
        label: "Catalog Candidate",
        status: "pass",
        summary: `${candidate.displayName} was imported from the bundled local catalog.`
      },
      {
        label: "Verification Metadata",
        status: candidate.verificationStatus === "verified" ? "pass" : "warn",
        summary:
          candidate.verificationStatus === "verified"
            ? "Catalog metadata marks this candidate as verified."
            : "Catalog metadata requires review before activation."
      },
      {
        label: "Manifest Detection",
        status: "warn",
        summary: "Manifest files are not fetched in browser preview; validate before activation."
      },
      {
        label: "Activation Boundary",
        status: "pass",
        summary: "Activation requires scope selection, target preview, and explicit confirmation."
      }
    ],
    activationSteps: [
      "Review inactive candidate metadata.",
      "Preview activation locally.",
      "Choose the narrowest safe scope.",
      "Preview target impact before any write.",
      "Confirm manually."
    ],
    manifestPreview: {
      status: "warn",
      summary: "Manifest validation is still required before activation.",
      requiresValidation: true
    },
    dependencyPreview: {
      dependencyCount: skill?.dependencyCount ?? null,
      tags: skill?.tags ?? [],
      summary:
        typeof skill?.dependencyCount === "number"
          ? `${skill.dependencyCount} dependency signal(s) are available from the bundled catalog metadata.`
          : "Dependency metadata is not available until manifest validation runs."
    },
    diffPreview: {
      status: "preview_required",
      summary:
        "Diff preview is required before any remote candidate writes into a project, workspace, folder, or system scope.",
      changedFiles: null
    },
    catalogSignals: {
      author: skill?.author ?? null,
      healthScore: skill?.healthScore ?? null,
      trustScore: skill?.trustScore ?? null,
      downloadsLabel: skill?.downloadsLabel ?? null,
      ratingLabel: skill?.ratingLabel ?? null,
      updatedLabel: skill?.updatedLabel ?? null
    },
    safetyBoundaries: [
      "Stored locally as an inactive remote candidate.",
      "No remote code has been fetched or executed by this detail view.",
      "Activation requires scope selection, target preview, and explicit manual confirmation.",
      "Candidate can proceed to preview gates."
    ]
  };
}

export function createPreviewWorkbenchApi(): WorkbenchApi {
  return {
    bootstrap: () =>
      delay({
        ...boot,
        healthScorePolicy: activePreviewHealthScorePolicy
      }),
    pickDirectory: () => delay(nextPreviewDirectory()),
    pickTelemetryFile: () => delay("/Users/demo/Downloads/sample-telemetry.jsonl"),
    pickBackupManifest: () => delay(backups[0].manifestPath),
    pickBundleManifest: () => delay(`${storageRoot}/preview/bundle.manifest.json`),
    grantAuthorization: (_input: AuthorizationInput) => delay(boot),
    listAuditEvents: (limit = 12) => delay(auditEvents.slice(0, limit)),
    createBackup: () => delay(backups[0]),
    listBackups: (limit = 8) => delay(backups.slice(0, limit)),
    validateBackupManifest: (_manifestPath: string) => {
      const validation: LocalBackupValidationResult = {
        manifestPath: backups[0].manifestPath,
        backupRoot: backups[0].backupPath,
        canRestore: true,
        manifest: {
          ...backups[0],
          source: {
            configDir: `${storageRoot}/config`,
            dbDir: `${storageRoot}/db`,
            databasePath: `${storageRoot}/db/workbench.sqlite`,
            eventsDir: `${storageRoot}/events`,
            bundlesDir: `${storageRoot}/bundles`
          }
        },
        issues: [],
        areaChecks: backups[0].areas.map((area) => ({
          area: area.area,
          relativePath: area.relativePath,
          exists: true,
          manifestFiles: area.totalFiles,
          actualFiles: area.totalFiles,
          manifestBytes: area.totalBytes,
          actualBytes: area.totalBytes
        })),
        expectedAreaCount: 4,
        presentAreaCount: 4,
        expectedTotalFiles: backups[0].totalFiles,
        actualTotalFiles: backups[0].totalFiles,
        expectedTotalBytes: backups[0].totalBytes,
        actualTotalBytes: backups[0].totalBytes,
        storageRootMatchesCurrent: true,
        policyMatchesCurrent: true,
        backupAgeDays: 0
      };
      return delay(validation);
    },
    previewBackupRestoreImpact: async (manifestPath: string) => {
      const validation = await thisApi.validateBackupManifest(manifestPath);
      const impact: LocalBackupRestoreImpactResult = {
        manifestPath,
        previewGeneratedAt: now,
        comparisonMode: "replace_area",
        targetStorageRoot: storageRoot,
        validation,
        readyForManualRestore: true,
        totalBackupFileCount: 28,
        totalCurrentFileCount: 26,
        totalChangedFileCount: 3,
        totalUnchangedFileCount: 23,
        totalAddedFileCount: 2,
        totalRemovedFileCount: 0,
        destructiveAreaCount: 0,
        areas: backups[0].areas.map((area) => ({
          area: area.area,
          backupRelativePath: area.relativePath,
          targetPath: `${storageRoot}/${area.relativePath}`,
          backupFileCount: area.totalFiles,
          currentFileCount: Math.max(area.totalFiles - 1, 0),
          changedFileCount: area.area === "db" ? 2 : 0,
          unchangedFileCount: Math.max(area.totalFiles - 2, 0),
          addedFileCount: area.area === "bundles" ? 2 : 0,
          removedFileCount: 0,
          sampleChangedPaths: area.area === "db" ? ["workbench.sqlite"] : [],
          sampleAddedPaths: area.area === "bundles" ? ["memory-governance/SKILL.md"] : [],
          sampleRemovedPaths: []
        }))
      };
      return delay(impact);
    },
    scanSkills: () =>
      delay({
        scanRunId: "scan-preview",
        filesSeen: 3,
        skillsFound: 3,
        skillsChanged: 1,
        errorCount: 0,
        excludedPathCount: 1,
        skippedEntryCount: 4,
        completedAt: now,
        skills
      }),
    listSkills: () => delay(skills),
    generateSkillAnalysis: (skillId: string) => delay(makeSkillAnalysis(skillId)),
    getLatestSkillAnalysis: (skillId: string) => delay(makeSkillAnalysis(skillId)),
    analyzeRemoteSkillSource: (sourceUrl: string) => delay(makeRemoteSkillSourceAnalysis(sourceUrl)),
    importMarketplaceSkill: (skillId: string) => delay(makePreviewMarketplaceImport(skillId)),
    previewRemoteSkillActivation: (candidateId: string) =>
      delay(makePreviewRemoteActivation(candidateId)),
    listRemoteSkillCandidates: () => delay(previewRemoteCandidates),
    getRemoteSkillCandidateDetail: (candidateId: string) =>
      delay(makePreviewRemoteCandidateDetail(candidateId)),
    getHealthScorePolicy: () => delay(activePreviewHealthScorePolicy),
    updateHealthScorePolicy: (input: SkillHealthScorePolicyInput) => {
      activePreviewHealthScorePolicy = {
        ...previewHealthScorePolicies[input.preset],
        updatedAt: new Date().toISOString()
      };
      return delay(activePreviewHealthScorePolicy);
    },
    previewSkillApply: (input: SkillApplyPreviewInput) => delay(makeApplyPreview(input)),
    listMarketplaceCatalog: (query?: string) => delay(makeMarketplaceCatalog(query)),
    importTelemetryFile: (filePath: string) =>
      delay({
        filePath,
        importedAt: now,
        linesRead: 144,
        processedEvents: 132,
        ignoredEvents: 12,
        importedRuns: 9,
        updatedRuns: 3,
        affectedSkills: 2,
        affectedSkillIds: ["skill-memory", "skill-graph"],
        observedModelNames: ["gpt-5"],
        errorCount: 0,
        errors: []
      }),
    listRecentRuns: (limit = 12) => delay(recentRuns.slice(0, limit)),
    getDailySummary: () => delay(dailySummary),
    getWeeklySummary: () => delay(weeklySummary),
    refreshOptimizationProposals: () =>
      delay({
        generatedAt: now,
        date: "2026-06-05",
        createdCount: 1,
        updatedCount: 1,
        resolvedCount: 0,
        skippedCount: 0,
        proposals
      }),
    listOptimizationProposals: (status: OptimizationProposalStatus | "all" = "all") =>
      delay(status === "all" ? proposals : proposals.filter((proposal) => proposal.status === status)),
    updateOptimizationProposalStatus: (proposalId: string, status: OptimizationProposalStatus) =>
      delay({
        ...(proposals.find((proposal) => proposal.id === proposalId) ?? proposals[0]),
        status,
        updatedAt: now,
        closedAt: status === "open" ? null : now
      }),
    refreshGraph: () => delay(graphSnapshot),
    getGraphSnapshot: () => delay(graphSnapshot),
    getGraphNeighborhood: (nodeId: string) => delay(makeNeighborhood(nodeId)),
    getGraphPathTrace: (nodeId: string) => delay(makePathTrace(nodeId)),
    listBundles: () => delay(bundles),
    exportSkillBundle: (input: SkillBundleExportInput): Promise<SkillBundleExportResult> =>
      delay({
        bundle: {
          ...bundles[0],
          bundleName: input.bundleName || bundles[0].bundleName,
          primarySkillId: input.skillId,
          primarySkillName: skills.find((skill) => skill.id === input.skillId)?.displayName ?? "Preview Skill"
        },
        manifest,
        copiedFileCount: 6
      }),
    validateSkillBundleImport: (_manifestPath: string) => delay(makeBundleValidation()),
    importSkillBundle: async (_input: SkillBundleImportInput): Promise<SkillBundleImportResult> => {
      const validation = makeBundleValidation();
      return delay({
        bundle: bundles[1],
        manifest,
        importedAt: now,
        copiedFileCount: 6,
        appliedStrategy: "preserve_existing",
        validation
      });
    }
  };
}

const thisApi = createPreviewWorkbenchApi();
