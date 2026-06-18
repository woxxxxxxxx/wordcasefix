const fs = require('fs');
const path = require('path');
const BLOG = 'C:/Users/Administrator/wordcasefix/blog';

// Known metadata for all 34 blog posts
const articles = [
  // Existing 15 (original order from blog/index.html)
  {slug:'title-case-guide.html', date:'June 15, 2025', cat:'Writing & Style', title:'The Complete Guide to Title Case: Rules, Examples & Common Mistakes', excerpt:'Master the core title case rules, learn the differences between AP, Chicago, APA and MLA, and avoid the most frequent capitalization mistakes.'},
  {slug:'snake-case-vs-kebab-case.html', date:'June 15, 2025', cat:'Programming', title:'Snake Case vs Kebab Case: Which Should You Use in Programming?', excerpt:'A head-to-head comparison of snake_case and kebab-case: language support, URL safety, readability, and the right choice for every context.'},
  {slug:'pascal-case-guide.html', date:'June 15, 2025', cat:'Programming', title:'PascalCase Explained: When and How to Use It in Code', excerpt:'Where PascalCase is required, how it differs from camelCase, and concrete examples in C#, Java, TypeScript, React, and Go.'},
  {slug:'text-case-seo.html', date:'June 15, 2025', cat:'SEO', title:'How Text Case Affects SEO: Title Tags, Headings & URLs', excerpt:'Does capitalization affect rankings? Learn how text case influences click-through rates, URL canonicalization, and snippet display.'},
  {slug:'email-capitalization-rules.html', date:'June 15, 2025', cat:'Business Writing', title:'Professional Email Capitalization: Rules Every Writer Should Know', excerpt:'Subject lines, greetings, sign-offs, job titles, and the common mistakes that make business emails look unprofessional.'},
  {slug:'css-naming-conventions.html', date:'June 15, 2025', cat:'Front-End', title:'CSS Naming Conventions: camelCase, BEM, and kebab-case Compared', excerpt:'A practical comparison of BEM, kebab-case, camelCase in CSS Modules, and utility-first systems like Tailwind.'},
  {slug:'ap-style-vs-chicago-capitalization.html', date:'June 15, 2025', cat:'Writing & Style', title:'AP Style vs Chicago Style Capitalization: Key Differences', excerpt:'How AP and Chicago handle prepositions, hyphenated compounds, headlines, and job titles — and which to pick for your project.'},
  {slug:'constant-case-guide.html', date:'June 15, 2025', cat:'Programming', title:'CONSTANT_CASE Guide: Why Programmers Use All Caps with Underscores', excerpt:'Why CONSTANT_CASE is used for constants, env vars, and enums across languages — with rules and concrete examples.'},
  {slug:'json-key-naming-best-practices.html', date:'June 15, 2025', cat:'API Design', title:'JSON Key Naming Best Practices: camelCase vs snake_case', excerpt:'What major APIs do, the trade-offs of each style, and how to translate cleanly between backend and frontend.'},
  {slug:'database-naming-conventions.html', date:'June 15, 2025', cat:'Databases', title:'Database Naming Conventions: snake_case, PascalCase & Best Practices', excerpt:'Best practices for naming tables, columns, indexes and constraints — rules that survive schema migrations.'},
  {slug:'apa-title-case-rules.html', date:'June 1, 2025', cat:'Academic Writing', title:'APA Title Case Rules: Complete Guide for 7th Edition', excerpt:'Master APA 7th edition title case: which words to capitalize, heading levels, and common exceptions — with examples.'},
  {slug:'camel-case-vs-pascal-case.html', date:'June 1, 2025', cat:'Programming', title:'camelCase vs PascalCase: When to Use Each', excerpt:'The visual differences, semantic meaning, and language conventions that determine when to use camelCase vs PascalCase.'},
  {slug:'how-to-capitalize-headings.html', date:'June 1, 2025', cat:'SEO', title:'How to Capitalize Headings for SEO', excerpt:'A practical guide to choosing the right heading capitalization style for blog posts, landing pages, and documentation.'},
  {slug:'sentence-case-vs-title-case.html', date:'June 1, 2025', cat:'Writing & Style', title:'Sentence Case vs. Title Case: When to Use Each', excerpt:'Which capitalization style fits your brand voice? Compare readability, formality, and modern publishing trends.'},
  {slug:'when-to-use-title-case.html', date:'June 1, 2025', cat:'Writing & Style', title:'When to Use Title Case: Rules, Examples & Style Guides', excerpt:'Where title case is expected, where sentence case wins, and how to apply the right style across your content.'},
  // 12 new ones (pomodoro + 11 created this session)
  {slug:'pomodoro-technique-guide.html', date:'June 18, 2025', cat:'Productivity', title:'The Pomodoro Technique: Complete Guide to 25-Minute Focus Sessions', excerpt:'How 25-minute intervals work, the science behind timed focus, and how to adapt the method for deep work, study, and coding.'},
  {slug:'base64-encoding-explained.html', date:'June 18, 2025', cat:'Developer', title:'Base64 Encoding Explained: How It Works and When to Use It', excerpt:'Why Base64 exists, how to encode and decode, and where it appears in JWTs, data URLs, email attachments, and HTTP Basic Auth.'},
  {slug:'color-theory-basics.html', date:'June 18, 2025', cat:'Design', title:'Color Theory Basics: HEX, RGB, HSL Explained for Designers', excerpt:'How color models work, when to use each format, and how to build accessible palettes for web and UI design.'},
  {slug:'markdown-guide.html', date:'June 18, 2025', cat:'Developer', title:'Markdown Guide: Syntax, Flavors, and Best Practices', excerpt:'Complete reference for Markdown — headers, links, tables, code blocks, and the differences between CommonMark, GFM, and MDX.'},
  {slug:'url-encoding-explained.html', date:'June 18, 2025', cat:'Developer', title:'URL Encoding Explained: Percent-Encoding and Special Characters', excerpt:'Why spaces become %20, how percent-encoding works, and what to encode in paths versus query strings.'},
  {slug:'regex-cheatsheet-beginners.html', date:'June 18, 2025', cat:'Developer', title:'Regex Cheatsheet: Patterns Every Developer Should Know', excerpt:'Anchors, quantifiers, groups, lookaheads, and common real-world patterns with examples.'},
  {slug:'unicode-vs-ascii.html', date:'June 18, 2025', cat:'Developer', title:'Unicode vs ASCII: What Every Developer Should Know', excerpt:'How ASCII, UTF-8, and Unicode relate, why emojis are 4 bytes, and how to handle encoding bugs.'},
  {slug:'git-commit-best-practices.html', date:'June 18, 2025', cat:'Developer', title:'Git Commit Message Best Practices: The 7 Rules', excerpt:'Write clear, consistent commit messages that make git log useful — with before/after examples and Conventional Commits.'},
  {slug:'hex-color-codes-guide.html', date:'June 18, 2025', cat:'Design', title:'Hex Color Codes: A Complete Guide for Designers and Developers', excerpt:'How #RRGGBB works, shorthand notation, 8-digit hex with transparency, and converting between HEX, RGB, and HSL.'},
  {slug:'typography-for-web.html', date:'June 18, 2025', cat:'Design', title:'Web Typography Basics: Font Size, Line Height, and Readability', excerpt:'Optimal font size, line height, measure, system font stacks, and the decisions that affect reading comfort.'},
  {slug:'technical-writing-basics.html', date:'June 18, 2025', cat:'Writing', title:'Technical Writing Basics: How to Write Docs People Actually Read', excerpt:'Active voice, sentence length, and the patterns that make technical documentation scannable and useful.'},
  {slug:'password-security-best-practices.html', date:'June 18, 2025', cat:'Security', title:'Password Security in 2026: Length, Entropy & Best Practices', excerpt:'Why length beats complexity, what entropy means for passwords, and what current NIST guidance actually says.'},
  // 7 pre-existing bonus articles
  {slug:'hash-functions-md5-sha256.html', date:'June 18, 2025', cat:'Developer', title:'Hash Functions Explained: MD5, SHA-256, and When to Use Each', excerpt:'How cryptographic hash functions work, the difference between MD5 and SHA-256, and which to use for checksums vs password hashing.'},
  {slug:'json-formatting-guide.html', date:'June 18, 2025', cat:'Developer', title:'JSON Formatting Guide: Syntax, Validation, and Best Practices', excerpt:'JSON syntax rules, common validation errors, pretty-printing conventions, and when to use JSON vs other data formats.'},
  {slug:'markdown-syntax-guide.html', date:'June 18, 2025', cat:'Developer', title:'Markdown Syntax Quick Reference: Tables, Code, and Extensions', excerpt:'A concise reference for Markdown syntax with emphasis on tables, fenced code blocks, task lists, and GFM extensions.'},
  {slug:'qr-code-best-practices.html', date:'June 18, 2025', cat:'Developer', title:'QR Code Best Practices: Size, Error Correction, and Design Tips', excerpt:'Optimal QR code size, error correction levels, color contrast requirements, and how to embed logos without breaking scannability.'},
  {slug:'unit-conversion-reference.html', date:'June 18, 2025', cat:'Developer', title:'Unit Conversion Reference: Length, Weight, Temperature & More', excerpt:'Quick reference for the most common unit conversions across length, weight, temperature, area, and volume.'},
  {slug:'url-encoding-when-to-use.html', date:'June 18, 2025', cat:'Developer', title:'URL Encoding: When and What to Encode in Practice', excerpt:'Practical guidance on which characters to encode in path segments, query strings, hash fragments, and HTTP headers.'},
  {slug:'uuid-vs-nanoid-comparison.html', date:'June 18, 2025', cat:'Developer', title:'UUID vs NanoID: Which Unique Identifier Should You Use?', excerpt:'A side-by-side comparison of UUID v4 and NanoID — size, collision probability, URL-safety, and which to choose.'}
];

const cards = articles.map(a => `
    <div class="card">
      <div class="meta">${a.date} · ${a.cat}</div>
      <h2><a href="/blog/${a.slug}">${a.title}</a></h2>
      <p class="excerpt">${a.excerpt}</p>
      <a class="read-more" href="/blog/${a.slug}">Read More →</a>
    </div>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZRF2KKPS30"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-ZRF2KKPS30');</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>WordCaseFix Blog — Guides on Text Case, Naming Conventions & Style</title>
<meta name="description" content="In-depth guides on text case, capitalization rules, programming naming conventions, SEO, and writing style from the WordCaseFix team.">
<meta name="keywords" content="text case blog, capitalization guides, naming convention guides, writing style blog, SEO writing">
<meta property="og:title" content="WordCaseFix Blog — Guides on Text Case, Naming Conventions & Style">
<meta property="og:description" content="In-depth guides on text case, capitalization rules, naming conventions, SEO, and writing style.">
<meta property="og:type" content="website">
<link rel="canonical" href="https://wordcasefix.com/blog/">
<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" href="/favicon.ico" type="image/x-icon">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f4f5f7;color:#1a1a2e;min-height:100vh;display:flex;flex-direction:column}
.navbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 24px;background:#fff;border-bottom:1.5px solid #e8e9ed;flex-shrink:0}
.navbar .logo{font-size:18px;font-weight:800;color:#5b5bd6;text-decoration:none;letter-spacing:-.3px}
.navbar .nav-all{font-size:13px;font-weight:600;color:#5b5bd6;text-decoration:none;padding:6px 14px;border:1.5px solid #5b5bd6;border-radius:6px;transition:background .2s,color .2s}
.navbar .nav-all:hover{background:#5b5bd6;color:#fff}
.ad-slot{background:#e8e9ed;border:1px dashed #bbb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#888;font-size:13px;position:relative}
.ad-top{width:100%;height:90px;margin-bottom:24px}
.ad-label{position:absolute;top:6px;left:10px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#999}
.page-wrap{max-width:1100px;margin:0 auto;width:100%;padding:36px 24px 60px}
.breadcrumb{font-size:13px;color:#888;margin-bottom:20px}
.breadcrumb a{color:#5b5bd6;text-decoration:none;font-weight:500}
.breadcrumb a:hover{text-decoration:underline}
.breadcrumb span{margin:0 6px;color:#aaa}
h1.page-h1{font-size:34px;font-weight:800;line-height:1.2;color:#1a1a2e;margin-bottom:8px;letter-spacing:-.5px}
.page-sub{font-size:15px;color:#666;margin-bottom:32px;line-height:1.6}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.card{background:#fff;border-radius:12px;padding:22px 22px 20px;box-shadow:0 1px 3px rgba(0,0,0,.08);display:flex;flex-direction:column;transition:transform .15s,box-shadow .15s}
.card:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(91,91,214,.12)}
.card h2{font-size:17px;font-weight:700;line-height:1.35;margin-bottom:10px}
.card h2 a{color:#1a1a2e;text-decoration:none}
.card h2 a:hover{color:#5b5bd6}
.card p.excerpt{font-size:14px;color:#555;line-height:1.6;margin-bottom:14px;flex-grow:1}
.card .meta{font-size:12px;color:#999;margin-bottom:10px;letter-spacing:.3px}
.card .read-more{font-size:13px;font-weight:600;color:#5b5bd6;text-decoration:none}
.card .read-more:hover{text-decoration:underline}
footer{text-align:center;padding:24px 16px 32px;font-size:13px;color:#999;margin-top:auto}
footer a{color:#5b5bd6;text-decoration:none}
footer a:hover{text-decoration:underline}
@media(max-width:600px){h1.page-h1{font-size:26px}}
</style>
</head>
<body>
<nav class="navbar"><a class="logo" href="/"><img src="/logo.svg" alt="WordCaseFix" height="32"></a><a class="nav-all" href="/">All Tools</a></nav>
<div class="ad-slot ad-top"><span class="ad-label">Advertisement</span></div>

<div class="page-wrap">
  <div class="breadcrumb">
    <a href="/">Home</a><span>›</span>
    <span>Blog & Guides</span>
  </div>

  <h1 class="page-h1">Blog & Guides</h1>
  <p class="page-sub">In-depth articles on text case, capitalization rules, programming naming conventions, developer tools, design, and writing standards. Bookmark this page — we publish new guides every month.</p>

  <div class="card-grid">
${cards}

  </div>
</div>

<footer>WordCaseFix &mdash; Free online text &amp; utility tools | <a href="/privacy-policy.html">Privacy Policy</a> | <a href="/about.html">About</a></footer>
</body>
</html>`;

fs.writeFileSync(path.join(BLOG, 'index.html'), html, 'utf8');
console.log('blog/index.html rebuilt with ' + articles.length + ' articles');
