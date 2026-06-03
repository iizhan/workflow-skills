#!/usr/bin/env bash
set -euo pipefail

RELEASE_VERSION="${1:-}"
MAIN_BRANCH="${2:-main}"

if [[ -z "$RELEASE_VERSION" ]]; then
  echo "Usage: bash .specify/scripts/bash/finalize-release.sh <version> [main-branch]" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required for release operations." >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT_DIR" ]]; then
  echo "This command must run inside a git repository." >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Worktree is dirty. Commit or stash changes before finalizing a release." >&2
  exit 1
fi

RELEASE_BRANCH="release/$RELEASE_VERSION"
TAG_NAME="v$RELEASE_VERSION"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if ! git rev-parse --verify "$RELEASE_BRANCH" >/dev/null 2>&1; then
  echo "Release branch does not exist: $RELEASE_BRANCH" >&2
  exit 1
fi

if [[ "$CURRENT_BRANCH" != "$RELEASE_BRANCH" ]]; then
  echo "Checkout '$RELEASE_BRANCH' before finalizing the release." >&2
  exit 1
fi

if git rev-parse --verify "$TAG_NAME" >/dev/null 2>&1; then
  echo "Tag already exists: $TAG_NAME" >&2
  exit 1
fi

git tag -a "$TAG_NAME" -m "release: $TAG_NAME"
git checkout "$MAIN_BRANCH"
git merge --no-ff "$RELEASE_BRANCH" -m "merge $RELEASE_BRANCH into $MAIN_BRANCH"

echo "Release finalized."
echo "Tag created: $TAG_NAME"
echo "Merged into: $MAIN_BRANCH"
echo "Next step: push '$MAIN_BRANCH' and '$TAG_NAME' when remote publish is approved."
