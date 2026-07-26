import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const workbenchRoot = process.cwd();
const workspaceRoot = resolve(workbenchRoot, "..");
const starterTemplateRoot = join(
  workspaceRoot,
  "project-engineering-workflow/assets/template-root"
);
const sourceWorkflowRoot = join(starterTemplateRoot, ".skill-os/workflows");
const workflowPackagePath = join(workspaceRoot, "project-engineering-workflow/package.json");
const sandboxRoot = mkdtempSync(join(tmpdir(), "workflow-registry-integration-"));
const bundledEntry = join(workbenchRoot, "tmp/workflow-registry-test-entry.mjs");

try {
  await build({
    entryPoints: [join(workbenchRoot, "scripts/workflow-registry-test-entry.ts")],
    outfile: bundledEntry,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    external: ["better-sqlite3", "yaml"],
    logLevel: "silent"
  });
  const { runWorkflowRegistryIntegration } = await import(
    `${pathToFileURL(bundledEntry).href}?test=${Date.now()}`
  );
  await runWorkflowRegistryIntegration({
    sandboxRoot,
    starterTemplateRoot,
    sourceWorkflowRoot,
    workflowPackagePath
  });
  console.log("Workflow Registry integration passed: preview-confirm-apply-verify, upgrade rollback, and legacy projection are covered.");
} finally {
  rmSync(bundledEntry, { force: true });
  rmSync(sandboxRoot, { recursive: true, force: true });
}
