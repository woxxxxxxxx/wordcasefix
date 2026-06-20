'use strict';
const ftp   = require('basic-ftp');
const path  = require('path');
const fs    = require('fs');
const net   = require('net');
const https = require('https');
const http  = require('http');

// ─── Site config ─────────────────────────────────────────────────────────────
const FTP_HOST    = '212.85.28.149';
const FTP_PORT    = 21;
const FTP_USER    = 'u868313694.coveragefixpro.com';
const FTP_PASS    = 'Xxh113324~';
const REMOTE_ROOT = '/public_html';
const SITE_URL    = 'https://coveragefixpro.com';
const SITE_NAME   = 'coveragefixpro';
const CONCURRENCY = 5;
const RETRY_MAX   = 3;
const RETRY_DELAY = 5000;
const CACHE_FILE  = path.join(__dirname, 'deploy-cache.json');

const EXCLUDE = new Set([
  'node_modules', '.git', '.gitignore', 'deploy-ftp.js', 'deploy-cache.json',
  'coveragefixpro-upload.zip', 'upload-css.js', 'upload-specific.js',
  'AGENTS.md', 'CLAUDE.md',
]);

// ─── Cache ────────────────────────────────────────────────────────────────────
function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
  catch (_) { return { files: {} }; }
}
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ─── Proxy connection ─────────────────────────────────────────────────────────
function connectProxy() {
  return new Promise((resolve, reject) => {
    const s = net.createConnection({ host: '127.0.0.1', port: 7897 }, () => {
      s.write(`CONNECT ${FTP_HOST}:${FTP_PORT} HTTP/1.1\r\nHost: ${FTP_HOST}:${FTP_PORT}\r\n\r\n`);
      let buf = '';
      s.on('data', chunk => {
        buf += chunk.toString();
        if (buf.includes('\r\n\r\n')) {
          s.removeAllListeners('data');
          if (buf.startsWith('HTTP/1.1 200') || buf.startsWith('HTTP/1.0 200')) resolve(s);
          else reject(new Error('Proxy CONNECT failed: ' + buf.split('\r\n')[0]));
        }
      });
    });
    s.once('error', reject);
  });
}

async function createClient() {
  const socket = await connectProxy();
  const client = new ftp.Client();
  client.ftp.verbose = false;
  await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASS, port: FTP_PORT, secure: false, socket });
  return client;
}

// ─── File collection ──────────────────────────────────────────────────────────
function collectFiles(localDir, remoteDir, cache) {
  const toUpload = [], skipped = [];
  function walk(dir, remote) {
    let items;
    try { items = fs.readdirSync(dir); } catch (_) { return; }
    for (const item of items) {
      if (EXCLUDE.has(item)) continue;
      const localPath  = path.join(dir, item);
      const remotePath = remote + '/' + item;
      let stat;
      try { stat = fs.statSync(localPath); } catch (_) { continue; }
      if (stat.isDirectory()) {
        walk(localPath, remotePath);
      } else {
        const mtime = stat.mtimeMs;
        if (!cache.files[remotePath] || mtime > cache.files[remotePath]) {
          toUpload.push({ localPath, remotePath, mtime });
        } else {
          skipped.push(remotePath);
        }
      }
    }
  }
  walk(localDir, remoteDir);
  return { toUpload, skipped };
}

// ─── Upload with retry ────────────────────────────────────────────────────────
async function uploadWithRetry(client, localPath, remotePath, tag) {
  for (let attempt = 1; attempt <= RETRY_MAX; attempt++) {
    try {
      await client.uploadFrom(localPath, remotePath);
      console.log(`  [${tag}] ✓ ${remotePath}`);
      return { ok: true };
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('550')) {
        console.warn(`  [${tag}] skip(550) ${remotePath}`);
        return { ok: false, skip: true };
      }
      if (attempt < RETRY_MAX) {
        console.warn(`  [${tag}] retry ${attempt}/${RETRY_MAX}: ${path.basename(remotePath)} — ${msg}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      } else {
        console.error(`  [${tag}] FAILED: ${remotePath} — ${msg}`);
        return { ok: false, failed: true };
      }
    }
  }
  return { ok: false, failed: true };
}

// ─── Ensure remote dirs exist ─────────────────────────────────────────────────
async function ensureRemoteDirs(client, files) {
  const dirs = new Set();
  for (const { remotePath } of files) {
    const d = remotePath.substring(0, remotePath.lastIndexOf('/'));
    if (d && d !== REMOTE_ROOT) dirs.add(d);
  }
  const sorted = [...dirs].sort((a, b) => a.split('/').length - b.split('/').length);
  for (const d of sorted) {
    try { await client.ensureDir(d); } catch (_) {}
  }
}

// ─── Live site check ──────────────────────────────────────────────────────────
function checkLiveSite(url) {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 15000 }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', () => resolve(0));
    req.on('timeout', () => { req.destroy(); resolve(0); });
  });
}

// ─── Main deploy ─────────────────────────────────────────────────────────────
async function deploy() {
  const cache = loadCache();
  const { toUpload, skipped } = collectFiles(__dirname, REMOTE_ROOT, cache);

  console.log(`\nDeploy → ${SITE_URL}`);
  console.log(`  Unchanged (skip): ${skipped.length}`);
  console.log(`  To upload:        ${toUpload.length}`);

  if (toUpload.length === 0) {
    console.log('\nAll files up to date — nothing to upload.');
    runPostDeployCheck(SITE_NAME);
    return;
  }

  console.log('\nConnecting to ensure remote directories...');
  const setup = await createClient();
  await setup.ensureDir(REMOTE_ROOT);
  await ensureRemoteDirs(setup, toUpload);
  setup.close();

  const queue = [...toUpload];
  let uploaded = 0;
  const failed = [];
  const numWorkers = Math.min(CONCURRENCY, toUpload.length);

  console.log(`\nUploading ${toUpload.length} file(s) via ${numWorkers} parallel connection(s)...\n`);

  async function worker(id) {
    const client = await createClient();
    try {
      while (true) {
        const file = queue.shift();
        if (!file) break;
        const r = await uploadWithRetry(client, file.localPath, file.remotePath, `c${id}`);
        if (r.ok) {
          uploaded++;
          cache.files[file.remotePath] = file.mtime;
        } else if (r.failed) {
          failed.push(file.remotePath);
        }
      }
    } finally {
      client.close();
    }
  }

  await Promise.all(Array.from({ length: numWorkers }, (_, i) => worker(i + 1)));

  cache.lastDeploy = new Date().toISOString();
  saveCache(cache);

  console.log('\n─────────────────────────────────────────────');
  console.log(`Uploaded:  ${uploaded} / ${toUpload.length}`);
  console.log(`Skipped:   ${skipped.length} (unchanged)`);
  console.log(`Failed:    ${failed.length}`);
  if (failed.length) failed.forEach(f => console.warn('  ✗', f));

  console.log('\nVerifying live site...');
  const status = await checkLiveSite(SITE_URL + '/');
  if (status === 200) {
    console.log(`  ✓ ${SITE_URL}/ → 200 OK`);
  } else {
    console.warn(`  ✗ ${SITE_URL}/ → ${status || 'ERROR'} — re-uploading index.html`);
    const indexLocal = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexLocal)) {
      const repair = await createClient();
      await repair.ensureDir(REMOTE_ROOT);
      await uploadWithRetry(repair, indexLocal, REMOTE_ROOT + '/index.html', 'repair');
      repair.close();
    }
  }

  runPostDeployCheck(SITE_NAME);
}

function runPostDeployCheck(siteName) {
  const { spawn } = require('child_process');
  const checkScript = 'C:\\Users\\Administrator\\pm-worker\\post-deploy-check.js';
  console.log(`\n[Post-Deploy] Running check for ${siteName}...`);
  const child = spawn('node', [checkScript, siteName], { stdio: 'inherit' });
  child.on('error', e => console.error('[Post-Deploy] Check error:', e.message));
}

deploy().catch(e => { console.error('\nDeploy failed:', e.message); process.exit(1); });
