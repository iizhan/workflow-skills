import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function assertIncludes(file, content, expected, label) {
  if (!content.includes(expected)) {
    throw new Error(`${label} missing in ${file}: ${expected}`);
  }
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

const app = read("src/renderer/src/App.tsx");
const styles = read("src/renderer/src/styles.css");
const sharedTypes = read("src/shared/types.ts");
const database = read("src/main/database.ts");
const main = read("src/main/index.ts");
const registryService = read("src/main/registry-service.ts");
const localToolTelemetryService = read("src/main/local-tool-telemetry-service.ts");
const traceService = read("src/main/trace-service.ts");
const projectProfileService = read("src/main/project-profile-service.ts");
const modelEvaluationService = read("src/main/model-evaluation-service.ts");
const workflowStarterService = read("src/main/workflow-starter-service.ts");
const preload = read("src/preload/index.ts");
const previewApi = read("src/renderer/src/preview-api.ts");
const packageJson = read("package.json");

const inertButtons = [...app.matchAll(/<button\b[\s\S]*?<\/button>/g)].filter(
  (match) => !match[0].includes("onClick=") && !match[0].includes('type="submit"')
);
assert(
  inertButtons.length === 0,
  `Found buttons without explicit click behavior: ${inertButtons
    .map((match) => `line ${app.slice(0, match.index).split("\n").length}`)
    .join(", ")}`
);

const navBlock = app.match(/const productNavHrefs = \[([\s\S]*?)\] as const;/);
assert(navBlock, "productNavHrefs block missing in App.tsx");

const navHrefs = [...navBlock[1].matchAll(/"#([^"]+)"/g)].map((match) => match[1]);
assert(navHrefs.length >= 12, "Expected the full product navigation href list.");

for (const href of navHrefs) {
  assertIncludes("src/renderer/src/App.tsx", app, `id="${href}"`, `Section #${href}`);
  assertIncludes(
    "src/renderer/src/styles.css",
    styles,
    `data-active-section="${href}"`.replace("#", ""),
    `Single-module display rule for #${href}`
  );
}

const requiredProductSections = [
  "overview",
  "discovery",
  "local-skills",
  "evaluate",
  "remote-market",
  "analysis",
  "session-trace",
  "graph",
  "proposals",
  "apply-center",
  "bundles",
  "registry",
  "audit",
  "settings"
];

assertIncludes(
  "src/main/database.ts",
  database,
  "CREATE TABLE IF NOT EXISTS trace_sessions",
  "Session Trace persistence schema"
);
assertIncludes(
  "src/main/trace-service.ts",
  traceService,
  "ingestTelemetryEvents",
  "Session Trace event ingestion"
);
assertIncludes(
  "src/main/trace-service.ts",
  traceService,
  "backfillLegacyRuns",
  "Session Trace legacy evidence backfill"
);
assertIncludes(
  "src/main/trace-service.ts",
  traceService,
  "trace_sessions.source_ref",
  "Session Trace search includes the source session reference"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "trace.sessionRef",
  "Session Trace UI exposes searchable session IDs"
);
assertIncludes(
  "src/main/local-tool-telemetry-service.ts",
  localToolTelemetryService,
  "const turnRef = this.readExplicitTurnRef(record) ?? turnOverride;",
  "Session Turn boundaries ignore unrelated response message IDs"
);
const explicitTurnRefBlock = localToolTelemetryService.match(
  /private readExplicitTurnRef\(record: JsonRecord\) \{[\s\S]*?\n  \}/
)?.[0] ?? "";
assert(
  explicitTurnRefBlock.length > 0 && !explicitTurnRefBlock.includes("message_id"),
  "Explicit Turn references must not include generic message_id fields."
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "TraceSkillDrawer",
  "Session Trace Skill quick drawer"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".trace-workspace",
  "Session Trace stable split workspace styling"
);

for (const section of requiredProductSections) {
  assertIncludes(
    "src/renderer/src/App.tsx",
    app,
    `data-product-section="${section}"`,
    `Product module grouping for ${section}`
  );
}

assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="product-workspace single-module-mode"',
  "Product workspace uses single-module mode instead of long feature-list scrolling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "data-active-section={currentProductSection}",
  "Product workspace exposes active module for CSS routing"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-dashboard-card entity-skill"',
  "Overview uses a dashboard metric card instead of a next-step-only card"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Overview Metrics",
  "Overview has summary metrics as the primary content"
);
assert(
  !app.includes("hero-entry-grid") && !styles.includes("hero-entry-grid"),
  "Overview must not regress into a multi-card feature directory."
);
assert(
  !app.includes("guided-flow-rail") && !styles.includes("guided-flow-rail"),
  "Overview must not show the full operating chain on the first screen."
);
assert(
  !app.includes("hero-pipeline") && !styles.includes("hero-pipeline"),
  "Overview must not show the old dense pipeline on the first screen."
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'navigateToProductSection("#graph")',
  "Cross-module graph inspection routes to Graph Studio in single-module mode"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS product-flow single module layer",
  "Product-flow single module CSS layer"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".product-workspace.single-module-mode > [data-product-section] {\n  display: none !important;",
  "Single-module mode hides inactive modules"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-dashboard-card",
  "Overview dashboard card styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-sparkline",
  "Overview trend sparkline styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "User Session Insights",
  "Settings exposes User Session Insights"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Compact module headers",
  "User Session Insights captures the compact title/description preference"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Visual QA after UI changes",
  "User Session Insights captures screenshot QA preference"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".user-session-insights-card",
  "User Session Insights card styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "settings-session-card",
  "User Session Insights appears in the visible Settings entry area"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".settings-session-card",
  "Settings entry User Session Insights styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".user-session-insights-grid",
  "User Session Insights grid styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "InteractionFeedback",
  "Global visible interaction feedback component"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "showInteractionNotice",
  "Shared visible interaction feedback helper"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Topbar Settings action navigates without stale feedback",
  "Full-flow self-test covers topbar navigation and stale feedback cleanup"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Settings backup restore preview flow",
  "Full-flow self-test covers backup validation and restore preview"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Graph pin neighborhood feedback visible",
  "Full-flow self-test covers Graph scope interactions"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".interaction-action-feedback",
  "Visible interaction feedback styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="section-headline proposal-headline"',
  "Optimization Proposals uses an anti-squeeze headline layout"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'tx("Workspace", "工作台")',
  "Product navigation exposes the workspace module group"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'tx("Assets", "资产")',
  "Product navigation exposes the asset module group"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'tx("Reports", "报告")',
  "Product navigation exposes the report module group"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'tx("Governance", "治理")',
  "Product navigation exposes the governance module group"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="proposal-lifecycle-strip"',
  "Optimization Center shows the review-plan-apply-close lifecycle"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="proposal-work-queue"',
  "Optimization Center exposes accepted work as an implementation queue"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "function formatProposalStatus(status: OptimizationProposalStatus, mode: LanguageMode)",
  "Optimization Proposals status labels must be language-aware"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "formatProposalType(proposal.proposalType, mode)",
  "Optimization Proposals should not render raw proposal type codes"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "formatProposalActorType(action.actorType, mode)",
  "Optimization Proposal action actors should be localized"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "function formatApplyScope(scope: SkillApplyScope, mode: LanguageMode)",
  "Apply Center scope labels must be language-aware"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "formatRemoteVerificationStatus(remoteApplyCandidate.verificationStatus, languageMode)",
  "Apply Center remote verification status should not render raw codes"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS module headline anti-squeeze repair",
  "Module headline anti-squeeze repair layer"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".section-headline.proposal-headline .toolbar",
  "Optimization Proposals toolbar anti-overflow layout"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-main"',
  "Overview has a command-center main content wrapper"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-report-card"',
  "Overview compact report card"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-kpi-grid"',
  "Overview exposes KPI trend cards"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-health-list"',
  "Overview exposes health summary indicators"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-workflow-strip"',
  "Overview exposes the guided Skill OS workflow"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-workflow-intro"',
  "Overview workflow uses a short guided intro instead of a long arrow sentence"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Operating Path",
  "Overview workflow labels the product path without repeating dual-core explanation"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "overview-signal-summary",
  "Overview summarizes today's signal instead of adding another handoff explanation block"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "overview-today-report",
  "Overview includes a compact report strip for cost, latency, success, and top Skill"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-today-report",
  "Overview report strip styling"
);
assert(
  !app.includes("overview-workflow-handoff"),
  "Overview should not reintroduce a second handoff explanation row under the workflow."
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-boundary-card entity-project"',
  "Overview exposes Runtime as a first-screen product entry"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-focus-dock"',
  "Overview fills the first screen with a compact Today Focus dock"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Review only what changed",
  "Overview right rail should guide users toward changed signals"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="overview-report-metrics overview-compact-metrics"',
  "Overview compact report metrics"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "{recommendedFlowCta}",
  "Overview primary action follows the current guided workflow recommendation"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'tx("Improve a Skill", "打磨 Skill")',
  "Overview secondary action helps users continue after the core workflow is ready"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  '{ href: "#evaluate", icon: "◎"',
  "Evaluation reports navigation is visible in the report module"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  '{ href: "#analysis", icon: "▤", label: tx("Monitoring", "运行监控")',
  "Monitoring navigation keeps the telemetry chain visible"
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
  "Runtime layout repair",
  "Runtime telemetry intake should stay dark and aligned"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '#telemetry .local-tool-intake .section-headline.compact .toolbar.wrap',
  "Runtime local tool toolbar should stay horizontal and not inherit the global headline grid"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS Overview command-center layout repair",
  "Overview command-center layout repair layer"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="overview"] .hero-side',
  "Overview bottom command rail styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-report-card",
  "Overview report card styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-workflow-strip",
  "Overview workflow styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".evaluate-score-grid",
  "Evaluate scorecard styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-boundary-card",
  "Overview boundary card styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-focus-dock",
  "Overview Today Focus dock styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-donut",
  "Overview success chart styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graph-snapshot-summary",
  "Graph snapshot summary is a secondary detail after the topology workspace"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Local SQLite snapshot",
  "Graph snapshot source copy"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graph-focus-primer",
  "Graph empty focus primer explains how to use topology"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graph-operator-band",
  "Graph Studio exposes a compact first-screen Search/Select/Trace operator flow"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "type GraphPresentationMode = \"flow\" | \"mindmap\"",
  "Graph and workflow visualizations share explicit flowchart and mind map modes"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "function buildGraphMindMapScene",
  "Graph mind map is derived from the same visible graph snapshot"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "function GraphMindMapView",
  "Graph mind map has an interactive presentation component"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graph-presentation-switcher",
  "Graph canvas exposes a presentation switcher"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "skills-workflow-presentation-switcher",
  "Beginner workflow guide exposes the same presentation switcher"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "skills-workflow-mindmap",
  "Beginner workflow guide renders a conceptual mind map"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".graph-mindmap-scroll",
  "Graph mind map has a bounded scrolling canvas"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skills-workflow-mindmap",
  "Workflow mind map has dedicated layout styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graphNeighborhoodCacheRef",
  "Graph Studio should cache loaded neighborhoods between panel jumps"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "getGraphNeighborhoodCacheKey(selectedGraphNodeId, graphSnapshot.generatedAt)",
  "Graph Studio neighborhood cache should be scoped to node and graph snapshot"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graphNeighborhoodCacheRef.current.clear();",
  "Graph Studio neighborhood cache should invalidate when the graph snapshot changes"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="graph-focus-primer-card graph-focus-empty"',
  "Graph focus empty state uses a visible primer card"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".graph-focus-primer-steps",
  "Graph empty focus primer styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".graph-operator-band",
  "Graph Studio compact operator flow styling"
);
assert(
  !app.includes('className="graph-studio-start"'),
  "Graph Studio should not duplicate Search/Select/Trace as a separate instruction band."
);
assert(
  app.indexOf("skill-graph-workspace") < app.indexOf("graph-snapshot-summary"),
  "Graph topology workspace must appear before graph snapshot detail cards."
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  '.product-workspace.single-module-mode[data-active-section="graph"] .skill-graph-workspace',
  "Graph topology-first desktop layout"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".product-workspace.single-module-mode .section-headline > div",
  "Compact single-line module headline layout"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".apply-impact-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));",
  "Apply impact cards stay readable in a 2x2 desktop grid"
);

assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "const [activeSectionHref, setActiveSectionHref]",
  "Explicit sidebar active state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "aria-current={activeSectionHref === item.href ? \"page\" : undefined}",
  "Accessible active navigation state"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".product-nav a.active",
  "Active navigation styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "productWorkspaceRef",
  "Desktop workspace scroll container ref"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "workspace?.addEventListener(\"scroll\", syncScrollPosition",
  "Active navigation listens to workspace scroll"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "pendingNavigationHrefRef",
  "Navigation keeps active state stable during workspace smooth scroll"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "function scrollProductWorkspaceToSection",
  "Product navigation has a shared workspace-scroll helper"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "workspace.scrollTo({",
  "Product navigation scrolls the desktop workspace container directly"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "window.history.pushState(null, \"\", href)",
  "Product navigation updates hash without relying on browser anchor scrolling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "window.addEventListener(\"popstate\", syncHash)",
  "Product navigation syncs browser back and forward with workspace scrolling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "onPointerDown={(event) =>",
  "Sidebar navigation captures pointer activation before Electron anchor quirks"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "onMouseDown={(event) =>",
  "Sidebar navigation has a mouse activation fallback for desktop Electron"
);
assert(
  !app.includes("window.addEventListener(\"scroll\", syncScrollPosition"),
  "Active navigation must not listen to window scroll in the desktop shell."
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".product-workspace {\n  height: calc(100vh - 1.4rem);",
  "Desktop workspace owns vertical scrolling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".graph-topology-scroll {\n  max-width: 100%;",
  "Graph topology is constrained to its canvas"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".table-shell table {\n  min-width: 900px;",
  "Wide tables scroll inside their shell"
);
assert(
  !styles.includes("@media (max-width: 1280px)"),
  "Desktop UI must not collapse at 1280px; that breakpoint breaks the 1440px app shell."
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS desktop QA stabilization layer",
  "Final desktop QA stabilization layer"
);
assert(
  styles.lastIndexOf("Skill OS desktop QA stabilization layer") > styles.lastIndexOf("Skill OS 2.0 consolidation layer"),
  "Desktop QA stabilization layer must stay after the Skill OS 2.0 consolidation layer."
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "@media (min-width: 981px) {\n  html,\n  body,\n  #root",
  "Desktop-only layout guard"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".product-shell {\n    display: grid;\n    grid-template-columns: clamp(248px, 20vw, 296px) minmax(0, 1fr);",
  "Desktop product shell fixed two-column layout"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".panel {\n    overflow: visible;",
  "Desktop panels must not crop module content"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".os-module-panel {\n    display: grid;\n    grid-auto-rows: max-content;",
  "Product modules keep full content height"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS screenshot-driven layout repair layer",
  "Screenshot-driven layout repair layer"
);
assert(
  styles.lastIndexOf("Skill OS screenshot-driven layout repair layer") >
    styles.lastIndexOf("Skill OS desktop QA stabilization layer"),
  "Screenshot-driven layout repair layer must stay after the desktop QA stabilization layer."
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "grid-template-columns: repeat(auto-fit, minmax(126px, 1fr));",
  "Top trust bar status tiles use adaptive columns"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "grid-template-areas:\n      \"controls canvas\"\n      \"focus focus\";",
  "Graph workspace uses a safe two-row desktop layout before ultra-wide"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".leaderboard-metric strong {\n    max-width: 100%;\n    white-space: nowrap;",
  "Leaderboard metrics must not collapse into vertical bilingual text"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".graph-scope-item {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);",
  "Graph scope stack avoids side-pill overlap in constrained columns"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'fill="rgba(10, 15, 26, 0.74)"',
  "Graph topology lanes use dark Midnight Graph surfaces"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'accent: "#4C8DFF"',
  "Graph topology nodes use Skill OS entity colors"
);

for (const preset of [
  "balanced",
  "reliability_first",
  "cost_guard",
  "latency_guard",
  "freshness_guard"
]) {
  assertIncludes("src/renderer/src/App.tsx", app, preset, `Health policy preset ${preset}`);
  assertIncludes("src/main/health-score-policy-service.ts", read("src/main/health-score-policy-service.ts"), preset, `Main policy preset ${preset}`);
}

assertIncludes(
  "src/main/database.ts",
  database,
  "CREATE TABLE IF NOT EXISTS health_score_policy",
  "Health policy SQLite table"
);
assertIncludes(
  "src/shared/types.ts",
  sharedTypes,
  "export interface SkillHealthScorePolicy",
  "Shared health policy type"
);
assertIncludes(
  "src/main/index.ts",
  main,
  "workbench:update-health-score-policy",
  "Health policy IPC handler"
);
assertIncludes(
  "src/preload/index.ts",
  preload,
  "updateHealthScorePolicy",
  "Health policy preload bridge"
);
assertIncludes(
  "src/renderer/src/preview-api.ts",
  previewApi,
  "activePreviewHealthScorePolicy",
  "Health policy preview API state"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".health-policy-card",
  "Health policy card styling"
);
assertIncludes(
  "src/main/index.ts",
  main,
  "workbench:preview-skill-apply",
  "Apply Preview IPC handler"
);
assertIncludes(
  "src/preload/index.ts",
  preload,
  "previewSkillApply",
  "Apply Preview preload bridge"
);
assertIncludes(
  "src/renderer/src/preview-api.ts",
  previewApi,
  "makeApplyPreview",
  "Apply Preview browser preview API"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "activeApplyPreview",
  "Apply Center service-backed preview state"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".apply-preview-flow",
  "Apply Preview flow styling"
);
assertIncludes(
  "src/main/index.ts",
  main,
  "workbench:list-marketplace-catalog",
  "Marketplace catalog IPC handler"
);
assertIncludes(
  "src/preload/index.ts",
  preload,
  "listMarketplaceCatalog",
  "Marketplace catalog preload bridge"
);
assertIncludes(
  "src/renderer/src/preview-api.ts",
  previewApi,
  "makeMarketplaceCatalog",
  "Marketplace catalog browser preview API"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "visibleMarketplaceSkills",
  "Marketplace service-backed card list"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "selectedMarketplaceSkillId",
  "Marketplace selected candidate state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplace-candidate-preview",
  "Marketplace candidate preview panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplaceActionNotice",
  "Marketplace action feedback state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "handleMarketplaceAction",
  "Marketplace action feedback handler"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "setSelectedMarketplaceAction",
  "Marketplace action buttons update preview state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplace-action-feedback",
  "Marketplace action feedback panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Remote Skills never auto-run from this surface.",
  "Marketplace action safety boundary copy"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplace-search-console",
  "Marketplace page search console"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplace-progressive-flow",
  "Marketplace progressive activation flow"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplace-stage-tabs",
  "Marketplace staged activation tabs"
);
assertIncludes(
  "src/main/index.ts",
  main,
  "workbench:import-marketplace-skill",
  "Marketplace import IPC handler"
);
assertIncludes(
  "src/main/index.ts",
  main,
  "workbench:preview-remote-skill-activation",
  "Remote activation preview IPC handler"
);
assertIncludes(
  "src/main/index.ts",
  main,
  "workbench:list-remote-skill-candidates",
  "Remote candidate inventory IPC handler"
);
assertIncludes(
  "src/main/index.ts",
  main,
  "workbench:get-remote-skill-candidate-detail",
  "Remote candidate detail IPC handler"
);
assertIncludes(
  "src/preload/index.ts",
  preload,
  "importMarketplaceSkill",
  "Marketplace import preload bridge"
);
assertIncludes(
  "src/preload/index.ts",
  preload,
  "previewRemoteSkillActivation",
  "Remote activation preview preload bridge"
);
assertIncludes(
  "src/preload/index.ts",
  preload,
  "listRemoteSkillCandidates",
  "Remote candidate inventory preload bridge"
);
assertIncludes(
  "src/preload/index.ts",
  preload,
  "getRemoteSkillCandidateDetail",
  "Remote candidate detail preload bridge"
);
assertIncludes(
  "src/renderer/src/preview-api.ts",
  previewApi,
  "makePreviewMarketplaceImport",
  "Marketplace import browser-preview API"
);
assertIncludes(
  "src/renderer/src/preview-api.ts",
  previewApi,
  "makePreviewRemoteActivation",
  "Remote activation browser-preview API"
);
assertIncludes(
  "src/renderer/src/preview-api.ts",
  previewApi,
  "previewRemoteCandidates",
  "Remote candidate inventory browser-preview state"
);
assertIncludes(
  "src/renderer/src/preview-api.ts",
  previewApi,
  "makePreviewRemoteCandidateDetail",
  "Remote candidate detail browser-preview API"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplace-import-result",
  "Marketplace import result panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplace-activation-preview",
  "Marketplace activation preview panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "remote-candidate-inventory",
  "Remote candidate inventory panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "remote-candidate-review",
  "Remote candidate review detail panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "remote-candidate-detail-panel",
  "Remote candidate local detail panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "openRemoteCandidate",
  "Remote candidate inventory opens activation preview"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "openRemoteCandidateApplyHandoff",
  "Remote candidate Apply Center handoff feedback"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "remote-apply-handoff-card",
  "Remote candidate Apply Center handoff card"
);
assertIncludes(
  "src/main/apply-preview-service.ts",
  read("src/main/apply-preview-service.ts"),
  "previewRemoteCandidateApply",
  "Remote candidate read-only Apply Preview service"
);
assertIncludes(
  "src/shared/types.ts",
  sharedTypes,
  "sourceKind: \"local_skill\" | \"remote_candidate\"",
  "Apply Preview distinguishes local Skill and remote candidate sources"
);
assertIncludes(
  "src/shared/types.ts",
  sharedTypes,
  "remoteCandidateId: string | null",
  "Apply Preview carries remote candidate id"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "remoteCandidateId: remoteApplyCandidate.candidateId",
  "Apply Center requests remote candidate apply preview"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Installed does not mean active",
  "Marketplace preview-first activation copy"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".marketplace-progressive-flow",
  "Marketplace progressive layout styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".marketplace-stage-panel",
  "Marketplace staged panel styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".marketplace-import-result",
  "Marketplace import result styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".marketplace-activation-preview",
  "Marketplace activation preview styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".remote-candidate-inventory",
  "Remote candidate inventory styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".remote-candidate-review",
  "Remote candidate review styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".remote-candidate-detail-panel",
  "Remote candidate detail styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".remote-apply-handoff-card",
  "Remote candidate Apply Center handoff styling"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Marketplace progressive activation workflow",
  "Marketplace progressive UI self-test"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Marketplace import result visible",
  "Marketplace self-test verifies import result visibility"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Marketplace activation preview visible",
  "Marketplace self-test verifies activation preview visibility"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Remote candidate inventory visible",
  "Marketplace self-test verifies remote candidate inventory visibility"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Remote candidate review visible",
  "Marketplace self-test verifies remote candidate review visibility"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Remote candidate local detail visible",
  "Marketplace self-test verifies remote candidate local detail visibility"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Remote candidate Apply Center handoff visible",
  "Marketplace self-test verifies remote candidate Apply Center handoff"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "skill-health-band-head",
  "Health Score anti-overflow layout"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-health-status",
  "Health Score status wrapping guard"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".os-skill-metrics > div:last-child",
  "Skill Library metrics anti-collision layout"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "tx(\"Success\", \"成功率\")",
  "Skill Library compact success metric label"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".marketplace-candidate-preview",
  "Marketplace preview styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".marketplace-action-feedback",
  "Marketplace action feedback styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "proposalDecisionNotice",
  "Optimization proposal decision feedback state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "setProposalDecisionNotice",
  "Optimization proposal decision feedback setter"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "proposal-decision-feedback",
  "Optimization proposal decision feedback panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Decision recorded only; Skill OS has not rewritten the Skill or applied changes.",
  "Optimization proposal accept safety boundary copy"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Optimization decisions are local audit events, not silent rewrites.",
  "Optimization proposal local audit boundary copy"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".proposal-decision-feedback",
  "Optimization proposal decision feedback styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "bundleActionNotice",
  "Bundle action feedback state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "setBundleActionNotice",
  "Bundle action feedback setter"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "bundle-action-feedback",
  "Bundle action feedback panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Original Skill folder was not changed; files were copied into app-local bundle storage.",
  "Bundle export source-safety copy"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Read-only validation passed; nothing has been copied or activated yet.",
  "Bundle validation read-only boundary copy"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Bundle operations stay local and never connect to a remote database.",
  "Bundle local-first boundary copy"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".bundle-action-feedback",
  "Bundle action feedback styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".os-market-card.selected",
  "Marketplace selected card styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "skillActionNotice",
  "Skill Library action feedback state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Development Lane",
  "Skill Library exposes a dedicated development workflow lane"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Superpowers-first development flow",
  "Development lane highlights the Superpowers-first workflow"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Harness Compatibility",
  "Selected Skill workbench exposes harness compatibility guidance"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "plan, implement, test, review, then finish",
  "Development-first summary copy explains the preferred Superpowers flow"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-development-lane",
  "Development lane styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-development-steps",
  "Development workflow step styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-harness-grid",
  "Harness compatibility matrix styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-harness-card.tone-preferred",
  "Preferred harness card styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "announceGenericInteraction",
  "Generic visible click feedback fallback"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "selectLibraryStage",
  "Skill Library stage click feedback handler"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "remote-preflight-workbench",
  "Remote repository analysis should render in a stable preflight workbench"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "previewSkillRun",
  "Skill Library run action feedback"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "sendSkillToApply",
  "Skill Library apply navigation action"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "navigateToProductSection(\"#apply-center\")",
  "Open Apply Center navigation"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "navigateToProductSection(\"#settings\")",
  "Topbar Settings navigation"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "startApplyFlowPreview",
  "Apply Center main CTA feedback"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "applyWorkbenchStage",
  "Apply Center staged workbench state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "apply-workbench-tabs",
  "Apply Center staged workflow tabs"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "apply-workbench-stage",
  "Apply Center staged workflow panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Pick the narrowest safe scope",
  "Apply Center progressive scope guidance"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Review Guardrails",
  "Apply Center preview-to-guardrails action"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Continue to Confirm",
  "Apply Center guardrails-to-confirm action"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "applyScopeNotice",
  "Apply Center scope feedback state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "chooseApplyScope",
  "Apply Center scope feedback handler"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Changing scope only refreshes a local preview; it does not apply or write anything.",
  "Apply Center scope no-write boundary copy"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "No write before explicit confirmation.",
  "Apply Center explicit confirmation copy"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".apply-flow-feedback",
  "Apply Center feedback styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".apply-scope-feedback",
  "Apply Center scope feedback styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".apply-workbench-tabs",
  "Apply Center staged tab styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".apply-workbench-stage",
  "Apply Center staged panel styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "apply-scope-selector",
  "Apply Center compact scope selector markup"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Apply Center operator layout refinement",
  "Apply Center operator layout refinement styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".apply-scope-selector .os-apply-card",
  "Apply Center compact scope selector styling"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Apply Center scope and preview flow",
  "Apply Center progressive UI self-test"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graphActionNotice",
  "Graph Studio action feedback state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "showGraphActionNotice",
  "Graph Studio action feedback helper"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "handleGraphSearchQueryChange",
  "Graph Studio search feedback handler"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "handleGraphSearchScopeChange",
  "Graph Studio search-scope feedback handler"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "handleGraphTraceTargetChange",
  "Graph Studio trace feedback handler"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "graph-action-feedback",
  "Graph Studio action feedback panel"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Graph controls only change the local visible scope; they do not rescan roots or mutate stored data.",
  "Graph Studio local visible-scope boundary copy"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Every temporary layer is reversible from the scope stack.",
  "Graph Studio reversible-layer copy"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".graph-action-feedback",
  "Graph Studio action feedback styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-action-feedback",
  "Skill action feedback styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-library-flow",
  "Skill Library progressive flow styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "project-table-icon-action",
  "Project Management table should use compact icon actions"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "marketplace-entry-strip",
  "Remote Market should expose staged entry cards instead of one dense first block"
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
  "Remote Market entry flow styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "topLibrarySkillRows",
  "Skill Library priority rows"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "skill-development-lane entity-development compact",
  "Skill Library should keep development guidance as a compact secondary lane"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "skill-simple-row",
  "Skill Library simple list rows"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "skill-framework-note",
  "Skill Library composite framework summary note"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Composite Framework",
  "Skill Library surfaces composite framework structure labels"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Workflow Skills",
  "Skill Library surfaces framework labels for composite skills"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "orchestrationSummary",
  "Skill Library derives orchestration summaries for composite skills"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Selected Skill Workbench",
  "Skill Library selected-detail workbench"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "selectedLibraryStage",
  "Skill Library stage state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "skill-detail-stage-tabs",
  "Skill Library staged workbench tabs"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Start with analysis only when you need deeper evidence",
  "Skill Library progressive summary copy"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'selectedLibraryStage === "analysis"',
  "Skill Library analysis-only deep layer"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-detail-stage-panel",
  "Skill Library staged detail styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-governance-pill.tone-framework",
  "Skill Library has a dedicated framework pill style"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skill-simple-framework",
  "Skill Library simple list shows compact orchestration copy"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  'data-active-section="local-skills"] .skill-library-flow',
  "Skill Library desktop progressive two-column layout"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  'data-active-section="local-skills"] .skill-library-workspace',
  "Skill Library workspace flattening for progressive layout"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Skill Library tabbed asset workflow",
  "Skill Library tabbed asset UI self-test"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "overview-focus-summary",
  "Overview only shows compact summary state after the next step"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".overview-next-actions",
  "Overview next-step actions styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'className="project-library-table"',
  "Project Library uses table markup"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'tx("Bound Projects", "已绑定项目")',
  "Project Library uses bound-project copy"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "本版本不扫描整台电脑",
  "Project Management page states the no full-computer scan boundary"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".project-library-table-shell {\n  max-width: 100%;\n  overflow-x: hidden;",
  "Project Library table should not require horizontal scrolling"
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
  ".project-status-pill",
  "Project Library status pill styling"
);
assertIncludes(
  "package.json",
  packageJson,
  "\"layout:check\": \"node scripts/layout-check.mjs\"",
  "Layout QA check script"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "Remote candidate preview exposes its source repository",
  "UI self-test should cover remote candidate source repository preview"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "expectReadablePanel",
  "UI self-test readable-panel guard"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "expectNoVerticalFragmentation",
  "UI self-test vertical text fragmentation guard"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "expectNoHorizontalOverflow",
  "UI self-test module overflow guard"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "module-${section}",
  "UI self-test per-module screenshot capture"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "scrollActiveModule",
  "UI self-test active-module scroll coverage"
);
assertIncludes(
  "scripts/self-test-ui.mjs",
  read("scripts/self-test-ui.mjs"),
  "module-${section}-bottom",
  "UI self-test per-module bottom screenshot capture"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS visual QA workflow guardrail layer",
  "Visual QA workflow guardrail layer"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  "Skill OS reported-issue repair layer",
  "Reported UI issue repair guardrail layer"
);
assertIncludes(
  "src/renderer/src/preview-api.ts",
  previewApi,
  "https://github.com/${owner}/${repo}",
  "Preview API should normalize GitHub repository URLs for remote analysis"
);
assertIncludes(
  "src/main/registry-service.ts",
  registryService,
  "Project scope: ${basename(resolvedProjectRoot)}",
  "Targeted project scan creates a project-scoped authorization policy when first-run authorization is empty"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Skill OS v1 scans only the selected project directory.",
  "Legacy scan entrypoints should route to selected-project scanning"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Scanning the selected project folder...",
  "Project scan should show immediate in-card progress feedback"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "scan-result-modal",
  "Scan completion should show a result dialog"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "scanResult.rootPaths.length > 0",
  "Empty project scans should show the recommended workflow starter from the scan result"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "workflowStarterProjectRoot",
  "Workflow starter card should use the normalized scanned project root"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Recommended skills-workflow",
  "Empty project scans should visibly recommend the bundled skills-workflow"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Use recommended skills-workflow",
  "Empty project modal should provide a clear selected recommendation action"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "focusWorkflowStarterCard",
  "Recommended workflow action should scroll to the preview card"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Previewing the recommended workflow. No files are being written yet.",
  "Recommended workflow action should show immediate preview feedback"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".workflow-starter-card.is-highlighted",
  "Recommended workflow preview card should be visually highlighted"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".project-scope-status",
  "Project scan progress feedback styling"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".scan-result-modal-backdrop",
  "Scan result dialog overlay styling"
);
assert(
  !registryService.includes('throw new Error("No active authorization policy. Grant authorization first.");\n    }\n\n    const trimmedProjectRoot = projectRoot.trim();'),
  "Targeted project scan must not fail before first-run authorization."
);
assert(
  !app.includes("scanResult.rootPaths.includes(targetProjectRoot)"),
  "Empty project starter visibility must not depend on exact unnormalized path equality."
);
assertIncludes(
  "src/shared/types.ts",
  sharedTypes,
  '"connected_no_skill_runs"',
  "Runtime evidence should distinguish a matched Codex directory from a Skill invocation"
);
assertIncludes(
  "src/main/local-tool-telemetry-service.ts",
  localToolTelemetryService,
  '? "connected_no_skill_runs"',
  "A matched Codex workspace should be reported as connected before a Skill run exists"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  '"connected-awaiting-skill"',
  "Project status should expose the connected-awaiting-Skill state"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  '"inferred-skill"',
  "Project status should distinguish inferred Skill evidence from no trigger"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "refreshProjectRuntimeEvidence(nextProject, { silent: true })",
  "Background monitoring should import runtime evidence instead of only checking the Codex directory"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "ProjectRuntimeLogModal",
  "Project runtime evidence should open in a dedicated project log dialog"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "SkillsWorkflowVisual",
  "Project detail should expose the complete Skills Workflow as a visible interactive process"
);
const workflowVisualInvocation = app.indexOf("<SkillsWorkflowVisual", app.indexOf("function ProjectAssetDetailPanel"));
const projectDetailEnd = app.indexOf("function WorkflowStarterCard", workflowVisualInvocation);
const overviewStart = app.indexOf('data-product-section="overview"');
const overviewEnd = app.indexOf('data-product-section="discovery"', overviewStart);
assert(
  workflowVisualInvocation > 0 && workflowVisualInvocation < projectDetailEnd,
  "Skills Workflow must be rendered inside Project Detail."
);
assert(
  !app.slice(overviewStart, overviewEnd).includes("<SkillsWorkflowVisual"),
  "Overview must not render a single-project Skills Workflow."
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'mode: options.silent ? "incremental" : "full"',
  "Background monitoring should use bounded incremental session reads"
);
assertIncludes(
  "src/main/local-tool-telemetry-service.ts",
  localToolTelemetryService,
  "cleanupProjectRuntimeStagingFiles",
  "Generated runtime import staging files should be cleaned automatically"
);
assertIncludes(
  "src/main/local-tool-telemetry-service.ts",
  localToolTelemetryService,
  "await unlink(outputPath).catch(() => undefined);",
  "Generated runtime import files should be removed after database ingestion"
);
assertIncludes(
  "src/main/index.ts",
  main,
  "app.requestSingleInstanceLock()",
  "Desktop runtime should prevent duplicate monitoring instances"
);
assertIncludes(
  "src/shared/types.ts",
  sharedTypes,
  "export interface ProjectRuntimeSummary",
  "Project management should receive total runtime counts independently from the recent-run window"
);
assertIncludes(
  "src/main/telemetry-service.ts",
  read("src/main/telemetry-service.ts"),
  "listProjectRuntimeSummaries",
  "Telemetry service should provide project-level runtime aggregates"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "projectManagementRefreshIntervalMs = 15_000",
  "Project management should refresh its runtime snapshot on a bounded countdown"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "Refresh in ${runtimeRefreshRemainingSeconds}s",
  "Project management should expose the next runtime refresh countdown"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "const overviewRuntimeSummaryByPath = new Map(",
  "Overview project coverage should use project runtime aggregates instead of the recent-run window"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "overviewRuntimeSummaryByPath.get(normalizeProjectPath(project.path))?.totalRuns",
  "Overview project run counts should match the Project Library runtime totals"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".project-runtime-refresh-status",
  "Project management countdown styling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'tx("From request to verified result", "从一条需求到可验证结果")',
  "Skills Workflow should explain the request-to-verification lifecycle in beginner-facing copy"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".skills-workflow-stage-rail {\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0, 1fr));",
  "Desktop Skills Workflow should show all eight stages in a two-row grid without horizontal scrolling"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'tx("View runtime log", "查看运行日志")',
  "Project list log actions should open runtime evidence instead of only onboarding history"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "project-runtime-skill-link",
  "Project runtime logs should expose clickable Skill detail actions"
);
assertIncludes(
  "src/main/local-tool-telemetry-service.ts",
  localToolTelemetryService,
  'payloadType === "message" && payloadRole === "user"',
  "Codex response-item user messages should create stable per-message telemetry turns"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "checkProjectConnectionHeartbeat(repairedProject)",
  "Project repair should use the fast Codex directory check instead of importing full runtime history"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  'current?.projectPath === scannedProjectRoot && current.status !== "running"',
  "A successful direct scan should clear stale project repair feedback"
);
assertIncludes(
  "src/main/workflow-starter-service.ts",
  workflowStarterService,
  "Existing AGENTS.md will be preserved and extended",
  "Workflow starter should safely handle an existing AGENTS entry file"
);
assertIncludes(
  "src/main/workflow-starter-service.ts",
  workflowStarterService,
  "renderStarterText",
  "Workflow starter should render project placeholders before writing files"
);
assertIncludes(
  "src/main/project-profile-service.ts",
  projectProfileService,
  "project-profile.mjs",
  "Project Profile service should use the project-local freshness probe"
);
assertIncludes(
  "src/main/index.ts",
  main,
  '"workbench:get-project-profile"',
  "Project Profile should be exposed through the main IPC boundary"
);
assertIncludes(
  "src/preload/index.ts",
  preload,
  "getProjectProfile",
  "Project Profile should be available to the renderer"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "project-profile-summary",
  "Project detail should show the local Profile summary"
);
assertIncludes(
  "src/main/database.ts",
  database,
  "CREATE TABLE IF NOT EXISTS model_evaluation_config",
  "AI evaluation configuration must have a local persistence schema"
);
assertIncludes(
  "src/main/model-evaluation-service.ts",
  modelEvaluationService,
  "System secure storage is unavailable, so Skill OS will not store an API key.",
  "AI evaluation must reject plaintext-key fallback"
);
assertIncludes(
  "src/main/model-evaluation-service.ts",
  modelEvaluationService,
  "Model endpoints must use HTTPS, except a local localhost endpoint.",
  "AI evaluation must restrict provider endpoints to HTTPS or local development"
);
assertIncludes(
  "src/main/index.ts",
  main,
  '"workbench:generate-model-evaluation-cases"',
  "AI case generation must stay in the main-process IPC boundary"
);
assertIncludes(
  "src/preload/index.ts",
  preload,
  "generateModelEvaluationCases",
  "Renderer should receive a narrow AI test-case generation API"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "AI-assisted Test Design",
  "Evaluation reports must clearly label AI-assisted test design"
);
assertIncludes(
  "src/renderer/src/App.tsx",
  app,
  "It does not execute the Skill",
  "AI case generation must not claim execution evidence"
);
assertIncludes(
  "src/renderer/src/styles.css",
  styles,
  ".model-evaluation-settings-card",
  "AI evaluation settings need dedicated responsive layout styling"
);

console.log(
  `Smoke checks passed: ${navHrefs.length} navigation sections, desktop shell scroll guard, layout QA workflow hook, no inert buttons, Health Score policy/layout, Skill action feedback, Apply Preview/scope feedback, Graph Studio action feedback, Marketplace catalog/preview plumbing, Optimization decision feedback, project-scoped first-run scan, Project Profile summary plumbing, and Bundle action feedback.`
);
