import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuthorizationService } from "../src/main/authorization-service";
import { WorkbenchDatabase } from "../src/main/database";
import { HealthScorePolicyService } from "../src/main/health-score-policy-service";
import { RegistryService } from "../src/main/registry-service";
import { ensureStorage } from "../src/main/storage";

const root = mkdtempSync(join(tmpdir(), "skill-os-registry-scan-test-"));
const projectRoot = join(root, "project");
mkdirSync(join(projectRoot, ".agents", "skills", "target"), { recursive: true });
mkdirSync(join(projectRoot, "node_modules", "ignored"), { recursive: true });
writeFileSync(join(projectRoot, ".agents", "skills", "target", "SKILL.md"), "---\nname: Target Skill\ndescription: fixture\n---\n", "utf8");
writeFileSync(join(projectRoot, "node_modules", "ignored", "SKILL.md"), "---\nname: Ignored Skill\n---\n", "utf8");

const database = new WorkbenchDatabase(ensureStorage(join(root, "storage")));
const authorization = new AuthorizationService(database);
const policy = new HealthScorePolicyService(database);
const registry = new RegistryService(database, authorization, policy);

try {
  authorization.grantAuthorization({
    name: "Targeted scan fixture",
    scanRoots: [projectRoot],
    scanExclusions: [],
    telemetryMode: "disabled",
    allowRawContent: false,
    allowBackgroundWatch: false
  });
  const result = await registry.scanProjectRoot(projectRoot);
  assert.equal(result.scanScope, "project");
  assert.equal(result.filesSeen, 1, "Targeted scan must skip node_modules and find only the selected Skill.");
  assert.equal(result.skillsFound, 1);
  await assert.rejects(
    () => registry.scanProjectRoot(join(root, "missing-project")),
    /Project folder does not exist/,
    "Scanning a missing project path must fail with an actionable error."
  );
} finally {
  database.close();
  rmSync(root, { recursive: true, force: true });
}

console.log("Registry scan integration passed: targeted project scan is awaitable, validates folder paths, and skips excluded dependency directories.");
