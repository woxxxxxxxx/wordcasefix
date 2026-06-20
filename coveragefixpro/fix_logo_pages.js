const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro';

const targets=[
  'index.html',
  'tools/auto/index.html',
  'tools/health/index.html',
  'tools/life/index.html'
];

const OLD_LOGO='<a href="/" class="logo">CoverageFixPro</a>';
const NEW_LOGO='<a href="/" class="logo"><img src="/logo.svg" alt="CoverageFixPro" height="32"></a>';

const FAVICON_LINKS='<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<link rel="shortcut icon" href="/favicon.svg">';

targets.forEach(function(rel){
  const fp=path.join(base,rel);
  let html=fs.readFileSync(fp,'utf8');
  let changed=false;

  // 3A: 替换文字logo为img logo
  if(html.includes(OLD_LOGO)){
    html=html.replace(OLD_LOGO,NEW_LOGO);
    changed=true;
    console.log('[logo]  ✅ '+rel);
  }else{
    console.log('[logo]  ⚠️  未找到文字logo: '+rel);
  }

  // 3B: 补favicon（检查是否已有）
  if(!html.includes('favicon')){
    html=html.replace('</head>',FAVICON_LINKS+'\n</head>');
    changed=true;
    console.log('[fav]   ✅ '+rel);
  }else{
    console.log('[fav]   已有favicon，跳过: '+rel);
  }

  if(changed) fs.writeFileSync(fp,html,'utf8');
});

// 验证
console.log('\n=== 验证结果 ===');
targets.forEach(function(rel){
  const html=fs.readFileSync(path.join(base,rel),'utf8');
  const hasImgLogo=html.includes('/logo.svg');
  const hasFavicon=html.includes('/favicon.svg');
  const hasTextLogo=html.includes('>CoverageFixPro</a>');
  console.log(rel+':  img-logo:'+( hasImgLogo?'✅':'❌')+' favicon:'+(hasFavicon?'✅':'❌')+' 文字残留:'+(hasTextLogo?'⚠️':'无'));
});
