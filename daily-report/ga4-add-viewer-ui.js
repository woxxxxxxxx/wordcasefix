/**
 * ga4-add-viewer-ui.js
 * Logs into Google (no proxy — direct) and adds the service account as Viewer
 * to each GA4 property via Admin UI (Property Access Management).
 */
'use strict';

const MODS = 'C:/Users/Administrator/contractfixpro/node_modules';
const { chromium: _chromium } = require(MODS + '/playwright-extra');
const StealthPlugin = require(MODS + '/puppeteer-extra-plugin-stealth');
_chromium.use(StealthPlugin());
const chromium = _chromium;

const EMAIL    = 'xiaohuixie3@gmail.com';
const PASSWORD = 'Xxh113324';
const SA_EMAIL = 'xiexiaohui@instruction-325409.iam.gserviceaccount.com';

const PROPERTIES = [
  { name: 'WordCaseFix',     id: '539531639' },
  { name: 'VestCalc',        id: '539700100' },
  { name: 'NotionTemplaFix', id: '539119398' },
  { name: 'ContractFixPro',  id: '539948742' },
];

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({
    headless: false, slowMo: 80,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const ctx  = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // ── Login ──────────────────────────────────────────────────────────────────
  log('Navigating to Google signin...');
  await page.goto('https://accounts.google.com/signin', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await sleep(3000);
  log('URL: ' + page.url());

  // Email
  await page.locator('input[name="identifier"]').fill(EMAIL);
  await sleep(500);
  await page.locator('#identifierNext').click();
  await sleep(5000);
  log('After email: ' + page.url());

  // Password — wait for the visible password input
  await page.waitForSelector('input[name="Passwd"]:visible, input[type="password"]:not([aria-hidden="true"]):visible', { timeout: 15000 });
  const pwInput = page.locator('input[name="Passwd"]:visible').or(
    page.locator('input[type="password"]:not([aria-hidden="true"]):visible')
  ).first();
  await pwInput.fill(PASSWORD);
  await sleep(500);
  await page.locator('#passwordNext').click();
  await sleep(10000);
  log('After password: ' + page.url());

  // Check we're logged in
  if (page.url().includes('accounts.google.com') && !page.url().includes('myaccount')) {
    log('Still on accounts.google.com — possible 2FA or security check');
    await page.screenshot({ path: 'ga4-login-check.png' });
    log('Screenshot saved: ga4-login-check.png — waiting 30s for manual intervention...');
    await sleep(30000);
  }

  // ── Add SA to each property ────────────────────────────────────────────────
  for (const prop of PROPERTIES) {
    log(`\n── ${prop.name} (${prop.id}) ──`);

    // Go to property access management
    const adminUrl = `https://analytics.google.com/analytics/web/#/p${prop.id}/admin/suiteusermanagement`;
    log(`  Navigating to: ${adminUrl}`);
    await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(6000);
    log(`  Current URL: ${page.url()}`);
    await page.screenshot({ path: `ga4-${prop.name}-before.png` });

    // Look for "Add users" / "+" button
    const addBtn = page.locator('[aria-label*="Add users" i], button:has-text("Add users"), button[aria-label="+"]').first();
    const addBtnCount = await addBtn.count();
    log(`  Add button found: ${addBtnCount > 0}`);

    if (addBtnCount > 0) {
      await addBtn.click();
      await sleep(3000);

      // Fill SA email
      const emailInput = page.locator('input[type="email"][placeholder*="email" i], input[aria-label*="email" i], div[contenteditable] input').first();
      await emailInput.fill(SA_EMAIL);
      await sleep(1500);
      log(`  Filled SA email`);

      // Select viewer role if picker shown
      const viewerOption = page.locator('text=Viewer').first();
      if (await viewerOption.count() > 0) {
        log(`  Found Viewer option — clicking`);
        await viewerOption.click();
        await sleep(1000);
      }

      // Confirm
      const confirmBtn = page.locator('button:has-text("Add"), button:has-text("Save")').first();
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
        await sleep(3000);
        log(`  ✓ Clicked Add/Save`);
      } else {
        log(`  No confirm button found`);
        await page.screenshot({ path: `ga4-${prop.name}-noconfirm.png` });
      }
    } else {
      log(`  ✗ Add button not found`);
      await page.screenshot({ path: `ga4-${prop.name}-noadd.png` });
    }
    await sleep(2000);
  }

  log('\nAll done. Closing browser in 5s...');
  await sleep(5000);
  await browser.close();
  log('Done.');
})();
