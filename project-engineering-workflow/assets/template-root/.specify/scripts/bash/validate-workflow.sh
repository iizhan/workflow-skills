#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

required_paths=(
  "AGENTS.md"
  ".agents/skills/project-requirement-gate/SKILL.md"
  ".agents/skills/project-codebase-onboarding/SKILL.md"
  ".agents/skills/project-scope-impact-guard/SKILL.md"
  ".agents/skills/project-tech-solution/SKILL.md"
  ".agents/skills/project-superpowers-router/SKILL.md"
  ".agents/skills/project-gsd-router/SKILL.md"
  ".agents/skills/project-gstack-router/SKILL.md"
  ".agents/skills/project-stack-standards/SKILL.md"
  ".agents/skills/project-code-generation/SKILL.md"
  ".agents/skills/project-code-review/SKILL.md"
  ".agents/skills/project-test-and-report/SKILL.md"
  ".specify/memory/constitution.md"
  ".specify/templates/spec-template.md"
  ".specify/templates/plan-template.md"
  ".specify/templates/tasks-template.md"
  ".specify/templates/quickstart-template.md"
  ".specify/templates/workflow-state-template.yaml"
  ".specify/templates/checklist-template.md"
  "docs/Codex团队开发说明.md"
  "docs/AI协作架构.md"
)

missing=0

for rel in "${required_paths[@]}"; do
  if [[ ! -e "$ROOT_DIR/$rel" ]]; then
    echo "Missing: $rel"
    missing=1
  fi
done

if [[ $missing -ne 0 ]]; then
  echo "Workflow validation failed."
  exit 1
fi

echo "Workflow validation passed."
