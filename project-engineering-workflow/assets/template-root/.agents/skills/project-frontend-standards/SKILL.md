---
name: project-frontend-standards
description: Run the adaptive frontend workflow for browser and desktop interfaces. Use after scope is understood to route only the frontend references needed for experience, state, architecture, accessibility, responsiveness, performance, security, verification, and framework implementation.
---

# Project Frontend Standards

Use after loading relevant fresh Profile/architecture sections and matched decisions. This is the role entry; load only references justified by missing task context or changed evidence.

## Adaptive Workflow

1. Reconstruct the user job and click path; inspect visible UI, tokens, language, state ownership, data source, and failure states.
2. Define the experience contract: entry/action/feedback, loading, disabled, empty, success, error, recovery, focus, responsive, and privacy behavior.
3. Choose the smallest existing-pattern design, implement a vertical slice with the matching framework skill, then review races, accessibility, localization, layout, performance, security, and visual consistency.
4. Verify visibly when possible and map each experience state to evidence with `$project-verification-loop` and `$project-test-and-report`.

## Reference Router

- Read `references/experience-states.md` for journeys, actions, forms, feedback, destructive, or async states.
- Read `references/architecture-data-flow.md` for components, routing, state, API/cache, forms, concurrency, or shared UI.
- Read `references/accessibility-responsive-i18n.md` for controls, layout, focus, assistive technology, localization, or mixed language.
- Read `references/performance-security-observability.md` for large data/media, cost, sensitive data, telemetry, third parties, or diagnosis.
- Read `references/testing-delivery.md` for meaningful work; then select only the matching JS/React/Vue/CSS skill.

Do not read every reference by default, and do not load every framework skill. Fast work loads only the affected reference and stack skill; standard normally adds testing; controlled loads only references implicated by approved risk.

Guardrails: Make controls responsive; preserve routes, state boundaries, and tokens; include loading/disabled/empty/success/error/recovery; use semantic controls and prevent unreadable vertical fragments. Do not add analytics or sensitive-data logging without approval.
