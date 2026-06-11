'use strict';
/**
 * buffer-refill.js  v5
 *
 * 7 个站点轮换补充 Pinterest 队列：
 *   CoverageFixPro · ContractFixPro · BillingFixPro · PayrollFixPro
 *   InsuranceTipsPro · FreelancerGuideHub · NotionTemplaFix
 *
 * 流程：
 *   1. 生成最新截图 (generate-pins.js)
 *   2. GraphQL 查询队列数
 *   3. 按站点轮换补到 MAX_QUEUE（每站 1–2 条，保持多样性）
 *   4. blog 站文章钉过后写入 pinned-articles.json 避免重复
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { HttpsProxyAgent } = require('https-proxy-agent');

// ── 配置 ──────────────────────────────────────────────────────────────────────
const MAX_QUEUE    = 10;
const BUFFER_TOKEN = 'aPPMezKy_6SKLs8F-9iUzZo4vM959_4K8YKqHCe9iQU';
const ORG_ID       = '6a2026ccd819e8c99b17eb9e';
const CHANNEL_ID   = '6a218b35c687a22dd45dac93';
const BOARD_SVC_ID = '1097119227915211401';
const GQL_URL      = 'https://api.buffer.com/graphql';
const IMGUR_CID    = '546c25a59c58ad7';
const PROXY_URL    = 'http://127.0.0.1:7897';
const LOG_FILE     = 'C:\\Users\\Administrator\\pm-worker\\logs\\buffer-refill.log';
const PINNED_FILE  = 'C:\\Users\\Administrator\\pm-worker\\logs\\pinned-articles.json';
const PM_DIR       = 'C:\\Users\\Administrator\\pm-worker';

// ── 站点定义 ──────────────────────────────────────────────────────────────────
// type: 'tool'   → 读 pin-content.json（由 generate-pins.js 生成截图）
// type: 'blog'   → 读 pin-content.json（HTML 模板 Pin），跟踪已钉 slug
// type: 'notion' → 直读 pinterest/*.jpg，内置 metadata map
const SOURCES = [
  { name: 'CoverageFixPro',     type: 'tool',   dir: 'C:\\Users\\Administrator\\coveragefixpro\\pinterest' },
  { name: 'ContractFixPro',     type: 'tool',   dir: 'C:\\Users\\Administrator\\contractfixpro\\pinterest' },
  { name: 'BillingFixPro',      type: 'tool',   dir: 'C:\\Users\\Administrator\\billingfixpro\\pinterest' },
  { name: 'PayrollFixPro',      type: 'tool',   dir: 'C:\\Users\\Administrator\\payrollfixpro\\pinterest' },
  { name: 'InsuranceTipsPro',   type: 'blog',   dir: 'C:\\Users\\Administrator\\insurancetipspro\\pinterest' },
  { name: 'FreelancerGuideHub', type: 'blog',   dir: 'C:\\Users\\Administrator\\freelancerguidehub\\pinterest' },
  { name: 'NotionTemplaFix',    type: 'notion', dir: 'C:\\Users\\Administrator\\notiontemplafix\\pinterest' },
];

// NotionTemplaFix 模板 metadata（slug → 展示名 + 描述）
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

// ── HTTP 请求（带代理）──────────────────────────────────────────────────────
function httpReq(urlStr, opts = {}, bodyBuf = null) {
  return new Promise((resolve, reject) => {
    const agent   = new HttpsProxyAgent(PROXY_URL);
    const url     = new URL(urlStr);
    const reqOpts = {
      hostname: url.hostname, port: 443,
      path:     url.pathname + url.search,
      method:   opts.method || 'GET',
      headers:  { 'User-Agent': 'pm-worker/5.0', ...opts.headers },
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
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BUFFER_TOKEN}`, 'Content-Type': 'application/json' },
  }, body);
  if (resp.status !== 200) throw new Error(`GraphQL HTTP ${resp.status}: ${JSON.stringify(resp.data).slice(0, 200)}`);
  if (resp.data?.errors?.length) throw new Error(`GraphQL: ${resp.data.errors[0]?.message}`);
  return resp.data?.data ?? resp.data;
}

// ── Pinned 文章跟踪 ────────────────────────────────────────────────────────────
function loadPinnedArticles() {
  try { return JSON.parse(fs.readFileSync(PINNED_FILE, 'utf8')); } catch (_) { return {}; }
}
function savePinnedArticles(pinned) {
  fs.mkdirSync(path.dirname(PINNED_FILE), { recursive: true });
  fs.writeFileSync(PINNED_FILE, JSON.stringify(pinned, null, 2), 'utf8');
}
function markPinned(pinned, source, slug) {
  if (!slug) return;
  if (!pinned[source]) pinned[source] = [];
  if (!pinned[source].includes(slug)) pinned[source].push(slug);
}

// ── 加载各站 Pins ─────────────────────────────────────────────────────────────
function loadToolPins(src) {
  const jsonPath = path.join(src.dir, 'pin-content.json');
  if (!fs.existsSync(jsonPath)) { log(`  ⚠️  ${src.name}: 无 pin-content.json`); return []; }
  try {
    const pins = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const valid = pins.filter(p => {
      const f = p.file || p.image;
      return f && fs.existsSync(path.join(src.dir, f));
    }).map(p => ({ ...p, imgPath: path.join(src.dir, p.file || p.image), source: src.name }));
    // Fisher-Yates shuffle
    for (let i = valid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [valid[i], valid[j]] = [valid[j], valid[i]];
    }
    return valid;
  } catch (e) { log(`  ⚠️  ${src.name} 解析失败: ${e.message}`); return []; }
}

function loadBlogPins(src, pinnedSlugs) {
  const pinned = new Set(pinnedSlugs || []);
  const jsonPath = path.join(src.dir, 'pin-content.json');
  if (!fs.existsSync(jsonPath)) { log(`  ⚠️  ${src.name}: 无 pin-content.json`); return []; }
  try {
    const pins = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    // 最新文章优先（topics-used.json 末尾 = 最新），过滤已钉
    const valid = pins
      .filter(p => {
        if (p.slug && pinned.has(p.slug)) return false;
        const f = p.file || p.image;
        return f && fs.existsSync(path.join(src.dir, f));
      })
      .reverse() // 最新先用
      .map(p => ({ ...p, imgPath: path.join(src.dir, p.file || p.image), source: src.name }));
    return valid;
  } catch (e) { log(`  ⚠️  ${src.name} 解析失败: ${e.message}`); return []; }
}

function loadNotionPins() {
  const dir = SOURCES.find(s => s.name === 'NotionTemplaFix').dir;
  const pins = [];
  try {
    const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f) && f.includes('-pin'));
    for (const file of files) {
      // 'habit-tracker-pin.jpg'      → slug 'habit-tracker'
      // 'life-os-app-pin.jpg'        → slug 'life-os' (strip -app)
      // 'finance-tracker-app-pin.jpg'→ slug 'finance-tracker'
      const raw  = file.replace(/-pin\.(jpg|jpeg|png)$/i, '');
      const slug = raw.replace(/-app$/, '');
      const meta = NOTION_META[slug];
      if (!meta) { log(`  ⚠️  NotionTemplaFix: 无 metadata for ${file}`); continue; }
      const imgPath = path.join(dir, file);
      if (!fs.existsSync(imgPath)) continue;
      pins.push({
        slug,
        file,
        imgPath,
        title: `Free Notion Template: ${meta.name}`,
        name:  `Free Notion Template: ${meta.name}`,
        desc:  meta.desc,
        text:  meta.desc,
        link:  'https://payhip.com/NotionTemplaFix',
        source: 'NotionTemplaFix',
      });
    }
    // Shuffle
    for (let i = pins.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pins[i], pins[j]] = [pins[j], pins[i]];
    }
  } catch (e) { log(`  ⚠️  NotionTemplaFix 加载失败: ${e.message}`); }
  return pins;
}

// ── 按站轮换，构建补充队列 ────────────────────────────────────────────────────
function buildRotatedQueue(pinsBySite, needed) {
  const siteKeys = Object.keys(pinsBySite).filter(k => pinsBySite[k].length > 0);
  const result   = [];
  let   si       = 0;
  while (result.length < needed) {
    const active = siteKeys.filter(k => pinsBySite[k].length > 0);
    if (active.length === 0) break;
    const key = active[si % active.length];
    result.push(pinsBySite[key].shift());
    si++;
  }
  return result;
}

// ── 查询队列数 ────────────────────────────────────────────────────────────────
async function getQueueCount() {
  const query = `{
    posts(input: {
      organizationId: "${ORG_ID}"
      filter: { channelIds: ["${CHANNEL_ID}"], status: [scheduled] }
    }) { edges { node { id } } }
  }`;
  const data  = await gql(query);
  const count = (data?.posts?.edges || []).length;
  log(`  📊 队列(GraphQL): ${count} 条`);
  return count;
}

// ── Imgur 上传 ────────────────────────────────────────────────────────────────
async function uploadToImgur(imgPath) {
  const base64img = fs.readFileSync(imgPath).toString('base64');
  const body = Buffer.from(JSON.stringify({
    image: base64img, type: 'base64', name: path.basename(imgPath),
  }), 'utf8');
  const resp = await httpReq('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { 'Authorization': `Client-ID ${IMGUR_CID}`, 'Content-Type': 'application/json' },
  }, body);
  if (!resp.data?.success) throw new Error(`Imgur 失败: ${JSON.stringify(resp.data).slice(0, 150)}`);
  return resp.data.data.link;
}

// ── Buffer 创建 Post ──────────────────────────────────────────────────────────
async function createPost(pin, imgUrl) {
  const title = (pin.title || pin.name || '').slice(0, 100);
  const desc  = (pin.desc  || pin.text || title).slice(0, 500);
  const link  = pin.link || '';

  const data = await gql(`
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess  { post { id status dueAt shareMode } }
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
      text: desc,
      metadata: { pinterest: { title, url: link, boardServiceId: BOARD_SVC_ID } },
    },
  });

  const result = data?.createPost;
  if (result?.post?.id) {
    log(`    📋 Post ID: ${result.post.id}，状态: ${result.post.status}，dueAt: ${result.post.dueAt || '待排队'}`);
    return true;
  }
  throw new Error(result?.message || `createPost 异常: ${JSON.stringify(result).slice(0, 100)}`);
}

// ── 主流程 ────────────────────────────────────────────────════════════════════
async function refillBuffer() {
  log('════════════════════════════════════════');
  log('Buffer Refill v5 (7 Sites Rotation) 启动');
  log('════════════════════════════════════════');

  // Step 1: 生成截图（工具站 + blog 站）
  log('\n📸 Step 1: 生成 Pin 截图...');
  try {
    execSync(`node "${path.join(PM_DIR, 'generate-pins.js')}"`, {
      cwd: PM_DIR, timeout: 300000, stdio: 'inherit',
    });
  } catch (e) {
    log(`⚠️  截图生成超时/失败: ${e.message.slice(0, 80)}，继续使用已有图片`);
  }

  // Step 2: 检查队列
  log('\n📊 Step 2: 检查 Buffer 队列...');
  const currentCount = await getQueueCount();
  const toAdd = Math.max(0, MAX_QUEUE - currentCount);

  if (toAdd === 0) {
    log(`\n✅ 队列已满 (${currentCount}/${MAX_QUEUE})，无需补充`);
    return;
  }
  log(`  队列 ${currentCount}/${MAX_QUEUE}，需补充 ${toAdd} 条`);

  // Step 3: 加载各站 Pins
  log('\n📌 Step 3: 加载各站 Pins...');
  const pinned    = loadPinnedArticles();
  const pinsBySite = {};

  for (const src of SOURCES) {
    let pins;
    if (src.type === 'tool')   pins = loadToolPins(src);
    else if (src.type === 'blog')   pins = loadBlogPins(src, pinned[src.name] || []);
    else if (src.type === 'notion') pins = loadNotionPins();
    else pins = [];

    pinsBySite[src.name] = pins;
    log(`  📌 ${src.name}: ${pins.length} 个可用`);
  }

  // Step 4: 构建轮换队列
  const queue = buildRotatedQueue(pinsBySite, toAdd);
  if (queue.length === 0) { log('❌ 无可用 Pin，退出'); return; }

  // Step 5: 逐条上传 + 创建 Post
  log(`\n📥 Step 4: 补充 ${queue.length} 条（轮换来自 ${[...new Set(queue.map(p => p.source))].join(', ')}）`);
  let added = 0;
  for (let i = 0; i < queue.length; i++) {
    const pin   = queue[i];
    const title = (pin.title || pin.name || '').slice(0, 50);
    log(`\n  ➕ [${pin.source}] ${title}`);
    try {
      log(`    📤 上传图片: ${path.basename(pin.imgPath)}`);
      const imgUrl = await uploadToImgur(pin.imgPath);
      log(`    🖼️  Imgur URL: ${imgUrl}`);
      await createPost(pin, imgUrl);
      log(`    ✅ 已加入队列`);
      added++;
      // blog 站：标记已钉
      if (pin.slug && (pin.source === 'InsuranceTipsPro' || pin.source === 'FreelancerGuideHub')) {
        markPinned(pinned, pin.source, pin.slug);
        savePinnedArticles(pinned);
      }
    } catch (e) {
      log(`    ❌ 失败: ${e.message.slice(0, 200)}`);
    }
    if (i < queue.length - 1) await new Promise(r => setTimeout(r, 2000));
  }

  log(`\n════ 完成: 新增 ${added}/${toAdd} 条，队列约 ${currentCount + added}/${MAX_QUEUE} ════`);
}

if (require.main === module) {
  refillBuffer().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
}

module.exports = { refillBuffer };
