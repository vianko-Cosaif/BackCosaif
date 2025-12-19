// reporteria/reporteriaMovimiento-pdf.ts
// PDF empresarial (BLANCO / NEGRO) con gráficas SIN Chart.js
// Gráficas en SVG embebido (0 dependencias extra, 0 problemas de "exports")
// Rango mostrado en hora MX (America/Mexico_City) aunque venga en UTC desde el model.

import * as puppeteer from 'puppeteer';
import { DateTime } from 'luxon';

export type ReporteBase = {
  meta: {
    fechaLocal?: string;
    etiqueta?: string;
    periodo?: string;
    tz: string;
    rangoUTC: { desde: string; hastaExclusivo: string };
  };
  resumen: {
    totalMovimientos: number;
    movimientosPorEstado: Record<string, number>;
    totalIncidentes: number;
    incidentesPorEstado: Record<string, number>;
    porEmpresa: Array<{
      empresaId: number;
      empresa: string;
      totalMovimientos: number;
      movimientosPorEstado: Record<string, number>;
      totalIncidentes: number;
      incidentesPorEstado: Record<string, number>;
    }>;
  };
};

export type PdfFile = {
  filename: string;
  contentType: 'application/pdf';
  buffer: Buffer;
};

// ---------- Singleton Browser ----------
let browserSingleton: puppeteer.Browser | null = null;

async function getBrowser() {
  if (browserSingleton) return browserSingleton;

  browserSingleton = await puppeteer.launch({
    headless: 'new' as any,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  return browserSingleton;
}

export async function closeReporteriaBrowser() {
  if (browserSingleton) {
    await browserSingleton.close();
    browserSingleton = null;
  }
}

// ---------- Helpers ----------
const safeNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
  return String(name || 'Movimientos')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function truncLabel(s: string, n: number) {
  const t = String(s ?? '');
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function formatRangoMX(meta: ReporteBase['meta']) {
  const zone = 'America/Mexico_City'; // fijo como pediste
  const fmt = 'yyyy-LL-dd HH:mm';

  try {
    const desde = DateTime.fromISO(meta.rangoUTC.desde, { zone: 'utc' }).setZone(zone);
    const hasta = DateTime.fromISO(meta.rangoUTC.hastaExclusivo, { zone: 'utc' }).setZone(zone);

    // fallback si algo raro llega
    if (!desde.isValid || !hasta.isValid) {
      return {
        desde: meta.rangoUTC.desde,
        hasta: meta.rangoUTC.hastaExclusivo,
      };
    }

    return {
      desde: desde.toFormat(fmt),
      hasta: hasta.toFormat(fmt),
    };
  } catch {
    return {
      desde: meta.rangoUTC.desde,
      hasta: meta.rangoUTC.hastaExclusivo,
    };
  }
}

type EmpresaNorm = {
  name: string;
  concluidos: number;
  cancelados: number;
  incTotal: number;
  incResueltos: number;
  incNoResueltos: number; // ABIERTO + CERRADO
};

function normalizeData(r: ReporteBase): EmpresaNorm[] {
  return (r.resumen.porEmpresa ?? [])
    .map((e) => {
      const concluidos = safeNum(e.movimientosPorEstado?.['CONCLUIDO']);
      const cancelados = safeNum(e.movimientosPorEstado?.['CANCELADO']);

      const incTotal = safeNum(e.totalIncidentes);
      const incResueltos = safeNum(e.incidentesPorEstado?.['RESUELTO']);
      const incAbiertos = safeNum(e.incidentesPorEstado?.['ABIERTO']);
      const incCerrados = safeNum(e.incidentesPorEstado?.['CERRADO']);

      return {
        name: e.empresa || 'Sin Nombre',
        concluidos,
        cancelados,
        incTotal,
        incResueltos,
        incNoResueltos: incAbiertos + incCerrados,
      };
    })
    .sort((a, b) => {
      const sa = a.concluidos + a.cancelados + a.incTotal;
      const sb = b.concluidos + b.cancelados + b.incTotal;
      return sb - sa;
    });
}

function computeKpis(reporte: ReporteBase) {
  const totalMov = safeNum(reporte.resumen.totalMovimientos);
  const totalInc = safeNum(reporte.resumen.totalIncidentes);

  const concluidos = safeNum(reporte.resumen.movimientosPorEstado?.['CONCLUIDO']);
  const cancelados = safeNum(reporte.resumen.movimientosPorEstado?.['CANCELADO']);

  const incResueltos = safeNum(reporte.resumen.incidentesPorEstado?.['RESUELTO']);
  const incNoResueltos =
    safeNum(reporte.resumen.incidentesPorEstado?.['ABIERTO']) +
    safeNum(reporte.resumen.incidentesPorEstado?.['CERRADO']);

  const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

  return {
    totalMov,
    totalInc,

    concluidos,
    cancelados,
    concluidosPct: pct(concluidos, totalMov),
    canceladosPct: pct(cancelados, totalMov),

    incResueltos,
    incNoResueltos,
    incResueltosPct: pct(incResueltos, totalInc),
    incNoResueltosPct: pct(incNoResueltos, totalInc),
  };
}

// ---------- SVG Charts (sin JS) ----------
function svgHBarChart(opts: {
  title: string;
  height: number;
  labels: string[];
  values: number[];
  barColor: string; // sólido (corporativo)
}) {
  const w = 560;
  const h = Math.max(260, Math.floor(opts.height));

  const title = escapeHtml(opts.title);
  const labels = opts.labels ?? [];
  const values = (opts.values ?? []).map(safeNum);

  if (!labels.length) {
    return `<div style="height:${h}px;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:12px">
      Sin datos para graficar.
    </div>`;
  }

  const left = 230; // más espacio para nombres
  const right = 20;
  const top = 52;
  const bottom = 18;

  const rowH = 22;
  const barH = 12;

  const maxVal = Math.max(1, ...values);
  const barW = w - left - right;
  const scale = barW / maxVal;

  const lines: string[] = [];

  // título
  lines.push(
    `<text x="16" y="26" fill="#111827" font-size="14" font-weight="700">${title}</text>`
  );

  // guía vertical (0, 25, 50, 75, 100%)
  for (let i = 0; i <= 4; i++) {
    const x = left + (barW * i) / 4;
    lines.push(
      `<line x1="${x}" y1="${top - 6}" x2="${x}" y2="${h - bottom}" stroke="#e5e7eb" stroke-width="1"/>`
    );
  }

  for (let i = 0; i < labels.length; i++) {
    const y = top + i * rowH + rowH / 2;
    const name = escapeHtml(truncLabel(labels[i], 28));
    const v = safeNum(values[i]);
    const bw = Math.max(0, Math.round(v * scale));

    // label
    lines.push(
      `<text x="16" y="${y}" fill="#374151" font-size="10.8" dominant-baseline="middle">${name}</text>`
    );

    // bar track (gris claro)
    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${barW}" height="${barH}" rx="6" fill="#f3f4f6"></rect>`
    );

    // bar
    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${bw}" height="${barH}" rx="6" fill="${opts.barColor}"></rect>`
    );

    // value (negro, siempre visible)
    const vx = Math.min(left + bw + 8, w - right - 24);
    lines.push(
      `<text x="${vx}" y="${y}" fill="#111827" font-size="11" dominant-baseline="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${v}</text>`
    );
  }

  return `
  <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMin meet"
       xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
    ${lines.join('\n')}
  </svg>`;
}

function svgStackedBarChart(opts: {
  title: string;
  height: number;
  labels: string[];
  aLabel: string;
  aValues: number[];
  aColor: string;
  bLabel: string;
  bValues: number[];
  bColor: string;
}) {
  const w = 560;
  const h = Math.max(320, Math.floor(opts.height));

  const title = escapeHtml(opts.title);
  const labels = opts.labels ?? [];
  const aValues = (opts.aValues ?? []).map(safeNum);
  const bValues = (opts.bValues ?? []).map(safeNum);

  if (!labels.length) {
    return `<div style="height:${h}px;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:12px">
      Sin datos para graficar.
    </div>`;
  }

  const left = 230;
  const right = 20;
  const top = 52;
  const bottom = 54; // leyenda
  const rowH = 26;
  const barH = 16;

  const totals = labels.map((_, i) => safeNum(aValues[i]) + safeNum(bValues[i]));
  const maxTotal = Math.max(1, ...totals);

  const barW = w - left - right;
  const scale = barW / maxTotal;

  const lines: string[] = [];

  lines.push(
    `<text x="16" y="26" fill="#111827" font-size="14" font-weight="700">${title}</text>`
  );

  for (let i = 0; i <= 4; i++) {
    const x = left + (barW * i) / 4;
    lines.push(
      `<line x1="${x}" y1="${top - 6}" x2="${x}" y2="${h - bottom}" stroke="#e5e7eb" stroke-width="1"/>`
    );
  }

  for (let i = 0; i < labels.length; i++) {
    const y = top + i * rowH + rowH / 2;
    const name = escapeHtml(truncLabel(labels[i], 28));

    const a = safeNum(aValues[i]);
    const b = safeNum(bValues[i]);
    const total = a + b;

    const aw = Math.round(a * scale);
    const bw = Math.round(b * scale);

    lines.push(
      `<text x="16" y="${y}" fill="#374151" font-size="10.8" dominant-baseline="middle">${name}</text>`
    );

    // track
    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${barW}" height="${barH}" rx="8" fill="#f3f4f6"></rect>`
    );

    // a segment
    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${aw}" height="${barH}" rx="8" fill="${opts.aColor}"></rect>`
    );

    // b segment
    lines.push(
      `<rect x="${left + aw}" y="${y - barH / 2}" width="${bw}" height="${barH}" rx="8" fill="${opts.bColor}"></rect>`
    );

    // total label
    const tx = Math.min(left + aw + bw + 8, w - right - 34);
    lines.push(
      `<text x="${tx}" y="${y}" fill="#111827" font-size="11" dominant-baseline="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${total}</text>`
    );
  }

  // leyenda
  const legY = h - 18;
  lines.push(
    `<rect x="16" y="${legY - 10}" width="10" height="10" rx="3" fill="${opts.aColor}"></rect>
     <text x="32" y="${legY - 1}" fill="#111827" font-size="10.5">${escapeHtml(opts.aLabel)}</text>
     <rect x="200" y="${legY - 10}" width="10" height="10" rx="3" fill="${opts.bColor}"></rect>
     <text x="216" y="${legY - 1}" fill="#111827" font-size="10.5">${escapeHtml(opts.bLabel)}</text>`
  );

  return `
  <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMin meet"
       xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
    ${lines.join('\n')}
  </svg>`;
}

// ---------- HTML ----------
function buildHtml(reporte: ReporteBase, data: EmpresaNorm[]) {
  const meta = reporte.meta;
  const resumen = reporte.resumen;
  const k = computeKpis(reporte);

  const etiqueta = escapeHtml(meta.etiqueta || meta.fechaLocal || 'Reporte de movimientos');
  const periodo = escapeHtml(meta.periodo || '');

  const rangoMX = formatRangoMX(meta);
  const desdeMX = escapeHtml(rangoMX.desde);
  const hastaMX = escapeHtml(rangoMX.hasta);

  // charts dinámicos
  const hBars = clamp(320 + data.length * 20, 360, 840);
  const hStack = clamp(340 + data.length * 24, 420, 960);

  const labels = data.map((d) => d.name);
  const concluidos = data.map((d) => d.concluidos);
  const cancelados = data.map((d) => d.cancelados);
  const incTotal = data.map((d) => d.incTotal);
  const incRes = data.map((d) => d.incResueltos);
  const incNoRes = data.map((d) => d.incNoResueltos);

  // Tabla: TODAS las empresas (si son muchas, se va a páginas siguientes)
  const rows = (data ?? [])
    .map((d, idx) => {
      const risk = d.incNoResueltos > 0 ? 'Riesgo' : d.incTotal > 0 ? 'Atención' : 'OK';
      const riskClass = d.incNoResueltos > 0 ? 'risk' : d.incTotal > 0 ? 'warn' : 'ok';
      return `
        <tr>
          <td class="mono">${idx + 1}</td>
          <td class="name">${escapeHtml(d.name)}</td>
          <td class="mono right">${d.concluidos}</td>
          <td class="mono right">${d.cancelados}</td>
          <td class="mono right">${d.incTotal}</td>
          <td class="mono right">${d.incResueltos}</td>
          <td class="mono right">${d.incNoResueltos}</td>
          <td><span class="chip ${riskClass}">${risk}</span></td>
        </tr>`;
    })
    .join('');

  // Colores corporativos (sobrios)
  const chConcluidos = svgHBarChart({
    title: 'Movimientos concluidos (por empresa)',
    height: hBars,
    labels,
    values: concluidos,
    barColor: '#111827', // negro corporativo
  });

  const chCancelados = svgHBarChart({
    title: 'Movimientos cancelados (por empresa)',
    height: hBars,
    labels,
    values: cancelados,
    barColor: '#4b5563', // gris fuerte
  });

  const chIncTotal = svgHBarChart({
    title: 'Total incidentes (por empresa)',
    height: hBars,
    labels,
    values: incTotal,
    barColor: '#0f172a', // navy casi negro (muy corporativo)
  });

  const chResVsNoRes = svgStackedBarChart({
    title: 'Incidentes: resueltos vs no resueltos (por empresa)',
    height: hStack,
    labels,
    aLabel: 'Resuelto',
    aValues: incRes,
    aColor: '#111827',
    bLabel: 'No resuelto (Abierto + Cerrado)',
    bValues: incNoRes,
    bColor: '#6b7280',
  });

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 12mm; }
    *{ box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

    :root{
      --bg:#ffffff;
      --text:#111827;
      --muted:#4b5563;
      --muted2:#6b7280;
      --border:#e5e7eb;
      --panel:#f9fafb;
      --shadow: 0 10px 26px rgba(17,24,39,.10);
    }

    body{
      margin:0;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      padding: 0;
    }

    .wrap{ padding: 8px 0 0; }

    .header{
      border: 1px solid var(--border);
      background: linear-gradient(180deg, var(--panel), #fff);
      border-radius: 14px;
      padding: 16px 16px 12px;
      box-shadow: var(--shadow);
      display:flex;
      justify-content:space-between;
      gap: 14px;
      align-items:flex-start;
    }

    .brandline{
      display:flex;
      gap:10px;
      align-items:center;
      margin-bottom: 8px;
    }
    .logoMark{
      width: 10px; height: 10px;
      border-radius: 999px;
      background: #111827;
      box-shadow: 0 0 0 5px rgba(17,24,39,.08);
    }
    .kicker{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .16em;
      color: var(--muted2);
      font-weight: 700;
    }
    .badge{
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: #fff;
      font-size: 10px;
      color: var(--muted);
      margin-left: 8px;
      vertical-align: middle;
      font-weight: 700;
    }
    .dot{
      width: 7px; height: 7px;
      border-radius: 99px;
      background: #111827;
      box-shadow: 0 0 0 4px rgba(17,24,39,.08);
    }

    h1{
      margin: 0;
      font-size: 22px;
      letter-spacing: .2px;
      line-height: 1.15;
      font-weight: 800;
    }
    .subline{
      margin-top: 6px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }

    .meta{
      text-align:right;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.45;
      max-width: 420px;
      font-weight: 600;
    }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .meta code{
      background: #fff;
      border: 1px solid var(--border);
      padding: 3px 8px;
      border-radius: 10px;
      color: var(--text);
      white-space: nowrap;
      font-weight: 700;
      display:inline-block;
    }
    .meta .lbl{ color: var(--muted2); font-weight: 800; letter-spacing: .08em; text-transform: uppercase; font-size: 10px; }

    .stats{
      margin-top: 12px;
      display:grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .stat{
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 14px;
      padding: 12px 12px 10px;
      box-shadow: 0 6px 18px rgba(17,24,39,.06);
    }
    .stat .label{
      font-size: 10px;
      color: var(--muted2);
      text-transform: uppercase;
      letter-spacing: .14em;
      font-weight: 800;
    }
    .stat .value{
      margin-top: 7px;
      font-size: 18px;
      font-weight: 900;
      color: var(--text);
    }
    .stat .sub{
      margin-top: 4px;
      font-size: 11px;
      color: var(--muted);
      font-weight: 600;
    }

    .sectionTitle{
      margin: 16px 2px 10px;
      font-size: 11px;
      color: var(--muted2);
      text-transform: uppercase;
      letter-spacing: .18em;
      display:flex;
      justify-content:space-between;
      align-items:center;
      font-weight: 900;
    }

    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .card{
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 14px;
      padding: 12px;
      box-shadow: var(--shadow);
      overflow:hidden;
      break-inside: avoid;
    }
    .chartWrap{ position:relative; }

    .pagebreak{
      break-before: page;
      page-break-before: always;
      height: 1px;
    }

    table{
      width: 100%;
      border-collapse: collapse;
      overflow:hidden;
      border-radius: 14px;
      font-size: 11px;
      border: 1px solid var(--border);
    }
    th, td{
      border-bottom: 1px solid var(--border);
      padding: 10px 10px;
      vertical-align: middle;
    }
    th{
      text-align:left;
      color: #111827;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .14em;
      font-size: 9px;
      background: var(--panel);
    }
    tbody tr:nth-child(even){ background: #fcfcfd; }
    .right{ text-align:right; }
    td.name{ max-width: 320px; }

    .chip{
      display:inline-block;
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: #fff;
      font-size: 10px;
      color: var(--muted);
      font-weight: 800;
    }
    .chip.ok{ color:#065f46; border-color: rgba(6,95,70,.20); background: rgba(6,95,70,.06); }
    .chip.warn{ color:#92400e; border-color: rgba(146,64,14,.20); background: rgba(146,64,14,.06); }
    .chip.risk{ color:#991b1b; border-color: rgba(153,27,27,.20); background: rgba(153,27,27,.06); }

    .footer{
      margin-top: 12px;
      padding-top: 10px;
      display:flex;
      justify-content:space-between;
      font-size: 10px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <div class="brandline">
          <span class="logoMark"></span>
          <div class="kicker">Cosaif · Reportería</div>
          <span class="badge"><span class="dot"></span> Ejecutado</span>
        </div>

        <h1>${etiqueta}${periodo ? ` <span style="font-weight:700;color:#6b7280;font-size:13px">· ${periodo}</span>` : ''}</h1>
        <!-- Quitado: “Resumen ejecutivo …” (porque estorbaba y no aporta en impresión) -->
        <div class="subline">Reporte operativo de movimientos e incidentes.</div>
      </div>

      <div class="meta">
        <div class="lbl">Rango (hora MX)</div>
        <div style="margin-top:6px">
          <code class="mono">${desdeMX}</code>
          <span style="color:#9ca3af">→</span>
          <code class="mono">${hastaMX}</code>
        </div>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="label">Total movimientos</div>
        <div class="value mono">${safeNum(resumen.totalMovimientos)}</div>
        <div class="sub">Operación agregada</div>
      </div>
      <div class="stat">
        <div class="label">Concluidos</div>
        <div class="value mono">${k.concluidos}</div>
        <div class="sub">${k.concluidosPct}% del total</div>
      </div>
      <div class="stat">
        <div class="label">Cancelados</div>
        <div class="value mono">${k.cancelados}</div>
        <div class="sub">${k.canceladosPct}% del total</div>
      </div>
      <div class="stat">
        <div class="label">Total incidentes</div>
        <div class="value mono">${safeNum(resumen.totalIncidentes)}</div>
        <div class="sub">Tickets operativos</div>
      </div>
      <div class="stat">
        <div class="label">Incidentes resueltos</div>
        <div class="value mono">${k.incResueltos}</div>
        <div class="sub">${k.incResueltosPct}% del total</div>
      </div>
      <div class="stat">
        <div class="label">Incidentes no resueltos</div>
        <div class="value mono">${k.incNoResueltos}</div>
        <div class="sub">${k.incNoResueltosPct}% del total</div>
      </div>
    </div>

    <div class="sectionTitle">
      <div>Gráficas por empresa</div>
      <div style="text-transform:none;letter-spacing:.02em;font-weight:700;color:#9ca3af">SVG embebido</div>
    </div>

    <div class="grid">
      <div class="card"><div class="chartWrap" style="height:${hBars}px">${chConcluidos}</div></div>
      <div class="card"><div class="chartWrap" style="height:${hBars}px">${chCancelados}</div></div>
      <div class="card"><div class="chartWrap" style="height:${hBars}px">${chIncTotal}</div></div>
      <div class="card"><div class="chartWrap" style="height:${hStack}px">${chResVsNoRes}</div></div>
    </div>

    <div class="pagebreak"></div>

    <div class="sectionTitle">
      <div>Detalle por empresa</div>
      <div style="text-transform:none;letter-spacing:.02em;font-weight:700;color:#9ca3af">Ordenado por impacto</div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Empresa</th>
            <th class="right">Concl.</th>
            <th class="right">Canc.</th>
            <th class="right">Inc.</th>
            <th class="right">Res.</th>
            <th class="right">No res.</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows ||
            `<tr><td colspan="8" style="color:#6b7280">Sin datos por empresa.</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>Generado automáticamente por <b>Cosaif · Reportería</b></div>
      <div class="mono">Engine: Puppeteer + SVG</div>
    </div>
  </div>
</body>
</html>`;
}

// ---------- Export ----------
export async function exportarReporteMovimientoPDF(reporte: ReporteBase): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const normalized = normalizeData(reporte);

  const etiquetaRaw = reporte.meta.etiqueta || reporte.meta.fechaLocal || 'Movimientos';
  const filename = `Reporte_${safeFilename(etiquetaRaw)}.pdf`;

  try {
    page.setDefaultTimeout(25000);

    // Escala buena para texto nítido en PDF
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
    await page.emulateMediaType('screen');

    await page.setContent(buildHtml(reporte, normalized), { waitUntil: 'domcontentloaded' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    return {
      filename,
      contentType: 'application/pdf',
      buffer: Buffer.from(buffer),
    };
  } finally {
    await page.close();
  }
}
