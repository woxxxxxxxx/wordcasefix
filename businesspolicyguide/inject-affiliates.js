#!/usr/bin/env node
/**
 * inject-affiliates.js
 *
 * Scans all HTML files for affiliate CTA placeholders inserted by the
 * pre-placement step and rewrites their href + visible text using the
 * current values in affiliate-config.js.
 *
 * Slot mapping (default rotation):
 *   data-affiliate-slot="primary"   -> hiscox
 *   data-affiliate-slot="secondary" -> coverwallet
 *
 * Usage:
 *   node inject-affiliates.js            # write changes
 *   node inject-affiliates.js --dry-run  # preview only
 *
 * Safe to re-run: it always rewrites both href and text based on config,
 * so updating affiliate-config.js + re-running is the supported workflow.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DRY_RUN = process.argv.includes('--dry-run');
const config = require('./affiliate-config.js');

// Slot -> affiliate key. Tweak here to rotate carriers per slot.
const SLOT_MAP = {
  primary: 'hiscox',
  secondary: 'coverwallet'
};

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'assets']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function rewriteSlot(html, slot, entry) {
  // Match: <a ... data-affiliate-slot="SLOT" ...>TEXT</a>
  // Only the href and inner text are rewritten; other attributes are preserved.
  const slotRe = new RegExp(
    '(<a\\b[^>]*\\bdata-affiliate-slot=["\']' + slot + '["\'][^>]*>)([\\s\\S]*?)(</a>)',
    'gi'
  );
  let replaced = 0;
  const out = html.replace(slotRe, (match, openTag, _inner, closeTag) => {
    // Rewrite href="..." inside openTag
    const newOpen = openTag.replace(
      /\shref=(["'])[^"']*\1/i,
      ' href="' + escapeHtml(entry.url) + '"'
    );
    replaced++;
    return newOpen + escapeHtml(entry.cta) + closeTag;
  });
  return { html: out, replaced };
}

function run() {
  const files = walk(ROOT);
  let filesUpdated = 0;
  let totalReplacements = 0;
  const pendingSlots = [];

  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    const original = html;
    let fileReplaced = 0;

    for (const [slot, key] of Object.entries(SLOT_MAP)) {
      const entry = config[key];
      if (!entry) continue;
      if (typeof entry.url === 'string' && entry.url.startsWith('PENDING_')) {
        pendingSlots.push({ file, slot, key });
      }
      const result = rewriteSlot(html, slot, entry);
      html = result.html;
      fileReplaced += result.replaced;
    }

    if (fileReplaced > 0 && html !== original) {
      totalReplacements += fileReplaced;
      filesUpdated++;
      if (!DRY_RUN) fs.writeFileSync(file, html, 'utf8');
    }
  }

  console.log('--- inject-affiliates report ---');
  console.log('Mode:           ' + (DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'));
  console.log('Files scanned:  ' + files.length);
  console.log('Files updated:  ' + filesUpdated);
  console.log('CTAs rewritten: ' + totalReplacements);
  for (const [slot, key] of Object.entries(SLOT_MAP)) {
    const entry = config[key] || {};
    console.log('  slot "' + slot + '" -> ' + key + ' -> ' + entry.url);
  }
  if (pendingSlots.length > 0) {
    console.log('WARNING: ' + pendingSlots.length + ' replacements used PENDING_ placeholder URLs.');
    console.log('         Update affiliate-config.js with real URLs and re-run.');
  }
}

run();
