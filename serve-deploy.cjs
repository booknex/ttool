const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'taxportal-deploy.tar.gz');

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    const stat = fs.statSync(filePath);
    console.log('POST request - Serving file:', stat.size, 'bytes');
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename=taxportal-deploy.tar.gz',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
    res.end('Use POST to download: curl -X POST -o taxportal-deploy.tar.gz https://client-hub-pro.replit.app/\n');
  }
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Deploy file server on port 5000');
  console.log('File size:', fs.statSync(filePath).size, 'bytes');
});
