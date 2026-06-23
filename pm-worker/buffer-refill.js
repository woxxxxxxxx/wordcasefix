'use strict';
/**
 * buffer-refill.js  v7  (Buffer GraphQL + 站点公网图片 URL)
 *
 * 7 个站点轮换发布 Pin 到 Buffer，每站 2 条/次。
 * 图片直接使用各站点公网 URL，不再经过 Imgur。
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

// ── 配置 ──────────────────────────────────────────────────────────────────────
const BUFFER_TOKEN  = 'aPPMezKy_6SKLs8F-9iUzZo4vM959_4K8YKqHCe9iQU';
const ORG_ID        = '6a2026ccd819e8c99b17eb9e';
const CHANNEL_ID    = '6a3806215ab6d2f10657ce52';
const BOARD_SVC_ID  = '1097119227915211401';
const GQL_URL       = 'https://api.buffer.com/graphql';
const PROXY_URL     = 'http://127.0.0.1:7897';
const LOG_FILE      = path.join(__dirname, 'logs', 'buffer-refill.log');
const PINNED_FILE   = path.join(__dirname, 'logs', 'pinned-articles.json');
const PINS_PER_SITE = 2;

// ── 站点定义（含公网图片 base URL）────────────────────────────────────────────
const SOURCES = [
  { name: 'ContractFixPro',     type: 'tool',   urlBase: 'https://contractfixpro.com/pinterest/',     dir: 'C:\\Users\\Administrator\\contractfixpro\\pinterest',     link: 'https://contractfixpro.com' },
  { name: 'CoverageFixPro',     type: 'tool',   urlBase: 'https://coveragefixpro.com/pinterest/',     dir: 'C:\\Users\\Administrator\\coveragefixpro\\pinterest',     link: 'https://coveragefixpro.com' },
  { name: 'NotionTemplaFix',    type: 'notion', urlBase: 'https://notiontemplafix.com/pinterest/',    dir: 'C:\\Users\\Administrator\\notiontemplafix\\pinterest',    link: 'https://notiontemplafix.com' },
  { name: 'InsuranceTipsPro',   type: 'blog',   urlBase: 'https://insurancetipspro.com/pinterest/',   dir: 'C:\\Users\\Administrator\\insurancetipspro\\pinterest',   link: 'https://insurancetipspro.com' },
  { name: 'FreelancerGuideHub', type: 'blog',   urlBase: 'https://freelancerguidehub.com/pinterest/', dir: 'C:\\Users\\Administrator\\freelancerguidehub\\pinterest', link: 'https://freelancerguidehub.com' },
  { name: 'BillingFixPro',      type: 'tool',   urlBase: 'https://billingfixpro.com/pinterest/',      dir: 'C:\\Users\\Administrator\\billingfixpro\\pinterest',      link: 'https://billingfixpro.com' },
  { name: 'PayrollFixPro',      type: 'tool',   urlBase: 'https://payrollfixpro.com/pinterest/',      dir: 'C:\\Users\\Administrator\\payrollfixpro\\pinterest',      link: 'https://payrollfixpro.com' },
  { name: 'WordCaseFix',         type: 'tool',  urlBase: 'https://wordcasefix.com/pinterest/',         dir: 'C:\\Users\\Administrator\\wordcasefix\\pinterest',         link: 'https://wordcasefix.com' },
  { name: 'VestCalc',            type: 'tool',  urlBase: 'https://vestcalc.com/pinterest/',            dir: 'C:\\Users\\Administrator\\vestcalc\\pinterest',            link: 'https://vestcalc.com' },
  { name: 'ToolRankHQ',          type: 'blog',  urlBase: 'https://toolrankhq.com/pinterest/',          dir: 'C:\\Users\\Administrator\\toolrankhq\\pinterest',          link: 'https://toolrankhq.com' },
  { name: 'BusinessPolicyGuide', type: 'blog',  urlBase: 'https://businesspolicyguide.com/pinterest/', dir: 'C:\\Users\\Administrator\\businesspolicyguide\\pinterest', link: 'https://businesspolicyguide.com' },
  { name: 'CRMCompareLab',       type: 'blog',  urlBase: 'https://crmcomparelab.com/pinterest/',       dir: 'C:\\Users\\Administrator\\crmcomparelab\\pinterest',       link: 'https://crmcomparelab.com' },
];

// NotionTemplaFix 模板 metadata
const NOTION_META = {
  'habit-tracker':      { name: 'Habit Tracker',      desc: 'Build lasting habits with this free Notion template. Track streaks, routines, and daily progress in one clean dashboard.' },
  'book-tracker':       { name: 'Book Tracker',        desc: 'Organize your entire reading life. Log books, ratings, and notes with this free Notion book tracker template.' },
  'goal-tracker':       { name: 'Goal Tracker',        desc: 'Set goals and crush them. Break big ambitions into milestones and daily actions with this free Notion template.' },
  'life-os':            { name: 'Life OS Dashboard',   desc: 'Manage your whole life in one place. Habits, goals, projects, and finances — beautifully organized in Notion.' },
  'second-brain':       { name: 'Second Brain',        desc: 'Never lose an idea again. Build a personal knowledge base and capture everything with this free Notion template.' },
  'business-os':        { name: 'Business OS',         desc: 'Run your entire business from Notion. CRM, projects, finances, and team tasks all in one free template.' },
  'student-os':         { name: 'Student OS',          desc: 'Ace every semester. Organize courses, assignments, notes, and exam prep with this free Notion student planner.' },
  'finance-tracker':    { name: 'Finance Tracker',     desc: 'Take control of your money. Track income, expenses, and savings goals in this free Notion finance template.' },
  'content-creator':    { name: 'Content Creator OS',  desc: 'Plan, create, and publish content effortlessly. A free Notion workspace built for creators and influencers.' },
  'freelancer-hub':     { name: 'Freelancer Hub',      desc: 'Manage your freelance business end-to-end. Clients, projects, invoices, and rates all organized in Notion.' },
  'personal-dashboard': { name: 'Personal Dashboard',  desc: 'Your life, beautifully organized. Daily tasks, goals, habits, and quick notes in one free Notion dashboard.' },
  'weekly-planner':     { name: 'Weekly Planner',      desc: 'Plan your perfect week every Sunday. Prioritize tasks, review goals, and stay focused — free Notion template.' },
  'study-planner':      { name: 'Study Planner',       desc: 'Crush your study sessions. Organize notes, flashcards, and exam schedules in Notion — completely free.' },
  'budget-tracker':     { name: 'Budget Tracker',      desc: 'Stop overspending in 30 days. Track every dollar in and out with this free Notion budget tracker template.' },
  'project-manager':    { name: 'Project Manager',     desc: 'Ship projects on time. Kanban boards, timelines, and task lists built into one free Notion template.' },
  'crm-template':       { name: 'CRM Template',        desc: 'Manage clients and leads without expensive software. A lightweight CRM built entirely in Notion — free.' },
};

// ── 日志 ──────────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (_) {}
}

// ── HTTP 请求（带代理）────────────────────────────────────────────────────────
function httpReq(urlStr, opts = {}, bodyBuf = null) {
  return new Promise((resolve, reject) => {
    const agent   = new HttpsProxyAgent(PROXY_URL);
    const url     = new URL(urlStr);
    const reqOpts = {
      hostname: url.hostname, port: 443,
      path:     url.pathname + url.search,
      method:   opts.method || 'GET',
      headers:  { 'User-Agent': 'pm-worker/7.0', ...opts.headers },
      agent,
    };
    if (bodyBuf) reqOpts.headers['Content-Length'] = bodyBuf.length;
    const req = https.request(reqOpts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data; try { data = JSON.parse(raw); } catch (_) { data = raw; }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

// ── Buffer GraphQL ─────────────────────────────────────────────────────────────
async function gql(query, variables = {}) {
  const body = Buffer.from(JSON.stringify({ query, variables }), 'utf8');
  const resp = await httpReq(GQL_URL, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${BUFFER_TOKEN}`, 'Content-Type': 'application/json' },
  }, body);
  if (resp.status !== 200) throw new Error(`GraphQL HTTP ${resp.status}: ${JSON.stringify(resp.data).slice(0, 200)}`);
  if (resp.data?.errors?.length) throw new Error(`GraphQL: ${resp.data.errors[0]?.message}`);
  return resp.data?.data ?? resp.data;
}

// ── Pinned 文章追踪 ───────────────────────────────────────────────────────────
function loadPinned() {
  try { return JSON.parse(fs.readFileSync(PINNED_FILE, 'utf8')); } catch (_) { return {}; }
}
function savePinned(pinned) {
  fs.mkdirSync(path.dirname(PINNED_FILE), { recursive: true });
  fs.writeFileSync(PINNED_FILE, JSON.stringify(pinned, null, 2), 'utf8');
}

// ── 加载各站 Pins（返回 imgFile 而非 imgPath）────────────────────────────────
function loadToolPins(src) {
  const jsonPath = path.join(src.dir, 'pin-content.json');
  if (!fs.existsSync(jsonPath)) { log(`  ⚠️  ${src.name}: 无 pin-content.json`); return []; }
  try {
    const pins = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const valid = pins.filter(p => {
      const f = p.file || p.image;
      return f && fs.existsSync(path.join(src.dir, f));
    }).map(p => ({
      title:   (p.title || p.name || src.name).slice(0, 100),
      desc:    (p.desc  || p.text || '').slice(0, 500),
      link:    p.link   || src.link,
      imgFile: p.file   || p.image,
      slug:    p.slug   || null,
    }));
    for (let i = valid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [valid[i], valid[j]] = [valid[j], valid[i]];
    }
    return valid;
  } catch (e) { log(`  ⚠️  ${src.name} 解析失败: ${e.message}`); return []; }
}

function loadBlogPins(src, pinnedSlugs) {
  const already  = new Set(pinnedSlugs || []);
  const jsonPath = path.join(src.dir, 'pin-content.json');
  if (!fs.existsSync(jsonPath)) { log(`  ⚠️  ${src.name}: 无 pin-content.json`); return []; }
  try {
    const pins = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return pins
      .filter(p => {
        if (p.slug && already.has(p.slug)) return false;
        const f = p.file || p.image;
        return f && fs.existsSync(path.join(src.dir, f));
      })
      .reverse()
      .map(p => ({
        title:   (p.title || p.name || src.name).slice(0, 100),
        desc:    (p.desc  || p.text || '').slice(0, 500),
        link:    p.link   || src.link,
        imgFile: p.file   || p.image,
        slug:    p.slug   || null,
      }));
  } catch (e) { log(`  ⚠️  ${src.name} 解析失败: ${e.message}`); return []; }
}

function loadNotionPins() {
  const src = SOURCES.find(s => s.name === 'NotionTemplaFix');
  const pins = [];
  try {
    const files = fs.readdirSync(src.dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f) && f.includes('-pin'));
    for (const file of files) {
      const raw  = file.replace(/-pin\.(jpg|jpeg|png)$/i, '');
      const slug = raw.replace(/-app$/, '');
      const meta = NOTION_META[slug];
      if (!meta) continue;
      if (!fs.existsSync(path.join(src.dir, file))) continue;
      pins.push({
        slug,
        title:   `Free Notion Template: ${meta.name}`,
        desc:    meta.desc.slice(0, 500),
        link:    'https://notiontemplafix.com',
        imgFile: file,
      });
    }
    for (let i = pins.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pins[i], pins[j]] = [pins[j], pins[i]];
    }
  } catch (e) { log(`  ⚠️  NotionTemplaFix 加载失败: ${e.message}`); }
  return pins;
}

// ── Buffer createPost ─────────────────────────────────────────────────────────
async function createPost(pin, imgUrl) {
  const title = pin.title.slice(0, 100);
  const desc  = pin.desc.slice(0, 500);
  const link  = pin.link || '';

  const data = await gql(`
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess  { post { id status dueAt } }
        ... on InvalidInputError  { message }
        ... on LimitReachedError  { message }
        ... on UnauthorizedError  { message }
        ... on UnexpectedError    { message }
        ... on RestProxyError     { message }
        ... on NotFoundError      { message }
      }
    }
  `, {
    input: {
      channelId:      CHANNEL_ID,
      schedulingType: 'automatic',
      mode:           'addToQueue',
      assets: [{ image: { url: imgUrl, metadata: { altText: title } } }],
      text:   desc,
      metadata: { pinterest: { title, url: link, boardServiceId: BOARD_SVC_ID } },
    },
  });

  const result = data?.createPost;
  if (result?.post?.id) return result.post;
  throw new Error(result?.message || `createPost 未知错误: ${JSON.stringify(result).slice(0, 100)}`);
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function refillBuffer() {
  log('══════════════════════════════════════════════════════════');
  log('Buffer Refill v7 — 站点公网图片 URL，无 Imgur，2 Pins/站点');
  log('══════════════════════════════════════════════════════════');

  const pinned = loadPinned();
  let total = 0, failed = 0;

  for (const src of SOURCES) {
    log(`\n📌 [${src.name}]`);

    let candidates;
    if (src.type === 'tool')        candidates = loadToolPins(src);
    else if (src.type === 'blog')   candidates = loadBlogPins(src, pinned[src.name] || []);
    else if (src.type === 'notion') candidates = loadNotionPins();
    else candidates = [];

    if (!candidates.length) { log(`  ⚠️  无可用图片，跳过`); continue; }

    const batch = candidates.slice(0, PINS_PER_SITE);

    for (let pi = 0; pi < batch.length; pi++) {
      const pin    = batch[pi];
      const imgUrl = src.urlBase + encodeURIComponent(pin.imgFile);

      log(`  [Pin ${pi + 1}/${batch.length}] 🖼️  ${pin.imgFile}`);
      log(`          📝 ${pin.title.slice(0, 70)}`);
      log(`          🌐 ${imgUrl}`);

      try {
        const post = await createPost(pin, imgUrl);
        log(`          ✅ Buffer Post ID: ${post.id} | status: ${post.status} | dueAt: ${post.dueAt || '—'}`);

        if (pin.slug && src.type === 'blog') {
          if (!pinned[src.name]) pinned[src.name] = [];
          if (!pinned[src.name].includes(pin.slug)) {
            pinned[src.name].push(pin.slug);
            savePinned(pinned);
          }
        }
        total++;
      } catch (e) {
        log(`          ❌ 失败: ${e.message.slice(0, 200)}`);
        failed++;
      }

      if (pi < batch.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    if (src !== SOURCES[SOURCES.length - 1]) await new Promise(r => setTimeout(r, 3000));
  }

  log(`\n════ 完成: 加入队列 ${total} 条，失败 ${failed} 条 ════`);
}

if (require.main === module) {
  refillBuffer().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
}

module.exports = { refillBuffer };
