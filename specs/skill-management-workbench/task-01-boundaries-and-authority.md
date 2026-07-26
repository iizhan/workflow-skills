# TASK-01 产品边界与权威来源决策稿

## 1. 文档状态

- 任务：`TASK-01`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`high`
- 目标：锁定 Skill OS、项目本地 Workflow、Codex/Claude Harness 与团队协作之间的责任边界，作为后续 Schema、Adapter、迁移和 UI 任务的前置约束。

本任务只定义产品边界和决策，不修改业务项目，不修改数据库 Schema，不实现远程 Skill 下载或团队同步。

## 2. 背景

当前产品已经具备两个互补底座：

1. `project-engineering-workflow`：落在项目目录中的 `AGENTS.md`、`.agents/skills`、`.specify` 和 `specs`，负责指导实际研发任务。
2. Skill OS：本地 Electron 应用、SQLite、扫描、运行证据、健康评分、图谱、优化提案、Bundle、备份和授权管理，负责观察与治理。

本任务不把两者合并成一个超大执行引擎，而是明确“项目负责执行规则，桌面端负责配置、观测、评估和治理”。

## 3. 核心决策

### D-001：项目范围必须是用户明确绑定的目录

- Skill OS 只扫描用户明确选择并授权的项目目录或 Skill 根目录。
- 默认禁止整台电脑扫描。
- 自动检测可以发现“当前会话目录未绑定”或“项目未接入”，但不得未经确认写入项目。
- 绑定、扫描、应用 Workflow、启用监控分别产生可追溯状态。

### D-002：Skill OS 不替代模型 Harness

Skill OS 负责：

- 项目绑定和接入诊断
- Project Profile 与架构证据管理
- Skill/Workflow 注册和版本观察
- 运行事件、Token、健康度和质量评估
- 优化提案、差异预览、备份和回滚辅助

Codex、Claude Code 或其他 Harness 负责：

- 读取项目入口文件
- 决定本次任务实际加载哪些 Skill
- 解释规则并执行工具调用
- 产生真实运行事件或可被解析的运行证据

Skill OS 不对无法观测的 Harness 行为宣称“已强制触发”。

### D-003：共享工程规则与 Harness 适配规则分离

项目共享层保存业务和工程事实，不绑定单一模型厂商。

适配层分别处理：

- Codex：`AGENTS.md`、`.agents/skills`、Codex 事件和目录证据
- Claude Code：`CLAUDE.md`、Claude Skill/Hook 能力和对应事件
- 其他 CLI 或 Agent：通过明确的 Adapter 能力声明接入

项目可配置默认 Harness，但不能因为选择一个 Harness 就删除或污染另一套适配资产。

### D-004：规则优先级采用“安全上限 + 逐层收敛”

规则合并顺序为：

```text
不可覆盖的安全与组织策略
→ 项目共享工程契约
→ Harness Adapter 规则
→ Workflow / Skill 默认规则
→ 当前任务参数
```

低层规则不能覆盖上层安全、权限、数据范围、发布和写入约束。当前任务参数只能在允许的范围内收窄或选择策略，不能绕过项目门禁。

### D-005：项目真值与桌面端数据分层

| 数据类型 | 权威来源 | Skill OS 权限 |
| --- | --- | --- |
| 业务代码、配置、测试、项目规则 | 项目 Git 工作区 | 只读扫描，应用变更前必须预览确认 |
| 团队公共 Workflow/Skill 基准 | 项目 Git 仓库 | 展示、比较、生成提案，不替代 Git |
| 项目 Profile 与架构事实 | 项目文件中的 `.specify/project-profile`，源码优先 | 读取、检查新鲜度、提示刷新 |
| 本机扫描索引、运行证据、评分快照 | Skill OS 本地 SQLite/JSONL | 读写本地治理数据 |
| 用户私有覆盖和临时偏好 | 本机私有存储 | 不自动写入团队 Git |
| Harness 原始 Token/运行事件 | Harness 原生事件或明确标注的推断日志 | 归一化、保留来源和置信度 |

MVP 阶段以 Git 作为团队公共基准；Skill OS 本地数据库不是团队公共真值。

### D-006：所有项目写入采用 Preview-Confirm-Apply

涉及项目文件、Skill、Workflow、Profile、配置或权限的写入，必须经过：

```text
检测 → 生成候选 → 展示目标和差异 → 用户确认 → 应用 → 验证 → 记录回滚点
```

以下行为禁止默认静默执行：

- 自动覆盖现有规则
- 自动删除或精简正式 Skill
- 自动修改项目记忆
- 自动启用远程 Skill
- 自动合并团队版本
- 自动改变用户授权范围

### D-007：Project Profile 是有证据的新鲜缓存

- Profile 不是永久真相，也不是用户授权。
- 源码、配置、构建文件和项目规则优先于 Profile。
- Profile 状态必须区分 `missing`、`analyzing`、`fresh`、`changed`、`stale`、`invalid`。
- 只刷新发生变化或当前任务未知的证据范围。
- Profile 不保存 secrets、原始环境变量值、完整会话正文或无证据推断。

### D-008：Workflow 图谱第一阶段是声明与观测模型

第一阶段的 Workflow 图谱用于：

- 展示 Skill、步骤、条件、依赖和观测到的运行关系
- 对比计划流程与实际流程
- 关联验证证据、失败节点和用户反馈

第一阶段不提供任意脚本执行、无限循环、动态远程命令或不受控的通用编排引擎。

### D-009：质量评分必须携带证据和置信度

不使用一个无法解释的总分作为唯一结论。至少拆分为：

1. 静态质量：规范、结构、重复度、臃肿度、可维护性。
2. 运行健康：成功率、失败率、延迟、Token、工具调用和新鲜度。
3. 项目适配：当前项目命中度、Harness 适配度、实际验收结果。

每个评分必须记录：

- 证据来源
- 采集时间
- 计算版本
- 样本数量
- `precise / inferred / manual` 置信度

Token 本地分词只用于估算；真实消耗优先使用 Harness/provider usage metadata。

### D-010：MVP 团队协作采用 Git 基准 + 本地私有覆盖

- 团队公共 Skill/Workflow 进入项目 Git，由团队评审和发布。
- 个人偏好、临时草稿、实验版本保存在本机私有层。
- Skill OS 可以比较、生成合并建议和记录审核，但不替代 Git merge。
- 没有共享协调服务时，团队总 Token 预算、实时成员权限和跨设备锁只能做本地提示或 Git 规则，不能宣称全局强制。

后续若需要跨设备强制预算、实时成员权限和中心化审批，再建设可选 Managed Integration，而不是隐式改变 Local First MVP。

### D-011：方案和规则必须版本化

- 架构决策、边界约束、Schema、Workflow 和评分规则都必须有版本。
- 不使用“固定不可修改、绝对无漏洞”作为工程约束。
- 任何规则变更必须记录变更原因、影响范围、迁移方式、验证结果和回滚方式。

## 4. 核心术语

| 术语 | 定义 |
| --- | --- |
| 项目 | 用户绑定的一个本地目录及其 Project Profile、Workflow 和运行证据边界 |
| Skill | 可独立触发、具有入口描述和可选 references/scripts/assets 的原子能力 |
| Workflow | 多个 Skill、步骤、条件和验证关系组成的声明式流程 |
| Harness | 实际读取规则、加载 Skill、调用工具并执行任务的宿主，如 Codex 或 Claude Code |
| Adapter | 把共享项目规则映射到某个 Harness 的入口、事件和能力协议 |
| Profile | 基于项目证据生成、可检查新鲜度的项目事实缓存 |
| 团队公共基准 | 进入 Git 并经团队评审的 Skill、Workflow 和项目规则 |
| 私有覆盖 | 仅当前用户或当前机器可见的偏好、实验版本和临时配置 |
| 运行证据 | Skill/Workflow 实际运行、Token、工具调用、错误和验收产生的记录 |
| 置信度 | 运行证据来自精确事件、推断日志或人工记录的可信等级 |

## 5. 明确不在 TASK-01 实施的内容

- 不实现 Schema 迁移和旧客户端兼容协议。
- 不实现 Codex/Claude Adapter 的事件字段映射。
- 不实现远程 Skill 下载、签名和沙箱。
- 不实现团队服务器、成员账号和全局预算服务。
- 不实现自动 Skill 改写、自动合并或自动删除。
- 不改变当前已接入项目的业务代码。

## 6. 验收标准

- [ ] 能明确解释 Skill OS 与项目本地 Workflow 的责任边界。
- [ ] 能明确解释项目 Git、Profile、SQLite、Harness 事件和私有覆盖各自的权威范围。
- [ ] 同一项目使用两个 Harness 时，不会因适配差异覆盖共享项目规则。
- [ ] 所有项目写入都能追溯到 Preview、Confirm、Apply 和 Verify 状态。
- [ ] 任何评分都能展示证据来源、时间、样本和置信度。
- [ ] MVP 不因团队能力规划而引入必须联网的中心服务。
- [ ] 后续 Schema、Adapter、迁移、远程安全和团队协作任务都能引用本决策稿作为前置约束。

## 7. 后续任务依赖

```text
TASK-01
  → TASK-02 Schema / ID / Version / Migration
  → TASK-03 Harness Adapter Protocol
  → TASK-04 Initialization / Profile
  → TASK-05 Evidence Lifecycle
  → TASK-06 Workflow Graph
  → TASK-07 Quality / Token / Bloat
  → TASK-08 Memory Governance
  → TASK-09 Evolution Governance
  → TASK-10 Remote Supply Chain
  → TASK-11 Team Collaboration
  → TASK-12 Recovery / Rollout / E2E
```

## 8. 待用户确认项

本稿默认采用以下产品选择：

1. MVP 以 Git 作为团队公共基准。
2. Skill OS 本地数据库保存索引、运行证据、评分和私有覆盖，不作为团队公共真值。
3. Codex/Claude 通过 Adapter 共用项目规则，不强制单一厂商。
4. 项目写入统一采用 Preview-Confirm-Apply。
5. Workflow 第一阶段只做声明、可视化和运行观测，不做任意脚本编排引擎。

本任务已接受，后续任务必须遵守以上边界。
