import os, re

ROOT = r"C:\Users\Administrator\coveragefixpro"

def extract_related_block(content, start):
    """Find the full <div class="related-tools">...</div> using bracket counting."""
    depth = 0
    i = start
    while i < len(content):
        if content[i:i+4] == '<div':
            depth += 1
            i += 4
        elif content[i:i+6] == '</div>':
            depth -= 1
            i += 6
            if depth == 0:
                return content[start:i]
        else:
            i += 1
    return None

def build_normalized(block):
    """Convert any related-tools block to standard h3 + ul/li."""
    h_match = re.search(r'<h[23][^>]*>(.*?)</h[23]>', block, re.DOTALL)
    heading = h_match.group(1).strip() if h_match else "Related Tools"

    links = re.findall(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', block, re.DOTALL)
    if not links:
        return block

    li_items = "\n".join(
        f'    <li><a href="{href}">{text.strip()}</a></li>'
        for href, text in links
    )
    return f'<div class="related-tools">\n  <h3>{heading}</h3>\n  <ul>\n{li_items}\n  </ul>\n</div>'

def fix_file(content):
    marker = 'class="related-tools"'
    out = []
    pos = 0
    changed = False
    while True:
        idx = content.find('<div ' + marker, pos)
        if idx == -1:
            idx2 = content.find('<div\n' + marker, pos)
            if idx2 == -1:
                break
            idx = idx2
        # find actual div start (may have class= inline)
        div_start = content.rfind('<div', 0, idx+4)
        block = extract_related_block(content, div_start)
        if block is None:
            pos = idx + 1
            continue
        normalized = build_normalized(block)
        if normalized != block:
            out.append(content[pos:div_start])
            out.append(normalized)
            pos = div_start + len(block)
            changed = True
        else:
            pos = div_start + len(block)
    out.append(content[pos:])
    return "".join(out), changed

total_fixed = 0
total_files = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules', '.git', '__pycache__')]
    for fname in filenames:
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(dirpath, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        if 'related-tools' not in content:
            continue
        new_content, changed = fix_file(content)
        if changed:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            total_fixed += 1
        total_files += 1

print(f"Processed {total_files} files with related-tools. Fixed/updated: {total_fixed}.")
