const fs=require('fs'),path=require('path');
const BASE=path.resolve('C:/Users/Administrator/wordcasefix');

const EXCLUDE_ROOT=new Set([
  'coveragefixpro','invoicefixpro','toolrankhq','freelancerguidehub',
  '.claude','.github','node_modules','.git',
  'daily-report','dashboard','Downloads','pm-worker','xwechat_files','wordcasefix'
]);

const OLD='<a class="logo" href="/">WordCaseFix</a>';
const NEW='<a class="logo" href="/"><img src="/logo.svg" alt="WordCaseFix" height="32"></a>';

const allFiles=[];
function collect(dir,isRoot){
  fs.readdirSync(dir).forEach(function(f){
    const fp=path.join(dir,f);
    const s=fs.statSync(fp);
    if(s.isDirectory()){
      if(f==='node_modules'||f==='.git') return;
      if(isRoot&&EXCLUDE_ROOT.has(f)) return;
      collect(fp,false);
    } else if(f.endsWith('.html')){
      allFiles.push(fp);
    }
  });
}
collect(BASE,true);

let replaced=0,skipped=0;
allFiles.forEach(function(fp){
  const html=fs.readFileSync(fp,'utf8');
  if(html.includes(OLD)){
    fs.writeFileSync(fp,html.replace(OLD,NEW),'utf8');
    replaced++;
    const rel=fp.slice(BASE.length+1).replace(/\\/g,'/');
    console.log('✅ '+rel);
  } else {
    skipped++;
  }
});

console.log('\n替换: '+replaced+' 个  /  跳过: '+skipped+' 个');
