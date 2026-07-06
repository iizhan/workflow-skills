#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function assertFile(relativePath) {
  if (!existsSync(join(root, relativePath))) {
    throw new Error(`Missing file: ${relativePath}`);
  }
}

function assertIncludes(relativePath, text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(`${message}\nMissing '${needle}' in ${relativePath}`);
  }
}

const expectedSkillFiles = [
  "project-engineering-workflow/assets/template-root/.agents/skills/project-dev-core/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-js/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-react/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-vue/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-css/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-security-review/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-verification-loop/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-session-summary/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-skill-upgrade-advisor/SKILL.md",
  "project-engineering-workflow/references/06-ecc-benchmark.md",
  "evaluations/skills-workflow/templates/quality-metrics.md",
  "evaluations/skills-workflow/templates/token-economics.md",
  "evaluations/skills-workflow/scripts/estimate-token-cost.mjs"
];

for (const file of expectedSkillFiles) {
  assertFile(file);
}

const agents = read("project-engineering-workflow/assets/template-root/AGENTS.md");
const skill = read("project-engineering-workflow/SKILL.md");
const cli = read("project-engineering-workflow/bin/project-engineering-workflow.mjs");
const doctor = read("project-engineering-workflow/scripts/doctor.sh");
const codexDoc = read("project-engineering-workflow/assets/template-root/docs/Codex团队开发说明.md");
const claudeDoc = read("project-engineering-workflow/assets/template-root/docs/ClaudeCode团队开发说明.md");
const architectureDoc = read("project-engineering-workflow/assets/template-root/docs/AI协作架构.md");
const devCore = read("project-engineering-workflow/assets/template-root/.agents/skills/project-dev-core/SKILL.md");
const frontend = read("project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/SKILL.md");
const security = read("project-engineering-workflow/assets/template-root/.agents/skills/project-security-review/SKILL.md");
const verification = read("project-engineering-workflow/assets/template-root/.agents/skills/project-verification-loop/SKILL.md");
const summary = read("project-engineering-workflow/assets/template-root/.agents/skills/project-session-summary/SKILL.md");
const advisor = read("project-engineering-workflow/assets/template-root/.agents/skills/project-skill-upgrade-advisor/SKILL.md");
const sessionHistory = read("project-engineering-workflow/assets/template-root/.specify/memory/session-history.md");
const upgradeBacklog = read("project-engineering-workflow/assets/template-root/.specify/memory/skill-upgrade-backlog.md");
const evaluationReadme = read("evaluations/skills-workflow/README.md");
const runRecordTemplate = read("evaluations/skills-workflow/templates/run-record.md");
const scorecardTemplate = read("evaluations/skills-workflow/templates/scorecard.md");
const qualityMetrics = read("evaluations/skills-workflow/templates/quality-metrics.md");
const tokenEconomics = read("evaluations/skills-workflow/templates/token-economics.md");
const validationRun = read("evaluations/skills-workflow/runs/2026-07-06-initial-validation.md");

for (const required of [
  "$project-dev-core",
  "$project-frontend-standards",
  "$project-security-review",
  "$project-verification-loop",
  "$project-session-summary",
  "$project-skill-upgrade-advisor"
]) {
  assertIncludes("project-engineering-workflow/assets/template-root/AGENTS.md", agents, required, "AGENTS workflow should route through required skills");
}

for (const required of [
  "project-security-review",
  "project-verification-loop",
  "references/06-ecc-benchmark.md"
]) {
  assertIncludes("project-engineering-workflow/SKILL.md", skill, required, "Main skill should document new workflow capabilities");
}

for (const required of [
  "project-security-review/SKILL.md",
  "project-verification-loop/SKILL.md",
  "docs/Codex团队开发说明.md",
  "docs/ClaudeCode团队开发说明.md",
  "session-history.md",
  "skill-upgrade-backlog.md"
]) {
  assertIncludes("project-engineering-workflow/bin/project-engineering-workflow.mjs", cli, required, "CLI doctor should require new workflow files");
  assertIncludes("project-engineering-workflow/scripts/doctor.sh", doctor, required, "Shell doctor should require new workflow files");
}

assertIncludes("project-dev-core", devCore, "KISS", "Dev core should include baseline coding quality rules");
assertIncludes("project-dev-core", devCore, "Validate inputs at system boundaries", "Dev core should include boundary validation");
const frontendNeedles = [
  "Make controls visibly responsive",
  "Do not add analytics",
  "vertical fragments"
];
for (const needle of frontendNeedles) {
  assertIncludes("project-frontend-standards", frontend, needle, "Frontend standards should guard UI interaction and privacy");
}

for (const needle of ["Secrets", "Input", "Authorization", "External effects"]) {
  assertIncludes("project-security-review", security, needle, "Security review should cover sensitive boundaries");
}

for (const needle of ["Build or compile", "Typecheck", "Diff Review", "Do not invent commands"]) {
  assertIncludes("project-verification-loop", verification, needle, "Verification loop should be staged and repo-adaptive");
}

assertIncludes("project-session-summary", summary, "Friction Signals", "Session summary should capture upgrade signals");
assertIncludes("project-skill-upgrade-advisor", advisor, "confidence", "Upgrade advisor should reason about confidence");
assertIncludes("project-skill-upgrade-advisor", advisor, "project-local", "Upgrade advisor should prefer project-local updates");
assertIncludes("docs/Codex团队开发说明.md", codexDoc, "project-verification-loop", "Codex doc should include the current verification workflow");
assertIncludes("docs/Codex团队开发说明.md", codexDoc, "project-skill-upgrade-advisor", "Codex doc should include skill upgrade routing");
assertIncludes("docs/ClaudeCode团队开发说明.md", claudeDoc, "hooks", "Claude Code doc should explain hook boundaries");
assertIncludes("docs/ClaudeCode团队开发说明.md", claudeDoc, "默认 starter 不自动生成这些文件", "Claude Code doc should keep hooks opt-in");
assertIncludes("docs/ClaudeCode团队开发说明.md", claudeDoc, "不能绕过需求、范围、审查、验证和交付记录", "Claude Code doc should preserve workflow gates");
assertIncludes("docs/AI协作架构.md", architectureDoc, "Codex 与 Claude Code 适配", "Architecture doc should distinguish harness adaptation");
assertIncludes("docs/AI协作架构.md", architectureDoc, "Claude Code 专属说明", "Architecture doc should point to Claude Code guidance");
assertIncludes("session-history.md", sessionHistory, "[DATE] 任务", "Generated session history should start as a reusable blank template");
assertIncludes("skill-upgrade-backlog.md", upgradeBacklog, "[DATE] 观察", "Generated skill upgrade backlog should start as a reusable blank template");

for (const needle of [
  "Routing precision",
  "Task outcome",
  "Safety and scope",
  "Verification strength",
  "Friction cost",
  "Output clarity",
  "Maintainability",
  "Learning loop",
  "Candidate must beat baseline by at least 10 points"
]) {
  assertIncludes("templates/quality-metrics.md", qualityMetrics, needle, "Quality metrics should distinguish good/bad skill behavior");
}

for (const needle of [
  "quality score >= 80 / 100",
  "candidate beats baseline by at least 10 points",
  "small-task token ratio is normally <= 1.20 versus baseline",
  "estimated skill context share is normally < 25% of candidate input tokens",
  "irrelevant skills are not loaded for small tasks"
]) {
  assertIncludes("evaluations/skills-workflow/README.md", evaluationReadme, needle, "Evaluation README should require quality gates beyond hit/miss");
}

for (const needle of [
  "Late-triggered",
  "Total quality score",
  "Baseline score",
  "Token Economics",
  "Cost per quality point",
  "Required gate failures"
]) {
  assertIncludes("templates/run-record.md", runRecordTemplate, needle, "Run record should capture quality and routing failure modes");
}

for (const needle of [
  "Real usage telemetry",
  "input_tokens",
  "output_tokens",
  "estimated_skill_tokens",
  "Token ratio",
  "Cost per quality point",
  "estimated_skill_tokens / candidate_input_tokens"
]) {
  assertIncludes("templates/token-economics.md", tokenEconomics, needle, "Token economics should define measurable cost metrics");
}

assertIncludes("templates/scorecard.md", scorecardTemplate, "templates/quality-metrics.md", "Scorecard should point to quality metrics");
assertIncludes("runs/2026-07-06-initial-validation.md", validationRun, "Total quality score: 91 / 100", "Validation run should record a quality score");
assertIncludes("runs/2026-07-06-initial-validation.md", validationRun, "Baseline score: not measured in this run", "Validation run should not pretend baseline A/B was measured");
assertIncludes("runs/2026-07-06-initial-validation.md", validationRun, "Token source: static estimate", "Validation run should disclose token measurement source");
assertIncludes("runs/2026-07-06-initial-validation.md", validationRun, "Token ratio: unavailable until paired A/B replay", "Validation run should not pretend token A/B was measured");

for (const [relativePath, text] of [
  ["project-engineering-workflow/assets/template-root/.specify/memory/session-history.md", sessionHistory],
  ["project-engineering-workflow/assets/template-root/.specify/memory/skill-upgrade-backlog.md", upgradeBacklog]
]) {
  if (/20\d{2}-\d{2}-\d{2}/.test(text)) {
    throw new Error(`Generated memory template should not contain dated starter history: ${relativePath}`);
  }
}

console.log("Skills workflow evaluation contract passed.");
