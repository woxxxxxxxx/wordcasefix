const fs=require('fs');
let html=fs.readFileSync('C:/Users/Administrator/coveragefixpro/index.html','utf8');

// 修复工具卡片本地路径
const BAD='C:/Users/Administrator/coveragefixpro/tools/';
const GOOD='/tools/';
const count=(html.match(new RegExp(BAD.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
html=html.split(BAD).join(GOOD);
fs.writeFileSync('C:/Users/Administrator/coveragefixpro/index.html',html,'utf8');
console.log('index.html 修复本地路径:',count,'处');

// 验证
const remaining=(html.match(/C:\/Users\/Administrator\/coveragefixpro/g)||[]).length;
console.log('仍含本地路径:',remaining,'处');
const gaOk=html.includes('G-5XX4CE3YBR');
const adsenseOk=html.includes('adsbygoogle')||html.includes('adsense');
console.log('GA代码:', gaOk?'存在':'缺失');
console.log('AdSense代码:', adsenseOk?'存在':'缺失（首页暂无AdSense）');
