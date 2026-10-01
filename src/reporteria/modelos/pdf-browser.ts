import * as puppeteer from 'puppeteer';
let browserSingleton: puppeteer.Browser | null = null;
let launching: Promise<puppeteer.Browser> | null = null;
let activePages = 0;

export async function getBrowser(): Promise<puppeteer.Browser> {
  if (browserSingleton?.connected) return browserSingleton;
  if (launching) return launching;
  launching = puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || undefined,
    args: ['--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none',
      ...(process.env.PDF_DISABLE_SANDBOX === 'true' ? ['--no-sandbox', '--disable-setuid-sandbox'] : [])],
  }).then(browser => {
    browserSingleton = browser;
    browser.on('disconnected', () => { if (browserSingleton === browser) browserSingleton = null; });
    return browser;
  }).finally(() => { launching = null; });
  return launching;
}
export async function newPdfPage(): Promise<puppeteer.Page> {
  if (activePages >= 4) throw Object.assign(new Error('Renderizadores PDF ocupados; vuelve a intentar'), { status: 503 });
  activePages++;
  try {
    const page = await (await getBrowser()).newPage();
    const deadline = setTimeout(() => { void page.close().catch(() => undefined); }, 60_000);
    deadline.unref();
    page.once('close', () => { clearTimeout(deadline); activePages--; });
    page.setDefaultTimeout(30_000);
    return page;
  } catch (error) { activePages--; throw error; }
}
export async function closeBrowser() {
  if (activePages) return;
  const browser = launching ? await launching : browserSingleton;
  browserSingleton = null;
  await browser?.close();
}
