const fs=require('fs');
let html=fs.readFileSync('C:/Users/Administrator/coveragefixpro/index.html','utf8');

// STEP 2A: 追加CSS到 </style>
const extraCss=`
/* 信任数据栏 */
.trust-bar{background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 20px}
.trust-inner{max-width:1100px;margin:0 auto;display:flex;justify-content:center;gap:40px;flex-wrap:wrap}
.trust-item{text-align:center}
.trust-num{font-size:22px;font-weight:800;color:#1d4ed8;line-height:1}
.trust-label{font-size:12px;color:#64748b;margin-top:3px;font-weight:500}

/* 分类快捷导航 */
.cat-nav{background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:64px;z-index:40;overflow-x:auto;scrollbar-width:none}
.cat-nav::-webkit-scrollbar{display:none}
.cat-nav-inner{max-width:1100px;margin:0 auto;display:flex;padding:0 20px;height:44px;align-items:center;gap:0}
.cat-nav-link{display:flex;align-items:center;height:44px;padding:0 16px;font-size:13px;font-weight:600;color:#475569;text-decoration:none;white-space:nowrap;border-bottom:2px solid transparent;transition:all .15s}
.cat-nav-link:hover{color:#1d4ed8;border-bottom-color:#1d4ed8}

/* 工具卡片图标 */
.tool-card-icon{font-size:24px;margin-bottom:10px;display:block}
.tool-card h3{font-size:14px;font-weight:700;color:#1e293b;margin-bottom:6px;line-height:1.4}
.tool-card p{font-size:12px;color:#64748b;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
`;
html=html.replace('</style>', extraCss+'</style>');

// STEP 4: hero区CTA按钮（在 hero-badges 之后插入）
const ctaBtns=`
<div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
  <a href="#auto" style="padding:12px 28px;background:#fff;color:#1d4ed8;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px">Browse Calculators ↓</a>
  <a href="/tools/auto/" style="padding:12px 28px;background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.4);border-radius:8px;font-weight:600;text-decoration:none;font-size:15px">Auto Insurance →</a>
</div>`;
html=html.replace('</div>\n</div>\n\n<main', '</div>'+ctaBtns+'\n</div>\n\n<main');

// STEP 2B: 插入 trust-bar 和 cat-nav（在 hero div 结束后、main 之前）
const trustAndNav=`
<!-- 信任数据栏 -->
<div class="trust-bar">
  <div class="trust-inner">
    <div class="trust-item"><div class="trust-num">120</div><div class="trust-label">Free Calculators</div></div>
    <div class="trust-item"><div class="trust-num">5</div><div class="trust-label">Coverage Categories</div></div>
    <div class="trust-item"><div class="trust-num">0</div><div class="trust-label">Signup Required</div></div>
    <div class="trust-item"><div class="trust-num">∞</div><div class="trust-label">Free Uses</div></div>
  </div>
</div>

<!-- 分类快捷导航 -->
<nav class="cat-nav" aria-label="Categories">
  <div class="cat-nav-inner">
    <a class="cat-nav-link" href="#auto">🚗 Auto (25)</a>
    <a class="cat-nav-link" href="#health">🏥 Health (25)</a>
    <a class="cat-nav-link" href="#home">🏠 Home (25)</a>
    <a class="cat-nav-link" href="#life">💼 Life (25)</a>
    <a class="cat-nav-link" href="#business">🏢 Business (20)</a>
  </div>
</nav>
`;
html=html.replace('\n<main class="site-main">', trustAndNav+'\n<main class="site-main">');

// STEP 2C: 删除 .site-intro div
html=html.replace(/\n  <div class="site-intro">[\s\S]*?<\/div>\n\n/, '\n\n');

// STEP 3: 为每个分类的 tool-card 添加图标
// auto分类
html=html.replace(/(id="auto"[\s\S]*?<\/section>)/g, function(sec){
  return sec.replace(/<a href="\/tools\/auto\/[^"]*" class="tool-card">/g, function(m){
    return m+'<span class="tool-card-icon">🚗</span>';
  });
});
// health分类
html=html.replace(/(id="health"[\s\S]*?<\/section>)/g, function(sec){
  return sec.replace(/<a href="\/tools\/health\/[^"]*" class="tool-card">/g, function(m){
    return m+'<span class="tool-card-icon">🏥</span>';
  });
});
// home分类
html=html.replace(/(id="home"[\s\S]*?<\/section>)/g, function(sec){
  return sec.replace(/<a href="\/tools\/home\/[^"]*" class="tool-card">/g, function(m){
    return m+'<span class="tool-card-icon">🏠</span>';
  });
});
// life分类
html=html.replace(/(id="life"[\s\S]*?<\/section>)/g, function(sec){
  return sec.replace(/<a href="\/tools\/life\/[^"]*" class="tool-card">/g, function(m){
    return m+'<span class="tool-card-icon">💼</span>';
  });
});
// business分类
html=html.replace(/(id="business"[\s\S]*?<\/section>)/g, function(sec){
  return sec.replace(/<a href="\/tools\/business\/[^"]*" class="tool-card">/g, function(m){
    return m+'<span class="tool-card-icon">🏢</span>';
  });
});

fs.writeFileSync('C:/Users/Administrator/coveragefixpro/index.html',html,'utf8');

// 验证
const out=fs.readFileSync('C:/Users/Administrator/coveragefixpro/index.html','utf8');
console.log('trust-bar:', out.includes('trust-bar')?'已添加':'未找到');
console.log('cat-nav:', out.includes('cat-nav')?'已添加':'未找到');
console.log('site-intro删除:', !out.includes('site-intro')?'已删除':'仍存在');
console.log('CTA按钮:', out.includes('Browse Calculators')?'已添加':'未找到');
const iconCount=(out.match(/tool-card-icon/g)||[]).length;
console.log('工具卡片图标数量:', iconCount);
console.log('本地路径残留:', (out.match(/C:\/Users/g)||[]).length);
