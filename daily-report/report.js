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
// FORMAT REPORT
// ═══════════════════════════════════════════════════════════════════════════
function formatReport(sales, ga, buffer) {
  const ts   = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const date = new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  });

  // Sales
  let salesBlock;
  if (sales.orders === null) {
    salesBlock = sales.note || 'Check manually: https://payhip.com/dashboard/purchases';
  } else if (sales.error && !sales.note) {
    salesBlock = `Error: ${sales.error}\nCheck manually: https://payhip.com/dashboard/purchases`;
  } else if (sales.orders === 0) {
    salesBlock = `Total Revenue: $0.00\nOrders: 0${sales.note ? '\n' + sales.note : ''}`;
  } else {
    const lines = sales.products.map(p => `  • ${p.name} × ${p.qty}`).join('\n');
    salesBlock  = `Total Revenue: $${sales.revenue}\nOrders: ${sales.orders}\n${lines}`;
  }

  // GA4
  let gaBlock;
  if (!ga) {
    gaBlock = Object.keys(GA4_PROPERTIES).map(s => `  ${s.padEnd(18)} check manually`).join('\n') +
      '\n\n  [To enable: place ga-credentials.json service account in daily-report/]';
  } else {
    gaBlock = Object.entries(GA4_PROPERTIES).map(([s]) => {
      const d = ga[s];
      return `  ${s.padEnd(18)} ${d?.users ?? 'n/a'} users, ${d?.views ?? 'n/a'} views`;
    }).join('\n');
  }

  // Buffer
  let bufferBlock;
  if (buffer.error) {
    bufferBlock = `Error: ${buffer.error}\nCheck: https://publish.buffer.com`;
  } else {
    bufferBlock = `Scheduled posts: ${buffer.scheduled}\nDrafts waiting:  ${buffer.drafts}`;
  }

  const subject = `📊 Daily Report - ${date}`;
  const body = `=== 💰 SALES (Last 24h) ===
${salesBlock}

=== 👥 TRAFFIC (Yesterday) ===
${gaBlock}

=== 📌 PINTEREST / BUFFER ===
${bufferBlock}

=== ⏳ ADSENSE STATUS ===
All 4 sites: Check manually → https://www.google.com/adsense

=== 📝 NOTES ===
Report generated: ${ts}
Sites: WordCaseFix | VestCalc | NotionTemplaFix | ContractFixPro`;

  return { subject, body };
}

// ═══════════════════════════════════════════════════════════════════════════
// SEND EMAIL
// ═══════════════════════════════════════════════════════════════════════════
async function sendEmail(subject, body) {
  log(`Sending: "${subject}"`);
  const t = nodemailer.createTransport({
    host: SMTP.host, port: SMTP.port, secure: SMTP.secure,
    auth: { user: SMTP.user, pass: SMTP.pass },
    tls: { rejectUnauthorized: false },
  });
  await t.verify();
  const info = await t.sendMail({
    from: `"Daily Report" <${SMTP.user}>`,
    to:   SMTP.to,
    subject,
    text: body,
    html: `<pre style="font-family:monospace;font-size:14px;line-height:1.7;white-space:pre-wrap">${
      body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    }</pre>`,
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

  const { subject, body } = formatReport(sales, ga, buffer);

  log('\n── Report ───────────────────────────');
  log(body);
  log('─────────────────────────────────────\n');

  try {
    await sendEmail(subject, body);
  } catch (e) {
    log(`✗ Email failed: ${e.message}`);
    const out = path.join(__dirname, `report-${new Date().toISOString().slice(0,10)}.txt`);
    fs.writeFileSync(out, `${subject}\n\n${body}`);
    log(`  Saved to: ${out}`);
  }

  log(`\nFinished in ${((Date.now()-t0)/1000).toFixed(1)}s`);
})();
