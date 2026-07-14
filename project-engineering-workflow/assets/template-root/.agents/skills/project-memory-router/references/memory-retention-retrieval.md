# Memory Retention And Retrieval

Load this reference when choosing retention, archive behavior, lookup strategy, or retrieval mode.

## Retention Defaults

- private identity, address, environment, availability, or location context: short-lived unless explicitly marked persistent
- taste, tone, copy, or UI preferences: one week by default, refresh when reused successfully
- task state and handoff notes: until the tracked feature closes, then archive
- project conventions, product FAQ, architecture decisions: persistent until superseded
- agent_self process learnings: persistent only after user confirms the learning is accurate and useful
- stale or conflicting memories: mark inactive or archived instead of deleting unless the user asks to forget

## Retrieval Modes

- `exact_lookup`: names, IDs, explicit decisions, file paths, commands, ownership, dates
- `fuzzy_recall`: preferences, similar prior tasks, repeated feedback, tone or style patterns
- `multi_hop_reasoning`: relationships, product graph, cross-feature history, cause/effect, user choice rationale

Start with exact lookup for high-stakes facts. Use fuzzy recall for preferences and behavior patterns. Use multi-hop reasoning only when the chain can be explained and uncertainty is labeled.

Practical retrieval order:

1. current conversation state
2. `specs/<feature>/workflow-state.yaml` for current task memory
3. `.specify/memory-store/index.json` for durable memory candidate lookup
4. only the few matched durable records under `.specify/memory-store/`
