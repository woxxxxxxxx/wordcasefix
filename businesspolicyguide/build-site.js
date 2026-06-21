const fs = require('fs');
const path = require('path');

// Maintenance post-processor for the generated static site.
// The current public page set is stored as HTML files in this folder.
const root = __dirname;
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}

function patchHtml(s, file) {
  const heroMedia = `<div class="hero-media" aria-label="Small business coverage planning">
      <img src="/assets/business-owner.jpg" alt="Small business owners reviewing documents before comparing coverage" width="900" height="680" loading="eager">
      <div class="quote-card floating">`;
  const articlePhoto = `      <figure class="article-photo">
        <img src="/assets/coverage-meeting.jpg" alt="Business owners discussing insurance coverage details at a table" width="1200" height="760" loading="lazy">
        <figcaption>Use your real business details, contracts, payroll, vehicles, and property values when comparing coverage.</figcaption>
      </figure>
`;
  const visualStrip = `  <section class="section visual-strip" aria-label="Small business insurance situations">
    <figure class="visual-card">
      <img src="/assets/coverage-meeting.jpg" alt="Small business team comparing insurance paperwork" width="900" height="620" loading="lazy">
      <figcaption><strong>Compare coverage with context.</strong><span>Contracts, payroll, vehicles, and property can change what a quote should include.</span></figcaption>
    </figure>
    <figure class="visual-card">
      <img src="/assets/small-business-office.jpg" alt="Small business office workspace with desks and computers" width="900" height="620" loading="lazy">
      <figcaption><strong>Plan around real operations.</strong><span>Use your location, employees, equipment, and client work to narrow the research path.</span></figcaption>
    </figure>
  </section>
`;

  s = s.replace(/<div class="hero-panel" aria-label="Coverage checklist preview">\s*<div class="quote-card">/g, heroMedia);
  s = s.replace(/<footer class="site-footer">([\s\S]*?)<img src="\/logo\.svg" alt="BusinessPolicyGuide" width="220" height="36">/, '<footer class="site-footer">$1<img src="/logo-footer.svg" alt="BusinessPolicyGuide" width="220" height="36">');
  s = s.replace(/Updated June 2026\s*路\s*Reviewed for clarity and insurance terminology\s*路\s*Educational content/g, 'Updated June 2026 &middot; Reviewed for clarity and insurance terminology &middot; Educational content');
  s = s.replace(/<span class="check">鉁\?\/span>/g, '<span class="check">&#10003;</span>');
  if (file === path.join(root, 'index.html') && !s.includes('class="section visual-strip"')) {
    s = s.replace('  <section class="section">\n    <div class="section-head"><h2>Start with the coverage you are comparing</h2>', visualStrip + '  <section class="section">\n    <div class="section-head"><h2>Start with the coverage you are comparing</h2>');
  }
  if (s.includes('<section class="page-layout">') && !s.includes('class="article-photo"')) {
    s = s.replace(/(  <\/aside>\s*)\n      <section class="content-card">/, `$1\n${articlePhoto}      <section class="content-card">`);
  }
  return s;
}

walk(root);
let changed = 0;
for (const file of htmlFiles) {
  const before = fs.readFileSync(file, 'utf8');
  const after = patchHtml(before, file);
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed++;
  }
}

console.log(`BusinessPolicyGuide post-process complete: ${changed} files updated.`);
