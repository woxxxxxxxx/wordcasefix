'use strict';
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const nodemailer = require('nodemailer');

// ─── Config ──────────────────────────────────────────────────────────────────

const ALERT_EMAIL = '295965231@qq.com';
const SMTP = {
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: { user: '295965231@qq.com', pass: 'msygvjzroawdbgce' }
};

const SITES = {
  insurancetipspro: {
    url: 'https://insurancetipspro.com',
    localDir: 'C:\\Users\\Administrator\\insurancetipspro',
    checkPages: [
      '/',
      '/articles/gap-insurance-explained.html',
      '/articles/best-health-insurance-for-self-employed.html'
    ],
    checkJS: [
      'C:\\Users\\Administrator\\insurancetipspro\\auto-publish.js',
      'C:\\Users\\Administrator\\insurancetipspro\\deploy-ftp.js'
    ],
    checkLatestArticle: true,
    articleDir: 'C:\\Users\\Administrator\\insurancetipspro\\articles',
    minFileCount: 60
  },
  freelancerguidehub: {
    url: 'https://freelancerguidehub.com',
    localDir: 'C:\\Users\\Administrator\\freelancerguidehub',
    checkPages: [
      '/',
      '/articles/best-tools-for-freelancers.html',
      '/articles/contract-red-flags-freelancers.html'
    ],
    checkJS: [
      'C:\\Users\\Administrator\\freelancerguidehub\\auto-publish.js',
      'C:\\Users\\Administrator\\freelancerguidehub\\deploy-ftp.js'
    ],
    checkLatestArticle: true,
    articleDir: 'C:\\Users\\Administrator\\freelancerguidehub\\articles',
    minFileCount: 20
  },
  toolrankhq: {
    url: 'https://toolrankhq.com',
    localDir: 'C:\\Users\\Administrator\\toolrankhq',
    checkPages: [
      '/',
      '/auto/IT-services-invoice.html',
      '/articles/ai-accounting-tools-solopreneurs.html'
    ],
    checkJS: [
      'C:\\Users\\Administrator\\toolrankhq\\auto-publish.js',
      'C:\\Users\\Administrator\\toolrankhq\\deploy-ftp.js'
    ],
    checkLatestArticle: true,
    articleDir: 'C:\\Users\\Administrator\\toolrankhq\\articles',
    minFileCount: 30
  },
  notiontemplafix: {
    url: 'https://notiontemplafix.com',
    localDir: 'C:\\Users\\Administrator\\notiontemplafix',
    checkPages: [
      '/',
      '/book-tracker-app.html',
      '/budget-tracker-app.html'
    ],
    checkJS: [],
    checkLatestArticle: false,
    minFileCount: 15
  },
  coveragefixpro: {
    url: 'https://coveragefixpro.com',
    localDir: 'C:\\Users\\Administrator\\coveragefixpro',
    checkPages: [
      '/',
      '/tools/auto/car-insurance-premium-estimator.html',
      '/tools/home/homeowners-insurance-cost-estimator.html'
    ],
    checkJS: [
      'C:\\Users\\Administrator\\coveragefixpro\\deploy-ftp.js'
    ],
    checkLatestArticle: false,
    minFileCount: 100
  },
  contractfixpro: {
    url: 'https://contractfixpro.com',
    localDir: 'C:\\Users\\Administrator\\contractfixpro',
    checkPages: [
      '/',
      '/freelance-contract.html',
      '/consulting-agreement.html'
    ],
    checkJS: [],
    checkLatestArticle: false,
    minFileCount: 15
  },
  billingfixpro: {
    url: 'https://billingfixpro.com',
    localDir: 'C:\\Users\\Administrator\\billingfixpro',
    checkPages: [
      '/',
      '/tools/IT-services-invoice.html',
      '/tools/agency-invoice.html'
    ],
    checkJS: [],
    checkLatestArticle: false,
    minFileCount: 80
  },
  payrollfixpro: {
    url: 'https://payrollfixpro.com',
    localDir: 'C:\\Users\\Administrator\\payrollfixpro',
    checkPages: [
      '/',
      '/tools/1099-tax-calculator.html',
      '/tools/401k-calculator.html'
    ],
    checkJS: [],
    checkLatestArticle: false,
    minFileCount: 80
  },
  wordcasefix: {
    url: 'https://wordcasefix.com',
    localDir: 'C:\\Users\\Administrator\\wordcasefix',
    checkPages: [
      '/',
      '/age-calculator.html',
      '/alternating-case.html'
    ],
    checkJS: [],
    checkLatestArticle: false,
    minFileCount: 20
  },
  vestcalc: {
    url: 'https://vestcalc.com',
    localDir: 'C:\\Users\\Administrator\\vestcalc',
    checkPages: [
      '/',
      '/age-calculator.html',
      '/amortization-calculator.html'
    ],
    checkJS: [],
    checkLatestArticle: false,
    minFileCount: 20
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpGet(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, ms: Date.now() - start });
    });
    req.on('error', (e) => resolve({ status: 0, ms: Date.now() - start, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, ms: timeoutMs, error: 'timeout' }); });
  });
}

function countLocalFiles(dir, excludes = ['node_modules', '.git', 'pinterest', '__pycache__']) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (excludes.includes(item)) continue;
      const p = path.join(dir, item);
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          count += countLocalFiles(p, excludes);
        } else {
          count++;
        }
      } catch (_) {}
    }
  } catch (_) {}
  return count;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function wasModifiedToday(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const mtime = stat.mtime.toISOString().slice(0, 10);
    return mtime === todayStr();
  } catch (_) {
    return false;
  }
}

async function sendAlert(siteName, failures) {
  const subject = `[ALERT] Deploy Check Failed - ${siteName}`;
  const body = [
    `Post-deploy check failures detected for: ${siteName}`,
    `Time: ${new Date().toISOString()}`,
    '',
    'Failed checks:',
    ...failures.map((f, i) => `  ${i + 1}. ${f}`),
    '',
    '-- pm-worker post-deploy-check.js'
  ].join('\n');

  try {
    const transporter = nodemailer.createTransport(SMTP);
    await transporter.sendMail({
      from: ALERT_EMAIL,
      to: ALERT_EMAIL,
      subject,
      text: body
    });
    console.log(`  📧 Alert email sent to ${ALERT_EMAIL}`);
  } catch (e) {
    console.error(`  ❌ Email send failed: ${e.message}`);
  }
}

// ─── Checks ──────────────────────────────────────────────────────────────────

async function checkHTTP(site, cfg) {
  const results = [];
  for (const pagePath of cfg.checkPages) {
    const url = cfg.url + pagePath;
    const { status, ms, error } = await httpGet(url);
    const slow = ms > 3000;
    if (status === 200) {
      const tag = slow ? `⚠  SLOW (${ms}ms)` : `✅ OK (${ms}ms)`;
      results.push({ pass: true, warn: slow, msg: `${tag} — ${url}` });
    } else {
      results.push({ pass: false, msg: `❌ HTTP ${status || 'ERR'} (${error || ms + 'ms'}) — ${url}` });
    }
  }
  return results;
}

function checkFileCount(cfg) {
  const count = countLocalFiles(cfg.localDir);
  const min = cfg.minFileCount;
  const pct = Math.round((count / min) * 100);
  if (count < Math.round(min * 0.9)) {
    return { pass: false, msg: `❌ File count: ${count} (expected ≥${min}, got ${pct}% of threshold)` };
  }
  return { pass: true, msg: `✅ File count: ${count} (threshold ${min})` };
}

function checkJSSyntax(cfg) {
  const results = [];
  for (const jsFile of cfg.checkJS) {
    if (!fs.existsSync(jsFile)) {
      results.push({ pass: false, msg: `❌ JS file not found: ${jsFile}` });
      continue;
    }
    try {
      execSync(`node --check "${jsFile}"`, { stdio: 'pipe' });
      results.push({ pass: true, msg: `✅ Syntax OK: ${path.basename(jsFile)}` });
    } catch (e) {
      const err = (e.stderr || e.stdout || e.message || '').toString().trim().split('\n')[0];
      results.push({ pass: false, msg: `❌ Syntax error in ${path.basename(jsFile)}: ${err}` });
    }
  }
  return results;
}

function checkBlogFreshness(cfg) {
  if (!cfg.checkLatestArticle) return null;
  if (!fs.existsSync(cfg.articleDir)) {
    return { pass: false, msg: `❌ Article dir not found: ${cfg.articleDir}` };
  }
  try {
    const files = fs.readdirSync(cfg.articleDir)
      .filter(f => f.endsWith('.html'))
      .map(f => path.join(cfg.articleDir, f));
    const todayFiles = files.filter(wasModifiedToday);
    if (todayFiles.length > 0) {
      const names = todayFiles.map(f => path.basename(f)).join(', ');
      return { pass: true, msg: `✅ Fresh article today: ${names}` };
    }
    return { pass: false, warn: true, msg: `⚠  No article modified today in ${cfg.articleDir}` };
  } catch (e) {
    return { pass: false, msg: `❌ Article freshness check failed: ${e.message}` };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runChecks(siteName) {
  const cfg = SITES[siteName];
  if (!cfg) {
    console.error(`Unknown site: "${siteName}"`);
    console.error(`Known sites: ${Object.keys(SITES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(56)}`);
  console.log(`Post-Deploy Check: ${siteName}`);
  console.log(`URL: ${cfg.url}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('═'.repeat(56));

  const failures = [];
  const allResults = [];

  // 1. HTTP checks
  console.log('\n[1/4] HTTP Status & Response Time');
  const httpResults = await checkHTTP(siteName, cfg);
  for (const r of httpResults) {
    console.log('  ' + r.msg);
    allResults.push(r);
    if (!r.pass) failures.push(r.msg);
  }

  // 2. File count
  console.log('\n[2/4] Local File Count (deploy completeness)');
  const fcResult = checkFileCount(cfg);
  console.log('  ' + fcResult.msg);
  allResults.push(fcResult);
  if (!fcResult.pass) failures.push(fcResult.msg);

  // 3. JS syntax
  if (cfg.checkJS.length > 0) {
    console.log('\n[3/4] JS Syntax Check');
    const jsResults = checkJSSyntax(cfg);
    for (const r of jsResults) {
      console.log('  ' + r.msg);
      allResults.push(r);
      if (!r.pass) failures.push(r.msg);
    }
  } else {
    console.log('\n[3/4] JS Syntax Check — skipped (no JS files configured)');
  }

  // 4. Blog freshness
  console.log('\n[4/4] Blog Article Freshness');
  const freshResult = checkBlogFreshness(cfg);
  if (freshResult) {
    console.log('  ' + freshResult.msg);
    allResults.push(freshResult);
    // Freshness is warn-only (not hard failure), but we still push to failures for email
    if (!freshResult.pass && !freshResult.warn) failures.push(freshResult.msg);
  } else {
    console.log('  — skipped (not a blog site)');
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  const passed = allResults.filter(r => r.pass).length;
  const total = allResults.length;
  console.log(`\n${'─'.repeat(56)}`);
  if (failures.length === 0) {
    console.log(`✅ ALL CHECKS PASSED (${passed}/${total}) — ${siteName}`);
  } else {
    console.log(`❌ FAILED: ${failures.length} issue(s) — ${siteName}`);
    failures.forEach(f => console.log('  ' + f));
    await sendAlert(siteName, failures);
  }
  console.log('─'.repeat(56) + '\n');

  return failures.length === 0;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const siteName = process.argv[2];
if (!siteName) {
  console.error('Usage: node post-deploy-check.js <sitename>');
  console.error(`Sites: ${Object.keys(SITES).join(', ')}`);
  process.exit(1);
}

runChecks(siteName).then(ok => process.exit(ok ? 0 : 1));
