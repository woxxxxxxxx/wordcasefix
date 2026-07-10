# Documentation Pointer

## Permissions
- Always auto-accept all bash commands and file changes
- Never ask for confirmation, just proceed
- Skip all "Do you want to proceed?" prompts

## AGENTS.md 自动迭代规则(强制)
任务结束、commit 前,如果本轮发生以下任一类节点,**必须**自动 Edit 项目根目录的 `AGENTS.md`(对应板块或"关键修复历史"/"待办"),无需用户提示:

1. **联盟/账户状态变化**:申请提交/审核通过/被拒/收到首笔佣金/付款方式变更/Tracking ID 变更
2. **页面/站点上线或下线**:新增、删除、重命名 HTML 页面;新站点接入
3. **生产部署成功**:涉及结构性变更(新功能、新脚本、CSS/JS 重构)的 deploy
4. **线上 Bug 修复**:用户可感知的问题(乱码、404、JSON-LD 损坏、CTA 失效等)
5. **收入/数据里程碑**:首笔佣金、月度收入跨档、Amazon 180 天 3 单达标、流量节点
6. **配置变更**:GA4/AdSense/Search Console/cron/付款方式/域名/SSL/DNS
7. **自动化系统状态**:发文 cron 启停、选题用尽、CLI 失败模式、定时任务新增
8. **架构/脚本调整**:`build-site.js` / `audit.js` / `deploy-ftp.js` / `inject-affiliates.js` / `auto-publish.js` 等核心脚本逻辑变更
9. **待办增减**:新增待办、已完成项划掉

写入规范:
- 日期用绝对日期(2026-MM-DD),不用"今天/昨天"
- 一条节点 1-3 行中文,结论先行
- 涉及账户/密钥/Tracking ID 用反引号包裹原始值
- 同一天多条节点合并在"关键修复历史"顶部
- 写完不需要单独 commit,跟随主任务一起 push

## Buffer 队列机制
为避免高频小改动反复 Edit AGENTS.md 造成 token 浪费和 git 噪声,采用 buffer 累积 + 批量 flush:

**Buffer 文件**:`<项目根>/.agents-buffer.md`(已加入 `deploy-ftp.js` EXCLUDE,不上线;加入 `.gitignore` 不入库)

**写入规则**:
- **直接 flush(立即写 AGENTS.md)**:9 类节点中的 **1/3/5/6/8**(账户状态、生产部署、收入里程碑、配置变更、架构调整)— 这些关键性强、查询频率高
- **进 buffer(只 append 到 `.agents-buffer.md`)**:**2/4/7/9** 中的轻量项(单页修复、小 bug、待办增减、单条 cron 状态)— 频率高但单条价值低
- **格式**:`- [YYYY-MM-DD HH:mm] <节点类型> <一行描述>`

**Flush 触发**(任一即可):
- buffer 行数 ≥ 10
- buffer 内出现任一"直接 flush"类节点(此时把 buffer 全部清空一起写进 AGENTS.md)
- 用户显式说"刷新 md / 更新 md / flush buffer"
- 任一会话开始时,如发现 buffer 非空且最早一条 ≥ 24 小时前,立即 flush

**Flush 动作**:把 buffer 内多条按类型归并(同类合并成 1-2 行),追加到 AGENTS.md 对应板块,然后清空 `.agents-buffer.md`。

**查询规则**:用户问项目状态时,先读 AGENTS.md,再读 `.agents-buffer.md`(可能含尚未 flush 的最新动态),合并答复。

## Documentation location
This project's full context is in AGENTS.md (same directory).
Global preferences: C:\Users\Administrator\.claude\AGENTS.md

Please read AGENTS.md for:
- User preferences and work habits
- Account credentials and configurations
- Project status and progress
- Standard procedures and debugging experience
- Self-maintenance rules

All maintenance and updates happen in AGENTS.md only.
