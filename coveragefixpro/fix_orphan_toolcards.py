"""
Fix orphan <div class="tool-card"> elements that appear right after a </div>
which closed a related-tools block. Absorb them back into the preceding <ul>.
"""
import os, re

ROOT = r"C:\Users\Administrator\coveragefixpro"

# Pattern: end of related-tools block, followed by orphan tool-card divs
ORPHAN_PATTERN = re.compile(
    r'(</ul>\s*\n</div>)'               # end of our normalized related-tools
    r'((?:\s*<div class="tool-card"><a href="([^"]+)"[^>]*>(.*?)</a></div>)+)'  # orphan cards
    r'(\s*\n?\s*</div>)?',              # possible extra closing div
    re.DOTALL
)

def fix_orphans(content):
    def replacer(m):
        closing = m.group(1)          # </ul>\n</div>
        orphan_block = m.group(2)     # all orphan tool-card divs
        extra_close = m.group(5) or ""

        # Extract all links from orphan block
        links = re.findall(r'<a href="([^"]+)"[^>]*>(.*?)</a>', orphan_block, re.DOTALL)
        if not links:
            return m.group(0)

        new_lis = "\n".join(
            f'    <li><a href="{href}">{text.strip()}</a></li>'
            for href, text in links
        )
        # Insert new li items before </ul>
        new_closing = f"{new_lis}\n  </ul>\n</div>"
        return f"  </ul>\n</div>".replace("  </ul>\n</div>", new_closing)

    # Simpler approach: find related-tools blocks and absorb trailing orphans
    # Pattern: </ul>\n</div> followed by one or more <div class="tool-card">..
    pattern = re.compile(
        r'(  </ul>\n</div>)\n'
        r'((?:    <div class="tool-card"><a href="[^"]+">.*?</a></div>\n)+)'
        r'(  </div>\n)?',
        re.DOTALL
    )

    def replacer2(m):
        links = re.findall(r'<a href="([^"]+)"[^>]*>(.*?)</a>', m.group(2), re.DOTALL)
        if not links:
            return m.group(0)
        new_lis = "\n".join(
            f'    <li><a href="{href}">{text.strip()}</a></li>'
            for href, text in links
        )
        result = f"{new_lis}\n  </ul>\n</div>\n"
        if m.group(3):
            result += m.group(3)
        return result

    new_content, n = pattern.subn(replacer2, content)
    return new_content, n

# ---- broader approach: line-based scan ----
def fix_file_linebased(content):
    """Find orphan tool-card divs immediately after a related-tools closing </div>."""
    lines = content.split('\n')
    result = []
    i = 0
    changed = False
    while i < len(lines):
        line = lines[i]
        result.append(line)
        # Detect end of related-tools block
        if line.strip() == '</div>' and i > 0:
            # Look back to check if previous non-blank line was </ul>
            prev = next((lines[j] for j in range(i-1, -1, -1) if lines[j].strip()), '')
            if prev.strip() == '</ul>':
                # Collect following orphan tool-card divs
                j = i + 1
                orphan_links = []
                while j < len(lines):
                    stripped = lines[j].strip()
                    m = re.match(r'<div class="tool-card"><a href="([^"]+)"[^>]*>(.*?)</a></div>', stripped)
                    if m:
                        orphan_links.append((m.group(1), m.group(2)))
                        j += 1
                    elif stripped == '</div>' and orphan_links:
                        # This extra </div> belongs to the broken structure, skip it
                        j += 1
                        break
                    else:
                        break
                if orphan_links:
                    # Remove the closing </ul>\n</div> we just added, inject new li items
                    # result currently ends with the </div> line
                    # Unwind: pop the </div> and </ul>
                    popped_close = result.pop()   # </div>
                    popped_ul = result.pop()       # </ul>
                    for href, text in orphan_links:
                        result.append(f'    <li><a href="{href}">{text.strip()}</a></li>')
                    result.append(popped_ul)       # </ul>
                    result.append(popped_close)    # </div>
                    i = j
                    changed = True
                    continue
        i += 1
    return '\n'.join(result), changed


total = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.git', '__pycache__')]
    for fname in filenames:
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(dirpath, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        if 'tool-card' not in content or 'related-tools' not in content:
            continue
        new_content, changed = fix_file_linebased(content)
        if changed:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            total += 1
            print(f"Fixed: {fpath}")

print(f"\nTotal files fixed: {total}")
