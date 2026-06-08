/**
 * Daily Website Report
 * - PayHip:   Playwright login → scrape last-24h purchases
 * - GA4:      Service-account credentials (skipped if ga-credentials.json absent)
 * - Buffer:   Playwright login → GraphQL queue status
 * - Email:    QQ SMTP
 */
'use strict';

const PLAYWRIGHT_MODULES = 'C:/Users/Administrator/contractfixpro/node_modules';

const nodemailer          = require('nodemailer');
const https               = require('https');
const fs                  = require('fs');
const path                = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { chromium: _chromium } = require(PLAYWRIGHT_MODULES + '/playwright-extra');
const StealthPlugin           = require(PLAYWRIGHT_MODULES + '/puppeteer-extra-plugin-stealth');
_chromium.use(StealthPlugin());
const chromium = _chromium;

const PROXY = 'http://127.0.0.1:7897';
const agent = new HttpsProxyAgent(PROXY);

// ── Config ────────────────────────────────────────────────────────────────────
const PAYHIP_EMAIL  = 'xiaohuixie3@gmail.com';
const PAYHIP_PASS   = 'xxh113824';
const BUFFER_EMAIL  = 'xiaohuixie3@gmail.com';
const BUFFER_PASS   = 'Xxh113324';
const BUFFER_ORG    = '6a2026ccd819e8c99b17eb9e';
const BUFFER_CHAN    = '6a204be9c687a22dd457f4d0';

const GA4_PROPERTIES = {
  'WordCaseFix':     '539531639',
  'VestCalc':        '539700100',
  'NotionTemplaFix': '539119398',
  'ContractFixPro':  '539948742',
  'BillingFixPro':   '540289117',
  'PayrollFixPro':   '540359696',
  'CoverageFixPro':  '540484051',
};

const SITES = [
  { id: 'WordCaseFix',     domain: 'wordcasefix.com'     },
  { id: 'VestCalc',        domain: 'vestcalc.com'        },
  { id: 'NotionTemplaFix', domain: 'notiontemplafix.com' },
  { id: 'ContractFixPro',  domain: 'contractfixpro.com'  },
  { id: 'BillingFixPro',   domain: 'billingfixpro.com'   },
  { id: 'PayrollFixPro',   domain: 'payrollfixpro.com'   },
  { id: 'CoverageFixPro',  domain: 'coveragefixpro.com'  },
];

const SC_SITES = {
  'WordCaseFix':     'sc-domain:wordcasefix.com',
  'VestCalc':        'sc-domain:vestcalc.com',
  'NotionTemplaFix': 'sc-domain:notiontemplafix.com',
  'ContractFixPro':  'sc-domain:contractfixpro.com',
  'BillingFixPro':   'sc-domain:billingfixpro.com',
  'PayrollFixPro':   'sc-domain:payrollfixpro.com',
  'CoverageFixPro':  'sc-domain:coveragefixpro.com',
};

const ADSENSE_SUBMIT_DATES = {
  'WordCaseFix':     '2026-06-07',
  'VestCalc':        '2026-06-07',
  'ContractFixPro':  '2026-06-07',
  'BillingFixPro':   '2026-06-07',
  'PayrollFixPro':   '2026-06-07',
  'CoverageFixPro':  '2026-06-07',
  'NotionTemplaFix': null,
};

const SMTP = {
  host: 'smtp.qq.com', port: 465, secure: true,
  user: '295965231@qq.com', pass: 'msygvjzroawdbgce',
  to:   '295965231@qq.com',
};

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Generic HTTPS helper ──────────────────────────────────────────────────────
function request(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const options = {
      hostname: u.hostname, path: u.pathname + u.search,
      method: opts.method || 'GET', agent,
      headers: opts.headers || {},
    };
    if (opts.body) options.headers['Content-Length'] = Buffer.byteLength(opts.body);
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end',  () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(opts.timeout || 20000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYHIP SALES (via Playwright — login + scrape dashboard)
// ═══════════════════════════════════════════════════════════════════════════
async function getPayHipSales(_page) {
  // PayHip has no accessible REST API; URL routing conflict prevents scraping.
  // Return placeholder so email includes a direct dashboard link.
  log('PayHip: no API available — directing to dashboard link');
  return {
    orders: null, revenue: null, products: [],
    note: 'Direct link: https://payhip.com/dashboard/purchases\nFilter by today to see last-24h sales.',
  };
}

async function _getPayHipSalesViaPlaywright(page) {
  log('Fetching PayHip sales...');
  try {
    await page.goto('https://payhip.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    log(`  PayHip login page: ${page.url()}`);

    // Fill login form — PayHip uses name="login" (text field) for email
    await page.fill('input[name="login"]', PAYHIP_EMAIL);
    await sleep(300);
    await page.fill('input[name="password"]', PAYHIP_PASS);
    await sleep(300);
    await page.click('button[type="submit"]');
    await sleep(8000);
    log(`  After login: ${page.url()}`);

    log(`  After login: ${page.url()}`);

    // Navigate to purchases/sales page
    await page.goto('https://payhip.com/dashboard/purchases', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);

    // Also try the analytics/overview page for a quick revenue figure
    const sales = await page.evaluate(() => {
      const rows    = [...document.querySelectorAll('table tbody tr, .purchase-row, [data-purchase]')];
      const now     = Date.now();
      const cutoff  = now - 24 * 3600 * 1000;
      const results = [];

      for (const row of rows) {
        const dateText  = row.querySelector('.date, td:nth-child(1), [data-date]')?.textContent?.trim();
        const priceText = row.querySelector('.price, .amount, td:nth-child(4), [data-price]')?.textContent?.trim();
        const prodText  = row.querySelector('.product, .item, td:nth-child(2), [data-product]')?.textContent?.trim();
        const dateMs    = dateText ? new Date(dateText).getTime() : 0;

        if (!isNaN(dateMs) && dateMs > cutoff) {
          results.push({
            date:    dateText,
            product: prodText || 'Unknown',
            price:   priceText || '0',
          });
        }
      }

      // Also extract dashboard summary numbers if present
      const summaryRevenue = document.querySelector('.revenue, .total-revenue, .sales-amount')?.textContent?.trim();
      const summaryOrders  = document.querySelector('.orders-count, .total-orders')?.textContent?.trim();

      return {
        rows: results,
        summaryRevenue,
        summaryOrders,
        pageTitle: document.title,
        rowCount: rows.length,
        html: document.body.innerText.slice(0, 800),
      };
    });

    log(`  PayHip page: ${sales.pageTitle} | rows: ${sales.rowCount}`);
    log(`  Summary: revenue=${sales.summaryRevenue} orders=${sales.summaryOrders}`);

    if (sales.rows.length > 0) {
      let revenue = 0;
      const prodMap = {};
      for (const r of sales.rows) {
        const amt = parseFloat(r.price.replace(/[^0-9.]/g, '')) || 0;
        revenue  += amt;
        prodMap[r.product] = (prodMap[r.product] || 0) + 1;
      }
      return {
        orders:   sales.rows.length,
        revenue:  revenue.toFixed(2),
        products: Object.entries(prodMap).map(([name, qty]) => ({ name, qty })),
      };
    }

    // Fallback: try the dashboard home for daily stats
    await page.goto('https://payhip.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1500);
    const dash = await page.evaluate(() => {
      // Try to find revenue/orders widgets
      const text = document.body.innerText;
      return { title: document.title, snippet: text.slice(0, 1200) };
    });
    log(`  Dashboard: ${dash.title}\n  Snippet: ${dash.snippet.slice(0, 300)}`);

    return {
      orders: 0, revenue: '0.00', products: [],
      note: 'No sales data parsed from dashboard — check https://payhip.com/dashboard/purchases',
    };

  } catch (e) {
    log(`  PayHip error: ${e.message}`);
    return { orders: 0, revenue: '0.00', products: [], error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE ANALYTICS 4 (service-account, optional)
// ═══════════════════════════════════════════════════════════════════════════
async function getGA4Data() {
  log('Fetching GA4 data...');
  const credFile = path.join(__dirname, 'ga-credentials.json');
  if (!fs.existsSync(credFile)) {
    log('  No ga-credentials.json → skipping GA4');
    return null;
  }
  let creds;
  try { creds = JSON.parse(fs.readFileSync(credFile, 'utf8')); }
  catch { return null; }

  let token;
  try { token = await getServiceAccountToken(creds); }
  catch (e) { log('  Token error: ' + e.message); return null; }

  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const results = {};
  for (const [site, numId] of Object.entries(GA4_PROPERTIES)) {
    try {
      const [usersRes, pagesRes] = await Promise.all([
        request(
          `https://analyticsdata.googleapis.com/v1beta/properties/${numId}:runReport`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dateRanges: [{ startDate: yesterday, endDate: yesterday }],
              metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
            }),
          }
        ),
        request(
          `https://analyticsdata.googleapis.com/v1beta/properties/${numId}:runReport`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dateRanges: [{ startDate: yesterday, endDate: yesterday }],
              dimensions: [{ name: 'pagePath' }],
              metrics:    [{ name: 'screenPageViews' }],
              orderBys:   [{ metric: { metricName: 'screenPageViews' }, desc: true }],
              limit: 3,
            }),
          }
        ),
      ]);
      if (usersRes.status === 200) {
        const d   = JSON.parse(usersRes.body);
        const row = d?.rows?.[0]?.metricValues;
        const topPages = pagesRes.status === 200
          ? (JSON.parse(pagesRes.body).rows || []).map(r => ({
              path:  r.dimensionValues?.[0]?.value || '/',
              views: parseInt(r.metricValues?.[0]?.value) || 0,
            }))
          : [];
        results[site] = { users: row?.[0]?.value || '0', views: row?.[1]?.value || '0', topPages };
        log(`  ${site}: ${results[site].users} users, ${results[site].views} views`);
      } else {
        log(`  ${site}: HTTP ${usersRes.status} — ${usersRes.body.slice(0, 200)}`);
        results[site] = { users: 'n/a', views: 'n/a', topPages: [] };
      }
    } catch { results[site] = { users: 'err', views: 'err', topPages: [] }; }
  }
  return results;
}

async function getServiceAccountToken(creds) {
  const { createSign } = require('crypto');
  const now    = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim  = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  })).toString('base64url');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${sign.sign(creds.private_key, 'base64url')}`;
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const res  = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = JSON.parse(res.body);
  if (!j.access_token) throw new Error(j.error_description || JSON.stringify(j).slice(0, 100));
  return j.access_token;
}

// ═══════════════════════════════════════════════════════════════════════════
// OAUTH TOKEN REFRESH (for Search Console)
// ═══════════════════════════════════════════════════════════════════════════
async function getOAuthAccessToken() {
  const clientFile = path.join(__dirname, 'oauth-client.json');
  const tokenFile  = path.join(__dirname, 'oauth-token.json');
  if (!fs.existsSync(clientFile) || !fs.existsSync(tokenFile)) return null;
  let client, token;
  try {
    client = JSON.parse(fs.readFileSync(clientFile, 'utf8')).installed;
    token  = JSON.parse(fs.readFileSync(tokenFile,  'utf8'));
  } catch { return null; }
  const body = [
    `client_id=${encodeURIComponent(client.client_id)}`,
    `client_secret=${encodeURIComponent(client.client_secret)}`,
    `refresh_token=${encodeURIComponent(token.refresh_token)}`,
    'grant_type=refresh_token',
  ].join('&');
  try {
    const res = await request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const j = JSON.parse(res.body);
    if (!j.access_token) { log('  OAuth refresh failed: ' + JSON.stringify(j).slice(0, 80)); return null; }
    token.access_token = j.access_token;
    token.expiry = Date.now() + (j.expires_in || 3599) * 1000;
    fs.writeFileSync(tokenFile, JSON.stringify(token, null, 2));
    return j.access_token;
  } catch (e) { log('  OAuth error: ' + e.message); return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH CONSOLE (disabled — service account not yet added to SC)
// ═══════════════════════════════════════════════════════════════════════════
async function getSearchConsoleData() {
  log('Search Console: 授权待配置，跳过');
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUFFER PUBLISHED TODAY (from log file)
// ═══════════════════════════════════════════════════════════════════════════
function getBufferPublishedToday() {
  const logFile = 'C:\\Users\\Administrator\\pm-worker\\logs\\buffer-refill.log';
  try {
    const today   = new Date().toISOString().slice(0, 10);
    const content = fs.readFileSync(logFile, 'utf8');
    let count = 0;
    for (const line of content.split('\n')) {
      if (line.includes(today) && (line.includes('Added') || (line.includes('✅') && line.toLowerCase().includes('pin')))) count++;
    }
    return count;
  } catch (_) { return 0; }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADSENSE STATUS
// ═══════════════════════════════════════════════════════════════════════════
function getAdSenseStatus() {
  const today = new Date();
  return Object.entries(ADSENSE_SUBMIT_DATES).map(([site, submitDate]) => {
    if (!submitDate) return { site, days: null, status: 'na', label: '不适用', color: '#64748b' };
    const days = Math.floor((today - new Date(submitDate)) / 86400000);
    if (days < 7)  return { site, days, status: 'normal',   label: `审核中（${days}天）`,      color: '#22c55e' };
    if (days < 14) return { site, days, status: 'slow',     label: `审核中（${days}天，稍慢）`, color: '#f59e0b' };
    return               { site, days, status: 'overtime',  label: `⚠️超时（${days}天）`,       color: '#ef4444' };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUFFER QUEUE STATUS (Playwright, reuse session)
// ═══════════════════════════════════════════════════════════════════════════
async function getBufferStatus(page) {
  log('Fetching Buffer queue status...');
  try {
    await page.goto('https://login.buffer.com/login?redirect=https://publish.buffer.com/', {
      waitUntil: 'domcontentloaded', timeout: 40000,
    });
    await sleep(2000);
    await page.fill('input[type="email"]',    BUFFER_EMAIL);
    await page.fill('input[type="password"]', BUFFER_PASS);
    await page.click('button[type="submit"]');
    await sleep(15000);

    log(`  Buffer URL: ${page.url()}`);

    const result = await page.evaluate(async ({ orgId, chanId }) => {
      const gql = async (q) => {
        const r = await fetch('https://api.buffer.com/graphql', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
        });
        return r.json();
      };

      // First get the full post list via the queue
      const sch = await gql(`{
        posts(input: { organizationId: "${orgId}", filter: { status: scheduled } }) {
          edges { node { id dueAt } }
        }
      }`);
      const dft = await gql(`{
        posts(input: { organizationId: "${orgId}", filter: { status: draft } }) {
          edges { node { id dueAt } }
        }
      }`);
      return {
        scheduledCount: sch?.data?.posts?.edges?.length ?? '?',
        draftsCount:    dft?.data?.posts?.edges?.length ?? '?',
        scheduledErr:   sch?.errors?.[0]?.message,
        draftsErr:      dft?.errors?.[0]?.message,
      };
    }, { orgId: BUFFER_ORG, chanId: BUFFER_CHAN });

    if (result.scheduledErr) log(`  Buffer scheduled err: ${result.scheduledErr}`);
    if (result.draftsErr)    log(`  Buffer drafts err: ${result.draftsErr}`);

    return { scheduled: result.scheduledCount, drafts: result.draftsCount };
  } catch (e) {
    log(`  Buffer error: ${e.message}`);
    return { scheduled: '?', drafts: '?', error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA ANALYSIS (Chinese, actionable insights)
// ═══════════════════════════════════════════════════════════════════════════
function generateAnalysis(sales, ga, buffer) {
  const insights = [];

  // ── Traffic ──
  if (ga) {
    const sites = Object.keys(GA4_PROPERTIES).map(name => ({
      name,
      users: parseInt(ga[name]?.users) || 0,
      views: parseInt(ga[name]?.views) || 0,
    }));
    const totalUsers = sites.reduce((s, x) => s + x.users, 0);
    const totalViews = sites.reduce((s, x) => s + x.views, 0);
    const sorted     = [...sites].sort((a, b) => b.users - a.users);
    const top        = sorted[0];
    const low        = sorted[sorted.length - 1];

    insights.push({ icon: '📊', text: `昨日总访客 <strong>${totalUsers}</strong> 人，共 <strong>${totalViews}</strong> 次页面浏览，人均浏览 ${totalUsers ? (totalViews / totalUsers).toFixed(1) : 0} 页。` });

    if (top.users > 0) {
      insights.push({ icon: '🏆', text: `流量冠军：<strong>${top.name}</strong>（${top.users} 用户）${top.users > 20 ? '，表现优秀，可加大该站点产品推广力度。' : '，持续关注增长趋势。'}` });
    }
    if (low.users === 0) {
      insights.push({ icon: '⚠️', text: `<strong>${low.name}</strong> 昨日零流量，建议检查页面收录状态与 SEO 关键词布局。`, warn: true });
    } else if (low.users < 5) {
      insights.push({ icon: '📉', text: `<strong>${low.name}</strong> 流量偏低（${low.users} 用户），建议优化页面标题/描述或增加外链。`, warn: true });
    }

    // Engagement check
    sites.forEach(s => {
      const ratio = s.users > 0 ? s.views / s.users : 0;
      if (s.users >= 5 && ratio < 1.2) {
        insights.push({ icon: '💡', text: `<strong>${s.name}</strong> 人均浏览仅 ${ratio.toFixed(1)} 页，跳出率可能偏高，建议优化内链与落地页内容。` });
      }
    });
  }

  // ── Buffer ──
  const scheduled = parseInt(buffer.scheduled) || 0;
  const drafts    = parseInt(buffer.drafts)    || 0;
  if (scheduled >= 8) {
    insights.push({ icon: '✅', text: `Pinterest 队列充足（${scheduled} 条已排队），内容分发节奏良好。` });
  } else if (scheduled < 5) {
    insights.push({ icon: '⚠️', text: `Pinterest 队列仅剩 <strong>${scheduled}</strong> 条，建议本周内补充新帖。`, warn: true });
  }
  if (drafts > 0) {
    insights.push({ icon: '📝', text: `有 <strong>${drafts}</strong> 条草稿待发布，可前往 Buffer 排队，填满免费计划的10条上限。` });
  }

  // ── Sales ──
  if (sales.orders === null || sales.orders === 0) {
    insights.push({ icon: '💰', text: '过去24小时暂无销售记录，建议在 Pinterest 帖文中强化产品链接曝光，并检查 Payhip 落地页转化率。' });
  } else if (sales.orders > 0) {
    insights.push({ icon: '🎉', text: `今日成交 <strong>${sales.orders}</strong> 单，收入 <strong>$${sales.revenue}</strong>，继续保持！` });
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT REPORT (HTML)
// ═══════════════════════════════════════════════════════════════════════════
function formatReport(sales, ga, buffer, sc, bufferToday) {
  const now  = new Date();
  const ts   = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const date = now.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  });

  const subject = `📊 网站日报 ${date}`;

  // ── Sales block ──
  let salesHtml;
  if (sales.orders > 0) {
    const rows = sales.products.map(p =>
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${p.name}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${p.qty}</td></tr>`
    ).join('');
    salesHtml = `
      <div style="font-size:28px;font-weight:700;color:#16a34a;">$${sales.revenue}</div>
      <div style="color:#64748b;font-size:13px;margin-bottom:12px;">共 ${sales.orders} 笔订单</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;overflow:hidden;">
        <tr style="background:#f1f5f9;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">产品</th><th style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;">数量</th></tr>
        ${rows}
      </table>`;
  } else {
    salesHtml = `
      <div style="color:#94a3b8;font-size:14px;margin-bottom:10px;">暂无销售数据，请手动查看</div>
      <a href="https://payhip.com/dashboard/purchases" style="display:inline-block;background:#f1f5f9;color:#334155;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:13px;">🔗 打开 Payhip 后台 →</a>`;
  }

  // ── GA4 traffic table ──
  let gaRows = '';
  let gaNote = '';
  if (!ga) {
    gaNote = '<div style="color:#94a3b8;font-size:13px;">GA4 数据不可用，请检查服务账号权限。</div>';
  } else {
    const sitesData = Object.keys(GA4_PROPERTIES).map(name => ({
      name,
      users: parseInt(ga[name]?.users) || 0,
      views: parseInt(ga[name]?.views) || 0,
    }));
    const maxUsers = Math.max(...sitesData.map(s => s.users), 1);

    gaRows = sitesData.map((s, i) => {
      const barW    = Math.round((s.users / maxUsers) * 100);
      const bg      = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const ratio   = s.users > 0 ? (s.views / s.users).toFixed(1) : '0';
      const topPage = ga[s.name]?.topPages?.[0];
      const pageStr = topPage
        ? `<span style="font-size:10px;color:#2563eb;font-family:monospace;">${topPage.path.length > 28 ? topPage.path.slice(0,28)+'…' : topPage.path}</span><span style="color:#94a3b8;font-size:10px;margin-left:4px;">(${topPage.views})</span>`
        : '<span style="color:#cbd5e1;font-size:11px;">--</span>';
      return `
        <tr style="background:${bg};">
          <td style="padding:10px 14px;font-size:13px;font-weight:500;color:#1e293b;">${s.name}</td>
          <td style="padding:10px 14px;text-align:center;">
            <span style="font-size:16px;font-weight:700;color:#2563eb;">${s.users}</span>
          </td>
          <td style="padding:10px 14px;text-align:center;">
            <span style="font-size:15px;color:#475569;">${s.views}</span>
          </td>
          <td style="padding:10px 14px;text-align:center;">
            <span style="font-size:13px;color:#64748b;">${ratio}</span>
          </td>
          <td style="padding:10px 14px;">${pageStr}</td>
          <td style="padding:10px 20px 10px 0;">
            <div style="background:#e2e8f0;border-radius:4px;height:6px;width:100%;min-width:60px;">
              <div style="background:#2563eb;border-radius:4px;height:6px;width:${barW}%;"></div>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // ── Buffer block ──
  const scheduled = buffer.scheduled ?? '?';
  const drafts    = buffer.drafts    ?? '?';
  const queuePct  = typeof scheduled === 'number' ? Math.round((scheduled / 10) * 100) : 0;
  const bufferHtml = buffer.error
    ? `<div style="color:#ef4444;font-size:13px;">获取失败：${buffer.error}</div><a href="https://publish.buffer.com" style="color:#3b82f6;font-size:13px;">前往 Buffer →</a>`
    : `
      <div style="display:flex;gap:24px;margin-bottom:14px;">
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:14px 16px;text-align:center;">
          <div style="font-size:26px;font-weight:700;color:#7c3aed;">${scheduled}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">已排队</div>
        </div>
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:14px 16px;text-align:center;">
          <div style="font-size:26px;font-weight:700;color:#f59e0b;">${drafts}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">草稿</div>
        </div>
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:14px 16px;text-align:center;">
          <div style="font-size:26px;font-weight:700;color:#10b981;">10</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">队列上限</div>
        </div>
      </div>
      <div style="background:#e2e8f0;border-radius:6px;height:8px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#7c3aed,#a78bfa);height:8px;width:${queuePct}%;border-radius:6px;"></div>
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-top:6px;">队列使用率 ${queuePct}%</div>`;

  // ── Analysis insights ──
  const insights   = generateAnalysis(sales, ga, buffer);
  const insightRows = insights.map(ins => `
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:28px;font-size:16px;">${ins.icon}</td>
      <td style="padding:8px 0 8px 8px;font-size:13px;color:${ins.warn ? '#b45309' : '#334155'};line-height:1.6;">${ins.text}</td>
    </tr>`).join('');

  // ── Section builder ──
  const section = (color, icon, title, content) => `
    <tr><td style="padding:0 0 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="background:${color};padding:14px 20px;">
          <span style="color:#fff;font-weight:700;font-size:14px;">${icon} ${title}</span>
        </td></tr>
        <tr><td style="padding:20px;">${content}</td></tr>
      </table>
    </td></tr>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'PingFang SC','Microsoft YaHei',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:12px 12px 0 0;padding:28px 28px 24px;">
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">📊 网站日报</div>
    <div style="color:#94a3b8;font-size:13px;margin-top:6px;">${date} &nbsp;·&nbsp; 7个站点 &nbsp;·&nbsp; 每日 08:00 自动生成</div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#f0f4f8;padding:16px 0 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:0 0 8px;">

    ${section('#16a34a', '💰', '销售数据（过去24小时）', salesHtml)}

    ${section('#2563eb', '📈', '流量数据（昨日）',
      ga ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr style="background:#f1f5f9;">
            <th style="padding:9px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">站点</th>
            <th style="padding:9px 14px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">用户数</th>
            <th style="padding:9px 14px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">浏览量</th>
            <th style="padding:9px 14px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">人均页数</th>
            <th style="padding:9px 14px;font-size:12px;color:#64748b;font-weight:600;">热门页面</th>
            <th style="padding:9px 20px 9px 0;font-size:12px;color:#64748b;font-weight:600;"></th>
          </tr>
          ${gaRows}
        </table>` : gaNote
    )}

    ${section('#7c3aed', '📌', 'Pinterest / Buffer 队列', bufferHtml)}

    ${section('#d97706', '💡', '数据分析与建议',
      `<table width="100%" cellpadding="0" cellspacing="0">${insightRows}</table>`
    )}

    ${section('#0369a1', '🔍', 'SEO 曝光数据（昨日 Search Console）', (() => {
      const scSites = Object.keys(SC_SITES);
      const hasAny  = sc && scSites.some(s => sc[s]);
      if (!hasAny) return '<div style="color:#94a3b8;font-size:13px;">SC授权待配置（需将服务账号添加到 Search Console 用户）</div>';
      const rows = scSites.map((s, i) => {
        const d  = sc?.[s];
        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        const topPage = d?.top3?.[0]?.page || '--';
        const topShort = topPage.length > 30 ? topPage.slice(0,30)+'…' : topPage;
        return `<tr style="background:${bg};">
          <td style="padding:9px 14px;font-size:13px;font-weight:500;color:#1e293b;">${s}</td>
          <td style="padding:9px 14px;text-align:center;font-size:14px;font-weight:700;color:#0369a1;">${d ? d.impressions.toLocaleString() : '--'}</td>
          <td style="padding:9px 14px;text-align:center;font-size:14px;font-weight:700;color:#16a34a;">${d ? d.clicks : '--'}</td>
          <td style="padding:9px 14px;text-align:center;font-size:13px;color:#64748b;">${d ? d.avgPos : '--'}</td>
          <td style="padding:9px 14px;font-size:11px;color:#475569;font-family:monospace;">${topShort}</td>
        </tr>`;
      }).join('');
      return `<table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr style="background:#f1f5f9;">
          <th style="padding:9px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">站点</th>
          <th style="padding:9px 14px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">昨日曝光</th>
          <th style="padding:9px 14px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">昨日点击</th>
          <th style="padding:9px 14px;text-align:center;font-size:12px;color:#64748b;font-weight:600;">平均排名</th>
          <th style="padding:9px 14px;font-size:12px;color:#64748b;font-weight:600;">Top流量页</th>
        </tr>${rows}</table>`;
    })())}

    ${section('#6d28d9', '⚙️', '运营状态', (() => {
      const adsenseStatus = getAdSenseStatus();
      const adsRows = adsenseStatus.map(a => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:13px;color:#334155;">${a.site}</span>
          <span style="font-size:12px;color:${a.color};font-weight:600;">${a.label}</span>
        </div>`).join('');
      const pinCount = typeof bufferToday === 'number' ? bufferToday : 0;
      const pinColor = pinCount >= 3 ? '#16a34a' : pinCount > 0 ? '#d97706' : '#94a3b8';
      return `
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div style="flex:2;min-width:220px;">
            <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;">AdSense 审核状态</div>
            ${adsRows}
            <a href="https://www.google.com/adsense" style="display:inline-block;margin-top:10px;background:#f1f5f9;color:#334155;text-decoration:none;padding:6px 14px;border-radius:6px;font-size:12px;">🔗 打开 AdSense →</a>
          </div>
          <div style="flex:1;min-width:130px;background:#f8fafc;border-radius:10px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#64748b;margin-bottom:8px;font-weight:600;">今日 Buffer 发布</div>
            <div style="font-size:38px;font-weight:800;color:${pinColor};line-height:1;">${pinCount}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">条 Pin</div>
            <a href="https://publish.buffer.com" style="display:inline-block;margin-top:10px;background:#ede9fe;color:#6d28d9;text-decoration:none;padding:5px 12px;border-radius:5px;font-size:11px;">前往 Buffer →</a>
          </div>
        </div>`;
    })())}

  </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#1e293b;border-radius:0 0 12px 12px;padding:16px 28px;text-align:center;">
    <div style="color:#64748b;font-size:12px;">报告生成时间：${ts}</div>
    <div style="color:#475569;font-size:11px;margin-top:4px;">WordCaseFix · VestCalc · NotionTemplaFix · ContractFixPro · BillingFixPro · PayrollFixPro · CoverageFixPro</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEND EMAIL
// ═══════════════════════════════════════════════════════════════════════════
async function sendEmail(subject, html) {
  log(`Sending: "${subject}"`);
  const t = nodemailer.createTransport({
    host: SMTP.host, port: SMTP.port, secure: SMTP.secure,
    auth: { user: SMTP.user, pass: SMTP.pass },
    tls: { rejectUnauthorized: false },
  });
  await t.verify();
  const info = await t.sendMail({
    from:    `"网站日报" <${SMTP.user}>`,
    to:      SMTP.to,
    subject,
    html,
  });
  log(`  ✓ Sent: ${info.messageId}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// QA CHECK
// ═══════════════════════════════════════════════════════════════════════════
async function checkSiteQA(site) {
  const base = `https://${site.domain}`;
  const checks = [];

  // 1. Homepage
  try {
    const r = await request(base);
    const ok = r.status >= 200 && r.status < 400;
    checks.push({ name: '首页可访问', level: ok ? 'pass' : 'fix', detail: `HTTP ${r.status}` });
  } catch (e) {
    checks.push({ name: '首页可访问', level: 'fix', detail: e.message.slice(0, 60) });
  }

  // 2. ads.txt
  try {
    const r = await request(`${base}/ads.txt`);
    const hasId = r.body.includes(ADSENSE_PUB);
    const level = r.status !== 200 ? 'fix' : !hasId ? 'warn' : 'pass';
    const detail = r.status !== 200 ? `HTTP ${r.status}` : !hasId ? 'pub-id 不匹配' : 'pub-id 正确';
    checks.push({ name: 'ads.txt', level, detail });
  } catch (e) {
    checks.push({ name: 'ads.txt', level: 'fix', detail: e.message.slice(0, 60) });
  }

  // 3. sitemap.xml
  try {
    const r = await request(`${base}/sitemap.xml`);
    const hasUrls = r.body.includes('<url>');
    const ok = r.status === 200 && hasUrls;
    const detail = ok
      ? `HTTP ${r.status} · ${(r.body.match(/<url>/g) || []).length} URLs`
      : r.status !== 200 ? `HTTP ${r.status}` : '内容格式异常';
    checks.push({ name: 'sitemap.xml', level: ok ? 'pass' : 'fix', detail });
  } catch (e) {
    checks.push({ name: 'sitemap.xml', level: 'fix', detail: e.message.slice(0, 60) });
  }

  // 4. robots.txt
  try {
    const r = await request(`${base}/robots.txt`);
    const ok = r.status === 200;
    checks.push({ name: 'robots.txt', level: ok ? 'pass' : 'warn', detail: `HTTP ${r.status}` });
  } catch (e) {
    checks.push({ name: 'robots.txt', level: 'warn', detail: e.message.slice(0, 60) });
  }

  // 5. canonical / meta description (parse homepage body)
  try {
    const r = await request(base);
    const hasCanonical = r.body.includes('rel="canonical"') || r.body.includes("rel='canonical'");
    const hasMeta      = r.body.includes('name="description"') || r.body.includes("name='description'");
    checks.push({ name: 'canonical 标签', level: hasCanonical ? 'pass' : 'warn', detail: hasCanonical ? '存在' : '缺失' });
    checks.push({ name: 'meta description', level: hasMeta ? 'pass' : 'warn', detail: hasMeta ? '存在' : '缺失' });
  } catch (_) {}

  const fixCount  = checks.filter(c => c.level === 'fix').length;
  const warnCount = checks.filter(c => c.level === 'warn').length;
  const status    = fixCount > 0 ? 'fix' : warnCount > 0 ? 'warn' : 'pass';
  return { ...site, checks, status, fixCount, warnCount, passCount: checks.filter(c => c.level === 'pass').length };
}

function formatQAReport(results) {
  const now  = new Date();
  const ts   = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const date = now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
  const esc  = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const subject    = `🔍 QA检查报告 ${date}`;
  const totalFix   = results.filter(r => r.status === 'fix').length;
  const totalWarn  = results.filter(r => r.status === 'warn').length;
  const totalPass  = results.filter(r => r.status === 'pass').length;

  const statusMeta = {
    pass: { icon: '✅', color: '#22c55e', border: '#166534', bg: '#052e1a', label: '全部通过' },
    warn: { icon: '⚠️', color: '#f59e0b', border: '#92400e', bg: '#1c1304', label: '需关注'  },
    fix:  { icon: '❌', color: '#ef4444', border: '#7f1d1d', bg: '#2d0f0f', label: '需修复'  },
  };

  const checkGroup = (checks, color, rowBg) => checks.map(c => `
    <tr>
      <td style="padding:5px 10px;font-size:12px;color:#cbd5e1;background:${rowBg};border-radius:4px 0 0 4px;">${esc(c.name)}</td>
      <td style="padding:5px 12px;font-size:11px;color:${color};font-family:monospace;background:${rowBg};border-radius:0 4px 4px 0;text-align:right;">${esc(c.detail)}</td>
    </tr>
    <tr><td colspan="2" style="height:2px;"></td></tr>`).join('');

  const siteCards = results.map(site => {
    const meta       = statusMeta[site.status];
    const fixChecks  = site.checks.filter(c => c.level === 'fix');
    const warnChecks = site.checks.filter(c => c.level === 'warn');
    const passChecks = site.checks.filter(c => c.level === 'pass');

    const section = (label, checks, color, rowBg) => !checks.length ? '' : `
      <div style="margin-bottom:10px;">
        <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px;">${label}</div>
        <table width="100%" cellpadding="0" cellspacing="0">${checkGroup(checks, color, rowBg)}</table>
      </div>`;

    const hasIssues = fixChecks.length + warnChecks.length + passChecks.length > 0;
    return `
    <div style="background:#0a0a14;border:1px solid #1e293b;border-left:4px solid ${meta.color};border-radius:8px;padding:16px 18px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;${hasIssues ? 'margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #1e293b;' : ''}">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px;line-height:1;">${meta.icon}</span>
          <div>
            <div style="font-size:14px;font-weight:700;color:#e2e8f0;">${esc(site.id)}</div>
            <div style="font-size:11px;color:#475569;margin-top:2px;">${esc(site.domain)}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <span style="display:inline-block;background:${meta.bg};border:1px solid ${meta.border};color:${meta.color};font-size:11px;font-weight:700;padding:3px 12px;border-radius:12px;">${meta.label}</span>
          ${(site.fixCount || site.warnCount) ? `<div style="font-size:10px;color:#64748b;margin-top:4px;">${site.fixCount ? site.fixCount + ' 需修复 ' : ''}${site.warnCount ? site.warnCount + ' 需关注' : ''}</div>` : ''}
        </div>
      </div>
      ${section('❌ 需修复', fixChecks,  '#ef4444', '#1a0505')}
      ${section('⚠️ 需关注', warnChecks, '#f59e0b', '#1a1005')}
      ${section('✅ 已通过', passChecks, '#22c55e', '#051a0f')}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:24px 0;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0d1117 0%,#161b22 100%);border:1px solid #21262d;border-radius:12px 12px 0 0;padding:26px 28px 22px;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
      <span style="font-size:30px;line-height:1;">🔍</span>
      <div>
        <div style="color:#e6edf3;font-size:20px;font-weight:800;letter-spacing:-0.5px;">QA 检查报告</div>
        <div style="color:#8b949e;font-size:12px;margin-top:4px;">${date} &nbsp;·&nbsp; ${results.length} 个站点全量检查</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;">
      <div style="flex:1;background:#2d0f0f;border:1px solid #7f1d1d;border-radius:8px;padding:12px 14px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#ef4444;line-height:1;">${totalFix}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">站点需修复</div>
      </div>
      <div style="flex:1;background:#1c1304;border:1px solid #92400e;border-radius:8px;padding:12px 14px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#f59e0b;line-height:1;">${totalWarn}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">站点需关注</div>
      </div>
      <div style="flex:1;background:#052e1a;border:1px solid #166534;border-radius:8px;padding:12px 14px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#22c55e;line-height:1;">${totalPass}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">站点全部通过</div>
      </div>
    </div>
  </td></tr>

  <!-- Site Cards -->
  <tr><td style="background:#0f0f1a;padding:14px 0;">
    ${siteCards}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0d1117;border:1px solid #21262d;border-radius:0 0 12px 12px;padding:14px 28px;text-align:center;">
    <div style="color:#484f58;font-size:11px;">PM Worker QA · ${results.length} 个站点 · ${ts}</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}

async function runQAReport() {
  const t0 = Date.now();
  log('════════════════════════════════════');
  log('QA Report — ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  log('════════════════════════════════════');

  const results = [];
  for (const site of SITES) {
    log(`\n  Checking: ${site.domain} ...`);
    const r = await checkSiteQA(site);
    const icon = r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
    log(`  ${icon} ${site.id}: fix=${r.fixCount} warn=${r.warnCount} pass=${r.passCount}`);
    results.push(r);
  }

  const { subject, html } = formatQAReport(results);
  log(`\nSubject: ${subject}`);

  try {
    await sendEmail(subject, html);
  } catch (e) {
    log(`✗ Email failed: ${e.message}`);
    const out = path.join(__dirname, `qa-report-${new Date().toISOString().slice(0, 10)}.html`);
    fs.writeFileSync(out, html);
    log(`  Saved locally: ${out}`);
  }

  log(`\nFinished in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function runDailyReport() {
  const t0 = Date.now();
  log('════════════════════════════════════');
  log('Daily Report — ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  log('════════════════════════════════════');

  // GA4 + Buffer log (pure async, no browser needed)
  const gaPromise   = getGA4Data();
  const bufferToday = getBufferPublishedToday();
  log(`Buffer published today (from log): ${bufferToday}`);

  // PayHip + Buffer share one Playwright browser
  const browser = await chromium.launch({
    headless: true,
    slowMo:   50,
    proxy:    { server: PROXY },
    args:     ['--no-sandbox', '--disable-gpu', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    viewport:          { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const payhipPage = await ctx.newPage();
  const bufferPage = await ctx.newPage();

  const [sales, buffer, ga] = await Promise.all([
    getPayHipSales(payhipPage),
    getBufferStatus(bufferPage),
    gaPromise,
  ]);
  const sc = await getSearchConsoleData();

  await browser.close();

  log('\n── Collected ────────────────────────');
  log(`  Sales:  $${sales.revenue || '0'}, ${sales.orders || 0} orders`);
  log(`  Buffer: ${buffer.scheduled} scheduled, ${buffer.drafts} drafts`);
  log(`  GA4:    ${ga ? 'fetched' : 'skipped'}`);
  log(`  SC:     待配置`);
  log(`  PinLog: ${bufferToday} published today`);

  const { subject, html } = formatReport(sales, ga, buffer, sc, bufferToday);

  log('\n── Report ───────────────────────────');
  log(`Subject: ${subject}`);
  log('─────────────────────────────────────\n');

  try {
    await sendEmail(subject, html);
  } catch (e) {
    log(`✗ Email failed: ${e.message}`);
    const out = path.join(__dirname, `report-${new Date().toISOString().slice(0,10)}.html`);
    fs.writeFileSync(out, html);
    log(`  Saved to: ${out}`);
  }

  log(`\nFinished in ${((Date.now()-t0)/1000).toFixed(1)}s`);
}

const mode = process.argv[2];
if (mode === 'qa') {
  runQAReport().catch(e => { log(`Fatal: ${e.message}`); process.exit(1); });
} else {
  runDailyReport().catch(console.error);
}
