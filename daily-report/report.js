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
      const res = await request(
        `https://analyticsdata.googleapis.com/v1beta/properties/${numId}:runReport`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateRanges: [{ startDate: yesterday, endDate: yesterday }],
            metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
          }),
        }
      );
      if (res.status === 200) {
        const d = JSON.parse(res.body);
        const row = d?.rows?.[0]?.metricValues;
        results[site] = { users: row?.[0]?.value || '0', views: row?.[1]?.value || '0' };
        log(`  ${site}: ${results[site].users} users, ${results[site].views} views`);
      } else {
        log(`  ${site}: HTTP ${res.status} — ${res.body.slice(0, 200)}`);
        results[site] = { users: 'n/a', views: 'n/a' };
      }
    } catch { results[site] = { users: 'err', views: 'err' }; }
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
function formatReport(sales, ga, buffer) {
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
      const barW  = Math.round((s.users / maxUsers) * 100);
      const bg    = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const ratio = s.users > 0 ? (s.views / s.users).toFixed(1) : '0';
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
          <td style="padding:10px 20px 10px 0;">
            <div style="background:#e2e8f0;border-radius:4px;height:6px;width:100%;min-width:80px;">
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
    <div style="color:#94a3b8;font-size:13px;margin-top:6px;">${date} &nbsp;·&nbsp; 4个站点 &nbsp;·&nbsp; 每日 08:00 自动生成</div>
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
            <th style="padding:9px 20px 9px 0;font-size:12px;color:#64748b;font-weight:600;"></th>
          </tr>
          ${gaRows}
        </table>` : gaNote
    )}

    ${section('#7c3aed', '📌', 'Pinterest / Buffer 队列', bufferHtml)}

    ${section('#d97706', '💡', '数据分析与建议',
      `<table width="100%" cellpadding="0" cellspacing="0">${insightRows}</table>`
    )}

    ${section('#475569', '⚙️', 'AdSense 审核状态',
      `<div style="font-size:13px;color:#64748b;margin-bottom:10px;">4个站点审核中，请在 Google AdSense 后台查看最新状态。</div>
       <a href="https://www.google.com/adsense" style="display:inline-block;background:#f1f5f9;color:#334155;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:13px;">🔗 打开 AdSense →</a>`
    )}

  </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#1e293b;border-radius:0 0 12px 12px;padding:16px 28px;text-align:center;">
    <div style="color:#64748b;font-size:12px;">报告生成时间：${ts}</div>
    <div style="color:#475569;font-size:11px;margin-top:4px;">WordCaseFix · VestCalc · NotionTemplaFix · ContractFixPro</div>
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
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
(async () => {
  const t0 = Date.now();
  log('════════════════════════════════════');
  log('Daily Report — ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
  log('════════════════════════════════════');

  // GA4 (pure HTTPS, can run in parallel later)
  const gaPromise = getGA4Data();

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

  await browser.close();

  log('\n── Collected ────────────────────────');
  log(`  Sales:  $${sales.revenue || '0'}, ${sales.orders || 0} orders`);
  log(`  Buffer: ${buffer.scheduled} scheduled, ${buffer.drafts} drafts`);
  log(`  GA4:    ${ga ? 'fetched' : 'skipped'}`);

  const { subject, html } = formatReport(sales, ga, buffer);

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
})();
