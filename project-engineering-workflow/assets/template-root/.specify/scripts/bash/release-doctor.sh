#!/usr/bin/env bash
set -euo pipefail

RELEASE_VERSION="${1:-}"
MAIN_BRANCH="${2:-main}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required for release-doctor." >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT_DIR" ]]; then
  echo "This command must run inside a git repository." >&2
  exit 1
fi

cd "$ROOT_DIR"

blockers=()
warnings=()

required_paths=(
  ".agents/skills/project-branch-release/SKILL.md"
  ".specify/release/release-policy.md"
  ".specify/scripts/bash/create-feature-branch.sh"
  ".specify/scripts/bash/prepare-release.sh"
  ".specify/scripts/bash/finalize-release.sh"
  ".specify/scripts/bash/release-doctor.sh"
  ".specify/templates/release-checklist-template.md"
  ".specify/templates/release-notes-template.md"
)

for rel in "${required_paths[@]}"; do
  if [[ ! -e "$ROOT_DIR/$rel" ]]; then
    blockers+=("Missing branch/release asset: $rel")
  fi
done

if [[ -n "$(git status --porcelain)" ]]; then
  blockers+=("Worktree is dirty. Release prepare/finalize should run on a clean repository.")
fi

if ! git rev-parse --verify "$MAIN_BRANCH" >/dev/null 2>&1; then
  blockers+=("Main branch does not exist: $MAIN_BRANCH")
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == "$MAIN_BRANCH" ]]; then
  warnings+=("Current branch is $MAIN_BRANCH. Release preparation should start from a validated feature branch.")
fi

if [[ -z "$(git remote)" ]]; then
  warnings+=("No git remote is configured. Remote publication is still a manual follow-up.")
fi

if grep -Eq '\bgit[[:space:]]+push\b|\bnpm[[:space:]]+publish\b' ".specify/scripts/bash/prepare-release.sh" ".specify/scripts/bash/finalize-release.sh"; then
  blockers+=("Release scripts contain direct remote push or npm publish commands. Remote actions must stay manual.")
fi

if [[ -n "$RELEASE_VERSION" ]]; then
  RELEASE_BRANCH="release/$RELEASE_VERSION"
  RELEASE_DIR="specs/releases/$RELEASE_VERSION"
  TAG_NAME="v$RELEASE_VERSION"

  if [[ ! -d "$RELEASE_DIR" ]]; then
    blockers+=("Missing release artifact directory: $RELEASE_DIR")
  fi
  if [[ ! -f "$RELEASE_DIR/release-checklist.md" ]]; then
    blockers+=("Missing release checklist: $RELEASE_DIR/release-checklist.md")
  fi
  if [[ ! -f "$RELEASE_DIR/release-notes.md" ]]; then
    blockers+=("Missing release notes: $RELEASE_DIR/release-notes.md")
  fi
  if ! git rev-parse --verify "$RELEASE_BRANCH" >/dev/null 2>&1; then
    blockers+=("Missing release branch: $RELEASE_BRANCH")
  fi
  if git rev-parse --verify "$TAG_NAME" >/dev/null 2>&1; then
    warnings+=("Tag already exists: $TAG_NAME")
  fi
fi

echo "Release doctor for: $ROOT_DIR"
if [[ -n "$RELEASE_VERSION" ]]; then
  echo "Release version: $RELEASE_VERSION"
fi
echo "Current branch: $CURRENT_BRANCH"
echo "Remote push/publish guard: manual-only confirmed"

if [[ ${#blockers[@]} -gt 0 ]]; then
  echo
  echo "Blockers:"
  for item in "${blockers[@]}"; do
    echo "- $item"
  done
  exit 1
fi

if [[ ${#warnings[@]} -gt 0 ]]; then
  echo
  echo "Warnings:"
  for item in "${warnings[@]}"; do
    echo "- $item"
  done
fi

echo
echo "Release doctor passed."
