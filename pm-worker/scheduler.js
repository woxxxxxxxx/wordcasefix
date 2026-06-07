const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { runMonitor } = require('./monitor-engine');
const { runSiteRecovery, sendRecoveryEmail } = require('./site-recovery');
const { refillBuffer } = require('./buffer-refill');

const BASE_DIR = 'C:\\Users\\Administrator\\pm-worker';
const PROJECTS_FILE = path.join(BASE_DIR, 'projects.json');
const LOGS_DIR = path.join(BASE_DIR, 'logs');
const WORKERS_DIR = path.join(BASE_DIR, 'workers');

function loadConfig() {
  return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
}

// 无 BOM 的 UTF-8 写入（避免 JSON.parse 因 BOM 报错）
function writeJsonNoBOM(filePath, data) {
  const text = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, text, { encoding: 'utf8' });
}

// 向 alerts.json 追加一条告警（结构化格式）
function appendAlert({ project, domain, message, level = 'medium' }) {
  const alertPath = path.join(LOGS_DIR, 'alerts.json');
  let alerts = [];
  try { alerts = JSON.parse(fs.readFileSync(alertPath, 'utf8')); } catch (_) {}
  alerts.push({
    id:      `alert-${Date.now()}`,
    project: project || null,
    domain:  domain  || null,
    message,
    level,
    time: new Date().toISOString(),
  });
  writeJsonNoBOM(alertPath, alerts);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function runWorker(workerFile, input = '') {
  return new Promise((resolve, reject) => {
    const taskPath = path.join(WORKERS_DIR, workerFile);
    const child = spawn('claude', [
      '--model', 'claude-sonnet-4-5',
      '--dangerously-skip-permissions',
      '-p',
      `read ${taskPath} and execute the task. Additional context: ${input}`
    ], {
      cwd: BASE_DIR,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Worker ${workerFile} failed (exit ${code}): ${errorOutput}`));
      }
    });
  });
}

function writeLog(name, data) {
  const logPath = path.join(LOGS_DIR, `${name}-${today()}.json`);
  fs.writeFileSync(logPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    ...data
  }, null, 2));
  console.log(`📝 日志已写入: ${logPath}`);
}

async function sendEmail(subject, content, htmlContent) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: '295965231@qq.com',
      pass: 'msygvjzroawdbgce'
    },
    tls: { rejectUnauthorized: false }
  });

  await transporter.sendMail({
    from: '295965231@qq.com',
    to: '295965231@qq.com',
    subject: `[PM Worker] ${subject}`,
    text: content,
    ...(htmlContent ? { html: htmlContent } : {})
  });
  console.log(`📧 邮件已发送: ${subject}`);
}

/**
 * 将 PM Worker 纯文本计划转换为暗色 HTML 邮件
 * 解析 P0/P1/P2/P3 任务、项目状态总览、等待中三个区块
 */
function buildDailyPlanHtml(text, dateStr, projects) {
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const lines = text.split('\n');

  // ── 解析各区块 ────────────────────────────────────────────────────────────
  const statusLines  = [];
  const taskLines    = [];
  const waitingLines = [];
  let mode = '';

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.includes('项目状态总览'))       { mode = 'status';  continue; }
    if (t.includes('今日任务') || t.includes('任务（按优先级）')) { mode = 'tasks';   continue; }
    if (t.includes('等待中'))             { mode = 'waiting'; continue; }
    if (mode === 'status'  && (t.startsWith('-') || t.startsWith('•'))) statusLines.push(t.replace(/^[-•]\s*/, ''));
    if (mode === 'tasks'   && /^P[0-3]/i.test(t)) taskLines.push(t);
    if (mode === 'waiting' && (t.startsWith('-') || t.startsWith('•'))) waitingLines.push(t.replace(/^[-•]\s*/, ''));
  }

  // ── 项目状态卡片 ─────────────────────────────────────────────────────────
  // 尝试从 projects.json 里拿项目列表，和 statusLines 做对比
  const projList = (projects || []).map(p => {
    const matched = statusLines.find(l => l.toLowerCase().includes(p.id) || l.toLowerCase().includes(p.domain));
    const desc    = matched ? matched.replace(new RegExp(p.id + '[:：]?', 'i'), '').replace(new RegExp(p.domain + '[:：]?', 'i'), '').trim() : (p.status || '');
    const isOk    = !/❌|失败|异常|错误|待|pending/i.test(desc);
    return { id: p.id, domain: p.domain, desc, isOk };
  });

  const projectCards = projList.length ? projList.map(p => `
    <div style="background:${p.isOk ? '#052e1a' : '#2d0f0f'};border:1px solid ${p.isOk ? '#065f46' : '#7f1d1d'};border-radius:10px;padding:14px 16px;min-width:150px;flex:1">
      <div style="font-size:18px;margin-bottom:6px">${p.isOk ? '🟢' : '🔴'}</div>
      <div style="color:${p.isOk ? '#4ade80' : '#f87171'};font-weight:700;font-size:13px;margin-bottom:4px">${esc(p.id)}</div>
      <div style="color:#94a3b8;font-size:11px;line-height:1.5">${esc(p.desc || p.domain)}</div>
    </div>`).join('') : statusLines.map(l => `
    <div style="background:#0a1a2e;border:1px solid #1e3a5f;border-radius:10px;padding:14px 16px;flex:1">
      <div style="color:#94a3b8;font-size:12px">${esc(l)}</div>
    </div>`).join('');

  // ── 任务列表 ─────────────────────────────────────────────────────────────
  const priorityMeta = {
    P0: { bg: '#2d0f0f', border: '#7f1d1d', color: '#f87171', label: 'P0 紧急', icon: '🔴' },
    P1: { bg: '#1c1304', border: '#78350f', color: '#fbbf24', label: 'P1 今日必做', icon: '🟠' },
    P2: { bg: '#0a1628', border: '#1e3a5f', color: '#60a5fa', label: 'P2 今日推进', icon: '🔵' },
    P3: { bg: '#0f172a', border: '#1e293b', color: '#94a3b8', label: 'P3 本周推进', icon: '⚪' },
  };

  const taskGroups = { P0: [], P1: [], P2: [], P3: [] };
  for (const t of taskLines) {
    const m = t.match(/^(P[0-3])[:\s]+(.+)$/i);
    if (m) {
      const pKey = m[1].toUpperCase();
      if (taskGroups[pKey]) taskGroups[pKey].push(m[2]);
    }
  }

  const tasksHtml = Object.entries(taskGroups).filter(([,v]) => v.length).map(([p, items]) => {
    const meta = priorityMeta[p];
    return `
    <div style="background:${meta.bg};border:1px solid ${meta.border};border-radius:10px;padding:16px;margin-bottom:12px">
      <div style="color:${meta.color};font-weight:700;font-size:13px;margin-bottom:10px">${meta.icon} ${meta.label}</div>
      ${items.map(item => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid ${meta.border}">
        <span style="color:${meta.color};font-size:14px;margin-top:1px">›</span>
        <span style="color:#cbd5e1;font-size:13px;line-height:1.6">${esc(item)}</span>
      </div>`).join('')}
    </div>`;
  }).join('') || `<div style="color:#64748b;font-size:13px;padding:12px">暂无结构化任务，完整计划见下方</div>`;

  // ── 等待中 ────────────────────────────────────────────────────────────────
  const waitingHtml = waitingLines.length ? waitingLines.map(l => {
    const parts = l.split(/→|->/).map(s => s.trim());
    return `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid #1e3a5f">
      <span style="color:#60a5fa;font-size:14px">⏳</span>
      <div style="flex:1">
        <span style="color:#94a3b8;font-size:13px">${esc(parts[0])}</span>
        ${parts[1] ? `<span style="color:#475569;font-size:12px"> → ${esc(parts[1])}</span>` : ''}
      </div>
    </div>`;
  }).join('') : '<div style="color:#64748b;font-size:13px;padding:8px 0">无等待项</div>';

  // ── 原文折叠块（保底，防止解析遗漏信息）────────────────────────────────
  const rawBlock = `
    <details style="margin-top:8px">
      <summary style="color:#475569;font-size:12px;cursor:pointer;user-select:none">📄 查看原始计划文本</summary>
      <pre style="margin-top:10px;padding:14px;background:#0a0a14;border:1px solid #1e293b;border-radius:8px;color:#64748b;font-size:11px;line-height:1.7;white-space:pre-wrap;word-break:break-word">${esc(text)}</pre>
    </details>`;

  // 下次计划时间（次日 8:00）
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 1);
  nextDate.setHours(8, 0, 0, 0);
  const nextStr = nextDate.toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0">
  <div style="max-width:700px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:1px solid #2d3748;border-radius:12px;padding:22px 26px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:14px">
        <span style="font-size:32px">📋</span>
        <div>
          <div style="font-size:20px;font-weight:800;color:#e2e8f0">PM Worker 今日计划</div>
          <div style="font-size:13px;color:#64748b;margin-top:3px">${esc(dateStr)}</div>
        </div>
      </div>
    </div>

    <!-- 项目状态总览 -->
    <div style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">📊 项目状态总览</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px">
      ${projectCards}
    </div>

    <!-- 今日任务 -->
    <div style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">🔥 今日任务（按优先级）</div>
    ${tasksHtml}

    <!-- 等待中 -->
    <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:10px;padding:16px;margin-bottom:16px">
      <div style="color:#60a5fa;font-weight:700;font-size:13px;margin-bottom:4px">⏭️ 等待中</div>
      ${waitingHtml}
    </div>

    <!-- 原文 -->
    <div style="background:#0a0a14;border:1px solid #1e293b;border-radius:8px;padding:14px 16px;margin-bottom:16px">
      ${rawBlock}
    </div>

    <!-- Footer -->
    <div style="display:flex;justify-content:space-between;align-items:center;color:#475569;font-size:11px;padding-top:12px;border-top:1px solid #1e293b">
      <span>PM Worker Daily Planner</span>
      <span>⏰ 下次计划生成：${nextStr}</span>
    </div>

  </div>
</body>
</html>`;
}

async function runSchedule(mode = 'daily') {
  console.log(`\n🚀 PM Worker 调度器启动 [${new Date().toLocaleString()}] 模式: ${mode}\n`);

  const config = loadConfig();
  const results = [];

  try {
    if (mode === 'daily' || mode === 'monitor') {
      console.log('🔍 运行 Monitor Engine...');
      const monitorReport = await runMonitor();
      // 生成可读摘要写日志（防御性：projects 可能不存在或某项不是数组）
      const monitorProjects = monitorReport?.projects || {};
      const monitorSummary = Object.entries(monitorProjects)
        .map(([id, checks]) => {
          const safeChecks = Array.isArray(checks) ? checks : [];
          const fails = safeChecks.filter(c => !c.ok);
          return fails.length
            ? `❌ ${id}: ${fails.map(f => f.check).join(', ')}`
            : `✅ ${id}: all ok`;
        }).join('\n');
      results.push({ worker: 'monitor', result: monitorSummary });
      writeLog('monitor', { output: monitorSummary, raw: monitorReport });
    }

    if (mode === 'daily') {
      console.log('\n📋 运行 PM Worker...');
      const pmResult = await runWorker('pm-worker.txt');
      results.push({ worker: 'pm', result: pmResult });
      writeLog('pm', { output: pmResult });

      const pmHtml = buildDailyPlanHtml(pmResult, today(), config.projects);
      await sendEmail(`今日执行计划 ${today()}`, pmResult, pmHtml);
    }

    if (mode === 'daily' || mode === 'buffer') {
      // Buffer 补充队列：仅在 09:00 前后 30 分钟内执行，或强制 buffer 模式
      const hour = new Date().getHours();
      if (mode === 'buffer' || (hour >= 8 && hour < 10)) {
        console.log('\n📌 运行 Buffer Refill...');
        try {
          const bufferResults = await refillBuffer();
          const bufferSummary = bufferResults.map(r =>
            `${r.site}: ${r.status}` + (r.added != null ? ` (+${r.added})` : '')
          ).join(', ');
          results.push({ worker: 'buffer', result: bufferSummary });
          writeLog('buffer', { output: bufferSummary, raw: bufferResults });
          console.log(`📌 Buffer 完成: ${bufferSummary}`);
        } catch (e) {
          console.error('⚠️ Buffer Refill 失败（不影响其他任务）:', e.message);
        }
      }
    }

    if (mode === 'recovery') {
      console.log('🔧 运行 Site Recovery...');
      const recoveryResult = await runSiteRecovery({});

      // runSiteRecovery 返回 { reports: [...], summary: '...' }，做防御性提取
      let recoveryReports = recoveryResult?.reports ?? recoveryResult;
      if (!Array.isArray(recoveryReports)) recoveryReports = [];
      const recoverySummary = recoveryResult?.summary || '';

      const summary = recoverySummary || recoveryReports.map(r => {
        const steps = Object.entries(r.steps || {}).map(([k, v]) => `  ${v?.ok ? '✅' : '❌'} ${k}: ${v?.detail || ''}`).join('\n');
        const fixes = (r.fixes || []).map(f => `  ${f.ok ? '✅' : '❌'} fix:${f.action} ${f.msg || ''}`).join('\n');
        return `【${r.id}】${r.domain}\n${steps}${fixes ? '\n修复:\n' + fixes : ''}`;
      }).join('\n\n');
      console.log(summary);
      writeLog('recovery', { output: summary, raw: recoveryReports });
      // 有任何站点需要告警就调用邮件（内部有 24h 节流 + 合并为 1 封）
      const needsAlert = recoveryReports.some(r => r.needsEmail || r.error);
      if (needsAlert) {
        const smtpConfig = {
          host: 'smtp.qq.com', port: 465, secure: true,
          user: '295965231@qq.com', pass: 'msygvjzroawdbgce',
          to: '295965231@qq.com'
        };
        await sendRecoveryEmail(recoveryReports, smtpConfig);
      }
      results.push({ worker: 'recovery', result: summary });
    }

    if (mode === 'qa') {
      for (const project of config.projects) {
        console.log(`\n🔬 QA检查: ${project.id}...`);
        const qaResult = await runWorker('qa-worker.txt', `project_id: ${project.id}`);
        results.push({ worker: 'qa', project: project.id, result: qaResult });
        writeLog(`qa-${project.id}`, { output: qaResult });
      }

      const summary = results.map(r => `${r.project}:\n${r.result.slice(0, 500)}`).join('\n\n---\n\n');
      await sendEmail(`QA检查报告 ${today()}`, summary);
    }

    console.log('\n✅ 调度完成');
    return results;

  } catch (error) {
    console.error('❌ 调度器错误:', error);
    try { await sendEmail('调度器异常', error.message); } catch (_) {}
    throw error;
  }
}

const mode = process.argv[2] || 'daily';
runSchedule(mode).catch(console.error);
