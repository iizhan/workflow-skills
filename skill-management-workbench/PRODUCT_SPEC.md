# Skill OS v1 Product Specification

## Product Vision

Skill OS is a local-first Skill discovery, analysis, governance, optimization, packaging, and distribution platform.

Current AI products are fragmented:

- Cursor manages prompts and coding context.
- Claude manages projects.
- MCP manages tools.
- GitHub manages repositories.
- LangGraph manages workflows.

Users accumulate hundreds of AI assets and quickly lose visibility into where Skills live, which ones are duplicated, which ones are useful, which ones are expensive, which ones are active, and which ones are outdated.

Skill OS is positioned as:

```text
GitHub Desktop
+ Raycast
+ Obsidian Graph
+ Docker Desktop
+ MCP Registry
for AI Skills
```

It helps users:

- Automatically discover local Skills.
- Import remote Skills.
- Analyze Skill metadata and runtime behavior.
- Manage Skill execution policy and scope.
- Apply Skills to system, workspace, project, or folder targets.
- Optimize Skills with evidence-backed proposals.
- Package Skills into reusable bundles.
- Reuse and distribute Skills safely.

All local Skills, local databases, telemetry, analysis data, bundle inventory, and governance events stay on the user's device. There is no remote database requirement.

## v1 Architecture

```text
+-------------------------+
|      Skill Market       |
+-----------+-------------+
            |
+-----------v-------------+
|     Discovery Layer     |
+-----------+-------------+
            |
+-----------v-------------+
|      Skill Registry     |
+-----------+-------------+
            |
+-----------v-------------+
|       Graph Engine      |
+-----------+-------------+
            |
+-----------v-------------+
|    Analysis Engine      |
+-----------+-------------+
            |
+-----------v-------------+
|   Optimization Engine   |
+-----------+-------------+
            |
+-----------v-------------+
|      Apply Engine       |
+-----------+-------------+
            |
+-----------v-------------+
|      Bundle Engine      |
+-------------------------+
```

## Target Platform

- Desktop application.
- 1440px primary canvas.
- Dark theme.
- Developer tool for macOS and Windows.
- Visual references: JetBrains IDE, Docker Desktop, Raycast Pro, Obsidian Graph, Linear, Datadog.
- Avoid: traditional admin dashboards, CRM style, ERP style.

## Information Architecture

```text
Skill OS
|
+-- 01 Onboarding
+-- 02 Overview
+-- 03 Discovery
+-- 04 Registry
+-- 05 Skill Library
+-- 06 Marketplace
+-- 07 Graph
+-- 08 Analysis
+-- 09 Optimization
+-- 10 Apply Center
+-- 11 Bundles
+-- 12 Audit
+-- 13 Settings
```

## Figma File Structure

```text
Skill OS
|
+-- 00 Foundations
+-- 01 Onboarding
+-- 02 Overview
+-- 03 Discovery
+-- 04 Registry
+-- 05 Skill Library
+-- 06 Marketplace
+-- 07 Graph
+-- 08 Analysis
+-- 09 Optimization
+-- 10 Apply Center
+-- 11 Bundles
+-- 12 Audit
+-- 13 Settings
```

## Killer Features

### 1. Unified Discovery

Skill OS should not force users to think in local-first versus remote-first silos during discovery.

Single search:

```text
Search Skills...
```

Results are grouped by source:

- Local
- Remote
- GitHub
- Marketplace

### 2. Skill Health Score

Every Skill should receive a 0-100 health score:

- 92 Healthy
- 76 Needs Attention
- 43 Deprecated

Inputs:

- Usage
- Success rate
- Latency
- Cost
- Version freshness
- Dependencies

### 3. AI-Powered Skill Analysis

Skill detail should automatically surface:

- Skill summary
- Dependencies
- Execution flow
- Potential risks
- Optimization suggestions
- Alternative Skills
- Related Skills

### 4. Scope Application Engine

Applying a Skill should always answer:

```text
Where?
-> System
-> Workspace
-> Project
-> Folder
```

Target preview must show affected projects, folders, and workspaces before any write occurs.

### 5. Graph Studio

Graph Studio is the centerpiece and the most shareable screen.

```text
+-----------+---------------------+-----------+
| Search    |                     | Analysis  |
| Scope     |     Graph Canvas    | Inspector |
| History   |                     |           |
+-----------+---------------------+-----------+
```

Node types:

- Skill
- Project
- Agent
- Prompt
- Workflow
- Bundle
- Marketplace
- GitHub Repo
- MCP Server

## Marketplace 2.0

Marketplace should avoid generic store patterns.

Collections:

- Featured
- Trending
- Verified
- Enterprise
- Recently Updated
- Most Installed

Every Skill card should expose:

- Health score
- Trust score
- Downloads
- Last updated
- Dependencies
- Risk level

## Future Roadmap

After v1:

- Skill Sync
- Team Workspace
- Private Marketplace
- Skill Versioning
- Skill Diff Viewer
- Agent Composition
- Workflow Builder
- MCP Management
- Skill Runtime Sandbox
- AI Skill Generator

## Core Entity Model

### Skill

- Name
- Version
- Description
- Tags
- Category
- Source
- Author
- Status
- Scope
- Runtime Metrics
- Governance Profile

### Skill Governance Profile

Every indexed Skill should expose a governance profile so users can quickly understand what kind of asset it is, what local information it may retain, and how safely it can be reused.

Fields:

- Role
- Data Classes
- Storage Policy
- Reuse Policy
- Recommended Scope
- Long-lived Context Flag
- Sensitive Operational Data Flag

Roles:

- Memory
- Infrastructure
- Development
- Analysis
- Packaging
- Governance

Data classes:

- Account Identity
- Server Path
- Server Runtime
- Development Context
- Workflow State
- Local Knowledge

Storage policy:

- Session Only
- Local Persisted
- Local Sensitive

Reuse policy:

- Safe To Bundle
- Review Before Bundle
- Local Only

Product meaning:

- Memory Skills may keep account, session, profile, history, or user-preference context locally and should usually stay narrow in scope.
- Infrastructure Skills may retain server paths, runtime details, deploy context, SSH-like operational context, or host information and should be treated as sensitive local assets.
- Development Skills usually hold repository, build, test, review, or implementation context and are often best applied at project scope.
- Analysis and Packaging Skills are often more reusable, but still need clear review before broader bundling when they carry workflow history or local context.

### Source

- Local
- GitHub
- Marketplace
- Bundle Import

### Scope

- System
- Workspace
- Project
- Folder

### Execution Policy

- Auto
- Manual
- Disabled

## Local Skills

Local Skills are discovered from user-authorized directories, indexed into the local SQLite database, and may run automatically only after explicit authorization and compatible execution policy.

Local Skill presentation should follow progressive disclosure:

- first layer: show top Skills, role, health, and one governance signal
- second layer: show a compact list with purpose and basic runtime status
- deep layer: show governance profile, analysis, optimization, scope tuning, and packaging guidance

This keeps the library understandable without forcing users to read every field before selecting a Skill.

Core actions:

- Add folder.
- Remove folder.
- Scan now.
- Analyze metadata.
- Tag.
- Index.
- Run.
- Analyze.
- Bundle.
- Open folder.
- Apply.

## Remote Skills

Remote Skills are imported from GitHub repositories or a Skill Marketplace. They never auto-run by default. Users must explicitly preview, import/install, choose a scope, and activate before execution.

Core actions:

- Import GitHub repository.
- Search marketplace.
- Preview.
- Analyze.
- Import.
- Install.
- Activate.

## User Flows

### Flow 1: First Launch

```text
Launch
-> Authorization
-> Choose Scan Scope
-> Choose Permissions
-> Initialize Index
-> Overview
```

### Flow 2: Discover Local Skill

```text
Select Folder
-> Scan
-> Detect Skill
-> Analyze Metadata
-> Tag
-> Index
-> Registry
```

### Flow 3: Import GitHub Skill

```text
Paste URL
-> Repository Analysis
-> Manifest Detection
-> Risk Check
-> Preview
-> Import
-> Registry
```

### Flow 4: Install From Marketplace

```text
Marketplace
-> Preview
-> Analyze
-> Install
-> Choose Scope
-> Activate
```

### Flow 5: Apply Skill

```text
Skill
-> Apply
-> Choose Scope
   -> System
   -> Workspace
   -> Project
   -> Folder
-> Confirm
-> Applied
```

### Flow 6: Optimize Skill

```text
Telemetry
-> Analysis
-> Proposal
-> Accept
-> Apply Changes
```

## Navigation

- Overview
- Discovery
- Local Skills
- Remote Market
- Analysis
- Graph
- Optimization
- Apply Center
- Bundles
- Registry
- Audit
- Settings

## First Run Experience

Create a multi-step onboarding wizard.

### Step 1: Authorization Scope

Options:

- Scan Entire Device
- Scan Selected Directories
- Directory Picker

### Step 2: Exclude Paths

Default examples:

- `node_modules`
- `dist`
- `.cache`

### Step 3: Permissions

Toggles:

- Allow Raw Content Access
- Allow Background Monitoring
- Allow Telemetry Collection

### Step 4: Initialize Skill Index

Show:

- Indexing progress.
- Skills discovered.
- Files scanned.
- Folders scanned.

## Page Requirements

### Overview

Show:

- Indexed Skills
- Local Skills
- Remote Skills
- Runs Today
- Optimization Proposals
- Bundles
- Storage Usage
- Recent Activity
- Security Status
- Local First Badge

### Discovery

Local Discovery:

- Authorized folders.
- Add folder.
- Remove folder.
- Scan now.
- Excluded paths.

Remote Discovery:

- Import GitHub repository.
- GitHub URL input.
- Marketplace search.
- Trending Skills.
- Recently added Skills.

### Local Skills

Use a table plus cards hybrid.

Each Skill shows:

- Name
- Type
- Version
- Tags
- Owner
- Execution Status
- Usage Count
- Performance Score
- Role
- Governance Signal

Deep detail should also show:

- What the Skill stores locally
- Whether stored data is sensitive
- Recommended apply scope
- Whether the Skill is safe to bundle
- Why a user should review it before reuse

Actions:

- Run
- Analyze
- Bundle
- Open Folder
- Apply

### Remote Market

Use a marketplace card layout.

Each card shows:

- Name
- Description
- Author
- GitHub source
- Tags
- Downloads
- Rating
- Verification status

Actions:

- Preview
- Analyze
- Import
- Install

Remote Skills never auto-run. User activation is required.

### Analysis

Skill Analytics Center metrics:

- Execution Count
- Token Usage
- Cost
- Latency
- Success Rate
- Failure Rate
- Model Usage
- Tool Usage
- Top Skills
- Slowest Skills
- Most Expensive Skills

### Graph

Main product highlight.

Layout:

- Left panel: graph search, history, scope stack.
- Center: interactive Skill graph.
- Right panel: focus analysis, dependencies, consumers, telemetry, versions, recommendations.

Node types:

- Root
- Skill
- Version
- Model
- Proposal
- Bundle
- GitHub Source
- Marketplace Source
- Project
- Folder

### Optimization

Decision workflow:

- Proposal cards.
- Evidence.
- Impact.
- Expected cost saving.
- Expected latency reduction.

Actions:

- Accept
- Ignore
- Resolve
- Reopen

### Apply Center

Global action center for applying Skills.

Every Skill supports:

- Apply To System
- Apply To Project
- Apply To Workspace
- Apply To Current Folder

Users choose:

- Global Scope
- Project Scope
- Folder Scope

Show target preview before applying.

### Bundle Center

Export:

- Export Skills.
- Create reusable bundle.
- Bundle preview.
- Manifest preview.
- Dependency analysis.

Import:

- Import bundle.
- Validation.
- Security check.
- Diff viewer.
- Import strategy.

Strategies:

- Keep Existing
- Replace Existing
- Create New Version

### Settings

Sections:

- Local Database
- SQLite path
- Storage usage
- Telemetry mode
- Language
- Backup
- Restore
- Permissions
- Security

## Figma Page Tree

Total target: 56 screens.

### A. Onboarding

- A01 Welcome
- A02 Full Device Scan
- A03 Selected Directories
- A04 Exclude Paths
- A05 Permission Setup
- A06 Index Progress
- A07 Initialization Complete

### B. Overview

- B01 Dashboard
- B02 Dashboard Expanded
- B03 Notification Center

### C. Discovery

- C01 Discovery Home
- C02 Folder Management
- C03 Scan Progress
- C04 Scan Results
- C05 GitHub Import
- C06 Repository Analysis
- C07 Import Preview
- C08 Import Success
- C09 Marketplace Home
- C10 Marketplace Search
- C11 Marketplace Category
- C12 Marketplace Detail

### D. Local Skills

- D01 Skill Grid
- D02 Skill Table
- D03 Skill Detail
- D04 Run Skill
- D05 Analyze Skill
- D06 Edit Metadata
- D07 Tag Manager
- D08 Apply Modal
- D09 Apply Success

### E. Remote Market

- E01 Featured
- E02 Search
- E03 Categories
- E04 Trending
- E05 Skill Detail
- E06 Security Report
- E07 Install Wizard

### F. Analysis

- F01 Import Logs
- F02 Import Results
- F03 Today Snapshot
- F04 Seven Day Window
- F05 Cost Analysis
- F06 Performance Analysis
- F07 Model Analysis
- F08 Tool Analysis

### G. Graph

- G01 Graph Overview
- G02 Graph Search
- G03 Focus Mode
- G04 Path Trace
- G05 Dependency View
- G06 Lineage View
- G07 Scope Stack
- G08 Navigation History

### H. Optimization

- H01 Proposal Inbox
- H02 Proposal Detail
- H03 Accept
- H04 Ignore
- H05 Resolved

### I. Apply Center

- I01 Apply Dashboard
- I02 System Scope
- I03 Workspace Scope
- I04 Project Scope
- I05 Folder Scope
- I06 Batch Apply
- I07 Conflict Resolution

### J. Bundle Center

- J01 Bundle Inventory
- J02 Bundle Export
- J03 Export Preview
- J04 Export Success
- J05 Import Manifest
- J06 Validation
- J07 Diff Viewer
- J08 Import Strategy
- J09 Import Success

### K. Registry

- K01 Registry Table
- K02 Registry Detail
- K03 Root Management
- K04 Rescan

### L. Audit

- L01 Timeline
- L02 Event Detail
- L03 Jump To Graph

### M. Settings

- M01 Local Storage
- M02 SQLite
- M03 Backup
- M04 Restore
- M05 Restore Preview
- M06 Permissions
- M07 Telemetry
- M08 Language
- M09 Advanced

## MVP Priority

Do not build all 56 screens at once. P0 should cover:

- A01-A07
- B01
- C01-C08
- D01-D09
- F01-F04
- G01-G03
- H01-H02
- I01-I05
- J01-J08
- K01-K02
- M01-M06
