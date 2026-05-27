# __PROJECT_NAME__ Codex 团队开发说明

这是项目的 AI 协作研发底座。

架构总览见：`docs/AI协作架构.md`

## 目录分层

- `AGENTS.md`
  - 项目级调度入口
- `.agents/skills`
  - 项目本地 skills
- `.specify`
  - 规格、方案、任务模板与脚本
- `specs`
  - 每个需求或功能的交付工件
- `docs/AI协作架构.md`
  - spec-kit、Superpowers、GSD、gstack 与 project-local skills 的分层关系

## 推荐工作流

1. `project-requirement-gate`
2. `project-codebase-onboarding`
3. `project-scope-impact-guard`
4. `project-tech-solution`
5. `project-superpowers-router`
6. `project-gsd-router`，仅长任务或多轮任务需要
7. `project-gstack-router`，仅角色化评审或交付判断需要
8. `.specify/scripts/bash/create-feature.sh`
9. `project-stack-standards`
10. `project-code-generation`
11. `project-code-review`
12. `project-test-and-report`

## 首轮接入必做

至少确认以下内容已经改成项目真实规则：

- `AGENTS.md`
- `.agents/skills/project-stack-standards/SKILL.md`
- `.specify/memory/constitution.md`
- `docs/Codex团队开发说明.md`

## 维护原则

- 流程规则变化时，优先同步 `AGENTS.md` 与 `.agents/skills`
- 模板变化时，同步 `.specify/templates`
- 技术栈或主应用目录变化时，同步 `project-stack-standards`
- 团队交付要求变化时，同步测试报告和 code review 约束
- 引入浏览器自动化、生成资产、多代理、外部 API 或定时任务时，先同步 `project-superpowers-router`
- 引入长任务编排时，同步 `project-gsd-router` 与 `workflow-state.yaml`
- 引入产品、设计、工程、QA、发布等角色化判断时，同步 `project-gstack-router`
