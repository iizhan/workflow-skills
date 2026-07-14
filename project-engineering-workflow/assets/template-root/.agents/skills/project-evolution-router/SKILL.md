---
name: project-evolution-router
description: Upgrade the workflow from task learnings. Use when Codex should convert repeated session feedback, rule drift, process friction, recurring failures, or confirmed best practices into proposed changes for AGENTS, skills, templates, constitution, or memory policy.
---

# Project Evolution Router

Use this skill when the framework itself should learn from repeated work, user corrections, or validation results.

Do not silently mutate workflow rules. Turn learnings into explicit proposals, ask for confirmation, apply approved upgrades, and verify the result.

## Quick Routing

- Keep one-off task learnings in `workflow-state.yaml`.
- Use `$project-memory-router` when the learning is reusable context but should not change rules.
- Use this skill when the learning should change `AGENTS.md`, `.agents/skills/*`, `.specify/templates/*`, `.specify/memory/constitution.md`, or memory/evolution policy.
- Promote only to the smallest level that solves the repeated problem.

## Evolution Levels

- `session`: keep inside `workflow-state.yaml`
- `memory_policy`: update `.specify/memory/memory-policy.md`
- `skill_rule`: update one or more `.agents/skills/*/SKILL.md`
- `workflow_rule`: update `AGENTS.md`
- `constitution_rule`: update `.specify/memory/constitution.md`
- `template_rule`: update `.specify/templates/*` or feature bootstrap behavior

## When To Read References

- Read `references/evolution-governance.md` when drafting a rule-change proposal, choosing promotion level, validating, or rolling back.
- Read `.specify/memory/evolution-prefill-policy.md` and `.specify/memory/evolution-draft-protocol.md` before generating proposal drafts in a bootstrapped project.
- Read `.specify/memory/reflection-output-protocol.md` and `.specify/memory/final-output-protocol.md` when closing a tracked task.

## Minimal Workflow

1. Identify repeated or high-impact signals from reflections, verification reports, revision requests, dissatisfaction categories, or user corrections.
2. Separate one-off noise from candidate framework improvements.
3. Choose the smallest affected level and file set.
4. Draft a candidate with evidence, expected benefit, validation, and rollback.
5. Link the proposal to concrete session evidence and explain why task-level correction is insufficient.
6. Ask for user confirmation before durable framework edits.
7. Apply approved changes and run `doctor`, smoke init, or a focused real-task check.
8. Record outcome, residual risk, and whether to keep, revise, or roll back.

## Output Format

- `进化触发信号`
- `候选规则变更`
- `建议晋级层级`
- `影响文件`
- `验证方式`
- `回滚方式`
- `需要用户确认`
