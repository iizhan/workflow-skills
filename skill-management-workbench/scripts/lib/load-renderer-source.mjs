import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const workbenchRoot = resolve(scriptDir, "..", "..");
export const rendererSourceRoot = join(workbenchRoot, "src", "renderer", "src");

const appRootFile = "App.tsx";
const excludedRendererFiles = new Set([
  "global.d.ts",
  "main.tsx",
  "preview-api.ts",
  "vite-env.d.ts"
]);
const extractionDirectories = new Set(["components", "context", "hooks", "lib", "types"]);

// Add extracted modules here in dependency order. Keep App.tsx last.
const rendererSourceManifest = [
  appRootFile
];

function toPosixPath(path) {
  return path.split(/[\\/]+/).join("/");
}

function isRendererSourceFile(path) {
  return (path.endsWith(".ts") || path.endsWith(".tsx")) && !path.endsWith(".d.ts");
}

function walkRendererSourceFiles(root = rendererSourceRoot) {
  const files = [];
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
      } else if (entry.isFile() && isRendererSourceFile(entry.name)) {
        files.push(toPosixPath(relative(root, absolutePath)));
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function isExtractionModule(path) {
  return extractionDirectories.has(path.split("/")[0]);
}

export function listRendererSourceFiles() {
  const manifest = [...rendererSourceManifest];
  const manifestSet = new Set(manifest);
  const actualFiles = walkRendererSourceFiles();
  const unclassified = actualFiles.filter((path) => {
    if (excludedRendererFiles.has(path)) return false;
    return !manifestSet.has(path);
  });
  const missing = manifest.filter((path) => !actualFiles.includes(path));
  const duplicate = manifest.find((path, index) => manifest.indexOf(path) !== index);

  if (duplicate) {
    throw new Error(`Renderer source manifest contains a duplicate entry: ${duplicate}`);
  }
  if (manifest.at(-1) !== appRootFile) {
    throw new Error(`Renderer source manifest must keep ${appRootFile} as its final entry.`);
  }
  if (missing.length > 0) {
    throw new Error(`Renderer source manifest references missing file(s): ${missing.join(", ")}`);
  }
  if (unclassified.length > 0) {
    const extractionModules = unclassified.filter(isExtractionModule);
    const otherModules = unclassified.filter((path) => !isExtractionModule(path));
    const details = [
      extractionModules.length > 0 ? `extraction module(s): ${extractionModules.join(", ")}` : null,
      otherModules.length > 0 ? `renderer module(s): ${otherModules.join(", ")}` : null
    ].filter(Boolean).join("; ");
    throw new Error(`Renderer source manifest is missing ${details}.`);
  }

  return manifest;
}

export function readRendererSourceFile(relativePath) {
  const normalizedPath = toPosixPath(relativePath);
  const path = join(rendererSourceRoot, normalizedPath);
  return readFileSync(path, "utf8");
}

export function readOptionalRendererSourceFile(relativePath) {
  const normalizedPath = toPosixPath(relativePath);
  const path = join(rendererSourceRoot, normalizedPath);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

export function loadRendererSource() {
  return listRendererSourceFiles()
    .map((relativePath) => readRendererSourceFile(relativePath))
    .join("\n\n");
}

export function loadAppRootSource() {
  return readRendererSourceFile(appRootFile);
}

export function listRendererSourceFilesInDirectory(relativeDirectory) {
  const prefix = `${toPosixPath(relativeDirectory).replace(/\/$/, "")}/`;
  return listRendererSourceFiles().filter((path) => path.startsWith(prefix));
}

export function findInertButtons(source) {
  return [...source.matchAll(/<button\b[\s\S]*?<\/button>/g)].filter(
    (match) => !match[0].includes("onClick=") && !match[0].includes('type="submit"')
  );
}

export function extractProductNavHrefs(source) {
  const navBlock = source.match(/const productNavHrefs = \[([\s\S]*?)\] as const;/);
  if (!navBlock) return null;
  return [...navBlock[1].matchAll(/"#([^"]+)"/g)].map((match) => match[1]);
}
