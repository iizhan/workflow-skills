# __PROJECT_NAME__ Evolution Draft Protocol

This protocol defines how Codex should turn task reflections into the first draft of `rule-change-proposal.md`.

## Purpose

The first draft should be generated quickly, consistently, and from evidence already produced during the task.

The draft is not approval. It is only the first structured proposal for review.

## Draft Trigger

Create a first draft when all of these are true:

- there is at least one meaningful `session_reflection`
- the reflection suggests workflow friction, repeated failure, repeated correction, or a reusable best practice
- the issue is larger than memory only, or may become larger than memory only

If the signal is weak or one-off, keep the candidate at `session` level and draft only a minimal proposal.

## Draft Order

Fill the proposal in this order:

1. `Meta`
2. `Trigger Signal`
3. `Problem Statement`
4. `Promotion Level`
5. `Change Summary`
6. `Affected Files`
7. `Evidence`
8. `Expected Benefit`
9. `Validation Plan`
10. `Rollback Plan`
11. `User Confirmation`
12. `Validation Result`

This order matters because later fields depend on earlier judgment.

## Evidence Priority

Use this priority when multiple sources exist:

1. explicit user correction or choice
2. concrete review finding
3. concrete test or validation failure
4. repeated workflow friction noted in reflections
5. repeated successful workaround
6. reasonable inference from multiple weaker signals

Do not let a weak inference override a strong explicit signal.

## Section Draft Rules

### Meta

- fill feature, date, and related request automatically
- set `Candidate Status` to `proposed`
- set `Prefill Status` to `drafted`
- summarize confidence as `high`, `medium`, or `low` plus a short reason

### Trigger Signal

- copy the strongest repeated signal first
- if there are multiple signals, keep only the top 2-3
- mark each line with `[auto]`, `[inferred]`, or `[needs confirmation]`

### Problem Statement

- write one short paragraph
- name the workflow gap, not the emotional complaint
- keep it observable and testable

### Promotion Level

- choose the smallest valid promotion level
- if uncertain, prefer the lower level and mark it `[inferred]`

### Change Summary

- describe the rule change, not the background story
- keep to one short paragraph

### Affected Files

- list only the files likely to change in this draft
- do not prefill speculative broad file sets

### Evidence

- prefer copied evidence snippets or short paraphrases from actual task output
- if evidence is missing, mark the gap instead of inventing proof

### Expected Benefit

- state one to three observable benefits
- prefer outcomes like fewer confirmations, fewer repeated edits, clearer routing, or safer defaults

### Validation Plan

- prefill the smallest meaningful checks
- if templates or routing changed, include `doctor`
- if bootstrap or starter files changed, include smoke init
- if behavior changed, include one focused realistic task path

### Rollback Plan

- state the exact downgrade path
- say whether the learning can remain as memory only if the rule is rolled back

### User Confirmation

- leave decision fields as `[needs confirmation]`
- do not guess approval

### Validation Result

- leave as `[needs confirmation]` until checks run

## Draft Completion Rule

A first draft is complete enough when it has:

- one clear problem statement
- one proposed promotion level
- one candidate file set
- one validation plan
- one rollback plan

If any of these are missing, keep the proposal in draft state and note the gap in `workflow-state.yaml`.

## Workflow State Sync

After drafting:

- append the reflection path to `reflection_artifacts`
- append a compact entry to `rule_change_candidates`
- append the proposal path to `evolution_updates.drafted`
- record any missing evidence or confirmation gaps in `handoff_notes`

## User-Facing Summary

When presenting the draft to the user, summarize:

- what repeated signal triggered the proposal
- what level the framework suggests changing
- what files would likely change
- what still needs confirmation
