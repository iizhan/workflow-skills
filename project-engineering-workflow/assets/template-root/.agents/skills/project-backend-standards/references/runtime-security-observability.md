# Backend Runtime, Security, And Observability

Use for authentication, authorization, secrets, external dependencies, configuration, background work, reliability, performance, logs, metrics, or traces. Also route security-sensitive work through `$project-security-review`.

## Runtime Safety

- Keep config typed, validated at startup where practical, environment-aware, and sourced from the repository's approved config path.
- Keep secrets out of source, logs, errors, fixtures, telemetry, and generated reports.
- Put explicit deadlines on remote work. Retry only transient and idempotent operations, with bounded attempts, backoff, jitter, and an overall time budget.
- Define circuit breaking, bulkheads, rate limits, backpressure, queue bounds, and graceful degradation only where failure/load evidence justifies them.
- Background jobs need ownership, scheduling semantics, overlap control, idempotency, progress, cancellation, retry/dead-letter behavior, and recovery after restart.
- Shut down gracefully: stop accepting work, drain or checkpoint bounded work, release resources, and preserve observable failure.

## Security Boundaries

- Authenticate identity and authorize the specific resource/action server-side.
- Apply least privilege to database, queue, file, network, and administrative access.
- Validate size, type, ranges, paths, and content at trust boundaries; defend against injection, traversal, SSRF, unsafe deserialization, and resource exhaustion as applicable.
- Minimize sensitive data collection, retention, and exposure. Redact before logging.
- Record external effects and require approved confirmation where the main workflow marks them controlled.

## Observability

- Structured logs should answer what failed, where, for which operation/correlation, and whether retry is safe without exposing private data.
- Metrics should cover demand, errors, latency, saturation, queue/backlog, and business-critical outcomes.
- Traces should preserve correlation across supported HTTP/RPC/event boundaries.
- Health checks must distinguish process liveness from readiness to serve; avoid expensive or destructive checks.
- Alerts need an owner, actionable threshold, runbook or diagnosis path, and noise control.

## Performance

Measure representative latency/throughput/resource behavior before and after. State workload, data size, percentile, environment, and uncertainty. Optimize the proven bottleneck and verify correctness under load, not only speed.
