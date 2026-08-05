import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ScenarioLoopBudgetSummary,
  ScenarioLoopFormalPackage,
  ScenarioLoopQualityEvaluation
} from "../src/shared/types";
import { WorkbenchDatabase } from "../src/main/database";
import { ScenarioLoopService } from "../src/main/scenario-loop-service";
import { ensureStorage } from "../src/main/storage";
import { WorkflowRegistryService } from "../src/main/workflow-registry-service";
import { WorkflowStarterService } from "../src/main/workflow-starter-service";

interface IntegrationOptions {
  sandboxRoot: string;
  starterTemplateRoot: string;
  workflowTemplateRoot: string;
  workflowPackagePath: string;
}

const formalPackage: ScenarioLoopFormalPackage = {
  requirementVersion: "v1",
  designVersion: "v1",
  impactVersion: "v1",
  taskBreakdownVersion: "v1",
  verificationPlanVersion: "v1",
  confirmedAt: "2026-07-22T09:00:00.000Z",
  confirmationRef: "workflow-architecture/TASK-WF-03"
};

const availableBudget: ScenarioLoopBudgetSummary = {
  state: "available",
  budgetPoolId: "personal_session:test",
  estimatedTokens: 600,
  reservedTokens: 600,
  observedTokens: 480,
  remainingTokens: 9520,
  evidenceRefs: ["budget:test"]
};

const exhaustedBudget: ScenarioLoopBudgetSummary = {
  ...availableBudget,
  state: "exhausted",
  remainingTokens: 0
};

const unknownBudget: ScenarioLoopBudgetSummary = {
  ...availableBudget,
  state: "unknown",
  budgetPoolId: null,
  remainingTokens: null,
  evidenceRefs: []
};

function quality(overrides: Partial<ScenarioLoopQualityEvaluation> = {}): ScenarioLoopQualityEvaluation {
  return {
    score: 94,
    dimensionScores: {
      coverage: 92,
      correctness: 93,
      contract: 93,
      verification: 91,
      experience: 90
    },
    checks: [
      { id: "no_blocking_issue", passed: true, evidenceRefs: ["verification:issue-free"] },
      {
        id: "evidence_for_all_confirmed_acceptance",
        passed: true,
        evidenceRefs: ["verification:acceptance-matrix"]
      },
      { id: "visual_or_interaction_evidence", passed: true, evidenceRefs: ["verification:visible-ui"] },
      { id: "api_contract_evidence", passed: true, evidenceRefs: ["verification:api-contract"] },
      { id: "key_path_integration_evidence", passed: true, evidenceRefs: ["verification:integration-path"] }
    ],
    blockingDefects: [],
    residualRisks: [],
    evidenceRefs: ["verification:report"],
    policyRef: "quality.frontend-reconstruction.v1",
    ...overrides
  };
}

function failedQuality(overrides: Partial<ScenarioLoopQualityEvaluation> = {}) {
  return quality({
    score: 68,
    dimensionScores: {
      coverage: 72,
      correctness: 67,
      verification: 65,
      experience: 70
    },
    checks: [
      { id: "no_blocking_issue", passed: false, evidenceRefs: ["verification:known-defect"] },
      {
        id: "evidence_for_all_confirmed_acceptance",
        passed: false,
        evidenceRefs: ["verification:missing-acceptance"]
      },
      { id: "visual_or_interaction_evidence", passed: false, evidenceRefs: [] }
    ],
    blockingDefects: ["A confirmed acceptance item still fails."],
    ...overrides
  });
}

export async function runScenarioLoopIntegration(options: IntegrationOptions) {
  const projectRoot = join(options.sandboxRoot, "scenario-project");
  mkdirSync(projectRoot, { recursive: true });
  const database = new WorkbenchDatabase(ensureStorage(join(options.sandboxRoot, "storage")));
  const registry = new WorkflowRegistryService(
    database,
    options.workflowTemplateRoot,
    options.workflowPackagePath
  );
  const starter = new WorkflowStarterService(options.starterTemplateRoot, options.workflowPackagePath);
  const loopService = new ScenarioLoopService(database, registry);

  try {
    starter.applyRecommendedStarter(projectRoot);
    const bindingPreview = registry.previewBinding({
      projectRoot,
      templateId: "scenario.design-to-frontend"
    });
    const binding = registry.applyBinding({ previewId: bindingPreview.previewId }).binding;

    const conversationFeatureRoot = join(projectRoot, "specs", "conversation-loop");
    mkdirSync(conversationFeatureRoot, { recursive: true });
    writeFileSync(
      join(conversationFeatureRoot, "workflow-state.yaml"),
      `feature:
  slug: conversation-loop
  name: Conversation loop evidence
  created_at: "2026-07-23T09:00:00.000Z"
artifact_versions:
  requirement: v1
  design: v2
  impact: v1
  task_breakdown: v2
  verification: v1
scenario_loop_runs:
  - run_id: loop-conversation-001
    initiation_source: conversation
    session_ref: session-019f
    primary_workflow: scenario.design-to-frontend
    template_version: 1.0.0
    formal_package:
      requirement: v1
      design: v2
      impact: v1
      task_breakdown: v2
      verification: v1
      confirmation_ref: feature/conversation-loop/confirmation-v2
      confirmed_at: "2026-07-23T09:10:00.000Z"
    status: verified
    current_iteration: 1
    iterations:
      - iteration: 1
        status: verified
        workflow_run_ref: turn-019f-01
        quality:
          score: 94
          evidence_refs: [verification:conversation-loop]
          checks:
            - id: visual_or_interaction_evidence
              passed: true
              evidence_refs: [screenshot:conversation-loop]
        budget:
          state: available
          observed_tokens: 680
          evidence_refs: [usage:conversation-loop]
        created_at: "2026-07-23T09:11:00.000Z"
        completed_at: "2026-07-23T09:12:00.000Z"
    created_at: "2026-07-23T09:10:00.000Z"
    updated_at: "2026-07-23T09:12:00.000Z"
    closed_at: "2026-07-23T09:12:00.000Z"
`,
      "utf8"
    );
    const conversationRun = loopService
      .listProjectRuns(projectRoot)
      .find((run) => run.externalRunId === "loop-conversation-001");
    assert.equal(conversationRun?.evidenceSource, "conversation_state");
    assert.equal(conversationRun?.sessionRef, "session-019f");
    assert.equal(conversationRun?.template.templateId, "scenario.design-to-frontend");
    assert.equal(conversationRun?.latestQuality?.score, 94);
    assert.equal(conversationRun?.iterations[0]?.budget.observedTokens, 680);
    assert.equal(conversationRun?.sourceRef, "specs/conversation-loop/workflow-state.yaml");

    const standardFeatureRoot = join(projectRoot, "specs", "standard-delivery");
    mkdirSync(standardFeatureRoot, { recursive: true });
    writeFileSync(
      join(standardFeatureRoot, "workflow-state.yaml"),
      `feature:
  slug: standard-delivery
  name: Standard delivery evidence
  created_at: "2026-07-24T09:00:00.000Z"
  updated_at: "2026-07-24T09:20:00.000Z"
artifact_versions:
  requirement: v3
  design: v4
  impact: v2
  task_breakdown: v4
  verification: v2
confirmation_history:
  - id: standard-delivery/confirmation-v4
    confirmed_at: "2026-07-24T09:10:00.000Z"
confirmation_gates:
  user_acceptance:
    status: accepted
verification_evidence:
  - ref: report:standard-delivery
validation_status: verified
scenario_loop_runs: []
`,
      "utf8"
    );
    const standardEvidence = loopService.getProjectWorkflowEvidence(projectRoot);
    assert.equal(standardEvidence.artifactVersions.designVersion, "v4");
    assert.equal(standardEvidence.confirmation?.confirmationRef, "standard-delivery/confirmation-v4");
    assert.equal(standardEvidence.verificationStatus, "verified");
    assert.deepEqual(standardEvidence.verificationEvidenceRefs, ["report:standard-delivery"]);
    assert.equal(standardEvidence.userAcceptanceRecorded, true);
    assert.equal(standardEvidence.sourceRefs[0], "specs/standard-delivery/workflow-state.yaml");

    assert.throws(
      () =>
        loopService.createRun({
          projectRoot,
          bindingId: binding.bindingId,
          formalPackage: { ...formalPackage, designVersion: "" }
        }),
      /confirmed formal package/
    );

    const firstPassRun = loopService.createRun({ projectRoot, bindingId: binding.bindingId, formalPackage });
    const firstPassResult = loopService.recordIteration({
      runId: firstPassRun.id,
      workflowRunRef: "workflow-run:first-pass",
      quality: quality(),
      budget: availableBudget
    });
    assert.equal(firstPassResult.status, "verified");
    assert.equal(firstPassResult.stopReason, "quality_gate_passed");
    assert.equal(firstPassResult.currentIteration, 1);

    const apiBinding = registry.applyBinding({
      previewId: registry.previewBinding({ projectRoot, templateId: "scenario.design-to-api" }).previewId
    }).binding;
    const apiRun = loopService.createRun({ projectRoot, bindingId: apiBinding.bindingId, formalPackage });
    const apiResult = loopService.recordIteration({
      runId: apiRun.id,
      workflowRunRef: "workflow-run:design-to-api",
      quality: quality({ policyRef: "quality.api-delivery.v1" }),
      budget: availableBudget
    });
    assert.equal(apiResult.status, "verified");
    assert.equal(apiResult.template.templateId, "scenario.design-to-api");

    const integrationBinding = registry.applyBinding({
      previewId: registry.previewBinding({ projectRoot, templateId: "integration.swagger-to-frontend" }).previewId
    }).binding;
    const integrationRun = loopService.createRun({
      projectRoot,
      bindingId: integrationBinding.bindingId,
      formalPackage
    });
    const integrationResult = loopService.recordIteration({
      runId: integrationRun.id,
      workflowRunRef: "workflow-run:swagger-to-frontend",
      quality: quality({ policyRef: "quality.swagger-integration.v1" }),
      budget: availableBudget
    });
    assert.equal(integrationResult.status, "verified");
    assert.equal(integrationResult.template.templateId, "integration.swagger-to-frontend");

    const repairRun = loopService.createRun({ projectRoot, bindingId: binding.bindingId, formalPackage });
    const repairPending = loopService.recordIteration({
      runId: repairRun.id,
      rootCauseKey: "ui.navigation.state",
      strategyFingerprint: "restore-selected-state-v1",
      quality: failedQuality(),
      budget: availableBudget
    });
    assert.equal(repairPending.status, "running");
    assert.equal(repairPending.iterations[0].status, "needs_repair");
    const repairComplete = loopService.recordIteration({
      runId: repairRun.id,
      workflowRunRef: "workflow-run:repair",
      quality: quality(),
      budget: availableBudget
    });
    assert.equal(repairComplete.status, "verified");
    assert.equal(repairComplete.currentIteration, 2);

    const duplicateRun = loopService.createRun({ projectRoot, bindingId: binding.bindingId, formalPackage });
    loopService.recordIteration({
      runId: duplicateRun.id,
      rootCauseKey: "api.contract.mismatch",
      strategyFingerprint: "regenerate-client-v1",
      quality: failedQuality(),
      budget: availableBudget
    });
    const duplicateResult = loopService.recordIteration({
      runId: duplicateRun.id,
      rootCauseKey: "api.contract.mismatch",
      strategyFingerprint: "regenerate-client-v1",
      quality: failedQuality(),
      budget: availableBudget
    });
    assert.equal(duplicateResult.status, "needs_user_decision");
    assert.equal(duplicateResult.stopReason, "duplicate_strategy");

    const scopeRun = loopService.createRun({ projectRoot, bindingId: binding.bindingId, formalPackage });
    const scopeResult = loopService.recordIteration({
      runId: scopeRun.id,
      changeSignals: ["scope_change"],
      quality: quality(),
      budget: availableBudget
    });
    assert.equal(scopeResult.status, "needs_user_decision");
    assert.equal(scopeResult.stopReason, "scope_change");

    const budgetRun = loopService.createRun({ projectRoot, bindingId: binding.bindingId, formalPackage });
    const budgetResult = loopService.recordIteration({
      runId: budgetRun.id,
      rootCauseKey: "frontend.visual.regression",
      strategyFingerprint: "repair-layout-v1",
      quality: failedQuality(),
      budget: exhaustedBudget
    });
    assert.equal(budgetResult.status, "budget_exhausted");
    assert.equal(budgetResult.stopReason, "budget_exhausted");

    const unknownBudgetRun = loopService.createRun({ projectRoot, bindingId: binding.bindingId, formalPackage });
    const unknownBudgetResult = loopService.recordIteration({
      runId: unknownBudgetRun.id,
      rootCauseKey: "frontend.usage.missing",
      strategyFingerprint: "recheck-usage-v1",
      quality: failedQuality(),
      budget: unknownBudget
    });
    assert.equal(unknownBudgetResult.status, "needs_user_decision");
    assert.equal(unknownBudgetResult.stopReason, "budget_unknown");

    const hardGateRun = loopService.createRun({ projectRoot, bindingId: binding.bindingId, formalPackage });
    const hardGateResult = loopService.recordIteration({
      runId: hardGateRun.id,
      rootCauseKey: "frontend.visible-evidence",
      strategyFingerprint: "run-visible-check-v1",
      quality: quality({
        score: 99,
        checks: [
          { id: "no_blocking_issue", passed: true, evidenceRefs: ["verification:issue-free"] },
          {
            id: "evidence_for_all_confirmed_acceptance",
            passed: true,
            evidenceRefs: ["verification:acceptance-matrix"]
          },
          { id: "visual_or_interaction_evidence", passed: false, evidenceRefs: [] }
        ]
      }),
      budget: availableBudget
    });
    assert.equal(hardGateResult.status, "running");
    assert.notEqual(hardGateResult.status, "verified");

    const evolutionRun = loopService.createRun({ projectRoot, bindingId: binding.bindingId, formalPackage });
    loopService.recordIteration({
      runId: evolutionRun.id,
      rootCauseKey: "workflow.repeated-gap",
      strategyFingerprint: "strategy-a",
      quality: failedQuality(),
      budget: availableBudget
    });
    const evolutionResult = loopService.recordIteration({
      runId: evolutionRun.id,
      rootCauseKey: "workflow.repeated-gap",
      strategyFingerprint: "strategy-b",
      quality: failedQuality(),
      budget: availableBudget
    });
    assert.equal(evolutionResult.status, "evolution_candidate");
    assert.equal(evolutionResult.stopReason, "root_cause_strategy_limit");

    const maxIterationRun = loopService.createRun({ projectRoot, bindingId: binding.bindingId, formalPackage });
    loopService.recordIteration({
      runId: maxIterationRun.id,
      rootCauseKey: "cause-one",
      strategyFingerprint: "strategy-one",
      quality: failedQuality(),
      budget: availableBudget
    });
    loopService.recordIteration({
      runId: maxIterationRun.id,
      rootCauseKey: "cause-two",
      strategyFingerprint: "strategy-two",
      quality: failedQuality(),
      budget: availableBudget
    });
    const maxIterationResult = loopService.recordIteration({
      runId: maxIterationRun.id,
      rootCauseKey: "cause-three",
      strategyFingerprint: "strategy-three",
      quality: failedQuality(),
      budget: availableBudget
    });
    assert.equal(maxIterationResult.status, "needs_user_decision");
    assert.equal(maxIterationResult.stopReason, "max_iterations_reached");
  } finally {
    database.close();
    rmSync(options.sandboxRoot, { recursive: true, force: true });
  }
}
