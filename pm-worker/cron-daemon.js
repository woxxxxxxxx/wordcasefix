const cron = require('node-cron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_DIR = 'C:\\Users\\Administrator\\pm-worker';
const LOGS_DIR = path.join(BASE_DIR, 'logs');

function runScheduler(mode) {
  const ts = new Date().toLocaleString('zh-CN');
  console.log(`[${ts}] 触发 scheduler.js ${mode}`);

  const child = spawn('node', [path.join(BASE_DIR, 'scheduler.js'), mode], {
    cwd: BASE_DIR,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let out = '';
  child.stdout.on('data', d => { out += d; process.stdout.write(d); });
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('close', code => {
    const logFile = path.join(LOGS_DIR, `cron-${mode}-${new Date().toISOString().slice(0,10)}.log`);
    fs.appendFileSync(logFile, `\n=== ${new Date().toISOString()} exit:${code} ===\n${out}\n`);
  });
}

// 每天 08:30 - Daily 计划
cron.schedule('30 8 * * *', () => runScheduler('daily'), { timezone: 'Asia/Shanghai' });

// 每4小时 - Monitor 监控
cron.schedule('0 */4 * * *', () => runScheduler('monitor'), { timezone: 'Asia/Shanghai' });

// 每周一 09:00 - QA 质检
cron.schedule('0 9 * * 1', () => runScheduler('qa'), { timezone: 'Asia/Shanghai' });

// 每30分钟 - Site Recovery 站点恢复检查
cron.schedule('*/30 * * * *', () => runScheduler('recovery'), { timezone: 'Asia/Shanghai' });

// 每天 09:00 - Buffer 队列补充
cron.schedule('0 9 * * *', () => runScheduler('buffer'), { timezone: 'Asia/Shanghai' });

// 每天 10:00 - InsuranceTipsPro 自动发布文章（buffer refill 之后运行）
cron.schedule('0 10 * * *', () => runScheduler('auto-publish'), { timezone: 'Asia/Shanghai' });

// 每天 11:00 - FreelancerGuideHub 自动发布文章
cron.schedule('0 11 * * *', () => runScheduler('auto-publish-flgh'), { timezone: 'Asia/Shanghai' });


// ===== content-pipeline tasks (auto-added by cron-setup.js) =====
const { exec } = require('child_process');

function runContentPipeline(script) {
  const ts = new Date().toLocaleString('zh-CN');
  const scriptPath = path.join('C:\\Users\\Administrator\\content-pipeline', script);
  console.log(`[${ts}] 触发 content-pipeline/${script}`);

  const child = spawn('node', [scriptPath], {
    cwd: 'C:\\Users\\Administrator\\content-pipeline',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  let out = '';
  child.stdout.on('data', d => { out += d; process.stdout.write(d); });
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('close', code => {
    const logFile = path.join(LOGS_DIR, `content-pipeline-${script.replace('.js','')}-${new Date().toISOString().slice(0,10)}.log`);
    fs.appendFileSync(logFile, `\n=== ${new Date().toISOString()} exit:${code} ===\n${out}\n`);
  });
}

// 每天 06:00 - 内容生成
cron.schedule('0 6 * * *', () => runContentPipeline('generate-daily.js'), { timezone: 'Asia/Shanghai' });

// 每周日 20:00 - 周报
cron.schedule('0 20 * * 0', () => runContentPipeline('weekly-report.js'), { timezone: 'Asia/Shanghai' });

console.log('  每天 06:00  → content-pipeline/generate-daily.js');
console.log('  每周日20:00 → content-pipeline/weekly-report.js');
// ===== end content-pipeline tasks =====


// ===== content-pipeline START =====
function runContentPipeline(script) {
  const ts         = new Date().toLocaleString('zh-CN');
  const scriptPath = path.join('C:\\Users\\Administrator\\content-pipeline', script);
  console.log(`[${ts}] [content-pipeline] → ${script}`);

  const child = spawn('node', [scriptPath], {
    cwd: 'C:\\Users\\Administrator\\content-pipeline',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let out = '';
  child.stdout.on('data', d => { out += d; process.stdout.write(d); });
  child.stderr.on('data', d => process.stderr.write(d));
  child.on('close', code => {
    const logFile = path.join(LOGS_DIR, `content-pipeline-${script.replace('.js','')}-${new Date().toISOString().slice(0,10)}.log`);
    fs.appendFileSync(logFile, `\n=== ${new Date().toISOString()} exit:${code} ===\n${out}\n`);
  });
}

// 每天 06:00 — 内容脚本生成
cron.schedule('0 6 * * *',  () => runContentPipeline('generate-daily.js'),  { timezone: 'Asia/Shanghai' });

// 每周日 20:00 — 内容周报
cron.schedule('0 20 * * 0', () => runContentPipeline('weekly-report.js'),   { timezone: 'Asia/Shanghai' });

console.log('  每天 06:00        → content-pipeline/generate-daily.js');
console.log('  每周日 20:00      → content-pipeline/weekly-report.js');
// ===== content-pipeline END =====

console.log('PM Worker Cron Daemon 已启动');
console.log('  每天 08:30  → daily');
console.log('  每天 09:00  → buffer refill');
console.log('  每天 10:00  → auto-publish (insurancetipspro)');
console.log('  每天 11:00  → auto-publish-flgh (freelancerguidehub)');
console.log('  每4小时     → monitor');
console.log('  每周一09:00 → qa');
console.log('  每30分钟    → recovery');
console.log('按 Ctrl+C 停止\n');
