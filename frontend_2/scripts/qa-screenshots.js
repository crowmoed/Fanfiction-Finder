/*
 * qa-screenshots.js — design-pass verification shots.
 *
 * Unlike audit-screenshots.js (cold, empty app), this seeds the demo data
 * first (via /dev/seed) so populated states render: sidebar recents, history,
 * saved (with "new" badges), cached results, fic detail, and the board.
 *
 *   node scripts/qa-screenshots.js          # against http://localhost:3010
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE = process.env.QA_BASE || 'http://localhost:3010';
const OUT = path.join(__dirname, 'qa-shots');
fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    userDataDir: path.join(__dirname, 'chrome-tmp-profile-qa'),
    args: ['--no-first-run', '--disable-extensions'],
  });
  const page = await browser.newPage();

  const settle = (ms = 1200) => new Promise((r) => setTimeout(r, ms));

  async function goto(route) {
    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 60000 });
    await settle();
  }

  async function shoot(name, { fullPage = true } = {}) {
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage });
    console.log('OK', name);
  }

  async function clickByText(selector, text) {
    const clicked = await page.evaluate(
      (sel, t) => {
        const els = [...document.querySelectorAll(sel)];
        const el = els.find((e) => e.textContent.trim().toLowerCase().includes(t.toLowerCase()));
        if (el) {
          el.click();
          return true;
        }
        return false;
      },
      selector,
      text
    );
    if (!clicked) console.log('WARN no element', selector, text);
    return clicked;
  }

  async function firstHref(selector) {
    return page.evaluate((sel) => {
      const a = document.querySelector(sel);
      return a ? a.getAttribute('href') : null;
    }, selector);
  }

  try {
    await page.setViewport(DESKTOP);

    // 1. Seed demo data.
    await goto('/dev/seed');
    (await clickByText('button', 'enter demo mode')) || (await clickByText('button', 'seed'));
    await settle(1500);
    await shoot('dev-seed-after');

    // 2. Core surfaces, populated.
    await goto('/');
    await shoot('home');
    await goto('/history');
    await shoot('history');
    await goto('/saved');
    await shoot('saved');

    // 3. A seeded search's results (grab the first history link).
    await goto('/history');
    const resultsHref =
      (await firstHref('main a[href^="/results"]')) || '/results?q=enemies+to+lovers+slow+burn';
    await goto(resultsHref);
    // If the cache expired the (simulated) search re-runs — wait it out.
    await page
      .waitForFunction(
        () => document.querySelector('.seg') || document.body.innerText.includes('No matches'),
        { timeout: 25000 }
      )
      .catch(() => console.log('WARN results never settled'));
    await settle(800);
    await shoot('results-table');

    // Cards view.
    if (await clickByText('button', 'cards')) {
      await settle(800);
      await shoot('results-cards');
    }

    // Board view (full-window workspace — viewport shot, not fullPage).
    if (await clickByText('button', 'board')) {
      await settle(1800);
      await shoot('results-board', { fullPage: false });
    }

    // 4. Fic detail via the results table.
    await goto(resultsHref);
    const ficHref = await firstHref('main a[href^="/fic/"]');
    if (ficHref) {
      await goto(ficHref);
      await shoot('fic-detail');
    } else {
      console.log('WARN no fic link found');
    }

    // 5. Empty-ish states + dev demos.
    await goto('/results');
    await shoot('results-empty');
    for (const [name, route] of [
      ['dev-index', '/dev'],
      ['dev-components', '/dev/components'],
      ['dev-skeletons', '/dev/skeletons'],
      ['dev-results', '/dev/results'],
      ['dev-fic', '/dev/fic'],
      ['dev-search', '/dev/search'],
    ]) {
      await goto(route);
      await shoot(name);
    }

    // 6. Mobile set.
    await page.setViewport(MOBILE);
    await goto('/');
    await shoot('m-home');
    await goto(resultsHref);
    await shoot('m-results');
    await goto('/history');
    await shoot('m-history');
    await goto('/saved');
    await shoot('m-saved');
    if (ficHref) {
      await goto(ficHref);
      await shoot('m-fic');
    }
  } catch (e) {
    console.log('FATAL', e.message);
  } finally {
    await browser.close();
  }
})();
