#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workflowRoot = resolve(scriptDir, "..");
const templateRoot = join(workflowRoot, "assets", "template-root");
const markdownTick = String.fromCharCode(96);
const block = (...lines) => lines.join("\n");
const formalConfirmationVersion = "0.7.0";

function parseOutputDir(argv) {
  const index = argv.indexOf("--output-dir");
  const outputDir = index >= 0 ? argv[index + 1] : null;
  if (!outputDir || outputDir.startsWith("--")) {
    throw new Error("Usage: node scripts/sync-formal-confirmation.mjs --output-dir /absolute/path/to/project");
  }
  return resolve(outputDir);
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function versionAtLeast(version, minimum) {
  const parse = (value) => value.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const [major, minor, patch] = parse(version);
  const [minimumMajor, minimumMinor, minimumPatch] = parse(minimum);

  return major > minimumMajor ||
    (major === minimumMajor && minor > minimumMinor) ||
    (major === minimumMajor && minor === minimumMinor && patch >= minimumPatch);
}

function writeIfChanged(path, text) {
  const current = readIfExists(path);
  if (current === text) {
    return false;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
  return true;
}

function appendOnce(outputDir, relativePath, marker, content) {
  const path = join(outputDir, relativePath);
  const current = readIfExists(path);
  if (current == null || current.includes(marker)) {
    return false;
  }
  return writeIfChanged(path, `${current.trimEnd()}\n\n${content.trim()}\n`);
}

function patchWorkflowState(outputDir) {
  const path = join(outputDir, ".specify/templates/workflow-state-template.yaml");
  const current = readIfExists(path);
  if (current == null) {
    return false;
  }

  let updated = current;
  if (!updated.includes("  design: null")) {
    updated = updated.replace(
      "artifact_versions:\n  requirement: null\n",
      "artifact_versions:\n  requirement: null\n  design: null\n"
    );
  }
  if (!updated.includes("  task_breakdown: null")) {
    updated = updated.replace(
      "  plan: null\n  verification: null\n",
      "  plan: null\n  task_breakdown: null\n  verification: null\n"
    );
  }
  if (!updated.includes("  design_plan:")) {
    updated = updated.replace(
      "  child_task_plan:\n",
      "  design_plan:\n    required: false\n    status: pending\n    approved_version: null\n  child_task_plan:\n"
    );
  }
  return writeIfChanged(path, updated);
}

const outputDir = parseOutputDir(process.argv.slice(2));
if (!existsSync(outputDir)) {
  throw new Error(`Target project does not exist: ${outputDir}`);
}

const sections = [
  ["AGENTS.md", "## v0.7 Formal Implementation Confirmation", block(
    "## v0.7 Formal Implementation Confirmation",
    "",
    "For formal standard and controlled implementation, publish and confirm one aligned package before editing:",
    "",
    "1. 设计方案 vN: structure, UI/API/data behavior, alternatives, tradeoffs, and non-goals.",
    "2. 任务拆解 vN: ordered TASK-* items mapped to confirmed ITEM-*, dependencies, allowed paths, completion conditions, and evidence.",
    "3. 影响范围 vN: direct/indirect, data, interfaces/config, security/permissions, compatibility, performance, tests, release/rollback, Workflow/Skill, and explicit non-impact.",
    "4. 验收与自测计划：acceptance criteria, commands, visible path, evidence, and rollback trigger.",
    "",
    "Do not start formal implementation until the package version is explicitly confirmed. If a material design, scope, permission, data, migration, shared-module, or acceptance change appears, pause, publish vN+1, and reconfirm the delta. After implementation, run self-test and an impact-scope self-check, publish 验证报告 vN, and wait for awaiting_user_acceptance."
  )],
  [".agents/skills/project-requirement-gate/SKILL.md", "## v0.7 Formal Implementation Handoff", block(
    "## v0.7 Formal Implementation Handoff",
    "",
    "For standard and controlled work, the requirement gate must hand off a versioned 正式实现前置包: requirement, design proposal, task breakdown, impact scope, acceptance/self-test plan, and rollback. Coding is blocked until this package is explicitly confirmed. Material changes require a new package version."
  )],
  [".agents/skills/project-scope-impact-guard/SKILL.md", "## v0.7 Confirmation Boundary", block(
    "## v0.7 Confirmation Boundary",
    "",
    "影响范围 vN is part of the formal confirmation package and must be reviewed with 设计方案 vN, 任务拆解 vN, and the acceptance/self-test plan. A new data path, permission, migration, shared module, performance assumption, release action, or user-visible behavior requires 影响范围 vN+1 before implementation continues."
  )],
  [".agents/skills/project-tech-solution/SKILL.md", "## v0.7 Doctor Contract Alignment", block(
    "## v0.7 Doctor Contract Alignment",
    "",
    "Publish 设计方案 vN, 任务拆解 vN, and linked 影响范围 vN before editing; formal " + markdownTick + "standard" + markdownTick + " and " + markdownTick + "controlled" + markdownTick + " implementation requires explicit confirmation of the aligned package. Include acceptance/self-test and rollback; a material delta must be published as vN+1."
  )],
  [".agents/skills/project-verification-loop/SKILL.md", "## v0.7 Doctor Contract Alignment", block(
    "## v0.7 Doctor Contract Alignment",
    "",
    "After checks, perform an impact-scope self-check and 影响范围自查 against the confirmed design, task breakdown, and impact scope. Compare the actual diff, runtime behavior, Workflow/Skill assets, permissions, data paths, and user-visible states. Any unconfirmed material impact blocks delivery until the scope delta is confirmed."
  )],
  [".agents/skills/project-test-and-report/SKILL.md", "## v0.7 Impact Scope Self-Check", block(
    "## v0.7 Impact Scope Self-Check",
    "",
    "Compare the actual diff and runtime behavior against the confirmed design, task breakdown, and impact scope. Record an impact-scope self-check in 验证报告 vN; keep the task in awaiting_user_acceptance until the user confirms acceptance or requests revision."
  )],
  [".specify/templates/plan-template.md", "## v0.7 Formal Confirmation Addendum", block(
    "## v0.7 Formal Confirmation Addendum",
    "",
    "- 设计方案版本：v1",
    "- 任务拆解版本：v1",
    "- 影响范围版本：v1",
    "- 验收与自测计划：",
    "- 用户确认：确认执行 / 修改方案 / 缩小范围 / 补充要求",
    "",
    "standard / controlled 正式实现前必须确认上述版本；实质范围变化时更新为 vN+1。"
  )],
  [".specify/templates/tasks-template.md", "## v0.7 Formal Confirmation Addendum", block(
    "## v0.7 Formal Confirmation Addendum",
    "",
    "- 设计方案版本：",
    "- 任务拆解版本：",
    "- 影响范围版本：",
    "- 验收与自测计划：",
    "- 用户确认：确认执行 / 修改 / 缩小范围 / 补充要求"
  )],
  [".specify/templates/delivery-summary-template.md", "## v0.7 Impact Scope Self-Check", block(
    "## v0.7 Impact Scope Self-Check",
    "",
    "- 设计方案版本：",
    "- 任务拆解版本：",
    "- 影响范围版本：",
    "- 影响范围自查：通过 / 有风险 / 需重新确认",
    "- 用户验收：确认验收 / 继续修正 / 补充验证 / 重新打开事项"
  )],
  ["docs/Codex团队开发说明.md", "## v0.7 Formal Confirmation Loop", "## v0.7 Formal Confirmation Loop\n\n正式实现前形成并确认 设计方案 vN、任务拆解 vN、影响范围 vN 和验收与自测计划。实质范围变化时暂停并发布 vN+1；完成后进行影响范围自查并等待用户验收。"],
  ["docs/ClaudeCode团队开发说明.md", "## v0.7 Formal Confirmation Loop", "## v0.7 Formal Confirmation Loop\n\nClaude Code 与 Codex 共用 设计方案 vN -> 任务拆解 vN -> 影响范围 vN -> 验收与自测计划 -> 用户确认 门禁，Hooks 不得绕过确认或把新增范围并入旧版本。"],
  ["docs/AI协作架构.md", "## v0.7 Formal Confirmation Loop", "## v0.7 Formal Confirmation Loop\n\n交付工件增加 design.md；正式实现前锁定设计、任务、影响和验收版本，实质变化时进入 scope delta，交付前完成影响范围自查并等待用户验收。"],
  ["docs/升级兼容策略.md", "## v0.7 Formal Confirmation Loop", "## v0.7 Formal Confirmation Loop\n\nv0.7 为旧项目增量接入方案确认闭环，不改写历史 specs、业务代码、Profile 或记忆正文；正式实现前需要确认设计、任务、影响和验收计划。"]
];

const changed = [];
for (const [relativePath, marker, content] of sections) {
  if (appendOnce(outputDir, relativePath, marker, content)) {
    changed.push(relativePath);
  }
}

const designTemplatePath = join(outputDir, ".specify/templates/design-template.md");
if (!existsSync(designTemplatePath)) {
  mkdirSync(dirname(designTemplatePath), { recursive: true });
  copyFileSync(join(templateRoot, ".specify/templates/design-template.md"), designTemplatePath);
  changed.push(".specify/templates/design-template.md");
}

if (patchWorkflowState(outputDir)) {
  changed.push(".specify/templates/workflow-state-template.yaml");
}

const versionPath = join(outputDir, ".specify/workflow-version.txt");
const existingWorkflowVersion = readIfExists(versionPath)?.trim() ?? "";
// This migration must never make a newer workflow line appear older.
const workflowVersion = versionAtLeast(existingWorkflowVersion, formalConfirmationVersion)
  ? existingWorkflowVersion
  : formalConfirmationVersion;
if (existingWorkflowVersion !== workflowVersion) {
  writeIfChanged(versionPath, `${workflowVersion}\n`);
  changed.push(".specify/workflow-version.txt");
}

console.log(JSON.stringify({
  target: outputDir,
  version: workflowVersion,
  formalConfirmationVersion,
  changed,
  preserved: true,
  specsUntouched: true,
  businessCodeUntouched: true
}, null, 2));
