const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro/tools';
const cats=['auto','business','health','home','life'];

// 说明区容器class列表
const explainContainers=[
  'explanation','info-section','description','how-it-works','methodology',
  'about-section','info-box','about-method','calculator-info','tool-info'
];

const results=[];
const tableClassCount={};
let pseudoTableExamples=[];

cats.forEach(function(cat){
  const dir=path.join(base,cat);
  fs.readdirSync(dir).filter(f=>f.endsWith('.html')&&f!=='index.html').forEach(function(f){
    const fp=path.join(dir,f);
    const html=fs.readFileSync(fp,'utf8');

    if(!html.includes('<table')) return; // 无table直接跳过

    // 对每个说明区容器检查是否含table
    explainContainers.forEach(function(cls){
      if(!html.includes('class="'+cls+'"')&&!html.includes("class='"+cls+"'")) return;

      // 提取该容器的内容片段（最多1500字符）
      const re=new RegExp('<[^>]+class="[^"]*\\b'+cls+'\\b[^"]*"[^>]*>([\\s\\S]{0,2000})');
      const m=html.match(re);
      if(!m) return;
      const inner=m[1];
      if(!inner.includes('<table')) return;

      // 提取table的class
      const tableClassMatch=inner.match(/<table[^>]*class="([^"]*)"/);
      const tableClass=tableClassMatch?tableClassMatch[1]:'裸table(无class)';

      // 检查是否有thead/th
      const hasThead=inner.includes('<thead');
      const hasTh=inner.includes('<th');
      const structure=(hasThead?'thead+':'')+( hasTh?'th+':'')+('tr+td');

      // 统计table class变体
      if(!tableClassCount[tableClass]) tableClassCount[tableClass]=[];
      tableClassCount[tableClass].push(cat+'/'+f+'('+cls+')');

      // 提取table片段样本
      const tableStart=inner.indexOf('<table');
      const tableSnippet=inner.slice(tableStart,Math.min(inner.length,tableStart+600));

      results.push({cat,file:f,containerClass:cls,tableClass,hasThead,hasTh,structure,tableSnippet});
    });

    // STEP 3: 检查伪表格（无<table>但有数据对照的文字块）
    // 在说明区内找包含"/"或":"的连续多行文字
    if(pseudoTableExamples.length<3){
      explainContainers.forEach(function(cls){
        if(!html.includes('class="'+cls+'"')) return;
        const re=new RegExp('<[^>]+class="[^"]*\\b'+cls+'\\b[^"]*"[^>]*>([\\s\\S]{0,1500})');
        const m=html.match(re);
        if(!m) return;
        const inner=m[1];
        // 寻找含分隔符的短行（可能是伪表格）
        const lines=inner.split('\n').filter(l=>l.trim().length>0&&l.trim().length<80);
        const dataLines=lines.filter(l=>/\d+.*[\/|:].*\d+/.test(l)||/\$\d+/.test(l));
        if(dataLines.length>=3&&!inner.includes('<table')){
          pseudoTableExamples.push({file:cat+'/'+f,cls,sample:inner.slice(0,600)});
        }
      });
    }
  });
});

// 输出 table-audit.txt
const lines=[
  '# 说明区 <table> 全站审计',
  '# 扫描日期: 2026-06-15',
  '# 含table页面数: '+results.length,
  '',
  '## table class 变体统计',
  ('-').repeat(60),
];
Object.keys(tableClassCount).forEach(function(cls){
  lines.push((cls||'裸table').padEnd(35)+'  '+tableClassCount[cls].length+'个  →  '+tableClassCount[cls].join(', '));
});

lines.push('');
lines.push('## 逐文件明细');
lines.push(('文件').padEnd(55)+('容器class').padEnd(22)+('table-class').padEnd(25)+'结构');
lines.push('-'.repeat(115));
results.forEach(function(r){
  lines.push((r.cat+'/'+r.file).padEnd(55)+r.containerClass.padEnd(22)+r.tableClass.padEnd(25)+r.structure);
});

lines.push('');
lines.push('## 各含table页面的table HTML样本');
results.forEach(function(r){
  lines.push('');
  lines.push('### '+r.cat+'/'+r.file+' [容器: .'+r.containerClass+']');
  lines.push(r.tableSnippet.replace(/\n{3,}/g,'\n\n'));
  lines.push('--- 样本结束 ---');
});

lines.push('');
lines.push('## STEP 3: 伪表格检测（无<table>的数据对照区）');
if(pseudoTableExamples.length===0){
  lines.push('未发现伪表格（所有数据对照均使用真实<table>）');
}else{
  pseudoTableExamples.forEach(function(ex){
    lines.push('');
    lines.push('### '+ex.file+' [容器: .'+ex.cls+']');
    lines.push(ex.sample);
  });
}

const out=lines.join('\n');
fs.writeFileSync('C:/Users/Administrator/coveragefixpro/table-audit.txt',out,'utf8');
console.log(out);
