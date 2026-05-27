# 调校指南

这套 starter 故意保持轻量，所以你只需要调关键位。

## 必调项

### 1. `AGENTS.md`

你要确认：

- 哪类需求必须先做需求分析
- 哪类需求必须先出技术方案
- 哪些目录属于主应用
- 哪些目录属于流程资产
- 最终交付前最少要跑什么检查

### 2. `project-stack-standards`

这是最重要的项目专属 skill，建议补齐：

- 目录结构
- 命名约定
- 状态管理方式
- 接口层约束
- 配置来源
- 组件复用边界
- 最低验证命令

### 3. `constitution.md`

这里定义团队的研发底线，比如：

- 需求不确认不动代码
- 范围不锁定不扩写
- 不能跳过 review / 测试报告
- 是否统一中文输出

## 按项目类型追加的推荐 skill

### Web / 中后台

建议追加：

- `project-ui-standards`
- `project-api-contract-guard`

### Backend / Platform

建议追加：

- `project-data-safety-guard`
- `project-release-checklist`

### AI Agent / Workflow 项目

建议追加：

- `project-domain-boundaries`
- `project-superpowers-router`
- `project-gsd-router`
- `project-gstack-router`
- `project-prompt-and-tool-guard`

### Mobile / Client

建议追加：

- `project-device-verification`
- `project-release-channel-guard`

## 什么时候应该升级这套 starter

出现下面任一情况时，说明该加深工程化了：

- 项目开始多人协作并频繁并行改动
- 需求经常改到一半才发现范围不清
- AI 生成代码经常越权或乱扩写
- 测试和交付说明经常缺失
- 新人接手项目要靠口口相传

这时建议把项目特有规则继续沉淀进 `.agents/skills`，而不是把所有内容都塞回 `AGENTS.md`。
