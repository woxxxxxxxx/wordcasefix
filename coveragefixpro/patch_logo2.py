import glob, re

for f in glob.glob('C:/Users/Administrator/coveragefixpro/**/*.html', recursive=True):
    txt = open(f, encoding='utf-8').read()
    txt = txt.replace('height="32"', 'height="40"')
    txt = re.sub(r'<link rel="icon"[^>]*favicon\.ico[^>]*>', '', txt)
    txt = re.sub(r'<link rel="icon"[^>]*favicon\.png[^>]*>', '', txt)
    if 'favicon.svg' not in txt:
        txt = txt.replace('<link rel="stylesheet"', '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<link rel="stylesheet"', 1)
    open(f, 'w', encoding='utf-8').write(txt)

print('done')
