#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const templateRoot = join(rootDir, "assets", "template-root");

const coreRequiredPaths = [
  "AGENTS.md",
  ".agents/skills/project-requirement-gate/SKILL.md",
  ".agents/skills/project-codebase-onboarding/SKILL.md",
  ".agents/skills/project-scope-impact-guard/SKILL.md",
  ".agents/skills/project-tech-solution/SKILL.md",
  ".agents/skills/project-superpowers-router/SKILL.md",
  ".agents/skills/project-gsd-router/SKILL.md",
  ".agents/skills/project-gstack-router/SKILL.md",
  ".agents/skills/project-stack-standards/SKILL.md",
  ".agents/skills/project-code-generation/SKILL.md",
  ".agents/skills/project-code-review/SKILL.md",
  ".agents/skills/project-test-and-report/SKILL.md",
  ".agents/skills/project-dev-core/SKILL.md",
  ".agents/skills/project-frontend-standards/SKILL.md",
  ".agents/skills/project-frontend-js/SKILL.md",
  ".agents/skills/project-frontend-react/SKILL.md",
  ".agents/skills/project-frontend-vue/SKILL.md",
  ".agents/skills/project-frontend-css/SKILL.md",
  ".agents/skills/project-security-review/SKILL.md",
  ".agents/skills/project-verification-loop/SKILL.md",
  ".agents/skills/project-session-summary/SKILL.md",
  ".agents/skills/project-skill-upgrade-advisor/SKILL.md",
  ".specify/memory/constitution.md",
  ".specify/memory/session-history.md",
  ".specify/memory/skill-upgrade-backlog.md",
  ".specify/templates/spec-template.md",
  ".specify/templates/plan-template.md",
  ".specify/templates/tasks-template.md",
  ".specify/templates/quickstart-template.md",
  ".specify/templates/workflow-state-template.yaml",
  ".specify/templates/checklist-template.md",
  ".specify/scripts/bash/create-feature.sh",
  ".specify/scripts/bash/validate-workflow.sh",
  "docs/Codex团队开发说明.md",
  "docs/ClaudeCode团队开发说明.md",
  "docs/AI协作架构.md",
  "specs"
];

const currentVersionMarker = ".specify/workflow-version.txt";
const currentTemplateWorkflowVersion = readFileSync(join(templateRoot, currentVersionMarker), "utf8").trim();
const memoryStoreRelativeDir = ".specify/memory-store";
const memoryIndexRelativePath = `${memoryStoreRelativeDir}/index.json`;
const memoryIndexVersion = "1.0.0";
const validMemoryTypes = new Set([
  "fact",
  "preference",
  "behavior_pattern",
  "relationship",
  "decision",
  "session_summary"
]);
const validMemoryDataRoles = new Set([
  "identity_context",
  "user_preference",
  "account_reference",
  "infrastructure_reference",
  "development_workflow",
  "project_fact",
  "governance_decision",
  "verification_evidence",
  "blocked_sensitive"
]);
const validMemoryStatuses = new Set([
  "pending_confirm",
  "active",
  "archived",
  "revoked"
]);

const v020OptionalPaths = [
  ".agents/skills/project-memory-router/SKILL.md",
  ".agents/skills/project-evolution-router/SKILL.md",
  ".specify/memory/memory-policy.md",
  ".specify/memory/evolution-policy.md",
  ".specify/memory/evolution-prefill-policy.md",
  ".specify/memory/evolution-draft-protocol.md",
  ".specify/memory/reflection-output-protocol.md",
  ".specify/memory/final-output-protocol.md",
  ".specify/memory-store/README.md",
  ".specify/memory-store/schema-version.json",
  ".specify/memory-store/index.json",
  ".specify/memory-store/memory-record.schema.json",
  ".specify/memory-store/memory-index.schema.json",
  ".specify/templates/delivery-summary-template.md",
  ".specify/templates/reflection-template.md",
  ".specify/templates/rule-change-template.md",
  "docs/升级兼容策略.md",
  "docs/AI能力地图.md"
];

const branchReleaseOptionalPaths = [
  ".agents/skills/project-branch-release/SKILL.md",
  ".specify/release/release-policy.md",
  ".specify/scripts/bash/create-feature-branch.sh",
  ".specify/scripts/bash/prepare-release.sh",
  ".specify/scripts/bash/finalize-release.sh",
  ".specify/scripts/bash/release-doctor.sh",
  ".specify/templates/release-checklist-template.md",
  ".specify/templates/release-notes-template.md"
];

const v040ProgressiveReferencePaths = [
  ".agents/skills/project-memory-router/references/memory-governance.md",
  ".agents/skills/project-memory-router/references/memory-data-roles.md",
  ".agents/skills/project-memory-router/references/memory-retention-retrieval.md",
  ".agents/skills/project-memory-router/references/memory-conflict-session.md",
  ".agents/skills/project-evolution-router/references/evolution-governance.md",
  ".agents/skills/project-superpowers-router/references/ui-automation-contract.md",
  ".agents/skills/project-superpowers-router/references/implementation-contract.md",
  ".agents/skills/project-superpowers-router/references/review-contract.md"
];

const workflowOptionalPathsByVersion = {
  "0.2.0": [...v020OptionalPaths],
  "0.2.1": [...v020OptionalPaths],
  "0.3.0": [...v020OptionalPaths, ...branchReleaseOptionalPaths.filter((path) => path !== ".specify/scripts/bash/release-doctor.sh")],
  "0.3.1": [...v020OptionalPaths, ...branchReleaseOptionalPaths],
  "0.4.0": [...v020OptionalPaths, ...branchReleaseOptionalPaths, ...v040ProgressiveReferencePaths]
};

const upgradeOptionalPaths = [...v020OptionalPaths, ...branchReleaseOptionalPaths, ...v040ProgressiveReferencePaths];

const workflowContentContracts = [
  {
    maxVersion: "0.3.1",
    path: ".agents/skills/project-superpowers-router/SKILL.md",
    label: "Legacy superpowers router UI interaction contract",
    requiredSnippets: [
      "Frontend / UI Interaction Contract",
      "problem collection",
      "Do not report a full UI pass from static checks alone"
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-superpowers-router/SKILL.md",
    label: "Superpowers router progressive disclosure link",
    requiredSnippets: [
      "references/ui-automation-contract.md",
      "references/implementation-contract.md",
      "references/review-contract.md",
      "Keep this file as the routing entry only"
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-superpowers-router/references/ui-automation-contract.md",
    label: "Superpowers router UI interaction contract",
    requiredSnippets: [
      "UI Automation Contract",
      "problem collection",
      "Do not report a full UI pass from static checks alone"
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-superpowers-router/references/implementation-contract.md",
    label: "Superpowers router implementation contract",
    requiredSnippets: [
      "Implementation Contract",
      "Keep implementation separate from review"
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-superpowers-router/references/review-contract.md",
    label: "Superpowers router review contract",
    requiredSnippets: [
      "Review Contract",
      "accepted` means the direction is approved"
    ]
  },
  {
    path: ".agents/skills/project-test-and-report/SKILL.md",
    label: "Test report UI verification contract",
    requiredSnippets: [
      "UI / Interaction Reporting Rules",
      "界面/交互验证",
      "Record any blocked automation as a verification risk"
    ]
  },
  {
    path: "AGENTS.md",
    label: "AGENTS visible-interface verification rule",
    requiredSnippets: [
      "interactive automation path",
      "Do not mark a UI path as fully verified"
    ]
  },
  {
    path: ".specify/templates/delivery-summary-template.md",
    label: "Delivery summary UI evidence fields",
    requiredSnippets: [
      "界面/交互验证",
      "截图或 UI 报告"
    ]
  },
  {
    path: ".specify/memory/memory-policy.md",
    label: "Memory data role policy",
    requiredSnippets: [
      "Data Role Classification",
      "account_reference",
      "development_workflow",
      "blocked_sensitive"
    ]
  },
  {
    maxVersion: "0.3.1",
    path: ".agents/skills/project-memory-router/SKILL.md",
    label: "Legacy memory router data role decision",
    requiredSnippets: [
      "Data Role Decision",
      "blocked_sensitive"
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-memory-router/SKILL.md",
    label: "Memory router progressive disclosure link",
    requiredSnippets: [
      "references/memory-governance.md",
      "references/memory-data-roles.md",
      "references/memory-retention-retrieval.md",
      "references/memory-conflict-session.md"
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-memory-router/references/memory-governance.md",
    label: "Memory router scoped reference map",
    requiredSnippets: [
      "Memory Governance Reference",
      "Do not read every memory reference by default"
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-memory-router/references/memory-data-roles.md",
    label: "Memory router data role decision",
    requiredSnippets: [
      "Data Role Decision",
      "infrastructure_reference",
      "blocked_sensitive"
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-memory-router/references/memory-retention-retrieval.md",
    label: "Memory router retention and retrieval policy",
    requiredSnippets: [
      "Memory Retention And Retrieval",
      "Retrieval Modes"
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-memory-router/references/memory-conflict-session.md",
    label: "Memory router conflict and session policy",
    requiredSnippets: [
      "Memory Conflict And Session Reflection",
      "Conflict Rules"
    ]
  },
  {
    path: ".specify/memory-store/memory-record.schema.json",
    label: "Memory record data_role schema",
    requiredSnippets: [
      "\"data_role\"",
      "\"account_reference\"",
      "\"development_workflow\""
    ]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-requirement-gate/SKILL.md",
    label: "Adaptive requirement and confirmation contract",
    requiredSnippets: ["Task Lanes", "需求版本", "确认执行", "controlled"]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-scope-impact-guard/SKILL.md",
    label: "Full impact and scope-delta contract",
    requiredSnippets: ["Impact Levels", "明确不影响", "影响版本", "scope delta"]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-verification-loop/SKILL.md",
    label: "Impact-to-evidence verification contract",
    requiredSnippets: ["Traceability", "事项与影响证据矩阵", "verified_with_risk"]
  },
  {
    minVersion: "0.4.0",
    path: ".agents/skills/project-test-and-report/SKILL.md",
    label: "Versioned user acceptance report contract",
    requiredSnippets: ["验证报告 vN", "awaiting_user_acceptance", "确认验收"]
  },
  {
    minVersion: "0.4.0",
    path: ".specify/templates/workflow-state-template.yaml",
    label: "Adaptive workflow state contract",
    requiredSnippets: ["task_lane:", "confirmation_gates:", "impact_assessment:", "scope_deltas:"]
  },
  {
    minVersion: "0.4.0",
    path: ".specify/templates/delivery-summary-template.md",
    label: "User acceptance delivery artifact contract",
    requiredSnippets: ["awaiting_user_acceptance", "事项与影响证据矩阵", "不满意分类"]
  }
];

const upgradeModePaths = {
  governance: [
    "AGENTS.md",
    ".agents/skills/project-requirement-gate/SKILL.md",
    ".agents/skills/project-scope-impact-guard/SKILL.md",
    ".agents/skills/project-tech-solution/SKILL.md",
    ".agents/skills/project-verification-loop/SKILL.md",
    ".agents/skills/project-test-and-report/SKILL.md",
    ".agents/skills/project-session-summary/SKILL.md",
    ".agents/skills/project-skill-upgrade-advisor/SKILL.md",
    ".specify/memory/constitution.md",
    "docs/Codex团队开发说明.md",
    "docs/ClaudeCode团队开发说明.md",
    "docs/AI协作架构.md"
  ],
  capabilities: [
    ".agents/skills/project-memory-router/SKILL.md",
    ".agents/skills/project-evolution-router/SKILL.md",
    ".agents/skills/project-superpowers-router/SKILL.md",
    ...v040ProgressiveReferencePaths,
    ".specify/memory/memory-policy.md",
    ".specify/memory/evolution-policy.md",
    ".specify/memory/evolution-prefill-policy.md",
    ".specify/memory/evolution-draft-protocol.md",
    ".specify/memory/reflection-output-protocol.md",
    ".specify/memory/final-output-protocol.md",
    ".agents/skills/project-branch-release/SKILL.md",
    ".specify/release/release-policy.md",
    "docs/升级兼容策略.md",
    "docs/AI能力地图.md"
  ],
  templates: [
    ".specify/scripts/bash/create-feature.sh",
    ".specify/scripts/bash/create-feature-branch.sh",
    ".specify/scripts/bash/prepare-release.sh",
    ".specify/scripts/bash/finalize-release.sh",
    ".specify/scripts/bash/release-doctor.sh",
    ".specify/templates/workflow-state-template.yaml",
    ".specify/templates/spec-template.md",
    ".specify/templates/plan-template.md",
    ".specify/templates/tasks-template.md",
    ".specify/templates/checklist-template.md",
    ".specify/templates/reflection-template.md",
    ".specify/templates/rule-change-template.md",
    ".specify/templates/delivery-summary-template.md",
    ".specify/templates/release-checklist-template.md",
    ".specify/templates/release-notes-template.md"
  ]
};

const defaultUpgradeReportPath = "docs/workflow-upgrade-report.md";
const booleanFlags = new Set(["dry-run", "overwrite-existing", "write-report", "json"]);

function usage() {
  console.log(`Usage:
  project-engineering-workflow init \\
    --project-name "CRM Platform" \\
    --project-slug "crm-platform" \\
    --stack-name "Next.js + NestJS" \\
    --app-path "apps/web" \\
    --test-command "pnpm test" \\
    --output-dir "/absolute/path/to/target-repo" \\
    [--env-output "apps/web/.env.local"]

  project-engineering-workflow doctor --output-dir "/absolute/path/to/target-repo" [--json]
    [--json-out "docs/workflow-doctor.json"]

  project-engineering-workflow release-doctor --output-dir "/absolute/path/to/target-repo"
    [--release-version "0.4.0"]
    [--main-branch "main"]
    [--json]
    [--json-out "docs/workflow-release-doctor.json"]

  project-engineering-workflow memory-index --output-dir "/absolute/path/to/target-repo"
    [--json]
    [--json-out "docs/workflow-memory-index.json"]

  project-engineering-workflow upgrade \\
    --output-dir "/absolute/path/to/target-repo" \\
    --mode governance|capabilities|templates|current \\
    [--dry-run] \\
    [--overwrite-existing] \\
    [--write-report] \\
    [--report-out "docs/workflow-upgrade-report.md"] \\
    [--json] \\
    [--json-out "docs/workflow-upgrade.json"]

Aliases:
  pew init ...
  pew doctor ...
  pew release-doctor ...
  pew memory-index ...
  pew upgrade ...
`);
}

function parseArgs(argv) {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    return { command: "help", options: { help: true } };
  }

  const command = argv[0] ?? "help";
  const options = {};

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      if (booleanFlags.has(key)) {
        options[key] = true;
        continue;
      }
      throw new Error(`Missing value for ${arg}`);
    }
    options[key] = value;
    i += 1;
  }

  return { command, options };
}

function copyRecursive(source, target) {
  const sourceStat = statSync(source);
  if (sourceStat.isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source)) {
      copyRecursive(join(source, entry), join(target, entry));
    }
    return;
  }

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

function replacePlaceholders(targetDir, mapping) {
  for (const path of walkFiles(targetDir)) {
    let text;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      continue;
    }

    let updated = text;
    for (const [oldValue, newValue] of Object.entries(mapping)) {
      updated = updated.split(oldValue).join(newValue);
    }

    if (updated !== text) {
      writeFileSync(path, updated, "utf8");
    }
  }
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const entryStat = statSync(path);
    if (entryStat.isDirectory()) {
      yield* walkFiles(path);
    } else if (entryStat.isFile()) {
      yield path;
    }
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readDeclaredWorkflowVersion(targetDir) {
  const markerPath = join(targetDir, currentVersionMarker);
  if (!existsSync(markerPath)) {
    return null;
  }
  return readText(markerPath).trim() || null;
}

function optionalPathsForWorkflowVersion(version) {
  if (!version) {
    return [...upgradeOptionalPaths];
  }
  return [...(workflowOptionalPathsByVersion[version] ?? upgradeOptionalPaths)];
}

function compareWorkflowVersions(leftVersion, rightVersion) {
  const parse = (value) => value.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(leftVersion);
  const right = parse(rightVersion);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

function isWorkflowVersionAtLeast(version, minimum) {
  return compareWorkflowVersions(version, minimum) >= 0;
}

function normalizeMode(rawMode) {
  const mode = rawMode ?? "";
  if (mode === "full") {
    return "current";
  }
  if (mode in upgradeModePaths || mode === "current") {
    return mode;
  }
  throw new Error("Invalid --mode. Use governance, capabilities, templates, or current.");
}

function selectedUpgradePaths(mode) {
  if (mode === "current") {
    return [
      ...upgradeModePaths.governance,
      ...upgradeModePaths.capabilities,
      ...upgradeModePaths.templates,
      currentVersionMarker
    ];
  }
  return [...upgradeModePaths[mode]];
}

function requireOptions(options, names) {
  const missing = names.filter((name) => !options[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.map((name) => `--${name}`).join(", ")}`);
  }
}

function resolveRequiredOutputDir(options) {
  const rawOutputDir = options["output-dir"] ?? options._ ?? null;
  if (!rawOutputDir || (typeof rawOutputDir === "string" && rawOutputDir.trim().length === 0)) {
    throw new Error("Missing required option: --output-dir");
  }
  return resolve(rawOutputDir);
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8"
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? ""
  };
}

function evaluateWorkflowState(outputDir) {
  const declaredWorkflowVersion = readDeclaredWorkflowVersion(outputDir);
  const missingCore = coreRequiredPaths.filter((path) => !existsSync(join(outputDir, path)));
  const expectedCurrentPaths = declaredWorkflowVersion ? optionalPathsForWorkflowVersion(declaredWorkflowVersion) : [];
  const currentMissing = expectedCurrentPaths.filter((path) => !existsSync(join(outputDir, path)));
  const upgradeAvailable = upgradeOptionalPaths.filter((path) => !existsSync(join(outputDir, path)));
  const contractIssues = declaredWorkflowVersion
    ? evaluateWorkflowContentContracts(outputDir, declaredWorkflowVersion)
    : [];

  return {
    declaredWorkflowVersion,
    missingCore,
    currentMissing,
    upgradeAvailable,
    contractIssues
  };
}

function evaluateWorkflowContentContracts(outputDir, declaredWorkflowVersion) {
  const issues = [];

  for (const contract of workflowContentContracts) {
    if (contract.minVersion && !isWorkflowVersionAtLeast(declaredWorkflowVersion, contract.minVersion)) {
      continue;
    }
    if (contract.maxVersion && compareWorkflowVersions(declaredWorkflowVersion, contract.maxVersion) > 0) {
      continue;
    }
    const absolutePath = join(outputDir, contract.path);
    if (!existsSync(absolutePath)) {
      continue;
    }

    const text = readText(absolutePath);
    for (const snippet of contract.requiredSnippets) {
      if (!text.includes(snippet)) {
        issues.push({
          path: contract.path,
          label: contract.label,
          missing: snippet
        });
      }
    }
  }

  return issues;
}

function inspectGitState(targetDir, mainBranch) {
  const repoCheck = runCommand("git", ["rev-parse", "--show-toplevel"], targetDir);
  if (!repoCheck.ok) {
    return {
      isRepository: false,
      repoRoot: null,
      currentBranch: null,
      worktreeClean: null,
      mainBranchExists: null,
      remotes: [],
      tagNames: []
    };
  }

  const currentBranch = runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], targetDir);
  const worktreeStatus = runCommand("git", ["status", "--porcelain"], targetDir);
  const mainBranchExists = runCommand("git", ["rev-parse", "--verify", mainBranch], targetDir);
  const remotes = runCommand("git", ["remote"], targetDir);
  const tagNames = runCommand("git", ["tag", "--list"], targetDir);

  return {
    isRepository: true,
    repoRoot: repoCheck.stdout,
    currentBranch: currentBranch.ok ? currentBranch.stdout : null,
    worktreeClean: worktreeStatus.ok ? worktreeStatus.stdout.length === 0 : null,
    mainBranchExists: mainBranchExists.ok,
    remotes: remotes.ok && remotes.stdout.length > 0 ? remotes.stdout.split(/\r?\n/).filter(Boolean) : [],
    tagNames: tagNames.ok && tagNames.stdout.length > 0 ? tagNames.stdout.split(/\r?\n/).filter(Boolean) : []
  };
}

function hasForbiddenRemoteAction(scriptPath) {
  if (!existsSync(scriptPath)) {
    return false;
  }
  const text = readText(scriptPath);
  return /\bgit\s+push\b|\bnpm\s+publish\b/.test(text);
}

function init(options) {
  requireOptions(options, ["project-name", "project-slug", "stack-name", "app-path", "test-command", "output-dir"]);

  const outputDir = resolve(options["output-dir"]);
  mkdirSync(outputDir, { recursive: true });
  copyRecursive(templateRoot, outputDir);

  replacePlaceholders(outputDir, {
    "__PROJECT_NAME__": options["project-name"],
    "__PROJECT_SLUG__": options["project-slug"],
    "__STACK_NAME__": options["stack-name"],
    "__APP_PATH__": options["app-path"],
    "__ENV_OUTPUT__": options["env-output"] ?? "(none)",
    "__TEST_COMMAND__": options["test-command"],
    "__DATE__": today()
  });

  console.log(`Bootstrap complete.

Target: ${outputDir}

Next steps:
1. Review ${join(outputDir, "AGENTS.md")}
2. Review ${join(outputDir, ".agents/skills/project-stack-standards/SKILL.md")}
3. Review ${join(outputDir, ".specify/memory/constitution.md")}
4. Review ${join(outputDir, "docs/Codex团队开发说明.md")}
5. Review ${join(outputDir, "docs/ClaudeCode团队开发说明.md")}
6. Review ${join(outputDir, ".specify/memory/session-history.md")}
7. Review ${join(outputDir, ".specify/memory/skill-upgrade-backlog.md")}
8. Run: project-engineering-workflow doctor --output-dir "${outputDir}"`);
}

function doctor(options) {
  const outputDir = resolveRequiredOutputDir(options);
  const jsonMode = options.json === true;
  const jsonOut = options["json-out"] ?? null;
  const workflowState = evaluateWorkflowState(outputDir);

  if (workflowState.missingCore.length > 0) {
    const result = {
      command: "doctor",
      target: outputDir,
      declaredWorkflowVersion: workflowState.declaredWorkflowVersion,
      status: "failed",
      decision: {
        code: "baseline-missing",
        label: "基础缺失",
        reason: "项目缺少 baseline workflow 必需文件，尚不能进入升级建议或当前线校验。"
      },
      summary: {
        missingCore: workflowState.missingCore.length,
        missingCurrent: 0,
        upgradeAvailable: 0,
        contractIssues: 0
      },
      missing: workflowState.missingCore,
      currentMissing: [],
      upgradeAvailable: [],
      contractIssues: []
    };
    if (jsonOut) {
      result.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, result);
    }
    if (jsonMode) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(1);
    } else {
      for (const path of workflowState.missingCore) {
        console.error(`Missing: ${path}`);
      }
    }
    throw new Error("Doctor failed. Add the missing files and rerun.");
  }

  if (workflowState.declaredWorkflowVersion) {
    if (workflowState.currentMissing.length > 0) {
      const result = {
        command: "doctor",
        target: outputDir,
        declaredWorkflowVersion: workflowState.declaredWorkflowVersion,
        status: "failed",
        decision: {
          code: "current-incomplete",
          label: "当前线不完整",
          reason: `项目声明了 ${workflowState.declaredWorkflowVersion} workflow 线，但缺少该版本所需文件。`
        },
        summary: {
          missingCore: 0,
          missingCurrent: workflowState.currentMissing.length,
          upgradeAvailable: 0,
          contractIssues: 0
        },
        missing: [],
        currentMissing: workflowState.currentMissing,
        upgradeAvailable: [],
        contractIssues: []
      };
      if (jsonOut) {
        result.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, result);
      }
      if (jsonMode) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        process.exit(1);
      } else {
        for (const path of workflowState.currentMissing) {
          console.error(`Missing current file: ${path}`);
        }
      }
      throw new Error(
        `Doctor failed. This project appears to use workflow line ${workflowState.declaredWorkflowVersion}, but is missing required current-version files.\n` +
        `Projects without ${currentVersionMarker} may adopt newer optional files gradually.\n` +
        "If this is meant to be a current-version project, complete the upgrade and rerun doctor."
      );
    }
  }

  if (workflowState.contractIssues.length > 0) {
    const result = {
      command: "doctor",
      target: outputDir,
      declaredWorkflowVersion: workflowState.declaredWorkflowVersion,
      status: "failed",
      decision: {
        code: "workflow-contract-drift",
        label: "契约漂移",
        reason: "项目声明了 workflow 线，但关键流程契约内容缺失。请通过 upgrade 或手动同步模板后重跑 doctor。"
      },
      summary: {
        missingCore: 0,
        missingCurrent: 0,
        upgradeAvailable: 0,
        contractIssues: workflowState.contractIssues.length
      },
      missing: [],
      currentMissing: [],
      upgradeAvailable: [],
      contractIssues: workflowState.contractIssues
    };
    if (jsonOut) {
      result.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, result);
    }
    if (jsonMode) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(1);
    } else {
      for (const issue of workflowState.contractIssues) {
        console.error(`Contract drift: ${issue.path} missing "${issue.missing}" (${issue.label})`);
      }
    }
    throw new Error("Doctor failed. Restore the missing workflow contract snippets and rerun.");
  }

  if (workflowState.upgradeAvailable.length > 0) {
    const result = {
      command: "doctor",
      target: outputDir,
      declaredWorkflowVersion: workflowState.declaredWorkflowVersion,
      status: "passed-with-suggestions",
      decision: {
        code: "upgrade-available",
        label: "可升级",
        reason: "项目当前兼容 baseline，但仍有可选的新 workflow 文件尚未接入。"
      },
      summary: {
        missingCore: 0,
        missingCurrent: 0,
        upgradeAvailable: workflowState.upgradeAvailable.length,
        contractIssues: 0
      },
      missing: [],
      currentMissing: [],
      upgradeAvailable: workflowState.upgradeAvailable,
      contractIssues: []
    };
    if (jsonOut) {
      result.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, result);
    }
    if (jsonMode) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      console.log("Doctor passed with upgrade suggestions.");
      console.log("The project is compatible with the workflow baseline, but is missing optional newer workflow files:");
      for (const path of workflowState.upgradeAvailable) {
        console.log(`Upgrade available: ${path}`);
      }
      console.log("");
      console.log("Keep existing artifacts unchanged by default. Adopt these files only through a planned upgrade.");
    }
    return;
  }

  const result = {
    command: "doctor",
    target: outputDir,
    declaredWorkflowVersion: workflowState.declaredWorkflowVersion,
    status: "passed",
    decision: {
      code: "current-complete",
      label: "完整通过",
      reason: "项目已经具备当前 starter 所需的完整 workflow 文件集。"
    },
    summary: {
      missingCore: 0,
      missingCurrent: 0,
      upgradeAvailable: 0,
      contractIssues: 0
    },
    missing: [],
    currentMissing: [],
    upgradeAvailable: [],
    contractIssues: []
  };
  if (jsonOut) {
    result.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, result);
  }
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log("Doctor passed.");
    console.log("The project engineering workflow starter looks complete.");
  }
}

function releaseDoctor(options) {
  const outputDir = resolveRequiredOutputDir(options);
  if (!existsSync(outputDir)) {
    throw new Error(`Target repo does not exist: ${outputDir}`);
  }

  const jsonMode = options.json === true;
  const jsonOut = options["json-out"] ?? null;
  const releaseVersion = options["release-version"] ?? null;
  const mainBranch = options["main-branch"] ?? "main";
  const workflowState = evaluateWorkflowState(outputDir);
  const branchReleaseMissing = branchReleaseOptionalPaths.filter((path) => !existsSync(join(outputDir, path)));
  const gitState = inspectGitState(outputDir, mainBranch);

  const blockers = [];
  const warnings = [];

  if (workflowState.missingCore.length > 0) {
    blockers.push(...workflowState.missingCore.map((path) => `Missing core workflow file: ${path}`));
  }

  if (workflowState.declaredWorkflowVersion && workflowState.currentMissing.length > 0) {
    blockers.push(...workflowState.currentMissing.map((path) => `Missing current-version workflow file: ${path}`));
  }

  if (branchReleaseMissing.length > 0) {
    blockers.push(...branchReleaseMissing.map((path) => `Missing branch/release asset: ${path}`));
  }

  if (!gitState.isRepository) {
    blockers.push("Target repo is not inside a git repository.");
  } else {
    if (!gitState.mainBranchExists) {
      blockers.push(`Main branch does not exist: ${mainBranch}`);
    }
    if (gitState.worktreeClean === false) {
      blockers.push("Worktree is dirty. Release prepare/finalize should run on a clean repository.");
    }
    if ((gitState.remotes ?? []).length === 0) {
      warnings.push("No git remote is configured. Release tagging can proceed locally, but remote publication is still manual.");
    }
  }

  const releaseBranch = releaseVersion ? `release/${releaseVersion}` : null;
  const releaseDir = releaseVersion ? join(outputDir, "specs", "releases", releaseVersion) : null;
  const releaseChecklistPath = releaseDir ? join(releaseDir, "release-checklist.md") : null;
  const releaseNotesPath = releaseDir ? join(releaseDir, "release-notes.md") : null;
  const tagName = releaseVersion ? `v${releaseVersion}` : null;

  if (gitState.isRepository && gitState.currentBranch === mainBranch) {
    warnings.push(`Current branch is ${mainBranch}. Release preparation should start from a validated feature branch.`);
  }

  if (releaseVersion) {
    if (!releaseDir || !existsSync(releaseDir)) {
      blockers.push(`Missing release artifact directory: specs/releases/${releaseVersion}`);
    }
    if (releaseChecklistPath && !existsSync(releaseChecklistPath)) {
      blockers.push(`Missing release checklist: specs/releases/${releaseVersion}/release-checklist.md`);
    }
    if (releaseNotesPath && !existsSync(releaseNotesPath)) {
      blockers.push(`Missing release notes: specs/releases/${releaseVersion}/release-notes.md`);
    }
    if (gitState.isRepository && releaseBranch) {
      const releaseBranchExists = runCommand("git", ["rev-parse", "--verify", releaseBranch], outputDir).ok;
      if (!releaseBranchExists) {
        blockers.push(`Missing release branch: ${releaseBranch}`);
      }
      const tagExists = runCommand("git", ["rev-parse", "--verify", tagName], outputDir).ok;
      if (tagExists) {
        warnings.push(`Tag already exists: ${tagName}`);
      }
    }
  }

  const prepareScript = join(outputDir, ".specify", "scripts", "bash", "prepare-release.sh");
  const finalizeScript = join(outputDir, ".specify", "scripts", "bash", "finalize-release.sh");
  const guardHealthy = !hasForbiddenRemoteAction(prepareScript) && !hasForbiddenRemoteAction(finalizeScript);
  if (!guardHealthy) {
    blockers.push("Release scripts contain direct remote push or npm publish commands. Remote actions must stay manual.");
  }

  let decision;
  let status;
  if (blockers.length > 0) {
    status = "failed";
    decision = {
      code: "release-not-ready",
      label: "发布未就绪",
      reason: "当前 release 分支、工件、git 状态或远端动作防护仍有阻断项。"
    };
  } else if (warnings.length > 0) {
    status = "passed-with-warnings";
    decision = {
      code: "release-ready-with-warnings",
      label: "可继续但需留意",
      reason: "release 资产基本健康，但仍有需要人工确认的上下文提示。"
    };
  } else {
    status = "passed";
    decision = {
      code: "release-ready",
      label: "发布就绪",
      reason: "release 分支、工件、git 状态与远端动作防护都已通过检查。"
    };
  }

  const result = {
    command: "release-doctor",
    target: outputDir,
    releaseVersion,
    mainBranch,
    declaredWorkflowVersion: workflowState.declaredWorkflowVersion,
    status,
    decision,
    summary: {
      missingCore: workflowState.missingCore.length,
      missingBranchRelease: branchReleaseMissing.length,
      blockers: blockers.length,
      warnings: warnings.length
    },
    blockers,
    warnings,
    git: {
      isRepository: gitState.isRepository,
      repoRoot: gitState.repoRoot,
      currentBranch: gitState.currentBranch,
      mainBranchExists: gitState.mainBranchExists,
      worktreeClean: gitState.worktreeClean,
      remotes: gitState.remotes
    },
    artifacts: {
      releaseBranch,
      releaseDir,
      releaseChecklistPath,
      releaseNotesPath,
      tagName
    },
    guard: {
      remoteActionsManualOnly: guardHealthy
    }
  };

  if (jsonOut) {
    result.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, result);
  }

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (status === "failed") {
      process.exit(1);
    }
    return;
  }

  console.log(`Release doctor for: ${outputDir}`);
  console.log(`Decision: ${decision.label} (${decision.code})`);
  console.log(`Reason: ${decision.reason}`);
  console.log(`Remote push/publish guard: ${guardHealthy ? "manual-only confirmed" : "FAILED"}`);
  if (releaseVersion) {
    console.log(`Release version: ${releaseVersion}`);
  }

  if (blockers.length > 0) {
    console.log("");
    console.log("Blockers:");
    for (const blocker of blockers) {
      console.log(`- ${blocker}`);
    }
  }

  if (warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (status === "failed") {
    throw new Error("Release doctor failed. Fix the blockers and rerun.");
  }
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function inferProjectContext(targetDir, overrides) {
  const context = {
    "__PROJECT_NAME__": overrides["project-name"] ?? null,
    "__APP_PATH__": overrides["app-path"] ?? null,
    "__STACK_NAME__": overrides["stack-name"] ?? null,
    "__ENV_OUTPUT__": overrides["env-output"] ?? null,
    "__TEST_COMMAND__": overrides["test-command"] ?? null
  };

  const agentsPath = join(targetDir, "AGENTS.md");
  if (existsSync(agentsPath)) {
    const agentsText = readText(agentsPath);
    context["__PROJECT_NAME__"] ??= agentsText.match(/^# (.+) Agent Workflow$/m)?.[1] ?? null;
    context["__APP_PATH__"] ??= agentsText.match(/before editing `([^`]+)`\./)?.[1] ?? null;
    context["__STACK_NAME__"] ??= agentsText.match(/Follow the repository's real `([^`]+)` conventions/)?.[1] ?? null;
    context["__ENV_OUTPUT__"] ??= agentsText.match(/generated files: `([^`]+)`/)?.[1] ?? null;
  }

  const teamGuidePath = join(targetDir, "docs", "Codex团队开发说明.md");
  if (existsSync(teamGuidePath)) {
    const teamGuideText = readText(teamGuidePath);
    context["__PROJECT_NAME__"] ??= teamGuideText.match(/^# (.+) Codex 团队开发说明$/m)?.[1] ?? null;
  }

  const testReportSkillPath = join(targetDir, ".agents", "skills", "project-test-and-report", "SKILL.md");
  if (existsSync(testReportSkillPath)) {
    const testReportSkillText = readText(testReportSkillPath);
    context["__TEST_COMMAND__"] ??= testReportSkillText.match(/^Run: `([^`]+)`$/m)?.[1] ?? null;
  }

  if (!context["__ENV_OUTPUT__"]) {
    context["__ENV_OUTPUT__"] = "(none)";
  }

  return context;
}

function requiredPlaceholdersForFiles(paths) {
  const placeholders = new Set();
  for (const relPath of paths) {
    const sourceText = readText(join(templateRoot, relPath));
    for (const match of sourceText.matchAll(/__[A-Z_]+__/g)) {
      placeholders.add(match[0]);
    }
  }
  return [...placeholders];
}

function applyPlaceholderMapping(text, mapping) {
  let updated = text;
  for (const [placeholder, value] of Object.entries(mapping)) {
    if (value == null) {
      continue;
    }
    updated = updated.split(placeholder).join(value);
  }
  return updated;
}

function writeJsonArtifact(outputDir, jsonOut, payload) {
  const targetPath = resolve(outputDir, jsonOut);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return targetPath;
}

function toPortablePath(path) {
  return path.split(sep).join("/");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseMemoryTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? -Infinity : timestamp;
}

function compareMemoryIndexEntries(left, right) {
  const timestampDiff = parseMemoryTimestamp(right.updated_at) - parseMemoryTimestamp(left.updated_at);
  if (timestampDiff !== 0) {
    return timestampDiff;
  }
  return left.id.localeCompare(right.id);
}

function expectedMemorySources(outputDir) {
  const sources = [];
  const sharedPath = join(outputDir, ".specify", "memory-store", "shared", "memories.jsonl");
  const agentPath = join(outputDir, ".specify", "memory-store", "agent", "evolution.jsonl");

  if (existsSync(sharedPath) && statSync(sharedPath).isFile()) {
    sources.push({
      relPath: `${memoryStoreRelativeDir}/shared/memories.jsonl`,
      absPath: sharedPath,
      scope: "team_shared",
      ownerId: null
    });
  }

  if (existsSync(agentPath) && statSync(agentPath).isFile()) {
    sources.push({
      relPath: `${memoryStoreRelativeDir}/agent/evolution.jsonl`,
      absPath: agentPath,
      scope: "agent_self",
      ownerId: null
    });
  }

  const usersDir = join(outputDir, ".specify", "memory-store", "users");
  if (!existsSync(usersDir) || !statSync(usersDir).isDirectory()) {
    return sources;
  }

  for (const entry of readdirSync(usersDir).sort()) {
    const userDir = join(usersDir, entry);
    if (!statSync(userDir).isDirectory()) {
      continue;
    }

    const memoriesPath = join(userDir, "memories.jsonl");
    if (!existsSync(memoriesPath) || !statSync(memoriesPath).isFile()) {
      continue;
    }

    sources.push({
      relPath: toPortablePath(join(memoryStoreRelativeDir, "users", entry, "memories.jsonl")),
      absPath: memoriesPath,
      scope: "user_private",
      ownerId: entry
    });
  }

  return sources;
}

function validateMemoryIndexEntry(source, record, lineNumber) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: "Memory record must be a JSON object."
      }
    };
  }

  if (record.scope !== source.scope) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: `Scope mismatch. Expected "${source.scope}" but found "${record.scope ?? "(missing)"}".`
      }
    };
  }

  if (!isNonEmptyString(record.id)) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: "Missing non-empty string field \"id\"."
      }
    };
  }

  if (!validMemoryTypes.has(record.type)) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: `Invalid memory type "${record.type ?? "(missing)"}".`
      }
    };
  }

  if (record.data_role != null && !validMemoryDataRoles.has(record.data_role)) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: `Invalid memory data_role "${record.data_role}".`
      }
    };
  }

  if (!isNonEmptyString(record.summary)) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: "Missing non-empty string field \"summary\"."
      }
    };
  }

  if (!isNonEmptyString(record.updated_at)) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: "Missing non-empty string field \"updated_at\"."
      }
    };
  }

  if (!validMemoryStatuses.has(record.status)) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: `Invalid memory status "${record.status ?? "(missing)"}".`
      }
    };
  }

  if (record.owner_id != null && !isNonEmptyString(record.owner_id)) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: "\"owner_id\" must be a non-empty string or null."
      }
    };
  }

  const ownerId = record.owner_id ?? source.ownerId ?? null;
  if (source.ownerId && ownerId !== source.ownerId) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: `Owner mismatch. Expected "${source.ownerId}" but found "${ownerId}".`
      }
    };
  }

  if (record.tags != null) {
    if (!Array.isArray(record.tags) || !record.tags.every((tag) => isNonEmptyString(tag))) {
      return {
        error: {
          path: source.relPath,
          line: lineNumber,
          message: "\"tags\" must be an array of non-empty strings when present."
        }
      };
    }
  }

  if (record.expires_at != null && !isNonEmptyString(record.expires_at)) {
    return {
      error: {
        path: source.relPath,
        line: lineNumber,
        message: "\"expires_at\" must be a non-empty string or null."
      }
    };
  }

  return {
    entry: {
      id: record.id,
      scope: record.scope,
      owner_id: ownerId,
      data_role: record.data_role ?? null,
      type: record.type,
      summary: record.summary.trim(),
      tags: record.tags ?? [],
      path: `${source.relPath}#L${lineNumber}`,
      updated_at: record.updated_at,
      expires_at: record.expires_at ?? null,
      status: record.status
    }
  };
}

function readMemorySource(source) {
  const text = readText(source.absPath);
  const lines = text.split(/\r?\n/);
  const entries = [];
  const errors = [];
  let blankLines = 0;
  let nonEmptyLines = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index].trim();
    if (line.length === 0) {
      blankLines += 1;
      continue;
    }

    nonEmptyLines += 1;

    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      errors.push({
        path: source.relPath,
        line: lineNumber,
        message: `Invalid JSON record: ${error.message}`
      });
      continue;
    }

    const result = validateMemoryIndexEntry(source, record, lineNumber);
    if (result.error) {
      errors.push(result.error);
      continue;
    }

    entries.push(result.entry);
  }

  return {
    source,
    entries,
    errors,
    blankLines,
    nonEmptyLines
  };
}

function buildMemoryIndexResult({
  outputDir,
  status,
  decision,
  summary,
  sources,
  errors,
  indexPath
}) {
  return {
    command: "memory-index",
    target: outputDir,
    status,
    decision,
    summary,
    indexPath,
    sources: sources.map((source) => ({
      path: source.source.relPath,
      scope: source.source.scope,
      owner_id: source.source.ownerId ?? null,
      records: source.entries.length,
      nonEmptyLines: source.nonEmptyLines,
      blankLines: source.blankLines
    })),
    errors
  };
}

function memoryIndex(options) {
  const outputDir = resolveRequiredOutputDir(options);
  if (!existsSync(outputDir)) {
    throw new Error(`Target repo does not exist: ${outputDir}`);
  }

  const jsonMode = options.json === true;
  const jsonOut = options["json-out"] ?? null;
  const memoryStoreDir = join(outputDir, ".specify", "memory-store");
  const indexPath = join(outputDir, memoryIndexRelativePath);

  if (!existsSync(memoryStoreDir) || !statSync(memoryStoreDir).isDirectory()) {
    const result = buildMemoryIndexResult({
      outputDir,
      status: "failed",
      decision: {
        code: "memory-store-missing",
        label: "记忆存储层缺失",
        reason: "目标项目还没有接入 .specify/memory-store，无法重建 durable memory 索引。"
      },
      summary: {
        sourceFiles: 0,
        nonEmptyLines: 0,
        recordsIndexed: 0,
        errors: 0
      },
      sources: [],
      errors: [],
      indexPath
    });
    if (jsonOut) {
      result.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, result);
    }
    if (jsonMode) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(1);
    }

    console.error(`Missing: ${memoryStoreRelativeDir}`);
    throw new Error("Memory index rebuild failed. Upgrade the project with --mode capabilities first.");
  }

  const sources = expectedMemorySources(outputDir).map((source) => readMemorySource(source));
  const entries = [];
  const errors = [];
  const seenIds = new Map();

  for (const source of sources) {
    for (const entry of source.entries) {
      const existingPath = seenIds.get(entry.id);
      if (existingPath) {
        errors.push({
          path: entry.path,
          message: `Duplicate memory id "${entry.id}" already indexed from "${existingPath}".`
        });
        continue;
      }
      seenIds.set(entry.id, entry.path);
      entries.push(entry);
    }
    errors.push(...source.errors);
  }

  const summary = {
    sourceFiles: sources.length,
    nonEmptyLines: sources.reduce((total, source) => total + source.nonEmptyLines, 0),
    recordsIndexed: entries.length,
    errors: errors.length
  };

  if (errors.length > 0) {
    const result = buildMemoryIndexResult({
      outputDir,
      status: "failed",
      decision: {
        code: "memory-store-invalid",
        label: "记忆存储层无效",
        reason: "durable memory 存在格式、范围或主键冲突问题，本次不会重写 index.json。"
      },
      summary,
      sources,
      errors,
      indexPath
    });
    if (jsonOut) {
      result.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, result);
    }
    if (jsonMode) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exit(1);
    }

    console.error("Memory index rebuild failed. Existing index.json was left untouched.");
    for (const error of errors) {
      const lineSuffix = error.line ? `:${error.line}` : "";
      console.error(`- ${error.path}${lineSuffix} ${error.message}`);
    }
    throw new Error("Fix the memory-store records and rerun memory-index.");
  }

  entries.sort(compareMemoryIndexEntries);
  const payload = {
    schema: "project-memory-index",
    version: memoryIndexVersion,
    generated_at: new Date().toISOString(),
    entries
  };
  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const result = buildMemoryIndexResult({
    outputDir,
    status: "passed",
    decision: {
      code: "index-rebuilt",
      label: "索引已重建",
      reason: "已从 durable memory 源文件重建轻量索引，且未改写任何 memory record 正文。"
    },
    summary,
    sources,
    errors: [],
    indexPath
  });
  if (jsonOut) {
    result.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, result);
  }

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log("Memory index rebuilt.");
  console.log(`Target: ${outputDir}`);
  console.log(`Index: ${indexPath}`);
  console.log(`Summary: source files ${summary.sourceFiles}, scanned records ${summary.nonEmptyLines}, indexed ${summary.recordsIndexed}`);
  if (sources.length > 0) {
    console.log("");
    console.log("Sources:");
    for (const source of sources) {
      console.log(`- ${source.source.relPath} (${source.entries.length} indexed records)`);
    }
  }
}

function fallbackProjectName(targetDir, context) {
  return context["__PROJECT_NAME__"] ?? basename(targetDir);
}

function formatBulletList(items, emptyText = "无") {
  if (items.length === 0) {
    return `- ${emptyText}`;
  }
  return items.map((item) => `- \`${item}\``).join("\n");
}

function formatUpgradeModeLabel(mode) {
  const labels = {
    governance: "治理层升级",
    capabilities: "能力链接入",
    templates: "模板层升级",
    current: "完整当前线升级"
  };
  return labels[mode] ?? mode;
}

function assessUpgradeDecision({ mode, dryRun, blockedCurrentUpgrade, summary, preservedDifferent }) {
  if (blockedCurrentUpgrade) {
    return {
      code: "blocked",
      label: "当前阻断",
      reason: "当前模式要求完整接入最新 workflow 线，但存在差异 workflow 文件尚未确认是否可覆盖。"
    };
  }

  if (dryRun && preservedDifferent.length > 0) {
    return {
      code: "needs-confirmation",
      label: "需确认覆盖",
      reason: "本次预演发现已有 workflow 文件与 starter 存在差异，继续升级前应先确认是否允许覆盖。"
    };
  }

  if (dryRun && (mode === "capabilities" || mode === "templates") && summary.add > 0) {
    return {
      code: "pilot-recommended",
      label: "建议先试点",
      reason: "本次属于增量能力升级，建议先在一个新 feature 或活跃 feature 上试点再推广。"
    };
  }

  if (dryRun) {
    return {
      code: "ready",
      label: "可直接执行",
      reason: "当前计划未发现阻断项，可在评审后直接执行正式 upgrade。"
    };
  }

  return {
    code: "completed",
    label: "已执行",
    reason: "本次 upgrade 已完成，接下来应通过 doctor 和真实 feature 试点继续验证。"
  };
}

function formatUpgradeCommand(outputDir, mode, options = {}) {
  const parts = [
    "project-engineering-workflow upgrade",
    `--output-dir "${outputDir}"`,
    `--mode ${mode}`
  ];

  if (options.dryRun) {
    parts.push("--dry-run");
  }
  if (options.overwriteExisting) {
    parts.push("--overwrite-existing");
  }
  if (options.writeReport) {
    parts.push("--write-report");
  }
  if (options.reportOut) {
    parts.push(`--report-out "${options.reportOut}"`);
  }

  return parts.join(" ");
}

function buildUpgradeRecommendations({ decision, outputDir, mode, reportPath, preservedDifferent }) {
  const confirmList = preservedDifferent.map((action) => action.relPath);

  if (decision.code === "blocked") {
    return {
      commands: [
        formatUpgradeCommand(outputDir, mode, { dryRun: true, overwriteExisting: true, writeReport: true, reportOut: reportPath }),
        formatUpgradeCommand(outputDir, mode, { overwriteExisting: true })
      ],
      checks: confirmList
    };
  }

  if (decision.code === "needs-confirmation") {
    return {
      commands: [
        formatUpgradeCommand(outputDir, mode, { dryRun: true, overwriteExisting: true, writeReport: true, reportOut: reportPath }),
        formatUpgradeCommand(outputDir, mode, { overwriteExisting: true })
      ],
      checks: confirmList
    };
  }

  if (decision.code === "pilot-recommended") {
    return {
      commands: [
        formatUpgradeCommand(outputDir, mode, { writeReport: true, reportOut: reportPath }),
        `project-engineering-workflow doctor --output-dir "${outputDir}"`
      ],
      checks: [
        "确认新增 workflow 能力只先用于一个新 feature 或当前活跃 feature",
        "确认团队接受先试点、后推广，而不是批量迁移历史 specs 工件"
      ]
    };
  }

  if (decision.code === "ready") {
    return {
      commands: [
        formatUpgradeCommand(outputDir, mode, {}),
        `project-engineering-workflow doctor --output-dir "${outputDir}"`
      ],
      checks: []
    };
  }

  return {
    commands: [
      `project-engineering-workflow doctor --output-dir "${outputDir}"`
    ],
    checks: [
      "选择一个真实 feature 验证升级后的 workflow 是否可用",
      "确认历史 specs 工件未被误改"
    ]
  };
}

function buildUpgradeJsonResult({
  mode,
  outputDir,
  dryRun,
  overwriteExisting,
  reportRequested,
  reportPath,
  actions,
  summary,
  decision,
  recommendations,
  blockedCurrentUpgrade
}) {
  return {
    command: "upgrade",
    mode,
    target: outputDir,
    dryRun,
    overwriteExisting,
    reportRequested,
    reportPath: reportRequested ? reportPath : null,
    decision,
    summary,
    blockedCurrentUpgrade,
    safety: {
      specsUntouched: true
    },
    actions: actions.map((action) => ({
      type: action.type,
      path: action.relPath
    })),
    checks: recommendations.checks,
    recommendedCommands: recommendations.commands
  };
}

function buildUpgradeReport({ mode, outputDir, context, actions, dryRun, overwriteExisting, blockedCurrentUpgrade, reportPath, summary, preservedDifferent }) {
  const added = actions.filter((action) => action.type === "add").map((action) => action.relPath);
  const updated = actions.filter((action) => action.type === "update").map((action) => action.relPath);
  const preserved = actions.filter((action) => action.type === "preserve").map((action) => action.relPath);
  const unchanged = actions.filter((action) => action.type === "unchanged").map((action) => action.relPath);
  const decision = assessUpgradeDecision({ mode, dryRun, blockedCurrentUpgrade, summary, preservedDifferent });
  const recommendations = buildUpgradeRecommendations({ decision, outputDir, mode, reportPath, preservedDifferent });

  const executionState = blockedCurrentUpgrade
    ? "当前升级计划被阻断，需要先确认是否允许刷新已有 workflow 文件。"
    : dryRun
      ? "当前是预演计划，尚未写入 workflow 文件。"
      : "当前升级已经执行完成，可继续运行 doctor 做完整性确认。";

  const nextSteps = decision.code === "blocked"
    ? [
        "先评审 `preserve` 列表，确认这些已有 workflow 文件是否允许被当前 starter 刷新。",
        "如果允许覆盖，重新运行同一条命令并追加 `--overwrite-existing`。",
        "如果不允许覆盖，保持当前项目继续按旧规则运行，或改用更小粒度的 upgrade mode。"
      ]
    : decision.code === "needs-confirmation"
      ? [
          "先逐项评审“将保留不动的现有 workflow 文件”，确认它们是否包含团队特有规则。",
          "如果允许对齐到 starter，重新运行 upgrade 并追加 `--overwrite-existing`。",
          "如果不希望覆盖，保留这些差异文件，并选择更小粒度 mode 或继续沿用旧规则。"
        ]
      : decision.code === "pilot-recommended"
        ? [
            "先评审本报告中的新增项，确认这些新能力链确实是团队当前需要的。",
            "确认后执行正式 upgrade，并选择一个新 feature 或活跃 feature 做试点。",
            "试点通过后再决定是否把这组能力推广为团队默认流程。"
          ]
      : dryRun
      ? [
          "先评审本报告中的新增、覆盖和保留项。",
          "确认后执行同一条 upgrade 命令并移除 `--dry-run`。",
          "升级完成后运行 `project-engineering-workflow doctor --output-dir \"...\"`。"
        ]
      : [
          "运行 `project-engineering-workflow doctor --output-dir \"...\"` 确认升级结果。",
          "如本次只补 capabilities，可按需继续补 templates 或完整 current 线。",
          "选择一个新 feature 试点使用新增 workflow 能力，不批量重写历史 `specs/` 工件。"
        ];

  return `# Workflow 升级审阅报告

## 基本信息

- 项目：${fallbackProjectName(outputDir, context)}
- 目标目录：\`${outputDir}\`
- 升级模式：${formatUpgradeModeLabel(mode)}（\`${mode}\`）
- 执行方式：${dryRun ? "dry-run 预演" : "正式执行"}
- 覆盖已有 workflow 文件：${overwriteExisting ? "是" : "否"}
- 报告生成时间：${today()}
- 报告路径：\`${reportPath}\`

## 审批结论

- 结论等级：${decision.label}
- 结论代码：\`${decision.code}\`
- 结论原因：${decision.reason}
- 执行状态：${executionState}

## 将新增的文件

${formatBulletList(added)}

## 将覆盖的文件

${formatBulletList(updated)}

## 将保留不动的现有 workflow 文件

${formatBulletList(preserved)}

## 已经与当前 starter 对齐的文件

${formatBulletList(unchanged)}

## 明确不会触碰的范围

- \`specs/**\` 下的历史交付工件
- 业务代码、运行时配置、基础设施与测试资产
- 任何未被本次 upgrade mode 选中的 workflow 文件

## 审阅关注点

- 如果“将覆盖的文件”非空，需要确认这些文件里的项目自定义规则是否已另行保留。
- 如果“将保留不动的现有 workflow 文件”非空，说明它们与当前 starter 有差异，本次不会静默改写。
- 如果当前只升级 capabilities 或 templates，旧项目仍可继续以增量方式演进，不需要批量迁移历史 feature。

## 待确认覆盖清单

${formatBulletList(recommendations.checks)}

## 推荐命令

${formatBulletList(recommendations.commands)}

## 下一步建议

1. ${nextSteps[0]}
2. ${nextSteps[1]}
3. ${nextSteps[2]}
`;
}

function upgrade(options) {
  const outputDir = resolveRequiredOutputDir(options);
  if (!existsSync(outputDir)) {
    throw new Error(`Target repo does not exist: ${outputDir}`);
  }

  const mode = normalizeMode(options.mode);
  const overwriteExisting = options["overwrite-existing"] === true;
  const dryRun = options["dry-run"] === true;
  const reportRequested = options["write-report"] === true || Boolean(options["report-out"]);
  const reportPath = options["report-out"] ?? defaultUpgradeReportPath;
  const jsonOut = options["json-out"] ?? null;
  const selectedPaths = selectedUpgradePaths(mode);
  const context = inferProjectContext(outputDir, options);
  const actions = [];

  for (const relPath of selectedPaths) {
    const sourcePath = join(templateRoot, relPath);
    const targetPath = join(outputDir, relPath);
    const exists = existsSync(targetPath);
    if (!exists) {
      actions.push({ type: "add", relPath, sourcePath, targetPath });
      continue;
    }

    const renderedSourceText = applyPlaceholderMapping(readText(sourcePath), context);
    const sameContent = renderedSourceText === readText(targetPath);
    if (sameContent) {
      actions.push({ type: "unchanged", relPath, sourcePath, targetPath });
      continue;
    }

    if (overwriteExisting) {
      actions.push({ type: "update", relPath, sourcePath, targetPath });
    } else {
      actions.push({ type: "preserve", relPath, sourcePath, targetPath });
    }
  }

  const writeActions = actions.filter((action) => action.type === "add" || action.type === "update");
  const placeholdersNeeded = requiredPlaceholdersForFiles(writeActions.map((action) => action.relPath));
  const missingPlaceholders = placeholdersNeeded.filter((placeholder) => !context[placeholder]);
  if (missingPlaceholders.length > 0) {
    throw new Error(
      "Cannot infer upgrade placeholders for: " +
      missingPlaceholders.join(", ") +
      ". Pass explicit values such as --project-name, --app-path, --stack-name, --env-output, or --test-command."
    );
  }

  const preservedDifferent = actions.filter((action) => action.type === "preserve");
  const blockedCurrentUpgrade = mode === "current" && preservedDifferent.length > 0;

  const summary = {
    add: actions.filter((action) => action.type === "add").length,
    update: actions.filter((action) => action.type === "update").length,
    preserve: preservedDifferent.length,
    unchanged: actions.filter((action) => action.type === "unchanged").length
  };
  const decision = assessUpgradeDecision({ mode, dryRun, blockedCurrentUpgrade, summary, preservedDifferent });
  const recommendations = buildUpgradeRecommendations({ decision, outputDir, mode, reportPath, preservedDifferent });
  const jsonMode = options.json === true;
  const jsonResult = buildUpgradeJsonResult({
    mode,
    outputDir,
    dryRun,
    overwriteExisting,
    reportRequested,
    reportPath,
    actions,
    summary,
    decision,
    recommendations,
    blockedCurrentUpgrade
  });

  if (!jsonMode) {
    console.log(`Upgrade plan for mode "${mode}"`);
    console.log(`Target: ${outputDir}`);
    console.log("Safety: no files under specs/ will be modified.");
    console.log(`Summary: add ${summary.add}, update ${summary.update}, preserve ${summary.preserve}, unchanged ${summary.unchanged}`);
    console.log(`Decision: ${decision.label} (${decision.code})`);
    console.log(`Reason: ${decision.reason}`);
    console.log("");

    for (const action of actions) {
      const label = action.type.toUpperCase().padEnd(9, " ");
      console.log(`${label} ${action.relPath}`);
    }

    if (preservedDifferent.length > 0) {
      console.log("");
      console.log("Preserved existing workflow files differ from the current starter.");
      console.log("Re-run with --overwrite-existing to refresh them after review.");
    }

    if (recommendations.checks.length > 0) {
      console.log("");
      console.log("Checks:");
      for (const item of recommendations.checks) {
        console.log(`- ${item}`);
      }
    }

    if (recommendations.commands.length > 0) {
      console.log("");
      console.log("Recommended commands:");
      for (const command of recommendations.commands) {
        console.log(`- ${command}`);
      }
    }
  }

  if (reportRequested) {
    const reportTarget = resolve(outputDir, reportPath);
    const specsDir = resolve(outputDir, "specs");
    if (reportTarget === specsDir || reportTarget.startsWith(`${specsDir}${sep}`)) {
      throw new Error("Upgrade report cannot be written under specs/. Use a docs/ path instead.");
    }
    const reportText = buildUpgradeReport({
      mode,
      outputDir,
      context,
      actions,
      dryRun,
      overwriteExisting,
      blockedCurrentUpgrade,
      reportPath,
      summary,
      preservedDifferent
    });
    mkdirSync(dirname(reportTarget), { recursive: true });
    writeFileSync(reportTarget, reportText, "utf8");
    jsonResult.reportPath = reportTarget;
    if (!jsonMode) {
      console.log("");
      console.log(`Upgrade report written: ${reportTarget}`);
    }
  }

  if (jsonOut) {
    jsonResult.jsonOutPath = writeJsonArtifact(outputDir, jsonOut, jsonResult);
  }

  if (dryRun) {
    if (jsonMode) {
      process.stdout.write(`${JSON.stringify(jsonResult, null, 2)}\n`);
    } else {
      console.log("");
      console.log("Dry run only. No files were changed.");
      if (blockedCurrentUpgrade) {
        console.log("Current mode is blocked until the differing workflow files are refreshed with --overwrite-existing.");
      }
    }
    return;
  }

  if (blockedCurrentUpgrade) {
    throw new Error(
      "Current mode requires a complete current-line workflow set. Re-run with --overwrite-existing after reviewing the planned workflow-file refresh."
    );
  }

  for (const action of writeActions) {
    mkdirSync(dirname(action.targetPath), { recursive: true });
    copyFileSync(action.sourcePath, action.targetPath);

    const sourceText = readText(action.sourcePath);
    const renderedText = applyPlaceholderMapping(sourceText, context);
    if (renderedText !== sourceText) {
      writeFileSync(action.targetPath, renderedText, "utf8");
    }
  }

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(jsonResult, null, 2)}\n`);
  } else {
    console.log("");
    console.log("Upgrade complete.");
    console.log("Next: run project-engineering-workflow doctor --output-dir \"" + outputDir + "\"");
  }
}

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (options.help || command === "help") {
    usage();
  } else if (command === "init") {
    init(options);
  } else if (command === "doctor") {
    doctor(options);
  } else if (command === "release-doctor") {
    releaseDoctor(options);
  } else if (command === "memory-index" || command === "rebuild-memory-index") {
    memoryIndex(options);
  } else if (command === "upgrade") {
    upgrade(options);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  const usageHints = [
    "Unknown argument:",
    "Missing value for",
    "Missing required option:",
    "Unknown command:"
  ];
  if (usageHints.some((prefix) => error.message.startsWith(prefix))) {
    console.error("");
    usage();
  }
  process.exit(1);
}
