const fs = require('fs');
const path = require('path');
const autoE = ['\u{1F697}','\u{1F699}','\u{1F3CE}️','\u{1F698}'];
const healthE = ['\u{1F3E5}','\u{1F48A}','\u{1FA7A}','⚕️'];
const homeE = ['\u{1F3E0}','\u{1F3E1}','\u{1F3D8}️','\u{1F511}'];
const lifeE = ['\u{1F4B0}','\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}','\u{1F4CA}','\u{1F6E1}️'];
const businessE = ['\u{1F3E2}','\u{1F4BC}','\u{1F4CB}','\u{1F512}'];
function getE(cat, idx) {
  const m = {auto:autoE,health:healthE,home:homeE,life:lifeE,business:businessE};
  return (m[cat]||autoE)[idx % (m[cat]||autoE).length];
}
const fp = 'C:/Users/Administrator/coveragefixpro/index.html';
let c = fs.readFileSync(fp, 'utf8');
let ctrs = {auto:0,health:0,home:0,life:0,business:0};
// Check if tool cards already have emoji spans (not just CSS)
const hasEmojiInCards = /<a[^>]*class="tool-card"[^>]*>\s*<span class="tool-card-icon"/.test(c);
if (hasEmojiInCards) { console.log('Already done'); process.exit(0); }
c = c.replace(/<a\s+href="([^"]*?)"\s+class="tool-card"><h3>/g, (m, href) => {
  let cat = 'auto';
  for (const cc of ['auto','health','home','life','business']) {
    if (href.includes('/tools/' + cc + '/')) { cat = cc; break; }
  }
  const e = getE(cat, ctrs[cat]++);
  return m.replace('<h3>', '<span class="tool-card-icon">' + e + '</span><h3>');
});
fs.writeFileSync(fp, c, 'utf8');
console.log('Added emojis to index.html, counts:', ctrs);
