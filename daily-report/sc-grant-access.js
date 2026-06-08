const { google } = require('googleapis');
const fs = require('fs');
const http = require('http');
const url = require('url');

const CLIENT_ID = '218578011233-eu8p8dm4d01a7ik46on47bu1hfp390bm.apps.googleusercontent.com';
const oauth = JSON.parse(fs.readFileSync('C:\\Users\\Administrator\\daily-report\\oauth-client.json'));
const client = new google.auth.OAuth2(oauth.installed.client_id, oauth.installed.client_secret, 'http://localhost:3456');

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly'
];

const authUrl = client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
console.log('Open this URL in browser:\n', authUrl);

const server = http.createServer(async (req, res) => {
  const code = new url.URL(req.url, 'http://localhost:3456').searchParams.get('code');
  if (code) {
    const { tokens } = await client.getToken(code);
    fs.writeFileSync('C:\\Users\\Administrator\\daily-report\\sc-oauth-token.json', JSON.stringify(tokens));
    console.log('Token saved to sc-oauth-token.json');
    res.end('Done! You can close this tab.');
    server.close();
  }
});
server.listen(3456);
