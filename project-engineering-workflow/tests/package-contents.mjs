#!/usr/bin/env node
// Guards the published tarball against silently losing template files.
// npm unconditionally strips some filenames (notably `.gitignore`) while packing,
// so a starter that is complete in the working tree can still install broken.
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const packageRoot = resolve(testDir, "..");
const assetsRoot = resolve(packageRoot, "assets");

// Names npm removes from a tarball no matter what `files` says.
const npmStrippedNames = new Set([".gitignore", ".npmignore", ".npmrc"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    if (statSync(path).isDirectory()) {
      yield* walkFiles(path);
      continue;
    }
    yield path;
  }
}

const assetFiles = [...walkFiles(assetsRoot)].map((path) => relative(packageRoot, path).split("\\").join("/"));

const unpackableAssets = assetFiles.filter((relPath) => npmStrippedNames.has(relPath.split("/").pop()));
assert(
  unpackableAssets.length === 0,
  `These asset files would be stripped by npm pack: ${unpackableAssets.join(", ")}. ` +
    "Store them under a name npm keeps and restore the real name in bin/project-engineering-workflow.mjs (templateSourceRenames)."
);

const pack = spawnSync("npm", ["pack", "--dry-run", "--json", "--package-lock=false"], {
  cwd: packageRoot,
  encoding: "utf8"
});
assert(pack.status === 0, `npm pack --dry-run failed: ${pack.stderr}`);

const packedPaths = new Set(
  JSON.parse(pack.stdout)[0].files.map((file) => file.path.split("\\").join("/"))
);

const missing = assetFiles.filter((relPath) => !packedPaths.has(relPath));
assert(
  missing.length === 0,
  `${missing.length} asset file(s) are missing from the tarball: ${missing.join(", ")}`
);

console.log(`Package contents tests passed. ${assetFiles.length} asset files reach the tarball.`);
