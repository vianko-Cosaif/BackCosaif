// reporteria/reporteriaMovimiento-pdf.ts
// PDF empresarial (BLANCO) con gráficas (SIN Chart.js) vía Puppeteer (HTML -> PDF)
// Gráficas en SVG embebido (0 dependencias extra, 0 problemas de "exports").
//
// Mejoras:
// - Tema corporativo blanco (alta legibilidad al imprimir)
// - Rango mostrado en hora MX (sin enseñar tz)
// - Gráficas GRANDES verticales (labels abajo)
// - Tabla "Movimientos por empresa" (segmentado: quién y cuántos, por estado)
// - Tabla "Incidentes por empresa" opcional (útil y ligera)

import * as puppeteer from 'puppeteer';

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

// ---------- Browser Singleton ----------
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

export async function closeReporteriaBrowser() {
  if (browserSingleton) {
    await browserSingleton.close();
    browserSingleton = null;
  }
}

// ---------- Helpers ----------
const MX_TZ = 'America/Mexico_City';

const safeNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

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

function fmtMX(iso: string) {
  const d = new Date(String(iso ?? ''));
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  // sv-SE da formato tipo "YYYY-MM-DD HH:mm:ss"
  const s = d.toLocaleString('sv-SE', { timeZone: MX_TZ, hour12: false }).replace(',', '');
  return s.length >= 16 ? s.slice(0, 16) : s;
}

function pickState(map: Record<string, number> | undefined, keys: string[]) {
  const m = map ?? {};
  for (const k of keys) {
    if (m[k] !== undefined) return safeNum(m[k]);
  }
  return 0;
}

type EmpresaRow = {
  empresaId: number;
  name: string;

  totalMov: number;
  movPorEstado: Record<string, number>;
  concluidos: number;
  cancelados: number;
  enProceso: number;
  espera: number;
  solicitado: number;
  otrosMov: number;

  totalInc: number;
  incPorEstado: Record<string, number>;
  incResueltos: number;
  incNoResueltos: number; // ABIERTO + CERRADO
};

function normalizeData(r: ReporteBase): EmpresaRow[] {
  const rows =
    (r.resumen.porEmpresa ?? []).map((e) => {
      const movMap = e.movimientosPorEstado ?? {};
      const incMap = e.incidentesPorEstado ?? {};

      const concluidos = pickState(movMap, ['CONCLUIDO']);
      const cancelados = pickState(movMap, ['CANCELADO']);
      const enProceso = pickState(movMap, ['EN_PROCESO', 'PROCESO']);
      const espera = pickState(movMap, ['ESPERA', 'EN_ESPERA']);
      const solicitado = pickState(movMap, ['SOLICITADO']);

      const totalMov = safeNum(e.totalMovimientos);
      const known = concluidos + cancelados + enProceso + espera + solicitado;
      const otrosMov = Math.max(0, totalMov - known);

      const totalInc = safeNum(e.totalIncidentes);
      const incResueltos = pickState(incMap, ['RESUELTO', 'RESUELTA']);
      const incAbiertos = pickState(incMap, ['ABIERTO', 'ABIERTA']);
      const incCerrados = pickState(incMap, ['CERRADO', 'CERRADA']);
      const incNoResueltos = incAbiertos + incCerrados;

      return {
        empresaId: e.empresaId,
        name: e.empresa || 'Sin Nombre',

        totalMov,
        movPorEstado: movMap,
        concluidos,
        cancelados,
        enProceso,
        espera,
        solicitado,
        otrosMov,

        totalInc,
        incPorEstado: incMap,
        incResueltos,
        incNoResueltos,
      };
    }) ?? [];

  // orden por impacto (movimientos + incidentes)
  return rows.sort((a, b) => (b.totalMov + b.totalInc) - (a.totalMov + a.totalInc));
}

function computeKpis(reporte: ReporteBase) {
  const totalMov = safeNum(reporte.resumen.totalMovimientos);
  const totalInc = safeNum(reporte.resumen.totalIncidentes);

  const concluidos = pickState(reporte.resumen.movimientosPorEstado, ['CONCLUIDO']);
  const cancelados = pickState(reporte.resumen.movimientosPorEstado, ['CANCELADO']);
  const enProceso = pickState(reporte.resumen.movimientosPorEstado, ['EN_PROCESO', 'PROCESO']);
  const espera = pickState(reporte.resumen.movimientosPorEstado, ['ESPERA', 'EN_ESPERA']);

  const incResueltos = pickState(reporte.resumen.incidentesPorEstado, ['RESUELTO', 'RESUELTA']);
  const incNoResueltos =
    pickState(reporte.resumen.incidentesPorEstado, ['ABIERTO', 'ABIERTA']) +
    pickState(reporte.resumen.incidentesPorEstado, ['CERRADO', 'CERRADA']);

  const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

  return {
    totalMov,
    totalInc,

    concluidos,
    cancelados,
    enProceso,
    espera,

    concluidosPct: pct(concluidos, totalMov),
    canceladosPct: pct(cancelados, totalMov),
    enProcesoPct: pct(enProceso, totalMov),
    esperaPct: pct(espera, totalMov),

    incResueltos,
    incNoResueltos,
    incResueltosPct: pct(incResueltos, totalInc),
    incNoResueltosPct: pct(incNoResueltos, totalInc),
  };
}

// ---------- SVG Charts (Vertical, big, labels bottom) ----------
function svgVBarChart(opts: {
  title: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  height: number; // px (viewBox)
  barFill: string; // e.g. "#0B2A4A"
  maxBars?: number;
}) {
  const maxBars = opts.maxBars ?? 12;
  const labels = (opts.labels ?? []).slice(0, maxBars);
  const values = (opts.values ?? []).slice(0, maxBars).map(safeNum);

  const w = 860;
  const h = Math.max(340, Math.floor(opts.height));

  const title = escapeHtml(opts.title);
  const subtitle = escapeHtml(opts.subtitle ?? '');

  if (!labels.length) {
    return `<div class="empty">Sin datos para graficar.</div>`;
  }

  const left = 54;
  const right = 18;
  const top = subtitle ? 62 : 52;
  const bottom = 96;

  const chartW = w - left - right;
  const chartH = h - top - bottom;

  const maxVal = Math.max(1, ...values);

  const n = labels.length;
  const step = chartW / n;
  const barW = Math.max(18, Math.min(44, Math.floor(step * 0.62)));

  // redondea escala a “bonito” (para ejes)
  const niceMax = (() => {
    const raw = maxVal;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / pow;
    const nice =
      norm <= 1 ? 1 :
      norm <= 2 ? 2 :
      norm <= 5 ? 5 : 10;
    return nice * pow;
  })();

  const gridLines = 5;
  const parts: string[] = [];

  // defs (pattern suave para impresión, por si lo quieres después)
  parts.push(`
    <defs>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-color="rgba(0,0,0,0.16)"/>
      </filter>
    </defs>
  `);

  // titles
  parts.push(`<text x="14" y="26" fill="#0F172A" font-size="16" font-weight="800">${title}</text>`);
  if (subtitle) {
    parts.push(`<text x="14" y="46" fill="#475569" font-size="11" font-weight="600">${subtitle}</text>`);
  }

  // grid + y labels
  for (let i = 0; i < gridLines; i++) {
    const t = i / (gridLines - 1);
    const y = top + (1 - t) * chartH;
    const v = Math.round(t * niceMax);

    parts.push(`<line x1="${left}" y1="${y}" x2="${w - right}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`);
    parts.push(`<text x="${left - 10}" y="${y + 4}" text-anchor="end" fill="#64748B" font-size="10" class="mono">${v}</text>`);
  }

  // axis line
  parts.push(`<line x1="${left}" y1="${top + chartH}" x2="${w - right}" y2="${top + chartH}" stroke="#CBD5E1" stroke-width="1.2"/>`);

  // bars
  for (let i = 0; i < n; i++) {
    const v = safeNum(values[i]);
    const bh = Math.round((v / niceMax) * chartH);
    const xCenter = left + step * i + step / 2;
    const x = Math.round(xCenter - barW / 2);
    const y = Math.round(top + chartH - bh);

    // bar
    parts.push(
      `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="8" fill="${opts.barFill}" filter="url(#shadow)"></rect>`
    );

    // value (arriba, para que se vea sí o sí)
    parts.push(
      `<text x="${xCenter}" y="${Math.max(16, y - 6)}" text-anchor="middle" fill="#0F172A" font-size="10" font-weight="700" class="mono">${v}</text>`
    );

    // label abajo (rotado)
    const lbl = escapeHtml(truncLabel(labels[i], 18));
    const lx = xCenter;
    const ly = top + chartH + 16;
    parts.push(
      `<text transform="translate(${lx},${ly}) rotate(-35)" text-anchor="end" fill="#0F172A" font-size="10" font-weight="600">${lbl}</text>`
    );
  }

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMin meet"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
      ${parts.join('\n')}
    </svg>
  `;
}

function svgVStackedBarChart(opts: {
  title: string;
  subtitle?: string;
  labels: string[];
  aLabel: string;
  aValues: number[];
  aFill: string;
  bLabel: string;
  bValues: number[];
  bFill: string;
  height: number;
  maxBars?: number;
}) {
  const maxBars = opts.maxBars ?? 12;
  const labels = (opts.labels ?? []).slice(0, maxBars);
  const aValues = (opts.aValues ?? []).slice(0, maxBars).map(safeNum);
  const bValues = (opts.bValues ?? []).slice(0, maxBars).map(safeNum);

  const w = 860;
  const h = Math.max(360, Math.floor(opts.height));

  const title = escapeHtml(opts.title);
  const subtitle = escapeHtml(opts.subtitle ?? '');

  if (!labels.length) {
    return `<div class="empty">Sin datos para graficar.</div>`;
  }

  const left = 54;
  const right = 18;
  const top = subtitle ? 62 : 52;
  const bottom = 120;

  const chartW = w - left - right;
  const chartH = h - top - bottom;

  const totals = labels.map((_, i) => safeNum(aValues[i]) + safeNum(bValues[i]));
  const maxVal = Math.max(1, ...totals);

  const niceMax = (() => {
    const raw = maxVal;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / pow;
    const nice =
      norm <= 1 ? 1 :
      norm <= 2 ? 2 :
      norm <= 5 ? 5 : 10;
    return nice * pow;
  })();

  const n = labels.length;
  const step = chartW / n;
  const barW = Math.max(18, Math.min(44, Math.floor(step * 0.62)));

  const gridLines = 5;
  const parts: string[] = [];

  parts.push(`
    <defs>
      <filter id="shadow2" x="-10%" y="-10%" width="120%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" flood-color="rgba(0,0,0,0.16)"/>
      </filter>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
      </pattern>
    </defs>
  `);

  parts.push(`<text x="14" y="26" fill="#0F172A" font-size="16" font-weight="800">${title}</text>`);
  if (subtitle) {
    parts.push(`<text x="14" y="46" fill="#475569" font-size="11" font-weight="600">${subtitle}</text>`);
  }

  for (let i = 0; i < gridLines; i++) {
    const t = i / (gridLines - 1);
    const y = top + (1 - t) * chartH;
    const v = Math.round(t * niceMax);

    parts.push(`<line x1="${left}" y1="${y}" x2="${w - right}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`);
    parts.push(`<text x="${left - 10}" y="${y + 4}" text-anchor="end" fill="#64748B" font-size="10" class="mono">${v}</text>`);
  }

  parts.push(`<line x1="${left}" y1="${top + chartH}" x2="${w - right}" y2="${top + chartH}" stroke="#CBD5E1" stroke-width="1.2"/>`);

  for (let i = 0; i < n; i++) {
    const a = safeNum(aValues[i]);
    const b = safeNum(bValues[i]);
    const total = a + b;

    const aH = Math.round((a / niceMax) * chartH);
    const bH = Math.round((b / niceMax) * chartH);

    const xCenter = left + step * i + step / 2;
    const x = Math.round(xCenter - barW / 2);

    const yBase = top + chartH;

    const yA = yBase - aH;
    const yB = yA - bH;

    // segmento A (abajo)
    parts.push(
      `<rect x="${x}" y="${yA}" width="${barW}" height="${aH}" rx="8" fill="${opts.aFill}" filter="url(#shadow2)"></rect>`
    );

    // segmento B (arriba) con hatch ligero para diferenciar en impresión
    parts.push(
      `<rect x="${x}" y="${yB}" width="${barW}" height="${bH}" rx="8" fill="${opts.bFill}" filter="url(#shadow2)"></rect>`
    );
    parts.push(
      `<rect x="${x}" y="${yB}" width="${barW}" height="${bH}" rx="8" fill="url(#hatch)" opacity="0.35"></rect>`
    );

    // total arriba
    parts.push(
      `<text x="${xCenter}" y="${Math.max(16, yB - 6)}" text-anchor="middle" fill="#0F172A" font-size="10" font-weight="800" class="mono">${total}</text>`
    );

    // label abajo
    const lbl = escapeHtml(truncLabel(labels[i], 18));
    const lx = xCenter;
    const ly = top + chartH + 16;
    parts.push(
      `<text transform="translate(${lx},${ly}) rotate(-35)" text-anchor="end" fill="#0F172A" font-size="10" font-weight="600">${lbl}</text>`
    );
  }

  // legend
  const legY = h - 40;
  parts.push(`
    <rect x="14" y="${legY}" width="12" height="12" rx="3" fill="${opts.aFill}"></rect>
    <text x="32" y="${legY + 10}" fill="#0F172A" font-size="11" font-weight="700">${escapeHtml(opts.aLabel)}</text>

    <rect x="200" y="${legY}" width="12" height="12" rx="3" fill="${opts.bFill}"></rect>
    <rect x="200" y="${legY}" width="12" height="12" rx="3" fill="url(#hatch)" opacity="0.35"></rect>
    <text x="218" y="${legY + 10}" fill="#0F172A" font-size="11" font-weight="700">${escapeHtml(opts.bLabel)}</text>
  `);

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMinYMin meet"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
      ${parts.join('\n')}
    </svg>
  `;
}

// ---------- HTML ----------
function buildHtml(reporte: ReporteBase, data: EmpresaRow[]) {
  const meta = reporte.meta;
  const resumen = reporte.resumen;
  const k = computeKpis(reporte);

  const etiqueta = escapeHtml(meta.etiqueta || meta.fechaLocal || 'Reporte de Movimientos');
  const periodo = escapeHtml(meta.periodo || '');

  // Rango mostrado SIEMPRE en MX (aunque venga en UTC)
  const rangoMXDesde = escapeHtml(fmtMX(meta.rangoUTC.desde));
  const rangoMXHasta = escapeHtml(fmtMX(meta.rangoUTC.hastaExclusivo));

  // Charts: top N para legibilidad (tabla trae TODO)
  const topN = 12;
  const chartData = data.slice(0, topN);

  const labels = chartData.map((d) => d.name);
  const concluidos = chartData.map((d) => d.concluidos);
  const cancelados = chartData.map((d) => d.cancelados);
  const incTotal = chartData.map((d) => d.totalInc);
  const incRes = chartData.map((d) => d.incResueltos);
  const incNoRes = chartData.map((d) => d.incNoResueltos);

  const chartH = 420;

  const chConcluidos = svgVBarChart({
    title: 'Movimientos concluidos (por empresa)',
    subtitle: `Top ${topN} por impacto`,
    labels,
    values: concluidos,
    height: chartH,
    barFill: '#0B2A4A',
    maxBars: topN,
  });

  const chCancelados = svgVBarChart({
    title: 'Movimientos cancelados (por empresa)',
    subtitle: `Top ${topN} por impacto`,
    labels,
    values: cancelados,
    height: chartH,
    barFill: '#334155',
    maxBars: topN,
  });

  const chIncTotal = svgVBarChart({
    title: 'Incidentes totales (por empresa)',
    subtitle: `Top ${topN} por impacto`,
    labels,
    values: incTotal,
    height: chartH,
    barFill: '#111827',
    maxBars: topN,
  });

  const chResVsNoRes = svgVStackedBarChart({
    title: 'Incidentes: resueltos vs no resueltos (por empresa)',
    subtitle: `Top ${topN} por impacto`,
    labels,
    aLabel: 'Resuelto',
    aValues: incRes,
    aFill: '#0B2A4A',
    bLabel: 'No resuelto (Abierto + Cerrado)',
    bValues: incNoRes,
    bFill: '#64748B',
    height: 460,
    maxBars: topN,
  });

  // Tabla: movimientos por empresa (TODAS)
  const movRowsAll = data
    .map((d, idx) => {
      return `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td class="name">${escapeHtml(d.name)}</td>
          <td class="mono right"><b>${d.totalMov}</b></td>
          <td class="mono right">${d.concluidos}</td>
          <td class="mono right">${d.cancelados}</td>
          <td class="mono right">${d.enProceso}</td>
          <td class="mono right">${d.espera}</td>
          <td class="mono right">${d.solicitado}</td>
          <td class="mono right">${d.otrosMov}</td>
        </tr>
      `;
    })
    .join('');

  // Tabla: incidentes por empresa (TODAS) — ligera
  const incRowsAll = data
    .map((d, idx) => {
      const sem =
        d.incNoResueltos > 0 ? 'Riesgo' : d.totalInc > 0 ? 'Atención' : 'OK';
      const semClass =
        d.incNoResueltos > 0 ? 'risk' : d.totalInc > 0 ? 'warn' : 'ok';

      return `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td class="name">${escapeHtml(d.name)}</td>
          <td class="mono right"><b>${d.totalInc}</b></td>
          <td class="mono right">${d.incResueltos}</td>
          <td class="mono right">${d.incNoResueltos}</td>
          <td><span class="chip ${semClass}">${sem}</span></td>
        </tr>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 10mm; }

    :root{
      --bg:#ffffff;
      --panel:#ffffff;
      --ink:#0f172a;
      --muted:#475569;
      --muted2:#64748b;
      --border:#e5e7eb;
      --soft:#f8fafc;

      --brand:#0B2A4A;
      --brand2:#111827;

      --ok:#0B2A4A;
      --warn:#92400e;
      --risk:#991b1b;
    }

    *{ box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body{
      margin:0;
      padding: 18px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color: var(--ink);
      background: var(--bg);
    }

    .topbar{
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px 16px 12px;
      background: var(--panel);
    }

    .toprow{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap: 12px;
    }

    .title{
      display:flex;
      flex-direction:column;
      gap: 6px;
      min-width: 0;
    }

    .kicker{
      font-size: 11px;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 700;
    }

    h1{
      margin: 0;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: .2px;
      line-height: 1.12;
    }

    .periodo{
      font-size: 12px;
      color: var(--muted);
      font-weight: 700;
    }

    .meta{
      text-align:right;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.45;
      max-width: 360px;
      display:flex;
      flex-direction:column;
      gap: 6px;
    }

    .metaLine{
      display:flex;
      gap: 8px;
      justify-content:flex-end;
      align-items:center;
      flex-wrap:wrap;
    }

    .pill{
      display:inline-flex;
      align-items:center;
      gap: 8px;
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--soft);
      font-size: 11px;
      color: var(--ink);
      font-weight: 700;
    }

    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .code{
      padding: 4px 8px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      color: var(--ink);
      white-space: nowrap;
      font-weight: 700;
    }

    .kpis{
      margin-top: 12px;
      display:grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
    }

    .kpi{
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--soft);
      padding: 10px 10px 9px;
      min-height: 66px;
    }

    .kpi .label{
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .14em;
      color: var(--muted2);
      font-weight: 800;
    }

    .kpi .value{
      margin-top: 6px;
      font-size: 18px;
      font-weight: 900;
      color: var(--ink);
    }

    .kpi .sub{
      margin-top: 2px;
      font-size: 10px;
      color: var(--muted);
      font-weight: 700;
    }

    .section{
      margin-top: 14px;
    }

    .sectionTitle{
      display:flex;
      justify-content:space-between;
      align-items:baseline;
      gap: 10px;
      margin: 14px 2px 8px;
    }

    .sectionTitle .h{
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: var(--brand);
    }

    .sectionTitle .s{
      font-size: 11px;
      color: var(--muted);
      font-weight: 700;
    }

    .card{
      border: 1px solid var(--border);
      border-radius: 16px;
      background: #fff;
      padding: 12px;
      overflow:hidden;
    }

    .chart{
      height: 420px;
      width: 100%;
    }
    .chart.tall{ height: 460px; }

    .empty{
      height: 200px;
      display:flex;
      align-items:center;
      justify-content:center;
      color: var(--muted);
      font-weight: 700;
    }

    table{
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow:hidden;
      border-radius: 14px;
      font-size: 11px;
    }

    thead th{
      background: var(--soft);
      border-bottom: 1px solid var(--border);
      color: var(--muted2);
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .12em;
      font-size: 9.5px;
      padding: 10px 10px;
      text-align:left;
    }

    tbody td{
      border-bottom: 1px solid var(--border);
      padding: 10px 10px;
      vertical-align: middle;
      color: var(--ink);
    }
    tbody tr:last-child td{ border-bottom: none; }

    .right{ text-align:right; }
    td.name{ max-width: 260px; font-weight: 800; }

    .chip{
      display:inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--soft);
      font-size: 10px;
      font-weight: 900;
    }
    .chip.ok{ color: var(--ok); border-color: rgba(11,42,74,.22); background: rgba(11,42,74,.06); }
    .chip.warn{ color: var(--warn); border-color: rgba(146,64,14,.25); background: rgba(146,64,14,.06); }
    .chip.risk{ color: var(--risk); border-color: rgba(153,27,27,.25); background: rgba(153,27,27,.06); }

    .foot{
      margin-top: 10px;
      display:flex;
      justify-content:space-between;
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      border-top: 1px solid var(--border);
      padding-top: 10px;
    }

    /* Print tightening */
    .card, .topbar { break-inside: avoid; }
    table { break-inside: auto; }
    tr { break-inside: avoid; break-after: auto; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="toprow">
      <div class="title">
        <div class="kicker">COSAIF · Reportería</div>
        <h1>${etiqueta}${periodo ? ` <span class="periodo">· ${periodo}</span>` : ''}</h1>
      </div>

      <div class="meta">
        <div class="metaLine">
          <span class="pill">Rango (MX)</span>
          <span class="code mono">${rangoMXDesde}</span>
          <span class="mono" style="color:var(--muted2);font-weight:900;">→</span>
          <span class="code mono">${rangoMXHasta}</span>
        </div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi">
        <div class="label">Total movimientos</div>
        <div class="value mono">${safeNum(resumen.totalMovimientos)}</div>
        <div class="sub">Agregado</div>
      </div>

      <div class="kpi">
        <div class="label">Concluidos</div>
        <div class="value mono">${k.concluidos}</div>
        <div class="sub">${k.concluidosPct}%</div>
      </div>

      <div class="kpi">
        <div class="label">Cancelados</div>
        <div class="value mono">${k.cancelados}</div>
        <div class="sub">${k.canceladosPct}%</div>
      </div>

      <div class="kpi">
        <div class="label">En proceso</div>
        <div class="value mono">${k.enProceso}</div>
        <div class="sub">${k.enProcesoPct}%</div>
      </div>

      <div class="kpi">
        <div class="label">Total incidentes</div>
        <div class="value mono">${safeNum(resumen.totalIncidentes)}</div>
        <div class="sub">Tickets</div>
      </div>

      <div class="kpi">
        <div class="label">No resueltos</div>
        <div class="value mono">${k.incNoResueltos}</div>
        <div class="sub">${k.incNoResueltosPct}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Gráficas por empresa</div>
      <div class="s">Vertical · labels abajo · tamaño grande</div>
    </div>

    <div class="card"><div class="chart">${chConcluidos}</div></div>
    <div style="height:10px"></div>
    <div class="card"><div class="chart">${chCancelados}</div></div>
    <div style="height:10px"></div>
    <div class="card"><div class="chart">${chIncTotal}</div></div>
    <div style="height:10px"></div>
    <div class="card"><div class="chart tall">${chResVsNoRes}</div></div>
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Movimientos por empresa</div>
      <div class="s">Segmentación completa (todas las empresas)</div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th class="right">#</th>
            <th>Empresa</th>
            <th class="right">Total</th>
            <th class="right">Concl.</th>
            <th class="right">Canc.</th>
            <th class="right">Proceso</th>
            <th class="right">Espera</th>
            <th class="right">Solic.</th>
            <th class="right">Otros</th>
          </tr>
        </thead>
        <tbody>
          ${
            movRowsAll ||
            `<tr><td colspan="9" style="color:var(--muted)">Sin datos por empresa.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Incidentes por empresa</div>
      <div class="s">Desglose rápido (todas las empresas)</div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th class="right">#</th>
            <th>Empresa</th>
            <th class="right">Total</th>
            <th class="right">Res.</th>
            <th class="right">No Res.</th>
            <th>Semáforo</th>
          </tr>
        </thead>
        <tbody>
          ${
            incRowsAll ||
            `<tr><td colspan="6" style="color:var(--muted)">Sin datos por empresa.</td></tr>`
          }
        </tbody>
      </table>
    </div>
  </div>

  <div class="foot">
    <div>Generado automáticamente · Cosaif</div>
    <div class="mono">Engine: Puppeteer + SVG</div>
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
    page.setDefaultTimeout(30000);

    // viewport grande para buena rasterización
    await page.setViewport({ width: 1400, height: 1800, deviceScaleFactor: 2 });
    await page.emulateMediaType('screen');

    await page.setContent(buildHtml(reporte, normalized), { waitUntil: 'domcontentloaded' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      // margen definido en @page
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
