#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workbenchRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(workbenchRoot, "..");
const bundledPath = join(workbenchRoot, "tmp", "workflow-asset-paths-integration.mjs");
const bundledStarterPath = join(workbenchRoot, "tmp", "workflow-starter-resource-integration.mjs");

await build({
  entryPoints: [join(workbenchRoot, "src", "main", "workflow-asset-paths.ts")],
  outfile: bundledPath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  logLevel: "silent"
});

const { resolveWorkflowAssetPaths } = await import(`${pathToFileURL(bundledPath).href}?test=${Date.now()}`);
const developmentPaths = resolveWorkflowAssetPaths({
  appRoot: workbenchRoot,
  resourcesPath: "/unused",
  isPackaged: false
});
assert.equal(
  developmentPaths.frameworkRoot,
  join(workspaceRoot, "project-engineering-workflow")
);

const packagedPaths = resolveWorkflowAssetPaths({
  appRoot: "/unused",
  resourcesPath: join(workbenchRoot, "resources"),
  isPackaged: true
});
assert.equal(
  packagedPaths.frameworkRoot,
  join(workbenchRoot, "resources", "project-engineering-workflow")
);
assert.ok(packagedPaths.templatesRoot.endsWith("/.skill-os/workflows"));

assert.throws(
  () => resolveWorkflowAssetPaths({
    appRoot: "/missing/workbench",
    resourcesPath: "/missing/resources",
    isPackaged: true
  }),
  /installed application resources/
);

await build({
  entryPoints: [join(workbenchRoot, "src", "main", "workflow-starter-service.ts")],
  outfile: bundledStarterPath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  logLevel: "silent"
});
const { WorkflowStarterService } = await import(`${pathToFileURL(bundledStarterPath).href}?test=${Date.now()}`);
const projectRoot = mkdtempSync(join(tmpdir(), "workflow-packaged-assets-"));
try {
  const starter = new WorkflowStarterService(packagedPaths.templateRoot, packagedPaths.packagePath);
  const result = starter.applyRecommendedStarter(projectRoot);
  assert.ok(result.createdDirectoryCount > 0);
  assert.ok(existsSync(join(projectRoot, ".specify", "memory-store", "archive")));
  assert.ok(existsSync(join(projectRoot, ".specify", "memory-store", "users")));
  assert.ok(existsSync(join(projectRoot, "specs")));
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}

console.log(
  "Workflow asset path integration passed for development, packaged, and missing-resource modes; packaged starters restore empty directories."
);
