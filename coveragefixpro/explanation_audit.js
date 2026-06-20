const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro/tools';
const cats=['auto','business','health','home','life'];

// ── 说明区容器的候选class关键词 ──
const explainKeywords=[
  'explanation','how-it-works','how-to-use','methodology','info-section',
  'about-method','method','calculator-info','tool-info','about-tool',
  'works','formula','calculation-method','description','detail'
];

// ── 全组件class候选 ──
const componentKeywords={
  calculator: ['calculator-box','calculator-card','calc-box','calculator-wrapper','calc-wrapper','tool-box'],
  input:      ['form-group','input-group','field-group','form-field','input-row','label-hint'],
  result:     ['result-box','result-grid','result-item','result-row','result-label','result-value','result-note','result-section','result-card','output-box'],
  explain:    explainKeywords,
  faq:        ['faq','faq-section','faq-item','faq-list'],
  quiz:       ['question-group','question','quiz-question','radio-label','option'],
  about:      ['about-section','about-tool','about'],
  info:       ['info-box','info-section','info-card'],
  disclaimer: ['disclaimer'],
  relatedTools:['related-tools','related'],
  toolIntro:  ['tool-intro']
};

// 扫描函数：返回文件中某class列表出现情况
function findClasses(html, keywords){
  const found={};
  keywords.forEach(function(cls){
    const re=new RegExp('class="[^"]*\\b'+cls+'\\b[^"]*"');
    if(re.test(html)) found[cls]=true;
  });
  return Object.keys(found);
}

// 获取某class的内部结构摘要
function getInnerStructure(html, cls){
  const re=new RegExp('<[^>]+class="[^"]*\\b'+cls+'\\b[^"]*"[^>]*>([\\s\\S]{0,800})');
  const m=html.match(re);
  if(!m) return '未找到';
  const inner=m[1];
  const tags=[];
  if(/<h2/.test(inner)) tags.push('h2');
  if(/<h3/.test(inner)) tags.push('h3');
  if(/<p/.test(inner)) tags.push('p');
  if(/<ul/.test(inner)) tags.push('ul');
  if(/<li/.test(inner)) tags.push('li');
  if(/<ol/.test(inner)) tags.push('ol');
  if(/<table/.test(inner)) tags.push('table');
  return tags.join('+') || '仅文字';
}

// ── STEP 1+2: auto 分类审计 ──
const autoDir=path.join(base,'auto');
const autoFiles=fs.readdirSync(autoDir).filter(f=>f.endsWith('.html')&&f!=='index.html').sort();

const explainClassCount={};
const autoRows=[];

// 已有CSS覆盖的class集合
const cssHasStyle=new Set(['explanation','about-section','info-box','calculator-box','calculator-card',
  'form-group','input-group','result-box','result-row','result-grid','result-item',
  'result-label','result-value','result-note','faq','faq-section','faq-item',
  'question-group','radio-label','tool-intro','disclaimer','related-tools','explanation']);

autoFiles.forEach(function(f){
  const html=fs.readFileSync(path.join(autoDir,f),'utf8');
  const found=findClasses(html,explainKeywords);
  const row={f, classes: found.length?found:['无说明区class']};
  // 内部结构
  row.structures=found.map(cls=>({cls,inner:getInnerStructure(html,cls)}));
  row.cssOK=found.every(c=>cssHasStyle.has(c));
  autoRows.push(row);
  found.forEach(function(c){
    if(!explainClassCount[c]) explainClassCount[c]=[];
    explainClassCount[c].push(f);
  });
});

// ── STEP 4: 全站组件class扫描 ──
const allFiles=[];
cats.forEach(function(cat){
  const dir=path.join(base,cat);
  fs.readdirSync(dir).filter(f=>f.endsWith('.html')).forEach(function(f){
    allFiles.push({cat,file:f,fp:path.join(dir,f)});
  });
});

const componentMap={};
Object.keys(componentKeywords).forEach(function(group){
  componentMap[group]={};
  componentKeywords[group].forEach(function(cls){componentMap[group][cls]=[];});
});
allFiles.forEach(function(item){
  const html=fs.readFileSync(item.fp,'utf8');
  const label=item.cat+'/'+item.file;
  Object.keys(componentKeywords).forEach(function(group){
    componentKeywords[group].forEach(function(cls){
      const re=new RegExp('class="[^"]*\\b'+cls+'\\b[^"]*"');
      if(re.test(html)) componentMap[group][cls].push(label);
    });
  });
});

// ── 输出 explanation-audit.txt ──
const auditLines=[
  '# Auto 工具页 说明区结构审计',
  '# 扫描日期: 2026-06-15',
  '# 文件数: '+autoFiles.length,
  '',
  '## STEP 1：逐文件明细',
  ('文件名').padEnd(55)+('说明区class').padEnd(30)+('内部结构').padEnd(25)+'CSS覆盖',
  '-'.repeat(120),
];
autoRows.forEach(function(r){
  const clsStr=r.classes.join(',');
  const structStr=r.structures.map(s=>s.cls+':'+s.inner).join(' | ')||'—';
  auditLines.push(r.f.padEnd(55)+clsStr.padEnd(30)+structStr.padEnd(25)+(r.cssOK?'✅':'❌ 缺CSS'));
});

auditLines.push('');
auditLines.push('## STEP 2：说明区class变体统计');
const sortedExplain=Object.keys(explainClassCount).sort((a,b)=>explainClassCount[b].length-explainClassCount[a].length);
if(sortedExplain.length===0){
  auditLines.push('（未发现说明区专属class，均使用通用容器）');
}else{
  sortedExplain.forEach(function(cls){
    const files=explainClassCount[cls];
    const inCss=cssHasStyle.has(cls)?'✅已有CSS':'❌缺CSS';
    auditLines.push(cls.padEnd(30)+files.length+'个文件  '+inCss);
    files.forEach(f=>auditLines.push('    '+f));
  });
}

// 10个重点文件单独输出
const focus=[
  'annual-vs-monthly-payment-calculator.html',
  'deductible-optimizer.html',
  'car-insurance-premium-estimator.html',
  'dui-insurance-rate-calculator.html',
  'electric-vehicle-insurance-calculator.html',
  'comprehensive-vs-liability-calculator.html',
  'gap-insurance-calculator.html',
  'good-driver-discount-calculator.html',
  'bundling-discount-calculator.html',
  'multi-car-discount-calculator.html'
];
auditLines.push('');
auditLines.push('## 重点10个文件说明区详情');
focus.forEach(function(f){
  const row=autoRows.find(r=>r.f===f);
  if(!row){auditLines.push(f+': 未找到');return;}
  auditLines.push('');
  auditLines.push('### '+f);
  auditLines.push('说明区class: '+row.classes.join(', '));
  row.structures.forEach(function(s){
    auditLines.push('  '+s.cls+' 内部: '+s.inner);
  });
  auditLines.push('CSS状态: '+(row.cssOK?'✅':'❌ 缺CSS'));
});

fs.writeFileSync('C:/Users/Administrator/coveragefixpro/explanation-audit.txt',auditLines.join('\n'),'utf8');

// ── 输出 component-class-map.txt ──
const mapLines=[
  '# CoverageFixPro 全站组件 class 映射表',
  '# 生成日期: 2026-06-15',
  '# 总扫描文件: '+allFiles.length,
  '# 用途：每次修改CSS时必须全部覆盖checklist',
  '',
];
const groupLabels={
  calculator:'计算器容器',input:'输入组',result:'结果区',
  explain:'说明区',faq:'FAQ',quiz:'问答题',
  about:'about区',info:'info提示框',disclaimer:'免责声明',
  relatedTools:'相关工具',toolIntro:'工具简介'
};
Object.keys(componentMap).forEach(function(group){
  mapLines.push('## '+groupLabels[group]);
  mapLines.push(('class名').padEnd(35)+('文件数').padEnd(10)+'覆盖状态');
  mapLines.push('-'.repeat(70));
  const entries=Object.entries(componentMap[group]).filter(([,v])=>v.length>0)
    .sort((a,b)=>b[1].length-a[1].length);
  if(entries.length===0){mapLines.push('（本站未使用）');}
  else{
    entries.forEach(function([cls,files]){
      const hasCss=cssHasStyle.has(cls)?'✅有CSS':'❌缺CSS';
      mapLines.push(cls.padEnd(35)+String(files.length).padEnd(10)+hasCss);
    });
  }
  mapLines.push('');
});

fs.writeFileSync('C:/Users/Administrator/coveragefixpro/component-class-map.txt',mapLines.join('\n'),'utf8');

// 控制台输出
console.log('=== explanation-audit.txt ===');
console.log(auditLines.join('\n'));
console.log('\n=== component-class-map.txt ===');
console.log(mapLines.join('\n'));
