#!/usr/bin/env node

const { http } = require('../../infra_external-log-lib/src');
const { fs } = require('../../infra_external-log-lib/src');
const { path } = require('../../infra_external-log-lib/src');

const PORT = 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/test-session-sharing.html') {
    const filePath = path.join(__dirname, 'test-session-sharing.html');
    
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading test page');
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Session Sharing Test Server\n`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`\n📋 Instructions:`);
  console.log(`1. Make sure all services are running:`);
  console.log(`   - AI Dev Portal (3400)`);
  console.log(`   - GUI Selector (3456)`);
  console.log(`   - Chat Space (3300)`);
  console.log(`   - PocketFlow (3500)`);
  console.log(`\n2. Open http://localhost:${PORT} in your browser`);
  console.log(`3. Test login/logout and session sharing`);
  console.log(`\nPress Ctrl+C to stop the server\n`);
});