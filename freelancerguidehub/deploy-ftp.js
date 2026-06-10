const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');
const net = require('net');

const EXCLUDE = ['node_modules', 'deploy-ftp.js', '.git', '.gitignore', 'package.json', 'package-lock.json', 'ftp-test.js'];

async function uploadDir(client, localDir, remoteDir) {
  const items = fs.readdirSync(localDir);
  for (const item of items) {
    if (EXCLUDE.includes(item)) continue;
    const localPath = path.join(localDir, item);
    const remotePath = remoteDir + '/' + item;
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      try { await client.ensureDir(remotePath); } catch(e) {}
      await uploadDir(client, localPath, remotePath);
      await client.cd('/public_html');
    } else {
      await client.uploadFrom(localPath, remotePath);
      console.log('Uploaded:', remotePath);
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
      host: '212.85.28.149',
      user: 'u868313694.freelancerguidehub.com',
      password: 'Xxh113324~',
      port: 21,
      secure: false,
      socket: socket
    });
    console.log('Connected via proxy');
    await client.ensureDir('/public_html');
    await uploadDir(client, __dirname, '/public_html');
    console.log('Upload complete!');
  } catch(e) {
    console.error('Error:', e.message);
  }
  client.close();
}

deploy();
