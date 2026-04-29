const http = require('http');

const options = {
  hostname: 'localhost',
  port: 10000,
  path: '/api/admin/stats',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d.toString().slice(0, 100));
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();
