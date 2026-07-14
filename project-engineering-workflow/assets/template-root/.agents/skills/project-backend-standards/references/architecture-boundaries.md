# Backend Architecture And Boundaries

Use when ownership, module shape, call direction, or deployment boundaries may change.

## Decision Sequence

1. Identify the business capability and the module that owns its rules and data.
2. Trace inbound adapters, application orchestration, domain decisions, persistence, outbound adapters, and emitted side effects.
3. Preserve dependency direction toward stable domain/application contracts. Do not let controllers, handlers, ORM rows, or vendor SDKs become the business model by accident.
4. Decide whether work belongs in an existing module before creating shared utilities, generic platforms, or new services.
5. Make synchronous, asynchronous, transactional, and deployment boundaries explicit.

## Boundary Rules

- Keep transport parsing and status/protocol mapping at the edge.
- Keep use-case orchestration separate from reusable domain rules when the codebase already has those layers.
- Keep persistence queries and storage mapping behind the owning module's interface; avoid cross-module table access unless the architecture explicitly permits it.
- Prefer explicit ports/contracts for external services, clocks, queues, file systems, and other volatile dependencies.
- Avoid cyclic dependencies, god services, pass-through layers, and “shared” modules with unclear ownership.
- Reuse established patterns, but do not preserve a local pattern that violates a confirmed invariant or security boundary without recording the exception.

## Distributed Decisions

- Prefer a local transaction for one service/database boundary.
- For cross-service state, define source of truth, delivery semantics, deduplication/idempotency, ordering needs, reconciliation, and compensating behavior.
- Do not claim exactly-once behavior without infrastructure evidence. Design consumers to tolerate duplicates when delivery can repeat.
- Treat timeouts, cancellation, partial success, and stale reads as normal states.

## Review Questions

- Is each rule owned once?
- Can callers depend on a stable contract instead of implementation details?
- Are transaction and failure boundaries visible?
- Does the design add operational burden disproportionate to the problem?
- Can the changed slice be tested without booting unrelated infrastructure?
