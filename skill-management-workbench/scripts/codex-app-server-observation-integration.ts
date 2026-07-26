import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CodexAppServerObservationService,
  controlledVerificationPrompt,
  controlledVerificationTokenWatchdogLimit,
  inspectCodexAppServerSchema,
  normalizeCodexAppServerNotification
} from "../src/main/codex-app-server-observation-service";
import { WorkbenchDatabase } from "../src/main/database";
import { validateHarnessEventEnvelope } from "../src/main/harness-event";
import { ensureStorage } from "../src/main/storage";
import type { TraceService } from "../src/main/trace-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const schemaDirectory = mkdtempSync(join(tmpdir(), "skill-os-codex-app-server-schema-"));

try {
  writeFileSync(
    join(schemaDirectory, "codex_app_server_protocol.v2.schemas.json"),
    JSON.stringify({ title: "fixture-v2", paths: ["skills/list"] }),
    "utf8"
  );
  writeFileSync(
    join(schemaDirectory, "ServerNotification.json"),
    JSON.stringify({
      type: "object",
      properties: {
        method: {
          enum: [
            "thread/started",
            "turn/started",
            "item/started",
            "item/completed",
            "turn/completed",
            "thread/tokenUsage/updated",
            "skills/changed"
          ]
        }
      }
    }),
    "utf8"
  );

  const capability = inspectCodexAppServerSchema(schemaDirectory, "codex-cli fixture");
  assert(capability.supported, "Turn lifecycle support should enable the POC.");
  assert(capability.protocolVersion === "v2", "V2 schema should be selected when available.");
  assert(capability.lifecycleMethods.length === 6, "All approved lifecycle methods should be detected.");
  assert(!capability.supportsExactSkillEvents, "No explicit Skill event may be invented from a skills catalog notification.");

  const turnStarted = normalizeCodexAppServerNotification({
    projectRoot: "/tmp/fixture-project",
    capability,
    sequence: 1,
    message: {
      method: "turn/started",
      params: {
        threadId: "thread-fixture",
        turn: { id: "turn-fixture" },
        startedAtMs: 1_720_000_000_000
      }
    }
  });
  assert(turnStarted, "A whitelisted Turn lifecycle notification should normalize.");
  const validation = validateHarnessEventEnvelope(turnStarted);
  assert(validation.valid, `Normalized lifecycle envelope should validate: ${validation.reason ?? "unknown"}`);
  assert(turnStarted.capture_mode === "precise", "Lifecycle evidence should be marked precise.");
  assert(turnStarted.event_type === "app_server.turn.started", "The source event type should retain lifecycle semantics.");

  const threadStarted = normalizeCodexAppServerNotification({
    projectRoot: "/tmp/fixture-project",
    capability,
    sequence: 2,
    message: { method: "thread/started", params: { thread: { id: "thread-fixture" } } }
  });
  assert(threadStarted, "A Thread lifecycle notification should retain its exact thread evidence.");
  assert(String(threadStarted.turn_id).startsWith("thread_lifecycle:"), "Thread-only events should use an explicitly synthetic protocol carrier.");
  assert((threadStarted.metadata as Record<string, unknown>).thread_lifecycle_carrier === true, "Thread carriers must remain labeled in metadata.");

  const tokenUpdated = normalizeCodexAppServerNotification({
    projectRoot: "/tmp/fixture-project",
    capability,
    sequence: 3,
    message: {
      method: "thread/tokenUsage/updated",
      params: {
        threadId: "thread-fixture",
        turnId: "turn-fixture",
        tokenUsage: { total: { totalTokens: 321 } }
      }
    }
  });
  assert(tokenUpdated?.total_tokens === 321, "Nested App Server token totals should be preserved.");

  const itemStarted = normalizeCodexAppServerNotification({
    projectRoot: "/tmp/fixture-project",
    capability,
    sequence: 4,
    message: {
      method: "item/started",
      params: {
        threadId: "thread-fixture",
        turnId: "turn-fixture",
        item: {
          id: "item-fixture",
          type: "command_execution",
          command: "secret command that must never be stored",
          content: "private prompt output"
        }
      }
    }
  });
  assert(itemStarted, "A whitelisted Item lifecycle notification should normalize.");
  const serialized = JSON.stringify(itemStarted);
  assert(!serialized.includes("secret command"), "Raw command content must not enter the stored envelope.");
  assert(!serialized.includes("private prompt output"), "Raw item content must not enter the stored envelope.");
  assert(typeof (itemStarted.metadata as Record<string, unknown>).item_id_hash === "string", "Item identity should be hashed.");

  const unsupported = normalizeCodexAppServerNotification({
    projectRoot: "/tmp/fixture-project",
    capability,
    sequence: 5,
    message: { method: "skills/changed", params: { threadId: "thread-fixture", turnId: "turn-fixture" } }
  });
  assert(unsupported === null, "Skill catalog notifications must not be represented as Skill invocation evidence.");
} finally {
  rmSync(schemaDirectory, { recursive: true, force: true });
}

const controlledRoot = mkdtempSync(join(tmpdir(), "skill-os-controlled-verification-"));
const controlledProjectRoot = join(controlledRoot, "project");
const fakeCodexPath = join(controlledRoot, "fake-codex.cjs");
const controlledSchemaDirectory = join(controlledRoot, "app-server-schemas", "fixture-codex_1.0");
const observedEvents: unknown[] = [];
const controlledDatabase = new WorkbenchDatabase(ensureStorage(controlledRoot));

try {
  mkdirSync(controlledProjectRoot, { recursive: true });
  mkdirSync(controlledSchemaDirectory, { recursive: true });
  writeFileSync(
    join(controlledSchemaDirectory, "codex_app_server_protocol.v2.schemas.json"),
    JSON.stringify({ title: "fixture-v2", paths: ["skills/list"] }),
    "utf8"
  );
  writeFileSync(
    join(controlledSchemaDirectory, "ServerNotification.json"),
    JSON.stringify({
      type: "object",
      properties: {
        method: { enum: [
          "thread/started",
          "turn/started",
          "item/started",
          "item/completed",
          "turn/completed",
          "thread/tokenUsage/updated"
        ] }
      }
    }),
    "utf8"
  );
  writeFileSync(
    fakeCodexPath,
    `#!/usr/bin/env node
const readline = require("node:readline");
const args = process.argv.slice(2);
if (args[0] === "--version") { process.stdout.write("fixture-codex 1.0\\n"); process.exit(0); }
if (args[0] !== "app-server") process.exit(2);
function write(value) { process.stdout.write(JSON.stringify(value) + "\\n"); }
function response(id, result) { write({ id, result }); }
function failure(id) { write({ id, error: { code: -32000, message: "fixture rejected unsafe verification" } }); }
function event(method, params) { write({ method, params }); }
const input = readline.createInterface({ input: process.stdin });
input.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") return response(message.id, { serverInfo: { name: "fixture" } });
  if (message.method === "initialized") return;
  if (message.method === "thread/start") {
    const safe = message.params?.ephemeral === true && message.params?.sandbox === "read-only" && message.params?.approvalPolicy === "never";
    if (!safe) return failure(message.id);
    response(message.id, { thread: { id: "thread-controlled" } });
    return event("thread/started", { thread: { id: "thread-controlled" } });
  }
  if (message.method === "turn/start") {
    const text = message.params?.input?.[0]?.text;
    const safe = message.params?.approvalPolicy === "never" && message.params?.sandboxPolicy?.type === "readOnly" && message.params?.sandboxPolicy?.networkAccess === false && message.params?.effort === "minimal" && text === ${JSON.stringify(controlledVerificationPrompt)};
    if (!safe) return failure(message.id);
    response(message.id, { turn: { id: "turn-controlled" } });
    setTimeout(() => {
      event("turn/started", { threadId: "thread-controlled", turn: { id: "turn-controlled" } });
      event("item/started", { threadId: "thread-controlled", turnId: "turn-controlled", item: { id: "item-user", type: "userMessage" } });
      event("item/completed", { threadId: "thread-controlled", turnId: "turn-controlled", item: { id: "item-user", type: "userMessage" } });
      event("item/started", { threadId: "thread-controlled", turnId: "turn-controlled", item: { id: "item-agent", type: "agentMessage" } });
      event("item/completed", { threadId: "thread-controlled", turnId: "turn-controlled", item: { id: "item-agent", type: "agentMessage" } });
      event("thread/tokenUsage/updated", { threadId: "thread-controlled", turnId: "turn-controlled", tokenUsage: { total: { totalTokens: 42 } } });
      event("turn/completed", { threadId: "thread-controlled", turn: { id: "turn-controlled", status: "completed" } });
    }, 8);
    return;
  }
  if (message.method === "thread/archive" || message.method === "turn/interrupt") return response(message.id, {});
});
`,
    "utf8"
  );
  chmodSync(fakeCodexPath, 0o755);

  const traceService = {
    ingestTelemetryEvents: (events: Array<{ record: Record<string, unknown> }>) => {
      observedEvents.push(...events);
      return events.map((entry) =>
        entry.record.turn_id === "turn-controlled"
          ? "trace-controlled-turn"
          : "trace-thread-lifecycle"
      );
    }
  } as unknown as TraceService;
  const service = new CodexAppServerObservationService(controlledDatabase, traceService, fakeCodexPath);
  const observer = await service.startProjectObservation(controlledProjectRoot);
  assert(observer.state === "ready", "The fixture App Server observer should initialize before verification.");

  const verification = await service.runProjectControlledVerification(controlledProjectRoot);
  assert(verification.state === "completed", "The fixed read-only verification should complete through the App Server.");
  assert(verification.ephemeral && verification.sandbox === "readOnly" && verification.networkAccess === false, "Verification invariants must remain visible in the persisted summary.");
  assert(verification.approvalPolicy === "never", "Controlled verification must not request approvals.");
  assert(verification.totalTokens === 42 && verification.totalTokens < controlledVerificationTokenWatchdogLimit, "Adapter-reported token totals should remain bounded in the result.");
  assert(verification.itemTypes.join(",") === "userMessage,agentMessage", "Only safe item type names should be retained.");
  assert(verification.traceId === "trace-controlled-turn", "The verification must link only to its persisted Turn trace.");
  assert(verification.threadArchived, "The temporary verification thread must be archived after completion.");
  assert(verification.lifecycleEventCount === 8, "The verification should retain exact lifecycle event counts.");
  assert(observedEvents.length === 8, "The observer should receive the Thread and Turn lifecycle events.");

  const stored = controlledDatabase.db.prepare(
    `SELECT * FROM project_controlled_session_verifications WHERE project_root = ?`
  ).get(controlledProjectRoot) as Record<string, unknown>;
  const serialized = JSON.stringify(stored);
  assert(!serialized.includes(controlledVerificationPrompt), "The fixed prompt must never be stored in verification data.");
  assert(!serialized.includes("SKILL_OS_E2E_OK"), "Model output markers must not be stored in verification data.");
  assert(!serialized.includes("thread-controlled"), "Raw App Server Thread identifiers must not enter verification data.");
  assert(!serialized.includes("turn-controlled"), "Raw App Server Turn identifiers must not enter verification data.");
  service.stopAll();
} finally {
  controlledDatabase.db.close();
  rmSync(controlledRoot, { recursive: true, force: true });
}

console.log("Codex App Server observation integration passed: lifecycle-only mapping, privacy filtering, controlled-session guards, and temporary-thread archival are covered.");
