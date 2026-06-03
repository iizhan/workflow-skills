---
name: project-branch-release
description: Govern feature branches, release branches, version tags, and merge-to-main flow. Use when starting tracked development, preparing a release, creating tags, or deciding whether a change is ready to merge into `main`.
---

# Project Branch And Release

Use this skill when the request affects branch flow, release readiness, tagging, packaging, or merge-to-main decisions.

## Default Flow

1. Start tracked work from `main`.
2. Create a feature branch named `feature/<feature-slug>`.
3. Implement and validate on the feature branch.
4. When verification is complete, create `release/<version>` from the validated branch tip.
5. Update release notes and release checklist on the release branch.
6. Create tag `v<version>` on the clean release commit.
7. Merge the release branch into `main`.

## Rules

- Do not develop on `main` by default.
- Do not tag or merge from a dirty worktree.
- Do not merge into `main` before code review and test reporting are complete.
- Do not skip release notes and release checklist for a real publish or release cut.
- Treat `feature/*`, `release/*`, `main`, and `v<version>` as separate lifecycle states, not interchangeable labels.

## Suggested Commands

- Start feature work:
  - `bash .specify/scripts/bash/create-feature-branch.sh <feature-slug>`
- Prepare a release branch and release artifacts:
  - `bash .specify/scripts/bash/prepare-release.sh <version>`
- Finalize tag + merge to main:
  - `bash .specify/scripts/bash/finalize-release.sh <version>`

## Output Format

- `当前阶段`
- `推荐分支`
- `阻断项`
- `必须检查`
- `建议命令`
