#!/usr/bin/env node
'use strict';
/**
 * cj-links.js — CJ Affiliate Link Search CLI
 *
 * 用法:
 *   node cj-links.js search <site> <advertiser> [keyword]
 *   node cj-links.js us <site> <advertiser> [keyword]    # 仅美国链接，按 EPC 排序
 *   node cj-links.js get <site> <link-id> <sid>         # 生成跟踪 URL
 *   node cj-links.js websites                            # 列出所有站点 pub-id
 *
 * 例:
 *   node cj-links.js us contractfix lawdepot NDA
 *   node cj-links.js get contractfix 17037918 contractfix-lawdepot-nda
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');

const TOKEN_FILE = path.join(__dirname, 'credentials', 'cj-api.json');
const PROXY_URL  = 'http://127.0.0.1:7897';

// 站点 → CJ Pub ID 映射（从已知 CJ 跟踪链接里反推出来的）
// 每加一个新推广媒介，从其首个生成链接里抓 pub-id 补进来
const SITES = {
  contractfix:        { pub: '101808177', name: 'ContractFixPro' },
  freelancerguide:    { pub: '101808336', name: 'FreelancerGuideHub' },
  toolrank:           { pub: '101808341', name: 'ToolRankHQ' },
  billingfix:         { pub: '101808324', name: 'BillingFixPro' },          // 早期 Omneky 链接用过
  // TODO: 其他媒介 pub-id 待发现（首次为其生成 CJ 链接后从 URL 抓 pub-id 补进来）
  coveragefix:        { pub: null, name: 'CoverageFixPro' },
  insurancetips:      { pub: null, name: 'InsuranceTipsPro' },
  payrollfix:         { pub: null, name: 'PayrollFixPro' },
  notion:             { pub: null, name: 'NotionTemplaFix' },
  businesspolicy:     { pub: null, name: 'BusinessPolicyGuide' },
  crmcompare:         { pub: null, name: 'CRMCompareLab' },
  wordcase:           { pub: null, name: 'WordCaseFix' },
  vestcalc:           { pub: null, name: 'VestCalc' },
};

// 广告主 → CJ Advertiser ID 缓存（每次 search 时记录，下次直接用）
const ADVERTISERS = {
  lawdepot:   { id: '4544498', name: 'LawDepot' },
  omneky:     { id: '7943215', name: 'Omneky' },
  // 其他广告主每次 search 时按品牌名匹配
};

// ── 加载 token ──
function loadToken() {
  if (!fs.existsSync(TOKEN_FILE)) {
    console.error(`❌ 凭证文件不存在: ${TOKEN_FILE}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')).personal_access_token;
}

// ── HTTPS GET（带代理）──
function httpGet(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/xml' },
      agent: new HttpsProxyAgent(PROXY_URL),
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ── 简易 XML 字段提取 ──
function extract(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : '';
}
function parseLinks(xml) {
  const items = [];
  const linkBlocks = xml.match(/<link>[\s\S]*?<\/link>/g) || [];
  for (const blk of linkBlocks) {
    items.push({
      id:          extract(blk, 'link-id'),
      name:        extract(blk, 'link-name'),
      advertiser:  extract(blk, 'advertiser-name'),
      advertiserId: extract(blk, 'advertiser-id'),
      destination: extract(blk, 'destination'),
      clickUrl:    extract(blk, 'clickUrl'),
      country:     extract(blk, 'targeted-countries'),
      epc7d:       extract(blk, 'seven-day-epc'),
      epc3m:       extract(blk, 'three-month-epc'),
      commission:  extract(blk, 'sale-commission') || extract(blk, 'lead-commission'),
      language:    extract(blk, 'language'),
    });
  }
  const total = (xml.match(/total-matched="(\d+)"/) || [])[1] || '0';
  return { items, total: parseInt(total) };
}

// ── 解析 EPC 为数字（"N/A" → 0）──
function epcNum(s) {
  if (!s || s === 'N/A') return 0;
  const m = s.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

// ── 命令: search ──
async function cmdSearch(siteKey, advName, keyword, opts = {}) {
  const token = loadToken();
  const site = SITES[siteKey];
  if (!site || !site.pub) {
    console.error(`❌ 站点 "${siteKey}" 未配置 pub-id。SITES map: ${Object.keys(SITES).join(', ')}`);
    process.exit(1);
  }
  const adv = ADVERTISERS[advName.toLowerCase()];
  const advId = adv ? adv.id : null;

  let url = `https://link-search.api.cj.com/v2/link-search?website-id=${site.pub}&advertiser-ids=${advId || 'joined'}&records-per-page=100`;
  if (keyword) url += `&keywords=${encodeURIComponent(keyword)}`;
  if (advName && !advId) url += `&keywords=${encodeURIComponent(advName + (keyword ? ' ' + keyword : ''))}`;

  console.log(`🔍 站点=${site.name}(${site.pub}) 广告主=${advName} 关键词=${keyword || '-'}`);
  const resp = await httpGet(url, token);
  if (resp.status !== 200) {
    console.error(`❌ HTTP ${resp.status}: ${resp.body.slice(0, 200)}`);
    process.exit(1);
  }
  const { items, total } = parseLinks(resp.body);

  let filtered = items;
  if (opts.usOnly) filtered = filtered.filter(l => l.country === 'US' || /\(United States\)|\(US\)/i.test(l.name));
  if (opts.sortEpc) filtered.sort((a, b) => epcNum(b.epc3m) - epcNum(a.epc3m));

  console.log(`\n📊 总匹配 ${total} 条，返回 ${items.length} 条${opts.usOnly ? '（仅 US 过滤后 ' + filtered.length + ' 条）' : ''}\n`);
  for (const l of filtered.slice(0, 30)) {
    const epc = l.epc3m && l.epc3m !== 'N/A' ? `3M-EPC=${l.epc3m}` : '';
    const country = l.country ? `[${l.country}]` : '';
    console.log(`  ${l.id.padEnd(10)} ${country.padEnd(6)} ${l.commission.padEnd(8)} ${epc.padEnd(15)} ${l.name}`);
  }
  if (filtered.length > 30) console.log(`  ...还有 ${filtered.length - 30} 条`);
}

// ── 命令: get ──
async function cmdGet(siteKey, linkId, sid) {
  const token = loadToken();
  const site = SITES[siteKey];
  if (!site || !site.pub) { console.error(`❌ 站点 "${siteKey}" 未配置 pub-id`); process.exit(1); }

  const url = `https://link-search.api.cj.com/v2/link-search?website-id=${site.pub}&advertiser-ids=joined&link-id=${linkId}`;
  const resp = await httpGet(url, token);
  if (resp.status !== 200) { console.error(`❌ HTTP ${resp.status}: ${resp.body.slice(0, 200)}`); process.exit(1); }
  const { items } = parseLinks(resp.body);
  if (!items.length) { console.error(`❌ 未找到 link-id=${linkId}`); process.exit(1); }
  const link = items[0];
  const trackUrl = link.clickUrl + (sid ? `?sid=${sid}` : '');
  console.log(`\n✅ ${link.advertiser} — ${link.name}`);
  console.log(`   目标: ${link.destination}`);
  console.log(`   佣金: ${link.commission}  EPC(3M): ${link.epc3m}  国家: ${link.country}`);
  console.log(`\n🔗 跟踪 URL:\n${trackUrl}\n`);
  return trackUrl;
}

// ── 命令: websites ──
function cmdWebsites() {
  console.log('\n📋 已配置站点:\n');
  for (const [key, site] of Object.entries(SITES)) {
    const status = site.pub ? `✅ pub=${site.pub}` : '⚠️  未发现 pub-id';
    console.log(`  ${key.padEnd(20)} ${site.name.padEnd(22)} ${status}`);
  }
  console.log(`\n💡 新站 pub-id 发现方法: 先在 CJ UI 给该媒介生成任意广告链接，复制 click URL，取 click-XXXXXXXXX 中的 X 即为 pub-id`);
}

// ── 主入口 ──
async function main() {
  const [, , cmd, ...args] = process.argv;
  switch (cmd) {
    case 'search':
      await cmdSearch(args[0], args[1], args[2], { sortEpc: true });
      break;
    case 'us':
      await cmdSearch(args[0], args[1], args[2], { usOnly: true, sortEpc: true });
      break;
    case 'get':
      await cmdGet(args[0], args[1], args[2]);
      break;
    case 'websites':
      cmdWebsites();
      break;
    default:
      console.log(`\nCJ Links CLI

用法:
  node cj-links.js search <site> <advertiser> [keyword]
  node cj-links.js us     <site> <advertiser> [keyword]   # 仅 US 链接
  node cj-links.js get    <site> <link-id> <sid>         # 生成跟踪 URL
  node cj-links.js websites                              # 列已配置站点

例:
  node cj-links.js us contractfix lawdepot NDA
  node cj-links.js us toolrank omneky
  node cj-links.js get contractfix 17037918 contractfix-lawdepot-nda
`);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
