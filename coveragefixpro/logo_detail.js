const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro';
const allFiles=[];
function collect(dir){
  try{
    fs.readdirSync(dir).forEach(function(f){
      const fp=path.join(dir,f);
      const s=fs.statSync(fp);
      if(s.isDirectory()&&f!=='node_modules'&&f!=='.git') collect(fp);
      else if(f.endsWith('.html')) allFiles.push(fp);
    });
  }catch(e){}
}
collect(base);

console.log('=== 无 <img src="/logo.svg"> 的文件 ===');
allFiles.forEach(function(fp){
  const rel=fp.replace(base+path.sep,'').split(path.sep).join('/');
  const html=fs.readFileSync(fp,'utf8');
  const hasLogoImg=/<img[^>]+src="[^"]*logo[^"]*"/i.test(html);
  if(!hasLogoImg){
    const headerM=html.match(/<header[^>]*>([\s\S]{0,300})<\/header>/i);
    const snippet=headerM?headerM[1].replace(/\n/g,' ').replace(/\s+/g,' ').slice(0,120):'无header';
    console.log(rel+'\n  header: '+snippet);
  }
});

console.log('\n=== 无favicon link的文件 ===');
allFiles.forEach(function(fp){
  const rel=fp.replace(base+path.sep,'').split(path.sep).join('/');
  const html=fs.readFileSync(fp,'utf8');
  const hasFavicon=html.includes('favicon')||/<link[^>]+rel="[^"]*icon[^"]*"/.test(html);
  if(!hasFavicon) console.log(rel);
});

console.log('\n=== index.html header 原始内容 ===');
const idxHtml=fs.readFileSync(path.join(base,'index.html'),'utf8');
const hm=idxHtml.match(/<header[^>]*>([\s\S]{0,500})<\/header>/i);
if(hm) console.log(hm[1]);

console.log('\n=== 现有 logo.svg 内容 ===');
const logoContent=fs.readFileSync(path.join(base,'logo.svg'),'utf8');
console.log(logoContent);

console.log('\n=== 现有 favicon.svg 内容 ===');
const faviconContent=fs.readFileSync(path.join(base,'favicon.svg'),'utf8');
console.log(faviconContent);
