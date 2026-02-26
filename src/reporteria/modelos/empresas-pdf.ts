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

function localDateKey(iso: string | null, tz: string) {
  if (!iso) return null;
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('sv-SE', { timeZone: tz });
}

function buildLineChart(labels: string[], values: number[]) {
  const w = 540;
  const h = 160;
  const padX = 26;
  const padY = 18;
  const max = Math.max(1, ...values);
  const stepX = labels.length > 1 ? (w - padX * 2) / (labels.length - 1) : 0;
  const scaleY = (h - padY * 2) / max;

  const points = values.map((v, i) => {
    const x = padX + stepX * i;
    const y = h - padY - v * scaleY;
    return `${x},${y}`;
  });

  const path = points.length ? `M ${points.join(' L ')}` : '';
  const area = points.length
    ? `M ${padX},${h - padY} L ${points.join(' L ')} L ${padX + stepX * (points.length - 1)},${h - padY} Z`
    : '';

  const gridLines = [0.25, 0.5, 0.75].map((p, idx) => {
    const y = h - padY - (h - padY * 2) * p;
    return `<line x1="${padX}" y1="${y}" x2="${w - padX}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />`;
  }).join('');

  const lastVal = values.length ? values[values.length - 1] : 0;

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="160" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#14b8a6" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      ${area ? `<path d="${area}" fill="url(#lineArea)" />` : ''}
      ${path ? `<path d="${path}" fill="none" stroke="#14b8a6" stroke-width="2.5" />` : ''}
      ${points.length ? `<circle cx="${points[points.length - 1].split(',')[0]}" cy="${points[points.length - 1].split(',')[1]}" r="3.5" fill="#0f172a" />` : ''}
      <text x="${w - padX}" y="${padY}" text-anchor="end" font-size="10" fill="#64748b">Max ${max}</text>
      <text x="${w - padX}" y="${h - 4}" text-anchor="end" font-size="10" fill="#0f172a">Último: ${lastVal}</text>
    </svg>
  `;
}

function buildDonut(segments: { label: string; value: number; color: string }[]) {
  const size = 180;
  const r = 62;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;

  let offset = 0;
  const circles = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const dash = (s.value / total) * c;
      const circle = `
        <circle cx="90" cy="90" r="${r}" fill="transparent"
          stroke="${s.color}" stroke-width="16"
          stroke-dasharray="${dash} ${c - dash}"
          stroke-dashoffset="${-offset}" />
      `;
      offset += dash;
      return circle;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" width="180" height="180">
      <circle cx="90" cy="90" r="${r}" fill="transparent" stroke="#e2e8f0" stroke-width="16" />
      ${circles}
      <text x="90" y="94" text-anchor="middle" font-size="16" font-weight="700" fill="#0f172a">${Math.round(total)}</text>
      <text x="90" y="110" text-anchor="middle" font-size="10" fill="#64748b">movs</text>
    </svg>
  `;
}

function buildBarChart(labels: string[], values: number[]) {
  const w = 520;
  const h = 180;
  const padX = 110;
  const padY = 16;
  const max = Math.max(1, ...values);
  const barH = 12;
  const gap = 10;

  const rows = labels.map((label, i) => {
    const y = padY + i * (barH + gap);
    const barW = Math.max(8, Math.round(((values[i] || 0) / max) * (w - padX - 16)));
    return `
      <text x="0" y="${y + barH - 2}" font-size="10" fill="#64748b">${escapeHtml(label)}</text>
      <rect x="${padX}" y="${y}" width="${barW}" height="${barH}" rx="6" fill="#14b8a6"></rect>
      <text x="${padX + barW + 6}" y="${y + barH - 2}" font-size="10" fill="#0f172a">${values[i] ?? 0}</text>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
      ${rows}
    </svg>
  `;
}

function buildGroupedBars(labels: string[], series: { name: string; color: string; values: number[] }[]) {
  const w = 520;
  const h = 190;
  const padX = 80;
  const padY = 22;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const groupWidth = (w - padX - 20) / Math.max(1, labels.length);
  const barW = Math.max(6, Math.min(14, groupWidth / (series.length + 0.5)));

  const bars = labels.map((label, i) => {
    const x0 = padX + i * groupWidth;
    const labelX = x0 + groupWidth / 2;
    const labelText = String(label).length > 10 ? `${String(label).slice(0, 10)}…` : String(label);
    const groupBars = series.map((s, j) => {
      const v = s.values[i] ?? 0;
      const barH = Math.round((v / max) * (h - padY * 2));
      const x = x0 + j * (barW + 6);
      const y = h - padY - barH;
      return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="${s.color}"></rect>`;
    }).join('');

    return `
      ${groupBars}
      <text x="${labelX}" y="${h - 6}" text-anchor="middle" font-size="9" fill="#64748b">${escapeHtml(labelText)}</text>
    `;
  }).join('');

  const legend = series.map((s, idx) => {
    const x = padX + idx * 90;
    return `
      <rect x="${x}" y="4" width="10" height="10" rx="2" fill="${s.color}"></rect>
      <text x="${x + 16}" y="13" font-size="10" fill="#475569">${escapeHtml(s.name)}</text>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
      ${legend}
      ${bars}
    </svg>
  `;
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

  const dailyMap = new Map<string, number>();
  for (const m of allMovs) {
    const key = localDateKey(m.fechaSolicitudUTC, meta.tz);
    if (!key) continue;
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const dailyLabels = Array.from(dailyMap.keys()).sort();
  const dailyValues = dailyLabels.map((k) => dailyMap.get(k) ?? 0);

  const lineChart = buildLineChart(dailyLabels, dailyValues);
  const topLabels = chartEmpresas.map((e) => e.empresa);
  const topValues = chartEmpresas.map((e) => e.totalMovimientos);
  const barChart = buildBarChart(topLabels, topValues);

  const combo = totalTornoLavado;
  const tornoOnly = Math.max(0, totalTorno - combo);
  const lavadoOnly = Math.max(0, totalLavado - combo);
  const sin = Math.max(0, totalSinTL);
  const otros = Math.max(0, totalMovs - (tornoOnly + lavadoOnly + combo + sin));
  const donut = buildDonut([
    { label: 'Torno', value: tornoOnly, color: '#60a5fa' },
    { label: 'Lavado', value: lavadoOnly, color: '#34d399' },
    { label: 'Ambos', value: combo, color: '#fbbf24' },
    { label: 'Sin TL', value: sin, color: '#94a3b8' },
    { label: 'Otros', value: otros, color: '#fca5a5' },
  ]);

  const viaCounts = new Map<string, number>();
  for (const m of allMovs) {
    const via = m.viaDestinoNombre ?? m.viaOrigenNombre;
    if (!via) continue;
    viaCounts.set(via, (viaCounts.get(via) ?? 0) + 1);
  }
  const topVias = Array.from(viaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const viaBar = topVias.length
    ? buildBarChart(topVias.map((v) => v[0]), topVias.map((v) => v[1]))
    : '<div class="meta">Sin datos.</div>';

  const topTime = chartEmpresas.slice(0, 6);
  const timeLabels = topTime.map((e) => e.empresa);
  const timeChart = buildGroupedBars(timeLabels, [
    { name: 'Espera', color: '#fde68a', values: topTime.map((e) => e.promEsperaMin ?? 0) },
    { name: 'Duración', color: '#86efac', values: topTime.map((e) => e.promDuracionMin ?? 0) },
    { name: 'Total', color: '#93c5fd', values: topTime.map((e) => e.promTotalMin ?? 0) },
  ]);

  const topEmpresa = chartEmpresas[0];
  const busiest = dailyLabels.length
    ? dailyLabels.reduce((best, cur) => (dailyMap.get(cur)! > (dailyMap.get(best) ?? 0) ? cur : best), dailyLabels[0])
    : null;
  const busiestCount = busiest ? dailyMap.get(busiest) ?? 0 : 0;

  const cards = reporte.empresas
    .map((e) => {
      const viaCountsE = new Map<string, number>();
      for (const mv of e.movimientos) {
        const via = mv.viaDestinoNombre ?? mv.viaOrigenNombre;
        if (!via) continue;
        viaCountsE.set(via, (viaCountsE.get(via) ?? 0) + 1);
      }
      const topViasE = Array.from(viaCountsE.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([v, c]) => `${v} (${c})`)
        .join(', ');

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
                  <td>${escapeHtml(m.locomotiveNumber)}</td>
                  <td>${escapeHtml(m.estado)}</td>
                  <td>${escapeHtml(m.tipoMovimiento ?? '—')}</td>
                  <td>${torno}</td>
                  <td>${lavado}</td>
                  <td>${escapeHtml(m.clienteNombre ?? '—')}</td>
                  <td>${escapeHtml(m.operadorNombre ?? '—')}</td>
                  <td>${escapeHtml(m.solicitadoPor ?? '—')}</td>
                  <td>${escapeHtml(m.localidad ?? '—')}</td>
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
            <div class="card-title">${escapeHtml(e.empresa)}</div>
            <div class="card-sub">Movimientos: ${escapeHtml(e.totalMovimientos)} · Locomotoras: ${escapeHtml(e.totalLocomotoras)}</div>
          </div>
          <div class="chips">
            <span class="chip chip-torno">Torno: ${escapeHtml(e.totalTorno)}</span>
            <span class="chip chip-lavado">Lavado: ${escapeHtml(e.totalLavado)}</span>
            <span class="chip chip-combo">Torno+Lavado: ${escapeHtml(e.totalTornoLavado)}</span>
            <span class="chip chip-sin">Sin TL: ${escapeHtml(e.totalSinTornoLavado)}</span>
          </div>
          <div class="topline">Top vías: ${escapeHtml(topViasE || '—')}</div>
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
          .insights {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-top: 12px;
          }
          .insight {
            background: #0f172a;
            color: white;
            border-radius: 12px;
            padding: 10px 12px;
          }
          .insight .label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .12em;
            opacity: .7;
            font-weight: 700;
          }
          .insight .value {
            font-size: 16px;
            font-weight: 800;
            margin-top: 4px;
          }
          .insight .sub {
            font-size: 11px;
            margin-top: 2px;
            opacity: .75;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 10px;
          }
          .panel {
            background: white;
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
          }
          .panel-title {
            font-size: 12px;
            font-weight: 800;
            color: var(--ink);
            margin-bottom: 4px;
          }
          .panel-sub {
            font-size: 10px;
            color: var(--muted);
            margin-bottom: 8px;
          }
          .donut-wrap {
            display: grid;
            grid-template-columns: 180px 1fr;
            gap: 12px;
            align-items: center;
          }
          .donut-legend {
            display: grid;
            gap: 6px;
            font-size: 10px;
            color: var(--muted);
          }
          .donut-legend div {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 700;
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
          .note {
            margin-top: 12px;
            background: #f1f5f9;
            border: 1px dashed #cbd5f5;
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 11px;
            color: #475569;
            line-height: 1.5;
          }
          .note strong {
            color: #0f172a;
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

        <div class="insights">
          <div class="insight">
            <div class="label">Empresa líder</div>
            <div class="value">${escapeHtml(topEmpresa?.empresa ?? '—')}</div>
            <div class="sub">Movimientos: ${escapeHtml(topEmpresa?.totalMovimientos ?? 0)}</div>
          </div>
          <div class="insight">
            <div class="label">Día más activo</div>
            <div class="value">${escapeHtml(busiest ?? '—')}</div>
            <div class="sub">Movimientos: ${escapeHtml(busiestCount)}</div>
          </div>
          <div class="insight">
            <div class="label">Promedio total</div>
            <div class="value">${fmtMin(promTotal)}</div>
            <div class="sub">Tiempo total por movimiento</div>
          </div>
        </div>

        <div class="section-title">Panel Analítico</div>
        <div class="grid-2">
          <div class="panel">
            <div class="panel-title">Tendencia diaria de movimientos</div>
            <div class="panel-sub">Rango completo del periodo</div>
            ${lineChart}
          </div>
          <div class="panel">
            <div class="panel-title">Mix de servicio</div>
            <div class="panel-sub">Torno / Lavado / Ambos / Sin TL</div>
            <div class="donut-wrap">
              ${donut}
              <div class="donut-legend">
                <div><span class="dot seg-torno"></span> Torno</div>
                <div><span class="dot seg-lavado"></span> Lavado</div>
                <div><span class="dot seg-combo"></span> Ambos</div>
                <div><span class="dot seg-sin"></span> Sin TL</div>
                <div><span class="dot seg-otros"></span> Otros</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="panel">
            <div class="panel-title">Top empresas por movimientos</div>
            <div class="panel-sub">Ranking operativo del periodo</div>
            ${barChart}
          </div>
          <div class="panel">
            <div class="panel-title">Tiempos promedio por empresa</div>
            <div class="panel-sub">Top ${escapeHtml(timeLabels.length)} empresas</div>
            ${timeChart}
          </div>
        </div>

        <div class="grid-2" style="grid-template-columns: 1fr;">
          <div class="panel">
            <div class="panel-title">Vías más utilizadas (destino)</div>
            <div class="panel-sub">Top ${escapeHtml(topVias.length)} vías en el periodo</div>
            ${viaBar}
          </div>
        </div>

        <div class="note">
          <strong>Definiciones:</strong>
          TL = Torno + Lavado (ambos servicios en el mismo movimiento).
          <strong>Sin TL</strong> significa que no tuvo ni torno ni lavado.
          Los indicadores de Torno y Lavado muestran si el movimiento incluyó esos servicios.
          <strong>Vía Origen</strong> es la vía de salida y <strong>Vía Destino</strong> es la vía final del movimiento.
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
