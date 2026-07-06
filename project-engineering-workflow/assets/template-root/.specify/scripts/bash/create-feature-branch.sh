#!/usr/bin/env bash
set -euo pipefail

FEATURE_SLUG="${1:-}"
BASE_BRANCH="${2:-main}"
REMOTE_NAME="${3:-origin}"

if [[ -z "$FEATURE_SLUG" ]]; then
  echo "Usage: bash .specify/scripts/bash/create-feature-branch.sh <feature-slug> [base-branch] [remote-name]" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required for branch operations." >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT_DIR" ]]; then
  echo "This command must run inside a git repository." >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Worktree is dirty. Commit or stash changes before creating a feature branch." >&2
  exit 1
fi

FEATURE_BRANCH="feature/$FEATURE_SLUG"
START_POINT=""

if git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
  START_POINT="$BASE_BRANCH"
elif git rev-parse --verify "$REMOTE_NAME/$BASE_BRANCH" >/dev/null 2>&1; then
  START_POINT="$REMOTE_NAME/$BASE_BRANCH"
else
  echo "Cannot find base branch '$BASE_BRANCH' locally or under '$REMOTE_NAME/$BASE_BRANCH'." >&2
  exit 1
fi

if git rev-parse --verify "$FEATURE_BRANCH" >/dev/null 2>&1; then
  echo "Feature branch already exists: $FEATURE_BRANCH" >&2
  exit 1
fi

git checkout -b "$FEATURE_BRANCH" "$START_POINT"

echo "Feature branch ready: $FEATURE_BRANCH"
echo "Base branch: $START_POINT"
