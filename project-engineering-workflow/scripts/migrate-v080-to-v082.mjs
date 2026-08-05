#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateWorkflowDirectory } from "./workflow-manifest-validator.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const templateRoot = join(packageRoot, "assets", "template-root");
const targetVersion = "0.8.2";

const workflowRouterPath = ".agents/skills/project-workflow-router/SKILL.md";
const verificationLoopPath = ".agents/skills/project-verification-loop/SKILL.md";
const workflowStatePath = ".specify/templates/workflow-state-template.yaml";
const featureDeliveryPath = ".skill-os/workflows/scenario-feature-delivery/workflow.yaml";
const versionPath = ".specify/workflow-version.txt";
const agentsPath = "AGENTS.md";
const codexGuidePath = "docs/Codex团队开发说明.md";

const conversationSectionMarker = "## Conversation Initiation";
const agentsSectionMarker = "## v0.8.2 Conversation-Initiated Scenario Loop";
const guideSectionMarker = "## v0.8.2 会话启动 Loop Engineering";
const agentsDoctorContract = "Conversation is the only execution entry for Scenario Loop Engineering. The desktop workbench may read and display imported evidence, but it never starts Codex, authorizes implementation, or creates a Loop on the user's behalf.";

const agentsSection = `${agentsSectionMarker}

- Codex 项目会话是 Scenario Loop Engineering 的唯一执行入口；桌面端只负责观察、治理和展示已导入证据，不能代替用户确认或启动 Codex。
- 对 \`standard\` / \`controlled\` 研发请求，在正式确认包中写明主 Workflow、依赖、Loop 上限、质量门禁和停止条件。
- 用户确认同一版正式包后，才在当前会话启动 Loop，并把 \`initiation_source: conversation\`、会话引用和已确认版本写入当前 feature 的 \`workflow-state.yaml\`。
- 范围、契约、权限、迁移、外部影响或发布影响发生实质变化时，停止当前 Loop，发布 \`vN+1\` 并重新确认。

${agentsDoctorContract}
`;

const guideSection = `${guideSectionMarker}

1. 用户直接在 Codex 对应项目会话提出研发任务，不需要先在桌面端点击“启动 Loop”。
2. Agent 完成 Profile 与任务通道判断后，为 \`standard\` / \`controlled\` 请求推荐至多一个主 Workflow，并展示依赖、质量门禁、轮次和停止条件。
3. 用户确认设计方案、任务拆解、影响范围、验收与自测计划后，当前会话创建 Scenario Loop Run，并持续写入当前 feature 的 \`workflow-state.yaml\`。
4. 桌面端导入并展示项目证据、调用链路、质量和预算；它不是执行授权入口。
5. Loop 达到质量门禁且无阻断项后进入用户验收；范围变化、预算耗尽或重复失败时停止并等待用户决定。
`;

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run" || arg === "--json") {
      options[arg.slice(2)] = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function appendSection(current, marker, section) {
  if (current.includes(marker)) {
    return current;
  }
  return `${current.trimEnd()}\n\n${section.trim()}\n`;
}

function mergeAgentsContract(current) {
  const withSection = appendSection(current, agentsSectionMarker, agentsSection);
  if (withSection.includes(agentsDoctorContract)) {
    return withSection;
  }
  return `${withSection.trimEnd()}\n\n${agentsDoctorContract}\n`;
}

function mergeConversationRouter(current, canonical) {
  if (current.includes(conversationSectionMarker)) {
    return current;
  }

  const sectionStart = canonical.indexOf(conversationSectionMarker);
  const nextSection = canonical.indexOf("## Scenario Loop Record", sectionStart);
  if (sectionStart < 0 || nextSection < 0) {
    throw new Error("Canonical workflow router is missing the conversation section.");
  }

  const insertionPoint = current.indexOf("## Scenario Loop Record");
  if (insertionPoint < 0) {
    throw new Error("Project workflow router does not contain the Scenario Loop Record section.");
  }

  const conversationSection = canonical.slice(sectionStart, nextSection).trimEnd();
  return `${current.slice(0, insertionPoint)}${conversationSection}\n\n${current.slice(insertionPoint)}`;
}

function mergeScenarioLoopState(current, canonical) {
  if (/^scenario_loop_runs:/m.test(current)) {
    return current;
  }

  const marker = "# Conversation-initiated operational Loop records only.";
  const sectionStart = canonical.indexOf(marker);
  if (sectionStart < 0) {
    throw new Error("Canonical workflow state template is missing Scenario Loop records.");
  }

  return `${current.trimEnd()}\n\n${canonical.slice(sectionStart).trim()}\n`;
}

function mergeCanonicalSection(current, canonical, heading, nextHeading) {
  if (current.includes(heading)) {
    return current;
  }

  const sectionStart = canonical.indexOf(heading);
  const sectionEnd = canonical.indexOf(nextHeading, sectionStart);
  const insertionPoint = current.indexOf(nextHeading);
  if (sectionStart < 0 || sectionEnd < 0 || insertionPoint < 0) {
    throw new Error(`Cannot merge ${heading}; the expected section boundary is missing.`);
  }

  const section = canonical.slice(sectionStart, sectionEnd).trimEnd();
  return `${current.slice(0, insertionPoint)}${section}\n\n${current.slice(insertionPoint)}`;
}

function ensureRequiredProjectFiles(projectRoot) {
  const required = [
    agentsPath,
    codexGuidePath,
    workflowRouterPath,
    verificationLoopPath,
    workflowStatePath,
    versionPath,
    ".skill-os/workflow-registry.yaml"
  ];
  const missing = required.filter((path) => !existsSync(join(projectRoot, path)));
  if (missing.length > 0) {
    throw new Error(`Project is missing required workflow files: ${missing.join(", ")}`);
  }
}

function backupFiles(projectRoot, backupDir, changes) {
  const backedUp = [];
  for (const change of changes) {
    const source = join(projectRoot, change.path);
    if (!existsSync(source)) {
      continue;
    }
    const destination = join(backupDir, "files", change.path);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    backedUp.push(change.path);
  }
  return backedUp;
}

function planMigration(projectRoot) {
  ensureRequiredProjectFiles(projectRoot);

  const declaredVersion = readText(join(projectRoot, versionPath)).trim();
  if (!["0.8.0", "0.8.1", targetVersion].includes(declaredVersion)) {
    throw new Error(`Expected workflow version 0.8.0, 0.8.1, or ${targetVersion}; found ${declaredVersion || "empty"}.`);
  }

  const canonicalRouter = readText(join(templateRoot, workflowRouterPath));
  const canonicalState = readText(join(templateRoot, workflowStatePath));
  const canonicalVerificationLoop = readText(join(templateRoot, verificationLoopPath));
  const canonicalFeatureDelivery = readText(join(templateRoot, featureDeliveryPath));

  const currentRouter = readText(join(projectRoot, workflowRouterPath));
  const currentState = readText(join(projectRoot, workflowStatePath));
  const currentVerificationLoop = readText(join(projectRoot, verificationLoopPath));
  const currentAgents = readText(join(projectRoot, agentsPath));
  const currentGuide = readText(join(projectRoot, codexGuidePath));
  const featureDeliveryTarget = join(projectRoot, featureDeliveryPath);
  const currentFeatureDelivery = existsSync(featureDeliveryTarget)
    ? readText(featureDeliveryTarget)
    : null;

  const candidates = [
    {
      path: featureDeliveryPath,
      content: currentFeatureDelivery ?? canonicalFeatureDelivery,
      action: currentFeatureDelivery == null
        ? "add"
        : currentFeatureDelivery === canonicalFeatureDelivery
          ? "unchanged"
          : "preserve-custom"
    },
    {
      path: workflowRouterPath,
      content: mergeConversationRouter(currentRouter, canonicalRouter),
      action: "merge"
    },
    {
      path: workflowStatePath,
      content: mergeScenarioLoopState(currentState, canonicalState),
      action: "merge"
    },
    {
      path: verificationLoopPath,
      content: mergeCanonicalSection(
        currentVerificationLoop,
        canonicalVerificationLoop,
        "## Scenario Loop Evidence",
        "## Result States"
      ),
      action: "merge"
    },
    {
      path: agentsPath,
      content: mergeAgentsContract(currentAgents),
      action: "append"
    },
    {
      path: codexGuidePath,
      content: appendSection(currentGuide, guideSectionMarker, guideSection),
      action: "append"
    },
    {
      path: versionPath,
      content: `${targetVersion}\n`,
      action: "update-version"
    }
  ];

  const changes = candidates
    .map((candidate) => {
      const target = join(projectRoot, candidate.path);
      const before = existsSync(target) ? readText(target) : null;
      return {
        ...candidate,
        beforeHash: before == null ? null : sha256(before),
        afterHash: sha256(candidate.content),
        changed: before !== candidate.content
      };
    });

  return { declaredVersion, changes };
}

function validateProjectWorkflows(projectRoot) {
  return validateWorkflowDirectory(join(projectRoot, ".skill-os", "workflows"), {
    skillsDir: join(projectRoot, ".agents", "skills"),
    allowUnresolvedTemplates: false
  });
}

function runDoctor(projectRoot) {
  const result = spawnSync(
    process.execPath,
    [join(packageRoot, "bin", "project-engineering-workflow.mjs"), "doctor", "--output-dir", projectRoot, "--json"],
    { encoding: "utf8" }
  );

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(`Doctor did not return valid JSON: ${result.stderr || result.stdout}`);
  }

  if (result.status !== 0 || report.status === "failed") {
    const issues = report.contractIssues?.map((issue) => `${issue.path}: ${issue.missing}`).join("; ") ?? "unknown issue";
    throw new Error(`Doctor failed after migration: ${issues}`);
  }
  return report;
}

function migrate(options) {
  if (!options["output-dir"]) {
    throw new Error("Usage: migrate-v080-to-v082.mjs --output-dir <project> [--backup-dir <path>] [--dry-run] [--json]");
  }

  const projectRoot = resolve(options["output-dir"]);
  const dryRun = options["dry-run"] === true;
  const backupDir = options["backup-dir"] ? resolve(options["backup-dir"]) : null;

  const beforeValidation = validateProjectWorkflows(projectRoot);
  if (!beforeValidation.valid) {
    throw new Error(`Workflow validation failed before migration: ${beforeValidation.issues.join("; ")}`);
  }

  const plan = planMigration(projectRoot);
  const writeChanges = plan.changes.filter((change) => change.changed);
  let backedUp = [];

  if (!dryRun) {
    if (!backupDir) {
      throw new Error("A --backup-dir is required for a non-dry-run migration.");
    }
    mkdirSync(backupDir, { recursive: true });
  }

  if (!dryRun && writeChanges.length > 0) {
    backedUp = backupFiles(projectRoot, backupDir, writeChanges);

    for (const change of writeChanges) {
      const target = join(projectRoot, change.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, change.content, "utf8");
    }
  }

  const afterValidation = dryRun ? null : validateProjectWorkflows(projectRoot);
  if (afterValidation && !afterValidation.valid) {
    throw new Error(`Workflow validation failed after migration: ${afterValidation.issues.join("; ")}`);
  }
  const doctorReport = dryRun ? null : runDoctor(projectRoot);

  const result = {
    command: "migrate-v080-to-v082",
    target: projectRoot,
    fromVersion: plan.declaredVersion,
    toVersion: targetVersion,
    dryRun,
    backupDir: dryRun ? null : backupDir,
    beforeManifestCount: beforeValidation.manifestCount,
    afterManifestCount: afterValidation?.manifestCount ?? null,
    valid: afterValidation?.valid ?? beforeValidation.valid,
    doctor: doctorReport
      ? {
          status: doctorReport.status,
          decision: doctorReport.decision,
          summary: doctorReport.summary
        }
      : null,
    changes: plan.changes.map(({ path, action, changed, beforeHash, afterHash }) => ({
      path,
      action,
      changed,
      beforeHash,
      afterHash
    })),
    backedUp,
    protected: ["business code", "specs/**", "project Profile", "memory records", "project-specific AGENTS content"]
  };

  if (!dryRun) {
    writeFileSync(join(backupDir, "migration-manifest.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }

  if (options.json === true) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log(`${dryRun ? "Migration preview" : "Migration complete"}: ${projectRoot}`);
  console.log(`Workflow: ${plan.declaredVersion} -> ${targetVersion}`);
  for (const change of result.changes) {
    console.log(`${change.changed ? "CHANGE" : "KEEP  "} ${change.path} (${change.action})`);
  }
  console.log(`Manifest validation: ${result.valid ? "passed" : "failed"}`);
}

try {
  migrate(parseArgs(process.argv.slice(2)));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
