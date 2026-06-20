const fs = require('fs');
const path = require('path');

const autoEmojis = ['\u{1F697}','\u{1F699}','\u{1F3CE}️','\u{1F698}'];
const healthEmojis = ['\u{1F3E5}','\u{1F48A}','\u{1FA7A}','⚕️'];
const homeEmojis = ['\u{1F3E0}','\u{1F3E1}','\u{1F3D8}️','\u{1F511}'];
const lifeEmojis = ['\u{1F4B0}','\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}','\u{1F4CA}','\u{1F6E1}️'];
const businessEmojis = ['\u{1F3E2}','\u{1F4BC}','\u{1F4CB}','\u{1F512}'];

function getEmoji(cat, idx) {
  const m = {auto:autoEmojis,health:healthEmojis,home:homeEmojis,life:lifeEmojis,business:businessEmojis};
  const a = m[cat] || autoEmojis;
  return a[idx % a.length];
}

function detectCat(href, fp) {
  const n = (href + '|' + fp).replace(/\\/g, '/');
  for (const c of ['auto','health','home','life','business']) {
    if (n.includes('/tools/' + c + '/') || n.includes('/' + c + '/')) return c;
  }
  for (const c of ['auto','health','home','life','business']) {
    if (n.includes(c)) return c;
  }
  return 'auto';
}

function addEmojis(fp) {
  let c = fs.readFileSync(fp, 'utf8');
  if (c.includes('tool-card-icon')) return;
  let ctrs = {auto:0,health:0,home:0,life:0,business:0};
  c = c.replace(/<a\s+href="([^"]*?)"\s+class="tool-card">\s*<h3>/g, (m, href) => {
    const cat = detectCat(href, fp);
    const e = getEmoji(cat, ctrs[cat]++);
    return m.replace('<h3>', '<span class="tool-card-icon">' + e + '</span><h3>');
  });
  fs.writeFileSync(fp, c, 'utf8');
  console.log('Emojis: ' + fp);
}

function fixUrls(fp) {
  let c = fs.readFileSync(fp, 'utf8');
  const o = c;
  c = c.replace(/https:\/\/coveragefixpro\.comC:[\/\\][Uu]sers[\/\\][^"<\s]*?[\/\\]coveragefixpro[\/\\]/g, 'https://coveragefixpro.com/');
  c = c.replace(/"C:[\/\\][Uu]sers[\/\\][^"]*?[\/\\]coveragefixpro[\/\\]/g, '"https://coveragefixpro.com/');
  if (c !== o) { fs.writeFileSync(fp, c, 'utf8'); console.log('URLs: ' + fp); }
}

const base = 'C:/Users/Administrator/coveragefixpro';
addEmojis(path.join(base, 'index.html'));
['auto','health','home','life','business'].forEach(cat => {
  const f = path.join(base, 'tools', cat, 'index.html');
  if (fs.existsSync(f)) addEmojis(f);
});

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.html') || f.endsWith('.xml')) fixUrls(full);
  }
}
walk(base);
console.log('Done!');
