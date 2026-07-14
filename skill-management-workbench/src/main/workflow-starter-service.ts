import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync
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
      if (entry.name === ".DS_Store") {
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

  return {
    files: files.sort((left, right) => left.localeCompare(right)),
    directories: directories.sort((left, right) => left.localeCompare(right))
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
    const filesToCreate: string[] = [];
    const fileConflicts: string[] = [];
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
        fileConflicts.push(file);
      } else {
        filesToCreate.push(file);
      }
    }

    const skillCount = files.filter((file) => basename(file) === "SKILL.md").length;
    const warnings =
      fileConflicts.length > 0
        ? ["Existing files block this starter. Resolve conflicts before applying."]
        : skippedExistingDirectories.length > 0
          ? ["Some directories already exist; the starter will reuse them without overwriting files."]
          : [];

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

    for (const directory of preview.directoriesToCreate) {
      mkdirSync(join(preview.projectRoot, directory), { recursive: true });
    }

    for (const file of preview.filesToCreate) {
      const sourcePath = join(preview.templateRoot, file);
      const targetPath = join(preview.projectRoot, file);
      mkdirSync(dirname(targetPath), { recursive: true });
      cpSync(sourcePath, targetPath, { force: false });
    }

    return {
      preview,
      appliedAt: nowIso(),
      copiedFileCount: preview.filesToCreate.length,
      createdDirectoryCount: preview.directoriesToCreate.length
    };
  }
}
