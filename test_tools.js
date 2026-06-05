const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const vm = require('vm');

const ROOT = 'C:\\Users\\Administrator';
const REPORT_FILE = path.join(ROOT, 'test-report.txt');
const toolFiles = [
  'about.html','age-calculator.html','base64-encoder.html','binary-converter.html',
  'bmi-calculator.html','calculator.html','calorie-calculator.html','case-converter.html',
  'color-picker.html','countdown-timer.html','css-minifier.html','currency-converter.html',
  'date-calculator.html','emoji-picker.html','epoch-converter.html','fancy-text.html',
  'gpa-calculator.html','grade-calculator.html','hash-generator.html','html-encoder.html',
  'http-status-codes.html','index.html','invoice-generator.html','json-formatter.html',
  'loan-calculator.html','lorem-ipsum.html','markdown-editor.html','morse-translator.html',
  'number-generator.html','number-to-words.html','password-generator.html',
  'percentage-calculator.html','privacy-policy.html','qr-generator.html',
  'random-picker.html','regex-tester.html','roman-numeral-converter.html',
  'slug-converter.html','stopwatch.html','text-diff.html','text-repeater.html',
  'text-to-speech.html','tip-calculator.html','typing-test.html','unit-converter.html',
  'uuid-generator.html','word-counter.html','word-frequency.html'
];

const mojibakePatterns = [
  /[一-鿿]{3,}/,        // 3+ consecutive CJK = suspicious in English tool
  /Ã[-¿]/,           // UTF-8 double-encoded
  /Å[-¿]/,           // More double-encoding patterns
  /æ[-¿][-¿]/,
  /å[ -¿][-¿]/,
  /å/,                    // Common mojibake prefix
  /å/,
  /å/,
  /å/,
  /[\\]u[0-9a-f]{4}/i,         // Unicode escape leaks
  /[\\]x[0-9a-f]{2}/i           // Hex escape leaks
];

const results = [];
let totalFixes = 0;

function log(msg) {
  console.log(msg);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkHtmlTags(html) {
  // Strip script and style content
  let stripped = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                     .replace(/<style[\s\S]*?<\/style>/gi, '');
  // Find all opening and closing tags (skip self-closing and void elements)
  const voidElements = new Set(['br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr','!DOCTYPE','!--']);
  const tags = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(stripped)) !== null) {
    const full = m[0];
    const name = m[1].toLowerCase();
    if (voidElements.has(name) || name.startsWith('!')) continue;
    if (full.startsWith('</')) {
      // closing tag
      tags.push({type:'close', name});
    } else if (full.endsWith('/>')) {
      // self-closing
      continue;
    } else {
      tags.push({type:'open', name});
    }
  }
  // Match
  const stack = [];
  const errors = [];
  for (const t of tags) {
    if (t.type === 'open') {
      stack.push(t.name);
    } else {
      if (stack.length === 0) {
        errors.push(`Unexpected closing tag </${t.name}> with no open tag`);
      } else {
        const last = stack[stack.length-1];
        if (last === t.name) {
          stack.pop();
        } else {
          // Check if it matches something deeper
          let found = -1;
          for (let i = stack.length-1; i >= 0; i--) {
            if (stack[i] === t.name) { found = i; break; }
          }
          if (found >= 0) {
            // Close all inner tags that should have been closed
            const unclosed = [];
            while (stack.length > found) {
              unclosed.push(stack.pop());
            }
            stack.pop(); // pop the matching one
            errors.push(`Tag <${t.name}> closed out of order. Unclosed before it: </${unclosed.join('></')}>`);
          } else {
            errors.push(`Mismatched tag: </${t.name}> doesn't match <${last}>`);
          }
        }
      }
    }
  }
  if (stack.length > 0) {
    errors.push(`Unclosed tags: ${stack.map(s => `<${s}>`).join(', ')}`);
  }
  return errors;
}

function findMojibake(content) {
  const found = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const pat of mojibakePatterns) {
      const matches = lines[i].match(pat);
      if (matches) {
        found.push({line: i+1, pattern: pat.source, text: matches[0].substring(0, 40)});
        break; // one per line max
      }
    }
  }
  return found;
}

function checkJsSyntax(jsCode) {
  if (!jsCode.trim()) return [];
  const errors = [];
  try {
    new vm.Script(jsCode, { displayErrors: true });
  } catch (e) {
    errors.push(e.message.substring(0, 120));
  }
  return errors;
}

function findJsCode(html) {
  const scripts = [];
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    const code = m[1].trim();
    if (code) scripts.push(code);
  }
  return scripts;
}

function hasInputs(html) {
  return (/<input\b/i.test(html) || /<textarea\b/i.test(html));
}

function hasButtons(html) {
  return (/<button\b/i.test(html) || /<input\b[^>]*type=["'](?:submit|button)["']/i.test(html));
}

function hasEventBindings(html) {
  // Check onclick attributes
  if (/onclick\s*=/i.test(html)) return {method:'onclick attr', ok:true};
  // Check addEventListener
  if (/addEventListener\s*\(/i.test(html)) return {method:'addEventListener', ok:true};
  // Check jQuery-style
  if (/\$\([^)]*\)\.(?:on|click|bind|change)\s*\(/i.test(html)) return {method:'jQuery event', ok:true};
  // Fallback: check for inline event handlers in HTML
  if (/on\w+\s*=\s*"/i.test(html)) return {method:'inline event attr', ok:true};
  return {method:'none found', ok:false};
}

function hasResultArea(html) {
  // Look for common result container patterns
  const patterns = [
    /class\s*=\s*["'][^"']*result[^"']*["']/i,
    /id\s*=\s*["'][^"']*result[^"']*["']/i,
    /class\s*=\s*["'][^"']*output[^"']*["']/i,
    /id\s*=\s*["'][^"']*output[^"']*["']/i,
    /class\s*=\s*["'][^"']*display[^"']*["']/i,
    /<output\b/i,
    /class\s*=\s*["'][^"']*preview[^"']*["']/i
  ];
  for (const p of patterns) {
    if (p.test(html)) return true;
  }
  return false;
}

function getToolName(filename) {
  return filename.replace('.html', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function fixSingleLineJs(html) {
  // Fix single-line JS IIFE where // comments break everything
  const scriptRe = /<script>[\s\S]*?<\/script>/gi;
  let m;
  let result = html;
  while ((m = scriptRe.exec(result)) !== null) {
    let scriptTag = m[0];
    // Check if the script content is on one physical line
    const innerMatch = scriptTag.match(/<script>(.*?)<\/script>/s);
    if (!innerMatch) continue;
    const inner = innerMatch[1];
    // If the script is wrapped in (function(){...})() on a single line with // comments
    if (inner.includes('//') && (inner.match(/\n/g) || []).length < 3) {
      // Check if there are // comments that would break things
      const lines = inner.split('\n');
      let fixed = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const commentIdx = line.indexOf('//');
        if (commentIdx >= 0) {
          // Check if there's actual code AFTER this // on the same line
          const beforeComment = line.substring(commentIdx);
          // If the // is mid-statement (there's a semicolon or { before it, but also code after it)
          // Actually, in our specific case the // is followed by more code declarations
          // We need to check if the // is inside a function body with more code after
          const afterComment = line.substring(commentIdx + 2);
          if (afterComment.trim()) {
            // Replace // with /* */ to avoid commenting out the rest
            lines[i] = line.substring(0, commentIdx) + '/* ' + afterComment.trim() + ' */';
            fixed = true;
          }
        }
      }
      if (fixed) {
        result = result.replace(innerMatch[0], lines.join('\n'));
        log(`  Fixed single-line // comment issue`);
      }
    }
  }
  return result;
}

function autoFixIssues(filename, html, issues) {
  let fixed = html;
  let fixCount = 0;

  // Fix 1: Single-line JS // comment issue
  const fixedHtml = fixSingleLineJs(fixed);
  if (fixedHtml !== fixed) {
    fixed = fixedHtml;
    fixCount++;
  }

  // Fix 2: Mojibake non-ASCII text in content area
  if (issues.mojibake.length > 0) {
    // Replace common garbled patterns in text/SEO content
    // We skip script/style content for these replacements
    let inScript = false, inStyle = false;
    const lines = fixed.split('\n');
    const newLines = [];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (/<script\b/i.test(line)) inScript = true;
      if (/<style\b/i.test(line)) inStyle = true;
      if (/<\/script>/i.test(line)) inScript = false;
      if (/<\/style>/i.test(line)) inStyle = false;

      if (!inScript && !inStyle) {
        // Only fix non-ASCII in non-script/style content
        // Skip lines that are pure ASCII (no high bytes)
        if (/[\x80-\xff]/.test(line)) {
          // Try to fix garbled CJK or mojibake by removing non-ASCII from visible text
          // But preserve the HTML structure
          const originalLine = line;
          // Strip out garbled characters that appear outside of tag content
          // Actually, this is complex. Let's just report it.
        }
      }
      newLines.push(line);
    }
    fixed = newLines.join('\n');
  }

  // Fix 3: Ensure input event listeners exist if there are inputs but no event bindings
  if (issues.hasInputs && !issues.eventBinding.ok && !filename.includes('privacy-policy') && !filename.includes('about') && !filename.includes('http-status')) {
    // Check if there's a script tag and it has no addEventListener for 'input'
    if (fixed.includes('<script>') && !fixed.includes("addEventListener('input", '') && !fixed.includes('addEventListener("input', '')) {
      // We could add input event listeners, but without knowing the specific form structure,
      // this is risky to auto-patch. Just report it.
      log(`  WARN: ${filename} has inputs but no input event listeners`);
    }
  }

  // Fix 4: Ensure DOCTYPE is present
  if (!fixed.trim().startsWith('<!DOCTYPE html') && !fixed.trim().startsWith('<!doctype html')) {
    fixed = '<!DOCTYPE html>\n' + fixed;
    fixCount++;
    log(`  Fixed: Added missing DOCTYPE`);
  }

  // Fix 5: Ensure charset meta is present
  if (!/charset\s*=/i.test(fixed)) {
    fixed = fixed.replace('<head>', '<head>\n<meta charset="UTF-8">');
    fixCount++;
    log(`  Fixed: Added missing charset meta tag`);
  }

  return {fixed, fixCount};
}

async function main() {
  const reportLines = [];

  for (const filename of toolFiles) {
    const filePath = path.join(ROOT, filename);
    if (!fs.existsSync(filePath)) {
      results.push({filename, error: 'FILE NOT FOUND', issues: {}});
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const toolName = getToolName(filename);
    log(`\n--- Testing: ${filename} ---`);

    const issues = {};
    let autoFixes = 0;

    // 1. Check for inputs
    issues.hasInputs = hasInputs(content);

    // 2. Check for buttons
    issues.hasButtons = hasButtons(content);

    // 3. Check event bindings
    issues.eventBinding = hasEventBindings(content);

    // 4. Check result area
    issues.hasResultArea = hasResultArea(content);

    // 5. Check JS syntax
    const jsCodes = findJsCode(content);
    issues.jsErrors = [];
    for (const code of jsCodes) {
      const errs = checkJsSyntax(code);
      issues.jsErrors.push(...errs);
    }

    // 6. Check HTML tag matching
    issues.htmlErrors = checkHtmlTags(content);

    // 7. Check mojibake
    issues.mojibake = findMojibake(content);

    // 8. Check viewport meta
    issues.hasViewport = /viewport/i.test(content);

    // Log findings
    log(`  Inputs: ${issues.hasInputs ? 'YES' : 'NO'}`);
    log(`  Buttons: ${issues.hasButtons ? 'YES' : 'NO'}`);
    log(`  Events: ${issues.eventBinding.ok ? issues.eventBinding.method : 'NONE FOUND'}`);
    log(`  Result area: ${issues.hasResultArea ? 'YES' : 'NO'}`);
    if (issues.jsErrors.length > 0) log(`  JS errors: ${issues.jsErrors.length}`);
    if (issues.htmlErrors.length > 0) log(`  HTML tag errors: ${issues.htmlErrors.length}`);
    if (issues.mojibake.length > 0) log(`  Mojibake: ${issues.mojibake.length} occurrences`);

    // Auto-fix
    if (issues.jsErrors.length > 0 || issues.htmlErrors.length > 0 || issues.mojibake.length > 0) {
      log(`  Attempting auto-fix...`);
      const {fixed, fixCount} = autoFixIssues(filename, content, issues);
      if (fixCount > 0 || fixed !== content) {
        // Re-check after fix
        const newJsCodes = findJsCode(fixed);
        let newJsErrors = [];
        for (const code of newJsCodes) {
          newJsErrors.push(...checkJsSyntax(code));
        }
        const newHtmlErrors = checkHtmlTags(fixed);
        const newMojibake = findMojibake(fixed);

        if (newJsErrors.length < issues.jsErrors.length ||
            newHtmlErrors.length < issues.htmlErrors.length ||
            newMojibake.length < issues.mojibake.length ||
            fixCount > 0) {
          fs.writeFileSync(filePath, fixed, 'utf-8');
          autoFixes = fixCount + (issues.jsErrors.length - newJsErrors.length) + (issues.htmlErrors.length - newHtmlErrors.length) + (issues.mojibake.length - newMojibake.length);
          issues.fixed = true;
          issues.fixedJsErrors = newJsErrors;
          issues.fixedHtmlErrors = newHtmlErrors;
          issues.fixedMojibake = newMojibake;
          totalFixes += autoFixes;
          log(`  Applied ${autoFixes} fixes`);
        }
      }
    }

    const status = (issues.jsErrors.length === 0 && issues.htmlErrors.length === 0 && issues.mojibake.length === 0) ? 'PASS' : 'ISSUES';
    results.push({filename, status, issues, autoFixes});
  }

  // Generate report
  reportLines.push('=' .repeat(70));
  reportLines.push('  WordCaseFix Tool HTML Files - Test Report');
  reportLines.push('  Generated: ' + new Date().toISOString());
  reportLines.push('=' .repeat(70));
  reportLines.push('');

  // Summary
  const passCount = results.filter(r => r.status === 'PASS').length;
  const issueCount = results.filter(r => r.status === 'ISSUES').length;
  const missingCount = results.filter(r => r.error === 'FILE NOT FOUND').length;

  reportLines.push(`Summary:`);
  reportLines.push(`  Total files: ${toolFiles.length}`);
  reportLines.push(`  Passed:      ${passCount}`);
  reportLines.push(`  With issues: ${issueCount}`);
  reportLines.push(`  Not found:   ${missingCount}`);
  reportLines.push(`  Auto-fixes:  ${totalFixes}`);
  reportLines.push('');

  // Detail
  reportLines.push('─'.repeat(70));
  reportLines.push('  DETAILED RESULTS');
  reportLines.push('─'.repeat(70));
  reportLines.push('');

  for (const r of results) {
    reportLines.push(`${r.filename}  [${r.status}]`);
    if (r.error) {
      reportLines.push(`  ERROR: ${r.error}`);
      continue;
    }
    reportLines.push(`  Input fields:       ${r.issues.hasInputs ? 'YES' : 'NO'}`);
    reportLines.push(`  Buttons present:    ${r.issues.hasButtons ? 'YES' : 'NO'}`);
    reportLines.push(`  Event bindings:     ${r.issues.eventBinding.ok ? r.issues.eventBinding.method : 'NOT FOUND'}`);
    reportLines.push(`  Result area:        ${r.issues.hasResultArea ? 'YES' : 'NO'}`);
    reportLines.push(`  Viewport meta:      ${r.issues.hasViewport ? 'YES' : 'NO'}`);
    if (r.issues.jsErrors && r.issues.jsErrors.length > 0) {
      reportLines.push(`  JS Syntax Errors:`);
      for (const e of r.issues.jsErrors) {
        reportLines.push(`    - ${e}`);
      }
    }
    if (r.issues.htmlErrors && r.issues.htmlErrors.length > 0) {
      reportLines.push(`  HTML Tag Errors:`);
      for (const e of r.issues.htmlErrors) {
        reportLines.push(`    - ${e}`);
      }
    }
    if (r.issues.mojibake && r.issues.mojibake.length > 0) {
      reportLines.push(`  Mojibake Characters:`);
      for (const m of r.issues.mojibake) {
        reportLines.push(`    Line ${m.line}: pattern="${m.pattern}" text="${m.text}"`);
      }
    }
    if (r.issues.fixed) {
      reportLines.push(`  Auto-fixes applied: ${r.autoFixes}`);
      if (r.issues.fixedJsErrors && r.issues.fixedJsErrors.length > 0) {
        reportLines.push(`  Remaining JS issues after fix:`);
        for (const e of r.issues.fixedJsErrors) {
          reportLines.push(`    - ${e}`);
        }
      }
      if (r.issues.fixedHtmlErrors && r.issues.fixedHtmlErrors.length > 0) {
        reportLines.push(`  Remaining HTML issues after fix:`);
        for (const e of r.issues.fixedHtmlErrors) {
          reportLines.push(`    - ${e}`);
        }
      }
    }
    reportLines.push('');
  }

  const reportContent = reportLines.join('\n');
  fs.writeFileSync(REPORT_FILE, reportContent, 'utf-8');
  log(`\n\nReport saved to: ${REPORT_FILE}`);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
