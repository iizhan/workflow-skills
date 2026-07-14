---
name: project-skill-upgrade-advisor
description: Analyze repeated project-session behavior and propose skill upgrades. Use when multiple sessions show the same friction, missing step, repeated correction, or recurring workflow gap, and record the recommendation in .specify/memory/skill-upgrade-backlog.md.
---

# Project Skill Upgrade Advisor

Use this skill when repeated sessions suggest the workflow itself should improve.

## Triggers

- the user repeats the same correction across sessions
- a step is frequently missed in review, test, or delivery
- a project rule keeps getting restated manually
- a new project pattern appears often enough to deserve a skill
- one high-impact workflow failure caused unsafe scope, data risk, permission misuse, false verification, or substantial rework

## Workflow

1. Identify the repeated behavior or missing capability.
2. Connect it to evidence from prior sessions or project artifacts.
3. Classify the dissatisfaction or friction and estimate confidence:
   - `low`: one signal or weak evidence
   - `medium`: repeated twice or supported by a concrete artifact
   - `high`: repeated across multiple sessions or caused real rework
4. Propose the smallest useful skill update.
5. Decide whether the fix belongs in `SKILL.md`, a reference file, a script, or a template.
6. Add one entry to `.specify/memory/skill-upgrade-backlog.md`.
7. If approval is needed, stop and ask before changing the skill.

## Upgrade Boundaries

- Prefer project-local skill updates over global behavior changes.
- Do not auto-edit skills from one weak signal.
- Keep ordinary one-off dissatisfaction in session memory; a single signal may escalate only when impact is high and evidence is concrete.
- Do not create a new skill when a short rule in an existing skill is enough.
- Do not promote project-specific behavior to global guidance unless it appears in multiple projects.
- Keep upgrade entries evidence-backed and reversible.

## Output Format

- `升级信号`
- `证据`
- `置信度`
- `建议升级`
- `落点`
- `是否需要确认`
- `记录位置`
