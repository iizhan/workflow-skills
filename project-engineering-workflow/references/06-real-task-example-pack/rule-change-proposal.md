# Final Output Protocol Rule Change Proposal

## Meta

- Feature: `final-output-protocol`
- Date: `2026-06-01`
- Related Request: `给这套框架加一个任务结束时的标准中文输出 schema`
- Candidate Status: `approved`
- Prefill Status: `drafted`
- Confidence Summary: `high` because the trigger was repeated and the file targets were small and clear

Use these markers while drafting:

- `[auto]`: directly supported by task evidence
- `[inferred]`: synthesized from multiple signals
- `[needs confirmation]`: still requires user review

## Trigger Signal

Describe the repeated signal that triggered this proposal:

- repeated user choice: `[auto]` 用户多次要求把框架能力落成正式模板和协议，而不是只停留在说明文字
- repeated failure or review finding: `[auto]` 最终中文交付总结没有统一 schema，导致验证结果、用户选择和后续建议表达不稳定
- repeated workflow friction: `[auto]` 内部复盘、记忆候选、规则候选已有结构，但缺少面向用户的最终收口文档
- other evidence: `[inferred]` 如果继续只靠 `project-test-and-report` 的简短输出格式，后续团队复用会产生风格漂移

## Problem Statement

`[auto]` 当前 workflow 已经有测试报告、任务复盘和规则提案，但缺少一个固定的用户侧中文交付总结 schema，导致“本次完成了什么、验证是否通过、用户做了什么选择、还有哪些后续确认项”无法稳定地在每次任务结束时被表达出来。

## Proposed Change

### Promotion Level

Choose one:

- `session`
- `memory_policy`
- `skill_rule`
- `workflow_rule`
- `constitution_rule`
- `template_rule`

Current draft: `[inferred]` `skill_rule` + `template_rule`

### Change Summary

`[auto]` 为任务结束阶段新增 `delivery-summary.md` 和 `final-output-protocol.md`，并将其接入 `project-test-and-report`、feature 初始化脚本、状态模板与主流程说明，使用户侧最终交付总结成为标准 workflow 资产。

### Affected Files

- `[auto]` `.agents/skills/project-test-and-report/SKILL.md`
- `[auto]` `.specify/templates/delivery-summary-template.md`
- `[auto]` `.specify/memory/final-output-protocol.md`
- `[auto]` `.specify/scripts/bash/create-feature.sh`
- `[auto]` `.specify/templates/workflow-state-template.yaml`
- `[auto]` `AGENTS.md`

## Evidence

List the strongest evidence that this is not a one-off issue:

1. Session or task evidence: 在连续几轮框架演进中，已经分别补了 reflection、memory、evolution、proposal schema，但最终对用户输出仍没有对应模板。
2. User feedback: 用户明确要求“给这套框架加一个任务结束时的标准中文输出 schema”。
3. Review or test evidence: smoke feature 初始化能够验证模板是否生成，但在没有最终输出模板时，无法验证用户侧收尾结构是否完整。
4. Previous workaround or repeated manual fix: 之前只能靠 agent 在最终回复里手动拼接“完成项 + 验证 + 风险 + 后续”，没有固定工件承接。

## Expected Benefit

- what failure or friction should be reduced: 减少每次任务收尾时格式不一致、遗漏验证或遗漏用户选择说明的问题
- what quality or speed should improve: 提高最终交付可读性和团队复用效率
- who benefits: 直接受益者是用户和后续接手同类任务的 agent/团队成员

## Validation Plan

- `doctor`: 检查新模板和协议已纳入 starter 完整性验证
- smoke bootstrap: 检查新项目初始化后是否包含 `delivery-summary.md` 与 `final-output-protocol.md`
- focused realistic task: 用一个 feature 级 smoke task 验证最终中文交付总结工件是否生成
- manual review path: 检查 `project-test-and-report` 的 report format 是否与最终输出协议一致
- unvalidated areas: 暂未验证自动回填真实执行结果到 `delivery-summary.md`

## Rollback Plan

- how to revert the rule: 删除 `delivery-summary-template.md`、`final-output-protocol.md` 以及相关 starter 接线，回退到原有 `project-test-and-report` 简要输出
- what signal means the rule should be rolled back: 如果团队认为额外工件显著增加负担，却没有提升交付清晰度或复用性
- what can remain as memory only if rollback happens: “最终交付应同时覆盖完成项、验证、风险和后续确认” 这一经验可以保留为 `agent_self` 或 `team_shared` 记忆

## User Confirmation

- decision: approved
- notes: 用户明确同意继续把最终中文输出 schema 正式接入框架
- approved scope: starter 模板、协议、skill 说明、feature 初始化、状态模板与文档同步

## Validation Result

- status: validated
- evidence: `doctor` 通过；`smoke` 通过；feature 初始化确认生成 `delivery-summary.md`、`final-output-protocol.md` 与更新后的 `workflow-state.yaml`
- residual risks: 自动回填仍未脚本化，当前更多是“规范化”和“模板化”，不是“全自动化”
