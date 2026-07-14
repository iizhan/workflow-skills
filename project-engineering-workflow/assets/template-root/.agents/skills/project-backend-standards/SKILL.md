---
name: project-backend-standards
description: Run the adaptive backend engineering workflow for APIs, services, jobs, events, databases, caches, integrations, and server runtime changes. Use after project scope is understood to route only the backend references needed for architecture, contracts, data consistency, runtime safety, verification, and stack-specific implementation.
---

# Project Backend Standards

Use after loading relevant fresh Profile/architecture sections and matched decisions. This is the role entry; load only references justified by missing task context or changed evidence.

## Adaptive Workflow

1. Trace trigger/transport -> application/domain -> persistence -> side effects; identify owners, invariants, trust boundaries, failures, and source-of-truth config.
2. Define inputs, outputs, validation, authorization, errors, idempotency, compatibility, and operational expectations.
3. Choose the smallest design preserving module boundaries and data correctness; record material decisions for standard/controlled work.
4. Implement a testable vertical slice with existing project patterns.
5. Review correctness, concurrency, partial failure, security, performance, compatibility, and operability.
6. Verify proportionally and map contracts/invariants to evidence with `$project-verification-loop` and `$project-test-and-report`.

## Reference Router

- Read `references/architecture-boundaries.md` for new modules, cross-module calls, refactors, domain ownership, or synchronous/asynchronous boundaries.
- Read `references/api-contracts.md` for HTTP, RPC, events, webhooks, schemas, public DTOs, or compatibility changes.
- Read `references/data-consistency.md` for databases, transactions, migrations, caches, search indexes, concurrency, or batch work.
- Read `references/runtime-security-observability.md` for auth, secrets, external systems, retries, jobs, performance, configuration, logs, metrics, or traces.
- Read `references/testing-delivery.md` for meaningful changes; use its risk matrix instead of running every test class.
- Read `references/java-spring.md` only when the project uses Java, Spring, MyBatis, Dubbo, or adjacent JVM conventions.

Do not read every reference by default. Fast work loads only the directly affected reference, skips architecture ceremony when boundaries do not change, and still verifies the observable result. Standard work normally loads one primary reference plus testing. Controlled work loads every reference implicated by approved risk, never the entire pack automatically.

## Role Output

For tracked standard/controlled work, record the backend path, protected invariants, loaded references/reasons, decisions, evidence, rollback/compatibility notes, and residual risk.
