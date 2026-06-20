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

// ── 1A: 统计 input/select 直接父容器class ──
const parentCounts={};
const radioFiles=[];
const faqStats={faq:0,'faq-section':0,'faq-item-h3p':0,'faq-item-btnDiv':0,'faq-details':0};

allFiles.forEach(function(item){
  const html=fs.readFileSync(item.fp,'utf8');

  // 找所有 <div class="..."> 包含 input 或 select
  // 用简单行扫描法
  const lines=html.split('\n');
  let lastDivClass='none';
  lines.forEach(function(line){
    const dcm=line.match(/class="([^"]+)"/);
    if(line.includes('<div')&&dcm) lastDivClass=dcm[1];
    if(line.includes('<label')&&dcm) lastDivClass=dcm[1]; // label也算容器
    if((line.includes('<input')||line.includes('<select'))&&!line.includes('type="radio')&&!line.includes('type="checkbox')){
      const key=lastDivClass;
      if(!parentCounts[key]) parentCounts[key]={count:0,files:[]};
      parentCounts[key].count++;
      if(parentCounts[key].files.indexOf(item.cat+'/'+item.file)<0)
        parentCounts[key].files.push(item.cat+'/'+item.file);
    }
  });

  // radio检测
  if(html.includes('type="radio"')||html.includes("type='radio'")){
    radioFiles.push(item);
  }

  // FAQ结构检测
  if(html.includes('class="faq"')&&!html.includes('class="faq-')) faqStats.faq++;
  if(html.includes('class="faq-section"')) faqStats['faq-section']++;
  if(html.includes('class="faq-item"')){
    if(html.match(/class="faq-item"[\s\S]{0,200}<h3/)) faqStats['faq-item-h3p']++;
    if(html.match(/class="faq-item"[\s\S]{0,200}<button/)) faqStats['faq-item-btnDiv']++;
  }
  if(html.includes('<details')&&html.includes('class="faq"')) faqStats['faq-details']++;
});

// 1B: radio页面真实HTML样本
const radioSamples=[];
radioFiles.slice(0,3).forEach(function(item){
  const html=fs.readFileSync(item.fp,'utf8');
  // 找radio区块：从第一个 type="radio" 往前250字符、往后500字符
  const idx=html.indexOf('type="radio"');
  if(idx<0) return;
  const start=Math.max(0,idx-400);
  const end=Math.min(html.length,idx+800);
  radioSamples.push({file:item.cat+'/'+item.file, snippet:html.slice(start,end)});
});

// 输出报告
const lines=[
  '# coveragefixpro 表单组件HTML结构审计',
  '# 扫描文件数: '+allFiles.length,
  '',
  '## 1A: input/select 父容器class统计',
];

// 按count排序
const sorted=Object.keys(parentCounts).sort(function(a,b){
  return parentCounts[b].files.length-parentCounts[a].files.length;
});
sorted.slice(0,20).forEach(function(k){
  const v=parentCounts[k];
  lines.push(('class="'+k+'"').padEnd(40)+'文件数:'+v.files.length+'\t示例:'+v.files.slice(0,2).join(', '));
});

lines.push('');
lines.push('## 1B: 含radio的工具页 ('+radioFiles.length+'个)');
radioFiles.forEach(function(f){ lines.push('  '+f.cat+'/'+f.file); });

lines.push('');
lines.push('## 1B 样本HTML (前3个radio页的关键片段)');
radioSamples.forEach(function(s){
  lines.push('\n### '+s.file);
  lines.push(s.snippet);
  lines.push('--- 片段结束 ---');
});

lines.push('');
lines.push('## 1C: FAQ结构统计');
lines.push('.faq（无-section）: '+faqStats.faq+' 个文件');
lines.push('.faq-section: '+faqStats['faq-section']+' 个文件');
lines.push('.faq-item + h3/p结构: '+faqStats['faq-item-h3p']+' 个文件');
lines.push('.faq-item + button折叠: '+faqStats['faq-item-btnDiv']+' 个文件');
lines.push('.faq + details/summary: '+faqStats['faq-details']+' 个文件');

fs.writeFileSync('C:/Users/Administrator/coveragefixpro/form-audit.txt',lines.join('\n'),'utf8');
console.log('已生成 form-audit.txt');
console.log('含radio工具页数:', radioFiles.length);
console.log('radio文件列表:', radioFiles.map(function(f){return f.cat+'/'+f.file;}).join(', '));
