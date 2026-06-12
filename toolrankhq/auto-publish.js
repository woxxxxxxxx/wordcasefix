'use strict';
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_DIR     = __dirname;
const TOPICS_FILE  = path.join(BASE_DIR, 'topics-used.json');
const INDEX_FILE   = path.join(BASE_DIR, 'index.html');
const SITEMAP_FILE = path.join(BASE_DIR, 'sitemap.xml');
const ARTICLES_DIR = path.join(BASE_DIR, 'articles');
const IMAGES_DIR   = path.join(BASE_DIR, 'images');

const DOMAIN    = 'https://toolrankhq.com';
const SITE_NAME = 'ToolRankHQ';
const GA_ID     = 'G-Z6W6MGYL95';
const ADSENSE   = 'ca-pub-1638874323475457';

// Read API key from env, .env file, or Claude Code credentials
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
    const c = JSON.parse(fs.readFileSync(creds, 'utf8'));
    if (c.claudeAiOauth && c.claudeAiOauth.accessToken) return c.claudeAiOauth.accessToken;
  }
  throw new Error('No ANTHROPIC_API_KEY found. Set it in environment or .env file.');
}

const UNSPLASH_KEY = '5RQkzb688Ez9nXR-vzUbkXmxFaxQbLzEQUoyy8rogt4';

// Candidate topics — extend freely
const TOPIC_CANDIDATES = [
  { title: 'Best AI Tools for Freelance Writers in 2026',           slug: 'best-ai-tools-freelance-writers',           category: 'Writing',      keyword: 'ai writing tools freelancers' },
  { title: 'How to Automate Invoicing as a Freelancer',             slug: 'automate-invoicing-freelancer',             category: 'Finance',      keyword: 'automate invoicing freelance business' },
  { title: 'Best AI Client Communication Tools for Freelancers',    slug: 'ai-client-communication-tools',             category: 'Productivity', keyword: 'ai client communication freelancer tools' },
  { title: 'Best AI Tools for Graphic Designers in 2026',           slug: 'ai-tools-graphic-designers',               category: 'Design',       keyword: 'ai design tools for graphic designers' },
  { title: 'How to Use AI to Write Better Proposals',               slug: 'ai-tools-write-proposals-freelancers',     category: 'Contracts',    keyword: 'ai proposal writing freelancers' },
  { title: 'Best AI Time Tracking Tools for Freelancers',           slug: 'ai-time-tracking-tools-freelancers',       category: 'Productivity', keyword: 'ai time tracking software freelancers' },
  { title: 'Best AI Tools for Social Media Managers',               slug: 'ai-tools-social-media-managers',           category: 'Marketing',    keyword: 'ai social media management tools' },
  { title: 'FreshBooks vs HoneyBook: Which Is Better for Freelancers?', slug: 'freshbooks-vs-honeybook-review',        category: 'Finance',      keyword: 'freshbooks vs honeybook freelancer' },
  { title: 'Best AI Tools for Remote Teams in 2026',                slug: 'ai-tools-remote-teams',                    category: 'Productivity', keyword: 'ai productivity tools remote team' },
  { title: 'How to Use ChatGPT for Your Freelance Business',        slug: 'chatgpt-freelance-business-guide',         category: 'AI Writing',   keyword: 'chatgpt freelance business tips' },
  { title: 'Best Bookkeeping Software for Freelancers in 2026',     slug: 'best-bookkeeping-software-freelancers',    category: 'Finance',      keyword: 'bookkeeping software freelancers' },
  { title: 'Best AI Tools for Video Creators and YouTubers',        slug: 'ai-tools-video-creators-youtubers',        category: 'Design',       keyword: 'ai tools video creators youtube' },
  { title: 'ClickUp vs Asana vs Trello: Which Is Best?',           slug: 'clickup-vs-asana-vs-trello-review',        category: 'Productivity', keyword: 'clickup vs asana vs trello comparison' },
  { title: 'Best AI Scheduling Tools for Freelancers',              slug: 'ai-scheduling-tools-freelancers',          category: 'Productivity', keyword: 'ai scheduling automation freelancers' },
  { title: 'Grammarly vs Claude vs ChatGPT for Business Writing',   slug: 'grammarly-vs-claude-vs-chatgpt-writing',   category: 'AI Writing',   keyword: 'grammarly claude chatgpt writing comparison' },
  { title: 'Best AI Tools for Real Estate Agents',                  slug: 'ai-tools-real-estate-agents',              category: 'Industry',     keyword: 'ai tools real estate agents' },
  { title: 'How to Build a Freelance Business with AI Tools',       slug: 'build-freelance-business-ai-tools',        category: 'Guides',       keyword: 'ai tools build freelance business' },
  { title: 'Best AI Tools for Accountants and Bookkeepers',         slug: 'ai-tools-accountants-bookkeepers',         category: 'Finance',      keyword: 'ai accounting tools accountants' },
  { title: 'Canva vs Adobe Express vs Figma: Best for Freelancers?', slug: 'canva-vs-adobe-express-vs-figma-review',  category: 'Design',       keyword: 'canva adobe express figma comparison' },
  { title: 'Best AI Tools for HR Professionals in 2026',            slug: 'ai-tools-hr-professionals',                category: 'HR',           keyword: 'ai tools human resources hr' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadTopicsUsed() {
  if (!fs.existsSync(TOPICS_FILE)) return { used: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
    // Support both { used: [] } and bare [] formats
    return Array.isArray(raw) ? { used: raw } : raw;
  } catch (_) { return { used: [] }; }
}

function saveTopicsUsed(data) {
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(data, null, 2));
}

function pickTopic(usedSlugs) {
  const available = TOPIC_CANDIDATES.filter(t => !usedSlugs.includes(t.slug));
  if (!available.length) throw new Error('All topics used! Add more to TOPIC_CANDIDATES.');
  return available[0];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function todayDisplay() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function monthDisplay() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = https.get({
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      headers: { 'User-Agent': 'ToolRankHQ-AutoPublish/1.0', ...headers },
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
    console.warn('  No Unsplash images found');
    return null;
  }

  const photo = data.results[0];
  const imgUrl = photo.urls.regular;
  const photographer = photo.user.name;
  const photographerUrl = photo.user.links.html;

  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

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

// ─── Article Generation ───────────────────────────────────────────────────────
async function generateArticle(topic, imageFilename, today) {
  const prompt = `You are an expert AI tools reviewer for ToolRankHQ.com — an independent review site for freelancers and small business owners. Write a comprehensive, SEO-optimized AI tools review article following the EXACT JSON structure below.

Topic: "${topic.title}"
Category: ${topic.category}
Target audience: freelancers, solopreneurs, and small business owners
Date: ${today}
Image: /images/${imageFilename}

Return ONLY valid JSON (no markdown, no backticks) matching this schema exactly:
{
  "title": "Full article title (60-70 chars, include target keyword)",
  "metaDescription": "150-160 char meta description with keyword",
  "excerpt": "2-3 sentences for index page listing",
  "readTime": "X min read (integer only, 8-14 typical)",
  "category": "${topic.category}",
  "categorySlug": "${topic.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}",
  "keyTakeaways": ["5 bullet strings, each specific and actionable"],
  "tocItems": [
    { "id": "section-id", "label": "Section Title" }
  ],
  "intro": "Opening paragraph (80-120 words). Hook with a freelancer pain point, state the problem, promise the review/comparison.",
  "sections": [
    {
      "id": "section-id",
      "h2": "Section Heading",
      "content": "HTML content for this section. Use <p>, <ul><li>, <ol><li>, <h3>, <strong>. For tool reviews include pricing, pros/cons, and verdict. Add a <div class=\\"tool-verdict\\"><strong>Our Verdict:</strong> ...</div> in at least one section. Minimum 200 words per section."
    }
  ],
  "faqs": [
    { "question": "FAQ question?", "answer": "1-3 sentence answer." }
  ],
  "relatedArticles": [
    { "href": "filename.html", "title": "Article Title", "category": "Category" }
  ],
  "imageAlt": "Descriptive alt text for the hero image, 8-12 words"
}

Requirements:
- 6-8 sections minimum covering real tool comparisons, pricing, pros/cons, and who each tool is best for
- 5 FAQs that freelancers actually ask
- 5 related articles chosen from this list (use exact filenames):
  best-ai-tools-freelancers-2026.html
  best-ai-contract-tools-freelancers.html
  best-ai-invoicing-software-freelancers.html
  pandadoc-vs-docusign-review.html
  best-esignature-tools-small-business.html
  ai-legal-document-generators-reviewed.html
  ai-accounting-tools-solopreneurs.html
  freshbooks-vs-quickbooks-vs-wave.html
  best-expense-tracking-tools-ai.html
  best-payroll-software-small-teams.html
  best-ai-writing-tools-business.html
  best-project-management-ai-tools.html
  best-ai-email-tools-freelancers.html
  notion-vs-clickup-vs-monday.html
  best-free-ai-tools-small-business.html
  best-ai-tools-solopreneurs.html
  deel-vs-remote-vs-rippling.html
  ai-hr-tools-growing-businesses.html
  best-contractor-payment-tools.html
  ai-tools-replace-full-time-employee.html
- Include at least one link to https://contractfixpro.com, https://billingfixpro.com, or https://payrollfixpro.com inside the article body as a relevant free tool mention
- Use real tool names, real pricing, and accurate feature descriptions — no made-up claims
- Return ONLY the JSON object, no other text`;

  console.log('  Calling claude CLI...');

  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const proc = spawn(
      'claude',
      [
        '-p', prompt,
        '--model', 'claude-sonnet-4-6',
        '--dangerously-skip-permissions',
        '--disallowed-tools', 'Bash,Edit,Write,Read,Glob,Grep,Agent,WebSearch,WebFetch',
        '--system-prompt', 'You are a JSON content generator for an AI tools review website. Return ONLY valid JSON. Never use tools, never create files, never run shell commands.',
      ],
      { cwd: BASE_DIR }
    );

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      if (code !== 0) {
        return reject(new Error('claude CLI failed (code ' + code + '): ' + stderr.slice(0, 400)));
      }
      const raw = stdout.trim();
      if (!raw) return reject(new Error('claude CLI returned empty output'));

      const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      try {
        resolve(JSON.parse(stripped));
      } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try { return resolve(JSON.parse(match[0])); } catch (e2) {}
        }
        reject(new Error('Failed to parse JSON: ' + e.message + '\nOutput start: ' + raw.slice(0, 400)));
      }
    });

    proc.on('error', err => reject(new Error('spawn error: ' + err.message)));

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('claude CLI timed out after 600s'));
    }, 600000);
    proc.on('close', () => clearTimeout(timer));
  });
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────
function buildArticleHTML(topic, article, imageFilename, photographer, photographerUrl, slug, today, todayFmt) {
  const canonicalUrl = `${DOMAIN}/articles/${slug}.html`;
  const imageUrl     = `${DOMAIN}/images/${imageFilename}`;
  const catSlug      = article.categorySlug || topic.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const tocHtml = article.tocItems.map(item =>
    `            <li><a href="#${item.id}">${item.label}</a></li>`
  ).join('\n');

  const takeawaysHtml = article.keyTakeaways.map(t =>
    `            <li>${t}</li>`
  ).join('\n');

  const sectionsHtml = article.sections.map(s =>
    `          <h2 id="${s.id}">${s.h2}</h2>\n          ${s.content}`
  ).join('\n\n');

  const faqsHtml = article.faqs.map(f => `          <div class="faq-item">
            <button class="faq-question">${f.question} <span class="faq-icon">+</span></button>
            <div class="faq-answer"><p>${f.answer}</p></div>
          </div>`).join('\n');

  const relatedHtml = article.relatedArticles.slice(0, 5).map((r, i) =>
    `            <li><a href="${r.href}"><span class="rel-num">${i + 1}</span>${r.title}</a></li>`
  ).join('\n');

  const photoCredit = photographer
    ? `<!-- Photo by <a href="${photographerUrl}?utm_source=toolrankhq&utm_medium=referral" target="_blank" rel="noopener">${photographer}</a> on Unsplash -->`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${article.title} | ${SITE_NAME}</title>
<meta name="description" content="${article.metaDescription}">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${article.title}">
<meta property="og:description" content="${article.metaDescription}">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:site_name" content="${SITE_NAME}">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../styles.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${article.title.replace(/"/g, '\\"')}",
  "description": "${article.metaDescription.replace(/"/g, '\\"')}",
  "image": {"@type":"ImageObject","url":"${imageUrl}"},
  "datePublished": "${today}",
  "dateModified": "${today}",
  "author": {"@type":"Organization","name":"${SITE_NAME} Editorial Team"},
  "publisher": {"@type":"Organization","name":"${SITE_NAME}","logo":{"@type":"ImageObject","url":"${DOMAIN}/favicon.svg"}},
  "mainEntityOfPage": {"@type":"WebPage","@id":"${canonicalUrl}"}
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type":"ListItem","position":1,"name":"Home","item":"${DOMAIN}/"},
    {"@type":"ListItem","position":2,"name":"${article.category || topic.category}","item":"${DOMAIN}/#${catSlug}"},
    {"@type":"ListItem","position":3,"name":"${article.title.replace(/"/g, '\\"')}","item":"${canonicalUrl}"}
  ]
}
</script>
</head>
<body>
<div id="read-progress"></div>
<header class="site-header">
  <div class="header-inner">
    <a href="../" class="site-logo">
      <img src="../favicon.svg" class="logo-icon" alt="${SITE_NAME} Logo">
      <span class="logo-text">ToolRank<span>HQ</span></span>
    </a>
    <nav class="site-nav" id="site-nav">
      <a href="../">Home</a>
      <a href="../about.html">About</a>
      <a href="../contact.html">Contact</a>
      <a href="https://contractfixpro.com" target="_blank" rel="noopener">Contracts</a>
      <a href="https://billingfixpro.com" target="_blank" rel="noopener">Billing</a>
      <a href="https://payrollfixpro.com" target="_blank" rel="noopener">Payroll</a>
    </nav>
    <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation"><span></span><span></span><span></span></button>
  </div>
</header>

<main class="main-content">
  <div class="container">
    <nav class="breadcrumb">
      <a href="../">Home</a><span class="sep">›</span>
      <a href="../#${catSlug}">${article.category || topic.category}</a><span class="sep">›</span>
      <span class="current">${article.title}</span>
    </nav>

    <div class="content-grid">
      <article>
        <div class="article-header">
          <span class="category-tag ${catSlug}">${article.category || topic.category}</span>
          <h1 style="font-size:2.1rem;margin:0.875rem 0 0.5rem;">${article.title}</h1>
          <div class="article-meta">
            <span class="meta-item"><span class="icon">📅</span> ${todayFmt}</span>
            <span class="meta-item"><span class="icon">⏱</span> ${article.readTime}</span>
            <span class="meta-item"><span class="icon">🔄</span> Updated ${monthDisplay()}</span>
          </div>
        </div>

        ${photoCredit}
        <img class="article-hero-img" src="../images/${imageFilename}" alt="${article.imageAlt}" loading="lazy">

        <div class="affiliate-disclosure">
          <span class="icon">ℹ️</span>
          <span><strong>Affiliate Disclosure:</strong> ToolRankHQ earns commissions from affiliate links at no extra cost to you. Our rankings are editorially independent. <a href="../about.html">Learn more.</a></span>
        </div>

        <div class="quick-summary">
          <h3>⚡ Quick Summary</h3>
          <div class="quick-summary-grid">
            <div class="qs-item">
              <div class="qs-label">Best Overall</div>
              <div class="qs-winner">${article.keyTakeaways[0].split(':')[0].replace(/^(Best|Top|#1|Use)\s*/i,'').split(' ').slice(0,2).join(' ')}</div>
              <div class="qs-note">${article.keyTakeaways[0].slice(0,60)}</div>
            </div>
            <div class="qs-item">
              <div class="qs-label">Best Value</div>
              <div class="qs-winner">${article.keyTakeaways[1].split(':')[0].replace(/^(Best|Top|#1|Use)\s*/i,'').split(' ').slice(0,2).join(' ')}</div>
              <div class="qs-note">${article.keyTakeaways[1].slice(0,60)}</div>
            </div>
            <div class="qs-item">
              <div class="qs-label">Best Free Option</div>
              <div class="qs-winner">${article.keyTakeaways[2].split(':')[0].replace(/^(Best|Top|#1|Use)\s*/i,'').split(' ').slice(0,2).join(' ')}</div>
              <div class="qs-note">${article.keyTakeaways[2].slice(0,60)}</div>
            </div>
          </div>
        </div>

        <div class="author-box">
          <div class="author-badge">TRH</div>
          <div class="author-info">
            <div class="author-name">${SITE_NAME} Editorial Team</div>
            <div class="author-title">Last Updated: ${monthDisplay()} · <span class="author-badge-sm">Independently Reviewed</span></div>
          </div>
        </div>

        <div class="key-takeaways">
          <h3>🎯 Key Takeaways</h3>
          <ul>
${takeawaysHtml}
          </ul>
        </div>

        <div class="toc">
          <h3>📋 Table of Contents</h3>
          <ol>
${tocHtml}
            <li><a href="#faq">Frequently Asked Questions</a></li>
          </ol>
        </div>

        <div class="article-body">
          <p>${article.intro}</p>

          <div class="ad-unit" style="height:90px;min-height:90px;">Advertisement</div>

${sectionsHtml}
        </div>

        <div class="ad-unit" style="height:90px;min-height:90px;">Advertisement</div>

        <div class="cta-section">
          <h3>Free Tools for Freelancers</h3>
          <p>Check out our recommended free tools for contracts, billing, and payroll.</p>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:0.75rem;">
            <a href="https://contractfixpro.com" target="_blank" rel="noopener" class="btn-orange">Free Contracts →</a>
            <a href="https://billingfixpro.com" target="_blank" rel="noopener" class="btn-primary">Free Invoicing →</a>
            <a href="https://payrollfixpro.com" target="_blank" rel="noopener" class="btn-primary">Free Payroll →</a>
          </div>
        </div>

        <section class="faq-section" id="faq">
          <h2>Frequently Asked Questions</h2>
${faqsHtml}
        </section>

        <div class="author-bio">
          <div class="author-badge" style="width:52px;height:52px;font-size:1rem;">TRH</div>
          <div>
            <h4>${SITE_NAME} Editorial Team</h4>
            <p>Our team of independent reviewers tests AI tools for freelancers and small business owners, providing unbiased rankings based on real-world usage.</p>
          </div>
        </div>
      </article>

      <aside class="sidebar">
        <div class="related-articles">
          <div class="related-articles-header"><h4>Related Articles</h4></div>
          <ul class="related-list">
${relatedHtml}
          </ul>
        </div>

        <div class="ad-unit" style="height:90px;min-height:90px;">Advertisement</div>

        <div class="cta-block">
          <h3>Free AI Contract Generator</h3>
          <p>Generate client contracts, NDAs, and service agreements in under 3 minutes — free.</p>
          <a href="https://contractfixpro.com" class="btn-white" target="_blank" rel="noopener">Try Free →</a>
        </div>
      </aside>
    </div>
  </div>
</main>

<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="logo-text">ToolRank<span>HQ</span></span>
        <p>Independent AI tool reviews for freelancers and small business owners.</p>
      </div>
      <div class="footer-col">
        <h4>Contracts</h4>
        <ul>
          <li><a href="best-ai-contract-tools-freelancers.html">Best AI Contract Tools</a></li>
          <li><a href="pandadoc-vs-docusign-review.html">PandaDoc vs DocuSign</a></li>
          <li><a href="best-esignature-tools-small-business.html">Best eSignature Tools</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Finance</h4>
        <ul>
          <li><a href="best-ai-invoicing-software-freelancers.html">Best AI Invoicing</a></li>
          <li><a href="freshbooks-vs-quickbooks-vs-wave.html">FreshBooks vs QuickBooks</a></li>
          <li><a href="best-payroll-software-small-teams.html">Best Payroll Software</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Resources</h4>
        <ul>
          <li><a href="../about.html">About</a></li>
          <li><a href="../contact.html">Contact</a></li>
          <li><a href="best-ai-tools-freelancers-2026.html">50 Best AI Tools</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 ${SITE_NAME}. All rights reserved.</p>
      <div class="footer-bottom-links"><a href="../about.html">About</a><a href="../contact.html">Contact</a><a href="../sitemap.xml">Sitemap</a></div>
    </div>
  </div>
</footer>

<button id="back-to-top" aria-label="Back to top">↑</button>
<script>
const navToggle = document.getElementById('nav-toggle');
const siteNav   = document.getElementById('site-nav');
navToggle.addEventListener('click', () => siteNav.classList.toggle('open'));

window.addEventListener('scroll', () => {
  const s = window.scrollY;
  const d = document.documentElement.scrollHeight - window.innerHeight;
  document.getElementById('read-progress').style.width = (d > 0 ? s / d * 100 : 0) + '%';
  const b = document.getElementById('back-to-top');
  s > 400 ? b.classList.add('visible') : b.classList.remove('visible');
});

document.getElementById('back-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(function(q) {
  q.addEventListener('click', function() {
    var answer = this.nextElementSibling;
    var isOpen = answer.style.display === 'block';
    document.querySelectorAll('.faq-answer').forEach(function(a) { a.style.display = 'none'; });
    document.querySelectorAll('.faq-question').forEach(function(q2) { q2.classList.remove('active'); });
    if (!isOpen) { answer.style.display = 'block'; this.classList.add('active'); }
  });
});
</script>
</body>
</html>`;
}

// ─── Index Update ─────────────────────────────────────────────────────────────
function updateIndexHTML(topic, article, slug, imageFilename, today, todayFmt) {
  let html = fs.readFileSync(INDEX_FILE, 'utf8');
  const articleUrl = `articles/${slug}.html`;
  const catSlug    = article.categorySlug || topic.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const newCard = `
        <div class="review-card">
          <div class="review-card-cat"><span class="category-tag ${catSlug}">${article.category || topic.category}</span></div>
          <div class="review-card-title"><a href="${articleUrl}">${article.title}</a></div>
          <p class="review-card-desc">${article.excerpt}</p>
          <div class="review-card-footer">
            <span class="review-card-meta">${article.readTime} · ${todayFmt.replace(/\d{4}/, '').trim().replace(/,\s*$/, '')}</span>
            <a href="${articleUrl}" class="review-card-link">Read →</a>
          </div>
        </div>
`;

  // Insert new card as first item in review-card-grid
  html = html.replace(
    /(<div class="review-card-grid">)/,
    `$1${newCard}`
  );

  // Add new ItemList entry to JSON-LD schema
  const newItemEntry = `      {"@type":"ListItem","position":1,"url":"${DOMAIN}/articles/${slug}.html","name":"${article.title.replace(/"/g, '\\"')}"},`;
  html = html.replace(
    /("itemListElement":\s*\[)/,
    `$1\n${newItemEntry}`
  );

  // Renumber positions sequentially
  let posSeq = 0;
  html = html.replace(/"position":\s*\d+/g, () => `"position": ${++posSeq}`);

  fs.writeFileSync(INDEX_FILE, html);
  console.log('  index.html updated');
}

// ─── Sitemap Update ───────────────────────────────────────────────────────────
function updateSitemap(slug, today) {
  let xml = fs.readFileSync(SITEMAP_FILE, 'utf8');
  const newEntry = `  <url><loc>${DOMAIN}/articles/${slug}.html</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>`;
  xml = xml.replace('</urlset>', `${newEntry}\n</urlset>`);
  fs.writeFileSync(SITEMAP_FILE, xml);
  console.log('  sitemap.xml updated');
}

// ─── Deploy ───────────────────────────────────────────────────────────────────
function deploy() {
  console.log('\n[5/5] Deploying via node deploy-ftp.js...');
  const result = spawnSync('node', [path.join(BASE_DIR, 'deploy-ftp.js')], {
    cwd: BASE_DIR,
    timeout: 600000,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error('Deploy failed (status ' + result.status + ')');
    if (result.stderr) console.error(result.stderr.slice(0, 300));
  } else {
    console.log('  FTP deploy complete');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Ensure images directory exists
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const topicsData = loadTopicsUsed();
  const topic = pickTopic(topicsData.used);
  const today = todayISO();
  const todayFmt = todayDisplay();

  console.log(`\n=== Auto-Publishing: "${topic.title}" ===`);
  console.log('Slug:', topic.slug);
  console.log('Category:', topic.category);
  console.log('Date:', today);

  // Step 1: Fetch image
  console.log('\n[1/5] Fetching Unsplash image...');
  let imageFilename = 'img-auto.jpg';
  let photographer = null;
  let photographerUrl = null;
  try {
    const img = await fetchUnsplashImage(topic, topic.slug);
    if (img) {
      imageFilename = img.filename;
      photographer  = img.photographer;
      photographerUrl = img.photographerUrl;
    }
  } catch (e) {
    console.warn('  Image fetch failed:', e.message, '— using fallback');
  }

  // Step 2: Generate article
  console.log('\n[2/5] Generating article with Anthropic API...');
  const article = await generateArticle(topic, imageFilename, today);
  console.log('  Title:', article.title);
  console.log('  Sections:', article.sections.length);

  // Step 3: Build & write HTML
  console.log('\n[3/5] Building article HTML...');
  const articleHtml = buildArticleHTML(
    topic, article, imageFilename, photographer, photographerUrl,
    topic.slug, today, todayFmt
  );
  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  const articlePath = path.join(ARTICLES_DIR, `${topic.slug}.html`);
  fs.writeFileSync(articlePath, articleHtml);
  console.log('  Written:', `articles/${topic.slug}.html`);

  // Step 4: Update index + sitemap
  console.log('\n[4/5] Updating index.html and sitemap.xml...');
  updateIndexHTML(topic, article, topic.slug, imageFilename, today, todayFmt);
  updateSitemap(topic.slug, today);

  // Step 5: Deploy
  deploy();

  // Mark topic as used
  topicsData.used.push(topic.slug);
  saveTopicsUsed(topicsData);
  console.log('\n✓ topics-used.json updated');

  console.log('\n=== Done ===');
  console.log('New article:', `${DOMAIN}/articles/${topic.slug}.html`);
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
