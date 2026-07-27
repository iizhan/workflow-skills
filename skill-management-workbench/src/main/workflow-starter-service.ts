import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import type { WorkflowStarterApplyResult, WorkflowStarterPreview } from "../shared/types";

function nowIso() {
  return new Date().toISOString();
}

function toPosixPath(path: string) {
  return path.split(/[\\/]+/).join("/");
}

function readPackageVersion(packagePath: string) {
  try {
    const raw = readFileSync(packagePath, "utf8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

const workflowEntryStart = "<!-- workflow-skills:project-engineering-workflow:start -->";
const workflowEntryEnd = "<!-- workflow-skills:project-engineering-workflow:end -->";
const emptyDirectoryManifestFileName = ".skill-os-empty-directory-manifest.json";

function inferStarterContext(projectRoot: string) {
  const projectName = basename(projectRoot) || "Project";
  const projectSlug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
  const pomPath = join(projectRoot, "pom.xml");
  const packageJsonPath = join(projectRoot, "package.json");

  if (existsSync(pomPath)) {
    const pom = readFileSync(pomPath, "utf8");
    const serverModule = readdirSync(projectRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /-server$/.test(entry.name))
      .find((entry) => existsSync(join(projectRoot, entry.name, "pom.xml")))?.name;
    const appPath = serverModule ?? ".";
    return {
      "__PROJECT_NAME__": projectName,
      "__PROJECT_SLUG__": projectSlug,
      "__STACK_NAME__": /spring|boot-parent/i.test(pom)
        ? "Java + Maven + Spring Boot"
        : "Java + Maven",
      "__APP_PATH__": appPath,
      "__TEST_COMMAND__": serverModule ? `mvn test -pl ${serverModule}` : "mvn test",
      "__ENV_OUTPUT__": appPath === "." ? "target" : `${appPath}/target`
    };
  }

  if (existsSync(packageJsonPath)) {
    const packageManager = existsSync(join(projectRoot, "pnpm-lock.yaml"))
      ? "pnpm"
      : existsSync(join(projectRoot, "yarn.lock"))
        ? "yarn"
        : "npm";
    return {
      "__PROJECT_NAME__": projectName,
      "__PROJECT_SLUG__": projectSlug,
      "__STACK_NAME__": "JavaScript/TypeScript",
      "__APP_PATH__": ".",
      "__TEST_COMMAND__": `${packageManager} test`,
      "__ENV_OUTPUT__": "dist"
    };
  }

  return {
    "__PROJECT_NAME__": projectName,
    "__PROJECT_SLUG__": projectSlug,
    "__STACK_NAME__": "Project stack pending Profile analysis",
    "__APP_PATH__": ".",
    "__TEST_COMMAND__": "Use the project test command after Profile analysis",
    "__ENV_OUTPUT__": "Build output pending Profile analysis"
  };
}

function renderStarterText(text: string, context: Record<string, string>) {
  return Object.entries(context).reduce(
    (rendered, [placeholder, value]) => rendered.split(placeholder).join(value),
    text
  );
}

function agentsEntryIsIntegrated(text: string) {
  return (
    text.includes(workflowEntryStart) ||
    (text.includes("$project-profile-router") &&
      text.includes("$project-requirement-gate") &&
      text.includes(".agents/skills"))
  );
}

function mergeAgentsEntry(targetPath: string, renderedTemplate: string) {
  const existing = readFileSync(targetPath, "utf8");
  if (agentsEntryIsIntegrated(existing)) {
    return false;
  }

  const workflowBody = renderedTemplate.replace(/^#[^\n]*\n+/, "").trim();
  const merged = `${existing.trimEnd()}\n\n${workflowEntryStart}\n## Project Engineering Workflow\n\n${workflowBody}\n${workflowEntryEnd}\n`;
  writeFileSync(targetPath, merged, "utf8");
  return true;
}

function collectTemplateEntries(templateRoot: string) {
  const files: string[] = [];
  const directories: string[] = [];
  const queue = [templateRoot];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".DS_Store" || entry.name === emptyDirectoryManifestFileName) {
        continue;
      }

      const absolutePath = join(current, entry.name);
      const relativePath = toPosixPath(relative(templateRoot, absolutePath));
      if (entry.isDirectory()) {
        directories.push(relativePath);
        queue.push(absolutePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  const emptyDirectoryManifestPath = join(templateRoot, emptyDirectoryManifestFileName);
  if (existsSync(emptyDirectoryManifestPath)) {
    try {
      const parsed = JSON.parse(readFileSync(emptyDirectoryManifestPath, "utf8")) as {
        emptyDirectories?: unknown;
      };
      if (Array.isArray(parsed.emptyDirectories)) {
        for (const entry of parsed.emptyDirectories) {
          if (typeof entry !== "string") continue;
          const relativePath = toPosixPath(entry);
          if (
            relativePath &&
            !relativePath.startsWith("/") &&
            !relativePath.split("/").includes("..")
          ) {
            directories.push(relativePath);
          }
        }
      }
    } catch {
      // An optional packaging manifest must not block an otherwise valid starter.
    }
  }

  return {
    files: files.sort((left, right) => left.localeCompare(right)),
    directories: [...new Set(directories)].sort((left, right) => left.localeCompare(right))
  };
}

export class WorkflowStarterService {
  private readonly starterId = "project-engineering-workflow" as const;
  private readonly starterName = "Project Engineering Workflow";
  private readonly starterVersion: string | null;

  constructor(
    private readonly templateRoot: string,
    packagePath: string
  ) {
    this.starterVersion = readPackageVersion(packagePath);
  }

  previewRecommendedStarter(projectRoot: string): WorkflowStarterPreview {
    const trimmedProjectRoot = projectRoot.trim();
    if (!trimmedProjectRoot) {
      throw new Error("Choose a project folder before previewing the recommended workflow.");
    }

    const resolvedProjectRoot = resolve(trimmedProjectRoot);
    if (!existsSync(resolvedProjectRoot) || !statSync(resolvedProjectRoot).isDirectory()) {
      throw new Error("The selected project folder does not exist or is not a directory.");
    }

    const resolvedTemplateRoot = resolve(this.templateRoot);
    if (!existsSync(resolvedTemplateRoot) || !statSync(resolvedTemplateRoot).isDirectory()) {
      throw new Error("Recommended workflow starter template is missing.");
    }

    const { files, directories } = collectTemplateEntries(resolvedTemplateRoot);
    const context = inferStarterContext(resolvedProjectRoot);
    const filesToCreate: string[] = [];
    const fileConflicts: string[] = [];
    const preservedFiles: string[] = [];
    const directoriesToCreate: string[] = [];
    const skippedExistingDirectories: string[] = [];

    for (const directory of directories) {
      const targetPath = join(resolvedProjectRoot, directory);
      if (existsSync(targetPath)) {
        skippedExistingDirectories.push(directory);
      } else {
        directoriesToCreate.push(directory);
      }
    }

    for (const file of files) {
      const targetPath = join(resolvedProjectRoot, file);
      if (existsSync(targetPath)) {
        const sourceText = readFileSync(join(resolvedTemplateRoot, file), "utf8");
        const renderedSourceText = renderStarterText(sourceText, context);
        const targetText = readFileSync(targetPath, "utf8");
        if (targetText === renderedSourceText || file === "AGENTS.md") {
          preservedFiles.push(file);
        } else {
          fileConflicts.push(file);
        }
      } else {
        filesToCreate.push(file);
      }
    }

    const skillCount = files.filter((file) => basename(file) === "SKILL.md").length;
    const warnings: string[] = [];
    if (fileConflicts.length > 0) {
      warnings.push("Existing workflow files block this starter. Resolve conflicts before applying.");
    }
    if (preservedFiles.includes("AGENTS.md")) {
      warnings.push("Existing AGENTS.md will be preserved and extended with the workflow entry only when needed.");
    }
    if (skippedExistingDirectories.length > 0) {
      warnings.push("Existing directories will be reused without overwriting their files.");
    }

    return {
      starterId: this.starterId,
      starterName: this.starterName,
      starterVersion: this.starterVersion,
      projectRoot: resolvedProjectRoot,
      templateRoot: resolvedTemplateRoot,
      generatedAt: nowIso(),
      canApply: fileConflicts.length === 0,
      filesToCreate,
      directoriesToCreate,
      fileConflicts,
      preservedFiles,
      skippedExistingDirectories,
      skillCount,
      totalFileCount: files.length,
      totalDirectoryCount: directories.length,
      warnings
    };
  }

  applyRecommendedStarter(projectRoot: string): WorkflowStarterApplyResult {
    const preview = this.previewRecommendedStarter(projectRoot);
    if (!preview.canApply) {
      throw new Error("Resolve existing file conflicts before applying the recommended workflow.");
    }

    const context = inferStarterContext(preview.projectRoot);
    for (const directory of preview.directoriesToCreate) {
      mkdirSync(join(preview.projectRoot, directory), { recursive: true });
    }

    for (const file of preview.filesToCreate) {
      const sourcePath = join(preview.templateRoot, file);
      const targetPath = join(preview.projectRoot, file);
      mkdirSync(dirname(targetPath), { recursive: true });
      cpSync(sourcePath, targetPath, { force: false });
      const sourceText = readFileSync(sourcePath, "utf8");
      const renderedText = renderStarterText(sourceText, context);
      if (renderedText !== sourceText) {
        writeFileSync(targetPath, renderedText, "utf8");
      }
    }

    const agentsPath = join(preview.projectRoot, "AGENTS.md");
    const mergedFileCount =
      preview.preservedFiles.includes("AGENTS.md") &&
      mergeAgentsEntry(
        agentsPath,
        renderStarterText(readFileSync(join(preview.templateRoot, "AGENTS.md"), "utf8"), context)
      )
        ? 1
        : 0;

    return {
      preview,
      appliedAt: nowIso(),
      copiedFileCount: preview.filesToCreate.length,
      mergedFileCount,
      createdDirectoryCount: preview.directoriesToCreate.length
    };
  }
}
