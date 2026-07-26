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

const MAX_FILES_PER_SOURCE = 120;
const MAX_DIRECTORIES_PER_SOURCE = 4000;
const MAX_LINES_PER_FILE = 20000;
const MAX_BYTES_PER_TEXT_FILE = 150 * 1024 * 1024;
const MAX_INCREMENTAL_FILES = 3;
const MAX_INCREMENTAL_LINES_PER_FILE = 4000;
const MAX_INCREMENTAL_BYTES_PER_FILE = 4 * 1024 * 1024;
const SOURCE_INVENTORY_CACHE_MS = 15_000;
const LOG_EXTENSIONS = new Set([".jsonl", ".ndjson", ".json", ".log", ".txt"]);
const SENSITIVE_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}/,
  /\bBearer\s+[A-Za-z0-9._-]{12,}/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\b(api[_-]?key|token|password|secret)\b\s*[:=]\s*["']?[^"',\s]{8,}/i
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

function projectSkillNameByCanonical(
  skills: ActiveSkill[],
  canonicalName: string,
  projectRoot: string | null | undefined
) {
  const normalizedCanonicalName = canonicalName.toLowerCase();
  const candidates = skills.filter((skill) => {
    const matchesName =
      skill.canonicalName.toLowerCase() === normalizedCanonicalName ||
      skill.displayName.toLowerCase() === normalizedCanonicalName ||
      skill.aliases.some((alias) => alias.toLowerCase() === normalizedCanonicalName);
    if (!matchesName) {
      return false;
    }
    return projectRoot ? isSameOrDescendantPath(skill.sourcePath, projectRoot) : true;
  });
  return candidates[0]?.displayName ?? null;
}

function inferProjectWorkflowSkillNames(
  draft: RunDraft,
  skills: ActiveSkill[],
  options: ScanOptions = {}
) {
  const names = new Set<string>();
  if (!options.projectRoot || !draft.projectMatched || draft.toolNames.size === 0 || draft.skillNames.size > 0) {
    return names;
  }

  const signals = draft.workflowSignals;
  const preferredCanonicals = [
    "project-dev-core",
    signals.has("code_generation") ? "project-code-generation" : null,
    signals.has("test_and_report") ? "project-test-and-report" : null,
    signals.has("verification_loop") ? "project-verification-loop" : null,
    signals.has("codebase_onboarding") ? "project-codebase-onboarding" : null,
    signals.has("frontend_css") ? "project-frontend-css" : null,
    signals.has("frontend_react") ? "project-frontend-react" : null,
    signals.has("frontend_vue") ? "project-frontend-vue" : null,
    signals.has("frontend_js") ? "project-frontend-js" : null,
    signals.has("security_review") ? "project-security-review" : null,
    signals.has("code_review") ? "project-code-review" : null
  ].filter((value): value is string => Boolean(value));

  for (const canonicalName of preferredCanonicals) {
    const displayName = projectSkillNameByCanonical(skills, canonicalName, options.projectRoot);
    if (displayName) {
      names.add(displayName);
    }
    if (names.size >= 3) {
      break;
    }
  }

  return names;
}

function detectTokenFields(record: JsonRecord) {
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

function updateRunDraft(
  draft: RunDraft,
  record: JsonRecord,
  rawLine: string,
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
  for (const skillName of detectSkillNames(rawLine, skills)) {
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
    const refreshMode = options.mode ?? "full";
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
    const sourceFingerprint = sources
      .map((source) => `${source.id}:${source.fileCount}:${source.byteCount}:${source.lastModifiedAt ?? ""}`)
      .join("|");
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
    let importedRuns = 0;
    let updatedRuns = 0;
    let importableRuns = 0;
    let matchedWorkspaceRef: string | null = null;
    let latestObservedWorkspaceRef: string | null = null;

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
      return LOG_EXTENSIONS.has(extensionOf(resolved))
        ? [{ path: resolved, size: rootStat.size, modifiedAt: rootStat.mtime.toISOString() }]
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
        if (fileStat.size > MAX_BYTES_PER_TEXT_FILE) {
          continue;
        }
        files.push({
          path: nextPath,
          size: fileStat.size,
          modifiedAt: fileStat.mtime.toISOString()
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

    const sourcePath = resolve(source.path);
    const candidateFiles =
      this.sourceFilesByPath.get(sourcePath) ??
      await this.listCandidateFiles(source.path, source.pathType === "file" ? "file" : "directory");
    const incrementalKey = options.projectRoot
      ? `${normalizeProjectPath(options.projectRoot)}::${options.mode ?? "full"}::${source.id}::${sourcePath}`
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
          .slice(0, MAX_INCREMENTAL_FILES)
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

    for (const file of files) {
      readableFiles += 1;
      let fileWorkspaceRef: string | null = null;
      let fileSessionRef: string | null = null;
      let fileTurnRef = `file-${hashId(file.path)}`;
      let fileTurnMessageHash: string | null = null;
      let fileTurnMessageSummary: string | null = null;
      let fileTurnSequence = 0;
      const incrementalStart = options.mode === "incremental"
        ? Math.max(0, file.size - MAX_INCREMENTAL_BYTES_PER_FILE)
        : 0;
      const maxLines = options.mode === "incremental"
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
          if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(line))) {
            sensitiveFieldCount += 1;
          }

          const parsed = this.parseLine(line);
          const text = parsed ? collectPrimitiveText(parsed).join("\n") : line;
          const record = parsed ?? { line: text };
          fileSessionRef = this.readSessionRef(record) ?? fileSessionRef;
          if (isUserMessageRecord(record)) {
            fileTurnSequence += 1;
            fileTurnRef =
              this.readExplicitTurnRef(record) ??
              this.readMessageRef(record) ??
              `message-${fileTurnSequence}-${hashId(`${file.path}:${lineCount}`)}`;
            fileTurnMessageHash = createHash("sha256").update(text).digest("hex");
            fileTurnMessageSummary = `第 ${fileTurnSequence} 条用户消息（原文未保存）`;
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
          const effectiveWorkspaceRef = workspaceRef ?? fileWorkspaceRef;
          const tokenFields = detectTokenFields(record);
          const lineHasTokenFields =
            tokenFields.promptTokens != null ||
            tokenFields.completionTokens != null ||
            tokenFields.totalTokens != null;
          tokenFieldsDetected =
            tokenFieldsDetected ||
            lineHasTokenFields;

          const skillNames = detectSkillNames(text, skills);
          const toolNames = detectToolNames(record, text);
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
          updateRunDraft(draft, record, text, file, skills, options);
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
        `${build.inferredRuns} project run(s) were attributed from project path and tool-call evidence because no explicit Skill invocation name was present in the local session log.`
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

  private parseLine(line: string): JsonRecord | null {
    try {
      const parsed = JSON.parse(line) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
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
      const inferredNames = inferProjectWorkflowSkillNames(draft, skills, options);
      if (inferredNames.size > 0) {
        inferredRuns += 1;
        for (const skillName of inferredNames) {
          inferredSkillNames.add(skillName);
        }
      }
      const resolvedSkillNames = draft.skillNames.size > 0 ? draft.skillNames : inferredNames;
      if (resolvedSkillNames.size === 0) {
        continue;
      }
      const skillNames = Array.from(resolvedSkillNames);
      const splitCount = Math.max(skillNames.length, 1);
      const startedAt = draft.startedAt ?? draft.finishedAt ?? nowIso();
      const finishedAt = draft.finishedAt ?? startedAt;
      const durationMs =
        draft.durationMs ??
        Math.max(new Date(finishedAt).getTime() - new Date(startedAt).getTime(), 0);
      const toolCallCount = Math.max(draft.toolNames.size, 0);

      for (const skillName of skillNames) {
        const runId = `${draft.runId}-${hashId(skillName)}`;
        const base = {
          run_id: runId,
          turn_ref: draft.turnRef,
          skill_name: skillName,
          source_type: sourceType,
          capture_mode: "estimated",
          confidence_score: this.confidenceScoreForDraft(draft, inferredNames.has(skillName)),
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
            Math.round(this.confidenceScoreForDraft(draft, inferredNames.has(skillName)) * 100)
          ),
          message_hash: draft.messageHash,
          user_message_summary: draft.messageSummary,
          workspace_ref: draft.workspaceRef,
          session_ref: draft.sessionRef,
          source_ref: draft.sourceRef
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
