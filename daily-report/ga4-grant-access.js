/**
 * ga4-grant-access.js
 * Uses OAuth2 (your Google account) to add the service account as Viewer
 * to all 4 GA4 properties via the Analytics Admin API.
 *
 * Prerequisites:
 *   1. Enable Analytics Admin API:
 *      https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=218578011233
 *   2. In GCP Console → APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
 *      Application type: Desktop app  → Download JSON → save as oauth-client.json in this folder
 *   3. node ga4-grant-access.js
 */
'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { exec } = require('child_process');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY      = 'http://127.0.0.1:7897';
const proxyAgent = new HttpsProxyAgent(PROXY);

const SA_EMAIL   = 'xiexiaohui@instruction-325409.iam.gserviceaccount.com';
const PROPERTIES = [
  { name: 'WordCaseFix',     id: '539531639' },
  { name: 'VestCalc',        id: '539700100' },
  { name: 'NotionTemplaFix', id: '539119398' },
  { name: 'ContractFixPro',  id: '539948742' },
];

const CLIENT_FILE = path.join(__dirname, 'oauth-client.json');
const TOKEN_FILE  = path.join(__dirname, 'oauth-token.json');
const REDIRECT    = 'http://localhost:3456/callback';
const SCOPE       = 'https://www.googleapis.com/auth/analytics.manage.users';

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }

function request(urlStr, opts = {}, useProxy = true) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const options = {
      hostname: u.hostname, path: u.pathname + u.search,
      method: opts.method || 'GET',
      agent: useProxy ? proxyAgent : undefined,
      headers: opts.headers || {},
    };
    if (opts.body) options.headers['Content-Length'] = Buffer.byteLength(opts.body);
    const req = https.request(options, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ── OAuth2 auth code flow ──────────────────────────────────────────────────
async function getOAuthToken(clientId, clientSecret) {
  // Check for cached token
  if (fs.existsSync(TOKEN_FILE)) {
    const tok = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    if (tok.access_token && tok.expiry > Date.now()) {
      log('Using cached OAuth token');
      return tok.access_token;
    }
    // Refresh
    if (tok.refresh_token) {
      log('Refreshing OAuth token...');
      const body = new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: tok.refresh_token, grant_type: 'refresh_token',
      }).toString();
      const res = await request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const j = JSON.parse(res.body);
      if (j.access_token) {
        j.refresh_token = j.refresh_token || tok.refresh_token;
        j.expiry = Date.now() + (j.expires_in - 60) * 1000;
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(j, null, 2));
        return j.access_token;
      }
    }
  }

  // Full authorization flow
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&access_type=offline&prompt=consent`;

  log(`\nOpen this URL in your browser to authorize:\n\n  ${authUrl}\n`);
  // Try to open browser automatically
  exec(`start "" "${authUrl}"`, () => {});

  // Wait for redirect on localhost:3456
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:3456');
      const code = url.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h2>✓ Authorized! You can close this tab.</h2>');
      server.close();
      if (code) resolve(code); else reject(new Error('No code in callback'));
    });
    server.listen(3456);
    log('Waiting for browser authorization on localhost:3456 ...');
  });

  // Exchange code for token
  const body = new URLSearchParams({
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: REDIRECT, grant_type: 'authorization_code',
  }).toString();
  const res = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tok = JSON.parse(res.body);
  if (!tok.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(tok).slice(0, 200));
  tok.expiry = Date.now() + (tok.expires_in - 60) * 1000;
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tok, null, 2));
  log('✓ Token obtained and cached in oauth-token.json');
  return tok.access_token;
}

// ── Add access binding via Admin API ──────────────────────────────────────
async function addViewer(token, propId, propName) {
  const url  = `https://analyticsadmin.googleapis.com/v1beta/properties/${propId}/accessBindings`;
  const body = JSON.stringify({ user: SA_EMAIL, roles: ['predefinedRoles/viewer'] });
  const res  = await request(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
  });

  if (res.status === 200 || res.status === 201) {
    const j = JSON.parse(res.body);
    log(`  ✓ ${propName}: viewer added (${j.name})`);
    return true;
  }
  try {
    const j = JSON.parse(res.body);
    if (res.status === 409) { log(`  ✓ ${propName}: already a viewer`); return true; }
    log(`  ✗ ${propName}: HTTP ${res.status} — ${j.error?.message || JSON.stringify(j).slice(0, 150)}`);
  } catch { log(`  ✗ ${propName}: HTTP ${res.status} — ${res.body.slice(0, 150)}`); }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────
(async () => {
  if (!fs.existsSync(CLIENT_FILE)) {
    console.error(`
ERROR: oauth-client.json not found.

Steps to create it:
  1. Enable Analytics Admin API:
     https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview?project=218578011233

  2. Go to: https://console.cloud.google.com/apis/credentials?project=218578011233
     → Create Credentials → OAuth 2.0 Client ID
     → Application type: Desktop app
     → Download JSON → rename to oauth-client.json
     → Place in: ${__dirname}

  3. Run this script again: node ga4-grant-access.js
`);
    process.exit(1);
  }

  const client = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
  const clientId     = client.installed?.client_id     || client.web?.client_id;
  const clientSecret = client.installed?.client_secret || client.web?.client_secret;
  if (!clientId || !clientSecret) {
    console.error('Invalid oauth-client.json — expected "installed" or "web" key');
    process.exit(1);
  }

  log(`OAuth client: ${clientId.slice(0, 30)}...`);
  const token = await getOAuthToken(clientId, clientSecret);
  log(`\nAdding ${SA_EMAIL} as Viewer to ${PROPERTIES.length} properties...`);

  for (const prop of PROPERTIES) {
    await addViewer(token, prop.id, prop.name);
  }

  log('\nDone. Run report.js to verify GA4 data.');
})();
