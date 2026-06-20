const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro/tools';
const cats=['auto','business','health','home','life'];
const BAD='https://coveragefixpro.comC:/Users/Administrator/coveragefixpro/tools/';
const GOOD='https://coveragefixpro.com/tools/';
let fixedFiles=0,fixedTotal=0;
cats.forEach(cat=>{
  const dir=path.join(base,cat);
  fs.readdirSync(dir).filter(f=>f.endsWith('.html')).forEach(f=>{
    const fp=path.join(dir,f);
    let html=fs.readFileSync(fp,'utf8');
    if(html.includes(BAD)){
      const escaped=BAD.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const count=(html.match(new RegExp(escaped,'g'))||[]).length;
      html=html.split(BAD).join(GOOD);
      fs.writeFileSync(fp,html,'utf8');
      fixedFiles++;
      fixedTotal+=count;
    }
  });
});
console.log('修复文件数:',fixedFiles);
console.log('替换次数:',fixedTotal);
