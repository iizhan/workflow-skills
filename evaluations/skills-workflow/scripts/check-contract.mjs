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
  "project-engineering-workflow/assets/template-root/.agents/skills/project-profile-router/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-profile-router/references/profile-freshness.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-profile-router/references/decision-memory.md",
  "project-engineering-workflow/assets/template-root/.specify/project-profile/gitignore",
  "project-engineering-workflow/assets/template-root/.specify/project-profile/profile.yaml",
  "project-engineering-workflow/assets/template-root/.specify/project-profile/architecture.md",
  "project-engineering-workflow/assets/template-root/.specify/project-profile/decision-memory.yaml",
  "project-engineering-workflow/assets/template-root/.specify/scripts/project-profile.mjs",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/architecture-boundaries.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/api-contracts.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/data-consistency.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/runtime-security-observability.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/testing-delivery.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/java-spring.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/experience-states.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/architecture-data-flow.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/accessibility-responsive-i18n.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/performance-security-observability.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/testing-delivery.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-js/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-react/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-vue/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-css/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-security-review/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-verification-loop/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-session-summary/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-skill-upgrade-advisor/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-workflow-router/SKILL.md",
  "project-engineering-workflow/assets/template-root/.agents/skills/project-workflow-router/references/workflow-manifest-contract.md",
  "project-engineering-workflow/assets/template-root/.skill-os/workflow-registry.yaml",
  "project-engineering-workflow/assets/template-root/.skill-os/workflows/foundation-engineering-governance/workflow.yaml",
  "project-engineering-workflow/assets/template-root/.skill-os/workflows/role-frontend-engineering/workflow.yaml",
  "project-engineering-workflow/assets/template-root/.skill-os/workflows/role-backend-engineering/workflow.yaml",
  "project-engineering-workflow/assets/template-root/.skill-os/workflows/scenario-design-to-frontend/workflow.yaml",
  "project-engineering-workflow/assets/template-root/.skill-os/workflows/scenario-design-to-api/workflow.yaml",
  "project-engineering-workflow/assets/template-root/.skill-os/workflows/integration-swagger-to-frontend/workflow.yaml",
  "project-engineering-workflow/scripts/workflow-manifest-validator.mjs",
  "project-engineering-workflow/tests/workflow-manifest-validator.mjs",
  "project-engineering-workflow/assets/template-root/.specify/templates/design-template.md",
  "project-engineering-workflow/references/06-ecc-benchmark.md",
  "evaluations/skills-workflow/templates/quality-metrics.md",
  "evaluations/skills-workflow/templates/token-economics.md",
  "evaluations/skills-workflow/scripts/estimate-token-cost.mjs",
  "evaluations/skills-workflow/scripts/evaluate-task-requirements.mjs",
  "evaluations/skills-workflow/cases/adaptive-confirmation.md",
  "evaluations/skills-workflow/cases/formal-confirmation.md",
  "evaluations/skills-workflow/cases/task-requirement-quality.json",
  "evaluations/skills-workflow/runs/2026-07-14-adaptive-confirmation-validation.md",
  "evaluations/skills-workflow/runs/2026-07-14-task-requirement-quality.md",
  "evaluations/skills-workflow/runs/2026-07-14-role-workflows-validation.md",
  "evaluations/skills-workflow/runs/2026-07-14-project-profile-validation.md",
  "project-engineering-workflow/references/07-v0.2-release-pack/v0.6.0-release-notes.md",
  "project-engineering-workflow/references/07-v0.2-release-pack/v0.6.0-release-checklist.md",
  "project-engineering-workflow/references/08-upgrade-compatibility-pack/v0.5-to-v0.6-upgrade-manual.md",
  "project-engineering-workflow/references/07-v0.2-release-pack/v0.5.0-release-notes.md",
  "project-engineering-workflow/references/07-v0.2-release-pack/v0.5.0-release-checklist.md",
  "project-engineering-workflow/references/08-upgrade-compatibility-pack/v0.4-to-v0.5-upgrade-manual.md"
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
const projectProfileRouter = read("project-engineering-workflow/assets/template-root/.agents/skills/project-profile-router/SKILL.md");
const projectProfileFreshness = read("project-engineering-workflow/assets/template-root/.agents/skills/project-profile-router/references/profile-freshness.md");
const projectDecisionMemoryGuide = read("project-engineering-workflow/assets/template-root/.agents/skills/project-profile-router/references/decision-memory.md");
const projectProfile = read("project-engineering-workflow/assets/template-root/.specify/project-profile/profile.yaml");
const projectArchitecture = read("project-engineering-workflow/assets/template-root/.specify/project-profile/architecture.md");
const projectDecisionMemory = read("project-engineering-workflow/assets/template-root/.specify/project-profile/decision-memory.yaml");
const projectProfileScript = read("project-engineering-workflow/assets/template-root/.specify/scripts/project-profile.mjs");
const backend = read("project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/SKILL.md");
const backendArchitecture = read("project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/architecture-boundaries.md");
const backendApiContracts = read("project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/api-contracts.md");
const backendDataConsistency = read("project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/data-consistency.md");
const backendRuntime = read("project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/runtime-security-observability.md");
const backendTesting = read("project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/testing-delivery.md");
const backendJavaSpring = read("project-engineering-workflow/assets/template-root/.agents/skills/project-backend-standards/references/java-spring.md");
const frontend = read("project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/SKILL.md");
const frontendExperience = read("project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/experience-states.md");
const frontendArchitecture = read("project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/architecture-data-flow.md");
const frontendAccessibility = read("project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/accessibility-responsive-i18n.md");
const frontendRuntime = read("project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/performance-security-observability.md");
const frontendTesting = read("project-engineering-workflow/assets/template-root/.agents/skills/project-frontend-standards/references/testing-delivery.md");
const security = read("project-engineering-workflow/assets/template-root/.agents/skills/project-security-review/SKILL.md");
const verification = read("project-engineering-workflow/assets/template-root/.agents/skills/project-verification-loop/SKILL.md");
const summary = read("project-engineering-workflow/assets/template-root/.agents/skills/project-session-summary/SKILL.md");
const advisor = read("project-engineering-workflow/assets/template-root/.agents/skills/project-skill-upgrade-advisor/SKILL.md");
const workflowRouter = read("project-engineering-workflow/assets/template-root/.agents/skills/project-workflow-router/SKILL.md");
const workflowRouterReference = read("project-engineering-workflow/assets/template-root/.agents/skills/project-workflow-router/references/workflow-manifest-contract.md");
const workflowRegistry = read("project-engineering-workflow/assets/template-root/.skill-os/workflow-registry.yaml");
const designToFrontendWorkflow = read("project-engineering-workflow/assets/template-root/.skill-os/workflows/scenario-design-to-frontend/workflow.yaml");
const designToApiWorkflow = read("project-engineering-workflow/assets/template-root/.skill-os/workflows/scenario-design-to-api/workflow.yaml");
const swaggerIntegrationWorkflow = read("project-engineering-workflow/assets/template-root/.skill-os/workflows/integration-swagger-to-frontend/workflow.yaml");
const workflowValidator = read("project-engineering-workflow/scripts/workflow-manifest-validator.mjs");
const testAndReport = read("project-engineering-workflow/assets/template-root/.agents/skills/project-test-and-report/SKILL.md");
const designTemplate = read("project-engineering-workflow/assets/template-root/.specify/templates/design-template.md");
const workflowStateTemplate = read("project-engineering-workflow/assets/template-root/.specify/templates/workflow-state-template.yaml");
const deliverySummaryTemplate = read("project-engineering-workflow/assets/template-root/.specify/templates/delivery-summary-template.md");
const adaptiveConfirmationCase = read("evaluations/skills-workflow/cases/adaptive-confirmation.md");
const formalConfirmationCase = read("evaluations/skills-workflow/cases/formal-confirmation.md");
const sessionHistory = read("project-engineering-workflow/assets/template-root/.specify/memory/session-history.md");
const upgradeBacklog = read("project-engineering-workflow/assets/template-root/.specify/memory/skill-upgrade-backlog.md");
const evaluationReadme = read("evaluations/skills-workflow/README.md");
const runRecordTemplate = read("evaluations/skills-workflow/templates/run-record.md");
const scorecardTemplate = read("evaluations/skills-workflow/templates/scorecard.md");
const qualityMetrics = read("evaluations/skills-workflow/templates/quality-metrics.md");
const tokenEconomics = read("evaluations/skills-workflow/templates/token-economics.md");
const tokenEstimator = read("evaluations/skills-workflow/scripts/estimate-token-cost.mjs");
const taskRequirementEvaluator = read("evaluations/skills-workflow/scripts/evaluate-task-requirements.mjs");
const taskRequirementCases = read("evaluations/skills-workflow/cases/task-requirement-quality.json");
const validationRun = read("evaluations/skills-workflow/runs/2026-07-06-initial-validation.md");
const adaptiveValidationRun = read("evaluations/skills-workflow/runs/2026-07-14-adaptive-confirmation-validation.md");
const taskRequirementValidationRun = read("evaluations/skills-workflow/runs/2026-07-14-task-requirement-quality.md");
const roleWorkflowValidationRun = read("evaluations/skills-workflow/runs/2026-07-14-role-workflows-validation.md");
const projectProfileValidationRun = read("evaluations/skills-workflow/runs/2026-07-14-project-profile-validation.md");
const projectProfileReleaseNotes = read("project-engineering-workflow/references/07-v0.2-release-pack/v0.6.0-release-notes.md");
const projectProfileReleaseChecklist = read("project-engineering-workflow/references/07-v0.2-release-pack/v0.6.0-release-checklist.md");
const projectProfileUpgradeManual = read("project-engineering-workflow/references/08-upgrade-compatibility-pack/v0.5-to-v0.6-upgrade-manual.md");
const roleWorkflowReleaseNotes = read("project-engineering-workflow/references/07-v0.2-release-pack/v0.5.0-release-notes.md");
const roleWorkflowReleaseChecklist = read("project-engineering-workflow/references/07-v0.2-release-pack/v0.5.0-release-checklist.md");
const roleWorkflowUpgradeManual = read("project-engineering-workflow/references/08-upgrade-compatibility-pack/v0.4-to-v0.5-upgrade-manual.md");

for (const required of [
  "$project-dev-core",
  "$project-profile-router",
  "$project-backend-standards",
  "$project-frontend-standards",
  "$project-security-review",
  "$project-verification-loop",
  "$project-session-summary",
  "$project-skill-upgrade-advisor"
]) {
  assertIncludes("project-engineering-workflow/assets/template-root/AGENTS.md", agents, required, "AGENTS workflow should route through required skills");
}

for (const required of ["fast", "standard", "controlled", "确认执行", "需求版本", "Reassess the lane after onboarding and impact analysis", "mark pre-execution gates `not_required`"]) {
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

for (const required of ["设计方案版本", "验收与自测计划", "用户选择：确认执行 / 修改方案"]) {
  assertIncludes("design-template", designTemplate, required, "Formal implementation should have a versioned design proposal template");
}

for (const required of ["设计方案 vN", "任务拆解 vN", "影响范围 vN", "vN+1", "awaiting_user_acceptance"]) {
  assertIncludes("formal-confirmation case", formalConfirmationCase, required, "Evaluation should cover the formal confirmation package and scope delta");
}

for (const required of ["task_lane:", "confirmation_gates:", "confirmation_history:", "child_tasks:", "impact_assessment:", "scope_deltas:", "dissatisfaction_categories:"]) {
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
  "project-profile-router",
  "project-backend-standards",
  "project-frontend-standards",
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
  "const v050RoleWorkflowPaths",
  "const v050RoleUpgradeRoutingPaths",
  "const v060ProjectProfilePaths",
  "const v060ProjectProfileRoutingPaths",
  "const v070FormalConfirmationPaths",
  '"0.6.0": [...v020OptionalPaths, ...branchReleaseOptionalPaths, ...v040ProgressiveReferencePaths, ...v050RoleWorkflowPaths, ...v060ProjectProfilePaths]',
  '"0.5.0": [...v020OptionalPaths, ...branchReleaseOptionalPaths, ...v040ProgressiveReferencePaths, ...v050RoleWorkflowPaths]',
  "...v050RoleWorkflowPaths,",
  "...v050RoleUpgradeRoutingPaths,",
  "...v060ProjectProfilePaths,",
  "...v060ProjectProfileRoutingPaths,",
  '".specify/scripts/bash/validate-workflow.sh"',
  'minVersion: "0.5.0"',
  "const v040ProgressiveReferencePaths",
  '"0.3.1": [...v020OptionalPaths, ...branchReleaseOptionalPaths]',
  '"0.4.0": [...v020OptionalPaths, ...branchReleaseOptionalPaths, ...v040ProgressiveReferencePaths]',
  '"0.7.0": [...v020OptionalPaths, ...branchReleaseOptionalPaths, ...v040ProgressiveReferencePaths, ...v050RoleWorkflowPaths, ...v060ProjectProfilePaths, ...v070FormalConfirmationPaths]',
  'maxVersion: "0.3.1"',
  "...v040ProgressiveReferencePaths,",
  'context["__TEST_COMMAND__"] ??=',
  "--test-command"
]) {
  assertIncludes("project-engineering-workflow/bin/project-engineering-workflow.mjs", cli, required, "CLI should preserve real v0.3 compatibility and install the complete v0.4 workflow set");
}

for (const required of [
  "v050_role_workflow_paths",
  "0.5.0)",
  "v060_project_profile_paths",
  "0.6.0)",
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
assertIncludes("project-dev-core", devCore, "$project-backend-standards", "Dev core should route backend work into the backend role workflow");
for (const needle of ["status --json", "fresh", "missing", "stale", "never task approval"]) {
  assertIncludes("project-profile-router", projectProfileRouter, needle, "Project Profile router should stay a lightweight first gate");
}
for (const needle of ["Initial Analysis", "Freshness Rules", "source of truth overrides Profile", "Refresh only affected sections", "capture --json"]) {
  assertIncludes("project profile freshness", projectProfileFreshness, needle, "Project Profile freshness should be evidence-driven and incremental");
}
for (const needle of ["What Can Be Reused", "What Must Never Be Reused As Approval", "Retrieve by module", "cannot silently approve"]) {
  assertIncludes("project decision memory", projectDecisionMemoryGuide, needle, "Project decision memory should reduce repeated questions without reusing authority");
}
for (const needle of ["status: pending_analysis", "detected_languages:", "ownership_boundaries:", "source_of_truth:", "freshness:"]) {
  assertIncludes("project profile data", projectProfile, needle, "Project Profile should hold structured reusable project facts");
}
for (const needle of ["Module Map", "Critical Flows", "Source Of Truth", "Unknowns And Refresh Triggers"]) {
  assertIncludes("project architecture", projectArchitecture, needle, "Project architecture summary should expose reusable flows and unknowns");
}
for (const needle of ["entries:", "never_reuse_as_approval:", "destructive_or_irreversible_actions", "final_user_acceptance"]) {
  assertIncludes("project decision memory data", projectDecisionMemory, needle, "Project decision memory data should preserve approval boundaries");
}
for (const needle of ["discover(root)", "compareEvidence", "changedEvidence", "@directory-structure", 'options.command === "capture"']) {
  assertIncludes("project profile script", projectProfileScript, needle, "Project Profile script should provide deterministic status and capture evidence");
}
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
  "Make controls responsive",
  "Do not add analytics",
  "vertical fragments"
];
for (const needle of frontendNeedles) {
  assertIncludes("project-frontend-standards", frontend, needle, "Frontend standards should guard UI interaction and privacy");
}

for (const needle of ["Adaptive Workflow", "Reference Router", "Do not read every reference by default", "references/java-spring.md"]) {
  assertIncludes("project-backend-standards", backend, needle, "Backend standards should stay an adaptive role entry");
}
for (const needle of ["business capability", "transaction", "partial success"]) {
  assertIncludes("backend architecture", backendArchitecture, needle, "Backend architecture reference should preserve ownership and failure boundaries");
}
for (const needle of ["Contract First", "idempotency", "compatibility window", "Events And Webhooks"]) {
  assertIncludes("backend API contracts", backendApiContracts, needle, "Backend contract reference should cover public and message contracts");
}
for (const needle of ["source of truth", "query plans", "expand -> migrate/backfill -> verify -> switch -> contract", "Cache And Derived Stores"]) {
  assertIncludes("backend data consistency", backendDataConsistency, needle, "Backend data reference should cover correctness and safe migration");
}
for (const needle of ["Authenticate identity and authorize", "bounded attempts", "Structured logs", "Measure representative latency"]) {
  assertIncludes("backend runtime", backendRuntime, needle, "Backend runtime reference should cover resilience, security, observability, and performance");
}
for (const needle of ["Risk-To-Evidence Matrix", "Concurrency/idempotency", "post-deploy signals", "Map each protected invariant"]) {
  assertIncludes("backend testing", backendTesting, needle, "Backend testing reference should map risk to delivery evidence");
}
for (const needle of ["constructor injection", "@Transactional", "MyBatis", "Dubbo", "REST Assured"]) {
  assertIncludes("Java Spring profile", backendJavaSpring, needle, "Java/Spring profile should preserve JVM stack rules");
}
for (const needle of ["Adaptive Workflow", "Reference Router", "Do not read every reference by default", "experience contract"]) {
  assertIncludes("project-frontend-standards", frontend, needle, "Frontend standards should stay an adaptive role entry");
}
for (const needle of ["Experience Contract", "observable result", "optimistic", "failed submit"]) {
  assertIncludes("frontend experience", frontendExperience, needle, "Frontend experience reference should cover complete interaction states");
}
for (const needle of ["server", "URL/navigation", "stale responses", "shared abstraction"]) {
  assertIncludes("frontend architecture", frontendArchitecture, needle, "Frontend architecture reference should preserve state and async ownership");
}
for (const needle of ["visible focus", "stable grid/flex tracks", "mixed CJK/Latin", "Keyboard-walk"]) {
  assertIncludes("frontend accessibility", frontendAccessibility, needle, "Frontend accessibility reference should cover responsive and language risks");
}
for (const needle of ["Measure before optimizing", "Authorization must be enforced by the backend", "third-party scripts", "key journeys"]) {
  assertIncludes("frontend runtime", frontendRuntime, needle, "Frontend runtime reference should cover performance, privacy, and diagnostics");
}
for (const needle of ["Risk-To-Evidence Matrix", "Start the actual app", "screenshots or a concise UI report", "static checks alone"]) {
  assertIncludes("frontend testing", frontendTesting, needle, "Frontend testing reference should require visible risk-based evidence");
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
assertIncludes("project-skill-upgrade-advisor", advisor, "Reopen and correct the affected `ITEM-*` first", "Upgrade advisor should repair current work before framework evolution");
for (const needle of ["one primary scenario", "workflow-validate", "Loop Engineering Boundary", "scope change"]) {
  assertIncludes("project-workflow-router", workflowRouter, needle, "Workflow router should preserve primary selection and Loop safety boundaries");
}
for (const needle of ["Selection Order", "Scenario Loop Run", "read-only", "DAG"]) {
  assertIncludes("project-workflow-router reference", workflowRouterReference, needle, "Workflow router reference should explain compatibility and bounded execution");
}
for (const needle of ["default_selection: \"recommend_only\"", "legacy_declarations: \"read_only\"", "max_iterations: 3"]) {
  assertIncludes("workflow registry", workflowRegistry, needle, "Workflow registry should default to explicit selection and bounded Loops");
}
for (const [label, text, expected] of [
  ["design-to-frontend", designToFrontendWorkflow, ["template_id: \"scenario.design-to-frontend\"", "pass_score: 90", "max_iterations: 3", "on_scope_change: \"require_reconfirmation\""]],
  ["design-to-api", designToApiWorkflow, ["template_id: \"scenario.design-to-api\"", "api_contract_evidence", "max_same_root_cause_strategies: 2"]],
  ["swagger integration", swaggerIntegrationWorkflow, ["template_id: \"integration.swagger-to-frontend\"", "key_path_integration_evidence", "on_budget_exhausted: \"needs_user_decision\""]]
]) {
  for (const needle of expected) {
    assertIncludes(`${label} Workflow Template`, text, needle, "Scenario Workflow Templates should declare quality and bounded Loop policy");
  }
}
for (const needle of ["validateWorkflowManifest", "WORKFLOW_CYCLE_UNSUPPORTED", "WORKFLOW_LEGACY_READ_ONLY", "WORKFLOW_LOOP_POLICY_INVALID", "validateWorkflowDirectory"]) {
  assertIncludes("workflow-manifest-validator", workflowValidator, needle, "Manifest validator should enforce compatibility and bounded declaration rules");
}
assertIncludes("AGENTS.md", agents, "$project-workflow-router", "AGENTS should route matching standard and controlled work through the Workflow router");
assertIncludes("workflow CLI", cli, "workflow-validate", "CLI should expose Workflow Manifest validation");
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
  "backend",
  "frontend-react",
  "profile-refresh",
  "security",
  "skill_references",
  "--enforce"
]) {
  assertIncludes("scripts/estimate-token-cost.mjs", tokenEstimator, needle, "Token estimator should report budget and bundle costs");
}

for (const needle of ["--baseline-root", "behaviorMeasured", "failedRequirements", "--enforce"]) {
  assertIncludes("scripts/evaluate-task-requirements.mjs", taskRequirementEvaluator, needle, "Task requirement evaluator should support honest candidate/baseline enforcement");
}

for (const needle of [
  "fast-visible-copy-fix",
  "controlled-monitoring-migration",
  "scope-expansion-after-approval",
  "security-remote-skill-loading",
  "dissatisfaction-history-lost",
  "backend-api-data-change",
  "frontend-journey-layout",
  "project-profile-reuse-refresh",
  '"behaviorMeasured": false'
]) {
  assertIncludes("cases/task-requirement-quality.json", taskRequirementCases, needle, "Task requirement suite should cover representative workflow scenarios without claiming live behavior");
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
assertIncludes("runs/2026-07-14-task-requirement-quality.md", taskRequirementValidationRun, "86.3 / 100", "Task requirement validation should record the pre-fix score rather than hiding discovered gaps");
assertIncludes("runs/2026-07-14-task-requirement-quality.md", taskRequirementValidationRun, "+84.7", "Task requirement validation should record the baseline delta");
assertIncludes("runs/2026-07-14-task-requirement-quality.md", taskRequirementValidationRun, "does not prove live model adherence", "Task requirement validation should disclose the contract-coverage boundary");
for (const needle of ["100 / 100 (A)", "real Git-exported `0.4.0`", "2,148", "4,643", "4,651", "live model adherence"]) {
  assertIncludes("runs/2026-07-14-role-workflows-validation.md", roleWorkflowValidationRun, needle, "Role workflow validation should record quality, cost, compatibility, and residual evidence");
}
for (const needle of ["project-backend-standards", "progressive frontend references", "below the 700-token", "best-in-class claims"]) {
  assertIncludes("v0.5.0 release notes", roleWorkflowReleaseNotes, needle, "Role workflow release notes should state capability, cost, and evidence boundaries");
}
for (const needle of ["Blind live backend task A/B", "Blind live frontend task A/B", "Remote publish receives separate explicit approval"]) {
  assertIncludes("v0.5.0 release checklist", roleWorkflowReleaseChecklist, needle, "Role workflow release checklist should leave live and remote gates explicit");
}
for (const needle of ["v0.4.x To v0.5.x", "project facts override generic role references", "Run CLI Doctor and shell Doctor", "historical `specs/` artifacts"]) {
  assertIncludes("v0.4 to v0.5 upgrade manual", roleWorkflowUpgradeManual, needle, "Role workflow upgrade manual should preserve explicit compatibility and validation steps");
}
for (const needle of ["missing", "fresh", "stale", "2,480", "4,754", "never reusable decision memory"]) {
  assertIncludes("runs/2026-07-14-project-profile-validation.md", projectProfileValidationRun, needle, "Project Profile validation should record lifecycle, cost, and approval boundaries");
}
for (const needle of ["project-profile-router", "evidence fingerprints", "`0.5.0` projects remain valid", "Profile refresh does not silently change business code"]) {
  assertIncludes("v0.6.0 release notes", projectProfileReleaseNotes, needle, "Project Profile release notes should state reuse, compatibility, and safety");
}
for (const needle of ["Profile starts as `pending_analysis`", "missing", "fresh", "stale", "Provider input-token comparison"]) {
  assertIncludes("v0.6.0 release checklist", projectProfileReleaseChecklist, needle, "Project Profile release checklist should cover lifecycle and live evidence");
}
for (const needle of ["v0.5.x To v0.6.x", "first development task", "Refresh only Profile sections", "cannot approve permissions"]) {
  assertIncludes("v0.5 to v0.6 upgrade manual", projectProfileUpgradeManual, needle, "Project Profile upgrade manual should define first analysis, reuse, and authority boundaries");
}

for (const [relativePath, text] of [
  ["project-engineering-workflow/assets/template-root/.specify/memory/session-history.md", sessionHistory],
  ["project-engineering-workflow/assets/template-root/.specify/memory/skill-upgrade-backlog.md", upgradeBacklog]
]) {
  if (/20\d{2}-\d{2}-\d{2}/.test(text)) {
    throw new Error(`Generated memory template should not contain dated starter history: ${relativePath}`);
  }
}

console.log("Skills workflow evaluation contract passed.");
