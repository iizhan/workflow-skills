#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDir, "../../..");
const defaultCasesPath = resolve(repositoryRoot, "evaluations/skills-workflow/cases/task-requirement-quality.json");
const defaultWorkflowRoot = resolve(repositoryRoot, "project-engineering-workflow");

function parseArgs(argv) {
  const options = {
    workflowRoot: defaultWorkflowRoot,
    baselineRoot: null,
    casesPath: defaultCasesPath,
    label: "candidate",
    baselineLabel: "baseline",
    json: false,
    enforce: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--enforce") {
      options.enforce = true;
    } else if (arg === "--workflow-root") {
      options.workflowRoot = resolve(argv[++index]);
    } else if (arg === "--baseline-root") {
      options.baselineRoot = resolve(argv[++index]);
    } else if (arg === "--cases") {
      options.casesPath = resolve(argv[++index]);
    } else if (arg === "--label") {
      options.label = argv[++index];
    } else if (arg === "--baseline-label") {
      options.baselineLabel = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function band(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  return "D";
}

function evaluateWorkflow(workflowRoot, label, suite) {
  const sourceCache = new Map();
  const dimensionStats = Object.fromEntries(
    Object.entries(suite.dimensions).map(([id, definition]) => [id, { ...definition, passed: 0, total: 0, score: 0 }])
  );

  function source(relativePath) {
    if (sourceCache.has(relativePath)) return sourceCache.get(relativePath);
    const absolutePath = resolve(workflowRoot, relativePath);
    const value = existsSync(absolutePath)
      ? { relativePath, absolutePath, exists: true, text: readFileSync(absolutePath, "utf8") }
      : { relativePath, absolutePath, exists: false, text: "" };
    sourceCache.set(relativePath, value);
    return value;
  }

  const cases = suite.cases.map((testCase) => {
    const requirements = testCase.requirements.map((requirement) => {
      if (!dimensionStats[requirement.dimension]) {
        throw new Error(`Unknown dimension '${requirement.dimension}' in ${testCase.id}/${requirement.id}`);
      }

      const sources = requirement.files.map(source);
      const combined = sources.map((item) => item.text).join("\n");
      const normalizedCombined = combined.toLocaleLowerCase("en-US");
      const missingFiles = sources.filter((item) => !item.exists).map((item) => item.relativePath);
      const missingTerms = (requirement.allOf ?? []).filter((term) => !normalizedCombined.includes(term.toLocaleLowerCase("en-US")));
      const matchedAny = !requirement.anyOf || requirement.anyOf.some((term) => normalizedCombined.includes(term.toLocaleLowerCase("en-US")));
      const passed = missingFiles.length === 0 && missingTerms.length === 0 && matchedAny;
      const stats = dimensionStats[requirement.dimension];
      stats.total += 1;
      if (passed) stats.passed += 1;

      return {
        id: requirement.id,
        dimension: requirement.dimension,
        passed,
        missingFiles,
        missingTerms,
        missingAnyOf: matchedAny ? [] : requirement.anyOf
      };
    });

    const passed = requirements.filter((item) => item.passed).length;
    return {
      id: testCase.id,
      title: testCase.title,
      expectedLane: testCase.expectedLane,
      passed,
      total: requirements.length,
      score: Math.round((passed / requirements.length) * 1000) / 10,
      requirements
    };
  });

  let totalScore = 0;
  for (const stats of Object.values(dimensionStats)) {
    stats.score = stats.total === 0 ? 0 : Math.round((stats.passed / stats.total) * stats.maxScore * 10) / 10;
    totalScore += stats.score;
  }
  totalScore = Math.round(totalScore * 10) / 10;

  const failedRequirements = cases.flatMap((testCase) =>
    testCase.requirements
      .filter((requirement) => !requirement.passed)
      .map((requirement) => `${testCase.id}/${requirement.id}`)
  );

  return {
    label,
    workflowRoot,
    evaluationKind: suite.evaluationKind,
    behaviorMeasured: suite.behaviorMeasured,
    score: totalScore,
    band: band(totalScore),
    dimensions: dimensionStats,
    cases,
    failedRequirements
  };
}

function markdownReport(result) {
  const lines = [
    `# Task Requirement Skill Evaluation: ${result.candidate.label}`,
    "",
    `- Contract coverage score: ${result.candidate.score} / 100 (${result.candidate.band})`,
    `- Behavior measured: ${result.candidate.behaviorMeasured ? "yes" : "no"}`
  ];

  if (result.baseline) {
    lines.push(`- Baseline: ${result.baseline.score} / 100 (${result.baseline.band})`);
    lines.push(`- Delta: ${result.delta >= 0 ? "+" : ""}${result.delta}`);
  }

  lines.push("", "## Dimensions", "", "| Dimension | Passed | Score |", "| --- | ---: | ---: |");
  for (const stats of Object.values(result.candidate.dimensions)) {
    lines.push(`| ${stats.label} | ${stats.passed}/${stats.total} | ${stats.score}/${stats.maxScore} |`);
  }

  lines.push("", "## Cases", "", "| Case | Lane | Passed | Score |", "| --- | --- | ---: | ---: |");
  for (const testCase of result.candidate.cases) {
    lines.push(`| ${testCase.title} | ${testCase.expectedLane} | ${testCase.passed}/${testCase.total} | ${testCase.score} |`);
  }

  if (result.candidate.failedRequirements.length > 0) {
    lines.push("", "## Failed Requirements", "", ...result.candidate.failedRequirements.map((item) => `- ${item}`));
  }

  lines.push(
    "",
    "> This score measures whether task requirements are represented by explicit workflow contracts. It does not measure live model adherence or real task outcome quality."
  );
  return `${lines.join("\n")}\n`;
}

const options = parseArgs(process.argv.slice(2));
const suite = loadJson(options.casesPath);
const candidate = evaluateWorkflow(options.workflowRoot, options.label, suite);
const baseline = options.baselineRoot
  ? evaluateWorkflow(options.baselineRoot, options.baselineLabel, suite)
  : null;
const result = {
  suite: options.casesPath,
  generatedAt: new Date().toISOString(),
  candidate,
  baseline,
  delta: baseline ? Math.round((candidate.score - baseline.score) * 10) / 10 : null
};

if (options.json) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write(markdownReport(result));
}

if (options.enforce) {
  const candidateFailed = candidate.failedRequirements.length > 0 || candidate.score < 90;
  const deltaFailed = baseline && result.delta < 10;
  if (candidateFailed || deltaFailed) process.exit(1);
}
