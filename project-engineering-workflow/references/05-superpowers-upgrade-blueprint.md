# Superpowers + GSD + gstack 升级蓝图

本文档用于把当前工程化 workflow 升级成更适合承接 Superpowers、GSD、gstack 的协作底座。

这里的增强能力分三类：

- `Superpowers`: 浏览器自动化、文件生成、视觉生成、多代理委托、外部 API、定时任务、设备或模拟器验证等执行能力。
- `GSD`: 长任务、多轮任务、上下文恢复、里程碑推进和状态管理。
- `gstack`: PM、设计、工程、QA、发布、复盘等角色化判断。

## 当前定位

本项目已有的强项是治理层：

- `AGENTS.md` 负责统一调度
- `.agents/skills` 负责拆分能力
- `.specify` 和 `specs` 负责沉淀交付工件
- `doctor.sh` 和 `validate-workflow.sh` 负责结构检查

这套结构适合做增强能力的安全底座，因为它能先管住需求、范围、方案、实现、review 和测试。

## 升级目标

升级后应达到三个目标：

1. 能力路由清晰：知道什么任务该用普通编辑，什么任务该用 Superpowers、GSD 或 gstack。
2. 执行边界清晰：增强能力不能绕开需求、范围、权限、测试和交付说明。
3. 结果可回收：增强能力产出的发现、截图、资产、验证结论要能回到 spec、plan、tasks 或最终报告里。

## 推荐总架构

采用“一套宪法，三个适配器”：

- `AGENTS.md` 和 `.specify/memory/constitution.md` 是最高规则。
- `project-superpowers-router` 是统一入口，负责判断是否需要增强能力。
- `project-gsd-router` 只处理长任务、上下文续航、里程碑和状态文件。
- `project-gstack-router` 只处理角色化产品、设计、工程、QA、发布和复盘判断。
- `project-code-generation`、`project-code-review`、`project-test-and-report` 负责最终实现、审查和收口。

不要让三套外部方法并列成为主流程。一个任务只有一个项目总控，增强能力只是被路由进来的专用通道。

## 推荐能力分层

### 1. Read-only Discovery

适用场景：

- 搜索和阅读代码
- 浏览网页或本地页面
- 截图、检查 UI、收集资料
- 分析文档、表格、日志、接口描述

治理要求：

- 默认允许在项目范围内使用
- 只输出结论和来源
- 不修改代码或外部系统

### 2. Local Execution

适用场景：

- 运行测试、构建、lint、格式化
- 启动本地 dev server
- 执行本地验证脚本
- dry-run 迁移或脚本

治理要求：

- 优先选择最低成本的验证命令
- 记录命令、结果和未覆盖项
- 避免破坏性命令

### 3. Asset Generation

适用场景：

- 生成图片、文档、表格、演示稿
- 生成测试夹具、示例数据、设计草图
- 生成架构图或流程图

治理要求：

- 明确资产用途和输出路径
- 与项目风格和交付标准一致
- 资产进入 review 和验证流程

### 4. Interactive Automation

适用场景：

- 浏览器端到端验证
- App、设备、模拟器操作
- 截图比对和交互检查

治理要求：

- 先确认本地目标、端口和入口
- 验证结果写入测试报告
- 不把临时环境状态当成最终事实

### 5. External Side Effect

适用场景：

- 调用外部 API
- 发布、部署、发送消息
- 修改远端数据、凭证、权限、定时任务

治理要求：

- 必须显式确认
- 必须说明影响范围和回退方式
- 必须记录执行结果

### 6. Multi-agent Delegation

适用场景：

- 大规模代码审查
- 多模块迁移
- 竞品或技术调研
- 测试矩阵拆分

治理要求：

- 主 agent 保留需求、范围和最终判断权
- 子任务输出必须可验证
- 合并结论时标注不确定性

### 7. GSD Orchestration

适用场景：

- 多轮、多天或上下文容易丢失的任务
- 跨模块迁移、复杂重构、长链路问题排查
- 需要分阶段交付、恢复任务或记录里程碑

治理要求：

- 通过 `project-gsd-router` 启用
- 维护 `specs/<feature>/workflow-state.yaml`
- 每次只推进一个明确里程碑
- 阶段结果进入测试报告或交付说明

### 8. gstack Role Review

适用场景：

- 需要 PM、设计、工程、QA、发布等角色分别判断
- 存在产品取舍、设计质量、架构风险、发布风险
- 需要交付前的角色化 gate 或复盘

治理要求：

- 通过 `project-gstack-router` 启用
- 只启用当前任务需要的角色
- 角色结论必须落到 scope、plan、review、test 或 report
- 角色意见不能绕过范围锁定直接扩大实现

## 推荐接入点

新增三个适配器：

- `project-superpowers-router`: 增强能力总入口
- `project-gsd-router`: 长任务和状态续航入口
- `project-gstack-router`: 角色化判断入口

推荐顺序：

1. `project-requirement-gate`
2. `project-codebase-onboarding`
3. `project-scope-impact-guard`
4. `project-tech-solution`
5. `project-superpowers-router`
6. `project-gsd-router` when long-running orchestration is needed
7. `project-gstack-router` when role review is needed
8. `project-code-generation`
9. `project-code-review`
10. `project-test-and-report`

不是每个任务都需要第 4 步到第 7 步。简单修改可以跳过，但只要涉及外部工具、生成资产、浏览器自动化、多代理、长任务编排、角色化评审或外部副作用，就应该先走 `project-superpowers-router`。

## 路由矩阵

| 任务类型 | 推荐通道 | 收口方式 |
| --- | --- | --- |
| 局部 bug 或小改动 | 基础 workflow | `project-test-and-report` |
| 需要 TDD、debug、浏览器或资产工具 | `project-superpowers-router` | 工具结果进入 review 和 test report |
| 多模块、多轮、长周期任务 | `project-superpowers-router` -> `project-gsd-router` | 更新 `workflow-state.yaml` |
| 产品、设计、发布或 QA 判断 | `project-superpowers-router` -> `project-gstack-router` | 角色结论进入 plan、review 或 report |
| 高风险外部副作用 | `project-superpowers-router` + 用户确认 | 记录影响范围、结果和回退方式 |

## 机器可读状态建议

在 `specs/<feature>/` 下生成一个轻量状态文件：

```yaml
feature:
  slug: login-refactor
  name: 登录流程重构
requirement_status: confirmed
scope_status: locked
active_milestone: implementation
milestones:
  - id: implementation
    status: in_progress
capability_routes:
  - class: local execution
    tool: test-command
    requires_confirmation: false
role_reviews:
  - role: QA
    status: pending
validation_status: pending
handoff_notes: []
residual_risks: []
```

这可以让长任务、恢复任务、多代理任务更容易接上上下文。

## 成熟度判断

当前版本可以评为：

- 治理层：高
- 能力路由：中
- 运行时状态：中
- 外部副作用保护：中
- 多代理协作：中
- 角色化评审：中
- 可复制接入：高

下一阶段优先补齐：

1. 外部副作用确认模板
2. 多代理任务分解与合并模板
3. gstack 角色评审记录模板
4. GSD 里程碑恢复脚本
