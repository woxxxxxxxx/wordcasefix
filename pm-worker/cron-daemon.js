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

console.log('PM Worker Cron Daemon 已启动');
console.log('  每天 08:30  → daily');
console.log('  每天 09:00  → buffer refill');
console.log('  每4小时     → monitor');
console.log('  每周一09:00 → qa');
console.log('  每30分钟    → recovery');
console.log('按 Ctrl+C 停止\n');
