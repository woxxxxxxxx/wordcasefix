# BusinessPolicyGuide

## Site Positioning
- Domain: `businesspolicyguide.com`
- Type: U.S. small business insurance education + quote-preparation site.
- Monetization direction: insurance CPL/quote partners first, AdSense second.
- Compliance stance: educational publisher only; not an insurance carrier, agency, broker, law firm, or financial advisor.

## Current Build
- Static HTML/CSS/JS site, with public HTML files kept in place.
- `build-site.js` is now a maintenance post-processor for existing generated HTML. It normalizes hero images, footer logo, article photos, and old mojibake fragments without regenerating the entire site.
- Public pages: 45 HTML pages.
- Main sections:
  - `/business-insurance/`
  - `/industries/`
  - `/states/`
  - `/compare/`
  - `/guides/`
  - `/tools/`
- Public assets:
  - `logo.svg`
  - `logo-footer.svg`
  - `favicon.svg`
  - `styles.css`
  - `assets/main.js`
  - `assets/business-owner.jpg`
  - `assets/coverage-meeting.jpg`
  - `assets/small-business-office.jpg`
  - `robots.txt`
  - `sitemap.xml`
  - `ads.txt`

## QA Rules
- Run `node build-site.js` after content/data edits to reapply the safe visual post-processing.
- Run `node audit.js` before deployment.
- Current audit checks:
  - title
  - meta description
  - canonical
  - JSON-LD schema
  - disclaimer language
  - thin visible text threshold
  - broken internal links
- Current clean result: 45 HTML pages, 0 issues.

## Deployment
- Hostinger FTP:
  - Host: `212.85.28.149`
  - User: `u868313694.businesspolicyguide.com`
  - Password: `Xxh113324~`
  - Remote root: `/public_html`
- Node deploy: `node deploy-ftp.js` (uses `basic-ftp@4.6.6` via local HTTP proxy at `127.0.0.1:7897`).
  - basic-ftp v5+ hangs on this host through the proxy; v4.6.6 works. Do not upgrade.
  - 4 parallel connections, per-file retry with reconnect, REMOTE_CLEANUP removes private files (AGENTS.md, CLAUDE.md, .env, build-site.js, audit.js, deploy-ftp.js, package.json, deploy-cache.json, README.md).
- Python fallback: `python deploy-ftp.py`.

## First Release Status
- First release uploaded: 2026-06-21.
- Uploaded 52 public files.
- Logo direction changed to optimized "Coverage Roof" variant C.
- Real image assets added to the homepage hero, homepage visual strip, and article pages.
- Footer uses `logo-footer.svg` so the brand remains readable on the dark footer background.
- GA4 measurement ID installed: `G-VGYQ2VWNT9`.
- `AGENTS.md` was accidentally uploaded once during deployment and then removed from `/public_html`; deploy script now excludes it.
- Live checks passed:
  - `/`
  - `/logo.svg`
  - `/favicon.svg`
  - `/robots.txt`
  - `/sitemap.xml`
  - `/business-insurance/general-liability-insurance.html`
  - `/tools/insurance-needs-quiz.html`
  - `/advertiser-disclosure.html`

## AdSense / YMYL Notes
- Do not turn pages into thin lead-gen doorway pages.
- Keep disclosure, editorial policy, privacy policy, and contact pages visible.
- Keep quote/affiliate CTAs moderate until AdSense review is stable.
- Every money page should include:
  - educational explanation
  - coverage limits/exclusions context
  - quote preparation checklist
  - FAQ
  - disclaimer
  - internal links to state/industry/compare pages
- State pages must avoid pretending to be legal or regulatory advice.

## AdSense Submission Readiness (2026-06-21 QA pass)
- All 45 HTML pages carry AdSense loader `ca-pub-1638874323475457` and GA4 `G-VGYQ2VWNT9`.
- 38 pages with `BreadcrumbList` JSON-LD; 33 pages with `FAQPage` JSON-LD; 83 JSON-LD blocks total, all parse cleanly.
- During this QA pass, 18 pages were found with corrupted JSON-LD (FAQ/Breadcrumb block injected mid-string into the Article schema in industries/, states/, compare/, tools/). All 18 were rebuilt from the page FAQ HTML and now validate.
- `privacy-policy.html`: Google Analytics + AdSense + DoubleClick DART + opt-out links (Google Ads Settings, aboutads.info, GA Opt-out add-on) — all live.
- `contact.html`: mailto link + Formspree form (placeholder ID `xyzgobkp` — replace before serious launch).
- Back-to-top button injected by `assets/main.js`.
- No meta description over 160 chars; no broken `<script>` or JSON-LD parse errors.
- Deploy 2026-06-21: 56 / 56 uploaded, 0 failed; REMOTE_CLEANUP confirmed private files return 404 on live site.
- Live spot-checks: `/`, `/privacy-policy.html`, `/industries/restaurant-insurance.html` all 200 OK with expected schema visible.
- Readiness estimate: ~95%. Outstanding: replace Formspree placeholder ID; consider 1-2 additional indexable long-form articles if reviewer flags thin coverage.

## 自动化发文系统 (2026-06-21 上线)
- `auto-publish.js`：从 `TOPIC_CANDIDATES`（30 条预置选题：10 industries / 8 states / 6 compare / 6 guides）取第一个未用选题，调 Unsplash 拉图，调 `claude` CLI（`--model claude-sonnet-4-6`，工具全部禁用）生成 JSON 文章，渲染成完整模板（含 GA4 `G-VGYQ2VWNT9` + AdSense `ca-pub-1638874323475457` + AD_PLACEHOLDER + AFFILIATE_CTA_TOP/BOTTOM + Article/FAQPage/BreadcrumbList JSON-LD），更新 `sitemap.xml`，**先**写 `topics-used.json` **后**调 `node deploy-ftp.js`（避免 FTP 失败导致选题重复发布）。
- `topics-used.json`：已用选题清单（初始 `{"used":[]}`）。
- 调度：`pm-worker/cron-daemon.js` 第 83-101 行新增 `runBusinessPolicyGuidePublish()`，cron 表达式 `0 3 * * 2,5`（每周二、周五 03:00 Asia/Shanghai），节奏 = 2 篇/周。30 条选题约 15 周耗尽。
- 私有文件：`auto-publish.js`、`topics-used.json` 已加入 `deploy-ftp.js` 的 `EXCLUDE` 和 `REMOTE_CLEANUP_FILES`，确保不会上线（已 curl 验证 404）。
- 故障排查：claude CLI 超时 → 重跑（topic 尚未标记已用）；Unsplash 失败 → 自动回退 `/assets/business-owner.jpg`；FTP 失败 → topic 已标记，手动重跑 `node deploy-ftp.js`。

## 联盟变现系统 (2026-06-21 上线，待审批)
- `affiliate-config.js`：5 个联盟占位 — Hiscox / Next Insurance / Thimble / CoverWallet / NetQuote，全部为 `PENDING_*` URL。
- `inject-affiliates.js`：扫描全站 HTML，按 `data-affiliate-slot` 重写 `<a>` 的 `href` + 可见文案。槽位映射：`primary → hiscox`（顶部 CTA），`secondary → coverwallet`（底部 CTA）。支持 `--dry-run`。可重复执行（每次都按 config 重写）。
- 38 个内容页已预埋 TOP + BOTTOM 两个 CTA（共 76 个），样式 `.affiliate-cta` 在 `styles.css` 第 486-493 行（蓝色渐变 + 白色按钮）。
- 私有文件：`affiliate-config.js`、`inject-affiliates.js` 已加入 `EXCLUDE` 和 `REMOTE_CLEANUP_FILES`（已 curl 验证 404）。
- **激活流程**：联盟通过后 → 编辑 `affiliate-config.js` 把 `PENDING_*` 替换为真实跟踪链接 → `node inject-affiliates.js` → `node deploy-ftp.js`。

## Amazon Associates 上线 (2026-06-22) ✅
- **Tracking ID**：`bizpolicyguid-20`（注意是 `policyguid` 不是 `policyguide`，Amazon自动截断）
- **税务**：W-8BEN 已签 + Amazon验证通过，预扣税率 **0%**（境外服务收入豁免）
- **付款方式**：礼品卡 $10起付（临时，等Payoneer通过后改ACH直存）
- **OneLink**：已开通9国跳转（US/UK/CA/DE/IT/FR/PL/SE/NL/ES）— 国际访客自动跳本国Amazon
- **变现页**：
  - `/guides/recommended-business-insurance-books.html` — 7本商业书 × 2链接 = 14个Amazon链接
  - 姊妹站 `insurancetipspro.com/articles/best-insurance-books.html` — 8本理财书 × 3链接（cover+2CTA）= 24个链接
  - **合计**：2个页面 + 15本真实书 + **38个带 `bizpolicyguid-20` 的真实Amazon链接**
- **OneLink兼容**：2个书单页面已注入双重OneLink脚本（官方JS + 时区检测fallback）
- **180天3单计时器**：从今天起算（2026-06-22），需在2026-12-19前产生3笔合格销售，否则账号被永久关闭

## Skimlinks 申请 (2026-06-22, pending approval)
- **状态**：申请已提交，账户pending（1-3工作日审核）
- **覆盖站**：`businesspolicyguide.com` 锁定（其他站需在后台单独添加domain）
- **JS脚本**：`<script src="https://s.skimresources.com/js/305073X1793265.skimlinks.js"></script>` 已注入全站46个HTML的`</body>`前
- **逻辑**：通过后自动转链所有未带联盟参数的商业链接（24000+商家），Amazon带`bizpolicyguid-20`的链接不被覆盖
- **分成**：你拿75%，Skimlinks拿25%
- **付款**：PayPal `xiaohuixie3@gmail.com`

## Awin 申请 (2026-06-22, pending approval)
- **状态**：申请已提交（"Application Received"），2-5工作日审核
- **押金**：£5（已付，首笔£20佣金时全额返还）
- **个人信息**：Xiaohui Xie / China / xiaohuixie3@gmail.com
- **网站**：businesspolicyguide.com
- **Sectors**：Finance & Insurance全选 + Books/Office Supplies/Stationery + 5个Business Services
- **通过后批量申请**：Simply Business / Embroker

## Payoneer 注册 (2026-06-22, in progress)
- 你正在填表（业务信息/个人信息/银行账户/身份证）
- 审核期1-3工作日
- 通过后拿"美国虚拟银行账户"（Routing+Account Number）
- 回Amazon后台改付款方式为 Direct Deposit + Payoneer账号 → 美元提现到国内银联卡（$1.5/笔，1-2天到账）

## 变现内容矩阵 (2026-06-22 完成) ✅
- **5个变现页面已全部上线**（4个BPG + 1个ITP）
  - `/guides/recommended-business-insurance-books.html` — 7本商业书，14个Amazon链接
  - `/guides/best-business-tax-software.html` — 2481词，6款报税软件对比（TurboTax/H&R/TaxAct/FreeTaxUSA/TaxSlayer/1040.com），6个Amazon链接
  - `/guides/recommended-business-formation-services.html` — 2589词，7款LLC注册服务（LegalZoom/ZenBusiness/Northwest/Bizee/Rocket Lawyer/Inc Authority/Swyft Filings），4个Amazon链接
  - `/guides/business-accounting-software-comparison.html` — 2421词，7款会计软件（QuickBooks/Xero/FreshBooks/Wave/Zoho/Sage50/NetSuite），6个Amazon链接
  - 姊妹站 ITP `/articles/best-insurance-books.html` — 8本理财书，24个Amazon链接
- **变现链接统计**：
  - Amazon真实链接：**54个**（带 `bizpolicyguid-20`，即时计佣金）
  - 品牌锚链接：**20个**（待Skimlinks通过后自动转链 → 75%分成）
  - 38页 × 2个CTA占位（待Awin/CJ/Impact通过后批量注入）
- 所有页面：GA4 + AdSense + Article+BreadcrumbList+FAQPage JSON-LD + Skimlinks JS + 移动响应式对比表
- Git: ab80134 已push

## 关键修复历史
- 2026-06-24:换皮治理 — billingfixpro(20%→0%,107 文件)+ payrollfixpro(27%→0%,27 文件)逐工具差异化 JS 业务逻辑(estimate/invoice/payroll/tax 各按真实领域规则),HTML 表单/样式未动。配套修复:payrollfixpro 全站 114 页缺失 AdSense 脚本已批量注入 `ca-pub-1638874323475457`(包含 google-adsense-account meta 验证),GitHub Pages 部署中。Commits `billingfixpro/payrollfixpro` master + `payrollfixpro@189bbee`。
- 2026-06-24:PM Worker 看板修复 — AdSense 计数从 6→11(原 `adsense==='pending'` 只算字符串,漏了 5 个有 `ca-pub-xxx` 的实际审核中站点);新增 `adsense_review_status` 字段;recovery-throttle 加 7 天自动剪枝防止历史误报永久残留;dashboard 新增 📣 联盟变现板块(5 状态色标:已激活/审核中/进行中/被拒/待申请),BPG/crmcomparelab/freelancerguidehub/toolrankhq 4 站联盟矩阵入库。Commit `c3968f4`。
- 2026-06-24：全局 `C:\Users\Administrator\CLAUDE.md` 新增「AGENTS.md 自动迭代规则」(9 类节点强制写入) + 「Buffer 队列机制」(`.agents-buffer.md` 累积小改动,关键节点直接 flush)。Commit `c7aaacf` / `def1f61`。
- 2026-06-24：接入 Pinterest/Buffer 自动推送管道,12 站全覆盖 (新增 wordcasefix/vestcalc/toolrankhq/BPG/crmcomparelab)。pm-worker `generate-pins.js` + `buffer-refill.js` 每日 09:00 cron 自动从各站抓 sitemap 截图，BPG 首批生成 10 张 Pin 图（business-insurance/guides/industries 等正文页），通过 `deploy-ftp.js` 上传到 `/pinterest/`。
- 2026-06-22：修复 Claude 更新后产生的联盟 CTA 乱码（`鈥?`、`鈫?/a>`、坏勾号）。`build-site.js` 现在会自动修复乱码、把未获批保险联盟 CTA 保持为站内安全链接；`audit.js` 会拦截乱码、坏锚点和泄露的 `PENDING_*` URL；`inject-affiliates.js` 在真实联盟链接未填入前只报警不改页面。已部署 42 个文件，线上确认 CTA 干净，Amazon 与 Skimlinks 仍正常。
- 2026-06-22：上线3个产品对比页（报税软件/LLC注册/会计软件）— 7491词 + 20个品牌锚链接（Skimlinks待用）+ 16个Amazon链接
- 2026-06-22：上线Amazon Associates变现 — Tracking ID `bizpolicyguid-20` + W-8BEN 0%税率 + OneLink 9国 + 2个书单页 + 38真实Amazon链接
- 2026-06-22：申请Skimlinks（全自动转链）+ Awin（£5押金） + Payoneer（虚拟美国银行账户）
- 2026-06-21：上线自动发文 + 联盟系统；新增 30 条选题、cron Tue/Fri 03:00、CTA 预埋 38 页 × 2、CSS 渐变样式、deploy-ftp EXCLUDE 4 个私有文件。Deploy 39/39 成功，私有文件 live 404。
- 2026-06-21：AdSense 提审 QA — 修复 18 个页面损坏的 JSON-LD（FAQ/Breadcrumb 误注入 Article 字符串中）；隐私政策补 GA/AdSense/DART 说明 + opt-out 链接。

## 待办
- **180天保命**：本周用Amazon账号通过 https://businesspolicyguide.com/guides/recommended-business-insurance-books.html 的链接买3次小东西（$5-10级别，间隔几天），确保180天前完成3单达标
- **等Payoneer通过**：拿到Routing+Account → Amazon后台改付款方式为Direct Deposit
- **等Skimlinks通过**：自动激活，可在Settings里添加其他10个站的domain
- **等Awin通过**：申请 Simply Business / Embroker 等保险类商家
- **CJ Affiliate 申请**：通过后接 The Hartford / QuickBooks / TurboTax / LegalZoom
- **Impact.com 商家**：登录已有账号 → Marketplace批量申请 Embroker/CoverWallet/LegalZoom/TurboTax/QuickBooks/Bench
- ~~申请 5 个保险联盟~~ → 之前都被拒，等流量起来再战
- 联盟通过后：编辑 `affiliate-config.js` 填真实 URL → `node inject-affiliates.js` → `node deploy-ftp.js`
- GA4 numeric property ID 已补齐：`542448049`（已写入 `sites-config.js`、`pm-worker/projects.json`、`daily-report/report.js`）
- 在 Search Console 验证 DNS TXT 域名所有权
- 监控自动发文产出（每周二/五查 `pm-worker/logs/businesspolicyguide-publish-*.log`）
- 30 条选题快用完时（约 15 周后），在 `auto-publish.js` `TOPIC_CANDIDATES` 追加新选题
- 扩展高价值聚类：general liability cost / BOP cost / workers comp by state / contractor insurance by state / professional liability for consultants / IT / agencies

## PM / Reporting Integration
- 2026-06-23: Added to `C:\Users\Administrator\pm-worker\projects.json`.
- 2026-06-23: Added to daily report site QA, Search Console table, and AdSense review timer.
- 2026-06-23: Added to `pm-worker/post-deploy-check.js` and `pm-worker/site-recovery.js`.
- GA4 measurement ID is live: `G-VGYQ2VWNT9`.
- GA4 numeric property ID is live in reporting config: `542448049`.
