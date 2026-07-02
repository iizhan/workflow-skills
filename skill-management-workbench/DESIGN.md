# Skill OS Design System 2.0

## 1. Brand

Skill OS is a local-first Skill operating system for developers.

Brand keywords:

- Local First
- Trust
- Control
- Graph Native
- AI Native
- Developer Tool
- Observability
- Knowledge Network

Visual feeling:

- Calm
- Trustworthy
- Professional
- Future-facing
- Not consumer-grade
- Not entertainment-oriented

The UI must feel like a professional local AI operating system, not a dashboard, CRM, ERP, or generic admin product.

## 2. Product Boundaries

The first screen must make the product boundaries obvious:

- Local Skills: discovered from authorized directories and indexed locally.
- Remote Skills: imported from GitHub or Marketplace and never auto-run before activation.
- Graph: the native knowledge network that connects roots, Skills, versions, agents, bundles, projects, models, and proposals.
- Apply Center: applies Skills to system, workspace, project, or folder scope only after target preview.
- Bundle Center: packages and imports reusable Skill assets with validation and diff preview.

Avoid long explanatory paragraphs on Overview. Prefer compact labels, short claims, and visible boundaries.

## 3. Theme System

Skill OS supports four themes. Theme 01 is the default.

### Theme 01: Midnight Graph

Default theme.

Inspired by Cursor, Linear, and Obsidian.

- Background: `#0A0F1A`
- Secondary background: `#121827`
- Card: `#182235`
- Border: `#263247`
- Primary: `#4C8DFF`
- Success: `#22C55E`
- Warning: `#F59E0B`
- Danger: `#EF4444`

Entity colors:

- Prompt: `#4C8DFF`
- Skill: `#4C8DFF`
- Workflow: `#8B5CF6`
- Agent: `#22C55E`
- Bundle: `#EC4899`
- MCP: `#F97316`
- Marketplace: `#FACC15`
- Project: `#06B6D4`

Effect:

- Professional
- Trustworthy
- Suitable for long work sessions

### Theme 02: Deep Forest

Best for privacy, security, and local-first messaging.

- Background: `#08120D`
- Card: `#102117`
- Primary: `#2DD4BF`
- Secondary: `#84CC16`
- Success: `#22C55E`

Graph colors:

- Skill: `#2DD4BF`
- Agent: `#84CC16`
- Bundle: `#10B981`

Effect:

- Private
- Safe
- Local-first

### Theme 03: Neo Purple

Best for AI product marketing, Graph pages, and Marketplace pages.

- Background: `#0D0A16`
- Primary: `#8B5CF6`
- Secondary: `#A855F7`
- Highlight: `#D946EF`

Effect:

- AI-native
- Premium
- Strong graph visuals

### Theme 04: Cyber Blue

Best for analysis, observability, and telemetry-heavy screens.

- Background: `#060B16`
- Primary: `#00D4FF`
- Secondary: `#38BDF8`
- Emphasis: `#60A5FA`

Effect:

- Future-facing
- Technical
- Observability-focused

## 4. Color Layers

Do not use one blue across the whole product.

Use three layers:

- Layer 1: product theme color.
- Layer 2: entity colors.
- Layer 3: status colors.

### Entity Colors

- Skill: `#4C8DFF`
- Prompt: `#4C8DFF`
- Workflow: `#8B5CF6`
- Agent: `#22C55E`
- Bundle: `#EC4899`
- Project: `#06B6D4`
- GitHub: `#94A3B8`
- Marketplace: `#FACC15`
- MCP: `#F97316`
- Proposal: `#EF4444`

### Status Colors

- Active: `#22C55E`
- Paused: `#F59E0B`
- Error: `#EF4444`
- Draft: `#64748B`
- Archived: `#334155`

## 5. Graph Color Rules

Graph is the product core.

Use this hierarchy:

- Nodes: 80% saturation.
- Edges: 20% saturation.
- Background: 5% saturation.

This keeps user attention on the nodes.

## 6. Neural Glow

Skill OS should have one strong brand asset: Neural Glow.

Core entities receive a subtle AI glow:

```css
box-shadow: 0 0 16px rgba(76, 141, 255, 0.35);
```

Recommended glow mapping:

- Skill: blue glow.
- Agent: green glow.
- Bundle: pink glow.
- Marketplace: gold glow.
- Project: cyan glow.
- Proposal: red glow.

Use Neural Glow sparingly. It should highlight core entities, not every card.

## 7. Typography

- Latin UI: `Inter`
- Chinese UI: `HarmonyOS Sans SC`
- Code, paths, hashes, manifests: `JetBrains Mono`
- Metrics use tabular figures.

Text rules:

- Overview should use fewer words.
- Module boundaries should use short labels.
- Dense explanations belong in detail pages, not first-screen cards.
- Bilingual labels should stay global, but keep each line compact.

## 8. Layout Rules

Default desktop shell:

- Left sidebar: primary IA.
- Top trust bar: local state, database state, telemetry state, graph state, remote activation state.
- Overview: boundary cards and one clear operating flow.
- Graph page: left search/history/scope, center graph, right focus analysis.
- Apply Center: scope cards and target preview.

Recommended Overview order:

1. Product identity and Local First badge.
2. Boundary cards: Local, Remote, Graph, Apply.
3. One operating flow: Discover -> Analyze -> Graph -> Optimize -> Apply -> Bundle.
4. Key metrics only.

Recommended sidebar order:

1. Overview
2. Discovery
3. Skill Library
4. Marketplace
5. Analysis
6. Graph
7. Optimization
8. Apply Center
9. Bundles
10. Registry
11. Audit
12. Settings

Discovery should support one unified search entry point that groups results by Local, Remote, GitHub, and Marketplace instead of forcing users to choose the source first.

## 9. Do And Do Not

Do:

- Lead with boundaries.
- Make local-first trust visible.
- Make remote activation rules obvious.
- Make Graph feel native to the product.
- Use entity colors in graph and entity cards.
- Use Neural Glow only on important nodes/entities.

Do not:

- Put long educational paragraphs in Overview.
- Make the UI feel like CRM, ERP, or traditional admin.
- Use the same blue for every entity.
- Hide the difference between local and remote Skills.
- Let graph become a secondary report.
