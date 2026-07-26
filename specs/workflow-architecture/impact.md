# 影响范围：Workflow 架构与注册协议

**功能标识**: `workflow-architecture`  
**日期**: 2026-07-22  
**需求/设计/影响版本**: v1 / v1 / v1  
**影响等级**: high  
**确认状态**: TASK-WF-01 to TASK-WF-06 accepted; TASK-WF-07A implemented with no-side-effect E2E verification, pending user acceptance

## 1. 直接影响

| 范围 | 影响 | 风险与控制 |
| --- | --- | --- |
| Workflow 声明 | 现有 `TASK-06` Schema 扩展为兼容的 1.1 声明 | 旧版本只读投影，禁止静默迁移 |
| 工程模板 | 新增模板/绑定/质量策略/Loop Policy 规范 | 保持现有 `AGENTS.md` 与 Skill 路由为权威治理层 |
| 项目绑定 | 新增 Template 与 Project Binding 的稳定身份和版本锁定 | 启用前预览，原子切换，保留回滚点 |
| 桌面端注册表 | 需要能索引 Workflow Template、Binding、Manifest Validation 状态 | 数据库迁移版本化，失败保持上一个有效投影 |
| Session Trace | Workflow Run 与 Scenario Loop Run 需要关联 | 精确/推断继续区分，不保存未授权原文 |
| 图谱与评测 | 声明、实跑、差异和 Loop 统计需要统一身份 | 大图懒加载，聚合异步进行 |

## 2. 间接影响

- Role Workflow、Scenario Workflow、Skill 元数据与项目 Profile 的路由逻辑。
- Bundle 导入/导出、远程 Workflow 来源、签名、依赖与许可证校验。
- 版本升级、旧客户端共存、备份/恢复和灾难回退流程。
- 桌面端导航：新增独立工作流库，不能将其混入现有技能库的本地/远程技能列表。
- 使用说明、项目安装器、Doctor 检查和演示/评测用例。

## 3. 数据与迁移

- 新对象：Workflow Template、Template Version、Project Workflow Binding、Scenario Loop Run、Loop Iteration、Quality Evaluation。
- 现有对象：`workflow_definitions`、`workflow_versions`、`workflow_runs`、`workflow_node_runs`、Trace Span/Event 需要可选外键或关联字段。
- 新 Schema 与旧客户端共存时，旧客户端进入只读兼容模式；不得写入未知字段或激活新版本。
- 所有迁移遵循既有备份、影子迁移、验证、原子切换与回滚协议。
- 原始日志、会话摘要和记忆不因 Workflow 升级而复制或跨项目共享。

## 4. 接口、权限与安全

- IPC/API 未来会增加 Workflow 列表、Manifest 校验、绑定预览、绑定应用、版本升级预览和 Loop 查询接口。
- 第一期不增加任意脚本执行 IPC；真正执行仍通过已授权 Harness。
- Manifest 禁止动态命令、`eval`、未声明 Prompt 和越界目录引用。
- 项目覆盖层不能增加权限、放宽 Loop 上限到无限或移除确认/验证门禁。
- 远程 Workflow 在后续任务中复用远程 Skill 的签名、来源白名单、脚本扫描、依赖冲突和最小权限策略。

## 5. 兼容性、性能与资源

- `TASK-06` 旧声明保持可读，激活图仍保持 DAG；Loop 作为 Run 上层容器，避免破坏图渲染器和既有稳定节点身份。
- 运行时只按项目加载候选 Manifest 元数据；Skill 内容和大图节点按需读取。
- Loop 的 Token、时间和并发预算独立于后台监控。默认限制为每场景三轮、同根因两种策略。
- 会话和事件存储遵循既有冷/热归档、隐私清除和数据保留策略。

## 6. 测试影响

- Manifest 解析、Schema、版本范围、依赖图、权限白名单和 Loop 上限的单元测试。
- 旧 `TASK-06` Manifest 兼容测试与迁移/回退测试。
- 前端还原、后端 API、Swagger 联调和不适用请求的路由样例测试。
- Loop 收敛、范围扩大、预算耗尽、重复策略、人工停止和证据置信度测试。
- 桌面端可视化与交互测试：工作流库、项目绑定、升级预览、流程图、脑图、运行时间线。

## 7. 发布与回滚

- 先以 Feature Flag 提供只读发现和校验，不自动启用已有项目。
- 项目升级前创建绑定/声明/配置备份，并保留上一个激活版本。
- 出现 Manifest 无法解析、版本不兼容、静态校验失败、运行证据错配或性能阈值超标时，禁用新绑定并回退到旧声明。
- 首个正式场景在隔离试点项目运行，达标后再推荐给其他已绑定项目。

## 8. 明确不影响

- 不改变用户已绑定项目的业务代码、源代码目录或现有 Git 历史。
- 不将项目目录扩大为全电脑扫描范围。
- 不自动迁移、删除、共享用户会话原文或长期记忆。
- 不承诺任何 Harness 立即支持桌面端直接启动 Workflow。

## 9. 未知项与验证方式

| 未知项 | 风险 | 验证方式 |
| --- | --- | --- |
| Codex/Claude 可提供的精确 Workflow 节点事件范围 | 运行图可能只能推断 | 通过 Adapter 受控事件试点，保留精确/推断标识 |
| 安装器可安全写入哪些项目声明文件 | 自动绑定可能失败 | 先实现 Preview-Confirm-Apply，并以备份/回退验证 |
| 大量 Template 的索引与图谱性能 | UI 延迟、内存上涨 | 建立规模化 fixture，测量首屏、搜索、展开和刷新 |
| 90 分评分的场景差异 | 分数可能不可信 | 每个场景单独定义评分策略、样例和人工校准 |

## 10. 当前实施边界

- 本次已落地的包括声明协议、静态验证、模板资产、CLI/Doctor、旧声明只读兼容，以及桌面端主进程中的 Template 索引、Binding 预览/确认/原子写入/回读验证、版本回滚快照和 Scenario Loop Run 状态/迭代记录。
- 桌面端 Binding/Loop 可视化与 Manifest 组合流程图/脑图已交付；Harness 自动执行仍属于后续任务，尚未被提前启用或写入任何业务项目。
- 受控 Harness JSONL 事件可补充精确的 Adapter/Harness、Workflow 节点与 Skill 调用证据；导入前校验隐私声明，任何原文存储声明都会阻断写入。
- 项目详情的运行监控新增 Adapter 就绪诊断；它只读取工作流 Doctor、本地 Codex 会话来源和 Trace 摘要，不修改项目、Hook 或全局 Codex 配置。
