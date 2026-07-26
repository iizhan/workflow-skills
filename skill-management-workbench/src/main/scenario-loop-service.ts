import { randomUUID } from "node:crypto";
import type {
  ScenarioLoopBudgetSummary,
  ScenarioLoopChangeSignal,
  ScenarioLoopFormalPackage,
  ScenarioLoopIterationRecordInput,
  ScenarioLoopIterationStatus,
  ScenarioLoopIterationSummary,
  ScenarioLoopPolicy,
  ScenarioLoopQualityEvaluation,
  ScenarioLoopRunCreateInput,
  ScenarioLoopRunStatus,
  ScenarioLoopRunSummary,
  ScenarioLoopStopReason,
  ScenarioLoopTemplateDefinition
} from "../shared/types";
import type { WorkbenchDatabase } from "./database";
import type { WorkflowRegistryService } from "./workflow-registry-service";

const terminalStatuses = new Set<ScenarioLoopRunStatus>([
  "verified",
  "verified_with_risk",
  "needs_user_decision",
  "blocked",
  "budget_exhausted",
  "cancelled",
  "evolution_candidate"
]);

const changeSignalReasons: Record<ScenarioLoopChangeSignal, ScenarioLoopStopReason> = {
  scope_change: "scope_change",
  contract_change: "contract_change",
  permission_change: "permission_change",
  migration_required: "migration_required",
  external_effect: "external_effect",
  release_action: "release_action"
};

function nowIso() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
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

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseDimensionScores(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }
  const scores: Record<string, number | null> = {};
  for (const [key, score] of Object.entries(value)) {
    if (typeof score === "number" && Number.isFinite(score)) {
      scores[key] = score;
    } else if (score === null) {
      scores[key] = null;
    }
  }
  return scores;
}

function normalizeQuality(value: unknown): ScenarioLoopQualityEvaluation {
  const record = isRecord(value) ? value : {};
  const checks = Array.isArray(record.checks)
    ? record.checks.flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const id = asString(entry.id);
        return id
          ? [
              {
                id,
                passed: entry.passed === true,
                evidenceRefs: asStringArray(entry.evidenceRefs ?? entry.evidence_refs)
              }
            ]
          : [];
      })
    : [];
  return {
    score: typeof record.score === "number" && Number.isFinite(record.score) ? record.score : null,
    dimensionScores: parseDimensionScores(record.dimensionScores ?? record.dimension_scores),
    checks,
    blockingDefects: asStringArray(record.blockingDefects ?? record.blocking_defects),
    residualRisks: asStringArray(record.residualRisks ?? record.residual_risks),
    evidenceRefs: asStringArray(record.evidenceRefs ?? record.evidence_refs),
    policyRef: asString(record.policyRef ?? record.policy_ref)
  };
}

function normalizeBudget(value: unknown): ScenarioLoopBudgetSummary {
  const record = isRecord(value) ? value : {};
  const state = asString(record.state);
  return {
    state:
      state === "available" || state === "warning" || state === "critical" || state === "exhausted"
        ? state
        : "unknown",
    budgetPoolId: asString(record.budgetPoolId ?? record.budget_pool_id),
    estimatedTokens:
      typeof record.estimatedTokens === "number" && Number.isFinite(record.estimatedTokens)
        ? record.estimatedTokens
        : null,
    reservedTokens:
      typeof record.reservedTokens === "number" && Number.isFinite(record.reservedTokens)
        ? record.reservedTokens
        : null,
    observedTokens:
      typeof record.observedTokens === "number" && Number.isFinite(record.observedTokens)
        ? record.observedTokens
        : null,
    remainingTokens:
      typeof record.remainingTokens === "number" && Number.isFinite(record.remainingTokens)
        ? record.remainingTokens
        : null,
    evidenceRefs: asStringArray(record.evidenceRefs ?? record.evidence_refs)
  };
}

function normalizeFormalPackage(value: unknown): ScenarioLoopFormalPackage {
  const record = isRecord(value) ? value : {};
  return {
    requirementVersion: asString(record.requirementVersion ?? record.requirement_version) ?? "",
    designVersion: asString(record.designVersion ?? record.design_version) ?? "",
    impactVersion: asString(record.impactVersion ?? record.impact_version) ?? "",
    taskBreakdownVersion: asString(record.taskBreakdownVersion ?? record.task_breakdown_version) ?? "",
    verificationPlanVersion: asString(record.verificationPlanVersion ?? record.verification_plan_version) ?? "",
    confirmedAt: asString(record.confirmedAt ?? record.confirmed_at) ?? "",
    confirmationRef: asString(record.confirmationRef ?? record.confirmation_ref) ?? ""
  };
}

function normalizePolicy(value: unknown): ScenarioLoopPolicy {
  const record = isRecord(value) ? value : {};
  const rawDimensions = record.dimensionFloors ?? record.dimension_floors;
  const dimensions: Record<string, number> = {};
  if (isRecord(rawDimensions)) {
    for (const [key, floor] of Object.entries(rawDimensions)) {
      if (typeof floor === "number" && Number.isFinite(floor)) {
        dimensions[key] = floor;
      }
    }
  }
  return {
    maxIterations: Number(record.maxIterations ?? record.max_iterations),
    maxSameRootCauseStrategies: Number(
      record.maxSameRootCauseStrategies ?? record.max_same_root_cause_strategies
    ),
    onScopeChange: "require_reconfirmation",
    onBudgetExhausted: "needs_user_decision",
    passScore: Number(record.passScore ?? record.pass_score),
    dimensionFloors: dimensions,
    requiredChecks: asStringArray(record.requiredChecks ?? record.required_checks)
  };
}

function normalizeChangeSignals(value: unknown): ScenarioLoopChangeSignal[] {
  const valid = new Set<ScenarioLoopChangeSignal>([
    "scope_change",
    "contract_change",
    "permission_change",
    "migration_required",
    "external_effect",
    "release_action"
  ]);
  const signals = asStringArray(value);
  const unsupported = signals.filter((signal) => !valid.has(signal as ScenarioLoopChangeSignal));
  if (unsupported.length > 0) {
    throw new Error(`Scenario Loop received unsupported change signals: ${unsupported.join(", ")}.`);
  }
  return Array.from(new Set(signals as ScenarioLoopChangeSignal[]));
}

function isTerminal(status: ScenarioLoopRunStatus) {
  return terminalStatuses.has(status);
}

function validateFormalPackage(formalPackage: ScenarioLoopFormalPackage) {
  const missing = [
    ["requirementVersion", formalPackage.requirementVersion],
    ["designVersion", formalPackage.designVersion],
    ["impactVersion", formalPackage.impactVersion],
    ["taskBreakdownVersion", formalPackage.taskBreakdownVersion],
    ["verificationPlanVersion", formalPackage.verificationPlanVersion],
    ["confirmedAt", formalPackage.confirmedAt],
    ["confirmationRef", formalPackage.confirmationRef]
  ]
    .filter(([, value]) => !value.trim())
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Scenario Loop requires a confirmed formal package. Missing: ${missing.join(", ")}.`);
  }
  if (Number.isNaN(Date.parse(formalPackage.confirmedAt))) {
    throw new Error("Scenario Loop formal package confirmation time must be a valid ISO timestamp.");
  }
}

function qualityPasses(policy: ScenarioLoopPolicy, quality: ScenarioLoopQualityEvaluation) {
  if (quality.score === null || quality.score < policy.passScore || quality.blockingDefects.length > 0) {
    return false;
  }
  if (quality.evidenceRefs.length === 0) {
    return false;
  }
  for (const [dimension, floor] of Object.entries(policy.dimensionFloors)) {
    const score = quality.dimensionScores[dimension];
    if (score === null || score === undefined || score < floor) {
      return false;
    }
  }
  const checks = new Map(quality.checks.map((check) => [check.id, check]));
  return policy.requiredChecks.every((checkId) => {
    const check = checks.get(checkId);
    return Boolean(check?.passed && check.evidenceRefs.length > 0);
  });
}

export class ScenarioLoopService {
  constructor(
    private readonly database: WorkbenchDatabase,
    private readonly workflowRegistryService: WorkflowRegistryService
  ) {}

  createRun(input: ScenarioLoopRunCreateInput): ScenarioLoopRunSummary {
    validateFormalPackage(input.formalPackage);
    const bindings = this.workflowRegistryService.listProjectBindings(input.projectRoot);
    const binding = bindings.find((candidate) => candidate.bindingId === input.bindingId);
    if (!binding || binding.source !== "binding_file" || binding.readOnly) {
      throw new Error("Scenario Loop requires an explicit active project Workflow binding.");
    }
    if (!binding.compatibility.readyForBinding || !["active", "needs_upgrade"].includes(binding.status)) {
      throw new Error("The selected project Workflow binding is not compatible for Scenario Loop use.");
    }
    const template = this.workflowRegistryService.getScenarioLoopTemplateDefinition(
      binding.templateId,
      binding.templateVersion
    );
    if (!template) {
      throw new Error("The selected binding does not reference a valid loop-enabled scenario or integration Workflow.");
    }
    const createdAt = nowIso();
    const id = randomUUID();
    this.database.db
      .prepare(`
        INSERT INTO scenario_loop_runs (
          id, project_root, binding_id, template_id, template_version, template_name, template_kind, manifest_fingerprint,
          status, stop_reason, formal_package_json, policy_json, latest_quality_json,
          latest_budget_json, current_iteration, created_at, updated_at, closed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        binding.projectRoot,
        binding.bindingId,
        template.templateId,
        template.templateVersion,
        template.templateName,
        template.templateKind,
        template.manifestFingerprint,
        "pending",
        null,
        JSON.stringify(input.formalPackage),
        JSON.stringify(template.policy),
        null,
        input.initialBudget ? JSON.stringify(normalizeBudget(input.initialBudget)) : null,
        0,
        createdAt,
        createdAt,
        null
      );
    return this.requireRun(id);
  }

  recordIteration(input: ScenarioLoopIterationRecordInput): ScenarioLoopRunSummary {
    const run = this.requireRun(input.runId);
    if (isTerminal(run.status)) {
      throw new Error("Scenario Loop is already closed. Start a new confirmed run instead of appending an iteration.");
    }
    const quality = normalizeQuality(input.quality);
    const budget = normalizeBudget(input.budget);
    const changeSignals = normalizeChangeSignals(input.changeSignals);
    const iteration = run.currentIteration + 1;
    if (iteration > run.template.policy.maxIterations) {
      throw new Error("Scenario Loop has reached its maximum iteration limit.");
    }

    const rootCauseKey = asString(input.rootCauseKey);
    const strategyFingerprint = asString(input.strategyFingerprint);
    const decision = this.decideIteration({
      run,
      iteration,
      quality,
      budget,
      changeSignals,
      rootCauseKey,
      strategyFingerprint
    });
    const completedAt = nowIso();
    const iterationSummary: ScenarioLoopIterationSummary = {
      id: randomUUID(),
      runId: run.id,
      iteration,
      status: decision.iterationStatus,
      workflowRunRef: asString(input.workflowRunRef),
      rootCauseKey,
      strategyFingerprint,
      changeSignals,
      quality,
      budget,
      stopReason: decision.stopReason,
      createdAt: completedAt,
      completedAt
    };
    const closedAt = isTerminal(decision.runStatus) ? completedAt : null;
    const transaction = this.database.db.transaction(() => {
      this.database.db
        .prepare(`
          INSERT INTO scenario_loop_iterations (
            id, run_id, iteration, status, workflow_run_ref, root_cause_key,
            strategy_fingerprint, change_signals_json, quality_json, budget_json,
            stop_reason, created_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          iterationSummary.id,
          iterationSummary.runId,
          iterationSummary.iteration,
          iterationSummary.status,
          iterationSummary.workflowRunRef,
          iterationSummary.rootCauseKey,
          iterationSummary.strategyFingerprint,
          JSON.stringify(iterationSummary.changeSignals),
          JSON.stringify(iterationSummary.quality),
          JSON.stringify(iterationSummary.budget),
          iterationSummary.stopReason,
          iterationSummary.createdAt,
          iterationSummary.completedAt
        );
      this.database.db
        .prepare(`
          UPDATE scenario_loop_runs
          SET status = ?, stop_reason = ?, latest_quality_json = ?, latest_budget_json = ?,
              current_iteration = ?, updated_at = ?, closed_at = ?
          WHERE id = ?
        `)
        .run(
          decision.runStatus,
          decision.stopReason,
          JSON.stringify(quality),
          JSON.stringify(budget),
          iteration,
          completedAt,
          closedAt,
          run.id
        );
    });
    transaction();
    return this.requireRun(run.id);
  }

  cancelRun(runId: string): ScenarioLoopRunSummary {
    const run = this.requireRun(runId);
    if (isTerminal(run.status)) {
      return run;
    }
    const closedAt = nowIso();
    this.database.db
      .prepare(`
        UPDATE scenario_loop_runs
        SET status = ?, stop_reason = ?, updated_at = ?, closed_at = ?
        WHERE id = ?
      `)
      .run("cancelled", "user_cancelled", closedAt, closedAt, run.id);
    return this.requireRun(run.id);
  }

  getRun(runId: string): ScenarioLoopRunSummary | null {
    const row = this.database.db
      .prepare(`SELECT * FROM scenario_loop_runs WHERE id = ? LIMIT 1`)
      .get(runId) as Record<string, unknown> | undefined;
    return row ? this.toRunSummary(row) : null;
  }

  listProjectRuns(projectRoot: string): ScenarioLoopRunSummary[] {
    const rows = this.database.db
      .prepare(`SELECT * FROM scenario_loop_runs WHERE project_root = ? ORDER BY updated_at DESC`)
      .all(projectRoot) as Array<Record<string, unknown>>;
    return rows.map((row) => this.toRunSummary(row));
  }

  private decideIteration(input: {
    run: ScenarioLoopRunSummary;
    iteration: number;
    quality: ScenarioLoopQualityEvaluation;
    budget: ScenarioLoopBudgetSummary;
    changeSignals: ScenarioLoopChangeSignal[];
    rootCauseKey: string | null;
    strategyFingerprint: string | null;
  }): {
    runStatus: ScenarioLoopRunStatus;
    iterationStatus: ScenarioLoopIterationStatus;
    stopReason: ScenarioLoopStopReason | null;
  } {
    const { run, quality, budget, changeSignals } = input;
    const changeReason = changeSignals.map((signal) => changeSignalReasons[signal])[0] ?? null;
    if (changeReason) {
      return {
        runStatus: "needs_user_decision",
        iterationStatus: "blocked",
        stopReason: changeReason
      };
    }
    if (qualityPasses(run.template.policy, quality)) {
      return {
        runStatus: quality.residualRisks.length > 0 ? "verified_with_risk" : "verified",
        iterationStatus: quality.residualRisks.length > 0 ? "verified_with_risk" : "verified",
        stopReason: "quality_gate_passed"
      };
    }
    if (budget.state === "exhausted") {
      return {
        runStatus: "budget_exhausted",
        iterationStatus: "budget_exhausted",
        stopReason: "budget_exhausted"
      };
    }
    if (budget.state === "critical") {
      return {
        runStatus: "needs_user_decision",
        iterationStatus: "blocked",
        stopReason: "budget_critical"
      };
    }
    if (budget.state === "unknown") {
      return {
        runStatus: "needs_user_decision",
        iterationStatus: "blocked",
        stopReason: "budget_unknown"
      };
    }
    if (!input.rootCauseKey || !input.strategyFingerprint) {
      return {
        runStatus: "blocked",
        iterationStatus: "blocked",
        stopReason: quality.blockingDefects.length > 0 ? "blocking_defect" : "missing_repair_diagnosis"
      };
    }
    const sameRootCause = run.iterations.filter(
      (iteration) => iteration.rootCauseKey === input.rootCauseKey
    );
    if (sameRootCause.some((iteration) => iteration.strategyFingerprint === input.strategyFingerprint)) {
      return {
        runStatus: "needs_user_decision",
        iterationStatus: "blocked",
        stopReason: "duplicate_strategy"
      };
    }
    const strategyCount = new Set([
      ...sameRootCause.map((iteration) => iteration.strategyFingerprint).filter(Boolean),
      input.strategyFingerprint
    ]).size;
    if (strategyCount >= run.template.policy.maxSameRootCauseStrategies) {
      return {
        runStatus: "evolution_candidate",
        iterationStatus: "evolution_candidate",
        stopReason: "root_cause_strategy_limit"
      };
    }
    if (input.iteration >= run.template.policy.maxIterations) {
      return {
        runStatus: "needs_user_decision",
        iterationStatus: "blocked",
        stopReason: "max_iterations_reached"
      };
    }
    return {
      runStatus: "running",
      iterationStatus: "needs_repair",
      stopReason: null
    };
  }

  private requireRun(runId: string) {
    const run = this.getRun(runId);
    if (!run) {
      throw new Error("Scenario Loop Run was not found.");
    }
    return run;
  }

  private toRunSummary(row: Record<string, unknown>): ScenarioLoopRunSummary {
    const policy = normalizePolicy(parseJson(row.policy_json));
    const template: ScenarioLoopTemplateDefinition = {
      templateId: String(row.template_id),
      templateVersion: String(row.template_version),
      templateName: String(row.template_name),
      templateKind: String(row.template_kind) as ScenarioLoopTemplateDefinition["templateKind"],
      manifestFingerprint: String(row.manifest_fingerprint),
      policy
    };
    const iterationRows = this.database.db
      .prepare(`SELECT * FROM scenario_loop_iterations WHERE run_id = ? ORDER BY iteration ASC`)
      .all(String(row.id)) as Array<Record<string, unknown>>;
    return {
      id: String(row.id),
      projectRoot: String(row.project_root),
      bindingId: String(row.binding_id),
      template,
      formalPackage: normalizeFormalPackage(parseJson(row.formal_package_json)),
      status: String(row.status) as ScenarioLoopRunStatus,
      stopReason: (row.stop_reason ? String(row.stop_reason) : null) as ScenarioLoopStopReason | null,
      currentIteration: Number(row.current_iteration),
      latestQuality: row.latest_quality_json ? normalizeQuality(parseJson(row.latest_quality_json)) : null,
      latestBudget: row.latest_budget_json ? normalizeBudget(parseJson(row.latest_budget_json)) : null,
      iterations: iterationRows.map((iteration) => this.toIterationSummary(iteration)),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      closedAt: row.closed_at ? String(row.closed_at) : null
    };
  }

  private toIterationSummary(row: Record<string, unknown>): ScenarioLoopIterationSummary {
    return {
      id: String(row.id),
      runId: String(row.run_id),
      iteration: Number(row.iteration),
      status: String(row.status) as ScenarioLoopIterationStatus,
      workflowRunRef: row.workflow_run_ref ? String(row.workflow_run_ref) : null,
      rootCauseKey: row.root_cause_key ? String(row.root_cause_key) : null,
      strategyFingerprint: row.strategy_fingerprint ? String(row.strategy_fingerprint) : null,
      changeSignals: normalizeChangeSignals(parseJson(row.change_signals_json)),
      quality: normalizeQuality(parseJson(row.quality_json)),
      budget: normalizeBudget(parseJson(row.budget_json)),
      stopReason: (row.stop_reason ? String(row.stop_reason) : null) as ScenarioLoopStopReason | null,
      createdAt: String(row.created_at),
      completedAt: String(row.completed_at)
    };
  }
}
