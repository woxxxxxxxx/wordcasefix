'use strict';
/**
 * debug-buffer-post.js
 * 专门调试单条 Post 的完整流程，每步截图
 */
const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

const SNAP_DIR = 'C:\\Users\\Administrator\\pm-worker\\logs\\debug-post';
fs.mkdirSync(SNAP_DIR, { recursive: true });

let snapN = 0;
async function snap(page, label) {
  snapN++;
  const p = path.join(SNAP_DIR, `${String(snapN).padStart(2,'0')}-${label}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`📸 ${p}`);
}

// 找一张真实存在的图片
function findTestPin() {
  const dirs = [
    'C:\\Users\\Administrator\\contractfixpro\\pinterest',
    'C:\\Users\\Administrator\\coveragefixpro\\pinterest',
  ];
  for (const dir of dirs) {
    const jsonPath = path.join(dir, 'pin-content.json');
    if (!fs.existsSync(jsonPath)) continue;
    const pins = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    for (const p of pins) {
      const imgFile = p.file || p.image;
      const imgPath = path.join(dir, imgFile);
      if (fs.existsSync(imgPath)) {
        return { ...p, imgPath };
      }
    }
  }
  return null;
}

async function main() {
  const pin = findTestPin();
  if (!pin) { console.error('❌ 找不到测试 Pin 图片'); process.exit(1); }
  console.log('测试 Pin:', pin.title || pin.name, '→', pin.imgPath);

  const browser = await chromium.launch({
    headless: false, slowMo: 500,
    proxy: { server: 'http://127.0.0.1:7897' },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  try {
    // 登录
    console.log('\n[1] 登录...');
    await page.goto('https://login.buffer.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.fill('input[name="email"]', 'xiaohuixie3@gmail.com');
    await page.fill('input[name="password"]', 'Xxh113324');
    await page.locator('#login-form-submit').click();
    await page.waitForURL(/publish\.buffer\.com/, { waitUntil: 'commit', timeout: 20000 });
    console.log('✅ 登录成功');

    // 导航到 channel
    const CHANNEL_URL = 'https://publish.buffer.com/channels/6a218b35c687a22dd45dac93/queue';
    await page.goto(CHANNEL_URL, { waitUntil: 'commit', timeout: 30000 });
    await page.waitForSelector('button:has-text("New Post")', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await snap(page, 'channel-ready');
    console.log('\n[2] Channel 页就绪，URL:', page.url());

    // 点 New Post
    console.log('\n[3] 点击 New Post...');
    await page.locator('button:has-text("New Post")').first().click();
    await page.waitForTimeout(3000);
    await snap(page, 'composer-opened');

    // 打印所有可见按钮
    const btns = await page.$$eval('button', b => b.map(e => e.innerText.trim()).filter(t => t));
    console.log('Composer 内按钮:', btns);

    // 上传图片（file input 是 hidden 元素，直接 setInputFiles 无需等可见）
    console.log('\n[4] 上传图片:', path.basename(pin.imgPath));
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(pin.imgPath);
    await page.waitForTimeout(4000);
    await snap(page, 'image-uploaded');

    // 检查上传后的按钮列表
    const btns2 = await page.$$eval('button', b => b.map(e => e.innerText.trim()).filter(t => t));
    console.log('上传后按钮:', btns2);

    // 填写文本
    console.log('\n[5] 填写文本...');
    const textBox = page.locator('div[contenteditable="true"]').first();
    await textBox.click();
    await textBox.fill('Test post from PM Worker automation');
    await page.waitForTimeout(1000);

    // 填写 Title
    const titleInput = page.locator('input[placeholder="Your pin title"]');
    if (await titleInput.count() > 0) {
      await titleInput.fill(pin.title || pin.name || 'Test Pin');
    }

    // 填写 Link
    const linkInput = page.locator('input[placeholder="Enter destination link..."]');
    if (await linkInput.count() > 0) {
      await linkInput.fill(pin.link || 'https://contractfixpro.com');
    }
    await snap(page, 'form-filled');
    console.log('[5] 表单已填写');

    // 滚动到底部查找提交按钮
    console.log('\n[6] 滚动查找提交按钮...');
    await page.evaluate(() => {
      // 滚动 composer 内容区
      const el = document.querySelector('[class*="composer"], [class*="Composer"], [role="dialog"]');
      if (el) el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(1000);
    await snap(page, 'scrolled-to-bottom');

    const btns3 = await page.$$eval('button', b => b.map(e => e.innerText.trim()).filter(t => t));
    console.log('滚动后按钮:', btns3);

    // 找 "Next Available" 按钮并打印其可见性
    const nextAvailBtns = await page.$$('button:has-text("Next Available")');
    console.log('"Next Available" 按钮数量:', nextAvailBtns.length);

    for (let i = 0; i < nextAvailBtns.length; i++) {
      const isVisible = await nextAvailBtns[i].isVisible();
      const bbox = await nextAvailBtns[i].boundingBox();
      console.log(`  [${i}] visible=${isVisible}, bbox=`, bbox);
    }

    // 点击 Next Available
    console.log('\n[7] 点击 Next Available...');
    const nextBtn = page.locator('button:has-text("Next Available")').first();
    await nextBtn.scrollIntoViewIfNeeded();
    await nextBtn.click({ timeout: 15000 });
    await page.waitForTimeout(3000);
    await snap(page, 'after-next-available');

    const btns4 = await page.$$eval('button', b => b.map(e => e.innerText.trim()).filter(t => t));
    console.log('点击后按钮:', btns4);
    console.log('点击后 URL:', page.url());

    // 看是否有确认步骤
    const confirmBtns = page.locator('button:has-text("Schedule"), button:has-text("Confirm"), button:has-text("Post Now"), button:has-text("Add to Queue")');
    const confirmCount = await confirmBtns.count();
    console.log('确认按钮数量:', confirmCount);

    if (confirmCount > 0) {
      const confirmText = await confirmBtns.first().textContent();
      console.log('确认按钮文字:', confirmText);
      await snap(page, 'confirm-dialog');
      await confirmBtns.first().click();
      await page.waitForTimeout(2000);
    }

    await page.waitForTimeout(3000);
    await snap(page, 'final-state');

    // 检查 composer 是否关闭（成功标志）
    const composerOpen = await page.locator('button:has-text("Close Composer")').count();
    console.log('\n✅ 结果:', composerOpen === 0 ? 'Composer 已关闭（Post 成功加入队列）' : 'Composer 仍然打开（可能失败）');

    // 读队列数
    const tabText = await page.locator('[role="tab"]').filter({ hasText: /Queue/i }).first().textContent().catch(() => 'unknown');
    console.log('队列 Tab 文字:', tabText);

  } catch (e) {
    console.error('❌ 异常:', e.message);
    await snap(page, 'error').catch(() => {});
  } finally {
    console.log('\n截图保存在:', SNAP_DIR);
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

main();
