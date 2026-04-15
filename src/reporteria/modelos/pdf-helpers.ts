// reporteria/modelos/pdf-helpers.ts
// Helpers compartidos para PDFs CEO

import { DateTime } from 'luxon';

export const MX_TZ = 'America/Mexico_City';
export const safeNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

export function escapeHtml(v: any) {
  const s = String(v ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function safeFilename(name: string) {
  return String(name || 'Reporte')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

export function fmtMX(iso: string, tz = MX_TZ) {
  const d = new Date(String(iso ?? ''));
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  const s = d.toLocaleString('sv-SE', { timeZone: tz, hour12: false }).replace(',', '');
  return s.length >= 16 ? s.slice(0, 16) : s;
}

export function fmtMin(n: number) {
  const x = safeNum(n);
  if (!x) return '0';
  if (x < 1) return `${Math.round(x * 60)}s`;
  if (x < 60) return `${Math.round(x)}m`;
  const h = Math.floor(x / 60);
  const m = Math.round(x - h * 60);
  return `${h}h ${m}m`;
}

export function fmtNum(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString('es-MX');
}

export function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((safeNum(n) / safeNum(d)) * 100);
}

export function svgBar(opts: {
  title: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  height?: number;
  fill?: string;
  valueSuffix?: string;
}) {
  const w = 1000;
  const h = Math.max(320, Math.floor(opts.height ?? 420));
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

  const fill = opts.fill ?? '#2563EB';
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

export function svgLine(opts: {
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

export function baseCss() {
  return `
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
    .grid-2.cols { grid-template-columns: 1fr 1fr; }
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
    .bar-fill.alt { background: linear-gradient(90deg, #10b981, #6ee7b7); }
    .bar-fill.danger { background: linear-gradient(90deg, #ef4444, #fca5a5); }
    .bar-fill.warn { background: linear-gradient(90deg, #f59e0b, #fde68a); }
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
    .insights h3 { margin: 0 0 8px 0; }
    .insights ul {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      color: var(--ink);
      line-height: 1.4;
    }
  `;
}

export function formatPeriodoLabel(periodo?: string) {
  return periodo ? String(periodo) : '';
}

export function formatRangoMX(desdeIso: string, hastaIso: string, tz: string) {
  const desde = DateTime.fromISO(desdeIso, { zone: tz }).toFormat('yyyy-LL-dd HH:mm');
  const hasta = DateTime.fromISO(hastaIso, { zone: tz }).toFormat('yyyy-LL-dd HH:mm');
  return { desde, hasta };
}
