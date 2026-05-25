#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WordCaseFix HTML Tool Files - Final Test & Fix Script
Checks: structure, events, mojibake. Fixes real issues.
"""

import os
import re
import html.parser
from datetime import datetime

ROOT = r'C:\Users\Administrator'
REPORT_FILE = os.path.join(ROOT, 'test-report.txt')

TOOL_FILES = [
    'about.html', 'age-calculator.html', 'base64-encoder.html', 'binary-converter.html',
    'bmi-calculator.html', 'calculator.html', 'calorie-calculator.html', 'case-converter.html',
    'color-picker.html', 'countdown-timer.html', 'css-minifier.html', 'currency-converter.html',
    'date-calculator.html', 'emoji-picker.html', 'epoch-converter.html', 'fancy-text.html',
    'gpa-calculator.html', 'grade-calculator.html', 'hash-generator.html', 'html-encoder.html',
    'http-status-codes.html', 'index.html', 'invoice-generator.html', 'json-formatter.html',
    'loan-calculator.html', 'lorem-ipsum.html', 'markdown-editor.html', 'morse-translator.html',
    'number-generator.html', 'number-to-words.html', 'password-generator.html',
    'percentage-calculator.html', 'privacy-policy.html', 'qr-generator.html',
    'random-picker.html', 'regex-tester.html', 'roman-numeral-converter.html',
    'slug-converter.html', 'stopwatch.html', 'text-diff.html', 'text-repeater.html',
    'text-to-speech.html', 'tip-calculator.html', 'typing-test.html', 'unit-converter.html',
    'uuid-generator.html', 'word-counter.html', 'word-frequency.html'
]

INFO_PAGES = {'about.html', 'privacy-policy.html', 'http-status-codes.html'}

MOJIBAKE_PATTERNS = [
    re.compile(r'[一-鿿]{3,}'),       # 3+ CJK characters in English tool
]

VOID_ELEMENTS = {
    'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col',
    'embed', 'source', 'track', 'wbr', '!doctype'
}


class HtmlTagChecker(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.tag_stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        tl = tag.lower()
        if tl not in VOID_ELEMENTS:
            self.tag_stack.append(tl)

    def handle_endtag(self, tag):
        tl = tag.lower()
        if tl in VOID_ELEMENTS:
            return
        if not self.tag_stack:
            self.errors.append(f"Unexpected </{tl}> (no open tag)")
            return
        for i in range(len(self.tag_stack) - 1, -1, -1):
            if self.tag_stack[i] == tl:
                unclosed = self.tag_stack[i + 1:]
                del self.tag_stack[i:]
                for uc in unclosed:
                    self.errors.append(f"Tag <{tl}> out of order, inner unclosed: <{uc}>")
                return
        self.errors.append(f"Mismatched </{tl}> (no matching open tag)")


def check_html_tags(html):
    stripped = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    checker = HtmlTagChecker()
    try:
        checker.feed(stripped)
    except Exception:
        pass
    for tag in checker.tag_stack:
        checker.errors.append(f"Unclosed tag: <{tag}>")
    return checker.errors


def find_mojibake(content):
    found = []
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        for pat in MOJIBAKE_PATTERNS:
            m = pat.search(line)
            if m:
                found.append({'line': i, 'text': m.group()[:50]})
                break
    return found


def has_inputs(html):
    return bool(re.search(r'<input\b', html, re.IGNORECASE) or
                re.search(r'<textarea\b', html, re.IGNORECASE))


def has_buttons(html):
    return bool(re.search(r'<button\b', html, re.IGNORECASE) or
                re.search(r'<input\b[^>]*type=[\'"](?:submit|button)[\'"]', html, re.IGNORECASE))


def has_event_bindings(html):
    if re.search(r'addEventListener\s*\(', html):
        return {'method': 'addEventListener()', 'ok': True}
    if re.search(r'onclick\s*=', html, re.IGNORECASE):
        return {'method': 'onclick attr / inline', 'ok': True}
    if re.search(r'\bon\w+\s*=\s*"', html, re.IGNORECASE):
        return {'method': 'inline handler', 'ok': True}
    return {'method': 'NONE FOUND', 'ok': False}


def has_result_area(html):
    patterns = [
        r'class\s*=\s*["\'][^"\']*(?:result|output|preview|display|generated|qr-code|diff|formatted|bmi-number|converted|translated|encoded|decoded)[^"\']*["\']',
        r'id\s*=\s*["\'][^"\']*(?:result|output|preview|display)[^"\']*["\']',
        r'<output\b',
    ]
    for p in patterns:
        if re.search(p, html, re.IGNORECASE):
            return True
    return False


def check_title(html):
    m = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else 'MISSING'


def get_tool_name(filename):
    return ' '.join(p.capitalize() for p in filename.replace('.html', '').split('-'))


def fix_stopwatch_html(html):
    """Fix single-line // comment in stopwatch.html and HTML structure."""
    if 'stopwatch.html' not in html and 'Stopwatch' not in html:
        return html, 0

    fixes = 0
    result = html

    # Fix 1: The // Keyboard shortcuts comment on the single-line JS
    # Pattern: ...recordLap());// Keyboard shortcuts document.addEventListener('keydown',...
    # Fix: break into multiple lines
    old = r'(recordLap\(\)\);// Keyboard shortcuts document\.addEventListener\(\s*\'keydown\'\s*,\s*function\s*\(e\)\s*\{)'
    replacement = r'recordLap());\n    // Keyboard shortcuts\n    document.addEventListener(\x27keydown\x27, function(e) {'
    if re.search(old, result):
        result = re.sub(old, replacement, result)
        fixes += 1

    # Fix 2: The remaining event listener code and braces after comment
    # The closing braces of the keyboard handler need to be on their own line
    # The pattern at end of the single line: ... } });
    # This needs to be on multiple lines
    # Find: `e.preventDefault(); reset(); } });` at the end of the keydown handler
    # And split it properly
    pattern2 = r'if\s*\(e\.key\s*===\s*[\'"]r[\'"]\)\s*\{[^}]*\}\s*\}\);'
    if re.search(pattern2, result):
        result = re.sub(
            r"(if\s*\(e\.key\s*===\s*['\"]r['\"]\)\s*\{)\s*(e\.preventDefault\(\);\s*reset\(\);\s*\}\s*\}\);)",
            r'\1\n        \2\n    });',
            result
        )
        fixes += 1

    return result, fixes


def fix_single_line_scripts(html):
    """Convert // comments to block comments in single-line scripts to avoid commenting out code."""
    def fix_script(match):
        content = match.group(1)
        if content.count('\n') > 5:
            return match.group(0)
        if '//' not in content:
            return match.group(0)

        result = []
        i = 0
        in_string = False
        str_char = None

        while i < len(content):
            ch = content[i]

            # Handle strings
            if ch in ('"', "'", '`'):
                if not in_string:
                    in_string = True
                    str_char = ch
                elif ch == str_char and (i == 0 or content[i-1] != '\\'):
                    in_string = False
                result.append(ch)
                i += 1
                continue
            if in_string:
                result.append(ch)
                i += 1
                continue

            # Handle single-line comment with code after it on same physical line
            if ch == '/' and i + 1 < len(content) and content[i+1] == '/':
                # Find end of line
                eol = content.find('\n', i)
                if eol == -1:
                    eol = len(content)
                comment_text = content[i:eol]
                # Check if there's more code on the same line after the comment
                # For single-line script, content after // on the same line IS the comment
                # BUT some // have code after them on the same physical line
                # We'll split: insert newline before //, let it be a true line comment
                result.append('\n')  # newline before comment
                result.append(comment_text)
                result.append('\n')
                i = eol
                continue

            result.append(ch)
            i += 1

        fixed = ''.join(result).strip()
        if fixed != content:
            return '<script>\n' + fixed + '\n</script>'
        return match.group(0)

    return re.sub(r'<script>(.*?)</script>', fix_script, html, flags=re.DOTALL | re.IGNORECASE)


def main():
    report = []
    report.append('=' * 72)
    report.append('  WordCaseFix HTML Tool Files - Final Test Report')
    report.append(f'  Date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    report.append('=' * 72)
    report.append('')
    report.append(f'  Total files: {len(TOOL_FILES)}')
    report.append('')

    results = []
    total_fixes = 0
    total_real_issues = 0
    pass_count = 0
    warn_count = 0

    for filename in TOOL_FILES:
        filepath = os.path.join(ROOT, filename)
        if not os.path.exists(filepath):
            results.append({'file': filename, 'status': 'NOT FOUND'})
            continue

        content = open(filepath, 'r', encoding='utf-8', errors='replace').read()
        tool_name = get_tool_name(filename)
        issues = []
        warnings = []
        fixed = False
        fix_count = 0

        # ── FEATURE CHECKS ──
        inp = has_inputs(content)
        btns = has_buttons(content)
        evt = has_event_bindings(content)
        res = has_result_area(content)
        vp = bool(re.search(r'viewport', content, re.IGNORECASE))
        title = check_title(content)
        title_ok = bool(re.search(r'WordCaseFix', title))

        # ── HTML TAG CHECK ──
        html_errs = check_html_tags(content)

        # ── MOJIBAKE CHECK ──
        moji = find_mojibake(content)

        # ── SINGLE-LINE JS // CHECK ──
        scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL | re.IGNORECASE)
        single_line_js_comments = []
        for sc in scripts:
            if sc.count('\n') <= 3 and '//' in sc:
                for line in sc.split('\n'):
                    ci = -1
                    # Walk the line tracking string state to find // outside strings
                    in_str = False
                    str_ch = None
                    j = 0
                    while j < len(line):
                        c = line[j]
                        if c in ('"', "'", '`'):
                            if not in_str:
                                in_str = True
                                str_ch = c
                            elif c == str_ch and (j == 0 or line[j-1] != '\\'):
                                in_str = False
                        elif not in_str and c == '/' and j + 1 < len(line) and line[j+1] == '/':
                            ci = j
                            break
                        j += 1
                    if ci >= 0:
                        after = line[ci + 2:].strip()
                        if after:
                            single_line_js_comments.append(after[:60])

        # ── Collect issues ──
        is_info = filename.lower() in INFO_PAGES

        if not is_info and not inp:
            warnings.append("Tool page has no input fields")
        if not is_info and not btns:
            warnings.append("Tool page has no buttons")
        if not is_info and not evt['ok']:
            warnings.append("Tool page has no event bindings - tool won't function")
            issues.append("NO EVENT BINDINGS")
        if not is_info and not res:
            warnings.append("Tool page has no visible result area")
        if not vp:
            warnings.append("Missing viewport meta tag")
        if not title_ok:
            warnings.append(f"Title doesn't mention WordCaseFix: {title}")
        if html_errs:
            for e in html_errs:
                warnings.append(f"HTML: {e}")
                issues.append(f"HTML: {e}")
        if moji:
            for m in moji:
                warnings.append(f"Mojibake line {m['line']}: {m['text']}")
                issues.append(f"Mojibake line {m['line']}")
        if single_line_js_comments:
            for c in single_line_js_comments:
                warnings.append(f"Single-line JS // comment may break code: {c}")
                issues.append(f"DANGEROUS // comment")
            # Auto-fix
            fixed_content = fix_single_line_scripts(content)
            if fixed_content != content:
                content = fixed_content
                fixed = True
                fix_count += 1

        # ── Fix stopwatch.html ──
        if 'stopwatch' in filename:
            fixed_content, sf = fix_stopwatch_html(content)
            if sf > 0:
                content = fixed_content
                fixed = True
                fix_count += sf

        # ── Save if fixed ──
        if fixed:
            open(filepath, 'w', encoding='utf-8').write(content)
            total_fixes += fix_count
            # Re-check HTML after fix
            html_errs = check_html_tags(content)
            if not html_errs and not moji:
                for i in list(issues):
                    if i.startswith('HTML:') or i.startswith('Mojibake') or i.startswith('DANGEROUS'):
                        issues.remove(i)
                        warnings = [w for w in warnings if '// comment' not in w and 'HTML:' not in w and 'Mojibake' not in w]

        is_clean = len(issues) == 0
        has_warnings = len(warnings) > 0
        if is_clean:
            status = 'PASS'
            pass_count += 1
        elif not issues and has_warnings:
            status = 'WARN'
            warn_count += 1
        else:
            status = 'ISSUES'
            total_real_issues += 1

        results.append({
            'file': filename, 'status': status, 'tool': tool_name,
            'inputs': inp, 'buttons': btns, 'events': evt, 'result': res,
            'viewport': vp, 'title': title, 'title_ok': title_ok,
            'html_errs': html_errs, 'moji': moji, 'warnings': warnings,
            'issues': issues, 'fix_count': fix_count
        })

        # Console output
        tag = f"[{status:6s}]"
        fix_tag = f" +{fix_count} fix" if fix_count > 0 else ""
        print(f"{tag} {filename}{fix_tag}")
        if warnings:
            for w in warnings[:3]:
                print(f"       {w}")
        if fix_count > 0:
            print(f"       Auto-fixed {fix_count} issue(s)")

    # Generate report
    report.append(f'  RESULTS SUMMARY')
    report.append(f'  {"Passed:":16s} {pass_count}')
    report.append(f'  {"Warnings:":16s} {warn_count}')
    report.append(f'  {"Issues:":16s} {total_real_issues}')
    report.append(f'  {"Auto-fixes:":16s} {total_fixes}')
    report.append('')
    report.append('─' * 72)
    report.append('')

    for r in results:
        tag = f"[{r['status']:6s}]"
        report.append(f"{tag} {r['file']}")
        if r['status'] == 'NOT FOUND':
            report.append('')
            continue

        report.append(f"  Title:    {r['title']}")
        report.append(f"  Inputs:   {'YES' if r['inputs'] else 'NO':8s}  Buttons: {'YES' if r['buttons'] else 'NO':8s}  "
                      f"Events: {r['events']['method']:20s}  Result: {'YES' if r['result'] else 'NO'}")
        report.append(f"  Viewport: {'YES' if r['viewport'] else 'NO':8s}  WordCaseFix in title: {'YES' if r['title_ok'] else 'NO'}")

        if r['warnings']:
            for w in r['warnings']:
                report.append(f"  ⚠ {w}")
        if r['fix_count'] > 0:
            report.append(f"  ✅ Auto-fixes: {r['fix_count']}")
        if r['html_errs']:
            for e in r['html_errs']:
                report.append(f"  ❌ HTML: {e}")
        if r['moji']:
            for m in r['moji']:
                report.append(f"  ❌ Mojibake line {m['line']}: {m['text']}")
        report.append('')

    report.append('─' * 72)
    report.append('  END OF REPORT')
    report.append('─' * 72)

    open(REPORT_FILE, 'w', encoding='utf-8').write('\n'.join(report))
    print(f"\nReport saved: {REPORT_FILE}")
    print(f"Results: {pass_count} pass, {warn_count} warnings, {total_real_issues} issues, {total_fixes} auto-fixes")


if __name__ == '__main__':
    main()
