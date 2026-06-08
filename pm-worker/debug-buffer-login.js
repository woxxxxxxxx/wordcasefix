'use strict';
/**
 * debug-buffer-login.js
 * 每步截图 + 打印页面结构，定位登录失败原因
 */
const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

const DEBUG_DIR = 'C:\\Users\\Administrator\\pm-worker\\logs\\debug-buffer';
fs.mkdirSync(DEBUG_DIR, { recursive: true });

async function snap(page, name) {
  const p = path.join(DEBUG_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`📸 截图: ${p}`);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // ── Step 1: 导航到登录页 ────────────────────────────────────────────────
    console.log('\n[1] 导航到 https://login.buffer.com/login');
    await page.goto('https://login.buffer.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await snap(page, '01-login-page');
    console.log('    URL:', page.url());
    console.log('    Title:', await page.title());

    // 打印所有 input 字段
    const inputs = await page.$$eval('input', els => els.map(e => ({
      name: e.name, type: e.type, placeholder: e.placeholder, id: e.id, 'data-testid': e.dataset?.testid
    })));
    console.log('    Inputs:', JSON.stringify(inputs, null, 2));

    // 打印所有 button
    const buttons = await page.$$eval('button', els => els.map(e => ({
      text: e.innerText.trim().slice(0, 50), type: e.type, id: e.id
    })));
    console.log('    Buttons:', JSON.stringify(buttons, null, 2));

    // ── Step 2: 同时填邮箱+密码（单页表单）──────────────────────────────────
    console.log('\n[2] 同时填写邮箱 + 密码（单页表单）...');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.fill('input[name="email"]', 'xiaohuixie3@gmail.com');
    await page.fill('input[name="password"]', 'Xxh113324');
    await snap(page, '02-both-filled');
    console.log('    邮箱和密码已填入');

    // ── Step 3: 点击 Log In ─────────────────────────────────────────────────
    console.log('\n[3] 点击 Log In...');
    await page.locator('#login-form-submit, button[type="submit"]').first().click();
    await page.waitForTimeout(4000);
    await snap(page, '03-after-submit');
    console.log('    URL:', page.url());
    console.log('    Title:', await page.title());

    // 检查页面错误文字
    const errText = await page.locator('[class*="error"], [class*="Error"], [role="alert"]').first().textContent().catch(() => '');
    if (errText) console.log('    ❌ 错误提示:', errText.trim());

    // ── Step 4: 等待跳转结果 ────────────────────────────────────────────────
    console.log('\n[4] 最终状态...');
    await page.waitForTimeout(3000);
    await snap(page, '04-final');
    console.log('    最终URL:', page.url());
    const finalOk = page.url().includes('publish') || page.url().includes('app.buffer');
    console.log('    登录成功:', finalOk ? '✅ 是' : '❌ 否');

  } catch (e) {
    await snap(page, 'error-state').catch(() => {});
    console.error('❌ 异常:', e.message);
  } finally {
    console.log('\n截图已保存到:', DEBUG_DIR);
    console.log('浏览器将在5秒后关闭...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

main();
