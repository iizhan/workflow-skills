import { randomUUID } from "node:crypto";
import type {
  OptimizationProposal,
  OptimizationProposalAction,
  OptimizationProposalActionType,
  OptimizationProposalActorType,
  OptimizationProposalEvidence,
  OptimizationProposalEvidenceType,
  OptimizationProposalRefreshResult,
  OptimizationProposalSeverity,
  OptimizationProposalStatus
} from "../shared/types";
import type { AuthorizationService } from "./authorization-service";
import type { WorkbenchDatabase } from "./database";

interface ProposalSignal {
  skillId: string;
  skillName: string;
  skillVersionId: string | null;
  proposalType: string;
  severity: OptimizationProposalSeverity;
  title: string;
  summary: string;
  estimatedBenefit: string;
  evidence: ProposalEvidenceInput[];
}

interface SkillAnalysisRow {
  skill_id: string;
  display_name: string;
  skill_version_id: string | null;
  line_count: number | null;
  daily_runs_count: number | null;
  daily_failure_count: number | null;
  daily_avg_duration_ms: number | null;
  daily_max_duration_ms: number | null;
  daily_total_tokens: number | null;
  daily_estimated_cost_usd: number | null;
  daily_tool_call_count: number | null;
  weekly_window_start: string | null;
  weekly_window_end: string | null;
  weekly_runs_count: number | null;
  weekly_failure_count: number | null;
  weekly_avg_duration_ms: number | null;
  weekly_max_duration_ms: number | null;
  weekly_total_tokens: number | null;
  weekly_estimated_cost_usd: number | null;
  weekly_tool_call_count: number | null;
}

interface ProposalRow {
  id: string;
  skill_id: string;
  proposal_type: string;
  severity: string;
  status: string;
  title: string;
  summary: string;
  estimated_benefit: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  skill_version_id?: string | null;
  display_name?: string;
}

interface ProposalEvidenceInput {
  evidenceType: OptimizationProposalEvidenceType;
  refId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
}

interface ProposalEvidenceRow {
  id: string;
  proposal_id: string;
  evidence_type: string;
  ref_id: string | null;
  summary: string;
  metadata_json: string;
  created_at: string;
}

interface ProposalActionRow {
  id: string;
  proposal_id: string;
  action_type: string;
  actor_type: string;
  action_summary: string;
  metadata_json: string;
  created_at: string;
}

function nowIso() {
  return new Date().toISOString();
}

function localDateKey(timestamp: string) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date(timestamp));
}

function localDateOffsetKey(dateKey: string, offsetDays: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return localDateKey(date.toISOString());
}

function toSeverity(value: string | null | undefined): OptimizationProposalSeverity {
  if (value === "high" || value === "medium") {
    return value;
  }
  return "low";
}

function toStatus(value: string | null | undefined): OptimizationProposalStatus {
  if (value === "accepted" || value === "dismissed" || value === "resolved") {
    return value;
  }
  return "open";
}

function toActorType(value: string | null | undefined): OptimizationProposalActorType {
  return value === "user" ? "user" : "system";
}

function formatDuration(ms: number) {
  if (ms < 1000) {
    return `${ms} ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
  }
  return `${(ms / 60_000).toFixed(1)} min`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatUsd(value: number) {
  return value.toFixed(4);
}

function computeWasteScore(runs: number, failures: number, totalTokens: number, estimatedCostUsd: number) {
  if (runs <= 0) {
    return 0;
  }

  const failureRate = failures / runs;
  return (
    failureRate * 0.55 +
    Math.min(totalTokens / 20_000, 1.5) * 0.3 +
    Math.min(estimatedCostUsd / 5, 1.0) * 0.15
  );
}

function parseMetadata(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function proposalKey(skillId: string, proposalType: string) {
  return `${skillId}::${proposalType}`;
}

function toEvidence(row: ProposalEvidenceRow): OptimizationProposalEvidence {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    evidenceType: row.evidence_type as OptimizationProposalEvidenceType,
    refId: row.ref_id,
    summary: row.summary,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at
  };
}

function toAction(row: ProposalActionRow): OptimizationProposalAction {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    actionType: row.action_type as OptimizationProposalActionType,
    actorType: toActorType(row.actor_type),
    summary: row.action_summary,
    metadata: parseMetadata(row.metadata_json),
    createdAt: row.created_at
  };
}

function toProposal(
  row: ProposalRow,
  evidence: OptimizationProposalEvidence[],
  actions: OptimizationProposalAction[]
): OptimizationProposal {
  return {
    id: row.id,
    skillId: row.skill_id,
    skillName: row.display_name ?? row.skill_id,
    skillVersionId: row.skill_version_id ?? null,
    proposalType: row.proposal_type,
    severity: toSeverity(row.severity),
    status: toStatus(row.status),
    title: row.title,
    summary: row.summary,
    estimatedBenefit: row.estimated_benefit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at ?? null,
    evidence,
    actions
  };
}

function sortSignals(signals: ProposalSignal[]) {
  const severityRank: Record<OptimizationProposalSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2
  };

  return signals.sort((left, right) => {
    const severityDelta = severityRank[left.severity] - severityRank[right.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return left.skillName.localeCompare(right.skillName);
  });
}

export class OptimizationService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly authorizationService: AuthorizationService
  ) {}

  listProposals(status: OptimizationProposalStatus | "all" = "all"): OptimizationProposal[] {
    const rows = this.database.db
      .prepare(
        `SELECT
           optimization_proposals.id,
           optimization_proposals.skill_id,
           optimization_proposals.skill_version_id,
           optimization_proposals.proposal_type,
           optimization_proposals.severity,
           optimization_proposals.status,
           optimization_proposals.title,
           optimization_proposals.summary,
           optimization_proposals.estimated_benefit,
           optimization_proposals.created_at,
           optimization_proposals.updated_at,
           optimization_proposals.closed_at,
           skills.display_name
         FROM optimization_proposals
         INNER JOIN skills ON skills.id = optimization_proposals.skill_id
         WHERE (? = 'all' OR optimization_proposals.status = ?)
         ORDER BY
           CASE optimization_proposals.status
             WHEN 'open' THEN 0
             WHEN 'accepted' THEN 1
             WHEN 'dismissed' THEN 2
             WHEN 'resolved' THEN 3
             ELSE 4
           END,
           CASE optimization_proposals.severity
             WHEN 'high' THEN 0
             WHEN 'medium' THEN 1
             ELSE 2
           END,
           optimization_proposals.updated_at DESC`
      )
      .all(status, status) as ProposalRow[];

    return this.hydrateProposals(rows);
  }

  refreshProposals(dateKey = localDateKey(nowIso())): OptimizationProposalRefreshResult {
    const policy = this.authorizationService.getActivePolicy();
    if (!policy) {
      throw new Error("Grant authorization before generating optimization proposals.");
    }

    const generatedAt = nowIso();
    const signals = sortSignals(this.buildSignals(dateKey));
    const signalKeys = new Set(signals.map((signal) => proposalKey(signal.skillId, signal.proposalType)));
    let createdCount = 0;
    let updatedCount = 0;
    let resolvedCount = 0;
    let skippedCount = 0;

    const refreshTransaction = this.database.db.transaction(() => {
      const existingRows = this.database.db
        .prepare(
          `SELECT *
           FROM optimization_proposals
           ORDER BY updated_at DESC`
        )
        .all() as ProposalRow[];

      const latestByKey = new Map<string, ProposalRow>();
      for (const row of existingRows) {
        const key = proposalKey(row.skill_id, row.proposal_type);
        if (!latestByKey.has(key)) {
          latestByKey.set(key, row);
        }
      }

      const insertProposal = this.database.db.prepare(
        `INSERT INTO optimization_proposals (
           id, skill_id, skill_version_id, proposal_type, severity, status, title,
           summary, estimated_benefit, created_at, updated_at, closed_at
         ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, NULL)`
      );

      const updateProposal = this.database.db.prepare(
        `UPDATE optimization_proposals
         SET skill_version_id = ?, severity = ?, title = ?, summary = ?, estimated_benefit = ?, updated_at = ?, closed_at = NULL
         WHERE id = ?`
      );

      const resolveProposal = this.database.db.prepare(
        `UPDATE optimization_proposals
         SET status = 'resolved', updated_at = ?, closed_at = ?
         WHERE id = ?`
      );

      const clearEvidence = this.database.db.prepare(
        `DELETE FROM proposal_evidence
         WHERE proposal_id = ?`
      );

      const insertEvidence = this.database.db.prepare(
        `INSERT INTO proposal_evidence (
           id, proposal_id, evidence_type, ref_id, summary, metadata_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      const insertAction = this.database.db.prepare(
        `INSERT INTO proposal_actions (
           id, proposal_id, action_type, actor_type, action_summary, metadata_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      for (const signal of signals) {
        const key = proposalKey(signal.skillId, signal.proposalType);
        const existing = latestByKey.get(key);

        if (existing?.status === "dismissed") {
          skippedCount += 1;
          continue;
        }

        if (existing && (existing.status === "open" || existing.status === "accepted")) {
          updateProposal.run(
            signal.skillVersionId,
            signal.severity,
            signal.title,
            signal.summary,
            signal.estimatedBenefit,
            generatedAt,
            existing.id
          );
          clearEvidence.run(existing.id);
          for (const evidence of signal.evidence) {
            insertEvidence.run(
              randomUUID(),
              existing.id,
              evidence.evidenceType,
              evidence.refId,
              evidence.summary,
              JSON.stringify(evidence.metadata),
              generatedAt
            );
          }
          updatedCount += 1;
          continue;
        }

        const proposalId = randomUUID();
        insertProposal.run(
          proposalId,
          signal.skillId,
          signal.skillVersionId,
          signal.proposalType,
          signal.severity,
          signal.title,
          signal.summary,
          signal.estimatedBenefit,
          generatedAt,
          generatedAt
        );
        for (const evidence of signal.evidence) {
          insertEvidence.run(
            randomUUID(),
            proposalId,
            evidence.evidenceType,
            evidence.refId,
            evidence.summary,
            JSON.stringify(evidence.metadata),
            generatedAt
          );
        }
        insertAction.run(
          randomUUID(),
          proposalId,
          "created",
          "system",
          `Proposal created from local evidence refresh for ${signal.skillName}.`,
          JSON.stringify({
            proposalType: signal.proposalType,
            severity: signal.severity,
            refreshDate: dateKey
          }),
          generatedAt
        );
        createdCount += 1;
      }

      for (const existing of latestByKey.values()) {
        if (existing.status !== "open" && existing.status !== "accepted") {
          continue;
        }

        const key = proposalKey(existing.skill_id, existing.proposal_type);
        if (!signalKeys.has(key)) {
          resolveProposal.run(generatedAt, generatedAt, existing.id);
          insertAction.run(
            randomUUID(),
            existing.id,
            "auto_resolved",
            "system",
            `Proposal auto-resolved because its supporting optimization signal no longer appeared in the latest local refresh.`,
            JSON.stringify({
              previousStatus: existing.status,
              refreshDate: dateKey
            }),
            generatedAt
          );
          resolvedCount += 1;
        }
      }
    });

    refreshTransaction();

    return {
      generatedAt,
      date: dateKey,
      createdCount,
      updatedCount,
      resolvedCount,
      skippedCount,
      proposals: this.listProposals("all")
    };
  }

  updateProposalStatus(
    proposalId: string,
    status: OptimizationProposalStatus
  ): OptimizationProposal {
    const timestamp = nowIso();
    const closeAt = status === "dismissed" || status === "resolved" ? timestamp : null;
    const existing = this.getProposalById(proposalId);
    if (!existing) {
      throw new Error("Optimization proposal not found.");
    }

    const result = this.database.db
      .prepare(
        `UPDATE optimization_proposals
         SET status = ?, updated_at = ?, closed_at = ?
         WHERE id = ?`
      )
      .run(status, timestamp, closeAt, proposalId);

    if (result.changes === 0) {
      throw new Error("Optimization proposal not found.");
    }

    const action = this.describeUserAction(existing.status, status, existing.skillName);
    this.database.db
      .prepare(
        `INSERT INTO proposal_actions (
           id, proposal_id, action_type, actor_type, action_summary, metadata_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        proposalId,
        action.actionType,
        "user",
        action.summary,
        JSON.stringify({
          previousStatus: existing.status,
          nextStatus: status
        }),
        timestamp
      );

    const proposal = this.getProposalById(proposalId);
    if (!proposal) {
      throw new Error("Optimization proposal not found after update.");
    }

    return proposal;
  }

  private getProposalById(proposalId: string): OptimizationProposal | null {
    const row = this.database.db
      .prepare(
        `SELECT
           optimization_proposals.id,
           optimization_proposals.skill_id,
           optimization_proposals.skill_version_id,
           optimization_proposals.proposal_type,
           optimization_proposals.severity,
           optimization_proposals.status,
           optimization_proposals.title,
           optimization_proposals.summary,
           optimization_proposals.estimated_benefit,
           optimization_proposals.created_at,
           optimization_proposals.updated_at,
           optimization_proposals.closed_at,
           skills.display_name
         FROM optimization_proposals
         INNER JOIN skills ON skills.id = optimization_proposals.skill_id
         WHERE optimization_proposals.id = ?
         LIMIT 1`
      )
      .get(proposalId) as ProposalRow | undefined;

    if (!row) {
      return null;
    }

    return this.hydrateProposals([row])[0] ?? null;
  }

  private buildSignals(dateKey: string): ProposalSignal[] {
    const weekStartKey = localDateOffsetKey(dateKey, -6);
    const rows = this.database.db
      .prepare(
        `SELECT
           skills.id AS skill_id,
           skills.display_name,
           current_versions.id AS skill_version_id,
           current_versions.line_count,
           daily_skill_metrics.runs_count AS daily_runs_count,
           daily_skill_metrics.failure_count AS daily_failure_count,
           daily_skill_metrics.avg_duration_ms AS daily_avg_duration_ms,
           daily_skill_metrics.max_duration_ms AS daily_max_duration_ms,
           daily_skill_metrics.total_tokens AS daily_total_tokens,
           daily_skill_metrics.estimated_cost_usd AS daily_estimated_cost_usd,
           daily_skill_metrics.tool_call_count AS daily_tool_call_count,
           weekly_metrics.window_start AS weekly_window_start,
           weekly_metrics.window_end AS weekly_window_end,
           weekly_metrics.runs_count AS weekly_runs_count,
           weekly_metrics.failure_count AS weekly_failure_count,
           weekly_metrics.avg_duration_ms AS weekly_avg_duration_ms,
           weekly_metrics.max_duration_ms AS weekly_max_duration_ms,
           weekly_metrics.total_tokens AS weekly_total_tokens,
           weekly_metrics.estimated_cost_usd AS weekly_estimated_cost_usd,
           weekly_metrics.tool_call_count AS weekly_tool_call_count
         FROM skills
         LEFT JOIN skill_versions AS current_versions
           ON current_versions.skill_id = skills.id
          AND current_versions.is_current = 1
         LEFT JOIN daily_skill_metrics
           ON daily_skill_metrics.skill_id = skills.id
          AND daily_skill_metrics.metric_date = ?
         LEFT JOIN (
           SELECT
             skill_id,
             MIN(metric_date) AS window_start,
             MAX(metric_date) AS window_end,
             SUM(runs_count) AS runs_count,
             SUM(failure_count) AS failure_count,
             CAST(AVG(avg_duration_ms) AS INTEGER) AS avg_duration_ms,
             MAX(max_duration_ms) AS max_duration_ms,
             SUM(total_tokens) AS total_tokens,
             SUM(estimated_cost_usd) AS estimated_cost_usd,
             SUM(tool_call_count) AS tool_call_count
           FROM daily_skill_metrics
           WHERE metric_date BETWEEN ? AND ?
           GROUP BY skill_id
         ) AS weekly_metrics
           ON weekly_metrics.skill_id = skills.id
         WHERE skills.is_active = 1`
      )
      .all(dateKey, weekStartKey, dateKey) as SkillAnalysisRow[];

    const signals: ProposalSignal[] = [];

    for (const row of rows) {
      const lineCount = row.line_count != null ? Number(row.line_count) : null;
      const dailyRuns = Number(row.daily_runs_count ?? 0);
      const dailyFailures = Number(row.daily_failure_count ?? 0);
      const dailyFailureRate = dailyRuns > 0 ? dailyFailures / dailyRuns : 0;
      const dailyAvgDurationMs =
        row.daily_avg_duration_ms != null ? Number(row.daily_avg_duration_ms) : null;
      const dailyMaxDurationMs =
        row.daily_max_duration_ms != null ? Number(row.daily_max_duration_ms) : null;
      const dailyTotalTokens = Number(row.daily_total_tokens ?? 0);
      const dailyEstimatedCostUsd = Number(row.daily_estimated_cost_usd ?? 0);
      const weeklyWindowStart = row.weekly_window_start ?? weekStartKey;
      const weeklyWindowEnd = row.weekly_window_end ?? dateKey;
      const weeklyRuns = Number(row.weekly_runs_count ?? 0);
      const weeklyFailures = Number(row.weekly_failure_count ?? 0);
      const weeklyFailureRate = weeklyRuns > 0 ? weeklyFailures / weeklyRuns : 0;
      const weeklyAvgDurationMs =
        row.weekly_avg_duration_ms != null ? Number(row.weekly_avg_duration_ms) : null;
      const weeklyMaxDurationMs =
        row.weekly_max_duration_ms != null ? Number(row.weekly_max_duration_ms) : null;
      const weeklyTotalTokens = Number(row.weekly_total_tokens ?? 0);
      const weeklyEstimatedCostUsd = Number(row.weekly_estimated_cost_usd ?? 0);
      const weeklyWasteScore = computeWasteScore(
        weeklyRuns,
        weeklyFailures,
        weeklyTotalTokens,
        weeklyEstimatedCostUsd
      );

      if (lineCount != null && lineCount >= 140) {
        signals.push({
          skillId: row.skill_id,
          skillName: row.display_name,
          skillVersionId: row.skill_version_id,
          proposalType: "overlong_skill",
          severity: lineCount >= 240 ? "high" : "medium",
          title: `Trim ${row.display_name} into smaller reference units`,
          summary: `${row.display_name} currently spans ${lineCount} lines. Long SKILL files usually increase lookup cost and make maintenance harder. Consider moving examples, long rules, or rarely used detail into companion reference files or scripts.`,
          estimatedBenefit: "Lower load-time token usage and make the skill easier to evolve without breaking its main flow.",
          evidence: [
            {
              evidenceType: "static_skill",
              refId: row.skill_version_id ?? row.skill_id,
              summary: `${row.display_name} spans ${lineCount} lines in the current indexed skill revision.`,
              metadata: {
                lineCount,
                threshold: 140,
                severeThreshold: 240
              }
            }
          ]
        });
      }

      const dailyLatencyTriggered =
        dailyRuns >= 2 && dailyAvgDurationMs != null && dailyAvgDurationMs >= 12_000;
      const weeklyLatencyTriggered =
        weeklyRuns >= 3 && weeklyAvgDurationMs != null && weeklyAvgDurationMs >= 12_000;

      if (dailyLatencyTriggered || weeklyLatencyTriggered) {
        const evidence: ProposalEvidenceInput[] = [];
        if (dailyLatencyTriggered) {
          evidence.push({
            evidenceType: "daily_metric",
            refId: dateKey,
            summary: `${row.display_name} averaged ${formatDuration(dailyAvgDurationMs ?? 0)} across ${dailyRuns} run${dailyRuns === 1 ? "" : "s"} on ${dateKey}, with a slowest run of ${formatDuration(dailyMaxDurationMs ?? dailyAvgDurationMs ?? 0)}.`,
            metadata: {
              date: dateKey,
              runs: dailyRuns,
              avgDurationMs: dailyAvgDurationMs,
              maxDurationMs: dailyMaxDurationMs
            }
          });
        }
        if (weeklyLatencyTriggered) {
          evidence.push({
            evidenceType: "weekly_metric",
            refId: `${weeklyWindowStart}:${weeklyWindowEnd}`,
            summary: `${row.display_name} stayed slow across the 7-day window (${weeklyWindowStart} to ${weeklyWindowEnd}), averaging ${formatDuration(weeklyAvgDurationMs ?? 0)} across ${weeklyRuns} run${weeklyRuns === 1 ? "" : "s"}.`,
            metadata: {
              startDate: weeklyWindowStart,
              endDate: weeklyWindowEnd,
              runs: weeklyRuns,
              avgDurationMs: weeklyAvgDurationMs,
              maxDurationMs: weeklyMaxDurationMs
            }
          });
        }

        const latencySeverity =
          (dailyAvgDurationMs ?? 0) >= 30_000 ||
          (dailyMaxDurationMs ?? 0) >= 45_000 ||
          (weeklyAvgDurationMs ?? 0) >= 30_000 ||
          (weeklyMaxDurationMs ?? 0) >= 45_000
            ? "high"
            : "medium";

        signals.push({
          skillId: row.skill_id,
          skillName: row.display_name,
          skillVersionId: row.skill_version_id,
          proposalType: "high_latency",
          severity: latencySeverity,
          title: `Reduce execution latency in ${row.display_name}`,
          summary:
            dailyLatencyTriggered && weeklyLatencyTriggered
              ? `${row.display_name} is showing slow execution in both today's snapshot and the 7-day window. Tighten discovery scope, replace repeated reads with scripts, or front-load only the minimum context needed.`
              : weeklyLatencyTriggered
                ? `${row.display_name} stayed slow across the 7-day window, which suggests persistent latency instead of a one-off outlier. Tighten discovery scope, replace repeated reads with scripts, or front-load only the minimum context needed.`
                : `${row.display_name} is currently slow in today's snapshot. Tighten discovery scope, replace repeated reads with scripts, or front-load only the minimum context needed.`,
          estimatedBenefit: "Improve first useful output speed and reduce wait time during repeated use.",
          evidence
        });
      }

      const dailyFailureTriggered =
        dailyFailures >= 1 && dailyRuns >= 2 && dailyFailureRate >= 0.34;
      const weeklyFailureTriggered =
        weeklyFailures >= 2 && weeklyRuns >= 4 && weeklyFailureRate >= 0.34;

      if (dailyFailureTriggered || weeklyFailureTriggered) {
        const evidence: ProposalEvidenceInput[] = [];
        if (dailyFailureTriggered) {
          evidence.push({
            evidenceType: "daily_metric",
            refId: dateKey,
            summary: `${row.display_name} failed ${dailyFailures} of ${dailyRuns} run${dailyRuns === 1 ? "" : "s"} on ${dateKey} (${formatPercent(dailyFailureRate)}).`,
            metadata: {
              date: dateKey,
              runs: dailyRuns,
              failures: dailyFailures,
              failureRate: dailyFailureRate
            }
          });
        }
        if (weeklyFailureTriggered) {
          evidence.push({
            evidenceType: "weekly_metric",
            refId: `${weeklyWindowStart}:${weeklyWindowEnd}`,
            summary: `${row.display_name} failed ${weeklyFailures} of ${weeklyRuns} run${weeklyRuns === 1 ? "" : "s"} across ${weeklyWindowStart} to ${weeklyWindowEnd} (${formatPercent(weeklyFailureRate)}).`,
            metadata: {
              startDate: weeklyWindowStart,
              endDate: weeklyWindowEnd,
              runs: weeklyRuns,
              failures: weeklyFailures,
              failureRate: weeklyFailureRate
            }
          });
        }

        signals.push({
          skillId: row.skill_id,
          skillName: row.display_name,
          skillVersionId: row.skill_version_id,
          proposalType: "high_failure_rate",
          severity:
            dailyFailureRate >= 0.5 ||
            weeklyFailureRate >= 0.5 ||
            dailyFailures >= 2 ||
            weeklyFailures >= 3
              ? "high"
              : "medium",
          title: `Stabilize the failure path in ${row.display_name}`,
          summary:
            dailyFailureTriggered && weeklyFailureTriggered
              ? `${row.display_name} is failing often in both today's snapshot and the 7-day window. Review fragile tool paths, timeout assumptions, and missing guardrails so the skill can degrade more safely.`
              : weeklyFailureTriggered
                ? `${row.display_name} has an elevated weekly failure rate, which points to a recurring reliability problem rather than a single bad run. Review fragile tool paths, timeout assumptions, and missing guardrails so the skill can degrade more safely.`
                : `${row.display_name} has an elevated failure rate in today's snapshot. Review fragile tool paths, timeout assumptions, and missing guardrails so the skill can degrade more safely.`,
          estimatedBenefit: "Raise reliability and reduce retries caused by avoidable runtime failures.",
          evidence
        });
      }

      const dailyTokenTriggered =
        dailyRuns >= 1 && (dailyTotalTokens >= 1_500 || dailyEstimatedCostUsd >= 0.015);
      const weeklyTokenTriggered =
        weeklyRuns >= 2 &&
        (weeklyTotalTokens >= 4_000 ||
          weeklyEstimatedCostUsd >= 0.04 ||
          weeklyWasteScore >= 0.55);

      if (dailyTokenTriggered || weeklyTokenTriggered) {
        const evidence: ProposalEvidenceInput[] = [];
        if (dailyTokenTriggered) {
          evidence.push({
            evidenceType: "daily_metric",
            refId: dateKey,
            summary: `${row.display_name} consumed ${dailyTotalTokens.toLocaleString()} tokens and ${formatUsd(dailyEstimatedCostUsd)} USD on ${dateKey}.`,
            metadata: {
              date: dateKey,
              runs: dailyRuns,
              totalTokens: dailyTotalTokens,
              estimatedCostUsd: dailyEstimatedCostUsd
            }
          });
        }
        if (weeklyTokenTriggered) {
          evidence.push({
            evidenceType: "weekly_metric",
            refId: `${weeklyWindowStart}:${weeklyWindowEnd}`,
            summary: `${row.display_name} consumed ${weeklyTotalTokens.toLocaleString()} tokens and ${formatUsd(weeklyEstimatedCostUsd)} USD across ${weeklyWindowStart} to ${weeklyWindowEnd}, with a weekly waste score of ${weeklyWasteScore.toFixed(2)}.`,
            metadata: {
              startDate: weeklyWindowStart,
              endDate: weeklyWindowEnd,
              runs: weeklyRuns,
              totalTokens: weeklyTotalTokens,
              estimatedCostUsd: weeklyEstimatedCostUsd,
              wasteScore: weeklyWasteScore
            }
          });
        }

        signals.push({
          skillId: row.skill_id,
          skillName: row.display_name,
          skillVersionId: row.skill_version_id,
          proposalType: "high_token_cost",
          severity:
            dailyTotalTokens >= 4_000 ||
            dailyEstimatedCostUsd >= 0.04 ||
            weeklyTotalTokens >= 10_000 ||
            weeklyEstimatedCostUsd >= 0.08 ||
            weeklyWasteScore >= 0.85
              ? "high"
              : "medium",
          title: `Lower token cost in ${row.display_name}`,
          summary:
            dailyTokenTriggered && weeklyTokenTriggered
              ? `${row.display_name} is expensive in both today's snapshot and the 7-day window. Look for overly verbose instructions, duplicated context, or details that belong in optional references instead of the primary skill body.`
              : weeklyTokenTriggered
                ? `${row.display_name} is accumulating too much weekly cost or waste. Look for overly verbose instructions, duplicated context, or details that belong in optional references instead of the primary skill body.`
                : `${row.display_name} is currently expensive in today's snapshot. Look for overly verbose instructions, duplicated context, or details that belong in optional references instead of the primary skill body.`,
          estimatedBenefit: "Reduce recurring runtime cost while keeping the skill's high-value path intact.",
          evidence
        });
      }
    }

    return signals;
  }

  private hydrateProposals(rows: ProposalRow[]): OptimizationProposal[] {
    const evidenceByProposalId = this.listEvidenceByProposalIds(rows.map((row) => row.id));
    const actionsByProposalId = this.listActionsByProposalIds(rows.map((row) => row.id));
    return rows.map((row) =>
      toProposal(row, evidenceByProposalId.get(row.id) ?? [], actionsByProposalId.get(row.id) ?? [])
    );
  }

  private listEvidenceByProposalIds(proposalIds: string[]) {
    const grouped = new Map<string, OptimizationProposalEvidence[]>();
    if (proposalIds.length === 0) {
      return grouped;
    }

    const placeholders = proposalIds.map(() => "?").join(", ");
    const rows = this.database.db
      .prepare(
        `SELECT
           id,
           proposal_id,
           evidence_type,
           ref_id,
           summary,
           metadata_json,
           created_at
         FROM proposal_evidence
         WHERE proposal_id IN (${placeholders})
         ORDER BY
           CASE evidence_type
             WHEN 'daily_metric' THEN 0
             WHEN 'weekly_metric' THEN 1
             WHEN 'static_skill' THEN 2
             ELSE 3
           END,
           created_at ASC`
      )
      .all(...proposalIds) as ProposalEvidenceRow[];

    for (const row of rows) {
      const list = grouped.get(row.proposal_id) ?? [];
      list.push(toEvidence(row));
      grouped.set(row.proposal_id, list);
    }

    return grouped;
  }

  private listActionsByProposalIds(proposalIds: string[]) {
    const grouped = new Map<string, OptimizationProposalAction[]>();
    if (proposalIds.length === 0) {
      return grouped;
    }

    const placeholders = proposalIds.map(() => "?").join(", ");
    const rows = this.database.db
      .prepare(
        `SELECT
           id,
           proposal_id,
           action_type,
           actor_type,
           action_summary,
           metadata_json,
           created_at
         FROM proposal_actions
         WHERE proposal_id IN (${placeholders})
         ORDER BY created_at DESC`
      )
      .all(...proposalIds) as ProposalActionRow[];

    for (const row of rows) {
      const list = grouped.get(row.proposal_id) ?? [];
      list.push(toAction(row));
      grouped.set(row.proposal_id, list);
    }

    return grouped;
  }

  private describeUserAction(
    previousStatus: OptimizationProposalStatus,
    nextStatus: OptimizationProposalStatus,
    skillName: string
  ) {
    if (nextStatus === "accepted") {
      return {
        actionType: "accepted" as const,
        summary: `Proposal accepted for ${skillName}.`
      };
    }

    if (nextStatus === "dismissed") {
      return {
        actionType: "dismissed" as const,
        summary: `Proposal dismissed for ${skillName}.`
      };
    }

    if (nextStatus === "resolved") {
      return {
        actionType: "resolved" as const,
        summary: `Proposal marked resolved for ${skillName}.`
      };
    }

    if (nextStatus === "open" && previousStatus !== "open") {
      return {
        actionType: "reopened" as const,
        summary: `Proposal reopened for ${skillName}.`
      };
    }

    return {
      actionType: "reopened" as const,
      summary: `Proposal returned to open review for ${skillName}.`
    };
  }
}
