#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const templateRoot = join(root, "project-engineering-workflow/assets/template-root");
const enforce = process.argv.includes("--enforce");

const budgets = {
  defaultSkill: 700,
  routerSkill: 900,
  ordinaryDevTarget: 1500,
  ordinaryDevWarn: 2500,
  ordinaryDevFail: 3500,
  bundleWarn: 3500,
  bundleFail: 5000
};

const bundles = {
  "fast-task": [
    "project-requirement-gate",
    "project-dev-core",
    "project-code-generation",
    "project-code-review",
    "project-test-and-report"
  ],
  "ordinary-dev": [
    "project-requirement-gate",
    "project-codebase-onboarding",
    "project-scope-impact-guard",
    "project-dev-core",
    "project-stack-standards",
    "project-code-generation",
    "project-code-review",
    "project-test-and-report"
  ],
  frontend: [
    "project-requirement-gate",
    "project-codebase-onboarding",
    "project-scope-impact-guard",
    "project-dev-core",
    "project-stack-standards",
    "project-frontend-standards",
    "project-frontend-react",
    "project-frontend-css",
    "project-code-generation",
    "project-code-review",
    "project-verification-loop",
    "project-test-and-report"
  ],
  security: [
    "project-requirement-gate",
    "project-codebase-onboarding",
    "project-scope-impact-guard",
    "project-dev-core",
    "project-stack-standards",
    "project-security-review",
    "project-code-generation",
    "project-code-review",
    "project-verification-loop",
    "project-test-and-report"
  ],
  memory: [
    "project-memory-router",
    "project-session-summary"
  ],
  evolution: [
    "project-evolution-router",
    "project-skill-upgrade-advisor"
  ],
  "enhanced-ui": [
    "project-superpowers-router",
    "project-frontend-standards",
    "project-code-review",
    "project-verification-loop",
    "project-test-and-report"
  ]
};

function walk(dir, matcher, files = []) {
  if (!existsSync(dir)) {
    return files;
  }
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, matcher, files);
    } else if (matcher(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function estimateTokens(text) {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const nonCjk = text.replace(/[\u3400-\u9fff]/g, "");
  const asciiish = Math.ceil(nonCjk.length / 4);
  return cjk + asciiish;
}

function summarizeFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  return {
    file: relative(root, filePath),
    chars: text.length,
    estimated_tokens: estimateTokens(text)
  };
}

function skillNameFromPath(filePath) {
  return filePath.split("/.agents/skills/")[1]?.split("/")[0] || "";
}

function budgetForSkill(name) {
  return name.endsWith("-router") ? budgets.routerSkill : budgets.defaultSkill;
}

function statusFromThresholds(value, warn, fail) {
  if (value >= fail) return "fail";
  if (value >= warn) return "warn";
  return "pass";
}

const skillsRoot = join(templateRoot, ".agents/skills");
const skillFiles = walk(skillsRoot, (filePath) => filePath.endsWith("/SKILL.md"));
const skillReferenceFiles = walk(skillsRoot, (filePath) => filePath.includes("/references/") && filePath.endsWith(".md"));

const docsAndReferences = [
  ...walk(join(templateRoot, "docs"), (filePath) => filePath.endsWith(".md")),
  ...walk(join(root, "project-engineering-workflow/references"), (filePath) => filePath.endsWith(".md"))
];

const skillSummaries = skillFiles
  .map((filePath) => ({ name: skillNameFromPath(filePath), ...summarizeFile(filePath) }))
  .sort((a, b) => b.estimated_tokens - a.estimated_tokens);

const skillReferenceSummaries = skillReferenceFiles
  .map((filePath) => ({ skill: skillNameFromPath(filePath), ...summarizeFile(filePath) }))
  .sort((a, b) => b.estimated_tokens - a.estimated_tokens);

const docSummaries = docsAndReferences.map(summarizeFile).sort((a, b) => b.estimated_tokens - a.estimated_tokens);
const skillByName = new Map(skillSummaries.map((summary) => [summary.name, summary]));

function total(items) {
  return items.reduce((sum, item) => sum + item.estimated_tokens, 0);
}

function buildBudgetReport() {
  const warnings = [];
  const failures = [];

  const skillBudgets = skillSummaries.map((skill) => {
    const budget = budgetForSkill(skill.name);
    const status = skill.estimated_tokens > budget ? "warn" : "pass";
    const item = {
      name: skill.name,
      estimated_tokens: skill.estimated_tokens,
      budget,
      status
    };
    if (status === "warn") {
      warnings.push(`${skill.name} estimated ${skill.estimated_tokens} tokens exceeds budget ${budget}`);
    }
    return item;
  });

  const bundleReports = Object.entries(bundles).map(([name, skillNames]) => {
    const missing = skillNames.filter((skillName) => !skillByName.has(skillName));
    const estimatedTokens = skillNames.reduce((sum, skillName) => sum + (skillByName.get(skillName)?.estimated_tokens || 0), 0);
    const isOrdinary = name === "fast-task" || name === "ordinary-dev";
    const warn = isOrdinary ? budgets.ordinaryDevWarn : budgets.bundleWarn;
    const fail = isOrdinary ? budgets.ordinaryDevFail : budgets.bundleFail;
    const status = statusFromThresholds(estimatedTokens, warn, fail);
    const report = {
      name,
      skills: skillNames,
      missing,
      estimated_tokens: estimatedTokens,
      target: isOrdinary ? budgets.ordinaryDevTarget : undefined,
      warn,
      fail,
      status
    };

    if (missing.length) {
      failures.push(`${name} bundle missing skills: ${missing.join(", ")}`);
    }
    if (status === "warn") {
      warnings.push(`${name} bundle estimated ${estimatedTokens} tokens exceeds warn threshold ${warn}`);
    }
    if (status === "fail") {
      failures.push(`${name} bundle estimated ${estimatedTokens} tokens exceeds fail threshold ${fail}`);
    }
    return report;
  });

  return {
    status: failures.length ? "fail" : warnings.length ? "warn" : "pass",
    budgets,
    warnings,
    failures,
    skill_budgets: skillBudgets,
    bundles: bundleReports
  };
}

const budgetReport = buildBudgetReport();
const report = {
  note: "Static estimate only. Use provider usage metadata for real A/B token accounting. References are counted separately because progressive disclosure should load them only when needed.",
  generated_at: new Date().toISOString(),
  status: budgetReport.status,
  skill_files: {
    count: skillSummaries.length,
    estimated_tokens: total(skillSummaries),
    top_10: skillSummaries.slice(0, 10)
  },
  skill_references: {
    count: skillReferenceSummaries.length,
    estimated_tokens: total(skillReferenceSummaries),
    top_10: skillReferenceSummaries.slice(0, 10)
  },
  docs_and_references: {
    count: docSummaries.length,
    estimated_tokens: total(docSummaries),
    top_10: docSummaries.slice(0, 10)
  },
  budget_report: budgetReport
};

console.log(JSON.stringify(report, null, 2));

if (enforce && budgetReport.status === "fail") {
  process.exit(1);
}
