'use strict';
/**
 * buffer-refill.js  v6  (Pinterest Direct API)
 *
 * 7 个站点轮换直接发布 Pin 到 Pinterest，每天各发 1 条。
 * 不再经过 Buffer——直接调用 Pinterest API v5。
 *
 * 依赖：https-proxy-agent（已在 pm-worker package.json 中）
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

// ── 配置 ──────────────────────────────────────────────────────────────────────
const TOKEN_FILE  = path.join(__dirname, 'pinterest-token.json');
const PINNED_FILE = path.join(__dirname, 'logs', 'pinned-articles.json');
const LOG_FILE    = path.join(__dirname, 'logs', 'buffer-refill.log');
const PROXY_URL   = 'http://127.0.0.1:7897';
const BOARD_ID    = '1097119227915211401'; // "Productivity Apps"
const IMGUR_CID   = '546c25a59c58ad7';

// ── 站点定义 ──────────────────────────────────────────────────────────────────
const SOURCES = [
  { name: 'ContractFixPro',    type: 'tool',   dir: 'C:\\Users\\Administrator\\contractfixpro\\pinterest',    link: 'https://contractfixpro.com' },
  { name: 'CoverageFixPro',    type: 'tool',   dir: 'C:\\Users\\Administrator\\coveragefixpro\\pinterest',    link: 'https://coveragefixpro.com' },
  { name: 'NotionTemplaFix',   type: 'notion', dir: 'C:\\Users\\Administrator\\notiontemplafix\\pinterest',   link: 'https://notiontemplafix.com' },
  { name: 'InsuranceTipsPro',  type: 'blog',   dir: 'C:\\Users\\Administrator\\insurancetipspro\\pinterest',  link: 'https://insurancetipspro.com' },
  { name: 'FreelancerGuideHub',type: 'blog',   dir: 'C:\\Users\\Administrator\\freelancerguidehub\\pinterest',link: 'https://freelancerguidehub.com' },
  { name: 'BillingFixPro',     type: 'tool',   dir: 'C:\\Users\\Administrator\\billingfixpro\\pinterest',    link: 'https://billingfixpro.com' },
  { name: 'PayrollFixPro',     type: 'tool',   dir: 'C:\\Users\\Administrator\\payrollfixpro\\pinterest',    link: 'https://payrollfixpro.com' },
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
      headers:  { 'User-Agent': 'pm-worker/6.0', ...opts.headers },
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

// ── Token 加载 ────────────────────────────────────────────────────────────────
function loadToken() {
  if (!fs.existsSync(TOKEN_FILE)) throw new Error(`pinterest-token.json 不存在，请先运行 node pinterest-auth.js`);
  const t = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  if (!t.access_token) throw new Error('pinterest-token.json 中无 access_token');
  return t.access_token;
}

// ── Pinned 文章追踪 ───────────────────────────────────────────────────────────
function loadPinned() {
  try { return JSON.parse(fs.readFileSync(PINNED_FILE, 'utf8')); } catch (_) { return {}; }
}
function savePinned(pinned) {
  fs.mkdirSync(path.dirname(PINNED_FILE), { recursive: true });
  fs.writeFileSync(PINNED_FILE, JSON.stringify(pinned, null, 2), 'utf8');
}

// ── 加载各站 Pins ─────────────────────────────────────────────────────────────
function loadToolPins(src) {
  const jsonPath = path.join(src.dir, 'pin-content.json');
  if (!fs.existsSync(jsonPath)) return [];
  try {
    const pins = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const valid = pins.filter(p => {
      const f = p.file || p.image;
      return f && fs.existsSync(path.join(src.dir, f));
    }).map(p => ({
      title:   (p.title || p.name || src.name).slice(0, 100),
      desc:    (p.desc  || p.text || '').slice(0, 800),
      link:    p.link   || src.link,
      imgPath: path.join(src.dir, p.file || p.image),
      slug:    p.slug   || null,
      source:  src.name,
    }));
    // shuffle
    for (let i = valid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [valid[i], valid[j]] = [valid[j], valid[i]];
    }
    return valid;
  } catch (e) { log(`  ⚠️  ${src.name} 解析失败: ${e.message}`); return []; }
}

function loadBlogPins(src, pinnedSlugs) {
  const already = new Set(pinnedSlugs || []);
  const jsonPath = path.join(src.dir, 'pin-content.json');
  if (!fs.existsSync(jsonPath)) return [];
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
        desc:    (p.desc  || p.text || '').slice(0, 800),
        link:    p.link   || src.link,
        imgPath: path.join(src.dir, p.file || p.image),
        slug:    p.slug   || null,
        source:  src.name,
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
      const imgPath = path.join(src.dir, file);
      if (!fs.existsSync(imgPath)) continue;
      pins.push({
        slug,
        title:   `Free Notion Template: ${meta.name}`,
        desc:    meta.desc,
        link:    'https://notiontemplafix.com',
        imgPath,
        source:  'NotionTemplaFix',
      });
    }
    for (let i = pins.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pins[i], pins[j]] = [pins[j], pins[i]];
    }
  } catch (e) { log(`  ⚠️  NotionTemplaFix 加载失败: ${e.message}`); }
  return pins;
}

// ── Imgur 上传（图片公网化）───────────────────────────────────────────────────
async function uploadToImgur(imgPath) {
  const base64 = fs.readFileSync(imgPath).toString('base64');
  const body   = Buffer.from(JSON.stringify({ image: base64, type: 'base64', name: path.basename(imgPath) }), 'utf8');
  const resp   = await httpReq('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { 'Authorization': `Client-ID ${IMGUR_CID}`, 'Content-Type': 'application/json' },
  }, body);
  if (!resp.data?.success) throw new Error(`Imgur 失败: ${JSON.stringify(resp.data).slice(0, 150)}`);
  return resp.data.data.link;
}

// ── Pinterest: 创建 Pin ───────────────────────────────────────────────────────
async function createPin(token, pin, imgUrl) {
  const body = Buffer.from(JSON.stringify({
    board_id:    BOARD_ID,
    title:       pin.title,
    description: pin.desc,
    link:        pin.link,
    media_source: { source_type: 'image_url', url: imgUrl },
  }), 'utf8');

  const resp = await httpReq('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  }, body);

  if (resp.status !== 201) {
    throw new Error(`Pinterest API HTTP ${resp.status}: ${JSON.stringify(resp.data).slice(0, 250)}`);
  }
  return resp.data;
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function refillBuffer() {
  log('════════════════════════════════════════════════════');
  log('Pinterest Direct Publish v6 (7 Sites, 1 Pin/Site)');
  log('════════════════════════════════════════════════════');

  const token  = loadToken();
  const pinned = loadPinned();
  let   total  = 0;
  let   failed = 0;

  for (const src of SOURCES) {
    log(`\n📌 [${src.name}]`);

    let candidates;
    if (src.type === 'tool')   candidates = loadToolPins(src);
    else if (src.type === 'blog')   candidates = loadBlogPins(src, pinned[src.name] || []);
    else if (src.type === 'notion') candidates = loadNotionPins();
    else candidates = [];

    if (!candidates.length) {
      log(`  ⚠️  无可用图片，跳过`);
      continue;
    }

    const pin = candidates[0]; // top of shuffled list
    log(`  🖼️  选图: ${path.basename(pin.imgPath)}`);
    log(`  📝  标题: ${pin.title.slice(0, 60)}`);

    try {
      log(`  📤 上传至 Imgur…`);
      const imgUrl = await uploadToImgur(pin.imgPath);
      log(`  🌐 图片 URL: ${imgUrl}`);

      log(`  🚀 发布至 Pinterest…`);
      const result = await createPin(token, pin, imgUrl);
      log(`  ✅ Pin 创建成功 → id: ${result.id}`);

      // 标记 blog 站已钉
      if (pin.slug && (src.type === 'blog')) {
        if (!pinned[src.name]) pinned[src.name] = [];
        if (!pinned[src.name].includes(pin.slug)) {
          pinned[src.name].push(pin.slug);
          savePinned(pinned);
        }
      }

      total++;
    } catch (e) {
      log(`  ❌ 失败: ${e.message.slice(0, 200)}`);
      failed++;
    }

    // 站点间间隔 3 秒，避免限速
    if (src !== SOURCES[SOURCES.length - 1]) await new Promise(r => setTimeout(r, 3000));
  }

  log(`\n════ 完成: 发布 ${total}/${SOURCES.length} 条 Pin，失败 ${failed} 条 ════`);
}

if (require.main === module) {
  refillBuffer().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
}

module.exports = { refillBuffer };
