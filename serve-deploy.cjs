const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'taxportal-deploy.tar.gz');
const port = 8099;

const server = http.createServer((req, res) => {
  if (req.url === '/taxportal-deploy.tar.gz' || req.url === '/') {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'application/gzip',
      'Content-Disposition': 'attachment; filename=taxportal-deploy.tar.gz',
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`File server running on port ${port}`);
  console.log(`Download at: http://0.0.0.0:${port}/taxportal-deploy.tar.gz`);
});
