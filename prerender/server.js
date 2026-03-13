const prerender = require('prerender');

const server = prerender({
  chromeLocation: '/usr/bin/chromium-browser',
  chromeFlags: [
    '--no-sandbox',
    '--headless',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
  ],
  port: 3000,
});

server.start();
