import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseDocument, stringify } from "yaml";
import type {
  ProjectWorkflowBindingApplyInput,
  ProjectWorkflowBindingApplyResult,
  ProjectWorkflowBindingChangeType,
  ProjectWorkflowBindingPreview,
  ProjectWorkflowBindingPreviewInput,
  ProjectWorkflowBindingRollbackPreviewInput,
  ProjectWorkflowBindingSource,
  ProjectWorkflowBindingStatus,
  ProjectWorkflowBindingSummary,
  ProjectWorkflowCompatibility,
  ProjectWorkflowDoctorCheck,
  ProjectWorkflowDoctorResult,
  ProjectWorkflowLegacyMigrationPreviewInput,
  ScenarioLoopPolicy,
  ScenarioLoopTemplateDefinition,
  WorkflowTemplateKind,
  WorkflowTemplateStatus,
  WorkflowTemplateSummary,
  WorkflowValidationIssue
} from "../shared/types";
import type { WorkbenchDatabase } from "./database";

const manifestFileName = "workflow.yaml";
const bindingsRelativePath = ".skill-os/workflow-bindings.yaml";
const projectSkillsRelativePath = ".agents/skills";
const workflowVersionRelativePath = ".specify/workflow-version.txt";
const bindingSchemaVersion = "1.0.0";
const previewLifetimeMs = 5 * 60 * 1000;
const templateIdPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const templateKinds = new Set<WorkflowTemplateKind>([
  "foundation",
  "role",
  "scenario",
  "integration",
  "project_legacy"
]);
const templateStatuses = new Set<WorkflowTemplateStatus>([
  "draft",
  "sandbox",
  "trial",
  "approved",
  "recommended",
  "deprecated",
  "retired",
  "invalid",
  "unknown"
]);

interface StoredTemplate {
  summary: WorkflowTemplateSummary;
  manifest: Record<string, unknown>;
  rawContent: string;
}

interface PendingPreview {
  preview: ProjectWorkflowBindingPreview;
  existingBindingFingerprint: string | null;
  template: StoredTemplate;
}

interface BindingDocument {
  path: string;
  rawContent: string | null;
  root: Record<string, unknown>;
  bindings: Array<Record<string, unknown>>;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeProjectRoot(projectRoot: string) {
  const normalized = resolve(projectRoot.trim());
  return normalized === "/" ? normalized : normalized.replace(/\/+$/, "");
}

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRawString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.flatMap((entry) => (typeof entry === "string" && entry.trim() ? [entry.trim()] : []))))
    : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") {
    return {};
  }
  try {
    return toRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function parseJsonArray<T>(value: unknown): T[] {
  if (typeof value !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function makeIssue(
  severity: WorkflowValidationIssue["severity"],
  source: string,
  path: string,
  code: string,
  message: string
): WorkflowValidationIssue {
  return { severity, source, path, code, message };
}

function compareSemver(left: string, right: string) {
  const leftNumbers = left.split("-")[0].split(".").map(Number);
  const rightNumbers = right.split("-")[0].split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftNumbers[index] !== rightNumbers[index]) {
      return leftNumbers[index] > rightNumbers[index] ? 1 : -1;
    }
  }
  return 0;
}

function satisfiesVersionRange(version: string, range: string | null) {
  if (!range || !semverPattern.test(version)) {
    return true;
  }
  const tokens = range.trim().split(/\s+/).filter(Boolean);
  return tokens.every((token) => {
    const match = token.match(/^(\^|~|>=|<=|>|<|=)?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/);
    if (!match) {
      return false;
    }
    const operator = match[1] ?? "=";
    const target = match[2];
    const comparison = compareSemver(version, target);
    if (operator === ">=") return comparison >= 0;
    if (operator === "<=") return comparison <= 0;
    if (operator === ">") return comparison > 0;
    if (operator === "<") return comparison < 0;
    if (operator === "^") return version.split(".")[0] === target.split(".")[0] && comparison >= 0;
    if (operator === "~") {
      const [major, minor] = target.split(".");
      const [versionMajor, versionMinor] = version.split(".");
      return major === versionMajor && minor === versionMinor && comparison >= 0;
    }
    return comparison === 0;
  });
}

function collectWorkflowManifestPaths(root: string) {
  if (!existsSync(root)) {
    return [];
  }
  const paths: string[] = [];
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if ([".git", "node_modules"].includes(entry.name)) {
        continue;
      }
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
      } else if (entry.isFile() && entry.name === manifestFileName) {
        paths.push(entryPath);
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

function readYamlDocument(path: string) {
  const rawContent = readFileSync(path, "utf8");
  const document = parseDocument(rawContent, { prettyErrors: false, uniqueKeys: true });
  const issues = [
    ...document.errors.map((error) =>
      makeIssue("error", path, "yaml", "WORKFLOW_SCHEMA_INVALID", error.message)
    ),
    ...document.warnings.map((warning) =>
      makeIssue("warning", path, "yaml", "WORKFLOW_SCHEMA_WARNING", warning.message)
    )
  ];
  return { rawContent, value: document.toJS(), issues };
}

function extractSkillRefs(manifest: Record<string, unknown>) {
  const refs = new Set<string>();
  for (const entry of Array.isArray(manifest.skills) ? manifest.skills : []) {
    const ref = asString(toRecord(entry).skill_ref);
    if (ref) refs.add(ref);
  }
  for (const entry of Array.isArray(manifest.nodes) ? manifest.nodes : []) {
    const ref = asString(toRecord(entry).skill_ref);
    if (ref) refs.add(ref);
  }
  return [...refs].sort((left, right) => left.localeCompare(right));
}

function extractDependencyTemplateIds(manifest: Record<string, unknown>) {
  const composition = toRecord(manifest.composition);
  const refs = new Set<string>();
  for (const entry of Array.isArray(composition.requires) ? composition.requires : []) {
    const templateId = asString(toRecord(entry).template_id);
    if (templateId) refs.add(templateId);
  }
  return [...refs].sort((left, right) => left.localeCompare(right));
}

function parseTemplateManifest(path: string): StoredTemplate {
  const { rawContent, value, issues: initialIssues } = readYamlDocument(path);
  return parseTemplateManifestContent(path, rawContent, value, initialIssues);
}

function parseTemplateManifestContent(
  path: string,
  rawContent: string,
  value: unknown,
  initialIssues: WorkflowValidationIssue[]
): StoredTemplate {
  const issues = [...initialIssues];
  const warnings: WorkflowValidationIssue[] = [];
  const manifest = toRecord(value);
  const templateId = asString(manifest.template_id);
  const templateVersion = asString(manifest.template_version);
  const schemaVersion = asString(manifest.schema_version);
  const name = asString(manifest.name);
  const kindValue = asString(manifest.kind);
  const statusValue = asString(manifest.status);

  if (!templateId || !templateIdPattern.test(templateId)) {
    issues.push(makeIssue("error", path, "template_id", "WORKFLOW_TEMPLATE_ID_INVALID", "template_id must be a stable lowercase identifier."));
  }
  if (!templateVersion || !semverPattern.test(templateVersion)) {
    issues.push(makeIssue("error", path, "template_version", "WORKFLOW_TEMPLATE_VERSION_INVALID", "template_version must use semantic versioning."));
  }
  if (!schemaVersion || schemaVersion !== "1.1.0") {
    issues.push(makeIssue("error", path, "schema_version", "WORKFLOW_SCHEMA_UNSUPPORTED", "The desktop registry supports Manifest schema 1.1.0."));
  }
  if (!name) {
    issues.push(makeIssue("error", path, "name", "WORKFLOW_SCHEMA_INVALID", "name is required."));
  }
  if (!kindValue || !templateKinds.has(kindValue as WorkflowTemplateKind)) {
    issues.push(makeIssue("error", path, "kind", "WORKFLOW_KIND_INVALID", "kind is not supported."));
  }
  if (!statusValue || !templateStatuses.has(statusValue as WorkflowTemplateStatus)) {
    issues.push(makeIssue("error", path, "status", "WORKFLOW_STATUS_INVALID", "status is not supported."));
  }
  if (!Array.isArray(manifest.nodes) || manifest.nodes.length === 0) {
    issues.push(makeIssue("error", path, "nodes", "WORKFLOW_NODES_REQUIRED", "At least one declared node is required."));
  }
  if (!Array.isArray(manifest.edges)) {
    issues.push(makeIssue("error", path, "edges", "WORKFLOW_SCHEMA_INVALID", "edges must be an array."));
  }
  if (!isRecord(manifest.permissions) || !Array.isArray(toRecord(manifest.permissions).capabilities)) {
    issues.push(makeIssue("error", path, "permissions", "WORKFLOW_SCHEMA_INVALID", "permissions.capabilities is required."));
  }

  const summary: WorkflowTemplateSummary = {
    templateId: templateId ?? `invalid.${sha256(path).slice(-12)}`,
    templateVersion: templateVersion ?? "0.0.0",
    name: name ?? basename(dirname(path)),
    kind: templateKinds.has(kindValue as WorkflowTemplateKind)
      ? (kindValue as WorkflowTemplateKind)
      : "project_legacy",
    status: templateStatuses.has(statusValue as WorkflowTemplateStatus)
      ? (statusValue as WorkflowTemplateStatus)
      : "invalid",
    schemaVersion: schemaVersion ?? "unknown",
    sourcePath: path,
    manifestFingerprint: sha256(rawContent),
    dependencyTemplateIds: extractDependencyTemplateIds(manifest),
    skillRefs: extractSkillRefs(manifest),
    validation: { valid: issues.every((issue) => issue.severity !== "error"), issues, warnings },
    indexedAt: nowIso()
  };
  return { summary, manifest, rawContent };
}

function parseTemplateSnapshot(path: string, rawContent: string): StoredTemplate {
  const document = parseDocument(rawContent, { prettyErrors: false, uniqueKeys: true });
  const issues = [
    ...document.errors.map((error) =>
      makeIssue("error", path, "yaml", "WORKFLOW_SCHEMA_INVALID", error.message)
    ),
    ...document.warnings.map((warning) =>
      makeIssue("warning", path, "yaml", "WORKFLOW_SCHEMA_WARNING", warning.message)
    )
  ];
  return parseTemplateManifestContent(path, rawContent, document.toJS(), issues);
}

function readWorkflowVersion(projectRoot: string) {
  const versionPath = join(projectRoot, workflowVersionRelativePath);
  if (!existsSync(versionPath)) {
    return null;
  }
  const version = readFileSync(versionPath, "utf8").trim();
  return semverPattern.test(version) ? version : null;
}

function readProjectSkillRefs(projectRoot: string) {
  const skillsRoot = join(projectRoot, projectSkillsRelativePath);
  if (!existsSync(skillsRoot)) {
    return new Set<string>();
  }
  return new Set(
    readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(skillsRoot, entry.name, "SKILL.md")))
      .map((entry) => entry.name)
  );
}

function readBindingDocument(projectRoot: string): BindingDocument {
  const path = join(projectRoot, bindingsRelativePath);
  if (!existsSync(path)) {
    return { path, rawContent: null, root: {}, bindings: [] };
  }
  const { rawContent, value, issues } = readYamlDocument(path);
  const error = issues.find((entry) => entry.severity === "error");
  if (error) {
    throw new Error(`Workflow binding file is invalid: ${error.message}`);
  }
  const root = toRecord(value);
  if (!Array.isArray(root.bindings)) {
    throw new Error("Workflow binding file must contain a bindings array.");
  }
  return {
    path,
    rawContent,
    root,
    bindings: root.bindings.filter(isRecord)
  };
}

function bindingFingerprint(binding: Record<string, unknown> | null) {
  return binding ? sha256(JSON.stringify(binding)) : null;
}

export class WorkflowRegistryService {
  private readonly pendingPreviews = new Map<string, PendingPreview>();
  private readonly coreVersion: string;

  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly templateRoot: string,
    workflowPackagePath: string
  ) {
    this.coreVersion = this.readCoreVersion(workflowPackagePath);
  }

  listTemplates() {
    this.indexTemplates();
    return this.readStoredTemplates().map((template) => template.summary);
  }

  getScenarioLoopTemplateDefinition(
    templateId: string,
    templateVersion: string
  ): ScenarioLoopTemplateDefinition | null {
    this.indexTemplates();
    const template = this.findTemplate(templateId, templateVersion);
    if (
      !template ||
      !template.summary.validation.valid ||
      (template.summary.kind !== "scenario" && template.summary.kind !== "integration")
    ) {
      return null;
    }
    const loopPolicy = toRecord(template.manifest.loop_policy);
    const qualityGate = toRecord(template.manifest.quality_gate);
    if (loopPolicy.enabled !== true) {
      return null;
    }
    const maxIterations = Number(loopPolicy.max_iterations);
    const maxSameRootCauseStrategies = Number(loopPolicy.max_same_root_cause_strategies);
    const passScore = Number(qualityGate.pass_score);
    const dimensionFloors = Object.fromEntries(
      Object.entries(toRecord(qualityGate.dimension_floors)).flatMap(([key, value]) =>
        typeof value === "number" && Number.isFinite(value) ? [[key, value]] : []
      )
    );
    if (
      !Number.isInteger(maxIterations) ||
      maxIterations < 1 ||
      maxIterations > 3 ||
      !Number.isInteger(maxSameRootCauseStrategies) ||
      maxSameRootCauseStrategies < 1 ||
      maxSameRootCauseStrategies > 2 ||
      !Number.isFinite(passScore) ||
      passScore < 0 ||
      passScore > 100 ||
      loopPolicy.on_scope_change !== "require_reconfirmation" ||
      loopPolicy.on_budget_exhausted !== "needs_user_decision"
    ) {
      return null;
    }
    const policy: ScenarioLoopPolicy = {
      maxIterations,
      maxSameRootCauseStrategies,
      onScopeChange: "require_reconfirmation",
      onBudgetExhausted: "needs_user_decision",
      passScore,
      dimensionFloors,
      requiredChecks: asStringArray(qualityGate.required_checks)
    };
    return {
      templateId: template.summary.templateId,
      templateVersion: template.summary.templateVersion,
      templateName: template.summary.name,
      templateKind: template.summary.kind,
      manifestFingerprint: template.summary.manifestFingerprint,
      policy
    };
  }

  listProjectBindings(projectRoot: string): ProjectWorkflowBindingSummary[] {
    this.indexTemplates();
    const root = this.requireProjectRoot(projectRoot);
    const templates = this.readStoredTemplates();
    const document = readBindingDocument(root);
    const summaries: ProjectWorkflowBindingSummary[] = [];
    const boundTemplateIds = new Set<string>();

    for (const binding of document.bindings) {
      const templateId = asString(binding.template_id);
      const templateVersion = asString(binding.template_version);
      const bindingId = asString(binding.binding_id);
      if (!templateId || !templateVersion || !bindingId) {
        throw new Error("Workflow binding entries require binding_id, template_id, and template_version.");
      }
      const storedTemplate = templates.find(
        (candidate) =>
          candidate.summary.templateId === templateId && candidate.summary.templateVersion === templateVersion
      );
      const manifestSnapshot = asRawString(binding.manifest_snapshot);
      const snapshotTemplate = manifestSnapshot
        ? parseTemplateSnapshot(`${document.path}#binding:${bindingId}`, manifestSnapshot)
        : null;
      const template = storedTemplate ?? snapshotTemplate ?? undefined;
      const compatibility = template
        ? this.assessCompatibility(root, template)
        : this.templateMissingCompatibility(templateId, templateVersion);
      const summary: ProjectWorkflowBindingSummary = {
        bindingId,
        projectRoot: root,
        templateId,
        templateVersion,
        templateName: template?.summary.name ?? templateId,
        templateKind: template?.summary.kind ?? "project_legacy",
        manifestFingerprint: asString(binding.manifest_fingerprint),
        manifestSnapshot,
        status: this.bindingStatusFor(compatibility, template, templateVersion),
        source: "binding_file",
        bindingFilePath: document.path,
        sourcePath: document.path,
        readOnly: false,
        compatibility,
        overrides: toRecord(binding.overrides),
        activatedAt: asString(binding.activated_at),
        updatedAt: asString(binding.updated_at) ?? asString(binding.activated_at) ?? nowIso(),
        rollback: this.readRollback(binding.rollback),
        warnings: compatibility.messages
      };
      this.persistBinding(summary);
      summaries.push(summary);
      boundTemplateIds.add(templateId);
    }

    for (const declarationPath of collectWorkflowManifestPaths(join(root, ".skill-os/workflows"))) {
      const projection = this.projectDeclarationProjection(root, declarationPath, templates, boundTemplateIds);
      if (projection) {
        summaries.push(projection);
      }
    }

    return summaries.sort((left, right) => {
      const typeOrder = left.source === "binding_file" ? -1 : right.source === "binding_file" ? 1 : 0;
      return typeOrder || left.templateName.localeCompare(right.templateName) || left.templateVersion.localeCompare(right.templateVersion);
    });
  }

  previewBinding(input: ProjectWorkflowBindingPreviewInput): ProjectWorkflowBindingPreview {
    this.indexTemplates();
    this.removeExpiredPreviews();
    const root = this.requireProjectRoot(input.projectRoot);
    const template = this.findTemplate(input.templateId, input.templateVersion);
    if (!template) {
      throw new Error("The requested Workflow Template is not available in the local registry.");
    }
    const existingBinding = this.listProjectBindings(root).find(
      (binding) => binding.source === "binding_file" && binding.templateId === template.summary.templateId
    ) ?? null;
    return this.createBindingPreview({ root, template, existingBinding });
  }

  previewLegacyMigration(
    input: ProjectWorkflowLegacyMigrationPreviewInput
  ): ProjectWorkflowBindingPreview {
    this.indexTemplates();
    this.removeExpiredPreviews();
    const root = this.requireProjectRoot(input.projectRoot);
    const legacy = this.listProjectBindings(root).find(
      (binding) => binding.bindingId === input.legacyBindingId && binding.readOnly
    );
    if (!legacy) {
      throw new Error("Choose a readable legacy Workflow declaration before generating a migration preview.");
    }
    const template = this.findTemplate(legacy.templateId, legacy.templateVersion);
    if (!template) {
      throw new Error(
        `The local registry does not contain ${legacy.templateId}@${legacy.templateVersion}; migration remains blocked until a compatible template is installed.`
      );
    }
    return this.createBindingPreview({
      root,
      template,
      existingBinding: null,
      changeType: "migration",
      additionalWarnings: [
        "This is a shadow migration preview. The legacy declaration stays unchanged and read-only.",
        legacy.sourcePath
          ? `Legacy declaration retained at ${legacy.sourcePath}.`
          : "Legacy declaration is retained in its original project location."
      ]
    });
  }

  previewBindingRollback(
    input: ProjectWorkflowBindingRollbackPreviewInput
  ): ProjectWorkflowBindingPreview {
    this.indexTemplates();
    this.removeExpiredPreviews();
    const root = this.requireProjectRoot(input.projectRoot);
    const binding = this.listProjectBindings(root).find(
      (candidate) => candidate.bindingId === input.bindingId && candidate.source === "binding_file" && !candidate.readOnly
    );
    if (!binding) {
      throw new Error("Choose an active project Workflow binding before previewing rollback.");
    }
    if (!binding.rollback) {
      throw new Error("This binding has no captured rollback version yet.");
    }
    const template =
      this.findTemplate(binding.templateId, binding.rollback.templateVersion) ??
      (binding.rollback.manifestSnapshot
        ? parseTemplateSnapshot(
            `${binding.bindingFilePath ?? join(root, bindingsRelativePath)}#rollback:${binding.rollback.templateVersion}`,
            binding.rollback.manifestSnapshot
          )
        : null);
    if (!template) {
      throw new Error(
        `Rollback version ${binding.templateId}@${binding.rollback.templateVersion} is no longer available in the local registry.`
      );
    }
    if (
      binding.rollback.manifestFingerprint &&
      template.summary.manifestFingerprint !== binding.rollback.manifestFingerprint
    ) {
      throw new Error("Rollback is blocked because the local template fingerprint no longer matches the captured version.");
    }
    return this.createBindingPreview({
      root,
      template,
      existingBinding: binding,
      changeType: "rollback",
      additionalWarnings: [
        `Rollback will restore the captured ${binding.rollback.templateVersion} template reference.`,
        "The current active version becomes the next local rollback reference after confirmation."
      ]
    });
  }

  doctorProject(projectRoot: string): ProjectWorkflowDoctorResult {
    this.indexTemplates();
    const root = this.requireProjectRoot(projectRoot);
    const templates = this.readStoredTemplates();
    const checks: ProjectWorkflowDoctorCheck[] = [];
    let bindings: ProjectWorkflowBindingSummary[] = [];
    try {
      bindings = this.listProjectBindings(root);
    } catch (error) {
      checks.push({
        id: "binding-document",
        status: "fail",
        title: "绑定文件",
        detail: error instanceof Error ? error.message : "Workflow binding document could not be read.",
        evidenceRefs: [join(root, bindingsRelativePath)]
      });
    }
    const activeBindings = bindings.filter((binding) => binding.source === "binding_file");
    const legacyBindings = bindings.filter(
      (binding) => binding.readOnly && binding.source === "task_06_legacy"
    );
    const readyMigrations = legacyBindings.filter((binding) =>
      templates.some(
        (template) =>
          template.summary.templateId === binding.templateId &&
          template.summary.templateVersion === binding.templateVersion &&
          template.summary.validation.valid
      )
    );
    checks.push({
      id: "registry",
      status: templates.some((template) => template.summary.validation.valid) ? "pass" : "fail",
      title: "本地模板注册表",
      detail: templates.some((template) => template.summary.validation.valid)
        ? `${templates.filter((template) => template.summary.validation.valid).length} 个可用模板已通过静态校验。`
        : "没有可用的、通过静态校验的 Workflow 模板。",
      evidenceRefs: templates.map((template) => template.summary.sourcePath)
    });
    if (checks.some((check) => check.id === "binding-document" && check.status === "fail")) {
      // A malformed binding document blocks mutation but does not obscure the registry result.
    } else {
      checks.push({
        id: "binding-document",
        status: "pass",
        title: "绑定文件",
        detail: "项目 Workflow 绑定文件可读取。",
        evidenceRefs: [join(root, bindingsRelativePath)]
      });
    }
    const bindingDocumentFailed = checks.some(
      (check) => check.id === "binding-document" && check.status === "fail"
    );
    if (!bindingDocumentFailed && activeBindings.length === 0) {
      checks.push({
        id: "active-binding",
        status: "warning",
        title: "项目绑定",
        detail:
          legacyBindings.length > 0
            ? "检测到只读旧声明；请先生成影子迁移预览并确认后创建绑定。"
            : "当前项目没有已激活的 Workflow 绑定。",
        evidenceRefs: legacyBindings.map((binding) => binding.sourcePath ?? binding.bindingId)
      });
    } else if (!bindingDocumentFailed) {
      const incompatible = activeBindings.filter((binding) => !binding.compatibility.readyForBinding);
      checks.push({
        id: "active-binding",
        status: incompatible.length > 0 ? "fail" : "pass",
        title: "项目绑定",
        detail:
          incompatible.length > 0
            ? `${incompatible.length} 个已绑定 Workflow 当前不兼容。`
            : `${activeBindings.length} 个已绑定 Workflow 均可读取且兼容。`,
        evidenceRefs: activeBindings.map((binding) => binding.bindingFilePath ?? binding.bindingId)
      });
    }
    if (legacyBindings.length > 0) {
      checks.push({
        id: "legacy-migration",
        status: readyMigrations.length === legacyBindings.length ? "warning" : "fail",
        title: "旧声明迁移",
        detail:
          readyMigrations.length === legacyBindings.length
            ? `${legacyBindings.length} 个旧声明可生成影子迁移预览；旧文件不会被重写。`
            : `${legacyBindings.length - readyMigrations.length} 个旧声明缺少精确匹配的本地模板，暂不能迁移。`,
        evidenceRefs: legacyBindings.map((binding) => binding.sourcePath ?? binding.bindingId)
      });
    }
    const upgradeCount = activeBindings.filter((binding) => binding.status === "needs_upgrade").length;
    checks.push({
      id: "version-safety",
      status: upgradeCount > 0 ? "warning" : "pass",
      title: "版本与回退",
      detail:
        upgradeCount > 0
          ? `${upgradeCount} 个绑定有可用升级；升级前会生成预览并保留本地回退引用。`
          : "当前绑定没有待处理的版本升级。",
      evidenceRefs: activeBindings.map((binding) => binding.bindingFilePath ?? binding.bindingId)
    });
    const failed = checks.some((check) => check.status === "fail");
    const warned = checks.some((check) => check.status === "warning");
    return {
      projectRoot: root,
      checkedAt: nowIso(),
      bindingFilePath: join(root, bindingsRelativePath),
      templateCount: templates.length,
      bindingCount: activeBindings.length,
      legacyReadOnlyCount: legacyBindings.length,
      readyMigrationCount: readyMigrations.length,
      checks,
      summary: failed ? "blocked" : warned ? "attention" : "healthy"
    };
  }

  private createBindingPreview(input: {
    root: string;
    template: StoredTemplate;
    existingBinding: ProjectWorkflowBindingSummary | null;
    changeType?: ProjectWorkflowBindingChangeType;
    additionalWarnings?: string[];
  }): ProjectWorkflowBindingPreview {
    const { root, template, existingBinding } = input;
    const compatibility = this.assessCompatibility(root, template);
    const changeType =
      input.changeType ??
      (!existingBinding
        ? "create"
        : existingBinding.templateVersion !== template.summary.templateVersion
          ? "upgrade"
          : "rebind");
    const generatedAt = nowIso();
    const preview: ProjectWorkflowBindingPreview = {
      previewId: randomUUID(),
      expiresAt: new Date(Date.now() + previewLifetimeMs).toISOString(),
      generatedAt,
      projectRoot: root,
      bindingFilePath: join(root, bindingsRelativePath),
      changeType,
      template: template.summary,
      existingBinding,
      compatibility,
      proposedBinding: {
        bindingId: existingBinding?.bindingId ?? randomUUID(),
        templateId: template.summary.templateId,
        templateVersion: template.summary.templateVersion,
        manifestFingerprint: template.summary.manifestFingerprint,
        overrides: {}
      },
      readyForConfirmation: compatibility.readyForBinding,
      previewSteps: [
        "Read the selected template from the local registry.",
        "Check the project workflow version, declared Skills, and template compatibility.",
        "Show the binding change before any project file is written.",
        "After user confirmation, write the binding atomically and verify it by reading it back."
      ],
      warnings: [
        ...compatibility.messages,
        ...(existingBinding?.readOnly
          ? ["A project declaration was detected but remains read-only until a binding is confirmed."]
          : []),
        ...(changeType === "upgrade"
          ? ["The active version will be retained as the local rollback reference."]
          : []),
        ...(input.additionalWarnings ?? [])
      ]
    };
    this.pendingPreviews.set(preview.previewId, {
      preview,
      existingBindingFingerprint: existingBinding
        ? bindingFingerprint(this.findDocumentBinding(readBindingDocument(root), existingBinding.bindingId))
        : null,
      template
    });
    return preview;
  }

  applyBinding(input: ProjectWorkflowBindingApplyInput): ProjectWorkflowBindingApplyResult {
    this.removeExpiredPreviews();
    const pending = this.pendingPreviews.get(input.previewId);
    if (!pending) {
      throw new Error("The Workflow binding preview has expired or is missing. Generate a new preview before confirmation.");
    }
    this.pendingPreviews.delete(input.previewId);
    const { preview } = pending;
    const currentTemplate = this.findTemplate(preview.template.templateId, preview.template.templateVersion);
    const template = currentTemplate ?? pending.template;
    if (
      template.summary.manifestFingerprint !== preview.template.manifestFingerprint ||
      (currentTemplate !== null && currentTemplate.summary.manifestFingerprint !== preview.template.manifestFingerprint)
    ) {
      throw new Error("The selected Workflow Template changed after preview. Generate a new preview before confirmation.");
    }
    const compatibility = this.assessCompatibility(preview.projectRoot, template);
    if (!compatibility.readyForBinding) {
      throw new Error(`Workflow binding cannot be applied: ${compatibility.messages.join(" ")}`);
    }

    const document = readBindingDocument(preview.projectRoot);
    const currentBinding = preview.existingBinding
      ? this.findDocumentBinding(document, preview.existingBinding.bindingId)
      : null;
    if (bindingFingerprint(currentBinding) !== pending.existingBindingFingerprint) {
      throw new Error("The project binding changed after preview. Review a new preview before confirmation.");
    }

    const appliedAt = nowIso();
    const templateSnapshot = this.readTemplateSnapshot(template);
    if (!templateSnapshot) {
      throw new Error("The selected Workflow Template cannot be snapshotted safely for future rollback.");
    }
    const previousRollback = preview.existingBinding
      ? {
          templateVersion: preview.existingBinding.templateVersion,
          manifestFingerprint: preview.existingBinding.manifestFingerprint,
          manifestSnapshot: preview.existingBinding.manifestSnapshot ?? null,
          capturedAt: appliedAt
        }
      : null;
    const nextBinding: Record<string, unknown> = {
      binding_id: preview.proposedBinding.bindingId,
      template_id: template.summary.templateId,
      template_version: template.summary.templateVersion,
      manifest_fingerprint: template.summary.manifestFingerprint,
      manifest_snapshot: templateSnapshot,
      binding_status: "active",
      overrides: {},
      activated_at: preview.existingBinding?.activatedAt ?? appliedAt,
      updated_at: appliedAt,
      rollback: previousRollback
    };
    const nextDocument = {
      ...document.root,
      schema_version: bindingSchemaVersion,
      registry_id: "project.workflow-registry",
      bindings: [
        ...document.bindings.filter(
          (binding) => asString(binding.binding_id) !== preview.proposedBinding.bindingId && asString(binding.template_id) !== template.summary.templateId
        ),
        nextBinding
      ]
    };

    const previousContent = document.rawContent;
    let wroteBindingFile = false;
    try {
      this.writeBindingDocument(document.path, nextDocument);
      wroteBindingFile = true;
      const verifiedDocument = readBindingDocument(preview.projectRoot);
      const verifiedBinding = this.findDocumentBinding(verifiedDocument, preview.proposedBinding.bindingId);
      if (
        !verifiedBinding ||
        asString(verifiedBinding.template_id) !== template.summary.templateId ||
        asString(verifiedBinding.template_version) !== template.summary.templateVersion ||
        asString(verifiedBinding.manifest_fingerprint) !== template.summary.manifestFingerprint
      ) {
        throw new Error("The Workflow binding file could not be verified after write.");
      }
      const binding: ProjectWorkflowBindingSummary = {
        bindingId: preview.proposedBinding.bindingId,
        projectRoot: preview.projectRoot,
        templateId: template.summary.templateId,
        templateVersion: template.summary.templateVersion,
        templateName: template.summary.name,
        templateKind: template.summary.kind,
        manifestFingerprint: template.summary.manifestFingerprint,
        manifestSnapshot: templateSnapshot,
        status: "active",
        source: "binding_file",
        bindingFilePath: document.path,
        sourcePath: document.path,
        readOnly: false,
        compatibility,
        overrides: {},
        activatedAt: preview.existingBinding?.activatedAt ?? appliedAt,
        updatedAt: appliedAt,
        rollback: previousRollback,
        warnings: compatibility.messages
      };
      this.persistBinding(binding);
      this.recordBindingEvent(
        binding,
        preview.previewId,
        preview.changeType === "upgrade"
          ? "binding_upgraded"
          : preview.changeType === "rollback"
            ? "binding_rolled_back"
            : preview.changeType === "migration"
              ? "legacy_binding_migrated"
              : "binding_activated",
        preview.changeType === "upgrade"
          ? `Workflow binding upgraded to ${binding.templateVersion}.`
          : preview.changeType === "rollback"
            ? `Workflow binding rolled back to ${binding.templateVersion}.`
            : preview.changeType === "migration"
              ? `Legacy Workflow declaration migrated to a managed binding at ${binding.templateVersion}.`
              : `Workflow binding activated at ${binding.templateVersion}.`
      );
      return { preview, binding, appliedAt, verified: true, warnings: compatibility.messages };
    } catch (error) {
      if (wroteBindingFile) {
        this.restoreBindingDocument(document.path, previousContent);
      }
      throw error;
    }
  }

  private indexTemplates() {
    const root = resolve(this.templateRoot);
    const templates = collectWorkflowManifestPaths(root).map(parseTemplateManifest);
    const templatesById = new Map<string, StoredTemplate[]>();
    for (const template of templates) {
      const current = templatesById.get(template.summary.templateId) ?? [];
      current.push(template);
      templatesById.set(template.summary.templateId, current);
    }
    for (const template of templates) {
      for (const dependencyId of template.summary.dependencyTemplateIds) {
        if (!templatesById.has(dependencyId)) {
          template.summary.validation.issues.push(
            makeIssue(
              "error",
              template.summary.sourcePath,
              "composition.requires",
              "WORKFLOW_TEMPLATE_UNRESOLVED",
              `Template dependency '${dependencyId}' is not available in this local registry.`
            )
          );
          template.summary.validation.valid = false;
        }
      }
    }
    const upsert = this.database.db.prepare(`
      INSERT INTO workflow_template_registry (
        template_key, template_id, template_version, name, kind, status, schema_version,
        source_path, manifest_fingerprint, dependencies_json, skill_refs_json, validation_json,
        manifest_json, indexed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(template_key) DO UPDATE SET
        name = excluded.name,
        kind = excluded.kind,
        status = excluded.status,
        schema_version = excluded.schema_version,
        source_path = excluded.source_path,
        manifest_fingerprint = excluded.manifest_fingerprint,
        dependencies_json = excluded.dependencies_json,
        skill_refs_json = excluded.skill_refs_json,
        validation_json = excluded.validation_json,
        manifest_json = excluded.manifest_json,
        indexed_at = excluded.indexed_at
    `);
    const transaction = this.database.db.transaction(() => {
      this.database.db.prepare(`DELETE FROM workflow_template_registry WHERE source_path LIKE ?`).run(`${root}%`);
      for (const template of templates) {
        const { summary } = template;
        upsert.run(
          sha256(`${summary.templateId}@${summary.templateVersion}:${summary.sourcePath}`),
          summary.templateId,
          summary.templateVersion,
          summary.name,
          summary.kind,
          summary.status,
          summary.schemaVersion,
          summary.sourcePath,
          summary.manifestFingerprint,
          JSON.stringify(summary.dependencyTemplateIds),
          JSON.stringify(summary.skillRefs),
          JSON.stringify(summary.validation),
          JSON.stringify(template.manifest),
          summary.indexedAt
        );
      }
    });
    transaction();
  }

  private readStoredTemplates(): StoredTemplate[] {
    const rows = this.database.db
      .prepare(`SELECT * FROM workflow_template_registry ORDER BY template_id, template_version`)
      .all() as Array<Record<string, unknown>>;
    return rows
      .map((row) => {
        const validation = parseJsonRecord(row.validation_json);
        return {
          summary: {
            templateId: String(row.template_id),
            templateVersion: String(row.template_version),
            name: String(row.name),
            kind: String(row.kind) as WorkflowTemplateKind,
            status: String(row.status) as WorkflowTemplateStatus,
            schemaVersion: String(row.schema_version),
            sourcePath: String(row.source_path),
            manifestFingerprint: String(row.manifest_fingerprint),
            dependencyTemplateIds: parseJsonArray<string>(row.dependencies_json),
            skillRefs: parseJsonArray<string>(row.skill_refs_json),
            validation: {
              valid: Boolean(validation.valid),
              issues: parseJsonArray<WorkflowValidationIssue>(JSON.stringify(validation.issues ?? [])),
              warnings: parseJsonArray<WorkflowValidationIssue>(JSON.stringify(validation.warnings ?? []))
            },
            indexedAt: String(row.indexed_at)
          },
          manifest: parseJsonRecord(row.manifest_json),
          rawContent: stringify(parseJsonRecord(row.manifest_json))
        };
      })
      .sort((left, right) => {
        const idComparison = left.summary.templateId.localeCompare(right.summary.templateId);
        return idComparison || compareSemver(right.summary.templateVersion, left.summary.templateVersion);
      });
  }

  private findTemplate(templateId: string, templateVersion?: string) {
    const candidates = this.readStoredTemplates().filter(
      (template) =>
        template.summary.templateId === templateId &&
        (!templateVersion || template.summary.templateVersion === templateVersion)
    );
    return candidates.sort((left, right) => compareSemver(right.summary.templateVersion, left.summary.templateVersion))[0] ?? null;
  }

  private assessCompatibility(projectRoot: string, template: StoredTemplate): ProjectWorkflowCompatibility {
    if (!template.summary.validation.valid) {
      return {
        status: "template_invalid",
        readyForBinding: false,
        projectWorkflowVersion: readWorkflowVersion(projectRoot),
        missingSkills: [],
        messages: ["The selected Workflow Template has static validation errors and cannot be bound."]
      };
    }
    const compatibility = toRecord(template.manifest.compatibility);
    const coreRange = asString(compatibility.core);
    if (!satisfiesVersionRange(this.coreVersion, coreRange)) {
      return {
        status: "core_incompatible",
        readyForBinding: false,
        projectWorkflowVersion: readWorkflowVersion(projectRoot),
        missingSkills: [],
        messages: [`Desktop Workflow core ${this.coreVersion} does not satisfy template requirement ${coreRange ?? "unknown"}.`]
      };
    }
    const projectWorkflowVersion = readWorkflowVersion(projectRoot);
    if (!projectWorkflowVersion) {
      return {
        status: "requires_workflow_starter",
        readyForBinding: false,
        projectWorkflowVersion: null,
        missingSkills: [],
        messages: ["Project Engineering Workflow is not installed. Apply the recommended starter before binding a template."]
      };
    }
    if (!satisfiesVersionRange(projectWorkflowVersion, coreRange)) {
      return {
        status: "core_incompatible",
        readyForBinding: false,
        projectWorkflowVersion,
        missingSkills: [],
        messages: [`Project Workflow ${projectWorkflowVersion} does not satisfy template requirement ${coreRange ?? "unknown"}.`]
      };
    }
    const availableSkills = readProjectSkillRefs(projectRoot);
    const missingSkills = template.summary.skillRefs.filter((skill) => !availableSkills.has(skill));
    if (missingSkills.length > 0) {
      return {
        status: "missing_skills",
        readyForBinding: false,
        projectWorkflowVersion,
        missingSkills,
        messages: [`Project is missing required Skills: ${missingSkills.join(", ")}.`]
      };
    }
    return {
      status: "ready",
      readyForBinding: true,
      projectWorkflowVersion,
      missingSkills: [],
      messages: []
    };
  }

  private templateMissingCompatibility(templateId: string, templateVersion: string): ProjectWorkflowCompatibility {
    return {
      status: "template_missing",
      readyForBinding: false,
      projectWorkflowVersion: null,
      missingSkills: [],
      messages: [`Template ${templateId}@${templateVersion} is not available in the local registry.`]
    };
  }

  private bindingStatusFor(
    compatibility: ProjectWorkflowCompatibility,
    template: StoredTemplate | undefined,
    bindingVersion: string
  ): ProjectWorkflowBindingStatus {
    if (!template || !compatibility.readyForBinding) {
      return "incompatible";
    }
    const latest = this.findTemplate(template.summary.templateId);
    return latest && latest.summary.templateVersion !== bindingVersion ? "needs_upgrade" : "active";
  }

  private projectDeclarationProjection(
    projectRoot: string,
    declarationPath: string,
    templates: StoredTemplate[],
    boundTemplateIds: Set<string>
  ): ProjectWorkflowBindingSummary | null {
    const { rawContent, value, issues } = readYamlDocument(declarationPath);
    if (issues.some((issue) => issue.severity === "error")) {
      return null;
    }
    const declaration = toRecord(value);
    const templateId = asString(declaration.template_id) ?? asString(declaration.workflow_id);
    if (!templateId || boundTemplateIds.has(templateId)) {
      return null;
    }
    const isLegacy = !asString(declaration.template_id) && Boolean(asString(declaration.workflow_id));
    const templateVersion = asString(declaration.template_version) ?? asString(declaration.version) ?? "0.0.0";
    const template = templates.find(
      (candidate) =>
        candidate.summary.templateId === templateId && candidate.summary.templateVersion === templateVersion
    );
    return {
      bindingId: `projection:${sha256(declarationPath).slice(-20)}`,
      projectRoot,
      templateId,
      templateVersion,
      templateName: asString(declaration.name) ?? template?.summary.name ?? templateId,
      templateKind: template?.summary.kind ?? "project_legacy",
      manifestFingerprint: sha256(rawContent),
      status: "legacy_read_only",
      source: isLegacy ? "task_06_legacy" : "project_declaration",
      bindingFilePath: null,
      sourcePath: declarationPath,
      readOnly: true,
      compatibility: {
        status: "legacy_read_only",
        readyForBinding: false,
        projectWorkflowVersion: readWorkflowVersion(projectRoot),
        missingSkills: [],
        messages: [
          isLegacy
            ? "TASK-06 legacy declaration is readable but cannot be rewritten without an explicit migration."
            : "Project declaration is readable but remains unbound until a binding is explicitly confirmed."
        ]
      },
      overrides: {},
      activatedAt: null,
      updatedAt: nowIso(),
      rollback: null,
      warnings: ["No project binding file was written while creating this read-only projection."]
    };
  }

  private persistBinding(binding: ProjectWorkflowBindingSummary) {
    this.database.db
      .prepare(`
        INSERT INTO project_workflow_bindings (
          binding_id, project_root, template_id, template_version, template_name, template_kind,
          manifest_fingerprint, binding_status, binding_source, binding_file_path, overrides_json,
          activated_at, rollback_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_root, template_id) DO UPDATE SET
          binding_id = excluded.binding_id,
          project_root = excluded.project_root,
          template_id = excluded.template_id,
          template_version = excluded.template_version,
          template_name = excluded.template_name,
          template_kind = excluded.template_kind,
          manifest_fingerprint = excluded.manifest_fingerprint,
          binding_status = excluded.binding_status,
          binding_source = excluded.binding_source,
          binding_file_path = excluded.binding_file_path,
          overrides_json = excluded.overrides_json,
          activated_at = excluded.activated_at,
          rollback_json = excluded.rollback_json,
          updated_at = excluded.updated_at
      `)
      .run(
        binding.bindingId,
        binding.projectRoot,
        binding.templateId,
        binding.templateVersion,
        binding.templateName,
        binding.templateKind,
        binding.manifestFingerprint,
        binding.status,
        binding.source,
        binding.bindingFilePath,
        JSON.stringify(binding.overrides),
        binding.activatedAt,
        JSON.stringify(binding.rollback),
        binding.updatedAt,
        binding.updatedAt
      );
  }

  private recordBindingEvent(
    binding: ProjectWorkflowBindingSummary,
    previewId: string,
    eventType: string,
    eventSummary: string
  ) {
    this.database.db
      .prepare(`
        INSERT INTO project_workflow_binding_events (
          id, binding_id, project_root, event_type, event_summary, preview_id, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        randomUUID(),
        binding.bindingId,
        binding.projectRoot,
        eventType,
        eventSummary,
        previewId,
        JSON.stringify({
          templateId: binding.templateId,
          templateVersion: binding.templateVersion,
          manifestFingerprint: binding.manifestFingerprint
        }),
        nowIso()
      );
  }

  private findDocumentBinding(document: BindingDocument, bindingId: string) {
    return document.bindings.find((binding) => asString(binding.binding_id) === bindingId) ?? null;
  }

  private readRollback(value: unknown): ProjectWorkflowBindingSummary["rollback"] {
    const rollback = toRecord(value);
    const templateVersion = asString(rollback.template_version ?? rollback.templateVersion);
    const capturedAt = asString(rollback.captured_at ?? rollback.capturedAt);
    if (!templateVersion || !capturedAt) {
      return null;
    }
    return {
      templateVersion,
      manifestFingerprint: asString(rollback.manifest_fingerprint ?? rollback.manifestFingerprint),
      manifestSnapshot: asRawString(rollback.manifest_snapshot ?? rollback.manifestSnapshot),
      capturedAt
    };
  }

  private readTemplateSnapshot(template: StoredTemplate) {
    if (existsSync(template.summary.sourcePath)) {
      const rawContent = readFileSync(template.summary.sourcePath, "utf8");
      if (sha256(rawContent) === template.summary.manifestFingerprint) {
        return rawContent;
      }
    }
    return sha256(template.rawContent) === template.summary.manifestFingerprint
      ? template.rawContent
      : null;
  }

  private writeBindingDocument(path: string, document: Record<string, unknown>) {
    mkdirSync(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    writeFileSync(temporaryPath, stringify(document), "utf8");
    renameSync(temporaryPath, path);
  }

  private restoreBindingDocument(path: string, previousContent: string | null) {
    if (previousContent === null) {
      if (existsSync(path)) {
        unlinkSync(path);
      }
      return;
    }
    writeFileSync(path, previousContent, "utf8");
  }

  private removeExpiredPreviews() {
    const now = Date.now();
    for (const [previewId, pending] of this.pendingPreviews.entries()) {
      if (Date.parse(pending.preview.expiresAt) <= now) {
        this.pendingPreviews.delete(previewId);
      }
    }
  }

  private requireProjectRoot(projectRoot: string) {
    const root = normalizeProjectRoot(projectRoot);
    if (!root || !existsSync(root) || !statSync(root).isDirectory()) {
      throw new Error("Choose an existing project directory before managing Workflow bindings.");
    }
    return root;
  }

  private readCoreVersion(packagePath: string) {
    try {
      const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: unknown };
      return typeof parsed.version === "string" && semverPattern.test(parsed.version) ? parsed.version : "0.0.0";
    } catch {
      return "0.0.0";
    }
  }
}
