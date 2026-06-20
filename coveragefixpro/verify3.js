const fs=require('fs');
const html=fs.readFileSync('C:/Users/Administrator/coveragefixpro/index.html','utf8');

// 抽样检查各分类emoji
const checks=[
  {url:'accident-forgiveness-value-calculator',expected:'🛡️'},
  {url:'coverage-gap-analyzer',expected:'🔍'},
  {url:'dui-insurance-rate-calculator',expected:'🚨'},
  {url:'premium-tax-credit-2026',expected:'💸'},
  {url:'aca-subsidy-calculator',expected:'🏛️'},
  {url:'home-insurance-estimator',expected:'🏠'},
  {url:'flood-insurance-calculator',expected:'🌊'},
  {url:'term-vs-whole-life-calculator',expected:'⏳'},
  {url:'income-replacement-calculator',expected:'💼'},
  {url:'general-liability-calculator',expected:'🏢'},
  {url:'cyber-insurance-calculator',expected:'💻'},
  {url:'startup-insurance-calculator',expected:'🚀'},
];

checks.forEach(function(c){
  var re=new RegExp('href="/tools/[a-z]+/'+c.url+'\\.html"[\\s\\S]*?tool-card-icon">([^<]+)<');
  var m=html.match(re);
  var found=m?m[1].trim():'NOT FOUND';
  var ok=found===c.expected?'✓':'✗';
  console.log(ok,c.url+':',found,'(expected',c.expected+')');
});

// 检查health描述是否已替换
var planningCount=(html.match(/for insurance planning/g)||[]).length;
console.log('\nhealth占位描述残留:',planningCount,'个');

// 抽样health描述
var healthSample=html.match(/href="\/tools\/health\/aca-subsidy[\s\S]*?<p>([^<]+)<\/p>/);
if(healthSample) console.log('ACA描述:', healthSample[1].slice(0,60)+'...');
