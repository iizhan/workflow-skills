#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workbenchRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(workbenchRoot, "..");
const sourceRoot = join(workspaceRoot, "project-engineering-workflow");
const targetRoot = join(workbenchRoot, "resources", "project-engineering-workflow");
const sourceTemplateRoot = join(sourceRoot, "assets", "template-root");
const targetTemplateRoot = join(targetRoot, "assets", "template-root");
const emptyDirectoryManifestFileName = ".skill-os-empty-directory-manifest.json";

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(existsSync(sourceTemplateRoot), `Missing workflow source template: ${sourceTemplateRoot}`);
assert(existsSync(targetTemplateRoot), "Generated workflow assets are missing. Run npm run sync:workflow-assets.");

const sourceFiles = collectFiles(sourceTemplateRoot);
const targetFiles = collectFiles(targetTemplateRoot);
const expectedTargetFiles = [...sourceFiles, emptyDirectoryManifestFileName].sort((left, right) => left.localeCompare(right));
assert(
  JSON.stringify(expectedTargetFiles) === JSON.stringify(targetFiles),
  "Generated workflow template file list does not match the framework source."
);

for (const relativePath of sourceFiles) {
  const sourcePath = join(sourceTemplateRoot, relativePath);
  const targetPath = join(targetTemplateRoot, relativePath);
  assert(sha256(sourcePath) === sha256(targetPath), `Generated workflow asset differs: ${relativePath}`);
}

const expectedEmptyDirectories = sourceFiles
  .filter((relativePath) => relativePath.endsWith("/.gitkeep"))
  .map((relativePath) => relativePath.slice(0, -"/.gitkeep".length))
  .sort((left, right) => left.localeCompare(right));
const emptyDirectoryManifest = JSON.parse(
  readFileSync(join(targetTemplateRoot, emptyDirectoryManifestFileName), "utf8")
);
assert(
  JSON.stringify(emptyDirectoryManifest.emptyDirectories) === JSON.stringify(expectedEmptyDirectories),
  "Generated empty-directory manifest does not match the template placeholders."
);

const sourcePackagePath = join(sourceRoot, "package.json");
const targetPackagePath = join(targetRoot, "package.json");
assert(existsSync(targetPackagePath), "Generated workflow package metadata is missing.");
assert(sha256(sourcePackagePath) === sha256(targetPackagePath), "Generated workflow package metadata differs.");

console.log(
  `Workflow assets verified: ${sourceFiles.length} template files, ${expectedEmptyDirectories.length} empty directories, and package metadata match.`
);
