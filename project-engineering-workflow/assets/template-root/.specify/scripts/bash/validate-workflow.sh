#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
current_version_marker=".specify/workflow-version.txt"

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
  ".specify/scripts/bash/create-feature.sh"
  ".specify/scripts/bash/validate-workflow.sh"
  "docs/Codex团队开发说明.md"
  "docs/AI协作架构.md"
  "specs"
)

v020_optional_paths=(
  ".agents/skills/project-memory-router/SKILL.md"
  ".agents/skills/project-evolution-router/SKILL.md"
  ".specify/memory/memory-policy.md"
  ".specify/memory/evolution-policy.md"
  ".specify/memory/evolution-prefill-policy.md"
  ".specify/memory/evolution-draft-protocol.md"
  ".specify/memory/reflection-output-protocol.md"
  ".specify/memory/final-output-protocol.md"
  ".specify/memory-store/README.md"
  ".specify/memory-store/schema-version.json"
  ".specify/memory-store/index.json"
  ".specify/memory-store/memory-record.schema.json"
  ".specify/memory-store/memory-index.schema.json"
  ".specify/templates/delivery-summary-template.md"
  ".specify/templates/reflection-template.md"
  ".specify/templates/rule-change-template.md"
  "docs/升级兼容策略.md"
  "docs/AI能力地图.md"
)

v030_optional_paths=(
  "${v020_optional_paths[@]}"
  ".agents/skills/project-branch-release/SKILL.md"
  ".specify/release/release-policy.md"
  ".specify/scripts/bash/create-feature-branch.sh"
  ".specify/scripts/bash/prepare-release.sh"
  ".specify/scripts/bash/finalize-release.sh"
  ".specify/templates/release-checklist-template.md"
  ".specify/templates/release-notes-template.md"
)

missing=0
declared_workflow_version=""

if [[ -e "$ROOT_DIR/$current_version_marker" ]]; then
  declared_workflow_version="$(tr -d '[:space:]' < "$ROOT_DIR/$current_version_marker")"
fi

for rel in "${required_paths[@]}"; do
  if [[ ! -e "$ROOT_DIR/$rel" ]]; then
    echo "Missing: $rel"
    missing=1
  fi
done

version_required_paths=()
case "$declared_workflow_version" in
  0.2.0|0.2.1)
    version_required_paths=("${v020_optional_paths[@]}")
    ;;
  0.3.0)
    version_required_paths=("${v030_optional_paths[@]}")
    ;;
  *)
    if [[ -n "$declared_workflow_version" ]]; then
      version_required_paths=("${v030_optional_paths[@]}")
    fi
    ;;
esac

for rel in "${version_required_paths[@]}"; do
  if [[ ! -e "$ROOT_DIR/$rel" ]]; then
    echo "Missing version-scoped file: $rel"
    missing=1
  fi
done

if [[ $missing -ne 0 ]]; then
  echo "Workflow validation failed."
  exit 1
fi

echo "Workflow validation passed."
