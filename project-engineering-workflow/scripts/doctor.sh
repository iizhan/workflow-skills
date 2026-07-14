#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"

if [[ -z "$TARGET_DIR" ]]; then
  echo "Usage: bash scripts/doctor.sh /absolute/path/to/target-repo" >&2
  exit 1
fi

core_required_paths=(
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
  ".agents/skills/project-dev-core/SKILL.md"
  ".agents/skills/project-frontend-standards/SKILL.md"
  ".agents/skills/project-frontend-js/SKILL.md"
  ".agents/skills/project-frontend-react/SKILL.md"
  ".agents/skills/project-frontend-vue/SKILL.md"
  ".agents/skills/project-frontend-css/SKILL.md"
  ".agents/skills/project-security-review/SKILL.md"
  ".agents/skills/project-verification-loop/SKILL.md"
  ".agents/skills/project-session-summary/SKILL.md"
  ".agents/skills/project-skill-upgrade-advisor/SKILL.md"
  ".specify/memory/constitution.md"
  ".specify/memory/session-history.md"
  ".specify/memory/skill-upgrade-backlog.md"
  ".specify/templates/spec-template.md"
  ".specify/templates/plan-template.md"
  ".specify/templates/tasks-template.md"
  ".specify/templates/quickstart-template.md"
  ".specify/templates/workflow-state-template.yaml"
  ".specify/templates/checklist-template.md"
  ".specify/scripts/bash/create-feature.sh"
  ".specify/scripts/bash/validate-workflow.sh"
  "docs/Codex团队开发说明.md"
  "docs/ClaudeCode团队开发说明.md"
  "docs/AI协作架构.md"
  "specs"
)

current_version_marker=".specify/workflow-version.txt"
current_template_workflow_version="$(cat "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/assets/template-root/$current_version_marker")"

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

branch_release_optional_paths=(
  ".agents/skills/project-branch-release/SKILL.md"
  ".specify/release/release-policy.md"
  ".specify/scripts/bash/create-feature-branch.sh"
  ".specify/scripts/bash/prepare-release.sh"
  ".specify/scripts/bash/finalize-release.sh"
  ".specify/scripts/bash/release-doctor.sh"
  ".specify/templates/release-checklist-template.md"
  ".specify/templates/release-notes-template.md"
)

v040_progressive_reference_paths=(
  ".agents/skills/project-memory-router/references/memory-governance.md"
  ".agents/skills/project-memory-router/references/memory-data-roles.md"
  ".agents/skills/project-memory-router/references/memory-retention-retrieval.md"
  ".agents/skills/project-memory-router/references/memory-conflict-session.md"
  ".agents/skills/project-evolution-router/references/evolution-governance.md"
  ".agents/skills/project-superpowers-router/references/ui-automation-contract.md"
  ".agents/skills/project-superpowers-router/references/implementation-contract.md"
  ".agents/skills/project-superpowers-router/references/review-contract.md"
)

upgrade_optional_paths=("${v020_optional_paths[@]}" "${branch_release_optional_paths[@]}" "${v040_progressive_reference_paths[@]}")

declared_workflow_version=""
if [[ -e "$TARGET_DIR/$current_version_marker" ]]; then
  declared_workflow_version="$(tr -d '[:space:]' < "$TARGET_DIR/$current_version_marker")"
fi

current_required_optional_paths=()
if [[ -n "$declared_workflow_version" ]]; then
  case "$declared_workflow_version" in
    0.2.0|0.2.1)
      current_required_optional_paths=("${v020_optional_paths[@]}")
      ;;
    0.3.0|0.3.1)
      current_required_optional_paths=("${v020_optional_paths[@]}" "${branch_release_optional_paths[@]}")
      ;;
    0.4.0)
      current_required_optional_paths=("${upgrade_optional_paths[@]}")
      ;;
    *)
      current_required_optional_paths=("${upgrade_optional_paths[@]}")
      ;;
  esac
fi

missing=0
optional_missing=()
current_missing=()
contract_issues=()

check_snippet() {
  local rel="$1"
  local snippet="$2"
  local label="$3"

  if [[ -e "$TARGET_DIR/$rel" ]] && ! grep -Fq "$snippet" "$TARGET_DIR/$rel"; then
    contract_issues+=("$rel missing \"$snippet\" ($label)")
  fi
}

version_at_least() {
  local version="$1"
  local minimum="$2"
  local version_major version_minor version_patch minimum_major minimum_minor minimum_patch
  IFS=. read -r version_major version_minor version_patch <<< "$version"
  IFS=. read -r minimum_major minimum_minor minimum_patch <<< "$minimum"
  version_major="${version_major:-0}"
  version_minor="${version_minor:-0}"
  version_patch="${version_patch:-0}"
  minimum_major="${minimum_major:-0}"
  minimum_minor="${minimum_minor:-0}"
  minimum_patch="${minimum_patch:-0}"

  (( version_major > minimum_major )) ||
    (( version_major == minimum_major && version_minor > minimum_minor )) ||
    (( version_major == minimum_major && version_minor == minimum_minor && version_patch >= minimum_patch ))
}

for rel in "${core_required_paths[@]}"; do
  if [[ ! -e "$TARGET_DIR/$rel" ]]; then
    echo "Missing: $rel"
    missing=1
  fi
done

for rel in "${upgrade_optional_paths[@]}"; do
  if [[ ! -e "$TARGET_DIR/$rel" ]]; then
    optional_missing+=("$rel")
  fi
done

if [[ $missing -ne 0 ]]; then
  echo
  echo "Doctor failed. Add the missing files and rerun."
  exit 1
fi

if [[ -n "$declared_workflow_version" ]]; then
  for rel in "${current_required_optional_paths[@]}"; do
    if [[ ! -e "$TARGET_DIR/$rel" ]]; then
      current_missing+=("$rel")
    fi
  done

  if [[ ${#current_missing[@]} -gt 0 ]]; then
    echo "Doctor failed."
    echo "This project appears to use workflow line $declared_workflow_version, but is missing required current-version files:"
    for rel in "${current_missing[@]}"; do
      echo "Missing current file: $rel"
    done
    echo
    echo "Projects without $current_version_marker may adopt newer optional files gradually."
    echo "If this is meant to be a current-version project, complete the upgrade and rerun doctor."
    exit 1
  fi
fi

if [[ -n "$declared_workflow_version" ]]; then
  check_snippet ".agents/skills/project-test-and-report/SKILL.md" "UI / Interaction Reporting Rules" "Test report UI verification contract"
  check_snippet ".agents/skills/project-test-and-report/SKILL.md" "界面/交互验证" "Chinese UI verification report field"
  check_snippet "AGENTS.md" "Do not mark a UI path as fully verified" "AGENTS visible-interface verification rule"
  check_snippet ".specify/templates/delivery-summary-template.md" "截图或 UI 报告" "Delivery summary UI evidence field"
  check_snippet ".specify/memory/memory-policy.md" "Data Role Classification" "Memory data role policy"
  check_snippet ".specify/memory/memory-policy.md" "account_reference" "Memory account reference role"
  check_snippet ".specify/memory-store/memory-record.schema.json" "\"data_role\"" "Memory record data_role schema"

  if version_at_least "$declared_workflow_version" "0.4.0"; then
    check_snippet ".agents/skills/project-superpowers-router/SKILL.md" "references/ui-automation-contract.md" "Superpowers router progressive disclosure link"
    check_snippet ".agents/skills/project-superpowers-router/SKILL.md" "references/implementation-contract.md" "Superpowers router implementation progressive disclosure link"
    check_snippet ".agents/skills/project-superpowers-router/SKILL.md" "references/review-contract.md" "Superpowers router review progressive disclosure link"
    check_snippet ".agents/skills/project-superpowers-router/SKILL.md" "Keep this file as the routing entry only" "Superpowers router narrow entry path"
    check_snippet ".agents/skills/project-superpowers-router/references/ui-automation-contract.md" "UI Automation Contract" "Superpowers router UI contract"
    check_snippet ".agents/skills/project-superpowers-router/references/ui-automation-contract.md" "problem collection" "Superpowers router repair loop"
    check_snippet ".agents/skills/project-superpowers-router/references/ui-automation-contract.md" "Do not report a full UI pass from static checks alone" "Superpowers router blocked-automation rule"
    check_snippet ".agents/skills/project-superpowers-router/references/implementation-contract.md" "Implementation Contract" "Superpowers router implementation contract"
    check_snippet ".agents/skills/project-superpowers-router/references/implementation-contract.md" "Keep implementation separate from review" "Superpowers implementation/review split"
    check_snippet ".agents/skills/project-superpowers-router/references/review-contract.md" "Review Contract" "Superpowers router review contract"
    check_snippet ".agents/skills/project-superpowers-router/references/review-contract.md" 'accepted` means the direction is approved' "Superpowers proposal closure semantics"
    check_snippet ".agents/skills/project-memory-router/SKILL.md" "references/memory-governance.md" "Memory router progressive disclosure link"
    check_snippet ".agents/skills/project-memory-router/SKILL.md" "references/memory-data-roles.md" "Memory router data roles progressive disclosure link"
    check_snippet ".agents/skills/project-memory-router/SKILL.md" "references/memory-retention-retrieval.md" "Memory router retention progressive disclosure link"
    check_snippet ".agents/skills/project-memory-router/SKILL.md" "references/memory-conflict-session.md" "Memory router conflict progressive disclosure link"
    check_snippet ".agents/skills/project-memory-router/references/memory-governance.md" "Do not read every memory reference by default" "Memory router scoped reference map"
    check_snippet ".agents/skills/project-memory-router/references/memory-data-roles.md" "Data Role Decision" "Memory router data role decision"
    check_snippet ".agents/skills/project-memory-router/references/memory-data-roles.md" "blocked_sensitive" "Memory blocked sensitive role"
    check_snippet ".agents/skills/project-memory-router/references/memory-retention-retrieval.md" "Retrieval Modes" "Memory router retrieval modes"
    check_snippet ".agents/skills/project-memory-router/references/memory-conflict-session.md" "Conflict Rules" "Memory router conflict rules"
    check_snippet ".agents/skills/project-requirement-gate/SKILL.md" "Task Lanes" "Adaptive task lane contract"
    check_snippet ".agents/skills/project-requirement-gate/SKILL.md" "确认执行" "Versioned requirement confirmation options"
    check_snippet ".agents/skills/project-scope-impact-guard/SKILL.md" "Impact Levels" "Impact level contract"
    check_snippet ".agents/skills/project-scope-impact-guard/SKILL.md" "明确不影响" "Explicit non-impact boundary"
    check_snippet ".agents/skills/project-verification-loop/SKILL.md" "Traceability" "Impact-to-evidence traceability"
    check_snippet ".agents/skills/project-test-and-report/SKILL.md" "awaiting_user_acceptance" "User acceptance delivery state"
    check_snippet ".specify/templates/workflow-state-template.yaml" "confirmation_gates:" "Workflow confirmation state"
    check_snippet ".specify/templates/workflow-state-template.yaml" "impact_assessment:" "Workflow impact state"
    check_snippet ".specify/templates/delivery-summary-template.md" "事项与影响证据矩阵" "Delivery evidence matrix"
  else
    check_snippet ".agents/skills/project-superpowers-router/SKILL.md" "Frontend / UI Interaction Contract" "Legacy superpowers router UI contract"
    check_snippet ".agents/skills/project-superpowers-router/SKILL.md" "problem collection" "Legacy superpowers router repair loop"
    check_snippet ".agents/skills/project-superpowers-router/SKILL.md" "Do not report a full UI pass from static checks alone" "Legacy superpowers blocked-automation rule"
    check_snippet ".agents/skills/project-memory-router/SKILL.md" "Data Role Decision" "Legacy memory router data role decision"
    check_snippet ".agents/skills/project-memory-router/SKILL.md" "blocked_sensitive" "Legacy memory blocked sensitive role"
  fi

  if [[ ${#contract_issues[@]} -gt 0 ]]; then
    echo "Doctor failed."
    echo "This project declares workflow line $declared_workflow_version, but key workflow contract snippets are missing:"
    for issue in "${contract_issues[@]}"; do
      echo "Contract drift: $issue"
    done
    echo
    echo "Restore the missing snippets through a planned upgrade or manual template sync, then rerun doctor."
    exit 1
  fi
fi

if [[ ${#optional_missing[@]} -gt 0 ]]; then
  echo "Doctor passed with upgrade suggestions."
  echo "The project is compatible with the workflow baseline, but is missing optional newer workflow files:"
  for rel in "${optional_missing[@]}"; do
    echo "Upgrade available: $rel"
  done
  echo
  echo "Keep existing artifacts unchanged by default. Adopt these files only through a planned upgrade."
  exit 0
fi

echo "Doctor passed."
echo "The project engineering workflow starter looks complete."
