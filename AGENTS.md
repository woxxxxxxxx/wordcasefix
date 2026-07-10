# WordCaseFix

## 基础信息
- 域名：wordcasefix.com
- 主色：#5b5bd6（紫）
- GA ID：G-ZRF2KKPS30
- 工具/内容数量：200+ 工具页 + 27 篇博客
- 部署方式：GitHub Pages（git push origin master）

## 当前进度
- AdSense 状态：需要注意（低价值内容）— 已深化内容27篇博客 + 200工具页 FAQ [2026-06-19]
- 上次审计完成：2026-06-19（UI 样式优化 + 内容深化 + 文档体系建立）
- 本轮完成事项 [2026-06-19]：
  - 12篇新博客上线（总计27篇），覆盖 timer/color/dev/regex/base64/json/uuid/qr/markdown/url-encoding/hash
  - 200工具页 FAQ + Use Cases 重写：删除33处通用模板问答，改成工具独有真实问题
  - UI 视觉升级：tool-modules.css 紫色竖条 H2 / 圆形数字步骤 / SVG ✓ 用例 / Q角标 FAQ / 卡片化
  - 去重：删除6065行旧 .content-modules / .faq-section / .seo-content 重复块
  - 主页 Guides 卡片彩色分类条 + 徽章 + JS 分页
  - 标题区浅紫渐变背景 + 左侧紫色竖条
  - 表单输入框/按钮统一样式 + Related Tools 卡片修复
  - 副标题去掉 "no ads tracking"（与 AdSense 冲突）
- 下一步：重新申请 AdSense 审核

## 专属配置
- 共享 CSS：/assets/css/tool-modules.css（影响全部 200+ 工具页）
- 博客目录：/blog/（27 篇文章 + index.html 列表页）
- 工具页结构：nav → breadcrumb → header → .card(工具UI) → .tool-content-modules(How to Use/Use Cases/FAQ) → related-tools → footer

## 关键修复历史
- [2026-06-19] CSS 通配选择器 `[class*="result"]` 误命中工具输出区域，添加紫色左边框 → 已移除
- [2026-06-19] `.card` 选择器太宽泛，命中 `.related-tools` 和 `.related-card` → 缩窄为 `.main-area > .card`
- [2026-06-19] Hero 渐变背景加了又撤：用户明确不要大 hero，只要 tool-first 紧凑布局
- [2026-06-19] 4个文件缺 `</main>` 标签（celsius-to-fahrenheit, days-between-dates, text-cleaner, url-encoder）→ 手动修复
- [2026-06-19] `.ad-slot:empty` 不生效（div 内有 span 子元素）→ 改用 `.ad-slot.ad-top { display: none !important }`
- [2026-06-19] 面包屑居中问题：内联 style 的 margin:0 auto → CSS `!important` 覆盖

## 待办
- [ ] 重新提交 AdSense 审核
- [ ] 工具页 FAQ 内容从通用模板升级为工具专属（部分已完成，需检查剩余）
- [ ] 检查所有工具页 meta description 是否唯一
- [ ] 工具页 hero 紫色渐变背景样式待用户确认（标题区已加浅紫背景+左竖条，用户说"标题那一块"需继续优化）


## 2026-07-01 search-click acceleration
- Added 3 search-intent guide hub pages based on recent Search Console exposure.
- Updated title/meta descriptions for high-impression, low-CTR pages and added a homepage entry block for the new guides.
- Regenerated sitemap.xml with lastmod=2026-07-01. Goal: improve long-tail relevance, internal link strength, and search-result click clarity.
## 2026-07-11 AdSense low-value remediation
- Root cause found: 884 files from unrelated projects were tracked inside this GitHub Pages repository, exposing copied portfolio content under WordCaseFix subpaths. The unrelated directories are removed from the Git index but preserved locally, and are now ignored.
- Search inventory is narrowed to text, writing, encoding, formatting, and developer utilities. 87 off-topic or thin pages are noindex, removed from the sitemap, and carry no AdSense loader.
- Homepage positioning no longer claims math coverage or no tracking; added editorial-policy.html. Resubmit only after the cleanup commit is live and Search Console has recrawled the sitemap.
