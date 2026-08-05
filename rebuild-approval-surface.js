const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const APPLY = process.argv.includes('--apply');
const TODAY = '2026-08-06';
const SITE = 'https://wordcasefix.com';
const TRUST_FILES = ['404.html', 'contact.html', 'terms.html', 'privacy-policy.html'];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function write(rel, content) {
  const target = path.resolve(ROOT, rel);
  if (!target.startsWith(path.resolve(ROOT) + path.sep)) {
    throw new Error(`Refusing to write outside repository: ${target}`);
  }
  const normalized = content.replace(/[ \t]+$/gm, '').replace(/\r?\n/g, '\r\n');
  fs.writeFileSync(target, normalized, 'utf8');
}

function sitemapFiles() {
  const xml = read('sitemap.xml');
  return [...xml.matchAll(/<loc>https:\/\/wordcasefix\.com\/([^<]*)<\/loc>/g)].map((match) => {
    const urlPath = match[1];
    if (!urlPath) return 'index.html';
    return urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath;
  });
}

function trackedHtml() {
  return execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((rel) => fs.existsSync(path.join(ROOT, rel)));
}

function escapeHtml(value) {
  return value.replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
}

function pageMeta(rel) {
  const html = read(rel);
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]
    ?.replace(/\s*[|\-–]\s*WordCaseFix.*$/i, '')
    .replace(/<[^>]+>/g, '')
    .trim() || path.basename(rel, '.html').replace(/-/g, ' ');
  const description = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1]
    || `Practical WordCaseFix guide to ${title.toLowerCase()}.`;
  return { title, description };
}

const tools = [
  ['case-converter.html', 'Writing', 'Convert capitalization while preserving punctuation and line breaks.'],
  ['word-counter.html', 'Writing', 'Measure words, characters, sentences, paragraphs, and reading time.'],
  ['text-cleaner.html', 'Writing', 'Normalize spacing, line breaks, and common pasted-text artifacts.'],
  ['text-diff.html', 'Writing', 'Compare two text versions and inspect line-level changes.'],
  ['base64-encoder.html', 'Encoding', 'Encode UTF-8 text to Base64 or decode Base64 back to text.'],
  ['url-encoder.html', 'Encoding', 'Apply component-safe percent encoding and decode encoded values.'],
  ['json-formatter.html', 'Developer', 'Parse, validate, format, and minify JSON in the browser.'],
  ['jwt-decoder.html', 'Developer', 'Inspect JWT headers and payloads without claiming signature verification.'],
  ['regex-tester.html', 'Developer', 'Test JavaScript regular expressions against sample text.'],
  ['hash-generator.html', 'Security', 'Generate browser-side cryptographic digests for text and files.'],
  ['password-generator.html', 'Security', 'Generate random passwords with explicit character-set controls.'],
  ['password-strength-checker.html', 'Security', 'Review password structure with clearly stated heuristic limits.'],
  ['qr-code-generator.html', 'Utility', 'Create downloadable QR codes from text or URLs.'],
  ['uuid-generator.html', 'Utility', 'Generate RFC-compatible version 4 UUIDs using browser randomness.']
];

function head({ title, description, canonical, type = 'website' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZRF2KKPS30"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-ZRF2KKPS30');</script>
  <style>
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6f7fb;color:#172033;font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.6}a{color:inherit}.skip{position:absolute;left:16px;top:-80px;background:#172033;color:#fff;padding:10px 14px;z-index:20}.skip:focus{top:12px}.nav{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #dfe3ec}.nav-inner{max-width:1160px;margin:auto;min-height:68px;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand img{display:block;width:210px;max-width:48vw;height:auto}.links{display:flex;align-items:center;gap:20px;flex-wrap:wrap}.links a{text-decoration:none;font-weight:650;color:#38445d}.links a:hover,.links a:focus{color:#5151c8}.wrap{max-width:1160px;margin:auto;padding:38px 24px 64px}.intro{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);gap:34px;align-items:start;padding-bottom:34px;border-bottom:1px solid #dfe3ec}.eyebrow{color:#5151c8;font-size:13px;font-weight:750;text-transform:uppercase}.intro h1{font-size:clamp(32px,5vw,54px);line-height:1.08;margin:10px 0 16px;letter-spacing:0}.intro p{font-size:18px;color:#536078;max-width:720px}.proof{background:#fff;border:1px solid #dfe3ec;border-radius:8px;padding:22px}.proof strong{display:block;font-size:15px;margin-bottom:10px}.proof ul{margin:0;padding-left:20px;color:#536078}.section{padding-top:42px}.section-head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:18px}.section h2{font-size:28px;line-height:1.2;margin:0}.section-head p{max-width:620px;margin:0;color:#68758b}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.card{background:#fff;border:1px solid #dfe3ec;border-radius:8px;padding:20px;text-decoration:none;display:flex;flex-direction:column;min-height:180px}.card:hover,.card:focus{border-color:#7777dc;box-shadow:0 6px 18px rgba(44,52,77,.08)}.tag{color:#5151c8;font-size:12px;font-weight:750;text-transform:uppercase}.card h3{font-size:19px;line-height:1.3;margin:10px 0 8px}.card p{color:#68758b;margin:0 0 18px}.open{margin-top:auto;font-weight:700;color:#5151c8}.guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.guide{background:#fff;border:1px solid #dfe3ec;border-radius:8px;padding:18px;text-decoration:none}.guide:hover,.guide:focus{border-color:#7777dc}.guide h3{font-size:17px;line-height:1.35;margin:0 0 8px}.guide p{font-size:14px;color:#68758b;margin:0}.standards{background:#172033;color:#fff;padding:34px;border-radius:8px;display:grid;grid-template-columns:1fr 1fr;gap:28px}.standards p{color:#cbd3e2}.standards a{color:#bdbdff}.footer{background:#fff;border-top:1px solid #dfe3ec}.footer-inner{max-width:1160px;margin:auto;padding:28px 24px;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;color:#68758b}.footer a{color:#38445d;margin-left:18px}@media(max-width:840px){.intro,.standards{grid-template-columns:1fr}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.nav-inner{align-items:flex-start;flex-direction:column}.links{gap:12px}.wrap{padding:28px 16px 48px}.grid,.guide-grid{grid-template-columns:1fr}.card{min-height:0}.section-head{align-items:start;flex-direction:column}.footer a{margin:0 14px 0 0}}
  </style>
</head>`;
}

function nav(active) {
  return `<a class="skip" href="#main-content">Skip to content</a>
<header class="nav"><div class="nav-inner"><a class="brand" href="/"><img src="/logo.svg?v=20260806" alt="WordCaseFix"></a><nav class="links" aria-label="Primary"><a${active === 'tools' ? ' aria-current="page"' : ''} href="/">Tools</a><a href="/text-tools.html">Text workflow</a><a${active === 'guides' ? ' aria-current="page"' : ''} href="/blog/">Guides</a><a href="/editorial-policy.html">Standards</a></nav></div></header>`;
}

function footer() {
  return `<footer class="footer"><div class="footer-inner"><span>© 2026 WordCaseFix. Browser-based text and developer utilities.</span><span><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy-policy.html">Privacy</a><a href="/terms.html">Terms</a></span></div></footer>`;
}

function buildHome() {
  const guideFiles = sitemapFiles().filter((rel) => rel.startsWith('blog/') && rel !== 'blog/index.html');
  const toolCards = tools.map(([file, category, description]) => {
    const title = pageMeta(file).title;
    return `<a class="card" href="/${file}"><span class="tag">${category}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p><span class="open">Open tool →</span></a>`;
  }).join('\n');
  const guideCards = guideFiles.slice(0, 8).map((rel) => {
    const meta = pageMeta(rel);
    return `<a class="guide" href="/${rel}"><h3>${escapeHtml(meta.title)}</h3><p>${escapeHtml(meta.description)}</p></a>`;
  }).join('\n');
  const description = 'Fourteen maintained browser tools for text conversion, encoding, structured data, passwords, QR codes, and developer workflows, with tested methods and practical guides.';
  return `${head({ title: 'WordCaseFix: Maintained Text and Developer Tools', description, canonical: `${SITE}/` })}
<body>${nav('tools')}
<main class="wrap" id="main-content">
  <section class="intro"><div><span class="eyebrow">WordCaseFix</span><h1>Text and developer utilities with documented limits</h1><p>Use focused browser tools for capitalization, counting, encoding, JSON, regular expressions, identifiers, passwords, and QR codes. Each maintained page explains its method, gives examples, and states where the result needs human review.</p></div><aside class="proof"><strong>Current maintained corpus</strong><ul><li>14 interactive utilities</li><li>${guideFiles.length} practical guides</li><li>Inputs processed locally where stated</li><li>Corrections tracked under editorial standards</li></ul></aside></section>
  <section class="section"><div class="section-head"><div><span class="eyebrow">Interactive tools</span><h2>Choose a specific workflow</h2></div><p>The collection is intentionally limited. Similar or untested templates are not kept in the public inventory.</p></div><div class="grid">${toolCards}</div></section>
  <section class="section"><div class="section-head"><div><span class="eyebrow">Research library</span><h2>Rules, examples, and implementation notes</h2></div><p>Guides answer adjacent questions that a converter alone cannot resolve.</p></div><div class="guide-grid">${guideCards}</div><p><a href="/blog/">Browse all ${guideFiles.length} maintained guides →</a></p></section>
  <section class="section"><div class="standards"><div><span class="eyebrow">Quality controls</span><h2>How pages earn a place here</h2><p>Indexable tools must have a working interaction, a reproducible method, concrete examples, important limitations, and a clear privacy statement. Pages that do not meet that bar are removed rather than left as public filler.</p></div><div><h2>Verify important output</h2><p>Formatting and encoding tools can still produce the wrong result for a specific style guide, locale, protocol, or security context. Check the cited standard and test with representative input before using output in production.</p><a href="/editorial-policy.html">Read the editorial and testing policy →</a></div></div></section>
</main>${footer()}</body></html>`;
}

function buildTextHub() {
  const selected = tools.filter(([file]) => ['case-converter.html', 'word-counter.html', 'text-cleaner.html', 'text-diff.html'].includes(file));
  const cards = selected.map(([file, category, description]) => `<a class="card" href="/${file}"><span class="tag">${category}</span><h3>${escapeHtml(pageMeta(file).title)}</h3><p>${escapeHtml(description)}</p><span class="open">Open tool →</span></a>`).join('\n');
  const description = 'A focused text workflow for changing capitalization, measuring text, cleaning pasted content, and comparing revisions.';
  return `${head({ title: 'Text Workflow Tools | WordCaseFix', description, canonical: `${SITE}/text-tools.html` })}
<body>${nav('tools')}<main class="wrap" id="main-content"><section class="intro"><div><span class="eyebrow">Text workflow</span><h1>Convert, measure, clean, and compare text</h1><p>These four tools cover a complete editing pass without pretending to make editorial decisions for you. Start with cleanup, apply the required case, check length, then compare the revision with the source.</p></div><aside class="proof"><strong>Suggested order</strong><ul><li>Remove accidental spacing and line breaks</li><li>Apply capitalization rules</li><li>Check words and reading time</li><li>Review every changed line</li></ul></aside></section><section class="section"><div class="grid">${cards}</div></section><section class="section"><div class="standards"><div><h2>What remains a human decision</h2><p>Proper nouns, acronyms, legal names, brand spelling, title-case style, and intentional whitespace cannot be inferred reliably from plain text alone.</p></div><div><h2>Privacy boundary</h2><p>These transformations run in the browser. Do not paste secrets or regulated personal data into any web utility unless your organization has approved that workflow.</p></div></div></section></main>${footer()}</body></html>`;
}

function buildBlogIndex() {
  const guideFiles = sitemapFiles().filter((rel) => rel.startsWith('blog/') && rel !== 'blog/index.html');
  const cards = guideFiles.map((rel) => {
    const meta = pageMeta(rel);
    return `<a class="guide" href="/${rel}"><h3>${escapeHtml(meta.title)}</h3><p>${escapeHtml(meta.description)}</p></a>`;
  }).join('\n');
  const description = 'Maintained WordCaseFix guides to capitalization, naming conventions, encoding, JSON, QR codes, identifiers, and practical developer writing.';
  return `${head({ title: 'Writing and Developer Guides | WordCaseFix', description, canonical: `${SITE}/blog/`, type: 'blog' })}
<body>${nav('guides')}<main class="wrap" id="main-content"><section class="intro"><div><span class="eyebrow">WordCaseFix guides</span><h1>Rules and examples beyond the tool output</h1><p>Use these guides when a conversion is technically valid but the correct editorial, naming, security, or implementation choice still depends on context.</p><p class="editorial-review-note">Content owner: <span class="author">WordCaseFix Editorial</span> · Page structure last modified: August 6, 2026</p></div><aside class="proof"><strong>Review standard</strong><ul><li>Direct answer before background</li><li>Examples tied to a real workflow</li><li>Primary references where applicable</li><li>Modified dates updated after material review</li></ul></aside></section><section class="section"><div class="guide-grid">${cards}</div></section></main>${footer()}</body></html>`;
}

function removeAdPlaceholders(html) {
  return html
    .replace(/^.*<[^>]+class=["'][^"']*(?:ad-slot|ad-box|ad-placeholder)[^"']*["'][^>]*>.*Advertisement.*$/gim, '')
    .replace(/<div\b[^>]*class=["'][^"']*(?:ad-slot|ad-box|ad-placeholder)[^"']*["'][^>]*>\s*<span\b[^>]*>\s*Advertisement\s*<\/span>\s*<\/div>/gi, '');
}

function cleanRetainedHtml(rel, html, keepUrls) {
  let result = removeAdPlaceholders(html);
  result = result
    .replace(/src=["']\/logo\.svg(?:\?[^"']*)?["']/gi, 'src="/logo.svg?v=20260806"')
    .replace(/href=["']\/developer-tools\.html["']/gi, 'href="/"')
    .replace(/href=["']\/utility-tools\.html["']/gi, 'href="/"')
    .replace(/href=["']\/calculator-tools\.html["']/gi, 'href="/"');
  result = result.replace(/<a\b([^>]*?)href=["'](\/[^"'#?]+\.html)["']([^>]*)>([\s\S]*?)<\/a>/gi, (all, before, href, after, inner) => {
    const relTarget = href.slice(1).replace(/\\/g, '/');
    return keepUrls.has(relTarget) ? all : '';
  });
  if (rel.startsWith('blog/') && rel !== 'blog/index.html' && !result.includes('editorial-review-note')) {
    const note = '<p class="editorial-review-note" style="margin:10px 0 22px;color:#667085;font-size:14px">Content owner: <span class="author">WordCaseFix Editorial</span> · Page structure last modified: August 6, 2026 · <a href="/editorial-policy.html">Review standards</a></p>';
    result = result.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i, `$1${note}`);
  }
  return result;
}

function updateSitemap(xml, changedFiles) {
  return xml.replace(/<url>([\s\S]*?)<\/url>/g, (block) => {
    const match = block.match(/<loc>https:\/\/wordcasefix\.com\/([^<]*)<\/loc>/);
    if (!match) return block;
    const urlPath = match[1];
    const rel = !urlPath ? 'index.html' : (urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath);
    if (!changedFiles.has(rel)) return block;
    return block.replace(/<lastmod>[^<]+<\/lastmod>/, `<lastmod>${TODAY}</lastmod>`);
  });
}

function main() {
  const sitemap = sitemapFiles();
  const keep = new Set([...sitemap, ...TRUST_FILES]);
  const tracked = trackedHtml();
  const remove = tracked.filter((rel) => !keep.has(rel));
  const missing = [...keep].filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length) throw new Error(`Missing retained files: ${missing.join(', ')}`);

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Tracked HTML: ${tracked.length}`);
  console.log(`Retained HTML: ${keep.size}`);
  console.log(`Removed HTML: ${remove.length}`);
  console.log(remove.join('\n'));
  if (!APPLY) return;

  const changed = new Set(['index.html', 'text-tools.html', 'blog/index.html']);
  write('index.html', buildHome());
  write('text-tools.html', buildTextHub());
  write('blog/index.html', buildBlogIndex());

  for (const rel of keep) {
    if (changed.has(rel)) continue;
    const before = read(rel);
    const after = cleanRetainedHtml(rel, before, keep);
    if (after !== before) {
      write(rel, after);
      changed.add(rel);
    }
  }

  for (const rel of remove) {
    const target = path.resolve(ROOT, rel);
    if (!target.startsWith(path.resolve(ROOT) + path.sep)) {
      throw new Error(`Refusing to delete outside repository: ${target}`);
    }
    fs.unlinkSync(target);
  }

  write('sitemap.xml', updateSitemap(read('sitemap.xml'), changed));
  console.log(`Changed retained pages: ${changed.size}`);
  console.log('Approval surface rebuilt successfully.');
}

main();
