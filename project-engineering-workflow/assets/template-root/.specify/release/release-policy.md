# __PROJECT_NAME__ Release Policy

这份策略用于约束默认分支流和发布流，避免直接在主干上开发或在未经验证的提交上打 tag。

## 默认分支模型

- 主干分支：`main`
- 功能分支：`feature/<feature-slug>`
- 发布分支：`release/<version>`
- 版本标签：`v<version>`

## 默认流程

1. 从 `main` 切出 `feature/<feature-slug>`
2. 在功能分支完成实现、review、测试和交付总结
3. 验证通过后，从当前已验证提交切出 `release/<version>`
4. 在发布分支补齐 `release-checklist.md` 和 `release-notes.md`
5. 对干净的发布提交创建 `v<version>` 标签
6. 把 `release/<version>` 合并到 `main`

## 必须满足的条件

- 未完成 code review，不得进入 release 分支
- 未完成测试报告，不得进入 release 分支
- worktree 不干净，不得打 tag 或合并 `main`
- 发布说明未更新，不得视为 release ready

## 允许的例外

- 紧急 hotfix 可以不经过完整 feature 周期，但仍应避免直接在 `main` 上无记录开发
- 如果仓库主干不是 `main`，必须在项目内显式同步本策略和相关脚本默认值

## 推荐工件

- `specs/<feature>/delivery-summary.md`
- `specs/<feature>/task-reflection.md`
- `specs/releases/<version>/release-checklist.md`
- `specs/releases/<version>/release-notes.md`

## 兼容原则

- branch/release 能力属于新增 workflow 能力
- 旧项目可以按需吸收，不要求批量重写历史 feature 工件
- 新增发布工件优先只用于新 feature 或真实 release 试点
