# Workflow Skills

[English](README.md) | 中文

Workflow Skills 是一套面向 AI 协作研发的企业级工程化工作流 starter。

它把以下能力组合成一套可接入、可治理、可恢复、可验证的项目底座：

- spec-kit 风格的规格与交付工件
- Superpowers 风格的增强执行与验证纪律
- GSD 风格的长任务编排与上下文续航
- gstack 风格的角色化评审
- 基于 `SKILL.md` 的项目本地 skills
- code review、测试报告、剩余风险说明等交付门禁

这不是把多个框架简单堆在一起，而是用 project-local skills 把它们路由进同一套项目工程宪法。

## 文档定位

本项目旨在定义并落地一套轻量版的“企业级 AI 研发操作系统”。

核心公式：

```text
Enterprise AI Framework
= Spec-Driven Development
+ Context Engineering
+ Agent Governance
+ Test-Driven Verification
+ Reusable Skills
+ LLMOps Harness
```

当前仓库先聚焦最小可行闭环：

- 项目级 AI 协作规则
- 本地 skills
- feature 级规格工件
- workflow 状态文件
- Superpowers / GSD / gstack 路由
- review 与测试收口

## 核心目标

- 意图无损：从需求到交付，以结构化规格作为事实来源。
- 持续记忆：通过 `specs/` 和 `workflow-state.yaml` 保存跨会话上下文。
- 可靠自治：增强能力必须经过范围、权限、角色和验证门禁。
- 质量内置：把 review、测试报告、未覆盖项和剩余风险作为交付的一部分。
- 低门槛接入：优先服务已有项目，不要求一开始就重构业务代码。

## 架构全景

```mermaid
flowchart TD
  A["AGENTS.md / constitution"] --> B["需求门禁"]
  B --> C["代码库入场"]
  C --> D["影响范围锁定"]
  D --> E["技术方案"]
  E --> F["Superpowers Router"]
  F --> G["Superpowers: 增强执行"]
  F --> H["GSD: 长任务编排"]
  F --> I["gstack: 角色评审"]
  G --> J["项目本地 Skills"]
  H --> J
  I --> J
  J --> K["代码生成"]
  K --> L["代码审查"]
  L --> M["测试与交付报告"]
  M --> N["specs / workflow-state / delivery report"]
```

## 组件映射

| 架构维度 | 核心职责 | 当前落地 |
| --- | --- | --- |
| 规格驱动开发 | 定义意图、验收标准和技术约束 | `.specify`、`specs/<feature>/spec.md`、`plan.md`、`tasks.md` |
| 智能体治理 | 控制流程、范围、角色和交付门禁 | `AGENTS.md`、`constitution.md`、router skills |
| 可复用技能 | 把原子能力封装为声明式模块 | `.agents/skills/*/SKILL.md` |
| 测试驱动验证 | 用 review 和测试保护实现质量 | `project-code-review`、`project-test-and-report`、项目测试命令 |
| 上下文工程 | 保存任务状态、交接信息和历史决策 | `workflow-state.yaml`、`specs`、`docs` |
| LLMOps 预留层 | 为后续可观测性、评估、安全、成本控制预留结构 | 结构化报告、能力路由、角色评审、剩余风险 |

## 快速接入

```bash
npx @workflow-skills/project-engineering-workflow init \
  --project-name "CRM Platform" \
  --project-slug "crm-platform" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/your-repo"
```

接入后做一次体检：

```bash
npx @workflow-skills/project-engineering-workflow doctor \
  --output-dir "/absolute/path/to/your-repo"
```

本仓库本地调试：

```bash
node project-engineering-workflow/bin/project-engineering-workflow.mjs init \
  --project-name "CRM Platform" \
  --project-slug "crm-platform" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/your-repo"
```

## 生成后的项目结构

```text
.
├── AGENTS.md
├── .agents/
│   └── skills/
├── .specify/
│   ├── memory/
│   ├── templates/
│   └── scripts/
├── specs/
│   └── <feature>/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       ├── quickstart.md
│       ├── workflow-state.yaml
│       └── checklists/
└── docs/
    ├── Codex团队开发说明.md
    └── AI协作架构.md
```

## 核心工作流

1. 意图规格化：把用户请求转成需求目标、约束、影响模块和验收标准。
2. 代码库入场：先读相关模块、依赖、配置和风险点。
3. 范围锁定：确认最小安全改动面，区分直接影响和联动影响。
4. 技术方案：复杂任务先写方案，明确目录、接口、状态、测试和回退点。
5. 能力路由：通过 `project-superpowers-router` 判断是否需要增强能力。
6. 长任务编排：多轮、多天、跨模块任务启用 `project-gsd-router`。
7. 角色评审：产品、设计、工程、QA、发布判断启用 `project-gstack-router`。
8. 交付工件：在 `specs/<feature>/` 下生成 spec、plan、tasks、workflow state。
9. 实现与复用：通过 project-local skills 做最小安全实现。
10. 收口交付：完成 code review、测试报告、未覆盖项和剩余风险说明。

## 路由矩阵

| 任务类型 | 推荐通道 | 收口方式 |
| --- | --- | --- |
| 局部 bug 或小改动 | 基础 workflow | `project-test-and-report` |
| 需要浏览器、生成资产、外部工具或多代理 | `project-superpowers-router` | 工具结果进入 review 和 test report |
| 多模块、多轮、长周期任务 | `project-superpowers-router` -> `project-gsd-router` | 更新 `workflow-state.yaml` |
| 产品、设计、发布或 QA 判断 | `project-superpowers-router` -> `project-gstack-router` | 角色结论进入 plan、review 或 report |
| 高风险外部副作用 | `project-superpowers-router` + 用户确认 | 记录影响范围、结果和回退方式 |

## 实施路径

| 阶段 | 目标 | 核心任务 |
| --- | --- | --- |
| 第一阶段：MVP | 在单个项目跑通闭环 | 接入 `AGENTS.md`、`.agents/skills`、`.specify`、`specs`，跑通一个真实需求 |
| 第二阶段：记忆与治理 | 提升跨会话稳定性 | 使用 `workflow-state.yaml`，沉淀 GSD 里程碑，补齐 gstack 角色评审 |
| 第三阶段：企业级就绪 | 加入观测、评估、安全与成本治理 | 接入 LLMOps、自动化评估、安全网关、技能市场和团队指标 |

## 风险与缓解

| 风险 | 缓解措施 |
| --- | --- |
| 框架冲突与内耗 | `AGENTS.md` 和 `constitution.md` 作为唯一最高规则 |
| 上下文爆炸 | 使用 GSD 原子任务和 `workflow-state.yaml` 控制上下文预算 |
| 需求漂移 | 需求门禁、范围锁定、验收标准必须先于实现 |
| AI 产出不可验证 | 所有任务必须以 review、测试报告和剩余风险收口 |
| 外部副作用失控 | 发布、部署、远端数据、凭证、定时任务必须显式确认并记录回退方式 |

## 仓库结构

```text
project-engineering-workflow/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── assets/
│   └── template-root/
├── bin/
│   └── project-engineering-workflow.mjs
├── references/
├── scripts/
│   ├── bootstrap-project.sh
│   └── doctor.sh
└── package.json
```

## 本地检查

```bash
npm --prefix project-engineering-workflow run doctor
```

发布包 dry-run：

```bash
npm pack --dry-run --package-lock=false --cache /private/tmp/npm-cache-workflow-skills
```

## npm 包名

```text
@workflow-skills/project-engineering-workflow
```
