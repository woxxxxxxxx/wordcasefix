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

const targets=[
  'calculator-box','calculator-card','calc-box',
  'form-group','input-group',
  'result-row','result-grid','result-item','result-label','result-value','result-note',
  'faq-section','faq-item',
  'explanation','about-section','related-tools','tool-intro','disclaimer',
  'result-box'
];

const stats={};
targets.forEach(function(cls){stats[cls]={count:0,examples:[]};});

allFiles.forEach(function(item){
  const html=fs.readFileSync(item.fp,'utf8');
  targets.forEach(function(cls){
    const re=new RegExp('class="[^"]*\\b'+cls+'\\b[^"]*"');
    if(re.test(html)){
      stats[cls].count++;
      if(stats[cls].examples.length<2) stats[cls].examples.push(item.cat+'/'+item.file);
    }
  });
});

const lines=[
  '# coveragefixpro 工具页 class 使用统计',
  '# 扫描文件数: '+allFiles.length,
  '# 扫描日期: 2026-06-15',
  '',
  '## 计算器容器类',
  'class名               | 文件数 | 示例',
  '-'.repeat(70),
];
['calculator-box','calculator-card','calc-box'].forEach(function(c){
  lines.push(c.padEnd(22)+'| '+String(stats[c].count).padEnd(6)+'| '+stats[c].examples.join(', '));
});
lines.push('');
lines.push('## 输入组类');
lines.push('class名               | 文件数 | 示例');
lines.push('-'.repeat(70));
['form-group','input-group'].forEach(function(c){
  lines.push(c.padEnd(22)+'| '+String(stats[c].count).padEnd(6)+'| '+stats[c].examples.join(', '));
});
lines.push('');
lines.push('## 结果容器/展示类');
lines.push('class名               | 文件数 | 示例');
lines.push('-'.repeat(70));
['result-box','result-row','result-grid','result-item','result-label','result-value','result-note'].forEach(function(c){
  lines.push(c.padEnd(22)+'| '+String(stats[c].count).padEnd(6)+'| '+stats[c].examples.join(', '));
});
lines.push('');
lines.push('## FAQ类');
lines.push('class名               | 文件数 | 示例');
lines.push('-'.repeat(70));
['faq-section','faq-item'].forEach(function(c){
  lines.push(c.padEnd(22)+'| '+String(stats[c].count).padEnd(6)+'| '+stats[c].examples.join(', '));
});
lines.push('');
lines.push('## 其他组件类');
lines.push('class名               | 文件数 | 示例');
lines.push('-'.repeat(70));
['explanation','about-section','related-tools','tool-intro','disclaimer'].forEach(function(c){
  lines.push(c.padEnd(22)+'| '+String(stats[c].count).padEnd(6)+'| '+stats[c].examples.join(', '));
});

// 判断模板类型
lines.push('');
lines.push('## 模板分类推断');
const tplA=Math.max(stats['calculator-box'].count,stats['form-group'].count);
const tplB=Math.max(stats['calculator-card'].count,stats['input-group'].count);
lines.push('模板A (calculator-box+form-group): ~'+tplA+' 个文件');
lines.push('模板B (calculator-card+input-group): ~'+tplB+' 个文件');
lines.push('使用 result-row: '+stats['result-row'].count+' 个文件');
lines.push('使用 result-grid/item: '+Math.max(stats['result-grid'].count,stats['result-item'].count)+' 个文件');

fs.writeFileSync('C:/Users/Administrator/coveragefixpro/class-audit.txt',lines.join('\n'),'utf8');
console.log('已写入 class-audit.txt');
// 也打印到控制台
console.log(lines.join('\n'));
