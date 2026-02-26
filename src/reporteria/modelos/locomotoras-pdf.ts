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

function fmtMin(n: number | null | undefined) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n < 60) return `${Math.round(n)}m`;
  const h = Math.floor(n / 60);
  const m = Math.round(n - h * 60);
  return `${h}h ${m}m`;
}

function buildHtml(reporte: LocomotorasReporte) {
  const meta = reporte.meta;

  const rangoDesde = fmtTZ(meta.rangoUTC.desde, meta.tz);
  const rangoHasta = fmtTZ(meta.rangoUTC.hastaExclusivo, meta.tz);
  const locomotoras = meta.locomotoras.join(', ');

  const allMovs = reporte.locomotoras.flatMap((l) => l.movimientos);
  const totalLocos = reporte.locomotoras.length;
  const totalMovs = allMovs.length;
  const totalTorno = reporte.locomotoras.reduce((acc, l) => acc + l.totalTorno, 0);
  const totalLavado = reporte.locomotoras.reduce((acc, l) => acc + l.totalLavado, 0);
  const totalTornoLavado = reporte.locomotoras.reduce((acc, l) => acc + l.totalTornoLavado, 0);
  const totalSinTL = reporte.locomotoras.reduce((acc, l) => acc + l.totalSinTornoLavado, 0);

  const sumAvg = (key: 'esperaMin' | 'duracionMin' | 'totalMin') => {
    let sum = 0;
    let n = 0;
    for (const m of allMovs) {
      const v = m[key];
      if (v !== null && v !== undefined && Number.isFinite(v)) {
        sum += v;
        n += 1;
      }
    }
    return n ? Math.round(sum / n) : null;
  };

  const promEspera = sumAvg('esperaMin');
  const promDuracion = sumAvg('duracionMin');
  const promTotal = sumAvg('totalMin');

  const chartLocos = [...reporte.locomotoras]
    .sort((a, b) => b.totalMovimientos - a.totalMovimientos)
    .slice(0, 10);
  const maxMov = Math.max(1, ...chartLocos.map((l) => l.totalMovimientos));

  const maxEspera = Math.max(1, ...chartLocos.map((l) => l.promEsperaMin ?? 0));
  const maxDur = Math.max(1, ...chartLocos.map((l) => l.promDuracionMin ?? 0));
  const maxTotal = Math.max(1, ...chartLocos.map((l) => l.promTotalMin ?? 0));

  const viaCounts = new Map<string, number>();
  for (const m of allMovs) {
    const via = m.viaDestinoNombre ?? m.viaOrigenNombre;
    if (!via) continue;
    viaCounts.set(via, (viaCounts.get(via) ?? 0) + 1);
  }
  const topVias = Array.from(viaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxVia = Math.max(1, ...topVias.map((v) => v[1]));
  const viasChart = topVias.length
    ? topVias
      .map(([via, count]) => {
        const pct = Math.max(3, Math.round((count / maxVia) * 100));
        return `
          <div class="bar-row">
            <div class="label">${escapeHtml(via)}</div>
            <div class="bar">
              <div class="bar-fill" style="width:${pct}%"></div>
              <div class="bar-val">${escapeHtml(count)}</div>
            </div>
          </div>
        `;
      })
      .join('')
    : '<div class="meta">Sin datos.</div>';

  const cards = reporte.locomotoras
    .map((l) => {
      const viaCountsL = new Map<string, number>();
      for (const mv of l.movimientos) {
        const via = mv.viaDestinoNombre ?? mv.viaOrigenNombre;
        if (!via) continue;
        viaCountsL.set(via, (viaCountsL.get(via) ?? 0) + 1);
      }
      const topViasL = Array.from(viaCountsL.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([v, c]) => `${v} (${c})`)
        .join(', ');

      const rows = l.movimientos.length
        ? l.movimientos
          .map((m) => {
            const solicitud = fmtTZ(m.fechaSolicitudUTC, meta.tz);
            const inicio = fmtTZ(m.fechaInicioUTC, meta.tz);
            const fin = fmtTZ(m.fechaFinUTC, meta.tz);
            const estado = escapeHtml(m.estado ?? '—');
            const tipo = escapeHtml(m.tipoMovimiento ?? '—');
            const torno = m.torno ? 'Sí' : 'No';
            const lavado = m.lavado ? 'Sí' : 'No';
            const espera = fmtMin(m.esperaMin);
            const duracion = fmtMin(m.duracionMin);
            const total = fmtMin(m.totalMin);
            const cliente = escapeHtml(m.clienteNombre ?? '—');
            const operador = escapeHtml(m.operadorNombre ?? '—');
            const empresa = escapeHtml(m.empresa ?? '—');
            const localidad = escapeHtml(m.localidad ?? '—');
            const solicitado = escapeHtml(m.solicitadoPor ?? '—');
            const viaOrigen = escapeHtml(m.viaOrigenNombre ?? '—');
            const viaDestino = escapeHtml(m.viaDestinoNombre ?? '—');

            return `
              <tr>
                <td>${solicitud}</td>
                <td>${inicio}</td>
                <td>${fin}</td>
                <td>${espera}</td>
                <td>${duracion}</td>
                <td>${total}</td>
                <td>${estado}</td>
                <td>${tipo}</td>
                <td>${torno}</td>
                <td>${lavado}</td>
                <td>${cliente}</td>
                <td>${operador}</td>
                <td>${empresa}</td>
                <td>${localidad}</td>
                <td>${solicitado}</td>
                <td>${viaOrigen}</td>
                <td>${viaDestino}</td>
              </tr>
            `;
          })
          .join('')
        : `
          <tr>
            <td colspan="17" class="empty">Sin movimientos en el rango</td>
          </tr>
        `;

      return `
        <section class="card">
          <div class="card-head">
            <div class="card-title">Locomotora ${escapeHtml(l.locomotiveNumber)}</div>
            <div class="card-sub">Movimientos: ${escapeHtml(l.totalMovimientos)}</div>
          </div>
          <div class="chips">
            <span class="chip chip-torno">Torno: ${escapeHtml(l.totalTorno)}</span>
            <span class="chip chip-lavado">Lavado: ${escapeHtml(l.totalLavado)}</span>
            <span class="chip chip-combo">Torno+Lavado: ${escapeHtml(l.totalTornoLavado)}</span>
            <span class="chip chip-sin">Sin TL: ${escapeHtml(l.totalSinTornoLavado)}</span>
          </div>
          <div class="topline">Top vías: ${escapeHtml(topViasL || '—')}</div>
          <div class="mini">
            <div><span class="label">Prom Espera</span> ${fmtMin(l.promEsperaMin)}</div>
            <div><span class="label">Prom Duración</span> ${fmtMin(l.promDuracionMin)}</div>
            <div><span class="label">Prom Total</span> ${fmtMin(l.promTotalMin)}</div>
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
                <th>Estado</th>
                <th>Tipo</th>
                <th>Torno</th>
                <th>Lavado</th>
                <th>Cliente</th>
                <th>Operador</th>
                <th>Empresa</th>
                <th>Localidad</th>
                <th>Solicitado por</th>
                <th>Vía Origen</th>
                <th>Vía Destino</th>
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
            --brand: #0ea5e9;
            --brand-2: #22c55e;
            --brand-3: #f59e0b;
            --chip: #e2e8f0;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 26px 28px 36px;
            font-family: "Helvetica Neue", Arial, sans-serif;
            color: var(--ink);
            background: var(--bg);
          }
          .hero {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0ea5e9 140%);
            color: white;
            padding: 18px 20px;
            border-radius: 14px;
          }
          .title {
            font-size: 22px;
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
            margin: 16px 0 18px;
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
            grid-template-columns: 1.15fr 1fr;
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
            grid-template-columns: 70px 1fr;
            gap: 10px;
            align-items: center;
            margin-bottom: 6px;
          }
          .bar-row .label {
            font-size: 11px;
            color: var(--muted);
            font-weight: 700;
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
            background: linear-gradient(90deg, #38bdf8, #0ea5e9);
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
            grid-template-columns: 70px 1fr;
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
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 14px 10px;
            margin-bottom: 14px;
            page-break-inside: avoid;
            background: white;
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
          .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 8px 0 6px;
          }
          .topline {
            font-size: 11px;
            color: #475569;
            font-weight: 700;
            margin: 4px 0 6px;
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
        <div class="hero">
          <div class="title">Reporte de Locomotoras</div>
          <div class="meta">Rango (MX): ${escapeHtml(rangoDesde)} → ${escapeHtml(rangoHasta)}</div>
          <div class="meta">Locomotoras: ${escapeHtml(locomotoras || '—')}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi">
            <div class="label">Locomotoras</div>
            <div class="value">${escapeHtml(totalLocos)}</div>
          </div>
          <div class="kpi">
            <div class="label">Movimientos</div>
            <div class="value">${escapeHtml(totalMovs)}</div>
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
            <div class="label">Prom Duracion</div>
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
            <div class="chart-title">Movimientos por locomotora (Top ${escapeHtml(chartLocos.length)})</div>
            ${chartLocos.length
              ? chartLocos
                .map((l) => {
                  const pct = Math.max(3, Math.round((l.totalMovimientos / maxMov) * 100));
                  return `
                    <div class="bar-row">
                      <div class="label">L-${escapeHtml(l.locomotiveNumber)}</div>
                      <div class="bar">
                        <div class="bar-fill" style="width:${pct}%"></div>
                        <div class="bar-val">${escapeHtml(l.totalMovimientos)}</div>
                      </div>
                    </div>
                  `;
                })
                .join('')
              : '<div class="meta">Sin datos.</div>'
            }
          </div>
          <div class="chart">
            <div class="chart-title">Tiempos promedio por locomotora (min)</div>
            ${chartLocos.length
              ? chartLocos
                .map((l) => {
                  const esperaPct = Math.max(2, Math.round(((l.promEsperaMin ?? 0) / maxEspera) * 100));
                  const durPct = Math.max(2, Math.round(((l.promDuracionMin ?? 0) / maxDur) * 100));
                  const totalPct = Math.max(2, Math.round(((l.promTotalMin ?? 0) / maxTotal) * 100));
                  return `
                    <div class="time-row">
                      <div class="label">L-${escapeHtml(l.locomotiveNumber)}</div>
                      <div class="time-bars">
                        <div class="time-bar time-espera" style="width:${esperaPct}%"><span>${fmtMin(l.promEsperaMin)}</span></div>
                        <div class="time-bar time-duracion" style="width:${durPct}%"><span>${fmtMin(l.promDuracionMin)}</span></div>
                        <div class="time-bar time-total" style="width:${totalPct}%"><span>${fmtMin(l.promTotalMin)}</span></div>
                      </div>
                    </div>
                  `;
                })
                .join('')
              : '<div class="meta">Sin datos.</div>'
            }
          </div>
        </div>

        <div class="charts" style="grid-template-columns: 1fr; margin-top: 10px;">
          <div class="chart">
            <div class="chart-title">Vías más utilizadas (destino)</div>
            ${viasChart}
          </div>
        </div>

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
    landscape: true,
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
