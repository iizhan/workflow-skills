# Backend API And Message Contracts

Use for HTTP, RPC, event, webhook, job payload, schema, or public DTO changes.

## Contract First

Define before implementation:

- consumer and authorization context
- request/message shape, required fields, limits, normalization, and validation
- response/event shape and stable identifiers
- error taxonomy and protocol mapping
- idempotency, ordering, pagination, filtering, and retry semantics where relevant
- compatibility window, versioning strategy, and deprecation behavior

Validate untrusted input at the boundary, then pass typed or normalized values inward. Do not expose stack traces, persistence models, secrets, or internal exception text as public contracts.

## HTTP And RPC

- Use protocol semantics consistently: methods, status codes, content types, deadlines, and cancellation.
- Separate external DTOs from persistence entities when either can evolve independently.
- Make field absence, nullability, defaults, and unknown-field handling explicit.
- Bound list endpoints; define stable ordering and cursor/offset behavior.
- Preserve backward compatibility for additive changes; plan consumers and rollout before breaking changes.
- For RPC, define timeout ownership, retry safety, and error translation at service boundaries.

## Events And Webhooks

- Give events stable names, versions, producer ownership, event identity, occurrence time, and correlation context.
- Treat event schemas as consumer contracts. Avoid publishing internal row snapshots as domain events.
- Define duplicate, out-of-order, poison-message, replay, and dead-letter handling.
- Sign and timestamp inbound webhooks where supported; verify before processing and make handlers idempotent.

## Evidence

Prefer schema/contract tests plus at least one boundary integration path. Verify representative success, validation rejection, authorization failure, dependency failure, and compatibility behavior appropriate to risk.
