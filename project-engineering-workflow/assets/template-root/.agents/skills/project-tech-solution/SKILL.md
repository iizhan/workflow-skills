---
name: project-tech-solution
description: Convert a confirmed request into an implementation plan. Use for cross-layer features, risky bug fixes, integrations, refactors, or any change that benefits from a written technical solution before coding.
---

# Project Tech Solution

Use this skill when the task is complex enough that coding without a plan would create avoidable risk.

## Inputs

- confirmed requirement analysis
- codebase onboarding summary
- scope lock result
- relevant code and docs
- `specs/<feature>/spec.md` when available

## Workflow

1. Summarize the goal, boundaries, and acceptance criteria.
2. Describe current implementation and nearest reusable patterns.
3. List exact directories and modules to change.
4. Explain key design decisions:
   - structure
   - UI or interface behavior
   - API or data contract changes
   - state ownership
   - config or env impact
   - testing strategy
5. Call out risks, rollback points, and pending questions.
6. Keep the plan concrete enough that implementation can follow it directly.

## Output Format

- `需求摘要`
- `当前实现与复用点`
- `改动方案`
- `影响文件/目录`
- `测试策略`
- `风险与回退`
- `待确认项`
