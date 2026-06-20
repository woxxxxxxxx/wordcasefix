'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_DIR     = __dirname;
const TOPICS_FILE  = path.join(BASE_DIR, 'topics-used.json');
const INDEX_FILE   = path.join(BASE_DIR, 'index.html');
const SITEMAP_FILE = path.join(BASE_DIR, 'sitemap.xml');
const ARTICLES_DIR = path.join(BASE_DIR, 'articles');
const IMAGES_DIR   = path.join(BASE_DIR, 'images');

const DOMAIN       = 'https://freelancerguidehub.com';
const SITE_NAME    = 'FreelancerGuideHub';
const GA_ID        = 'G-8FJRW549B6';
const ADSENSE      = 'ca-pub-1638874323475457';
const UNSPLASH_KEY = '5RQkzb688Ez9nXR-vzUbkXmxFaxQbLzEQUoyy8rogt4';

// ─── Smart CTA Site Mapping ───────────────────────────────────────────────────
function getCTASite(topic) {
  const text = `${topic.slug} ${topic.category}`.toLowerCase();
  if (/contract|nda|agreement|legal|scope/.test(text))
    return { url: 'https://contractfixpro.com', name: 'ContractFixPro', heading: 'Free Contract Tools', desc: 'Create professional freelance contracts in minutes — no lawyer required.', btn: 'Try ContractFixPro &rarr;' };
  if (/invoice|billing|accounting|expense|payment|rates|pricing|retainer/.test(text))
    return { url: 'https://billingfixpro.com', name: 'BillingFixPro', heading: 'Free Billing Tools', desc: 'Automate invoices, track expenses, and get paid faster.', btn: 'Try BillingFixPro &rarr;' };
  if (/tax|payroll|1099|retirement/.test(text))
    return { url: 'https://payrollfixpro.com', name: 'PayrollFixPro', heading: 'Free Payroll & Tax Calculators', desc: 'Estimate self-employment taxes and plan quarterly payments.', btn: 'Try PayrollFixPro &rarr;' };
  if (/insurance/.test(text))
    return { url: 'https://insurancetipspro.com', name: 'InsuranceTipsPro', heading: 'Freelance Insurance Guides', desc: 'Find the right coverage for your freelance business.', btn: 'Visit InsuranceTipsPro &rarr;' };
  return { url: 'https://contractfixpro.com', name: 'ContractFixPro', heading: 'Free Contract Tools', desc: 'Create professional freelance contracts in minutes — no lawyer required.', btn: 'Try ContractFixPro &rarr;' };
}

// ─── Topic Candidates ─────────────────────────────────────────────────────────
const TOPIC_CANDIDATES = [
  { title: 'How to Prevent Scope Creep as a Freelancer',                   slug: 'freelance-scope-creep-prevention',      category: 'Contracts',       keyword: 'scope creep freelance prevention' },
  { title: 'Contract Red Flags: Warning Signs Every Freelancer Should Know', slug: 'contract-red-flags-freelancers',        category: 'Contracts',       keyword: 'contract red flags warning signs freelancer' },
  { title: 'How to Write a Video Production Contract',                      slug: 'video-production-contract-guide',       category: 'Contracts',       keyword: 'video production contract freelance' },
  { title: 'Web Designer Contract: What to Include and Why',                slug: 'web-designer-contract-guide',           category: 'Contracts',       keyword: 'web designer contract freelance template' },
  { title: 'Freelance Retainer Agreements: How to Set One Up and Get Paid', slug: 'freelance-retainer-agreements',         category: 'Finance/Billing', keyword: 'freelance retainer agreement setup' },
  { title: 'How to Raise Your Freelance Rates Without Losing Clients',      slug: 'how-to-raise-freelance-rates',          category: 'Finance/Billing', keyword: 'raise freelance rates without losing clients' },
  { title: 'Freelance Pricing Strategies: Hourly vs. Project vs. Retainer', slug: 'freelance-pricing-strategies',         category: 'Finance/Billing', keyword: 'freelance pricing strategies models comparison' },
  { title: 'How to Handle Late Payments as a Freelancer',                   slug: 'freelance-late-payment-strategies',     category: 'Finance/Billing', keyword: 'late payment freelancer solutions' },
  { title: 'Home Office Deduction for Freelancers: A Complete Guide',       slug: 'home-office-deduction-freelancers',     category: 'Taxes',           keyword: 'home office tax deduction freelancer' },
  { title: 'Self-Employed Retirement Accounts: SEP IRA vs Solo 401(k)',     slug: 'freelance-retirement-accounts',         category: 'Taxes',           keyword: 'self employed retirement account solo 401k sep ira' },
  { title: 'Sales Tax for Freelancers: When You Owe It and How to Pay',     slug: 'sales-tax-for-freelancers',             category: 'Taxes',           keyword: 'sales tax freelancers digital services' },
  { title: 'How to Pick a Profitable Freelance Niche',                      slug: 'freelance-niche-selection',             category: 'Career',          keyword: 'profitable freelance niche selection' },
  { title: 'Client Onboarding Process for Freelancers',                     slug: 'freelance-client-onboarding-process',   category: 'Career',          keyword: 'client onboarding process freelancer' },
  { title: 'Freelance Negotiation Tactics: Getting the Rate You Deserve',   slug: 'freelance-negotiation-tactics',         category: 'Career',          keyword: 'freelance rate negotiation tactics' },
  { title: 'Building Your Personal Brand as a Freelancer',                  slug: 'freelance-personal-brand-guide',        category: 'Career',          keyword: 'freelance personal brand building' },
  { title: 'How to Create a Freelance Business Plan',                       slug: 'freelance-business-plan-guide',         category: 'Career',          keyword: 'freelance business plan create' },
  { title: 'How to Set Up a Freelance LLC: Step-by-Step Guide',             slug: 'freelance-llc-setup-guide',             category: 'Career',          keyword: 'freelance LLC setup steps' },
  { title: 'Best Project Management Tools for Freelancers in 2026',         slug: 'project-management-tools-freelancers',  category: 'Tools',           keyword: 'project management tools freelancers' },
  { title: 'Best Invoicing Apps for Freelancers: 2026 Comparison',          slug: 'best-invoicing-apps-freelancers',       category: 'Tools',           keyword: 'best invoicing apps freelancers comparison' },
  { title: 'Time Tracking for Freelancers: Best Methods and Tools',         slug: 'freelance-time-tracking-guide',         category: 'Tools',           keyword: 'time tracking freelancers tools methods' },
  { title: 'Freelance Client Discovery Questions: What to Ask Before You Quote', slug: 'freelance-client-discovery-questions', category: 'Career', keyword: 'freelance client discovery questions' },
  { title: 'How to Build a Freelance Proposal That Wins Better Clients',     slug: 'freelance-proposal-guide',              category: 'Career',          keyword: 'freelance proposal guide' },
  { title: 'Freelance Payment Terms: Net 7 vs Net 15 vs Upfront Deposits',   slug: 'freelance-payment-terms-guide',         category: 'Finance/Billing', keyword: 'freelance payment terms net 15 deposit' },
  { title: 'How to Price Rush Fees for Freelance Projects',                  slug: 'freelance-rush-fee-pricing',            category: 'Finance/Billing', keyword: 'freelance rush fee pricing' },
  { title: 'Freelance Change Order Template: When Scope Changes Mid-Project', slug: 'freelance-change-order-guide',        category: 'Contracts',       keyword: 'freelance change order template' },
  { title: 'Kill Fees for Freelancers: How to Protect Cancelled Work',       slug: 'freelance-kill-fee-guide',              category: 'Contracts',       keyword: 'freelance kill fee contract' },
  { title: 'How to Write a Statement of Work for Freelance Projects',        slug: 'freelance-statement-of-work-guide',     category: 'Contracts',       keyword: 'freelance statement of work guide' },
  { title: 'Freelance Milestone Payments: How to Structure Safer Projects',  slug: 'freelance-milestone-payments',          category: 'Finance/Billing', keyword: 'freelance milestone payments' },
  { title: 'Estimated Tax Safe Harbor Rules for Freelancers',                slug: 'freelance-tax-safe-harbor-rules',       category: 'Taxes',           keyword: 'estimated tax safe harbor freelancers' },
  { title: '1099-K Rules for Freelancers Using Payment Apps',                slug: 'freelance-1099-k-payment-apps',         category: 'Taxes',           keyword: '1099-K payment apps freelancers' },
  { title: 'Freelance Bookkeeping Setup: Chart of Accounts and Monthly Routine', slug: 'freelance-bookkeeping-setup',      category: 'Finance/Billing', keyword: 'freelance bookkeeping setup chart of accounts' },
  { title: 'How to Separate Personal and Business Finances as a Freelancer', slug: 'separate-personal-business-finances-freelancer', category: 'Finance/Billing', keyword: 'separate personal business finances freelancer' },
  { title: 'Freelance Client Red Flags Before the Contract Stage',           slug: 'freelance-client-red-flags',            category: 'Career',          keyword: 'freelance client red flags' },
  { title: 'How to Create a Freelancer Case Study Portfolio Page',           slug: 'freelance-case-study-portfolio',        category: 'Career',          keyword: 'freelance case study portfolio' },
  { title: 'Freelance Referral Systems: How to Get Warm Leads Every Month',  slug: 'freelance-referral-system',             category: 'Career',          keyword: 'freelance referral system' },
  { title: 'How to Handle International Freelance Contracts',                slug: 'international-freelance-contracts',      category: 'Contracts',       keyword: 'international freelance contract guide' },
  { title: 'Freelance Copyright Ownership: Work Made for Hire Explained',    slug: 'freelance-copyright-ownership',         category: 'Contracts',       keyword: 'freelance copyright ownership work made for hire' },
  { title: 'How to Run a Freelance Business Review Each Month',              slug: 'monthly-freelance-business-review',     category: 'Career',          keyword: 'monthly freelance business review' },
  { title: 'Freelance Emergency Fund: How Much to Save and Where to Keep It', slug: 'freelance-emergency-fund-guide',       category: 'Finance/Billing', keyword: 'freelance emergency fund guide' },
  { title: 'Quarterly Freelance Planning: Goals, Revenue, and Capacity',     slug: 'quarterly-freelance-planning',          category: 'Career',          keyword: 'quarterly freelance planning goals revenue capacity' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadTopicsUsed() {
  if (!fs.existsSync(TOPICS_FILE)) return { used: [] };
  return JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
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

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = https.get({
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      headers: { 'User-Agent': 'FreelancerGuideHub-AutoPublish/1.0', ...headers },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ─── Unsplash Image ───────────────────────────────────────────────────────────
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

  // Trigger Unsplash download tracking (required by API guidelines)
  const trackUrl = photo.links.download_location + `?client_id=${UNSPLASH_KEY}`;
  httpsGet(trackUrl).catch(() => {});

  return { filename: imgFilename, photographer, photographerUrl };
}

// ─── Article Generation ───────────────────────────────────────────────────────
async function generateArticle(topic, imageFilename, today) {
  const ctaSite = getCTASite(topic);

  const prompt = `You are an expert freelance business writer for FreelancerGuideHub.com. Write a comprehensive, SEO-optimized article following the EXACT JSON structure below.

Topic: "${topic.title}"
Category: ${topic.category}
Target audience: Freelancers and independent contractors, plain English, actionable advice
Date: ${today}
Image: /images/${imageFilename}

Return ONLY valid JSON (no markdown, no backticks) matching this schema exactly:
{
  "title": "Full article title (60-70 chars, include target keyword)",
  "metaDescription": "150-160 char meta description with keyword",
  "excerpt": "2 sentences for index page listing",
  "readTime": "X min read (integer only, 7-12 typical)",
  "keyTakeaways": ["5 bullet strings, each starting with a verb or noun phrase"],
  "tocItems": [
    { "id": "section-id", "label": "Section Title" }
  ],
  "intro": "Opening paragraph (80-120 words). Hook, state the problem, promise the solution.",
  "sections": [
    {
      "id": "section-id",
      "h2": "Section Heading",
      "content": "HTML content for this section. Use <p>, <ul><li>, <ol><li>, <h3>, <strong>. Add a <div class=\\"callout\\"><strong>Pro Tip:</strong> ...</div> in at least one section. Minimum 150 words per section."
    }
  ],
  "faqs": [
    { "question": "FAQ question?", "answer": "1-3 sentence answer." }
  ],
  "relatedArticles": [
    { "href": "/articles/slug.html", "title": "Article Title" }
  ],
  "imageAlt": "Descriptive alt text for the hero image, 8-12 words"
}

Requirements:
- 6-8 sections minimum
- 5 FAQs
- 5 related articles chosen from this list:
  /articles/how-to-write-a-freelance-contract.html
  /articles/freelance-contract-template-guide.html
  /articles/what-to-include-in-nda.html
  /articles/photography-contract-essentials.html
  /articles/how-to-invoice-clients-as-freelancer.html
  /articles/how-to-set-freelance-rates.html
  /articles/freelance-expense-tracking-guide.html
  /articles/best-accounting-software-freelancers.html
  /articles/freelance-tax-guide.html
  /articles/quarterly-taxes-freelancer.html
  /articles/employee-vs-contractor-guide.html
  /articles/how-to-pay-contractors.html
  /articles/freelance-payroll-guide.html
  /articles/global-payments-remote-workers.html
  /articles/how-to-find-freelance-clients.html
  /articles/how-to-scale-freelance-business.html
  /articles/freelance-portfolio-guide.html
  /articles/freelance-productivity-guide.html
  /articles/best-tools-for-freelancers.html
  /articles/freelance-insurance-guide.html
- Include 2-3 internal links to articles from the list above within the section content using <a href="/articles/slug.html">anchor text</a>
- Include at least one link to ${ctaSite.url} inside the article body with helpful anchor text
- Return ONLY the JSON object, no other text`;

  console.log('  Calling claude CLI...');

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'claude',
      [
        '-p', prompt,
        '--model', process.env.CLAUDE_MODEL || 'claude-sonnet-4-5',
        '--dangerously-skip-permissions',
        '--disallowed-tools', 'Bash,Edit,Write,Read,Glob,Grep,Agent,WebSearch,WebFetch',
        '--system-prompt', 'You are a JSON content generator for a freelance business website. Return ONLY valid JSON. Never use tools, never create files, never run shell commands, never commit to git.',
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
      if (!raw) return reject(new Error('claude CLI returned empty output. stderr: ' + stderr.slice(0, 200)));

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
  const ctaSite = getCTASite(topic);
  const canonicalUrl = `${DOMAIN}/articles/${slug}.html`;
  const imageUrl = `${DOMAIN}/images/${imageFilename}`;

  const tocHtml = article.tocItems.map(item =>
    `          <li><a href="#${item.id}">${item.label}</a></li>`
  ).join('\n');

  const takeawaysHtml = article.keyTakeaways.map(t =>
    `          <li>${t}</li>`
  ).join('\n');

  const sectionsHtml = article.sections.map(s =>
    `        <h2 id="${s.id}">${s.h2}</h2>\n        ${s.content}`
  ).join('\n\n');

  const faqsHtml = article.faqs.map(f => `        <div class="faq-item">
          <button class="faq-question">${f.question}</button>
          <div class="faq-answer"><p>${f.answer}</p></div>
        </div>`).join('\n');

  const relatedHtml = article.relatedArticles.slice(0, 5).map((r, i) =>
    `        <div class="related-post"><div class="related-num">${i + 1}</div><a href="${r.href}">${r.title}</a></div>`
  ).join('\n');

  const photoCredit = photographer
    ? `<!-- Photo by <a href="${photographerUrl}?utm_source=freelancerguidehub&utm_medium=referral" target="_blank" rel="noopener">${photographer}</a> on <a href="https://unsplash.com/?utm_source=freelancerguidehub&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a> -->`
    : '';

  const adUnit = '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
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
<link rel="stylesheet" href="../styles.css">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${article.title.replace(/"/g, '\\"')}",
  "description": "${article.metaDescription.replace(/"/g, '\\"')}",
  "image": "${imageUrl}",
  "datePublished": "${today}",
  "dateModified": "${today}",
  "author": { "@type": "Organization", "name": "${SITE_NAME} Editorial Team" },
  "publisher": { "@type": "Organization", "name": "${SITE_NAME}", "logo": { "@type": "ImageObject", "url": "${DOMAIN}/logo.svg" } },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "${canonicalUrl}" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "${DOMAIN}/" },
    { "@type": "ListItem", "position": 2, "name": "${article.title.replace(/"/g, '\\"')}", "item": "${canonicalUrl}" }
  ]
}
</script>
</head>
<body>
<div id="read-progress"></div>
<header class="site-header">
  <div class="header-inner">
    <a href="/" class="site-logo"><img src="/logo.svg" alt="${SITE_NAME}" style="display:block;height:36px;width:auto;" loading="eager"></a>
    <nav class="site-nav" id="mainNav">
      <a href="/">Home</a><a href="/about.html">About</a><a href="/contact.html">Contact</a>
      <a href="https://contractfixpro.com" target="_blank" rel="noopener">Contract Tools</a>
      <a href="https://billingfixpro.com" target="_blank" rel="noopener">Billing Tools</a>
      <a href="https://payrollfixpro.com" target="_blank" rel="noopener">Payroll Tools</a>
    </nav>
    <button class="nav-toggle" id="navToggle" aria-label="Toggle menu"><span></span><span></span><span></span></button>
  </div>
  <nav class="header-cats" aria-label="Browse by category">
    <div class="header-cats-inner">
      <a href="/#contracts" class="cat-contracts">Contracts</a>
      <a href="/#finance" class="cat-finance">Finance</a>
      <a href="/#taxes" class="cat-taxes">Taxes</a>
      <a href="/#career" class="cat-career">Career</a>
    </div>
  </nav>
</header>

<main class="container main-content">
  <div class="breadcrumb"><a href="/">Home</a><span>›</span>${article.title}</div>
  <div class="content-grid">
    <article>
      <div class="article-header">
        <span class="category-tag">${topic.category}</span>
        <h1>${article.title}</h1>
        <div class="article-meta"><span>By ${SITE_NAME} Editorial Team</span><span>${todayFmt}</span><span>${article.readTime}</span></div>
      </div>

      ${photoCredit}
      <img src="/images/${imageFilename}" alt="${article.imageAlt}" class="article-hero-img" loading="lazy">
      ${adUnit}
      <div class="author-box">
        <div class="author-avatar-sm">FG</div>
        <div class="author-info">
          <strong>${SITE_NAME} Editorial Team</strong>
          <span>Last Updated: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} &bull; <span class="author-badge">Reviewed for accuracy</span></span>
        </div>
      </div>
      <div class="article-disclaimer">This article is for educational purposes only. Laws and regulations vary by state and country. Consult a licensed professional for advice specific to your situation.</div>

      <div class="key-takeaways">
        <h4>Key Takeaways</h4>
        <ul>
${takeawaysHtml}
        </ul>
      </div>

      <div class="toc">
        <h4>Table of Contents</h4>
        <ol>
${tocHtml}
        </ol>
      </div>

      <div class="article-body">
        <p>${article.intro}</p>

${sectionsHtml}
      </div>

      ${adUnit}

      <div class="cta-section">
        <h3>${ctaSite.heading}</h3>
        <p>${ctaSite.desc}</p>
        <a href="${ctaSite.url}" target="_blank" rel="noopener" class="cta-btn">${ctaSite.btn}</a>
      </div>

      <div class="faq-section">
        <h2>Frequently Asked Questions</h2>
${faqsHtml}
      </div>

      <div class="author-bio">
        <div class="author-avatar">FG</div>
        <div><h4>${SITE_NAME} Editorial Team</h4><p>Our team of business writers and independent professionals provides practical, unbiased guidance to help freelancers build sustainable careers.</p></div>
      </div>

      <div class="helpful-widget">
        <p>Was this article helpful?</p>
        <div class="helpful-buttons">
          <button class="helpful-btn" onclick="helpfulVote(this)">&#128077; Yes, helpful</button>
          <button class="helpful-btn" onclick="helpfulVote(this)">&#128078; Not really</button>
        </div>
        <p class="helpful-msg" style="display:none;">Thanks for your feedback!</p>
      </div>
      <script>if(!window.helpfulVote)window.helpfulVote=function(b){document.querySelectorAll('.helpful-btn').forEach(function(x){x.classList.remove('voted');});b.classList.add('voted');b.closest('.helpful-widget').querySelector('.helpful-msg').style.display='block';};</script>
    </article>

    <aside class="sidebar"><div class="sidebar-sticky">
      <div class="sidebar-widget">
        <h3>Related Articles</h3>
${relatedHtml}
      </div>
      ${adUnit}
      <div class="sidebar-cta">
        <h3>${ctaSite.heading}</h3>
        <p>${ctaSite.desc}</p>
        <a href="${ctaSite.url}" target="_blank" rel="noopener">${ctaSite.btn}</a>
      </div>
    </div></aside>
  </div>
</main>

<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="footer-brand"><a href="/" class="site-logo" style="color:#fff;">Freelancer<span style="color:#fbbf24;">Guide</span>Hub</a><p>Free business education for independent professionals.</p></div>
      <div class="footer-col"><h4>Contracts</h4><ul>
        <li><a href="/articles/how-to-write-a-freelance-contract.html">Write a Contract</a></li>
        <li><a href="/articles/freelance-contract-template-guide.html">Contract Templates</a></li>
        <li><a href="/articles/what-to-include-in-nda.html">NDA Guide</a></li>
      </ul></div>
      <div class="footer-col"><h4>Finance &amp; Taxes</h4><ul>
        <li><a href="/articles/how-to-invoice-clients-as-freelancer.html">Invoicing Guide</a></li>
        <li><a href="/articles/freelance-tax-guide.html">Tax Guide</a></li>
        <li><a href="/articles/quarterly-taxes-freelancer.html">Quarterly Taxes</a></li>
      </ul></div>
      <div class="footer-col"><h4>Resources</h4><ul>
        <li><a href="/articles/how-to-find-freelance-clients.html">Find Clients</a></li>
        <li><a href="/articles/best-tools-for-freelancers.html">Best Tools</a></li>
        <li><a href="https://contractfixpro.com" target="_blank" rel="noopener">Contract Generator</a></li>
      </ul></div>
    </div>
    <div class="footer-editorial"><p><strong>Editorial Independence:</strong> ${SITE_NAME} content is not influenced by advertisers. Our guides are written independently.</p></div>
    <div class="footer-bottom"><p>&copy; 2026 ${SITE_NAME}.com. All rights reserved.</p><p class="footer-disclaimer">Educational content only. Consult a licensed professional for legal, tax, or financial advice.</p></div>
  </div>
</footer>
<script>
document.getElementById('navToggle').addEventListener('click',()=>document.getElementById('mainNav').classList.toggle('open'));
document.querySelectorAll('.faq-question').forEach(btn=>{btn.addEventListener('click',()=>{btn.classList.toggle('open');btn.nextElementSibling.classList.toggle('open');});});
</script>
<script>(function(){var bar=document.getElementById('read-progress');if(!bar)return;function upd(){var s=document.documentElement;bar.style.width=Math.min(s.scrollTop/(s.scrollHeight-s.clientHeight)*100,100)+'%';}window.addEventListener('scroll',upd,{passive:true});})();</script>
<script>window.addEventListener('scroll',function(){document.getElementById('back-to-top')&&document.getElementById('back-to-top').classList.toggle('visible',window.scrollY>300);});</script>
<button id="back-to-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Back to top">&#8679;</button>
</body>
</html>`;
}

// ─── Index Update ─────────────────────────────────────────────────────────────
function updateIndexHTML(topic, article, slug, imageFilename, today, todayFmt) {
  let html = fs.readFileSync(INDEX_FILE, 'utf8');
  const articleUrl = `articles/${slug}.html`;
  const newListItem = `
    <div class="list-item" onclick="location.href='${articleUrl}';">
      <div class="list-num">1</div>
      <div class="list-body">
        <a href="${articleUrl}" class="cat-tag">${topic.category}</a>
        <h3><a href="${articleUrl}">${article.title}</a></h3>
        <p>${article.excerpt}</p>
        <div class="list-meta">${todayFmt} &middot; ${article.readTime}</div>
        <a href="${articleUrl}" class="read-link">Read article &rarr;</a>
      </div>
    </div>
`;

  html = html.replace(
    /(<div class="article-list">)/,
    `$1${newListItem}`
  );

  let seq = 0;
  html = html.replace(/<div class="list-num">\d+<\/div>/g, () => {
    return `<div class="list-num">${++seq}</div>`;
  });

  // Update ItemList JSON-LD
  const newItemListEntry = `    {
      "@type": "ListItem",
      "position": 1,
      "name": "${article.title.replace(/"/g, '\\"')}",
      "url": "${DOMAIN}/articles/${slug}.html"
    },`;

  html = html.replace(
    /("itemListElement":\s*\[)/,
    `$1\n${newItemListEntry}`
  );

  let posSeq = 0;
  html = html.replace(/"position":\s*\d+/g, () => `"position": ${++posSeq}`);

  // Update article count stat (20+ → 21+, 21+ → 22+, etc.)
  html = html.replace(/(<span>)(\d+)(\+<\/span>)/, (m, pre, n, post) => `${pre}${parseInt(n) + 1}${post}`);

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

// ─── FTP Deploy ───────────────────────────────────────────────────────────────
function deploy() {
  console.log('\n[5/5] Deploying via FTP (node deploy-ftp.js)...');
  const result = spawnSync('node', ['deploy-ftp.js'], {
    cwd: BASE_DIR,
    timeout: 600000,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error('FTP deploy failed (status ' + result.status + ')');
    if (result.stderr) console.error(result.stderr.slice(0, 300));
    throw new Error('FTP deploy failed');
  } else {
    console.log('  FTP deploy complete');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
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
      photographer = img.photographer;
      photographerUrl = img.photographerUrl;
    }
  } catch (e) {
    console.warn('  Image fetch failed:', e.message, '— using fallback image');
  }

  // Step 2: Generate article content
  console.log('\n[2/5] Generating article with Claude API...');
  const article = await generateArticle(topic, imageFilename, today);
  console.log('  Title:', article.title);
  console.log('  Sections:', article.sections.length);

  // Step 3: Build & write article HTML
  console.log('\n[3/5] Building article HTML...');
  const articleHtml = buildArticleHTML(
    topic, article, imageFilename, photographer, photographerUrl,
    topic.slug, today, todayFmt
  );
  const articlePath = path.join(ARTICLES_DIR, `${topic.slug}.html`);
  fs.writeFileSync(articlePath, articleHtml);
  console.log('  Written:', `articles/${topic.slug}.html`);

  // Step 4: Update index.html and sitemap.xml
  console.log('\n[4/5] Updating index.html and sitemap.xml...');
  updateIndexHTML(topic, article, topic.slug, imageFilename, today, todayFmt);
  updateSitemap(topic.slug, today);

  // Step 5: Deploy
  deploy();

  // Step 6: Save topic as used
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
