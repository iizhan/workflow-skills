# Backend Data And Consistency

Use for persistent data, transactions, migrations, caches, indexes, concurrency, batch processing, or historical repair.

## Ownership And Invariants

- Name the source of truth and the invariants that must hold before choosing storage operations.
- Keep transaction boundaries around one business consistency unit, not around arbitrary controller or helper boundaries.
- Define behavior for duplicate requests, concurrent updates, stale reads, partial writes, retries, and cancellation.
- Use database constraints for invariants the database can enforce; do not rely only on prior reads.

## Queries And Persistence

- Select only needed data and make query cardinality visible.
- Check N+1 access, unbounded scans, missing indexes, unstable ordering, lock duration, and large in-memory aggregation.
- Use query plans or representative measurements before claiming a performance improvement.
- Keep ORM/mapper behavior explicit for cascades, lazy loading, generated keys, affected-row checks, and null handling.
- Parameterize queries. Dynamic identifiers or clauses need allowlists or structured builders.

## Migrations

For live or historical data, prefer expand -> migrate/backfill -> verify -> switch -> contract:

1. Add backward-compatible schema or readers.
2. Deploy code able to tolerate old and new states.
3. Backfill in bounded, restartable batches with progress and error evidence.
4. Verify counts, invariants, sampling, and consumer compatibility.
5. Switch writes/reads deliberately.
6. Remove old paths only after the rollback window closes.

Record backup, rollback, lock/time risk, deployment order, and whether rollback is code-only or also requires data repair. Never describe a destructive migration as reversible without evidence.

## Cache And Derived Stores

- Define key ownership, TTL, invalidation, stampede control, and stale-data tolerance.
- Treat cache, search, analytics, and projections as derived unless the project explicitly makes them authoritative.
- Ensure repair/rebuild paths exist for derived state.
