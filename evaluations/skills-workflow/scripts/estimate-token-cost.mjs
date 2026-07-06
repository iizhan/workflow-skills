#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const templateRoot = join(root, "project-engineering-workflow/assets/template-root");

function walk(dir, matcher, files = []) {
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

const skillFiles = walk(
  join(templateRoot, ".agents/skills"),
  (filePath) => filePath.endsWith("/SKILL.md")
);

const docsAndReferences = [
  ...walk(join(templateRoot, "docs"), (filePath) => filePath.endsWith(".md")),
  ...walk(join(root, "project-engineering-workflow/references"), (filePath) => filePath.endsWith(".md"))
];

const skillSummaries = skillFiles.map(summarizeFile).sort((a, b) => b.estimated_tokens - a.estimated_tokens);
const docSummaries = docsAndReferences.map(summarizeFile).sort((a, b) => b.estimated_tokens - a.estimated_tokens);

function total(items) {
  return items.reduce((sum, item) => sum + item.estimated_tokens, 0);
}

const report = {
  note: "Static estimate only. Use provider usage metadata for real A/B token accounting.",
  generated_at: new Date().toISOString(),
  skill_files: {
    count: skillSummaries.length,
    estimated_tokens: total(skillSummaries),
    top_10: skillSummaries.slice(0, 10)
  },
  docs_and_references: {
    count: docSummaries.length,
    estimated_tokens: total(docSummaries),
    top_10: docSummaries.slice(0, 10)
  }
};

console.log(JSON.stringify(report, null, 2));
