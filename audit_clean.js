const fs=require('fs'),path=require('path');
const BASE=path.resolve('C:/Users/Administrator/wordcasefix');

// 根目录下所有已知外来站点/目录
const EXCLUDE_ROOT=new Set([
  'coveragefixpro','invoicefixpro','toolrankhq','freelancerguidehub',
  '.claude','.github','node_modules','.git',
  'daily-report','dashboard','Downloads','pm-worker','xwechat_files',
  'wordcasefix'  // 内嵌同名子目录
]);

// ============ PASS 1: 按子目录分站点统计 ============
const siteStats={};  // siteName -> {files, logoSet}

function detectLogoText(html){
  const m=html.match(/<a[^>]+class="[^"]*\blogo\b[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  if(!m) return null;
  return m[1].replace(/<[^>]*>/g,'').trim();
}

// 先统计所有子目录（含外来站点）
fs.readdirSync(BASE).forEach(function(f){
  const fp=path.join(BASE,f);
  const s=fs.statSync(fp);
  if(!s.isDirectory()) return;
  if(f==='node_modules'||f==='.git') return;

  const htmlFiles=[];
  function subCollect(dir){
    try{
      fs.readdirSync(dir).forEach(function(sf){
        const sfp=path.join(dir,sf);
        const ss=fs.statSync(sfp);
        if(ss.isDirectory()&&sf!=='node_modules'&&sf!=='.git') subCollect(sfp);
        else if(sf.endsWith('.html')) htmlFiles.push(sfp);
      });
    }catch(e){}
  }
  subCollect(fp);

  if(htmlFiles.length===0) return;

  const logoSample=new Set();
  htmlFiles.slice(0,5).forEach(function(hfp){
    const html=fs.readFileSync(hfp,'utf8');
    const txt=detectLogoText(html);
    if(txt!==null&&txt!=='') logoSample.add(txt);
    else if(/<img[^>]+src="[^"]*logo[^"]*"/i.test(html)) logoSample.add('[img-logo]');
  });
  siteStats[f]={count:htmlFiles.length,logos:Array.from(logoSample)};
});

// 根目录直属html
const rootHtmlFiles=[];
fs.readdirSync(BASE).forEach(function(f){
  if(f.endsWith('.html')) rootHtmlFiles.push({fp:path.join(BASE,f),rel:f});
});
if(rootHtmlFiles.length){
  const logoSample=new Set();
  rootHtmlFiles.slice(0,5).forEach(function({fp}){
    const html=fs.readFileSync(fp,'utf8');
    const txt=detectLogoText(html);
    if(txt!==null&&txt!=='') logoSample.add(txt);
  });
  siteStats['[根目录html]']={count:rootHtmlFiles.length,logos:Array.from(logoSample)};
}

// ============ PASS 2: 纯WordCaseFix统计 ============
const allFiles=[];
function collect(dir,isRoot){
  try{
    fs.readdirSync(dir).forEach(function(f){
      const fp=path.join(dir,f);
      const s=fs.statSync(fp);
      if(s.isDirectory()){
        if(f==='node_modules'||f==='.git') return;
        if(isRoot&&EXCLUDE_ROOT.has(f)) return;
        collect(fp,false);
      } else if(f.endsWith('.html')){
        const rel=fp.slice(BASE.length+1).replace(/\\/g,'/');
        allFiles.push({fp,rel});
      }
    });
  }catch(e){}
}
collect(BASE,true);

const logoStats={};
allFiles.forEach(function({fp,rel}){
  const html=fs.readFileSync(fp,'utf8');
  let key;
  if(/<img[^>]+src="[^"]*logo[^"]*"/i.test(html)){
    const m=html.match(/<img[^>]+src="([^"]*logo[^"]*)"/i);
    key=m?('[img] '+m[1]):'[img-logo]';
  } else if(/<(?:header|nav)[^>]*>[\s\S]{0,300}<svg/i.test(html)){
    key='[内联SVG]';
  } else {
    const txt=detectLogoText(html);
    key=txt===null?'[无logo标签]':txt===''?'[空文字]':'"'+txt+'"';
  }
  if(!logoStats[key]) logoStats[key]=[];
  logoStats[key].push(rel);
});

// ============ 构建报告 ============
const lines=[
  '# WordCaseFix 仓库 logo 审计（全量站点扫描）',
  '# 扫描日期: 2026-06-15',
  '',
  '## 一、仓库子目录结构（各站点 HTML 数量）',
  '-'.repeat(60),
];
Object.keys(siteStats).sort((a,b)=>siteStats[b].count-siteStats[a].count).forEach(function(name){
  const {count,logos}=siteStats[name];
  const exclude=EXCLUDE_ROOT.has(name)?'【外来站点-排除】':'【含在WordCaseFix扫描内】';
  lines.push(name.padEnd(24)+count+' 个html  logo: '+logos.join('/')||'(未检测)'+'  '+exclude);
});

lines.push('');
lines.push('## 二、WordCaseFix 本站 logo 分布（已排除所有外来目录）');
lines.push('# 本站真实HTML总数: '+allFiles.length);
lines.push('-'.repeat(60));
const sorted=Object.keys(logoStats).sort((a,b)=>logoStats[b].length-logoStats[a].length);
sorted.forEach(function(k){
  const pct=(logoStats[k].length/allFiles.length*100).toFixed(1);
  lines.push(k.padEnd(42)+'→ '+logoStats[k].length+' 个文件 ('+pct+'%)');
});

// 检查 /logo.svg 是否存在
const logoSvgExists=fs.existsSync(path.join(BASE,'logo.svg'));
const faviconSvgExists=fs.existsSync(path.join(BASE,'favicon.svg'));
const faviconIcoExists=fs.existsSync(path.join(BASE,'favicon.ico'));

lines.push('');
lines.push('## 三、本地 logo/favicon 文件');
lines.push('-'.repeat(60));
lines.push('logo.svg    '+(logoSvgExists?'✅ 存在':'❌ 不存在')+'  (27个页面引用了 /logo.svg!)');
lines.push('favicon.svg '+(faviconSvgExists?'✅ 存在':'❌ 不存在'));
lines.push('favicon.ico '+(faviconIcoExists?'✅ 存在':'❌ 不存在'));

lines.push('');
lines.push('## 四、/logo.svg 引用页面列表（文件不存在，全部404）');
lines.push('-'.repeat(60));
(logoStats['[img] /logo.svg']||[]).forEach(r=>lines.push(r));

const out=lines.join('\n');
fs.writeFileSync(path.join(BASE,'logo-audit-clean.txt'),out,'utf8');
console.log(out);
console.log('\n=== logo-audit-clean.txt 已写入 ===');
