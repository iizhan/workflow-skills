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
  --output-dir "/absolute/path/to/your-repo"
```

生成内容包含 `AGENTS.md`、项目本地 skills、spec-kit 风格工件、Superpowers 路由、GSD 状态文件、gstack 角色评审、Codex / Claude Code 适配说明、代码审查和测试报告。

workflow 变更通过仓库里的 `evaluations/skills-workflow` 验证。有效的 skill 升级不只看是否命中，还要看路由精度、任务结果、安全范围、验证强度、摩擦成本、输出清晰度、可维护性和学习闭环。

token 成本通过评估目录里的 token economics 模板和估算脚本记录。最终 A/B 判断优先使用真实 provider usage metadata。

完整方案说明见仓库根目录 README。
