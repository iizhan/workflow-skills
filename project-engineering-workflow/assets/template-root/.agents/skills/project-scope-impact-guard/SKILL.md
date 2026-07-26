---
name: project-scope-impact-guard
description: Lock the smallest safe change scope, complete impact report, non-impact boundary, and scope-drift stop before implementation.
---

# Project Scope Impact Guard

Use after initial inspection and before approving standard or controlled work.

## Impact Levels

- `low`: local, reversible, no shared/data/security/external effect.
- `medium`: multiple files or bounded shared impact.
- `high`: cross-module, data/contract, security/permission, compatibility/performance, migration/release, or workflow impact.
- `blocked`: unknown impact, missing permission, unclear rollback, or unapproved irreversible effect.

## Workflow

1. Lock the smallest scope and level; separate direct edits from indirect callers, dependencies, shared assets, and operations.
2. Assess user behavior; data/history/migration; API/IPC/CLI/config; security/privacy/permission; compatibility; performance; tests; release/rollback; Workflow/Skill.
3. State explicitly unaffected features, directories, data, projects, and behavior.
4. Mark uncertainty `confirmed`, `likely`, or `unknown`; investigate unknown high impact before approval.
5. Map impact to `ITEM-*` and evidence; publish `影响范围 vN`.
6. Pause on unapproved impact, publish a scope delta, and confirm only the addition.

## Confirmation Boundary

`影响范围 vN` is confirmed with `设计方案 vN`, `任务拆解 vN`, and the acceptance/self-test plan before code or Workflow assets change. A new data path, permission, migration, shared module, performance assumption, release action, or user-visible behavior requires `影响范围 vN+1`.

## Output Format

- `建议锁定范围`
- `影响等级与原因`
- `直接影响` · `间接影响/可能联动` · `用户影响`
- `数据与迁移影响` · `接口/配置契约影响` · `安全与权限影响`
- `兼容性影响` · `性能与资源影响` · `测试影响`
- `发布与回滚影响` · `Workflow/Skill 影响`
- `明确不影响`
- `未知项与置信度` · `影响版本` · `确认结论`
