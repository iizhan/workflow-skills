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

v040_optional_paths=(
  "${v030_optional_paths[@]}"
  ".agents/skills/project-memory-router/references/memory-governance.md"
  ".agents/skills/project-memory-router/references/memory-data-roles.md"
  ".agents/skills/project-memory-router/references/memory-retention-retrieval.md"
  ".agents/skills/project-memory-router/references/memory-conflict-session.md"
  ".agents/skills/project-evolution-router/references/evolution-governance.md"
  ".agents/skills/project-superpowers-router/references/ui-automation-contract.md"
  ".agents/skills/project-superpowers-router/references/implementation-contract.md"
  ".agents/skills/project-superpowers-router/references/review-contract.md"
)

v050_optional_paths=(
  "${v040_optional_paths[@]}"
  ".agents/skills/project-backend-standards/SKILL.md"
  ".agents/skills/project-backend-standards/references/architecture-boundaries.md"
  ".agents/skills/project-backend-standards/references/api-contracts.md"
  ".agents/skills/project-backend-standards/references/data-consistency.md"
  ".agents/skills/project-backend-standards/references/runtime-security-observability.md"
  ".agents/skills/project-backend-standards/references/testing-delivery.md"
  ".agents/skills/project-backend-standards/references/java-spring.md"
  ".agents/skills/project-frontend-standards/references/experience-states.md"
  ".agents/skills/project-frontend-standards/references/architecture-data-flow.md"
  ".agents/skills/project-frontend-standards/references/accessibility-responsive-i18n.md"
  ".agents/skills/project-frontend-standards/references/performance-security-observability.md"
  ".agents/skills/project-frontend-standards/references/testing-delivery.md"
)

v060_optional_paths=(
  "${v050_optional_paths[@]}"
  ".agents/skills/project-profile-router/SKILL.md"
  ".agents/skills/project-profile-router/references/profile-freshness.md"
  ".agents/skills/project-profile-router/references/decision-memory.md"
  ".specify/project-profile/gitignore"
  ".specify/project-profile/profile.yaml"
  ".specify/project-profile/architecture.md"
  ".specify/project-profile/decision-memory.yaml"
  ".specify/scripts/project-profile.mjs"
)

v080_workflow_architecture_paths=(
  ".agents/skills/project-workflow-router/SKILL.md"
  ".agents/skills/project-workflow-router/references/workflow-manifest-contract.md"
  ".skill-os/workflow-registry.yaml"
  ".skill-os/workflows/foundation-engineering-governance/workflow.yaml"
  ".skill-os/workflows/role-frontend-engineering/workflow.yaml"
  ".skill-os/workflows/role-backend-engineering/workflow.yaml"
  ".skill-os/workflows/scenario-design-to-frontend/workflow.yaml"
  ".skill-os/workflows/scenario-design-to-api/workflow.yaml"
  ".skill-os/workflows/integration-swagger-to-frontend/workflow.yaml"
)

missing=0
declared_workflow_version=""
contract_issues=()

check_snippet() {
  local rel="$1"
  local snippet="$2"
  local label="$3"

  if [[ -e "$ROOT_DIR/$rel" ]] && ! grep -Fq "$snippet" "$ROOT_DIR/$rel"; then
    contract_issues+=("$rel missing \"$snippet\" ($label)")
  fi
}

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
  0.3.0|0.3.1)
    version_required_paths=("${v030_optional_paths[@]}")
    ;;
  0.4.0)
    version_required_paths=("${v040_optional_paths[@]}")
    ;;
  0.5.0)
    version_required_paths=("${v050_optional_paths[@]}")
    ;;
  0.6.0)
    version_required_paths=("${v060_optional_paths[@]}")
    ;;
  0.7.0)
    version_required_paths=("${v060_optional_paths[@]}" ".specify/templates/design-template.md")
    ;;
  0.8.0)
    version_required_paths=("${v060_optional_paths[@]}" ".specify/templates/design-template.md" "${v080_workflow_architecture_paths[@]}")
    ;;
  *)
    if [[ -n "$declared_workflow_version" ]]; then
      version_required_paths=("${v060_optional_paths[@]}")
    fi
    ;;
esac

for rel in "${version_required_paths[@]}"; do
  if [[ ! -e "$ROOT_DIR/$rel" ]]; then
    echo "Missing version-scoped file: $rel"
    missing=1
  fi
done

if [[ -n "$declared_workflow_version" ]]; then
  check_snippet ".agents/skills/project-test-and-report/SKILL.md" "UI / Interaction Reporting Rules" "Test report UI verification contract"
  check_snippet ".agents/skills/project-test-and-report/SKILL.md" "界面/交互验证" "Chinese UI verification report field"
  check_snippet "AGENTS.md" "Do not mark a UI path as fully verified" "AGENTS visible-interface verification rule"
  check_snippet ".specify/templates/delivery-summary-template.md" "截图或 UI 报告" "Delivery summary UI evidence field"
  check_snippet ".specify/memory/memory-policy.md" "Data Role Classification" "Memory data role policy"
  check_snippet ".specify/memory/memory-policy.md" "account_reference" "Memory account reference role"
  check_snippet ".specify/memory-store/memory-record.schema.json" "\"data_role\"" "Memory record data_role schema"

  case "$declared_workflow_version" in
    0.2.0|0.2.1|0.3.0|0.3.1)
      check_snippet ".agents/skills/project-superpowers-router/SKILL.md" "Frontend / UI Interaction Contract" "Legacy Superpowers router UI contract"
      check_snippet ".agents/skills/project-memory-router/SKILL.md" "Data Role Decision" "Legacy memory router data role decision"
      ;;
    *)
      check_snippet ".agents/skills/project-superpowers-router/SKILL.md" "references/ui-automation-contract.md" "Superpowers progressive disclosure"
      check_snippet ".agents/skills/project-memory-router/SKILL.md" "references/memory-governance.md" "Memory progressive disclosure"
      check_snippet ".agents/skills/project-requirement-gate/SKILL.md" "Task Lanes" "Adaptive task lanes"
      ;;
  esac

  if [[ "$declared_workflow_version" == "0.5.0" || "$declared_workflow_version" == "0.6.0" ]]; then
    check_snippet ".agents/skills/project-backend-standards/SKILL.md" "Adaptive Workflow" "Backend role workflow"
    check_snippet ".agents/skills/project-frontend-standards/SKILL.md" "Adaptive Workflow" "Frontend role workflow"
  fi

  if [[ "$declared_workflow_version" == "0.6.0" ]]; then
    check_snippet ".agents/skills/project-profile-router/SKILL.md" "Project Profile Router" "Project Profile router"
    check_snippet ".specify/project-profile/profile.yaml" "status: pending_analysis" "Project Profile data"
    check_snippet ".specify/project-profile/decision-memory.yaml" "never_reuse_as_approval:" "Decision approval boundary"
    check_snippet ".specify/scripts/project-profile.mjs" "changedEvidence" "Profile evidence fingerprint"
    check_snippet ".specify/templates/workflow-state-template.yaml" "project_profile:" "Profile workflow state"
  fi

  if [[ "$declared_workflow_version" == "0.8.0" ]]; then
    check_snippet "AGENTS.md" '$project-workflow-router' "Workflow router entry"
    check_snippet "AGENTS.md" "select at most one primary scenario" "Primary Workflow boundary"
    check_snippet ".agents/skills/project-workflow-router/SKILL.md" "Loop Engineering Boundary" "Loop boundary"
    check_snippet ".agents/skills/project-workflow-router/references/workflow-manifest-contract.md" "Scenario Loop Run" "Loop declaration contract"
    check_snippet ".skill-os/workflow-registry.yaml" "legacy_declarations: \"read_only\"" "Legacy declaration safety"
    check_snippet ".skill-os/workflows/scenario-design-to-frontend/workflow.yaml" "max_iterations: 3" "Bounded frontend Loop"
    check_snippet ".skill-os/workflows/scenario-design-to-api/workflow.yaml" "on_scope_change: \"require_reconfirmation\"" "API scope confirmation"
    check_snippet ".skill-os/workflows/integration-swagger-to-frontend/workflow.yaml" "on_budget_exhausted: \"needs_user_decision\"" "Integration budget stop"
  fi
fi

if [[ ${#contract_issues[@]} -gt 0 ]]; then
  for issue in "${contract_issues[@]}"; do
    echo "Contract drift: $issue"
    missing=1
  done
fi

if [[ $missing -ne 0 ]]; then
  echo "Workflow validation failed."
  exit 1
fi

echo "Workflow validation passed."
