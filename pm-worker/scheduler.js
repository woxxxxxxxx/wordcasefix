const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { runMonitor } = require('./monitor-engine');
const { runSiteRecovery, sendRecoveryEmail } = require('./site-recovery');

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

async function sendEmail(subject, content) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: '295965231@qq.com',
      pass: 'msygvjzroawdbgce'
    }
  });

  await transporter.sendMail({
    from: '295965231@qq.com',
    to: '295965231@qq.com',
    subject: `[PM Worker] ${subject}`,
    text: content
  });
  console.log(`📧 邮件已发送: ${subject}`);
}

async function runSchedule(mode = 'daily') {
  console.log(`\n🚀 PM Worker 调度器启动 [${new Date().toLocaleString()}] 模式: ${mode}\n`);

  const config = loadConfig();
  const results = [];

  try {
    if (mode === 'daily' || mode === 'monitor') {
      console.log('🔍 运行 Monitor Engine...');
      const monitorReport = await runMonitor();
      // 生成可读摘要写日志
      const monitorSummary = Object.entries(monitorReport.projects)
        .map(([id, checks]) => {
          const fails = checks.filter(c => !c.ok);
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

      await sendEmail(`今日执行计划 ${today()}`, pmResult);
    }

    if (mode === 'recovery') {
      console.log('🔧 运行 Site Recovery...');
      const recoveryReports = await runSiteRecovery({});
      const failed = recoveryReports.filter(r => r.fixes && r.fixes.some(f => !f.success));
      const summary = recoveryReports.map(r => {
        const checks = Object.entries(r.checks || {}).map(([k, v]) => `  ${v ? '✅' : '❌'} ${k}`).join('\n');
        const fixes = (r.fixes || []).map(f => `  ${f.success ? '✅' : '❌'} fix:${f.action}`).join('\n');
        return `【${r.id}】${r.domain}\n${checks}${fixes ? '\n修复:\n' + fixes : ''}`;
      }).join('\n\n');
      console.log(summary);
      writeLog('recovery', { output: summary, raw: recoveryReports });
      if (failed.length > 0) {
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
