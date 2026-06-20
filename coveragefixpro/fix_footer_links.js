const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro';
const cats=['auto','business','health','home','life'];

// 收集所有html文件
const allFiles=[];
function collectHtml(dir){
  fs.readdirSync(dir).forEach(function(f){
    const fp=path.join(dir,f);
    const stat=fs.statSync(fp);
    if(stat.isDirectory()&&f!=='node_modules'&&f!=='.git') collectHtml(fp);
    else if(f.endsWith('.html')) allFiles.push(fp);
  });
}
collectHtml(base);

let fixed=0;
allFiles.forEach(function(fp){
  let html=fs.readFileSync(fp,'utf8');
  let changed=false;
  // 修复旧锚点链接
  if(html.includes('about.html#privacy')){
    html=html.split('href="/about.html#privacy"').join('href="/privacy-policy.html"');
    html=html.split("href='/about.html#privacy'").join("href='/privacy-policy.html'");
    changed=true;
  }
  if(html.includes('about.html#terms')){
    html=html.split('href="/about.html#terms"').join('href="/terms.html"');
    html=html.split("href='/about.html#terms'").join("href='/terms.html'");
    changed=true;
  }
  // 404.html 没有 footer links，需要检查并确保footer包含完整链接
  if(fp.includes('404.html')){
    if(!html.includes('privacy-policy.html')){
      html=html.replace(
        /<div class="footer-inner">\s*<\/div>/,
        '<div class="footer-inner"><div class="footer-links"><a href="/about.html">About</a><a href="/privacy-policy.html">Privacy Policy</a><a href="/terms.html">Terms</a></div><p>&copy; 2026 CoverageFixPro. All rights reserved.</p></div>'
      );
      changed=true;
    }
  }
  if(changed){
    fs.writeFileSync(fp,html,'utf8');
    fixed++;
    console.log('修复:',fp.replace(base+'/',''));
  }
});
console.log('\n总修复文件数:',fixed);

// 验证
const idx=fs.readFileSync(base+'/index.html','utf8');
console.log('index.html footer验证:');
const privLink=idx.match(/href="\/privacy-policy\.html"/)? '✓':  '✗';
const termsLink=idx.match(/href="\/terms\.html"/)? '✓': '✗';
console.log('  privacy-policy.html链接:',privLink);
console.log('  terms.html链接:',termsLink);
