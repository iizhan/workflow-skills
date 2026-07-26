# TASK-10 远程 Skill / Workflow 供应链安全协议

## 1. 文档状态

- 任务：`TASK-10`
- 版本：`1.0.0`
- 状态：`accepted`
- 接受时间：`2026-07-14`
- 影响等级：`critical`
- 前置任务：`TASK-01` 至 `TASK-09`
- 目标：定义远程 Skill、Workflow Bundle 和目录源的来源校验、版本固定、恶意内容检查、许可证、依赖冲突、最小权限、激活、更新和撤销流程。

本任务只定义准入和供应链边界，不立即下载、执行或激活任何新的远程 Skill。

## 2. 风险边界

远程 Skill 本质上是不受当前项目控制的外部内容。即使它只是 `SKILL.md` 或 Prompt，也可能诱导 Harness 执行命令、读取文件、上传数据或修改项目。当前桌面端已有“远程候选先导入为 inactive、激活前预览”的基础，但仍需补齐：

- 源码/归档是否完整、是否被篡改；
- 发布者、版本、提交和许可证是否可追溯；
- 内部脚本、命令、安装钩子、二进制和符号链接风险；
- 与本地 Skill/Workflow 的重名、依赖、规则和权限冲突；
- 激活后 Harness 是否真正能提供声明的沙箱和最小权限；
- 远程更新是否会静默替换当前正在使用的版本。

## 3. 总体原则

1. **先获取元数据，再获取内容**：预检阶段不执行远程文件中的任何代码或命令。
2. **候选与激活分离**：导入本地副本不等于可加载，更不等于已运行。
3. **版本不可漂移**：激活绑定不可变提交、归档摘要或内容指纹，不能只绑定 `main/latest`。
4. **默认最小权限**：远程能力没有项目文件、网络、进程、写入和秘密访问权，除非目标 Harness 明确支持并经单独确认。
5. **不可信内容可查看，不可隐式执行**：检查失败可以展示原因，但不能绕过阻断进入 Workflow。
6. **证据完整**：每个准入结果必须保留源、版本、哈希、检查、批准人、范围和时间。
7. **更新是新候选**：远程源变化生成新版本和差异，不原地覆盖 active 版本。
8. **供应链判断不等于质量保证**：安全通过只表示准入风险达到策略要求，不代表 Skill 一定高质量或适合当前项目。

## 4. 支持的来源与信任策略

来源类型：

- `bundled_catalog`：随应用发布的本地目录元数据；
- `github_repository`：固定仓库和不可变提交；
- `signed_archive`：带摘要和签名的归档包；
- `team_registry`：未来由团队治理的受控目录；
- `local_bundle`：用户选择的本地 Bundle，仍需完整校验。

默认策略：

- 只允许 HTTPS；
- GitHub/团队目录需要 allowlist 或用户显式输入并确认；
- 源站、重定向域名、下载地址和实际提交必须分别记录；
- `latest`、浮动分支和未固定 tag 只能作为预览来源，不能直接激活；
- 受阻域名、恶意样本、重复撤销版本进入 blocklist；
- allowlist/blocklist 的变更本身需要审计和版本。

## 5. 准入流水线

```text
source request
  → normalize URL / source identity
  → source policy and redirect check
  → fetch metadata without execution
  → pin revision and calculate digest
  → unpack into quarantine
  → inventory files and permissions
  → scan scripts / commands / binaries / secrets
  → validate manifest, license and dependencies
  → compare local conflicts and project compatibility
  → run static quality / bloat preflight
  → create inactive candidate
  → activation preview
  → user confirms scope and permissions
  → activate exact candidate
  → verify and record
```

任一步骤失败都保留候选状态和非敏感摘要，但不把内容加入可加载 Skill Registry。

## 6. 来源与完整性检查

至少检查：

- URL scheme、域名、重定向和证书错误；
- owner/repository/revision 是否可解析；
- commit/tag/archive digest；
- 下载内容 checksum、归档路径穿越和重复文件；
- 文件名、大小、总解压大小和目录深度；
- symlink 是否指向归档外部；
- manifest、Skill 入口和 Workflow schema；
- 发布版本、时间、变更摘要和上游撤销信号；
- 签名/证明是否存在、是否可信、是否与 digest 匹配。

签名不可验证时可以按项目策略进入 `review_required`，但不能标记为 `verified`。本地 MVP 不得把“GitHub 可访问”当成签名或可信发布证明。

## 7. 恶意内容与脚本检查

预检扫描以下信号：

- `child_process`、`spawn`、`exec`、Shell/Python/PowerShell 命令；
- 安装脚本、postinstall、构建脚本和动态下载；
- 网络访问、上传、外部 webhook、隐蔽遥测；
- 读取用户目录、SSH、浏览器、Credential、`.env` 和密钥路径；
- 删除、覆盖、chmod、修改 PATH 或全局配置；
- 二进制、可执行文件、动态库和编码/混淆内容；
- 隐藏文件、路径穿越、超大文件和压缩炸弹特征；
- Prompt 中要求绕过确认、忽略安全规则或扩大权限的指令。

扫描结果分为：

- `pass`：未发现策略阻断信号；
- `warn`：需要人工理解或 Harness 能力确认；
- `block`：不允许导入/激活。

静态扫描不是完整沙箱。若目标 Harness 不支持最小权限或执行隔离，界面必须明确显示“无法由 Skill OS 强制隔离”，而不是宣称安全执行。

## 8. 许可证、依赖与本地冲突

准入必须展示：

- SPDX/许可证名称、文件位置和识别置信度；
- 是否允许当前项目/团队使用、修改、再分发；
- 依赖名称、版本范围、来源和已知冲突；
- 与本地 Skill 的 canonical name、路径、版本和规则重名；
- 与当前 Workflow 节点、权限和输入输出 schema 的冲突；
- 是否会改变现有路由优先级或覆盖 `AGENTS.md` 入口。

重名不等于可覆盖。默认策略是生成冲突预览，由用户选择新名称、保留本地版本或进入手动合并。远程内容不能直接替换项目现有 Skill。

## 9. 最小权限与激活

候选 manifest 可以声明所需能力，但权限不是自动授予：

```yaml
permissions:
  project_read: false
  project_write: false
  shell_execute: false
  network: false
  secrets: false
  external_process: false
```

激活预览必须显示：

- 目标项目、Workflow 和 Harness；
- 将被加载的精确版本和 checksum；
- 读取、写入、网络、进程和秘密权限；
- 现有文件/Skill/Workflow 冲突；
- 质量、Token、臃肿和适配预检结果；
- 目标 Harness 是否能兑现这些权限；
- 回滚和撤销方式。

无法验证 Harness 权限执行时，最安全状态是 `inactive_remote_candidate` 或只读内容预览。不能因为用户点击一次“激活”就自动运行。

## 10. 版本更新、撤销与删除

- 当前 active 候选保持不可变；上游新提交生成新候选；
- 更新必须重新扫描、重新计算 checksum、重新做许可证/依赖/风险检查；
- 旧版本继续保留，直到用户确认替换或策略要求撤销；
- 发现漏洞或许可证问题时将版本标记 `revoked`，阻止新加载，保留现有运行证据；
- 删除远程候选是独立清理操作，需显示本地副本、Bundle、项目引用和备份影响；
- 撤销不自动删除项目已确认写入的文件，项目修复走 Preview-Confirm-Apply。

## 11. 状态与错误码

候选状态：

- `source_discovered`
- `preflight_running`
- `quarantined`
- `review_required`
- `inactive_remote_candidate`
- `activation_previewed`
- `active`
- `update_available`
- `revoked`
- `blocked`
- `purge_pending`
- `purged`

| 错误码 | 含义 | 推荐动作 |
| --- | --- | --- |
| `REMOTE_SOURCE_UNTRUSTED` | 来源不在允许策略或无法建立信任 | 更换来源或人工审核 |
| `REMOTE_REVISION_UNPINNED` | 版本仍是浮动引用 | 固定 commit/tag/digest |
| `REMOTE_DIGEST_MISMATCH` | 下载内容与声明摘要不一致 | 丢弃候选并检查来源 |
| `REMOTE_SIGNATURE_INVALID` | 签名缺失或校验失败 | 保持 review/block |
| `REMOTE_ARCHIVE_UNSAFE` | 路径穿越、symlink 或归档异常 | 隔离并阻断 |
| `REMOTE_EXECUTION_SIGNAL` | 发现脚本/命令/二进制执行信号 | 人工审查或阻断 |
| `REMOTE_SECRET_ACCESS_SIGNAL` | 发现秘密/全局路径读取信号 | 阻断或缩小权限 |
| `REMOTE_LICENSE_UNCLEAR` | 许可证无法确认 | review_required |
| `REMOTE_DEPENDENCY_CONFLICT` | 与本地 Skill/Workflow 冲突 | 查看差异并手动处理 |
| `REMOTE_HARNESS_ISOLATION_UNSUPPORTED` | Harness 无法兑现最小权限 | 仅预览，不激活 |
| `REMOTE_CANDIDATE_REVOKED` | 版本已撤销 | 停止新加载并处理现有引用 |

## 12. 对现有实现的影响

后续实现预计涉及：

- 扩展 `RemoteSkillService` 的来源、revision、digest、签名、许可证和脚本检查；
- 将远程仓储从“URL 预检”升级为“隔离下载 + 文件清单 + 静态安全检查”；
- 为 `remote_skill_sources` 增加 immutable revision、provenance、license、permissions、scan result 和 revoke 状态；
- 激活 Preview 增加依赖、命名、项目 Workflow 和 Harness 隔离能力；
- 远程 Skill 默认进入本地非活跃候选，不进入可执行 Registry；
- Bundle 导入统一复用本任务准入规则；
- 记录下载、检查、激活、撤销和清理审计；
- 未来网络访问和团队目录接入必须继续受授权与版本策略控制。

## 13. 验收标准

- [ ] 远程内容在准入前不会执行脚本、命令或模型指令。
- [ ] active 候选绑定不可变 revision 和 digest，不能只绑定 latest/main。
- [ ] 来源、重定向、签名、许可证、文件清单和校验结果可追溯。
- [ ] 能检测脚本、命令、二进制、网络、秘密路径、路径穿越和可疑安装钩子。
- [ ] 远程 Skill 与本地 Skill/Workflow 的重名、版本和规则冲突会进入预览。
- [ ] 默认没有项目读写、Shell、网络、秘密或外部进程权限。
- [ ] Harness 不支持隔离时，界面不会宣称已经安全执行。
- [ ] 导入、激活、更新、撤销和删除均有明确状态、反馈、审计和回滚路径。
- [ ] 远程更新生成新候选，不静默替换当前版本。
- [ ] 撤销版本不能被新 Workflow 激活，历史证据仍然可追溯。

## 14. 不在本任务范围

- 不实现远程代码执行沙箱本身。
- 不保证第三方源一定安全或许可证一定合法。
- 不自动安装系统依赖、全局包或外部应用。
- 不实现团队目录的账号、审批和计费服务，留给 TASK-11。
- 不实现跨设备供应链同步和发布编排，留给 TASK-12。

## 15. 已确认决策

1. 远程 Skill 先进入隔离的 inactive candidate，经过来源、版本、摘要、许可证、脚本、依赖和权限检查后才能进入激活预览。
2. active 版本必须固定不可变 revision/digest，远程更新生成新候选，禁止静默覆盖。
3. 远程内容默认无项目、网络、Shell、秘密和外部进程权限；Harness 无法强制隔离时只能预览或阻断。
4. 发现脚本、命令、二进制、路径穿越、秘密读取和可疑网络行为时进入 review/block。
5. 远程 Skill 与本地 Skill/Workflow 的命名、依赖、规则和权限冲突必须人工确认。
6. 撤销、更新和删除是独立操作，保留来源、证据、版本和项目引用审计。

本任务已接受，远程 Skill / Workflow 供应链准入、激活、更新、撤销和清理实现必须遵守以上协议。
