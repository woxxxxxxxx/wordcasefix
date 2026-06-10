'use strict';
const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3000;

// ─── Paths ────────────────────────────────────────────────────────────────────
const LOGS_DIR    = 'C:\\Users\\Administrator\\pm-worker\\logs';
const CONTENT_DIR = 'C:\\Users\\Administrator\\content-pipeline';
const BASE_DIR    = 'C:\\Users\\Administrator';

// ─── Static config (mirrors daily-report/report.js) ──────────────────────────
const ADSENSE_SUBMIT_DATES = {
  'WordCaseFix':        '2026-06-07',
  'VestCalc':           '2026-06-07',
  'ContractFixPro':     '2026-06-07',
  'BillingFixPro':      '2026-06-07',
  'PayrollFixPro':      '2026-06-07',
  'CoverageFixPro':     '2026-06-07',
  'NotionTemplaFix':    null,
  'InsuranceTipsPro':   '2026-06-10',
  'FreelancerGuideHub': '2026-06-11',
};

const GA4_PROPERTIES = {
  'WordCaseFix': '539531639', 'VestCalc': '539700100', 'NotionTemplaFix': '539119398',
  'ContractFixPro': '539948742', 'BillingFixPro': '540289117', 'PayrollFixPro': '540359696',
  'CoverageFixPro': '540484051', 'InsuranceTipsPro': '540994505', 'FreelancerGuideHub': '540994505',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeRead(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch (_) { return null; }
}
function safeJSON(filePath) {
  const raw = safeRead(filePath);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}
function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}
function slugToTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

// ─── Find latest log for a cron mode ─────────────────────────────────────────
function getLatestCronLog(mode) {
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.startsWith(`cron-${mode}-`) && f.endsWith('.log'))
      .sort().reverse();
    if (!files.length) return null;
    const content = safeRead(path.join(LOGS_DIR, files[0]));
    if (!content) return null;
    // Parse last === timestamp exit:N === block
    const blocks = [...content.matchAll(/=== ([\d\-T:.Z]+) exit:(\d+) ===/g)];
    if (!blocks.length) return null;
    const last = blocks[blocks.length - 1];
    return { time: last[1], success: last[2] === '0', file: files[0], raw: content.slice(-500) };
  } catch (_) { return null; }
}

function getLatestContentPipelineLog(script) {
  try {
    const base = script.replace('.js', '');
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.startsWith(`content-pipeline-${base}-`) && f.endsWith('.log'))
      .sort().reverse();
    if (!files.length) return null;
    const content = safeRead(path.join(LOGS_DIR, files[0]));
    if (!content) return null;
    const blocks = [...content.matchAll(/=== ([\d\-T:.Z]+) exit:(\d+) ===/g)];
    if (!blocks.length) return null;
    const last = blocks[blocks.length - 1];
    return { time: last[1], success: last[2] === '0', file: files[0] };
  } catch (_) { return null; }
}

// ─── Collect status ───────────────────────────────────────────────────────────
function collectStatus() {
  const now = new Date().toISOString();

  // ── Sites ──
  let sitesConfig = [];
  try { sitesConfig = require('C:\\Users\\Administrator\\sites-config.js').SITES; } catch (_) {}

  const monitorLatest = safeJSON(path.join(LOGS_DIR, 'monitor-latest.json')) || {};
  const monitorProjects = monitorLatest.projects || {};
  const githubPages = monitorLatest.github_pages || {};

  // Last auto-published articles per site
  const insuranceUsed  = safeJSON('C:\\Users\\Administrator\\insurancetipspro\\topics-used.json')?.used  || [];
  const freelancerUsed = safeJSON('C:\\Users\\Administrator\\freelancerguidehub\\topics-used.json')?.used || [];
  const lastInsurance  = insuranceUsed[insuranceUsed.length - 1]  || null;
  const lastFreelancer = freelancerUsed[freelancerUsed.length - 1] || null;

  const sites = sitesConfig.map(s => {
    const checks   = monitorProjects[s.id] || [];
    const pagesOk  = githubPages[s.id]?.buildOk ?? null;
    const adsTxt   = checks.find(c => c.check === 'ads_txt');
    const sitemap  = checks.find(c => c.check === 'sitemap_xml');
    const reach    = checks.find(c => c.check === 'homepage_reachable');
    const adsDate  = ADSENSE_SUBMIT_DATES[s.name] || null;
    const gaId     = GA4_PROPERTIES[s.name] || null;

    let lastPublish = null;
    if (s.id === 'insurancetipspro')  lastPublish = lastInsurance  ? slugToTitle(lastInsurance)  : null;
    if (s.id === 'freelancerguidehub') lastPublish = lastFreelancer ? slugToTitle(lastFreelancer) : null;

    return {
      id:         s.id,
      name:       s.name,
      domain:     s.domain,
      color:      s.color,
      ftp_hosted: s.ftp_hosted,
      hosting:    s.ftp_hosted ? 'Hostinger FTP' : 'GitHub Pages',
      adsense: {
        status:    s.adsense,
        submitted: adsDate,
        days:      daysSince(adsDate),
      },
      ga: { id: gaId, connected: !!gaId },
      health: {
        online:    reach?.ok ?? null,
        ads_txt:   adsTxt?.ok ?? null,
        sitemap:   sitemap?.ok ?? null,
        pages_ok:  pagesOk,
        detail:    reach?.detail || null,
      },
      lastPublish,
    };
  });

  // ── Timeline ──
  const TIMELINE_TASKS = [
    { id: 'generate-daily', label: 'Content Pipeline', time: '06:00', mode: null, isContent: true, script: 'generate-daily' },
    { id: 'daily',          label: 'PM Daily Plan',    time: '08:30', mode: 'daily' },
    { id: 'buffer',         label: 'Buffer Refill',    time: '09:00', mode: 'buffer' },
    { id: 'auto-publish',   label: 'InsuranceTipsPro', time: '10:00', mode: 'auto-publish' },
    { id: 'auto-publish-flgh', label: 'FreelancerGuideHub', time: '11:00', mode: 'auto-publish-flgh' },
    { id: 'monitor',        label: 'Site Monitor',     time: '*/4h',  mode: 'monitor' },
    { id: 'recovery',       label: 'Site Recovery',    time: '*/30m', mode: 'recovery' },
  ];

  const timeline = TIMELINE_TASKS.map(t => {
    const log = t.isContent
      ? getLatestContentPipelineLog(t.script)
      : getLatestCronLog(t.mode);
    return {
      id:      t.id,
      label:   t.label,
      time:    t.time,
      lastRun: log?.time  || null,
      success: log?.success ?? null,
      file:    log?.file  || null,
    };
  });

  // ── Content Pipeline ──
  const topics = (() => {
    try { return require(path.join(CONTENT_DIR, 'topics.json')); } catch (_) { return []; }
  })();
  const usedCount   = topics.filter(t => t.used).length;
  const totalCount  = topics.length;

  // Last 7 days output
  const outputBase = path.join(CONTENT_DIR, 'output');
  const recentDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const dir = path.join(outputBase, ds);
    let summary = null;
    if (fs.existsSync(dir)) {
      const sumFile = path.join(dir, `summary-${ds}.json`);
      summary = safeJSON(sumFile);
    }
    recentDays.push({ date: ds, hasOutput: !!summary, topic: summary?.cn_topic || null, category: summary?.category || null });
  }

  // ── Recent articles ──
  const ins5  = insuranceUsed.slice(-5).reverse().map(s => ({ slug: s, title: slugToTitle(s), url: `https://insurancetipspro.com/articles/${s}.html` }));
  const fl5   = freelancerUsed.slice(-5).reverse().map(s => ({ slug: s, title: slugToTitle(s), url: `https://freelancerguidehub.com/articles/${s}.html` }));

  // ── Health summary ──
  const monitorTime = monitorLatest.timestamp || null;
  const recoveryRaw = (() => {
    try {
      const files = fs.readdirSync(LOGS_DIR).filter(f => f.startsWith('recovery-') && f.endsWith('.json')).sort().reverse();
      return files.length ? safeJSON(path.join(LOGS_DIR, files[0])) : null;
    } catch (_) { return null; }
  })();

  return {
    timestamp: now,
    today: todayStr(),
    sites,
    timeline,
    contentPipeline: { used: usedCount, total: totalCount, remaining: totalCount - usedCount, recentDays },
    recentArticles:  { insurancetipspro: ins5, freelancerguidehub: fl5 },
    health: { monitorTime, monitorProjects, recoveryOutput: recoveryRaw?.output || null },
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use(express.static(__dirname));

app.get('/api/status', (req, res) => {
  // Clear require cache for sites-config so edits are picked up
  try { delete require.cache[require.resolve('C:\\Users\\Administrator\\sites-config.js')]; } catch (_) {}
  try { delete require.cache[require.resolve(path.join(CONTENT_DIR, 'topics.json'))]; } catch (_) {}
  try {
    res.json(collectStatus());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Dashboard running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/status`);
});
