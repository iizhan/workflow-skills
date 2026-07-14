# Frontend Performance, Security, And Observability

Use for large lists/media, startup/render cost, sensitive data, analytics, telemetry, third parties, or frontend error diagnosis. Route security-sensitive work through `$project-security-review` as well.

## Performance

- Measure before optimizing: startup/navigation timing, interaction latency, render frequency, bundle/network cost, memory, and representative data volume.
- Keep critical content and primary actions available without unnecessary dependency waterfalls.
- Split code/data at meaningful route or capability boundaries; avoid fragmentation that adds loading churn.
- Optimize images/fonts/media with correct dimensions, formats, loading priority, and layout reservation.
- Virtualize or paginate only when data size demonstrates a need, while preserving keyboard/accessibility behavior.
- Memoize only for measured expensive work or required referential stability; do not use it to mask confused state ownership.
- Clean up timers, listeners, observers, requests, workers, and subscriptions.

## Security And Privacy

- Treat browser/renderer data as user-visible and potentially attacker-controlled. Escape by default and sanitize unavoidable HTML.
- Keep secrets and privileged decisions off the client. Authorization must be enforced by the backend.
- Protect tokens according to the project's threat model; avoid sensitive values in URLs, logs, analytics, errors, storage, screenshots, and clipboard defaults.
- Validate upload type/size and render untrusted files/content in appropriately isolated contexts.
- Review navigation targets, opener behavior, deep links, IPC bridges, and third-party scripts for injection or privilege escalation.
- Collect the minimum analytics/telemetry needed, with approved consent, retention, redaction, and opt-out behavior.

## Observability

- Capture actionable frontend failures with release/version, route/surface, operation, correlation, and safe context.
- Distinguish user error, expected dependency failure, and product defect.
- Monitor key journeys through outcome and latency signals, not raw click volume alone.
- Use source maps and session diagnostics only under approved privacy/access controls.
- Provide a user-visible failure and recovery path even when diagnostics are also collected.

Any performance claim needs a reproducible before/after measurement; any telemetry addition needs explicit approval and privacy evidence.
