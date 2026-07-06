import type {
  SkillHealthScorePolicy,
  SkillHealthScorePolicyInput,
  SkillHealthScorePolicyPreset
} from "../shared/types";
import type { WorkbenchDatabase } from "./database";

const singletonPolicyId = "default" as const;

const policyPresets: Record<
  SkillHealthScorePolicyPreset,
  Omit<SkillHealthScorePolicy, "id" | "updatedAt">
> = {
  balanced: {
    preset: "balanced",
    label: "Balanced",
    description: "Equal attention to reliability, cost, latency, freshness, and maintainability.",
    reliabilityWeight: 1,
    costWeight: 1,
    latencyWeight: 1,
    freshnessWeight: 1,
    maintainabilityWeight: 1,
    healthyScore: 82,
    attentionScore: 55
  },
  reliability_first: {
    preset: "reliability_first",
    label: "Reliability First",
    description: "Failure rate and unresolved proposals have stronger impact on Health Score.",
    reliabilityWeight: 1.35,
    costWeight: 0.85,
    latencyWeight: 0.95,
    freshnessWeight: 1,
    maintainabilityWeight: 1.1,
    healthyScore: 84,
    attentionScore: 58
  },
  cost_guard: {
    preset: "cost_guard",
    label: "Cost Guard",
    description: "Token pressure is weighted higher for teams watching spend and waste.",
    reliabilityWeight: 0.95,
    costWeight: 1.45,
    latencyWeight: 0.95,
    freshnessWeight: 0.9,
    maintainabilityWeight: 1,
    healthyScore: 82,
    attentionScore: 55
  },
  latency_guard: {
    preset: "latency_guard",
    label: "Latency Guard",
    description: "Slow Skills lose score sooner so interactive workflows stay responsive.",
    reliabilityWeight: 1,
    costWeight: 0.95,
    latencyWeight: 1.45,
    freshnessWeight: 0.9,
    maintainabilityWeight: 1,
    healthyScore: 82,
    attentionScore: 55
  },
  freshness_guard: {
    preset: "freshness_guard",
    label: "Freshness Guard",
    description: "Recently unseen or stale Skills are treated as higher governance risk.",
    reliabilityWeight: 0.95,
    costWeight: 0.9,
    latencyWeight: 0.9,
    freshnessWeight: 1.5,
    maintainabilityWeight: 1.1,
    healthyScore: 82,
    attentionScore: 56
  }
};

function nowIso() {
  return new Date().toISOString();
}

function toPolicy(row: Record<string, unknown>): SkillHealthScorePolicy {
  const preset =
    typeof row.preset === "string" && row.preset in policyPresets
      ? (row.preset as SkillHealthScorePolicyPreset)
      : "balanced";

  return {
    id: singletonPolicyId,
    preset,
    label: String(row.label ?? policyPresets[preset].label),
    description: String(row.description ?? policyPresets[preset].description),
    reliabilityWeight: Number(row.reliability_weight ?? policyPresets[preset].reliabilityWeight),
    costWeight: Number(row.cost_weight ?? policyPresets[preset].costWeight),
    latencyWeight: Number(row.latency_weight ?? policyPresets[preset].latencyWeight),
    freshnessWeight: Number(row.freshness_weight ?? policyPresets[preset].freshnessWeight),
    maintainabilityWeight: Number(
      row.maintainability_weight ?? policyPresets[preset].maintainabilityWeight
    ),
    healthyScore: Number(row.healthy_score ?? policyPresets[preset].healthyScore),
    attentionScore: Number(row.attention_score ?? policyPresets[preset].attentionScore),
    updatedAt: String(row.updated_at ?? nowIso())
  };
}

export function createDefaultHealthScorePolicy(
  preset: SkillHealthScorePolicyPreset = "balanced",
  updatedAt = nowIso()
): SkillHealthScorePolicy {
  return {
    id: singletonPolicyId,
    ...policyPresets[preset],
    updatedAt
  };
}

export function listHealthScorePolicyPresets() {
  return policyPresets;
}

export class HealthScorePolicyService {
  constructor(private readonly database: WorkbenchDatabase) {}

  getPolicy(): SkillHealthScorePolicy {
    const row = this.database.db
      .prepare(`SELECT * FROM health_score_policy WHERE id = ? LIMIT 1`)
      .get(singletonPolicyId) as Record<string, unknown> | undefined;

    if (row) {
      return toPolicy(row);
    }

    const policy = createDefaultHealthScorePolicy();
    this.persistPolicy(policy);
    return policy;
  }

  updatePolicy(input: SkillHealthScorePolicyInput): SkillHealthScorePolicy {
    const policy = createDefaultHealthScorePolicy(input.preset, nowIso());
    this.persistPolicy(policy);
    return policy;
  }

  private persistPolicy(policy: SkillHealthScorePolicy) {
    this.database.db
      .prepare(
        `INSERT INTO health_score_policy (
           id, preset, label, description,
           reliability_weight, cost_weight, latency_weight, freshness_weight,
           maintainability_weight, healthy_score, attention_score, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           preset = excluded.preset,
           label = excluded.label,
           description = excluded.description,
           reliability_weight = excluded.reliability_weight,
           cost_weight = excluded.cost_weight,
           latency_weight = excluded.latency_weight,
           freshness_weight = excluded.freshness_weight,
           maintainability_weight = excluded.maintainability_weight,
           healthy_score = excluded.healthy_score,
           attention_score = excluded.attention_score,
           updated_at = excluded.updated_at`
      )
      .run(
        policy.id,
        policy.preset,
        policy.label,
        policy.description,
        policy.reliabilityWeight,
        policy.costWeight,
        policy.latencyWeight,
        policy.freshnessWeight,
        policy.maintainabilityWeight,
        policy.healthyScore,
        policy.attentionScore,
        policy.updatedAt
      );
  }
}
