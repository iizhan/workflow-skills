# __PROJECT_NAME__ Memory Store

这个目录用于存放 durable memory 与其索引，不用于存放模板规则本身。

设计目标：

- 把“记忆数据”和“workflow 模板/skill”分层
- 避免 starter 升级直接覆盖用户已有记忆
- 让下次会话优先读轻索引，而不是扫描大量 Markdown

## 目录结构

- `schema-version.json`
  - 记忆存储层自己的 schema 版本
- `index.json`
  - 轻量检索索引，只放摘要与路由字段
- `users/<user_id>/memories.jsonl`
  - 用户私有 durable memory
- `shared/memories.jsonl`
  - 团队共享 durable memory
- `agent/evolution.jsonl`
  - agent 自我进化相关 durable memory
- `archive/`
  - 归档或过期记忆

## 读取原则

默认读取顺序：

1. 当前会话上下文
2. `index.json`
3. 命中的少量 memory record

禁止默认全量扫描 `users/`、`shared/`、`agent/` 下全部正文。

## 数据角色

Memory record 可以带 `data_role` 字段，用来区分信息性质和默认治理策略：

- `account_reference`: 账号标签或非密钥 ID，不得包含密码、Token、OTP、Cookie 或 API Key
- `infrastructure_reference`: 服务器名、服务器路径、本地路径、环境标签或非密钥 URL
- `development_workflow`: 开发习惯、测试循环、首选 harness、视觉 QA 或发布习惯
- `verification_evidence`: 命令结果、截图路径、UI 报告路径或剩余风险，通常只保留在任务会话
- `blocked_sensitive`: 不应持久化的敏感信息，只记录阻止原因

完整枚举见 `.specify/memory/memory-policy.md` 和 `memory-record.schema.json`。

## 索引重建

当 durable memory 有新增、归档、撤销或人工修复后，使用：

```bash
project-engineering-workflow memory-index --output-dir "/absolute/path/to/repo"
```

这条命令会：

- 扫描约定好的 JSONL durable memory 源文件
- 重建 `index.json`
- 保持 memory record 正文不被静默改写
- 在记录损坏、scope 冲突或重复 `id` 时直接失败

`index.json` 里的 `path` 会指向类似 `users/<user_id>/memories.jsonl#L12` 的轻定位信息，方便后续只读取命中的少量记录。

## 升级兼容原则

- minor 版本只允许新增字段
- 不允许在 minor 版本中删除旧字段或修改旧字段语义
- starter 升级可以重建索引，但不应静默重写 durable memory 正文
- durable memory 文件属于用户/项目数据，不属于模板覆盖范围
