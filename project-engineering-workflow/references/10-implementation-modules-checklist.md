# Implementation Modules Checklist

这份清单是在 `09-framework-modules-blueprint.md` 基础上的实施版。

目的不是再解释概念，而是回答三个问题：

1. 这个模块是否已经存在
2. 它的稳定边界是什么
3. 下一步优先建设什么

## 一、模块总表

| 模块 | 状态 | 当前落点 | 稳定边界 | 下一步 |
| --- | --- | --- | --- | --- |
| Core Workflow Module | 已有 | `AGENTS.md` + 基础 skills + templates | requirement -> scope -> solution -> implement -> review -> test | 补最小验收路径示例 |
| Memory Governance Module | 已有运行基础版 | `project-memory-router` + `memory-policy.md` + `.specify/memory-store/*` + `memory-index` | 记忆分域、生命周期、索引优先、durable memory 分层 | 补 candidate 写入器和归档器 |
| Evolution Governance Module | 已有基础版 | `project-evolution-router` + evolution policy + rule proposal | 经验 -> 提案 -> 验证 -> 回滚 | 补提案状态机和 evidence schema |
| Branch And Release Governance Module | 已有基础版 | `project-branch-release` + `.specify/release/*` + branch/release scripts | `feature/* -> release/* -> tag -> merge main` | 补发布 doctor 和 remote push guard |
| Execution Augmentation Module | 已有 | superpowers / GSD / gstack routers | 增强执行不绕过项目规则 | 补能力调用回收约束 |
| Compatibility And Migration Module | 已有基础版 | `doctor` / `upgrade` / `json` / `report` | 旧项目兼容、dry-run、审批、可选升级 | 补 memory-store migration helper |
| Capability Surfaces Layer | 部分具备 | 单一 skill 内部多入口 | bootstrap / doctor / upgrade / memory / evolution 语义边界 | 形成正式 surface 清单 |
| Deployment Profiles Layer | 已有雏形 | 单 skill + 全局安装方式 | 分发策略不反向主导框架 | 补 single/split/managed profile 文档 |

## 二、模块实施定义

### 1. Core Workflow Module

#### 当前范围

- 需求确认
- 代码库 onboarding
- 范围锁定
- 技术方案
- 实现
- 审查
- 测试与汇报

#### 稳定边界

- 不负责 durable memory 存储
- 不负责规则提案升级
- 不负责宿主安装方式

#### 当前完成度

- 已经可用
- 已经能生成 starter
- 已经能形成完整交付主链

#### 下一步

- 增加一个最小真实项目接入样例
- 明确 `spec -> plan -> tasks -> delivery` 的最短通路

### 2. Memory Governance Module

#### 当前范围

- 记给谁
- 记什么
- 记多久
- 怎么取
- durable memory 存储分层

#### 稳定边界

- 规则层：`.specify/memory/*`
- 数据层：`.specify/memory-store/*`
- 会话层：`workflow-state.yaml`

#### 当前完成度

- policy 已定义
- router 已定义
- storage schema 已定义
- index 分层已定义
- `memory-index` 已可运行

#### 当前缺口

- 没有 candidate -> durable record 的标准写入器
- 没有归档器

#### 下一步

1. `memory-record-writer`
2. `memory-archive-rotator`
3. retrieval adapter / recall contract

### 3. Evolution Governance Module

#### 当前范围

- 从会话经验中提取规则候选
- 判断升级层级
- 形成 rule-change proposal

#### 稳定边界

- 不直接静默改框架
- 不把 evolution 伪装成普通 memory

#### 当前完成度

- 路由规则已存在
- policy 已存在
- proposal 模板已存在

#### 当前缺口

- 没有统一的 proposal 状态字段
- 没有结构化 evidence schema
- 没有“验证通过后如何落回核心资产”的标准动作

#### 下一步

1. 增加 proposal lifecycle 定义
2. 增加 evidence schema
3. 明确 evolution updates 如何写回

### 4. Execution Augmentation Module

#### 当前范围

- 浏览器自动化
- 资产生成
- 长任务编排
- 角色化判断

#### 稳定边界

- 所有增强能力只能通过 router 进入
- 所有结果必须回收到主交付链

#### 当前完成度

- router 入口已存在
- 原则已定义

#### 当前缺口

- 还缺“增强能力调用后的标准回收格式”

#### 下一步

- 增加 augmentation result contract

### 5. Branch And Release Governance Module

#### 当前范围

- tracked work 默认切 `feature/*`
- release 分支准备
- tag 创建
- merge `main`
- 发布工件落盘

#### 稳定边界

- 不强绑某个 CI 平台
- 不替代项目自己的业务测试
- 不静默 push 远端

#### 当前完成度

- 分支与发布 skill 已存在
- feature / release / finalize 脚本已存在
- release policy 与模板已存在

#### 当前缺口

- 没有 remote push guard
- 没有 release-specific doctor
- 没有 hotfix 流补充规则

#### 下一步

1. `release-doctor`
2. remote push / publish guard
3. hotfix branch contract

### 6. Compatibility And Migration Module

#### 当前范围

- doctor
- upgrade
- dry-run
- report
- json / json-out
- 旧项目兼容

#### 稳定边界

- 不批量改旧 `specs/*`
- minor 升级默认增量
- durable memory 不静默重写

#### 当前完成度

- 已有 doctor
- 已有 upgrade
- 已有审批结论
- 已有结构化输出
- 已有 memory index rebuild 命令

#### 当前缺口

- memory-store 专项迁移 helper 还没有

#### 下一步

1. `memory-store-doctor`
2. `memory-store-migrate`
3. `memory-store-index-verify`

## 三、能力面层实施建议

当前不建议先拆实现，先拆语义。

建议先明确 6 个 surface：

- `bootstrap surface`
- `audit surface`
- `upgrade surface`
- `memory surface`
- `evolution surface`
- `branch / release surface`

每个 surface 需要定义：

- 触发条件
- 输入最小集合
- 输出最小集合
- 明确不负责什么

## 四、部署层实施建议

部署层先做 profile，不先做大拆分。

### Profile A. Single Entry

- 适合当前阶段
- 优点是维护简单
- 风险是语义容易变宽

### Profile B. Split Entry

- 适合框架稳定后
- 先拆 bootstrap 和 upgrade/audit

### Profile C. Managed Integration

- 适合接自动审批、记忆系统、UI 面板
- 核心依赖 `json` 和 `json-out`

## 五、推荐建设顺序

建议按下面顺序推进，而不是同时开太多口子：

1. Memory Governance 补 candidate writer
2. Branch/Release Module 补发布 guard
3. Compatibility Module 补 memory-store 迁移能力
4. Evolution Module 补状态机和 evidence schema
5. Capability Surfaces 正式化

## 六、当前最值得做的三个具体实现

### 1. memory-record-writer

目的：

- 把用户确认过的 memory candidate 写入正确的 durable store

价值：

- 让 memory 从“文档规则”进入“可运行能力”

### 2. release-doctor

目的：

- 单独检查 release 分支、release 工件、tag 前置条件是否健康

价值：

- 让发布前阻断比人工记忆更稳定

### 3. memory-store-doctor

目的：

- 单独检查 memory-store schema、index、record 路径是否健康

价值：

- 让 memory-store 问题在主 workflow 之外也能被快速定位

### 4. proposal lifecycle + evidence schema

目的：

- 给 evolution proposal 一个稳定状态机和证据结构

价值：

- 让“总结 -> 提案 -> 验证 -> 升级”形成真正闭环
- 把 memory compatibility 变成独立可审计模块

## 七、一句话结论

当前这套框架已经从“概念蓝图”进入“模块化雏形”阶段。

接下来最应该做的不是继续扩词，而是：

> 把 Memory Governance 和 Compatibility Module 先补成真正可运行的基础设施。
