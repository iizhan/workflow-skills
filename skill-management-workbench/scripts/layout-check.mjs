import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadRendererSource } from "./lib/load-renderer-source.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

function assertIncludes(file, content, expected, label) {
  assert(content.includes(expected), `${label} missing in ${file}: ${expected}`);
}

const app = loadRendererSource();
const styles = read("src/renderer/src/styles.css");
const status = read("../specs/skill-management-workbench/implementation-status.md");

const visualGuardIndex = styles.lastIndexOf("Skill OS visual QA workflow guardrail layer");
const productFlowIndex = styles.lastIndexOf("Skill OS product-flow single module layer");
const reportedIssueRepairIndex = styles.lastIndexOf("Skill OS reported-issue repair layer");
assert(visualGuardIndex > productFlowIndex, "Visual QA guardrail layer must sit after product-flow CSS.");
assert(
  reportedIssueRepairIndex > visualGuardIndex,
  "Reported UI issue repair layer must sit after the broader visual QA layer."
);

assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".product-workspace.single-module-mode .product-topbar {\n    position: relative;",
  "Single-module topbar must stay in document flow, not overlay content"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-dashboard-card",
  "Overview must use a metric dashboard card"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-kpi-grid",
  "Overview dashboard metrics must have dedicated layout"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-report-card",
  "Overview must include a compact report card without becoming a module directory"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-report-metrics",
  "Overview report metrics must have dedicated layout"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-health-list",
  "Overview must summarize health and risk indicators"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".product-workspace.single-module-mode .product-status-strip {\n    grid-template-columns: repeat(5, minmax(92px, 1fr));",
  "Desktop trust tiles must remain compact enough for 1440px preview"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".product-workspace.single-module-mode .product-topbar-actions {\n    flex-wrap: nowrap;",
  "Topbar actions must not become a large second-row overlay on desktop"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="product-workspace single-module-mode"',
  "Layout check expects product workspace single-module mode"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-dashboard-card entity-skill"',
  "Layout check expects Overview dashboard metric markup"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "User Session Insights",
  "Settings should expose user session insight capability"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Title and description should share one readable row",
  "User Session Insights should remember the compact title/description preference"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".user-session-insights-card",
  "User Session Insights should have dedicated layout styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "interactionNotice && currentProductSection !== \"overview\"",
  "Visible interaction feedback should appear for active work modules without cluttering Overview"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".interaction-action-feedback",
  "Layout guard should cover visible click feedback"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "settings-session-card",
  "User Session Insights should be visible near the Settings entry area"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".settings-session-card",
  "Settings entry User Session Insights should span the Settings grid"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="section-headline proposal-headline"',
  "Optimization Proposals headline should avoid squeezing copy into vertical text"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS module headline anti-squeeze repair",
  "Module headlines should have an anti-squeeze layout repair layer"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  'data-active-section="analysis"] #telemetry .section-headline > div',
  "Analysis detail cards should stack headings and descriptions instead of squeezing them into one row"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Runtime layout repair",
  "Runtime telemetry intake should have a dedicated layout repair layer"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '#telemetry .local-tool-intake .section-headline.compact .toolbar.wrap',
  "Runtime local tool toolbar should override global headline grid rules"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="project-library-table"',
  "Project Library must render bound projects as a table"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'tx("Bound Projects", "已绑定项目")',
  "Project Library should use bound-project language instead of recent or managed-project language"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "扫描和分析仍然一次只作用于一个选中项目",
  "Project Library must state the single selected project boundary"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".project-library-table-shell",
  "Project Library table shell styling must exist"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".project-library-table-shell {\n  max-width: 100%;\n  overflow-x: hidden;",
  "Project Library table must not require horizontal scrolling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".project-library-table td::before",
  "Project Library table should collapse into labeled fields on narrower screens"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".project-table-action.danger",
  "Project Library table actions should have deliberate compact action styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Analysis pressure-summary refinement",
  "Analysis first screen should stay compact and signal-led"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".section-headline.proposal-headline .toolbar",
  "Optimization Proposals toolbar should not overflow the viewport"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".discovery-entry-strip",
  "Discovery should keep a compact entry strip above the deeper workbench"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".marketplace-entry-strip",
  "Remote Market should keep a compact entry strip above the progressive flow"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplace-entry-flow",
  "Remote Market should compress the entry strip into a single operator flow"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".marketplace-entry-flow",
  "Remote Market entry flow should have dedicated compact styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".remote-preflight-workbench",
  "Discovery remote repository analysis should render in a stable full-width preflight workbench"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="graph"] .graph-focus-grid',
  "Graph Focus cards should have readable grid guardrails"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="graph"] .graph-topology-svg {\n    width: 100%;',
  "Graph topology should fit the single-module canvas instead of clipping the final lane"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="graph"] .graph-topology-scroll {\n    overflow-x: hidden;',
  "Graph topology should not require horizontal scrolling to understand the default map"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="local-skills"] .skill-action-feedback-grid',
  "Skill Library action feedback should have a readable grid layout"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "reported-remote-candidate-preview",
  "Self-test must capture remote candidate preview readability"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "reported-graph-focus-readable",
  "Self-test must capture graph focus readability after selecting a node"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-main"',
  "Overview should use a command-center main wrapper"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Overview Metrics",
  "Overview should lead with metric summary content"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-report-card"',
  "Overview should show a compact report surface"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-kpi-grid"',
  "Overview should expose KPI trend cards"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-health-list"',
  "Overview should expose coverage and risk indicators"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-workflow-strip"',
  "Overview should expose a compact workflow, not leave the first screen sparse"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-workflow-intro"',
  "Overview workflow should explain the guided path without a dense arrow sentence"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Operating Path",
  "Overview should label the workflow as a compact operating path"
);
assert(
  !app.includes("overview-workflow-handoff"),
  "Overview must not regress into a second handoff explanation row under the workflow."
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-boundary-card entity-project"',
  "Overview should expose Runtime as a first-screen entry"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-focus-dock"',
  "Overview should use Today Focus to avoid a sparse first screen"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "overview-signal-summary",
  "Overview should summarize today's signal without another explanatory block"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "overview-today-report",
  "Overview should include a compact report strip instead of leaving first-screen dead space"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'data-product-section="evaluate"',
  "Evaluate should be a first-class product module"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".evaluate-score-grid",
  "Evaluate scorecards should have dedicated layout"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-today-report",
  "Overview report strip should have dedicated compact styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Local SQLite snapshot",
  "Graph page should explain that topology comes from the local SQLite snapshot"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graph-focus-primer",
  "Graph empty focus panel should explain how to read the topology"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graph-operator-band",
  "Graph page should expose a compact first-screen operator flow"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".graph-operator-band",
  "Graph operator flow should have dedicated compact styling"
);
assert(
  !app.includes('className="graph-studio-start"'),
  "Graph must not regress into a duplicate Search/Select/Trace instruction band above the topology."
);
assert(
  app.indexOf("skill-graph-workspace") < app.indexOf("graph-snapshot-summary"),
  "Graph topology workspace must appear before secondary snapshot summary details."
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS Overview command-center layout repair",
  "Overview layout should be repaired as a command center instead of asymmetric columns"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="overview"] .hero-side',
  "Overview side content should render as a balanced command rail on desktop"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".product-workspace.single-module-mode .section-headline > div",
  "Module headers should keep title and description compact on desktop"
);
assert(
  !app.includes("hero-entry-grid") && !styles.includes("hero-entry-grid"),
  "Overview must not regress into a feature-directory entry grid."
);
assert(
  !app.includes("guided-flow-rail") && !styles.includes("guided-flow-rail"),
  "Overview must not show a full operating-chain rail on the first screen."
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "settings-storage-panel",
  "Settings storage panel should be identified for local layout repair"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".settings-storage-panel .section-headline",
  "Settings storage title row should stay readable on desktop"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS Settings form-layout repair",
  "Settings should have a form-layout repair layer for long paths and backup actions"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="settings"] .settings-storage-panel > .section-headline',
  "Settings storage headline should override compact module headers"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="settings"] .settings-storage-panel .section-headline.compact',
  "Settings backup subsection headlines should stack safely"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="bundles"] .bundle-flow-strip',
  "Bundle Center should keep its workflow strip compact in single-module mode"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="bundles"] .bundle-safety-note p',
  "Bundle Center safety copy should stay compact in single-module mode"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="proposals"] .section-headline.proposal-headline',
  "Optimization Proposals should keep a readable header layout in single-module mode"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="apply-center"] .apply-center-workspace',
  "Apply Center should keep scope selection narrow and the staged workbench primary"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "formatApplyScope(scope.value, languageMode)",
  "Apply Center scope cards should show localized scope labels"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "formatDiffPreviewStatus(\n                          remoteApplyCandidateDetail?.diffPreview.status",
  "Apply Center remote handoff should show localized diff preview status"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".apply-scope-selector .apply-scope-progress",
  "Apply Center scope cards must not repeat Preview/Confirm/Applied as a feature list"
);
assertIncludes(
  "../specs/skill-management-workbench/implementation-status.md",
  status,
  "Frontend Layout QA Workflow",
  "Implementation status must document the layout QA workflow"
);
assertIncludes(
  "../specs/skill-management-workbench/implementation-status.md",
  status,
  "npm run layout:check",
  "Implementation status must include the layout check command"
);

console.log("Layout checks passed: first-screen topbar, focused Overview next step, and workflow documentation guardrails are in place.");
