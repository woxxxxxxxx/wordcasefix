const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro';
const OLD='href="/css/style.css?v=20260615"';
const NEW='href="/css/style.css?v=20260615b"';

const allFiles=[];
function collectHtml(dir){
  try{
    fs.readdirSync(dir).forEach(function(f){
      const fp=path.join(dir,f);
      const stat=fs.statSync(fp);
      if(stat.isDirectory()&&f!=='node_modules'&&f!=='.git') collectHtml(fp);
      else if(f.endsWith('.html')) allFiles.push(fp);
    });
  }catch(e){}
}
collectHtml(base);

let fixed=0;
allFiles.forEach(function(fp){
  let html=fs.readFileSync(fp,'utf8');
  if(html.includes(OLD)){
    html=html.split(OLD).join(NEW);
    fs.writeFileSync(fp,html,'utf8');
    fixed++;
  }
});
console.log('版本号更新文件数:',fixed);

// 抽样验证
['index.html','tools/auto/car-insurance-premium-estimator.html','tools/life/disability-vs-life-insurance-calculator.html'].forEach(function(rel){
  const fp=path.join(base,rel);
  const html=fs.readFileSync(fp,'utf8');
  const m=html.match(/href="\/css\/style\.css[^"]*"/);
  console.log(rel+':',m?m[0]:'未找到');
});
