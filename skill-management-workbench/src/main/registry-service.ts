import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type {
  ScanResult,
  SkillGovernanceProfile,
  SkillHealthScorePolicy,
  SkillHealthTrend,
  SkillSummary
} from "../shared/types";
import type { AuthorizationService } from "./authorization-service";
import type { WorkbenchDatabase } from "./database";
import { calculateSkillHealth } from "./health-score-service";
import type { HealthScorePolicyService } from "./health-score-policy-service";

const skippedDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  ".next",
  ".turbo"
]);

function nowIso() {
  return new Date().toISOString();
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function toMetricDate(value: string) {
  return value.slice(0, 10);
}

function getTrendDirection(delta: number | null): SkillHealthTrend["direction"] {
  if (delta === null) {
    return "new";
  }
  if (delta > 0) {
    return "up";
  }
  if (delta < 0) {
    return "down";
  }
  return "flat";
}

function parseFrontmatter(text: string): { name?: string; description?: string } {
  if (!text.startsWith("---")) {
    return {};
  }

  const endIndex = text.indexOf("\n---", 3);
  if (endIndex === -1) {
    return {};
  }

  const raw = text.slice(4, endIndex);
  try {
    const parsed = parseYaml(raw) as Record<string, unknown> | null;
    return {
      name: typeof parsed?.name === "string" ? parsed.name : undefined,
      description: typeof parsed?.description === "string" ? parsed.description : undefined
    };
  } catch {
    return {};
  }
}

function detectSourceType(path: string) {
  if (path.includes("/.codex/skills/")) {
    return "codex_home";
  }
  if (path.includes("/plugins/cache/")) {
    return "plugin_cache";
  }
  if (path.includes("/skills/")) {
    return "workspace_local";
  }
  return "custom_local";
}

function isSameOrDescendantPath(candidatePath: string, parentPath: string) {
  const candidate = resolve(candidatePath);
  const parent = resolve(parentPath);
  return (
    candidate === parent ||
    candidate.startsWith(`${parent}/`) ||
    candidate.startsWith(`${parent}\\`)
  );
}

function isExcludedPath(candidatePath: string, exclusions: string[]) {
  return exclusions.some((exclusion) => isSameOrDescendantPath(candidatePath, exclusion));
}

function deriveGovernanceProfile(input: {
  canonicalName: string;
  sourceType: string;
  sourcePath: string;
  description: string | null;
}): SkillGovernanceProfile {
  const haystack = [
    input.canonicalName,
    input.sourceType,
    input.sourcePath,
    input.description ?? ""
  ]
    .join(" ")
    .toLowerCase();

  const hasAccountSignal = /(account|auth|credential|token|login|identity)/.test(haystack);
  const hasServerSignal = /(server|deploy|runtime|host|ssh|infra|cluster|endpoint|path)/.test(haystack);
  const hasMemorySignal = /(memory|context|knowledge|profile|history|session)/.test(haystack);
  const hasDevelopmentSignal = /(dev|code|repo|build|test|debug|review|refactor)/.test(haystack);
  const hasAnalysisSignal = /(graph|analy|telemetry|metric|observ)/.test(haystack);
  const hasPackagingSignal = /(bundle|package|export|import|manifest)/.test(haystack);
  const hasFrameworkSignal = /(framework|workflow starter|operating system|constitution|agents\.md|router|orchestrat|gstack|gsd|spec-kit|workflow-state)/.test(
    haystack
  );
  const hasSuperpowersSignal = /(superpowers|subagent|tdd|reviewer|implementation plan|finish workflow)/.test(
    haystack
  );
  const orchestrationSignals = new Set<SkillGovernanceProfile["orchestrationSignals"][number]>();

  const role = hasMemorySignal
    ? "memory"
    : hasServerSignal
      ? "infrastructure"
      : hasDevelopmentSignal
        ? "development"
        : hasAnalysisSignal
          ? "analysis"
          : hasPackagingSignal
            ? "packaging"
            : "governance";

  const dataClasses = new Set<SkillGovernanceProfile["dataClasses"][number]>();

  if (hasAccountSignal) {
    dataClasses.add("account_identity");
  }
  if (hasServerSignal) {
    dataClasses.add("server_path");
    dataClasses.add("server_runtime");
  }
  if (hasDevelopmentSignal) {
    dataClasses.add("development_context");
  }
  if (hasMemorySignal) {
    dataClasses.add("local_knowledge");
  }
  if (hasAnalysisSignal || hasPackagingSignal) {
    dataClasses.add("workflow_state");
  }
  if (dataClasses.size === 0) {
    dataClasses.add("workflow_state");
  }

  if (/(router|route|routing|superpowers)/.test(haystack)) {
    orchestrationSignals.add("router_layer");
  }
  if (/(spec|plan|tasks|checklist|artifact)/.test(haystack)) {
    orchestrationSignals.add("spec_artifacts");
  }
  if (/(memory|workflow-state|reflection|evolution)/.test(haystack)) {
    orchestrationSignals.add("memory_governance");
  }
  if (/(review|gstack|qa|ship)/.test(haystack)) {
    orchestrationSignals.add("review_gate");
  }
  if (/(test|verification|doctor|report)/.test(haystack)) {
    orchestrationSignals.add("test_gate");
  }
  if (/(release|branch|delivery)/.test(haystack)) {
    orchestrationSignals.add("release_flow");
  }
  if (/(gsd|long-task|long running|milestone|orchestrat)/.test(haystack)) {
    orchestrationSignals.add("long_task_orchestration");
  }
  if (hasFrameworkSignal) {
    orchestrationSignals.add("multi_skill_composition");
  }

  const containsSensitiveOperationalData = hasAccountSignal || hasServerSignal;
  const storesLongLivedContext =
    hasMemorySignal || role === "infrastructure" || role === "governance";
  const structureType =
    hasFrameworkSignal || orchestrationSignals.size >= 3 ? "composite_framework" : "single_skill";
  const frameworkLabel = input.sourcePath.includes("project-engineering-workflow")
    ? "Workflow Skills"
    : structureType === "composite_framework"
      ? "Composite Skill Framework"
      : null;

  return {
    role,
    preferredHarness:
      role === "development" && (hasSuperpowersSignal || input.sourcePath.toLowerCase().includes("superpowers"))
        ? "superpowers"
        : "generic",
    structureType,
    frameworkLabel,
    orchestrationSignals: [...orchestrationSignals],
    moduleCountHint:
      input.sourcePath.includes("project-engineering-workflow")
        ? 12
        : structureType === "composite_framework"
          ? Math.max(orchestrationSignals.size, 3)
          : null,
    dataClasses: [...dataClasses],
    storagePolicy: containsSensitiveOperationalData
      ? "local_sensitive"
      : storesLongLivedContext
        ? "local_persisted"
        : "session_only",
    reusePolicy: containsSensitiveOperationalData
      ? "local_only"
      : storesLongLivedContext
        ? "review_before_bundle"
        : "safe_to_bundle",
    recommendedScope:
      role === "infrastructure"
        ? "workspace"
        : role === "development" || role === "analysis" || role === "packaging"
          ? "project"
          : role === "memory"
            ? "folder"
            : "workspace",
    storesLongLivedContext,
    containsSensitiveOperationalData
  };
}

interface HealthSnapshotRow {
  score: number;
  measured_at: string;
  sample_count: number;
}

function walkSkillFiles(
  root: string,
  found: string[],
  exclusions: string[],
  stats: { skippedEntryCount: number }
) {
  const queue = [resolve(root)];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const absolutePath = join(current, entry.name);

      if (isExcludedPath(absolutePath, exclusions)) {
        stats.skippedEntryCount += 1;
        continue;
      }

      if (entry.isDirectory()) {
        if (!skippedDirectories.has(entry.name)) {
          queue.push(absolutePath);
        }
        continue;
      }

      if (entry.isFile() && entry.name === "SKILL.md") {
        found.push(absolutePath);
      }
    }
  }
}

function toSkillSummary(
  row: Record<string, unknown>,
  healthScorePolicy: SkillHealthScorePolicy
): SkillSummary {
  const runs7d = Number(row.runs_7d ?? 0);
  const successCount7d = Number(row.success_count_7d ?? 0);
  const failureCount7d = Number(row.failure_count_7d ?? 0);
  const avgDurationMs7d =
    row.avg_duration_ms_7d === null || row.avg_duration_ms_7d === undefined
      ? null
      : Number(row.avg_duration_ms_7d);
  const totalTokens7d = Number(row.total_tokens_7d ?? 0);
  const lineCount =
    typeof row.line_count === "number" ? row.line_count : row.line_count ? Number(row.line_count) : null;
  const description = row.frontmatter_description ? String(row.frontmatter_description) : null;

  return {
    id: String(row.id),
    canonicalName: String(row.canonical_name),
    displayName: String(row.display_name),
    sourceType: String(row.source_type),
    sourcePath: String(row.source_path),
    currentVersionFingerprint: row.version_fingerprint ? String(row.version_fingerprint) : null,
    description,
    lineCount,
    lastSeenAt: String(row.last_seen_at),
    governance: deriveGovernanceProfile({
      canonicalName: String(row.canonical_name),
      sourceType: String(row.source_type),
      sourcePath: String(row.source_path),
      description
    }),
    health: calculateSkillHealth(
      {
        hasDescription: Boolean(description && description.trim().length > 0),
        lineCount,
        lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
        runs7d,
        successCount7d,
        failureCount7d,
        avgDurationMs7d,
        totalTokens7d,
        openProposalCount: Number(row.open_proposal_count ?? 0),
        acceptedProposalCount: Number(row.accepted_proposal_count ?? 0),
        highSeverityProposalCount: Number(row.high_severity_proposal_count ?? 0),
        mediumSeverityProposalCount: Number(row.medium_severity_proposal_count ?? 0),
        lowSeverityProposalCount: Number(row.low_severity_proposal_count ?? 0)
      },
      new Date(),
      healthScorePolicy
    )
  };
}

export class RegistryService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly authorizationService: AuthorizationService,
    private readonly healthScorePolicyService: HealthScorePolicyService
  ) {}

  listSkills(): SkillSummary[] {
    const rows = this.database.db
      .prepare(
        `SELECT
           skills.id,
           skills.canonical_name,
           skills.display_name,
           skills.source_type,
           skills.source_path,
           skills.last_seen_at,
           skill_versions.version_fingerprint,
           skill_versions.frontmatter_description,
           skill_versions.line_count,
           COALESCE(metric_rollup.runs_7d, 0) AS runs_7d,
           COALESCE(metric_rollup.success_count_7d, 0) AS success_count_7d,
           COALESCE(metric_rollup.failure_count_7d, 0) AS failure_count_7d,
           metric_rollup.avg_duration_ms_7d,
           COALESCE(metric_rollup.total_tokens_7d, 0) AS total_tokens_7d,
           COALESCE(proposal_rollup.open_proposal_count, 0) AS open_proposal_count,
           COALESCE(proposal_rollup.accepted_proposal_count, 0) AS accepted_proposal_count,
           COALESCE(proposal_rollup.high_severity_proposal_count, 0) AS high_severity_proposal_count,
           COALESCE(proposal_rollup.medium_severity_proposal_count, 0) AS medium_severity_proposal_count,
           COALESCE(proposal_rollup.low_severity_proposal_count, 0) AS low_severity_proposal_count
         FROM skills
         LEFT JOIN skill_versions
           ON skill_versions.skill_id = skills.id
          AND skill_versions.is_current = 1
         LEFT JOIN (
           SELECT
             skill_id,
             SUM(runs_count) AS runs_7d,
             SUM(success_count) AS success_count_7d,
             SUM(failure_count) AS failure_count_7d,
             CASE
               WHEN SUM(runs_count) > 0 THEN
                 CAST(SUM(COALESCE(avg_duration_ms, 0) * runs_count) AS REAL) / SUM(runs_count)
               ELSE NULL
             END AS avg_duration_ms_7d,
             SUM(total_tokens) AS total_tokens_7d
           FROM daily_skill_metrics
           WHERE metric_date >= date('now', '-6 days')
           GROUP BY skill_id
         ) metric_rollup
           ON metric_rollup.skill_id = skills.id
         LEFT JOIN (
           SELECT
             skill_id,
             SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_proposal_count,
             SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_proposal_count,
             SUM(CASE WHEN status IN ('open', 'accepted') AND severity = 'high' THEN 1 ELSE 0 END) AS high_severity_proposal_count,
             SUM(CASE WHEN status IN ('open', 'accepted') AND severity = 'medium' THEN 1 ELSE 0 END) AS medium_severity_proposal_count,
             SUM(CASE WHEN status IN ('open', 'accepted') AND severity = 'low' THEN 1 ELSE 0 END) AS low_severity_proposal_count
           FROM optimization_proposals
           GROUP BY skill_id
         ) proposal_rollup
           ON proposal_rollup.skill_id = skills.id
         WHERE skills.is_active = 1
         ORDER BY skills.last_seen_at DESC, skills.display_name ASC`
      )
      .all() as Record<string, unknown>[];

    const healthScorePolicy = this.healthScorePolicyService.getPolicy();
    const skills = rows.map((row) => toSkillSummary(row, healthScorePolicy));
    this.recordHealthSnapshots(skills);
    const trends = this.listHealthTrends(skills.map((skill) => skill.id));

    return skills.map((skill) => ({
      ...skill,
      health: {
        ...skill.health,
        trend: trends.get(skill.id) ?? skill.health.trend
      }
    }));
  }

  getLastScanCompletedAt(): string | null {
    const row = this.database.db
      .prepare(
        `SELECT finished_at
         FROM scan_runs
         WHERE status = 'completed'
         ORDER BY finished_at DESC
         LIMIT 1`
      )
      .get() as Record<string, unknown> | undefined;

    return row?.finished_at ? String(row.finished_at) : null;
  }

  scanApprovedRoots(): ScanResult {
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      throw new Error("No active authorization policy. Grant authorization first.");
    }

    const roots = this.authorizationService.listRoots(policy.id);
    if (roots.length === 0) {
      throw new Error("No enabled scan roots are configured.");
    }
    const exclusions = this.authorizationService.listExclusions(policy.id).map((entry) => entry.path);

    const startedAt = nowIso();
    const scanRunId = randomUUID();

    this.database.db
      .prepare(
        `INSERT INTO scan_runs (
           id, policy_id, trigger_type, started_at, finished_at, status,
           roots_scanned, files_seen, skills_found, skills_changed, error_count, summary_json
         ) VALUES (?, ?, 'manual', ?, NULL, 'running', ?, 0, 0, 0, 0, ?)`
      )
      .run(
        scanRunId,
        policy.id,
        startedAt,
        roots.length,
        JSON.stringify({
          roots: roots.map((root) => root.path),
          exclusions
        })
      );

    let filesSeen = 0;
    let skillsFound = 0;
    let skillsChanged = 0;
    let errorCount = 0;
    let skippedEntryCount = 0;

    const upsertTransaction = this.database.db.transaction(() => {
      const allSkillFiles: string[] = [];
      const walkStats = { skippedEntryCount: 0 };
      for (const root of roots) {
        if (isExcludedPath(root.path, exclusions)) {
          walkStats.skippedEntryCount += 1;
          continue;
        }
        walkSkillFiles(root.path, allSkillFiles, exclusions, walkStats);
      }

      skippedEntryCount = walkStats.skippedEntryCount;
      const uniqueSkillFiles = Array.from(new Set(allSkillFiles));
      filesSeen = uniqueSkillFiles.length;

      const selectSkill = this.database.db.prepare(
        `SELECT id FROM skills WHERE source_path_hash = ? LIMIT 1`
      );
      const insertSkill = this.database.db.prepare(
        `INSERT INTO skills (
           id, canonical_name, display_name, source_type, source_path, source_path_hash,
           owner_label, is_active, first_seen_at, last_seen_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      );
      const updateSkill = this.database.db.prepare(
        `UPDATE skills
         SET canonical_name = ?, display_name = ?, source_type = ?, owner_label = ?, is_active = 1, last_seen_at = ?
         WHERE id = ?`
      );
      const currentVersion = this.database.db.prepare(
        `SELECT id, content_hash
         FROM skill_versions
         WHERE skill_id = ? AND is_current = 1
         LIMIT 1`
      );
      const clearCurrentVersion = this.database.db.prepare(
        `UPDATE skill_versions SET is_current = 0 WHERE skill_id = ?`
      );
      const insertVersion = this.database.db.prepare(
        `INSERT INTO skill_versions (
           id, skill_id, version_fingerprint, content_hash, frontmatter_name,
           frontmatter_description, line_count, detected_at, is_current, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
      );
      const deactivateActiveSkills = this.database.db.prepare(
        `UPDATE skills
         SET is_active = 0
         WHERE is_active = 1`
      );

      deactivateActiveSkills.run();

      for (const filePath of uniqueSkillFiles) {
        try {
          const text = readFileSync(filePath, "utf8");
          const metadata = parseFrontmatter(text);
          const sourcePath = dirname(filePath);
          const sourcePathHash = hashText(resolve(sourcePath));
          const canonicalName = metadata.name?.trim() || basename(sourcePath);
          const displayName = metadata.name?.trim() || basename(sourcePath);
          const contentHash = hashText(text);
          const versionFingerprint = contentHash.slice(0, 12);
          const detectedAt = nowIso();
          const lineCount = text.split(/\r?\n/).length;

          const existingSkill = selectSkill.get(sourcePathHash) as { id: string } | undefined;
          let skillId = existingSkill?.id;
          if (!skillId) {
            skillId = randomUUID();
            insertSkill.run(
              skillId,
              canonicalName,
              displayName,
              detectSourceType(sourcePath),
              sourcePath,
              sourcePathHash,
              basename(sourcePath),
              detectedAt,
              detectedAt
            );
            skillsChanged += 1;
          } else {
            updateSkill.run(
              canonicalName,
              displayName,
              detectSourceType(sourcePath),
              basename(sourcePath),
              detectedAt,
              skillId
            );
          }

          const existingVersion = currentVersion.get(skillId) as { id: string; content_hash: string } | undefined;
          if (!existingVersion || existingVersion.content_hash !== contentHash) {
            clearCurrentVersion.run(skillId);
            insertVersion.run(
              randomUUID(),
              skillId,
              versionFingerprint,
              contentHash,
              metadata.name ?? null,
              metadata.description ?? null,
              lineCount,
              detectedAt,
              JSON.stringify({ filePath })
            );
            if (existingSkill) {
              skillsChanged += 1;
            }
          }

          skillsFound += 1;
        } catch {
          errorCount += 1;
        }
      }
    });

    upsertTransaction();

    const completedAt = nowIso();
    this.database.db
      .prepare(
        `UPDATE scan_runs
         SET finished_at = ?, status = 'completed', files_seen = ?, skills_found = ?, skills_changed = ?, error_count = ?, summary_json = ?
         WHERE id = ?`
      )
      .run(
        completedAt,
        filesSeen,
        skillsFound,
        skillsChanged,
        errorCount,
        JSON.stringify({
          roots: roots.map((root) => root.path),
          exclusions,
          excludedPathCount: exclusions.length,
          skippedEntryCount
        }),
        scanRunId
      );

    return {
      scanRunId,
      filesSeen,
      skillsFound,
      skillsChanged,
      errorCount,
      excludedPathCount: exclusions.length,
      skippedEntryCount,
      completedAt,
      skills: this.listSkills()
    };
  }

  private recordHealthSnapshots(skills: SkillSummary[]) {
    if (skills.length === 0) {
      return;
    }

    const upsertSnapshot = this.database.db.prepare(
      `INSERT INTO skill_health_snapshots (
         id, skill_id, metric_date, measured_at, score, status, confidence, reasons_json, signals_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(skill_id, metric_date) DO UPDATE SET
         measured_at = excluded.measured_at,
         score = excluded.score,
         status = excluded.status,
         confidence = excluded.confidence,
         reasons_json = excluded.reasons_json,
         signals_json = excluded.signals_json`
    );

    const transaction = this.database.db.transaction(() => {
      for (const skill of skills) {
        upsertSnapshot.run(
          randomUUID(),
          skill.id,
          toMetricDate(skill.health.calculatedAt),
          skill.health.calculatedAt,
          skill.health.score,
          skill.health.status,
          skill.health.confidence,
          JSON.stringify(skill.health.reasons),
          JSON.stringify(skill.health.signals)
        );
      }
    });

    transaction();
  }

  private listHealthTrends(skillIds: string[]) {
    const trends = new Map<string, SkillHealthTrend>();
    if (skillIds.length === 0) {
      return trends;
    }

    const selectTrendRows = this.database.db.prepare(
      `SELECT
         score,
         measured_at,
         (
           SELECT COUNT(*)
           FROM skill_health_snapshots countable
           WHERE countable.skill_id = skill_health_snapshots.skill_id
         ) AS sample_count
       FROM skill_health_snapshots
       WHERE skill_id = ?
       ORDER BY measured_at DESC
       LIMIT 2`
    );

    for (const skillId of skillIds) {
      const rows = selectTrendRows.all(skillId) as HealthSnapshotRow[];
      const latest = rows[0];
      if (!latest) {
        continue;
      }

      const previous = rows[1];
      const previousScore = previous?.score ?? null;
      const delta = previousScore === null ? null : latest.score - previousScore;
      trends.set(skillId, {
        latestScore: latest.score,
        previousScore,
        delta,
        direction: getTrendDirection(delta),
        measuredAt: latest.measured_at,
        previousMeasuredAt: previous?.measured_at ?? null,
        sampleCount: latest.sample_count
      });
    }

    return trends;
  }
}
