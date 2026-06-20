import os

FAVICON_TAGS = '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<link rel="shortcut icon" href="/favicon.svg">\n'

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
        if 'favicon.svg' in content:
            skipped += 1
            continue
        if '</head>' not in content:
            skipped += 1
            continue
        content = content.replace('</head>', FAVICON_TAGS + '</head>', 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        count += 1

print(f'Updated: {count}, Skipped (already has favicon or no </head>): {skipped}')
