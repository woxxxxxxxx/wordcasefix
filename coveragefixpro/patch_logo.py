import glob, re

# 写入新 logo.svg
logo_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 52" width="300" height="52">
  <defs><linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#3b6ef5"/></linearGradient></defs>
  <path d="M 38,12 A 16,16 0 1 0 38,40" fill="none" stroke="url(#cg)" stroke-width="7" stroke-linecap="round"/>
  <polyline points="34,20 39,27 47,14" fill="none" stroke="url(#cg)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="60" y="26" font-family="-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif" font-size="19" font-weight="700" fill="#1e3a8a" letter-spacing="-0.4" dominant-baseline="central">Coverage<tspan fill="#1d4ed8">Fix</tspan><tspan fill="#64748b" font-weight="500">Pro</tspan></text>
</svg>'''

favicon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs><linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#3b6ef5"/></linearGradient></defs>
  <path d="M 48,20 A 18,18 0 1 0 48,44" fill="none" stroke="url(#cg)" stroke-width="8" stroke-linecap="round"/>
  <polyline points="44,28 49,35 57,22" fill="none" stroke="url(#cg)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''

open('C:/Users/Administrator/coveragefixpro/logo.svg', 'w', encoding='utf-8').write(logo_svg)
open('C:/Users/Administrator/coveragefixpro/favicon.svg', 'w', encoding='utf-8').write(favicon_svg)
print('SVG files written')

# 1. 修 index.html：文字logo → img，本地绝对路径 → 相对路径
f = 'C:/Users/Administrator/coveragefixpro/index.html'
txt = open(f, encoding='utf-8').read()
txt = txt.replace('<a href="/" class="logo">CoverageFixPro</a>',
                  '<a href="/" class="logo"><img src="/logo.svg" alt="CoverageFixPro" height="32"></a>')
txt = re.sub(r'href="C:/Users/Administrator/[^/]*/coveragefixpro/', 'href="/', txt)
txt = re.sub(r'href="C:\\\\Users\\\\Administrator\\\\[^\\\\]*\\\\coveragefixpro\\\\', 'href="/', txt)
open(f, 'w', encoding='utf-8').write(txt)
print('index.html fixed')

# 2. tools/ 各页 logo 统一
tool_count = 0
for f in glob.glob('C:/Users/Administrator/coveragefixpro/tools/**/*.html', recursive=True):
    txt = open(f, encoding='utf-8').read()
    orig = txt
    txt = re.sub(r'<a href="/"[^>]*style="[^"]*">\s*<img src="/logo\.svg"[^>]*>\s*</a>',
                 '<a href="/" class="logo"><img src="/logo.svg" alt="CoverageFixPro" height="32"></a>', txt)
    txt = re.sub(r'<a href="/" class="logo">CoverageFixPro</a>',
                 '<a href="/" class="logo"><img src="/logo.svg" alt="CoverageFixPro" height="32"></a>', txt)
    txt = re.sub(r'href="C:/Users/Administrator/[^/]*/coveragefixpro/', 'href="/', txt)
    if txt != orig:
        open(f, 'w', encoding='utf-8').write(txt)
        tool_count += 1
print(f'tools pages fixed: {tool_count}')

# 3. favicon 引用升级（无 favicon.svg 的页面补上）
fav_count = 0
for f in glob.glob('C:/Users/Administrator/coveragefixpro/**/*.html', recursive=True):
    txt = open(f, encoding='utf-8').read()
    if 'favicon.svg' not in txt and '<link rel="icon"' in txt:
        txt = txt.replace('<link rel="icon"',
                          '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<link rel="icon"', 1)
        open(f, 'w', encoding='utf-8').write(txt)
        fav_count += 1
print(f'favicon upgraded: {fav_count} pages')
print('all done')
