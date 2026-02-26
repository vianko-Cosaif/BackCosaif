// reporteria/modelos/empresas-pdf.ts
// PDF por empresa (movimientos en rango)

import * as puppeteer from 'puppeteer';
import type { EmpresasReporte } from './empresas-model';

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

export async function closeEmpresasBrowser() {
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
  return String(name || 'Empresas')
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

function fmtMin(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n < 60) return `${Math.round(n)}m`;
  const h = Math.floor(n / 60);
  const m = Math.round(n - h * 60);
  return `${h}h ${m}m`;
}

function buildHtml(reporte: EmpresasReporte) {
  const meta = reporte.meta;
  const rangoDesde = fmtTZ(meta.rangoUTC.desde, meta.tz);
  const rangoHasta = fmtTZ(meta.rangoUTC.hastaExclusivo, meta.tz);

  const cards = reporte.empresas
    .map((e) => {
      const rows = e.movimientos.length
        ? e.movimientos
            .map((m) => {
              const solicitud = fmtTZ(m.fechaSolicitudUTC, meta.tz);
              const inicio = fmtTZ(m.fechaInicioUTC, meta.tz);
              const fin = fmtTZ(m.fechaFinUTC, meta.tz);
              const torno = m.torno ? 'Sí' : 'No';
              const lavado = m.lavado ? 'Sí' : 'No';
              const espera = fmtMin(m.esperaMin);
              const duracion = fmtMin(m.duracionMin);
              const total = fmtMin(m.totalMin);

              return `
                <tr>
                  <td>${solicitud}</td>
                  <td>${inicio}</td>
                  <td>${fin}</td>
                  <td>${espera}</td>
                  <td>${duracion}</td>
                  <td>${total}</td>
                  <td>${escapeHtml(m.locomotiveNumber)}</td>
                  <td>${escapeHtml(m.estado)}</td>
                  <td>${escapeHtml(m.tipoMovimiento ?? '—')}</td>
                  <td>${torno}</td>
                  <td>${lavado}</td>
                  <td>${escapeHtml(m.clienteNombre ?? '—')}</td>
                  <td>${escapeHtml(m.operadorNombre ?? '—')}</td>
                  <td>${escapeHtml(m.solicitadoPor ?? '—')}</td>
                  <td>${escapeHtml(m.localidad ?? '—')}</td>
                </tr>
              `;
            })
            .join('')
        : `
          <tr>
            <td colspan="15" class="empty">Sin movimientos en el rango</td>
          </tr>
        `;

      return `
        <section class="card">
          <div class="card-head">
            <div class="card-title">${escapeHtml(e.empresa)}</div>
            <div class="card-sub">Total movimientos: ${escapeHtml(e.totalMovimientos)}</div>
          </div>
          <div class="mini">
            <div><span class="label">Locomotoras</span> ${escapeHtml(e.totalLocomotoras)}</div>
            <div><span class="label">Torno</span> ${escapeHtml(e.totalTorno)}</div>
            <div><span class="label">Lavado</span> ${escapeHtml(e.totalLavado)}</div>
            <div><span class="label">Torno+Lavado</span> ${escapeHtml(e.totalTornoLavado)}</div>
            <div><span class="label">Sin TL</span> ${escapeHtml(e.totalSinTornoLavado)}</div>
            <div><span class="label">Prom Espera</span> ${fmtMin(e.promEsperaMin)}</div>
            <div><span class="label">Prom Duración</span> ${fmtMin(e.promDuracionMin)}</div>
            <div><span class="label">Prom Total</span> ${fmtMin(e.promTotalMin)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Solicitud (MX)</th>
                <th>Inicio (MX)</th>
                <th>Fin (MX)</th>
                <th>Espera</th>
                <th>Duración</th>
                <th>Total</th>
                <th>Locomotora</th>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Torno</th>
                <th>Lavado</th>
                <th>Cliente</th>
                <th>Operador</th>
                <th>Solicitado por</th>
                <th>Localidad</th>
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
            padding: 20px 24px 32px;
            font-family: "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
          }
          .title {
            font-size: 20px;
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
            margin: 12px 0 16px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 12px 8px;
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .card-head {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 12px;
            margin-bottom: 6px;
          }
          .card-title {
            font-size: 15px;
            font-weight: 700;
          }
          .card-sub {
            font-size: 12px;
            color: #475569;
          }
          .mini {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 8px;
            font-size: 11px;
            color: #475569;
            margin: 6px 0 10px;
          }
          .mini .label {
            display: inline-block;
            font-weight: 700;
            color: #0f172a;
            margin-right: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }
          thead { display: table-header-group; }
          th {
            text-align: left;
            font-weight: 700;
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            padding: 4px 6px 4px 0;
          }
          td {
            padding: 4px 6px 4px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .empty {
            text-align: center;
            color: #94a3b8;
            padding: 10px 0;
          }
          .footer {
            margin-top: 14px;
            font-size: 10px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="title">Reporte de Movimientos por Empresa</div>
        <div class="meta">Rango (MX): ${escapeHtml(rangoDesde)} → ${escapeHtml(rangoHasta)}</div>
        <div class="meta">Zona horaria: ${escapeHtml(meta.tz)}</div>
        <div class="divider"></div>

        ${cards}

        <div class="footer">Generado por Reportería · Empresas</div>
      </body>
    </html>
  `;
}

export async function exportarReporteEmpresasPDF(reporte: EmpresasReporte): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setContent(buildHtml(reporte), { waitUntil: 'domcontentloaded' });

  const buffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
  });

  await page.close();

  const filename = `Reporte_Empresas_${safeFilename(`${reporte.meta.fechaInicio}_${reporte.meta.fechaFin}`)}.pdf`;

  return {
    filename,
    contentType: 'application/pdf',
    buffer: Buffer.from(buffer),
  };
}
