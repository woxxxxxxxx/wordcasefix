const fs = require('fs');
const path = require('path');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

// Remove: <div class="seo-content">...</div>
// Remove: <section class="faq-section">...</section>
// Both appear AFTER the new tool-content-modules section

let removedSeo = 0, removedFaq = 0, changed = 0;

for (const fname of files) {
  const original = fs.readFileSync(fname, 'utf8');
  let txt = original;

  // Remove seo-content div (greedy within block)
  const beforeSeo = (txt.match(/<div class="seo-content">/g) || []).length;
  txt = txt.replace(/<div class="seo-content">[\s\S]*?<\/div>\s*/g, '');
  const removedS = beforeSeo;

  // Remove faq-section (old style)
  const beforeFaq = (txt.match(/<section class="faq-section">/g) || []).length;
  txt = txt.replace(/<section class="faq-section">[\s\S]*?<\/section>\s*/g, '');
  const removedF = beforeFaq;

  if (txt !== original) {
    fs.writeFileSync(fname, txt, 'utf8');
    removedSeo += removedS;
    removedFaq += removedF;
    changed++;
    if (changed <= 10 || removedS !== 1 || removedF !== 1)
      console.log(`  CLEANED: ${fname} (seo=${removedS}, faq=${removedF})`);
  }
}

console.log(`\nSummary:`);
console.log(`  Files changed:       ${changed}`);
console.log(`  seo-content removed: ${removedSeo}`);
console.log(`  faq-section removed: ${removedFaq}`);
