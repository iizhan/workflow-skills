import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WorkbenchDatabase } from "../src/main/database";
import { ensureStorage } from "../src/main/storage";
import { WorkflowRegistryService } from "../src/main/workflow-registry-service";
import { WorkflowStarterService } from "../src/main/workflow-starter-service";

interface IntegrationOptions {
  sandboxRoot: string;
  starterTemplateRoot: string;
  sourceWorkflowRoot: string;
  workflowPackagePath: string;
}

export async function runWorkflowRegistryIntegration(options: IntegrationOptions) {
  const registryTemplateRoot = join(options.sandboxRoot, "registry-templates");
  cpSync(options.sourceWorkflowRoot, registryTemplateRoot, { recursive: true });
  const database = new WorkbenchDatabase(ensureStorage(join(options.sandboxRoot, "storage")));
  const registry = new WorkflowRegistryService(database, registryTemplateRoot, options.workflowPackagePath);
  const starter = new WorkflowStarterService(options.starterTemplateRoot, options.workflowPackagePath);

  try {
    const templates = registry.listTemplates();
    assert.equal(templates.length, 6);
    assert.ok(templates.every((template) => template.validation.valid));

    const emptyProject = join(options.sandboxRoot, "empty-project");
    mkdirSync(emptyProject, { recursive: true });
    const blockedPreview = registry.previewBinding({
      projectRoot: emptyProject,
      templateId: "scenario.design-to-frontend"
    });
    assert.equal(blockedPreview.readyForConfirmation, false);
    assert.equal(blockedPreview.compatibility.status, "requires_workflow_starter");
    assert.throws(
      () => registry.applyBinding({ previewId: blockedPreview.previewId }),
      /Workflow binding cannot be applied/
    );
    assert.equal(existsSync(join(emptyProject, ".skill-os/workflow-bindings.yaml")), false);

    const projectRoot = join(options.sandboxRoot, "bound-project");
    mkdirSync(projectRoot, { recursive: true });
    assert.equal(starter.previewRecommendedStarter(projectRoot).canApply, true);
    starter.applyRecommendedStarter(projectRoot);
    assert.equal(existsSync(join(projectRoot, ".skill-os/workflow-bindings.yaml")), false);

    const declarations = registry.listProjectBindings(projectRoot);
    assert.equal(declarations.length, 6);
    assert.ok(declarations.every((binding) => binding.status === "legacy_read_only"));
    assert.ok(declarations.every((binding) => binding.readOnly));

    const firstPreview = registry.previewBinding({
      projectRoot,
      templateId: "scenario.design-to-frontend"
    });
    assert.equal(firstPreview.readyForConfirmation, true);
    assert.equal(firstPreview.changeType, "create");
    const firstResult = registry.applyBinding({ previewId: firstPreview.previewId });
    assert.equal(firstResult.verified, true);
    assert.equal(firstResult.binding.status, "active");
    assert.equal(firstResult.binding.templateVersion, "1.0.0");
    assert.equal(existsSync(join(projectRoot, ".skill-os/workflow-bindings.yaml")), true);

    const boundFile = readFileSync(join(projectRoot, ".skill-os/workflow-bindings.yaml"), "utf8");
    assert.match(boundFile, /template_id: scenario\.design-to-frontend/);
    assert.match(boundFile, /template_version: 1\.0\.0/);

    const manuallyRestoredBindingId = "restored-workflow-binding";
    writeFileSync(
      join(projectRoot, ".skill-os/workflow-bindings.yaml"),
      boundFile.replace(`binding_id: ${firstResult.binding.bindingId}`, `binding_id: ${manuallyRestoredBindingId}`),
      "utf8"
    );
    const synchronizedBindings = registry.listProjectBindings(projectRoot);
    assert.equal(
      synchronizedBindings.find((binding) => binding.templateId === "scenario.design-to-frontend")?.bindingId,
      manuallyRestoredBindingId
    );

    const scenarioTemplatePath = join(
      registryTemplateRoot,
      "scenario-design-to-frontend/workflow.yaml"
    );
    const upgradedTemplate = readFileSync(scenarioTemplatePath, "utf8").replace(
      'template_version: "1.0.0"',
      'template_version: "1.1.0"'
    );
    writeFileSync(scenarioTemplatePath, upgradedTemplate, "utf8");

    const upgradePreview = registry.previewBinding({
      projectRoot,
      templateId: "scenario.design-to-frontend"
    });
    assert.equal(upgradePreview.changeType, "upgrade");
    assert.equal(upgradePreview.template.templateVersion, "1.1.0");
    const upgradeResult = registry.applyBinding({ previewId: upgradePreview.previewId });
    assert.equal(upgradeResult.binding.templateVersion, "1.1.0");
    assert.equal(upgradeResult.binding.rollback?.templateVersion, "1.0.0");

    const rollbackPreview = registry.previewBindingRollback({
      projectRoot,
      bindingId: upgradeResult.binding.bindingId
    });
    assert.equal(rollbackPreview.changeType, "rollback");
    assert.equal(rollbackPreview.template.templateVersion, "1.0.0");
    const rollbackResult = registry.applyBinding({ previewId: rollbackPreview.previewId });
    assert.equal(rollbackResult.binding.templateVersion, "1.0.0");
    assert.equal(rollbackResult.binding.rollback?.templateVersion, "1.1.0");

    const doctor = registry.doctorProject(projectRoot);
    assert.equal(doctor.summary, "attention");
    assert.ok(doctor.checks.some((check) => check.id === "binding-document" && check.status === "pass"));
    assert.ok(doctor.checks.some((check) => check.id === "version-safety" && check.status === "warning"));

    const stalePreview = registry.previewBinding({
      projectRoot,
      templateId: "scenario.design-to-frontend"
    });
    const bindingFilePath = join(projectRoot, ".skill-os/workflow-bindings.yaml");
    writeFileSync(
      bindingFilePath,
      readFileSync(bindingFilePath, "utf8").replace("template_version: 1.0.0", "template_version: 0.9.0"),
      "utf8"
    );
    assert.throws(
      () => registry.applyBinding({ previewId: stalePreview.previewId }),
      /changed after preview/
    );

    const legacyProject = join(options.sandboxRoot, "legacy-project");
    const legacyWorkflowPath = join(legacyProject, ".skill-os/workflows/engineering/workflow.yaml");
    mkdirSync(join(legacyProject, ".skill-os/workflows/engineering"), { recursive: true });
    writeFileSync(
      legacyWorkflowPath,
      [
        'schema_version: "1.0.0"',
        'workflow_id: "wf_engineering_delivery"',
        'version: "1.0.0"',
        'name: "Engineering delivery"',
        'status: "active"',
        'entrypoints:',
        '  task_types: [development]',
        'nodes: []',
        'edges: []'
      ].join("\n"),
      "utf8"
    );
    const legacyBindings = registry.listProjectBindings(legacyProject);
    assert.equal(legacyBindings.length, 1);
    assert.equal(legacyBindings[0].source, "task_06_legacy");
    assert.equal(legacyBindings[0].status, "legacy_read_only");
    assert.equal(existsSync(join(legacyProject, ".skill-os/workflow-bindings.yaml")), false);
    assert.throws(
      () =>
        registry.previewLegacyMigration({
          projectRoot: legacyProject,
          legacyBindingId: legacyBindings[0].bindingId
        }),
      /does not contain/
    );

    const migratedLegacyProject = join(options.sandboxRoot, "migrated-legacy-project");
    mkdirSync(migratedLegacyProject, { recursive: true });
    starter.applyRecommendedStarter(migratedLegacyProject);
    const migrationSourcePath = join(
      migratedLegacyProject,
      ".skill-os/workflows/legacy-design-to-api/workflow.yaml"
    );
    mkdirSync(join(migratedLegacyProject, ".skill-os/workflows/legacy-design-to-api"), {
      recursive: true
    });
    const legacySource = [
      'schema_version: "1.0.0"',
      'workflow_id: "scenario.design-to-api"',
      'version: "1.0.0"',
      'name: "Legacy design to API"',
      'status: "active"',
      'entrypoints:',
      '  task_types: [development]',
      'nodes: []',
      'edges: []'
    ].join("\n");
    writeFileSync(migrationSourcePath, legacySource, "utf8");
    const migrationLegacy = registry
      .listProjectBindings(migratedLegacyProject)
      .find((binding) => binding.source === "task_06_legacy" && binding.templateId === "scenario.design-to-api");
    assert.ok(migrationLegacy);
    const migrationPreview = registry.previewLegacyMigration({
      projectRoot: migratedLegacyProject,
      legacyBindingId: migrationLegacy.bindingId
    });
    assert.equal(migrationPreview.changeType, "migration");
    assert.equal(readFileSync(migrationSourcePath, "utf8"), legacySource);
    const migrationResult = registry.applyBinding({ previewId: migrationPreview.previewId });
    assert.equal(migrationResult.verified, true);
    assert.equal(migrationResult.binding.templateId, "scenario.design-to-api");
    assert.equal(readFileSync(migrationSourcePath, "utf8"), legacySource);
    assert.equal(existsSync(join(migratedLegacyProject, ".skill-os/workflow-bindings.yaml")), true);
    const migrationDoctor = registry.doctorProject(migratedLegacyProject);
    assert.notEqual(migrationDoctor.summary, "blocked");
  } finally {
    database.close();
    rmSync(options.sandboxRoot, { recursive: true, force: true });
  }
}
