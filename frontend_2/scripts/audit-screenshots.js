const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3010';
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const desktopRoutes = [
  ['home', '/'],
  ['results-empty', '/results'],
  ['history', '/history'],
  ['saved', '/saved'],
  ['board', '/board'],
  ['dev-index', '/dev'],
  ['dev-search', '/dev/search'],
  ['dev-results', '/dev/results'],
  ['dev-components', '/dev/components'],
  ['dev-skeletons', '/dev/skeletons'],
  ['dev-fic', '/dev/fic'],
  ['dev-seed', '/dev/seed'],
];
const mobileRoutes = [
  ['m-home', '/'],
  ['m-dev-results', '/dev/results'],
  ['m-dev-fic', '/dev/fic'],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    userDataDir: path.join(__dirname, 'chrome-tmp-profile'),
    args: ['--no-first-run', '--disable-extensions'],
  });
  const page = await browser.newPage();

  async function shoot(name, route, viewport) {
    try {
      await page.setViewport(viewport);
      await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: name !== 'board' });
      console.log('OK', name);
    } catch (e) {
      console.log('FAIL', name, e.message.slice(0, 120));
    }
  }

  for (const [name, route] of desktopRoutes) {
    await shoot(name, route, { width: 1440, height: 900 });
  }
  for (const [name, route] of mobileRoutes) {
    await shoot(name, route, { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  }
  await browser.close();
})();
