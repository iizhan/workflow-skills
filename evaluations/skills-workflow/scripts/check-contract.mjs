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
  "project-engineering-workflow/assets/template-root/.agents/skills/project-requirement-gate/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-scope-impact-guard/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-tech-solution/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-memory-router/references/memory-governance.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-memory-router/references/memory-data-roles.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-memory-router/references/memory-retention-retrieval.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-memory-router/references/memory-conflict-session.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-evolution-router/references/evolution-governance.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-superpowers-router/references/ui-automation-contract.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-superpowers-router/references/implementation-contract.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-superpowers-router/references/review-contract.md",
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
  "evaluations/skills-workflow/scripts/estimate-token-cost.mjs",
  "evaluations/skills-workflow/cases/adaptive-confirmation.md",
  "evaluations/skills-workflow/runs/2026-07-14-adaptive-confirmation-validation.md"
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
const requirementGate = read("project-engineering-workflow/assets/template-root/.agents/skills/project-requirement-gate/SKILL.md");
const scopeImpactGuard = read("project-engineering-workflow/assets/template-root/.agents/skills/project-scope-impact-guard/SKILL.md");
const techSolution = read("project-engineering-workflow/assets/template-root/.agents/skills/project-tech-solution/SKILL.md");
const memoryRouter = read("project-engineering-workflow/assets/template-root/.agents/skills/project-memory-router/SKILL.md");
const memoryGovernance = read("project-engineering-workflow/assets/template-root/.agents/skills/project-memory-router/references/memory-governance.md");
const memoryDataRoles = read("project-engineering-workflow/assets/template-root/.agents/skills/project-memory-router/references/memory-data-roles.md");
const memoryRetentionRetrieval = read("project-engineering-workflow/assets/template-root/.agents/skills/project-memory-router/references/memory-retention-retrieval.md");
const memoryConflictSession = read("project-engineering-workflow/assets/template-root/.agents/skills/project-memory-router/references/memory-conflict-session.md");
const evolutionRouter = read("project-engineering-workflow/assets/template-root/.agents/skills/project-evolution-router/SKILL.md");
const evolutionGovernance = read("project-engineering-workflow/assets/template-root/.agents/skills/project-evolution-router/references/evolution-governance.md");
const superpowersRouter = read("project-engineering-workflow/assets/template-root/.agents/skills/project-superpowers-router/SKILL.md");
const uiAutomationContract = read("project-engineering-workflow/assets/template-root/.agents/skills/project-superpowers-router/references/ui-automation-contract.md");
const implementationContract = read("project-engineering-workflow/assets/template-root/.agents/skills/project-superpowers-router/references/implementation-contract.md");
const reviewContract = read("project-engineering-workflow/assets/template-root/.agents/skills/project-superpowers-router/references/review-contract.md");
const frontend = read("project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/SKILL.md");
const security = read("project-engineering-workflow/assets/template-root/.agents/skills/project-security-review/SKILL.md");
const verification = read("project-engineering-workflow/assets/template-root/.agents/skills/project-verification-loop/SKILL.md");
const summary = read("project-engineering-workflow/assets/template-root/.agents/skills/project-session-summary/SKILL.md");
const advisor = read("project-engineering-workflow/assets/template-root/.agents/skills/project-skill-upgrade-advisor/SKILL.md");
const testAndReport = read("project-engineering-workflow/assets/template-root/.agents/skills/project-test-and-report/SKILL.md");
const workflowStateTemplate = read("project-engineering-workflow/assets/template-root/.specify/templates/workflow-state-template.yaml");
const deliverySummaryTemplate = read("project-engineering-workflow/assets/template-root/.specify/templates/delivery-summary-template.md");
const adaptiveConfirmationCase = read("evaluations/skills-workflow/cases/adaptive-confirmation.md");
const sessionHistory = read("project-engineering-workflow/assets/template-root/.specify/memory/session-history.md");
const upgradeBacklog = read("project-engineering-workflow/assets/template-root/.specify/memory/skill-upgrade-backlog.md");
const evaluationReadme = read("evaluations/skills-workflow/README.md");
const runRecordTemplate = read("evaluations/skills-workflow/templates/run-record.md");
const scorecardTemplate = read("evaluations/skills-workflow/templates/scorecard.md");
const qualityMetrics = read("evaluations/skills-workflow/templates/quality-metrics.md");
const tokenEconomics = read("evaluations/skills-workflow/templates/token-economics.md");
const tokenEstimator = read("evaluations/skills-workflow/scripts/estimate-token-cost.mjs");
const validationRun = read("evaluations/skills-workflow/runs/2026-07-06-initial-validation.md");
const adaptiveValidationRun = read("evaluations/skills-workflow/runs/2026-07-14-adaptive-confirmation-validation.md");

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

for (const required of ["fast", "standard", "controlled", "确认执行", "需求版本"]) {
  assertIncludes("project-requirement-gate", requirementGate, required, "Requirement gate should use adaptive, versioned confirmation");
}

for (const required of [
  "Impact Levels",
  "用户影响",
  "数据与迁移影响",
  "接口/配置契约影响",
  "安全与权限影响",
  "兼容性影响",
  "性能与资源影响",
  "测试影响",
  "发布与回滚影响",
  "Workflow/Skill 影响",
  "明确不影响",
  "影响版本"
]) {
  assertIncludes("project-scope-impact-guard", scopeImpactGuard, required, "Scope guard should cover complete impact dimensions");
}

for (const required of ["ITEM-*", "TASK-*", "dependencies", "计划版本与确认选项"]) {
  assertIncludes("project-tech-solution", techSolution, required, "Tech solution should decompose confirmed items into versioned child tasks");
}

for (const required of ["Traceability", "事项与影响证据矩阵", "verified_with_risk", "scope delta"]) {
  assertIncludes("project-verification-loop", verification, required, "Verification should trace approved impact to evidence");
}

for (const required of ["验证报告 vN", "awaiting_user_acceptance", "确认验收", "重新打开事项"]) {
  assertIncludes("project-test-and-report", testAndReport, required, "Final verification should wait for explicit user acceptance");
}

for (const required of ["task_lane:", "confirmation_gates:", "impact_assessment:", "scope_deltas:", "dissatisfaction_categories:"]) {
  assertIncludes("workflow-state-template", workflowStateTemplate, required, "Workflow state should persist adaptive confirmation state");
}

for (const required of ["事项与影响证据矩阵", "awaiting_user_acceptance", "不满意分类"]) {
  assertIncludes("delivery-summary-template", deliverySummaryTemplate, required, "Delivery summary should preserve evidence and acceptance state");
}

for (const required of ["Fast Task", "Controlled Task", "Revision Prompt", "never auto-edit Skills"]) {
  assertIncludes("adaptive-confirmation case", adaptiveConfirmationCase, required, "Evaluation should cover adaptive confirmation and dissatisfaction");
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

for (const required of [
  "const v040ProgressiveReferencePaths",
  '"0.3.1": [...v020OptionalPaths, ...branchReleaseOptionalPaths]',
  '"0.4.0": [...v020OptionalPaths, ...branchReleaseOptionalPaths, ...v040ProgressiveReferencePaths]',
  'maxVersion: "0.3.1"',
  "...v040ProgressiveReferencePaths,",
  'context["__TEST_COMMAND__"] ??=',
  "--test-command"
]) {
  assertIncludes("project-engineering-workflow/bin/project-engineering-workflow.mjs", cli, required, "CLI should preserve real v0.3 compatibility and install the complete v0.4 workflow set");
}

for (const required of [
  "v040_progressive_reference_paths",
  "0.3.0|0.3.1)",
  "0.4.0)",
  "version_at_least",
  "Legacy superpowers router UI contract"
]) {
  assertIncludes("project-engineering-workflow/scripts/doctor.sh", doctor, required, "Shell doctor should gate progressive references and contracts by workflow version");
}

assertIncludes("project-dev-core", devCore, "KISS", "Dev core should include baseline coding quality rules");
assertIncludes("project-dev-core", devCore, "Validate inputs at system boundaries", "Dev core should include boundary validation");
assertIncludes("project-memory-router", memoryRouter, "references/memory-governance.md", "Memory router should keep detailed policy behind progressive disclosure");
assertIncludes("project-memory-router", memoryRouter, "references/memory-data-roles.md", "Memory router should link data roles as a scoped reference");
assertIncludes("project-memory-router", memoryRouter, "references/memory-retention-retrieval.md", "Memory router should link retention/retrieval as a scoped reference");
assertIncludes("project-memory-router", memoryRouter, "references/memory-conflict-session.md", "Memory router should link conflict/session as a scoped reference");
assertIncludes("project-memory-router references", memoryGovernance, "Do not read every memory reference by default", "Memory governance should be a scoped reference map");
assertIncludes("project-memory-router data roles", memoryDataRoles, "Data Role Decision", "Memory data roles reference should preserve data role rules");
assertIncludes("project-memory-router data roles", memoryDataRoles, "infrastructure_reference", "Memory data roles reference should preserve infrastructure role");
assertIncludes("project-memory-router data roles", memoryDataRoles, "blocked_sensitive", "Memory data roles reference should preserve blocked sensitive handling");
assertIncludes("project-memory-router retention retrieval", memoryRetentionRetrieval, "Retrieval Modes", "Memory retention reference should preserve retrieval modes");
assertIncludes("project-memory-router conflict session", memoryConflictSession, "Conflict Rules", "Memory conflict reference should preserve conflict rules");
assertIncludes("project-evolution-router", evolutionRouter, "references/evolution-governance.md", "Evolution router should keep detailed policy behind progressive disclosure");
assertIncludes("project-evolution-router references", evolutionGovernance, "Promotion Heuristics", "Evolution governance reference should preserve promotion rules");
assertIncludes("project-superpowers-router", superpowersRouter, "references/ui-automation-contract.md", "Superpowers router should keep UI contract behind progressive disclosure");
assertIncludes("project-superpowers-router", superpowersRouter, "references/implementation-contract.md", "Superpowers router should keep implementation behind progressive disclosure");
assertIncludes("project-superpowers-router", superpowersRouter, "references/review-contract.md", "Superpowers router should keep review behind progressive disclosure");
assertIncludes("project-superpowers-router", superpowersRouter, "Keep this file as the routing entry only", "Superpowers router should stay a narrow entry path");
assertIncludes("project-superpowers-router references", uiAutomationContract, "UI Automation Contract", "UI automation reference should preserve visual verification contract");
assertIncludes("project-superpowers-router references", uiAutomationContract, "Do not report a full UI pass from static checks alone", "UI automation reference should prevent false UI pass reporting");
assertIncludes("project-superpowers-router implementation reference", implementationContract, "Implementation Contract", "Implementation reference should exist as a separate contract");
assertIncludes("project-superpowers-router implementation reference", implementationContract, "Keep implementation separate from review", "Implementation reference should separate editing from review");
assertIncludes("project-superpowers-router review reference", reviewContract, "Review Contract", "Review reference should exist as a separate contract");
assertIncludes("project-superpowers-router review reference", reviewContract, "accepted` means the direction is approved", "Review reference should define accepted proposal closure semantics");
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

for (const needle of [
  "Static Budget Gates",
  "default skill",
  "router skill",
  "--enforce"
]) {
  assertIncludes("templates/token-economics.md", tokenEconomics, needle, "Token economics should document static budget gates");
}

for (const needle of [
  "budget_report",
  "fast-task",
  "ordinary-dev",
  "frontend",
  "security",
  "skill_references",
  "--enforce"
]) {
  assertIncludes("scripts/estimate-token-cost.mjs", tokenEstimator, needle, "Token estimator should report budget and bundle costs");
}

assertIncludes("templates/scorecard.md", scorecardTemplate, "templates/quality-metrics.md", "Scorecard should point to quality metrics");
assertIncludes("runs/2026-07-06-initial-validation.md", validationRun, "Total quality score: 91 / 100", "Validation run should record a quality score");
assertIncludes("runs/2026-07-06-initial-validation.md", validationRun, "Baseline score: not measured in this run", "Validation run should not pretend baseline A/B was measured");
assertIncludes("runs/2026-07-06-initial-validation.md", validationRun, "Token source: static estimate", "Validation run should disclose token measurement source");
assertIncludes("runs/2026-07-06-initial-validation.md", validationRun, "Token ratio: unavailable until paired A/B replay", "Validation run should not pretend token A/B was measured");
assertIncludes("runs/2026-07-06-initial-validation.md", validationRun, "router slimming moved rarely needed memory, evolution, and UI automation details", "Validation run should record router slimming follow-up");
assertIncludes("runs/2026-07-14-adaptive-confirmation-validation.md", adaptiveValidationRun, "real `0.3.1` starter", "Adaptive validation should test compatibility from the real previous starter");
assertIncludes("runs/2026-07-14-adaptive-confirmation-validation.md", adaptiveValidationRun, "existing `specs/` sentinel remained untouched", "Adaptive validation should verify upgrade safety");
assertIncludes("runs/2026-07-14-adaptive-confirmation-validation.md", adaptiveValidationRun, "No provider-level A/B usage data", "Adaptive validation should disclose remaining measurement gaps");

for (const [relativePath, text] of [
  ["project-engineering-workflow/assets/template-root/.specify/memory/session-history.md", sessionHistory],
  ["project-engineering-workflow/assets/template-root/.specify/memory/skill-upgrade-backlog.md", upgradeBacklog]
]) {
  if (/20\d{2}-\d{2}-\d{2}/.test(text)) {
    throw new Error(`Generated memory template should not contain dated starter history: ${relativePath}`);
  }
}

console.log("Skills workflow evaluation contract passed.");
