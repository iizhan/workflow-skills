import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import Database from "better-sqlite3";
import type {
  LocalToolTelemetryImportResult,
  LocalToolTelemetryPreview,
  LocalToolTelemetrySource,
  LocalToolTelemetrySourceKind,
  ProjectRuntimeEvidenceRefreshOptions,
  ProjectRuntimeEvidenceRefreshResult,
  TelemetryImportResult
} from "../shared/types";
import type { AuthorizationService } from "./authorization-service";
import type { WorkbenchDatabase } from "./database";
import type { AppStoragePaths } from "./storage";
import type { TelemetryService } from "./telemetry-service";

type JsonRecord = Record<string, unknown>;

interface ActiveSkill {
  id: string;
  canonicalName: string;
  displayName: string;
  sourcePath: string;
  aliases: string[];
}

interface SourceFile {
  path: string;
  size: number;
  modifiedAt: string | null;
  oversized?: boolean;
}

interface RunDraft {
  runId: string;
  turnRef: string;
  sourceRef: string;
  sessionRef: string | null;
  messageHash: string | null;
  messageSummary: string | null;
  workspaceRef: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  firstOutputLatencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  modelName: string | null;
  toolNames: Set<string>;
  skillNames: Set<string>;
  workflowSignals: Set<string>;
  eventCount: number;
  projectMatched: boolean;
}

interface NormalizedScan {
  preview: Omit<LocalToolTelemetryPreview, "source" | "previewedAt">;
  events: JsonRecord[];
  matchedWorkspaceRef: string | null;
  latestObservedWorkspaceRef: string | null;
}

interface ScanOptions {
  projectRoot?: string;
  mode?: "full" | "incremental";
  since?: string;
}

interface IncrementalTurnPrelude {
  workspaceRef: string | null;
  sessionRef: string | null;
  turnRef: string | null;
  messageHash: string | null;
  messageSummary: string | null;
  messageSequence: number;
  hasExplicitTurnBoundary: boolean;
}

interface SourceFileHeader {
  workspaceRef: string | null;
  sessionRef: string | null;
  isSyntheticSubagent: boolean;
}

const MAX_FILES_PER_SOURCE = 120;
const MAX_DIRECTORIES_PER_SOURCE = 4000;
const MAX_LINES_PER_FILE = 20000;
const MAX_BYTES_PER_TEXT_FILE = 150 * 1024 * 1024;
const MAX_INCREMENTAL_FILES = 2;
const MAX_PROJECT_REFRESH_FILES = 8;
const MAX_INCREMENTAL_FILE_CANDIDATES = 16;
const MAX_INCREMENTAL_LINES_PER_FILE = 2400;
const MAX_INCREMENTAL_BYTES_PER_FILE = 5 * 1024 * 1024;
const MAX_INCREMENTAL_PRELUDE_BYTES = 4 * 1024 * 1024;
const SOURCE_INVENTORY_CACHE_MS = 15_000;
const LOG_EXTENSIONS = new Set([".jsonl", ".ndjson", ".json", ".log", ".txt"]);
const SENSITIVE_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}/,
  /\bBearer\s+[A-Za-z0-9._-]{12,}/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\b(api[_-]?key|token|password|secret)\b\s*[:=：]\s*["']?[^"',\s]{8,}/i,
  /(?:密码|口令|密钥|令牌|访问令牌)\s*[:=：]\s*[^\s,，。]{4,}/i
];
const SYNTHETIC_MESSAGE_BLOCKS = [
  "environment_context",
  "in-app-browser-context",
  "app-context",
  "permissions instructions",
  "collaboration_mode",
  "plugins_instructions",
  "skills_instructions"
];
const MAX_MESSAGE_SUMMARY_CHARACTERS = 800;
const SYNTHETIC_USER_MESSAGE_PREFIXES = [
  "The following is the Codex agent history added since your last approval assessment.",
  "The following is the Codex agent history whose request action you are assessing.",
  "Assess the exact planned action below. Use read-only tool checks when local state matters."
];

function nowIso() {
  return new Date().toISOString();
}

function hashId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function normalizeTimestamp(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value > 10_000_000_000 ? value : value * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function pickEarlier(current: string | null, next: string | null) {
  if (!current) {
    return next;
  }
  if (!next) {
    return current;
  }
  return new Date(current).getTime() <= new Date(next).getTime() ? current : next;
}

function pickLater(current: string | null, next: string | null) {
  if (!current) {
    return next;
  }
  if (!next) {
    return current;
  }
  return new Date(current).getTime() >= new Date(next).getTime() ? current : next;
}

function extensionOf(path: string) {
  const name = basename(path).toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}

function supportsTailWindowScan(path: string) {
  const normalized = path.replace(/\\/g, "/");
  return (
    normalized.includes("/.codex/sessions/") ||
    normalized.includes("/.codex/archived_sessions/") ||
    normalized.includes("/.claude/projects/")
  );
}

function normalizeProjectPath(path: string) {
  const trimmed = resolve(path.trim());
  return trimmed === "/" ? trimmed : trimmed.replace(/\/+$/, "");
}

function isSameOrDescendantPath(candidatePath: string, parentPath: string) {
  const candidate = normalizeProjectPath(candidatePath);
  const parent = normalizeProjectPath(parentPath);
  return candidate === parent || candidate.startsWith(`${parent}/`);
}

function sourceTypeForKind(kind: LocalToolTelemetrySourceKind) {
  if (kind === "codex") {
    return "codex_local_log";
  }
  if (kind === "claude_code") {
    return "claude_code_local_log";
  }
  if (kind === "terminal_file") {
    return "terminal_local_log";
  }
  return "local_jsonl_log";
}

function confidenceFor(events: number, tokenFieldsDetected: boolean, detectedRuns: number) {
  if (events === 0 || detectedRuns === 0) {
    return "none" as const;
  }
  if (tokenFieldsDetected && events >= detectedRuns * 2) {
    return "high" as const;
  }
  if (events >= detectedRuns) {
    return "medium" as const;
  }
  return "low" as const;
}

function safeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectPrimitiveText(value: unknown, depth = 0): string[] {
  if (depth > 4) {
    return [];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectPrimitiveText(entry, depth + 1));
  }
  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, entry]) => [
      key,
      ...collectPrimitiveText(entry, depth + 1)
    ]);
  }
  return [];
}

function collectSkillEvidenceText(record: JsonRecord) {
  const payload = isRecord(record.payload) ? record.payload : {};
  const topLevelType = (readString(record, ["type"]) ?? "").toLowerCase();
  const payloadType = (readString(payload, ["type"]) ?? "").toLowerCase();
  const payloadRole = (readString(payload, ["role"]) ?? "").toLowerCase();
  const evidence: string[] = [];
  const addEvidence = (...values: unknown[]) => {
    for (const value of values) {
      evidence.push(...collectMessageText(value));
    }
  };

  addEvidence(
    readString(record, ["skill_name", "skillName"]),
    readString(payload, ["skill_name", "skillName"])
  );

  if (["session_meta", "world_state", "compacted", "turn_context"].includes(topLevelType)) {
    return stripSyntheticMessageBlocks(evidence.join("\n"));
  }
  if (
    [
      "custom_tool_call_output",
      "function_call_output",
      "tool_call_output",
      "tool_result",
      "token_count",
      "thread_settings_applied"
    ].includes(payloadType)
  ) {
    return stripSyntheticMessageBlocks(evidence.join("\n"));
  }

  if (payloadType === "user_message" || payloadType === "agent_message") {
    addEvidence(payload.message, payload.content, payload.text);
  } else if (payloadType === "message" && ["user", "assistant"].includes(payloadRole)) {
    addEvidence(payload.content, payload.message, payload.text);
  } else if (["custom_tool_call", "function_call", "tool_call"].includes(payloadType)) {
    addEvidence(payload.name, payload.input, payload.arguments);
  } else if (payloadType === "mcp_tool_call_begin" || payloadType === "mcp_tool_call_end") {
    const invocation = isRecord(payload.invocation) ? payload.invocation : {};
    addEvidence(invocation.server, invocation.tool, invocation.arguments);
  } else if (typeof record.line === "string") {
    addEvidence(record.line);
  }

  return stripSyntheticMessageBlocks(evidence.join("\n"));
}

function findDeepRecord(record: JsonRecord, keys: string[], depth = 0): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  if (depth > 4) {
    return undefined;
  }
  for (const value of Object.values(record)) {
    if (isRecord(value)) {
      const found = findDeepRecord(value, keys, depth + 1);
      if (found !== undefined) {
        return found;
      }
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        if (isRecord(entry)) {
          const found = findDeepRecord(entry, keys, depth + 1);
          if (found !== undefined) {
            return found;
          }
        }
      }
    }
  }
  return undefined;
}

function readDeepString(record: JsonRecord, keys: string[]) {
  const value = findDeepRecord(record, keys);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readDeepNumber(record: JsonRecord, keys: string[]) {
  const value = findDeepRecord(record, keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function detectToolNames(record: JsonRecord, rawLine: string) {
  const names = new Set<string>();
  const action = findDeepRecord(record, ["action"]);
  if (isRecord(action)) {
    const actionType = readString(action, ["type", "name", "tool", "toolName"]);
    if (actionType) {
      names.add(actionType);
    }
  }

  const directName = readDeepString(record, ["tool_name", "toolName", "name"]);
  const directType = readDeepString(record, ["type", "subtype"]);
  for (const value of [directName, directType]) {
    if (value && /(tool|exec|apply_patch|browser|mcp|command|function|bash|write|read)/i.test(value)) {
      names.add(value);
    }
  }

  const knownToolMatches = rawLine.match(
    /\b(exec_command|apply_patch|write_stdin|mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+|browser|read_file|edit_file|bash|shell|tool_use)\b/g
  );
  for (const match of knownToolMatches ?? []) {
    names.add(match);
  }

  return names;
}

function detectSkillNames(rawLine: string, skills: ActiveSkill[]) {
  const names = new Set<string>();
  const explicitCandidates = new Set<string>();
  const explicit = rawLine.match(/\$([A-Za-z0-9_.:-]+)|skills\/([A-Za-z0-9_.:-]+)\/SKILL\.md|\.agents\/skills\/([A-Za-z0-9_.:-]+)\/SKILL\.md/g);
  for (const match of explicit ?? []) {
    const normalized = match
      .replace(/^\$/, "")
      .replace(/^.*skills\//, "")
      .replace(/\/SKILL\.md.*$/, "");
    if (normalized) {
      explicitCandidates.add(normalized.toLowerCase());
    }
  }

  for (const skill of skills) {
    const aliases = skill.aliases.filter((alias) => alias.length >= 4);
    const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
    if (normalizedAliases.some((alias) => explicitCandidates.has(alias))) {
      names.add(skill.displayName);
      continue;
    }
    const hasExplicitCue = aliases.some((alias) => {
      const escaped = safeRegex(alias);
      const skillCue = new RegExp(
        `(\\$${escaped}\\b|using[^\\n]{0,48}${escaped}|使用[^\\n]{0,48}${escaped}|${escaped}[^\\n]{0,48}skill|${escaped}\\/SKILL\\.md)`,
        "i"
      );
      return skillCue.test(rawLine);
    });
    if (hasExplicitCue) {
      names.add(skill.displayName);
    }
  }

  return names;
}

function detectWorkflowSignals(record: JsonRecord, rawLine: string) {
  const signals = new Set<string>();
  const lower = rawLine.toLowerCase();
  const toolNames = Array.from(detectToolNames(record, rawLine)).join(" ").toLowerCase();
  const evidence = `${toolNames}\n${lower}`;

  if (/(apply_patch|edit_file|write_file|insert|update file|patch|diff)/i.test(evidence)) {
    signals.add("code_generation");
  }
  if (
    /(npm|pnpm|yarn|bun|vitest|jest|pytest|go test|cargo test|mvn|gradle|lint|typecheck|tsc|build|test)/i.test(
      evidence
    )
  ) {
    signals.add("test_and_report");
    signals.add("verification_loop");
  }
  if (/(rg |grep|sed -n|cat |ls |find |read_file|ripgrep|search)/i.test(evidence)) {
    signals.add("codebase_onboarding");
  }
  if (/(review|审查|安全|security|漏洞|vulnerability)/i.test(evidence)) {
    signals.add(evidence.includes("security") || evidence.includes("安全") ? "security_review" : "code_review");
  }
  if (/(css|scss|less|tailwind|style|样式|布局)/i.test(evidence)) {
    signals.add("frontend_css");
  }
  if (/(react|jsx|tsx)/i.test(evidence)) {
    signals.add("frontend_react");
  }
  if (/(vue|\.vue)/i.test(evidence)) {
    signals.add("frontend_vue");
  }
  if (/(javascript|typescript|\.js|\.ts)/i.test(evidence)) {
    signals.add("frontend_js");
  }

  return signals;
}

function detectTokenFields(record: JsonRecord) {
  const payload = isRecord(record.payload) ? record.payload : {};
  const info = isRecord(payload.info) ? payload.info : {};
  const lastTokenUsage = isRecord(info.last_token_usage) ? info.last_token_usage : null;
  if (readString(payload, ["type"]) === "token_count" && lastTokenUsage) {
    const promptTokens = readDeepNumber(lastTokenUsage, ["input_tokens", "inputTokens"]);
    const completionTokens = readDeepNumber(lastTokenUsage, ["output_tokens", "outputTokens"]);
    const totalTokens = readDeepNumber(lastTokenUsage, ["total_tokens", "totalTokens"]);
    return {
      promptTokens,
      completionTokens,
      totalTokens:
        totalTokens ??
        (promptTokens != null || completionTokens != null
          ? (promptTokens ?? 0) + (completionTokens ?? 0)
          : null)
    };
  }
  const promptTokens = readDeepNumber(record, [
    "prompt_tokens",
    "promptTokens",
    "input_tokens",
    "inputTokens"
  ]);
  const completionTokens = readDeepNumber(record, [
    "completion_tokens",
    "completionTokens",
    "output_tokens",
    "outputTokens"
  ]);
  const totalTokens = readDeepNumber(record, ["total_tokens", "totalTokens"]);
  return {
    promptTokens,
    completionTokens,
    totalTokens:
      totalTokens ??
      (promptTokens != null || completionTokens != null
        ? (promptTokens ?? 0) + (completionTokens ?? 0)
        : null)
  };
}

function findProjectSkill(
  skills: ActiveSkill[],
  projectRoot: string,
  canonicalName: string
) {
  const normalizedName = canonicalName.toLowerCase();
  return skills.find(
    (skill) =>
      isSameOrDescendantPath(skill.sourcePath, projectRoot) &&
      (skill.canonicalName.toLowerCase() === normalizedName ||
        skill.displayName.toLowerCase() === normalizedName ||
        basename(skill.sourcePath).toLowerCase() === normalizedName)
  );
}

function inferProjectWorkflowSkillNames(
  draft: RunDraft,
  skills: ActiveSkill[],
  projectRoot?: string
) {
  const names = new Set<string>();
  if (
    !projectRoot ||
    !draft.projectMatched ||
    (draft.toolNames.size === 0 && draft.workflowSignals.size === 0)
  ) {
    return names;
  }

  const add = (canonicalName: string) => {
    const skill = findProjectSkill(skills, projectRoot, canonicalName);
    if (skill) {
      names.add(skill.displayName);
    }
  };
  const has = (signal: string) => draft.workflowSignals.has(signal);
  const hasAny = (...signals: string[]) => signals.some((signal) => has(signal));

  add("project-workflow-router");
  if (draft.messageHash || draft.messageSummary) {
    add("project-requirement-gate");
  }
  if (draft.toolNames.size > 0 || draft.workflowSignals.size > 0) {
    add("project-dev-core");
  }
  if (has("codebase_onboarding")) {
    add("project-codebase-onboarding");
  }
  if (has("code_generation")) {
    add("project-code-generation");
    add("project-scope-impact-guard");
  }
  if (has("test_and_report")) {
    add("project-test-and-report");
  }
  if (has("verification_loop")) {
    add("project-verification-loop");
  }
  if (has("code_review")) {
    add("project-code-review");
    add("project-scope-impact-guard");
  }
  if (has("security_review")) {
    add("project-security-review");
    add("project-scope-impact-guard");
  }
  if (hasAny("frontend_css", "frontend_js", "frontend_react", "frontend_vue")) {
    add("project-frontend-standards");
  }
  if (has("frontend_css")) {
    add("project-frontend-css");
  }
  if (has("frontend_js")) {
    add("project-frontend-js");
  }
  if (has("frontend_react")) {
    add("project-frontend-react");
  }
  if (has("frontend_vue")) {
    add("project-frontend-vue");
  }

  return names;
}

function isUserMessageRecord(record: JsonRecord) {
  const topLevelType = readString(record, ["type", "role"]);
  const payload = isRecord(record.payload) ? record.payload : null;
  const payloadType = payload ? readString(payload, ["type"]) : null;
  const payloadRole = payload ? readString(payload, ["role"]) : null;
  return payloadType === "user_message"
    || (payloadType === "message" && payloadRole === "user")
    || payloadRole === "user"
    || payloadType === "user"
    || topLevelType === "user_message"
    || topLevelType === "user";
}

function collectMessageText(value: unknown, depth = 0): string[] {
  if (depth > 5 || value == null) {
    return [];
  }
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectMessageText(entry, depth + 1));
  }
  if (!isRecord(value)) {
    return [];
  }

  const directText = [value.text, value.input_text, value.output_text]
    .filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
  if (directText.length > 0) {
    return directText.map((entry) => entry.trim());
  }
  return [value.content, value.message]
    .flatMap((entry) => collectMessageText(entry, depth + 1));
}

export function sanitizeUserMessageSummaryForStorage(record: JsonRecord, sequence: number) {
  const payload = isRecord(record.payload) ? record.payload : {};
  const candidates = [
    payload.content,
    payload.message,
    record.content,
    record.message,
    record.text
  ];
  let summary = candidates
    .flatMap((candidate) => collectMessageText(candidate))
    .join("\n")
    .trim();
  summary = stripSyntheticMessageBlocks(summary);
  summary = summary.replace(/\s+/g, " ").trim();
  if (!summary) {
    return `第 ${sequence} 条用户消息（未提取到可显示文本）`;
  }
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(summary))) {
    return `第 ${sequence} 条用户消息（检测到疑似凭据，摘要已隐藏）`;
  }
  const characters = Array.from(summary);
  return characters.length > MAX_MESSAGE_SUMMARY_CHARACTERS
    ? `${characters.slice(0, MAX_MESSAGE_SUMMARY_CHARACTERS).join("")}...`
    : summary;
}

export function stripSyntheticMessageBlocks(value: string) {
  const trimmed = value.trim();
  if (
    SYNTHETIC_USER_MESSAGE_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) ||
    (trimmed.includes(">>> TRANSCRIPT DELTA START") && trimmed.includes(">>> TRANSCRIPT DELTA END"))
  ) {
    return "";
  }
  let sanitized = value;
  for (const blockName of SYNTHETIC_MESSAGE_BLOCKS) {
    const escapedName = safeRegex(blockName);
    sanitized = sanitized.replace(
      new RegExp(`<${escapedName}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escapedName}>`, "gi"),
      " "
    );
  }
  return sanitized;
}

export function isSyntheticUserMessageRecord(record: JsonRecord) {
  if (!isUserMessageRecord(record)) {
    return false;
  }
  const payload = isRecord(record.payload) ? record.payload : {};
  const rawMessage = [
    payload.content,
    payload.message,
    record.content,
    record.message,
    record.text
  ]
    .flatMap((candidate) => collectMessageText(candidate))
    .join("\n")
    .trim();
  if (!rawMessage) {
    return true;
  }
  return stripSyntheticMessageBlocks(rawMessage).replace(/\s+/g, " ").trim().length === 0;
}

export function isSyntheticSubagentSessionRecord(record: JsonRecord) {
  if (readString(record, ["type"]) !== "session_meta") {
    return false;
  }
  const payload = isRecord(record.payload) ? record.payload : {};
  const source = isRecord(payload.source) ? payload.source : {};
  return readString(payload, ["thread_source"]) === "subagent" || isRecord(source.subagent);
}

function updateRunDraft(
  draft: RunDraft,
  record: JsonRecord,
  rawLine: string,
  skillEvidenceText: string,
  file: SourceFile,
  skills: ActiveSkill[],
  options: ScanOptions = {}
) {
  const payload = isRecord(record.payload) ? record.payload : {};
  const message = isRecord(record.message) ? record.message : {};
  const timestamp = normalizeTimestamp(
    record.timestamp as string | number | undefined ??
      payload.timestamp as string | number | undefined ??
      message.timestamp as string | number | undefined ??
      record.created_at as string | number | undefined
  );
  draft.startedAt = pickEarlier(draft.startedAt, timestamp);
  draft.finishedAt = pickLater(draft.finishedAt, timestamp);
  draft.eventCount += 1;

  const modelName =
    readDeepString(record, ["model", "model_name", "modelName"]) ??
    readDeepString(record, ["model_provider", "modelProvider"]);
  if (modelName && !draft.modelName) {
    draft.modelName = modelName;
  }

  const cwd = readDeepString(record, ["cwd", "workdir", "workspace", "workspace_ref", "workspaceRef"]);
  if (cwd && !draft.workspaceRef) {
    draft.workspaceRef = cwd;
  }
  if (options.projectRoot) {
    draft.projectMatched =
      draft.projectMatched ||
      (cwd
        ? isSameOrDescendantPath(cwd, options.projectRoot)
        : false);
  }

  const durationMs = readDeepNumber(record, ["duration_ms", "durationMs"]);
  if (durationMs != null) {
    draft.durationMs = Math.max(draft.durationMs ?? 0, durationMs);
  }

  const firstOutputLatencyMs = readDeepNumber(record, [
    "time_to_first_token_ms",
    "first_output_latency_ms",
    "latency_ms",
    "latencyMs"
  ]);
  if (firstOutputLatencyMs != null) {
    draft.firstOutputLatencyMs = Math.min(
      draft.firstOutputLatencyMs ?? firstOutputLatencyMs,
      firstOutputLatencyMs
    );
  }

  const tokenFields = detectTokenFields(record);
  draft.promptTokens = tokenFields.promptTokens ?? draft.promptTokens;
  draft.completionTokens = tokenFields.completionTokens ?? draft.completionTokens;
  draft.totalTokens = tokenFields.totalTokens ?? draft.totalTokens;

  for (const toolName of detectToolNames(record, rawLine)) {
    draft.toolNames.add(toolName);
  }
  for (const skillName of detectSkillNames(skillEvidenceText, skills)) {
    draft.skillNames.add(skillName);
  }
  for (const signal of detectWorkflowSignals(record, rawLine)) {
    draft.workflowSignals.add(signal);
  }

  if (!draft.startedAt && file.modifiedAt) {
    draft.startedAt = file.modifiedAt;
  }
}

interface BuildEventsResult {
  events: JsonRecord[];
  inferredRuns: number;
  inferredSkillNames: string[];
}

export class LocalToolTelemetryService {
  private readonly projectRefreshCache = new Map<
    string,
    {
      fingerprint: string;
      mode: "full" | "incremental";
      result: ProjectRuntimeEvidenceRefreshResult;
    }
  >();
  private readonly sourceFilesByPath = new Map<string, SourceFile[]>();
  private readonly projectSourceFingerprints = new Map<string, Map<string, string>>();
  private sourceInventoryCache: { expiresAt: number; sources: LocalToolTelemetrySource[] } | null = null;
  private readonly stagingCleanupPromise: Promise<void>;

  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly authorizationService: AuthorizationService,
    private readonly telemetryService: TelemetryService,
    private readonly storagePaths: AppStoragePaths
  ) {
    this.stagingCleanupPromise = this.cleanupProjectRuntimeStagingFiles();
  }

  checkProjectConnection(projectRoot: string): ProjectRuntimeEvidenceRefreshResult {
    const normalizedProjectRoot = normalizeProjectPath(projectRoot);
    const policy = this.authorizationService.getActivePolicy();
    const projectAuthorized = Boolean(
      policy &&
      this.authorizationService
        .listRoots(policy.id)
        .some((root) => isSameOrDescendantPath(normalizedProjectRoot, root.path))
    );
    if (!policy || !projectAuthorized) {
      return {
        projectRoot: normalizedProjectRoot,
        refreshedAt: nowIso(),
        status: "unauthorized",
        telemetryMode: policy?.telemetryMode ?? "missing",
        sourcesChecked: 0,
        importableRuns: 0,
        importedRuns: 0,
        updatedRuns: 0,
        affectedSkills: 0,
        affectedSkillIds: [],
        warnings: ["Authorize this project directory before checking its Codex connection."],
        errors: [],
        sourcePreviews: []
      };
    }

    const stateCandidates = [
      join(homedir(), ".codex", "state_5.sqlite"),
      join(homedir(), ".codex", "sqlite", "state_5.sqlite")
    ];
    let matchedWorkspaceRef: string | null = null;
    let latestObservedWorkspaceRef: string | null = null;
    for (const statePath of stateCandidates) {
      if (!existsSync(statePath)) {
        continue;
      }
      try {
        const stateDb = new Database(statePath, { readonly: true, fileMustExist: true });
        try {
          const matched = stateDb
            .prepare(
              `SELECT cwd FROM threads
               WHERE cwd = ? OR cwd LIKE ?
               ORDER BY updated_at DESC LIMIT 1`
            )
            .get(normalizedProjectRoot, `${normalizedProjectRoot}/%`) as { cwd?: string } | undefined;
          const latest = stateDb
            .prepare(`SELECT cwd FROM threads ORDER BY updated_at DESC LIMIT 1`)
            .get() as { cwd?: string } | undefined;
          matchedWorkspaceRef = matched?.cwd ? normalizeProjectPath(matched.cwd) : null;
          latestObservedWorkspaceRef = latest?.cwd ? normalizeProjectPath(latest.cwd) : null;
        } finally {
          stateDb.close();
        }
        break;
      } catch {
        continue;
      }
    }

    return {
      projectRoot: normalizedProjectRoot,
      refreshedAt: nowIso(),
      status: matchedWorkspaceRef ? "connected_no_skill_runs" : "no_importable_runs",
      telemetryMode: policy.telemetryMode,
      sourcesChecked: 1,
      importableRuns: 0,
      importedRuns: 0,
      updatedRuns: 0,
      affectedSkills: 0,
      affectedSkillIds: [],
      matchedWorkspaceRef,
      latestObservedWorkspaceRef,
      warnings: matchedWorkspaceRef ? [] : [`No Codex task directory matched ${normalizedProjectRoot}.`],
      errors: [],
      sourcePreviews: []
    };
  }

  async discoverSources(): Promise<LocalToolTelemetrySource[]> {
    if (this.sourceInventoryCache && this.sourceInventoryCache.expiresAt > Date.now()) {
      return this.sourceInventoryCache.sources;
    }
    const home = homedir();
    const sources = [
      await this.buildSource({
        id: "codex-sessions",
        kind: "codex",
        label: "Codex sessions",
        description: "Read-only scan of Codex session JSONL files for tool calls, Skill evidence, and token usage fields.",
        path: join(home, ".codex", "sessions"),
        pathType: "directory",
        recommended: true,
        privacyLevel: "high",
        warnings: ["Session logs may contain prompts. Preview stores counts only; import stores normalized metrics."]
      }),
      await this.buildSource({
        id: "codex-archived-sessions",
        kind: "codex",
        label: "Codex archived sessions",
        description: "Read-only scan of archived Codex session logs.",
        path: join(home, ".codex", "archived_sessions"),
        pathType: "directory",
        recommended: true,
        privacyLevel: "high",
        warnings: ["Archived sessions can include old prompts and tool arguments; raw content is not persisted."]
      }),
      await this.buildSource({
        id: "codex-tui-log",
        kind: "codex",
        label: "Codex terminal log",
        description: "Low-confidence fallback for Codex TUI text logs.",
        path: join(home, ".codex", "log", "codex-tui.log"),
        pathType: "file",
        recommended: false,
        privacyLevel: "sensitive",
        warnings: ["Text logs are lower confidence than structured session JSONL."]
      }),
      await this.buildSource({
        id: "claude-projects",
        kind: "claude_code",
        label: "Claude Code projects",
        description: "Read-only scan of Claude Code project JSONL files.",
        path: join(home, ".claude", "projects"),
        pathType: "directory",
        recommended: true,
        privacyLevel: "high",
        warnings: ["Claude project logs may contain prompts. Import keeps normalized metrics only."]
      }),
      {
        id: "terminal-manual-file",
        kind: "terminal_file" as const,
        label: "Terminal log file",
        description: "Choose a specific JSONL, NDJSON, log, or txt file before import. Shell history is never scanned automatically.",
        path: "",
        pathType: "manual" as const,
        exists: false,
        status: "needs_selection" as const,
        recommended: false,
        privacyLevel: "high" as const,
        fileCount: 0,
        byteCount: 0,
        lastModifiedAt: null,
        warnings: ["Use the existing file picker for one-off terminal exports; automatic shell history scanning is disabled."]
      }
    ];

    this.sourceInventoryCache = {
      expiresAt: Date.now() + SOURCE_INVENTORY_CACHE_MS,
      sources
    };
    return sources;
  }

  async previewSource(source: LocalToolTelemetrySource): Promise<LocalToolTelemetryPreview> {
    this.assertTelemetryAllowed();
    const normalizedSource = await this.refreshSource(source);
    const scan = await this.scanSource(normalizedSource);
    return {
      source: normalizedSource,
      previewedAt: nowIso(),
      ...scan.preview
    };
  }

  async importSource(source: LocalToolTelemetrySource): Promise<LocalToolTelemetryImportResult> {
    this.assertTelemetryAllowed();
    const normalizedSource = await this.refreshSource(source);
    const scan = await this.scanSource(normalizedSource);
    const preview: LocalToolTelemetryPreview = {
      source: normalizedSource,
      previewedAt: nowIso(),
      ...scan.preview
    };
    if (scan.events.length === 0) {
      throw new Error("No importable Skill run events were detected in this source.");
    }

    const importDir = join(this.storagePaths.eventsDir, "local-tool-imports");
    await mkdir(importDir, { recursive: true });
    const outputPath = join(
      importDir,
      `${normalizedSource.id}-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`
    );
    await writeFile(outputPath, scan.events.map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
    const telemetry = await this.telemetryService.importJsonlFile(outputPath);
    return { source: normalizedSource, preview, telemetry };
  }

  async refreshProjectRuntimeEvidence(
    projectRoot: string,
    options: ProjectRuntimeEvidenceRefreshOptions = {}
  ): Promise<ProjectRuntimeEvidenceRefreshResult> {
    await this.stagingCleanupPromise;
    const normalizedProjectRoot = normalizeProjectPath(projectRoot);
    // Interactive refreshes must stay bounded. A full historical rebuild is a
    // separate maintenance operation because it can monopolize Electron's main
    // process when a user has years of local session logs.
    const refreshMode = options.mode ?? "incremental";
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      return {
        projectRoot: normalizedProjectRoot,
        refreshedAt: nowIso(),
        status: "unauthorized",
        telemetryMode: "missing",
        sourcesChecked: 0,
        importableRuns: 0,
        importedRuns: 0,
        updatedRuns: 0,
        affectedSkills: 0,
        affectedSkillIds: [],
        warnings: ["Authorize the selected project before refreshing runtime evidence."],
        errors: [],
        sourcePreviews: []
      };
    }
    const projectAuthorized = this.authorizationService
      .listRoots(policy.id)
      .some((root) => isSameOrDescendantPath(normalizedProjectRoot, root.path));
    if (!projectAuthorized) {
      return {
        projectRoot: normalizedProjectRoot,
        refreshedAt: nowIso(),
        status: "unauthorized",
        telemetryMode: policy.telemetryMode,
        sourcesChecked: 0,
        importableRuns: 0,
        importedRuns: 0,
        updatedRuns: 0,
        affectedSkills: 0,
        affectedSkillIds: [],
        warnings: ["Authorize this project directory before refreshing runtime evidence."],
        errors: [],
        sourcePreviews: []
      };
    }
    if (policy.telemetryMode === "disabled") {
      return {
        projectRoot: normalizedProjectRoot,
        refreshedAt: nowIso(),
        status: "telemetry_disabled",
        telemetryMode: policy.telemetryMode,
        sourcesChecked: 0,
        importableRuns: 0,
        importedRuns: 0,
        updatedRuns: 0,
        affectedSkills: 0,
        affectedSkillIds: [],
        warnings: ["Telemetry is disabled. Enable estimated telemetry to import local Codex session evidence."],
        errors: [],
        sourcePreviews: []
      };
    }

    const sources = (await this.discoverSources()).filter(
      (source) =>
        source.status === "ready" &&
        source.pathType !== "manual" &&
        (source.id === "codex-sessions" || source.id === "claude-projects")
    );
    if (sources.length === 0) {
      return {
        projectRoot: normalizedProjectRoot,
        refreshedAt: nowIso(),
        status: "no_ready_sources",
        telemetryMode: policy.telemetryMode,
        sourcesChecked: 0,
        importableRuns: 0,
        importedRuns: 0,
        updatedRuns: 0,
        affectedSkills: 0,
        affectedSkillIds: [],
        warnings: ["No readable Codex or Claude Code session source was found on this device."],
        errors: [],
        sourcePreviews: []
      };
    }
    const sourceFingerprint = [`message-summary:${policy.allowMessageSummary ? "on" : "off"}`, ...sources
      .map((source) => `${source.id}:${source.fileCount}:${source.byteCount}:${source.lastModifiedAt ?? ""}`)
    ].join("|");
    const cached = this.projectRefreshCache.get(normalizedProjectRoot);
    if (
      cached?.fingerprint === sourceFingerprint &&
      (refreshMode === "incremental" || cached.mode === "full")
    ) {
      const refreshedAt = nowIso();
      return {
        ...cached.result,
        refreshedAt,
        importedRuns: 0,
        updatedRuns: 0,
        warnings: Array.from(
          new Set([...cached.result.warnings, "No local session file changes were detected; reused the previous project match."])
        ).slice(0, 12),
        sourcePreviews: cached.result.sourcePreviews.map((preview) => ({ ...preview, previewedAt: refreshedAt }))
      };
    }

    const sourcePreviews: LocalToolTelemetryPreview[] = [];
    const warnings = new Set<string>();
    const errors = new Set<string>();
    const affectedSkillIds = new Set<string>();
    const connectionBaseline = this.checkProjectConnection(normalizedProjectRoot);
    let importedRuns = 0;
    let updatedRuns = 0;
    let importableRuns = 0;
    let matchedWorkspaceRef: string | null = connectionBaseline.matchedWorkspaceRef ?? null;
    let latestObservedWorkspaceRef: string | null =
      connectionBaseline.latestObservedWorkspaceRef ?? null;

    for (const source of sources) {
      const scan = await this.scanSource(source, {
        projectRoot: normalizedProjectRoot,
        mode: refreshMode,
        since: options.since
      });
      const preview: LocalToolTelemetryPreview = {
        source,
        previewedAt: nowIso(),
        ...scan.preview
      };
      sourcePreviews.push(preview);
      matchedWorkspaceRef ??= scan.matchedWorkspaceRef;
      latestObservedWorkspaceRef ??= scan.latestObservedWorkspaceRef;
      importableRuns += preview.importableRuns;
      for (const warning of preview.warnings) {
        warnings.add(warning);
      }

      if (scan.events.length === 0) {
        continue;
      }

      const importDir = join(this.storagePaths.eventsDir, "project-runtime-imports");
      await mkdir(importDir, { recursive: true });
      const outputPath = join(
        importDir,
        `${source.id}-${hashId(normalizedProjectRoot)}-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`
      );
      await writeFile(outputPath, scan.events.map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
      let telemetry: TelemetryImportResult;
      try {
        telemetry = await this.telemetryService.importJsonlFile(outputPath);
      } finally {
        await unlink(outputPath).catch(() => undefined);
      }
      importedRuns += telemetry.importedRuns;
      updatedRuns += telemetry.updatedRuns;
      for (const skillId of telemetry.affectedSkillIds) {
        affectedSkillIds.add(skillId);
      }
      for (const error of telemetry.errors) {
        errors.add(error);
      }
    }

    matchedWorkspaceRef ??= cached?.result.matchedWorkspaceRef ?? null;
    latestObservedWorkspaceRef ??= cached?.result.latestObservedWorkspaceRef ?? null;
    if (matchedWorkspaceRef) {
      for (const warning of warnings) {
        if (warning.startsWith("No local session cwd matched")) {
          warnings.delete(warning);
        }
      }
    }

    const result: ProjectRuntimeEvidenceRefreshResult = {
      projectRoot: normalizedProjectRoot,
      refreshedAt: nowIso(),
      status:
        importedRuns + updatedRuns > 0
          ? "imported"
          : matchedWorkspaceRef
            ? "connected_no_skill_runs"
            : "no_importable_runs",
      telemetryMode: policy.telemetryMode,
      sourcesChecked: sources.length,
      importableRuns,
      importedRuns,
      updatedRuns,
      affectedSkills: affectedSkillIds.size,
      affectedSkillIds: Array.from(affectedSkillIds),
      matchedWorkspaceRef,
      latestObservedWorkspaceRef,
      warnings: Array.from(warnings).slice(0, 12),
      errors: Array.from(errors).slice(0, 12),
      sourcePreviews
    };
    this.projectRefreshCache.set(normalizedProjectRoot, {
      fingerprint: sourceFingerprint,
      mode: refreshMode,
      result
    });
    return result;
  }

  private assertTelemetryAllowed() {
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      throw new Error("Grant authorization before scanning local tool telemetry.");
    }
    if (policy.telemetryMode === "disabled") {
      throw new Error("Telemetry is disabled in the active authorization policy.");
    }
  }

  private async refreshSource(source: LocalToolTelemetrySource) {
    if (!source.path || source.pathType === "manual") {
      return source;
    }
    return this.buildSource({
      id: source.id,
      kind: source.kind,
      label: source.label,
      description: source.description,
      path: source.path,
      pathType: source.pathType,
      recommended: source.recommended,
      privacyLevel: source.privacyLevel,
      warnings: source.warnings
    });
  }

  private async buildSource(input: {
    id: string;
    kind: LocalToolTelemetrySourceKind;
    label: string;
    description: string;
    path: string;
    pathType: "file" | "directory";
    recommended: boolean;
    privacyLevel: "normal" | "sensitive" | "high";
    warnings: string[];
  }): Promise<LocalToolTelemetrySource> {
    try {
      const files = await this.listCandidateFiles(input.path, input.pathType);
      this.sourceFilesByPath.set(resolve(input.path), files);
      return {
        ...input,
        exists: true,
        status: files.length > 0 ? "ready" : "blocked",
        fileCount: files.length,
        byteCount: files.reduce((sum, file) => sum + file.size, 0),
        lastModifiedAt: files
          .map((file) => file.modifiedAt)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null
      };
    } catch {
      this.sourceFilesByPath.delete(resolve(input.path));
      return {
        ...input,
        exists: false,
        status: "missing",
        fileCount: 0,
        byteCount: 0,
        lastModifiedAt: null
      };
    }
  }

  private async listCandidateFiles(path: string, pathType: "file" | "directory"): Promise<SourceFile[]> {
    const resolved = resolve(path);
    const rootStat = await stat(resolved);
    if (pathType === "file" || rootStat.isFile()) {
      const oversized = rootStat.size > MAX_BYTES_PER_TEXT_FILE;
      return LOG_EXTENSIONS.has(extensionOf(resolved)) && (!oversized || supportsTailWindowScan(resolved))
        ? [{ path: resolved, size: rootStat.size, modifiedAt: rootStat.mtime.toISOString(), oversized }]
        : [];
    }

    const files: SourceFile[] = [];
    const queue = [resolved];
    let visitedDirectories = 0;
    while (queue.length > 0 && visitedDirectories < MAX_DIRECTORIES_PER_SOURCE) {
      const current = queue.shift()!;
      visitedDirectories += 1;
      const entries = (await readdir(current, { withFileTypes: true })).sort((left, right) =>
        right.name.localeCompare(left.name)
      );
      for (const entry of entries) {
        const nextPath = join(current, entry.name);
        if (entry.isDirectory()) {
          if (!["attachments", "skills", "cache", "plugins", "node_modules"].includes(entry.name)) {
            queue.push(nextPath);
          }
          continue;
        }
        if (!entry.isFile() || !LOG_EXTENSIONS.has(extensionOf(entry.name))) {
          continue;
        }
        const fileStat = await stat(nextPath);
        const oversized = fileStat.size > MAX_BYTES_PER_TEXT_FILE;
        if (oversized && !supportsTailWindowScan(nextPath)) {
          continue;
        }
        files.push({
          path: nextPath,
          size: fileStat.size,
          modifiedAt: fileStat.mtime.toISOString(),
          oversized
        });
      }
    }
    return files
      .sort((left, right) => (right.modifiedAt ?? "").localeCompare(left.modifiedAt ?? ""))
      .slice(0, MAX_FILES_PER_SOURCE);
  }

  private getActiveSkills(): ActiveSkill[] {
    const rows = this.database.db
      .prepare(
        `SELECT id, canonical_name, display_name, source_path
         FROM skills
         WHERE is_active = 1`
      )
      .all() as Array<{
        id: string;
        canonical_name: string;
        display_name: string;
        source_path: string;
      }>;

    return rows.map((row) => ({
      id: row.id,
      canonicalName: row.canonical_name,
      displayName: row.display_name,
      sourcePath: row.source_path,
      aliases: Array.from(
        new Set([
          row.canonical_name,
          row.display_name,
          basename(row.source_path),
          row.source_path
        ].filter(Boolean))
      )
    }));
  }

  private async scanSource(
    source: LocalToolTelemetrySource,
    options: ScanOptions = {}
  ): Promise<NormalizedScan> {
    if (!source.path || source.status !== "ready") {
      return this.emptyScan(["Select a readable local source before previewing telemetry."]);
    }

    const skills = this.getActiveSkills();
    if (skills.length === 0) {
      return this.emptyScan(["No indexed Skills are available. Scan approved roots before importing tool telemetry."]);
    }

    const allowMessageSummary = this.authorizationService.getActivePolicy()?.allowMessageSummary === true;
    const sourcePath = resolve(source.path);
    const candidateFiles =
      this.sourceFilesByPath.get(sourcePath) ??
      await this.listCandidateFiles(source.path, source.pathType === "file" ? "file" : "directory");
    const incrementalKey = options.projectRoot
      ? `${normalizeProjectPath(options.projectRoot)}::${options.mode ?? "full"}::summary-${allowMessageSummary ? "on" : "off"}::${source.id}::${sourcePath}`
      : null;
    const previousFingerprints = incrementalKey
      ? this.projectSourceFingerprints.get(incrementalKey)
      : null;
    const changedFiles = previousFingerprints
      ? candidateFiles.filter(
          (file) => previousFingerprints.get(file.path) !== `${file.size}:${file.modifiedAt ?? ""}`
        )
      : candidateFiles;
    const incrementalSince = options.since ? new Date(options.since).getTime() : Number.NaN;
    const files = options.mode === "incremental"
      ? changedFiles
          .filter((file) => {
            if (!Number.isFinite(incrementalSince) || !file.modifiedAt) {
              return true;
            }
            return new Date(file.modifiedAt).getTime() >= incrementalSince - 2_000;
          })
          .slice(0, MAX_INCREMENTAL_FILE_CANDIDATES)
      : changedFiles;
    const warnings = [...source.warnings];
    const runs = new Map<string, RunDraft>();
    const detectedSkillNames = new Set<string>();
    const detectedToolNames = new Set<string>();
    const detectedModelNames = new Set<string>();
    const observedWorkspaceRefs = new Set<string>();
    let latestObservedWorkspaceRef: string | null = null;
    let matchedWorkspaceRef: string | null = null;
    let readableFiles = 0;
    let scannedLines = 0;
    let detectedEvents = 0;
    let sensitiveFieldCount = 0;
    let tokenFieldsDetected = false;
    let acceptedFiles = 0;
    let ignoredSyntheticSessionFiles = 0;

    for (const file of files) {
      const acceptedFileLimit = options.projectRoot
        ? options.mode === "incremental"
          ? MAX_INCREMENTAL_FILES
          : MAX_PROJECT_REFRESH_FILES
        : Number.POSITIVE_INFINITY;
      if (acceptedFiles >= acceptedFileLimit) {
        break;
      }
      const header = await this.readSourceFileHeader(file.path);
      if (header.isSyntheticSubagent) {
        ignoredSyntheticSessionFiles += 1;
        continue;
      }
      if (
        options.projectRoot &&
        header.workspaceRef &&
        !isSameOrDescendantPath(header.workspaceRef, options.projectRoot)
      ) {
        observedWorkspaceRefs.add(header.workspaceRef);
        latestObservedWorkspaceRef ??= header.workspaceRef;
        continue;
      }
      const boundedWindowScan = Boolean(options.projectRoot) || options.mode === "incremental" || file.oversized === true;
      if (file.oversized) {
        warnings.push(
          `Large session file ${file.path} was scanned with a bounded recent-window reader to avoid blocking the app.`
        );
      }
      const incrementalStart = boundedWindowScan
        ? Math.max(0, file.size - MAX_INCREMENTAL_BYTES_PER_FILE)
        : 0;
      const prelude = boundedWindowScan
        ? await this.readIncrementalTurnPrelude(file.path, incrementalStart, allowMessageSummary)
        : null;
      let fileWorkspaceRef: string | null = prelude?.workspaceRef ?? header.workspaceRef;
      let fileSessionRef: string | null = prelude?.sessionRef ?? header.sessionRef;
      let fileTurnRef = prelude?.turnRef ?? `file-${hashId(file.path)}`;
      let fileTurnMessageHash: string | null = prelude?.messageHash ?? null;
      let fileTurnMessageSummary: string | null = prelude?.messageSummary ?? null;
      let fileTurnSequence = prelude?.messageSequence ?? 0;
      let fileHasExplicitTurnBoundary = prelude?.hasExplicitTurnBoundary ?? false;
      let fileAccepted = false;
      if (fileWorkspaceRef) {
        observedWorkspaceRefs.add(fileWorkspaceRef);
        latestObservedWorkspaceRef ??= fileWorkspaceRef;
        if (
          options.projectRoot &&
          !matchedWorkspaceRef &&
          isSameOrDescendantPath(fileWorkspaceRef, options.projectRoot)
        ) {
          matchedWorkspaceRef = fileWorkspaceRef;
        }
      }
      const maxLines = boundedWindowScan
        ? MAX_INCREMENTAL_LINES_PER_FILE
        : MAX_LINES_PER_FILE;
      const reader = createInterface({
        input: createReadStream(file.path, {
          encoding: "utf8",
          start: incrementalStart
        }),
        crlfDelay: Infinity
      });
      let lineCount = 0;
      try {
        for await (const rawLine of reader) {
          lineCount += 1;
          scannedLines += 1;
          if (incrementalStart > 0 && lineCount === 1) {
            continue;
          }
          if (lineCount > maxLines) {
            warnings.push(`Stopped reading ${file.path} after ${maxLines} lines.`);
            break;
          }
          const line = rawLine.trim();
          if (!line) {
            continue;
          }
          const parsed = this.parseLine(line);
          if (parsed && isSyntheticSubagentSessionRecord(parsed)) {
            ignoredSyntheticSessionFiles += 1;
            break;
          }
          if (!fileAccepted) {
            fileAccepted = true;
            acceptedFiles += 1;
            readableFiles += 1;
          }
          if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(line))) {
            sensitiveFieldCount += 1;
          }
          const text = parsed ? collectPrimitiveText(parsed).join("\n") : line;
          const evidenceText = stripSyntheticMessageBlocks(text);
          const record = parsed ?? { line: text };
          fileSessionRef = this.readSessionRef(record) ?? fileSessionRef;
          const explicitTurnRef = this.readExplicitTurnRef(record);
          if (explicitTurnRef) {
            fileTurnRef = explicitTurnRef;
            fileHasExplicitTurnBoundary = true;
          }
          const syntheticUserMessage = isSyntheticUserMessageRecord(record);
          if (isUserMessageRecord(record) && !syntheticUserMessage) {
            fileTurnSequence += 1;
            fileTurnRef =
              explicitTurnRef ??
              (fileHasExplicitTurnBoundary
                ? fileTurnRef
                : this.readMessageRef(record) ??
                  `message-${fileTurnSequence}-${hashId(`${file.path}:${lineCount}`)}`);
            fileTurnMessageHash = createHash("sha256").update(text).digest("hex");
            fileTurnMessageSummary = allowMessageSummary
              ? sanitizeUserMessageSummaryForStorage(record, fileTurnSequence)
              : `第 ${fileTurnSequence} 条用户消息（摘要保存未开启）`;
          }
          const workspaceRef = readDeepString(record, [
            "cwd",
            "workdir",
            "workspace",
            "workspace_ref",
            "workspaceRef"
          ]);
          if (workspaceRef) {
            fileWorkspaceRef = normalizeProjectPath(workspaceRef);
            observedWorkspaceRefs.add(fileWorkspaceRef);
            latestObservedWorkspaceRef ??= fileWorkspaceRef;
            if (
              options.projectRoot &&
              !matchedWorkspaceRef &&
              isSameOrDescendantPath(fileWorkspaceRef, options.projectRoot)
            ) {
              matchedWorkspaceRef = fileWorkspaceRef;
            }
          }
          if (syntheticUserMessage) {
            continue;
          }
          const effectiveWorkspaceRef = workspaceRef ?? fileWorkspaceRef;
          const tokenFields = detectTokenFields(record);
          const lineHasTokenFields =
            tokenFields.promptTokens != null ||
            tokenFields.completionTokens != null ||
            tokenFields.totalTokens != null;
          tokenFieldsDetected =
            tokenFieldsDetected ||
            lineHasTokenFields;

          const skillEvidenceText = collectSkillEvidenceText(record);
          const skillNames = detectSkillNames(skillEvidenceText, skills);
          const toolNames = detectToolNames(record, evidenceText);
          const modelName = readDeepString(record, ["model", "model_name", "modelName"]);
          for (const skillName of skillNames) {
            detectedSkillNames.add(skillName);
          }
          for (const toolName of toolNames) {
            detectedToolNames.add(toolName);
          }
          if (modelName) {
            detectedModelNames.add(modelName);
          }
          if (skillNames.size === 0 && toolNames.size === 0 && !lineHasTokenFields) {
            continue;
          }

          detectedEvents += 1;
          const runKey = this.buildRunKey(source, file.path, record, fileSessionRef, fileTurnRef);
          const draft =
            runs.get(runKey) ??
            ({
              runId: `local-tool-${hashId(`${source.id}:${runKey}`)}`,
              turnRef: fileTurnRef,
              sourceRef: file.path,
              sessionRef: fileSessionRef,
              messageHash: fileTurnMessageHash,
              messageSummary: fileTurnMessageSummary,
              workspaceRef: effectiveWorkspaceRef,
              startedAt: null,
              finishedAt: null,
              durationMs: null,
              firstOutputLatencyMs: null,
              promptTokens: null,
              completionTokens: null,
              totalTokens: null,
              modelName: null,
              toolNames: new Set<string>(),
              skillNames: new Set<string>(),
              workflowSignals: new Set<string>(),
              eventCount: 0,
              projectMatched:
                !options.projectRoot ||
                Boolean(
                  effectiveWorkspaceRef &&
                  isSameOrDescendantPath(effectiveWorkspaceRef, options.projectRoot)
                )
            } satisfies RunDraft);
          updateRunDraft(draft, record, evidenceText, skillEvidenceText, file, skills, options);
          runs.set(runKey, draft);
        }
      } finally {
        reader.close();
      }
    }

    const build = this.buildEvents(source, runs, skills, options);
    const events = build.events;
    if (build.inferredRuns > 0) {
      warnings.push(
        `${build.inferredRuns} project turn(s) were observed from project path and tool evidence without attributing any Skill invocation.`
      );
    }
    if (ignoredSyntheticSessionFiles > 0) {
      warnings.push(
        `Ignored ${ignoredSyntheticSessionFiles} internal subagent session file(s); project traces only use direct user-session evidence.`
      );
    }
    if (
      options.projectRoot &&
      events.length === 0 &&
      observedWorkspaceRefs.size > 0 &&
      !matchedWorkspaceRef
    ) {
      warnings.push(
        `No local session cwd matched ${options.projectRoot}. Latest observed workspace: ${latestObservedWorkspaceRef}.`
      );
    }
    const importableRuns = new Set(events.map((event) => String(event.run_id))).size;
    const detectedRuns = runs.size;
    for (const skillName of build.inferredSkillNames) {
      detectedSkillNames.add(skillName);
    }
    const preview = {
      candidateFiles: candidateFiles.length,
      readableFiles,
      scannedLines,
      detectedEvents,
      detectedRuns,
      importableRuns,
      detectedSkillNames: Array.from(detectedSkillNames).sort((left, right) => left.localeCompare(right)).slice(0, 16),
      detectedToolNames: Array.from(detectedToolNames).sort((left, right) => left.localeCompare(right)).slice(0, 16),
      detectedModelNames: Array.from(detectedModelNames).sort((left, right) => left.localeCompare(right)).slice(0, 12),
      tokenFieldsDetected,
      sensitiveFieldCount,
      confidence: confidenceFor(events.length, tokenFieldsDetected, importableRuns),
      normalizedEventCount: events.length,
      warnings: Array.from(new Set(warnings)).slice(0, 10)
    };

    if (incrementalKey) {
      this.projectSourceFingerprints.set(
        incrementalKey,
        new Map(candidateFiles.map((file) => [file.path, `${file.size}:${file.modifiedAt ?? ""}`]))
      );
    }

    return { preview, events, matchedWorkspaceRef, latestObservedWorkspaceRef };
  }

  private async cleanupProjectRuntimeStagingFiles() {
    const importDir = join(this.storagePaths.eventsDir, "project-runtime-imports");
    try {
      const entries = await readdir(importDir, { withFileTypes: true });
      await Promise.all(
        entries
          .filter((entry) => entry.isFile() && LOG_EXTENSIONS.has(extensionOf(entry.name)))
          .map((entry) => unlink(join(importDir, entry.name)).catch(() => undefined))
      );
    } catch {
      // The staging directory is optional until the first runtime import.
    }
  }

  private emptyScan(warnings: string[]): NormalizedScan {
    return {
      preview: {
        candidateFiles: 0,
        readableFiles: 0,
        scannedLines: 0,
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
        warnings
      },
      events: [],
      matchedWorkspaceRef: null,
      latestObservedWorkspaceRef: null
    };
  }

  private async readIncrementalTurnPrelude(
    filePath: string,
    incrementalStart: number,
    allowMessageSummary: boolean
  ): Promise<IncrementalTurnPrelude> {
    const result: IncrementalTurnPrelude = {
      workspaceRef: null,
      sessionRef: null,
      turnRef: null,
      messageHash: null,
      messageSummary: null,
      messageSequence: 0,
      hasExplicitTurnBoundary: false
    };
    if (incrementalStart <= 0) {
      return result;
    }

    const contextStart = Math.max(0, incrementalStart - MAX_INCREMENTAL_PRELUDE_BYTES);
    const input = createReadStream(filePath, {
      encoding: "utf8",
      start: contextStart,
      end: incrementalStart - 1
    });
    const reader = createInterface({ input, crlfDelay: Infinity });
    let lineCount = 0;
    try {
      for await (const rawLine of reader) {
        lineCount += 1;
        if (contextStart > 0 && lineCount === 1) {
          continue;
        }
        const line = rawLine.trim();
        if (!line) {
          continue;
        }
        const record = this.parseLine(line);
        if (!record) {
          continue;
        }
        result.sessionRef = this.readSessionRef(record) ?? result.sessionRef;
        const workspaceRef = readDeepString(record, [
          "cwd",
          "workdir",
          "workspace",
          "workspace_ref",
          "workspaceRef"
        ]);
        if (workspaceRef) {
          result.workspaceRef = normalizeProjectPath(workspaceRef);
        }
        const explicitTurnRef = this.readExplicitTurnRef(record);
        if (explicitTurnRef) {
          result.turnRef = explicitTurnRef;
          result.hasExplicitTurnBoundary = true;
        }
        if (!isUserMessageRecord(record) || isSyntheticUserMessageRecord(record)) {
          continue;
        }
        result.messageSequence += 1;
        result.turnRef =
          explicitTurnRef ??
          (result.hasExplicitTurnBoundary
            ? result.turnRef
            : this.readMessageRef(record) ??
              `message-${result.messageSequence}-${hashId(`${filePath}:${lineCount}`)}`);
        const text = collectPrimitiveText(record).join("\n");
        result.messageHash = createHash("sha256").update(text).digest("hex");
        result.messageSummary = allowMessageSummary
          ? sanitizeUserMessageSummaryForStorage(record, result.messageSequence)
          : `第 ${result.messageSequence} 条用户消息（摘要保存未开启）`;
      }
      return result;
    } finally {
      reader.close();
      input.close();
    }
  }

  private parseLine(line: string): JsonRecord | null {
    try {
      const parsed = JSON.parse(line) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private async readSourceFileHeader(filePath: string): Promise<SourceFileHeader> {
    const input = createReadStream(filePath, {
      encoding: "utf8",
      start: 0,
      end: 1024 * 1024 - 1
    });
    const reader = createInterface({ input, crlfDelay: Infinity });
    try {
      for await (const rawLine of reader) {
        const line = rawLine.trim();
        if (!line) {
          continue;
        }
        const parsed = this.parseLine(line);
        if (!parsed) {
          return {
            workspaceRef: null,
            sessionRef: null,
            isSyntheticSubagent: line.includes('"thread_source":"subagent"') || line.includes('"source":{"subagent"')
          };
        }
        const workspaceRef = readDeepString(parsed, [
          "cwd",
          "workdir",
          "workspace",
          "workspace_ref",
          "workspaceRef"
        ]);
        return {
          workspaceRef: workspaceRef ? normalizeProjectPath(workspaceRef) : null,
          sessionRef: this.readSessionRef(parsed),
          isSyntheticSubagent: isSyntheticSubagentSessionRecord(parsed)
        };
      }
      return {
        workspaceRef: null,
        sessionRef: null,
        isSyntheticSubagent: false
      };
    } finally {
      reader.close();
      input.close();
    }
  }

  private buildRunKey(
    source: LocalToolTelemetrySource,
    filePath: string,
    record: JsonRecord,
    sessionOverride: string | null,
    turnOverride: string
  ) {
    const sessionRef = this.readSessionRef(record) ?? sessionOverride ?? hashId(filePath);
    const turnRef = this.readExplicitTurnRef(record) ?? turnOverride;
    return `${source.id}:${sessionRef}:${turnRef}`;
  }

  private readExplicitTurnRef(record: JsonRecord) {
    return readDeepString(record, ["turn_id", "turnId", "request_id", "requestId"]);
  }

  private readMessageRef(record: JsonRecord) {
    return readDeepString(record, ["message_id", "messageId", "id"]);
  }

  private readSessionRef(record: JsonRecord) {
    return readDeepString(record, [
      "session_id",
      "sessionId",
      "conversation_id",
      "conversationId",
      "thread_id",
      "threadId"
    ]);
  }

  private buildEvents(
    source: LocalToolTelemetrySource,
    runs: Map<string, RunDraft>,
    skills: ActiveSkill[],
    options: ScanOptions = {}
  ): BuildEventsResult {
    const sourceType = sourceTypeForKind(source.kind);
    const events: JsonRecord[] = [];
    const inferredSkillNames = new Set<string>();
    let inferredRuns = 0;
    for (const draft of runs.values()) {
      if (options.projectRoot && !draft.projectMatched) {
        continue;
      }
      const inferredWorkflowSkillNames =
        draft.skillNames.size === 0
          ? inferProjectWorkflowSkillNames(draft, skills, options.projectRoot)
          : new Set<string>();
      const skillNames = Array.from(
        draft.skillNames.size > 0 ? draft.skillNames : inferredWorkflowSkillNames
      );
      const inferredAttribution = draft.skillNames.size === 0 && skillNames.length > 0;
      for (const skillName of inferredWorkflowSkillNames) {
        inferredSkillNames.add(skillName);
      }
      if (skillNames.length === 0) {
        inferredRuns += 1;
        const observedAt = draft.finishedAt ?? draft.startedAt ?? nowIso();
        events.push({
          event_id: `event-${hashId(`${draft.runId}:turn-observed`)}`,
          event_type: "turn.observed",
          event_order: 1,
          occurred_at: observedAt,
          run_id: draft.runId,
          turn_ref: draft.turnRef,
          source_type: sourceType,
          capture_mode: "estimated",
          confidence_score: Math.min(this.confidenceScoreForDraft(draft), 0.55),
          model_name: draft.modelName,
          prompt_tokens: draft.promptTokens ?? undefined,
          completion_tokens: draft.completionTokens ?? undefined,
          total_tokens: draft.totalTokens ?? undefined,
          tool_call_count: draft.toolNames.size,
          tool_names: Array.from(draft.toolNames).sort((left, right) => left.localeCompare(right)),
          workflow_signals: Array.from(draft.workflowSignals).sort((left, right) => left.localeCompare(right)),
          message_hash: draft.messageHash,
          user_message_summary: draft.messageSummary,
          workspace_ref: draft.workspaceRef,
          session_ref: draft.sessionRef,
          source_ref: draft.sourceRef,
          evidence_boundary: "project_path_and_tool_observation",
          skill_attribution: "none"
        });
        continue;
      }
      const splitCount = Math.max(skillNames.length, 1);
      const startedAt = draft.startedAt ?? draft.finishedAt ?? nowIso();
      const finishedAt = draft.finishedAt ?? startedAt;
      const durationMs =
        draft.durationMs ??
        Math.max(new Date(finishedAt).getTime() - new Date(startedAt).getTime(), 0);
      const toolCallCount = Math.max(draft.toolNames.size, 0);
      const confidenceScore = inferredAttribution
        ? this.confidenceScoreForDraft(draft, true)
        : this.confidenceScoreForDraft(draft);

      for (const skillName of skillNames) {
        const resolvedSkill =
          (options.projectRoot
            ? skills.find(
                (skill) =>
                  skill.displayName === skillName &&
                  isSameOrDescendantPath(skill.sourcePath, options.projectRoot!)
              )
            : undefined) ??
          skills.find((skill) => skill.displayName === skillName);
        const runId = `${draft.runId}-${hashId(skillName)}`;
        const base = {
          run_id: runId,
          turn_ref: draft.turnRef,
          skill_id: resolvedSkill?.id,
          skill_name: skillName,
          skill_path: resolvedSkill?.sourcePath,
          source_type: sourceType,
          capture_mode: inferredAttribution ? "inferred" : "estimated",
          confidence_score: confidenceScore,
          model_name: draft.modelName,
          prompt_tokens:
            draft.promptTokens != null ? Math.max(Math.round(draft.promptTokens / splitCount), 0) : undefined,
          completion_tokens:
            draft.completionTokens != null
              ? Math.max(Math.round(draft.completionTokens / splitCount), 0)
              : undefined,
          total_tokens:
            draft.totalTokens != null ? Math.max(Math.round(draft.totalTokens / splitCount), 0) : undefined,
          tool_call_count: Math.max(Math.ceil(toolCallCount / splitCount), toolCallCount > 0 ? 1 : 0),
          tool_names: Array.from(draft.toolNames).sort((left, right) => left.localeCompare(right)),
          workflow_signals: Array.from(draft.workflowSignals).sort((left, right) => left.localeCompare(right)),
          skill_hit_state: "inferred",
          hit_index: Math.min(
            89,
            Math.round(confidenceScore * 100)
          ),
          message_hash: draft.messageHash,
          user_message_summary: draft.messageSummary,
          workspace_ref: draft.workspaceRef,
          session_ref: draft.sessionRef,
          source_ref: draft.sourceRef,
          evidence_boundary: inferredAttribution
            ? "project_path_user_turn_tool_and_workflow_signal"
            : "project_skill_name_reference"
        };
        events.push({
          ...base,
          event_id: `event-${hashId(`${runId}:started`)}`,
          event_type: "skill_run.started",
          event_order: 1,
          occurred_at: startedAt,
          started_at: startedAt
        });
        if (draft.firstOutputLatencyMs != null) {
          events.push({
            ...base,
            event_id: `event-${hashId(`${runId}:first-output`)}`,
            event_type: "skill_run.first_output",
            event_order: 2,
            occurred_at: startedAt,
            latency_ms: draft.firstOutputLatencyMs
          });
        }
        if (toolCallCount > 0) {
          events.push({
            ...base,
            event_id: `event-${hashId(`${runId}:tool-called`)}`,
            event_type: "skill_run.tool_called",
            event_order: 3,
            occurred_at: finishedAt
          });
        }
        events.push({
          ...base,
          event_id: `event-${hashId(`${runId}:completed`)}`,
          event_type: "skill_run.completed",
          event_order: 4,
          occurred_at: finishedAt,
          started_at: startedAt,
          finished_at: finishedAt,
          duration_ms: durationMs
        });
      }
    }
    return {
      events,
      inferredRuns,
      inferredSkillNames: Array.from(inferredSkillNames).sort((left, right) => left.localeCompare(right))
    };
  }

  private confidenceScoreForDraft(draft: RunDraft, inferred = false) {
    let score = 0.45;
    if (draft.toolNames.size > 0) {
      score += 0.15;
    }
    if (draft.totalTokens != null || draft.promptTokens != null || draft.completionTokens != null) {
      score += 0.2;
    }
    if (draft.durationMs != null || draft.firstOutputLatencyMs != null) {
      score += 0.1;
    }
    if (draft.skillNames.size === 1) {
      score += 0.05;
    }
    return Math.min(score, inferred ? 0.68 : 0.95);
  }
}
