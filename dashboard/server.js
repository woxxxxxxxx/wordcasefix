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

// ─── Static config ────────────────────────────────────────────────────────────
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
function safeRead(p) { try { return fs.readFileSync(p, 'utf8'); } catch (_) { return null; } }
function safeJSON(p) { const r = safeRead(p); if (!r) return null; try { return JSON.parse(r); } catch (_) { return null; } }
function daysSince(d) { if (!d) return null; return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }
function slugToTitle(s) { return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function todayStr()  { return new Date().toISOString().slice(0, 10); }
function fileMtime(p) { try { return fs.statSync(p).mtime.toISOString(); } catch (_) { return null; } }

// Network errors mean "can't verify from local" (needs proxy), not actually offline
function isNetworkError(detail) {
  if (!detail) return false;
  return /socket disconnected|ECONNREFUSED|ETIMEDOUT|TLS connection|network|proxy|timeout/i.test(detail);
}

// ─── Log reading ──────────────────────────────────────────────────────────────
function getLatestCronLog(mode) {
  try {
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.startsWith(`cron-${mode}-`) && f.endsWith('.log'))
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

// Auto-publish: try cron log first, fall back to topics-used.json mtime
function getAutoPublishStatus(mode, topicsUsedPath) {
  const fromLog = getLatestCronLog(mode);
  if (fromLog) return fromLog;
  // Fallback: use topics-used.json modification time as proxy for last run
  const mtime = fileMtime(topicsUsedPath);
  if (mtime) return { time: mtime, success: true, file: 'topics-used.json (inferred)' };
  return null;
}

// ─── Build pending todos ───────────────────────────────────────────────────────
function buildTodos(sites, monitorProjects) {
  const todos = [];
  const today = new Date();

  // Adsense pending sites list
  const pendingSites = sites.filter(s => s.adsense.status === 'pending' && s.adsense.submitted !== null);
  if (pendingSites.length) {
    todos.push({ level: 'info', icon: '⏳', text: `${pendingSites.length} 个站点 AdSense 审核中：${pendingSites.map(s => s.name).join('、')}` });
  }

  // Any AdSense pending > 14 days
  for (const s of sites) {
    if (s.adsense.days !== null && s.adsense.days > 14 && s.adsense.status !== 'approved') {
      todos.push({ level: 'high', icon: '🔴', text: `${s.name} AdSense 提交已 ${s.adsense.days} 天，建议检查审核状态` });
    }
  }

  // Sites with no submitted AdSense
  const noAdsense = sites.filter(s => s.adsense.submitted === null && s.adsense.status !== 'skip' && s.adsense.status !== 'approved');
  if (noAdsense.length) {
    todos.push({ level: 'medium', icon: '📋', text: `${noAdsense.length} 个站点未提交 AdSense：${noAdsense.map(s => s.name).join('、')}` });
  }

  // FTP sites offline (network errors excluded for GitHub Pages)
  for (const s of sites) {
    const checks = monitorProjects[s.id] || [];
    const reach  = checks.find(c => c.check === 'homepage_reachable');
    if (reach && reach.ok === false && s.ftp_hosted && !isNetworkError(reach.detail)) {
      todos.push({ level: 'high', icon: '🔴', text: `${s.name} 站点无法访问：${reach.detail || ''}` });
    }
  }

  // ads.txt missing on FTP sites
  for (const s of sites) {
    const checks = monitorProjects[s.id] || [];
    const ads = checks.find(c => c.check === 'ads_txt');
    if (ads && ads.ok === false && s.ftp_hosted) {
      todos.push({ level: 'medium', icon: '📄', text: `${s.name} ads.txt 验证失败` });
    }
  }

  // Today's content pipeline
  const todayOutput = path.join(CONTENT_DIR, 'output', todayStr());
  if (!fs.existsSync(todayOutput)) {
    todos.push({ level: 'low', icon: '📝', text: `今日内容流水线尚未运行（06:00 生成）` });
  }

  return todos.slice(0, 10); // max 10
}

// ─── Collect status ───────────────────────────────────────────────────────────
function collectStatus() {
  const now = new Date().toISOString();

  // Sites config
  let sitesConfig = [];
  try { sitesConfig = require('C:\\Users\\Administrator\\sites-config.js').SITES; } catch (_) {}

  const monitorLatest  = safeJSON(path.join(LOGS_DIR, 'monitor-latest.json')) || {};
  const monitorProjects = monitorLatest.projects || {};
  const githubPages    = monitorLatest.github_pages || {};

  const insuranceUsed  = safeJSON('C:\\Users\\Administrator\\insurancetipspro\\topics-used.json')?.used  || [];
  const freelancerUsed = safeJSON('C:\\Users\\Administrator\\freelancerguidehub\\topics-used.json')?.used || [];

  // ── Sites ──
  const sites = sitesConfig.map(s => {
    const checks  = monitorProjects[s.id] || [];
    const adsTxt  = checks.find(c => c.check === 'ads_txt');
    const sitemap = checks.find(c => c.check === 'sitemap_xml');
    const reach   = checks.find(c => c.check === 'homepage_reachable');
    const pagesOk = githubPages[s.id]?.buildOk ?? null;

    // For GitHub Pages, network errors = "needs proxy", not truly offline
    let onlineStatus = reach?.ok ?? null;
    let onlineLabel  = null;
    if (onlineStatus === false && !s.ftp_hosted && isNetworkError(reach?.detail)) {
      onlineStatus = null; // unknown
      onlineLabel  = '需代理验证';
    }

    // ads.txt: same treatment for GitHub Pages sites
    let adsTxtOk = adsTxt?.ok ?? null;
    let adsTxtLabel = null;
    if (adsTxtOk === false && !s.ftp_hosted && isNetworkError(adsTxt?.detail)) {
      adsTxtOk = null;
      adsTxtLabel = '需验证';
    }

    let lastPublish = null, lastPublishTime = null;
    if (s.id === 'insurancetipspro' && insuranceUsed.length) {
      lastPublish     = slugToTitle(insuranceUsed[insuranceUsed.length - 1]);
      lastPublishTime = fileMtime('C:\\Users\\Administrator\\insurancetipspro\\topics-used.json');
    }
    if (s.id === 'freelancerguidehub' && freelancerUsed.length) {
      lastPublish     = slugToTitle(freelancerUsed[freelancerUsed.length - 1]);
      lastPublishTime = fileMtime('C:\\Users\\Administrator\\freelancerguidehub\\topics-used.json');
    }

    return {
      id: s.id, name: s.name, domain: s.domain, color: s.color,
      ftp_hosted: s.ftp_hosted,
      hosting: s.ftp_hosted ? 'Hostinger FTP' : 'GitHub Pages',
      adsense: { status: s.adsense, submitted: ADSENSE_SUBMIT_DATES[s.name] || null, days: daysSince(ADSENSE_SUBMIT_DATES[s.name]) },
      ga: { id: GA4_PROPERTIES[s.name] || null, connected: !!GA4_PROPERTIES[s.name] },
      health: { online: onlineStatus, onlineLabel, ads_txt: adsTxtOk, adsTxtLabel, sitemap: sitemap?.ok ?? null, sitemapDetail: sitemap?.detail || null, pages_ok: pagesOk, detail: reach?.detail || null },
      lastPublish, lastPublishTime,
    };
  });

  // ── Timeline tasks ──
  const TIMELINE_TASKS = [
    { id: 'generate-daily', label: '内容流水线 (generate-daily)', time: '06:00', isContent: true, script: 'generate-daily' },
    { id: 'daily',          label: 'PM 每日计划',                  time: '08:30', mode: 'daily' },
    { id: 'buffer',         label: 'Buffer 队列补充',               time: '09:00', mode: 'buffer' },
    { id: 'auto-publish',   label: 'InsuranceTipsPro 自动发布',     time: '10:00', mode: 'auto-publish',
      fallbackTopics: 'C:\\Users\\Administrator\\insurancetipspro\\topics-used.json' },
    { id: 'auto-publish-flgh', label: 'FreelancerGuideHub 自动发布', time: '11:00', mode: 'auto-publish-flgh',
      fallbackTopics: 'C:\\Users\\Administrator\\freelancerguidehub\\topics-used.json' },
    { id: 'monitor',   label: '站点监控',   time: '每4小时', mode: 'monitor' },
    { id: 'recovery',  label: '站点恢复检查', time: '每30分钟', mode: 'recovery' },
  ];

  const timeline = TIMELINE_TASKS.map(t => {
    let log;
    if (t.isContent) {
      log = getLatestContentPipelineLog(t.script);
    } else if (t.fallbackTopics) {
      log = getAutoPublishStatus(t.mode, t.fallbackTopics);
    } else {
      log = getLatestCronLog(t.mode);
    }
    return { id: t.id, label: t.label, time: t.time, lastRun: log?.time || null, success: log?.success ?? null, file: log?.file || null };
  });

  // ── Content Pipeline ──
  const topics = (() => { try { return require(path.join(CONTENT_DIR, 'topics.json')); } catch (_) { return []; } })();
  const usedCount  = topics.filter(t => t.used).length;
  const totalCount = topics.length;

  const recentDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const sumFile = path.join(CONTENT_DIR, 'output', ds, `summary-${ds}.json`);
    const summary = safeJSON(sumFile);
    recentDays.push({ date: ds, hasOutput: !!summary, topic: summary?.cn_topic || null, category: summary?.category || null });
  }

  // ── Recent articles ──
  const ins5  = insuranceUsed.slice(-5).reverse().map(s => ({ slug: s, title: slugToTitle(s), url: `https://insurancetipspro.com/articles/${s}.html` }));
  const fl5   = freelancerUsed.slice(-5).reverse().map(s => ({ slug: s, title: slugToTitle(s), url: `https://freelancerguidehub.com/articles/${s}.html` }));

  // ── Health ──
  const recoveryRaw = (() => {
    try {
      const files = fs.readdirSync(LOGS_DIR).filter(f => f.startsWith('recovery-') && f.endsWith('.json')).sort().reverse();
      return files.length ? safeJSON(path.join(LOGS_DIR, files[0])) : null;
    } catch (_) { return null; }
  })();

  // ── Todos ──
  let todos = [];
  try { todos = buildTodos(sites, monitorProjects); } catch (e) { console.error('buildTodos error:', e.message); }

  return {
    timestamp: now, today: todayStr(), sites, timeline,
    contentPipeline: { used: usedCount, total: totalCount, remaining: totalCount - usedCount, recentDays },
    recentArticles:  { insurancetipspro: ins5, freelancerguidehub: fl5 },
    health: { monitorTime: monitorLatest.timestamp || null, monitorProjects, recoveryOutput: recoveryRaw?.output || null },
    todos,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use(express.static(__dirname));

app.get('/api/status', (req, res) => {
  try { delete require.cache[require.resolve('C:\\Users\\Administrator\\sites-config.js')]; } catch (_) {}
  try { delete require.cache[require.resolve(path.join(CONTENT_DIR, 'topics.json'))]; } catch (_) {}
  try { res.json(collectStatus()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Dashboard → http://localhost:${PORT}`);
});
