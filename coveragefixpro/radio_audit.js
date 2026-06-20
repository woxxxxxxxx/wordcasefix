const fs=require('fs'),path=require('path');
const base='C:/Users/Administrator/coveragefixpro/tools';
const cats=['auto','business','health','home','life'];
const results=[];

cats.forEach(function(cat){
  const dir=path.join(base,cat);
  fs.readdirSync(dir).filter(f=>f.endsWith('.html')).forEach(function(f){
    const fp=path.join(dir,f);
    const html=fs.readFileSync(fp,'utf8');
    if(!html.includes('type="radio"')&&!html.includes("type='radio'")) return;

    // 找第一个 radio 所在行的前后各600字符，作为结构样本
    const idx=html.indexOf('type="radio"');
    const snippet=html.slice(Math.max(0,idx-600),Math.min(html.length,idx+400));

    // 检测外层容器class
    let containerClass='无class(裸div/section/p)';
    const containerMatches=snippet.match(/class="([^"]*question[^"]*|[^"]*quiz[^"]*)"/gi)||[];
    // 更精准：找radio前最近的div/section/form的class
    const divClasses=[];
    const divRe=/<(?:div|section|form|fieldset)[^>]*class="([^"]*)"/gi;
    let dm;
    while((dm=divRe.exec(snippet))!==null) divClasses.push(dm[1]);
    if(divClasses.length) containerClass=divClasses[divClasses.length-1];

    // 检测radio包裹方式
    const labelClassMatch=snippet.match(/class="([^"]*(?:radio-label|option|choice)[^"]*)"/i);
    const hasRadioLabel=html.includes('class="radio-label"')||html.includes("class='radio-label'");
    const hasOptionClass=html.includes('class="option"')||html.includes("class='option'");
    const hasPlainLabel=/\blabel\b[^>]*>\s*<input[^>]*type="radio"/.test(html)||/<input[^>]*type="radio"[^>]*>\s*\w/.test(html);

    let wrapStyle='plain label';
    if(hasRadioLabel) wrapStyle='.radio-label';
    else if(hasOptionClass) wrapStyle='.option';

    results.push({cat,file:f,containerClass,wrapStyle,snippet});
  });
});

const lines=[
  '# radio 问答页 HTML 结构审计',
  '# 扫描日期: 2026-06-15',
  '# 含radio页面总数: '+results.length,
  '',
  '## 汇总',
];

// 分组统计
const tplX=results.filter(r=>r.wrapStyle==='.radio-label');
const tplY=results.filter(r=>r.wrapStyle!=='.radio-label');
lines.push('模板X (.radio-label): '+tplX.length+' 个');
lines.push('模板Y (plain label / other): '+tplY.length+' 个');
lines.push('');
lines.push('## 模板Y 文件清单（需关注）');
tplY.forEach(r=>lines.push('  '+r.cat+'/'+r.file+'  容器:'+r.containerClass+'  包裹:'+r.wrapStyle));
lines.push('');
lines.push('## 逐文件明细');
lines.push(('文件').padEnd(60)+('容器class').padEnd(40)+'radio包裹');
lines.push('-'.repeat(110));
results.forEach(function(r){
  lines.push((r.cat+'/'+r.file).padEnd(60)+r.containerClass.padEnd(40)+r.wrapStyle);
});

// 输出模板Y第一个文件的题目区HTML样本
lines.push('');
lines.push('## 模板Y 第一个文件的题目区HTML样本');
if(tplY.length){
  const first=tplY[0];
  lines.push('### '+first.cat+'/'+first.file);
  lines.push(first.snippet);
}

const out=lines.join('\n');
fs.writeFileSync('C:/Users/Administrator/coveragefixpro/radio-template-audit.txt',out,'utf8');
console.log(out);
