// reporteria/modelos/bonos-pdf.ts
// PDF: reporte de bonos por locomotora

import * as puppeteer from 'puppeteer';
import type { BonosReporte, BonoJustificacion } from './bonos-model';

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

export async function closeBonosBrowser() {
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
  return String(name || 'Bonos')
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

function labelJustificacion(j: BonoJustificacion) {
  switch (j) {
    case 'PRIMER_BONO':
      return 'Primer bono';
    case 'BONO_24H':
      return 'Bono 24h';
    case 'AUN_NO_24H':
      return 'Aun no 24h';
    case 'SIN_FIN':
    default:
      return 'Sin fecha fin';
  }
}

function buildHtml(reporte: BonosReporte) {
  const meta = reporte.meta;

  const rangoDesde = fmtTZ(meta.rangoUTC.desde, meta.tz);
  const rangoHasta = fmtTZ(meta.rangoUTC.hastaExclusivo, meta.tz);

  const cards = reporte.locomotoras
    .map((l) => {
      const rows = l.movimientos.length
        ? l.movimientos
          .map((m) => {
            const solicitud = fmtTZ(m.fechaSolicitudUTC, meta.tz);
            const inicio = fmtTZ(m.fechaInicioUTC, meta.tz);
            const fin = fmtTZ(m.fechaFinUTC, meta.tz);
            const duracion = fmtMin(m.duracionMin);
            const ultimoBono = fmtTZ(m.ultimoBonoUTC, meta.tz);
            const desdeUltimo = fmtMin(m.tiempoDesdeUltimoBonoMin);
            const bono = m.bonoActual ? 'Si' : 'No';
            const justif = labelJustificacion(m.justificacion);
            const operador = escapeHtml(m.operadorNombre ?? '—');
            const cliente = escapeHtml(m.clienteNombre ?? '—');
            const solicitado = escapeHtml(m.solicitadoPor ?? '—');
            const empresa = escapeHtml(m.empresa ?? '—');
            const localidad = escapeHtml(m.localidad ?? '—');

            return `
              <tr>
                <td>${solicitud}</td>
                <td>${inicio}</td>
                <td>${fin}</td>
                <td>${duracion}</td>
                <td>${ultimoBono}</td>
                <td>${desdeUltimo}</td>
                <td>${bono}</td>
                <td>${escapeHtml(justif)}</td>
                <td>${operador}</td>
                <td>${cliente}</td>
                <td>${solicitado}</td>
                <td>${empresa}</td>
                <td>${localidad}</td>
              </tr>
            `;
          })
          .join('')
        : `
          <tr>
            <td colspan="13" class="empty">Sin movimientos en el periodo</td>
          </tr>
        `;

      const ultimoBono = fmtTZ(l.ultimoBonoUTC, meta.tz);
      const ultimoBonoPeriodo = fmtTZ(l.ultimoBonoEnPeriodoUTC, meta.tz);

      return `
        <section class="card">
          <div class="card-head">
            <div class="card-title">Locomotora ${escapeHtml(l.locomotiveNumber)}</div>
            <div class="card-sub">Movimientos: ${escapeHtml(l.totalMovimientos)} · Bonos: ${escapeHtml(l.totalBonos)}</div>
          </div>
          <div class="mini">
            <div><span class="label">Ultimo bono</span> ${escapeHtml(ultimoBono)}</div>
            <div><span class="label">Ultimo bono en periodo</span> ${escapeHtml(ultimoBonoPeriodo)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Solicitud (MX)</th>
                <th>Inicio (MX)</th>
                <th>Fin (MX)</th>
                <th>Duracion</th>
                <th>Ultimo bono</th>
                <th>Tiempo desde ultimo bono</th>
                <th>Bono actual</th>
                <th>Justificacion</th>
                <th>Operador</th>
                <th>Cliente</th>
                <th>Solicitado por</th>
                <th>Empresa</th>
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
            padding: 26px 28px 38px;
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
          .mini {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
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
            padding: 5px 6px 5px 0;
          }
          td {
            padding: 5px 6px 5px 0;
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
        <div class="title">Reporte de Bonos por Locomotora</div>
        <div class="meta">Periodo: ${escapeHtml(meta.periodo)} · Fecha ancla: ${escapeHtml(meta.fechaLocal)}</div>
        <div class="meta">Rango (MX): ${escapeHtml(rangoDesde)} → ${escapeHtml(rangoHasta)}</div>
        <div class="meta">Zona horaria: ${escapeHtml(meta.tz)}</div>
        <div class="meta">Regla: bono si fechaSolicitud >= (fechaFin del ultimo bono) + 24h y hay fechaFin.</div>

        <div class="divider"></div>

        ${cards || '<div class="meta">Sin locomotoras en el periodo.</div>'}

        <div class="footer">Generado por Reporteria · Bonos</div>
      </body>
    </html>
  `;
}

export async function exportarReporteBonosPDF(reporte: BonosReporte): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setContent(buildHtml(reporte), { waitUntil: 'domcontentloaded' });

  const buffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '12mm', right: '12mm' },
  });

  await page.close();

  const filename = `Reporte_Bonos_${safeFilename(`${reporte.meta.periodo}_${reporte.meta.fechaLocal}`)}.pdf`;

  return {
    filename,
    contentType: 'application/pdf',
    buffer: Buffer.from(buffer),
  };
}
