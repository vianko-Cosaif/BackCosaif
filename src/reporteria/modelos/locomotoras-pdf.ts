// reporteria/modelos/locomotoras-pdf.ts
// PDF por locomotoras (tabla por cada locomotora)

import * as puppeteer from 'puppeteer';
import type { LocomotorasReporte } from './locomotoras-model';

export type PdfFile = {
  filename: string;
  contentType: 'application/pdf';
  buffer: Buffer;
};

let browserSingleton: puppeteer.Browser | null = null;

async function getBrowser() {
  if (browserSingleton) return browserSingleton;

  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_BIN ||
    undefined;

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

export async function closeLocomotorasBrowser() {
  if (browserSingleton) {
    await browserSingleton.close();
    browserSingleton = null;
  }
}

function escapeHtml(v: any) {
  const s = String(v ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeFilename(name: string) {
  return String(name || 'Locomotoras')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function fmtTZ(iso: string | null, tz: string) {
  if (!iso) return '—';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  const s = d.toLocaleString('sv-SE', { timeZone: tz, hour12: false }).replace(',', '');
  return s.length >= 16 ? s.slice(0, 16) : s;
}

function buildHtml(reporte: LocomotorasReporte) {
  const meta = reporte.meta;

  const rangoDesde = fmtTZ(meta.rangoUTC.desde, meta.tz);
  const rangoHasta = fmtTZ(meta.rangoUTC.hastaExclusivo, meta.tz);
  const locomotoras = meta.locomotoras.join(', ');

  const cards = reporte.locomotoras
    .map((l) => {
      const rows = l.movimientos.length
        ? l.movimientos
          .map((m) => {
            const inicio = fmtTZ(m.fechaInicioUTC, meta.tz);
            const fin = fmtTZ(m.fechaFinUTC, meta.tz);
            const cliente = escapeHtml(m.clienteNombre ?? '—');
            const operador = escapeHtml(m.operadorNombre ?? '—');

            return `
              <tr>
                <td>${inicio}</td>
                <td>${fin}</td>
                <td>${cliente}</td>
                <td>${operador}</td>
              </tr>
            `;
          })
          .join('')
        : `
          <tr>
            <td colspan="4" class="empty">Sin movimientos en el rango</td>
          </tr>
        `;

      return `
        <section class="card">
          <div class="card-head">
            <div class="card-title">Locomotora ${escapeHtml(l.locomotiveNumber)}</div>
            <div class="card-sub">Total movimientos: ${escapeHtml(l.totalMovimientos)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Inicio (MX)</th>
                <th>Fin (MX)</th>
                <th>Cliente</th>
                <th>Operador</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </section>
      `;
    })
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 28px 30px 40px;
            font-family: "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
          }
          .title {
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 6px;
          }
          .meta {
            font-size: 12px;
            color: #334155;
            line-height: 1.5;
          }
          .divider {
            height: 1px;
            background: #e2e8f0;
            margin: 16px 0 18px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 14px 10px;
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          .card-head {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 12px;
            margin-bottom: 8px;
          }
          .card-title {
            font-size: 16px;
            font-weight: 700;
          }
          .card-sub {
            font-size: 12px;
            color: #475569;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          thead { display: table-header-group; }
          th {
            text-align: left;
            font-weight: 700;
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            padding: 6px 6px 6px 0;
          }
          td {
            padding: 6px 6px 6px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .empty {
            text-align: center;
            color: #94a3b8;
            padding: 12px 0;
          }
          .footer {
            margin-top: 16px;
            font-size: 11px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="title">Reporte de Locomotoras</div>
        <div class="meta">Rango (MX): ${escapeHtml(rangoDesde)} → ${escapeHtml(rangoHasta)}</div>
        <div class="meta">Locomotoras: ${escapeHtml(locomotoras || '—')}</div>
        <div class="meta">Zona horaria: ${escapeHtml(meta.tz)}</div>

        <div class="divider"></div>

        ${cards}

        <div class="footer">Generado por Reportería · Locomotoras</div>
      </body>
    </html>
  `;
}

export async function exportarReporteLocomotorasPDF(reporte: LocomotorasReporte): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setContent(buildHtml(reporte), { waitUntil: 'domcontentloaded' });

  const buffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '12mm', right: '12mm' },
  });

  await page.close();

  const filename = `Reporte_Locomotoras_${safeFilename(`${reporte.meta.fechaInicio}_${reporte.meta.fechaFin}`)}.pdf`;

  return {
    filename,
    contentType: 'application/pdf',
    buffer: Buffer.from(buffer),
  };
}
