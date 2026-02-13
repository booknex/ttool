const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'taxportal-deploy.tar.gz');

const server = http.createServer((req, res) => {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('File not found');
    return;
  }
  const stat = fs.statSync(filePath);
  console.log('Serving file:', filePath, 'Size:', stat.size);
  res.writeHead(200, {
    'Content-Type': 'application/gzip',
    'Content-Length': stat.size,
    'Content-Disposition': 'attachment; filename=taxportal-deploy.tar.gz',
    'Cache-Control': 'no-store, no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(5000, '0.0.0.0', () => {
  console.log('File server running on port 5000');
  console.log('File size:', fs.statSync(filePath).size, 'bytes');
  console.log('Download: curl -o taxportal-deploy.tar.gz https://client-hub-pro.replit.app/');
});
