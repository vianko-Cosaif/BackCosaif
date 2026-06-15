// reporteria/modelos/pdf-browser.ts
// Browser singleton para PDFs

import * as puppeteer from 'puppeteer';

let browserSingleton: puppeteer.Browser | null = null;

export async function getBrowser() {
  if (browserSingleton) {
    const connected =
      typeof (browserSingleton as any).connected === 'boolean'
        ? (browserSingleton as any).connected
        : typeof (browserSingleton as any).isConnected === 'function'
          ? (browserSingleton as any).isConnected()
          : true;
    if (connected) return browserSingleton;
    browserSingleton = null;
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || undefined;

  const browser = await puppeteer.launch({
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

  browser.on('disconnected', () => {
    if (browserSingleton === browser) browserSingleton = null;
  });

  browserSingleton = browser;
  return browserSingleton;
}

export async function closeBrowser() {
  if (browserSingleton) {
    await browserSingleton.close();
    browserSingleton = null;
  }
}
