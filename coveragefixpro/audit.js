const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro/tools';
const cats=['auto','business','health','home','life'];
const allFiles=[];
cats.forEach(function(cat){
  const dir=path.join(base,cat);
  fs.readdirSync(dir).filter(function(f){return f.endsWith('.html');}).forEach(function(f){
    allFiles.push({cat:cat,file:f,fp:path.join(dir,f)});
  });
});

const issues={
  canonicalBad:[],
  ogurlBad:[],
  descTruncated:[],
  breadcrumbBad:[],
  jsonldItemBad:[],
  missingTwitter:[],
  missingCalc:[],
  missingAdHide:[]
};

const TRUNCATE_ENDINGS=['and whether it','and how much','and what the','and when','and if you','and to','and whether','to help you','to determine','to understand','to calculate'];

allFiles.forEach(function(item){
  const html=fs.readFileSync(item.fp,'utf8');
  const expectedUrl='https://coveragefixpro.com/tools/'+item.cat+'/'+item.file;

  // 1. canonical
  const canon=html.match(/rel="canonical"\s+href="([^"]+)"/);
  if(!canon||canon[1]!==expectedUrl) issues.canonicalBad.push(item.cat+'/'+item.file+' => '+(canon?canon[1]:'missing'));

  // 2. og:url
  const ogurl=html.match(/property="og:url"\s+content="([^"]+)"/);
  if(!ogurl||ogurl[1]!==expectedUrl) issues.ogurlBad.push(item.cat+'/'+item.file+' => '+(ogurl?ogurl[1]:'missing'));

  // 3. og:description truncated
  const ogdesc=html.match(/property="og:description"\s+content="([^"]+)"/);
  if(ogdesc){
    const desc=ogdesc[1].trim();
    const truncated=TRUNCATE_ENDINGS.some(function(e){return desc.endsWith(e)||desc.endsWith(e+',');});
    if(truncated) issues.descTruncated.push(item.cat+'/'+item.file+' => ...'+desc.slice(-50));
  }

  // 4. JSON-LD breadcrumb item URLs
  const jsonldMatches=html.match(/"item"\s*:\s*"([^"]+)"/g)||[];
  jsonldMatches.forEach(function(m){
    const url=m.match(/"item"\s*:\s*"([^"]+)"/)[1];
    if(url.includes('C:/')||url.includes('comC:')) issues.jsonldItemBad.push(item.cat+'/'+item.file+' => '+url);
  });

  // 5. twitter:card
  if(!html.includes('twitter:card')) issues.missingTwitter.push(item.cat+'/'+item.file);

  // 6. breadcrumb HTML
  if(!html.includes('breadcrumb')) issues.breadcrumbBad.push(item.cat+'/'+item.file);

  // 7. calc() JS function
  if(!html.includes('function calc(')&&!html.includes('function calculate(')&&!html.includes('getElementById')&&!html.includes('addEventListener'))
    issues.missingCalc.push(item.cat+'/'+item.file);

  // 8. ad-placeholder hidden
  if(html.includes('ad-placeholder')&&!html.includes('display:none')&&!html.includes('display: none'))
    issues.missingAdHide.push(item.cat+'/'+item.file);
});

const lines=[
  '# coveragefixpro 全站审计报告',
  '# 扫描日期: 2026-06-14',
  '# 扫描页面: '+allFiles.length,
  '',
  '## 1. canonical URL异常 ['+issues.canonicalBad.length+'个]',
];
if(issues.canonicalBad.length) lines.push(...issues.canonicalBad); else lines.push('无');

lines.push('','## 2. og:url异常 ['+issues.ogurlBad.length+'个]');
if(issues.ogurlBad.length) lines.push(...issues.ogurlBad); else lines.push('无');

lines.push('','## 3. og:description被截断 ['+issues.descTruncated.length+'个]');
if(issues.descTruncated.length) lines.push(...issues.descTruncated); else lines.push('无');

lines.push('','## 4. JSON-LD item URL异常 ['+issues.jsonldItemBad.length+'个]');
if(issues.jsonldItemBad.length) lines.push(...issues.jsonldItemBad.slice(0,20).concat(issues.jsonldItemBad.length>20?['...共'+issues.jsonldItemBad.length+'条']:[])
); else lines.push('无');

lines.push('','## 5. 缺少twitter:card ['+issues.missingTwitter.length+'个]');
if(issues.missingTwitter.length) lines.push(...issues.missingTwitter); else lines.push('无');

lines.push('','## 6. 缺少breadcrumb HTML ['+issues.breadcrumbBad.length+'个]');
if(issues.breadcrumbBad.length) lines.push(...issues.breadcrumbBad); else lines.push('无');

lines.push('','## 7. 缺少JS calc函数 ['+issues.missingCalc.length+'个]');
if(issues.missingCalc.length) lines.push(...issues.missingCalc); else lines.push('无');

lines.push('','## 8. ad-placeholder未隐藏 ['+issues.missingAdHide.length+'个]');
if(issues.missingAdHide.length) lines.push(...issues.missingAdHide); else lines.push('无');

fs.writeFileSync('C:/Users/Administrator/coveragefixpro/coverage-audit-report.txt',lines.join('\n'),'utf8');
console.log('报告已生成');
console.log('canonical异常:',issues.canonicalBad.length);
console.log('og:url异常:',issues.ogurlBad.length);
console.log('描述截断:',issues.descTruncated.length);
console.log('JSON-LD item异常:',issues.jsonldItemBad.length);
console.log('缺twitter:card:',issues.missingTwitter.length);
console.log('缺breadcrumb:',issues.breadcrumbBad.length);
console.log('缺calc函数:',issues.missingCalc.length);
console.log('ad未隐藏:',issues.missingAdHide.length);
