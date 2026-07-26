type JsonRecord = Record<string, unknown>;

export interface HarnessEventEnvelopeValidation {
  valid: boolean;
  reason: string | null;
  adapterId: string | null;
  harnessId: string | null;
}

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function recordAt(record: JsonRecord, key: string) {
  const value = record[key];
  return isRecord(value) ? value : null;
}

export function stringAt(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function numberAt(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function validateHarnessEventEnvelope(record: JsonRecord): HarnessEventEnvelopeValidation {
  const adapter = recordAt(record, "adapter");
  const harness = recordAt(record, "harness");
  const project = recordAt(record, "project");
  const privacy = recordAt(record, "privacy");
  const adapterId = stringAt(adapter, "id");
  const harnessId = stringAt(harness, "id");
  const schemaVersion = stringAt(record, "schema_version");

  if (!schemaVersion?.startsWith("1.0")) {
    return { valid: false, reason: "Unsupported Harness event schema version.", adapterId, harnessId };
  }
  const eventType = stringAt(record, "event_type");
  if (!stringAt(record, "event_id") || !eventType || !stringAt(record, "occurred_at")) {
    return { valid: false, reason: "Harness event is missing its stable identity or timestamp.", adapterId, harnessId };
  }
  if (!stringAt(record, "session_id") || !stringAt(record, "turn_id") || !stringAt(project, "workspace_ref")) {
    return { valid: false, reason: "Harness event is missing its session, turn, or project workspace reference.", adapterId, harnessId };
  }
  if (!adapterId || !stringAt(adapter, "version") || !stringAt(adapter, "protocol_version")) {
    return { valid: false, reason: "Harness event is missing Adapter identity or protocol version.", adapterId, harnessId };
  }
  if (!harnessId) {
    return { valid: false, reason: "Harness event is missing Harness identity.", adapterId, harnessId };
  }
  if (["skill.invoked", "skill.completed", "skill.failed"].includes(eventType) && !stringAt(record, "run_id")) {
    return { valid: false, reason: "Harness Skill invocation event is missing run_id.", adapterId, harnessId };
  }
  if (!privacy || privacy.raw_prompt_stored === true || privacy.raw_output_stored === true) {
    return { valid: false, reason: "Harness event declares raw prompt or output storage.", adapterId, harnessId };
  }

  return { valid: true, reason: null, adapterId, harnessId };
}
