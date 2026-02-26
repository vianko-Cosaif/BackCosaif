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

  const allMovs = reporte.empresas.flatMap((e) => e.movimientos);
  const totalEmpresas = reporte.empresas.length;
  const totalMovs = allMovs.length;
  const uniqueLocos = new Set(allMovs.map((m) => m.locomotiveNumber)).size;
  const totalTorno = reporte.empresas.reduce((acc, e) => acc + e.totalTorno, 0);
  const totalLavado = reporte.empresas.reduce((acc, e) => acc + e.totalLavado, 0);
  const totalTornoLavado = reporte.empresas.reduce((acc, e) => acc + e.totalTornoLavado, 0);
  const totalSinTL = reporte.empresas.reduce((acc, e) => acc + e.totalSinTornoLavado, 0);

  let esperaSum = 0;
  let esperaN = 0;
  let durSum = 0;
  let durN = 0;
  let totalSum = 0;
  let totalN = 0;
  for (const m of allMovs) {
    if (m.esperaMin !== null && m.esperaMin !== undefined) {
      esperaSum += m.esperaMin;
      esperaN += 1;
    }
    if (m.duracionMin !== null && m.duracionMin !== undefined) {
      durSum += m.duracionMin;
      durN += 1;
    }
    if (m.totalMin !== null && m.totalMin !== undefined) {
      totalSum += m.totalMin;
      totalN += 1;
    }
  }
  const promEspera = esperaN ? Math.round(esperaSum / esperaN) : null;
  const promDuracion = durN ? Math.round(durSum / durN) : null;
  const promTotal = totalN ? Math.round(totalSum / totalN) : null;

  const chartEmpresas = [...reporte.empresas]
    .sort((a, b) => b.totalMovimientos - a.totalMovimientos)
    .slice(0, 10);
  const maxMov = Math.max(1, ...chartEmpresas.map((e) => e.totalMovimientos));
  const maxEspera = Math.max(1, ...chartEmpresas.map((e) => e.promEsperaMin ?? 0));
  const maxDur = Math.max(1, ...chartEmpresas.map((e) => e.promDuracionMin ?? 0));
  const maxTot = Math.max(1, ...chartEmpresas.map((e) => e.promTotalMin ?? 0));

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
            <div class="card-sub">Movimientos: ${escapeHtml(e.totalMovimientos)} · Locomotoras: ${escapeHtml(e.totalLocomotoras)}</div>
          </div>
          <div class="chips">
            <span class="chip chip-torno">Torno: ${escapeHtml(e.totalTorno)}</span>
            <span class="chip chip-lavado">Lavado: ${escapeHtml(e.totalLavado)}</span>
            <span class="chip chip-combo">Torno+Lavado: ${escapeHtml(e.totalTornoLavado)}</span>
            <span class="chip chip-sin">Sin TL: ${escapeHtml(e.totalSinTornoLavado)}</span>
          </div>
          <div class="mini">
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
          :root {
            --ink: #0f172a;
            --muted: #64748b;
            --line: #e2e8f0;
            --bg: #f8fafc;
            --brand: #14b8a6;
            --brand-2: #22c55e;
            --brand-3: #f59e0b;
            --chip: #e2e8f0;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 22px 26px 34px;
            font-family: "Helvetica Neue", Arial, sans-serif;
            color: var(--ink);
            background: var(--bg);
          }
          .hero {
            background: linear-gradient(135deg, #0f172a 0%, #134e4a 60%, #14b8a6 140%);
            color: white;
            padding: 18px 20px;
            border-radius: 14px;
          }
          .title {
            font-size: 21px;
            font-weight: 800;
            margin-bottom: 6px;
          }
          .meta {
            font-size: 12px;
            color: rgba(255,255,255,0.85);
            line-height: 1.5;
          }
          .divider {
            height: 1px;
            background: var(--line);
            margin: 14px 0 16px;
          }
          .section-title {
            font-size: 13px;
            font-weight: 800;
            color: var(--ink);
            margin: 14px 0 8px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            margin-top: 12px;
          }
          .kpi {
            background: white;
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 10px 12px;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
          }
          .kpi .label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .12em;
            color: var(--muted);
            font-weight: 700;
          }
          .kpi .value {
            font-size: 18px;
            font-weight: 800;
            margin-top: 4px;
          }
          .charts {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 12px;
            margin-top: 10px;
          }
          .chart {
            background: white;
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 12px;
          }
          .chart-title {
            font-size: 12px;
            font-weight: 800;
            color: var(--ink);
            margin-bottom: 8px;
          }
          .bar-row {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 10px;
            align-items: center;
            margin-bottom: 6px;
          }
          .bar-row .label {
            font-size: 11px;
            color: var(--muted);
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .bar {
            position: relative;
            height: 10px;
            background: #e2e8f0;
            border-radius: 999px;
            overflow: hidden;
          }
          .bar-fill {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            background: linear-gradient(90deg, #2dd4bf, #14b8a6);
          }
          .bar-val {
            position: absolute;
            right: 6px;
            top: -4px;
            font-size: 10px;
            color: #1e293b;
            font-weight: 700;
          }
          .time-row {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 10px;
            align-items: start;
            margin-bottom: 8px;
          }
          .time-bars {
            display: grid;
            gap: 4px;
          }
          .time-bar {
            height: 10px;
            border-radius: 999px;
            position: relative;
          }
          .time-bar span {
            position: absolute;
            right: 6px;
            top: -4px;
            font-size: 10px;
            color: #1e293b;
            font-weight: 700;
          }
          .time-espera { background: #fde68a; }
          .time-duracion { background: #86efac; }
          .time-total { background: #93c5fd; }
          .stack-row {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 10px;
            align-items: center;
            margin-bottom: 8px;
          }
          .stack {
            position: relative;
            display: flex;
            height: 12px;
            background: #e2e8f0;
            border-radius: 999px;
            overflow: hidden;
          }
          .seg {
            height: 100%;
          }
          .seg-torno { background: #60a5fa; }
          .seg-lavado { background: #34d399; }
          .seg-combo { background: #fbbf24; }
          .seg-sin { background: #94a3b8; }
          .seg-otros { background: #fca5a5; }
          .legend {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            font-size: 10px;
            color: #475569;
            margin-top: 8px;
          }
          .legend span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 700;
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            display: inline-block;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 12px 8px;
            margin-bottom: 14px;
            page-break-inside: avoid;
            background: white;
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
          .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 8px 0 6px;
          }
          .chip {
            font-size: 10px;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 999px;
            background: var(--chip);
            color: #0f172a;
          }
          .chip-torno { background: #dbeafe; color: #1e3a8a; }
          .chip-lavado { background: #dcfce7; color: #166534; }
          .chip-combo { background: #fef3c7; color: #92400e; }
          .chip-sin { background: #f1f5f9; color: #334155; }
          .mini {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
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
        <div class="hero">
          <div class="title">Reporte de Movimientos por Empresa</div>
          <div class="meta">Rango (MX): ${escapeHtml(rangoDesde)} → ${escapeHtml(rangoHasta)}</div>
          <div class="meta">Empresas: ${escapeHtml(meta.empresaIds?.length ? meta.empresaIds.join(', ') : 'Todas')}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi">
            <div class="label">Empresas</div>
            <div class="value">${escapeHtml(totalEmpresas)}</div>
          </div>
          <div class="kpi">
            <div class="label">Movimientos</div>
            <div class="value">${escapeHtml(totalMovs)}</div>
          </div>
          <div class="kpi">
            <div class="label">Locomotoras únicas</div>
            <div class="value">${escapeHtml(uniqueLocos)}</div>
          </div>
          <div class="kpi">
            <div class="label">Torno</div>
            <div class="value">${escapeHtml(totalTorno)}</div>
          </div>
          <div class="kpi">
            <div class="label">Lavado</div>
            <div class="value">${escapeHtml(totalLavado)}</div>
          </div>
          <div class="kpi">
            <div class="label">Torno + Lavado</div>
            <div class="value">${escapeHtml(totalTornoLavado)}</div>
          </div>
          <div class="kpi">
            <div class="label">Sin TL</div>
            <div class="value">${escapeHtml(totalSinTL)}</div>
          </div>
          <div class="kpi">
            <div class="label">Prom Espera</div>
            <div class="value">${fmtMin(promEspera)}</div>
          </div>
          <div class="kpi">
            <div class="label">Prom Duración</div>
            <div class="value">${fmtMin(promDuracion)}</div>
          </div>
          <div class="kpi">
            <div class="label">Prom Total</div>
            <div class="value">${fmtMin(promTotal)}</div>
          </div>
        </div>

        <div class="section-title">Graficas</div>
        <div class="charts">
          <div class="chart">
            <div class="chart-title">Movimientos por empresa (Top ${escapeHtml(chartEmpresas.length)})</div>
            ${chartEmpresas.length
              ? chartEmpresas
                .map((e) => {
                  const pct = Math.max(3, Math.round((e.totalMovimientos / maxMov) * 100));
                  return `
                    <div class="bar-row">
                      <div class="label">${escapeHtml(e.empresa)}</div>
                      <div class="bar">
                        <div class="bar-fill" style="width:${pct}%"></div>
                        <div class="bar-val">${escapeHtml(e.totalMovimientos)}</div>
                      </div>
                    </div>
                  `;
                })
                .join('')
              : '<div class="meta">Sin datos.</div>'
            }
          </div>
          <div class="chart">
            <div class="chart-title">Tiempos promedio por empresa</div>
            ${chartEmpresas.length
              ? chartEmpresas
                .map((e) => {
                  const esperaPct = Math.max(2, Math.round(((e.promEsperaMin ?? 0) / maxEspera) * 100));
                  const durPct = Math.max(2, Math.round(((e.promDuracionMin ?? 0) / maxDur) * 100));
                  const totPct = Math.max(2, Math.round(((e.promTotalMin ?? 0) / maxTot) * 100));
                  return `
                    <div class="time-row">
                      <div class="label">${escapeHtml(e.empresa)}</div>
                      <div class="time-bars">
                        <div class="time-bar time-espera" style="width:${esperaPct}%"><span>${fmtMin(e.promEsperaMin)}</span></div>
                        <div class="time-bar time-duracion" style="width:${durPct}%"><span>${fmtMin(e.promDuracionMin)}</span></div>
                        <div class="time-bar time-total" style="width:${totPct}%"><span>${fmtMin(e.promTotalMin)}</span></div>
                      </div>
                    </div>
                  `;
                })
                .join('')
              : '<div class="meta">Sin datos.</div>'
            }
          </div>
        </div>

        <div class="charts" style="grid-template-columns: 1fr;">
          <div class="chart">
            <div class="chart-title">Mix de servicio (Torno / Lavado / Ambos / Sin TL)</div>
            ${chartEmpresas.length
              ? chartEmpresas
                .map((e) => {
                  const total = e.totalMovimientos || 0;
                  const combo = e.totalTornoLavado || 0;
                  const tornoOnly = Math.max(0, (e.totalTorno || 0) - combo);
                  const lavadoOnly = Math.max(0, (e.totalLavado || 0) - combo);
                  const sin = Math.max(0, e.totalSinTornoLavado || 0);
                  const counted = tornoOnly + lavadoOnly + combo + sin;
                  const otros = Math.max(0, total - counted);
                  const toPct = (v: number) => (total ? Math.max(2, Math.round((v / total) * 100)) : 0);
                  const tornoPct = total ? toPct(tornoOnly) : 0;
                  const lavadoPct = total ? toPct(lavadoOnly) : 0;
                  const comboPct = total ? toPct(combo) : 0;
                  const sinPct = total ? toPct(sin) : 0;
                  const otrosPct = total ? toPct(otros) : 0;

                  return `
                    <div class="stack-row">
                      <div class="label">${escapeHtml(e.empresa)}</div>
                      <div class="stack">
                        ${tornoOnly ? `<div class="seg seg-torno" style="width:${tornoPct}%"></div>` : ''}
                        ${lavadoOnly ? `<div class="seg seg-lavado" style="width:${lavadoPct}%"></div>` : ''}
                        ${combo ? `<div class="seg seg-combo" style="width:${comboPct}%"></div>` : ''}
                        ${sin ? `<div class="seg seg-sin" style="width:${sinPct}%"></div>` : ''}
                        ${otros ? `<div class="seg seg-otros" style="width:${otrosPct}%"></div>` : ''}
                      </div>
                    </div>
                  `;
                })
                .join('')
              : '<div class="meta">Sin datos.</div>'
            }
            <div class="legend">
              <span><i class="dot seg-torno"></i> Torno</span>
              <span><i class="dot seg-lavado"></i> Lavado</span>
              <span><i class="dot seg-combo"></i> Ambos</span>
              <span><i class="dot seg-sin"></i> Sin TL</span>
              <span><i class="dot seg-otros"></i> Otros</span>
            </div>
          </div>
        </div>

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
