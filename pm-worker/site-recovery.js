'use strict';
/**
 * site-recovery.js — 站点深度诊断 + 自修复
 *
 * 修复记录：
 *   - DNS 改用 8.8.8.8 外部解析，避免本地 ECONNREFUSED 误报
 *   - Pages 改为 HTTP 直接请求检测，不依赖 GitHub API（避免 403）
 *   - push 前先 pull --rebase，避免 non-fast-forward 报错
 *   - 邮件节流：同站同问题 24h 内只发 1 次
 *   - 所有站点合并为 1 封 HTML 汇总邮件
 */

const https    = require('https');
const http     = require('http');
const net      = require('net');
const fs       = require('fs');
const path     = require('path');
const { exec } = require('child_process');
const { HttpsProxyAgent } = require('https-proxy-agent');

// ── 常量 ─────────────────────────────────────────────────────────────────────
const GIT_PROXY  = 'http://127.0.0.1:7897';
const GH_PREFIX  = '185.199.';
const AGENT      = new HttpsProxyAgent(GIT_PROXY);
const THROTTLE_H = 24;   // 同一问题最多每 24h 报一次

// 邮件节流状态文件
const BASE_DIR      = 'C:\\Users\\Administrator\\pm-worker';
const THROTTLE_FILE = path.join(BASE_DIR, 'logs', 'recovery-throttle.json');

// 6 个站配置
const SITES = [
  { id: 'wordcasefix',     domain: 'wordcasefix.com',     local: 'C:\\Users\\Administrator\\wordcasefix',     ftp_hosted: false },
  { id: 'vestcalc',        domain: 'vestcalc.com',        local: 'C:\\Users\\Administrator\\vestcalc',        ftp_hosted: false },
  { id: 'contractfixpro',  domain: 'contractfixpro.com',  local: 'C:\\Users\\Administrator\\contractfixpro',  ftp_hosted: false },
  { id: 'billingfixpro',   domain: 'billingfixpro.com',   local: 'C:\\Users\\Administrator\\billingfixpro',   ftp_hosted: false },
  { id: 'payrollfixpro',   domain: 'payrollfixpro.com',   local: 'C:\\Users\\Administrator\\payrollfixpro',   ftp_hosted: false },
  { id: 'notiontemplafix', domain: 'notiontemplafix.com', local: null,                                         ftp_hosted: true  },
  { id: 'coveragefixpro', domain: 'coveragefixpro.com', local: 'C:\\Users\\Administrator\\coveragefixpro',   ftp_hosted: true  },
  { id: 'insurancetipspro', domain: 'insurancetipspro.com', local: 'C:\\Users\\Administrator\\insurancetipspro', ftp_hosted: true },
  { id: 'freelancerguidehub', domain: 'freelancerguidehub.com', local: 'C:\\Users\\Administrator\\freelancerguidehub', ftp_hosted: true },
  { id: 'toolrankhq', domain: 'toolrankhq.com', local: 'C:\\Users\\Administrator\\toolrankhq', ftp_hosted: true },
  { id: 'businesspolicyguide', domain: 'businesspolicyguide.com', local: 'C:\\Users\\Administrator\\businesspolicyguide', ftp_hosted: true },
  { id: 'crmcomparelab', domain: 'crmcomparelab.com', local: 'C:\\Users\\Administrator\\crmcomparelab', ftp_hosted: true },
];

// ── 工具 ─────────────────────────────────────────────────────────────────────
function ts()  { return new Date().toTimeString().slice(0, 8); }
function log(msg) { console.log(`[${ts()}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function shell(cmd, cwd, timeoutMs = 30000) {
  return new Promise(resolve => {
    exec(cmd, { cwd, timeout: timeoutMs, env: { ...process.env } }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
    });
  });
}

// ── 邮件节流 ──────────────────────────────────────────────────────────────────
function loadThrottle() {
  try {
    const data = JSON.parse(fs.readFileSync(THROTTLE_FILE, 'utf8'));
    // 自动剪枝：清掉 7 天前的条目，防止历史误报永久残留
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    const pruned = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'number' && v >= cutoff) pruned[k] = v;
    }
    return pruned;
  } catch (_) { return {}; }
}
function saveThrottle(data) {
  try { fs.writeFileSync(THROTTLE_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (_) {}
}

/** 判断是否可以发邮件（同 key 24h 内只发 1 次），并记录 */
function canSendAndMark(throttle, key) {
  const now  = Date.now();
  const last = throttle[key] || 0;
  if (now - last < THROTTLE_H * 3600 * 1000) return false;
  throttle[key] = now;
  return true;
}

// ── Step 1: DNS 检查（使用 8.8.8.8，避免本地 DNS 误报）────────────────────────
function checkDNS(domain) {
  return new Promise(resolve => {
    const sock = net.createConnection({ host: '8.8.8.8', port: 53 });
    sock.destroy(); // 只是测试连通性
    sock.on('error', () => {}); // ignore

    // 构造 DNS A 记录查询报文（简单手工构造）
    // 使用 Node dns 模块但强制走 8.8.8.8
    const { Resolver } = require('dns').promises;
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4']);
    resolver.resolve4(domain)
      .then(records => {
        const ghIps = records.filter(ip => ip.startsWith(GH_PREFIX));
        if (ghIps.length > 0) {
          resolve({ ok: true,  ips: records, detail: `A记录正确: ${ghIps.join(', ')}` });
        } else {
          resolve({ ok: false, ips: records, detail: `A记录未指向 GitHub Pages IP（当前: ${records.join(', ')}）` });
        }
      })
      .catch(e => {
        resolve({ ok: false, ips: [], detail: `DNS解析失败(8.8.8.8): ${e.message}` });
      });
  });
}

// ── Step 2: Pages 直接 HTTP 检测（不依赖 GitHub API）────────────────────────
function checkPagesHTTP(domain) {
  return new Promise(resolve => {
    const url = `https://${domain}/`;
    const req = https.request(
      { hostname: domain, path: '/', method: 'GET', agent: AGENT,
        headers: { 'User-Agent': 'Mozilla/5.0 PMWorker-SiteRecovery/2.0' },
        timeout: 15000 },
      res => {
        res.resume();
        const ok = res.statusCode >= 200 && res.statusCode < 400;
        resolve({ ok, status: res.statusCode, detail: `HTTP ${res.statusCode}` });
      }
    );
    req.setTimeout(15000, () => { req.destroy(); resolve({ ok: false, status: 0, detail: '连接超时' }); });
    req.on('error', e => resolve({ ok: false, status: 0, detail: `连接失败: ${e.message}` }));
    req.end();
  });
}

// ── Step 3: 本地分支同步检查 ──────────────────────────────────────────────────
async function checkBranchSync(localDir) {
  await shell(`git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false fetch --prune origin`, localDir, 20000);
  const masterHead = await shell('git rev-parse master 2>/dev/null || git rev-parse HEAD', localDir);
  if (!masterHead.ok) return { ok: false, detail: '无法读取本地 master HEAD' };

  const remoteMainRaw   = await shell(`git -c http.proxy=${GIT_PROXY} ls-remote origin main`,   localDir);
  const remoteMasterRaw = await shell(`git -c http.proxy=${GIT_PROXY} ls-remote origin master`, localDir);
  const remoteMainSha   = remoteMainRaw.stdout.split(/\s/)[0]   || '';
  const remoteMasterSha = remoteMasterRaw.stdout.split(/\s/)[0] || '';
  const localSha        = masterHead.stdout.slice(0, 40);

  return {
    ok: true, localSha, remoteMasterSha, remoteMainSha,
    masterInSync: !remoteMasterSha || remoteMasterSha === localSha,
    mainExists:   !!remoteMainSha,
    mainInSync:   !remoteMainSha  || remoteMainSha  === localSha,
    detail: `local:${localSha.slice(0,7)} remote/master:${remoteMasterSha.slice(0,7)||'—'} remote/main:${remoteMainSha.slice(0,7)||'—'}`,
  };
}

// ── Step 4: CNAME 文件检查 ────────────────────────────────────────────────────
function checkCNAME(localDir, expectedDomain) {
  const cnamePath = path.join(localDir, 'CNAME');
  if (!fs.existsSync(cnamePath)) return { ok: false, exists: false, detail: 'CNAME 文件不存在' };
  const content = fs.readFileSync(cnamePath, 'utf8').trim();
  if (content.toLowerCase() !== expectedDomain.toLowerCase())
    return { ok: false, exists: true, detail: `CNAME 内容错误: "${content}"，期望 "${expectedDomain}"` };
  return { ok: true, exists: true, detail: `CNAME 正确: ${content}` };
}

// ── 自修复动作 ────────────────────────────────────────────────────────────────

/** pull --rebase 再 push，解决 non-fast-forward 问题 */
async function fixPushWithRebase(localDir, branch = 'master') {
  log(`      🔧 pull --rebase 再 push ${branch}`);
  const pull = await shell(
    `git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false pull --rebase origin ${branch}`,
    localDir, 30000
  );
  if (!pull.ok) return { ok: false, msg: `pull --rebase 失败: ${pull.stderr.slice(0, 200)}` };

  const push = await shell(
    `git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false push origin ${branch}`,
    localDir, 30000
  );
  return push.ok
    ? { ok: true,  msg: `rebase+push ${branch} 成功` }
    : { ok: false, msg: `push 失败: ${push.stderr.slice(0, 200)}` };
}

/** 空 commit 触发 Pages 重建（rebase 后再 push）*/
async function fixTriggerRebuild(localDir) {
  log(`      🔧 空 commit 触发 Pages 重建`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const commit = await shell(
    `git commit --allow-empty -m "fix: trigger pages rebuild ${stamp}"`,
    localDir, 15000
  );
  if (!commit.ok) return { ok: false, msg: `空 commit 失败: ${commit.stderr.slice(0, 200)}` };

  // rebase 方式 push
  const push = await shell(
    `git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false pull --rebase origin master && git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false push origin master`,
    localDir, 30000
  );
  return push.ok
    ? { ok: true,  msg: '空 commit 已推送，Pages 将在 2-5 分钟内重建' }
    : { ok: false, msg: `push 失败: ${push.stderr.slice(0, 200)}` };
}

/** master → main 同步 */
async function fixSyncMainBranch(localDir) {
  log(`      🔧 push master:main --force`);
  const r = await shell(
    `git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false push origin master:main --force`,
    localDir, 30000
  );
  return r.ok
    ? { ok: true,  msg: 'master:main --force 推送成功' }
    : { ok: false, msg: `push master:main 失败: ${r.stderr.slice(0, 200)}` };
}

/** 写入 CNAME 并 push */
async function fixCNAME(localDir, domain) {
  log(`      🔧 写入 CNAME: ${domain}`);
  try { fs.writeFileSync(path.join(localDir, 'CNAME'), domain + '\n', 'utf8'); }
  catch (e) { return { ok: false, msg: `写入 CNAME 失败: ${e.message}` }; }
  const r = await shell(
    `git add CNAME && git commit -m "fix: restore CNAME for ${domain}" && git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false push origin master`,
    localDir, 30000
  );
  return r.ok
    ? { ok: true,  msg: 'CNAME 已写入并推送' }
    : { ok: false, msg: `CNAME push 失败: ${r.stderr.slice(0, 200)}` };
}

// ── 单站诊断 + 修复 ───────────────────────────────────────────────────────────
async function recoverSite(site) {
  const { id, domain, local, ftp_hosted } = site;
  const report = {
    id, domain, ftp_hosted,
    timestamp:   new Date().toISOString(),
    steps:       {},
    fixes:       [],
    needsEmail:  false,
    emailReason: [],
    resolved:    false,
  };

  log(`\n  ┌─ 诊断: ${domain} ${ftp_hosted ? '[FTP]' : ''}`);

  // Step 1: DNS（外部 8.8.8.8）
  // FTP 托管站点：只验证 DNS 能解析即可，不要求指向 GH IPs
  if (ftp_hosted) {
    const { Resolver } = require('dns').promises;
    const resolver = new Resolver();
    resolver.setServers(['8.8.8.8']);
    let dnsOk = false, dnsDetail = '';
    try {
      const records = await resolver.resolve4(domain);
      dnsOk = records.length > 0;
      dnsDetail = `DNS解析正常: ${records[0]} (FTP托管)`;
    } catch (e) {
      dnsDetail = `DNS解析失败: ${e.message}`;
    }
    report.steps.dns = { ok: dnsOk, detail: dnsDetail };
    log(`  │ DNS: ${dnsOk ? '✅' : '❌'} ${dnsDetail}`);
    if (!dnsOk) { report.emailReason.push(`DNS异常: ${dnsDetail}`); report.needsEmail = true; }
    log(`  └─ ${domain} FTP托管，跳过 Git/Pages 检查`);
    report.resolved = dnsOk;
    return report;
  }

  // GitHub Pages 站点：要求 DNS 指向 185.199.x.x
  const dnsResult = await checkDNS(domain);
  report.steps.dns = dnsResult;
  log(`  │ DNS: ${dnsResult.ok ? '✅' : '❌'} ${dnsResult.detail}`);
  if (!dnsResult.ok) {
    report.emailReason.push(`DNS异常: ${dnsResult.detail}`);
    report.needsEmail = true;
  }

  // Step 2: 站点 HTTP 直接检测（替代 GitHub API）
  const pagesResult = await checkPagesHTTP(domain);
  report.steps.pages = pagesResult;
  log(`  │ Pages HTTP: ${pagesResult.ok ? '✅' : '❌'} ${pagesResult.detail}`);

  if (!pagesResult.ok && local) {
    const fix = await fixTriggerRebuild(local);
    report.fixes.push({ action: 'trigger_rebuild', ...fix });
    log(`  │ 修复(重建): ${fix.ok ? '✅' : '❌'} ${fix.msg}`);
    if (!fix.ok) { report.emailReason.push(`Pages重建失败: ${fix.msg}`); report.needsEmail = true; }
  }

  // Step 3: 分支同步
  if (local) {
    try {
      const branchResult = await checkBranchSync(local);
      report.steps.branch = branchResult;
      log(`  │ 分支: ${branchResult.detail}`);
      if (branchResult.ok && branchResult.mainExists && !branchResult.mainInSync) {
        const fix = await fixSyncMainBranch(local);
        report.fixes.push({ action: 'sync_main', ...fix });
        log(`  │ 修复(main同步): ${fix.ok ? '✅' : '❌'} ${fix.msg}`);
        if (!fix.ok) { report.emailReason.push(`同步main失败: ${fix.msg}`); report.needsEmail = true; }
      }
    } catch (e) {
      report.steps.branch = { ok: false, detail: `分支检查异常: ${e.message}` };
      log(`  │ 分支异常: ${e.message}`);
    }
  }

  // Step 4: CNAME
  if (local) {
    const cnameResult = checkCNAME(local, domain);
    report.steps.cname = cnameResult;
    log(`  │ CNAME: ${cnameResult.ok ? '✅' : '❌'} ${cnameResult.detail}`);
    if (!cnameResult.ok) {
      const fix = await fixCNAME(local, domain);
      report.fixes.push({ action: 'fix_cname', ...fix });
      log(`  │ 修复(CNAME): ${fix.ok ? '✅' : '❌'} ${fix.msg}`);
      if (!fix.ok) { report.emailReason.push(`CNAME修复失败: ${fix.msg}`); report.needsEmail = true; }
    }
  }

  const fixedCount = report.fixes.filter(f => f.ok).length;
  report.resolved  = fixedCount > 0 && report.emailReason.length === 0;
  log(`  └─ 完成: 修复${fixedCount}项, 告警=${report.needsEmail}`);
  return report;
}

// ── 主入口 ────────────────────────────────────────────────────────────────────
async function runSiteRecovery({ siteIds = null } = {}) {
  const startTime = Date.now();
  log('════════════════════════════════════════');
  log('Site Recovery v2 — ' + new Date().toLocaleString('zh-CN'));
  log('════════════════════════════════════════');

  const targets = siteIds ? SITES.filter(s => siteIds.includes(s.id)) : SITES;
  const reports = [];

  for (const site of targets) {
    try {
      reports.push(await recoverSite(site));
    } catch (e) {
      log(`  ❌ ${site.id} 整体异常: ${e.message}`);
      reports.push({ id: site.id, domain: site.domain, error: e.message, needsEmail: true, emailReason: [e.message], steps: {}, fixes: [] });
    }
    await sleep(800);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n════════════════ 完成 ${elapsed}s ════════════════`);

  const summary = reports.map(r => {
    if (r.error) return `❌ ${r.domain}: 异常 ${r.error}`;
    const fixes = (r.fixes || []).filter(f => f.ok).map(f => f.action).join(', ');
    const warn  = (r.emailReason || []).join('; ');
    if (fixes && !warn) return `🔧 ${r.domain}: 已自动修复 [${fixes}]`;
    if (warn)           return `⚠️ ${r.domain}: ${warn}`;
    return `✅ ${r.domain}: 正常`;
  }).join('\n');

  log('\n=== Recovery Report ===\n' + summary + '\n');
  return { reports, summary };
}

// ── HTML 邮件：所有站点合并 1 封，24h 节流 ────────────────────────────────────
async function sendRecoveryEmail(reports, smtpConfig) {
  const throttle  = loadThrottle();
  const now       = new Date();
  const timeStr   = now.toLocaleString('zh-CN');
  const throttleKey = 'global_recovery_' + now.toISOString().slice(0, 13); // 每小时唯一 key

  // 只发告警级别的报告（needsEmail 或 error）
  const alertReports = reports.filter(r => r.needsEmail || r.error);
  if (!alertReports.length) { log('  📭 无需发送邮件（所有站点正常）'); return; }

  // 节流：同一小时内已发过就跳过
  // 更精确：每个站点的错误组合做 key
  const sitesNeedSend = alertReports.filter(r => {
    const key = `${r.id}:${(r.emailReason || []).join('|')}`;
    return canSendAndMark(throttle, key);
  });

  if (!sitesNeedSend.length) {
    log('  📭 邮件节流：所有告警 24h 内已发送过，跳过');
    saveThrottle(throttle);
    return;
  }

  saveThrottle(throttle);

  // ── 构建 HTML ──────────────────────────────────────────────────────────────
  function statusIcon(ok) {
    if (ok === true)  return '<span style="color:#4ade80">✅</span>';
    if (ok === false) return '<span style="color:#f87171">❌</span>';
    return '<span style="color:#facc15">⚠️</span>';
  }

  function siteCard(r) {
    const hasError   = !!r.error;
    const hasWarning = (r.emailReason || []).length > 0;
    const cardColor  = hasError ? '#2d0f0f' : hasWarning ? '#1c1304' : '#052e1a';
    const borderColor= hasError ? '#7f1d1d' : hasWarning ? '#78350f' : '#065f46';
    const titleColor = hasError ? '#f87171' : hasWarning ? '#fbbf24' : '#4ade80';

    const stepsHtml = Object.entries(r.steps || {}).map(([k, v]) => `
      <tr>
        <td style="padding:4px 8px;color:#94a3b8;font-size:12px;width:80px">${k}</td>
        <td style="padding:4px 8px;font-size:13px">${statusIcon(v.ok)} ${v.detail || ''}</td>
      </tr>`).join('');

    const fixesHtml = (r.fixes || []).length ? (r.fixes || []).map(f => `
      <tr>
        <td style="padding:4px 8px;color:#94a3b8;font-size:12px;width:80px">${f.action}</td>
        <td style="padding:4px 8px;font-size:13px">${statusIcon(f.ok)} ${f.msg || ''}</td>
      </tr>`).join('') : '<tr><td colspan="2" style="padding:4px 8px;color:#64748b;font-size:12px">无修复操作</td></tr>';

    const reasonHtml = (r.emailReason || []).length ? `
      <div style="margin-top:10px;padding:10px;background:#2d0f0f;border-radius:6px;border-left:3px solid #f87171">
        <div style="color:#f87171;font-size:12px;font-weight:700;margin-bottom:4px">⚠️ 需要手动处理</div>
        ${(r.emailReason || []).map(x => `<div style="color:#fca5a5;font-size:12px;margin-top:2px">• ${x}</div>`).join('')}
      </div>` : '';

    return `
    <div style="background:${cardColor};border:1px solid ${borderColor};border-radius:10px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:16px">${hasError || hasWarning ? '🔴' : '🟢'}</span>
        <span style="color:${titleColor};font-weight:700;font-size:15px">${r.domain}</span>
        <span style="margin-left:auto;color:#64748b;font-size:11px">${r.ftp_hosted ? 'FTP托管' : 'GitHub Pages'}</span>
      </div>

      <div style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">诊断结果</div>
      <table style="width:100%;border-collapse:collapse">${stepsHtml || '<tr><td style="color:#64748b;font-size:12px;padding:4px 8px">无诊断数据</td></tr>'}</table>

      <div style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px">修复操作</div>
      <table style="width:100%;border-collapse:collapse">${fixesHtml}</table>

      ${reasonHtml}
    </div>`;
  }

  const allOkCount    = reports.filter(r => !r.needsEmail && !r.error).length;
  const alertCount    = alertReports.length;
  const summaryBanner = `
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div style="background:#052e1a;border:1px solid #065f46;border-radius:8px;padding:10px 16px;flex:1;min-width:100px;text-align:center">
        <div style="color:#4ade80;font-size:20px;font-weight:800">${allOkCount}</div>
        <div style="color:#64748b;font-size:11px">站点正常</div>
      </div>
      <div style="background:#2d0f0f;border:1px solid #7f1d1d;border-radius:8px;padding:10px 16px;flex:1;min-width:100px;text-align:center">
        <div style="color:#f87171;font-size:20px;font-weight:800">${alertCount}</div>
        <div style="color:#64748b;font-size:11px">需要关注</div>
      </div>
      <div style="background:#1c1304;border:1px solid #78350f;border-radius:8px;padding:10px 16px;flex:1;min-width:100px;text-align:center">
        <div style="color:#fbbf24;font-size:20px;font-weight:800">${reports.length}</div>
        <div style="color:#64748b;font-size:11px">检查总站</div>
      </div>
    </div>`;

  // 正常站点摘要行
  const okSites = reports.filter(r => !r.needsEmail && !r.error);
  const okBlock = okSites.length ? `
    <div style="background:#0a1a0e;border:1px solid #065f46;border-radius:8px;padding:12px 16px;margin-bottom:14px">
      <div style="color:#4ade80;font-size:12px;font-weight:700;margin-bottom:6px">✅ 以下站点运行正常</div>
      ${okSites.map(r => `<div style="color:#86efac;font-size:13px;margin-top:3px">• ${r.domain}</div>`).join('')}
    </div>` : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:1px solid #2d3748;border-radius:12px;padding:20px 24px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:28px">🛡️</span>
        <div>
          <div style="font-size:18px;font-weight:800;color:#e2e8f0">PM Worker — 站点恢复报告</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">${timeStr}</div>
        </div>
      </div>
    </div>

    <!-- Summary -->
    ${summaryBanner}

    <!-- OK sites -->
    ${okBlock}

    <!-- Alert sites -->
    ${sitesNeedSend.length ? `
    <div style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">⚠️ 需要关注的站点</div>
    ${sitesNeedSend.map(siteCard).join('')}` : ''}

    <!-- Manual steps -->
    <div style="background:#1a1a2e;border:1px solid #2d3748;border-radius:8px;padding:14px 16px;margin-top:6px">
      <div style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📋 通用手动修复步骤</div>
      <div style="color:#cbd5e1;font-size:13px;line-height:1.8">
        1. 确认 DNS A 记录指向 185.199.108.153 / .109.153 / .110.153 / .111.153<br>
        2. GitHub 仓库 Settings → Pages：确认 Source 分支和 Custom Domain<br>
        3. 检查 GitHub Actions 部署日志 → Re-run 失败的 workflow<br>
        4. 若 push 被拒绝：本地 git pull --rebase origin master 后重推
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:20px;color:#475569;font-size:11px">
      PM Worker Site Recovery v2 · 每24h相同问题最多告警1次
    </div>
  </div>
</body>
</html>`;

  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({
    host: smtpConfig.host, port: smtpConfig.port, secure: smtpConfig.secure,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    tls: { rejectUnauthorized: false },
  });

  const subject = `[Site Recovery] ${alertCount}个站点需关注 · ${allOkCount}个正常 · ${timeStr.slice(0,16)}`;
  await t.sendMail({
    from: smtpConfig.user,
    to:   smtpConfig.to,
    subject,
    html,
    text: `PM Worker 站点恢复报告\n${timeStr}\n\n正常: ${allOkCount}站 | 告警: ${alertCount}站\n\n` +
          reports.map(r => `${r.needsEmail || r.error ? '⚠️' : '✅'} ${r.domain}: ${(r.emailReason||[]).join('; ') || '正常'}`).join('\n'),
  });
  log(`  📧 汇总邮件已发送: ${subject}`);
}

// 直接运行
if (require.main === module) {
  runSiteRecovery().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runSiteRecovery, sendRecoveryEmail, SITES };
