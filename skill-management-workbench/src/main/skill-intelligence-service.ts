import { randomUUID } from "node:crypto";
import type { SkillIntelligenceAnalysis, SkillSummary } from "../shared/types";
import type { RegistryService } from "./registry-service";
import type { WorkbenchDatabase } from "./database";

interface AnalysisSnapshotRow {
  id: string;
  skill_id: string;
  skill_name: string;
  generated_at: string;
  summary: string;
  dependencies_json: string;
  execution_flow_json: string;
  risks_json: string;
  optimization_suggestions_json: string;
  alternatives_json: string;
  evidence_json: string;
}

interface ProposalRow {
  title: string;
  severity: string;
  status: string;
  summary: string;
  estimated_benefit: string;
}

interface BundleCountRow {
  bundle_count: number;
}

interface ModelUsageRow {
  model_name: string | null;
  run_count: number;
}

interface RelatedSkillRow {
  id: string;
  display_name: string;
  source_type: string;
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string): SkillIntelligenceAnalysis["evidence"] {
  try {
    const parsed = JSON.parse(value) as SkillIntelligenceAnalysis["evidence"];
    return parsed;
  } catch {
    return {
      healthScore: 0,
      healthStatus: "unknown",
      runs7d: 0,
      failureRate7d: null,
      avgDurationMs7d: null,
      avgTokensPerRun7d: null,
      openProposalCount: 0,
      bundleCount: 0,
      relatedSkillCount: 0
    };
  }
}

function compactList(entries: Array<string | null | undefined>) {
  return entries.filter((entry): entry is string => Boolean(entry && entry.trim().length > 0));
}

function formatDuration(ms: number | null) {
  if (ms === null) {
    return "No latency signal yet";
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms average latency`;
  }
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s average latency`;
}

export class SkillIntelligenceService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly registryService: RegistryService
  ) {}

  getLatestAnalysis(skillId: string): SkillIntelligenceAnalysis | null {
    const row = this.database.db
      .prepare(
        `
        SELECT
          sas.id,
          sas.skill_id,
          s.display_name AS skill_name,
          sas.generated_at,
          sas.summary,
          sas.dependencies_json,
          sas.execution_flow_json,
          sas.risks_json,
          sas.optimization_suggestions_json,
          sas.alternatives_json,
          sas.evidence_json
        FROM skill_analysis_snapshots sas
        JOIN skills s ON s.id = sas.skill_id
        WHERE sas.skill_id = ?
        ORDER BY sas.generated_at DESC
        LIMIT 1
      `
      )
      .get(skillId) as AnalysisSnapshotRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  generateAnalysis(skillId: string): SkillIntelligenceAnalysis {
    const skill = this.registryService.listSkills().find((entry) => entry.id === skillId);
    if (!skill) {
      throw new Error("Skill not found in local registry");
    }

    const generatedAt = new Date().toISOString();
    const currentVersionId = this.getCurrentVersionId(skill.id);
    const proposals = this.listActiveProposals(skill.id);
    const bundleCount = this.getBundleCount(skill.id);
    const relatedSkills = this.listRelatedSkills(skill);
    const modelUsage = this.listModelUsage(skill.id);
    const evidence: SkillIntelligenceAnalysis["evidence"] = {
      healthScore: skill.health.score,
      healthStatus: skill.health.status,
      runs7d: skill.health.signals.runs7d,
      failureRate7d: skill.health.signals.failureRate7d,
      avgDurationMs7d: skill.health.signals.avgDurationMs7d,
      avgTokensPerRun7d: skill.health.signals.avgTokensPerRun7d,
      openProposalCount: skill.health.signals.openProposalCount,
      bundleCount,
      relatedSkillCount: relatedSkills.length
    };

    const analysis: SkillIntelligenceAnalysis = {
      id: randomUUID(),
      skillId: skill.id,
      skillName: skill.displayName,
      generatedAt,
      summary: this.buildSummary(skill, evidence),
      dependencies: this.buildDependencies(skill, modelUsage),
      executionFlow: this.buildExecutionFlow(skill),
      risks: this.buildRisks(skill, proposals),
      optimizationSuggestions: this.buildSuggestions(skill, proposals),
      alternativesAndRelated: this.buildRelated(relatedSkills, bundleCount),
      evidence
    };

    this.database.db
      .prepare(
        `
        INSERT INTO skill_analysis_snapshots (
          id,
          skill_id,
          skill_version_id,
          generated_at,
          summary,
          dependencies_json,
          execution_flow_json,
          risks_json,
          optimization_suggestions_json,
          alternatives_json,
          evidence_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        analysis.id,
        analysis.skillId,
        currentVersionId,
        analysis.generatedAt,
        analysis.summary,
        JSON.stringify(analysis.dependencies),
        JSON.stringify(analysis.executionFlow),
        JSON.stringify(analysis.risks),
        JSON.stringify(analysis.optimizationSuggestions),
        JSON.stringify(analysis.alternativesAndRelated),
        JSON.stringify(analysis.evidence)
      );

    return analysis;
  }

  private mapRow(row: AnalysisSnapshotRow): SkillIntelligenceAnalysis {
    return {
      id: row.id,
      skillId: row.skill_id,
      skillName: row.skill_name,
      generatedAt: row.generated_at,
      summary: row.summary,
      dependencies: parseJsonArray(row.dependencies_json),
      executionFlow: parseJsonArray(row.execution_flow_json),
      risks: parseJsonArray(row.risks_json),
      optimizationSuggestions: parseJsonArray(row.optimization_suggestions_json),
      alternativesAndRelated: parseJsonArray(row.alternatives_json),
      evidence: parseJsonObject(row.evidence_json)
    };
  }

  private getCurrentVersionId(skillId: string) {
    const row = this.database.db
      .prepare("SELECT id FROM skill_versions WHERE skill_id = ? AND is_current = 1 LIMIT 1")
      .get(skillId) as { id: string } | undefined;
    return row?.id ?? null;
  }

  private listActiveProposals(skillId: string) {
    return this.database.db
      .prepare(
        `
        SELECT title, severity, status, summary, estimated_benefit
        FROM optimization_proposals
        WHERE skill_id = ? AND status IN ('open', 'accepted')
        ORDER BY
          CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
          updated_at DESC
        LIMIT 4
      `
      )
      .all(skillId) as ProposalRow[];
  }

  private getBundleCount(skillId: string) {
    const row = this.database.db
      .prepare(
        `
        SELECT COUNT(*) AS bundle_count
        FROM bundle_items
        WHERE item_type = 'skill' AND ref_id = ?
      `
      )
      .get(skillId) as BundleCountRow | undefined;
    return row?.bundle_count ?? 0;
  }

  private listModelUsage(skillId: string) {
    return this.database.db
      .prepare(
        `
        SELECT model_name, COUNT(*) AS run_count
        FROM skill_runs
        WHERE skill_id = ? AND model_name IS NOT NULL
        GROUP BY model_name
        ORDER BY run_count DESC, model_name ASC
        LIMIT 3
      `
      )
      .all(skillId) as ModelUsageRow[];
  }

  private listRelatedSkills(skill: SkillSummary) {
    return this.database.db
      .prepare(
        `
        SELECT id, display_name, source_type
        FROM skills
        WHERE id != ? AND source_type = ?
        ORDER BY last_seen_at DESC
        LIMIT 4
      `
      )
      .all(skill.id, skill.sourceType) as RelatedSkillRow[];
  }

  private buildSummary(skill: SkillSummary, evidence: SkillIntelligenceAnalysis["evidence"]) {
    const description = skill.description ?? "No frontmatter description is available yet.";
    return `${skill.displayName} is an indexed ${skill.sourceType} Skill. ${description} Current local health is ${evidence.healthScore}/100 with ${evidence.runs7d} seven-day run signal(s).`;
  }

  private buildDependencies(skill: SkillSummary, modelUsage: ModelUsageRow[]) {
    const modelText =
      modelUsage.length > 0
        ? `Observed model usage: ${modelUsage.map((entry) => `${entry.model_name} (${entry.run_count})`).join(", ")}.`
        : "No model usage has been observed from imported telemetry yet.";

    return compactList([
      `Source path: ${skill.sourcePath}`,
      skill.currentVersionFingerprint
        ? `Current version fingerprint: ${skill.currentVersionFingerprint}`
        : "No current version fingerprint is available.",
      typeof skill.lineCount === "number" ? `Skill file size: ${skill.lineCount} lines.` : null,
      modelText
    ]);
  }

  private buildExecutionFlow(skill: SkillSummary) {
    return compactList([
      "Trigger: user selects this Skill from the local registry, Skill Library, graph, or apply flow.",
      `Scope: currently represented as a local ${skill.sourceType} Skill under approved scan roots.`,
      "Inputs: local Skill metadata, optional telemetry summaries, proposals, bundle inventory, and graph relationships.",
      "Output contract: explain the Skill, surface risk, recommend optimizations, and preserve no-write-before-confirmation behavior."
    ]);
  }

  private buildRisks(skill: SkillSummary, proposals: ProposalRow[]) {
    const proposalRisks = proposals.map(
      (proposal) => `${proposal.severity.toUpperCase()}: ${proposal.title} (${proposal.status})`
    );
    return compactList([
      ...skill.health.reasons,
      ...proposalRisks,
      skill.health.signals.runs7d === 0 ? "No recent runtime evidence is available for reliability assessment." : null,
      skill.health.signals.avgTokensPerRun7d !== null && skill.health.signals.avgTokensPerRun7d > 3500
        ? "Token pressure is elevated for recent runs."
        : null
    ]);
  }

  private buildSuggestions(skill: SkillSummary, proposals: ProposalRow[]) {
    const proposalSuggestions = proposals.map(
      (proposal) => `${proposal.title}: ${proposal.estimated_benefit || proposal.summary}`
    );
    return compactList([
      ...proposalSuggestions,
      skill.health.signals.runs7d === 0 ? "Import or capture runtime telemetry before making aggressive optimization decisions." : null,
      skill.health.signals.avgDurationMs7d !== null
        ? `Use the current ${formatDuration(skill.health.signals.avgDurationMs7d)} signal as the latency baseline.`
        : null,
      "Keep apply operations preview-first so analysis never silently modifies the original Skill."
    ]);
  }

  private buildRelated(relatedSkills: RelatedSkillRow[], bundleCount: number) {
    return compactList([
      bundleCount > 0
        ? `This Skill appears in ${bundleCount} local bundle artifact(s).`
        : "This Skill has not been packaged into a local bundle yet.",
      ...relatedSkills.map((skill) => `${skill.display_name} (${skill.source_type})`)
    ]);
  }
}
