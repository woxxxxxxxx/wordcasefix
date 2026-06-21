const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir)) {
    if (['node_modules', '.git'].includes(item)) continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (item.endsWith('.html')) html.push(full);
  }
}
walk(root);

const issues = [];
for (const file of html) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const s = fs.readFileSync(file, 'utf8');
  const text = s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!/<title>[^<]{20,70}/.test(s)) issues.push([rel, 'title missing/weak']);
  const desc = s.match(/<meta name="description" content="([^"]+)"/);
  if (!desc || desc[1].length < 120 || desc[1].length > 170) issues.push([rel, `meta description length ${desc ? desc[1].length : 0}`]);
  if (!/rel="canonical"/.test(s)) issues.push([rel, 'missing canonical']);
  if (!/application\/ld\+json/.test(s)) issues.push([rel, 'missing schema']);
  if (!/educational information only|not an insurance company|not legal/i.test(s)) issues.push([rel, 'missing disclaimer wording']);
  const legalLike = /^(about|contact|privacy-policy|terms|advertiser-disclosure|editorial-policy)\.html$/.test(rel);
  const minWords = legalLike ? 450 : 500;
  if (words < minWords) issues.push([rel, `thin visible text ${words}`]);
  for (const href of [...s.matchAll(/href="([^"]+)"/g)].map(m => m[1])) {
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue;
    const clean = href.split('#')[0].split('?')[0];
    if (!clean || clean === '/') continue;
    const local = path.join(root, clean.replace(/^\//, ''));
    if (!fs.existsSync(local)) issues.push([rel, `broken link ${href}`]);
  }
}

console.log(JSON.stringify({ htmlFiles: html.length, issues }, null, 2));
process.exit(issues.length ? 1 : 0);
