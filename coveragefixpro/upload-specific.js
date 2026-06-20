const ftp = require('basic-ftp');
const net = require('net');

async function uploadFiles() {
  const client = new ftp.Client();
  try {
    const socket = await new Promise((resolve, reject) => {
      const s = net.createConnection({ host: '127.0.0.1', port: 7897 });
      s.once('connect', () => resolve(s));
      s.once('error', reject);
    });
    await client.access({
      host: '212.85.28.149',
      user: 'u868313694.coveragefixpro.com',
      password: 'Xxh113324~',
      port: 21,
      secure: false,
      socket: socket
    });
    await client.uploadFrom('C:\\Users\\Administrator\\coveragefixpro\\privacy-policy.html', '/public_html/privacy-policy.html');
    console.log('privacy-policy.html uploaded');
    await client.uploadFrom('C:\\Users\\Administrator\\coveragefixpro\\terms.html', '/public_html/terms.html');
    console.log('terms.html uploaded');
    await client.uploadFrom('C:\\Users\\Administrator\\coveragefixpro\\css\\style.css', '/public_html/css/style.css');
    console.log('style.css uploaded');
  } catch(e) {
    console.error(e);
  }
  client.close();
}

uploadFiles();
