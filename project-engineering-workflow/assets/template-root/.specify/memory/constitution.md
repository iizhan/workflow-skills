# __PROJECT_NAME__ Spec Constitution

## Core Principles

### I. 需求先确认

所有进入实现阶段的需求，必须先完成中文需求分析并得到明确确认。
在确认之前，不允许修改代码、配置、脚本、模板、流程文档或生成物。

### II. 范围先锁定

进入技术方案和实现前，必须先反馈本次建议锁定范围。
至少说明直接影响、可能联动、范围外风险。
如果实现过程中需要扩大范围，必须暂停并再次确认。

### III. 遵循现有技术栈

实现必须遵循 `__STACK_NAME__` 与 `__APP_PATH__` 的实际约定。
如仓库存在配置源文件与生成配置文件，必须明确二者关系，不允许绕过现有配置链路。

在任务开始时先检查 `.specify/project-profile/`。已有 Profile 仅在证据新鲜且覆盖当前模块时复用；缺失、失效或冲突时必须按证据增量刷新。源码证据优先于缓存结论。

### IV. 先最小实现，再验证交付

优先选择最小安全改动，避免无授权的大范围重构。
交付前必须提供与改动规模匹配的验证结果。

### V. 流程资产与业务资产分层维护

流程资产与业务资产必须分层维护：

- 流程资产：`AGENTS.md`、`.agents`、`.specify`、`specs`、`docs`
- 业务资产：应用代码、配置文件、运行脚本、基础设施文件

### VI. 记忆必须分域、限期、可确认

记忆不是无边界的全局事实。任何可复用上下文必须先判断记给谁、记什么、记多久、怎么取。

- 用户私有记忆必须按用户身份隔离；无法识别用户时，不得跨用户合并。
- 团队共享记忆必须有来源、owner 或明确上下文。
- agent 自身学习只能作为候选提出，持久化前必须获得用户确认。
- 任务会话记忆优先写入 `specs/<feature>/workflow-state.yaml`，功能关闭后再归档。
- 涉及隐私、敏感信息、凭证、猜测、短期环境状态的内容默认不持久化。

### VII. 框架进化必须先提案、再验证、后晋级

框架可以从任务中学习，但不能静默自改。

- 每次有意义的任务结束后，可以产出规则变更候选。
- 候选必须说明问题、证据、拟议变更、影响文件、验证方式和回滚方式。
- 长期规则变更必须先和用户确认，再落到 skill、workflow、template 或 constitution。
- 规则晋级必须遵循最小晋级原则：能停留在会话层，就不要直接上升到宪法层。
- 规则变更落地后必须验证；验证不足时，只保留为候选，不视为正式规则。

### VIII. Starter 升级必须优先兼容旧工件

workflow starter 可以升级，但默认不能破坏已经生成的项目工件。

- minor 版本升级应以新增能力为主，不静默删除、重命名或强制替换旧工件。
- `workflow-state.yaml` 在 minor 版本中只允许向后兼容扩展。
- 新增 workflow 文件对旧项目应优先作为“可选升级项”，而不是硬性失败条件。
- 如果确实需要 breaking change，必须作为 major 版本并附迁移说明。

### IX. 默认开发与发布流必须可追溯

默认开发与发布行为必须可追溯、可验证，不得靠口头约定。

- 默认在 `feature/<feature-slug>` 上开展有跟踪工件的开发，而不是直接在 `main` 上写改动。
- 进入 `release/<version>` 前，必须至少完成 code review 和测试报告。
- 创建 `v<version>` 标签前，worktree 必须干净，且发布说明与发布检查工件已更新。
- 合并到 `main` 必须发生在已验证的 release 提交之后。

## Workflow Gates

### Gate 0：项目认知

- 先走 `$project-profile-router`，检查 Profile 是 fresh、missing 还是 stale
- 首次分析读取技术栈、目录、架构、关键链路、配置真值和验证命令，并保存到 `.specify/project-profile/`
- 后续只读取当前任务相关 Profile 章节和匹配决策；证据变化时增量刷新
- Profile 刷新属于可复现分析缓存，可在需求确认前更新，但不能修改业务资产、复制敏感信息或自动提交
- 历史决策只能减少重复提问，不能复用为本次权限、删除、发布、范围或验收批准

### Gate 1：需求分析

- 先走 `$project-requirement-gate`
- 有重大歧义时暂停，不直接动手

### Gate 2：代码库摸底

- 进入陌生模块前走 `$project-codebase-onboarding`
- 先找真值、边界和复用点，再做修改

### Gate 3：范围锁定

- 先走 `$project-scope-impact-guard`
- 未锁范围，不进入大规模实现

### Gate 4：方案与实现

- 复杂任务走 `$project-tech-solution`
- 实现阶段遵循 `$project-stack-standards` 与 `$project-code-generation`

### Gate 5：交付收口

- 交付前至少经过 `$project-code-review`
- 最终输出必须经过 `$project-test-and-report`

### Gate 6：记忆与复盘

- 涉及 remember/forget/retrieve/update/share/总结经验 时走 `$project-memory-router`
- 每次有意义的任务结束后，提炼会话总结和记忆候选
- 写入长期 `user_private`、`team_shared` 或 `agent_self` 记忆前必须先给用户确认
- 用户拒绝或修改的记忆候选，只能保留在本次任务会话状态中作为反馈，不得静默持久化

### Gate 7：框架进化

- 涉及流程、skill、模板、记忆策略、宪法规则的持续优化时走 `$project-evolution-router`
- 使用 `rule_change_candidates` 记录框架变更提案
- 通过验证前，不得把提案当成正式长期规则
- 如果新规则带来额外摩擦但没有减少失败，应降级、归档或回滚

### Gate 8：兼容升级

- 涉及 starter 升级时，先检查是否会影响已有 `specs/<feature>/` 工件
- 对旧项目优先提示“可选升级”，避免直接强制补齐新文件
- 需要 breaking migration 时，暂停并先给迁移说明

## Governance

- 以中文输出需求分析、范围评估、测试报告和交付说明。
- 当团队流程、技术栈、主应用目录或交付要求变化时，必须同步更新：
  - `AGENTS.md`
  - `.agents/skills/*`
  - `.specify/memory/*`
  - `.specify/templates/*`
  - `docs/Codex团队开发说明.md`
