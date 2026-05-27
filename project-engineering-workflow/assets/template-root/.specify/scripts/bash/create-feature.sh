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
FEATURE_DIR="$ROOT_DIR/specs/$FEATURE_SLUG"
DATE_VALUE="$(date +%F)"

mkdir -p "$FEATURE_DIR/checklists"

export FEATURE_SLUG
export FEATURE_NAME
export ORIGINAL_REQUEST
export DATE_VALUE
export FEATURE_DIR
export TEMPLATE_DIR

python3 <<'PY'
import os
from pathlib import Path

feature_slug = os.environ["FEATURE_SLUG"]
feature_name = os.environ["FEATURE_NAME"]
original_request = os.environ.get("ORIGINAL_REQUEST", "")
date_value = os.environ["DATE_VALUE"]
feature_dir = Path(os.environ["FEATURE_DIR"])
template_dir = Path(os.environ["TEMPLATE_DIR"])

targets = {
    "spec-template.md": "spec.md",
    "plan-template.md": "plan.md",
    "tasks-template.md": "tasks.md",
    "quickstart-template.md": "quickstart.md",
    "workflow-state-template.yaml": "workflow-state.yaml",
    "checklist-template.md": "checklists/delivery.md",
}

mapping = {
    "[FEATURE NAME]": feature_name,
    "[FEATURE SLUG]": feature_slug,
    "[DATE]": date_value,
    "[ORIGINAL REQUEST]": original_request or "待补充",
}

for source_name, target_name in targets.items():
    source = template_dir / source_name
    target = feature_dir / target_name
    text = source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_text(text, encoding="utf-8")
PY

echo "Feature workspace ready: $FEATURE_DIR"
