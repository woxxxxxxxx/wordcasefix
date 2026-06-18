#!/usr/bin/env python3
"""Remove old duplicate seo-content and faq-section blocks from tool HTML files."""
import re, os, glob

TARGET = os.path.dirname(os.path.abspath(__file__))
files = glob.glob(os.path.join(TARGET, '*.html'))

removed_seo = 0
removed_faq = 0
changed_files = 0

# Pattern: <div class="seo-content">...</div>  (multiline, greedy but stops at next top-level </div>)
# Pattern: <section class="faq-section">...</section>

RE_SEO = re.compile(r'<div class="seo-content">.*?</div>\s*(?=<section class="faq-section"|<div class="related-tools"|<footer|$)', re.DOTALL)
RE_FAQ = re.compile(r'<section class="faq-section">.*?</section>\s*', re.DOTALL)

for fpath in sorted(files):
    fname = os.path.basename(fpath)
    with open(fpath, encoding='utf-8') as f:
        original = f.read()

    txt = original

    # Count and remove seo-content
    seo_matches = RE_SEO.findall(txt)
    if seo_matches:
        txt = RE_SEO.sub('', txt)
        removed_seo += len(seo_matches)

    # Count and remove faq-section
    faq_matches = RE_FAQ.findall(txt)
    if faq_matches:
        txt = RE_FAQ.sub('', txt)
        removed_faq += len(faq_matches)

    if txt != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(txt)
        changed_files += 1
        print(f'  CLEANED: {fname} (seo={len(seo_matches)}, faq={len(faq_matches)})')

print(f'\nSummary:')
print(f'  Files changed:    {changed_files}')
print(f'  seo-content removed: {removed_seo}')
print(f'  faq-section removed: {removed_faq}')
