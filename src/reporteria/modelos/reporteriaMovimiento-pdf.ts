// PDF empresarial con gráficas (SIN Chart.js) vía Puppeteer (HTML -> PDF)
// Gráficas en SVG embebido (0 dependencias extra, 0 "exports" problems)

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
    empresas: (reporte.resumen.porEmpresa ?? []).length,

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

// ---------- SVG Charts (no JS needed) ----------
function svgHBarChart(opts: {
  title: string;
  height: number;
  labels: string[];
  values: number[];
  barColor: string; // rgba(...)
}) {
  const w = 560;
  const h = Math.max(260, Math.floor(opts.height));

  const title = escapeHtml(opts.title);
  const labels = opts.labels ?? [];
  const values = (opts.values ?? []).map(safeNum);

  if (!labels.length) {
    return `<div style="height:${h}px;display:flex;align-items:center;justify-content:center;color:rgba(147,164,199,.9);font-size:12px">
      Sin datos para graficar.
    </div>`;
  }

  const left = 220;      // espacio para nombres
  const right = 18;
  const top = 56;        // deja espacio para título
  const bottom = 18;

  const rowH = 20;
  const barH = 12;

  const maxVal = Math.max(1, ...values);
  const barW = w - left - right;
  const scale = barW / maxVal;

  const lines: string[] = [];

  // título
  lines.push(
    `<text x="14" y="28" fill="#f8fafc" font-size="14" font-weight="700">${title}</text>`
  );

  // guía vertical (0, 25, 50, 75, 100%)
  for (let i = 0; i <= 4; i++) {
    const x = left + (barW * i) / 4;
    lines.push(
      `<line x1="${x}" y1="${top - 6}" x2="${x}" y2="${h - bottom}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`
    );
  }

  for (let i = 0; i < labels.length; i++) {
    const y = top + i * rowH + rowH / 2;
    const name = escapeHtml(truncLabel(labels[i], 26));
    const v = safeNum(values[i]);
    const bw = Math.max(0, Math.round(v * scale));

    // label
    lines.push(
      `<text x="14" y="${y}" fill="#93a4c7" font-size="10" dominant-baseline="middle">${name}</text>`
    );

    // bar
    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${bw}" height="${barH}" rx="6" fill="${opts.barColor}"></rect>`
    );

    // value (pegado al final de la barra, sin salirse)
    const vx = Math.min(left + bw + 6, w - right - 20);
    lines.push(
      `<text x="${vx}" y="${y}" fill="rgba(230,238,252,.9)" font-size="10" dominant-baseline="middle" class="mono">${v}</text>`
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
    return `<div style="height:${h}px;display:flex;align-items:center;justify-content:center;color:rgba(147,164,199,.9);font-size:12px">
      Sin datos para graficar.
    </div>`;
  }

  const left = 220;
  const right = 18;
  const top = 56;
  const bottom = 46; // deja espacio para leyenda
  const rowH = 24;
  const barH = 16;

  const totals = labels.map((_, i) => safeNum(aValues[i]) + safeNum(bValues[i]));
  const maxTotal = Math.max(1, ...totals);

  const barW = w - left - right;
  const scale = barW / maxTotal;

  const lines: string[] = [];

  // título
  lines.push(
    `<text x="14" y="28" fill="#f8fafc" font-size="14" font-weight="700">${title}</text>`
  );

  // guía vertical
  for (let i = 0; i <= 4; i++) {
    const x = left + (barW * i) / 4;
    lines.push(
      `<line x1="${x}" y1="${top - 6}" x2="${x}" y2="${h - bottom}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`
    );
  }

  for (let i = 0; i < labels.length; i++) {
    const y = top + i * rowH + rowH / 2;
    const name = escapeHtml(truncLabel(labels[i], 26));

    const a = safeNum(aValues[i]);
    const b = safeNum(bValues[i]);
    const total = a + b;

    const aw = Math.round(a * scale);
    const bw = Math.round(b * scale);

    // label
    lines.push(
      `<text x="14" y="${y}" fill="#93a4c7" font-size="10" dominant-baseline="middle">${name}</text>`
    );

    // a segment
    lines.push(
      `<rect x="${left}" y="${y - barH / 2}" width="${aw}" height="${barH}" rx="6" fill="${opts.aColor}"></rect>`
    );

    // b segment (pegado)
    lines.push(
      `<rect x="${left + aw}" y="${y - barH / 2}" width="${bw}" height="${barH}" rx="6" fill="${opts.bColor}"></rect>`
    );

    // total label
    const tx = Math.min(left + aw + bw + 6, w - right - 30);
    lines.push(
      `<text x="${tx}" y="${y}" fill="rgba(230,238,252,.9)" font-size="10" dominant-baseline="middle" class="mono">${total}</text>`
    );
  }

  // legend
  const legY = h - 18;
  lines.push(
    `<rect x="14" y="${legY - 10}" width="10" height="10" rx="3" fill="${opts.aColor}"></rect>
     <text x="30" y="${legY - 1}" fill="rgba(230,238,252,.9)" font-size="10">${escapeHtml(opts.aLabel)}</text>
     <rect x="180" y="${legY - 10}" width="10" height="10" rx="3" fill="${opts.bColor}"></rect>
     <text x="196" y="${legY - 1}" fill="rgba(230,238,252,.9)" font-size="10">${escapeHtml(opts.bLabel)}</text>`
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

  const etiqueta = escapeHtml(meta.etiqueta || meta.fechaLocal || 'Consolidado General');
  const periodo = escapeHtml(meta.periodo || '');
  const tz = escapeHtml(meta.tz);
  const desde = escapeHtml(meta.rangoUTC.desde);
  const hasta = escapeHtml(meta.rangoUTC.hastaExclusivo);

  const hBars = clamp(320 + data.length * 20, 360, 820);
  const hStack = clamp(340 + data.length * 24, 420, 900);

  const labels = data.map((d) => d.name);
  const concluidos = data.map((d) => d.concluidos);
  const cancelados = data.map((d) => d.cancelados);
  const incTotal = data.map((d) => d.incTotal);
  const incRes = data.map((d) => d.incResueltos);
  const incNoRes = data.map((d) => d.incNoResueltos);

  // Tabla ejecutiva (top 12)
  const top = data.slice(0, 12);
  const rows = top
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

  // SVG charts (sin JS)
  const chConcluidos = svgHBarChart({
    title: 'MOVIMIENTOS CONCLUIDOS (por empresa)',
    height: hBars,
    labels,
    values: concluidos,
    barColor: 'rgba(16,185,129,0.85)',
  });

  const chCancelados = svgHBarChart({
    title: 'MOVIMIENTOS CANCELADOS (por empresa)',
    height: hBars,
    labels,
    values: cancelados,
    barColor: 'rgba(244,63,94,0.85)',
  });

  const chIncTotal = svgHBarChart({
    title: 'TOTAL INCIDENTES (por empresa)',
    height: hBars,
    labels,
    values: incTotal,
    barColor: 'rgba(56,189,248,0.85)',
  });

  const chResVsNoRes = svgStackedBarChart({
    title: 'INCIDENTES: RESUELTOS VS NO RESUELTOS (por empresa)',
    height: hStack,
    labels,
    aLabel: 'RESUELTO',
    aValues: incRes,
    aColor: 'rgba(16,185,129,0.85)',
    bLabel: 'NO RESUELTO (ABIERTO+CERRADO)',
    bValues: incNoRes,
    bColor: 'rgba(245,158,11,0.85)',
  });

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 10mm; }
    :root{
      --bg:#0b1220;
      --border:rgba(255,255,255,.08);
      --text:#f8fafc;
      --muted:#93a4c7;
      --brand:#38bdf8;
      --brand2:#60a5fa;
      --success:#10b981;
      --danger:#f43f5e;
      --warning:#f59e0b;
      --shadow: 0 18px 50px rgba(0,0,0,.35);
    }
    *{box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
    body{
      margin:0;
      padding: 36px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color: var(--text);
      background:
        radial-gradient(900px 420px at 12% 0%, rgba(56,189,248,.22), transparent 55%),
        radial-gradient(700px 420px at 90% 12%, rgba(96,165,250,.14), transparent 55%),
        linear-gradient(180deg, #070c16 0%, var(--bg) 40%, #070c16 100%);
    }
    .watermark{
      position: fixed;
      inset: 0;
      pointer-events:none;
      opacity: .055;
      display:flex;
      align-items:center;
      justify-content:center;
      transform: rotate(-18deg);
      font-weight: 900;
      letter-spacing: .28em;
      font-size: 52px;
      color: #ffffff;
      text-transform: uppercase;
      user-select:none;
    }
    .header{
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(56,189,248,.16), rgba(17,26,46,1));
      border-radius: 18px;
      padding: 18px 18px 14px;
      box-shadow: var(--shadow);
      display:flex;
      justify-content:space-between;
      gap: 14px;
    }
    .brandline{
      display:flex;
      gap:10px;
      align-items:center;
      margin-bottom: 8px;
    }
    .logoDot{
      width: 10px; height: 10px;
      border-radius: 999px;
      background: linear-gradient(180deg, var(--brand), var(--brand2));
      box-shadow: 0 0 0 6px rgba(56,189,248,.08);
    }
    .kicker{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .18em;
      color: var(--muted);
    }
    h1{
      margin: 0;
      font-size: 24px;
      letter-spacing: .2px;
      line-height: 1.15;
    }
    .headline{
      display:flex;
      flex-direction:column;
      gap: 4px;
      min-width: 0;
    }
    .meta{
      text-align:right;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.45;
      max-width: 420px;
    }
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;}
    .meta code{
      background: rgba(255,255,255,.06);
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 8px;
      color: var(--text);
      white-space: nowrap;
    }
    .stats{
      margin-top: 14px;
      display:grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
    }
    .stat{
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(17,26,46,1));
      border-radius: 14px;
      padding: 12px 12px 10px;
    }
    .stat .label{ font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .12em;}
    .stat .value{ margin-top: 7px; font-size: 18px; font-weight: 900;}
    .stat .sub{ margin-top: 4px; font-size: 10px; color: var(--muted); }
    .badge{
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.04);
      font-size: 10px;
      color: var(--muted);
      margin-left: 8px;
      vertical-align: middle;
    }
    .dot{
      width: 7px; height: 7px;
      border-radius: 99px;
      background: var(--success);
      box-shadow: 0 0 0 4px rgba(16,185,129,.1);
    }
    .sectionTitle{
      margin: 18px 2px 10px;
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .18em;
      display:flex;
      justify-content:space-between;
      align-items:center;
    }
    .sectionTitle small{letter-spacing: .08em; text-transform:none; color: rgba(147,164,199,.85);}
    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .card{
      border: 1px solid var(--border);
      background: rgba(17,26,46,.92);
      border-radius: 18px;
      padding: 14px;
      box-shadow: 0 12px 34px rgba(0,0,0,.26);
      overflow:hidden;
      position: relative;
    }
    .card::before{
      content:'';
      position:absolute;
      inset:-1px;
      background: radial-gradient(540px 220px at 25% 0%, rgba(56,189,248,.12), transparent 55%);
      pointer-events:none;
    }
    .chartWrap{ position:relative; z-index:1; }
    .muted{ color: var(--muted); }

    table{
      width: 100%;
      border-collapse: collapse;
      overflow:hidden;
      border-radius: 16px;
      font-size: 10.5px;
    }
    th, td{
      border-bottom: 1px solid var(--border);
      padding: 10px 10px;
      vertical-align: middle;
    }
    th{
      text-align:left;
      color: var(--muted);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .14em;
      font-size: 9px;
      background: rgba(255,255,255,.03);
    }
    .right{text-align:right;}
    td.name{max-width: 260px;}
    .chip{
      display:inline-block;
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,.04);
      font-size: 10px;
      color: var(--muted);
    }
    .chip.ok{ color: var(--success); border-color: rgba(16,185,129,.25); background: rgba(16,185,129,.08); }
    .chip.warn{ color: var(--warning); border-color: rgba(245,158,11,.25); background: rgba(245,158,11,.08); }
    .chip.risk{ color: var(--danger); border-color: rgba(244,63,94,.25); background: rgba(244,63,94,.08); }

    .footer{
      margin-top: 14px;
      border-top: 1px solid var(--border);
      padding-top: 12px;
      display:flex;
      justify-content:space-between;
      font-size: 10px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="watermark">COSAIF · REPORTERÍA</div>

  <div class="header">
    <div class="headline">
      <div class="brandline">
        <span class="logoDot"></span>
        <div class="kicker">Reporte de Operaciones</div>
        <span class="badge"><span class="dot"></span> Ejecutado</span>
      </div>
      <h1>${etiqueta}${periodo ? ` <span class="muted" style="font-weight:700;font-size:14px">· ${periodo}</span>` : ''}</h1>
      <div class="muted" style="font-size:12px; line-height:1.4; max-width: 720px;">
        Resumen ejecutivo de movimientos e incidentes. Base: criterios del backend (rango UTC ya resuelto).
      </div>
    </div>

    <div class="meta">
      <div>Rango UTC</div>
      <div style="margin-top:6px">
        <code class="mono">${desde}</code>
        <span class="muted">→</span>
        <code class="mono">${hasta}</code>
      </div>
      <div style="margin-top:8px">Zona horaria: <span class="mono">${tz}</span></div>
      <div style="margin-top:8px">Empresas incluidas: <span class="mono">${k.empresas}</span></div>
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
      <div class="label">Inc. resueltos</div>
      <div class="value mono">${k.incResueltos}</div>
      <div class="sub">${k.incResueltosPct}% del total</div>
    </div>
    <div class="stat">
      <div class="label">Inc. no resueltos</div>
      <div class="value mono">${k.incNoResueltos}</div>
      <div class="sub">${k.incNoResueltosPct}% del total</div>
    </div>
  </div>

  <div class="sectionTitle">
    <div>Gráficas por empresa</div>
    <small>SVG embebido · Sin JS · PDF estable</small>
  </div>

  <div class="grid">
    <div class="card"><div class="chartWrap" style="height:${hBars}px">${chConcluidos}</div></div>
    <div class="card"><div class="chartWrap" style="height:${hBars}px">${chCancelados}</div></div>
    <div class="card"><div class="chartWrap" style="height:${hBars}px">${chIncTotal}</div></div>
    <div class="card"><div class="chartWrap" style="height:${hStack}px">${chResVsNoRes}</div></div>
  </div>

  <div class="sectionTitle">
    <div>Top empresas (lectura ejecutiva)</div>
    <small>Ranking por impacto (movimientos + incidentes)</small>
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
          <th class="right">No Res.</th>
          <th>Semáforo</th>
        </tr>
      </thead>
      <tbody>
        ${
          rows ||
          `<tr><td colspan="8" style="color:var(--muted)">Sin datos por empresa (o no hubo movimientos en el periodo).</td></tr>`
        }
      </tbody>
    </table>
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
  const normalized = normalizeData(reporte);

  const etiquetaRaw = reporte.meta.etiqueta || reporte.meta.fechaLocal || 'Movimientos';
  const filename = `Reporte_${safeFilename(etiquetaRaw)}.pdf`;

  try {
    page.setDefaultTimeout(20000);

    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
    await page.emulateMediaType('screen');

    // No dependemos de red ni scripts externos
    await page.setContent(buildHtml(reporte, normalized), { waitUntil: 'domcontentloaded' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      // margen ya está en @page
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
