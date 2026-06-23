# ToolRankHQ

## 基础信息
- 域名：toolrankhq.com
- 主色：#1e3a5f（深蓝）+ #f59e0b（金）
- GA ID：G-Z6W6MGYL95
- 内容数量：20篇AI工具测评文章 + about + contact + privacy + terms
- 部署方式：Hostinger FTP（node deploy-ftp.js）
- CSS：styles.css（单文件，2604行，PCMag风格评测站设计）

## 当前进度
- AdSense 状态：准备就绪，可提交审核 [2026-06-21]
- 上次审计完成：2026-06-21（14项全面审计，全部通过）
- 通过概率评估：90%+
- 本轮完成事项 [2026-06-21]：
  - 创建 privacy.html（AdSense 必需）+ terms.html
  - 统一全站导航结构（Home | Reviews | About | Contact）
  - 修复首页/文章页导航不一致问题
  - 全站24页 footer 添加 Privacy Policy / Terms 链接
  - 20篇文章添加 FAQPage JSON-LD 结构化数据
  - 21张 Unsplash 热链接图片本地化到 images/ 目录
  - contact.html 表单改 Formspree（占位ID xyzgobkp 待替换）
  - newsletter 表单改为"Coming soon"占位
  - auto-publish.js：移除死代码、修复 topic 标记顺序
  - deploy-ftp.js：EXCLUDE 列表补全（AGENTS.md/CLAUDE.md/auto-publish.js/.env/topics-used.json）
  - topics-used.json 格式统一为 {used:[]}
  - sitemap.xml 补充 privacy.html / terms.html
- 下一步：提交 AdSense 审核 + PartnerStack 6/23 重新申请

## 专属配置
- FTP：212.85.28.149 / u868313694.toolrankhq.com / Xxh113324~ / public_html
- PartnerStack：6/23 重新申请，联盟链接通过后替换占位符 `<!-- AFFILIATE_LINK -->`
- auto-publish.js：AI工具测评自动发布系统（Unsplash取图 → Claude CLI生成 → HTML → FTP部署）
- topics-used.json：已用0个 + 20个候选可用
- Formspree 表单ID：xyzgobkp（占位，需替换真实ID）
- AdSense：ca-pub-1638874323475457

## 关键修复历史
- [2026-06-21] 缺少 privacy.html / terms.html → 已创建完整页面
- [2026-06-21] 首页/文章页导航结构不一致 → 统一为 Home|Reviews|About|Contact
- [2026-06-21] 20篇文章 FAQ 无 schema → 全部添加 FAQPage JSON-LD
- [2026-06-21] 所有图片 Unsplash 热链接 → 本地化21张到 images/
- [2026-06-21] contact 表单 onsubmit="return false" → Formspree POST
- [2026-06-21] auto-publish.js 死代码 + topic标记顺序bug → 已修复
- [2026-06-21] deploy-ftp.js EXCLUDE列表不完整 → 补全7项

## 待办
- [ ] 替换 contact.html Formspree 占位ID为真实ID
- [ ] 提交 AdSense 审核
- [ ] PartnerStack 6/23 重新申请
- [ ] 联盟链接通过后全局替换 `<!-- AFFILIATE_LINK -->` 占位符
- [ ] 继续用 auto-publish.js 发文扩充内容量
