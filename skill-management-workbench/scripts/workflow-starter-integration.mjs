import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const workbenchRoot = resolve(scriptRoot, "..");
const workspaceRoot = resolve(workbenchRoot, "..");
const templateRoot = join(
  workspaceRoot,
  "project-engineering-workflow/assets/template-root"
);
const workflowPackagePath = join(
  workspaceRoot,
  "project-engineering-workflow/package.json"
);
const serviceEntry = join(workbenchRoot, "src/main/workflow-starter-service.ts");
const sandboxRoot = mkdtempSync(join(tmpdir(), "workflow-starter-integration-"));

function collectFiles(root) {
  const files = [];
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
      } else if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
  }
  return files;
}

try {
  const bundledServicePath = join(sandboxRoot, "workflow-starter-service.mjs");
  await build({
    entryPoints: [serviceEntry],
    outfile: bundledServicePath,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    logLevel: "silent"
  });

  const { WorkflowStarterService } = await import(
    `${pathToFileURL(bundledServicePath).href}?test=${Date.now()}`
  );
  const projectRoot = join(sandboxRoot, "existing-agents-project");
  const serverRoot = join(projectRoot, "goods-server");
  mkdirSync(serverRoot, { recursive: true });
  writeFileSync(
    join(projectRoot, "AGENTS.md"),
    "# Existing Project Rules\n\n- Keep this custom rule.\n",
    "utf8"
  );
  writeFileSync(
    join(projectRoot, "pom.xml"),
    [
      "<project>",
      "  <parent><artifactId>spring-boot-parent</artifactId></parent>",
      "  <modules><module>goods-server</module></modules>",
      "</project>"
    ].join("\n"),
    "utf8"
  );
  writeFileSync(join(serverRoot, "pom.xml"), "<project />\n", "utf8");

  const service = new WorkflowStarterService(templateRoot, workflowPackagePath);
  const preview = service.previewRecommendedStarter(projectRoot);
  assert.equal(preview.canApply, true);
  assert.deepEqual(preview.fileConflicts, []);
  assert.ok(preview.preservedFiles.includes("AGENTS.md"));
  assert.equal(preview.skillCount, 27);

  const result = service.applyRecommendedStarter(projectRoot);
  assert.ok(result.copiedFileCount > 0);
  assert.equal(result.mergedFileCount, 1);

  const agentsText = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");
  assert.match(agentsText, /Keep this custom rule/);
  assert.match(agentsText, /Java \+ Maven \+ Spring Boot/);
  assert.match(agentsText, /goods-server/);
  assert.equal(
    agentsText.match(/workflow-skills:project-engineering-workflow:start/g)?.length,
    1
  );

  const installedFiles = collectFiles(projectRoot);
  assert.equal(
    installedFiles.filter((file) => file.endsWith("/SKILL.md")).length,
    27
  );
  const unresolvedPlaceholders = installedFiles.flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return text.match(/__[A-Z0-9_]+__/g) ?? [];
  });
  assert.deepEqual(unresolvedPlaceholders, []);

  const secondPreview = service.previewRecommendedStarter(projectRoot);
  assert.equal(secondPreview.canApply, true);
  assert.deepEqual(secondPreview.fileConflicts, []);
  const secondResult = service.applyRecommendedStarter(projectRoot);
  assert.equal(secondResult.copiedFileCount, 0);
  assert.equal(secondResult.mergedFileCount, 0);
  const secondAgentsText = readFileSync(join(projectRoot, "AGENTS.md"), "utf8");
  assert.equal(
    secondAgentsText.match(/workflow-skills:project-engineering-workflow:start/g)?.length,
    1
  );

  console.log(
    "Workflow Starter integration passed: existing AGENTS.md preserved, 27 Skills installed, placeholders rendered, repeat apply is idempotent."
  );
} finally {
  rmSync(sandboxRoot, { recursive: true, force: true });
}
