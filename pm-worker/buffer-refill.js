'use strict';
/**
 * buffer-refill.js
 * 1. 调用 generate-pins.js 生成最新截图
 * 2. 登录 Buffer，检测每个 Pinterest 账户队列
 * 3. 队列 < MAX_QUEUE 则补充到满
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── 配置 ──────────────────────────────────────────────────────────────────────
const MAX_QUEUE       = 10;   // Buffer 免费版上限，升级后改此数字
const BUFFER_EMAIL    = 'xiaohuixie3@gmail.com';
const BUFFER_PASSWORDS = ['Xxh113324', 'Xxh113324~', 'xxh113324', 'Xxh@113324'];
const LOG_FILE = 'C:\\Users\\Administrator\\pm-worker\\logs\\buffer-refill.log';

const SITES = [
  {
    name:           'CoverageFixPro',
    pinterestDir:   'C:\\Users\\Administrator\\coveragefixpro\\pinterest',
    channelKeyword: 'coverage',
  },
  {
    name:           'ContractFixPro',
    pinterestDir:   'C:\\Users\\Administrator\\contractfixpro\\pinterest',
    channelKeyword: 'contract',
  },
];

// ── 日志 ──────────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (_) {}
}

// ── Pin 读取 ──────────────────────────────────────────────────────────────────
function loadPins(site) {
  const jsonPath = path.join(site.pinterestDir, 'pin-content.json');
  if (!fs.existsSync(jsonPath)) return [];
  try {
    const pins = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    // 过滤图片文件存在的记录
    return pins.filter(p => {
      const imgFile = p.file || p.image;
      return imgFile && fs.existsSync(path.join(site.pinterestDir, imgFile));
    });
  } catch (e) {
    log(`  ⚠️ pin-content.json 解析失败: ${e.message}`);
    return [];
  }
}

// ── 队列数检测 ────────────────────────────────────────────────────────────────
async function getQueueCount(page, channelKeyword) {
  try {
    await page.waitForTimeout(2000);
    // Buffer Publish 页：队列条目
    const items = await page.$$('[data-testid="queue-post"], .queue-post, [class*="QueuePost"]');
    if (items.length > 0) {
      log(`  队列检测: ${items.length} 条`);
      return items.length;
    }
    // 尝试从页面文本提取数字
    const text = await page.locator('[class*="queue"], [class*="Queue"]').first().textContent().catch(() => '');
    const m = text.match(/(\d+)/);
    if (m) return parseInt(m[1]);
    // 保守估计，触发至少补充 3 条
    log(`  队列检测失败，保守估计 7 条`);
    return 7;
  } catch (e) {
    log(`  队列检测异常: ${e.message}，保守估计 7 条`);
    return 7;
  }
}

// ── Buffer 登录 ───────────────────────────────────────────────────────────────
async function loginBuffer(page) {
  log('  🔑 登录 Buffer...');
  await page.goto('https://login.buffer.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 填写邮箱
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 15000 });
  await page.fill('input[name="email"], input[type="email"]', BUFFER_EMAIL);

  // 提交邮箱（可能是两步表单）
  const submitEmail = page.locator('button[type="submit"]').first();
  await submitEmail.click();
  await page.waitForTimeout(2000);

  // 尝试各密码
  for (const pwd of BUFFER_PASSWORDS) {
    try {
      const pwdInput = page.locator('input[name="password"], input[type="password"]').first();
      await pwdInput.waitFor({ timeout: 8000 });
      await pwdInput.fill(pwd);
      await page.locator('button[type="submit"]').first().click();
      // 等待跳转
      await page.waitForURL(/publish|dashboard|app\.buffer/, { timeout: 10000 });
      log(`  ✅ 登录成功`);
      return true;
    } catch (_) {
      log(`  密码失败，尝试下一个...`);
      // 重新进入登录页
      try {
        await page.goto('https://login.buffer.com/login', { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.fill('input[name="email"], input[type="email"]', BUFFER_EMAIL);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForTimeout(1500);
      } catch (_2) {}
    }
  }
  log('  ❌ 所有密码均失败');
  return false;
}

// ── 添加单条 Post ─────────────────────────────────────────────────────────────
async function addPost(page, site, pin) {
  const imgFile = pin.file || pin.image;
  const imgPath = path.join(site.pinterestDir, imgFile);
  const title   = pin.title || pin.name || imgFile;
  const desc    = pin.desc  || pin.text || title;
  const link    = pin.link  || '';
  const caption = `${title}\n\n${desc}\n\n🔗 ${link}`.trim();

  try {
    // 点击 New Post
    await page.locator(
      'button:has-text("New Post"), button:has-text("Create Post"), ' +
      'button:has-text("Compose"), [data-testid*="new-post"], [data-testid*="create"]'
    ).first().click({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // 上传图片
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(imgPath);
    } else {
      // 触发文件选择器
      const [chooser] = await Promise.all([
        page.waitForFileChooser({ timeout: 5000 }),
        page.locator('[class*="upload"], [class*="media"], button:has-text("Add Media"), button:has-text("Upload")')
          .first().click(),
      ]);
      await chooser.setFiles(imgPath);
    }
    await page.waitForTimeout(3000); // 等待上传

    // 填写文案
    const textArea = page.locator(
      'textarea, div[contenteditable="true"], [data-testid="composer-text"], [class*="composer"] textarea'
    ).first();
    if (await textArea.count() > 0) {
      await textArea.click();
      await textArea.fill(caption);
      await page.waitForTimeout(500);
    }

    // 点击加入队列
    await page.locator(
      'button:has-text("Add to Queue"), button:has-text("Queue"), ' +
      'button:has-text("Schedule"), [data-testid*="queue"], [data-testid*="schedule"]'
    ).first().click({ timeout: 10000 });
    await page.waitForTimeout(2000);

    log(`    ✅ 已加入: ${title.slice(0, 50)}`);
    return true;
  } catch (e) {
    log(`    ❌ 添加失败: ${e.message.slice(0, 100)}`);
    // 关闭弹窗
    try {
      await page.locator('button:has-text("Close"), button:has-text("Cancel"), [aria-label="Close"]')
        .first().click({ timeout: 3000 });
    } catch (_) {}
    return false;
  }
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function refillBuffer() {
  log('════════════════════════════════════════');
  log('Buffer Refill 启动');
  log('════════════════════════════════════════');

  // Step 1: 生成最新 Pin 截图
  log('\n📸 生成 Pin 截图...');
  try {
    execSync(`node "${path.join('C:\\Users\\Administrator\\pm-worker', 'generate-pins.js')}"`, {
      cwd:     'C:\\Users\\Administrator\\pm-worker',
      timeout: 120000,
      stdio:   'inherit',
    });
  } catch (e) {
    log(`⚠️ 截图生成失败: ${e.message}，继续使用已有图片`);
  }

  // Step 2: 登录 Buffer 并补充队列
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    viewport:  { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const results = [];

  try {
    const loggedIn = await loginBuffer(page);
    if (!loggedIn) {
      results.push({ site: 'all', status: 'login_failed' });
      await browser.close();
      return results;
    }

    await page.waitForTimeout(3000); // 等待页面稳定

    for (const site of SITES) {
      log(`\n── 处理: ${site.name} ──`);

      const pins = loadPins(site);
      if (pins.length === 0) {
        log(`  ⚠️ 无可用 Pin 图片，跳过`);
        results.push({ site: site.name, status: 'no_images', added: 0 });
        continue;
      }
      log(`  📌 找到 ${pins.length} 张 Pin 图片`);

      // 导航到对应频道
      try {
        const channelLink = page.locator(`[title*="${site.channelKeyword}" i], a:has-text("${site.name}")`).first();
        if (await channelLink.count() > 0) await channelLink.click();
        await page.waitForTimeout(2000);
      } catch (_) {}

      const currentCount = await getQueueCount(page, site.channelKeyword);
      const toAdd = Math.max(0, MAX_QUEUE - currentCount);

      if (toAdd === 0) {
        log(`  ✅ 队列已满 (${currentCount}/${MAX_QUEUE})，跳过`);
        results.push({ site: site.name, status: 'queue_full', current: currentCount, added: 0 });
        continue;
      }

      log(`  📥 队列 ${currentCount}/${MAX_QUEUE}，需补充 ${toAdd} 条`);

      // 随机打乱，循环取 pin
      const shuffled = [...pins].sort(() => Math.random() - 0.5);
      let added = 0;

      for (let i = 0; i < toAdd; i++) {
        const pin = shuffled[i % shuffled.length];
        const ok  = await addPost(page, site, pin);
        if (ok) added++;
        await page.waitForTimeout(1500);
      }

      log(`  📊 完成：新增 ${added} 条，队列约 ${currentCount + added}/${MAX_QUEUE}`);
      results.push({ site: site.name, status: 'refilled', current: currentCount, added, target: MAX_QUEUE });
    }
  } catch (e) {
    log(`❌ 整体异常: ${e.message}`);
    results.push({ site: 'all', status: 'error', error: e.message });
  } finally {
    await browser.close();
  }

  const summary = results.map(r =>
    `${r.site}: ${r.status}` + (r.added != null ? ` (+${r.added})` : '')
  ).join(' | ');
  log(`\n════ 完成 ════ ${summary}`);
  return results;
}

// ── 入口 ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  refillBuffer().catch(e => {
    log(`致命错误: ${e.message}`);
    process.exit(1);
  });
}

module.exports = { refillBuffer };
