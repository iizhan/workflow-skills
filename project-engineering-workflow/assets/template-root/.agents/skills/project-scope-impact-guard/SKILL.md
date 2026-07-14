---
name: project-scope-impact-guard
description: Analyze and lock the smallest safe change scope before implementation. Use when a request may change files, behavior, data, interfaces, security, compatibility, performance, tests, release behavior, or workflow assets and Codex must produce a versioned impact report, assign an impact level, define non-impact boundaries, and stop on scope drift.
---

# Project Scope Impact Guard

Use this skill after initial project inspection and before approving standard or controlled work.

## Impact Levels

- `low`: local, reversible, no shared/data/security/external effect.
- `medium`: multiple files or bounded shared impact.
- `high`: cross-module, data/contract, security/permission, compatibility/performance, migration/release, or workflow impact.
- `blocked`: unknown impact, missing permission, unclear rollback, or unapproved irreversible effect.

## Workflow

1. Lock the smallest scope and level.
2. Separate direct edits from indirect callers, dependencies, shared assets, and operations.
3. Assess user; data/history/migration; API/IPC/CLI/config; security/privacy/permission; compatibility; performance/resources; tests; release/rollback; Workflow/Skill.
4. State features, directories, data, projects, and behavior explicitly unaffected.
5. Mark uncertainty `confirmed`, `likely`, or `unknown`; investigate unknown high impact before approval.
6. Map impact to `ITEM-*` and verification evidence; publish `影响范围 vN`.
7. On unapproved impact, pause, publish a scope delta, and confirm only the addition.

## Output Format

- `建议锁定范围`
- `影响等级与原因`
- `直接影响` · `间接影响/可能联动` · `用户影响`
- `数据与迁移影响` · `接口/配置契约影响` · `安全与权限影响`
- `兼容性影响` · `性能与资源影响` · `测试影响`
- `发布与回滚影响` · `Workflow/Skill 影响`
- `明确不影响`
- `未知项与置信度` · `影响版本` · `确认结论`
