## My Preferences
- Always auto-accept all file changes without asking for confirmation
- Always use git -c http.proxy=http://127.0.0.1:7897 push origin master to push
- After finishing any task, automatically git add, commit, and push
- Never ask yes/no for file edits, just do it

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
