# Project Engineering Workflow

这是 [Workflow Skills](../README.zh-CN.md) 的 npm CLI 包。

它用于快速给任意项目接入一套可复用的工程化 AI 协作底座：

```bash
npx @workflow-skills/project-engineering-workflow init \
  --project-name "CRM Platform" \
  --project-slug "crm-platform" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/your-repo"
```

检查生成后的项目：

```bash
npx @workflow-skills/project-engineering-workflow doctor \
  --output-dir "/absolute/path/to/your-repo" \
  --json \
  --json-out "docs/workflow-doctor.json"
```

如果项目已经采用受治理的分支与发布流，可以在任何远端 push / publish 之前做一次发布体检：

```bash
npx @workflow-skills/project-engineering-workflow release-doctor \
  --output-dir "/absolute/path/to/your-repo" \
  --release-version "0.7.0" \
  --json \
  --json-out "docs/workflow-release-doctor.json"
```

如果项目已经接入 durable memory，可以重建轻量索引，但不会改写 memory record 正文：

```bash
npx @workflow-skills/project-engineering-workflow memory-index \
  --output-dir "/absolute/path/to/your-repo" \
  --json \
  --json-out "docs/workflow-memory-index.json"
```

在推荐或启用项目本地 Workflow 前，先校验声明、依赖、Skill 引用、质量门禁和 Loop 上限：

```bash
npx @workflow-skills/project-engineering-workflow workflow-validate \
  --output-dir "/absolute/path/to/your-repo" \
  --json \
  --json-out "docs/workflow-manifest-validation.json"
```

给一个已经接入过的项目做安全升级，并且不碰历史 `specs/` 工件：

```bash
npx @workflow-skills/project-engineering-workflow upgrade \
  --output-dir "/absolute/path/to/your-repo" \
  --mode capabilities \
  --dry-run \
  --write-report
```

可用升级模式：

- `governance`：刷新项目级入口规则、任务分级/确认/影响 Skill、团队说明和宪法
- `capabilities`：补齐 memory / evolution / branch-release 能力链及相关文档
- `templates`：升级未来新 feature 的需求、影响、计划、任务、验证模板，以及 feature 分支与 release 脚本
- `current`：补齐完整当前工作流线并写入 `.specify/workflow-version.txt`

`upgrade` 默认只补缺失文件、保留已有 workflow 文件，不会静默重写旧内容。只有在看过 dry-run 结果后，才建议显式加 `--overwrite-existing`。
如果希望顺手产出一份可评审文档，可以追加 `--write-report`，默认写到 `docs/workflow-upgrade-report.md`。
升级计划还会给出明确结论等级：`可直接执行`、`建议先试点`、`需确认覆盖`、`当前阻断`、`已执行`。
如果要给上层 skill、UI 或自动审批程序消费结构化结果，可以追加 `--json`。
如果还希望直接把结果落盘审计，可以追加 `--json-out`。
`doctor --json` 会返回结构化兼容状态，覆盖基础缺失、可升级、当前线不完整、完整通过这几类结果。
`release-doctor --json` 会返回结构化发布健康度，包括分支/工件阻断项、git 状态和远端动作 guard 状态。
`memory-index` 只扫描约定好的 JSONL durable memory 源文件，重建 `.specify/memory-store/index.json`，遇到坏记录或重复 ID 会直接失败并保持原索引不被静默改写。
如果项目还没接入 `.specify/memory-store`，先通过 `--mode capabilities` 补齐能力链。
`0.3.x` 还新增了受治理的 git flow：默认跟踪型开发走 `feature/* -> release/* -> v<version> -> merge main`。
`0.4.x` 新增 `fast / standard / controlled` 自适应任务通道、版本化确认门禁、完整影响范围、范围变化暂停机制，以及“事项/影响 → 验证证据 → 用户验收”闭环。
`0.5.x` 新增后端和前端两条完整角色 Workflow。每条都覆盖需求到交付，但只按已确认的变更面加载架构、接口、数据、运行时、体验、无障碍、性能和测试引用。
`0.6.x` 新增项目 Profile、架构摘要、已确认决策记忆和证据指纹。首次分析后，后续任务复用新鲜上下文，只有证据变化时才按范围刷新。
`0.7.x` 新增正式实现前的方案确认闭环：设计方案、任务拆解、影响范围、验收与自测计划统一版本化；中途发生实质范围变化时暂停并重新确认，完成后进行影响范围自查并等待用户验收。
`0.8.x` 新增可版本化的 Workflow Template、项目本地声明、单主场景路由、有界 Scenario Loop Engineering 和静态 Manifest 校验。`0.8.1` 进一步新增“工程功能交付”场景，用于不以设计稿或 API 契约为起点的普通功能、修复与重构。`0.8.2` 明确 Codex 项目会话是唯一的 Loop 执行入口：确认方案包后由同一会话启动并写入项目任务证据；桌面端只读取和展示已导入证据。声明图保持 DAG；修复通过有限迭代记录，不允许任意脚本或无限重试。
远端 push 和 npm publish 仍然必须显式人工批准；内置 release 脚本会拒绝额外 push / publish 参数，避免把外部动作混进本地 release 准备。

生成内容包含 `AGENTS.md`、项目本地 skills、spec-kit 风格工件、记忆治理、框架进化、分支与发布治理、Superpowers 路由、GSD 状态文件、gstack 角色评审、后端/前端角色 Workflow、默认开发规范、前端栈规范、Codex / Claude Code 适配说明、安全审查、分阶段验证、代码审查和测试报告。

workflow 变更通过仓库里的 `evaluations/skills-workflow` 验证。有效的 skill 升级不只看是否命中，还要看路由精度、任务结果、安全范围、验证强度、摩擦成本、输出清晰度、可维护性和学习闭环。

token 成本通过评估目录里的 token economics 模板和估算脚本记录。最终 A/B 判断优先使用真实 provider usage metadata。

完整方案说明见仓库根目录 README。
如果你想从产品架构角度理解这套框架的内核、能力面和部署层，请看 `references/09-framework-modules-blueprint.md`。
填好的收尾示例包见 `references/06-real-task-example-pack/`。
`0.2.x` 至 `0.6.x` 的版本说明与发布清单见 `references/07-v0.2-release-pack/`。
六条主链的 onboarding 地图见生成后的 `docs/AI能力地图.md`。
向后兼容升级规则见生成后的 `docs/升级兼容策略.md` 与 `references/08-upgrade-compatibility-pack/`。
旧项目升级实操手册见 `references/08-upgrade-compatibility-pack/v0.1-to-v0.2-upgrade-manual.md` 与 `references/08-upgrade-compatibility-pack/v0.2-to-v0.3-upgrade-manual.md`。
`0.3.x` 升级到自适应确认流程见 `references/08-upgrade-compatibility-pack/v0.3-to-v0.4-upgrade-manual.md`。
`0.4.x` 升级到前端/后端角色 Workflow 见 `references/08-upgrade-compatibility-pack/v0.4-to-v0.5-upgrade-manual.md`。
`0.5.x` 升级到项目 Profile 见 `references/08-upgrade-compatibility-pack/v0.5-to-v0.6-upgrade-manual.md`。
`0.6.x` 升级到方案确认闭环见 `references/08-upgrade-compatibility-pack/v0.6-to-v0.7-upgrade-manual.md`。
`0.7.x` 升级到 Workflow Template 与 Loop Engineering 见 `references/08-upgrade-compatibility-pack/v0.7-to-v0.8-upgrade-manual.md`。
