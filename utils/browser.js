/* eslint-disable no-undef */
const puppeteer = require('puppeteer');

async function getBrowser() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
  });
  return browser;
}

async function getPage(browser) {
  const page = await browser.newPage();
  await page.emulate(puppeteer.devices["iPad Pro landscape"]);
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Safari/537.36");
  await page.evaluateOnNewDocument(() => {
    delete navigator.__proto__.webdriver;
    // Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'platform', {
      get: () => "Linux armxxxxx",
      configurable: true
    });
    window.chrome = {
      app: {},
      runtime: {},
      getUserMedia: {}
    };
  });
  await page.setViewport({
    width: 1366,
    height: 768,
    deviceScaleFactor: 1
  });
  return page;
}

module.exports = {
  getBrowser,
  getPage
};