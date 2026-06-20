const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro/tools';
const cats=['auto','business','health','home','life'];
let remaining=0;
cats.forEach(function(cat){
  const dir=path.join(base,cat);
  fs.readdirSync(dir).filter(function(f){return f.endsWith('.html');}).forEach(function(f){
    const html=fs.readFileSync(path.join(dir,f),'utf8');
    if(html.includes('coveragefixpro.comC:'))remaining++;
  });
});
console.log('仍含本地路径文件数:',remaining);
const sample=fs.readFileSync('C:/Users/Administrator/coveragefixpro/tools/auto/car-insurance-premium-estimator.html','utf8');
const canon=sample.match(/rel="canonical"[^>]+>/);
const ogurl=sample.match(/property="og:url"[^>]+>/);
console.log('canonical:', canon ? canon[0] : 'N/A');
console.log('og:url:', ogurl ? ogurl[0] : 'N/A');
