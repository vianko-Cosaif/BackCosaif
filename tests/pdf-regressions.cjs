const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { loader } = require('./support/load-ts.cjs');
async function main() {
  let launches = 0;
  const browser = new EventEmitter(); browser.connected = true;
  browser.newPage = async () => {
    const page = new EventEmitter();
    page.setDefaultTimeout = () => {};
    page.close = async () => { page.emit('close'); };
    return page;
  };
  browser.close = async () => { browser.connected = false; browser.emit('disconnected'); };
  const pdf = loader({ puppeteer: { launch: async () => { launches++; return browser; } } })('src/reporteria/modelos/pdf-browser.ts');
  const requests = await Promise.allSettled(Array.from({ length: 5 }, () => pdf.newPdfPage()));
  assert.equal(launches, 1);
  assert.equal(requests.filter(r => r.status === 'fulfilled').length, 4);
  assert.equal(requests.find(r => r.status === 'rejected').reason.status, 503);
  await Promise.all(requests.filter(r => r.status === 'fulfilled').map(r => r.value.close()));
  await (await pdf.newPdfPage()).close();
  await pdf.closeBrowser();
  console.log('PDF: one browser launch, bounded concurrent pages and slot release OK');
  if (process.argv.includes('--smoke')) {
    const real = loader({}, { process, setTimeout, clearTimeout })('src/reporteria/modelos/pdf-browser.ts');
    const page = await real.newPdfPage();
    try {
      await page.setContent('<!doctype html><html><body><h1>Prueba de reporte</h1><p>Datos sintéticos · 123.45</p></body></html>');
      const buffer = Buffer.from(await page.pdf({ format: 'A4' }));
      assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
      assert(buffer.length > 1000);
      console.log(`PDF: real sandboxed Chrome render OK (${buffer.length} bytes)`);
    } finally { await page.close(); await real.closeBrowser(); }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
