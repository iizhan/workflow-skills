# __PROJECT_NAME__ Spec Constitution

## Core Principles

### I. 需求先确认

所有进入实现阶段的需求，必须先完成中文需求分析并得到明确确认。
在确认之前，不允许修改代码、配置、脚本、模板、流程文档或生成物。

### II. 范围先锁定

进入技术方案和实现前，必须先反馈本次建议锁定范围。
至少说明直接影响、可能联动、范围外风险。
如果实现过程中需要扩大范围，必须暂停并再次确认。

### III. 遵循现有技术栈

实现必须遵循 `__STACK_NAME__` 与 `__APP_PATH__` 的实际约定。
如仓库存在配置源文件与生成配置文件，必须明确二者关系，不允许绕过现有配置链路。

### IV. 先最小实现，再验证交付

优先选择最小安全改动，避免无授权的大范围重构。
交付前必须提供与改动规模匹配的验证结果。

### V. 流程资产与业务资产分层维护

流程资产与业务资产必须分层维护：

- 流程资产：`AGENTS.md`、`.agents`、`.specify`、`specs`、`docs`
- 业务资产：应用代码、配置文件、运行脚本、基础设施文件

## Workflow Gates

### Gate 1：需求分析

- 先走 `$project-requirement-gate`
- 有重大歧义时暂停，不直接动手

### Gate 2：代码库摸底

- 进入陌生模块前走 `$project-codebase-onboarding`
- 先找真值、边界和复用点，再做修改

### Gate 3：范围锁定

- 先走 `$project-scope-impact-guard`
- 未锁范围，不进入大规模实现

### Gate 4：方案与实现

- 复杂任务走 `$project-tech-solution`
- 实现阶段遵循 `$project-stack-standards` 与 `$project-code-generation`

### Gate 5：交付收口

- 交付前至少经过 `$project-code-review`
- 最终输出必须经过 `$project-test-and-report`

## Governance

- 以中文输出需求分析、范围评估、测试报告和交付说明。
- 当团队流程、技术栈、主应用目录或交付要求变化时，必须同步更新：
  - `AGENTS.md`
  - `.agents/skills/*`
  - `.specify/templates/*`
  - `docs/Codex团队开发说明.md`
