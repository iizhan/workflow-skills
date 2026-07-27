#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workbenchRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(workbenchRoot, "..");
const appDirIndex = process.argv.indexOf("--app-dir");
const appDir = appDirIndex >= 0 ? resolve(workbenchRoot, process.argv[appDirIndex + 1] ?? "") : null;
const sourceTemplateRoot = join(workspaceRoot, "project-engineering-workflow", "assets", "template-root");
const packagedTemplateRoot = appDir
  ? join(appDir, "Contents", "Resources", "project-engineering-workflow", "assets", "template-root")
  : null;
const emptyDirectoryManifestFileName = ".skill-os-empty-directory-manifest.json";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function collectFiles(root) {
  const files = [];
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) {
        queue.push(path);
      } else {
        files.push(relative(root, path));
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

assert(appDir, "Usage: node scripts/verify-packaged-workflow-assets.mjs --app-dir /absolute/path/to/Skill OS.app");
assert(existsSync(packagedTemplateRoot), `Packaged workflow assets are missing: ${packagedTemplateRoot}`);

const sourceFiles = collectFiles(sourceTemplateRoot);
const expectedPackagedFiles = sourceFiles
  .filter((relativePath) => !relativePath.endsWith("/.gitkeep"))
  .concat(emptyDirectoryManifestFileName)
  .sort((left, right) => left.localeCompare(right));
const packagedFiles = collectFiles(packagedTemplateRoot).sort((left, right) => left.localeCompare(right));
assert(
  JSON.stringify(packagedFiles) === JSON.stringify(expectedPackagedFiles),
  "Packaged workflow assets do not match the expected runtime template files."
);

for (const relativePath of expectedPackagedFiles) {
  if (relativePath === emptyDirectoryManifestFileName) {
    continue;
  }
  assert(
    sha256(join(sourceTemplateRoot, relativePath)) === sha256(join(packagedTemplateRoot, relativePath)),
    `Packaged workflow asset differs: ${relativePath}`
  );
}

const expectedEmptyDirectories = sourceFiles
  .filter((relativePath) => relativePath.endsWith("/.gitkeep"))
  .map((relativePath) => relativePath.slice(0, -"/.gitkeep".length))
  .sort((left, right) => left.localeCompare(right));
const generatedManifestPath = join(
  workbenchRoot,
  "resources",
  "project-engineering-workflow",
  "assets",
  "template-root",
  emptyDirectoryManifestFileName
);
assert(existsSync(generatedManifestPath), "Generated empty-directory manifest is missing before packaging.");
const generatedManifest = JSON.parse(readFileSync(generatedManifestPath, "utf8"));
assert(
  JSON.stringify(generatedManifest.emptyDirectories) === JSON.stringify(expectedEmptyDirectories),
  "Generated empty-directory manifest does not match the template placeholders."
);
assert(
  sha256(generatedManifestPath) === sha256(join(packagedTemplateRoot, emptyDirectoryManifestFileName)),
  "Packaged empty-directory manifest differs from the generated runtime manifest."
);

console.log(
  `Packaged workflow assets verified: ${expectedPackagedFiles.length} files and ${expectedEmptyDirectories.length} restored empty directories.`
);
