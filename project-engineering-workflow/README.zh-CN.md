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
  --release-version "0.3.1" \
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

给一个已经接入过的项目做安全升级，并且不碰历史 `specs/` 工件：

```bash
npx @workflow-skills/project-engineering-workflow upgrade \
  --output-dir "/absolute/path/to/your-repo" \
  --mode capabilities \
  --dry-run \
  --write-report
```

可用升级模式：

- `governance`：刷新项目级入口规则、团队说明和宪法
- `capabilities`：补齐 memory / evolution / branch-release 能力链及相关文档
- `templates`：升级未来新 feature 模板，以及 feature 分支与 release 脚本
- `current`：补齐完整 `0.3.x` 工作流线并写入 `.specify/workflow-version.txt`

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
远端 push 和 npm publish 仍然必须显式人工批准；内置 release 脚本会拒绝额外 push / publish 参数，避免把外部动作混进本地 release 准备。

生成内容包含 `AGENTS.md`、项目本地 skills、spec-kit 风格工件、记忆治理、框架进化、分支与发布治理、Superpowers 路由、GSD 状态文件、gstack 角色评审、代码审查和测试报告。

完整方案说明见仓库根目录 README。
如果你想从产品架构角度理解这套框架的内核、能力面和部署层，请看 `references/09-framework-modules-blueprint.md`。
填好的收尾示例包见 `references/06-real-task-example-pack/`。
`0.2.x` 与 `0.3.0` 的版本说明与发布清单见 `references/07-v0.2-release-pack/`。
六条主链的 onboarding 地图见生成后的 `docs/AI能力地图.md`。
向后兼容升级规则见生成后的 `docs/升级兼容策略.md` 与 `references/08-upgrade-compatibility-pack/`。
旧项目升级实操手册见 `references/08-upgrade-compatibility-pack/v0.1-to-v0.2-upgrade-manual.md` 与 `references/08-upgrade-compatibility-pack/v0.2-to-v0.3-upgrade-manual.md`。
