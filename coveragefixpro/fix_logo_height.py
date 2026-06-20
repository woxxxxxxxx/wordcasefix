import os

OLD = 'height="32" style="vertical-align:middle"'
NEW = 'height="28" style="vertical-align:middle"'

count = 0
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.git')]
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

print(f'Updated: {count}')
