#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateWorkflowDirectory } from "../scripts/workflow-manifest-validator.mjs";

const testDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const packageRoot = resolve(testDir, "..");
const templateWorkflowRoot = resolve(packageRoot, "assets/template-root/.skill-os/workflows");
const templateSkillsRoot = resolve(packageRoot, "assets/template-root/.agents/skills");
const fixturesRoot = resolve(testDir, "fixtures/workflow-manifests");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasCode(entries, code) {
  return entries.some((entry) => entry.code === code);
}

const templates = validateWorkflowDirectory(templateWorkflowRoot, { skillsDir: templateSkillsRoot });
assert(templates.valid, `Shipped Workflow Templates must validate: ${templates.issues.map((entry) => entry.code).join(", ")}`);
assert(templates.templateCount === 7, `Expected seven shipped Workflow Templates, received ${templates.templateCount}.`);

const legacy = validateWorkflowDirectory(resolve(fixturesRoot, "legacy-v1"), { allowUnresolvedTemplates: true });
assert(legacy.valid, `Legacy 1.0 declaration must stay readable: ${legacy.issues.map((entry) => entry.code).join(", ")}`);
assert(hasCode(legacy.warnings, "WORKFLOW_LEGACY_READ_ONLY"), "Legacy declarations must be marked read-only.");

const invalid = validateWorkflowDirectory(resolve(fixturesRoot, "invalid-cycle"), { allowUnresolvedTemplates: true });
assert(!invalid.valid, "Invalid manifest fixture must fail validation.");
for (const code of ["WORKFLOW_CYCLE_UNSUPPORTED", "WORKFLOW_LOOP_POLICY_INVALID", "WORKFLOW_PERMISSION_INVALID"]) {
  assert(hasCode(invalid.issues, code), `Invalid manifest must report ${code}.`);
}

console.log("Workflow Manifest validator tests passed.");
