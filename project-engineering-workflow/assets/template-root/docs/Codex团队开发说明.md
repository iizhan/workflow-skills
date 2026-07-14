# __PROJECT_NAME__ Codex 团队开发说明

这是项目的 AI 协作研发底座。

架构总览见：`docs/AI协作架构.md`
能力地图见：`docs/AI能力地图.md`
升级兼容策略见：`docs/升级兼容策略.md`

## 目录分层

- `AGENTS.md`
  - 项目级调度入口
- `.agents/skills`
  - 项目本地 skills
- `.specify`
  - 规格、方案、任务模板与脚本
- `.specify/memory`
  - 项目宪法、记忆策略、进化策略、提案预填策略、起草协议、复盘输出协议与最终交付输出协议，定义谁能写、谁能读、记什么、记多久、怎么取、怎么升级规则
- `.specify/release`
  - 分支和发布策略，定义 feature 分支、release 分支、版本 tag 和合并主干的默认规则
- `specs`
  - 每个需求或功能的交付工件、任务状态、交付总结、会话总结、复盘文档、记忆候选、规则变更候选和规则提案文档
- `docs/AI协作架构.md`
  - spec-kit、Superpowers、GSD、gstack 与 project-local skills 的分层关系
- `docs/AI能力地图.md`
  - Delivery、Memory、Evolution、Reflection、Final Output、Branch/Release 六条主链的使用地图
- `docs/升级兼容策略.md`
  - starter 新版本如何在不破坏旧项目工件的前提下升级

## 推荐工作流

每次研发任务先执行 `project-profile-router`：检查 Profile 新鲜度，优先复用项目技术栈、架构、命令、模块边界和已确认决策。只有 Profile 缺失、证据变化或当前模块未覆盖时，才做相应范围的重新读取。

先选择任务通道：

- `fast`：目标清楚、风险低、可回滚，简要复述后直接执行并验证。
- `standard`：确认一版“需求 + 事项 + 验收 + 影响范围”后执行。
- `controlled`：先确认需求、事项、验收和影响范围，再确认子任务、依赖、验证与回滚。

确认必须绑定版本。执行中出现超出已确认范围的影响时，暂停并只确认新增差异。

0. `project-profile-router`
1. `project-requirement-gate`
2. `project-codebase-onboarding`
3. `project-scope-impact-guard`
4. `project-tech-solution`
5. `project-superpowers-router`
6. `project-gsd-router`，仅长任务或多轮任务需要
7. `project-gstack-router`，仅角色化评审或交付判断需要
8. `project-memory-router`，仅涉及记忆、遗忘、偏好、团队知识、会话总结或自我提升时需要
9. `project-evolution-router`，仅涉及流程、skill、模板、宪法持续优化时需要
10. `project-branch-release`，涉及功能分支、release 分支、tag、merge `main` 时需要
11. `.specify/scripts/bash/create-feature.sh`
12. `project-dev-core`
13. `project-stack-standards`
14. `project-backend-standards`，后端任务按 Profile 和变更信号加载架构、接口、数据、运行时、验证和 Java/Spring 引用
15. `project-frontend-standards`，前端任务按 Profile 和变更信号加载体验状态、数据流、无障碍/响应式、性能/安全和验证引用
16. `project-frontend-js` / `project-frontend-react` / `project-frontend-vue` / `project-frontend-css`，只选择实际改变的栈表面
17. `project-code-generation`
18. `project-code-review`
19. `project-security-review`，安全敏感任务需要
20. `project-verification-loop`，重要或跨模块变更需要
21. `project-test-and-report`
22. `project-session-summary`
23. `project-skill-upgrade-advisor`，重复摩擦需要

其中影响范围必须覆盖：直接和间接影响、用户、数据/迁移、接口/配置、安全/权限、兼容、性能、测试、发布/回滚、Workflow/Skill，以及明确不影响项。验证报告必须把每个事项和影响维度映射到证据、失败或未覆盖风险，并等待用户验收。

## 首轮接入必做

至少确认以下内容已经改成项目真实规则：

- `AGENTS.md`
- `.agents/skills/project-stack-standards/SKILL.md`
- `.agents/skills/project-profile-router/SKILL.md`
- `.specify/project-profile/profile.yaml`
- `.specify/project-profile/architecture.md`
- `.specify/project-profile/decision-memory.yaml`
- `.specify/memory/constitution.md`
- `.specify/memory/memory-policy.md`
- `.specify/memory/evolution-policy.md`
- `docs/Codex团队开发说明.md`

## 维护原则

- 流程规则变化时，优先同步 `AGENTS.md` 与 `.agents/skills`
- 任务分级、确认门禁或影响维度变化时，同步 `project-requirement-gate`、`project-scope-impact-guard`、spec/plan/tasks/checklist/workflow-state 模板
- 模板变化时，同步 `.specify/templates`
- 技术栈或主应用目录变化时，同步 `project-stack-standards`
- 首次接入或架构/模块/构建事实变化时，刷新 `.specify/project-profile/` 并重新捕获证据指纹
- 后端角色流程或技术规范变化时，同步 `project-backend-standards` 入口与对应按需 reference
- 前端角色流程变化时，同步 `project-frontend-standards` 入口与对应按需 reference；框架规则变化时再同步对应栈 skill
- 安全边界变化时，同步 `project-security-review`
- 验证方式变化时，同步 `project-verification-loop` 和 `project-test-and-report`
- 团队交付要求变化时，同步测试报告和 code review 约束
- 引入浏览器自动化、生成资产、多代理、外部 API 或定时任务时，先同步 `project-superpowers-router`
- 引入长任务编排时，同步 `project-gsd-router` 与 `workflow-state.yaml`
- 引入产品、设计、工程、QA、发布等角色化判断时，同步 `project-gstack-router`
- 引入默认 `feature/* -> release/* -> tag -> merge main` 流程时，同步 `project-branch-release`、`.specify/release/release-policy.md`、相关 bash 脚本与发布模板
- 引入用户偏好、团队 FAQ、产品事实、会话复盘或 agent 自我迭代时，同步 `project-memory-router`、`memory-policy.md` 与 `workflow-state.yaml`
- 引入框架自总结、自调整、自我升级时，同步 `project-evolution-router`、`evolution-policy.md`、`workflow-state.yaml` 与相关 skill/template
