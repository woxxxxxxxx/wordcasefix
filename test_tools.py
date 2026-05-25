#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WordCaseFix HTML Tool Files - Comprehensive Functional Test Suite
Tests all tool HTML files for structural integrity, event bindings, JS syntax, mojibake, etc.
Auto-fixes detected issues where possible.
"""

import os
import re
import sys
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

# Files that don't need interactivity checks (informational pages)
INFO_PAGES = {'about.html', 'privacy-policy.html', 'http-status-codes.html'}

# Mojibake / garbled character patterns (non-ASCII / corrupted Unicode)
MOJIBAKE_PATTERNS = [
    (re.compile(r'[一-鿿]{3,}'), '3+ consecutive CJK in English tool'),
    (re.compile(r'Ã[-¿]'), 'UTF-8 double-encoded (Ã)'),
    (re.compile(r'[\\]u[0-9a-fA-F]{4}'), 'Unicode escape leak (\\uXXXX)'),
    (re.compile(r'[\\]x[0-9a-fA-F]{2}'), 'Hex escape leak (\\xXX)'),
    (re.compile(r'å[°-ÿ]'), 'Scandinavian mojibake prefix'),
    (re.compile(r'æ[\x90-\xbf][\x80-\xbf]'), 'UTF-8 multi-byte corruption'),
]

# HTML void elements that don't need closing
VOID_ELEMENTS = {
    'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col',
    'embed', 'source', 'track', 'wbr', '!doctype'
}


class SimpleStats:
    def __init__(self):
        self.total = len(TOOL_FILES)
        self.passed = 0
        self.issues = 0
        self.not_found = 0
        self.fixes = 0
        self.results = []


stats = SimpleStats()


def log(msg):
    print(msg)


def get_tool_name(filename):
    name = filename.replace('.html', '')
    parts = name.split('-')
    return ' '.join(p.capitalize() for p in parts)


# ─── HTML Tag Checker ──────────────────────────────────────────────

class HtmlTagChecker(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.tag_stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        tag_lower = tag.lower()
        if tag_lower not in VOID_ELEMENTS:
            self.tag_stack.append(tag_lower)

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower in VOID_ELEMENTS:
            return
        if not self.tag_stack:
            self.errors.append(f"Unexpected closing </{tag_lower}> with no open tag")
            return
        # Walk back in stack to find matching open tag
        for i in range(len(self.tag_stack) - 1, -1, -1):
            if self.tag_stack[i] == tag_lower:
                # Remove everything up to and including match
                unclosed = self.tag_stack[i + 1:]
                del self.tag_stack[i:]
                for uc in unclosed:
                    self.errors.append(
                        f"Tag <{tag_lower}> closed out of order. Inner unclosed: <{uc}>"
                    )
                return
        self.errors.append(f"Mismatched tag: </{tag_lower}> has no matching open tag")


def check_html_tags(html):
    # Strip script and style content to avoid parsing JS/CSS as HTML
    stripped = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    checker = HtmlTagChecker()
    try:
        checker.feed(stripped)
    except html.parser.HTMLParseError as e:
        checker.errors.append(f"Parse error: {e}")
    # Any leftover unclosed tags
    for tag in checker.tag_stack:
        checker.errors.append(f"Unclosed tag: <{tag}>")
    return checker.errors


# ─── Mojibake Checker ─────────────────────────────────────────────

def find_mojibake(content):
    found = []
    lines = content.split('\n')
    for i, line in enumerate(lines, 1):
        for pat, desc in MOJIBAKE_PATTERNS:
            m = pat.search(line)
            if m:
                text = m.group()[:40]
                found.append({'line': i, 'pattern': desc, 'text': text})
                break  # one per line
    return found


# ─── JS Syntax Checker (basic) ────────────────────────────────────

def check_js_syntax(js_code):
    """Best-effort JS syntax check without a JS parser."""
    if not js_code.strip():
        return []
    errors = []

    # Check for common single-line // comment issue:
    # If a // comment exists on a line with code before AND after it,
    # everything after // is commented out.
    lines = js_code.split('\n')
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if '//' in stripped and not stripped.startswith('//'):
            # Check if there's code before // and code after //
            ci = stripped.index('//')
            before = stripped[:ci].strip()
            after = stripped[ci + 2:].strip()
            if before and after and not before.endswith(';') and not before.endswith('{') and not before.endswith('}') and not before.endswith('('):
                # This might be OK if it's a normal mid-line comment
                # But flag if the line would have actual executable code after // that matters
                pass

    # Check basic parentheses, braces, bracket matching
    stack = []
    pairs = {'(': ')', '{': '}', '[': ']'}
    in_string = False
    in_regex = False
    string_char = None
    i = 0
    while i < len(js_code):
        ch = js_code[i]

        # Handle strings
        if not in_regex:
            if ch in ('"', "'", '`') and not in_string:
                in_string = True
                string_char = ch
                i += 1
                continue
            elif in_string and ch == string_char:
                # Check for escape
                if i > 0 and js_code[i-1] == '\\':
                    i += 1
                    continue
                in_string = False
                string_char = None
                i += 1
                continue
            elif in_string:
                i += 1
                continue

        # Handle single-line comment
        if ch == '/' and i + 1 < len(js_code) and js_code[i+1] == '/':
            # Skip to end of line
            while i < len(js_code) and js_code[i] != '\n':
                i += 1
            continue

        # Handle multi-line comment
        if ch == '/' and i + 1 < len(js_code) and js_code[i+1] == '*':
            i += 2
            while i < len(js_code) and not (js_code[i] == '*' and i + 1 < len(js_code) and js_code[i+1] == '/'):
                i += 1
            i += 2
            continue

        # Handle regex literals (simplified)
        if ch == '/' and not in_string:
            # Might be a regex after certain tokens
            in_regex = True
            i += 1
            while i < len(js_code) and js_code[i] != '/':
                if js_code[i] == '\\':
                    i += 2
                    continue
                i += 1
            if i >= len(js_code):
                errors.append(f"char {i}: Unterminated regex literal")
            else:
                i += 1
            in_regex = False
            continue

        if ch in pairs:
            stack.append((ch, i))
        elif ch in ')}]':
            if not stack:
                errors.append(f"char {i}: Unexpected closing {ch}")
            else:
                open_ch, open_pos = stack.pop()
                expected = pairs[open_ch]
                if ch != expected:
                    errors.append(f"char {i}: Expected {expected} but found {ch} (opened at {open_pos})")
        i += 1

    if stack:
        for ch, pos in stack:
            errors.append(f"char {pos}: Unclosed {ch}")

    return errors


# ─── JS Extraction ────────────────────────────────────────────────

def find_js_code(html):
    scripts = []
    for m in re.finditer(r'<script\b[^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
        code = m.group(1).strip()
        if code:
            scripts.append(code)
    return scripts


# ─── Checks ───────────────────────────────────────────────────────

def has_inputs(html):
    return bool(re.search(r'<input\b', html, re.IGNORECASE) or
                re.search(r'<textarea\b', html, re.IGNORECASE))


def has_buttons(html):
    return bool(re.search(r'<button\b', html, re.IGNORECASE) or
                re.search(r'<input\b[^>]*type=[\'"](?:submit|button)[\'"]', html, re.IGNORECASE))


def has_event_bindings(html):
    if re.search(r'onclick\s*=', html, re.IGNORECASE):
        return {'method': 'onclick attribute', 'ok': True}
    if re.search(r'addEventListener\s*\(', html):
        return {'method': 'addEventListener()', 'ok': True}
    if re.search(r'\$\([^)]*\)\.(?:on|click|bind|change)\s*\(', html, re.IGNORECASE):
        return {'method': 'jQuery event', 'ok': True}
    if re.search(r'\bon\w+\s*=\s*"', html, re.IGNORECASE):
        return {'method': 'inline event handler', 'ok': True}
    return {'method': 'none found', 'ok': False}


def has_result_area(html):
    patterns = [
        r'class\s*=\s*["\'][^"\']*result[^"\']*["\']',
        r'id\s*=\s*["\'][^"\']*result[^"\']*["\']',
        r'class\s*=\s*["\'][^"\']*output[^"\']*["\']',
        r'id\s*=\s*["\'][^"\']*output[^"\']*["\']',
        r'<output\b',
        r'class\s*=\s*["\'][^"\']*preview[^"\']*["\']',
        r'class\s*=\s*["\'][^"\']*display[^"\']*["\']',
        r'class\s*=\s*["\'][^"\']*bmi-number[^"\']*["\']',
        r'class\s*=\s*["\'][^"\']*generated[^"\']*["\']',
        r'class\s*=\s*["\'][^"\']*qr-code[^"\']*["\']',
        r'class\s*=\s*["\'][^"\']*diff[^"\']*["\']',
        r'class\s*=\s*["\'][^"\']*formatted[^"\']*["\']',
    ]
    for p in patterns:
        if re.search(p, html, re.IGNORECASE):
            return True
    return False


# ─── Auto-fix Functions ───────────────────────────────────────────

def fix_single_line_js(html):
    """Fix single-line JS IIFE where // comments break the entire script."""
    def fix_script(match):
        script_content = match.group(1)
        # Only process if few newlines (i.e., it's basically single-line)
        if script_content.count('\n') < 3 and '//' in script_content:
            # Check if the first // actually causes problems
            lines = script_content.split('\n')
            new_lines = []
            for line in lines:
                ci = line.find('//')
                if ci >= 0:
                    before = line[:ci]
                    after = line[ci + 2:]
                    # If there's real code after //, convert to block comment
                    if after.strip() and before.strip() and not before.strip().endswith(';'):
                        # This // is mid-statement with code after it = broken
                        # Put everything after // as block comment, keep code before
                        new_lines.append(before + ';' + ' /* ' + after.strip() + ' */')
                        continue
                new_lines.append(line)
            fixed = '\n'.join(new_lines)
            if fixed != script_content:
                print(f"    Fixed single-line // comment issue")
                return '<script>' + fixed + '</script>'
        return match.group(0)

    return re.sub(r'<script>(.*?)</script>', fix_script, html, flags=re.DOTALL | re.IGNORECASE)


def fix_missing_meta_tags(html):
    """Add missing DOCTYPE, charset, viewport meta."""
    fixes = 0
    result = html

    if not re.match(r'<!DOCTYPE html', result, re.IGNORECASE) and not re.match(r'<\?xml', result):
        result = '<!DOCTYPE html>\n' + result
        fixes += 1

    if not re.search(r'charset\s*=', result, re.IGNORECASE):
        result = re.sub(r'<head\b[^>]*>', lambda m: m.group(0) + '\n<meta charset="UTF-8">', result, count=1, flags=re.IGNORECASE)
        fixes += 1

    if not re.search(r'viewport', result, re.IGNORECASE):
        result = re.sub(r'<head\b[^>]*>', lambda m: m.group(0) + '\n<meta name="viewport" content="width=device-width, initial-scale=1.0">', result, count=1, flags=re.IGNORECASE)
        fixes += 1

    return result, fixes


def fix_bmi_calculator_if_broken(html):
    """Check if BMI calculator JS is still on one line with // comments."""
    # Check for the known broken pattern: (function() {// ── DOM refs ──
    if re.search(r'\(function\(\s*\)\s*\{//\s*──', html):
        print("    Detected broken single-line JS IIFE in BMI calculator - need manual rewrite")
    return html, 0


# ─── Main Test Logic ──────────────────────────────────────────────

def test_file(filename):
    filepath = os.path.join(ROOT, filename)
    if not os.path.exists(filepath):
        stats.not_found += 1
        stats.results.append({
            'filename': filename,
            'status': 'NOT FOUND',
            'error': 'File does not exist'
        })
        print(f"  [NOT FOUND]")
        return

    content = open(filepath, 'r', encoding='utf-8', errors='replace').read()
    tool_name = get_tool_name(filename)
    print(f"\n--- Testing: {filename} ---")

    issues = {}

    # 1. Check inputs
    issues['has_inputs'] = has_inputs(content)

    # 2. Check buttons
    issues['has_buttons'] = has_buttons(content)

    # 3. Check event bindings
    issues['event_binding'] = has_event_bindings(content)

    # 4. Check result area
    issues['has_result_area'] = has_result_area(content)

    # 5. Check JS syntax
    js_codes = find_js_code(content)
    issues['js_errors'] = []
    for code in js_codes:
        errors = check_js_syntax(code)
        issues['js_errors'].extend(errors)

    # 6. Check HTML tag matching
    issues['html_errors'] = check_html_tags(content)

    # 7. Check mojibake
    issues['mojibake'] = find_mojibake(content)

    # 8. Check viewport
    issues['has_viewport'] = bool(re.search(r'viewport', content, re.IGNORECASE))

    # 9. Check page title
    title_m = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
    issues['title'] = title_m.group(1).strip() if title_m else 'MISSING'

    # Print findings
    print(f"  Title:    {issues['title'][:60]}")
    print(f"  Inputs:   {'YES' if issues['has_inputs'] else 'NO'}")
    print(f"  Buttons:  {'YES' if issues['has_buttons'] else 'NO'}")
    print(f"  Events:   {issues['event_binding']['method'] if issues['event_binding']['ok'] else 'NONE'}")
    print(f"  Result:   {'YES' if issues['has_result_area'] else 'NO'}")
    print(f"  Viewport: {'YES' if issues['has_viewport'] else 'NO'}")
    if issues['js_errors']:
        print(f"  JS errs:  {len(issues['js_errors'])}")
        for e in issues['js_errors'][:5]:
            print(f"    - {e}")
    if issues['html_errors']:
        print(f"  HTML err: {len(issues['html_errors'])}")
        for e in issues['html_errors'][:5]:
            print(f"    - {e}")
    if issues['mojibake']:
        print(f"  Mojibake: {len(issues['mojibake'])} occurrences")
        for m in issues['mojibake'][:5]:
            print(f"    Line {m['line']}: {m['text']}")

    # ── Auto-fix ──
    fixed_content = content
    fix_count = 0

    # Fix 1: Single-line JS // comment issue
    fixed_content = fix_single_line_js(fixed_content)

    # Fix 2: Missing DOCTYPE, charset, viewport
    fixed_content, meta_fixes = fix_missing_meta_tags(fixed_content)
    fix_count += meta_fixes

    # Fix 3: Specific BMI calculator check
    fixed_content, bmi_fixes = fix_bmi_calculator_if_broken(fixed_content)
    fix_count += bmi_fixes

    # Apply fixes if changed
    if fixed_content != content:
        # Re-check after fix
        new_js = find_js_code(fixed_content)
        new_js_errors = []
        for code in new_js:
            new_js_errors.extend(check_js_syntax(code))
        new_html_errors = check_html_tags(fixed_content)
        new_mojibake = find_mojibake(fixed_content)

        js_fixed = len(issues['js_errors']) - len(new_js_errors)
        html_fixed = len(issues['html_errors']) - len(new_html_errors)
        moji_fixed = len(issues['mojibake']) - len(new_mojibake)

        if js_fixed > 0 or html_fixed > 0 or moji_fixed > 0 or fix_count > 0:
            open(filepath, 'w', encoding='utf-8').write(fixed_content)
            issues['fixed'] = True
            issues['fixes_applied'] = fix_count + max(0, js_fixed) + max(0, html_fixed) + max(0, moji_fixed)
            stats.fixes += issues['fixes_applied']
            print(f"  >>> Applied {issues['fixes_applied']} fixes ({fix_count} structural, {max(0,js_fixed)} JS, {max(0,html_fixed)} HTML, {max(0,moji_fixed)} mojibake)")

    # Determine overall status
    total_issues = len(issues['js_errors']) + len(issues['html_errors']) + len(issues['mojibake'])
    is_info_page = filename.lower() in INFO_PAGES
    # Info pages don't need inputs/buttons/events/results
    content_issues = 0
    if not is_info_page:
        if not issues['has_inputs']: content_issues += 1
        if not issues['has_buttons']: content_issues += 1
        if not issues['event_binding']['ok']: content_issues += 1
        if not issues['has_result_area']: content_issues += 1

    # If we just fixed it and now it's clean, mark PASS
    if issues.get('fixed') and total_issues == 0:
        status = 'PASS (fixed)'
        stats.passed += 1
    elif total_issues == 0 and content_issues == 0:
        status = 'PASS'
        stats.passed += 1
    elif total_issues == 0 and content_issues > 0 and is_info_page:
        status = 'PASS (info page)'
        stats.passed += 1
    elif total_issues == 0 and content_issues > 0:
        status = 'WARN (structural)'
        stats.issues += 1
    else:
        status = 'ISSUES'
        stats.issues += 1

    # Store result
    stats.results.append({
        'filename': filename,
        'status': status,
        'issues': issues,
        'auto_fixes': fix_count,
    })

    print(f"  Status:   [{status}]")


def generate_report():
    lines = []
    lines.append('=' * 70)
    lines.append('  WordCaseFix Tool HTML Files - Comprehensive Test Report')
    lines.append(f'  Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    lines.append('=' * 70)
    lines.append('')

    # Summary
    lines.append('SUMMARY')
    lines.append('─' * 40)
    lines.append(f'  Total files:         {stats.total}')
    lines.append(f'  Passed:              {stats.passed}')
    lines.append(f'  With issues/warnings:{stats.issues}')
    lines.append(f'  Not found:           {stats.not_found}')
    lines.append(f'  Auto-fixes applied:  {stats.fixes}')
    lines.append('')

    # Per-file detail
    lines.append('─' * 70)
    lines.append('  DETAILED RESULTS')
    lines.append('─' * 70)
    lines.append('')

    for r in stats.results:
        lines.append(f"[{r['status']:20s}] {r['filename']}")
        if 'error' in r and r['error']:
            lines.append(f"  ERROR: {r['error']}")
            lines.append('')
            continue
        iss = r['issues']
        lines.append(f"  {'Title':30s} {iss.get('title', 'N/A')}")
        lines.append(f"  {'Input fields':30s} {'YES' if iss['has_inputs'] else 'NO'}")
        lines.append(f"  {'Buttons':30s} {'YES' if iss['has_buttons'] else 'NO'}")
        lines.append(f"  {'Event bindings':30s} {iss['event_binding']['method']}")
        lines.append(f"  {'Result display area':30s} {'YES' if iss['has_result_area'] else 'NO'}")
        lines.append(f"  {'Viewport meta':30s} {'YES' if iss['has_viewport'] else 'NO'}")

        if iss.get('js_errors'):
            lines.append(f"  {'JS Syntax Errors':30s} ({len(iss['js_errors'])} found)")
            for e in iss['js_errors'][:10]:
                lines.append(f"    - {e}")
        if iss.get('html_errors'):
            lines.append(f"  {'HTML Tag Errors':30s} ({len(iss['html_errors'])} found)")
            for e in iss['html_errors'][:10]:
                lines.append(f"    - {e}")
        if iss.get('mojibake'):
            lines.append(f"  {'Mojibake Characters':30s} ({len(iss['mojibake'])} occurrences)")
            for m in iss['mojibake'][:10]:
                lines.append(f"    Line {m['line']}: {m['text']}")

        if iss.get('fixed'):
            lines.append(f"  {'Auto-fixes applied':30s} {iss.get('fixes_applied', 0)}")

        # Warnings for structural issues on tool pages (not info pages)
        if r['filename'].lower() not in INFO_PAGES:
            if not iss['has_inputs']:
                lines.append(f"  {'⚠ Missing inputs':30s} Tool page has no input fields")
            if not iss['has_buttons']:
                lines.append(f"  {'⚠ Missing buttons':30s} Tool page has no buttons")
            if not iss['event_binding']['ok']:
                lines.append(f"  {'⚠ Missing events':30s} Tool page has no event bindings")
            if not iss['has_result_area']:
                lines.append(f"  {'⚠ Missing result area':30s} Tool page has no result display")

        lines.append('')

    lines.append('─' * 70)
    lines.append('  END OF REPORT')
    lines.append('─' * 70)

    report = '\n'.join(lines)
    open(REPORT_FILE, 'w', encoding='utf-8').write(report)
    print(f"\n\nReport saved to: {REPORT_FILE}")


if __name__ == '__main__':
    print("=" * 60)
    print("  WordCaseFix HTML Tool Files - Functional Test Suite")
    print("=" * 60)

    for fname in TOOL_FILES:
        try:
            test_file(fname)
        except Exception as e:
            import traceback
            print(f"  ERROR testing {fname}: {e}")
            traceback.print_exc()

    generate_report()
