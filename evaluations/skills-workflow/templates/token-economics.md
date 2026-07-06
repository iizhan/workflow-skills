# Skills Workflow Token Economics

Use this template to decide whether a skill upgrade is worth its token cost.

Quality answers "is it better"; token economics answers "is the improvement worth the context and completion budget".

## Measurement Levels

| Level | Method | Accuracy | Use When |
| --- | --- | --- | --- |
| Real usage telemetry | Capture provider usage metadata for the run: input, output, cached, reasoning, and total tokens. | High | Running controlled A/B tests through an API or harness that exposes usage. |
| Harness replay | Run the same case against baseline and candidate, store model, prompt, commit, tools, quality score, and usage. | High | Comparing one workflow version to another. |
| Skill attribution estimate | Sum tokens from triggered `SKILL.md` files and loaded references; compare to total run tokens. | Medium | The app does not expose per-skill usage. |
| Static token estimate | Estimate tokens for skill files before running tasks. | Low-medium | Preventing oversized skills and identifying expensive docs. |

## Fields To Capture

Record token data per evaluation run:

| Field | Meaning |
| --- | --- |
| `model` | Model used for the run. |
| `workflow_version` | Commit, tag, or skill hash. |
| `case_id` | Evaluation case name. |
| `mode` | `baseline` or `candidate`. |
| `skills_expected` | Skills the case expects. |
| `skills_triggered` | Skills actually triggered or loaded. |
| `input_tokens` | Prompt, system, instructions, loaded skills, file excerpts, and tool outputs sent to the model. |
| `output_tokens` | Final and intermediate model output tokens. |
| `cached_input_tokens` | Cached input tokens when provider exposes them. |
| `reasoning_tokens` | Reasoning tokens when provider exposes them. |
| `total_tokens` | Total billable or reported tokens. |
| `estimated_skill_tokens` | Estimated tokens from triggered skill files and loaded references. |
| `quality_score` | Score from `quality-metrics.md`. |
| `elapsed_seconds` | Wall-clock duration. |
| `tool_calls` | Count and type summary of tool calls. |
| `result` | `pass`, `partial`, or `fail`. |

Do not store raw prompts, secrets, or private file contents in the shared report by default. Store counts and hashes unless a debugging artifact is explicitly needed.

## A/B Comparison

Run each case as a pair:

1. Baseline: previous workflow, or current workflow with the target skill disabled or ignored.
2. Candidate: new workflow with the skill enabled.

Use the same:

- case prompt
- repository fixture
- model family
- tool permissions
- time budget
- scoring rubric

## Decision Metrics

| Metric | Formula | Interpretation |
| --- | --- | --- |
| Quality delta | `candidate_quality - baseline_quality` | Must be positive, normally at least `+10`. |
| Token delta | `candidate_total_tokens - baseline_total_tokens` | Shows added or saved token cost. |
| Token ratio | `candidate_total_tokens / baseline_total_tokens` | Good small-task upgrades should normally stay under `1.20`. |
| Cost per quality point | `token_delta / quality_delta` | Lower is better; negative means quality improved while tokens dropped. |
| Skill context share | `estimated_skill_tokens / candidate_input_tokens` | Helps detect oversized skills. |
| Net decision | quality, safety, and token cost together | Use the gates below. |

## Gates

A skill upgrade is accepted when:

- candidate quality score is at least `80 / 100`
- quality delta is at least `+10` versus baseline
- no required safety or verification gate fails
- small-task token ratio is less than or equal to `1.20`, unless quality delta is very large
- estimated skill context share is less than `25%` of candidate input tokens for ordinary coding tasks
- over-triggered skills do not add more than `10%` estimated input tokens

Reject or redesign when:

- quality does not improve
- token use rises but task outcome does not improve
- the skill triggers late after user correction
- the skill consumes a large share of context for small tasks
- most added tokens are repeated policy text that could move to a reference file or script

## Skill-Level Attribution

When exact per-skill usage is unavailable, use this approximation:

```text
estimated_skill_tokens =
  tokens(triggered SKILL.md files)
+ tokens(loaded reference files)
+ tokens(generated skill-specific checklist or summary)
```

Then compare with the run's reported `input_tokens`.

This does not perfectly separate system prompt, conversation history, tool output, or code excerpts, but it is enough to detect bloated skills and over-triggering.

## Improvement Workflow

1. Run `node evaluations/skills-workflow/scripts/estimate-token-cost.mjs`.
2. Identify large `SKILL.md` or reference files.
3. Move rarely needed details into references.
4. Replace repeated deterministic instructions with scripts.
5. Re-run the same A/B cases.
6. Accept the change only if quality and token gates both pass.
