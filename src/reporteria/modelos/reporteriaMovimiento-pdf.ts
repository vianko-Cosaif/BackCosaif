// reporteria/reporteriaMovimiento-pdf.ts
// PDF empresarial (BLANCO / NEGRO) con gráficas SIN Chart.js
// + Segmentación por empresa (quién y cuántos) además de la gráfica.
// Gráficas en SVG embebido (0 dependencias extra).
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
  const zone = 'America/Mexico_City';
  const fmt = 'yyyy-LL-dd HH:mm';

  try {
    const desde = DateTime.fromISO(meta.rangoUTC.desde, { zone: 'utc' }).setZone(zone);
    const hasta = DateTime.fromISO(meta.rangoUTC.hastaExclusivo, { zone: 'utc' }).setZone(zone);

    if (!desde.isValid || !hasta.isValid) {
      return { desde: meta.rangoUTC.desde, hasta: meta.rangoUTC.hastaExclusivo };
    }

    return { desde: desde.toFormat(fmt), hasta: hasta.toFormat(fmt) };
  } catch {
    return { desde: meta.rangoUTC.desde, hasta: meta.rangoUTC.hastaExclusivo };
  }
}

type EmpresaNorm = {
  id: number;
  name: string;
  totalMov: number;
  movEstados: Record<string, number>;
  incTotal: number;
  incEstados: Record<string, number>;

  // atajos usados por charts
  concluidos: number;
  cancelados: number;
  incResueltos: number;
  incNoResueltos: number; // ABIERTO + CERRADO
};

function normalizeData(r: ReporteBase): EmpresaNorm[] {
  return (r.resumen.porEmpresa ?? [])
    .map((e) => {
      const movEstados = e.movimientosPorEstado ?? {};
      const incEstados = e.incidentesPorEstado ?? {};

      const concluidos = safeNum(movEstados['CONCLUIDO']);
      const cancelados = safeNum(movEstados['CANCELADO']);

      const incTotal = safeNum(e.totalIncidentes);
      const incResueltos = safeNum(incEstados['RESUELTO']);
      const incAbiertos = safeNum(incEstados['ABIERTO']);
      const incCerrados = safeNum(incEstados['CERRADO']);

      return {
        id: safeNum(e.empresaId),
        name: e.empresa || 'Sin Nombre',
        totalMov: safeNum(e.totalMovimientos),
        movEstados: movEstados,
        incTotal,
        incEstados: incEstados,

        concluidos,
        cancelados,
        incResueltos,
        incNoResueltos: incAbiertos + incCerrados,
      };
    })
    .sort((a, b) => {
      const sa = a.totalMov + a.incTotal;
      const sb = b.totalMov + b.incTotal;
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

function sortRecordDesc(rec: Record<string, number>) {
  return Object.entries(rec ?? {})
    .map(([k, v]) => [k, safeNum(v)] as const)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
}

function niceEstadoMov(k: string) {
  const up = String(k || '').toUpperCase();
  if (up === 'EN_PROCESO') return 'En proceso';
  if (up === 'CONCLUIDO') return 'Concluido';
  if (up === 'CANCELADO') return 'Cancelado';
  if (up === 'ESPERA') return 'En espera';
  if (up === 'SOLICITADO') return 'Solicitado';
  return k
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

function niceEstadoInc(k: string) {
  const up = String(k || '').toUpperCase();
  if (up === 'ABIERTO') return 'Abierto';
  if (up === 'CERRADO') return 'Cerrado';
  if (up === 'RESUELTO') return 'Resuelto';
  return niceEstadoMov(k);
}

// ---------- SVG Charts (sin JS) ----------
function svgHBarChart(opts: {
  title: string;
  height: number;
  labels: string[];
  values: number[];
  barColor: string;
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

  const left = 230;
  const right = 20;
  const top = 52;
  const bottom = 18;

  const rowH = 22;
  const barH = 12;

  const maxVal = Math.max(1, ...values);
  const barW = w - left - right;
  const scale = barW / maxVal;

  const lines: string[] = [];

  lines.push(`<text x="16" y="26" fill="#111827" font-size="14" font-weight="700">${title}</text>`);

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

    lines.push(`<text x="16" y="${y}" fill="#374151" font-size="10.8" dominant-baseline="middle">${name}</text>`);

    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${barW}" height="${barH}" rx="6" fill="#f3f4f6"></rect>`
    );

    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${bw}" height="${barH}" rx="6" fill="${opts.barColor}"></rect>`
    );

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
  const bottom = 54;
  const rowH = 26;
  const barH = 16;

  const totals = labels.map((_, i) => safeNum(aValues[i]) + safeNum(bValues[i]));
  const maxTotal = Math.max(1, ...totals);

  const barW = w - left - right;
  const scale = barW / maxTotal;

  const lines: string[] = [];

  lines.push(`<text x="16" y="26" fill="#111827" font-size="14" font-weight="700">${title}</text>`);

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

    lines.push(`<text x="16" y="${y}" fill="#374151" font-size="10.8" dominant-baseline="middle">${name}</text>`);

    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${barW}" height="${barH}" rx="8" fill="#f3f4f6"></rect>`
    );

    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${aw}" height="${barH}" rx="8" fill="${opts.aColor}"></rect>`
    );

    lines.push(
      `<rect x="${left + aw}" y="${y - barH / 2}" width="${bw}" height="${barH}" rx="8" fill="${opts.bColor}"></rect>`
    );

    const tx = Math.min(left + aw + bw + 8, w - right - 34);
    lines.push(
      `<text x="${tx}" y="${y}" fill="#111827" font-size="11" dominant-baseline="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${total}</text>`
    );
  }

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
function buildEmpresaCards(empresas: EmpresaNorm[]) {
  if (!empresas.length) {
    return `<div class="card" style="color:#6b7280">Sin empresas en el periodo.</div>`;
  }

  return empresas
    .map((e) => {
      const movList = sortRecordDesc(e.movEstados);
      const incList = sortRecordDesc(e.incEstados);

      const movRows =
        movList.length > 0
          ? movList
              .map(([k, v]) => {
                return `<tr><td>${escapeHtml(niceEstadoMov(k))}</td><td class="right mono">${v}</td></tr>`;
              })
              .join('')
          : `<tr><td colspan="2" style="color:#6b7280">Sin movimientos por estado</td></tr>`;

      const incRows =
        incList.length > 0
          ? incList
              .map(([k, v]) => {
                return `<tr><td>${escapeHtml(niceEstadoInc(k))}</td><td class="right mono">${v}</td></tr>`;
              })
              .join('')
          : `<tr><td colspan="2" style="color:#6b7280">Sin incidentes por estado</td></tr>`;

      const sem =
        e.incNoResueltos > 0 ? 'risk' : e.incTotal > 0 ? 'warn' : 'ok';
      const semTxt =
        e.incNoResueltos > 0 ? 'Riesgo' : e.incTotal > 0 ? 'Atención' : 'OK';

      return `
        <div class="card empresaCard">
          <div class="empresaHead">
            <div class="empresaName">${escapeHtml(e.name)}</div>
            <span class="chip ${sem}">${semTxt}</span>
          </div>

          <div class="empresaNums">
            <div class="numBox">
              <div class="lbl">Movimientos</div>
              <div class="val mono">${e.totalMov}</div>
            </div>
            <div class="numBox">
              <div class="lbl">Incidentes</div>
              <div class="val mono">${e.incTotal}</div>
            </div>
          </div>

          <div class="empresaGrid">
            <div>
              <div class="miniTitle">Movimientos por estado</div>
              <table class="miniTable">
                <thead><tr><th>Estado</th><th class="right">Cant.</th></tr></thead>
                <tbody>${movRows}</tbody>
              </table>
            </div>

            <div>
              <div class="miniTitle">Incidentes por estado</div>
              <table class="miniTable">
                <thead><tr><th>Estado</th><th class="right">Cant.</th></tr></thead>
                <tbody>${incRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function buildHtml(reporte: ReporteBase, empresas: EmpresaNorm[]) {
  const meta = reporte.meta;
  const resumen = reporte.resumen;
  const k = computeKpis(reporte);

  const etiqueta = escapeHtml(meta.etiqueta || meta.fechaLocal || 'Reporte de movimientos');
  const periodo = escapeHtml(meta.periodo || '');

  const rangoMX = formatRangoMX(meta);
  const desdeMX = escapeHtml(rangoMX.desde);
  const hastaMX = escapeHtml(rangoMX.hasta);

  // charts dinámicos
  const hBars = clamp(320 + empresas.length * 20, 360, 840);
  const hStack = clamp(340 + empresas.length * 24, 420, 960);

  const labels = empresas.map((d) => d.name);
  const concluidos = empresas.map((d) => d.concluidos);
  const cancelados = empresas.map((d) => d.cancelados);
  const incTotal = empresas.map((d) => d.incTotal);
  const incRes = empresas.map((d) => d.incResueltos);
  const incNoRes = empresas.map((d) => d.incNoResueltos);

  const chConcluidos = svgHBarChart({
    title: 'Movimientos concluidos (por empresa)',
    height: hBars,
    labels,
    values: concluidos,
    barColor: '#111827',
  });

  const chCancelados = svgHBarChart({
    title: 'Movimientos cancelados (por empresa)',
    height: hBars,
    labels,
    values: cancelados,
    barColor: '#4b5563',
  });

  const chIncTotal = svgHBarChart({
    title: 'Total incidentes (por empresa)',
    height: hBars,
    labels,
    values: incTotal,
    barColor: '#0f172a',
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

  const empresaCards = buildEmpresaCards(empresas);

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
    }

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
      font-weight: 600;
    }

    .meta{
      text-align:right;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.45;
      max-width: 420px;
      font-weight: 700;
    }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .meta code{
      background: #fff;
      border: 1px solid var(--border);
      padding: 3px 8px;
      border-radius: 10px;
      color: var(--text);
      white-space: nowrap;
      display:inline-block;
    }
    .meta .lbl{ color: var(--muted2); font-weight: 900; letter-spacing: .08em; text-transform: uppercase; font-size: 10px; }

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
      font-weight: 900;
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
      font-weight: 700;
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
      page-break-inside: avoid;
    }

    .pagebreak{
      break-before: page;
      page-break-before: always;
      height: 1px;
    }

    .chip{
      display:inline-block;
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: #fff;
      font-size: 10px;
      color: var(--muted);
      font-weight: 900;
    }
    .chip.ok{ color:#065f46; border-color: rgba(6,95,70,.20); background: rgba(6,95,70,.06); }
    .chip.warn{ color:#92400e; border-color: rgba(146,64,14,.20); background: rgba(146,64,14,.06); }
    .chip.risk{ color:#991b1b; border-color: rgba(153,27,27,.20); background: rgba(153,27,27,.06); }

    /* Segmentación por empresa */
    .empresaWrap{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .empresaCard{ padding: 12px; }
    .empresaHead{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap: 10px;
      margin-bottom: 10px;
    }
    .empresaName{
      font-weight: 900;
      font-size: 13px;
      color: var(--text);
      line-height: 1.2;
    }
    .empresaNums{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .numBox{
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 12px;
      padding: 10px;
    }
    .numBox .lbl{
      font-size: 10px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--muted2);
      font-weight: 900;
    }
    .numBox .val{
      margin-top: 6px;
      font-size: 16px;
      font-weight: 900;
      color: var(--text);
    }
    .empresaGrid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .miniTitle{
      font-size: 10px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--muted2);
      font-weight: 900;
      margin-bottom: 6px;
    }
    .miniTable{
      width:100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow:hidden;
      font-size: 10.5px;
    }
    .miniTable th, .miniTable td{
      padding: 8px 8px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    .miniTable th{
      background: #fff;
      text-transform: uppercase;
      letter-spacing: .12em;
      font-size: 9px;
      font-weight: 900;
      color: var(--text);
    }
    .miniTable tbody tr:nth-child(even){ background: #fcfcfd; }
    .right{ text-align:right; }

    .footer{
      margin-top: 12px;
      padding-top: 10px;
      display:flex;
      justify-content:space-between;
      font-size: 10px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brandline">
        <span class="logoMark"></span>
        <div class="kicker">Cosaif · Reportería</div>
        <span class="badge"><span class="dot"></span> Ejecutado</span>
      </div>

      <h1>${etiqueta}${periodo ? ` <span style="font-weight:700;color:#6b7280;font-size:13px">· ${periodo}</span>` : ''}</h1>
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
    <div class="card"><div style="height:${hBars}px">${chConcluidos}</div></div>
    <div class="card"><div style="height:${hBars}px">${chCancelados}</div></div>
    <div class="card"><div style="height:${hBars}px">${chIncTotal}</div></div>
    <div class="card"><div style="height:${hStack}px">${chResVsNoRes}</div></div>
  </div>

  <div class="pagebreak"></div>

  <div class="sectionTitle">
    <div>Movimientos segmentados por empresa</div>
    <div style="text-transform:none;letter-spacing:.02em;font-weight:700;color:#9ca3af">Quién y cuántos</div>
  </div>

  <div class="empresaWrap">
    ${empresaCards}
  </div>

  <div class="footer">
    <div>Generado automáticamente por <b>Cosaif · Reportería</b></div>
    <div class="mono">Engine: Puppeteer + SVG</div>
  </div>
</body>
</html>`;
}

// ---------- Export ----------
export async function exportarReporteMovimientoPDF(reporte: ReporteBase): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const empresas = normalizeData(reporte);

  const etiquetaRaw = reporte.meta.etiqueta || reporte.meta.fechaLocal || 'Movimientos';
  const filename = `Reporte_${safeFilename(etiquetaRaw)}.pdf`;

  try {
    page.setDefaultTimeout(25000);

    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
    await page.emulateMediaType('screen');

    await page.setContent(buildHtml(reporte, empresas), { waitUntil: 'domcontentloaded' });

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
