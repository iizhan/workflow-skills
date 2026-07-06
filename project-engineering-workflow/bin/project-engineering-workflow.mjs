#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const templateRoot = join(rootDir, "assets", "template-root");

const requiredPaths = [
  "AGENTS.md",
  ".agents/skills/project-requirement-gate/SKILL.md",
  ".agents/skills/project-codebase-onboarding/SKILL.md",
  ".agents/skills/project-scope-impact-guard/SKILL.md",
  ".agents/skills/project-tech-solution/SKILL.md",
  ".agents/skills/project-superpowers-router/SKILL.md",
  ".agents/skills/project-gsd-router/SKILL.md",
  ".agents/skills/project-gstack-router/SKILL.md",
  ".agents/skills/project-stack-standards/SKILL.md",
  ".agents/skills/project-code-generation/SKILL.md",
  ".agents/skills/project-code-review/SKILL.md",
  ".agents/skills/project-test-and-report/SKILL.md",
  ".agents/skills/project-dev-core/SKILL.md",
  ".agents/skills/project-frontend-standards/SKILL.md",
  ".agents/skills/project-frontend-js/SKILL.md",
  ".agents/skills/project-frontend-react/SKILL.md",
  ".agents/skills/project-frontend-vue/SKILL.md",
  ".agents/skills/project-frontend-css/SKILL.md",
  ".agents/skills/project-security-review/SKILL.md",
  ".agents/skills/project-verification-loop/SKILL.md",
  ".agents/skills/project-session-summary/SKILL.md",
  ".agents/skills/project-skill-upgrade-advisor/SKILL.md",
  ".specify/memory/constitution.md",
  ".specify/memory/session-history.md",
  ".specify/memory/skill-upgrade-backlog.md",
  ".specify/templates/spec-template.md",
  ".specify/templates/plan-template.md",
  ".specify/templates/tasks-template.md",
  ".specify/templates/quickstart-template.md",
  ".specify/templates/workflow-state-template.yaml",
  ".specify/templates/checklist-template.md",
  ".specify/scripts/bash/create-feature.sh",
  ".specify/scripts/bash/validate-workflow.sh",
  "docs/Codex团队开发说明.md",
  "docs/ClaudeCode团队开发说明.md",
  "docs/AI协作架构.md",
  "specs"
];

function usage() {
  console.log(`Usage:
  project-engineering-workflow init \\
    --project-name "CRM Platform" \\
    --project-slug "crm-platform" \\
    --stack-name "Next.js + NestJS" \\
    --app-path "apps/web" \\
    --test-command "pnpm test" \\
    --output-dir "/absolute/path/to/target-repo" \\
    [--env-output "apps/web/.env.local"]

  project-engineering-workflow doctor --output-dir "/absolute/path/to/target-repo"

Aliases:
  pew init ...
  pew doctor ...
`);
}

function parseArgs(argv) {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    return { command: "help", options: { help: true } };
  }

  const command = argv[0] ?? "help";
  const options = {};

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    options[key] = value;
    i += 1;
  }

  return { command, options };
}

function copyRecursive(source, target) {
  const sourceStat = statSync(source);
  if (sourceStat.isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source)) {
      copyRecursive(join(source, entry), join(target, entry));
    }
    return;
  }

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

function replacePlaceholders(targetDir, mapping) {
  for (const path of walkFiles(targetDir)) {
    let text;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      continue;
    }

    let updated = text;
    for (const [oldValue, newValue] of Object.entries(mapping)) {
      updated = updated.split(oldValue).join(newValue);
    }

    if (updated !== text) {
      writeFileSync(path, updated, "utf8");
    }
  }
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const entryStat = statSync(path);
    if (entryStat.isDirectory()) {
      yield* walkFiles(path);
    } else if (entryStat.isFile()) {
      yield path;
    }
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function requireOptions(options, names) {
  const missing = names.filter((name) => !options[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.map((name) => `--${name}`).join(", ")}`);
  }
}

function init(options) {
  requireOptions(options, ["project-name", "project-slug", "stack-name", "app-path", "test-command", "output-dir"]);

  const outputDir = resolve(options["output-dir"]);
  mkdirSync(outputDir, { recursive: true });
  copyRecursive(templateRoot, outputDir);

  replacePlaceholders(outputDir, {
    "__PROJECT_NAME__": options["project-name"],
    "__PROJECT_SLUG__": options["project-slug"],
    "__STACK_NAME__": options["stack-name"],
    "__APP_PATH__": options["app-path"],
    "__ENV_OUTPUT__": options["env-output"] ?? "(none)",
    "__TEST_COMMAND__": options["test-command"],
    "__DATE__": today()
  });

  console.log(`Bootstrap complete.

Target: ${outputDir}

Next steps:
1. Review ${join(outputDir, "AGENTS.md")}
2. Review ${join(outputDir, ".agents/skills/project-stack-standards/SKILL.md")}
3. Review ${join(outputDir, ".specify/memory/constitution.md")}
4. Review ${join(outputDir, "docs/Codex团队开发说明.md")}
5. Review ${join(outputDir, "docs/ClaudeCode团队开发说明.md")}
6. Review ${join(outputDir, ".specify/memory/session-history.md")}
7. Review ${join(outputDir, ".specify/memory/skill-upgrade-backlog.md")}
8. Run: project-engineering-workflow doctor --output-dir "${outputDir}"`);
}

function doctor(options) {
  const outputDir = resolve(options["output-dir"] ?? options._ ?? "");
  if (!outputDir) {
    throw new Error("Missing required option: --output-dir");
  }

  const missing = requiredPaths.filter((path) => !existsSync(join(outputDir, path)));
  if (missing.length > 0) {
    for (const path of missing) {
      console.error(`Missing: ${path}`);
    }
    throw new Error("Doctor failed. Add the missing files and rerun.");
  }

  console.log("Doctor passed.");
  console.log("The project engineering workflow starter looks complete.");
}

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (options.help || command === "help") {
    usage();
  } else if (command === "init") {
    init(options);
  } else if (command === "doctor") {
    doctor(options);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  console.error("");
  usage();
  process.exit(1);
}
