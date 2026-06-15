const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/wordcasefix';

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

const logoStats={};
const faviconHrefStats={};
const faviconRelStats={};
const noFavicon=[];

allFiles.forEach(function(fp){
  const rel=fp.replace(base+path.sep,'').split(path.sep).join('/');
  const html=fs.readFileSync(fp,'utf8');

  // logo检测
  const imgLogoRe=/<img[^>]+src="([^"]*logo[^"]*)"[^>]*>/gi;
  let m, found=false;
  while((m=imgLogoRe.exec(html))!==null){
    const src=m[1];
    if(!logoStats[src]) logoStats[src]=[];
    logoStats[src].push(rel);
    found=true;
  }
  if(!found){
    // 文字logo
    const textM=html.match(/<a[^>]+class="[^"]*logo[^"]*"[^>]*>([^<]+)</i);
    const svgM=/<header[^>]*>[\s\S]{0,300}<svg/.test(html);
    if(textM){
      const key='[文字logo] "'+textM[1].trim()+'"';
      if(!logoStats[key]) logoStats[key]=[];
      logoStats[key].push(rel);
    } else if(svgM){
      if(!logoStats['[内联SVG]']) logoStats['[内联SVG]']=[];
      logoStats['[内联SVG]'].push(rel);
    } else {
      if(!logoStats['[无logo]']) logoStats['[无logo]']=[];
      logoStats['[无logo]'].push(rel);
    }
  }

  // favicon检测
  const favRe=/<link[^>]+rel="([^"]*(?:icon|shortcut)[^"]*)"[^>]*href="([^"]*)"[^>]*>/gi;
  const favRe2=/<link[^>]+href="([^"]*)"[^>]*rel="([^"]*(?:icon|shortcut)[^"]*)"[^>]*>/gi;
  let favFound=false;
  while((m=favRe.exec(html))!==null){
    const relAttr=m[1],href=m[2];
    if(!faviconHrefStats[href]) faviconHrefStats[href]=[];
    if(!faviconHrefStats[href].includes(rel)) faviconHrefStats[href].push(rel);
    if(!faviconRelStats[relAttr]) faviconRelStats[relAttr]=[];
    if(!faviconRelStats[relAttr].includes(rel)) faviconRelStats[relAttr].push(rel);
    favFound=true;
  }
  while((m=favRe2.exec(html))!==null){
    const href=m[1],relAttr=m[2];
    if(!faviconHrefStats[href]) faviconHrefStats[href]=[];
    if(!faviconHrefStats[href].includes(rel)) faviconHrefStats[href].push(rel);
    if(!faviconRelStats[relAttr]) faviconRelStats[relAttr]=[];
    if(!faviconRelStats[relAttr].includes(rel)) faviconRelStats[relAttr].push(rel);
    favFound=true;
  }
  if(!favFound) noFavicon.push(rel);
});

// 检查文件
const checkFiles=['logo.svg','logo.png','favicon.svg','favicon.ico','favicon.png'];
const fileInfo=checkFiles.map(function(name){
  const fp=path.join(base,name);
  if(fs.existsSync(fp)){
    const size=fs.statSync(fp).size;
    const content=fs.readFileSync(fp,'utf8').slice(0,200).replace(/\n/g,' ');
    return {name,exists:true,size,content};
  }
  return {name,exists:false};
});

// 抽样
let logoSample='',faviconSample='';
if(allFiles.length){
  const html=fs.readFileSync(allFiles[0],'utf8');
  const lm=html.match(/<img[^>]*logo[^>]*>|<a[^>]*class="[^"]*logo[^"]*"[^>]*>[^<]*/i);
  if(lm) logoSample=lm[0];
  const fm=html.match(/<link[^>]*(?:icon|shortcut)[^>]*>/gi);
  if(fm) faviconSample=fm.join('\n');
}

const lines=[
  '# WordCaseFix logo + favicon 审计',
  '# 扫描日期: 2026-06-15',
  '# 扫描文件总数: '+allFiles.length,
  '',
  '## 一、logo 引用方式',
  '-'.repeat(60),
];
Object.keys(logoStats).sort((a,b)=>logoStats[b].length-logoStats[a].length).forEach(function(src){
  lines.push(src.padEnd(40)+'→ '+logoStats[src].length+' 个文件');
});
lines.push('');
lines.push('logo标签样本: '+logoSample);

lines.push('');
lines.push('## 二、favicon 引用（按href）');
lines.push('-'.repeat(60));
if(Object.keys(faviconHrefStats).length===0){
  lines.push('（全部文件无favicon link）');
}
Object.keys(faviconHrefStats).sort((a,b)=>faviconHrefStats[b].length-faviconHrefStats[a].length).forEach(function(href){
  lines.push(href.padEnd(40)+'→ '+faviconHrefStats[href].length+' 个文件');
});
lines.push('无favicon link: '+noFavicon.length+' 个文件');
if(noFavicon.length&&noFavicon.length<=5) noFavicon.forEach(f=>lines.push('  '+f));
else if(noFavicon.length>5) lines.push('  （前5）'+noFavicon.slice(0,5).join(', ')+'...');

lines.push('');
lines.push('## 三、favicon rel属性分布');
Object.keys(faviconRelStats).forEach(function(r){
  lines.push(r.padEnd(40)+'→ '+faviconRelStats[r].length+' 个文件');
});
lines.push('');
lines.push('favicon标签样本:\n'+faviconSample);

lines.push('');
lines.push('## 四、本地 logo/favicon 文件');
lines.push('-'.repeat(60));
fileInfo.forEach(function(f){
  if(f.exists){
    lines.push(f.name.padEnd(18)+'✅ '+f.size+' bytes  内容: '+f.content.slice(0,120));
  } else {
    lines.push(f.name.padEnd(18)+'❌ 不存在');
  }
});

lines.push('');
lines.push('## 五、一致性总结');
const logoV=Object.keys(logoStats);
const favV=Object.keys(faviconHrefStats);
lines.push('Logo 变体数: '+logoV.length+(logoV.length===1?' ✅ 全站统一':' ⚠️ 多种'));
lines.push('Favicon 变体数: '+favV.length+(favV.length===1?' ✅ 全站统一':(favV.length===0?' ❌ 全站无favicon':' ⚠️ 多种')));
lines.push('无favicon页: '+noFavicon.length);

const out=lines.join('\n');
fs.writeFileSync(path.join(base,'logo-audit.txt'),out,'utf8');
console.log(out);
