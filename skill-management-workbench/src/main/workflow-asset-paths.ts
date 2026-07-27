import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export interface WorkflowAssetPathOptions {
  appRoot: string;
  resourcesPath: string;
  isPackaged: boolean;
}

export interface WorkflowAssetPaths {
  frameworkRoot: string;
  templateRoot: string;
  templatesRoot: string;
  packagePath: string;
}

export function resolveWorkflowAssetPaths(options: WorkflowAssetPathOptions): WorkflowAssetPaths {
  const frameworkRoot = options.isPackaged
    ? join(options.resourcesPath, "project-engineering-workflow")
    : resolve(options.appRoot, "..", "project-engineering-workflow");
  const templateRoot = join(frameworkRoot, "assets", "template-root");
  const templatesRoot = join(templateRoot, ".skill-os", "workflows");
  const packagePath = join(frameworkRoot, "package.json");
  const requiredPaths = [templateRoot, templatesRoot, packagePath];

  if (requiredPaths.some((path) => !existsSync(path))) {
    const location = options.isPackaged ? "installed application resources" : "development workspace";
    throw new Error(
      `Project Engineering Workflow assets are missing from the ${location}: ${frameworkRoot}. ` +
        "Rebuild or reinstall Skill OS before applying a workflow."
    );
  }

  return { frameworkRoot, templateRoot, templatesRoot, packagePath };
}
