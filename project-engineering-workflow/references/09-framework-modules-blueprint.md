# Framework Modules Blueprint

这份蓝图描述的是 `project-engineering-workflow` 这套框架本身应该如何分层，而不是某一台机器如何全局安装和触发它。

优先级顺序：

1. 先定义框架内部模块边界
2. 再定义这些模块如何对外暴露能力面
3. 最后才定义在某个宿主环境里如何部署和使用

## 一、三层模型

推荐把框架理解成三层：

```text
Core Framework
  -> Capability Surfaces
    -> Deployment Profiles
```

### 1. Core Framework

这是产品内核，负责可复用、可迁移、可兼容的稳定基础能力。

它不关心某个用户如何在本机调用，只关心框架本身的结构是否正确。

应包含：

- workflow starter 模板
- `.agents/skills` 的项目本地能力入口
- `.specify/templates/*`
- `.specify/scripts/*`
- `.specify/memory/*`
- `.specify/memory-store/*`
- `doctor / upgrade / json / report` CLI 能力
- 兼容策略、升级策略、schema 策略

### 2. Capability Surfaces

这是能力面，不是内核。

它解决的问题是：

- 用户或上层系统以什么语义进入框架
- 哪类请求命中哪条入口链
- 每个入口面应该向外暴露多大范围

典型能力面包括：

- bootstrap / init
- doctor / audit
- upgrade / migrate
- memory governance
- evolution governance
- branch / release governance

这里的拆分是产品入口拆分，不一定要求底层实现也拆成多个仓库或多个包。

### 3. Deployment Profiles

这是分发和宿主层。

它只关心：

- 在 Codex 全局 skill 目录里如何安装
- 在某个团队环境里是一个 skill 还是多个 skill
- 是否允许隐式调用
- UI 显示名和默认提示如何命名

这一层不能反过来主导 Core Framework 的产品结构。

## 二、当前框架建议的模块拆分

### A. Core Workflow Module

职责：

- requirement -> scope -> solution -> implement -> review -> test 的主交付流

当前对应：

- `AGENTS.md`
- `project-requirement-gate`
- `project-codebase-onboarding`
- `project-scope-impact-guard`
- `project-tech-solution`
- `project-code-generation`
- `project-code-review`
- `project-test-and-report`

### B. Project Context Module

职责：

- 首次分析项目技术栈、目录、模块、关键链路、配置真值、命令和工程约定
- 把可重新验证的事实与架构摘要保存到项目本地
- 用证据指纹判断 fresh / missing / stale，只刷新变化范围
- 复用明确确认的稳定项目决策，同时隔离用户私有记忆和当前任务批准

当前对应：

- `project-profile-router`
- `.specify/project-profile/profile.yaml`
- `.specify/project-profile/architecture.md`
- `.specify/project-profile/decision-memory.yaml`
- `.specify/scripts/project-profile.mjs`
- `workflow-state.yaml` 中的 `project_profile`

边界：

- Profile 是可复现缓存，源码与配置真值优先。
- 决策记忆需要明确确认；Profile 事实刷新不重复要求记忆确认。
- 不保存 secrets、原始环境值、私有数据或无证据推断。
- 历史决定不能复用为权限、删除、远端写入、发布、范围或验收批准。

### C. Engineering Role Workflow Module

职责：

- 用项目 Profile 把通用交付流适配到前端或后端真实技术表面
- 让角色入口保持轻量，把架构、契约、数据、运行时、体验、无障碍、性能和测试细节按需加载
- 让全栈任务分开记录两个表面的决策和证据，而不是加载一个庞大的“全能开发 Skill”

当前对应：

- `project-stack-standards`
- `project-backend-standards` 及其 references
- `project-frontend-standards` 及其 references
- `project-frontend-js` / `project-frontend-react` / `project-frontend-vue` / `project-frontend-css`

边界：

- requirement、impact、confirmation 和 acceptance 仍由 Core Workflow 负责，角色 Workflow 不复制门禁。
- 项目事实优先于通用 reference。
- fast 只加载一个命中引用；standard 通常是一个主引用加测试引用；controlled 只加载已确认风险涉及的引用。
- 角色入口和详细 references 必须分别计量 token，不能用“文件都安装在本地”冒充低成本。

### D. Memory Governance Module

职责：

- 决定记给谁
- 记什么
- 记多久
- 怎么取
- durable memory 如何存储和兼容升级

当前对应：

- `project-memory-router`
- `.specify/memory/memory-policy.md`
- `.specify/memory-store/*`
- `workflow-state.yaml` 中的 session memory 字段

### E. Evolution Governance Module

职责：

- 把重复经验转成框架规则提案
- 决定是升到 skill、template、workflow 还是 constitution

当前对应：

- `project-evolution-router`
- `.specify/memory/evolution-policy.md`
- `rule-change-proposal.md`

### F. Execution Augmentation Module

职责：

- 引入增强能力但不绕过项目规则

当前对应：

- `project-superpowers-router`
- `project-gsd-router`
- `project-gstack-router`

### G. Branch And Release Governance Module

职责：

- 默认 feature 分支流
- release 分支、tag 与 merge `main` 规则
- 发布工件与发布检查

当前对应：

- `project-branch-release`
- `.specify/release/release-policy.md`
- `.specify/scripts/bash/create-feature-branch.sh`
- `.specify/scripts/bash/prepare-release.sh`
- `.specify/scripts/bash/finalize-release.sh`
- `release-checklist.md`
- `release-notes.md`

### H. Compatibility And Migration Module

职责：

- 旧项目兼容
- starter 升级
- 结构化 doctor / upgrade / report / json
- memory-store 兼容与索引重建策略

当前对应：

- `project-engineering-workflow.mjs`
- `scripts/doctor.sh`
- `references/08-upgrade-compatibility-pack/*`
- `docs/升级兼容策略.md`

## 三、模块间边界原则

### 1. Core 和 Capability Surface 分离

不要把“某个入口的展示形式”写死进核心结构。

例如：

- `bootstrap`
- `upgrade`
- `audit`

可以是不同入口，但共享同一个内核。

### 2. Memory Data 和 Workflow Template 分离

不要把 durable memory 当成模板的一部分。

正确关系是：

- 模板负责定义结构和规则
- 数据负责存放用户与项目运行中的真实记忆

因此：

- `.specify/memory-store/*` 属于项目数据层
- `.specify/memory/*` 属于规则层

### 3. Session State 和 Durable Memory 分离

不要把所有上下文都塞进 `workflow-state.yaml`。

推荐：

- `workflow-state.yaml` 只放当前 feature / task 的运行态
- `.specify/memory-store/*` 放 durable memory

### 4. Upgrade Logic 和 Deployment Profile 分离

不要因为某个宿主平台喜欢“一个全局 skill”，就让升级逻辑和安装逻辑绑死在一起。

## 四、对外能力面建议

框架层面建议先定义能力面，而不是立刻拆多个独立仓库：

- `bootstrap surface`
- `audit surface`
- `upgrade surface`
- `memory surface`
- `evolution surface`
- `branch / release surface`

这些能力面可以：

- 暂时继续由一个 skill 承载
- 也可以在未来按宿主平台拆成多个 skill

重点是：

先把框架语义拆清楚，再决定是否拆部署入口。

## 五、部署层建议

部署层只是消费框架，不是决定框架。

因此不同场景可以有不同部署 profile：

### Profile 1. Single Skill Profile

适合：

- 个人使用
- 框架还在快速迭代

特点：

- 一个 skill 入口
- 内部再区分 bootstrap / audit / upgrade

### Profile 2. Split Surface Profile

适合：

- 多人团队
- 希望进一步降低误触发

特点：

- bootstrap 一个入口
- audit/upgrade 一个入口
- memory/evolution 可继续单独拆

### Profile 3. Managed Automation Profile

适合：

- 需要和 UI、审批流、记忆系统、自动巡检联动

特点：

- 重点依赖 `doctor --json`
- 重点依赖 `upgrade --json`
- 重点依赖 `--json-out`

## 六、当前阶段建议

对你现在这套框架，建议优先顺序是：

1. 先稳定 Core Framework
2. 先把 Memory Governance 和 Compatibility Module 做扎实
3. 继续通过 `json / json-out / report` 强化机器可消费性
4. 在确认框架语义稳定后，再决定是否拆多个全局入口

## 七、一句话结论

这套框架应该先被设计成：

> 一个有清晰内核、清晰能力面、清晰部署层的工程化 AI 协作框架

而不是先被设计成：

> 在某一台机器上怎么装、怎么触发的单个 skill。

如果你想继续往实施层推进，请配合阅读：`references/10-implementation-modules-checklist.md`
