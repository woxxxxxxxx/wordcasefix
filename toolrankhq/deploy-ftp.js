'use strict';
const ftp  = require('basic-ftp');
const path = require('path');
const fs   = require('fs');
const net  = require('net');

const EXCLUDE = ['node_modules', 'deploy-ftp.js', '.git', '.gitignore',
                 'package.json', 'package-lock.json'];

async function uploadFile(client, localPath, remotePath) {
  const MAX = 3;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      await client.uploadFrom(localPath, remotePath);
      console.log('Uploaded:', remotePath);
      return true;
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('550')) {
        console.warn(`Skip (550): ${remotePath}`);
        return false;
      }
      if (attempt < MAX) {
        console.warn(`Retry ${attempt}/${MAX - 1}: ${remotePath} — ${msg}`);
        await new Promise(r => setTimeout(r, 1500 * attempt));
      } else {
        console.error(`FAILED: ${remotePath} — ${msg}`);
        return false;
      }
    }
  }
  return false;
}

async function uploadDir(client, localDir, remoteDir, failed) {
  const items = fs.readdirSync(localDir);
  for (const item of items) {
    if (EXCLUDE.includes(item)) continue;
    const localPath  = path.join(localDir, item);
    const remotePath = remoteDir + '/' + item;
    if (fs.statSync(localPath).isDirectory()) {
      try { await client.ensureDir(remotePath); } catch (_) {}
      await uploadDir(client, localPath, remotePath, failed);
      await client.cd('/public_html');
    } else {
      const ok = await uploadFile(client, localPath, remotePath);
      if (!ok) failed.push(remotePath);
    }
  }
}

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  try {
    const socket = await new Promise((resolve, reject) => {
      const s = net.createConnection({ host: '127.0.0.1', port: 7897 }, () => {
        s.write(`CONNECT 212.85.28.149:21 HTTP/1.1\r\nHost: 212.85.28.149:21\r\n\r\n`);
        let buf = '';
        s.on('data', chunk => {
          buf += chunk.toString();
          if (buf.includes('\r\n\r\n')) {
            if (buf.startsWith('HTTP/1.1 200') || buf.startsWith('HTTP/1.0 200')) {
              s.removeAllListeners('data');
              resolve(s);
            } else {
              reject(new Error('Proxy CONNECT failed: ' + buf.split('\r\n')[0]));
            }
          }
        });
      });
      s.once('error', reject);
    });

    await client.access({
      host:     '212.85.28.149',
      user:     'u868313694.toolrankhq.com',
      password: 'Xxh113324~',
      port:     21,
      secure:   false,
      socket,
    });
    console.log('Connected via proxy');
    await client.ensureDir('/public_html');

    const failed = [];
    await uploadDir(client, __dirname, '/public_html', failed);

    if (failed.length) {
      console.warn(`\nCompleted with ${failed.length} skipped/failed file(s):`);
      failed.forEach(f => console.warn(' -', f));
    } else {
      console.log('\nUpload complete! All files uploaded.');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  client.close();
}

deploy();
