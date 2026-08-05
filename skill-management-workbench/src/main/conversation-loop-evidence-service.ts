import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseDocument } from "yaml";
import type {
  ScenarioLoopBudgetSummary,
  ScenarioLoopChangeSignal,
  ScenarioLoopFormalPackage,
  ScenarioLoopIterationStatus,
  ScenarioLoopIterationSummary,
  ScenarioLoopPolicy,
  ScenarioLoopQualityEvaluation,
  ScenarioLoopRunStatus,
  ScenarioLoopRunSummary,
  ScenarioLoopStopReason,
  ScenarioLoopTemplateDefinition,
  ProjectWorkflowEvidenceSummary
} from "../shared/types";
import type { WorkflowRegistryService } from "./workflow-registry-service";

const maxWorkflowStateFiles = 100;
const maxWorkflowStateDepth = 5;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.flatMap((entry) => (typeof entry === "string" && entry.trim() ? [entry.trim()] : []))))
    : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeProjectRoot(projectRoot: string) {
  const normalized = resolve(projectRoot.trim());
  return normalized === "/" ? normalized : normalized.replace(/\/+$/, "");
}

function stableId(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 20);
}

function listWorkflowStateFiles(projectRoot: string) {
  const specsRoot = join(projectRoot, "specs");
  if (!existsSync(specsRoot)) return [];

  const found: string[] = [];
  const visit = (directory: string, depth: number) => {
    if (depth > maxWorkflowStateDepth || found.length >= maxWorkflowStateFiles) return;
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
    try {
      entries = readdirSync(directory, { withFileTypes: true, encoding: "utf8" });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found.length >= maxWorkflowStateFiles) break;
      if (entry.name.startsWith(".")) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path, depth + 1);
      } else if (entry.isFile() && entry.name === "workflow-state.yaml") {
        found.push(path);
      }
    }
  };
  visit(specsRoot, 0);
  return found.sort((left, right) => left.localeCompare(right));
}

function parseYaml(path: string): JsonRecord | null {
  try {
    const document = parseDocument(readFileSync(path, "utf8"));
    if (document.errors.length > 0) return null;
    const value = document.toJS();
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function normalizeStatus(value: unknown): ScenarioLoopRunStatus {
  switch (asString(value)) {
    case "running":
      return "running";
    case "verified":
      return "verified";
    case "verified_with_risk":
      return "verified_with_risk";
    case "needs_user_decision":
    case "needs_reconfirmation":
      return "needs_user_decision";
    case "blocked":
      return "blocked";
    case "budget_exhausted":
      return "budget_exhausted";
    case "cancelled":
      return "cancelled";
    case "evolution_candidate":
      return "evolution_candidate";
    default:
      return "pending";
  }
}

function normalizeIterationStatus(value: unknown): ScenarioLoopIterationStatus {
  switch (asString(value)) {
    case "verified":
      return "verified";
    case "verified_with_risk":
      return "verified_with_risk";
    case "blocked":
      return "blocked";
    case "budget_exhausted":
      return "budget_exhausted";
    case "evolution_candidate":
      return "evolution_candidate";
    default:
      return "needs_repair";
  }
}

function normalizeStopReason(value: unknown): ScenarioLoopStopReason | null {
  const stopReason = asString(value);
  const supported = new Set<ScenarioLoopStopReason>([
    "quality_gate_passed",
    "scope_change",
    "contract_change",
    "permission_change",
    "migration_required",
    "external_effect",
    "release_action",
    "budget_critical",
    "budget_exhausted",
    "budget_unknown",
    "duplicate_strategy",
    "root_cause_strategy_limit",
    "max_iterations_reached",
    "missing_repair_diagnosis",
    "blocking_defect",
    "user_cancelled"
  ]);
  return stopReason && supported.has(stopReason as ScenarioLoopStopReason)
    ? stopReason as ScenarioLoopStopReason
    : null;
}

function normalizeChangeSignals(value: unknown): ScenarioLoopChangeSignal[] {
  const supported = new Set<ScenarioLoopChangeSignal>([
    "scope_change",
    "contract_change",
    "permission_change",
    "migration_required",
    "external_effect",
    "release_action"
  ]);
  return asStringArray(value).filter((entry): entry is ScenarioLoopChangeSignal => supported.has(entry as ScenarioLoopChangeSignal));
}

function normalizeQuality(value: unknown): ScenarioLoopQualityEvaluation {
  const record = isRecord(value) ? value : {};
  const dimensionValues = isRecord(record.dimension_scores ?? record.dimensionScores)
    ? record.dimension_scores ?? record.dimensionScores as JsonRecord
    : {};
  const dimensionScores: Record<string, number | null> = {};
  for (const [key, score] of Object.entries(dimensionValues)) {
    dimensionScores[key] = asNumber(score);
  }
  const checks = Array.isArray(record.checks)
    ? record.checks.flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const id = asString(entry.id);
        return id ? [{ id, passed: entry.passed === true, evidenceRefs: asStringArray(entry.evidence_refs ?? entry.evidenceRefs) }] : [];
      })
    : [];
  return {
    score: asNumber(record.score),
    dimensionScores,
    checks,
    blockingDefects: asStringArray(record.blocking_defects ?? record.blockingDefects),
    residualRisks: asStringArray(record.residual_risks ?? record.residualRisks),
    evidenceRefs: asStringArray(record.evidence_refs ?? record.evidenceRefs),
    policyRef: asString(record.policy_ref ?? record.policyRef)
  };
}

function normalizeBudget(value: unknown): ScenarioLoopBudgetSummary {
  const record = isRecord(value) ? value : {};
  const state = asString(record.state);
  return {
    state: state === "available" || state === "warning" || state === "critical" || state === "exhausted" ? state : "unknown",
    budgetPoolId: asString(record.budget_pool_id ?? record.budgetPoolId),
    estimatedTokens: asNumber(record.estimated_tokens ?? record.estimatedTokens),
    reservedTokens: asNumber(record.reserved_tokens ?? record.reservedTokens),
    observedTokens: asNumber(record.observed_tokens ?? record.observedTokens),
    remainingTokens: asNumber(record.remaining_tokens ?? record.remainingTokens),
    evidenceRefs: asStringArray(record.evidence_refs ?? record.evidenceRefs)
  };
}

function normalizeFormalPackage(value: unknown, root: JsonRecord): ScenarioLoopFormalPackage {
  const record = isRecord(value) ? value : {};
  const artifactVersions = isRecord(root.artifact_versions) ? root.artifact_versions : {};
  const confirmationHistory = Array.isArray(root.confirmation_history) ? root.confirmation_history : [];
  const latestConfirmation = confirmationHistory.find((entry) => isRecord(entry)) as JsonRecord | undefined;
  return {
    requirementVersion: asString(record.requirement ?? record.requirement_version ?? artifactVersions.requirement) ?? "未记录",
    designVersion: asString(record.design ?? record.design_version ?? artifactVersions.design) ?? "未记录",
    impactVersion: asString(record.impact ?? record.impact_version ?? artifactVersions.impact) ?? "未记录",
    taskBreakdownVersion: asString(record.task_breakdown ?? record.task_breakdown_version ?? artifactVersions.task_breakdown) ?? "未记录",
    verificationPlanVersion: asString(record.verification ?? record.verification_plan ?? record.verification_plan_version ?? artifactVersions.verification) ?? "未记录",
    confirmedAt: asString(record.confirmed_at ?? record.confirmedAt ?? latestConfirmation?.confirmed_at ?? latestConfirmation?.confirmedAt) ?? "未记录",
    confirmationRef: asString(record.confirmation_ref ?? record.confirmationRef ?? latestConfirmation?.id ?? latestConfirmation?.ref) ?? "未记录"
  };
}

function latestConfirmation(root: JsonRecord) {
  const history = Array.isArray(root.confirmation_history) ? root.confirmation_history : [];
  const confirmations = history.flatMap((value) => {
    if (!isRecord(value)) return [];
    const confirmedAt = asString(value.confirmed_at ?? value.confirmedAt);
    const confirmationRef = asString(value.id ?? value.ref ?? value.confirmation_ref ?? value.confirmationRef);
    return confirmedAt && confirmationRef && !Number.isNaN(Date.parse(confirmedAt))
      ? [{ confirmedAt, confirmationRef }]
      : [];
  });
  return confirmations.sort((left, right) => right.confirmedAt.localeCompare(left.confirmedAt))[0] ?? null;
}

function evidenceRefs(value: unknown): string[] {
  if (typeof value === "string") return asString(value) ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.flatMap((entry) => {
    if (typeof entry === "string") return asString(entry) ? [entry.trim()] : [];
    if (!isRecord(entry)) return [];
    return [
      asString(entry.ref ?? entry.id ?? entry.path ?? entry.evidence_ref ?? entry.evidenceRef),
      ...asStringArray(entry.evidence_refs ?? entry.evidenceRefs)
    ].filter((item): item is string => Boolean(item));
  })));
}

function stateUpdatedAt(document: JsonRecord) {
  const feature = isRecord(document.feature) ? document.feature : {};
  return asString(document.updated_at ?? document.updatedAt ?? feature.updated_at ?? feature.created_at);
}

function userAcceptanceRecorded(document: JsonRecord) {
  const gates = isRecord(document.confirmation_gates) ? document.confirmation_gates : {};
  const acceptanceGate = isRecord(gates.user_acceptance) ? gates.user_acceptance : {};
  if (["approved", "accepted", "confirmed"].includes(asString(acceptanceGate.status) ?? "")) {
    return true;
  }
  return Array.isArray(document.session_reflections) && document.session_reflections.some((entry) =>
    isRecord(entry) && ["accepted", "approved"].includes(asString(entry.acceptance_status ?? entry.acceptanceStatus) ?? "")
  );
}

function fallbackPolicy(): ScenarioLoopPolicy {
  return {
    maxIterations: 0,
    maxSameRootCauseStrategies: 0,
    onScopeChange: "require_reconfirmation",
    onBudgetExhausted: "needs_user_decision",
    passScore: 90,
    dimensionFloors: {},
    requiredChecks: []
  };
}

export class ConversationLoopEvidenceService {
  constructor(private readonly workflowRegistryService: WorkflowRegistryService) {}

  getProjectWorkflowEvidence(projectRoot: string): ProjectWorkflowEvidenceSummary {
    const root = normalizeProjectRoot(projectRoot);
    const candidates = listWorkflowStateFiles(root).flatMap((statePath) => {
      const document = parseYaml(statePath);
      if (!document) return [];
      const formalPackage = normalizeFormalPackage(undefined, document);
      return [{
        sourceRef: relative(root, statePath) || statePath,
        updatedAt: stateUpdatedAt(document),
        formalPackage,
        confirmation: latestConfirmation(document),
        verificationStatus: asString(document.validation_status ?? document.validationStatus ?? document.verification_status ?? document.verificationStatus),
        verificationEvidenceRefs: evidenceRefs(document.verification_evidence ?? document.verificationEvidence),
        userAcceptanceRecorded: userAcceptanceRecorded(document)
      }];
    }).sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
    const selected = candidates[0] ?? null;
    return {
      projectRoot: root,
      sourceRefs: candidates.map((candidate) => candidate.sourceRef),
      updatedAt: selected?.updatedAt ?? null,
      artifactVersions: {
        requirementVersion: selected?.formalPackage.requirementVersion === "未记录" ? null : selected?.formalPackage.requirementVersion ?? null,
        designVersion: selected?.formalPackage.designVersion === "未记录" ? null : selected?.formalPackage.designVersion ?? null,
        impactVersion: selected?.formalPackage.impactVersion === "未记录" ? null : selected?.formalPackage.impactVersion ?? null,
        taskBreakdownVersion: selected?.formalPackage.taskBreakdownVersion === "未记录" ? null : selected?.formalPackage.taskBreakdownVersion ?? null,
        verificationPlanVersion: selected?.formalPackage.verificationPlanVersion === "未记录" ? null : selected?.formalPackage.verificationPlanVersion ?? null
      },
      confirmation: selected?.confirmation ?? null,
      verificationStatus: selected?.verificationStatus ?? null,
      verificationEvidenceRefs: Array.from(new Set(candidates.flatMap((candidate) => candidate.verificationEvidenceRefs))),
      userAcceptanceRecorded: candidates.some((candidate) => candidate.userAcceptanceRecorded)
    };
  }

  listProjectRuns(projectRoot: string): ScenarioLoopRunSummary[] {
    const root = normalizeProjectRoot(projectRoot);
    const runs: ScenarioLoopRunSummary[] = [];
    for (const statePath of listWorkflowStateFiles(root)) {
      const document = parseYaml(statePath);
      if (!document || !Array.isArray(document.scenario_loop_runs)) continue;
      const sourceRef = relative(root, statePath) || statePath;
      const feature = isRecord(document.feature) ? document.feature : {};
      for (const [index, value] of document.scenario_loop_runs.entries()) {
        if (!isRecord(value)) continue;
        const externalRunId = asString(value.run_id ?? value.id) ?? `run-${index + 1}`;
        const templateId = asString(value.primary_workflow ?? value.template_id);
        const templateVersion = asString(value.template_version);
        if (!templateId || !templateVersion) continue;
        const registered = this.workflowRegistryService.getScenarioLoopTemplateDefinition(templateId, templateVersion);
        const template: ScenarioLoopTemplateDefinition = registered ?? {
          templateId,
          templateVersion,
          templateName: templateId,
          templateKind: "scenario",
          manifestFingerprint: "unresolved-conversation-template",
          policy: fallbackPolicy()
        };
        const iterationValues = Array.isArray(value.iterations) ? value.iterations : [];
        const iterations: ScenarioLoopIterationSummary[] = iterationValues.flatMap((iterationValue, iterationIndex) => {
          if (!isRecord(iterationValue)) return [];
          const iteration = asNumber(iterationValue.iteration) ?? iterationIndex + 1;
          const completedAt = asString(iterationValue.completed_at ?? iterationValue.completedAt) ?? nowIso();
          return [{
            id: `conversation-iteration:${stableId(`${statePath}:${externalRunId}:${iteration}`)}`,
            runId: `conversation:${stableId(`${statePath}:${externalRunId}`)}`,
            iteration,
            status: normalizeIterationStatus(iterationValue.status),
            workflowRunRef: asString(iterationValue.workflow_run_ref ?? iterationValue.workflowRunRef),
            rootCauseKey: asString(iterationValue.root_cause_key ?? iterationValue.rootCauseKey),
            strategyFingerprint: asString(iterationValue.strategy_fingerprint ?? iterationValue.strategyFingerprint),
            changeSignals: normalizeChangeSignals(iterationValue.change_signals ?? iterationValue.changeSignals),
            quality: normalizeQuality(iterationValue.quality),
            budget: normalizeBudget(iterationValue.budget),
            stopReason: normalizeStopReason(iterationValue.stop_reason ?? iterationValue.stopReason),
            createdAt: asString(iterationValue.created_at ?? iterationValue.createdAt) ?? completedAt,
            completedAt
          }];
        });
        const currentIteration = asNumber(value.current_iteration ?? value.currentIteration) ?? iterations.length;
        const latestIteration = iterations.at(-1) ?? null;
        const createdAt = asString(value.created_at ?? value.createdAt ?? feature.created_at) ?? nowIso();
        const updatedAt = asString(value.updated_at ?? value.updatedAt) ?? latestIteration?.completedAt ?? createdAt;
        runs.push({
          id: `conversation:${stableId(`${statePath}:${externalRunId}`)}`,
          projectRoot: root,
          bindingId: `conversation:${templateId}@${templateVersion}`,
          evidenceSource: "conversation_state",
          sourceRef,
          sessionRef: asString(value.session_ref ?? value.sessionRef),
          externalRunId,
          template,
          formalPackage: normalizeFormalPackage(value.formal_package ?? value.formalPackage, document),
          status: normalizeStatus(value.status),
          stopReason: normalizeStopReason(value.stop_reason ?? value.stopReason),
          currentIteration,
          latestQuality: latestIteration?.quality ?? normalizeQuality(value.latest_quality ?? value.latestQuality),
          latestBudget: latestIteration?.budget ?? normalizeBudget(value.latest_budget ?? value.latestBudget),
          iterations,
          createdAt,
          updatedAt,
          closedAt: asString(value.closed_at ?? value.closedAt)
        });
      }
    }
    return runs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
}
