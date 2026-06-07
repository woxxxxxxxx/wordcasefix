'use strict';
/**
 * buffer-refill.js
 * 使用 Playwright 自动补充 Buffer 队列到 10 条
 * 支持：ContractFixPro、CoverageFixPro 的 Pinterest 账户
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

// ── 配置 ──────────────────────────────────────────────────────────────────────
const BUFFER_EMAIL    = 'xiaohuixie3@gmail.com';
const BUFFER_PASSWORD = 'Xxh113324';
const PASSWORD_VARIANTS = [
  'Xxh113324', 'xxh113324', 'XxH113324', 'Xxh113324!', 'Xxh@113324'
];

const TARGET_QUEUE = 10;
const LOG_FILE = 'C:\\Users\\Administrator\\pm-worker\\logs\\buffer-refill.log';

const SITES = [
  {
    id:         'contractfixpro',
    name:       'ContractFixPro',
    domain:     'contractfixpro.com',
    pinterestDir: 'C:\\Users\\Administrator\\contractfixpro\\pinterest',
    pinContent:   'C:\\Users\\Administrator\\contractfixpro\\pinterest\\pin-content.json',
  },
  {
    id:         'coveragefixpro',
    name:       'CoverageFixPro',
    domain:     'coveragefixpro.com',
    pinterestDir: 'C:\\Users\\Administrator\\coveragefixpro\\pinterest',
    pinContent:   'C:\\Users\\Administrator\\coveragefixpro\\pinterest\\pin-content.json',
  },
];

// ── 日志 ──────────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf8'); } catch (_) {}
}

// ── Pin 图片列表 ──────────────────────────────────────────────────────────────
function loadPins(site) {
  // 确保目录存在
  if (!fs.existsSync(site.pinterestDir)) {
    fs.mkdirSync(site.pinterestDir, { recursive: true });
    log(`  📁 创建目录: ${site.pinterestDir}`);
  }

  // 优先读 pin-content.json（有结构化标题/描述/链接）
  if (fs.existsSync(site.pinContent)) {
    try {
      const pins = JSON.parse(fs.readFileSync(site.pinContent, 'utf8'));
      return pins.map(p => ({
        imagePath: path.join(site.pinterestDir, p.image),
        title:     p.name  || toTitle(p.image),
        desc:      p.text  || `${p.name} — Free tool at ${site.domain}`,
        link:      p.link  || `https://${site.domain}`,
      })).filter(p => fs.existsSync(p.imagePath));
    } catch (e) {
      log(`  ⚠️ pin-content.json 解析失败: ${e.message}`);
    }
  }

  // 回退：扫描目录内 .png/.jpg 文件
  const exts = ['.png', '.jpg', '.jpeg', '.webp'];
  const files = fs.readdirSync(site.pinterestDir)
    .filter(f => exts.includes(path.extname(f).toLowerCase()))
    .map(f => ({
      imagePath: path.join(site.pinterestDir, f),
      title:     toTitle(path.basename(f, path.extname(f))),
      desc:      `${toTitle(path.basename(f, path.extname(f)))} — Free tool at ${site.domain}`,
      link:      `https://${site.domain}`,
    }));
  return files;
}

function toTitle(slug) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Buffer 操作 ───────────────────────────────────────────────────────────────

async function loginToBuffer(page) {
  log('  🔑 登录 Buffer...');
  await page.goto('https://buffer.com/signin', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 填写邮箱
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });
  await page.fill('input[type="email"], input[name="email"]', BUFFER_EMAIL);

  // 点击 Continue / Next（如果有分两步的表单）
  const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")');
  if (await continueBtn.count() > 0) {
    await continueBtn.first().click();
    await page.waitForTimeout(1500);
  }

  // 填写密码（尝试多个变体）
  for (const pwd of PASSWORD_VARIANTS) {
    try {
      await page.waitForSelector('input[type="password"]', { timeout: 8000 });
      await page.fill('input[type="password"]', pwd);
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
      await page.waitForTimeout(3000);

      // 检查是否登录成功
      const url = page.url();
      if (url.includes('publish') || url.includes('dashboard') || url.includes('app.buffer')) {
        log(`  ✅ 登录成功 (密码变体: ${pwd === BUFFER_PASSWORD ? '主密码' : pwd})`);
        return true;
      }

      // 检查错误提示
      const errEl = page.locator('.error, [class*="error"], [role="alert"]');
      if (await errEl.count() > 0) {
        log(`  ⚠️ 密码 "${pwd}" 失败，尝试下一个...`);
        // 清空密码框重试
        await page.fill('input[type="password"]', '');
        continue;
      }
    } catch (e) {
      log(`  ⚠️ 密码尝试异常: ${e.message}`);
    }
  }

  log('  ❌ 所有密码变体均登录失败');
  return false;
}

async function getQueueCount(page, accountName) {
  // 导航到 Queue 页面
  try {
    // Buffer publish 侧边栏：找到对应账户
    const acctLink = page.locator(`[data-account-name*="${accountName}"], [aria-label*="${accountName}"]`).first();
    if (await acctLink.count() > 0) await acctLink.click();

    await page.waitForTimeout(2000);

    // 计算队列中的帖子数
    const posts = await page.locator('[data-testid="queue-post"], .queue-item, [class*="QueuePost"], [class*="queue-post"]').count();
    log(`  📊 ${accountName} 队列当前: ${posts} 条`);
    return posts;
  } catch (e) {
    log(`  ⚠️ 获取队列数量失败: ${e.message}`);
    return 0;
  }
}

async function addPostToBuffer(page, pin, accountName) {
  log(`  ➕ 添加 Pin: ${pin.title}`);

  try {
    // 点击 New Post / Create Post 按钮
    const newPostBtn = page.locator(
      'button:has-text("New Post"), button:has-text("Create Post"), ' +
      'button:has-text("Compose"), [data-testid="create-button"]'
    ).first();
    await newPostBtn.waitFor({ timeout: 10000 });
    await newPostBtn.click();
    await page.waitForTimeout(2000);

    // 上传图片
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(pin.imagePath);
      await page.waitForTimeout(3000); // 等待上传
      log(`    📎 图片已上传: ${path.basename(pin.imagePath)}`);
    } else {
      // 尝试点击上传区域触发 file picker
      const uploadArea = page.locator('[class*="upload"], [class*="media"], button:has-text("Add Media")').first();
      if (await uploadArea.count() > 0) {
        const [fileChooser] = await Promise.all([
          page.waitForFileChooser({ timeout: 5000 }),
          uploadArea.click(),
        ]);
        await fileChooser.setFiles(pin.imagePath);
        await page.waitForTimeout(3000);
      }
    }

    // 填写描述文本
    const textArea = page.locator('textarea, [contenteditable="true"], [data-testid="composer-text"]').first();
    if (await textArea.count() > 0) {
      await textArea.click();
      await textArea.fill(pin.desc);
    }

    // 如果有链接字段
    const linkInput = page.locator('input[placeholder*="link"], input[placeholder*="URL"], input[name*="link"]').first();
    if (await linkInput.count() > 0) {
      await linkInput.fill(pin.link);
    }

    // 点击 "Add to Queue" / "Schedule"
    const addBtn = page.locator(
      'button:has-text("Add to Queue"), button:has-text("Queue"), ' +
      'button:has-text("Schedule"), [data-testid="add-to-queue"]'
    ).first();
    await addBtn.waitFor({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(2000);

    log(`    ✅ 已加入队列: ${pin.title}`);
    return true;
  } catch (e) {
    log(`    ❌ 添加失败: ${e.message}`);
    // 关闭可能打开的对话框
    try {
      const closeBtn = page.locator('button:has-text("Close"), button:has-text("Cancel"), [aria-label="Close"]').first();
      if (await closeBtn.count() > 0) await closeBtn.click();
    } catch (_) {}
    return false;
  }
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function refillBuffer() {
  log('════════════════════════════════════════');
  log('Buffer Refill 启动');
  log('════════════════════════════════════════');

  const results = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: false,  // 首次调试用 false，确认无误后改 true
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    // 登录
    const loggedIn = await loginToBuffer(page);
    if (!loggedIn) {
      log('❌ 登录失败，退出');
      results.push({ site: 'all', status: 'login_failed' });
      await browser.close();
      return results;
    }

    // 等待跳转到 publish 页面
    await page.waitForURL(/publish|dashboard|app\.buffer/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // 处理每个站点
    for (const site of SITES) {
      log(`\n── 处理: ${site.name} ──`);
      const pins = loadPins(site);

      if (pins.length === 0) {
        log(`  ⚠️ ${site.name} 无可用 Pin 图片，跳过`);
        results.push({ site: site.id, status: 'no_images', added: 0 });
        continue;
      }
      log(`  📌 找到 ${pins.length} 张 Pin 图片`);

      // 获取当前队列数
      const currentCount = await getQueueCount(page, site.name);
      const needed = Math.max(0, TARGET_QUEUE - currentCount);

      if (needed === 0) {
        log(`  ✅ ${site.name} 队列已满 (${currentCount}/${TARGET_QUEUE})，无需补充`);
        results.push({ site: site.id, status: 'queue_full', current: currentCount, added: 0 });
        continue;
      }

      log(`  📥 需要补充 ${needed} 条`);
      let added = 0;
      let pinIdx = 0;

      for (let i = 0; i < needed; i++) {
        const pin = pins[pinIdx % pins.length];
        pinIdx++;
        const ok = await addPostToBuffer(page, pin, site.name);
        if (ok) added++;
        await page.waitForTimeout(1500);
      }

      log(`  📊 ${site.name} 完成: 新增 ${added} 条，队列约 ${currentCount + added}/${TARGET_QUEUE}`);
      results.push({ site: site.id, status: 'refilled', current: currentCount, added, target: TARGET_QUEUE });
    }

    await browser.close();
  } catch (e) {
    log(`❌ 整体异常: ${e.message}`);
    results.push({ site: 'all', status: 'error', error: e.message });
    if (browser) await browser.close().catch(() => {});
  }

  // 写结果日志
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
