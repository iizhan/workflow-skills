#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const ignoredDirectories = new Set([
  ".git", ".idea", ".vscode", ".next", ".nuxt", ".turbo", ".venv", "build", "coverage",
  "dist", "node_modules", "out", "snapshots", "target", "tmp", "vendor", "venv"
]);
const exactEvidenceNames = new Set([
  "AGENTS.md", "CLAUDE.md", "Cargo.lock", "Cargo.toml", "Dockerfile", "Gemfile", "Gemfile.lock",
  "Makefile", "README", "README.md", "README.zh-CN.md", "build.gradle", "build.gradle.kts",
  "composer.json", "docker-compose.yml", "docker-compose.yaml", "go.mod", "go.sum", "gradle.properties",
  "package-lock.json", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "pom.xml",
  "pyproject.toml", "requirements.txt", "settings.gradle", "settings.gradle.kts", "tsconfig.json", "yarn.lock"
]);
const configPattern = /^(application|astro\.config|eslint\.config|jest\.config|next\.config|nuxt\.config|playwright\.config|settings|tailwind\.config|vite\.config|vitest\.config)(\..+)?$/i;
const keyEntryPattern = /^(app|bootstrap|config|index|main|routes?|router|server)(\..+)?$/i;
const maxEvidenceFiles = 200;
const maxEvidenceFileBytes = 1024 * 1024;

function parseArgs(argv) {
  const options = { command: argv[0] ?? "status", outputDir: process.cwd(), json: false };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--output-dir") options.outputDir = resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isEvidenceFile(root, absolutePath) {
  const rel = relative(root, absolutePath).split("\\").join("/");
  const name = basename(absolutePath);
  if (rel.startsWith(".specify/project-profile/") || rel.startsWith(".specify/memory-store/")) return false;
  if (/^\.env(\.|$)/.test(name) && name !== ".env.example") return false;
  if (exactEvidenceNames.has(name) || configPattern.test(name)) return true;
  if (rel.startsWith("docs/") && /\.(md|mdx|yaml|yml|json)$/i.test(name)) return true;
  const parts = rel.split("/");
  const inApplicationTree = parts.some((part) => ["app", "apps", "backend", "frontend", "packages", "server", "services", "src"].includes(part));
  return inApplicationTree && parts.length <= 5 && keyEntryPattern.test(name);
}

function discover(root) {
  const files = [];
  const directories = [];

  function walk(dir, depth) {
    if (depth > 4 || files.length >= maxEvidenceFiles) return;
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      if (ignoredDirectories.has(entry.name)) continue;
      const absolutePath = join(dir, entry.name);
      const rel = relative(root, absolutePath).split("\\").join("/");
      if (entry.isDirectory()) {
        if (depth <= 2 && !rel.startsWith(".specify/memory-store")) directories.push(rel);
        walk(absolutePath, depth + 1);
      } else if (entry.isFile() && isEvidenceFile(root, absolutePath)) {
        files.push(absolutePath);
        if (files.length >= maxEvidenceFiles) return;
      }
    }
  }

  walk(root, 0);
  const evidence = files.sort().map((filePath) => {
    const stat = statSync(filePath);
    const content = stat.size <= maxEvidenceFileBytes
      ? readFileSync(filePath)
      : Buffer.from(`${stat.size}:${Math.floor(stat.mtimeMs)}`);
    return {
      path: relative(root, filePath).split("\\").join("/"),
      sha256: hash(content),
      size: stat.size
    };
  });
  evidence.push({ path: "@directory-structure", sha256: hash(directories.sort().join("\n")), size: directories.length });
  return evidence;
}

function compareEvidence(previous, current) {
  const before = new Map((previous ?? []).map((item) => [item.path, item.sha256]));
  const after = new Map(current.map((item) => [item.path, item.sha256]));
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}

function projectPaths(root) {
  const profileDir = join(root, ".specify", "project-profile");
  return {
    profileDir,
    profile: join(profileDir, "profile.yaml"),
    architecture: join(profileDir, "architecture.md"),
    decisions: join(profileDir, "decision-memory.yaml"),
    state: join(profileDir, "local-state.json")
  };
}

function profileReady(profilePath) {
  return existsSync(profilePath) && /^status:\s*ready\s*$/m.test(readFileSync(profilePath, "utf8"));
}

function status(root) {
  const paths = projectPaths(root);
  const currentEvidence = discover(root);
  const requiredFilesPresent = [paths.profile, paths.architecture, paths.decisions].every(existsSync);
  if (!requiredFilesPresent || !profileReady(paths.profile) || !existsSync(paths.state)) {
    return {
      status: "missing",
      evidenceState: "missing",
      evidenceCount: currentEvidence.length,
      changedEvidence: currentEvidence.map((item) => item.path),
      lastCapturedAt: null,
      recommendedAction: "Analyze project facts, update profile.yaml and architecture.md, then run capture."
    };
  }

  let saved;
  try {
    saved = JSON.parse(readFileSync(paths.state, "utf8"));
  } catch {
    return {
      status: "stale",
      evidenceState: "invalid_local_state",
      evidenceCount: currentEvidence.length,
      changedEvidence: [".specify/project-profile/local-state.json"],
      lastCapturedAt: null,
      recommendedAction: "Refresh the project Profile and recapture evidence."
    };
  }

  const changedEvidence = compareEvidence(saved.evidence, currentEvidence);
  return {
    status: changedEvidence.length === 0 ? "fresh" : "stale",
    evidenceState: changedEvidence.length === 0 ? "fresh" : "changed",
    evidenceCount: currentEvidence.length,
    changedEvidence,
    lastCapturedAt: saved.capturedAt ?? null,
    recommendedAction: changedEvidence.length === 0
      ? "Reuse relevant Profile sections and matched decisions; inspect only the requested module as needed."
      : "Refresh only Profile sections affected by changed evidence, then run capture."
  };
}

function capture(root) {
  const paths = projectPaths(root);
  if (!profileReady(paths.profile)) {
    throw new Error("profile.yaml must set status: ready after verified project analysis before capture.");
  }
  mkdirSync(paths.profileDir, { recursive: true });
  const payload = {
    schemaVersion: 1,
    profileVersion: 1,
    capturedAt: new Date().toISOString(),
    evidence: discover(root)
  };
  writeFileSync(paths.state, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { status: "captured", evidenceState: "fresh", evidenceCount: payload.evidence.length, capturedAt: payload.capturedAt };
}

function print(result, json) {
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    console.log(`Project Profile: ${result.status}`);
    console.log(`Evidence: ${result.evidenceCount}`);
    if (result.changedEvidence?.length) console.log(`Changed: ${result.changedEvidence.join(", ")}`);
    if (result.recommendedAction) console.log(`Next: ${result.recommendedAction}`);
  }
}

const options = parseArgs(process.argv.slice(2));
const root = resolve(options.outputDir);
if (!existsSync(root)) throw new Error(`Project root does not exist: ${root}`);
if (options.command === "status") print(status(root), options.json);
else if (options.command === "capture") print(capture(root), options.json);
else throw new Error("Use status or capture.");
