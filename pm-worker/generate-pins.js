'use strict';
/**
 * generate-pins.js
 * 从站点 sitemap 自动发现工具页，截图生成 Pin 图，写入 pin-content.json
 * Blog 站点（InsuranceTipsPro / FreelancerGuideHub）用 HTML 模板渲染 Pin 图
 */

const { chromium } = require('playwright');
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

// ── Sitemap 工具站 ─────────────────────────────────────────────────────────────
const SITES = [
  {
    name:         'CoverageFixPro',
    baseUrl:      'https://coveragefixpro.com',
    pinterestDir: 'C:\\Users\\Administrator\\coveragefixpro\\pinterest',
    color:        '#1d4ed8',
    autoDiscover: true,
    sitemapUrl:   'https://coveragefixpro.com/sitemap.xml',
    urlFilter:    u => u.includes('/tools/'),
  },
  {
    name:         'ContractFixPro',
    baseUrl:      'https://contractfixpro.com',
    pinterestDir: 'C:\\Users\\Administrator\\contractfixpro\\pinterest',
    color:        '#2563eb',
    autoDiscover: true,
    sitemapUrl:   'https://contractfixpro.com/sitemap.xml',
    urlFilter:    u => u.endsWith('.html') && !u.match(/\/(index|about|privacy|terms|contact|404)\./),
  },
  {
    name:         'BillingFixPro',
    baseUrl:      'https://billingfixpro.com',
    pinterestDir: 'C:\\Users\\Administrator\\billingfixpro\\pinterest',
    color:        '#0891b2',
    autoDiscover: true,
    sitemapUrl:   'https://billingfixpro.com/sitemap.xml',
    urlFilter:    u => u.includes('/tools/'),
  },
  {
    name:         'PayrollFixPro',
    baseUrl:      'https://payrollfixpro.com',
    pinterestDir: 'C:\\Users\\Administrator\\payrollfixpro\\pinterest',
    color:        '#0f766e',
    autoDiscover: true,
    sitemapUrl:   'https://payrollfixpro.com/sitemap.xml',
    urlFilter:    u => u.includes('/tools/'),
  },
  {
    name:         'WordCaseFix',
    baseUrl:      'https://wordcasefix.com',
    pinterestDir: 'C:\\Users\\Administrator\\wordcasefix\\pinterest',
    color:        '#7c3aed',
    autoDiscover: true,
    sitemapUrl:   'https://wordcasefix.com/sitemap.xml',
    urlFilter:    u => u.endsWith('.html') && !u.match(/\/(index|about|privacy|privacy-policy|terms|contact|404|text-tools|calculator-tools|developer-tools|utility-tools)\.html$/),
  },
  {
    name:         'VestCalc',
    baseUrl:      'https://vestcalc.com',
    pinterestDir: 'C:\\Users\\Administrator\\vestcalc\\pinterest',
    color:        '#059669',
    autoDiscover: true,
    sitemapUrl:   'https://vestcalc.com/sitemap.xml',
    urlFilter:    u => u.endsWith('.html') && !u.match(/\/(index|about|privacy|terms|contact|404)\.html$/),
  },
  {
    name:         'ToolRankHQ',
    baseUrl:      'https://toolrankhq.com',
    pinterestDir: 'C:\\Users\\Administrator\\toolrankhq\\pinterest',
    color:        '#dc2626',
    autoDiscover: true,
    sitemapUrl:   'https://toolrankhq.com/sitemap.xml',
    urlFilter:    u => u.includes('/articles/') && u.endsWith('.html'),
  },
  {
    name:         'BusinessPolicyGuide',
    baseUrl:      'https://businesspolicyguide.com',
    pinterestDir: 'C:\\Users\\Administrator\\businesspolicyguide\\pinterest',
    color:        '#b45309',
    autoDiscover: true,
    sitemapUrl:   'https://businesspolicyguide.com/sitemap.xml',
    urlFilter:    u => u.endsWith('.html') && !u.endsWith('/index.html') && !u.match(/\/(about|advertiser-disclosure|contact|editorial-policy|privacy|terms)\.html$/) && (u.includes('/business-insurance/') || u.includes('/guides/') || u.includes('/compare/') || u.includes('/industries/') || u.includes('/states/')),
  },
  {
    name:         'CRMCompareLab',
    baseUrl:      'https://crmcomparelab.com',
    pinterestDir: 'C:\\Users\\Administrator\\crmcomparelab\\pinterest',
    color:        '#0369a1',
    autoDiscover: true,
    sitemapUrl:   'https://crmcomparelab.com/sitemap.xml',
    urlFilter:    u => !u.match(/\/(about|affiliate-disclosure|contact|editorial-policy|privacy|terms)\.html$/) && u !== 'https://crmcomparelab.com/' && (u.includes('/best-crm') || u.includes('/compare/') || u.includes('/reviews/') || u.includes('/crm-pricing/') || u.includes('/tools/') || u.includes('/best-free-crm') || u.includes('/best-simple-crm')),
  },
];

// ── Blog 文章站（HTML 模板渲染 Pin 图）────────────────────────────────────────
const BLOG_SITES = [
  {
    name:         'InsuranceTipsPro',
    pinterestDir: 'C:\\Users\\Administrator\\insurancetipspro\\pinterest',
    bgColor:      '#1e40af',
    darkColor:    '#1e3a8a',
    topicsFile:   'C:\\Users\\Administrator\\insurancetipspro\\topics-used.json',
    articleBase:  'https://insurancetipspro.com/articles',
    domain:       'InsuranceTipsPro.com',
    emoji:        '🛡️',
  },
  {
    name:         'FreelancerGuideHub',
    pinterestDir: 'C:\\Users\\Administrator\\freelancerguidehub\\pinterest',
    bgColor:      '#065f46',
    darkColor:    '#064e3b',
    topicsFile:   'C:\\Users\\Administrator\\freelancerguidehub\\topics-used.json',
    articleBase:  'https://freelancerguidehub.com/articles',
    domain:       'FreelancerGuideHub.com',
    emoji:        '💼',
  },
];

const LOG_FILE = 'C:\\Users\\Administrator\\pm-worker\\logs\\generate-pins.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf8'); } catch (_) {}
}

function slugToTitle(s) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Sitemap 抓取 ──────────────────────────────────────────────────────────────
function fetchSitemap(url, urlFilter) {
  return new Promise(resolve => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const urls = [...data.matchAll(/<loc>(.*?)<\/loc>/g)]
          .map(m => m[1].trim())
          .filter(urlFilter || (u => u.includes('/tools/')));
        log(`  Sitemap ${url}: 找到 ${urls.length} 个工具页`);
        resolve(urls);
      });
    });
    req.on('error', e => { log(`  Sitemap 抓取失败: ${e.message}`); resolve([]); });
    req.on('timeout', () => { req.destroy(); log(`  Sitemap 超时`); resolve([]); });
  });
}

// ── Blog Pin HTML 模板 ────────────────────────────────────────────────────────
function makeBlogPinHtml(title, site) {
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fontSize  = title.length > 60 ? 28 : title.length > 40 ? 32 : 36;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{
  width:600px;height:900px;overflow:hidden;
  background:linear-gradient(155deg,${site.bgColor} 0%,${site.darkColor} 100%);
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
  padding:64px 52px;text-align:center;
}
.domain{font-size:13px;font-weight:600;color:rgba(255,255,255,0.6);
  letter-spacing:0.14em;text-transform:uppercase;margin-bottom:40px;}
.emoji{font-size:54px;margin-bottom:28px;line-height:1;}
.title{font-size:${fontSize}px;font-weight:800;color:#fff;
  line-height:1.22;letter-spacing:-0.015em;word-break:break-word;}
.bar{width:52px;height:4px;background:rgba(255,255,255,0.3);
  border-radius:99px;margin:36px auto;}
.cta{font-size:15px;font-weight:600;color:rgba(255,255,255,0.85);
  border:2px solid rgba(255,255,255,0.28);padding:11px 30px;border-radius:999px;}
</style></head>
<body>
  <div class="domain">${site.domain}</div>
  <div class="emoji">${site.emoji}</div>
  <div class="title">${safeTitle}</div>
  <div class="bar"></div>
  <div class="cta">Read Full Guide →</div>
</body></html>`;
}

// ── 生成 Blog Pin 图（仅处理尚未生成的新文章）─────────────────────────────────
async function generateBlogPins(site, browser) {
  log(`\n── ${site.name} (blog) ──`);

  if (!fs.existsSync(site.pinterestDir)) {
    fs.mkdirSync(site.pinterestDir, { recursive: true });
  }

  let slugs = [];
  try {
    slugs = JSON.parse(fs.readFileSync(site.topicsFile, 'utf8')).used || [];
  } catch (e) {
    log(`  ⚠️  读取 topics-used.json 失败: ${e.message}`);
    return;
  }

  const jsonPath = path.join(site.pinterestDir, 'pin-content.json');
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (_) {}
  const existingSlugs = new Set(existing.map(p => p.slug).filter(Boolean));

  const newSlugs = slugs.filter(s => !existingSlugs.has(s));
  if (newSlugs.length === 0) {
    log(`  ✅ ${site.name}: 无新文章，跳过`);
    return;
  }
  log(`  🎯 ${newSlugs.length} 篇新文章需生成 Pin`);

  const page = await browser.newPage();
  await page.setViewportSize({ width: 600, height: 900 });

  const pins  = [];
  const stamp = Date.now();

  for (let i = 0; i < newSlugs.length; i++) {
    const slug  = newSlugs[i];
    const title = slugToTitle(slug);
    try {
      const html = makeBlogPinHtml(title, site);
      await page.setContent(html, { waitUntil: 'load' });

      const filename = `pin-blog-${stamp}-${i + 1}.png`;
      const filepath = path.join(site.pinterestDir, filename);
      await page.screenshot({ path: filepath });

      pins.push({
        slug,
        file:  filename,
        image: filename,
        title,
        name:  title,
        desc:  `${title} — full guide at ${site.domain}`,
        text:  `${title} — full guide at ${site.domain}`,
        link:  `${site.articleBase}/${slug}.html`,
        source: site.name,
      });
      log(`  📸 ${i + 1}/${newSlugs.length} ${filename} — ${title}`);
    } catch (e) {
      log(`  ❌ Blog pin 失败 ${slug}: ${e.message}`);
    }
  }

  await page.close();

  if (pins.length === 0) return;

  const merged = [...existing, ...pins].slice(-50);
  fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2), 'utf8');
  log(`  ✅ ${site.name}: 新增 ${pins.length} 条，pin-content.json 共 ${merged.length} 条`);
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function generatePins() {
  log('════════════════════════════════════════');
  log('Generate Pins 启动');
  log('════════════════════════════════════════');

  const browser = await chromium.launch({ headless: true });

  // ── 工具站：sitemap 截图 ────────────────────────────────────────────────────
  for (const site of SITES) {
    log(`\n── ${site.name} ──`);

    if (!fs.existsSync(site.pinterestDir)) {
      fs.mkdirSync(site.pinterestDir, { recursive: true });
      log(`  📁 创建目录: ${site.pinterestDir}`);
    }

    let urls = [];
    if (site.autoDiscover) {
      urls = await fetchSitemap(site.sitemapUrl, site.urlFilter);
    }

    if (urls.length === 0) {
      log(`  ⚠️ ${site.name}: 无工具页 URL，跳过`);
      continue;
    }

    const selected = urls.sort(() => Math.random() - 0.5).slice(0, 10);
    log(`  🎯 选中 ${selected.length} 个页面截图`);

    const page  = await browser.newPage();
    await page.setViewportSize({ width: 1000, height: 1500 });

    const pins  = [];
    const stamp = Date.now();

    for (let i = 0; i < selected.length; i++) {
      const url = selected[i];
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(1000);

        const filename = `pin-${stamp}-${i + 1}.png`;
        const filepath = path.join(site.pinterestDir, filename);
        await page.screenshot({ path: filepath, fullPage: false });

        const title = await page.title().catch(() => '');
        const desc  = await page.$eval(
          'meta[name="description"]', el => el.getAttribute('content')
        ).catch(() => title);

        const cleanTitle = title.replace(/ [-|–] .*$/, '').trim()
          || path.basename(url).replace(/-/g, ' ');

        pins.push({
          file:  filename,
          name:  cleanTitle,
          image: filename,
          title: cleanTitle,
          desc:  desc || cleanTitle,
          text:  desc || cleanTitle,
          link:  url,
        });
        log(`  📸 ${i + 1}/${selected.length} ${filename} — ${cleanTitle}`);
      } catch (e) {
        log(`  ❌ 截图失败 ${url}: ${e.message}`);
      }
    }

    await page.close();

    if (pins.length === 0) { log(`  ⚠️ ${site.name}: 没有成功截图`); continue; }

    const jsonPath = path.join(site.pinterestDir, 'pin-content.json');
    let existing = [];
    if (fs.existsSync(jsonPath)) {
      try { existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (_) {}
    }
    const merged = [...existing, ...pins].slice(-50);
    fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2), 'utf8');
    log(`  ✅ ${site.name}: 新增 ${pins.length} 条，pin-content.json 共 ${merged.length} 条`);
  }

  // ── Blog 站：HTML 模板 Pin 图 ───────────────────────────────────────────────
  for (const site of BLOG_SITES) {
    await generateBlogPins(site, browser);
  }

  await browser.close();
  log('\n════ Generate Pins 完成 ════');
}

generatePins().catch(e => {
  log(`致命错误: ${e.message}`);
  process.exit(1);
});
