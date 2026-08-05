import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkbenchDatabase } from "../src/main/database";
import { ModelEvaluationService, type SecretProtector } from "../src/main/model-evaluation-service";
import { ensureStorage } from "../src/main/storage";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

let availabilityChecks = 0;
let availabilityState: "unchecked" | "system_secure" | "unavailable" = "unchecked";
const protector: SecretProtector = {
  isAvailable: () => {
    availabilityChecks += 1;
    availabilityState = "system_secure";
    return true;
  },
  encrypt: (value) => Buffer.from(`encrypted:${value}`, "utf8"),
  decrypt: (value) => value.toString("utf8").replace(/^encrypted:/, ""),
  availabilityState: () => availabilityState
};

const fixtureCases = JSON.stringify({
  cases: [
    {
      title: "Expected route",
      scenario: "Submit a controlled implementation request and require design, plan, impact, and confirmation before editing.",
      expectedSignals: ["Workflow router selected", "Confirmation gate recorded"],
      rejectionSignals: ["Editing starts without approval"],
      evidenceToCollect: ["Session trace", "Versioned design record"]
    },
    {
      title: "Near miss",
      scenario: "Submit an unrelated small documentation request and confirm the selected development workflow stays out of context.",
      expectedSignals: ["Narrow alternative route selected"],
      rejectionSignals: ["Selected workflow invoked without evidence"],
      evidenceToCollect: ["Session trace", "Context token comparison"]
    }
  ]
});

const requests: Array<{ url: string; authorization: string | null; body: Record<string, unknown> }> = [];
const fetchMock = async (url: string | URL | Request, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
  requests.push({ url: String(url), authorization: headers.get("authorization"), body });
  const prompt = JSON.stringify(body.messages ?? []);
  const content = prompt.includes("Create adversarial") ? fixtureCases : "READY";
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
};

const root = mkdtempSync(join(tmpdir(), "skill-os-model-evaluation-test-"));
const database = new WorkbenchDatabase(ensureStorage(root));
const service = new ModelEvaluationService(database, protector, fetchMock as typeof fetch);

try {
  const initial = service.getConfig();
  assert(!initial.hasApiKey && initial.lastTestStatus === "not_tested", "Default model configuration must be inert.");
  assert(initial.secretStorage === "unchecked", "Secure storage must remain unchecked until a key action requires it.");
  assert(availabilityChecks === 0, "Reading model settings must not synchronously query the system Keychain.");

  let rejectedInsecureEndpoint = false;
  try {
    service.saveConfig({
      providerLabel: "Fixture provider",
      endpointUrl: "http://example.test/v1",
      modelName: "fixture",
      enabled: false,
      allowSourceUpload: false
    });
  } catch {
    rejectedInsecureEndpoint = true;
  }
  assert(rejectedInsecureEndpoint, "Non-local HTTP endpoints must be rejected.");

  const saved = service.saveConfig({
    providerLabel: "Fixture provider",
    endpointUrl: "https://provider.example/v1",
    modelName: "fixture-model",
    enabled: true,
    allowSourceUpload: true,
    apiKey: "fixture-secret"
  });
  assert(saved.enabled && saved.hasApiKey, "Enabled model configuration must report a saved key without returning it.");
  assert(saved.secretStorage === "system_secure" && availabilityChecks === 1, "Saving a key must check secure storage exactly when needed.");
  assert(!("apiKey" in saved), "Configuration response must never return the API key.");

  const encryptedRow = database.db
    .prepare(`SELECT encrypted_api_key FROM model_evaluation_config WHERE id = 'default'`)
    .get() as { encrypted_api_key: Buffer };
  assert(!encryptedRow.encrypted_api_key.equals(Buffer.from("fixture-secret", "utf8")), "Database must not store the API key in plaintext.");

  const connection = await service.testConnection();
  assert(connection.status === "ready", "Configured provider connection should become ready.");
  assert(requests[0]?.url === "https://provider.example/v1/chat/completions", "Endpoint must normalize to chat completions.");
  assert(requests[0]?.authorization === "Bearer fixture-secret", "Only the main-process request may read the decrypted key.");

  const generated = await service.generateTestCases({
    targetType: "skill",
    targetId: "fixture-skill",
    targetName: "Fixture Skill",
    sourceText: "# Fixture Skill\nRequire explicit routing and verification.",
    focus: "false positives",
    maxCases: 4
  });
  assert(generated.testCases.length === 2, "Structured provider cases must be parsed and returned.");
  assert(generated.testCases.every((item) => item.expectedSignals.length > 0 && item.evidenceToCollect.length > 0), "Generated cases must have expected signals and evidence collection requirements.");
  assert(generated.limitations.some((item) => item.includes("not proof")), "Generated results must disclose their execution limitation.");

  const cleared = service.saveConfig({
    providerLabel: "Fixture provider",
    endpointUrl: "https://provider.example/v1",
    modelName: "fixture-model",
    enabled: false,
    allowSourceUpload: false,
    clearApiKey: true
  });
  assert(!cleared.hasApiKey && !cleared.enabled, "Clearing the API key must disable model evaluation.");
} finally {
  database.close();
  rmSync(root, { recursive: true, force: true });
}

console.log("Model evaluation integration passed: secure configuration, endpoint policy, connection status, structured cases, and key clearing are covered.");
