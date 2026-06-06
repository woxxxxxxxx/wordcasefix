'use strict';
/**
 * site-recovery.js — 站点 404 / 不可访问深度诊断 + 自修复
 *
 * 当首页检测失败时，依次执行：
 *   Step 1: DNS  — A 记录是否指向 185.199.x.x
 *   Step 2: Pages — GitHub API 检查部署状态
 *   Step 3: Branch — 本地 master 与远端 main 是否同步
 *   Step 4: CNAME  — CNAME 文件是否存在且内容正确
 *
 * 自修复：
 *   - master / main 不同步 → git push origin master:main --force
 *   - Pages 未构建 / errored → 空 commit push 触发重建
 *   - CNAME 缺失 → 写入并 push
 *   - DNS 问题 → 仅记录，发邮件（无法自动修复）
 *
 * notiontemplafix 标记 ftp_hosted: true，只监控不修复
 */

const dns      = require('dns').promises;
const https    = require('https');
const fs       = require('fs');
const path     = require('path');
const { exec } = require('child_process');
const { HttpsProxyAgent } = require('https-proxy-agent');

// ── 常量 ─────────────────────────────────────────────────────────────────────
const GIT_PROXY = 'http://127.0.0.1:7897';
const GH_IPS    = ['185.199.108.153','185.199.109.153','185.199.110.153','185.199.111.153'];
const GH_PREFIX = '185.199.';

const GH_HEADERS = {
  'User-Agent': 'PMWorker-SiteRecovery/1.0',
  'Accept':     'application/vnd.github.v3+json',
};

const AGENT = new HttpsProxyAgent(GIT_PROXY);

// 6个站配置（与 projects.json 对应，ftp_hosted 标记只监控）
const SITES = [
  { id: 'wordcasefix',     domain: 'wordcasefix.com',     local: 'C:\\Users\\Administrator\\wordcasefix',     repo: 'woxxxxxxxx/wordcasefix',     ftp_hosted: false },
  { id: 'vestcalc',        domain: 'vestcalc.com',        local: 'C:\\Users\\Administrator\\vestcalc',        repo: 'woxxxxxxxx/vestcalc',        ftp_hosted: false },
  { id: 'contractfixpro',  domain: 'contractfixpro.com',  local: 'C:\\Users\\Administrator\\contractfixpro',  repo: 'woxxxxxxxx/contractfixpro',  ftp_hosted: false },
  { id: 'billingfixpro',   domain: 'billingfixpro.com',   local: 'C:\\Users\\Administrator\\billingfixpro',   repo: 'woxxxxxxxx/billingfixpro',   ftp_hosted: false },
  { id: 'payrollfixpro',   domain: 'payrollfixpro.com',   local: 'C:\\Users\\Administrator\\payrollfixpro',   repo: 'woxxxxxxxx/payrollfixpro',   ftp_hosted: false },
  { id: 'notiontemplafix', domain: 'notiontemplafix.com', local: null,                                         repo: null,                          ftp_hosted: true  },
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

function ghApiGet(apiPath) {
  return new Promise(resolve => {
    const req = https.request(
      { hostname: 'api.github.com', path: apiPath, method: 'GET', agent: AGENT, headers: GH_HEADERS },
      res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
          catch (_) { resolve({ status: res.statusCode, data: null }); }
        });
      }
    );
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, data: null }); });
    req.on('error', () => resolve({ status: 0, data: null }));
    req.end();
  });
}

// ── Step 1: DNS 检查 ──────────────────────────────────────────────────────────
async function checkDNS(domain) {
  try {
    const records = await dns.resolve4(domain);
    const ghIps   = records.filter(ip => ip.startsWith(GH_PREFIX));
    if (ghIps.length > 0) {
      return { ok: true, ips: records, detail: `A记录正确: ${ghIps.join(', ')}` };
    }
    return {
      ok: false, ips: records,
      detail: `A记录未指向 GitHub Pages IP（当前: ${records.join(', ')}，期望: 185.199.x.x）`,
    };
  } catch (e) {
    return { ok: false, ips: [], detail: `DNS 解析失败: ${e.message}` };
  }
}

// ── Step 2: GitHub Pages 部署状态 ─────────────────────────────────────────────
async function checkPagesDeployment(repo) {
  const { status, data } = await ghApiGet(`/repos/${repo}/pages`);
  if (status === 404 || !data) return { ok: false, enabled: false, detail: 'Pages 未启用（404）' };
  if (status !== 200)          return { ok: false, enabled: null,  detail: `API 错误 HTTP ${status}` };

  const buildStatus = data.status;  // built | building | queued | errored
  if (buildStatus === 'built')      return { ok: true,  enabled: true, buildStatus, detail: '已构建，部署正常' };
  if (buildStatus === 'errored')    return { ok: false, enabled: true, buildStatus, detail: '构建失败 (errored)' };
  if (buildStatus === 'building' || buildStatus === 'queued')
    return { ok: null, enabled: true, buildStatus, detail: `正在构建 (${buildStatus})，稍后再查` };

  return { ok: false, enabled: true, buildStatus, detail: `未知构建状态: ${buildStatus}` };
}

// ── Step 3: 本地分支同步检查 ──────────────────────────────────────────────────
async function checkBranchSync(localDir) {
  // 先 fetch 更新远端状态
  await shell(
    `git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false fetch --prune origin`,
    localDir, 20000
  );

  // 本地 master HEAD
  const masterHead = await shell('git rev-parse master 2>/dev/null || git rev-parse HEAD', localDir);
  if (!masterHead.ok) return { ok: false, detail: '无法读取本地 master HEAD' };

  // 远端 main HEAD（ls-remote 输出：<sha>\trefs/heads/main）
  const remoteMainRaw = await shell(
    `git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false ls-remote origin main`,
    localDir
  );
  const remoteMainSha = remoteMainRaw.stdout.split(/\s/)[0] || '';

  // 远端 master HEAD
  const remoteMasterRaw = await shell(
    `git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false ls-remote origin master`,
    localDir
  );
  const remoteMasterSha = remoteMasterRaw.stdout.split(/\s/)[0] || '';

  const localSha = masterHead.stdout.slice(0, 40);

  return {
    ok: true,
    localSha,
    remoteMasterSha,
    remoteMainSha,
    masterInSync:    !remoteMasterSha || remoteMasterSha === localSha,
    mainExists:      !!remoteMainSha,
    mainInSync:      !remoteMainSha  || remoteMainSha  === localSha,
    detail: `local:${localSha.slice(0,7)} remote/master:${remoteMasterSha.slice(0,7)||'—'} remote/main:${remoteMainSha.slice(0,7)||'—'}`,
  };
}

// ── Step 4: CNAME 文件检查 ────────────────────────────────────────────────────
function checkCNAME(localDir, expectedDomain) {
  const cnamePath = path.join(localDir, 'CNAME');
  if (!fs.existsSync(cnamePath)) {
    return { ok: false, exists: false, detail: 'CNAME 文件不存在' };
  }
  const content = fs.readFileSync(cnamePath, 'utf8').trim();
  if (content.toLowerCase() !== expectedDomain.toLowerCase()) {
    return { ok: false, exists: true, content, detail: `CNAME 内容错误: "${content}"，期望 "${expectedDomain}"` };
  }
  return { ok: true, exists: true, content, detail: `CNAME 正确: ${content}` };
}

// ── 自修复动作 ────────────────────────────────────────────────────────────────

/** 修复：master → 同步到远端 main */
async function fixSyncMainBranch(localDir) {
  log(`      🔧 push master:main --force`);
  const r = await shell(
    `git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false push origin master:main --force`,
    localDir, 30000
  );
  return r.ok
    ? { ok: true,  msg: `master:main --force 推送成功` }
    : { ok: false, msg: `push master:main 失败: ${r.stderr.slice(0, 200)}` };
}

/** 修复：空 commit 触发 Pages 重建 */
async function fixTriggerRebuild(localDir) {
  log(`      🔧 空 commit 触发 Pages 重建`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const r = await shell(
    `git commit --allow-empty -m "fix: trigger pages rebuild ${stamp}" && git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false push origin master`,
    localDir, 30000
  );
  return r.ok
    ? { ok: true,  msg: `空 commit 已推送，Pages 将在 2-5 分钟内重建` }
    : { ok: false, msg: `空 commit push 失败: ${r.stderr.slice(0, 200)}` };
}

/** 修复：写入 CNAME 并 push */
async function fixCNAME(localDir, domain) {
  log(`      🔧 写入 CNAME: ${domain}`);
  try {
    fs.writeFileSync(path.join(localDir, 'CNAME'), domain + '\n', { encoding: 'utf8' });
  } catch (e) {
    return { ok: false, msg: `写入 CNAME 失败: ${e.message}` };
  }
  const r = await shell(
    `git add CNAME && git commit -m "fix: restore CNAME for ${domain}" && git -c http.proxy=${GIT_PROXY} -c http.sslVerify=false push origin master`,
    localDir, 30000
  );
  return r.ok
    ? { ok: true,  msg: `CNAME 已写入并推送` }
    : { ok: false, msg: `CNAME push 失败: ${r.stderr.slice(0, 200)}` };
}

// ── 单站完整诊断 + 修复 ───────────────────────────────────────────────────────
async function recoverSite(site) {
  const { id, domain, local, repo, ftp_hosted } = site;
  const report = {
    id, domain, ftp_hosted,
    timestamp:   new Date().toISOString(),
    steps:       {},
    fixes:       [],
    needsEmail:  false,
    emailReason: [],
    resolved:    false,
  };

  log(`\n  ┌─ 深度诊断: ${domain} ${ftp_hosted ? '[FTP 仅监控]' : ''}`);

  // Step 1: DNS
  const dnsResult = await checkDNS(domain);
  report.steps.dns = dnsResult;
  log(`  │ DNS: ${dnsResult.ok ? '✅' : '❌'} ${dnsResult.detail}`);

  if (!dnsResult.ok) {
    // DNS 问题无法自动修复
    report.emailReason.push(`DNS异常: ${dnsResult.detail}`);
    report.needsEmail = true;
  }

  // FTP 托管站点：只做 DNS 监控，跳过后续 Git 操作
  if (ftp_hosted) {
    log(`  └─ ${domain} FTP 托管，跳过 Git/Pages 检查`);
    report.resolved = dnsResult.ok;
    return report;
  }

  // Step 2: GitHub Pages 部署状态
  let pagesFixed = false;
  if (repo) {
    const pagesResult = await checkPagesDeployment(repo);
    report.steps.pages = pagesResult;
    log(`  │ Pages: ${pagesResult.ok === true ? '✅' : pagesResult.ok === null ? '⏳' : '❌'} ${pagesResult.detail}`);

    if (pagesResult.ok === false && local) {
      // Pages 未构建或错误 → 尝试空 commit 触发
      const fix = await fixTriggerRebuild(local);
      report.fixes.push({ action: 'trigger_rebuild', ...fix });
      log(`  │ 修复(重建): ${fix.ok ? '✅' : '❌'} ${fix.msg}`);
      if (fix.ok) pagesFixed = true;
      else { report.emailReason.push(`Pages重建失败: ${fix.msg}`); report.needsEmail = true; }
    }
  }

  // Step 3: 分支同步
  if (local) {
    let branchResult;
    try {
      branchResult = await checkBranchSync(local);
      report.steps.branch = branchResult;
      log(`  │ 分支: ${branchResult.detail}`);

      // main 分支存在但不同步 → force push
      if (branchResult.ok && branchResult.mainExists && !branchResult.mainInSync) {
        log(`  │ ⚠️ main 分支落后 master，尝试同步`);
        const fix = await fixSyncMainBranch(local);
        report.fixes.push({ action: 'sync_main', ...fix });
        log(`  │ 修复(同步main): ${fix.ok ? '✅' : '❌'} ${fix.msg}`);
        if (!fix.ok) { report.emailReason.push(`同步main失败: ${fix.msg}`); report.needsEmail = true; }

        // 同步后再触发一次重建（确保 Pages 用最新代码）
        if (fix.ok && !pagesFixed) {
          const rebuild = await fixTriggerRebuild(local);
          report.fixes.push({ action: 'trigger_rebuild_after_sync', ...rebuild });
          log(`  │ 修复(重建after同步): ${rebuild.ok ? '✅' : '❌'} ${rebuild.msg}`);
          if (!rebuild.ok) { report.emailReason.push(`同步后重建失败: ${rebuild.msg}`); }
        }
      }
    } catch (e) {
      report.steps.branch = { ok: false, detail: `分支检查异常: ${e.message}` };
      log(`  │ 分支检查异常: ${e.message}`);
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

  // 综合判断
  const fixedCount = report.fixes.filter(f => f.ok).length;
  report.resolved  = fixedCount > 0 && report.emailReason.length === 0;
  log(`  └─ 完成: 修复${fixedCount}项, 需邮件=${report.needsEmail}`);
  return report;
}

// ── 主入口：对所有站点运行恢复流程 ──────────────────────────────────────────────
async function runSiteRecovery({ onlyUnreachable = true, siteIds = null } = {}) {
  const startTime = Date.now();
  log('════════════════════════════════════════');
  log('Site Recovery — ' + new Date().toLocaleString('zh-CN'));
  log('════════════════════════════════════════');

  const targets = siteIds
    ? SITES.filter(s => siteIds.includes(s.id))
    : SITES;

  const reports = [];
  for (const site of targets) {
    try {
      const r = await recoverSite(site);
      reports.push(r);
      await sleep(1000);
    } catch (e) {
      log(`  ❌ ${site.id} 整体异常: ${e.message}`);
      reports.push({ id: site.id, domain: site.domain, error: e.message, needsEmail: true, emailReason: [e.message] });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n════════════════ 完成 ${elapsed}s ════════════════`);

  // 汇总摘要
  const summary = reports.map(r => {
    if (r.error) return `❌ ${r.domain}: 异常 ${r.error}`;
    const fixes = (r.fixes || []).filter(f => f.ok).map(f => f.action).join(', ');
    const warn  = (r.emailReason || []).join('; ');
    if (fixes && !warn) return `🔧 ${r.domain}: 已自动修复 [${fixes}]`;
    if (warn)           return `⚠️ ${r.domain}: 需手动处理 — ${warn}`;
    return `✅ ${r.domain}: 正常`;
  }).join('\n');

  log('\n=== Recovery Report ===\n' + summary + '\n');
  return { reports, summary };
}

// ── 邮件通知（供 scheduler 调用）────────────────────────────────────────────────
async function sendRecoveryEmail(reports, smtpConfig) {
  const needAlert = reports.filter(r => r.needsEmail || r.error);
  if (!needAlert.length) return;

  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({
    host: smtpConfig.host, port: smtpConfig.port, secure: smtpConfig.secure,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    tls: { rejectUnauthorized: false },
  });

  for (const r of needAlert) {
    const subject = `[Site Recovery] ${r.domain} 修复结果`;
    const fixLines = (r.fixes || []).map((f, i) =>
      `  ${i+1}. [${f.action}] ${f.ok ? '✅成功' : '❌失败'}: ${f.msg}`
    ).join('\n');

    const stepsLines = Object.entries(r.steps || {}).map(([k, v]) =>
      `  ${k}: ${v.detail || JSON.stringify(v)}`
    ).join('\n');

    const body = `
站点：${r.domain}
时间：${new Date().toLocaleString('zh-CN')}

━━ 诊断结果 ━━
${stepsLines || '  （无诊断信息）'}

━━ 修复操作 ━━
${fixLines || '  （未执行修复）'}

━━ 需要手动处理 ━━
${(r.emailReason || []).map((x, i) => `  ${i+1}. ${x}`).join('\n') || '  （无）'}

━━ 手动修复建议 ━━
  1. 检查 DNS：确认 A 记录指向 185.199.108.153 等 GitHub Pages IP
  2. 检查仓库 Settings → Pages：确认 Source 分支和 Custom Domain
  3. 检查 GitHub Actions 部署日志
  4. 重新触发：在仓库 Actions 页手动 Re-run
    `.trim();

    await t.sendMail({
      from: smtpConfig.user, to: smtpConfig.to,
      subject, text: body,
    });
    log(`  📧 邮件已发送: ${subject}`);
  }
}

// 直接运行时（node site-recovery.js）
if (require.main === module) {
  runSiteRecovery().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runSiteRecovery, sendRecoveryEmail, SITES };
