// Instagram / Telegram Web: open the user's own account in Chrome and read visible chats.
'use strict';

function loadPuppeteer() {
  const tries = [
    'puppeteer-core',
    'puppeteer',
    'whatsapp-web.js/node_modules/puppeteer',
    'whatsapp-web.js/node_modules/puppeteer-core'
  ];
  for (const name of tries) {
    try { return require(name); } catch {}
  }
  throw new Error('Не найден модуль браузера. Запустите обновление GN Tools ещё раз.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchPage(execPath, userDataDir) {
  const puppeteer = loadPuppeteer();
  const browser = await puppeteer.launch({
    executablePath: execPath,
    headless: false,
    userDataDir,
    defaultViewport: null,
    args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox']
  });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  page.setDefaultTimeout(180000);
  return { browser, page };
}

async function waitForInstagramLogin(page, log) {
  log('Войдите в Instagram в открывшемся окне…');
  await page.goto('https://www.instagram.com/direct/inbox/', {
    waitUntil: 'domcontentloaded',
    timeout: 120000
  });
  await page.waitForFunction(() => {
    if (document.querySelector('input[name="username"]')) return false;
    return location.pathname.indexOf('/direct') === 0 || !!document.querySelector('a[href*="/direct/t/"]');
  }, { timeout: 300000 });
  log('Instagram подключён. Читаю Direct…');
  await sleep(2000);
}

async function scanInstagram(page, log) {
  if (page.url().indexOf('instagram.com/direct') === -1) {
    await page.goto('https://www.instagram.com/direct/inbox/', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });
  }
  await sleep(1200);
  const hrefs = await page.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('a[href*="/direct/t/"]'))
      .map((a) => a.getAttribute('href') || '')
      .filter((href) => href && !seen.has(href) && seen.add(href))
      .slice(0, 40);
  });

  const chats = [];
  for (const rel of hrefs) {
    try {
      const href = rel.startsWith('http') ? rel : 'https://www.instagram.com' + rel;
      await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(1100);
      const data = await page.evaluate(() => {
        const nameEl = document.querySelector('header a[href^="/"] span, [role="main"] header [dir="auto"], header [dir="auto"]');
        const title = ((nameEl && nameEl.innerText) || document.title || '')
          .replace(/\s*[·|].*$/, '')
          .replace(/^\(\d+\)\s*/, '')
          .trim();
        const candidates = Array.from(document.querySelectorAll('[dir="auto"]'))
          .map((el) => (el.innerText || '').trim())
          .filter((text) => text && text.length < 1000);
        const seen = new Set();
        const lines = candidates.filter((text) => !seen.has(text) && seen.add(text));
        return { name: title || 'Instagram', messages: lines.slice(-40) };
      });
      if (data.messages.length) {
        chats.push({
          id: rel,
          name: data.name,
          phone: '',
          transcript: 'Instagram User: ' + data.name + '\n\n' + data.messages.join('\n')
        });
      }
    } catch (e) {
      log('Instagram: пропускаю один диалог — ' + (e.message || e));
    }
  }
  return chats;
}

async function waitForTelegramLogin(page, log) {
  log('Войдите в Telegram Web в открывшемся окне…');
  await page.goto('https://web.telegram.org/a/', {
    waitUntil: 'domcontentloaded',
    timeout: 120000
  });
  await page.waitForFunction(() => !!(
    document.querySelector('#LeftColumn-main') ||
    document.querySelector('.chatlist-chat') ||
    document.querySelector('.ListItem') ||
    document.querySelector('#column-left')
  ), { timeout: 300000 });
  log('Telegram подключён. Читаю чаты…');
  await sleep(2000);
}

async function scanTelegram(page, log) {
  if (page.url().indexOf('web.telegram.org') === -1) {
    await page.goto('https://web.telegram.org/a/', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });
  }
  await sleep(1200);
  const selector = '.chatlist-chat, .ListItem-button, .ListItem, [class*="ChatList"] a';
  const count = await page.evaluate((sel) => Math.min(document.querySelectorAll(sel).length, 40), selector);
  const chats = [];

  for (let i = 0; i < count; i++) {
    try {
      const clicked = await page.evaluate((sel, index) => {
        const item = document.querySelectorAll(sel)[index];
        if (!item) return null;
        const id = item.getAttribute('href') || item.getAttribute('data-peer-id') || item.getAttribute('data-chat-id') || String(index);
        item.click();
        return id;
      }, selector, i);
      if (clicked === null) continue;
      await sleep(900);
      const data = await page.evaluate(() => {
        const nameEl = document.querySelector('.chat-info-name, .fullName, .ChatInfo .title, h3');
        const name = ((nameEl && nameEl.innerText) || document.title || 'Telegram').split('\n')[0].trim();
        const messages = Array.from(document.querySelectorAll('.message, .text-content, .Message, [class*="message-content"]'))
          .map((el) => (el.innerText || '').trim())
          .filter((text) => text && text.length < 1000)
          .slice(-40);
        return { name, messages };
      });
      if (data.messages.length) {
        chats.push({
          id: 'telegram-' + clicked,
          name: data.name,
          phone: '',
          transcript: 'Telegram User: ' + data.name + '\n\n' + data.messages.join('\n')
        });
      }
    } catch (e) {
      log('Telegram: пропускаю один чат — ' + (e.message || e));
    }
  }
  return chats;
}

async function openSource({ source, execPath, userDataDir, log }) {
  const { browser, page } = await launchPage(execPath, userDataDir);
  try {
    if (source === 'instagram') await waitForInstagramLogin(page, log);
    else await waitForTelegramLogin(page, log);
    return {
      browser,
      page,
      scan: () => source === 'instagram' ? scanInstagram(page, log) : scanTelegram(page, log)
    };
  } catch (e) {
    try { await browser.close(); } catch {}
    throw e;
  }
}

module.exports = { openSource, sleep };
