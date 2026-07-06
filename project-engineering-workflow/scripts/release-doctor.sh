#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"
RELEASE_VERSION="${2:-}"
MAIN_BRANCH="${3:-main}"

if [[ -z "$TARGET_DIR" ]]; then
  echo "Usage: bash scripts/release-doctor.sh /absolute/path/to/target-repo [release-version] [main-branch]" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CMD=(node "$ROOT_DIR/bin/project-engineering-workflow.mjs" release-doctor --output-dir "$TARGET_DIR" --main-branch "$MAIN_BRANCH")

if [[ -n "$RELEASE_VERSION" ]]; then
  CMD+=(--release-version "$RELEASE_VERSION")
fi

"${CMD[@]}"
