/**
 * ga4-grant-viewer.js
 * Adds xiexiaohui@instruction-325409.iam.gserviceaccount.com as Viewer
 * to each of the 4 GA4 properties using the Analytics Admin API v1beta.
 * Auth: service account JWT with analytics.edit scope.
 */
'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const { createSign } = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY      = 'http://127.0.0.1:7897';
const proxyAgent = new HttpsProxyAgent(PROXY);
const CREDS_FILE = path.join(__dirname, 'ga-credentials.json');

const SA_EMAIL = 'xiexiaohui@instruction-325409.iam.gserviceaccount.com';

const PROPERTIES = {
  WordCaseFix:     '539531639',
  VestCalc:        '539700100',
  NotionTemplaFix: '539119398',
  ContractFixPro:  '539948742',
  PayrollFixPro:   '491490803',  // payrollfixpro.com — verify numeric ID in GA4 Admin > Property Settings
};

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }

function request(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const options = {
      hostname: u.hostname, path: u.pathname + u.search,
      method:   opts.method || 'GET',
      agent:    proxyAgent,
      headers:  opts.headers || {},
    };
    if (opts.body) options.headers['Content-Length'] = Buffer.byteLength(opts.body);
    const req = https.request(options, res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function getToken(creds, scope) {
  const now    = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim  = Buffer.from(JSON.stringify({
    iss: creds.client_email, scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  })).toString('base64url');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${claim}`);
  const jwt  = `${header}.${claim}.${sign.sign(creds.private_key, 'base64url')}`;
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const res  = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = JSON.parse(res.body);
  if (!j.access_token) throw new Error(j.error_description || JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

(async () => {
  const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
  log(`Service account: ${creds.client_email}`);

  let token;
  try {
    token = await getToken(creds,
      'https://www.googleapis.com/auth/analytics.manage.users ' +
      'https://www.googleapis.com/auth/analytics.edit');
    log('Token acquired');
  } catch (e) {
    log('Token error: ' + e.message);
    process.exit(1);
  }

  for (const [name, propId] of Object.entries(PROPERTIES)) {
    log(`\nGranting viewer access: ${name} (properties/${propId})`);

    // accessBindings replaces deprecated userLinks in v1beta
    const url  = `https://analyticsadmin.googleapis.com/v1beta/properties/${propId}/accessBindings`;
    const body = JSON.stringify({
      user:  SA_EMAIL,
      roles: ['predefinedRoles/viewer'],
    });

    const res = await request(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body,
    });

    if (res.status === 200 || res.status === 201) {
      const j = JSON.parse(res.body);
      log(`  ✓ Granted — link: ${j.name}`);
    } else {
      // Status 409 = already exists
      try {
        const j = JSON.parse(res.body);
        const msg = j.error?.message || JSON.stringify(j).slice(0, 200);
        if (res.status === 409) {
          log(`  ✓ Already a viewer (409 conflict — access exists)`);
        } else {
          log(`  ✗ HTTP ${res.status}: ${msg}`);
        }
      } catch {
        log(`  ✗ HTTP ${res.status}: ${res.body.slice(0, 200)}`);
      }
    }
  }

  log('\nDone.');
})();
