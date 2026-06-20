const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro';

// 收集所有 html
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

// 统计容器
const logoStats={};      // logo src → 文件列表
const faviconStats={};   // favicon href → 文件列表
const faviconRelStats={};// favicon rel attr → 文件列表
const noLogo=[];
const noFavicon=[];

allFiles.forEach(function(fp){
  const rel=fp.replace(base+path.sep,'').replace(/\\/g,'/');
  const html=fs.readFileSync(fp,'utf8');

  // ── logo 检测 ──
  // 匹配 <img src="...logo..." 或 <img ... alt="..." src="...logo..."
  const logoImgRe=/<img[^>]+src="([^"]*logo[^"]*)"[^>]*>/gi;
  let logoMatch, logoFound=false;
  while((logoMatch=logoImgRe.exec(html))!==null){
    const src=logoMatch[1];
    if(!logoStats[src]) logoStats[src]=[];
    logoStats[src].push(rel);
    logoFound=true;
  }
  // 内联SVG logo（含 viewBox 的 svg 在 header 内）
  const headerMatch=html.match(/<header[^>]*>([\s\S]{0,500})<\/header>/i);
  if(headerMatch){
    const headerHtml=headerMatch[1];
    if(!logoFound&&/<svg/.test(headerHtml)){
      if(!logoStats['[内联SVG]']) logoStats['[内联SVG]']=[];
      logoStats['[内联SVG]'].push(rel);
      logoFound=true;
    }
    if(!logoFound&&/logo/i.test(headerHtml)&&!/<img/.test(headerHtml)){
      if(!logoStats['[文字logo或其他]']) logoStats['[文字logo或其他]']=[];
      logoStats['[文字logo或其他]'].push(rel);
      logoFound=true;
    }
  }
  if(!logoFound) noLogo.push(rel);

  // ── favicon 检测 ──
  const faviconRe=/<link[^>]+rel="([^"]*(?:icon|shortcut)[^"]*)"[^>]*href="([^"]*)"[^>]*>/gi;
  const faviconRe2=/<link[^>]+href="([^"]*)"[^>]*rel="([^"]*(?:icon|shortcut)[^"]*)"[^>]*>/gi;
  let favFound=false;
  let match;
  while((match=faviconRe.exec(html))!==null){
    const rel2=match[1], href=match[2];
    if(!faviconStats[href]) faviconStats[href]=[];
    faviconStats[href].push(rel);
    if(!faviconRelStats[rel2]) faviconRelStats[rel2]=[];
    if(!faviconRelStats[rel2].includes(rel)) faviconRelStats[rel2].push(rel);
    favFound=true;
  }
  while((match=faviconRe2.exec(html))!==null){
    const href=match[1], rel2=match[2];
    if(!faviconStats[href]) faviconStats[href]=[];
    if(!faviconStats[href].includes(rel)) faviconStats[href].push(rel);
    if(!faviconRelStats[rel2]) faviconRelStats[rel2]=[];
    if(!faviconRelStats[rel2].includes(rel)) faviconRelStats[rel2].push(rel);
    favFound=true;
  }
  if(!favFound) noFavicon.push(rel);
});

// ── 检查实际文件是否存在 ──
const checkFiles=['logo.svg','logo.png','favicon.svg','favicon.ico','favicon.png'];
const fileInfo=checkFiles.map(function(name){
  const fp=path.join(base,name);
  if(fs.existsSync(fp)){
    const size=fs.statSync(fp).size;
    return {name,exists:true,size};
  }
  return {name,exists:false};
});

// ── 抽取logo img的alt/height/style ──
// 从一个代表文件提取完整img标签
const sampleFile=allFiles.find(f=>f.includes('index.html')&&!f.includes('tools'));
let logoImgSample='';
if(sampleFile){
  const html=fs.readFileSync(sampleFile,'utf8');
  const m=html.match(/<img[^>]+logo[^>]*>/i);
  if(m) logoImgSample=m[0];
}

// ── 抽取一个favicon完整代码样本 ──
let faviconSample='';
if(allFiles.length){
  const html=fs.readFileSync(allFiles[0],'utf8');
  const favLines=[];
  const re=/<link[^>]+(?:icon|shortcut)[^>]*>/gi;
  let m;
  while((m=re.exec(html))!==null) favLines.push(m[0]);
  faviconSample=favLines.join('\n');
}

// ── 生成报告 ──
const lines=[
  '# 全站 logo + favicon 引用审计',
  '# 扫描日期: 2026-06-15',
  '# 扫描文件总数: '+allFiles.length,
  '',
  '## 一、logo 引用方式分布',
  '-'.repeat(70),
];
Object.keys(logoStats).sort((a,b)=>logoStats[b].length-logoStats[a].length).forEach(function(src){
  lines.push(src.padEnd(45)+'→ '+logoStats[src].length+' 个文件');
});
if(noLogo.length) lines.push('【无logo】                                   → '+noLogo.length+' 个文件: '+noLogo.join(', '));
lines.push('');
lines.push('Logo img标签样本（来自index.html）:');
lines.push('  '+logoImgSample);

lines.push('');
lines.push('## 二、favicon 引用方式分布（按href分组）');
lines.push('-'.repeat(70));
Object.keys(faviconStats).sort((a,b)=>faviconStats[b].length-faviconStats[a].length).forEach(function(href){
  lines.push(href.padEnd(45)+'→ '+faviconStats[href].length+' 个文件');
});
if(noFavicon.length) lines.push('【无favicon link】                           → '+noFavicon.length+' 个文件');

lines.push('');
lines.push('## 三、favicon rel属性分布');
lines.push('-'.repeat(70));
Object.keys(faviconRelStats).forEach(function(rel){
  lines.push(rel.padEnd(45)+'→ '+faviconRelStats[rel].length+' 个文件');
});
lines.push('');
lines.push('Favicon link标签样本（来自第一个html）:');
faviconSample.split('\n').forEach(l=>lines.push('  '+l));

lines.push('');
lines.push('## 四、本地 logo/favicon 文件清单');
lines.push('-'.repeat(70));
fileInfo.forEach(function(f){
  if(f.exists){
    lines.push(f.name.padEnd(20)+'✅ 存在  大小: '+f.size+' bytes ('+Math.round(f.size/1024*10)/10+' KB)');
  }else{
    lines.push(f.name.padEnd(20)+'❌ 不存在');
  }
});

lines.push('');
lines.push('## 五、一致性检查');
const logoVariants=Object.keys(logoStats);
const faviconVariants=Object.keys(faviconStats);
lines.push('Logo src 变体数: '+logoVariants.length+(logoVariants.length===1?' ✅ 全站统一':' ⚠️ 存在多种'));
lines.push('Favicon href 变体数: '+faviconVariants.length+(faviconVariants.length===1?' ✅ 全站统一':' ⚠️ 存在多种'));
lines.push('无logo页面: '+noLogo.length);
lines.push('无favicon页面: '+noFavicon.length);

const out=lines.join('\n');
fs.writeFileSync('C:/Users/Administrator/coveragefixpro/logo-audit.txt',out,'utf8');
console.log(out);
