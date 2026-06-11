/**
 * ToolRankHQ FTP Deployment Script
 * Deploys all site files to the remote server via FTP.
 *
 * Usage:
 *   node deploy-ftp.js
 *
 * Requirements:
 *   npm install basic-ftp
 *
 * Proxy is configured via the HTTPS_PROXY environment variable or the
 * proxyOptions object below. The script uses http://127.0.0.1:7897 by default.
 */

const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────
const FTP_CONFIG = {
  host: '212.85.28.149',
  port: 21,
  user: 'u868313694.toolrankhq.com',
  password: 'Xxh113324~',
  secure: false,       // set to 'implicit' or true for FTPS
};

const LOCAL_DIR  = path.resolve('C:\\Users\\Administrator\\toolrankhq');
const REMOTE_DIR = '/public_html';

// HTTP proxy (CONNECT-style, for FTP-over-proxy via tunnelling)
const PROXY = 'http://127.0.0.1:7897';

// ──────────────────────────────────────────────
// Helper: set process-level proxy env vars so
// basic-ftp / Node net can route through it.
// ──────────────────────────────────────────────
function applyProxy(proxyUrl) {
  if (!proxyUrl) return;
  process.env.HTTP_PROXY  = proxyUrl;
  process.env.HTTPS_PROXY = proxyUrl;
  process.env.http_proxy  = proxyUrl;
  process.env.https_proxy = proxyUrl;
  console.log(`[proxy] Using proxy: ${proxyUrl}`);
}

// ──────────────────────────────────────────────
// Recursively upload a local directory to FTP
// ──────────────────────────────────────────────
async function uploadDirectory(client, localDir, remoteDir) {
  // Ensure the remote directory exists
  await client.ensureDir(remoteDir);

  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath  = path.join(localDir, entry.name);
    const remotePath = `${remoteDir}/${entry.name}`;

    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        console.log(`[skip] ${localPath}`);
        continue;
      }
      console.log(`[dir]  ${remotePath}`);
      await uploadDirectory(client, localPath, remotePath);
    } else {
      // Skip this deploy script itself and hidden files
      if (entry.name === 'deploy-ftp.js' || entry.name.startsWith('.')) {
        console.log(`[skip] ${localPath}`);
        continue;
      }
      console.log(`[up]   ${localPath}  →  ${remotePath}`);
      await client.uploadFrom(localPath, remotePath);
    }
  }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  applyProxy(PROXY);

  const client = new ftp.Client(30000); // 30-second timeout
  client.ftp.verbose = false; // set to true for full FTP log

  try {
    console.log(`\n[ftp]  Connecting to ${FTP_CONFIG.host}:${FTP_CONFIG.port} …`);
    await client.access(FTP_CONFIG);
    console.log('[ftp]  Connected.\n');

    console.log(`[ftp]  Uploading ${LOCAL_DIR}  →  ${REMOTE_DIR}\n`);
    await uploadDirectory(client, LOCAL_DIR, REMOTE_DIR);

    console.log('\n[ftp]  Upload complete.');
  } catch (err) {
    console.error('\n[error]', err.message || err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
