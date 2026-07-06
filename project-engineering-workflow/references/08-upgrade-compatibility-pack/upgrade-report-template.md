# Workflow 升级审阅报告模板

这个模板用于评审一次 `project-engineering-workflow upgrade` 是否应该真正执行。

推荐由 CLI 直接生成：

```bash
npx @workflow-skills/project-engineering-workflow upgrade \
  --output-dir "/absolute/path/to/target-repo" \
  --mode current \
  --dry-run \
  --write-report
```

默认报告输出到：

```text
docs/workflow-upgrade-report.md
```

也可以显式指定：

```bash
--report-out "docs/workflow-upgrade-current-review.md"
```

如果需要给上层自动流程消费结构化结果，可以额外使用：

```bash
--json
```

它会输出统一 JSON，包含：

- `decision`
- `summary`
- `actions`
- `checks`
- `recommendedCommands`

## 报告结构

1. 基本信息
   - 项目名
   - 目标目录
   - 升级模式
   - dry-run 还是正式执行
   - 是否允许覆盖已有 workflow 文件
   - 报告生成时间

2. 结论
   - 审批结论等级
   - 审批结论代码
   - 审批原因
   - 当前是否只是预演
   - 是否因为保留了差异文件而阻断 current 升级
   - 是否已经完成执行

## 审批结论等级说明

- `可直接执行`
  - 计划中没有阻断项，评审后可以直接执行正式 upgrade
- `建议先试点`
  - 适合 capabilities / templates 这种增量升级，建议先用一个 feature 做小范围验证
- `需确认覆盖`
  - 发现已有 workflow 文件与 starter 存在差异，是否覆盖需要团队先确认
- `当前阻断`
  - 典型于 `current` 模式，存在差异文件但又没有显式允许覆盖，因此命令会先拦住
- `已执行`
  - upgrade 已完成，后续重点转入 doctor 校验和真实任务试点

3. 将新增的文件
   - 本次会补进哪些 workflow 文件

4. 将覆盖的文件
   - 哪些已有 workflow 文件会被 starter 新版本刷新

5. 将保留不动的现有 workflow 文件
   - 哪些文件与 starter 有差异但本次不会自动覆盖

6. 已经与当前 starter 对齐的文件
   - 哪些目标文件无需处理

7. 明确不会触碰的范围
   - `specs/**`
   - 业务代码
   - 运行时配置
   - 基础设施文件
   - 本次 mode 未选中的 workflow 文件

8. 审阅关注点
   - 覆盖项里是否包含团队自定义规则
   - 保留项是否意味着当前项目仍有历史分叉
   - 是否只应先做 capabilities / templates 的增量试点

9. 待确认覆盖清单
   - 需要团队先确认的差异 workflow 文件
   - 或试点前需要明确的执行约束

10. 推荐命令
   - 直接可执行的下一条 dry-run / overwrite / doctor 命令

11. 下一步建议
   - 继续 dry-run 审阅
   - 执行正式 upgrade
   - 跑 doctor
   - 选一个新 feature 试点，不批量迁移历史工件
