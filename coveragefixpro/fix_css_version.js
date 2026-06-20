const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro';
const OLD='href="/css/style.css"';
const NEW='href="/css/style.css?v=20260615"';

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
  // 清除旧版本号（任意v=数字）并替换
  if(html.includes('/css/style.css')){
    const before=html;
    // 先统一清除已有版本号
    html=html.replace(/href="\/css\/style\.css\?v=\d+"/g,'href="/css/style.css"');
    // 再加新版本号
    html=html.split(OLD).join(NEW);
    if(html!==before){
      fs.writeFileSync(fp,html,'utf8');
      fixed++;
    }
  }
});
console.log('CSS版本号替换文件数:',fixed);

// 验证几个文件
['index.html',
 'tools/auto/car-insurance-premium-estimator.html',
 'tools/business/general-liability-calculator.html'].forEach(function(rel){
  const fp=path.join(base,rel);
  const html=fs.readFileSync(fp,'utf8');
  const m=html.match(/href="\/css\/style\.css[^"]*"/);
  console.log(rel+':',m?m[0]:'未找到');
});
