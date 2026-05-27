---
name: project-gsd-router
description: Orchestrate long-running or context-heavy work using a Get Stuff Done style workflow. Use when a task spans many files, multiple sessions, multiple milestones, unclear sequencing, or needs resumable execution state under specs/<feature>/.
---

# Project GSD Router

Use this skill when the normal workflow needs long-horizon planning, resumable state, and milestone control.

This skill coordinates the work. It does not replace requirement confirmation, scope locking, implementation, review, or test reporting.

## Inputs

- confirmed requirement analysis
- scope lock result
- technical solution when available
- current `specs/<feature>/` directory when available
- relevant output from `project-superpowers-router`

## When To Use

- the task is likely to span multiple sessions
- the implementation affects several modules or workspaces
- the task needs phased rollout, migration, or checkpoints
- context may be lost before delivery finishes
- multiple agents or capability lanes are involved

## Workflow

1. Decide whether this task needs GSD orchestration or the normal workflow is enough.
2. Create or update `specs/<feature>/workflow-state.yaml` when the task is tracked.
3. Split the work into milestones with clear done states.
4. Define the next action, required context, verification command, and stop condition for each milestone.
5. Keep one active milestone at a time unless the user explicitly asks for parallel work.
6. After each milestone, update state with completed work, changed files, evidence, risks, and the next handoff.
7. Fold final status into `project-test-and-report`.

## State Fields

Use these fields when updating `workflow-state.yaml`:

- `requirement_status`
- `scope_status`
- `active_milestone`
- `milestones`
- `capability_routes`
- `role_reviews`
- `validation_status`
- `handoff_notes`
- `residual_risks`

## Output Format

- `是否启用 GSD`
- `任务阶段`
- `当前里程碑`
- `下一步动作`
- `状态文件`
- `恢复提示`
- `风险与阻塞`
