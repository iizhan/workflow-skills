import { closeSync, ftruncateSync, mkdirSync, mkdtempSync, openSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RegistryService } from "../src/main/registry-service";
import { AuthorizationService } from "../src/main/authorization-service";
import { WorkbenchDatabase } from "../src/main/database";
import { ensureStorage } from "../src/main/storage";
import { TelemetryService } from "../src/main/telemetry-service";
import { TraceService } from "../src/main/trace-service";
import {
  LocalToolTelemetryService,
  isSyntheticSubagentSessionRecord,
  isSyntheticUserMessageRecord,
  sanitizeUserMessageSummaryForStorage,
  stripSyntheticMessageBlocks
} from "../src/main/local-tool-telemetry-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const root = mkdtempSync(join(tmpdir(), "skill-os-harness-event-test-"));
const projectRoot = join(root, "project");
mkdirSync(projectRoot, { recursive: true });
const storagePaths = ensureStorage(root);
const database = new WorkbenchDatabase(storagePaths);
const authorizationService = new AuthorizationService(database);
const registryStub = { listSkills: () => [] } as unknown as RegistryService;
const traceService = new TraceService(database, registryStub);
const telemetryService = new TelemetryService(database, authorizationService, traceService);
const localToolTelemetryService = new LocalToolTelemetryService(
  database,
  authorizationService,
  telemetryService,
  storagePaths
);
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
traceService.setWorkflowBindingResolver({
  listProjectBindings: (rootPath) => rootPath === projectRoot
    ? [{
        bindingId: "binding-adapter",
        templateId: "scenario.design-to-frontend",
        templateVersion: "1.0.0",
        manifestFingerprint: "fixture-fingerprint",
        readOnly: false
      }]
    : []
});

authorizationService.grantAuthorization({
  name: "Harness event test",
  scanRoots: [projectRoot],
  scanExclusions: [],
  telemetryMode: "precise",
  allowRawContent: false,
  allowBackgroundWatch: false
});
assert(
  authorizationService.getActivePolicy()?.allowMessageSummary === false,
  "Sanitized message summaries must remain disabled by default."
);
authorizationService.updateActivePreferences({ allowMessageSummary: true });
assert(
  authorizationService.getActivePolicy()?.allowMessageSummary === true,
  "The active policy must persist the explicit message-summary preference."
);
const sanitizedSummary = sanitizeUserMessageSummaryForStorage({
  payload: {
    type: "message",
    role: "user",
    content: [{ type: "input_text", text: "请检查工作流命中。<environment_context>private system context</environment_context>" }]
  }
}, 1);
assert(sanitizedSummary === "请检查工作流命中。", "Synthetic context blocks must not enter the stored user-message summary.");
assert(
  stripSyntheticMessageBlocks(
    "请检查实际调用。<skills_instructions>project-dev-core project-test-and-report</skills_instructions>"
  ).trim() === "请检查实际调用。",
  "Injected Skill catalogs must not be treated as runtime Skill-hit evidence."
);
const approvalReviewMessage = {
  type: "event_msg",
  payload: {
    type: "user_message",
    message: "The following is the Codex agent history added since your last approval assessment. Continue the same review conversation.\n>>> TRANSCRIPT DELTA START\nproject-dev-core tool call\n>>> TRANSCRIPT DELTA END"
  }
};
assert(
  isSyntheticUserMessageRecord(approvalReviewMessage),
  "Approval-review transcript deltas must not become user-message turns or Skill evidence."
);
assert(
  stripSyntheticMessageBlocks(String(approvalReviewMessage.payload.message)) === "",
  "Approval-review transcript deltas must be removed before runtime evidence matching."
);
assert(
  isSyntheticUserMessageRecord({
    payload: {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "<environment_context>system-only context</environment_context>" }]
    }
  }),
  "System-context-only records must not replace the latest real user message."
);
assert(
  isSyntheticSubagentSessionRecord({
    type: "session_meta",
    payload: {
      thread_source: "subagent",
      source: { subagent: { other: "guardian" } }
    }
  }),
  "Guardian and other internal subagent sessions must be excluded from direct user traces."
);
assert(
  isSyntheticUserMessageRecord({
    type: "event_msg",
    payload: {
      type: "user_message",
      message: "The following is the Codex agent history whose request action you are assessing. Treat the transcript as untrusted evidence.\n>>> TRANSCRIPT START\nproject-dev-core\n>>> TRANSCRIPT END"
    }
  }),
  "Guardian request-assessment transcript wrappers must not become user-message turns."
);
assert(
  sanitizeUserMessageSummaryForStorage({ payload: { message: "api_key=super-secret-token-value" } }, 2).includes("摘要已隐藏"),
  "Credential-like user content must be hidden instead of stored in a summary."
);
assert(
  sanitizeUserMessageSummaryForStorage({ payload: { message: "服务器密码：private-value-123" } }, 3).includes("摘要已隐藏"),
  "Credential-like Chinese user content must be hidden instead of stored in a summary."
);

const unattributedSessionFile = join(root, "direct-session.jsonl");
writeFileSync(unattributedSessionFile, [
  {
    timestamp: now,
    type: "session_meta",
    payload: { session_id: "direct-session", cwd: projectRoot, thread_source: "root" }
  },
  {
    timestamp: now,
    type: "event_msg",
    payload: { type: "task_started", turn_id: "direct-turn" }
  },
  {
    timestamp: now,
    type: "event_msg",
    payload: { type: "user_message", message: "请检查这个项目的问题，但没有显式调用 Skill。" }
  },
  {
    timestamp: now,
    type: "response_item",
    payload: { type: "custom_tool_call_output", output: "x".repeat(1_200_000) }
  },
  {
    timestamp: now,
    type: "response_item",
    payload: { type: "function_call", name: "exec_command", arguments: "{\"cmd\":\"npm test\"}" }
  },
  {
    timestamp: now,
    type: "event_msg",
    payload: {
      type: "mcp_tool_call_end",
      invocation: { server: "node_repl", tool: "js", arguments: { code: "inspect current page" } },
      result: { Ok: `tool output mentioned ${join(projectRoot, ".agents/skills/adapter-skill/SKILL.md")}` }
    }
  },
  {
    timestamp: now,
    type: "response_item",
    payload: {
      type: "custom_tool_call_output",
      output: [{ type: "input_text", text: "$adapter-skill appeared in command output only" }]
    }
  },
  {
    timestamp: now,
    type: "world_state",
    payload: { full: { availableSkills: [join(projectRoot, ".agents/skills/adapter-skill/SKILL.md")] } }
  },
  {
    timestamp: now,
    type: "compacted",
    payload: { message: "System summary lists $adapter-skill for future turns." }
  },
  {
    timestamp: now,
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: { input_tokens: 900_000, output_tokens: 10_000, total_tokens: 910_000 },
        last_token_usage: { input_tokens: 40, output_tokens: 5, total_tokens: 45 }
      }
    }
  }
].map((record) => JSON.stringify(record)).join("\n") + "\n", "utf8");
const unattributedScan = await (localToolTelemetryService as unknown as {
  scanSource: (
    source: Record<string, unknown>,
    options: { projectRoot: string; mode: "full" | "incremental" }
  ) => Promise<{ events: Array<Record<string, unknown>>; preview: { warnings: string[] } }>;
}).scanSource({
  id: "direct-session-test",
  kind: "codex",
  label: "Direct session fixture",
  description: "fixture",
  path: unattributedSessionFile,
  pathType: "file",
  exists: true,
  status: "ready",
  recommended: true,
  privacyLevel: "high",
  fileCount: 1,
  byteCount: 1,
  lastModifiedAt: now,
  warnings: []
}, { projectRoot, mode: "incremental" });
assert(
  unattributedScan.events.some((event) => event.event_type === "turn.observed"),
  "A project-matched tool turn without a Skill name must remain visible as an unattributed Trace turn."
);
assert(
  !unattributedScan.events.some((event) => String(event.event_type).startsWith("skill_run.")),
  "System state and tool outputs that only mention Skill names must not inflate Skill invocation metrics."
);
const observedTurn = unattributedScan.events.find((event) => event.event_type === "turn.observed");
assert(
  observedTurn?.turn_ref === "direct-turn",
  "Task Turn IDs must remain the boundary for following user, tool and Token evidence."
);
assert(
  observedTurn?.user_message_summary === "请检查这个项目的问题，但没有显式调用 Skill。",
  "Incremental scans must recover the nearest sanitized user-message summary from a bounded prelude."
);
assert(
  observedTurn?.total_tokens === 45,
  "Codex Token evidence must use last_token_usage instead of the cumulative session total."
);

for (const name of [
  "project-workflow-router",
  "project-requirement-gate",
  "project-dev-core",
  "project-test-and-report",
  "project-verification-loop"
]) {
  const skillId = `skill-${name}`;
  database.db.prepare(
    `INSERT INTO skills (
       id, canonical_name, display_name, source_type, source_path, source_path_hash,
       owner_label, is_active, first_seen_at, last_seen_at
     ) VALUES (?, ?, ?, 'project', ?, ?, 'test', 1, ?, ?)`
  ).run(
    skillId,
    name,
    name,
    join(projectRoot, ".agents", "skills", name),
    `hash-${name}`,
    now,
    now
  );
  database.db.prepare(
    `INSERT INTO skill_versions (
       id, skill_id, version_fingerprint, content_hash, frontmatter_name,
       frontmatter_description, line_count, detected_at, is_current, metadata_json
     ) VALUES (?, ?, ?, ?, ?, 'test', 1, ?, 1, '{}')`
  ).run(`version-${name}`, skillId, `version-${name}`, `content-${name}`, name, now);
}

const oversizedSessionDir = join(root, ".codex", "sessions");
mkdirSync(oversizedSessionDir, { recursive: true });
const oversizedSessionFile = join(oversizedSessionDir, "large-project-session.jsonl");
writeFileSync(oversizedSessionFile, JSON.stringify({
  timestamp: now,
  type: "session_meta",
  payload: { session_id: "large-project-session", cwd: projectRoot, thread_source: "root" }
}) + "\n", "utf8");
const oversizedFd = openSync(oversizedSessionFile, "r+");
ftruncateSync(oversizedFd, 151 * 1024 * 1024);
writeSync(oversizedFd, "\n" + [
  {
    timestamp: now,
    type: "event_msg",
    payload: { type: "task_started", turn_id: "large-turn" }
  },
  {
    timestamp: now,
    type: "event_msg",
    payload: { type: "user_message", message: "请执行测试并给我自测结论。" }
  },
  {
    timestamp: now,
    type: "response_item",
    payload: { type: "function_call", name: "exec_command", arguments: "{\"cmd\":\"npm test\"}" }
  },
  {
    timestamp: now,
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        last_token_usage: { input_tokens: 60, output_tokens: 12, total_tokens: 72 }
      }
    }
  }
].map((record) => JSON.stringify(record)).join("\n") + "\n", 151 * 1024 * 1024);
closeSync(oversizedFd);
const oversizedScan = await (localToolTelemetryService as unknown as {
  scanSource: (
    source: Record<string, unknown>,
    options: { projectRoot: string; mode: "full" | "incremental" }
  ) => Promise<{ events: Array<Record<string, unknown>>; preview: { warnings: string[] } }>;
}).scanSource({
  id: "oversized-codex-session-test",
  kind: "codex",
  label: "Oversized Codex session fixture",
  description: "fixture",
  path: oversizedSessionFile,
  pathType: "file",
  exists: true,
  status: "ready",
  recommended: true,
  privacyLevel: "high",
  fileCount: 1,
  byteCount: 151 * 1024 * 1024,
  lastModifiedAt: now,
  warnings: []
}, { projectRoot, mode: "full" });
const oversizedSkillNames = new Set(
  oversizedScan.events
    .filter((event) => event.event_type === "skill_run.started")
    .map((event) => String(event.skill_name))
);
assert(
  oversizedScan.preview.warnings.some((warning) => warning.includes("bounded recent-window reader")),
  "Oversized Codex sessions must be scanned through the bounded recent-window path."
);
assert(
  oversizedSkillNames.has("project-test-and-report") &&
    oversizedSkillNames.has("project-verification-loop"),
  "Project workflow signals from oversized Codex sessions must create inferred project Skill evidence."
);
assert(
  oversizedScan.events.some(
    (event) => event.skill_name === "project-test-and-report" && event.capture_mode === "inferred"
  ),
  "Workflow-derived Skill evidence must be explicitly labeled as inferred."
);

const duplicateSkillRoot = join(root, "another-project", ".agents", "skills", "adapter-skill");
database.db.prepare(
  `INSERT INTO skills (
     id, canonical_name, display_name, source_type, source_path, source_path_hash,
     owner_label, is_active, first_seen_at, last_seen_at
   ) VALUES ('skill-adapter-duplicate', 'Adapter Skill', 'Adapter Skill', 'project', ?, 'hash-adapter-duplicate', 'test', 1, ?, ?)`
).run(duplicateSkillRoot, now, now);
const attributedSessionFile = join(root, "attributed-session.jsonl");
writeFileSync(attributedSessionFile, [
  {
    timestamp: now,
    type: "session_meta",
    payload: { session_id: "attributed-session", cwd: projectRoot, thread_source: "root" }
  },
  {
    timestamp: now,
    type: "event_msg",
    payload: { type: "task_started", turn_id: "attributed-turn" }
  },
  {
    timestamp: now,
    type: "event_msg",
    payload: { type: "user_message", message: "请按项目 Skill 完成检查。" }
  },
  {
    timestamp: now,
    type: "response_item",
    payload: {
      type: "function_call",
      name: "exec_command",
      arguments: JSON.stringify({ cmd: `sed -n '1,220p' ${join(projectRoot, ".agents/skills/adapter-skill/SKILL.md")}` })
    }
  }
].map((record) => JSON.stringify(record)).join("\n") + "\n", "utf8");
const attributedScan = await (localToolTelemetryService as unknown as {
  scanSource: (
    source: Record<string, unknown>,
    options: { projectRoot: string; mode: "full" | "incremental" }
  ) => Promise<{ events: Array<Record<string, unknown>> }>;
}).scanSource({
  id: "attributed-session-test",
  kind: "codex",
  label: "Attributed session fixture",
  description: "fixture",
  path: attributedSessionFile,
  pathType: "file",
  exists: true,
  status: "ready",
  recommended: true,
  privacyLevel: "high",
  fileCount: 1,
  byteCount: 1,
  lastModifiedAt: now,
  warnings: []
}, { projectRoot, mode: "incremental" });
const attributedSkillEvent = attributedScan.events.find(
  (event) => event.event_type === "skill_run.started"
);
assert(
  attributedSkillEvent?.skill_id === "skill-adapter" &&
    attributedSkillEvent?.skill_path === join(projectRoot, ".agents/skills/adapter-skill"),
  "Duplicate Skill names must resolve to the Skill copy inside the current project."
);

const connectionBaselineService = localToolTelemetryService as unknown as {
  checkProjectConnection: (projectRoot: string) => Record<string, unknown>;
  discoverSources: () => Promise<Array<Record<string, unknown>>>;
  scanSource: () => Promise<{
    preview: Record<string, unknown>;
    events: Array<Record<string, unknown>>;
    matchedWorkspaceRef: string | null;
    latestObservedWorkspaceRef: string | null;
  }>;
};
connectionBaselineService.checkProjectConnection = () => ({
  projectRoot,
  refreshedAt: now,
  status: "connected_no_skill_runs",
  telemetryMode: "precise",
  sourcesChecked: 1,
  importableRuns: 0,
  importedRuns: 0,
  updatedRuns: 0,
  affectedSkills: 0,
  affectedSkillIds: [],
  matchedWorkspaceRef: projectRoot,
  latestObservedWorkspaceRef: join(root, "another-project"),
  warnings: [],
  errors: [],
  sourcePreviews: []
});
connectionBaselineService.discoverSources = async () => [{
  id: "codex-sessions",
  kind: "codex",
  label: "Codex sessions",
  description: "fixture",
  path: root,
  pathType: "directory",
  exists: true,
  status: "ready",
  recommended: true,
  privacyLevel: "high",
  fileCount: 1,
  byteCount: 1,
  lastModifiedAt: now,
  warnings: []
}];
connectionBaselineService.scanSource = async () => ({
  preview: {
    candidateFiles: 1,
    readableFiles: 1,
    scannedLines: 1,
    detectedEvents: 0,
    detectedRuns: 0,
    importableRuns: 0,
    detectedSkillNames: [],
    detectedToolNames: [],
    detectedModelNames: [],
    tokenFieldsDetected: false,
    sensitiveFieldCount: 0,
    confidence: "none",
    normalizedEventCount: 0,
    warnings: [`No local session cwd matched ${projectRoot}. Latest observed workspace: ${join(root, "another-project")}.`]
  },
  events: [],
  matchedWorkspaceRef: null,
  latestObservedWorkspaceRef: join(root, "another-project")
});
const connectionBaselineResult = await localToolTelemetryService.refreshProjectRuntimeEvidence(projectRoot);
assert(
  connectionBaselineResult.status === "connected_no_skill_runs" &&
    connectionBaselineResult.matchedWorkspaceRef === projectRoot,
  "A matching Codex project in the state database must survive an incremental window that only sees another project."
);
assert(
  !connectionBaselineResult.warnings.some((warning) => warning.startsWith("No local session cwd matched")),
  "A matched project must not display an incremental-window workspace mismatch warning."
);

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
const routeSpan = detail?.spans.find((span) => span.spanType === "system_route");
assert(routeSpan?.captureMode === "precise", "Trusted route events must produce a precise system route span.");
assert(routeSpan?.confidence === 1, "Trusted route events must carry full route confidence.");
assert(
  Array.isArray(routeSpan?.metadata.workflowTargets) && routeSpan.metadata.workflowTargets.includes("scenario.design-to-frontend"),
  "System route evidence must expose the routed Workflow target."
);
assert(
  Array.isArray(routeSpan?.metadata.skillTargets) && routeSpan.metadata.skillTargets.includes("Adapter Skill"),
  "System route evidence must expose the routed Skill target."
);
assert(detail?.spans.some((span) => span.workflowId === "scenario.design-to-frontend" && span.workflowNodeId === "implement"), "Workflow identity and node must survive the JSONL import.");
const workflowSpan = detail?.spans.find((span) => span.workflowId === "scenario.design-to-frontend");
assert(workflowSpan?.workflowBinding?.state === "current_binding_match", "Workflow traces must expose current project binding correlation.");
assert(workflowSpan?.workflowBinding?.bindingId === "binding-adapter", "Workflow binding correlation must retain the binding identity.");
assert(workflowSpan?.workflowBinding?.manifestFingerprint === "fixture-fingerprint", "Workflow binding correlation must retain the manifest fingerprint.");
assert(!detail?.events.some((event) => event.id === "raw-content-rejected"), "Raw-content event must not enter Trace storage.");

database.db.prepare(
  `INSERT INTO skill_runs (
     id, skill_id, skill_version_id, capture_mode, confidence_score, source_type,
     workspace_ref, started_at, first_output_at, finished_at, duration_ms,
     prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, model_name,
     tool_call_count, status, error_code, error_summary, summary_json
   ) VALUES (
     'legacy-local-run', 'skill-adapter', 'version-adapter', 'estimated', 0.4, 'codex_local_log',
     ?, ?, NULL, ?, 1000, 10, 20, 30, 0, 'codex-test', 1, 'completed', NULL, NULL, '{}'
   )`
).run(projectRoot, now, now);
database.db.prepare(
  `INSERT INTO trace_sessions (
     id, project_id, harness_id, adapter_id, workspace_ref, source_ref,
     started_at, last_observed_at, ended_at, status, capture_mode, confidence, summary_json
   ) VALUES (
     'legacy-local-session', 'project-adapter', 'codex', 'codex-local', ?, 'legacy-local.jsonl',
     ?, ?, ?, 'completed', 'estimated', 0.4, '{}'
   )`
).run(projectRoot, now, now, now);
database.db.prepare(
  `INSERT INTO trace_turns (
     id, session_id, trace_id, sequence, user_message_summary, message_hash,
     received_at, completed_at, status, skill_candidate_count, skill_invoked_count,
     total_tokens, duration_ms, capture_mode, confidence, source_run_ref, summary_json
   ) VALUES (
     'legacy-local-turn', 'legacy-local-session', 'legacy-local-trace', 1,
     '系统合成历史消息', 'legacy-hash', ?, ?, 'completed', 1, 0,
     30, 1000, 'estimated', 0.4, 'legacy-local-run', '{}'
   )`
).run(now, now);
database.db.prepare(
  `INSERT INTO trace_events (
     id, trace_id, turn_id, span_id, sequence, event_type, occurred_at,
     source_type, source_ref, capture_mode, evidence_hash, payload_json
   ) VALUES (
     'legacy-local-event', 'legacy-local-trace', 'legacy-local-turn', NULL, 1,
     'skill_run.completed', ?, 'codex_local_log', 'legacy-local.jsonl',
     'estimated', 'legacy-evidence', '{}'
   )`
).run(now);
const repairResult = traceService.repairLegacyEstimatedLocalTelemetry();
assert(repairResult?.deletedSkillRuns === 1, "Legacy local inferred Skill runs must be removed exactly once.");
assert(repairResult?.deletedTraceTurns === 1, "Legacy local inferred Trace turns must be removed exactly once.");
assert(
  Number((database.db.prepare(`SELECT COUNT(*) AS count FROM skill_runs WHERE id = 'legacy-local-run'`).get() as { count: number }).count) === 0,
  "Legacy local inferred runs must not remain after repair."
);
assert(
  Number((database.db.prepare(
    `SELECT COUNT(*) AS count FROM trace_turns WHERE trace_id = ? AND capture_mode = 'precise'`
  ).get(trace.traceId) as { count: number }).count) === 1,
  "Precise Harness evidence must survive legacy local telemetry repair."
);
assert(
  traceService.repairLegacyEstimatedLocalTelemetry() === null,
  "Legacy local telemetry repair must be idempotent after its migration marker is stored."
);
const compactionResult = traceService.compactRepairedLegacyTelemetryStorage();
assert(compactionResult?.compacted === true, "A repair that deleted local telemetry must compact SQLite storage once.");
assert(
  traceService.compactRepairedLegacyTelemetryStorage() === null,
  "Legacy telemetry storage compaction must be idempotent after its migration marker is stored."
);

database.close();
rmSync(root, { recursive: true, force: true });
console.log("Harness event integration passed: JSONL import, precise trace attribution, workflow linkage, metric isolation, and privacy rejection.");
