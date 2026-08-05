import type {
  GeneratedEvaluationCase,
  ModelEvaluationCaseGenerationInput,
  ModelEvaluationCaseGenerationResult,
  ModelEvaluationConfig,
  ModelEvaluationConfigInput,
  ModelEvaluationConnectionStatus,
  ModelEvaluationConnectionTestResult
} from "../shared/types";
import type { WorkbenchDatabase } from "./database";

const configId = "default" as const;
const maxSourceChars = 16_000;
const maxProviderErrorChars = 240;

export interface SecretProtector {
  isAvailable(): boolean;
  encrypt(value: string): Buffer;
  decrypt(value: Buffer): string;
  availabilityState?(): ModelEvaluationConfig["secretStorage"];
}

type FetchLike = typeof fetch;

type GenerateInput = ModelEvaluationCaseGenerationInput & {
  targetName: string;
  sourceText: string;
};

type ConfigRow = Record<string, unknown> & {
  encrypted_api_key?: Buffer | Uint8Array | null;
};

function nowIso() {
  return new Date().toISOString();
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function booleanValue(value: unknown) {
  return value === 1 || value === true;
}

function normalizeEndpoint(value: string) {
  const candidate = value.trim();
  if (!candidate) {
    throw new Error("Model endpoint is required.");
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Model endpoint must be a valid URL.");
  }

  const hostname = url.hostname.toLocaleLowerCase("en-US");
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("Model endpoints must use HTTPS, except a local localhost endpoint.");
  }

  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

function completionUrl(endpointUrl: string) {
  return endpointUrl.endsWith("/chat/completions")
    ? endpointUrl
    : `${endpointUrl.replace(/\/$/, "")}/chat/completions`;
}

function bounded(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function toBuffer(value: Buffer | Uint8Array | null | undefined) {
  return value ? Buffer.from(value) : null;
}

function providerErrorMessage(payload: unknown, status: number) {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const error = record?.error && typeof record.error === "object" ? (record.error as Record<string, unknown>) : null;
  const message = stringValue(error?.message ?? record?.message, "").replace(/\s+/g, " ").trim();
  return message
    ? `Provider returned ${status}: ${message.slice(0, maxProviderErrorChars)}`
    : `Provider returned HTTP ${status}.`;
}

function responseContent(payload: unknown) {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const choices = Array.isArray(record?.choices) ? record.choices : [];
  const first = choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>) : null;
  const message = first?.message && typeof first.message === "object" ? (first.message as Record<string, unknown>) : null;
  const content = message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => (item && typeof item === "object" ? stringValue((item as Record<string, unknown>).text) : ""))
      .join("\n")
      .trim();
  }
  return "";
}

function parseJsonObject(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced ?? value).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("The model did not return a JSON object for the test cases.");
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  } catch {
    throw new Error("The model returned malformed JSON for the test cases.");
  }
}

function stringList(value: unknown, limit = 6) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function parseGeneratedCases(value: string, maxCases: number): GeneratedEvaluationCase[] {
  const payload = parseJsonObject(value);
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const cases = Array.isArray(record?.cases) ? record.cases : [];
  const parsed = cases
    .slice(0, maxCases)
    .map((entry, index) => {
      const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
      const title = bounded(stringValue(item?.title), 120);
      const scenario = bounded(stringValue(item?.scenario), 800);
      const expectedSignals = stringList(item?.expectedSignals);
      const rejectionSignals = stringList(item?.rejectionSignals);
      const evidenceToCollect = stringList(item?.evidenceToCollect);
      if (!title || !scenario || expectedSignals.length === 0 || evidenceToCollect.length === 0) {
        return null;
      }
      return {
        id: `ai-case-${index + 1}`,
        title,
        scenario,
        expectedSignals,
        rejectionSignals,
        evidenceToCollect
      };
    })
    .filter((item): item is GeneratedEvaluationCase => Boolean(item));

  if (parsed.length === 0) {
    throw new Error("The model response did not contain usable structured test cases.");
  }
  return parsed;
}

export class ModelEvaluationService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly secretProtector: SecretProtector,
    private readonly fetchImpl: FetchLike = fetch
  ) {}

  getConfig(): ModelEvaluationConfig {
    return this.toConfig(this.getRow());
  }

  saveConfig(input: ModelEvaluationConfigInput): ModelEvaluationConfig {
    const existing = this.getRow();
    const endpointUrl = normalizeEndpoint(input.endpointUrl);
    const providerLabel = bounded(input.providerLabel || "OpenAI compatible", 80);
    const modelName = bounded(input.modelName, 160);
    if (!modelName) {
      throw new Error("Model name is required.");
    }
    if (input.clearApiKey && input.apiKey?.trim()) {
      throw new Error("Choose either a new API key or clear the existing key, not both.");
    }

    const existingKey = toBuffer(existing?.encrypted_api_key);
    const newApiKey = input.apiKey?.trim() ?? "";
    if (newApiKey && !this.secretProtector.isAvailable()) {
      throw new Error("System secure storage is unavailable, so Skill OS will not store an API key.");
    }
    const nextKey = input.clearApiKey
      ? null
      : newApiKey
        ? this.secretProtector.encrypt(newApiKey)
        : existingKey;

    if (input.enabled && !nextKey) {
      throw new Error("Save an API key before enabling AI-assisted evaluation.");
    }

    const changed =
      !existing ||
      stringValue(existing.endpoint_url) !== endpointUrl ||
      stringValue(existing.model_name) !== modelName ||
      Boolean(newApiKey) ||
      Boolean(input.clearApiKey);
    const timestamp = nowIso();
    this.database.db
      .prepare(
        `INSERT INTO model_evaluation_config (
           id, provider, provider_label, endpoint_url, model_name, encrypted_api_key,
           enabled, allow_source_upload, updated_at, last_tested_at, last_test_status, last_test_message
         ) VALUES (?, 'openai_compatible', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           provider = excluded.provider,
           provider_label = excluded.provider_label,
           endpoint_url = excluded.endpoint_url,
           model_name = excluded.model_name,
           encrypted_api_key = excluded.encrypted_api_key,
           enabled = excluded.enabled,
           allow_source_upload = excluded.allow_source_upload,
           updated_at = excluded.updated_at,
           last_tested_at = excluded.last_tested_at,
           last_test_status = excluded.last_test_status,
           last_test_message = excluded.last_test_message`
      )
      .run(
        configId,
        providerLabel || "OpenAI compatible",
        endpointUrl,
        modelName,
        nextKey,
        input.enabled ? 1 : 0,
        input.allowSourceUpload ? 1 : 0,
        timestamp,
        changed ? null : nullableString(existing?.last_tested_at),
        changed ? "not_tested" : this.normalizedStatus(existing?.last_test_status),
        changed ? null : nullableString(existing?.last_test_message)
      );

    return this.getConfig();
  }

  async testConnection(): Promise<ModelEvaluationConnectionTestResult> {
    const startedAt = Date.now();
    const testedAt = nowIso();
    try {
      const config = this.requireReadyConfig();
      const content = await this.requestCompletion(config, "Reply with exactly READY.", 16);
      if (!content) {
        throw new Error("Provider returned no assistant content.");
      }
      const latencyMs = Date.now() - startedAt;
      const message = `Connected to ${config.providerLabel} using ${config.modelName}.`;
      this.recordConnectionResult("ready", testedAt, message);
      return { status: "ready", testedAt, latencyMs, message };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Model connection test failed.";
      this.recordConnectionResult("failed", testedAt, message);
      return { status: "failed", testedAt, latencyMs: Date.now() - startedAt, message };
    }
  }

  async generateTestCases(input: GenerateInput): Promise<ModelEvaluationCaseGenerationResult> {
    const config = this.requireReadyConfig();
    if (!config.allowSourceUpload) {
      throw new Error("Enable source upload in AI evaluation settings before generating cases from a Skill or workflow.");
    }

    const maxCases = Math.max(1, Math.min(Math.round(input.maxCases ?? 4), 6));
    const sourceText = input.sourceText.slice(0, maxSourceChars);
    if (!sourceText.trim()) {
      throw new Error("The selected evaluation target has no readable source content.");
    }
    const focus = bounded(input.focus ?? "", 600) || "routing precision, confirmation gates, scope protection, and verification evidence";
    const content = await this.requestCompletion(
      config,
      [
        "You are a software workflow evaluation designer.",
        "Create adversarial but actionable test cases for the supplied Skill or workflow contract.",
        "Do not claim to have executed the workflow. Produce only candidate tests for a human or harness to run.",
        `Return JSON only: {\"cases\":[{\"title\":string,\"scenario\":string,\"expectedSignals\":string[],\"rejectionSignals\":string[],\"evidenceToCollect\":string[]}]}. Return at most ${maxCases} cases.`,
        `Evaluation focus: ${focus}`,
        `Target: ${input.targetName} (${input.targetType})`,
        "--- BEGIN TARGET SOURCE ---",
        sourceText,
        "--- END TARGET SOURCE ---"
      ].join("\n\n"),
      1_600
    );
    const testCases = parseGeneratedCases(content, maxCases);

    return {
      generatedAt: nowIso(),
      targetType: input.targetType,
      targetId: input.targetId,
      targetName: input.targetName,
      modelName: config.modelName,
      sourceCharsSent: sourceText.length,
      testCases,
      limitations: [
        "AI-generated cases are candidate test designs, not proof that the Skill or workflow executed.",
        "Use session traces, command output, and outcome evidence to validate each case.",
        "Only the selected target source is sent after explicit source-upload consent; project code and telemetry are not uploaded by this action."
      ]
    };
  }

  private getRow() {
    return this.database.db
      .prepare(`SELECT * FROM model_evaluation_config WHERE id = ? LIMIT 1`)
      .get(configId) as ConfigRow | undefined;
  }

  private toConfig(row: ConfigRow | undefined): ModelEvaluationConfig {
    return {
      id: configId,
      provider: "openai_compatible",
      providerLabel: stringValue(row?.provider_label, "OpenAI compatible"),
      endpointUrl: stringValue(row?.endpoint_url, "https://api.openai.com/v1"),
      modelName: stringValue(row?.model_name, ""),
      enabled: booleanValue(row?.enabled),
      hasApiKey: Boolean(toBuffer(row?.encrypted_api_key)),
      secretStorage: this.secretProtector.availabilityState?.() ?? "unchecked",
      allowSourceUpload: booleanValue(row?.allow_source_upload),
      updatedAt: nullableString(row?.updated_at),
      lastTestedAt: nullableString(row?.last_tested_at),
      lastTestStatus: this.normalizedStatus(row?.last_test_status),
      lastTestMessage: nullableString(row?.last_test_message)
    };
  }

  private normalizedStatus(value: unknown): ModelEvaluationConnectionStatus {
    return value === "ready" || value === "failed" ? value : "not_tested";
  }

  private requireReadyConfig() {
    const config = this.getConfig();
    if (!config.enabled) {
      throw new Error("Enable AI-assisted evaluation before testing the model connection.");
    }
    if (!config.hasApiKey) {
      throw new Error("No API key is stored for AI-assisted evaluation.");
    }
    if (!this.secretProtector.isAvailable()) {
      throw new Error("System secure storage is unavailable, so the saved API key cannot be used.");
    }
    const key = toBuffer(this.getRow()?.encrypted_api_key);
    if (!key) {
      throw new Error("No API key is stored for AI-assisted evaluation.");
    }
    return { ...config, apiKey: this.secretProtector.decrypt(key) };
  }

  private async requestCompletion(
    config: ModelEvaluationConfig & { apiKey: string },
    prompt: string,
    maxTokens: number
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await this.fetchImpl(completionUrl(config.endpointUrl), {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: config.modelName,
          temperature: 0.2,
          max_tokens: maxTokens,
          messages: [
            {
              role: "system",
              content: "You produce concise, valid responses for local software workflow evaluation."
            },
            { role: "user", content: prompt }
          ]
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(providerErrorMessage(payload, response.status));
      }
      const content = responseContent(payload);
      if (!content) {
        throw new Error("Provider response did not include chat completion content.");
      }
      return content;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Model connection timed out after 20 seconds.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private recordConnectionResult(
    status: Exclude<ModelEvaluationConnectionStatus, "not_tested">,
    testedAt: string,
    message: string
  ) {
    this.database.db
      .prepare(
        `UPDATE model_evaluation_config
         SET last_tested_at = ?, last_test_status = ?, last_test_message = ?
         WHERE id = ?`
      )
      .run(testedAt, status, bounded(message, maxProviderErrorChars), configId);
  }
}
