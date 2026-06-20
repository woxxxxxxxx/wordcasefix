const fs=require('fs');
let xml=fs.readFileSync('C:/Users/Administrator/coveragefixpro/sitemap.xml','utf8');

// 修复本地路径
const BAD='https://coveragefixpro.comC:/Users/Administrator/coveragefixpro/tools/';
const GOOD='https://coveragefixpro.com/tools/';
const count=(xml.match(new RegExp(BAD.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length;
xml=xml.split(BAD).join(GOOD);

// 添加 privacy-policy 和 terms（在 </urlset> 之前插入）
const extraUrls=[
  '\n  <url>\n    <loc>https://coveragefixpro.com/privacy-policy.html</loc>\n    <lastmod>2026-06-14</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>',
  '\n  <url>\n    <loc>https://coveragefixpro.com/terms.html</loc>\n    <lastmod>2026-06-14</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>',
  '\n  <url>\n    <loc>https://coveragefixpro.com/about.html</loc>\n    <lastmod>2026-06-14</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.4</priority>\n  </url>',
].join('');

xml=xml.replace('</urlset>',extraUrls+'\n</urlset>');

fs.writeFileSync('C:/Users/Administrator/coveragefixpro/sitemap.xml',xml,'utf8');
console.log('sitemap本地路径修复:',count,'处');
console.log('已追加: privacy-policy.html, terms.html, about.html');

// 验证
const remaining=(xml.match(/coveragefixpro\.comC:/g)||[]).length;
console.log('残留本地路径:',remaining,'处');
console.log('总URL条目:',(xml.match(/<url>/g)||[]).length);
