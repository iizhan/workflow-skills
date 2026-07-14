# Skills Workflow Evaluation Run

## Metadata

- Date: 2026-07-06
- Evaluator: Codex
- Scope: first validation after ECC benchmark absorption, dev/frontend/security/verification skill updates, and global skill sync
- Mode: candidate

## Commands Run

```bash
node evaluations/skills-workflow/scripts/check-contract.mjs
node evaluations/skills-workflow/scripts/estimate-token-cost.mjs
npm --prefix project-engineering-workflow run doctor
npm --prefix project-engineering-workflow run smoke
node project-engineering-workflow/bin/project-engineering-workflow.mjs doctor --output-dir /private/tmp/project-engineering-workflow-smoke
npm --prefix project-engineering-workflow run pack:dry-run
rg -n "project-dev-core|project-frontend-standards|project-frontend-react|project-frontend-css|project-security-review|project-verification-loop|project-session-summary|project-skill-upgrade-advisor" /private/tmp/project-engineering-workflow-smoke/AGENTS.md /private/tmp/project-engineering-workflow-smoke/.agents/skills /private/tmp/project-engineering-workflow-smoke/.specify/memory
rg -n "Codex 与 Claude Code|hooks|默认 starter|project-verification-loop|project-skill-upgrade-advisor|Claude Code 专属说明" /private/tmp/project-engineering-workflow-smoke/docs
```

## Result

- Static contract: passed.
- Template doctor: passed.
- Generated project smoke: passed.
- Generated project doctor: passed.
- Package dry-run: passed.
- Generated project skill count: 21 local skills.
- Package contents: 50 files; `evaluations/` is not included in the npm package.
- Harness parity follow-up: passed after adding `docs/ClaudeCode团队开发说明.md`; package now contains 51 files.
- Quality metric follow-up: added `templates/quality-metrics.md` so future runs distinguish quality, friction, over-triggering, and baseline delta from simple skill presence.
- Token economics follow-up: added `templates/token-economics.md` and `scripts/estimate-token-cost.mjs` so future A/B runs compare quality gain with token cost.

## Case Coverage

| Case | Coverage Result | Evidence |
| --- | --- | --- |
| Dev core | Pass | Generated `AGENTS.md` routes through `$project-dev-core` before stack standards and code generation. |
| Frontend interaction | Pass | Generated `AGENTS.md` routes frontend work through `$project-frontend-standards` and JS/React/Vue/CSS focused skills. |
| Security sensitive | Pass | Generated `AGENTS.md` routes auth, secrets, input, API, database, private data, and integrations through `$project-security-review`. |
| Verification | Pass | Generated `AGENTS.md` routes meaningful/risky/shared/frontend/security/database/cross-module changes through `$project-verification-loop`. |
| Session learning | Pass | Generated `AGENTS.md` routes completion through `$project-session-summary` and repeated friction through `$project-skill-upgrade-advisor`. |
| Codex / Claude Code harness parity | Pass | Generated docs distinguish shared `AGENTS.md` / `.agents/skills` from Codex sandbox/approval behavior and Claude Code opt-in hooks/commands/subagents. |

## Scorecard

| Dimension | Score 0-3 | Evidence |
| --- | ---: | --- |
| Requirement clarity | 3 | Requirement gate remains first in generated workflow. |
| Codebase onboarding | 3 | Codebase onboarding remains before scope and implementation. |
| Scope control | 3 | Scope impact guard remains before implementation. |
| Dev core hygiene | 3 | Dev core exists, is required by generated workflow, and includes naming, git, KISS/DRY/YAGNI, errors, validation, and verification routing. |
| Frontend routing | 3 | Generic frontend and JS/React/Vue/CSS focused skills are generated and routed. |
| Security routing | 3 | `project-security-review` is generated, routed, and checked by CLI and shell doctor. |
| Verification quality | 3 | `project-verification-loop` is generated, routed, and checked by CLI and shell doctor. |
| Session summary | 3 | Completion routing and memory files are generated. |
| Skill upgrade signal | 3 | Upgrade advisor uses evidence, confidence, and project-local boundaries. |
| Harness parity | 3 | Codex and Claude Code docs are generated, checked by doctor, and covered by contract tests. |
| Noise control | 3 | Skills remain small and generated memory files now start as clean templates. |

Total: 33 / 33

## Quality Metrics

This run originally emphasized static wiring and generated-fixture health. It now has a quality rubric for future A/B runs, so "skill exists" is not treated as equivalent to "skill is useful".

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Routing precision / 15 | 14 | Required dev, frontend, security, verification, session, upgrade, Codex, and Claude Code routes are present. Real-session late-triggering still needs longitudinal evidence. |
| Task outcome / 20 | 18 | Generated projects now include clearer dev/frontend/security/verification/session behavior and from-zero docs. |
| Safety and scope / 15 | 15 | Security review, external-effect boundaries, Claude hooks opt-in rules, and project-local boundaries are explicit. |
| Verification strength / 15 | 14 | Static contract, doctor, smoke, generated doctor, and pack dry-run passed. Human A/B cases remain the next stronger evidence. |
| Friction cost / 10 | 8 | Workflow stays layered and project-local, but real small-task timing still needs repeated measurement. |
| Output clarity / 10 | 8 | Codex/Claude docs and generated next steps are clearer; application-style UX still needs separate product testing. |
| Maintainability / 10 | 9 | Rules are split into concise project-local skills and shared docs without adopting ECC wholesale. |
| Learning loop / 5 | 5 | Session summary and skill upgrade advisor are routed, and memory templates are clean. |

- Total quality score: 91 / 100
- Band: A
- Baseline score: not measured in this run
- Delta: unavailable until the same case is run against a previous workflow
- Required gate failures: none
- Interpretation: strong candidate by static and generated-fixture evidence; still needs repeated human A/B runs before claiming long-term behavioral improvement.

## Token Economics

This run did not have provider-level usage metadata, so exact baseline-vs-candidate token delta was not measured.

- Token source: static estimate
- Baseline total tokens: not measured
- Candidate total tokens: not measured
- Candidate static generated skill estimate: recorded by `estimate-token-cost.mjs`
- Static budget report: advisory mode; hard failures only when `--enforce` is used
- Token ratio: unavailable until paired A/B replay
- Cost per quality point: unavailable until paired A/B replay
- Current decision: monitor

Interpretation: static estimates can identify oversized skill files and docs; final "better than last version" decisions require paired runs with usage metadata or replay logs.

Follow-up after the 0.3.1 merge: router slimming moved rarely needed memory, evolution, and UI automation details into skill-local `references/`. The largest router `SKILL.md` files are now below the router budget, while ordinary-dev/frontend/security bundles remain warning-level optimization targets.

## Findings

- No blocking issue found in the current candidate workflow.
- The main improvement is measurable: generated projects now include dev-core, frontend stack routing, security review, verification loop, session summary, and upgrade advisor in one explicit flow.
- Follow-up repair completed: generated `.specify/memory/session-history.md` and `skill-upgrade-backlog.md` now ship as clean blank templates instead of dated starter observations.
- Follow-up harness repair completed: generated projects now include separate Codex and Claude Code guidance, and contract checks verify that Claude hooks remain opt-in and cannot bypass project gates.

## Upgrade Signals

- Signal: generated project memory may be too opinionated for a fresh project.
- Evidence: smoke fixture copies current dated memory entries into `/private/tmp/project-engineering-workflow-smoke/.specify/memory/`.
- Confidence: medium
- Resolution: fixed in the template; `check-contract.mjs` now fails if generated memory templates contain dated starter history.
- Signal: workflow evaluation did not originally distinguish Codex and Claude Code harness behavior.
- Evidence: initial contract only checked shared `AGENTS.md` and `.agents/skills`; no Claude Code doc was generated or required.
- Confidence: high
- Resolution: added `docs/ClaudeCode团队开发说明.md`, doctor/CLI checks, harness parity evaluation case, and contract checks for Codex vs Claude Code boundaries.
