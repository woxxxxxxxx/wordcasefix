# 全局工作偏好

## 用户习惯
- 所有回复用中文
- 本地文件操作统一用 Claude Code 执行，多步合并成一个任务顺序执行完
- 直接决策，不问"要不要做"，直接给结论和指令；指令要完整可直接执行
- 喜欢一条指令搞定多件事；不喜欢过多解释，直接给操作步骤
- 遇到通用/批量问题（CSS、class、模板、链接、SEO、logo 等），一律先全量扫描排查 → 建立完整清单 → 再统一改动，不被单张截图牵着走
- 全程自动执行，分支任务并行委派代理加速，不要逐个问确认
- 文件改动直接执行，不要弹确认框问"要不要改" [2026-06-19]
- 调研/读页面/截图等只读操作也直接做，不要问权限确认 [2026-06-19]
- 改动 AGENTS.md / CLAUDE.md 等文档文件也直接执行，不要问确认 [2026-06-19]

## 启动与部署
- Claude Code 启动：claude --model claude-sonnet-4-5 --dangerously-skip-permissions
- Git 推送（带代理）：git -c http.proxy=http://127.0.0.1:7897 -c http.sslVerify=false push origin master
- FTP 上传走代理：127.0.0.1:7897（port 21 不通，需 socket 代理）
- 部署方式：GitHub Pages 站用 git push，Hostinger 站用 deploy-ftp.js
- FTP 缓存顽固：rm -f .ftp-deploy-sync-state.json deploy-cache.json .deploy-cache 强制全量

## 基础账号
- Gmail：xiaohuixie3@gmail.com
- AdSense：ca-pub-1638874323475457（9站共用）
- ads.txt：google.com, pub-1638874323475457, DIRECT, f08c47fec0942fa0
- QQ邮箱：295965231@qq.com / SMTP授权码：msygvjzroawdbgce
- Buffer：xiaohuixie3@gmail.com / Xxh113324（Essentials $6/月）/ API Key：aPPMezKy_6SKLs8F-9iUzZo4vM959_4K8YKqHCe9iQU
- Pinterest App ID：1575234 / Secret：6150ea125c1f12a6f6b81130491460a30b899ba5
- Pinterest Token：C:\Users\Administrator\pm-worker\pinterest-token.json（约7/13到期）
- Unsplash API Key：5RQkzb688Ez9nXR-vzUbkXmxFaxQbLzEQUoyy8rogt4
- PayPal：xiaohuixie3@gmail.com

## 自动化系统
- 统一配置：C:\Users\Administrator\sites-config.js
- 每日报告：daily-report\report.js（8:30→QQ邮箱），GA服务账号 xiexiaohui@instruction-325409.iam.gserviceaccount.com
- Buffer 补充：pm-worker\buffer-refill.js v7（9:00），7站 Pinterest 轮发每站 2 条 Pin，图片走站点公网 URL（不再经 Imgur）
- PM Worker：pm-worker\（cron-daemon.js / monitor-engine.js / post-deploy-check.js）
- Content Pipeline：content-pipeline\

## 站点清单 [2026-06-23 已核对]
**Hostinger 注册 11 个 + 外部 1 个（wordcasefix）= 12 个域名**
1. wordcasefix.com（外部）
2. vestcalc.com
3. notiontemplafix.com
4. businesspolicyguide.com
5. contractfixpro.com
6. billingfixpro.com
7. payrollfixpro.com
8. coveragefixpro.com
9. crmcomparelab.com
10. insurancetipspro.com
11. freelancerguidehub.com
12. toolrankhq.com（**未纳入 pm-worker 监控/buffer-refill，待补**）

**孤儿目录**：`C:\Users\Administrator\invoicefixpro\` — 域名未注册，git remote 误指 wordcasefix.git，待删除或上线决策

**待修复**：
- CRMCompareLab 缺 GA4 + AdSense（10 个 HTML 全部裸奔，sitemap/ads.txt 已配但无追踪/广告代码）
- ToolRankHQ 未加入 pm-worker 监控（projects.json / site-recovery.js / buffer-refill.js 都需补）

## 可复用诊断经验

### JS/前端
- GA `<script async src="...">` 标签内的内联代码浏览器直接忽略，函数会未定义。必须把函数挪到独立 `<script>` 块
- JS 字符串内的撇号（state's、I'm）会破坏单引号字符串，导致整个 script 块语法错误。批量扫描转义
- 模板字符串里的 `</div>` 等 HTML 闭合标签会被解析器提前截断 script。改用字符串拼接（'+' 连接）

### CSS 选择器
- [2026-06-19] `.card` 等短 class 选择器会误命中 `.related-card` 等子组件 → 用 `.main-area > .card` 限定直接子级
- [2026-06-19] `[class*="result"]` 通配选择器会污染工具输出区域 → 永远不要用属性通配匹配 class
- [2026-06-19] CSS `::before` 伪元素要收紧到具体父级（如 `.tool-content-modules .tool-info-title`），避免误中页面其他同标签元素
- [2026-06-19] 内联 style 的 `margin:0 auto` 等属性需要 `!important` 才能被外部 CSS 覆盖

### AdSense 工具站经验
- [2026-06-19] 工具站被判"低价值内容"是普遍现象，根因：内容同质化 + 站龄短 + 缺原创文章
- 解法：每个工具页加 How to Use / Use Cases / FAQ 真实内容 + 博客覆盖多品类
- 工具站 FAQ 不能用通用模板问答（is free / mobile-friendly），必须是工具独有真问题
- 主页副标题不能写"no ads tracking"（与 AdSense 申请目标冲突）

### 打印
- Chrome 打印对 display:none → display:block !important 优先级处理有 bug
- 最稳方案：window.open() 新窗口 + 嵌入 window.onload=window.print()
- @media print 必须用白名单隐藏（隐藏 header/form/ad/affiliate-section/footer），不能用 body>* {display:none}

### 部署
- GitHub Pages 部署有 1-2 分钟延迟
- Hostinger FTP 缓存顽固，必要时删除 .ftp-deploy-sync-state.json 强制全量
- 浏览器 favicon.ico 优先级高于 favicon.svg，要更新 svg 必须删除 ico 引用
- 单文件上传：用 node + basic-ftp 直接 uploadFrom
- **⚠️ 改动后线上没生效，第一步用 curl --proxy 验证线上实际内容**，再决定排查方向
- **⚠️ 部署方式认定看仓库根目录**：有 deploy-ftp.js + deploy-cache.json + 无 CNAME → Hostinger FTP；有 CNAME 或 .github/workflows → GitHub Pages
- 已确认 Hostinger FTP：CoverageFixPro / InsuranceTipsPro / FreelancerGuideHub / ToolRankHQ / BusinessPolicyGuide
- 其余站点部署方式以仓库根目录文件为准（看是否有 deploy-ftp.js / CNAME）
- **basic-ftp 5.x 通过代理会挂死**（USER/PASS不发送），必须用 **4.6.6**

### 联盟营销变现 [2026-06-22]
- **Amazon Associates Tracking ID**：`bizpolicyguid-20`（共用，所有站点都用这个统一）
- **W-8BEN 预扣税 0%**：中国创作者填W-8BEN时税率0%（境外服务收入），不是30%
- **180天3单规则**：Amazon账号通过后必须180天内产生3笔合格销售，否则永久关闭。账号开通日：2026-06-22

### 联盟广告位标准模板 [2026-06-23]
- **CSS 模板**：`.partner-cta` + 子元素（brand/logo/category/stars/content/tag/headline/desc/badges/badge/btn/sublabel）
- **首次实现**：toolrankhq/styles.css 的 `═══ Featured Partner CTA` 块
- **结构**：2 栏布局（左品牌面板 200px + 右内容自适应），移动端单列
- **必填元素**：品牌首字母 Logo / 品牌名 / 类目 / 5 星 / Featured Partner 徽章 / 标题 / 描述 / 3 个 ✓ Badge / 橙色渐变 CTA 按钮 / 联盟披露小字
- **链接属性**：`target="_blank" rel="sponsored noopener nofollow"`
- **SID 命名规范**：`{站点缩写}-{品牌名}-{位置}` 如 `toolrank-omneky-home` / `toolrank-omneky-writing`
- **以后所有联盟广告位都套用此模板**，不要再用纯文字 paragraph+link 的简陋形式
- **登录**：xiaohuixie3@gmail.com（密码未存）
- **CJ 组织名**：Xie Xiaohui Studio
- **付款方式**：Payoneer USD 虚拟美国账户（Citibank / Routing 031100209 / Acct 70587310002476747 / CITIUS33 / Xiaohui Xie）— 详情见 `C:\Users\Administrator\pm-worker\credentials\payoneer-usd-account.md`
- **税务**：W-8BEN 已提交，Article 7 + 0% 预扣，使用中国身份证号作 Foreign Tax ID
- **最低付款额**：$50（默认 $100 已改）
- **推广媒介**：已添加 12 个站（CoverageFix/InsuranceTips/ContractFix/BillingFix/PayrollFix/Notion/BusinessPolicy/Freelancer/CRMCompareLab/ToolRank/WordCase/VestCalc），主要媒介=CoverageFixPro
- **已申请约 25-30 家广告主**（含 ADP / Mailchimp / Northwestern Mutual / Hiscox / 1Password / LawDepot / Meta for Business / Turbify / TeamViewer / Auras Insurance / AXA Insurance USA / Choice Home Warranty / Travelex / Path Social / WillMaker-Nolo / New York Life / Heymondo / ExpertRating / Omneky / EasyWebinar / Simply Business）
- **⚠️ CJ 真实定位**：老牌大企业为主（沃尔玛/IBM/Sephora 类），新兴 DTC/SaaS（Lemonade/HubSpot/Bluehost/HoneyBook/Bonsai/Notion）多在 **Impact / PartnerStack**，CJ 上根本搜不到。下次别再凭印象列清单，先按类目+EPC 实搜
- **CJ 风控注意**：新账号首日申请上限 ~30 家，连续添加媒介需间隔 30-60s，CJ 没有"申请广告主"的官方 API（只读 API），自动化只能走 Playwright
- **EPC 货币识别**：USD/CAD/GBP/EUR/CZK/SEK/PLN — 只申请 USD（除非该 advertiser 标 US 市场），非美元货币广告主一律跳过
- **"自动拒绝规则"警告 vs "较低获批几率"**：前者 90% 秒拒（跳过），后者可申试运气；"人工审核"是普通提醒不是警告
- **OneLink兼容代码**（加到book page header提升国际转化）：
  ```html
  <script src="//affiliate-program.amazon.com/onelink-sa-aax/onelink.min.js"></script>
  <script>amzn_associates_link_init = {instanceId: 'bizpolicyguid-20', domain: 'auto'};</script>
  ```
- **Skimlinks JS**（businesspolicyguide.com专属）：`<script src="https://s.skimresources.com/js/305073X1793265.skimlinks.js"></script>`，加到</body>前。Skimlinks锁域名，其他站需Settings→Domains→Add Domain单独生成JS
- **中国创作者联盟申请优先级**：
  - 🟢 易批：Amazon / Awin / Skimlinks / CJ / Impact.com
  - 🟡 中等：Awin商家(申请通过后单独申请)、Insureon直营、biBerk直营
  - 🔴 难批：Hiscox / Next Insurance / CoverWallet / MediaAlpha / EverQuote（需流量+美国实体）
- **Payoneer 美国虚拟银行**：开通后可作为Amazon Direct Deposit账户（替代礼品卡），提现到国内银联卡$1.5/笔
- **不能自动化的事**：注册联盟账号（涉及个人信息+密码+条款接受，Claude硬限制禁止）— 只能给"填表速查卡"辅助手工填写
- **变现内容矩阵思路**：在BPG建商业类产品对比页(书单/报税软件/LLC注册/会计软件)，每页2-3本Amazon书 + 多个品牌mention（Skimlinks自动转链）= 多渠道收益

### CJ API 自动化工具链 [2026-06-24]
- **Personal Access Token**：`nSXbXj79rgeI8K9BH6A4BZfngw`（存 `pm-worker/credentials/cj-api.json`，已加 .gitignore）
- **生成路径**：CJ 后台 → Developer Portal → Authentication → Personal Access Tokens → Register
- **CLI 工具**：`pm-worker/cj-links.js`
  ```bash
  node cj-links.js us <site> <advertiser> [keyword]   # 仅 US 链接 + EPC 排序
  node cj-links.js get <site> <link-id> <sid>         # 生成跟踪 URL
  node cj-links.js websites                           # 列站点配置
  ```
- **REST API 端点**：`https://link-search.api.cj.com/v2/link-search?website-id=PUB&advertiser-ids=joined&keywords=KW`
  - 返回 XML，单页 ≤100 条；广告主 ID 不传时全部 joined
  - **关键发现**：keyword 在 link 名称里做模糊匹配，**搜不到时换近义词**（LawDepot 把 NDA 命名为 "Confidentiality Agreement"）
- **GraphQL 端点**：`https://commissions.api.cj.com/query`（只读 publisherCommissions / advertiserCommissions，**不含 publisher info / link search**）
- **站点 → CJ Pub ID 映射**（写在 cj-links.js 的 SITES 常量）：
  - ContractFixPro = `101808177`
  - FreelancerGuideHub = `101808336`
  - ToolRankHQ = `101808341`
  - BillingFixPro = `101808324`
  - 其余 8 站待生成首个 CJ 链接后从 click URL 中抓 pub-id 补入
- **API 能 / 不能**：✅ 查广告主链接 / 查佣金 / 查转化 | ❌ 申请加入广告主（必须 UI 操作）/ 添加推广媒介

### CJ / Amazon 接入审计记录 [2026-06-23]
- **本轮已上线站点**：businesspolicyguide.com / insurancetipspro.com / freelancerguidehub.com / toolrankhq.com / crmcomparelab.com / billingfixpro.com / payrollfixpro.com / contractfixpro.com
- **Amazon Associates 已接入**：
  - BusinessPolicyGuide：`tools/commercial-auto-exposure-checklist.html` 加车辆安全用品 Amazon 搜索链接
  - InsuranceTipsPro：`articles/how-much-car-insurance-do-i-need.html` 加车载应急包 / dash cam / 打气泵
  - FreelancerGuideHub：`articles/best-tools-for-freelancers.html` 加办公硬件/扫描仪/UPS
  - 所有 Amazon 链接统一使用 `tag=bizpolicyguid-20`，页面必须有 `As an Amazon Associate...` 披露
- **CJ 已接入真实链接**：
  - ToolRankHQ：Omneky 真实 CJ 链 `https://www.tkqlhce.com/click-101808341-17290970?...`，SID 例子：`toolrank-free-ai-small-business`
  - ContractFixPro：LawDepot **6 处** — 首页 Evergreen + freelance/service/consulting/independent-contractor/**nda-generator** 深链；SID 前缀 `contractfix-lawdepot-{type}`
  - FreelancerGuideHub：LawDepot **2 处** — freelance-contract-template-guide（Contractor 16995973）+ employee-vs-contractor-guide（**LLC 16995795**）；SID 前缀 `freelancerguide-lawdepot-{type}`
  - **共用 CSS**：`{site}/assets/css/partner-cta.css`（ContractFixPro / FreelancerGuideHub / 后续新站可直接复用模板）
  - **共用 SVG Logo**：`{site}/assets/img/{brand}-logo.svg`（自绘高保真，深蓝方块 + 文档折角 + 白 L + 蓝色 wordmark）
  - **按钮色覆盖**：`.partner-cta-btn` 必须用 `color:#fff!important` + `:link/:visited/:active` 同样 !important，否则会被站点全局 `a{color:inherit}` 覆盖导致按钮文字看不见
  - **品牌色变体**：ToolRankHQ 橙（#ea580c 配 Omneky）；ContractFixPro/FreelancerGuide 蓝（#1e40af 配 LawDepot）
- **LawDepot 关键词检索经验** [2026-06-24]：
  - "NDA" 搜不到 → 用 "Confidentiality Agreement"（link 16995997）
  - "LLC" 关键词太宽（命中全部），用 "Articles of Organization"（link 16995795）
  - "Photography Contract" / "Web Development" → LawDepot 无 US 版本，无法精准对接
  - CJ link search 是 **link-name 模糊匹配**，搜不到时换 LawDepot 官方命名
- **CJ 尚无真实深链时的处理**：
  - CRMCompareLab / BillingFixPro / PayrollFixPro / ContractFixPro 只能先放 direct-link placeholder，必须写注释 `CJ_PLACEHOLDER_DIRECT_LINK`
  - 不允许凭品牌名伪造 CJ/Impact/PartnerStack 链接
  - 占位直链也按广告/商业链接处理：`target="_blank" rel="sponsored nofollow noopener"`
- **适合继续接联盟的站**：
  - ToolRankHQ：CJ/SaaS/AI 工具优先，Amazon 不优先
  - CRMCompareLab：CRM/SaaS trial 类适合，Amazon 不优先
  - BillingFixPro：会计/发票/收款 SaaS 适合，Amazon 不优先
  - PayrollFixPro：payroll/HR/benefits SaaS 适合，Amazon 不优先
  - ContractFixPro：法律文档/电子签/合同 SaaS 谨慎接，必须避免“法律建议/律师替代”暗示
  - BusinessPolicyGuide：Amazon 书单/用品 + Skimlinks/CJ 商业服务适合，但保险/税务内容必须强披露
  - FreelancerGuideHub：会计/合同/支付/生产力 SaaS + 少量 Amazon 办公用品/书单适合
  - InsuranceTipsPro：只适合少量 Amazon 书单/安全用品；不建议直接接保险 lead/CJ
- **暂不建议接联盟的站**：
  - WordCaseFix：工具站低商业意图，优先 AdSense；另需注意不要混入其他站目录
  - VestCalc：金融 YMYL，优先 AdSense；Amazon 仅可少量金融书单
  - NotionTemplaFix：PayHip 自营产品优先，不要混淆 affiliate 披露
  - CoverageFixPro：保险报价/估算风险高，不建议直接接保险 lead/CJ，除非补强免责声明和合规页面
- **本轮审计通过项**：
  - BusinessPolicyGuide：`node build-site.js` + `node audit.js`，50 HTML / 0 issues
  - CRMCompareLab：`node build-site.js` + `node audit.js`，40 HTML / 0 issues
  - 工具站 affiliate-card 全量检查：Billing 302 / Payroll 202 / Contract 62，全部带 sponsored/nofollow/noopener
  - 线上抽查 8 个重点 URL 均 200 且包含新增 affiliate/placeholder 内容
- **本轮 GitHub Pages 提交**：
  - BillingFixPro：`63b57e9` Add affiliate disclosure link attributes
  - PayrollFixPro：`5a7650f` Add compliant payroll partner links
  - ContractFixPro：`a9ad9c4` Add compliant contract partner links
- **部署经验**：
  - Hostinger 站仍用 `node deploy-ftp.js` 或站点自己的 FTP 脚本；CRMCompareLab 用 `python deploy-ftp.py`
  - GitHub Pages 站推送后等 1-2 分钟，再用线上 URL 内容检查，不只看 git push 成功
- **Amazon 外链样式修正规则 [2026-06-23]**：
  - Amazon 资源链接不要用纯文字 `<a>` 连续排列，视觉上不像按钮且容易挤在一起
  - 优先使用卡片结构：`.amazon-resource-grid` + `.amazon-resource-card`，每张卡包含 `h3` 标题、1 句说明、橙色 `Browse on Amazon` 按钮
  - 按钮样式必须明显：橙色背景、白字、8px 圆角、hover 状态、移动端满宽
  - BPG 已修复示例：`businesspolicyguide/tools/commercial-auto-exposure-checklist.html` 的 `Vehicle safety supplies to consider`
  - 修改后必须部署 `node deploy-ftp.js`，并用线上 HTML/CSS 检查 `amazon-resource-grid` / `amazon-resource-card` / `Browse on Amazon` 是否存在

### 批量改造扫描原则
- 扫描时排除 .git/ .claude/ node_modules/ 外来子目录
- 批量替换 generateDoc 等共用函数时，必须排除 payment-history 等专属页面（脚本里加 if 'payment-history' in fpath: continue）

### Logo 设计流程（已固化）
1. ChatGPT 调研竞品 + 给3方案
2. 选方向后助手生成3个 SVG 变体
3. 用户挑一个继续优化
4. 用 React preview 工具加红色中线参考确认居中
5. 输出 logo.svg + favicon.svg
6. 全站替换文字 logo 为 `<img src="/logo.svg">`
7. GitHub Pages 站 git push / FTP 站 node deploy-ftp.js
8. 用 curl 对比本地和服务器内容确认上传成功

### 审计标准流程
GA inline 函数 → generateDoc 旧模板 → SEO 本地路径 → breadcrumb → back-to-top → @media print → logo/favicon → about/privacy 一致性

## 关键命令速查
```bash
# GitHub Pages 推送
git -c http.proxy=http://127.0.0.1:7897 -c http.sslVerify=false push origin master

# Hostinger FTP 部署
node deploy-ftp.js

# FTP 强制全量
rm -f .ftp-deploy-sync-state.json deploy-cache.json .deploy-cache

# PayHip Bundle 自动化（基于已登录的 browser-session）
cd C:\Users\Administrator\contractfixpro
node ../[domain]/scripts/payhip-*.js

# 启动 Claude Code
claude --model claude-sonnet-4-5 --dangerously-skip-permissions
```

## 自我维护规则

每次会话中遇到以下情况主动更新对应 AGENTS.md，无需用户提醒：
- 解决新 bug → 追加到全局 AGENTS.md「可复用诊断经验」
- 完成新部署/审计 → 更新项目 AGENTS.md「当前进度」
- 新账号/密钥/配置 → 写入对应位置
- 新偏好/习惯 → 追加全局「用户习惯」
- 新标准流程 → 写入全局「标准流程」
- 所有日常更新只写 AGENTS.md
- CLAUDE.md 保持为指针文件不动
- 双工具（Claude / Codex）共用同一份 AGENTS.md

写入前先 view 现有文件避免重复，追加 [YYYY-MM-DD] 日期标记，重大改动在回复中告知用户："已更新 AGENTS.md：xxx"。

## 会话总结规则

用户说"收工"/"结束"/"今天到这"/"明天再继续"时自动执行：
1. 回顾本次会话所有改动
2. 提取需要沉淀的：新经验 / 进度变化 / 新偏好 / 新踩坑
3. 一次性更新对应 AGENTS.md（全局 + 项目）
4. 输出"已沉淀以下内容"清单给用户确认
