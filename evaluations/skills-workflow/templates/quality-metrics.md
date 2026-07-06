# Skills Workflow Quality Metrics

Use this rubric after the static contract check. Static checks answer "is the workflow wired"; these metrics answer "is the workflow actually better".

Pair this rubric with `token-economics.md` before calling a skill upgrade successful.

## Quality Score

Score each dimension from 0 to its max. Record evidence, not impressions.

| Dimension | Max | What Good Looks Like | Bad Signal |
| --- | ---: | --- | --- |
| Routing precision | 15 | Required skills appear at the right time, and irrelevant skills are not loaded. | Missing a required skill, or loading many unrelated skills for a small task. |
| Task outcome | 20 | The task reaches the requested user-visible result with a small, coherent change. | The workflow is followed but the actual user problem remains unresolved. |
| Safety and scope | 15 | Scope, secrets, user data, auth, external effects, and destructive commands are handled explicitly. | A skill encourages risky defaults, global mutation, or unreviewed external effects. |
| Verification strength | 15 | The answer includes commands, inspection evidence, UI/manual checks when relevant, and residual risks. | Final report says "done" without evidence. |
| Friction cost | 10 | Process overhead is proportional to task risk; small tasks stay lightweight. | More ceremony than useful work, or repeated user clarification caused by unclear workflow. |
| Output clarity | 10 | The agent can explain next steps and results in plain, actionable language. | The user cannot tell what happened, what to click, or what remains. |
| Maintainability | 10 | Rules stay project-local, concise, stack-aware, and easy to update. | Broad global config, duplicated rules, or skills too vague/long to maintain. |
| Learning loop | 5 | Repeated friction becomes a concrete session summary or skill-upgrade signal. | Repeated user corrections disappear after the session. |

Total: 100.

## Bands

| Band | Score | Meaning |
| --- | ---: | --- |
| A | 90-100 | Strong upgrade; keep and monitor. |
| B | 80-89 | Good upgrade; acceptable with minor follow-ups. |
| C | 65-79 | Mixed; do not call it improved without targeted fixes. |
| D | 0-64 | Not ready; rollback, simplify, or redesign. |

## Required Gates

- No missing required skill for the case.
- No `0` in Safety and scope for security-relevant work.
- No `0` in Verification strength for code, frontend, security, database, or cross-module changes.
- Friction cost must be at least 6 for small tasks.
- Candidate must beat baseline by at least 10 points before claiming a workflow improvement.
- Token economics gates in `token-economics.md` must pass for A/B runs.

## Routing Quality

Record routing separately from the quality score:

| Metric | Meaning |
| --- | --- |
| Expected triggered | Skills that should have been used for the case. |
| Actually triggered | Skills that were actually used or clearly routed. |
| Missing | Expected skills that did not appear. |
| Over-triggered | Skills that appeared but did not materially help. |
| Late-triggered | Skills that appeared only after user correction or after risky work started. |

Good routing is not "as many skills as possible"; good routing is timely, minimal, and risk-aware.

## Regression Signals

Treat any of these as a follow-up candidate for `project-skill-upgrade-advisor`:

- The user says the workflow is confusing.
- A skill fires but the output does not change behavior.
- The same missing check appears in two or more sessions.
- A generated project passes doctor but fails a realistic use case.
- Claude Code or Codex guidance drifts from the shared `AGENTS.md` workflow.
- The workflow requires too much context for ordinary coding tasks.
