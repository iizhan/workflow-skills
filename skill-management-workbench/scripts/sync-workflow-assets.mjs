#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workbenchRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(workbenchRoot, "..");
const frameworkRoot = join(workspaceRoot, "project-engineering-workflow");
const sourceTemplateRoot = join(frameworkRoot, "assets", "template-root");
const sourcePackagePath = join(frameworkRoot, "package.json");
const targetRoot = join(workbenchRoot, "resources", "project-engineering-workflow");
const emptyDirectoryManifestFileName = ".skill-os-empty-directory-manifest.json";

function countFiles(root) {
  const queue = [root];
  let count = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (statSync(path).isDirectory()) {
        queue.push(path);
      } else {
        count += 1;
      }
    }
  }

  return count;
}

function collectGitkeepDirectories(root) {
  const directories = [];
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const entries = readdirSync(current, { withFileTypes: true });
    const relativePath = relative(root, current);
    if (
      relativePath &&
      entries.length === 1 &&
      entries[0].isFile() &&
      entries[0].name === ".gitkeep"
    ) {
      directories.push(relativePath.split(/[\\/]+/).join("/"));
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        queue.push(join(current, entry.name));
      }
    }
  }

  return directories.sort((left, right) => left.localeCompare(right));
}

if (!existsSync(sourceTemplateRoot) || !existsSync(sourcePackagePath)) {
  throw new Error(`Workflow source assets are missing: ${frameworkRoot}`);
}

rmSync(targetRoot, { recursive: true, force: true });
mkdirSync(targetRoot, { recursive: true });
cpSync(sourceTemplateRoot, join(targetRoot, "assets", "template-root"), { recursive: true });
cpSync(sourcePackagePath, join(targetRoot, "package.json"));

const emptyDirectories = collectGitkeepDirectories(sourceTemplateRoot);
writeFileSync(
  join(targetRoot, "assets", "template-root", emptyDirectoryManifestFileName),
  `${JSON.stringify({ version: 1, emptyDirectories }, null, 2)}\n`,
  "utf8"
);

const packageVersion = JSON.parse(readFileSync(sourcePackagePath, "utf8")).version;
console.log(JSON.stringify({
  source: relative(workbenchRoot, frameworkRoot),
  target: relative(workbenchRoot, targetRoot),
  version: packageVersion,
  templateFileCount: countFiles(sourceTemplateRoot),
  emptyDirectoryCount: emptyDirectories.length
}, null, 2));
