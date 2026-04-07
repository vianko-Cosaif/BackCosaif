// reporteria/modelos/adminPdf.ts
// PDF ADMIN (CEO) · Estilo ejecutivo tipo Power BI.
// Puppeteer + SVG (0 deps extra).
//
// Enfoque:
// - KPIs compactos y claros (números grandes).
// - Gráficas de ejecución (0–9 / 10–89 / 90+), tráfico por hora y por día.
// - Rankings breves (maquinistas, locomotoras, clientes, empresas).

import * as puppeteer from 'puppeteer';
import type { AdminReporte } from './admin-model';
export type AdminReporteBase = AdminReporte;

export type PdfFile = {
  filename: string;
  contentType: 'application/pdf';
  buffer: Buffer;
};

let browserSingleton: puppeteer.Browser | null = null;

async function getBrowser() {
  if (browserSingleton) return browserSingleton;

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || undefined;

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

export async function closeAdminBrowser() {
  if (browserSingleton) {
    await browserSingleton.close();
    browserSingleton = null;
  }
}

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
  return String(name || 'Admin')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function fmtMX(iso: string, tz = MX_TZ) {
  const d = new Date(String(iso ?? ''));
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  const s = d.toLocaleString('sv-SE', { timeZone: tz, hour12: false }).replace(',', '');
  return s.length >= 16 ? s.slice(0, 16) : s;
}

function fmtMin(n: number) {
  const x = safeNum(n);
  if (!x) return '0';
  if (x < 1) return `${Math.round(x * 60)}s`;
  if (x < 60) return `${Math.round(x)}m`;
  const h = Math.floor(x / 60);
  const m = Math.round(x - h * 60);
  return `${h}h ${m}m`;
}

function fmtNum(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString('es-MX');
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((safeNum(n) / safeNum(d)) * 100);
}

// --------- SVG helpers (simple, legible, corporativo) ----------
function svgBar(opts: {
  title: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  height?: number;
  fill?: string;
  valueSuffix?: string;
}) {
  const w = 1000;
  const h = Math.max(360, Math.floor(opts.height ?? 420));
  const labels = opts.labels ?? [];
  const values = (opts.values ?? []).map(safeNum);

  if (!labels.length) return `<div class="empty">Sin datos.</div>`;

  const left = 70;
  const right = 26;
  const top = 64;
  const bottom = 120;

  const chartW = w - left - right;
  const chartH = h - top - bottom;
  const maxVal = Math.max(1, ...values);

  const n = labels.length;
  const step = chartW / n;
  const barW = Math.max(22, Math.min(54, Math.floor(step * 0.62)));

  const niceMax = (() => {
    const raw = maxVal;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / pow;
    const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return nice * pow;
  })();

  const gridLines = 5;
  const parts: string[] = [];

  parts.push(
    `<text x="14" y="28" fill="#0F172A" font-size="20" font-weight="900">${escapeHtml(opts.title)}</text>`
  );
  if (opts.subtitle) {
    parts.push(
      `<text x="14" y="50" fill="#64748B" font-size="12" font-weight="800">${escapeHtml(opts.subtitle)}</text>`
    );
  }

  for (let i = 0; i < gridLines; i++) {
    const t = i / (gridLines - 1);
    const y = top + (1 - t) * chartH;
    const v = Math.round(t * niceMax);
    parts.push(`<line x1="${left}" y1="${y}" x2="${w - right}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`);
    parts.push(
      `<text x="${left - 10}" y="${y + 4}" text-anchor="end" fill="#64748B" font-size="11" class="mono">${v}</text>`
    );
  }

  parts.push(
    `<line x1="${left}" y1="${top + chartH}" x2="${w - right}" y2="${top + chartH}" stroke="#CBD5E1" stroke-width="1.2"/>`
  );

  const fill = opts.fill ?? '#0B2A4A';
  const suffix = opts.valueSuffix ?? '';

  for (let i = 0; i < n; i++) {
    const v = safeNum(values[i]);
    const bh = Math.round((v / niceMax) * chartH);
    const xCenter = left + step * i + step / 2;
    const x = Math.round(xCenter - barW / 2);
    const y = Math.round(top + chartH - bh);

    parts.push(`<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="8" fill="${fill}"></rect>`);
    parts.push(
      `<text x="${xCenter}" y="${Math.max(18, y - 8)}" text-anchor="middle" fill="#0F172A" font-size="12" font-weight="900" class="mono">${v}${escapeHtml(suffix)}</text>`
    );

    const lbl = escapeHtml(labels[i]);
    const lx = xCenter;
    const ly = top + chartH + 18;
    parts.push(
      `<text transform="translate(${lx},${ly}) rotate(-35)" text-anchor="end" fill="#0F172A" font-size="12" font-weight="800">${lbl}</text>`
    );
  }

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${parts.join('\n')}
    </svg>
  `;
}

function svgLine(opts: {
  title: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  height?: number;
  stroke?: string;
  fill?: string;
  xLabelEvery?: number;
}) {
  const w = 1000;
  const h = Math.max(320, Math.floor(opts.height ?? 340));
  const labels = opts.labels ?? [];
  const values = (opts.values ?? []).map(safeNum);

  if (!labels.length) return `<div class="empty">Sin datos.</div>`;

  const left = 62;
  const right = 26;
  const top = 62;
  const bottom = 64;

  const chartW = w - left - right;
  const chartH = h - top - bottom;
  const maxVal = Math.max(1, ...values);
  const stepX = labels.length > 1 ? chartW / (labels.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = left + stepX * i;
    const y = top + chartH - (v / maxVal) * chartH;
    return { x, y, v };
  });

  const path = points.length ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}` : '';
  const area = points.length
    ? `M ${left},${top + chartH} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${left + chartW},${top + chartH} Z`
    : '';

  const gridLines = 4;
  const parts: string[] = [];

  parts.push(
    `<text x="14" y="28" fill="#0F172A" font-size="20" font-weight="900">${escapeHtml(opts.title)}</text>`
  );
  if (opts.subtitle) {
    parts.push(
      `<text x="14" y="50" fill="#64748B" font-size="12" font-weight="800">${escapeHtml(opts.subtitle)}</text>`
    );
  }

  for (let i = 0; i < gridLines; i++) {
    const t = i / (gridLines - 1);
    const y = top + (1 - t) * chartH;
    const v = Math.round(t * maxVal);
    parts.push(`<line x1="${left}" y1="${y}" x2="${w - right}" y2="${y}" stroke="#E2E8F0" stroke-width="1"/>`);
    parts.push(`<text x="${left - 8}" y="${y + 4}" text-anchor="end" fill="#94A3B8" font-size="11" class="mono">${v}</text>`);
  }

  const stroke = opts.stroke ?? '#2563EB';
  const fill = opts.fill ?? 'rgba(37, 99, 235, 0.18)';

  parts.push(`<path d="${area}" fill="${fill}" stroke="none"></path>`);
  parts.push(`<path d="${path}" fill="none" stroke="${stroke}" stroke-width="2.5"></path>`);

  for (const p of points) {
    parts.push(`<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="${stroke}" />`);
  }

  const labelEvery = Math.max(1, opts.xLabelEvery ?? 2);
  for (let i = 0; i < labels.length; i += labelEvery) {
    const x = left + stepX * i;
    const y = top + chartH + 18;
    parts.push(`<text x="${x}" y="${y}" text-anchor="middle" fill="#475569" font-size="11">${escapeHtml(labels[i])}</text>`);
  }

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${parts.join('\n')}
    </svg>
  `;
}

function buildHtml(r: AdminReporteBase) {
  const meta = r.meta;
  const k = r.kpis;

  const etiquetaRaw = meta.etiqueta || 'Reporte Ejecutivo';
  const etiqueta = escapeHtml(etiquetaRaw.replace(/^ADMIN_/, 'Admin '));
  const periodo = escapeHtml(meta.periodo || '');
  const tz = escapeHtml(meta.tz || MX_TZ);
  const rangoMXDesde = escapeHtml(fmtMX(meta.rangoUTC.desde, meta.tz));
  const rangoMXHasta = escapeHtml(fmtMX(meta.rangoUTC.hastaExclusivo, meta.tz));

  const execBuckets = r.ejecucionBuckets ?? [];
  const execLabels = execBuckets.map((b) => b.label);
  const execValues = execBuckets.map((b) => b.movimientos);

  const chartExec = svgBar({
    title: 'Rangos de ejecución',
    subtitle: 'Inicio → Fin (min)',
    labels: execLabels,
    values: execValues,
    height: 380,
    fill: '#2563EB',
  });

  const hourLabels = (r.movimientosPorHora ?? []).map((h) => String(h.hora).padStart(2, '0'));
  const hourValues = (r.movimientosPorHora ?? []).map((h) => h.movimientos);
  const chartHour = svgLine({
    title: 'Movimientos por hora',
    subtitle: 'Hora local (MX)',
    labels: hourLabels,
    values: hourValues,
    height: 360,
    stroke: '#0EA5E9',
    fill: 'rgba(14, 165, 233, 0.18)',
    xLabelEvery: 3,
  });

  const dayLabels = (r.movimientosPorDiaSemana ?? []).map((d) => d.dia);
  const dayValues = (r.movimientosPorDiaSemana ?? []).map((d) => d.movimientos);
  const chartDay = svgBar({
    title: 'Movimientos por día',
    subtitle: 'Semana local',
    labels: dayLabels,
    values: dayValues,
    height: 340,
    fill: '#10B981',
  });

  const incDayLabels = (r.incidentesPorDiaSemana ?? []).map((d) => d.dia);
  const incDayValues = (r.incidentesPorDiaSemana ?? []).map((d) => d.incidentes);
  const chartIncDay = svgBar({
    title: 'Incidentes por día',
    subtitle: 'Semana local',
    labels: incDayLabels,
    values: incDayValues,
    height: 340,
    fill: '#EF4444',
  });

  const incHourLabels = (r.incidentesPorHora ?? []).map((h) => String(h.hora).padStart(2, '0'));
  const incHourValues = (r.incidentesPorHora ?? []).map((h) => h.incidentes);
  const chartIncHour = svgLine({
    title: 'Incidentes por hora',
    subtitle: 'Hora local (MX)',
    labels: incHourLabels,
    values: incHourValues,
    height: 340,
    stroke: '#EF4444',
    fill: 'rgba(239, 68, 68, 0.18)',
    xLabelEvery: 3,
  });

  const incStateEntries = Object.entries(r.incidentes?.porEstado ?? {});
  const incStateTop = incStateEntries.sort((a, b) => safeNum(b[1]) - safeNum(a[1])).slice(0, 6);
  const incStateMax = Math.max(1, ...incStateTop.map(([, v]) => safeNum(v)));
  const incStateBars =
    incStateTop
      .map(([estado, total]) => {
        const pctWidth = Math.max(6, Math.round((safeNum(total) / incStateMax) * 100));
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(estado)}</div>
            <div class="bar-track">
              <div class="bar-fill danger" style="width:${pctWidth}%"></div>
            </div>
            <div class="bar-val">${fmtNum(total)}</div>
          </div>
        `;
      })
      .join('') || `<div class="empty">Sin datos.</div>`;

  const topEmpresas = (r.rankingEmpresas ?? []).slice(0, 8);
  const topClientes = (r.rankingClientes ?? []).slice(0, 8);
  const topLocosInc = (r.topLocomotorasIncidentes ?? []).slice(0, 8);

  const maxEmp = Math.max(1, ...topEmpresas.map((e) => e.totalMovimientos));
  const maxCli = Math.max(1, ...topClientes.map((c) => c.totalMovimientos));

  const empBars =
    topEmpresas
      .map((e) => {
        const pctWidth = Math.max(4, Math.round((e.totalMovimientos / maxEmp) * 100));
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(e.empresa)}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${pctWidth}%"></div>
            </div>
            <div class="bar-val">${fmtNum(e.totalMovimientos)}</div>
          </div>
        `;
      })
      .join('') || `<div class="empty">Sin datos.</div>`;

  const cliBars =
    topClientes
      .map((c) => {
        const pctWidth = Math.max(4, Math.round((c.totalMovimientos / maxCli) * 100));
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(c.clienteNombre)}</div>
            <div class="bar-track">
              <div class="bar-fill alt" style="width:${pctWidth}%"></div>
            </div>
            <div class="bar-val">${fmtNum(c.totalMovimientos)}</div>
          </div>
        `;
      })
      .join('') || `<div class="empty">Sin datos.</div>`;

  const insightsHtml =
    (r.insights ?? [])
      .slice(0, 6)
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join('') || `<li class="muted">Sin insights.</li>`;

  const locoIncRows =
    topLocosInc
      .map(
        (l) => `
        <tr>
          <td class="mono">L-${escapeHtml(l.locomotiveNumber)}</td>
          <td class="mono right">${fmtNum(l.incidentesTotal)}</td>
          <td class="mono right">${fmtNum(l.movimientos)}</td>
          <td>${escapeHtml(l.empresas.join(', ') || '—')}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="4" class="muted">Sin datos.</td></tr>`;

  const opRows =
    (r.rankingOperadores ?? [])
      .slice(0, 10)
      .map(
        (o, idx) => `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td>${escapeHtml(o.operadorNombre)}</td>
          <td class="mono right">${fmtNum(o.totalMovimientos)}</td>
          <td class="mono right">${fmtNum(o.m0_9)}</td>
          <td class="mono right">${fmtNum(o.m10_89)}</td>
          <td class="mono right">${fmtNum(o.gte90)}</td>
          <td class="mono right">${fmtNum(o.lt2)}</td>
          <td class="mono right">${fmtNum(o.incidentesTotal)}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="8" class="muted">Sin datos.</td></tr>`;

  const locoRows =
    (r.rankingLocomotoras ?? [])
      .slice(0, 10)
      .map(
        (l, idx) => `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td class="mono">L-${escapeHtml(l.locomotiveNumber)}</td>
          <td class="mono right">${fmtNum(l.totalMovimientos)}</td>
          <td class="mono right">${fmtNum(l.m0_9)}</td>
          <td class="mono right">${fmtNum(l.m10_89)}</td>
          <td class="mono right">${fmtNum(l.gte90)}</td>
          <td class="mono right">${fmtNum(l.lt2)}</td>
          <td class="mono right">${fmtNum(l.incidentesTotal)}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="8" class="muted">Sin datos.</td></tr>`;

  const empRows =
    topEmpresas
      .map(
        (e, idx) => `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td>${escapeHtml(e.empresa)}</td>
          <td class="mono right">${fmtNum(e.totalMovimientos)}</td>
          <td class="mono right">${fmtNum(e.incidentesTotal)}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="4" class="muted">Sin datos.</td></tr>`;

  const cliRows =
    topClientes
      .map(
        (c, idx) => `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td>${escapeHtml(c.clienteNombre)}</td>
          <td class="mono right">${fmtNum(c.totalMovimientos)}</td>
          <td class="mono right">${fmtNum(c.incidentesTotal)}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="4" class="muted">Sin datos.</td></tr>`;

  const supRows =
    (r.rankingSupervisores ?? [])
      .slice(0, 8)
      .map(
        (s, idx) => `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td>${escapeHtml(s.supervisorNombre)}</td>
          <td class="mono right">${fmtNum(s.totalMovimientos)}</td>
          <td class="mono right">${fmtNum(s.incidentesTotal)}</td>
          <td class="mono right">${fmtNum(s.criticosTotal)}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="5" class="muted">Sin datos.</td></tr>`;

  const coordRows =
    (r.rankingCoordinadores ?? [])
      .slice(0, 8)
      .map(
        (c, idx) => `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td>${escapeHtml(c.coordinadorNombre)}</td>
          <td class="mono right">${fmtNum(c.totalMovimientos)}</td>
          <td class="mono right">${fmtNum(c.incidentesTotal)}</td>
          <td class="mono right">${fmtNum(c.criticosTotal)}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="5" class="muted">Sin datos.</td></tr>`;

  const locRows =
    (r.rankingLocalidades ?? [])
      .slice(0, 8)
      .map(
        (l, idx) => `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td>${escapeHtml(l.localidad)}</td>
          <td class="mono right">${fmtNum(l.totalMovimientos)}</td>
          <td class="mono right">${fmtNum(l.incidentesTotal)}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="4" class="muted">Sin datos.</td></tr>`;

  const topCritRows =
    (r.topCriticos ?? [])
      .slice(0, 10)
      .map(
        (d) => `
        <tr>
          <td class="mono right">${fmtNum(d.id)}</td>
          <td class="mono">L-${escapeHtml(d.locomotiveNumber)}</td>
          <td>${escapeHtml(d.empresa)}</td>
          <td class="mono right">${d.minInicioAFin !== null ? fmtMin(d.minInicioAFin) : '—'}</td>
          <td class="mono right">${fmtNum(d.incidentesCount)}</td>
          <td>${escapeHtml(d.usuarios.operador?.nombre ?? '—')}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="6" class="muted">Sin datos.</td></tr>`;

  const topIncRows =
    (r.topIncidentes ?? [])
      .slice(0, 10)
      .map(
        (d) => `
        <tr>
          <td class="mono right">${fmtNum(d.id)}</td>
          <td class="mono">L-${escapeHtml(d.locomotiveNumber)}</td>
          <td class="mono right">${fmtNum(d.incidentesCount)}</td>
          <td class="mono right">${d.minInicioAFin !== null ? fmtMin(d.minInicioAFin) : '—'}</td>
          <td>${escapeHtml(d.empresa)}</td>
          <td>${escapeHtml(d.usuarios.operador?.nombre ?? '—')}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="6" class="muted">Sin datos.</td></tr>`;

  const backlogRows =
    (r.backlogTop ?? [])
      .slice(0, 10)
      .map(
        (b) => `
        <tr>
          <td class="mono right">${fmtNum(b.id)}</td>
          <td class="mono">L-${escapeHtml(b.locomotiveNumber)}</td>
          <td>${escapeHtml(b.empresa)}</td>
          <td class="mono right">${fmtMin(b.edadMin)}</td>
          <td class="mono">${escapeHtml(b.fechaSolicitudMX)}</td>
          <td>${escapeHtml(b.operador ?? '—')}</td>
        </tr>
      `
      )
      .join('') || `<tr><td colspan="6" class="muted">Sin datos.</td></tr>`;

  return `
    <html>
    <head>
      <style>
        :root {
          --bg: #f5f7fb;
          --card: #ffffff;
          --ink: #0f172a;
          --muted: #64748b;
          --muted2: #94a3b8;
          --line: #e2e8f0;
          --accent: #2563eb;
          --accent2: #0ea5e9;
          --ok: #16a34a;
          --warn: #f59e0b;
          --danger: #ef4444;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 20px;
          font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
          color: var(--ink);
          background: var(--bg);
        }
        .page { width: 100%; }
        .page.break { page-break-before: always; }
        .hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }
        .hero .title {
          font-size: 24px;
          font-weight: 800;
        }
        .hero .subtitle {
          font-size: 11px;
          color: var(--muted);
        }
        .meta {
          text-align: right;
          font-size: 11px;
          color: var(--muted);
          line-height: 1.4;
        }
        .pill {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #ffffff;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .kpi {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 12px;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
        }
        .kpi .label {
          font-size: 11px;
          color: var(--muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .kpi .value {
          margin-top: 6px;
          font-size: 22px;
          font-weight: 800;
        }
        .kpi .sub {
          margin-top: 4px;
          font-size: 12px;
          color: var(--muted2);
        }
        .grid-2 {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .grid-2.cols {
          grid-template-columns: 1fr 1fr;
        }
        .grid-3 {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
        }
        .card.compact { padding: 10px; }
        .card h3 {
          margin: 0 0 8px;
          font-size: 13px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .bar-row {
          display: grid;
          grid-template-columns: 160px 1fr 60px;
          gap: 8px;
          align-items: center;
          margin: 6px 0;
          font-size: 12px;
        }
        .bar-label { font-weight: 600; }
        .bar-track {
          height: 12px;
          border-radius: 999px;
          background: #eef2ff;
          overflow: hidden;
        }
        .bar-fill {
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(90deg, #2563eb, #60a5fa);
        }
        .bar-fill.alt {
          background: linear-gradient(90deg, #10b981, #6ee7b7);
        }
        .bar-fill.danger {
          background: linear-gradient(90deg, #ef4444, #fca5a5);
        }
        .bar-fill.warn {
          background: linear-gradient(90deg, #f59e0b, #fde68a);
        }
        .bar-val {
          text-align: right;
          font-size: 11px;
          color: var(--muted);
        }
        .alert-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .alert {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          padding: 10px 12px;
        }
        .alert.crit {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .alert .label {
          font-size: 11px;
          color: #b45309;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .alert.crit .label { color: #b91c1c; }
        .alert .value { font-size: 20px; font-weight: 800; margin-top: 4px; }
        .section-title {
          margin: 18px 0 10px;
          font-size: 15px;
          font-weight: 800;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .table-tight th, .table-tight td {
          padding: 4px 3px;
          font-size: 10px;
        }
        th, td {
          padding: 6px 4px;
          border-bottom: 1px solid var(--line);
        }
        th {
          text-align: left;
          font-size: 9px;
          color: var(--muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .right { text-align: right; }
        .mono { font-variant-numeric: tabular-nums; }
        .muted { color: var(--muted2); }
        .empty { color: var(--muted2); font-size: 11px; }
        .insights {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(14, 165, 233, 0.06));
          border: 1px solid var(--line);
        }
        .insights h3 {
          margin: 0 0 8px 0;
        }
        .insights ul {
          margin: 0;
          padding-left: 18px;
          font-size: 12px;
          color: var(--ink);
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="hero">
          <div>
            <div class="pill">Admin · Reportería</div>
            <div class="title">${etiqueta}${periodo ? ` · ${periodo}` : ''}</div>
            <div class="subtitle">TZ: ${tz}</div>
          </div>
          <div class="meta">
            <div><b>Rango (MX)</b></div>
            <div>${rangoMXDesde} → ${rangoMXHasta}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi">
            <div class="label">Movimientos</div>
            <div class="value">${fmtNum(k.totalMovimientos)}</div>
            <div class="sub">Total del periodo</div>
          </div>
          <div class="kpi">
            <div class="label">Con inicio/fin</div>
            <div class="value">${fmtNum(k.totalConInicioFin)}</div>
            <div class="sub">Cerrados</div>
          </div>
          <div class="kpi">
            <div class="label">Backlog sin fin</div>
            <div class="value">${fmtNum(k.totalSinFin)}</div>
            <div class="sub">Edad prom: ${fmtMin(k.backlogAvgAgeMin)} · P90: ${fmtMin(k.backlogP90AgeMin)}</div>
          </div>
          <div class="kpi">
            <div class="label">Prom. ejecución</div>
            <div class="value">${fmtMin(k.execMeanMin)}</div>
            <div class="sub">Mediana: ${fmtMin(k.execMedianMin)} · P90: ${fmtMin(k.execP90Min)}</div>
          </div>
          <div class="kpi">
            <div class="label">Espera P90</div>
            <div class="value">${fmtMin(k.esperaP90Min)}</div>
            <div class="sub">OK &le; ${fmtNum(15)}m: ${fmtNum(k.esperaOkPct)}%</div>
          </div>
          <div class="kpi">
            <div class="label">Lead P90</div>
            <div class="value">${fmtMin(k.leadP90Min)}</div>
            <div class="sub">OK &le; ${fmtNum(120)}m: ${fmtNum(k.leadOkPct)}%</div>
          </div>
          <div class="kpi">
            <div class="label">Incidentes</div>
            <div class="value">${fmtNum(k.totalIncidentes)}</div>
            <div class="sub">${fmtNum(k.movimientosConIncidente)} movs · ${fmtNum(k.movimientosConIncidentePct)}%</div>
          </div>
          <div class="kpi">
            <div class="label">Críticos</div>
            <div class="value">${fmtNum(k.criticosTotal)}</div>
            <div class="sub">&lt;2 min: ${fmtNum(k.criticosLt2)} · 90+ min: ${fmtNum(k.criticosGte90)}</div>
          </div>
          <div class="kpi">
            <div class="label">Índice operativo</div>
            <div class="value">${fmtNum(k.indiceOperativo)}</div>
            <div class="sub">0–100 · Variabilidad: ${fmtNum(k.variabilidadExecRatio)}</div>
          </div>
        </div>

        <div class="card insights">
          <h3>Insights rápidos</h3>
          <ul>${insightsHtml}</ul>
        </div>

        <div class="grid-2">
          <div class="card">${chartExec}</div>
          <div class="card">${chartHour}</div>
        </div>

        <div class="grid-2">
          <div class="card">${chartDay}</div>
          <div class="card">${chartIncDay}</div>
        </div>

        <div class="grid-2 cols">
          <div class="card">
            <h3>Top empresas (movimientos)</h3>
            ${empBars}
          </div>
          <div class="card">
            <h3>Top clientes (movimientos)</h3>
            ${cliBars}
          </div>
        </div>

        <div class="alert-grid">
          <div class="alert crit">
            <div class="label">Alertas &lt; 2 min</div>
            <div class="value">${fmtNum(k.criticosLt2)}</div>
            <div class="sub">Locomotoras: ${fmtNum(k.locomotorasCritLt2)}</div>
          </div>
          <div class="alert">
            <div class="label">Aceptables 10–89</div>
            <div class="value">${fmtNum(execBuckets.find((b) => b.id === 'm10_89')?.movimientos ?? 0)}</div>
            <div class="sub">% sobre cerrados: ${fmtNum(execBuckets.find((b) => b.id === 'm10_89')?.pct ?? 0)}%</div>
          </div>
          <div class="alert crit">
            <div class="label">Alertas 90+ min</div>
            <div class="value">${fmtNum(k.criticosGte90)}</div>
            <div class="sub">Locomotoras: ${fmtNum(k.locomotorasCritGte90)}</div>
          </div>
        </div>
      </div>

      <div class="page break">
        <div class="section-title">Incidentes y riesgos</div>
        <div class="grid-2">
          <div class="card">${chartIncHour}</div>
          <div class="card">
            <h3>Incidentes por estado</h3>
            ${incStateBars}
          </div>
        </div>

        <div class="card">
          <h3>Locomotoras con más incidentes</h3>
          <table>
            <thead>
              <tr>
                <th>Locomotora</th>
                <th class="right">Inc.</th>
                <th class="right">Mov.</th>
                <th>Empresas</th>
              </tr>
            </thead>
            <tbody>${locoIncRows}</tbody>
          </table>
        </div>

        <div class="grid-2 cols">
          <div class="card compact">
            <h3>Top incidentes (movimientos)</h3>
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">ID</th>
                  <th>Loc.</th>
                  <th class="right">Inc.</th>
                  <th class="right">Ejec.</th>
                  <th>Empresa</th>
                  <th>Operador</th>
                </tr>
              </thead>
              <tbody>${topIncRows}</tbody>
            </table>
          </div>
          <div class="card compact">
            <h3>Top críticos (tiempo de ejecución)</h3>
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">ID</th>
                  <th>Loc.</th>
                  <th>Empresa</th>
                  <th class="right">Ejec.</th>
                  <th class="right">Inc.</th>
                  <th>Operador</th>
                </tr>
              </thead>
              <tbody>${topCritRows}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="page break">
        <div class="section-title">Rankings operativos</div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th class="right">#</th>
                <th>Maquinista</th>
                <th class="right">Total</th>
                <th class="right">0–9</th>
                <th class="right">10–89</th>
                <th class="right">90+</th>
                <th class="right">&lt;2</th>
                <th class="right">Inc.</th>
              </tr>
            </thead>
            <tbody>${opRows}</tbody>
          </table>
        </div>

        <div class="section-title">Ranking de locomotoras</div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th class="right">#</th>
                <th>Locomotora</th>
                <th class="right">Total</th>
                <th class="right">0–9</th>
                <th class="right">10–89</th>
                <th class="right">90+</th>
                <th class="right">&lt;2</th>
                <th class="right">Inc.</th>
              </tr>
            </thead>
            <tbody>${locoRows}</tbody>
          </table>
        </div>

        <div class="grid-3">
          <div class="card compact">
            <h3>Top empresas (tabla)</h3>
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Empresa</th>
                  <th class="right">Mov.</th>
                  <th class="right">Inc.</th>
                </tr>
              </thead>
              <tbody>${empRows}</tbody>
            </table>
          </div>
          <div class="card compact">
            <h3>Top clientes (tabla)</h3>
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Cliente</th>
                  <th class="right">Mov.</th>
                  <th class="right">Inc.</th>
                </tr>
              </thead>
              <tbody>${cliRows}</tbody>
            </table>
          </div>
          <div class="card compact">
            <h3>Top localidades (tabla)</h3>
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Localidad</th>
                  <th class="right">Mov.</th>
                  <th class="right">Inc.</th>
                </tr>
              </thead>
              <tbody>${locRows}</tbody>
            </table>
          </div>
        </div>

        <div class="grid-2 cols">
          <div class="card compact">
            <h3>Ranking supervisores</h3>
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Supervisor</th>
                  <th class="right">Mov.</th>
                  <th class="right">Inc.</th>
                  <th class="right">Crit.</th>
                </tr>
              </thead>
              <tbody>${supRows}</tbody>
            </table>
          </div>
          <div class="card compact">
            <h3>Ranking coordinadores</h3>
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Coordinador</th>
                  <th class="right">Mov.</th>
                  <th class="right">Inc.</th>
                  <th class="right">Crit.</th>
                </tr>
              </thead>
              <tbody>${coordRows}</tbody>
            </table>
          </div>
        </div>

        <div class="section-title">Backlog más viejo (sin fin)</div>
        <div class="card">
          <table class="table-tight">
            <thead>
              <tr>
                <th class="right">ID</th>
                <th>Loc.</th>
                <th>Empresa</th>
                <th class="right">Edad</th>
                <th>Solicitud MX</th>
                <th>Operador</th>
              </tr>
            </thead>
            <tbody>${backlogRows}</tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
}


export async function exportarAdminPDF(reporte: AdminReporteBase): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  const etiquetaRaw = reporte.meta.etiqueta || 'Admin';
  const filename = `Reporte_${safeFilename(etiquetaRaw)}.pdf`;

  try {
    page.setDefaultTimeout(30000);
    await page.setViewport({ width: 1600, height: 2200, deviceScaleFactor: 2 });
    await page.emulateMediaType('screen');

    await page.setContent(buildHtml(reporte), { waitUntil: 'domcontentloaded' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    return { filename, contentType: 'application/pdf', buffer: Buffer.from(buffer) };
  } finally {
    await page.close();
  }
}
