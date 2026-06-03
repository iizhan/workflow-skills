#!/usr/bin/env bash
set -euo pipefail

FEATURE_SLUG="${1:-}"
FEATURE_NAME="${2:-}"
ORIGINAL_REQUEST="${3:-}"

if [[ -z "$FEATURE_SLUG" || -z "$FEATURE_NAME" ]]; then
  echo "Usage: bash .specify/scripts/bash/create-feature.sh <feature-slug> \"<Feature Name>\" [original request]" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for feature rendering." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEMPLATE_DIR="$ROOT_DIR/.specify/templates"
MEMORY_DIR="$ROOT_DIR/.specify/memory"
FEATURE_DIR="$ROOT_DIR/specs/$FEATURE_SLUG"
DATE_VALUE="$(date +%F)"
BRANCH_CREATED=0

if command -v git >/dev/null 2>&1 && git -C "$ROOT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
  if [[ "${CREATE_FEATURE_BRANCH:-1}" == "1" ]]; then
    TARGET_BRANCH="feature/$FEATURE_SLUG"
    CURRENT_BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
    BRANCH_SCRIPT="$ROOT_DIR/.specify/scripts/bash/create-feature-branch.sh"
    BASE_BRANCH="${FEATURE_BASE_BRANCH:-main}"
    REMOTE_NAME="${FEATURE_REMOTE_NAME:-origin}"

    if [[ "$CURRENT_BRANCH" != "$TARGET_BRANCH" && -f "$BRANCH_SCRIPT" ]]; then
      if git -C "$ROOT_DIR" rev-parse --verify "$TARGET_BRANCH" >/dev/null 2>&1; then
        echo "Feature branch already exists: $TARGET_BRANCH" >&2
        echo "Checkout the branch manually or rerun with CREATE_FEATURE_BRANCH=0 if you only want specs artifacts." >&2
        exit 1
      fi

      bash "$BRANCH_SCRIPT" "$FEATURE_SLUG" "$BASE_BRANCH" "$REMOTE_NAME"
      BRANCH_CREATED=1
    fi
  fi
fi

mkdir -p "$FEATURE_DIR/checklists"

export FEATURE_SLUG
export FEATURE_NAME
export ORIGINAL_REQUEST
export DATE_VALUE
export FEATURE_DIR
export TEMPLATE_DIR
export MEMORY_DIR

python3 <<'PY'
import os
from pathlib import Path

feature_slug = os.environ["FEATURE_SLUG"]
feature_name = os.environ["FEATURE_NAME"]
original_request = os.environ.get("ORIGINAL_REQUEST", "")
date_value = os.environ["DATE_VALUE"]
feature_dir = Path(os.environ["FEATURE_DIR"])
template_dir = Path(os.environ["TEMPLATE_DIR"])
memory_dir = Path(os.environ["MEMORY_DIR"])

core_targets = {
    "spec-template.md": "spec.md",
    "plan-template.md": "plan.md",
    "tasks-template.md": "tasks.md",
    "quickstart-template.md": "quickstart.md",
    "workflow-state-template.yaml": "workflow-state.yaml",
    "checklist-template.md": "checklists/delivery.md",
}

optional_targets = {
    "delivery-summary-template.md": "delivery-summary.md",
    "reflection-template.md": "task-reflection.md",
    "rule-change-template.md": "rule-change-proposal.md",
}

mapping = {
    "[FEATURE NAME]": feature_name,
    "[FEATURE SLUG]": feature_slug,
    "[DATE]": date_value,
    "[ORIGINAL REQUEST]": original_request or "待补充",
}

for source_name, target_name in core_targets.items():
    source = template_dir / source_name
    target = feature_dir / target_name
    text = source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_text(text, encoding="utf-8")

for source_name, target_name in optional_targets.items():
    source = template_dir / source_name
    if not source.exists():
        continue
    target = feature_dir / target_name
    text = source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_text(text, encoding="utf-8")

memory_source = memory_dir / "memory-policy.md"
memory_target = feature_dir / "memory-policy.md"
if memory_source.exists() and not memory_target.exists():
    text = memory_source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    memory_target.write_text(text, encoding="utf-8")

evolution_source = memory_dir / "evolution-policy.md"
evolution_target = feature_dir / "evolution-policy.md"
if evolution_source.exists() and not evolution_target.exists():
    text = evolution_source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    evolution_target.write_text(text, encoding="utf-8")

prefill_source = memory_dir / "evolution-prefill-policy.md"
prefill_target = feature_dir / "evolution-prefill-policy.md"
if prefill_source.exists() and not prefill_target.exists():
    text = prefill_source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    prefill_target.write_text(text, encoding="utf-8")

draft_source = memory_dir / "evolution-draft-protocol.md"
draft_target = feature_dir / "evolution-draft-protocol.md"
if draft_source.exists() and not draft_target.exists():
    text = draft_source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    draft_target.write_text(text, encoding="utf-8")

reflection_source = memory_dir / "reflection-output-protocol.md"
reflection_target = feature_dir / "reflection-output-protocol.md"
if reflection_source.exists() and not reflection_target.exists():
    text = reflection_source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    reflection_target.write_text(text, encoding="utf-8")

final_source = memory_dir / "final-output-protocol.md"
final_target = feature_dir / "final-output-protocol.md"
if final_source.exists() and not final_target.exists():
    text = final_source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    final_target.write_text(text, encoding="utf-8")
PY

echo "Feature workspace ready: $FEATURE_DIR"
if [[ "$BRANCH_CREATED" == "1" ]]; then
  echo "Feature branch ready: feature/$FEATURE_SLUG"
fi
