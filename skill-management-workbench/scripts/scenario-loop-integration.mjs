import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const scriptsRoot = dirname(fileURLToPath(import.meta.url));
const workbenchRoot = resolve(scriptsRoot, "..");
const workspaceRoot = resolve(workbenchRoot, "..");
const starterTemplateRoot = join(
  workspaceRoot,
  "project-engineering-workflow/assets/template-root"
);
const workflowTemplateRoot = join(starterTemplateRoot, ".skill-os/workflows");
const workflowPackagePath = join(workspaceRoot, "project-engineering-workflow/package.json");
const sandboxRoot = mkdtempSync(join(tmpdir(), "scenario-loop-integration-"));
const bundledEntry = join(workbenchRoot, "tmp/scenario-loop-test-entry.mjs");

try {
  await build({
    entryPoints: [join(scriptsRoot, "scenario-loop-test-entry.ts")],
    outfile: bundledEntry,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    external: ["better-sqlite3", "yaml"],
    logLevel: "silent"
  });
  const { runScenarioLoopIntegration } = await import(
    `${pathToFileURL(bundledEntry).href}?test=${Date.now()}`
  );
  await runScenarioLoopIntegration({
    sandboxRoot,
    starterTemplateRoot,
    workflowTemplateRoot,
    workflowPackagePath
  });
  console.log("Scenario Loop integration passed: frontend, API, Swagger integration, quality, scope, budget, strategy, and iteration stop gates are covered.");
} finally {
  rmSync(bundledEntry, { force: true });
  rmSync(sandboxRoot, { recursive: true, force: true });
}
