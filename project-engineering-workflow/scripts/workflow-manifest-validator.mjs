#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDocument } from "yaml";

export const WORKFLOW_MANIFEST_SCHEMA_VERSION = "1.1.0";

const VALID_KINDS = new Set(["foundation", "role", "scenario", "integration", "project_legacy"]);
const VALID_STATUSES = new Set(["draft", "sandbox", "trial", "approved", "recommended", "deprecated", "retired", "invalid", "unknown"]);
const VALID_NODE_KINDS = new Set(["skill", "approval_gate", "decision", "subworkflow", "checkpoint", "start", "end"]);
const ALLOWED_CAPABILITIES = new Set([
  "read_project",
  "read_design_assets",
  "read_api_contract",
  "write_project_after_confirmation"
]);
const SCENARIO_KINDS = new Set(["scenario", "integration"]);
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const VERSION_RANGE_TOKEN = /^(?:\^|~|>=|<=|>|<|=)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function makeIssue(severity, code, source, path, message) {
  return { severity, code, source, path, message };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isSemver(value) {
  return isNonEmptyString(value) && SEMVER_PATTERN.test(value.trim());
}

function isVersionRange(value) {
  if (!isNonEmptyString(value)) return false;
  return value
    .trim()
    .split(/\s+/)
    .every((token) => VERSION_RANGE_TOKEN.test(token));
}

function uniqueStrings(values) {
  return [...new Set(values.filter(isNonEmptyString).map((value) => value.trim()))];
}

function normalizeLegacyManifest(raw) {
  if (!isPlainObject(raw) || !isNonEmptyString(raw.workflow_id) || isNonEmptyString(raw.template_id)) {
    return { manifest: raw, legacy: false };
  }

  return {
    legacy: true,
    manifest: {
      schema_version: raw.schema_version ?? "1.0.0",
      template_id: raw.workflow_id,
      template_version: raw.version ?? "0.0.0",
      name: raw.name ?? raw.workflow_id,
      kind: "project_legacy",
      status: raw.status ?? "unknown",
      entrypoints: raw.entrypoints ?? { task_types: [] },
      inputs: raw.inputs ?? [],
      outputs: raw.outputs ?? [],
      composition: { requires: [] },
      skills: [],
      nodes: raw.nodes ?? [],
      edges: raw.edges ?? [],
      loop_policy: { enabled: false },
      permissions: { capabilities: [] },
      compatibility: { legacy_read_only: true }
    }
  };
}

function validateNamedEntries(entries, source, path, issues) {
  if (!Array.isArray(entries)) {
    issues.push(makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, path, "Expected an array."));
    return [];
  }

  const names = [];
  entries.forEach((entry, index) => {
    if (!isPlainObject(entry) || !isNonEmptyString(entry.name)) {
      issues.push(makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, `${path}[${index}]`, "Each entry needs a non-empty name."));
      return;
    }
    names.push(entry.name.trim());
  });

  if (new Set(names).size !== names.length) {
    issues.push(makeIssue("error", "WORKFLOW_DUPLICATE_INPUT_OUTPUT", source, path, "Entry names must be unique."));
  }
  return names;
}

function buildNodeGraph(nodes, edges) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = new Map([...nodeIds].map((nodeId) => [nodeId, []]));
  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjacency.get(edge.from).push(edge.to);
    }
  }
  return adjacency;
}

function findCycle(adjacency) {
  const state = new Map();
  const stack = [];

  const visit = (nodeId) => {
    state.set(nodeId, "visiting");
    stack.push(nodeId);
    for (const target of adjacency.get(nodeId) ?? []) {
      const targetState = state.get(target);
      if (targetState === "visiting") {
        return [...stack.slice(stack.indexOf(target)), target];
      }
      if (targetState !== "visited") {
        const cycle = visit(target);
        if (cycle) return cycle;
      }
    }
    stack.pop();
    state.set(nodeId, "visited");
    return null;
  };

  for (const nodeId of adjacency.keys()) {
    if (!state.has(nodeId)) {
      const cycle = visit(nodeId);
      if (cycle) return cycle;
    }
  }
  return null;
}

function validateNodesAndEdges(manifest, source, issues) {
  const nodes = manifest.nodes;
  const edges = manifest.edges;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    issues.push(makeIssue("error", "WORKFLOW_NODES_REQUIRED", source, "nodes", "A Workflow Manifest needs at least one node."));
    return;
  }
  if (!Array.isArray(edges)) {
    issues.push(makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, "edges", "Expected an array."));
    return;
  }

  const nodeIds = [];
  nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    if (!isPlainObject(node) || !isNonEmptyString(node.id) || !ID_PATTERN.test(node.id)) {
      issues.push(makeIssue("error", "WORKFLOW_NODE_INVALID", source, path, "Node id must use lowercase letters, digits, dots, or hyphens."));
      return;
    }
    nodeIds.push(node.id);
    if (!VALID_NODE_KINDS.has(node.kind)) {
      issues.push(makeIssue("error", "WORKFLOW_NODE_INVALID", source, `${path}.kind`, "Node kind is not supported."));
    }
    if (node.kind === "skill" && !isNonEmptyString(node.skill_ref)) {
      issues.push(makeIssue("error", "WORKFLOW_NODE_INVALID", source, `${path}.skill_ref`, "Skill nodes need a skill_ref."));
    }
    if (node.kind === "subworkflow" && !isNonEmptyString(node.workflow_ref) && !isNonEmptyString(node.template_ref)) {
      issues.push(makeIssue("error", "WORKFLOW_NODE_INVALID", source, path, "Subworkflow nodes need workflow_ref or template_ref."));
    }
  });

  if (new Set(nodeIds).size !== nodeIds.length) {
    issues.push(makeIssue("error", "WORKFLOW_DUPLICATE_NODE", source, "nodes", "Node ids must be unique."));
  }

  const knownNodes = new Set(nodeIds);
  const edgeIds = [];
  edges.forEach((edge, index) => {
    const path = `edges[${index}]`;
    if (!isPlainObject(edge) || !isNonEmptyString(edge.id) || !ID_PATTERN.test(edge.id)) {
      issues.push(makeIssue("error", "WORKFLOW_EDGE_INVALID", source, path, "Edge id must use lowercase letters, digits, dots, or hyphens."));
      return;
    }
    edgeIds.push(edge.id);
    if (!knownNodes.has(edge.from) || !knownNodes.has(edge.to)) {
      issues.push(makeIssue("error", "WORKFLOW_EDGE_INVALID", source, path, "Edge endpoints must reference declared nodes."));
    }
  });

  if (new Set(edgeIds).size !== edgeIds.length) {
    issues.push(makeIssue("error", "WORKFLOW_DUPLICATE_EDGE", source, "edges", "Edge ids must be unique."));
  }

  if (issues.some((entry) => entry.severity === "error" && ["WORKFLOW_NODE_INVALID", "WORKFLOW_EDGE_INVALID"].includes(entry.code))) {
    return;
  }

  const cycle = findCycle(buildNodeGraph(nodes, edges));
  if (cycle) {
    issues.push(makeIssue("error", "WORKFLOW_CYCLE_UNSUPPORTED", source, "edges", `Declared Workflow graphs must stay acyclic. Cycle: ${cycle.join(" -> ")}.`));
  }
}

function validateManifestShape(manifest, source, issues, warnings, legacy) {
  if (!isPlainObject(manifest)) {
    issues.push(makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, "root", "Manifest root must be a mapping."));
    return;
  }

  if (!isNonEmptyString(manifest.schema_version)) {
    issues.push(makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, "schema_version", "schema_version is required."));
  } else if (manifest.schema_version !== WORKFLOW_MANIFEST_SCHEMA_VERSION && manifest.schema_version !== "1.0.0") {
    issues.push(makeIssue("error", "WORKFLOW_SCHEMA_UNSUPPORTED", source, "schema_version", `Unsupported schema version ${manifest.schema_version}.`));
  }

  const templateIdPattern = legacy ? /^[A-Za-z][A-Za-z0-9_.-]*$/ : ID_PATTERN;
  if (!isNonEmptyString(manifest.template_id) || !templateIdPattern.test(manifest.template_id)) {
    issues.push(makeIssue("error", "WORKFLOW_TEMPLATE_ID_INVALID", source, "template_id", "template_id must use a supported stable identifier."));
  }
  if (!isSemver(manifest.template_version)) {
    issues.push(makeIssue("error", "WORKFLOW_TEMPLATE_VERSION_INVALID", source, "template_version", "template_version must be semantic version x.y.z."));
  }
  if (!isNonEmptyString(manifest.name)) {
    issues.push(makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, "name", "name is required."));
  }
  if (!VALID_KINDS.has(manifest.kind)) {
    issues.push(makeIssue("error", "WORKFLOW_KIND_INVALID", source, "kind", "kind must be foundation, role, scenario, integration, or project_legacy."));
  }
  if (!VALID_STATUSES.has(manifest.status) && !(legacy && manifest.status === "active")) {
    issues.push(makeIssue("error", "WORKFLOW_STATUS_INVALID", source, "status", "status is invalid."));
  }
  if (legacy) {
    warnings.push(makeIssue("warning", "WORKFLOW_LEGACY_READ_ONLY", source, "schema_version", "Legacy 1.0 declaration is read-only until an explicit migration is confirmed."));
  }

  if (!isPlainObject(manifest.entrypoints) || !Array.isArray(manifest.entrypoints.task_types)) {
    issues.push(makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, "entrypoints.task_types", "entrypoints.task_types must be an array."));
  }
  validateNamedEntries(manifest.inputs, source, "inputs", issues);
  validateNamedEntries(manifest.outputs, source, "outputs", issues);
  validateNodesAndEdges(manifest, source, issues);
}

function validateComposition(manifest, source, issues) {
  const requires = manifest.composition?.requires ?? [];
  if (!isPlainObject(manifest.composition) || !Array.isArray(requires)) {
    issues.push(makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, "composition.requires", "composition.requires must be an array."));
    return [];
  }

  const templateIds = [];
  requires.forEach((dependency, index) => {
    const path = `composition.requires[${index}]`;
    if (!isPlainObject(dependency) || !isNonEmptyString(dependency.template_id) || !ID_PATTERN.test(dependency.template_id)) {
      issues.push(makeIssue("error", "WORKFLOW_DEPENDENCY_INVALID", source, path, "Each dependency needs a valid template_id."));
      return;
    }
    if (!isVersionRange(dependency.version)) {
      issues.push(makeIssue("error", "WORKFLOW_DEPENDENCY_INVALID", source, `${path}.version`, "Each dependency needs a semantic version range."));
    }
    templateIds.push(dependency.template_id);
  });
  if (new Set(templateIds).size !== templateIds.length) {
    issues.push(makeIssue("error", "WORKFLOW_DEPENDENCY_INVALID", source, "composition.requires", "A template may only be required once."));
  }
  return templateIds;
}

function validateSkills(manifest, source, issues) {
  if (!Array.isArray(manifest.skills)) {
    issues.push(makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, "skills", "skills must be an array."));
    return [];
  }

  const skillRefs = [];
  manifest.skills.forEach((entry, index) => {
    if (!isPlainObject(entry) || !isNonEmptyString(entry.skill_ref) || !ID_PATTERN.test(entry.skill_ref)) {
      issues.push(makeIssue("error", "WORKFLOW_SKILL_INVALID", source, `skills[${index}]`, "Each Skill entry needs a valid skill_ref."));
      return;
    }
    skillRefs.push(entry.skill_ref);
  });
  if (new Set(skillRefs).size !== skillRefs.length) {
    issues.push(makeIssue("error", "WORKFLOW_SKILL_INVALID", source, "skills", "A Skill may only be declared once per Manifest."));
  }
  return skillRefs;
}

function validateQualityAndLoop(manifest, source, issues) {
  const qualityGate = manifest.quality_gate;
  if (manifest.kind === "project_legacy" && !qualityGate) {
    return;
  }
  if (!isPlainObject(qualityGate)) {
    issues.push(makeIssue("error", "WORKFLOW_QUALITY_GATE_INVALID", source, "quality_gate", "quality_gate is required."));
  } else {
    if (!isNonEmptyString(qualityGate.score_policy_ref)) {
      issues.push(makeIssue("error", "WORKFLOW_QUALITY_GATE_INVALID", source, "quality_gate.score_policy_ref", "A score policy reference is required."));
    }
    if (!isIntegerInRange(qualityGate.pass_score, 1, 100)) {
      issues.push(makeIssue("error", "WORKFLOW_QUALITY_GATE_INVALID", source, "quality_gate.pass_score", "pass_score must be an integer from 1 through 100."));
    }
    if (!isPlainObject(qualityGate.dimension_floors) || Object.keys(qualityGate.dimension_floors).length === 0) {
      issues.push(makeIssue("error", "WORKFLOW_QUALITY_GATE_INVALID", source, "quality_gate.dimension_floors", "At least one quality dimension floor is required."));
    } else {
      for (const [dimension, score] of Object.entries(qualityGate.dimension_floors)) {
        if (!ID_PATTERN.test(dimension) || !isIntegerInRange(score, 0, 100)) {
          issues.push(makeIssue("error", "WORKFLOW_QUALITY_GATE_INVALID", source, `quality_gate.dimension_floors.${dimension}`, "Quality floors must use valid ids and scores from 0 through 100."));
        }
      }
    }
    if (!Array.isArray(qualityGate.required_checks) || qualityGate.required_checks.length === 0) {
      issues.push(makeIssue("error", "WORKFLOW_QUALITY_GATE_INVALID", source, "quality_gate.required_checks", "At least one hard quality check is required."));
    }
  }

  const loopPolicy = manifest.loop_policy;
  if (!isPlainObject(loopPolicy) || typeof loopPolicy.enabled !== "boolean") {
    issues.push(makeIssue("error", "WORKFLOW_LOOP_POLICY_INVALID", source, "loop_policy", "loop_policy.enabled must be a boolean."));
    return;
  }
  if (!loopPolicy.enabled) return;

  if (!SCENARIO_KINDS.has(manifest.kind)) {
    issues.push(makeIssue("error", "WORKFLOW_LOOP_POLICY_INVALID", source, "loop_policy", "Only scenario and integration Workflow kinds may enable Loop Engineering."));
  }
  if (!isIntegerInRange(loopPolicy.max_iterations, 1, 10)) {
    issues.push(makeIssue("error", "WORKFLOW_LOOP_POLICY_INVALID", source, "loop_policy.max_iterations", "max_iterations must be finite and between 1 and 10."));
  }
  if (!isIntegerInRange(loopPolicy.max_same_root_cause_strategies, 1, 5)) {
    issues.push(makeIssue("error", "WORKFLOW_LOOP_POLICY_INVALID", source, "loop_policy.max_same_root_cause_strategies", "Strategy attempts must be finite and between 1 and 5."));
  }
  if (loopPolicy.on_scope_change !== "require_reconfirmation") {
    issues.push(makeIssue("error", "WORKFLOW_LOOP_POLICY_INVALID", source, "loop_policy.on_scope_change", "Scope changes must require reconfirmation."));
  }
  if (loopPolicy.on_budget_exhausted !== "needs_user_decision") {
    issues.push(makeIssue("error", "WORKFLOW_LOOP_POLICY_INVALID", source, "loop_policy.on_budget_exhausted", "Budget exhaustion must stop for a user decision."));
  }
}

function validatePermissionsAndCompatibility(manifest, source, issues) {
  const capabilities = manifest.permissions?.capabilities;
  if (!isPlainObject(manifest.permissions) || !Array.isArray(capabilities)) {
    issues.push(makeIssue("error", "WORKFLOW_PERMISSION_INVALID", source, "permissions.capabilities", "permissions.capabilities must be an array."));
  } else {
    const uniqueCapabilities = uniqueStrings(capabilities);
    if (uniqueCapabilities.length !== capabilities.length || uniqueCapabilities.some((capability) => !ALLOWED_CAPABILITIES.has(capability))) {
      issues.push(makeIssue("error", "WORKFLOW_PERMISSION_INVALID", source, "permissions.capabilities", "Manifest contains an unsupported or duplicated capability."));
    }
  }

  if (!isPlainObject(manifest.compatibility)) {
    issues.push(makeIssue("error", "WORKFLOW_COMPATIBILITY_INVALID", source, "compatibility", "compatibility is required."));
    return;
  }
  if (manifest.kind !== "project_legacy") {
    if (!isVersionRange(manifest.compatibility.core)) {
      issues.push(makeIssue("error", "WORKFLOW_COMPATIBILITY_INVALID", source, "compatibility.core", "A core semantic version range is required."));
    }
    if (!isVersionRange(manifest.compatibility.manifest_schema)) {
      issues.push(makeIssue("error", "WORKFLOW_COMPATIBILITY_INVALID", source, "compatibility.manifest_schema", "A manifest schema version range is required."));
    }
  }
}

export function validateWorkflowManifest(rawManifest, source = "inline", options = {}) {
  const normalized = normalizeLegacyManifest(rawManifest);
  const issues = [];
  const warnings = [];
  validateManifestShape(normalized.manifest, source, issues, warnings, normalized.legacy);
  if (!isPlainObject(normalized.manifest)) {
    return { manifest: normalized.manifest, legacy: normalized.legacy, issues, warnings };
  }
  const dependencies = validateComposition(normalized.manifest, source, issues);
  const skillRefs = validateSkills(normalized.manifest, source, issues);
  validateQualityAndLoop(normalized.manifest, source, issues);
  validatePermissionsAndCompatibility(normalized.manifest, source, issues);

  if (options.availableSkills instanceof Set) {
    for (const skillRef of skillRefs) {
      if (!options.availableSkills.has(skillRef)) {
        issues.push(makeIssue("error", "WORKFLOW_SKILL_UNRESOLVED", source, "skills", `Skill '${skillRef}' is not available in the approved project Skill catalog.`));
      }
    }
  }

  return {
    manifest: normalized.manifest,
    legacy: normalized.legacy,
    dependencies,
    skillRefs,
    issues,
    warnings
  };
}

export function parseWorkflowManifestFile(manifestPath) {
  const source = resolve(manifestPath);
  if (!existsSync(source)) {
    return {
      source,
      manifest: null,
      parseIssues: [makeIssue("error", "WORKFLOW_DECLARATION_MISSING", source, "root", "Manifest file does not exist.")]
    };
  }

  const document = parseDocument(readFileSync(source, "utf8"), { prettyErrors: false, uniqueKeys: true });
  const parseIssues = [
    ...document.errors.map((error) => makeIssue("error", "WORKFLOW_SCHEMA_INVALID", source, "yaml", error.message)),
    ...document.warnings.map((warning) => makeIssue("warning", "WORKFLOW_SCHEMA_WARNING", source, "yaml", warning.message))
  ];
  return { source, manifest: document.toJS(), parseIssues };
}

function findManifestFiles(directory) {
  if (!existsSync(directory)) return [];
  const paths = [];
  for (const entry of readdirSync(directory)) {
    if ([".git", "node_modules"].includes(entry)) continue;
    const entryPath = resolve(directory, entry);
    const entryStat = statSync(entryPath);
    if (entryStat.isDirectory()) {
      paths.push(...findManifestFiles(entryPath));
    } else if (entryStat.isFile() && basename(entryPath) === "workflow.yaml") {
      paths.push(entryPath);
    }
  }
  return paths.sort();
}

function findSkills(skillsDir) {
  if (!skillsDir || !existsSync(skillsDir)) return null;
  const refs = new Set();
  for (const entry of readdirSync(skillsDir)) {
    const candidate = resolve(skillsDir, entry);
    if (statSync(candidate).isDirectory() && existsSync(resolve(candidate, "SKILL.md"))) {
      refs.add(entry);
    }
  }
  return refs;
}

function findTemplateCycle(templateDependencies) {
  return findCycle(templateDependencies);
}

export function validateWorkflowDirectory(workflowRoot, options = {}) {
  const root = resolve(workflowRoot);
  const manifestPaths = findManifestFiles(root);
  const issues = [];
  const warnings = [];
  const records = [];
  const skillsDir = options.skillsDir ? resolve(options.skillsDir) : null;
  const availableSkills = findSkills(skillsDir);

  if (manifestPaths.length === 0) {
    issues.push(makeIssue("error", "WORKFLOW_DECLARATION_MISSING", root, "root", "No workflow.yaml files were found."));
  }
  if (skillsDir && !availableSkills) {
    warnings.push(makeIssue("warning", "WORKFLOW_SKILL_CATALOG_UNAVAILABLE", skillsDir, "skills", "The Skill catalog is unavailable, so Skill references were not resolved."));
  }

  for (const manifestPath of manifestPaths) {
    const parsed = parseWorkflowManifestFile(manifestPath);
    const record = {
      source: parsed.source,
      manifest: parsed.manifest,
      legacy: false,
      dependencies: [],
      skillRefs: [],
      issues: [...parsed.parseIssues],
      warnings: []
    };
    if (parsed.parseIssues.some((issue) => issue.severity === "error")) {
      records.push(record);
      issues.push(...record.issues);
      continue;
    }
    const validation = validateWorkflowManifest(parsed.manifest, parsed.source, { availableSkills });
    record.manifest = validation.manifest;
    record.legacy = validation.legacy;
    record.dependencies = validation.dependencies;
    record.skillRefs = validation.skillRefs;
    record.issues.push(...validation.issues);
    record.warnings.push(...validation.warnings);
    issues.push(...validation.issues);
    warnings.push(...validation.warnings, ...parsed.parseIssues.filter((issue) => issue.severity === "warning"));
    records.push(record);
  }

  const templatesById = new Map();
  for (const record of records) {
    const templateId = record.manifest?.template_id;
    if (!templateId) continue;
    if (templatesById.has(templateId)) {
      issues.push(makeIssue("error", "WORKFLOW_TEMPLATE_DUPLICATE", record.source, "template_id", `Template '${templateId}' is declared more than once.`));
    } else {
      templatesById.set(templateId, record);
    }
  }

  const dependencyGraph = new Map();
  for (const [templateId, record] of templatesById.entries()) {
    const dependencyIds = record.dependencies ?? [];
    dependencyGraph.set(templateId, dependencyIds.filter((dependencyId) => templatesById.has(dependencyId)));
    if (!options.allowUnresolvedTemplates) {
      for (const dependencyId of dependencyIds) {
        if (!templatesById.has(dependencyId)) {
          issues.push(makeIssue("error", "WORKFLOW_TEMPLATE_UNRESOLVED", record.source, "composition.requires", `Template dependency '${dependencyId}' was not found in this registry.`));
        }
      }
    }
  }
  const templateCycle = findTemplateCycle(dependencyGraph);
  if (templateCycle) {
    issues.push(makeIssue("error", "WORKFLOW_TEMPLATE_CYCLE", root, "composition.requires", `Template dependencies must stay acyclic. Cycle: ${templateCycle.join(" -> ")}.`));
  }

  return {
    schemaVersion: WORKFLOW_MANIFEST_SCHEMA_VERSION,
    workflowRoot: root,
    skillsDir,
    manifestCount: records.length,
    templateCount: templatesById.size,
    records,
    issues,
    warnings,
    valid: issues.length === 0
  };
}

function parseCliOptions(argv) {
  const options = { json: false, allowUnresolvedTemplates: false, manifest: null, workflowRoot: null, skillsDir: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--allow-unresolved-templates") {
      options.allowUnresolvedTemplates = true;
    } else if (["--manifest", "--workflow-root", "--skills-dir"].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      options[{ "--manifest": "manifest", "--workflow-root": "workflowRoot", "--skills-dir": "skillsDir" }[arg]] = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printUsage() {
  console.log(`Usage:\n  node scripts/workflow-manifest-validator.mjs --workflow-root .skill-os/workflows [--skills-dir .agents/skills] [--json]\n  node scripts/workflow-manifest-validator.mjs --manifest .skill-os/workflows/example/workflow.yaml [--json]`);
}

function printHumanReport(result) {
  const status = result.valid ? "passed" : "failed";
  console.log(`Workflow Manifest validation ${status}.`);
  console.log(`Templates: ${result.templateCount}; manifests: ${result.manifestCount}.`);
  for (const warning of result.warnings) console.log(`Warning ${warning.code}: ${warning.source} ${warning.path} - ${warning.message}`);
  for (const issue of result.issues) console.error(`Error ${issue.code}: ${issue.source} ${issue.path} - ${issue.message}`);
}

function runCli() {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.help || (!options.manifest && !options.workflowRoot)) {
    printUsage();
    process.exit(options.help ? 0 : 1);
  }

  if (options.manifest) {
    const parsed = parseWorkflowManifestFile(options.manifest);
    const validation = parsed.parseIssues.some((issue) => issue.severity === "error")
      ? { manifest: parsed.manifest, legacy: false, issues: parsed.parseIssues, warnings: [], valid: false }
      : validateWorkflowManifest(parsed.manifest, parsed.source, { availableSkills: findSkills(options.skillsDir) });
    const result = {
      schemaVersion: WORKFLOW_MANIFEST_SCHEMA_VERSION,
      manifestCount: 1,
      templateCount: validation.manifest?.template_id ? 1 : 0,
      records: [{ source: parsed.source, ...validation }],
      issues: validation.issues,
      warnings: [...parsed.parseIssues.filter((issue) => issue.severity === "warning"), ...validation.warnings],
      valid: validation.issues.length === 0
    };
    if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    else printHumanReport(result);
    process.exit(result.valid ? 0 : 1);
  }

  const result = validateWorkflowDirectory(options.workflowRoot, options);
  if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else printHumanReport(result);
  process.exit(result.valid ? 0 : 1);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && pathToFileURL(invokedPath).href === import.meta.url) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
