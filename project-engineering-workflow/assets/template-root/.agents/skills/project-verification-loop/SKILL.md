---
name: project-verification-loop
description: Run a staged project verification loop. Use after meaningful code changes, before PRs, before commits, or when a task touches shared behavior, security, frontend layout, database code, or cross-module contracts.
---

# Project Verification Loop

Use this skill for changes that need more than the minimum test command.

## Verification Stages

Choose the stages that exist in the target repository. Do not invent commands.

1. Build or compile.
2. Typecheck.
3. Lint or format check.
4. Unit or integration tests.
5. Frontend render/layout check when UI changed.
6. Security or secret scan when sensitive code changed.
7. Diff review.

## Command Selection

- Prefer project scripts from `package.json`, `pyproject.toml`, `Makefile`, `justfile`, CI config, or docs.
- If the generated starter configured `__TEST_COMMAND__`, include it unless the task clearly needs a narrower check.
- If a command is unavailable, record that it was not run and why.
- If a command is expensive or destructive, ask before running it.

## Diff Review

Before final delivery, inspect changed files for:

- unrelated edits
- missing error paths
- stale copy or misleading UI text
- missing tests or manual verification
- security-sensitive changes without review
- generated artifacts that should not be committed

## Output Format

- `验证范围`
- `执行命令`
- `通过项`
- `失败项`
- `未执行项`
- `差异审查`
- `最终状态`
