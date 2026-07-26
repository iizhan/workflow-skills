import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RegistryService } from "../src/main/registry-service";
import { WorkbenchDatabase } from "../src/main/database";
import { ensureStorage } from "../src/main/storage";
import { TraceService, type TraceTelemetryEventInput } from "../src/main/trace-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const root = mkdtempSync(join(tmpdir(), "skill-os-trace-test-"));
const database = new WorkbenchDatabase(ensureStorage(root));
const registryStub = { listSkills: () => [] } as unknown as RegistryService;
const service = new TraceService(database, registryStub);
const now = "2026-07-15T01:00:00.000Z";

function seedSkill(id: string, name: string, path: string) {
  database.db.prepare(
    `INSERT INTO skills (
       id, canonical_name, display_name, source_type, source_path, source_path_hash,
       owner_label, is_active, first_seen_at, last_seen_at
     ) VALUES (?, ?, ?, 'project', ?, ?, 'test', 1, ?, ?)`
  ).run(id, name, name, path, `hash-${id}`, now, now);
  database.db.prepare(
    `INSERT INTO skill_versions (
       id, skill_id, version_fingerprint, content_hash, frontmatter_name,
       frontmatter_description, line_count, detected_at, is_current, metadata_json
     ) VALUES (?, ?, ?, ?, ?, ?, 20, ?, 1, '{}')`
  ).run(`version-${id}`, id, `version-${id}`, `content-${id}`, name, `${name} description`, now);
}

seedSkill("skill-a", "Skill A", "/tmp/project/.agents/skills/skill-a");
seedSkill("skill-b", "Skill B", "/tmp/project/.agents/skills/skill-b");
database.db.prepare(
  `INSERT INTO managed_projects (
     id, name, path, bound_at, last_focused_at, workflow_applied,
     monitoring_enabled, monitoring_interval_ms, updated_at
   ) VALUES ('project-a', 'Project A', '/tmp/project', ?, ?, 1, 0, 60000, ?)`
).run(now, now, now);

function event(
  lineNumber: number,
  input: {
    eventId: string;
    eventType: "skill_run.started" | "skill_run.completed";
    runId: string;
    turnRef: string;
    skillId: string;
    captureMode: "estimated" | "precise";
    confidence: number;
    occurredAt: string;
    summary: string;
  }
): TraceTelemetryEventInput {
  return {
    lineNumber,
    record: {
      event_id: input.eventId,
      event_type: input.eventType,
      event_order: input.eventType === "skill_run.started" ? 1 : 2,
      occurred_at: input.occurredAt,
      run_id: input.runId,
      turn_ref: input.turnRef,
      session_ref: "shared-session",
      workspace_ref: "/tmp/project",
      source_ref: "/tmp/session.jsonl",
      source_type: "codex_local_log",
      skill_id: input.skillId,
      capture_mode: input.captureMode,
      confidence_score: input.confidence,
      total_tokens: 120,
      tool_names: ["exec_command"],
      workflow_signals: ["verification_loop"],
      user_message_summary: input.summary
    }
  };
}

const mixedEvents = [
  event(1, {
    eventId: "estimated-start",
    eventType: "skill_run.started",
    runId: "estimated-run",
    turnRef: "estimated-turn",
    skillId: "skill-a",
    captureMode: "estimated",
    confidence: 0.82,
    occurredAt: "2026-07-15T01:01:00.000Z",
    summary: "Estimated turn"
  }),
  event(2, {
    eventId: "estimated-end",
    eventType: "skill_run.completed",
    runId: "estimated-run",
    turnRef: "estimated-turn",
    skillId: "skill-a",
    captureMode: "estimated",
    confidence: 0.82,
    occurredAt: "2026-07-15T01:01:01.000Z",
    summary: "Estimated turn"
  }),
  event(3, {
    eventId: "precise-start",
    eventType: "skill_run.started",
    runId: "precise-run",
    turnRef: "precise-turn",
    skillId: "skill-a",
    captureMode: "precise",
    confidence: 1,
    occurredAt: "2026-07-15T01:02:00.000Z",
    summary: "Precise turn"
  }),
  event(4, {
    eventId: "precise-end",
    eventType: "skill_run.completed",
    runId: "precise-run",
    turnRef: "precise-turn",
    skillId: "skill-a",
    captureMode: "precise",
    confidence: 1,
    occurredAt: "2026-07-15T01:02:01.000Z",
    summary: "Precise turn"
  })
];

service.ingestTelemetryEvents(mixedEvents, "/tmp/session.jsonl");
const mixedTraces = service.listSessionTraces({ limit: 20 });
const estimatedTurn = mixedTraces.find((entry) => entry.messageSummary === "Estimated turn");
const preciseTurn = mixedTraces.find((entry) => entry.messageSummary === "Precise turn");
assert(estimatedTurn?.captureMode === "estimated", "Estimated Turn must not inherit precise Session state.");
assert(estimatedTurn.confidence === 0.82, "Estimated Turn must preserve its own confidence.");
assert(preciseTurn?.captureMode === "precise", "Precise Turn must remain precise.");
assert(preciseTurn.skillHits[0]?.hitIndex === 100, "Precise Skill invocation must score 100.");
assert(
  service.listSessionTraces({ captureMode: "inferred", limit: 20 }).every((entry) => entry.captureMode !== "precise"),
  "Inferred filter must exclude precise Turns."
);

const sharedToolEvents = [
  event(5, {
    eventId: "multi-a-start",
    eventType: "skill_run.started",
    runId: "multi-a",
    turnRef: "multi-turn",
    skillId: "skill-a",
    captureMode: "estimated",
    confidence: 0.76,
    occurredAt: "2026-07-15T01:03:00.000Z",
    summary: "Multi Skill turn"
  }),
  event(6, {
    eventId: "multi-a-end",
    eventType: "skill_run.completed",
    runId: "multi-a",
    turnRef: "multi-turn",
    skillId: "skill-a",
    captureMode: "estimated",
    confidence: 0.76,
    occurredAt: "2026-07-15T01:03:01.000Z",
    summary: "Multi Skill turn"
  }),
  event(7, {
    eventId: "multi-b-start",
    eventType: "skill_run.started",
    runId: "multi-b",
    turnRef: "multi-turn",
    skillId: "skill-b",
    captureMode: "estimated",
    confidence: 0.74,
    occurredAt: "2026-07-15T01:03:00.100Z",
    summary: "Multi Skill turn"
  }),
  event(8, {
    eventId: "multi-b-end",
    eventType: "skill_run.completed",
    runId: "multi-b",
    turnRef: "multi-turn",
    skillId: "skill-b",
    captureMode: "estimated",
    confidence: 0.74,
    occurredAt: "2026-07-15T01:03:01.100Z",
    summary: "Multi Skill turn"
  })
];

service.ingestTelemetryEvents(sharedToolEvents, "/tmp/session.jsonl");
const multiTurn = service.listSessionTraces({ skillId: "skill-b", limit: 20 })
  .find((entry) => entry.messageSummary === "Multi Skill turn");
assert(multiTurn?.skillHits.length === 2, "Multi-Skill Turn must preserve both Skill hits.");
const multiDetail = service.getSessionTrace(multiTurn.traceId);
const toolSpans = multiDetail?.spans.filter((span) => span.spanType === "tool") ?? [];
assert(toolSpans.length === 1, "A shared inferred Tool must not be duplicated under every Skill.");
assert(toolSpans[0]?.metadata.association === "turn_shared", "Shared Tool must expose uncertain association.");

const eventCountBeforeRepeat = Number(
  (database.db.prepare(`SELECT COUNT(*) AS count FROM trace_events`).get() as { count: number }).count
);
service.ingestTelemetryEvents(sharedToolEvents, "/tmp/session.jsonl");
const eventCountAfterRepeat = Number(
  (database.db.prepare(`SELECT COUNT(*) AS count FROM trace_events`).get() as { count: number }).count
);
assert(eventCountAfterRepeat === eventCountBeforeRepeat, "Repeated imports must remain idempotent.");

const insertLegacyRun = database.db.prepare(
  `INSERT INTO skill_runs (
     id, skill_id, skill_version_id, capture_mode, confidence_score, source_type,
     started_at, finished_at, duration_ms, total_tokens, estimated_cost_usd,
     tool_call_count, status, summary_json
   ) VALUES (?, ?, ?, 'estimated', 0.68, 'codex_local_log', ?, ?, 1000, 200, 0, 1, 'completed', ?)`
);
const legacySummary = JSON.stringify({
  sessionRef: "legacy-session",
  sourceRef: "/tmp/legacy-session.jsonl",
  workspaceRef: "/tmp/project"
});
insertLegacyRun.run(
  "local-tool-aaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb",
  "skill-a",
  "version-skill-a",
  "2026-07-15T01:04:00.000Z",
  "2026-07-15T01:04:01.000Z",
  legacySummary
);
insertLegacyRun.run(
  "local-tool-aaaaaaaaaaaaaaaa-cccccccccccccccc",
  "skill-b",
  "version-skill-b",
  "2026-07-15T01:04:00.000Z",
  "2026-07-15T01:04:01.000Z",
  legacySummary
);
service.backfillLegacyRuns();
const legacyTurns = service.listSessionTraces({ query: "历史运行记录", limit: 20 });
assert(legacyTurns.length === 1, "Related legacy Skill runs must merge into one Turn.");
assert(legacyTurns[0]?.skillHits.length === 2, "Merged legacy Turn must retain both Skill hits.");
assert(legacyTurns[0]?.evidenceKind === "legacy_aggregate", "Legacy Turn must be labeled as an aggregate, not a message.");

const normalizedSessionUuid = "019f5f32-731e-7810-bb54-f51d1c23e4af";
service.ingestTelemetryEvents([
  {
    lineNumber: 301,
    record: {
      event_id: "event-session-path",
      event_type: "skill_run.started",
      run_id: "session-normalization-path",
      session_ref: `/tmp/rollout-2026-07-14T13-56-09-${normalizedSessionUuid}.jsonl`,
      turn_ref: "session-normalization-turn",
      source_type: "codex_local_log",
      source_ref: `/tmp/rollout-2026-07-14T13-56-09-${normalizedSessionUuid}.jsonl`,
      workspace_ref: "/tmp/project",
      skill_id: "skill-a",
      capture_mode: "estimated",
      occurred_at: "2026-07-14T05:56:27.764Z"
    }
  },
  {
    lineNumber: 302,
    record: {
      event_id: "event-session-id",
      event_type: "skill_run.completed",
      run_id: "session-normalization-id",
      session_ref: normalizedSessionUuid,
      turn_ref: "session-normalization-turn",
      source_type: "codex_local_log",
      source_ref: `/tmp/rollout-2026-07-14T13-56-09-${normalizedSessionUuid}.jsonl`,
      workspace_ref: "/tmp/project",
      skill_id: "skill-a",
      capture_mode: "estimated",
      occurred_at: "2026-07-14T05:56:28.764Z"
    }
  }
], "session-normalization-test");
const normalizedSessionCount = (database.db.prepare(
  `SELECT COUNT(*) AS count
   FROM trace_sessions
   WHERE source_ref = ?`
).get(`/tmp/rollout-2026-07-14T13-56-09-${normalizedSessionUuid}.jsonl`) as { count: number }).count;
assert(normalizedSessionCount === 1, "Session UUID and rollout path must resolve to one Trace Session.");
const normalizedSessionSearch = service.listSessionTraces({ query: normalizedSessionUuid, limit: 20 });
assert(normalizedSessionSearch.length === 1, "Session UUID search must return the normalized Trace Session Turn.");
assert(normalizedSessionSearch[0]?.sessionRef === normalizedSessionUuid, "Trace list items must expose the normalized Session ID.");
assert(
  normalizedSessionSearch[0]?.sourceRef?.includes(normalizedSessionUuid),
  "Trace list items must preserve the source log reference."
);

const adapterEvents: TraceTelemetryEventInput[] = [
  {
    lineNumber: 401,
    record: {
      schema_version: "1.0",
      event_id: "adapter-workflow-routed",
      event_type: "workflow.routed",
      occurred_at: "2026-07-15T01:05:00.000Z",
      adapter: { id: "codex-local", version: "0.1.0", protocol_version: "1.0" },
      harness: { id: "codex" },
      project: { workspace_ref: "/tmp/project" },
      session_id: "adapter-session",
      turn_id: "adapter-turn",
      run_id: "adapter-run",
      workflow_ref: { id: "scenario.design-to-frontend", version: "1.0.0", node_id: "implement" },
      privacy: { raw_prompt_stored: false, raw_output_stored: false, redaction_applied: true }
    }
  },
  {
    lineNumber: 402,
    record: {
      schema_version: "1.0",
      event_id: "adapter-skill-routed",
      event_type: "skill.routed",
      occurred_at: "2026-07-15T01:05:01.000Z",
      adapter: { id: "codex-local", version: "0.1.0", protocol_version: "1.0" },
      harness: { id: "codex" },
      project: { workspace_ref: "/tmp/project" },
      session_id: "adapter-session",
      turn_id: "adapter-turn",
      run_id: "adapter-run",
      workflow_ref: { id: "scenario.design-to-frontend", version: "1.0.0", node_id: "implement" },
      skill_ref: { id: "skill-a", name: "Skill A" },
      privacy: { raw_prompt_stored: false, raw_output_stored: false, redaction_applied: true }
    }
  },
  {
    lineNumber: 403,
    record: {
      schema_version: "1.0",
      event_id: "adapter-skill-invoked",
      event_type: "skill.invoked",
      occurred_at: "2026-07-15T01:05:02.000Z",
      adapter: { id: "codex-local", version: "0.1.0", protocol_version: "1.0" },
      harness: { id: "codex" },
      project: { workspace_ref: "/tmp/project" },
      session_id: "adapter-session",
      turn_id: "adapter-turn",
      run_id: "adapter-run",
      workflow_ref: { id: "scenario.design-to-frontend", version: "1.0.0", node_id: "implement" },
      skill_ref: { id: "skill-a", name: "Skill A" },
      usage: { source: "provider_reported", total_tokens: 321 },
      privacy: { raw_prompt_stored: false, raw_output_stored: false, redaction_applied: true }
    }
  },
  {
    lineNumber: 404,
    record: {
      schema_version: "1.0",
      event_id: "adapter-skill-completed",
      event_type: "skill.completed",
      occurred_at: "2026-07-15T01:05:03.000Z",
      adapter: { id: "codex-local", version: "0.1.0", protocol_version: "1.0" },
      harness: { id: "codex" },
      project: { workspace_ref: "/tmp/project" },
      session_id: "adapter-session",
      turn_id: "adapter-turn",
      run_id: "adapter-run",
      workflow_ref: { id: "scenario.design-to-frontend", version: "1.0.0", node_id: "implement" },
      skill_ref: { id: "skill-a", name: "Skill A" },
      privacy: { raw_prompt_stored: false, raw_output_stored: false, redaction_applied: true }
    }
  }
];
service.ingestTelemetryEvents(adapterEvents, "adapter-fixture");
const adapterTurn = service.listSessionTraces({ query: "adapter-session", limit: 20 })[0];
assert(adapterTurn?.harnessId === "codex", "Trusted Adapter event must retain its Harness ID.");
assert(adapterTurn?.adapterId === "codex-local", "Trusted Adapter event must retain its Adapter ID.");
assert(adapterTurn?.captureMode === "precise", "Trusted Adapter event must remain precise.");
assert(adapterTurn?.confidence === 1, "Trusted Adapter event must retain full confidence.");
assert(adapterTurn?.skillInvokedCount === 1, "Skill routing must not inflate precise invocation count.");
assert(adapterTurn?.skillHits[0]?.hitState === "completed", "Explicit Skill completion must retain its terminal state.");
const adapterDetail = service.getSessionTrace(adapterTurn.traceId);
const adapterWorkflowSpan = adapterDetail?.spans.find((span) => span.workflowId === "scenario.design-to-frontend");
assert(adapterWorkflowSpan?.captureMode === "precise", "Explicit Workflow event must create a precise Workflow Span.");
assert(adapterWorkflowSpan?.workflowNodeId === "implement", "Explicit Workflow node must remain attached to its Workflow Span.");

const traceCountBeforeRejectedEnvelope = Number(
  (database.db.prepare(`SELECT COUNT(*) AS count FROM trace_events`).get() as { count: number }).count
);
service.ingestTelemetryEvents([
  {
    lineNumber: 405,
    record: {
      schema_version: "1.0",
      event_id: "adapter-privacy-rejected",
      event_type: "skill.invoked",
      occurred_at: "2026-07-15T01:06:00.000Z",
      adapter: { id: "codex-local", version: "0.1.0", protocol_version: "1.0" },
      harness: { id: "codex" },
      project: { workspace_ref: "/tmp/project" },
      session_id: "privacy-session",
      turn_id: "privacy-turn",
      skill_ref: { id: "skill-a" },
      privacy: { raw_prompt_stored: true, raw_output_stored: false }
    }
  }
], "adapter-fixture");
const traceCountAfterRejectedEnvelope = Number(
  (database.db.prepare(`SELECT COUNT(*) AS count FROM trace_events`).get() as { count: number }).count
);
assert(traceCountAfterRejectedEnvelope === traceCountBeforeRejectedEnvelope, "Raw-content Adapter event must be rejected before Trace persistence.");

database.close();
rmSync(root, { recursive: true, force: true });
console.log("Trace Service integration passed: Turn evidence isolation, shared Tool attribution, idempotency, filters, legacy grouping, session normalization, Adapter envelopes, and privacy rejection.");
