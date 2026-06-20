const fs=require('fs'),path=require('path');
const dir='C:/Users/Administrator/coveragefixpro/tools/auto';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.html')).sort();

const rows=[];
let cntA=0,cntB=0,cntC=0,cntD=0;
let aboutInline=0,aboutPlain=0,aboutOther=0;

files.forEach(function(f){
  const html=fs.readFileSync(path.join(dir,f),'utf8');

  // FAQ类型检测
  let faqType='D-其他';
  const hasDetails=html.includes('<details');
  const hasFaqSection=html.includes('class="faq-section"')||html.includes("class='faq-section'");
  const hasFaqItemH3=/class="faq-item"[\s\S]{0,300}<h3/.test(html);
  const hasFaq=html.includes('class="faq"')||html.includes("class='faq'");

  if(hasDetails){
    faqType='C-details/summary';cntC++;
  } else if(hasFaqSection&&hasFaqItemH3){
    faqType='B-faq-section+faq-item';cntB++;
  } else if(hasFaqSection){
    faqType='B-faq-section';cntB++;
  } else if(hasFaq&&hasFaqItemH3){
    faqType='A-faq+faq-item+h3';cntA++;
  } else if(hasFaq){
    faqType='A-faq';cntA++;
  } else {
    cntD++;
  }

  // about-section类型
  let aboutType='无about-section';
  if(/class="about-section"[^>]*style=/.test(html)||/class='about-section'[^>]*style=/.test(html)){
    aboutType='内联style';aboutInline++;
  } else if(html.includes('class="about-section"')||html.includes("class='about-section'")){
    aboutType='纯class无style';aboutPlain++;
  } else {
    aboutOther++;
  }

  rows.push({f,faqType,aboutType});
});

const lines=[
  '# Auto 工具页 FAQ + about 结构审计',
  '# 扫描文件数: '+files.length,
  '# 扫描日期: 2026-06-15',
  '',
  '## FAQ类型统计',
  '类型A (faq+faq-item+h3): '+cntA+' 个',
  '类型B (faq-section+faq-item): '+cntB+' 个',
  '类型C (details/summary): '+cntC+' 个',
  '类型D (其他/无FAQ): '+cntD+' 个',
  '',
  '## about-section统计',
  '内联style: '+aboutInline+' 个',
  '纯class无style: '+aboutPlain+' 个',
  '无about-section: '+aboutOther+' 个',
  '',
  '## 逐文件明细',
  ('文件名').padEnd(55)+'FAQ类型'.padEnd(30)+'about类型',
  '-'.repeat(110),
];
rows.forEach(function(r){
  lines.push(r.f.padEnd(55)+r.faqType.padEnd(30)+r.aboutType);
});

// 单独列出 C 类文件
lines.push('');
lines.push('## C类 details/summary 文件列表');
rows.filter(r=>r.faqType.startsWith('C')).forEach(r=>lines.push('  '+r.f));

// 列出内联style about文件
lines.push('');
lines.push('## 内联style about-section 文件列表');
rows.filter(r=>r.aboutType==='内联style').forEach(r=>lines.push('  '+r.f));

const out=lines.join('\n');
fs.writeFileSync('C:/Users/Administrator/coveragefixpro/auto-faq-audit.txt',out,'utf8');
console.log(out);
