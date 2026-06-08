'use strict';
/**
 * PM Worker — Monitor Engine
 * 全自动监控 + 分级修复 + 邮件节流
 *
 * 检查项：
 *   homepage_reachable  首页可访问
 *   ads_txt             ads.txt 存在且内容正确
 *   sitemap_xml         sitemap.xml 可访问
 *   tls_cert            HTTPS 证书有效
 *   pages_drop          Search Console 收录数骤降(>20%)
 *
 * 触发条件：连续 FAIL_THRESHOLD 次失败才触发修复/告警
 * 邮件节流：每个错误 key 最多发 MAX_EMAILS 封
 */

const https       = require('https');
const http        = require('http');
const fs          = require('fs');
const path        = require('path');
const { exec }    = require('child_process');
const nodemailer  = require('nodemailer');
const { HttpsProxyAgent } = require('https-proxy-agent');

// ── 常量 ─────────────────────────────────────────────────────────────────────
const BASE_DIR      = 'C:\\Users\\Administrator\\pm-worker';
const LOGS_DIR      = path.join(BASE_DIR, 'logs');
const STATE_FILE    = path.join(LOGS_DIR, 'monitor-state.json');
const LATEST_FILE   = path.join(LOGS_DIR, 'monitor-latest.json');
const ALERTS_FILE   = path.join(LOGS_DIR, 'alerts.json');
const PROJECTS_FILE = path.join(BASE_DIR, 'projects.json');

const PROXY          = 'http://127.0.0.1:7897';
const AGENT          = new HttpsProxyAgent(PROXY);
const TIMEOUT_MS     = 15000;
const RETRY_DELAY_MS = 5000;
const FAIL_THRESHOLD = 3;    // 连续N次才触发
const MAX_EMAILS     = 3;    // 每个错误最多发N封邮件

const SMTP = {
  host: 'smtp.qq.com', port: 465, secure: true,
  user: '295965231@qq.com', pass: 'msygvjzroawdbgce',
  to:   '295965231@qq.com',
};

const ADSENSE_PUB = 'pub-1638874323475457';

// GitHub Pages 需要检查的仓库（repo → expected domain）
// 注意：notiontemplafix 是 FTP 自托管，不在此列表
const GITHUB_PAGES_REPOS = [
  { repo: 'woxxxxxxxx/wordcasefix',     expectedDomain: 'wordcasefix.com',     projectId: 'wordcasefix'     },
  { repo: 'woxxxxxxxx/vestcalc',        expectedDomain: 'vestcalc.com',        projectId: 'vestcalc'        },
  { repo: 'woxxxxxxxx/contractfixpro',  expectedDomain: 'contractfixpro.com',  projectId: 'contractfixpro'  },
  { repo: 'woxxxxxxxx/billingfixpro',   expectedDomain: 'billingfixpro.com',   projectId: 'billingfixpro'   },
  { repo: 'woxxxxxxxx/payrollfixpro',   expectedDomain: 'payrollfixpro.com',   projectId: 'payrollfixpro'   },
];

// GitHub API User-Agent（必须，否则 403）
const GH_HEADERS = {
  'User-Agent': 'PMWorker-Monitor/1.0',
  'Accept':     'application/vnd.github.v3+json',
};

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return fallback; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { encoding: 'utf8' });
}

function loadProjects() {
  return readJson(PROJECTS_FILE).projects || [];
}

// ── HTTP 检查（带重试，单次调用层面的重试，用于 flap 抑制在上层做）─────────────
function httpGet(urlStr, { timeout = TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const u = new URL(urlStr);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'GET', agent: AGENT,
        headers: { 'User-Agent': 'Mozilla/5.0 PMWorker-Monitor/1.0' } },
      res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve({ ok: true, status: res.statusCode, body, error: null }));
        res.resume();
      }
    );
    req.setTimeout(timeout, () => { req.destroy(); resolve({ ok: false, status: 0, body: '', error: 'timeout' }); });
    req.on('error', e => {
      const errMsg = e.message || String(e);
      resolve({ ok: false, status: 0, body: '', error: errMsg });
    });
    req.end();
  });
}

// ── 状态管理 ─────────────────────────────────────────────────────────────────
function loadState() {
  return readJson(STATE_FILE, { failures: {}, emailCount: {}, lastFixed: {}, lastStatus: {} });
}

function saveState(state) { writeJson(STATE_FILE, state); }

/** 记录一次检查结果，返回连续失败次数 */
function recordCheck(state, key, passed) {
  if (!state.failures[key]) state.failures[key] = 0;
  if (passed) {
    state.failures[key] = 0;       // 通过则清零
    state.lastStatus[key] = 'ok';
  } else {
    state.failures[key]++;
    state.lastStatus[key] = 'fail';
  }
  return state.failures[key];
}

function canSendEmail(state, key) {
  if (!state.emailCount[key]) state.emailCount[key] = 0;
  return state.emailCount[key] < MAX_EMAILS;
}

function markEmailSent(state, key) {
  if (!state.emailCount[key]) state.emailCount[key] = 0;
  state.emailCount[key]++;
}

/** 当错误恢复时重置邮件计数，允许下次重新发送 */
function resetEmailCount(state, key) {
  state.emailCount[key] = 0;
}

// ── 邮件发送 ──────────────────────────────────────────────────────────────────
async function sendAlert({ project, domain, errorType, errorDetail, triedFixes, manualSteps }) {
  const subject = `[监控告警] ${project} · ${errorType}`;
  const body = `
站点：${project}（${domain}）
错误类型：${errorType}
错误详情：${errorDetail}

已自动尝试的修复操作：
${triedFixes.length ? triedFixes.map((f,i) => `  ${i+1}. ${f}`).join('\n') : '  （无）'}

建议手动处理步骤：
${manualSteps.map((s,i) => `  ${i+1}. ${s}`).join('\n')}

时间：${new Date().toLocaleString('zh-CN')}
  `.trim();

  const t = nodemailer.createTransport({
    host: SMTP.host, port: SMTP.port, secure: SMTP.secure,
    auth: { user: SMTP.user, pass: SMTP.pass },
    tls: { rejectUnauthorized: false },
  });
  await t.sendMail({ from: SMTP.user, to: SMTP.to, subject, text: body });
  log(`  📧 邮件已发送: ${subject}`);
}

// ── 追加 alert.json ───────────────────────────────────────────────────────────
function appendAlertFile({ project, domain, message, level = 'medium' }) {
  let alerts = readJson(ALERTS_FILE, []);
  if (!Array.isArray(alerts)) alerts = [];
  alerts.push({ id: `alert-${Date.now()}`, project, domain, message, level, time: new Date().toISOString() });
  writeJson(ALERTS_FILE, alerts);
}

// ── 自动修复动作 ──────────────────────────────────────────────────────────────

/** 执行 shell 命令，返回 { ok, stdout, stderr } */
function shell(cmd, cwd) {
  return new Promise(resolve => {
    exec(cmd, { cwd, timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: stdout || '', stderr: stderr || '', code: err?.code });
    });
  });
}

/** 修复 ads.txt：写入正确内容并 git push */
async function fixAdsTxt(project) {
  const localDir = project.local;
  const correct  = `google.com, ${ADSENSE_PUB}, DIRECT, f08c47fec0942fa0\n`;

  log(`    → 写入正确 ads.txt: ${localDir}`);
  try {
    fs.writeFileSync(path.join(localDir, 'ads.txt'), correct, { encoding: 'utf8' });
  } catch (e) {
    return { ok: false, msg: `写文件失败: ${e.message}` };
  }

  const push = await shell(
    'git add ads.txt && git commit -m "fix: restore correct ads.txt" && git -c http.proxy=http://127.0.0.1:7897 -c http.sslVerify=false push origin master',
    localDir
  );
  if (!push.ok) return { ok: false, msg: `git push 失败: ${push.stderr.slice(0, 200)}` };
  return { ok: true, msg: 'ads.txt 已修复并推送' };
}

/** 修复 sitemap：调用 Claude Code 的 publish-worker 重新生成 */
async function fixSitemap(project) {
  const localDir = project.local;

  // 扫描所有 html 文件，生成 sitemap
  log(`    → 重新生成 sitemap.xml: ${localDir}`);
  try {
    const htmlFiles = fs.readdirSync(localDir, { recursive: true })
      .filter(f => String(f).endsWith('.html'))
      .map(f => `https://${project.domain}/${String(f).replace(/\\/g, '/').replace(/^index\.html$/, '')}`)
      .filter(u => !u.includes('node_modules'));

    const toolsDir = path.join(localDir, 'tools');
    let toolUrls = [];
    if (fs.existsSync(toolsDir)) {
      toolUrls = fs.readdirSync(toolsDir)
        .filter(f => f.endsWith('.html'))
        .map(f => `https://${project.domain}/tools/${f}`);
    }

    const allUrls = [...new Set([`https://${project.domain}/`, ...htmlFiles, ...toolUrls])];
    const today   = new Date().toISOString().slice(0, 10);
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      allUrls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')
    }\n</urlset>\n`;

    fs.writeFileSync(path.join(localDir, 'sitemap.xml'), sitemap, { encoding: 'utf8' });
    log(`    → 生成 ${allUrls.length} 条 URL`);
  } catch (e) {
    return { ok: false, msg: `生成 sitemap 失败: ${e.message}` };
  }

  const push = await shell(
    'git add sitemap.xml && git commit -m "fix: regenerate sitemap.xml" && git -c http.proxy=http://127.0.0.1:7897 -c http.sslVerify=false push origin master',
    localDir
  );
  if (!push.ok) return { ok: false, msg: `git push 失败: ${push.stderr.slice(0, 200)}` };
  return { ok: true, msg: `sitemap.xml 已重新生成并推送` };
}

/** 修复 homepage unreachable：空 commit 触发 GitHub Pages 重新部署 */
async function fixHomePageDeploy(project) {
  log(`    → 触发空 commit 重新部署: ${project.local}`);
  const r = await shell(
    `git commit --allow-empty -m "fix: trigger redeploy [$(date +%Y%m%d%H%M%S)]" && git -c http.proxy=http://127.0.0.1:7897 -c http.sslVerify=false push origin master`,
    project.local
  );
  if (!r.ok) return { ok: false, msg: `空 commit push 失败: ${r.stderr.slice(0, 200)}` };
  return { ok: true, msg: '已触发空 commit 重新部署，等待 GitHub Pages 生效（通常2-5分钟）' };
}

// ── GitHub Pages 检查 ────────────────────────────────────────────────────────

/**
 * 触发 GitHub Pages 重新构建（无 token 时用空 commit push）
 */
async function triggerPagesBuild(repo, localDir) {
  if (!localDir) return { ok: false, msg: '无本地目录，无法触发重部署' };
  const r = await shell(
    `git commit --allow-empty -m "fix: trigger pages rebuild" && git -c http.proxy=http://127.0.0.1:7897 -c http.sslVerify=false push origin master`,
    localDir
  );
  return r.ok
    ? { ok: true,  msg: '空 commit push 已触发，GitHub Pages 将在 2-5 分钟内重建' }
    : { ok: false, msg: `push 失败: ${r.stderr.slice(0, 150)}` };
}

/**
 * 检查单个仓库的 GitHub Pages 状态
 * 策略：直接 HTTP 请求域名，返回 200 即视为正常；不依赖 GitHub API（易误判）
 * 返回结构：{ repo, projectId, enabled, domainOk, httpsOk, buildOk, issues[], detail }
 */
async function checkOneGitHubPages({ repo, expectedDomain, projectId }, projects, state) {
  log(`    gh-pages: ${repo} → HTTP check https://${expectedDomain}/`);
  const result = { repo, projectId, expectedDomain };

  const httpResult = await httpGet(`https://${expectedDomain}/`);
  const siteOk = httpResult.ok && httpResult.status >= 200 && httpResult.status < 400;

  if (siteOk) {
    result.enabled  = true;
    result.domainOk = true;
    result.httpsOk  = true;
    result.buildOk  = true;
    result.issues   = [];
    result.detail   = `Pages 正常 (HTTP ${httpResult.status})`;
    log(`      ✅ Pages 正常 HTTP ${httpResult.status}`);

    const key = `${projectId}:gh_pages_enabled`;
    if (state.failures[key] >= FAIL_THRESHOLD) resetEmailCount(state, key);
    recordCheck(state, key, true);
  } else {
    const errMsg = httpResult.error || `HTTP ${httpResult.status}`;
    result.enabled  = false;
    result.domainOk = false;
    result.httpsOk  = false;
    result.buildOk  = false;
    result.issues   = [`站点不可访问 (${errMsg})`];
    result.detail   = `站点无法访问: ${errMsg}`;
    log(`      ❌ 站点不可访问: ${errMsg}`);

    const key = `${projectId}:gh_pages_enabled`;
    const fails = recordCheck(state, key, false);
    if (fails >= FAIL_THRESHOLD && canSendEmail(state, key)) {
      const proj = projects.find(p => p.id === projectId);
      const tried = [];
      if (proj?.local && !state.lastFixed[key]) {
        const r = await triggerPagesBuild(repo, proj.local);
        tried.push(r.msg);
        state.lastFixed[key] = Date.now();
        if (r.ok) { log(`      🔧 已触发空 commit 重建`); }
      }
      await sendAlert({
        project: projectId, domain: expectedDomain,
        errorType: 'GitHub Pages 站点不可访问',
        errorDetail: result.detail,
        triedFixes: tried.length ? tried : ['无自动操作'],
        manualSteps: [
          `访问 https://github.com/${repo}/settings/pages`,
          '确认 Source 已选择 Branch: master / (root)',
          '确认 Custom domain 填入 ' + expectedDomain,
          '勾选 Enforce HTTPS',
        ],
      }).catch(e => log(`      ⚠️ 邮件失败: ${e.message}`));
      markEmailSent(state, key);
      appendAlertFile({ project: projectId, domain: expectedDomain, message: `站点不可访问: ${errMsg}`, level: 'high' });
    }
  }

  return result;
}

/**
 * 并发检查所有仓库的 GitHub Pages，返回 { [projectId]: result } 映射
 */
async function checkAllGitHubPages(projects, state) {
  log('\n  ── GitHub Pages 配置检查 ──');
  const results = {};
  // 串行（避免 GitHub API 频率限制）
  for (const repoConf of GITHUB_PAGES_REPOS) {
    try {
      const r = await checkOneGitHubPages(repoConf, projects, state);
      results[repoConf.projectId] = r;
    } catch (e) {
      log(`    ❌ ${repoConf.repo} 检查异常: ${e.message}`);
      results[repoConf.projectId] = { repo: repoConf.repo, projectId: repoConf.projectId, error: e.message };
    }
    await sleep(500); // 避免 GitHub API 60次/小时 速率限制
  }
  return results;
}

// ── 分支冲突检测（main vs master）────────────────────────────────────────────
/**
 * 检查各仓库是否同时存在 main 和 master 分支（规范：统一只用 master）
 * 用 git ls-remote 走本地代理，不消耗 GitHub API 配额
 */
async function checkBranchConflicts(projects, state) {
  log('\n  ── 分支冲突检查 (main/master) ──');
  const results = {};
  for (const repoConf of GITHUB_PAGES_REPOS) {
    const proj = projects.find(p => p.id === repoConf.projectId);
    if (!proj?.local) { results[repoConf.projectId] = { skipped: true }; continue; }

    const r = await shell(
      'git -c http.proxy=http://127.0.0.1:7897 ls-remote --heads origin',
      proj.local
    );
    const lines     = (r.stdout || '').split('\n').filter(l => l.includes('refs/heads/'));
    const hasMaster = lines.some(l => l.endsWith('refs/heads/master'));
    const hasMain   = lines.some(l => l.endsWith('refs/heads/main'));
    const key       = `${repoConf.projectId}:branch_conflict`;

    if (hasMain && hasMaster) {
      log(`    ⚠️ ${repoConf.projectId}: 同时存在 main + master（需手动删除 main）`);
      results[repoConf.projectId] = { conflict: true, branches: ['main', 'master'] };
      const fails = recordCheck(state, key, false);
      if (fails >= 1 && canSendEmail(state, key)) {
        appendAlertFile({
          project: repoConf.projectId, domain: repoConf.expectedDomain,
          message: '仓库同时存在 main 和 master 分支，Pages 部署可能不一致。需在 GitHub Settings→General 将默认分支改为 master 后执行: git push origin --delete main',
          level: 'high',
        });
        markEmailSent(state, key);
      }
    } else {
      const branch = hasMaster ? 'master' : (hasMain ? 'main' : '未知');
      log(`    ✅ ${repoConf.projectId}: 分支正常 (${branch})`);
      results[repoConf.projectId] = { conflict: false, branch };
      if ((state.failures[key] || 0) >= 1) resetEmailCount(state, key);
      recordCheck(state, key, true);
    }
  }
  return results;
}

// ── 单个项目检查 ──────────────────────────────────────────────────────────────
async function checkProject(project, state) {
  const { id, domain, local, adsense, monetization, search_console_pages } = project;
  const base    = `https://${domain}`;
  const results = [];

  log(`\n  ── ${domain} ──`);

  // ── 1. TLS + 首页可访问 ────────────────────────────────────────────────────
  const homeRes  = await httpGet(base);
  const tlsError = homeRes.error && (
    homeRes.error.includes('CERT') ||
    homeRes.error.includes('certificate') ||
    homeRes.error.includes('ERR_TLS') ||
    homeRes.error.includes('SSL')
  );
  const homeOk   = homeRes.ok && homeRes.status >= 200 && homeRes.status < 400;

  // TLS 检查
  const tlsKey    = `${id}:tls_cert`;
  const tlsFails  = recordCheck(state, tlsKey, !tlsError);
  if (tlsError) {
    log(`    ❌ TLS 证书错误 (连续${tlsFails}次): ${homeRes.error}`);
    results.push({ check: 'tls_cert', ok: false, detail: homeRes.error });
    if (tlsFails >= FAIL_THRESHOLD) {
      // TLS 错误需要在 GitHub Pages 重新 Enforce HTTPS，无法自动操作，直接邮件
      if (canSendEmail(state, tlsKey)) {
        await sendAlert({
          project: id, domain,
          errorType: 'HTTPS证书错误',
          errorDetail: homeRes.error,
          triedFixes: ['自动修复不适用（需要 GitHub Pages 管理员权限）'],
          manualSteps: [
            '登录 GitHub → 进入仓库 Settings → Pages',
            '在 Custom domain 处点击 Remove 并 Save',
            '等待约 1 分钟 DNS 解析',
            '重新填入域名并勾选 Enforce HTTPS，Save',
          ],
        }).catch(e => log(`    ⚠️ 邮件发送失败: ${e.message}`));
        markEmailSent(state, tlsKey);
        appendAlertFile({ project: id, domain, message: `HTTPS证书错误: ${homeRes.error}`, level: 'high' });
      }
    }
  } else if (!tlsError) {
    if (state.failures[tlsKey] >= FAIL_THRESHOLD) resetEmailCount(state, tlsKey);
  }

  // 首页可访问
  const homeKey   = `${id}:homepage_reachable`;
  const homeFails = recordCheck(state, homeKey, homeOk);
  if (!homeOk && !tlsError) {
    log(`    ❌ 首页不可访问 (连续${homeFails}次): status=${homeRes.status} err=${homeRes.error || '-'}`);
    results.push({ check: 'homepage_reachable', ok: false, detail: homeRes.error || `HTTP ${homeRes.status}` });
    if (homeFails >= FAIL_THRESHOLD) {
      const tried = [];
      let fixed = false;

      // 尝试空 commit 重部署
      if (!state.lastFixed[homeKey] || Date.now() - state.lastFixed[homeKey] > 30 * 60 * 1000) {
        log(`    🔧 尝试自动修复: 空 commit 重部署`);
        const r = await fixHomePageDeploy(project);
        tried.push(`空 commit 重部署: ${r.msg}`);
        state.lastFixed[homeKey] = Date.now();
        if (r.ok) {
          fixed = true;
          log(`    ✅ 修复操作已提交，等待 GitHub Pages 生效`);
          writeJson(STATE_FILE, state); // 立即保存
        }
      }

      if (!fixed && canSendEmail(state, homeKey)) {
        await sendAlert({
          project: id, domain,
          errorType: '网站无法访问',
          errorDetail: homeRes.error || `HTTP ${homeRes.status}`,
          triedFixes: tried,
          manualSteps: [
            '检查 GitHub Pages 部署状态：仓库 → Actions',
            '检查 Hostinger DNS：A记录是否指向 185.199.108.153 等 GitHub Pages IP',
            '手动触发部署：在仓库主页点击 Code → 随机修改空格 → commit push',
          ],
        }).catch(e => log(`    ⚠️ 邮件发送失败: ${e.message}`));
        markEmailSent(state, homeKey);
        appendAlertFile({ project: id, domain, message: `首页不可访问 (${homeRes.error || 'HTTP '+homeRes.status})`, level: 'high' });
      }
    }
  } else if (homeOk) {
    if (state.failures[homeKey] >= FAIL_THRESHOLD) { log(`    🔔 ${domain} 首页恢复正常`); resetEmailCount(state, homeKey); }
    results.push({ check: 'homepage_reachable', ok: true, detail: `HTTP ${homeRes.status}` });
    log(`    ✅ 首页 HTTP ${homeRes.status}`);
  }

  // ── 2. ads.txt ─────────────────────────────────────────────────────────────
  if (adsense !== 'skip') {
    const adsRes  = await httpGet(`${base}/ads.txt`);
    const adsOk   = adsRes.ok && adsRes.status === 200 && adsRes.body.includes(ADSENSE_PUB);
    const adsKey  = `${id}:ads_txt`;
    const adsFails = recordCheck(state, adsKey, adsOk);

    if (!adsOk) {
      const reason = !adsRes.ok ? `不可访问(${adsRes.error||'HTTP '+adsRes.status})` : '内容不含正确 pub-id';
      log(`    ❌ ads.txt 异常 (连续${adsFails}次): ${reason}`);
      results.push({ check: 'ads_txt', ok: false, detail: reason });
      if (adsFails >= FAIL_THRESHOLD) {
        let tried = [];
        let fixed = false;
        if (local && !state.lastFixed[adsKey]) {
          log(`    🔧 尝试自动修复: 写入正确 ads.txt 并 push`);
          const r = await fixAdsTxt(project);
          tried.push(r.msg);
          state.lastFixed[adsKey] = Date.now();
          if (r.ok) { fixed = true; log(`    ✅ ads.txt 已自动修复`); }
        }
        if (!fixed && canSendEmail(state, adsKey)) {
          await sendAlert({
            project: id, domain,
            errorType: 'ads.txt 缺失或错误',
            errorDetail: reason,
            triedFixes: tried,
            manualSteps: [
              `在项目根目录创建 ads.txt，内容：google.com, ${ADSENSE_PUB}, DIRECT, f08c47fec0942fa0`,
              'git add ads.txt && git commit -m "fix: ads.txt" && git -c http.proxy=http://127.0.0.1:7897 -c http.sslVerify=false push origin master',
            ],
          }).catch(e => log(`    ⚠️ 邮件发送失败: ${e.message}`));
          markEmailSent(state, adsKey);
          appendAlertFile({ project: id, domain, message: `ads.txt 异常: ${reason}`, level: 'medium' });
        }
      }
    } else {
      if (state.failures[adsKey] >= FAIL_THRESHOLD) resetEmailCount(state, adsKey);
      results.push({ check: 'ads_txt', ok: true, detail: 'pub-id 正确' });
      log(`    ✅ ads.txt 正常`);
    }
  }

  // ── 3. sitemap.xml ─────────────────────────────────────────────────────────
  const sitemapRes  = await httpGet(`${base}/sitemap.xml`);
  const sitemapOk   = sitemapRes.ok && sitemapRes.status === 200 && sitemapRes.body.includes('<url>');
  const sitemapKey  = `${id}:sitemap_xml`;
  const sitemapFails = recordCheck(state, sitemapKey, sitemapOk);

  if (!sitemapOk) {
    const reason = !sitemapRes.ok ? `不可访问` : '内容格式异常';
    log(`    ❌ sitemap.xml 异常 (连续${sitemapFails}次): ${reason}`);
    results.push({ check: 'sitemap_xml', ok: false, detail: reason });
    if (sitemapFails >= FAIL_THRESHOLD) {
      let tried = [];
      let fixed = false;
      if (local && !state.lastFixed[sitemapKey]) {
        log(`    🔧 尝试自动修复: 重新生成 sitemap.xml`);
        const r = await fixSitemap(project);
        tried.push(r.msg);
        state.lastFixed[sitemapKey] = Date.now();
        if (r.ok) { fixed = true; log(`    ✅ sitemap.xml 已自动修复`); }
      }
      if (!fixed && canSendEmail(state, sitemapKey)) {
        await sendAlert({
          project: id, domain,
          errorType: 'sitemap.xml 无法访问',
          errorDetail: reason,
          triedFixes: tried,
          manualSteps: [
            '检查项目根目录是否存在 sitemap.xml',
            '手动生成并 push：node gen_tools.py 或手动创建',
            '确认 GitHub Pages 已正确部署',
          ],
        }).catch(e => log(`    ⚠️ 邮件发送失败: ${e.message}`));
        markEmailSent(state, sitemapKey);
        appendAlertFile({ project: id, domain, message: `sitemap.xml 异常: ${reason}`, level: 'medium' });
      }
    }
  } else {
    if (state.failures[sitemapKey] >= FAIL_THRESHOLD) resetEmailCount(state, sitemapKey);
    const urlCount = (sitemapRes.body.match(/<url>/g) || []).length;
    results.push({ check: 'sitemap_xml', ok: true, detail: `${urlCount} 条 URL` });
    log(`    ✅ sitemap.xml 正常 (${urlCount} URLs)`);
  }

  // ── 4. Search Console 收录骤降 ─────────────────────────────────────────────
  if (search_console_pages) {
    const pagesKey = `${id}:pages_drop`;
    // 从最新 monitor 日志里读上次收录数（简单：用 state 存）
    const lastPages = state[`${id}_last_pages`] || search_console_pages;
    const dropPct   = lastPages > 0 ? (lastPages - search_console_pages) / lastPages * 100 : 0;

    if (dropPct > 20) {
      const dropFails = recordCheck(state, pagesKey, false);
      log(`    ⚠️ 收录页数下降 ${dropPct.toFixed(0)}%: ${lastPages} → ${search_console_pages}`);
      results.push({ check: 'pages_drop', ok: false, detail: `${lastPages} → ${search_console_pages} (-${dropPct.toFixed(0)}%)` });
      if (dropFails >= FAIL_THRESHOLD && canSendEmail(state, pagesKey)) {
        await sendAlert({
          project: id, domain,
          errorType: 'Search Console 收录数骤降',
          errorDetail: `${lastPages} 页 → ${search_console_pages} 页 (下降 ${dropPct.toFixed(0)}%)`,
          triedFixes: ['无自动修复方案'],
          manualSteps: [
            '登录 Google Search Console 查看覆盖率报告',
            '检查是否有新增 noindex 标签或 robots.txt 误封',
            '查看是否有 404/重定向链接影响收录',
            '提交受影响的 URL 重新抓取',
          ],
        }).catch(e => log(`    ⚠️ 邮件发送失败: ${e.message}`));
        markEmailSent(state, pagesKey);
        appendAlertFile({ project: id, domain, message: `收录数骤降 ${dropPct.toFixed(0)}%: ${lastPages}→${search_console_pages}`, level: 'high' });
      }
    } else {
      recordCheck(state, pagesKey, true);
      state[`${id}_last_pages`] = search_console_pages;
    }
  }

  return results;
}

// ── 主函数 ────────────────────────────────────────────────────────────────────
async function runMonitor() {
  const startTime = Date.now();
  log('════════════════════════════════════');
  log('Monitor Engine — ' + new Date().toLocaleString('zh-CN'));
  log('════════════════════════════════════');

  const projects = loadProjects();
  const state    = loadState();
  const report   = { timestamp: new Date().toISOString(), projects: {}, github_pages: {} };
  let totalFail  = 0;

  // 站点可用性 + ads/sitemap 检查
  for (const project of projects) {
    try {
      const results = await checkProject(project, state);
      report.projects[project.id] = results;
      const fails = results.filter(r => !r.ok).length;
      if (fails) totalFail += fails;
      await sleep(800);
    } catch (e) {
      log(`  ❌ 检查 ${project.id} 时异常: ${e.message}`);
      report.projects[project.id] = [{ check: 'exception', ok: false, detail: e.message }];
      totalFail++;
    }
  }

  // GitHub Pages 配置检查
  try {
    report.github_pages = await checkAllGitHubPages(projects, state);
    const pagesFails = Object.values(report.github_pages).filter(r => r.issues?.length > 0).length;
    if (pagesFails) totalFail += pagesFails;
  } catch (e) {
    log(`  ❌ GitHub Pages 检查整体异常: ${e.message}`);
    report.github_pages = { error: e.message };
  }

  // 分支冲突检查
  try {
    report.branch_conflicts = await checkBranchConflicts(projects, state);
    const branchFails = Object.values(report.branch_conflicts).filter(r => r.conflict).length;
    if (branchFails) totalFail += branchFails;
  } catch (e) {
    log(`  ❌ 分支冲突检查异常: ${e.message}`);
    report.branch_conflicts = { error: e.message };
  }

  // 保存状态和报告
  saveState(state);
  writeJson(LATEST_FILE, report);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n════════════════════════════════════`);
  log(`监控完成 耗时${elapsed}s | 项目:${projects.length} | 异常项:${totalFail}`);
  log(`════════════════════════════════════`);

  // 输出简报（供 scheduler 写日志用）
  const summary = projects.map(p => {
    const results   = report.projects[p.id] || [];
    const fails     = results.filter(r => !r.ok);
    const pagesInfo = report.github_pages[p.id];
    const pagesTag  = !pagesInfo          ? ''
      : pagesInfo.issues?.length > 0      ? ` | Pages⚠️${pagesInfo.issues[0]}`
      : pagesInfo.enabled === false        ? ' | Pages❌未启用'
      :                                      ' | Pages✅';
    if (!fails.length) return `✅ ${p.domain}：全部正常${pagesTag}`;
    return `❌ ${p.domain}：${fails.map(f => `${f.check}(${f.detail})`).join(', ')}${pagesTag}`;
  }).join('\n');

  // Pages 专项摘要（含 payrollfixpro 等额外仓库）
  const pagesExtra = GITHUB_PAGES_REPOS
    .filter(r => !projects.find(p => p.id === r.projectId))
    .map(r => {
      const pg = report.github_pages[r.projectId];
      if (!pg) return `  ❓ ${r.repo}：未检查`;
      if (pg.error) return `  ❌ ${r.repo}：${pg.error}`;
      if (!pg.enabled) return `  ❌ ${r.repo}：Pages 未启用`;
      if (pg.issues?.length) return `  ⚠️ ${r.repo}：${pg.issues.join('; ')}`;
      return `  ✅ ${r.repo}：正常`;
    }).join('\n');

  console.log('\n=== Monitor Report ===\n' + summary + (pagesExtra ? '\n\n=== 额外 Pages 检查 ===\n' + pagesExtra : '') + '\n');
  return report;
}

// 直接运行时执行监控
if (require.main === module) {
  runMonitor().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { runMonitor };
