import subprocess, re

old = subprocess.check_output(
    'git -C C:/Users/Administrator/coveragefixpro show 6be3d60:index.html',
    shell=True).decode('utf-8', errors='ignore')

cur = open('C:/Users/Administrator/coveragefixpro/index.html', encoding='utf-8').read()

# 1. 恢复 cat-nav 块（精确匹配 class="cat-nav"）
cat_nav_m = re.search(r'<nav class="cat-nav"[\s\S]*?</nav>', old)
if cat_nav_m:
    cat_nav_html = cat_nav_m.group(0)
    if 'cat-nav' not in cur:
        # 插到 </header> 后面
        cur = cur.replace('</header>', '</header>\n' + cat_nav_html, 1)
        print('cat-nav inserted')
    else:
        print('cat-nav already present, skip')
else:
    print('cat-nav not found in old')

# 2. 恢复 cat-nav CSS（如不存在）
css_m = re.search(r'\.cat-nav\{[\s\S]*?\.cat-nav-link:hover\{[^}]*\}', old)
if css_m and 'cat-nav' not in cur.split('<style')[0] and '.cat-nav{' not in cur:
    css_block = css_m.group(0)
    cur = cur.replace('</style>', css_block + '\n</style>', 1)
    print('cat-nav CSS inserted')

# 3. 恢复 tool-card-icon：从旧版建 url→emoji 映射
icon_map = {}
for m in re.finditer(r'<a href="([^"]+)" class="tool-card"><span class="tool-card-icon">([^<]*)</span>', old):
    icon_map[m.group(1)] = m.group(2)
print(f'icon_map: {len(icon_map)} entries')

# 4. 在当前 tool-card 里按 URL 插入 icon span
def inject_icon(m):
    url = m.group(1)
    inner = m.group(2)
    emoji = icon_map.get(url, '')
    if emoji and '<span class="tool-card-icon">' not in inner:
        inner = f'<span class="tool-card-icon">{emoji}</span>\n          ' + inner
    return f'<a href="{url}" class="tool-card">{inner}</a>'

cur = re.sub(
    r'<a href="([^"]+)" class="tool-card">([\s\S]*?)</a>',
    inject_icon,
    cur
)

# 5. 确保 .tool-card-icon CSS 存在
if 'tool-card-icon' not in cur.split('<style')[0] and '.tool-card-icon{' not in cur:
    icon_css = '.tool-card-icon{font-size:24px;margin-bottom:10px;display:block}'
    cur = cur.replace('</style>', icon_css + '\n</style>', 1)
    print('tool-card-icon CSS inserted')

open('C:/Users/Administrator/coveragefixpro/index.html', 'w', encoding='utf-8').write(cur)
print('done')
