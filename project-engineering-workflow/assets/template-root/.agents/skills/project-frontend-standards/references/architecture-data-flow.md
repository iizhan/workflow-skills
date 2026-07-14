# Frontend Architecture And Data Flow

Use for component boundaries, routing, state ownership, API/cache behavior, forms, concurrency, or shared UI refactors.

## Ownership Sequence

1. Identify the route/surface that owns the user job.
2. Trace event -> local state -> request/service -> server/cache -> rendered result.
3. Classify state as server, URL/navigation, form/draft, cross-surface client, or local ephemeral UI state.
4. Keep state at the lowest owner that needs it; lift or centralize only for demonstrated sharing, persistence, or coordination.
5. Define stale, loading, error, retry, cancellation, optimistic, and refresh behavior for remote state.

## Component Rules

- Components should own one coherent responsibility and expose explicit inputs/events.
- Prefer composition and existing design-system primitives over boolean-prop matrices or copied markup.
- Separate reusable presentation from feature orchestration when that improves ownership or testability; do not split tiny components for ceremony.
- Keep business decisions out of styling helpers and low-level shared components.
- Preserve routing and deep-link behavior. Put shareable/filter/navigation state in the URL when the product contract expects it.

## Async And Data Correctness

- Prevent stale responses from overwriting newer intent; cancel, identify, or compare requests as the stack permits.
- Deduplicate requests and cache only with clear invalidation/refresh ownership.
- Reconcile mutation results with server truth and surface partial failure.
- Bound large lists through pagination, windowing, or incremental loading when evidence requires it; keep ordering and selection stable.
- Validate external payload shape at a suitable boundary before deeply rendering or storing it.

## Refactor Test

A shared abstraction should remove repeated behavior or enforce a stable contract. Reject abstractions that merely rename one feature, obscure data ownership, or force unrelated screens into the same lifecycle.
