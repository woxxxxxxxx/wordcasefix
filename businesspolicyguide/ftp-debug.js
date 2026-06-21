const ftp = require('basic-ftp');
const net = require('net');

const FTP_HOST = '212.85.28.149';
const FTP_PORT = 21;
const FTP_PASS = 'Xxh113324~';
const USERS = [
  'u868313694.businesspolicyguide.com',
  'u868313694.businesspolicyguide',
  'u868313694',
];

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

async function test(user) {
  const socket = await connectProxy();
  const client = new ftp.Client(60000);
  client.ftp.verbose = true;
  try {
    await client.access({ host: FTP_HOST, user, password: FTP_PASS, port: FTP_PORT, secure: false, socket });
    console.log(`LOGIN_OK ${user}`);
    console.log(await client.pwd());
  } catch (err) {
    console.error(`LOGIN_FAIL ${user}: ${err.message}`);
  } finally {
    client.close();
  }
}

(async () => {
  for (const user of USERS) {
    await test(user);
  }
})();
