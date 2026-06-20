import os

OLD = '<a href="/" style="text-decoration:none;display:flex;align-items:center;gap:8px"><svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg"><rect width="28" height="28" rx="6" fill="#1d4ed8"/><text x="7" y="20" font-family="Arial" font-size="16" font-weight="900" fill="white">C</text></svg><span style="font-size:18px;font-weight:700;color:#1d4ed8">CoverageFixPro</span></a>'
NEW = '<a href="/" style="text-decoration:none;display:flex;align-items:center;gap:8px"><img src="/logo.svg" alt="CoverageFixPro" height="32" style="vertical-align:middle"></a>'

count = 0
skipped = 0
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for fname in files:
        if not fname.endswith('.html'):
            continue
        path = os.path.join(root, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        if OLD in content:
            content = content.replace(OLD, NEW)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            count += 1
        else:
            skipped += 1

print(f'Updated: {count}, Skipped: {skipped}')
