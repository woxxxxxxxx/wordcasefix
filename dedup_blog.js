const fs = require('fs');
const fp = 'C:/Users/Administrator/wordcasefix/blog/index.html';
let html = fs.readFileSync(fp, 'utf8');

// Extract the card-grid content
const gridStart = html.indexOf('<div class="card-grid">');
const gridEnd = html.indexOf('</div>\n</div>', gridStart);

const beforeGrid = html.slice(0, gridStart + '<div class="card-grid">'.length);
const gridContent = html.slice(gridStart + '<div class="card-grid">'.length, gridEnd);
const afterGrid = html.slice(gridEnd);

// Parse individual cards
const cardRegex = /\s*<div class="card">[\s\S]*?<\/div>\s*/g;
const seen = new Set();
let uniqueCards = [];
let match;

while ((match = cardRegex.exec(gridContent)) !== null) {
  const card = match[0];
  // Extract the href as the unique key
  const hrefMatch = card.match(/href="([^"]+)"/);
  if (hrefMatch) {
    const href = hrefMatch[1];
    if (!seen.has(href)) {
      seen.add(href);
      uniqueCards.push(card.trim());
    }
  }
}

console.log('Unique cards: ' + uniqueCards.length);
const newGrid = '\n\n    ' + uniqueCards.join('\n\n    ') + '\n\n  ';
const newHtml = beforeGrid + newGrid + afterGrid;
fs.writeFileSync(fp, newHtml, 'utf8');
console.log('Done. Deduped blog/index.html');
