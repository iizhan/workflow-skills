# Java And Spring Backend Profile

Read only for Java/Spring projects, including Spring Boot, Spring MVC, MyBatis, Dubbo, and common JVM service conventions. Project-local rules remain authoritative.

## Structure

- Keep controllers/RPC providers thin: protocol conversion, validation, authorization context, and response mapping.
- Put transaction-owning use cases in an application/service layer consistent with the repository; keep reusable business rules independent of Spring where practical.
- Keep mapper/repository and external-client details behind owning interfaces. Do not return MyBatis rows or JPA entities as public DTOs by default.
- Prefer constructor injection and explicit dependencies. Avoid mutable singleton state and hidden service-locator access.
- Use package/module boundaries that match business ownership; do not make `common` a dumping ground.

## Spring And Contracts

- Use Bean Validation for boundary shape where established, then enforce business invariants in the owning service/domain.
- Centralize intentional exception-to-protocol mapping; preserve stable error codes and redact internals.
- Make `@Transactional` placement, propagation, isolation, rollback rules, and proxy/self-invocation behavior explicit.
- Treat configuration properties as typed/validated contracts. Keep environment-specific values outside code.
- For async/scheduled work, define executor bounds, context propagation, overlap, retries, idempotency, and shutdown behavior.

## MyBatis And Data

- Parameterize values; allowlist unavoidable dynamic identifiers and clauses.
- Inspect mapper cardinality, affected rows, generated keys, null mapping, batch behavior, pagination, and N+1 loops.
- Keep SQL readable and verify indexes/query plans for important paths. Do not hide costly queries behind generic repository methods.

## Dubbo And Service Calls

- Treat interface/DTO changes as versioned consumer contracts.
- Set timeout and retry behavior according to idempotency and end-to-end budget; avoid stacked retries across layers.
- Translate provider failures deliberately and preserve correlation context.

## Verification

- Use focused JUnit tests for rules; Spring slice tests where container behavior matters; mapper/integration tests against representative schema; MockMvc/REST Assured or project equivalents for HTTP; contract/integration checks for Dubbo.
- Verify startup/config binding and health behavior for runtime changes.
- Avoid a full application context when a smaller test proves the contract, but do not replace real wiring/database evidence when those are the risk.
