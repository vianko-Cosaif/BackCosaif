// reporteria/modelos/pdf-browser.ts
// Browser singleton para PDFs

import * as puppeteer from 'puppeteer';

let browserSingleton: puppeteer.Browser | null = null;

export async function getBrowser() {
  if (browserSingleton) return browserSingleton;

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || undefined;

  browserSingleton = await puppeteer.launch({
    headless: 'new' as any,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  return browserSingleton;
}

export async function closeBrowser() {
  if (browserSingleton) {
    await browserSingleton.close();
    browserSingleton = null;
  }
}
