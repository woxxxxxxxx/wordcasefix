'use strict';
/**
 * buffer-refill.js  v3
 *
 * 流程:
 *   1. 生成最新截图 (generate-pins.js)
 *   2. 登录 Buffer → xiaohuixie3 Pinterest 账户
 *   3. 读取队列数量
 *   4. 从两个站点的 pin-content.json 交替取图，补到 MAX_QUEUE
 *
 * 通过调试确认的选择器:
 *   - 登录页: 单页表单, email + password 同时存在
 *   - Channel 页 New Post 按钮: button:has-text("New Post")
 *   - 文本区: div[contenteditable="true"] (第一个)
 *   - 图片上传: input[type="file"]
 *   - Title: input[placeholder="Your pin title"]
 *   - Destination Link: input[placeholder="Enter destination link..."]
 *   - 加入队列: button:has-text("Next Available")
 *   - 队列数: tab 文字 "Queue\n{N}\nposts" 或 "Queue{N}"
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── 配置 ──────────────────────────────────────────────────────────────────────
const MAX_QUEUE        = 10;
const BUFFER_EMAIL     = 'xiaohuixie3@gmail.com';
const BUFFER_PASSWORD  = 'Xxh113324';
const CHANNEL_ID       = '6a218b35c687a22dd45dac93';   // xiaohuixie3 Pinterest
const CHANNEL_URL      = `https://publish.buffer.com/channels/${CHANNEL_ID}/queue`;
const LOG_FILE         = 'C:\\Users\\Administrator\\pm-worker\\logs\\buffer-refill.log';
const PM_DIR           = 'C:\\Users\\Administrator\\pm-worker';

// 两个站点的 Pin 目录（轮流取图，内容更丰富）
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

// ── 加载所有可用 Pin（合并两个站点，随机打乱）────────────────────────────────
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
  // Fisher-Yates 随机打乱
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// ── 读取队列数量（从 tab 文字解析）────────────────────────────────────────────
async function getQueueCount(page) {
  try {
    // Tab 文字形如 "Queue\n0\nposts" 或 "Queue0"
    const tabText = await page.locator('[role="tab"], button[aria-label*="Queue" i]')
      .filter({ hasText: /Queue/i }).first().textContent({ timeout: 5000 }).catch(() => '');
    const m = tabText.match(/Queue\D*(\d+)/i);
    if (m) { log(`  队列: ${m[1]} 条`); return parseInt(m[1]); }
    // 备用：数页面上的 queue-post 元素
    const cards = await page.$$('[data-testid*="queue"], [class*="QueuePost"], [class*="queue-post"]');
    log(`  队列(元素计数): ${cards.length} 条`);
    return cards.length;
  } catch (e) {
    log(`  队列检测失败: ${e.message}，默认 0`);
    return 0;
  }
}

// ── 添加一条 Post ─────────────────────────────────────────────────────────────
async function addOnePost(page, pin) {
  const title = pin.title || pin.name || path.basename(pin.imgPath, '.png');
  const desc  = pin.desc  || pin.text || title;
  const link  = pin.link  || '';

  log(`  ➕ [${pin.source}] ${title.slice(0, 50)}`);

  try {
    // 1. 点 "+ New Post"（channel header 右上角）
    await page.locator('button:has-text("New Post")').first().click({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // 2. 上传图片（file input 是 hidden 元素，直接 setInputFiles 无需等可见）
    await page.locator('input[type="file"]').first().setInputFiles(pin.imgPath);
    // 等待上传真正完成：等 "Uploading" 按钮消失（不超过 30s）
    await page.waitForFunction(
      () => !Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Uploading')),
      { timeout: 30000 }
    ).catch(() => {});  // 超时就继续
    await page.waitForTimeout(1000);
    log(`    📎 图片已上传`);

    // 3. 填写 Post 文本（contenteditable div）
    const textBox = page.locator('div[contenteditable="true"]').first();
    await textBox.click();
    await textBox.fill(desc.slice(0, 500));   // Buffer Pinterest 上限 500
    await page.waitForTimeout(500);

    // 4. 填写 Pin Title
    const titleInput = page.locator('input[placeholder="Your pin title"]');
    if (await titleInput.count() > 0) {
      await titleInput.fill(title.slice(0, 100));
    }

    // 5. 填写 Destination Link
    const linkInput = page.locator('input[placeholder="Enter destination link..."]');
    if (await linkInput.count() > 0 && link) {
      await linkInput.fill(link);
    }

    // 6. 加入队列 → "Next Available"（直接排队，无需二次确认）
    await page.locator('button:has-text("Next Available")').first().click({ timeout: 10000 });
    // 等 composer 关闭（最多 10s），关闭即成功
    await page.waitForFunction(
      () => !document.querySelector('button[aria-label="Close Composer"], button') ||
            !Array.from(document.querySelectorAll('button')).some(b => b.innerText.trim() === 'Close Composer'),
      { timeout: 10000 }
    ).catch(() => {});
    await page.waitForTimeout(1500);

    log(`    ✅ 已加入队列`);
    // 成功后导航回 queue 页，确保下次"New Post"可找到
    await page.goto(CHANNEL_URL, { waitUntil: 'commit', timeout: 15000 });
    await page.waitForSelector('button:has-text("New Post")', { timeout: 15000 });
    await page.waitForTimeout(1000);
    return true;

  } catch (e) {
    log(`    ❌ 失败: ${e.message.slice(0, 120)}`);
    // 导航回 channel 页重置状态（比关闭 composer 更可靠）
    try {
      await page.goto(CHANNEL_URL, { waitUntil: 'commit', timeout: 15000 });
      await page.waitForSelector('button:has-text("New Post")', { timeout: 15000 });
      await page.waitForTimeout(1500);
    } catch (_) {}
    return false;
  }
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function refillBuffer() {
  log('════════════════════════════════════════');
  log('Buffer Refill v3 启动');
  log('════════════════════════════════════════');

  // Step 1: 生成截图
  log('\n📸 Step 1: 生成 Pin 截图...');
  try {
    execSync(`node "${path.join(PM_DIR, 'generate-pins.js')}"`, {
      cwd: PM_DIR, timeout: 180000, stdio: 'inherit',
    });
  } catch (e) {
    log(`⚠️  截图生成超时/失败: ${e.message.slice(0,80)}，继续使用已有图片`);
  }

  // Step 2: 加载所有 Pin
  log('\n📌 Step 2: 加载 Pin 图片...');
  const pins = loadAllPins();
  if (pins.length === 0) {
    log('❌ 无可用 Pin 图片，退出');
    return;
  }
  log(`  合计 ${pins.length} 张可用`);

  // Step 3: 启动浏览器 + 登录
  log('\n🌐 Step 3: 启动浏览器...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    proxy: { server: 'http://127.0.0.1:7897' },
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  try {
    // 登录
    log('  🔑 登录 Buffer...');
    await page.goto('https://login.buffer.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.fill('input[name="email"]', BUFFER_EMAIL);
    await page.fill('input[name="password"]', BUFFER_PASSWORD);
    await page.locator('#login-form-submit').click();
    await page.waitForURL(/publish\.buffer\.com/, { timeout: 20000, waitUntil: 'commit' });
    log('  ✅ 登录成功');

    // 导航到 Pinterest channel queue 页
    log(`\n📋 Step 4: 导航到 channel queue...`);
    await page.goto(CHANNEL_URL, { waitUntil: 'commit', timeout: 30000 });
    // 等待页面 React 渲染（等 New Post 按钮出现）
    await page.waitForSelector('button:has-text("New Post")', { timeout: 30000 });
    await page.waitForTimeout(2000);
    log(`  ✅ Channel 页已就绪`);

    // 读取当前队列数
    const currentCount = await getQueueCount(page);
    const toAdd = Math.max(0, MAX_QUEUE - currentCount);

    if (toAdd === 0) {
      log(`\n✅ 队列已满 (${currentCount}/${MAX_QUEUE})，无需补充`);
      await browser.close();
      return;
    }
    log(`\n📥 Step 5: 队列 ${currentCount}/${MAX_QUEUE}，需补充 ${toAdd} 条`);

    // 逐条添加
    let added = 0;
    for (let i = 0; i < toAdd; i++) {
      const pin = pins[i % pins.length];
      const ok  = await addOnePost(page, pin);
      if (ok) added++;
      await page.waitForTimeout(1000);
    }

    log(`\n════ 完成: 新增 ${added}/${toAdd} 条，队列约 ${currentCount + added}/${MAX_QUEUE} ════`);

  } catch (e) {
    log(`❌ 致命错误: ${e.message}`);
    try {
      await page.screenshot({ path: path.join(PM_DIR, 'logs', 'buffer-error.png') });
    } catch (_) {}
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  refillBuffer().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
}

module.exports = { refillBuffer };
