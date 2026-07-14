---
name: project-tech-solution
description: Convert confirmed requirements and impact into a versioned implementation plan. Use for controlled tasks, cross-layer features, risky fixes, integrations, refactors, or standard work that benefits from decomposed child tasks, dependencies, acceptance mapping, verification, rollback, and explicit plan confirmation before coding.
---

# Project Tech Solution

Use this skill when the task is complex enough that coding without a plan would create avoidable risk.

## Inputs

- confirmed requirement analysis
- codebase onboarding summary
- scope lock result
- approved requirement and impact versions
- relevant code and docs
- `specs/<feature>/spec.md` when available

## Workflow

1. Summarize the approved goal, boundaries, impact version, and acceptance criteria.
2. Describe current implementation and nearest reusable patterns.
3. Decompose every approved `ITEM-*` into ordered `TASK-*` child tasks with dependencies and a visible completion condition.
4. List exact directories and modules each child task may change.
5. Explain key design decisions:
   - structure
   - UI or interface behavior
   - API or data contract changes
   - state ownership
   - config or env impact
   - testing strategy
6. Map affected dimensions to verification evidence and rollback points.
7. Publish a plan version and require confirmation for controlled work. Standard work may reuse the combined requirement/impact confirmation unless decomposition changes scope.
8. If the plan changes an approved item or impact, publish a delta and reconfirm only that portion.

## Output Format

- `需求摘要`
- `关联需求/影响版本`
- `当前实现与复用点`
- `事项到子任务映射`
- `子任务依赖与完成条件`
- `影响文件/目录`
- `验证证据映射`
- `风险与回退`
- `待确认项`
- `计划版本与确认选项`
