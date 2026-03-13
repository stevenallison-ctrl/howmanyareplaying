const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
let browser;

async function getBrowser() {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

app.use(async (req, res) => {
  const url = req.url.slice(1); // strip leading /
  if (!url.startsWith('http')) {
    return res.status(400).send('Bad request: URL must start with http');
  }

  try {
    const b = await getBrowser();
    const page = await b.newPage();
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      const type = r.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        r.abort();
      } else {
        r.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    const html = await page.content();
    await page.close();

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Prerender error:', err.message);
    res.status(500).send('Prerender failed');
  }
});

app.listen(3000, () => console.log('Prerender listening on :3000'));
