import type { SkillHealthScorePolicy, SkillHealthSummary, SkillHealthStatus } from "../shared/types";
import { createDefaultHealthScorePolicy } from "./health-score-policy-service";

export interface SkillHealthInput {
  hasDescription: boolean;
  lineCount: number | null;
  lastSeenAt: string | null;
  runs7d: number;
  successCount7d: number;
  failureCount7d: number;
  avgDurationMs7d: number | null;
  totalTokens7d: number;
  openProposalCount: number;
  acceptedProposalCount: number;
  highSeverityProposalCount: number;
  mediumSeverityProposalCount: number;
  lowSeverityProposalCount: number;
}

const dayMs = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value: number | null) {
  return value === null ? null : Math.round(value * 1000) / 1000;
}

function getFreshnessDays(lastSeenAt: string | null, now: Date) {
  if (!lastSeenAt) {
    return null;
  }

  const parsed = new Date(lastSeenAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / dayMs));
}

function getStatus(
  score: number,
  hasRuntimeSignals: boolean,
  freshnessDays: number | null,
  policy: SkillHealthScorePolicy
): SkillHealthStatus {
  if (!hasRuntimeSignals && freshnessDays === null) {
    return "unknown";
  }

  if (score >= policy.healthyScore) {
    return "healthy";
  }

  if (score >= policy.attentionScore) {
    return "needs_attention";
  }

  return "deprecated";
}

export function calculateSkillHealth(
  input: SkillHealthInput,
  now = new Date(),
  policy: SkillHealthScorePolicy = createDefaultHealthScorePolicy("balanced", now.toISOString())
): SkillHealthSummary {
  const reasons: string[] = [];
  const freshnessDays = getFreshnessDays(input.lastSeenAt, now);
  const failureRate7d = input.runs7d > 0 ? input.failureCount7d / input.runs7d : null;
  const avgTokensPerRun7d = input.runs7d > 0 ? input.totalTokens7d / input.runs7d : null;
  const hasRuntimeSignals = input.runs7d > 0;
  let score = 100;
  let confidence = 0.35;

  if (input.hasDescription) {
    confidence += 0.08;
  } else {
    score -= 6 * policy.maintainabilityWeight;
    reasons.push("Missing frontmatter description");
  }

  if (typeof input.lineCount === "number") {
    confidence += 0.08;
    if (input.lineCount > 700) {
      score -= 16 * policy.maintainabilityWeight;
      reasons.push("Skill file is very large");
    } else if (input.lineCount > 300) {
      score -= 8 * policy.maintainabilityWeight;
      reasons.push("Skill file is getting large");
    }
  }

  if (freshnessDays === null) {
    score -= 4 * policy.freshnessWeight;
    reasons.push("Freshness signal is unavailable");
  } else if (freshnessDays > 90) {
    score -= 30 * policy.freshnessWeight;
    reasons.push("Skill has not been seen for more than 90 days");
  } else if (freshnessDays > 30) {
    score -= 15 * policy.freshnessWeight;
    reasons.push("Skill has not been seen for more than 30 days");
  } else {
    confidence += 0.08;
  }

  if (hasRuntimeSignals) {
    confidence += 0.28;

    if (failureRate7d !== null && failureRate7d > 0) {
      score -= clamp(failureRate7d * 38, 3, 30) * policy.reliabilityWeight;
      reasons.push("Recent failures reduce reliability");
    }

    if (input.avgDurationMs7d !== null && input.avgDurationMs7d > 5000) {
      score -= 12 * policy.latencyWeight;
      reasons.push("Recent average latency is high");
    } else if (input.avgDurationMs7d !== null && input.avgDurationMs7d > 2500) {
      score -= 6 * policy.latencyWeight;
      reasons.push("Recent average latency needs attention");
    }

    if (avgTokensPerRun7d !== null && avgTokensPerRun7d > 7000) {
      score -= 12 * policy.costWeight;
      reasons.push("Recent token use per run is very high");
    } else if (avgTokensPerRun7d !== null && avgTokensPerRun7d > 3500) {
      score -= 6 * policy.costWeight;
      reasons.push("Recent token use per run is elevated");
    }
  } else {
    score -= 5 * policy.reliabilityWeight;
    reasons.push("No recent runtime evidence");
  }

  const proposalWeight = (policy.reliabilityWeight + policy.maintainabilityWeight) / 2;

  if (input.highSeverityProposalCount > 0) {
    score -= input.highSeverityProposalCount * 18 * proposalWeight;
    confidence += 0.08;
    reasons.push("High-severity optimization work is open");
  }

  if (input.mediumSeverityProposalCount > 0) {
    score -= input.mediumSeverityProposalCount * 10 * proposalWeight;
    confidence += 0.05;
    reasons.push("Medium-severity optimization work is open");
  }

  if (input.lowSeverityProposalCount > 0) {
    score -= input.lowSeverityProposalCount * 4 * proposalWeight;
    confidence += 0.03;
    reasons.push("Low-severity optimization work is open");
  }

  if (input.acceptedProposalCount > 0) {
    score -= Math.min(10, input.acceptedProposalCount * 4 * policy.maintainabilityWeight);
    confidence += 0.04;
    reasons.push("Accepted optimization work is not fully resolved");
  }

  const normalizedScore = clamp(Math.round(score), 0, 100);
  const status = getStatus(normalizedScore, hasRuntimeSignals, freshnessDays, policy);

  if (reasons.length === 0) {
    reasons.push("No material risk signal detected");
  }

  return {
    score: normalizedScore,
    status,
    confidence: roundMetric(clamp(confidence, 0.1, 0.98)) ?? 0.1,
    reasons,
    calculatedAt: now.toISOString(),
    trend: {
      latestScore: normalizedScore,
      previousScore: null,
      delta: null,
      direction: "new",
      measuredAt: now.toISOString(),
      previousMeasuredAt: null,
      sampleCount: 1
    },
    signals: {
      runs7d: input.runs7d,
      failureRate7d: roundMetric(failureRate7d),
      avgDurationMs7d: input.avgDurationMs7d,
      avgTokensPerRun7d: roundMetric(avgTokensPerRun7d),
      openProposalCount: input.openProposalCount,
      acceptedProposalCount: input.acceptedProposalCount,
      highSeverityProposalCount: input.highSeverityProposalCount,
      hasDescription: input.hasDescription,
      lineCount: input.lineCount,
      freshnessDays
    }
  };
}
