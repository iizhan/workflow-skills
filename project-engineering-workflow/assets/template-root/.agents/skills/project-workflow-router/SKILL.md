---
name: project-workflow-router
description: Select and validate one project-local Workflow Template for standard or controlled development work. Use after the task lane and project Profile are known when a request may match a declared role, scenario, or integration Workflow, or when Workflow compatibility, binding, Loop Engineering, or routing evidence must be explained.
---

# Project Workflow Router

Select a declared Workflow without replacing requirement, impact, confirmation, verification, or acceptance gates.

## Routing Rules

1. Run `$project-profile-router` first; use only fresh, source-backed facts.
2. Reuse `$project-requirement-gate` lane: `fast` uses the lightweight route; `standard`/`controlled` inspect `.skill-os/workflows/` and choose at most one primary scenario or integration Workflow.
3. Validate before recommendation:

   ```bash
   npx @workflow-skills/project-engineering-workflow workflow-validate \
     --output-dir "<project-root>" \
     --json
   ```

4. Foundation and role Templates are dependencies, not additional primaries. Select only when task, inputs, Profile, dependencies, Skills, permissions, and compatibility match.
5. For missing inputs, incompatible versions, or weak confidence, explain and use the governed route. Never fabricate activation.

## Loop Engineering Boundary

- Apply Loops only after formal design, task, impact, and acceptance confirmation; repair verified issues only in approved scope.
- A scope change, contract/permission/migration/external/release change, repeated strategy, or exhausted budget stops for a user decision.
- `90` never bypasses hard checks, evidence, or final acceptance.

## Conversation Initiation

The Codex project conversation is the only execution entry for a Scenario Loop. The desktop workbench is an observation and governance surface; it never starts Codex, creates task authorization, or substitutes for user confirmation.

1. For every `standard` or `controlled` development request, evaluate loop-enabled scenario or integration Templates after Profile and requirement classification. The user does not need to open a desktop page or issue a separate "start Loop" command.
2. When one primary Template matches, include its identity, dependencies, Loop limits, and stop conditions in the formal confirmation package. If no Template matches, continue with the governed non-Loop route and state why.
3. Once the same formal package is explicitly confirmed, create the active record in the current feature's `workflow-state.yaml` under `scenario_loop_runs` with `initiation_source: conversation`; bind it to the confirmed artifact versions and current session reference before the first implementation step.
4. During this conversation, append every completed iteration to that record. Keep the conversation and project artifact authoritative even when the desktop workbench has not yet imported the evidence.
5. On a material change, stop the active record as `needs_reconfirmation`; publish `vN+1`, and create the next iteration only after the changed package is confirmed.

## Scenario Loop Record

After confirmation, create one conversation-initiated `Scenario Loop Run` for the selected primary Template. It is execution evidence, never Harness permission or a replacement for the broader `workflow-state.yaml` task lifecycle.

Per iteration record number/Workflow evidence, root cause and strategy, score/floors/checks/blockers/evidence/risk, budget usage, material-change signals, and stop reason. Set `initiation_source: conversation` and retain the `session_ref` plus confirmed package versions. Continue only in approved scope with budget, a new strategy, and iteration capacity; otherwise stop for decision or mark repeated failure as an evolution candidate.

## Required Output

- `主 Workflow`：Template、版本、状态、原因；`依赖 Workflow`：基础/角色依赖与版本；`不选择候选`：阻塞原因；
- `Loop 策略`：轮次、同根因上限、质量门禁、停止条件；`确认边界`：是否允许实施；
- `证据`：Profile、Manifest、Skill、版本、验证；`Loop 运行引用`：ID、轮次、质量/预算、停止或继续条件。

Read [references/workflow-manifest-contract.md](references/workflow-manifest-contract.md) only when you need schema, compatibility, binding, or migration detail.
