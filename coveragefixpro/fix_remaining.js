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

let fixedWww=0,fixedDesc=0,fixedTwitter=0;

allFiles.forEach(function(item){
  let html=fs.readFileSync(item.fp,'utf8');
  let changed=false;

  // Fix 1: www.coveragefixpro.com -> coveragefixpro.com in canonical/og:url/JSON-LD
  if(html.includes('https://www.coveragefixpro.com/')){
    html=html.split('https://www.coveragefixpro.com/').join('https://coveragefixpro.com/');
    changed=true;
    fixedWww++;
  }

  // Fix 2: truncated og:description -> use meta description content
  const ogdescMatch=html.match(/(<meta\s+property="og:description"\s+content=")([^"]+)(")/);
  const metadescMatch=html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if(ogdescMatch && metadescMatch){
    const ogDesc=ogdescMatch[2];
    const metaDesc=metadescMatch[1];
    const TRUNCATE_ENDINGS=['and whether it','and how much','and what the','and when','and if you','and to','and whether','to help you','to determine','to understand','to calculate'];
    const truncated=TRUNCATE_ENDINGS.some(function(e){return ogDesc.trim().endsWith(e)||ogDesc.trim().endsWith(e+',');});
    if(truncated && metaDesc && metaDesc!==ogDesc){
      html=html.replace(ogdescMatch[0], ogdescMatch[1]+metaDesc+ogdescMatch[3]);
      changed=true;
      fixedDesc++;
    }
  }

  // Fix 3: add twitter:card if missing
  if(!html.includes('twitter:card')){
    const ogTitle=html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    const ogDesc=html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
    const titleStr=ogTitle?ogTitle[1]:'CoverageFixPro Tool';
    const descStr=ogDesc?ogDesc[1]:'Free insurance calculator at CoverageFixPro.';
    const twitterMeta=[
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta name="twitter:title" content="'+titleStr.replace(/"/g,'&quot;')+'">',
      '<meta name="twitter:description" content="'+descStr.replace(/"/g,'&quot;')+'">',
    ].join('\n');
    // Insert before </head>
    html=html.replace('</head>',twitterMeta+'\n</head>');
    changed=true;
    fixedTwitter++;
  }

  if(changed){
    fs.writeFileSync(item.fp,html,'utf8');
  }
});

console.log('修复www.前缀:',fixedWww,'个文件');
console.log('修复截断description:',fixedDesc,'个文件');
console.log('添加twitter:card:',fixedTwitter,'个文件');
