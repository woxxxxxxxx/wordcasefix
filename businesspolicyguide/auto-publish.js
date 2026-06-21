'use strict';
/**
 * BusinessPolicyGuide — Auto Publish
 * ---------------------------------------------------------------
 * Picks the first unused topic from TOPIC_CANDIDATES, fetches a hero
 * image from Unsplash, asks the local `claude` CLI to write an
 * SEO-optimized article JSON, builds the full HTML matching the
 * existing BusinessPolicyGuide template, updates sitemap.xml,
 * marks the topic used (BEFORE deploy — so a failed FTP run does
 * not let the same topic get re-published), then calls
 * `node deploy-ftp.js`.
 *
 * Usage
 *   node auto-publish.js
 *
 * Environment / Credentials
 *   ANTHROPIC_API_KEY — optional. Read from process.env, then .env
 *                       file in this folder, then Claude Code OAuth
 *                       token in ~/.claude/.credentials.json.
 *                       (The claude CLI usually handles auth itself,
 *                       so this is just a fallback for non-CLI use.)
 *   UNSPLASH_KEY      — hard-coded constant below.
 *
 * How to add topics
 *   Append a new object to TOPIC_CANDIDATES. Required fields:
 *     { slug, title, keyword, category }
 *   category must be one of: industries | states | compare | guides
 *   The article will be written to /<category>/<slug>.html.
 *
 * Troubleshooting
 *   - "All topics used"        → add more entries to TOPIC_CANDIDATES.
 *   - claude CLI timeout       → re-run; the topic is NOT marked used
 *                                until just before deploy.
 *   - Unsplash fails           → article still publishes using the
 *                                fallback /assets/business-owner.jpg.
 *   - FTP fails                → topic IS marked used (we update
 *                                topics-used.json first); re-run
 *                                `node deploy-ftp.js` manually to
 *                                push the already-written file.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_DIR     = __dirname;
const TOPICS_FILE  = path.join(BASE_DIR, 'topics-used.json');
const SITEMAP_FILE = path.join(BASE_DIR, 'sitemap.xml');
const IMAGES_DIR   = path.join(BASE_DIR, 'images');

const DOMAIN    = 'https://businesspolicyguide.com';
const SITE_NAME = 'BusinessPolicyGuide';
const GA_ID     = 'G-VGYQ2VWNT9';
const ADSENSE   = 'ca-pub-1638874323475457';

const UNSPLASH_KEY = '5RQkzb688Ez9nXR-vzUbkXmxFaxQbLzEQUoyy8rogt4';

function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envFile = path.join(BASE_DIR, '.env');
  if (fs.existsSync(envFile)) {
    const line = fs.readFileSync(envFile, 'utf8').split('\n')
      .find(l => l.startsWith('ANTHROPIC_API_KEY='));
    if (line) return line.split('=')[1].trim();
  }
  const creds = path.join(process.env.USERPROFILE || 'C:\\Users\\Administrator', '.claude', '.credentials.json');
  if (fs.existsSync(creds)) {
    try {
      const c = JSON.parse(fs.readFileSync(creds, 'utf8'));
      if (c.claudeAiOauth && c.claudeAiOauth.accessToken) return c.claudeAiOauth.accessToken;
    } catch (_) {}
  }
  return null;
}

// ─── Topics (30) ──────────────────────────────────────────────────────────────
// Existing /industries: cleaning, consultant, contractor, food-truck, handyman,
//   it-consultant, landscaping, photographer, real-estate-agent, restaurant
// Existing /states: california, florida, georgia, new-york, ohio, texas
// Existing /compare: bop-vs-general-liability, gl-vs-pl, gl-vs-wc
// Existing /guides: business-insurance-checklist, business-insurance-costs,
//   certificate-of-insurance, how-to-compare-business-insurance-quotes
const TOPIC_CANDIDATES = [
  // ── 10 industries ──
  { slug: 'trucking-insurance',        title: 'Trucking Insurance Guide',                category: 'industries', keyword: 'commercial trucking insurance' },
  { slug: 'gym-insurance',             title: 'Gym and Fitness Studio Insurance Guide',  category: 'industries', keyword: 'gym fitness studio insurance' },
  { slug: 'daycare-insurance',         title: 'Daycare and Childcare Insurance Guide',   category: 'industries', keyword: 'daycare childcare insurance' },
  { slug: 'salon-insurance',           title: 'Salon and Barbershop Insurance Guide',    category: 'industries', keyword: 'hair salon barbershop insurance' },
  { slug: 'ecommerce-insurance',       title: 'Ecommerce Business Insurance Guide',      category: 'industries', keyword: 'ecommerce online retail insurance' },
  { slug: 'auto-repair-shop-insurance',title: 'Auto Repair Shop Insurance Guide',        category: 'industries', keyword: 'auto repair garage insurance' },
  { slug: 'plumber-insurance',         title: 'Plumber Insurance Guide',                 category: 'industries', keyword: 'plumber plumbing contractor insurance' },
  { slug: 'electrician-insurance',     title: 'Electrician Insurance Guide',             category: 'industries', keyword: 'electrician electrical contractor insurance' },
  { slug: 'bakery-insurance',          title: 'Bakery and Coffee Shop Insurance Guide',  category: 'industries', keyword: 'bakery coffee shop insurance' },
  { slug: 'personal-trainer-insurance',title: 'Personal Trainer Insurance Guide',        category: 'industries', keyword: 'personal trainer liability insurance' },

  // ── 8 states ──
  { slug: 'pennsylvania-business-insurance', title: 'Pennsylvania Business Insurance Guide', category: 'states', keyword: 'pennsylvania small business insurance' },
  { slug: 'illinois-business-insurance',     title: 'Illinois Business Insurance Guide',     category: 'states', keyword: 'illinois small business insurance' },
  { slug: 'north-carolina-business-insurance', title: 'North Carolina Business Insurance Guide', category: 'states', keyword: 'north carolina business insurance' },
  { slug: 'michigan-business-insurance',     title: 'Michigan Business Insurance Guide',     category: 'states', keyword: 'michigan small business insurance' },
  { slug: 'arizona-business-insurance',      title: 'Arizona Business Insurance Guide',      category: 'states', keyword: 'arizona small business insurance' },
  { slug: 'washington-business-insurance',   title: 'Washington Business Insurance Guide',   category: 'states', keyword: 'washington state business insurance' },
  { slug: 'virginia-business-insurance',     title: 'Virginia Business Insurance Guide',     category: 'states', keyword: 'virginia small business insurance' },
  { slug: 'new-jersey-business-insurance',   title: 'New Jersey Business Insurance Guide',   category: 'states', keyword: 'new jersey small business insurance' },

  // ── 6 compares ──
  { slug: 'commercial-auto-vs-personal-auto-insurance', title: 'Commercial Auto vs Personal Auto Insurance', category: 'compare', keyword: 'commercial auto vs personal auto insurance' },
  { slug: 'cyber-liability-vs-tech-eo-insurance',       title: 'Cyber Liability vs Tech E&O Insurance',      category: 'compare', keyword: 'cyber liability vs tech errors omissions' },
  { slug: 'bop-vs-commercial-property-insurance',       title: 'BOP vs Standalone Commercial Property Insurance', category: 'compare', keyword: 'business owners policy vs commercial property' },
  { slug: 'workers-comp-vs-occupational-accident',      title: 'Workers Comp vs Occupational Accident Insurance', category: 'compare', keyword: 'workers compensation vs occupational accident' },
  { slug: 'umbrella-vs-excess-liability-insurance',     title: 'Umbrella vs Excess Liability Insurance',     category: 'compare', keyword: 'umbrella vs excess liability insurance' },
  { slug: 'product-liability-vs-general-liability',     title: 'Product Liability vs General Liability Insurance', category: 'compare', keyword: 'product liability vs general liability' },

  // ── 6 guides ──
  { slug: 'how-to-file-a-business-insurance-claim',     title: 'How to File a Business Insurance Claim',        category: 'guides', keyword: 'file business insurance claim process' },
  { slug: 'when-do-you-need-umbrella-coverage',         title: 'When Does a Small Business Need Umbrella Coverage?', category: 'guides', keyword: 'small business umbrella insurance need' },
  { slug: 'business-insurance-audit-guide',             title: 'Business Insurance Audit: What to Expect',      category: 'guides', keyword: 'business insurance premium audit' },
  { slug: 'how-to-add-additional-insured',              title: 'How to Add an Additional Insured to Your Policy', category: 'guides', keyword: 'additional insured endorsement how to' },
  { slug: 'business-insurance-renewal-checklist',       title: 'Business Insurance Renewal Checklist',          category: 'guides', keyword: 'business insurance renewal checklist' },
  { slug: 'hiring-first-employee-insurance-checklist',  title: 'Insurance Checklist When Hiring Your First Employee', category: 'guides', keyword: 'first employee small business insurance' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadTopicsUsed() {
  if (!fs.existsSync(TOPICS_FILE)) return { used: [] };
  return JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
}
function saveTopicsUsed(data) {
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(data, null, 2) + '\n');
}
function pickTopic(usedSlugs) {
  const available = TOPIC_CANDIDATES.filter(t => !usedSlugs.includes(t.slug));
  if (!available.length) throw new Error('All topics used! Add more to TOPIC_CANDIDATES.');
  return available[0];
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayDisplay() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}
function escAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escJson(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = https.get({
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      headers: { 'User-Agent': 'BusinessPolicyGuide-AutoPublish/1.0', ...headers },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

async function fetchUnsplashImage(topic, slug) {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const query = encodeURIComponent(topic.keyword || topic.title);
  const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=3&orientation=landscape&client_id=${UNSPLASH_KEY}`;
  console.log('  Searching Unsplash for:', topic.keyword);
  const resp = await httpsGet(url);
  if (resp.status !== 200) {
    console.warn('  Unsplash API error:', resp.status);
    return null;
  }
  const data = JSON.parse(resp.body.toString());
  if (!data.results || !data.results.length) {
    console.warn('  No Unsplash images found for query:', topic.keyword);
    return null;
  }
  const photo = data.results[0];
  const imgUrl = photo.urls.regular;
  const photographer = photo.user.name;
  const photographerUrl = photo.user.links.html;
  const imgFilename = `img-${slug}.jpg`;
  const imgPath = path.join(IMAGES_DIR, imgFilename);
  console.log('  Downloading image from Unsplash...');
  const imgResp = await httpsGet(imgUrl);
  if (imgResp.status !== 200) {
    console.warn('  Image download failed:', imgResp.status);
    return null;
  }
  fs.writeFileSync(imgPath, imgResp.body);
  console.log('  Saved:', imgFilename);
  const trackUrl = photo.links.download_location + `?client_id=${UNSPLASH_KEY}`;
  httpsGet(trackUrl).catch(() => {});
  return { filename: imgFilename, photographer, photographerUrl };
}

// ─── Article Generation ──────────────────────────────────────────────────────
async function generateArticle(topic, imageFilename, today) {
  const categoryLabel = {
    industries: 'Industry guide',
    states:     'State guide',
    compare:    'Coverage comparison',
    guides:     'Practical guide',
  }[topic.category] || 'Practical guide';

  const prompt = `You are an expert small-business insurance writer for ${SITE_NAME}.com (educational publisher; not an agency/broker/carrier). Write a comprehensive, SEO-optimized article.

Topic: "${topic.title}"
Category: ${topic.category} (${categoryLabel})
Slug: ${topic.slug}
Audience: US small business owners (plain English, actionable, never sell — always direct them to compare with licensed professionals).
Date: ${today}
Image: /images/${imageFilename}

Return ONLY valid JSON (no markdown fences, no commentary) matching this schema EXACTLY:
{
  "title": "Article title (55-70 chars incl '| BusinessPolicyGuide' is added separately, so just write the article title)",
  "metaDescription": "150-160 char meta description with primary keyword",
  "heroDeck": "1-2 sentence hero subhead (under 200 chars)",
  "excerpt": "2-sentence excerpt for category listings",
  "imageAlt": "Descriptive alt text, 8-12 words",
  "sections": [
    { "h2": "Section Heading", "html": "HTML content using <p>, <ul><li>, <ol><li>, <strong>. Min 130 words per section." }
  ],
  "coverageCards": [
    { "title": "Coverage Name", "body": "1-2 sentence note about why it matters for this topic." }
  ],
  "riskSignals": ["5-7 short bullets describing risks/triggers to discuss"],
  "faqs": [
    { "q": "Question?", "a": "1-3 sentence answer." }
  ]
}

Requirements:
- 5-7 sections; first section H2 should be "Coverage questions for this ${topic.category === 'states' ? 'state' : (topic.category === 'compare' ? 'comparison' : 'topic')}".
- 6 coverageCards (mirror the existing site style: general liability, BOP, workers comp, commercial auto, professional liability, property/tools, cyber, commercial umbrella — pick the 6 most relevant).
- 6 FAQs.
- Tone: neutral, educational, US-English, mention "consult licensed professionals" naturally at least once.
- Never invent specific carrier prices as facts; use ranges and "typically".
- Return ONLY the JSON object.`;

  console.log('  Calling claude CLI...');
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'claude',
      [
        '-p', prompt,
        '--model', 'claude-sonnet-4-6',
        '--dangerously-skip-permissions',
        '--disallowed-tools', 'Bash,Edit,Write,Read,Glob,Grep,Agent,WebSearch,WebFetch',
        '--system-prompt', 'You are a JSON content generator for a small-business insurance education website. Return ONLY valid JSON. Never use tools, never create files, never run shell commands.',
      ],
      { cwd: BASE_DIR }
    );
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    const timer = setTimeout(() => { proc.kill(); reject(new Error('claude CLI timed out after 600s')); }, 600000);
    proc.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error('claude CLI failed (code ' + code + '): ' + stderr.slice(0, 400)));
      const raw = stdout.trim();
      if (!raw) return reject(new Error('claude CLI returned empty output. stderr: ' + stderr.slice(0, 200)));
      const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      try { return resolve(JSON.parse(stripped)); }
      catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) { try { return resolve(JSON.parse(match[0])); } catch (_) {} }
        reject(new Error('Failed to parse JSON: ' + e.message + '\nOutput start: ' + raw.slice(0, 400)));
      }
    });
    proc.on('error', err => { clearTimeout(timer); reject(new Error('spawn error: ' + err.message)); });
  });
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────
function buildArticleHTML(topic, article, imageFilename, photographer, photographerUrl, today, todayFmt) {
  const canonical = `${DOMAIN}/${topic.category}/${topic.slug}.html`;
  const categoryLabel = {
    industries: 'Industry guide',
    states:     'State guide',
    compare:    'Coverage comparison',
    guides:     'Practical guide',
  }[topic.category] || 'Guide';
  const breadcrumbName = {
    industries: 'Industries',
    states:     'States',
    compare:    'Compare',
    guides:     'Guides',
  }[topic.category] || 'Guides';

  const heroImageSrc = imageFilename
    ? `/images/${imageFilename}`
    : '/assets/business-owner.jpg';

  const photoCredit = (photographer && imageFilename)
    ? `<!-- Photo by ${escAttr(photographer)} on Unsplash: ${escAttr(photographerUrl)} -->`
    : '';

  const faqJson = (article.faqs || []).map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  }));
  const graphJson = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${DOMAIN}/#organization`, name: SITE_NAME, url: DOMAIN, logo: `${DOMAIN}/logo.svg`, email: 'hello@businesspolicyguide.com' },
      { '@type': 'WebSite', '@id': `${DOMAIN}/#website`, name: SITE_NAME, url: DOMAIN, publisher: { '@id': `${DOMAIN}/#organization` } },
      {
        '@type': 'Article',
        headline: article.title,
        description: article.metaDescription,
        url: canonical,
        image: `${DOMAIN}${heroImageSrc}`,
        author: { '@type': 'Organization', name: SITE_NAME },
        publisher: { '@id': `${DOMAIN}/#organization` },
        dateModified: today,
        datePublished: today,
      },
      { '@type': 'FAQPage', mainEntity: faqJson },
    ],
  };
  const breadcrumbJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${DOMAIN}/` },
      { '@type': 'ListItem', position: 2, name: breadcrumbName, item: `${DOMAIN}/${topic.category}/` },
      { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
    ],
  };

  const sectionsHtml = (article.sections || []).map(s =>
    `      <section class="content-card"><h2>${escAttr(s.h2)}</h2>${s.html}</section>`
  ).join('\n');

  const cardsHtml = (article.coverageCards || []).map(c =>
    `<div><span class="check">✓</span><strong>${escAttr(c.title)}</strong><p>${escAttr(c.body)}</p></div>`
  ).join('');

  const risksHtml = (article.riskSignals || []).map(r => `<li>${escAttr(r)}</li>`).join('');

  const faqHtml = (article.faqs || []).map(f =>
    `<details><summary>${escAttr(f.q)}</summary><p>${f.a}</p></details>`
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escAttr(article.title)} | ${SITE_NAME}</title>
  <meta name="description" content="${escAttr(article.metaDescription)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escAttr(article.title)}">
  <meta property="og:description" content="${escAttr(article.metaDescription)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:image" content="${DOMAIN}${heroImageSrc}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>
  ${photoCredit}
  <script type="application/ld+json">${JSON.stringify(graphJson)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbJson)}</script>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/" aria-label="${SITE_NAME} home">
      <img src="/logo.svg" alt="${SITE_NAME}" width="274" height="44">
    </a>
    <button class="nav-toggle" type="button" aria-label="Toggle navigation">Menu</button>
    <nav class="site-nav" aria-label="Primary navigation">
      <a href="/business-insurance/">Coverage</a>
      <a href="/industries/">Industries</a>
      <a href="/states/">States</a>
      <a href="/tools/insurance-needs-quiz.html">Tools</a>
      <a href="/guides/">Guides</a>
      <a class="nav-cta" href="/guides/how-to-compare-business-insurance-quotes.html">Compare Quotes</a>
    </nav>
  </header>
  <main><section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">${categoryLabel}</p>
      <h1>${escAttr(article.title)}</h1>
      <p class="hero-deck">${escAttr(article.heroDeck || article.metaDescription)}</p>
      <div class="hero-actions">
        <a class="btn primary" href="/tools/insurance-needs-quiz.html">Start Coverage Checklist</a>
        <a class="btn secondary" href="/states/">Find Your State Guide</a>
      </div>
      <p class="disclosure-inline">We do not sell policies directly. We help you understand coverage questions before speaking with licensed insurance professionals.</p>
    </div>
    <div class="hero-media" aria-label="Small business coverage planning">
      <img src="${heroImageSrc}" alt="${escAttr(article.imageAlt || article.title)}" width="900" height="680" loading="eager">
      <div class="quote-card floating">
        <span class="status-dot"></span>
        <strong>Quote prep checklist</strong>
        <p>Business type, ZIP code, payroll, revenue, employees, vehicles, contracts, equipment, and coverage needs.</p>
      </div>
      <div class="metric-row"><span>Common policies</span><strong>6</strong></div>
      <div class="metric-row"><span>State rules</span><strong>Vary</strong></div>
      <div class="metric-row"><span>Best next step</span><strong>Compare</strong></div>
    </div>
  </section>
  <!-- AFFILIATE_CTA_TOP -->
  <section class="page-layout">
    <article class="article">
      <div class="article-meta">Updated ${todayFmt} · Reviewed for clarity and insurance terminology · Educational content</div>
      <aside class="notice">
        <strong>Important:</strong> ${SITE_NAME} provides educational information only. We are not an insurance company, agency, broker, law firm, or financial advisor. Coverage availability, requirements, exclusions, and pricing vary. Review policy documents and consult licensed professionals before making decisions.
      </aside>
      <figure class="article-photo">
        <img src="${heroImageSrc}" alt="${escAttr(article.imageAlt || article.title)}" width="1200" height="760" loading="lazy">
        <figcaption>Use your real business details, contracts, payroll, vehicles, and property values when comparing coverage.</figcaption>
      </figure>
      <!-- AD_PLACEHOLDER -->
${sectionsHtml}
      <section class="content-card"><h2>Common policies to research</h2><div class="feature-grid">${cardsHtml}</div></section>
      <section class="content-card"><h2>Risk signals to discuss</h2><ul class="clean-list">${risksHtml}</ul></section>
      <!-- AD_PLACEHOLDER -->
      <section class="content-card faq-section"><h2>Frequently asked questions</h2>${faqHtml}</section>
      <!-- AFFILIATE_CTA_BOTTOM -->
    </article>
    <aside class="sidebar">
      <div class="side-card">
        <h2>Coverage checklist</h2>
        <p>Answer a few planning questions and build a list of policies to research.</p>
        <a class="btn primary full" href="/tools/insurance-needs-quiz.html">Open checklist</a>
      </div>
      <div class="side-card">
        <h2>Popular guides</h2>
        <a href="/business-insurance/general-liability-insurance.html">General liability</a>
        <a href="/business-insurance/business-owners-policy.html">Business owner's policy</a>
        <a href="/guides/certificate-of-insurance.html">Certificate of insurance</a>
        <a href="/compare/general-liability-vs-professional-liability.html">GL vs professional liability</a>
      </div>
    </aside>
  </section></main>
  <footer class="site-footer">
    <div class="footer-grid">
      <div>
        <img src="/logo-footer.svg" alt="${SITE_NAME}" width="220" height="36">
        <p>${SITE_NAME} publishes educational guides for U.S. small business owners. We are not an insurance carrier, agency, broker, law firm, or financial advisor.</p>
      </div>
      <div>
        <h2>Coverage</h2>
        <a href="/business-insurance/general-liability-insurance.html">General Liability</a>
        <a href="/business-insurance/business-owners-policy.html">BOP</a>
        <a href="/business-insurance/workers-compensation-insurance.html">Workers Comp</a>
        <a href="/business-insurance/professional-liability-insurance.html">Professional Liability</a>
      </div>
      <div>
        <h2>Company</h2>
        <a href="/about.html">About</a>
        <a href="/editorial-policy.html">Editorial Policy</a>
        <a href="/advertiser-disclosure.html">Advertiser Disclosure</a>
        <a href="/contact.html">Contact</a>
      </div>
      <div>
        <h2>Legal</h2>
        <a href="/privacy-policy.html">Privacy Policy</a>
        <a href="/terms.html">Terms</a>
        <a href="/sitemap.xml">Sitemap</a>
      </div>
    </div>
    <p class="fine-print">Educational information only. Not legal, tax, financial, or personalized insurance advice. Insurance laws, policy terms, pricing, eligibility, exclusions, and requirements vary by state, carrier, industry, and business details. Consult licensed professionals before buying coverage.</p>
  </footer>
  <script src="/assets/main.js"></script>
</body>
</html>
`;
}

// ─── Sitemap Update ──────────────────────────────────────────────────────────
function updateSitemap(topic, today) {
  let xml = fs.readFileSync(SITEMAP_FILE, 'utf8');
  const loc = `${DOMAIN}/${topic.category}/${topic.slug}.html`;
  if (xml.includes(`<loc>${loc}</loc>`)) {
    console.log('  sitemap.xml already lists this URL — skipping');
    return;
  }
  const entry = `  <url><loc>${loc}</loc><lastmod>${today}</lastmod></url>`;
  xml = xml.replace('</urlset>', `${entry}\n</urlset>`);
  fs.writeFileSync(SITEMAP_FILE, xml);
  console.log('  sitemap.xml updated');
}

// ─── FTP Deploy ──────────────────────────────────────────────────────────────
function deploy() {
  console.log('\n[5/5] Deploying via FTP (node deploy-ftp.js)...');
  const result = spawnSync('node', [path.join(BASE_DIR, 'deploy-ftp.js')], {
    cwd: BASE_DIR, timeout: 600000, encoding: 'utf8', stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('FTP deploy failed (status ' + result.status + ')');
  console.log('  FTP deploy complete');
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Surface the key once so users know which auth path is being used (claude CLI handles its own auth).
  const key = getApiKey();
  if (key) console.log('Auth: ANTHROPIC_API_KEY detected (claude CLI manages its own session).');

  const topicsData = loadTopicsUsed();
  const topic = pickTopic(topicsData.used);
  const today = todayISO();
  const todayFmt = todayDisplay();

  console.log(`\n=== Auto-Publishing: "${topic.title}" ===`);
  console.log('Slug:    ', topic.slug);
  console.log('Category:', topic.category);
  console.log('Date:    ', today);

  // [1/5] Image
  console.log('\n[1/5] Fetching Unsplash image...');
  let imageFilename = null, photographer = null, photographerUrl = null;
  try {
    const img = await fetchUnsplashImage(topic, topic.slug);
    if (img) { imageFilename = img.filename; photographer = img.photographer; photographerUrl = img.photographerUrl; }
  } catch (e) {
    console.warn('  Image fetch failed:', e.message, '— using fallback /assets/business-owner.jpg');
  }

  // [2/5] Generate article
  console.log('\n[2/5] Generating article via claude CLI...');
  const article = await generateArticle(topic, imageFilename || 'fallback.jpg', today);
  console.log('  Title:   ', article.title);
  console.log('  Sections:', (article.sections || []).length);
  console.log('  FAQs:    ', (article.faqs || []).length);

  // [3/5] Write HTML
  console.log('\n[3/5] Building article HTML...');
  const html = buildArticleHTML(topic, article, imageFilename, photographer, photographerUrl, today, todayFmt);
  const outDir = path.join(BASE_DIR, topic.category);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${topic.slug}.html`);
  fs.writeFileSync(outFile, html);
  console.log('  Written:', `${topic.category}/${topic.slug}.html`);

  // [4/5] Sitemap
  console.log('\n[4/5] Updating sitemap.xml...');
  updateSitemap(topic, today);

  // ── Mark topic used BEFORE deploy (so a failed FTP run doesn't republish) ──
  topicsData.used.push(topic.slug);
  saveTopicsUsed(topicsData);
  console.log('\n✓ topics-used.json updated (before deploy)');

  // [5/5] Deploy
  deploy();

  console.log('\n=== Done ===');
  console.log('New page:', `${DOMAIN}/${topic.category}/${topic.slug}.html`);
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
