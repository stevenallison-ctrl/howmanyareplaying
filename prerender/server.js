const prerender = require('prerender');

const server = prerender({
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
