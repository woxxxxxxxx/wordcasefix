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

## 关键修复历史
- 2026-06-21：上线自动发文 + 联盟系统；新增 30 条选题、cron Tue/Fri 03:00、CTA 预埋 38 页 × 2、CSS 渐变样式、deploy-ftp EXCLUDE 4 个私有文件。Deploy 39/39 成功，私有文件 live 404。
- 2026-06-21：AdSense 提审 QA — 修复 18 个页面损坏的 JSON-LD（FAQ/Breadcrumb 误注入 Article 字符串中）；隐私政策补 GA/AdSense/DART 说明 + opt-out 链接。

## 待办
- **申请 5 个联盟**：Hiscox / Next Insurance / Thimble / CoverWallet / NetQuote。
- 联盟通过后：编辑 `affiliate-config.js` 填真实 URL → `node inject-affiliates.js` → `node deploy-ftp.js`。
- 添加 GA4 numeric property ID 到 `sites-config.js`。
- 在 Search Console 验证 DNS TXT 域名所有权。
- 监控自动发文产出（每周二/五查 `pm-worker/logs/businesspolicyguide-publish-*.log`）。
- 30 条选题快用完时（约 15 周后），在 `auto-publish.js` `TOPIC_CANDIDATES` 追加新选题。
- 扩展高价值聚类：general liability cost / BOP cost / workers comp by state / contractor insurance by state / professional liability for consultants / IT / agencies。
