import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RegistryService } from "../src/main/registry-service";
import { AuthorizationService } from "../src/main/authorization-service";
import { WorkbenchDatabase } from "../src/main/database";
import { ensureStorage } from "../src/main/storage";
import { TelemetryService } from "../src/main/telemetry-service";
import { TraceService } from "../src/main/trace-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const root = mkdtempSync(join(tmpdir(), "skill-os-harness-event-test-"));
const projectRoot = join(root, "project");
const database = new WorkbenchDatabase(ensureStorage(root));
const authorizationService = new AuthorizationService(database);
const registryStub = { listSkills: () => [] } as unknown as RegistryService;
const traceService = new TraceService(database, registryStub);
const telemetryService = new TelemetryService(database, authorizationService, traceService);
const now = "2026-07-22T08:00:00.000Z";

database.db.prepare(
  `INSERT INTO skills (
     id, canonical_name, display_name, source_type, source_path, source_path_hash,
     owner_label, is_active, first_seen_at, last_seen_at
   ) VALUES ('skill-adapter', 'Adapter Skill', 'Adapter Skill', 'project', ?, 'hash-adapter', 'test', 1, ?, ?)`
).run(join(projectRoot, ".agents/skills/adapter-skill"), now, now);
database.db.prepare(
  `INSERT INTO skill_versions (
     id, skill_id, version_fingerprint, content_hash, frontmatter_name,
     frontmatter_description, line_count, detected_at, is_current, metadata_json
   ) VALUES ('version-adapter', 'skill-adapter', 'version-adapter', 'content-adapter', 'Adapter Skill', 'test', 1, ?, 1, '{}')`
).run(now);
database.db.prepare(
  `INSERT INTO managed_projects (
     id, name, path, bound_at, last_focused_at, workflow_applied,
     monitoring_enabled, monitoring_interval_ms, updated_at
   ) VALUES ('project-adapter', 'Adapter Project', ?, ?, ?, 1, 0, 60000, ?)`
).run(projectRoot, now, now, now);

authorizationService.grantAuthorization({
  name: "Harness event test",
  scanRoots: [projectRoot],
  scanExclusions: [],
  telemetryMode: "precise",
  allowRawContent: false,
  allowBackgroundWatch: false
});

const eventBase = {
  schema_version: "1.0",
  adapter: { id: "codex-local", version: "0.1.0", protocol_version: "1.0" },
  harness: { id: "codex" },
  project: { workspace_ref: projectRoot },
  session_id: "adapter-session",
  turn_id: "adapter-turn",
  run_id: "adapter-run",
  workflow_ref: { id: "scenario.design-to-frontend", version: "1.0.0", node_id: "implement" },
  skill_ref: { id: "skill-adapter", name: "Adapter Skill" },
  privacy: { raw_prompt_stored: false, raw_output_stored: false, redaction_applied: true }
};
const eventFile = join(root, "adapter-events.jsonl");
writeFileSync(eventFile, [
  {
    ...eventBase,
    event_id: "workflow-route",
    event_type: "workflow.routed",
    occurred_at: "2026-07-22T08:00:00.000Z"
  },
  {
    ...eventBase,
    event_id: "skill-route",
    event_type: "skill.routed",
    occurred_at: "2026-07-22T08:00:01.000Z"
  },
  {
    ...eventBase,
    event_id: "skill-invoked",
    event_type: "skill.invoked",
    occurred_at: "2026-07-22T08:00:02.000Z",
    usage: { source: "provider_reported", total_tokens: 88 }
  },
  {
    ...eventBase,
    event_id: "skill-completed",
    event_type: "skill.completed",
    occurred_at: "2026-07-22T08:00:03.000Z",
    usage: { source: "provider_reported", total_tokens: 88 }
  },
  {
    ...eventBase,
    event_id: "raw-content-rejected",
    event_type: "skill.invoked",
    occurred_at: "2026-07-22T08:00:04.000Z",
    privacy: { raw_prompt_stored: true, raw_output_stored: false }
  }
].map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");

const result = await telemetryService.importJsonlFile(eventFile);
assert(result.importedRuns === 1, "Explicit Skill invocation and completion must create one runtime metric.");
assert(result.processedEvents === 4, "Trace-only Workflow and Skill route events must be accepted without a metric run.");
assert(result.errorCount === 1, "Raw-content Adapter event must be rejected with an import error.");
const trace = traceService.listSessionTraces({ query: "adapter-session", limit: 10 })[0];
assert(trace?.captureMode === "precise", "Trusted JSONL event must remain precise after telemetry import.");
assert(trace?.confidence === 1, "Trusted JSONL event must report full Adapter confidence.");
assert(trace?.skillInvokedCount === 1, "Skill routing must not inflate telemetry invocation metrics.");
assert(trace?.totalTokens === 88, "Provider-reported Token usage must survive the Trace import.");
const detail = traceService.getSessionTrace(trace.traceId);
assert(detail?.spans.some((span) => span.workflowId === "scenario.design-to-frontend" && span.workflowNodeId === "implement"), "Workflow identity and node must survive the JSONL import.");
assert(!detail?.events.some((event) => event.id === "raw-content-rejected"), "Raw-content event must not enter Trace storage.");

database.close();
rmSync(root, { recursive: true, force: true });
console.log("Harness event integration passed: JSONL import, precise trace attribution, workflow linkage, metric isolation, and privacy rejection.");
