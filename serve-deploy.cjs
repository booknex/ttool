const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'taxportal-deploy.tar.gz');
const SECRET = 'xf9k2m';

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === `/deploy-${SECRET}`) {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    const stat = fs.statSync(filePath);
    console.log('Serving file:', filePath, 'Size:', stat.size);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename=taxportal-deploy.tar.gz',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Tax Portal Deploy Server\nUse the deploy URL to download.');
  }
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Deploy file server on port 5000');
  console.log('File size:', fs.statSync(filePath).size, 'bytes');
});
