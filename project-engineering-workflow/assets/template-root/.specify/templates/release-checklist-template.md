# Release Checklist - [RELEASE VERSION]

- 发布分支：`[RELEASE BRANCH]`
- 来源分支：`[SOURCE BRANCH]`
- 目标主干：`[MAIN BRANCH]`
- 标签：`[TAG NAME]`
- 日期：`[DATE]`

## 发布范围

- 本次发布包含的 feature：
- 用户可见变化：
- 是否包含流程/skill 变化：
- 是否存在 breaking change：

## 验证前置

- [ ] code review 已完成
- [ ] 测试报告已完成
- [ ] delivery summary 已更新
- [ ] release notes 已更新
- [ ] 打包或发布前验证已通过
- [ ] 远端 push / npm publish 已获得显式批准（如适用）

## 发布动作

- [ ] 创建 `release/[RELEASE VERSION]`
- [ ] 运行 `bash .specify/scripts/bash/release-doctor.sh [RELEASE VERSION]`
- [ ] 复核版本号与发布说明
- [ ] 创建标签 `[TAG NAME]`
- [ ] 合并到 `[MAIN BRANCH]`
- [ ] 推送主干与 tag

## 发布后检查

- [ ] 关键路径抽样验证
- [ ] 记录遗留风险
- [ ] 清理已完成的临时分支
