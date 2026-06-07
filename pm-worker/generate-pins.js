'use strict';
/**
 * generate-pins.js
 * 从站点 sitemap 自动发现工具页，截图生成 Pin 图，写入 pin-content.json
 * 新增站点只需在 SITES 数组加一行，无需修改其他代码
 */

const { chromium } = require('playwright');
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

const SITES = [
  {
    name:         'CoverageFixPro',
    baseUrl:      'https://coveragefixpro.com',
    pinterestDir: 'C:\\Users\\Administrator\\coveragefixpro\\pinterest',
    color:        '#1d4ed8',
    autoDiscover: true,
    sitemapUrl:   'https://coveragefixpro.com/sitemap.xml',
    // 匹配规则：包含 /tools/ 的路径
    urlFilter:    u => u.includes('/tools/'),
  },
  {
    name:         'ContractFixPro',
    baseUrl:      'https://contractfixpro.com',
    pinterestDir: 'C:\\Users\\Administrator\\contractfixpro\\pinterest',
    color:        '#2563eb',
    autoDiscover: true,
    sitemapUrl:   'https://contractfixpro.com/sitemap.xml',
    // contractfixpro 工具页直接在根路径，排除 index/about/privacy 等
    urlFilter:    u => u.endsWith('.html') && !u.match(/\/(index|about|privacy|terms|contact|404)\./),
  },
];

const LOG_FILE = 'C:\\Users\\Administrator\\pm-worker\\logs\\generate-pins.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf8'); } catch (_) {}
}

// ── Sitemap 抓取 ──────────────────────────────────────────────────────────────
function fetchSitemap(url, urlFilter) {
  const filter = urlFilter || (u => u.includes('/tools/'));
  return new Promise(resolve => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const urls = [...data.matchAll(/<loc>(.*?)<\/loc>/g)]
          .map(m => m[1].trim())
          .filter(filter);
        log(`  Sitemap ${url}: 找到 ${urls.length} 个工具页`);
        resolve(urls);
      });
    });
    req.on('error', e => { log(`  Sitemap 抓取失败: ${e.message}`); resolve([]); });
    req.on('timeout', () => { req.destroy(); log(`  Sitemap 超时`); resolve([]); });
  });
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function generatePins() {
  log('════════════════════════════════════════');
  log('Generate Pins 启动');
  log('════════════════════════════════════════');

  const browser = await chromium.launch({ headless: true });

  for (const site of SITES) {
    log(`\n── ${site.name} ──`);

    // 确保目录存在
    if (!fs.existsSync(site.pinterestDir)) {
      fs.mkdirSync(site.pinterestDir, { recursive: true });
      log(`  📁 创建目录: ${site.pinterestDir}`);
    }

    // 发现工具页
    let urls = [];
    if (site.autoDiscover) {
      urls = await fetchSitemap(site.sitemapUrl, site.urlFilter);
    }

    if (urls.length === 0) {
      log(`  ⚠️ ${site.name}: 无工具页 URL，跳过`);
      continue;
    }

    // 随机选最多 10 个
    const selected = urls.sort(() => Math.random() - 0.5).slice(0, 10);
    log(`  🎯 选中 ${selected.length} 个页面截图`);

    const page = await browser.newPage();
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

        // 提取 title / description
        const title = await page.title().catch(() => '');
        const desc  = await page.$eval(
          'meta[name="description"]', el => el.getAttribute('content')
        ).catch(() => title);

        const cleanTitle = title
          .replace(/ [-|–] .*$/, '')   // 去掉 " - SiteName" 后缀
          .trim() || path.basename(url).replace(/-/g, ' ');

        pins.push({
          file:  filename,
          name:  cleanTitle,
          image: filename,            // buffer-refill.js 旧字段兼容
          title: cleanTitle,
          desc:  desc || cleanTitle,
          text:  desc || cleanTitle,  // 兼容字段
          link:  url,
        });

        log(`  📸 ${i + 1}/${selected.length} ${filename} — ${cleanTitle}`);
      } catch (e) {
        log(`  ❌ 截图失败 ${url}: ${e.message}`);
      }
    }

    await page.close();

    if (pins.length === 0) {
      log(`  ⚠️ ${site.name}: 没有成功截图`);
      continue;
    }

    // 追加写入 pin-content.json（保留最近 50 条）
    const jsonPath = path.join(site.pinterestDir, 'pin-content.json');
    let existing = [];
    if (fs.existsSync(jsonPath)) {
      try { existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (_) {}
    }
    const merged = [...existing, ...pins].slice(-50);
    fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2), 'utf8');
    log(`  ✅ ${site.name}: 新增 ${pins.length} 条，pin-content.json 共 ${merged.length} 条`);
  }

  await browser.close();
  log('\n════ Generate Pins 完成 ════');
}

generatePins().catch(e => {
  log(`致命错误: ${e.message}`);
  process.exit(1);
});
