const net = require('net');

const socket = net.createConnection({ host: '127.0.0.1', port: 7897 }, () => {
  socket.write('CONNECT 212.85.28.149:21 HTTP/1.1\r\nHost: 212.85.28.149:21\r\n\r\n');
});

let phase = 'proxy';
let buf = '';
let step = 0;

socket.setTimeout(10000);
socket.on('timeout', () => { console.log('Timeout at step', step); socket.destroy(); });

socket.on('data', (chunk) => {
  const text = chunk.toString('utf8');
  buf += text;

  if (phase === 'proxy') {
    if (buf.includes('\r\n\r\n')) {
      console.log('[PROXY OK]');
      phase = 'ftp';
      buf = '';
    }
    return;
  }

  // FTP phase — collect lines
  const lines = buf.split('\r\n');
  buf = lines.pop(); // keep incomplete last line
  for (const line of lines) {
    if (!line) continue;
    console.log('<', line);
    step++;
    if (step === 1) {
      // Got 220, send OPTS UTF8 ON
      console.log('> OPTS UTF8 ON');
      socket.write('OPTS UTF8 ON\r\n');
    } else if (step === 2) {
      // Got OPTS response, send USER
      console.log('> USER u868313694.freelancerguidehub.com');
      socket.write('USER u868313694.freelancerguidehub.com\r\n');
    } else if (step === 3) {
      // Got USER response (331 Password required), send PASS
      console.log('> PASS ***');
      socket.write('PASS Xxh113324~\r\n');
    } else if (step === 4) {
      // Got PASS response
      console.log('All done, closing');
      socket.destroy();
    }
  }
});

socket.on('error', e => console.error('Socket error:', e.message));
socket.on('close', () => console.log('Done'));
