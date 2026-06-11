'use strict';
/**
 * buffer-refill.js  v4
 *
 * 流程:
 *   1. 生成最新 Pin 截图 (generate-pins.js)
 *   2. GraphQL API 查询 Pinterest 队列数
 *   3. 若队列 < MAX_QUEUE，上传图片到 Imgur，通过 Buffer GraphQL createPost 补到满
 *
 * 无 Playwright，无浏览器，纯 API 调用。
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
const CHANNEL_ID   = '6a218b35c687a22dd45dac93';  // xiaohuixie3 Pinterest
const BOARD_SVC_ID = '1097119227915211401';        // "Productivity Apps" board
const GQL_URL      = 'https://api.buffer.com/graphql';
const IMGUR_CID    = '546c25a59c58ad7';
const PROXY_URL    = 'http://127.0.0.1:7897';
const LOG_FILE     = 'C:\\Users\\Administrator\\pm-worker\\logs\\buffer-refill.log';
const PM_DIR       = 'C:\\Users\\Administrator\\pm-worker';

const PIN_SOURCES = [
  { name: 'CoverageFixPro', dir: 'C:\\Users\\Administrator\\coveragefixpro\\pinterest' },
  { name: 'ContractFixPro', dir: 'C:\\Users\\Administrator\\contractfixpro\\pinterest' },
];

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
      hostname: url.hostname,
      port:     443,
      path:     url.pathname + url.search,
      method:   opts.method || 'GET',
      headers:  { 'User-Agent': 'pm-worker/4.0', ...opts.headers },
      agent,
    };
    if (bodyBuf) reqOpts.headers['Content-Length'] = bodyBuf.length;
    const req = https.request(reqOpts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data;
        try { data = JSON.parse(raw); } catch (_) { data = raw; }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

// ── Buffer GraphQL 请求 ───────────────────────────────────────────────────────
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

// ── 加载 Pin（合并两站，随机打乱）──────────────────────────────────────────
function loadAllPins() {
  const all = [];
  for (const src of PIN_SOURCES) {
    const jsonPath = path.join(src.dir, 'pin-content.json');
    if (!fs.existsSync(jsonPath)) { log(`  ⚠️  ${src.name} 无 pin-content.json`); continue; }
    try {
      const pins = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      let valid = 0;
      for (const p of pins) {
        const imgFile = p.file || p.image;
        if (!imgFile) continue;
        const imgPath = path.join(src.dir, imgFile);
        if (!fs.existsSync(imgPath)) continue;
        all.push({ ...p, imgPath, source: src.name });
        valid++;
      }
      log(`  📌 ${src.name}: ${valid} 张可用`);
    } catch (e) { log(`  ⚠️  ${src.name} JSON 解析失败: ${e.message}`); }
  }
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// ── 查询当前 Pinterest 队列数 ─────────────────────────────────────────────────
async function getQueueCount() {
  const query = `{
    posts(input: {
      organizationId: "${ORG_ID}"
      filter: { channelIds: ["${CHANNEL_ID}"], status: [scheduled] }
    }) {
      edges { node { id } }
    }
  }`;
  const data = await gql(query);
  const edges = data?.posts?.edges || [];
  const count = edges.length;
  log(`  📊 队列(GraphQL): ${count} 条`);
  return count;
}

// ── 上传图片到 Imgur → 获取公开 URL ──────────────────────────────────────────
async function uploadToImgur(imgPath) {
  const imageData = fs.readFileSync(imgPath);
  const base64img = imageData.toString('base64');
  const body = Buffer.from(JSON.stringify({
    image: base64img,
    type:  'base64',
    name:  path.basename(imgPath),
  }), 'utf8');

  const resp = await httpReq('https://api.imgur.com/3/image', {
    method:  'POST',
    headers: { 'Authorization': `Client-ID ${IMGUR_CID}`, 'Content-Type': 'application/json' },
  }, body);

  if (!resp.data?.success) {
    throw new Error(`Imgur upload 失败: ${JSON.stringify(resp.data).slice(0, 200)}`);
  }
  return resp.data.data.link;
}

// ── 通过 Buffer GraphQL 创建 Post ─────────────────────────────────────────────
async function createPost(pin, imgUrl) {
  const title = (pin.title || pin.name || '').slice(0, 100);
  const desc  = (pin.desc  || pin.text || title).slice(0, 500);
  const link  = pin.link || '';

  const data = await gql(`
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post { id status dueAt shareMode }
        }
        ... on InvalidInputError { message }
        ... on LimitReachedError { message }
        ... on UnauthorizedError { message }
        ... on UnexpectedError   { message }
        ... on RestProxyError    { message }
        ... on NotFoundError     { message }
      }
    }
  `, {
    input: {
      channelId:      CHANNEL_ID,
      schedulingType: 'automatic',
      mode:           'addToQueue',
      assets: [{
        image: {
          url:      imgUrl,
          metadata: { altText: title },
        },
      }],
      text: desc,
      metadata: {
        pinterest: {
          title,
          url:            link,
          boardServiceId: BOARD_SVC_ID,
        },
      },
    },
  });

  const result = data?.createPost;
  if (result?.post?.id) {
    log(`    📋 Post ID: ${result.post.id}，状态: ${result.post.status}，dueAt: ${result.post.dueAt || '待排队'}`);
    return true;
  }
  throw new Error(result?.message || `createPost 返回异常: ${JSON.stringify(result).slice(0, 150)}`);
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function refillBuffer() {
  log('════════════════════════════════════════');
  log('Buffer Refill v4 (GraphQL + Imgur) 启动');
  log('════════════════════════════════════════');

  // Step 1: 生成截图
  log('\n📸 Step 1: 生成 Pin 截图...');
  try {
    execSync(`node "${path.join(PM_DIR, 'generate-pins.js')}"`, {
      cwd: PM_DIR, timeout: 180000, stdio: 'inherit',
    });
  } catch (e) {
    log(`⚠️  截图生成超时/失败: ${e.message.slice(0, 80)}，继续使用已有图片`);
  }

  // Step 2: 加载 Pins
  log('\n📌 Step 2: 加载 Pin 图片...');
  const pins = loadAllPins();
  if (pins.length === 0) { log('❌ 无可用 Pin 图片，退出'); return; }
  log(`  合计 ${pins.length} 张可用`);

  // Step 3: 检查队列
  log('\n📊 Step 3: 检查 Buffer 队列...');
  const currentCount = await getQueueCount();
  const toAdd = Math.max(0, MAX_QUEUE - currentCount);

  if (toAdd === 0) {
    log(`\n✅ 队列已满 (${currentCount}/${MAX_QUEUE})，无需补充`);
    return;
  }
  log(`\n📥 Step 4: 队列 ${currentCount}/${MAX_QUEUE}，需补充 ${toAdd} 条`);

  // Step 4: 逐条添加
  let added = 0;
  for (let i = 0; i < toAdd; i++) {
    const pin   = pins[i % pins.length];
    const title = (pin.title || pin.name || '').slice(0, 50);
    log(`\n  ➕ [${pin.source}] ${title}`);
    try {
      log(`    📤 上传图片: ${path.basename(pin.imgPath)}`);
      const imgUrl = await uploadToImgur(pin.imgPath);
      log(`    🖼️  Imgur URL: ${imgUrl}`);
      await createPost(pin, imgUrl);
      log(`    ✅ 已加入队列`);
      added++;
    } catch (e) {
      log(`    ❌ 失败: ${e.message.slice(0, 200)}`);
    }
    if (i < toAdd - 1) await new Promise(r => setTimeout(r, 2000));
  }

  log(`\n════ 完成: 新增 ${added}/${toAdd} 条，队列约 ${currentCount + added}/${MAX_QUEUE} ════`);
}

if (require.main === module) {
  refillBuffer().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
}

module.exports = { refillBuffer };
