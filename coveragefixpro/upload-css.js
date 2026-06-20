const ftp = require('basic-ftp');
const net = require('net');

async function run() {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    const socket = await new Promise((resolve, reject) => {
      const s = net.createConnection({ host: '127.0.0.1', port: 7897 }, () => {
        s.write('CONNECT 212.85.28.149:21 HTTP/1.1\r\nHost: 212.85.28.149:21\r\n\r\n');
        let buf = '';
        s.on('data', chunk => {
          buf += chunk.toString();
          if (buf.includes('\r\n\r\n')) {
            s.removeAllListeners('data');
            if (buf.startsWith('HTTP/1.1 200') || buf.startsWith('HTTP/1.0 200')) resolve(s);
            else reject(new Error('Proxy CONNECT failed: ' + buf.split('\r\n')[0]));
          }
        });
        s.once('error', reject);
      });
      s.once('error', reject);
    });
    await client.access({
      host: '212.85.28.149',
      user: 'u868313694.coveragefixpro.com',
      password: 'Xxh113324~',
      port: 21,
      secure: false,
      socket,
    });
    console.log('Connected');
    await client.uploadFrom(
      'C:\\Users\\Administrator\\coveragefixpro\\css\\style.css',
      '/public_html/css/style.css'
    );
    console.log('Uploaded: /public_html/css/style.css');
    await client.uploadFrom('C:\\Users\\Administrator\\coveragefixpro\\favicon.svg','/public_html/favicon.svg');
    console.log('Uploaded: /public_html/favicon.svg');
    await client.uploadFrom('C:\\Users\\Administrator\\coveragefixpro\\logo.svg','/public_html/logo.svg');
    console.log('Uploaded: /public_html/logo.svg');
    await client.uploadFrom('C:\\Users\\Administrator\\coveragefixpro\\index.html','/public_html/index.html');
    console.log('Uploaded: /public_html/index.html');
  } catch (e) {
    console.error('Error:', e.message);
  }
  client.close();
}

run();
