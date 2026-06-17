const fs=require('fs'),path=require('path');
const BASE=path.resolve('C:/Users/Administrator/wordcasefix');
const EXCLUDE_ROOT=new Set([
  'coveragefixpro','invoicefixpro','toolrankhq','freelancerguidehub',
  '.claude','.github','node_modules','.git',
  'daily-report','dashboard','Downloads','pm-worker','xwechat_files','wordcasefix'
]);
const OLD='<link rel="icon" href="/favicon.ico" type="image/x-icon">';
const NEW='<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" href="/favicon.ico" type="image/x-icon">';
const allFiles=[];
function collect(dir,isRoot){
  fs.readdirSync(dir).forEach(function(f){
    const fp=path.join(dir,f);
    const s=fs.statSync(fp);
    if(s.isDirectory()){
      if(f==='node_modules'||f==='.git') return;
      if(isRoot&&EXCLUDE_ROOT.has(f)) return;
      collect(fp,false);
    } else if(f.endsWith('.html')) allFiles.push(fp);
  });
}
collect(BASE,true);
let replaced=0,skipped=0;
allFiles.forEach(function(fp){
  const html=fs.readFileSync(fp,'utf8');
  if(html.includes(OLD)){
    fs.writeFileSync(fp,html.replaceAll(OLD,NEW),'utf8');
    replaced++;
  } else skipped++;
});
console.log('替换: '+replaced+' 个  /  跳过: '+skipped+' 个');
// 验证
const withSvg=allFiles.filter(fp=>fs.readFileSync(fp,'utf8').includes('favicon.svg')).length;
console.log('含 favicon.svg: '+withSvg+' 个文件');
