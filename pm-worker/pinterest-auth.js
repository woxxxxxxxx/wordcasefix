'use strict';
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { exec } = require('child_process');
const { HttpsProxyAgent } = require('https-proxy-agent');

const CLIENT_ID     = '1575234';
const CLIENT_SECRET = '6150ea125c1f12a6f6b81130491460a30b899ba5';
const REDIRECT_URI  = 'http://localhost:8888/callback';
const TOKEN_FILE    = path.join(__dirname, 'pinterest-token.json');
const PROXY_URL     = 'http://127.0.0.1:7897';

const SCOPE = 'pins:read,pins:write,boards:read,user_accounts:read';
const AUTH_URL = `https://www.pinterest.com/oauth/?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPE)}`;

function httpsPost(urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(PROXY_URL);
    const url   = new URL(urlStr);
    const buf   = Buffer.from(body, 'utf8');
    const opts  = {
      hostname: url.hostname, port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Length': buf.length, ...headers },
      agent,
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data; try { data = JSON.parse(raw); } catch (_) { data = raw; }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type:   'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  }).toString();

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const resp = await httpsPost(
    'https://api.pinterest.com/v5/oauth/token',
    {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body
  );

  if (resp.status !== 200) {
    throw new Error(`Token exchange failed HTTP ${resp.status}: ${JSON.stringify(resp.data).slice(0, 300)}`);
  }
  return resp.data;
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
  exec(cmd, err => { if (err) console.error('Cannot open browser:', err.message); });
}

async function run() {
  console.log('\n=== Pinterest OAuth 授权流程 ===\n');

  const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith('/callback')) {
      res.writeHead(404); res.end(); return;
    }

    const urlObj = new URL(req.url, 'http://localhost:8888');
    const code   = urlObj.searchParams.get('code');
    const error  = urlObj.searchParams.get('error');

    if (error) {
      console.error('❌ 授权被拒绝:', error, urlObj.searchParams.get('error_description') || '');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<html><body style="font-family:sans-serif;padding:40px;color:#dc2626"><h2>❌ 授权失败</h2><p>${error}</p></body></html>`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400); res.end('Missing code'); return;
    }

    console.log('✓ 收到授权码 (code length:', code.length, ')');
    console.log('⏳ 正在交换 access_token…');

    try {
      const token = await exchangeCode(code);

      const saveData = {
        access_token:  token.access_token,
        refresh_token: token.refresh_token || null,
        token_type:    token.token_type || 'bearer',
        scope:         token.scope || SCOPE,
        expires_in:    token.expires_in || null,
        created_at:    new Date().toISOString(),
      };

      fs.writeFileSync(TOKEN_FILE, JSON.stringify(saveData, null, 2), 'utf8');

      const masked = saveData.access_token.slice(0, 6) + '…' + saveData.access_token.slice(-4);
      console.log('\n✅ 授权成功！');
      console.log('   access_token :', masked);
      console.log('   refresh_token:', saveData.refresh_token ? saveData.refresh_token.slice(0, 6) + '…' : '无');
      console.log('   scope        :', saveData.scope);
      console.log('   expires_in   :', saveData.expires_in, 's');
      console.log('   保存至       :', TOKEN_FILE);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<html><body style="font-family:sans-serif;padding:40px;color:#16a34a">
        <h2>✅ Pinterest 授权成功</h2>
        <p>access_token 已保存，可关闭此窗口。</p>
        <pre style="background:#f0fdf4;padding:12px;border-radius:6px;color:#0f172a">
access_token : ${masked}
scope        : ${saveData.scope}
expires_in   : ${saveData.expires_in}s
        </pre>
      </body></html>`);

    } catch (e) {
      console.error('❌ Token 交换失败:', e.message);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<html><body style="font-family:sans-serif;padding:40px;color:#dc2626"><h2>❌ Token 交换失败</h2><pre>${e.message}</pre></body></html>`);
    }

    server.close();
  });

  server.listen(8888, () => {
    console.log('✓ 本地回调服务器已启动 → http://localhost:8888/callback');
    console.log('\n🌐 正在打开浏览器进行 Pinterest 授权…');
    console.log('   授权 URL:', AUTH_URL, '\n');
    openBrowser(AUTH_URL);
    console.log('⏳ 等待用户在浏览器中点击"授权"…\n');
  });

  server.on('error', e => {
    console.error('Server error:', e.message);
    process.exit(1);
  });
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
