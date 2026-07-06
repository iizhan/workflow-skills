# Skill Management Workbench Product UI Image Prompt

Use this prompt to generate a high-fidelity product UI mockup for the local-first Skill Management Workbench.

## Primary Prompt

```text
Use case: ui-mockup
Asset type: high-fidelity desktop SaaS/product interface concept, 16:10 landscape
Primary request: Design a polished local-first Skill Management Workbench product interface that scans local skills, records runtime metrics, analyzes token/cost/performance, generates optimization proposals, visualizes a skill relationship graph, and packages skills into reusable local engineering assets. The product must feel like a serious local control console, not a generic admin dashboard.

Scene/backdrop: A bright, calm "local control room" software product screen. The UI is shown as a crisp desktop application window on a subtle warm off-white background with soft depth, glass panels, thin dividers, and disciplined spacing.

Core layout:
- Left sidebar module navigation with bilingual labels: Overview / 总览, Local Control / 本地控制, Telemetry / 遥测, Graph / 图谱, Optimize / 优化, Bundles / 打包, Registry / 注册表.
- Top command/status bar showing local authorization status, "Data stays local / 数据本地保存", current runtime policy, telemetry mode, and a global language switcher: EN, 中文, Both.
- Main workspace uses a product dashboard layout with strong information hierarchy, not a dense table-only admin screen.
- The graph area is the visual hero: a large topology canvas with lanes for root, skill, version, model, proposal, bundle, and bundle lineage; visible nodes and edges; a search field; navigation history; current graph scope stack; and a right-side focus analysis panel.
- Optimization proposals appear as a decision/todo flow with evidence, estimated benefit, status, and action buttons: Accept / 接受, Ignore / 忽略, Mark Resolved / 标记解决, Reopen / 重开.
- Bundle section emphasizes safety: "Will not affect original skill / 不影响原产物", import preview, validation results, fingerprint diff, file diff, directory diff, and strategy chips such as preserve, supersede, fork.
- Registry and Recent Runs areas appear as compact, readable tables with status pills, start time, latency, duration, tokens, model, source, indexed skill paths, approved roots, and excluded paths.

Visible product modules to represent in one screen:
1. Overview summary cards: authorized status, indexed skills, today's runs, pending proposals.
2. Local Control card: storage root, SQLite database path, raw-content permission, background listener permission, excluded path count.
3. Telemetry snapshot: today's runs, tokens, cost, average duration, success/failure, prompt/completion tokens, tool calls.
4. Seven-day window: weekly runs, cost, slowest skill, most used skill, highest waste skill.
5. Skill Graph: node count, edge count, generated time, graph status, node types, edge types, topology lanes, search and focus panel.
6. Backup & Restore Preview: create backup, recent snapshot, validate backup.manifest.json, preview restore impact.
7. Bundle Export/Import: export selected skill, bundle inventory, validate bundle.manifest.json, choose import strategy.
8. Local Audit Trail: authorization changes, backups, bundle creation/import events with links to graph nodes.

Visual direction:
- Bright local-first console, premium desktop productivity tool, information-forward, calm but confident.
- Color palette: warm ivory background, deep ink text, slate blue-gray surfaces, restrained teal for local/healthy states, amber for pending decisions, tomato red only for real risk, subtle graphite graph lines.
- Typography: expressive but highly legible product typography, avoid default admin-template look. Use refined modern type, strong section titles, compact data labels.
- Surfaces: layered cards, soft shadows, crisp 1px borders, glassy but not glossy, clear grouping.
- Graph style: elegant node-link topology, lane headers, small status chips, subtle curved edges, selected node glow, focus side panel with evidence chips.
- Motion should be implied through staggered cards and live telemetry pulses, but render as a static screenshot.

Text requirements:
- Use bilingual UI as a global product capability, not only the first screen.
- Important labels should show English and Chinese together, e.g. "Local Control / 本地控制", "Skill Graph / Skill 图谱", "Optimization Proposals / 优化建议", "Bundle Validation / Bundle 校验".
- Avoid long paragraphs. Use concise product labels and readable mock data.
- Text must be crisp, aligned, and plausible. If exact text becomes difficult, prioritize layout fidelity and clear bilingual label zones over tiny text accuracy.

Suggested mock data:
- Authorized / 已授权
- Indexed Skills / 已索引 Skill: 42
- Today's Runs / 今日运行: 318
- Pending Proposals / 待处理建议: 9
- Local DB: ~/Library/Application Support/SkillWorkbench/app.sqlite
- Telemetry Mode: Metadata only / 仅元数据
- Raw Content: Disabled / 原始内容关闭
- Background Listener: Requires consent / 需要授权
- Nodes: 184, Edges: 392
- Import Safety: Safe with preview / 安全，可预览

Composition/framing:
- 16:10 desktop screenshot, approximately 1440x900 or 1920x1200.
- Full product window visible with left navigation, top status bar, and multi-panel main canvas.
- Use the graph as the largest visual anchor in the center/right.
- Keep enough whitespace for a premium product feel; do not overcrowd every module.

Constraints:
- No remote database, no cloud sync, no "team cloud" implication.
- Make local-first trust visible: local storage path, SQLite database path, permission state, audit trail, and no remote connection.
- Show that bundle import/export is non-destructive and preview-first.
- Show that authorization is required before scanning/listening.
- Show bilingual switching as a first-class global product control.

Avoid:
- Generic dark admin dashboard.
- Purple-on-white SaaS template.
- Fake 3D mascots or decorative characters.
- Overly futuristic sci-fi HUD.
- Dense unreadable tables everywhere.
- Cloud-first or remote database language.
- Only translating the hero/header while deeper controls remain English-only.
- Watermark, brand logos, browser chrome clutter.
```

## Alternate Focus Prompt: Graph-Centric Screen

```text
Use case: ui-mockup
Asset type: high-fidelity product screen focused on graph analysis
Primary request: Design the Skill Graph workspace for a local-first Skill Management Workbench. The screen should make graph search, topology navigation, scope layering, and node focus analysis feel like the core product experience.

Layout:
- Left product sidebar with bilingual navigation.
- Top local trust bar with authorization, local database path, telemetry mode, and language switch.
- Main area split into three connected zones:
  1. Left column: Local Graph Search / 本地图谱搜索, Graph Navigation / 图谱导航历史, Current Graph Scope / 当前图谱范围.
  2. Center: Topology View / 拓扑视图 with lane-based nodes for root, skill, version, model, proposal, bundle, lineage.
  3. Right column: Graph Focus Analysis / 图谱焦点分析 showing selected node context, related runs, related models, proposals, bundles, root paths, version lineage, and traced paths.
- Bottom drawer: Visible Nodes & Edges / 可见节点与关系 list.

Style:
- Bright, serious, premium local control console.
- Teal selected node, amber proposal nodes, slate graph edges, ivory canvas.
- Crisp bilingual labels throughout the lower panels.
- The UI should look like a real product a power user would trust for local skill governance.
```

## Recommended Generation Settings

- Preferred size: `1920x1200` or `1536x1024`.
- Best first pass: generate the primary prompt as one polished desktop screen.
- Best second pass: generate the graph-centric screen as a deeper product view.
- If the image model struggles with text, ask for fewer labels but keep bilingual zones and layout fidelity.
