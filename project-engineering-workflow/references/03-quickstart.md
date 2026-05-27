# 5 分钟接入指南

如果你想把这套工程化 workflow 接入任意项目，按下面做就够了。

## 1. 运行初始化脚本

推荐使用 npm / npx 方式：

```bash
npx @workflow-skills/project-engineering-workflow init \
  --project-name "CRM Platform" \
  --project-slug "crm-platform" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/your-repo"
```

如果是在本仓库本地调试，也可以使用 bash 脚本：

```bash
bash scripts/bootstrap-project.sh \
  --project-name "CRM Platform" \
  --project-slug "crm-platform" \
  --stack-name "React + Node.js" \
  --app-path "apps/web" \
  --test-command "pnpm test" \
  --output-dir "/absolute/path/to/your-repo"
```

可选参数：

```bash
--env-output "apps/web/.env.local"
```

## 2. 只改 4 个地方

接入后第一轮只需要检查和修改：

1. `AGENTS.md`
2. `.agents/skills/project-stack-standards/SKILL.md`
3. `.specify/memory/constitution.md`
4. `docs/Codex团队开发说明.md`

如果你时间很紧，这 4 个文件改对了，就已经能跑通第一版。

## 3. 做一次体检

使用 npm / npx：

```bash
npx @workflow-skills/project-engineering-workflow doctor \
  --output-dir "/absolute/path/to/your-repo"
```

或使用本地 bash 脚本：

```bash
bash scripts/doctor.sh /absolute/path/to/your-repo
```

看到 `Doctor passed.` 就说明目录结构已经齐了。

## 4. 开始第一个真实需求

在目标仓库里建议这样跑：

1. 先用 `$project-requirement-gate`
2. 再用 `$project-codebase-onboarding`
3. 再用 `$project-scope-impact-guard`
4. 复杂需求走 `$project-tech-solution`
5. 涉及浏览器自动化、生成资产、多代理、外部工具或定时任务时，先走 `$project-superpowers-router`
   - 长任务、多轮任务、上下文容易丢失时，再启用 `$project-gsd-router`
   - 产品、设计、工程、QA、发布判断需要分角色时，再启用 `$project-gstack-router`
6. 建 feature 工件：

```bash
bash .specify/scripts/bash/create-feature.sh login-refactor "登录流程重构"
```

7. 实现阶段使用：
   - `$project-stack-standards`
   - `$project-code-generation`
   - `$project-code-review`
   - `$project-test-and-report`

## 5. 老项目接入建议

如果是已有项目，不要一上来全量改造。

推荐顺序：

1. 先接 `AGENTS.md`
2. 再接 `.agents/skills`
3. 再接 `.specify`
4. 最后用一个真实需求去跑 `specs/`

## 6. 新项目接入建议

如果是新项目，建议在第一个大功能开始前就接入。
这样后面不会反复返工流程资产。
