#!/usr/bin/env bash
set -euo pipefail

RELEASE_VERSION="${1:-}"
MAIN_BRANCH="${2:-main}"

if [[ -z "$RELEASE_VERSION" ]]; then
  echo "Usage: bash .specify/scripts/bash/prepare-release.sh <version> [main-branch]" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required for release operations." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for release artifact rendering." >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT_DIR" ]]; then
  echo "This command must run inside a git repository." >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Worktree is dirty. Commit or stash changes before preparing a release." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
RELEASE_BRANCH="release/$RELEASE_VERSION"
DATE_VALUE="$(date +%F)"
RELEASE_DIR="$ROOT_DIR/specs/releases/$RELEASE_VERSION"
TEMPLATE_DIR="$ROOT_DIR/.specify/templates"

if [[ "$CURRENT_BRANCH" == "$MAIN_BRANCH" ]]; then
  echo "Refusing to prepare a release directly from '$MAIN_BRANCH'. Start from a validated feature branch." >&2
  exit 1
fi

if git rev-parse --verify "$RELEASE_BRANCH" >/dev/null 2>&1; then
  git checkout "$RELEASE_BRANCH"
else
  git checkout -b "$RELEASE_BRANCH"
fi

mkdir -p "$RELEASE_DIR"

export RELEASE_VERSION
export RELEASE_BRANCH
export CURRENT_BRANCH
export MAIN_BRANCH
export DATE_VALUE
export RELEASE_DIR
export TEMPLATE_DIR

python3 <<'PY'
import os
from pathlib import Path

release_version = os.environ["RELEASE_VERSION"]
release_branch = os.environ["RELEASE_BRANCH"]
source_branch = os.environ["CURRENT_BRANCH"]
main_branch = os.environ["MAIN_BRANCH"]
date_value = os.environ["DATE_VALUE"]
release_dir = Path(os.environ["RELEASE_DIR"])
template_dir = Path(os.environ["TEMPLATE_DIR"])

mapping = {
    "[RELEASE VERSION]": release_version,
    "[RELEASE BRANCH]": release_branch,
    "[SOURCE BRANCH]": source_branch,
    "[MAIN BRANCH]": main_branch,
    "[TAG NAME]": f"v{release_version}",
    "[DATE]": date_value,
}

targets = {
    "release-checklist-template.md": "release-checklist.md",
    "release-notes-template.md": "release-notes.md",
}

for source_name, target_name in targets.items():
    source = template_dir / source_name
    if not source.exists():
        continue
    target = release_dir / target_name
    if target.exists():
        continue
    text = source.read_text(encoding="utf-8")
    for old, new in mapping.items():
        text = text.replace(old, new)
    target.write_text(text, encoding="utf-8")
PY

echo "Release branch ready: $RELEASE_BRANCH"
echo "Release artifacts: $RELEASE_DIR"
echo "Source branch: $CURRENT_BRANCH"
