#!/usr/bin/env node

// Script to check backend configuration
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3120,
  path: '/api/debug/env',
  method: 'GET'
};

console.log('Fetching backend configuration from http://localhost:3120/api/debug/env...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const config = JSON.parse(data);
        console.log('Backend Configuration:');
        console.log('====================\n');
        
        console.log('Environment:', config.environment);
        console.log('Port:', config.port);
        console.log('Host:', config.host);
        
        console.log('\nCORS Configuration:');
        console.log('-------------------');
        console.log('CORS_ORIGINS:', config.cors.CORS_ORIGINS);
        console.log('CORS_ORIGIN:', config.cors.CORS_ORIGIN);
        console.log('Allowed Origins:', JSON.stringify(config.cors.allowedOrigins, null, 2));
        console.log('Type:', config.cors.type);
        
        console.log('\n\nFull Configuration:');
        console.log('-------------------');
        console.log(JSON.stringify(config, null, 2));
      } catch (e) {
        console.error('Failed to parse response:', e);
        console.log('Raw response:', data);
      }
    } else {
      console.error(`Error: HTTP ${res.statusCode}`);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Failed to connect to backend:', error.message);
  console.log('\nMake sure the backend is running on http://localhost:3120');
});

req.end();