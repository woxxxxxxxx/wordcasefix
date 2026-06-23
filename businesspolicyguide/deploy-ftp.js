'use strict';
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const net = require('net');

const FTP_HOST = '212.85.28.149';
const FTP_PORT = 21;
const FTP_USER = 'u868313694.businesspolicyguide.com';
const FTP_PASS = 'Xxh113324~';
const REMOTE_ROOT = '/public_html';
const SITE_URL = 'https://businesspolicyguide.com';
const CONCURRENCY = 4;
const RETRY_MAX = 4;
const RETRY_DELAY = 4000;
const CACHE_FILE = path.join(__dirname, 'deploy-cache.json');

const EXCLUDE = new Set([
  'node_modules', '.git', '.gitignore', '.env',
  'build-site.js', 'audit.js', 'deploy-ftp.js', 'deploy-ftp.py', 'ftp-debug.js',
  'auto-publish.js', 'topics-used.json',
  'affiliate-config.js', 'inject-affiliates.js',
  'deploy-cache.json',
  'package.json', 'package-lock.json',
  'AGENTS.md', 'CLAUDE.md', 'README.md',
  '.agents-buffer.md',
]);

const REMOTE_CLEANUP_FILES = [
  '/public_html/build-site.js',
  '/public_html/audit.js',
  '/public_html/deploy-ftp.js',
  '/public_html/deploy-ftp.py',
  '/public_html/ftp-debug.js',
  '/public_html/auto-publish.js',
  '/public_html/topics-used.json',
  '/public_html/affiliate-config.js',
  '/public_html/inject-affiliates.js',
  '/public_html/deploy-cache.json',
  '/public_html/package.json',
  '/public_html/package-lock.json',
  '/public_html/AGENTS.md',
  '/public_html/CLAUDE.md',
  '/public_html/.agents-buffer.md',
  '/public_html/README.md',
  '/public_html/.env',
];

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
  catch (_) { return { files: {} }; }
}
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

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

function collectFiles(localDir, remoteDir, cache) {
  const toUpload = [], skipped = [];
  function walk(dir, remote) {
    let items;
    try { items = fs.readdirSync(dir); } catch (_) { return; }
    for (const item of items) {
      if (EXCLUDE.has(item)) continue;
      const localPath = path.join(dir, item);
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

async function uploadWithRetry(getClient, file, tag) {
  let client = await getClient();
  for (let attempt = 1; attempt <= RETRY_MAX; attempt++) {
    try {
      await client.uploadFrom(file.localPath, file.remotePath);
      console.log(`  [${tag}] OK ${file.remotePath}`);
      return { ok: true, client };
    } catch (e) {
      const msg = e.message || String(e);
      if (msg.includes('550')) {
        console.warn(`  [${tag}] skip(550) ${file.remotePath}`);
        return { ok: false, skip: true, client };
      }
      console.warn(`  [${tag}] retry ${attempt}/${RETRY_MAX} ${path.basename(file.remotePath)}: ${msg}`);
      try { client.close(); } catch (_) {}
      if (attempt < RETRY_MAX) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
        try { client = await getClient(); } catch (e2) {
          console.warn(`  [${tag}] reconnect failed: ${e2.message}`);
        }
      }
    }
  }
  return { ok: false, failed: true, client };
}

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

async function cleanupRemoteFiles(cache) {
  const client = await createClient();
  try {
    for (const remotePath of REMOTE_CLEANUP_FILES) {
      try {
        await client.remove(remotePath);
        delete cache.files[remotePath];
        console.log(`  cleanup removed ${remotePath}`);
      } catch (_) {}
    }
  } finally {
    try { client.close(); } catch (_) {}
  }
}

async function deploy() {
  const cache = loadCache();
  const { toUpload, skipped } = collectFiles(__dirname, REMOTE_ROOT, cache);
  console.log(`\nDeploy → ${SITE_URL}`);
  console.log(`  Unchanged (skip): ${skipped.length}`);
  console.log(`  To upload:        ${toUpload.length}`);

  console.log('\nCleaning remote private/build files...');
  try { await cleanupRemoteFiles(cache); } catch (e) { console.warn('cleanup error', e.message); }

  if (toUpload.length === 0) {
    saveCache(cache);
    console.log('\nAll files up to date.');
    return;
  }

  console.log('\nEnsuring remote directories...');
  const setup = await createClient();
  await setup.ensureDir(REMOTE_ROOT);
  await ensureRemoteDirs(setup, toUpload);
  setup.close();

  const queue = [...toUpload];
  let uploaded = 0;
  const failed = [];
  const numWorkers = Math.min(CONCURRENCY, toUpload.length);
  console.log(`\nUploading ${toUpload.length} file(s) via ${numWorkers} parallel connections...\n`);

  async function worker(id) {
    let client = null;
    const getClient = async () => {
      if (client) { try { client.close(); } catch (_) {} }
      client = await createClient();
      return client;
    };
    try {
      while (true) {
        const file = queue.shift();
        if (!file) break;
        const r = await uploadWithRetry(getClient, file, `c${id}`);
        client = r.client;
        if (r.ok) {
          uploaded++;
          cache.files[file.remotePath] = file.mtime;
          if (uploaded % 5 === 0) saveCache(cache);
        } else if (r.failed) {
          failed.push(file.remotePath);
        }
      }
    } finally {
      if (client) { try { client.close(); } catch (_) {} }
    }
  }

  await Promise.all(Array.from({ length: numWorkers }, (_, i) => worker(i + 1)));
  cache.lastDeploy = new Date().toISOString();
  saveCache(cache);

  console.log('\n─────────────────────────────────────────────');
  console.log(`Uploaded: ${uploaded} / ${toUpload.length}`);
  console.log(`Skipped:  ${skipped.length}`);
  console.log(`Failed:   ${failed.length}`);
  if (failed.length) failed.forEach(f => console.warn('  FAIL', f));
}

deploy().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
