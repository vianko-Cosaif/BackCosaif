// reporteria/modelos/adminPdf.ts
// PDF ADMIN (CEO) · Blanco · Español · Auditoría enfocada.
// Puppeteer + SVG (0 deps extra).
//
// Qué cambia vs el anterior:
// - Idioma 100% español (sin "engine", sin inglés escondido).
// - Enfoque CEO: Resumen ejecutivo + Riesgos + Auditoría accionable.
// - Anomalías: movimientos CONCLUIDOS < 10 min (baseline esperado 10–15).
// - Bono operador: ventana 09:00–09:00 (MX). 1 bono por locomotora por día operativo.
// - Se eliminan coordinador/supervisor: solo Creado por, Cliente, Operador.
// - Tablas: Top lentos, Top con incidentes, Top anomalías, Bonos otorgados (auditoría),
//   y ranking por operador (productividad / bonos / anomalías).

import * as puppeteer from 'puppeteer';

export type AdminReporteBase = {
  meta: {
    etiqueta?: string;
    periodo?: string;
    tz: string;
    fechaLocal?: string;
    rangoUTC: { desde: string; hastaExclusivo: string };
    rangoLocal?: { desde: string; hastaExclusivo: string };
  };

  kpis: {
    totalMovimientos: number;
    totalConFin: number;
    totalSinFin: number;

    durMeanMin: number;
    durMedianMin: number;
    durStdMin: number;

    avgGte1Min: number;
    avgGte10Min: number;
    avgGte20Min: number;
    avgGte30Min: number;

    totalIncidentes: number;
    movimientosConIncidente: number;
    movimientosConIncidentePct: number;

    durMeanConIncidenteMin: number;
    durMeanSinIncidenteMin: number;

    corrDurMin_vs_Incidentes: number;

    anomalias?: number;
    anomaliasPct?: number;

    bonosElegibles?: number;
    bonosElegiblesPct?: number;
  };

  duracionBuckets: Array<{
    id: string;
    label: string;
    movimientos: number;
    pct: number;
    incidentes: number;
    incidentRate: number;
  }>;

  incidentes: {
    porEstado: Record<string, number>;
    movConIncidentePctPorBucket: Array<{ bucketId: string; bucketLabel: string; movConIncidentePct: number }>;
  };

  anomalias?: {
    porOperador: Array<{ operadorId: number; operadorNombre: string; total: number; pctSobreAnomalias: number }>;
    porCliente: Array<{ clienteId: number; clienteNombre: string; total: number; pctSobreAnomalias: number }>;
    porEmpresa: Array<{ empresa: string; total: number; pctSobreAnomalias: number }>;
    porLocomotora: Array<{ locomotiveNumber: number; total: number; pctSobreAnomalias: number }>;
    porDiaMX: Array<{ diaMX: string; total: number }>;
  };

  bonos?: {
    porOperador: Array<{
      operadorId: number;
      operadorNombre: string;
      operadorRol: string;
      movimientos: number;
      conFin: number;
      elegibles: number;
      elegiblesPct: number;
      leadMeanMin: number;
      incidentesTotal: number;
      anomalias?: number;
    }>;
  };

  topLentos: Array<{
    id: number;
    empresa: string;
    localidad: string;
    estado: string;
    locomotiveNumber: number;

    fechaSolicitudUTC: string;
    fechaInicioUTC: string | null;
    fechaFinUTC: string | null;

    fechaSolicitudMX?: string;
    fechaFinMX?: string | null;
    tramoMX?: string;
    diaMX?: string;

    minSolicitudAFin: number | null;
    minSolicitudAInicio: number | null;
    minInicioAFin: number | null;

    esAnomalia?: boolean;

    incidentesCount: number;
    incidentesAbiertos: number;
    incidentesResueltos: number;
    incidentesCerrados: number;

    diaOperativoMX?: string;
    bonoElegible?: boolean;
    bonoMotivo?: string;

    usuarios: {
      creadoPor?: { id: number; nombre: string; rol: string } | null;
      cliente?: { id: number; nombre: string; rol: string } | null;
      operador?: { id: number; nombre: string; rol: string } | null;
    };
  }>;

  topConIncidentes?: AdminReporteBase['topLentos'];
  topAnomalias?: AdminReporteBase['topLentos'];
  topBonosElegibles?: AdminReporteBase['topLentos'];
};

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
  const w = 860;
  const h = Math.max(320, Math.floor(opts.height ?? 380));
  const labels = opts.labels ?? [];
  const values = (opts.values ?? []).map(safeNum);

  if (!labels.length) return `<div class="empty">Sin datos.</div>`;

  const left = 54;
  const right = 18;
  const top = 58;
  const bottom = 104;

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
    `<text x="14" y="26" fill="#0F172A" font-size="16" font-weight="900">${escapeHtml(opts.title)}</text>`
  );
  if (opts.subtitle) {
    parts.push(
      `<text x="14" y="44" fill="#64748B" font-size="11" font-weight="800">${escapeHtml(opts.subtitle)}</text>`
    );
  }

  for (let i = 0; i < gridLines; i++) {
    const t = i / (gridLines - 1);
    const y = top + (1 - t) * chartH;
    const v = Math.round(t * niceMax);
    parts.push(`<line x1="${left}" y1="${y}" x2="${w - right}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`);
    parts.push(
      `<text x="${left - 10}" y="${y + 4}" text-anchor="end" fill="#64748B" font-size="10" class="mono">${v}</text>`
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
      `<text x="${xCenter}" y="${Math.max(16, y - 6)}" text-anchor="middle" fill="#0F172A" font-size="10" font-weight="900" class="mono">${v}${escapeHtml(suffix)}</text>`
    );

    const lbl = escapeHtml(labels[i]);
    const lx = xCenter;
    const ly = top + chartH + 18;
    parts.push(
      `<text transform="translate(${lx},${ly}) rotate(-35)" text-anchor="end" fill="#0F172A" font-size="10" font-weight="800">${lbl}</text>`
    );
  }

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      ${parts.join('\n')}
    </svg>
  `;
}

function riskBadge(level: 'BAJO' | 'MEDIO' | 'ALTO') {
  const map = {
    BAJO: { bg: '#ECFDF5', bd: '#A7F3D0', tx: '#065F46' },
    MEDIO: { bg: '#FFFBEB', bd: '#FDE68A', tx: '#92400E' },
    ALTO: { bg: '#FEF2F2', bd: '#FECACA', tx: '#991B1B' },
  }[level];

  return `<span class="badge" style="background:${map.bg};border-color:${map.bd};color:${map.tx}">${level}</span>`;
}

function executiveNarrative(r: AdminReporteBase) {
  const k = r.kpis;

  const finRate = pct(k.totalConFin, k.totalMovimientos);
  const incRate = safeNum(k.movimientosConIncidentePct);
  const anom = safeNum(k.anomalias ?? 0);
  const anomPct = safeNum(k.anomaliasPct ?? 0);
  const bonos = safeNum(k.bonosElegibles ?? 0);
  const bonosPct = safeNum(k.bonosElegiblesPct ?? 0);

  // Riesgo simple (operativo) para CEO
  const risk = (() => {
    // alto: muchas anomalías o muchos sin fin o incidentes altos
    if (anomPct >= 8 || (k.totalSinFin && pct(k.totalSinFin, k.totalMovimientos) >= 15) || incRate >= 35) return 'ALTO';
    if (anomPct >= 3 || (k.totalSinFin && pct(k.totalSinFin, k.totalMovimientos) >= 8) || incRate >= 20) return 'MEDIO';
    return 'BAJO';
  })() as 'BAJO' | 'MEDIO' | 'ALTO';

  const bullets: string[] = [];

  bullets.push(
    `Eficiencia: tiempo promedio de <b>${escapeHtml(fmtMin(k.durMeanMin))}</b> (mediana <b>${escapeHtml(fmtMin(k.durMedianMin))}</b>).`
  );

  bullets.push(`Cierre: <b>${safeNum(k.totalConFin)}</b> concluidos y <b>${safeNum(k.totalSinFin)}</b> sin fin (${finRate}% de cierre).`);

  bullets.push(`Incidentes: <b>${safeNum(k.totalIncidentes)}</b> en total; <b>${safeNum(incRate)}%</b> de movimientos con incidente.`);

  bullets.push(`Anomalías: <b>${anom}</b> movimientos concluidos <b>&lt; 10 min</b> (${anomPct}% de los concluidos).`);

  bullets.push(`Bonos (09:00–09:00): <b>${bonos}</b> bonos elegibles (${bonosPct}% de concluidos con operador).`);

  return {
    risk,
    html: `
      <div class="exec">
        <div class="execHead">
          <div>
            <div class="kicker2">Resumen ejecutivo</div>
            <div class="execTitle">Estado de operación y auditoría</div>
          </div>
          <div class="risk">
            <div class="riskLabel">Riesgo operativo</div>
            <div>${riskBadge(risk)}</div>
          </div>
        </div>
        <ul class="execList">
          ${bullets.map((b) => `<li>${b}</li>`).join('')}
        </ul>
        <div class="note">
          <b>Definiciones clave:</b> “Anomalía” = movimiento concluido &lt; 10 min (baseline esperado 10–15). “Bono” = primer movimiento por locomotora dentro del día operativo 09:00–09:00 (MX).
        </div>
      </div>
    `,
  };
}

function buildHtml(r: AdminReporteBase) {
  const meta = r.meta;
  const k = r.kpis;

  const etiqueta = escapeHtml(meta.etiqueta || 'Reporte Ejecutivo');
  const periodo = escapeHtml(meta.periodo || '');

  const tz = escapeHtml(meta.tz || MX_TZ);

  const rangoMXDesde = escapeHtml(fmtMX(meta.rangoUTC.desde, meta.tz));
  const rangoMXHasta = escapeHtml(fmtMX(meta.rangoUTC.hastaExclusivo, meta.tz));

  const buckets = r.duracionBuckets ?? [];
  const bLabels = buckets.map((b) => b.label);
  const bMovs = buckets.map((b) => b.movimientos);
  const bIncRate = buckets.map((b) => Math.round(safeNum(b.incidentRate) * 100) / 100);

  const chartDur = svgBar({
    title: 'Distribución de duración (solicitud → fin)',
    subtitle: 'Cantidad de movimientos por rango de minutos',
    labels: bLabels,
    values: bMovs,
    height: 420,
    fill: '#0B2A4A',
  });

  const chartInc = svgBar({
    title: 'Incidentes promedio por movimiento (por bucket)',
    subtitle: 'Promedio de incidentes por movimiento en cada rango',
    labels: bLabels,
    values: bIncRate,
    height: 420,
    fill: '#111827',
  });

  const incEstado = r.incidentes?.porEstado ?? {};
  const incEstadoRows =
    Object.entries(incEstado)
      .sort((a, b) => safeNum(b[1]) - safeNum(a[1]))
      .map(
        ([st, n]) => `
      <tr>
        <td class="name">${escapeHtml(st)}</td>
        <td class="mono right"><b>${safeNum(n)}</b></td>
      </tr>
    `
      )
      .join('') || `<tr><td colspan="2" class="muted">Sin incidentes.</td></tr>`;

  const movIncBucketRows =
    (r.incidentes?.movConIncidentePctPorBucket ?? [])
      .map(
        (x) => `
      <tr>
        <td class="name">${escapeHtml(x.bucketLabel)}</td>
        <td class="mono right"><b>${safeNum(x.movConIncidentePct)}%</b></td>
      </tr>
    `
      )
      .join('') || `<tr><td colspan="2" class="muted">Sin datos.</td></tr>`;

  const anom = r.anomalias;
  const anomOperRows =
    (anom?.porOperador ?? [])
      .slice(0, 12)
      .map(
        (x) => `
      <tr>
        <td class="name">${escapeHtml(x.operadorNombre)}</td>
        <td class="mono right"><b>${safeNum(x.total)}</b></td>
        <td class="mono right">${safeNum(x.pctSobreAnomalias)}%</td>
      </tr>
    `
      )
      .join('') || `<tr><td colspan="3" class="muted">Sin anomalías.</td></tr>`;

  const anomCliRows =
    (anom?.porCliente ?? [])
      .slice(0, 12)
      .map(
        (x) => `
      <tr>
        <td class="name">${escapeHtml(x.clienteNombre)}</td>
        <td class="mono right"><b>${safeNum(x.total)}</b></td>
        <td class="mono right">${safeNum(x.pctSobreAnomalias)}%</td>
      </tr>
    `
      )
      .join('') || `<tr><td colspan="3" class="muted">Sin anomalías.</td></tr>`;

  const anomEmpRows =
    (anom?.porEmpresa ?? [])
      .slice(0, 12)
      .map(
        (x) => `
      <tr>
        <td class="name">${escapeHtml(x.empresa)}</td>
        <td class="mono right"><b>${safeNum(x.total)}</b></td>
        <td class="mono right">${safeNum(x.pctSobreAnomalias)}%</td>
      </tr>
    `
      )
      .join('') || `<tr><td colspan="3" class="muted">Sin anomalías.</td></tr>`;

  const anomLocoRows =
    (anom?.porLocomotora ?? [])
      .slice(0, 12)
      .map(
        (x) => `
      <tr>
        <td class="mono">Loco ${safeNum(x.locomotiveNumber)}</td>
        <td class="mono right"><b>${safeNum(x.total)}</b></td>
        <td class="mono right">${safeNum(x.pctSobreAnomalias)}%</td>
      </tr>
    `
      )
      .join('') || `<tr><td colspan="3" class="muted">Sin anomalías.</td></tr>`;

  const rankingOps = (r.bonos?.porOperador ?? [])
    .slice(0, 20)
    .map((x, idx) => {
      return `
        <tr>
          <td class="mono right">${idx + 1}</td>
          <td class="name">${escapeHtml(x.operadorNombre)}<div class="sub2">ID ${safeNum(x.operadorId)} · ${escapeHtml(x.operadorRol)}</div></td>
          <td class="mono right"><b>${safeNum(x.movimientos)}</b></td>
          <td class="mono right">${safeNum(x.conFin)}</td>
          <td class="mono right"><b>${safeNum(x.elegibles)}</b> <span class="muted">(${safeNum(x.elegiblesPct)}%)</span></td>
          <td class="mono right">${escapeHtml(fmtMin(x.leadMeanMin))}</td>
          <td class="mono right">${safeNum(x.incidentesTotal)}</td>
          <td class="mono right">${safeNum(x.anomalias ?? 0)}</td>
        </tr>
      `;
    })
    .join('') || `<tr><td colspan="8" class="muted">Sin datos.</td></tr>`;

  const buildAuditRows = (arr?: AdminReporteBase['topLentos']) =>
    (arr ?? [])
      .map((m, idx) => {
        const u = m.usuarios || {};
        const userLine = [
          u.creadoPor ? `Creado por: ${u.creadoPor.nombre}` : null,
          u.cliente ? `Cliente: ${u.cliente.nombre}` : null,
          u.operador ? `Operador: ${u.operador.nombre}` : null,
        ]
          .filter(Boolean)
          .join(' · ');

        const solicitudMX = m.fechaSolicitudMX ?? fmtMX(m.fechaSolicitudUTC, meta.tz);
        const finMX = m.fechaFinMX ?? (m.fechaFinUTC ? fmtMX(m.fechaFinUTC, meta.tz) : '—');

        const tramo = m.tramoMX
          ? m.tramoMX
          : m.fechaFinUTC
            ? `${solicitudMX} → ${finMX}`
            : '—';

        const flags = [
          m.esAnomalia ? 'ANOMALÍA' : null,
          m.bonoElegible ? 'BONO' : null,
          m.incidentesCount > 0 ? `INC(${safeNum(m.incidentesCount)})` : null,
        ]
          .filter(Boolean)
          .join(' · ');

        return `
          <tr>
            <td class="mono right">${idx + 1}</td>
            <td class="mono right">#${safeNum(m.id)}</td>
            <td class="mono">Loco ${safeNum(m.locomotiveNumber)}</td>
            <td class="name">
              ${escapeHtml(m.empresa)}
              <div class="sub2">${escapeHtml(m.localidad)} · ${escapeHtml(m.estado)}${flags ? ` · <span class="mono">${escapeHtml(flags)}</span>` : ''}</div>
            </td>
            <td class="mono right"><b>${m.minSolicitudAFin == null ? '—' : escapeHtml(fmtMin(m.minSolicitudAFin))}</b></td>
            <td class="mono right">${safeNum(m.incidentesCount)}</td>
            <td class="mono">${escapeHtml(tramo)}</td>
            <td class="users">${escapeHtml(userLine || '—')}</td>
          </tr>
        `;
      })
      .join('') || `<tr><td colspan="8" class="muted">Sin datos.</td></tr>`;

  const exec = executiveNarrative(r);

  const topLentosRows = buildAuditRows(r.topLentos);
  const topIncRows = buildAuditRows(r.topConIncidentes);
  const topAnomRows = buildAuditRows(r.topAnomalias);
  const topBonosRows = buildAuditRows(r.topBonosElegibles);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 10mm; }
    :root{
      --bg:#ffffff;
      --ink:#0f172a;
      --muted:#475569;
      --muted2:#64748b;
      --border:#e5e7eb;
      --soft:#f8fafc;
      --brand:#0B2A4A;
    }
    *{ box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body{
      margin:0; padding:18px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color:var(--ink); background:var(--bg);
    }

    .topbar{
      border:1px solid var(--border);
      border-radius:16px;
      padding:16px 16px 12px;
      background:#fff;
    }
    .toprow{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .kicker{ font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); font-weight:900; }
    h1{ margin:6px 0 0; font-size:22px; font-weight:1000; line-height:1.12; }
    .periodo{ font-size:12px; color:var(--muted); font-weight:900; }
    .meta{ text-align:right; font-size:11px; color:var(--muted); line-height:1.45; display:flex; flex-direction:column; gap:6px; }
    .pill{
      display:inline-flex; align-items:center; gap:8px;
      padding:6px 10px; border:1px solid var(--border); border-radius:999px;
      background:var(--soft); font-size:11px; color:var(--ink); font-weight:900;
    }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .code{
      padding:4px 8px; border:1px solid var(--border); border-radius:10px;
      background:#fff; color:var(--ink); white-space:nowrap; font-weight:900;
    }

    .kpis{
      margin-top:12px; display:grid; grid-template-columns: repeat(6, 1fr); gap:10px;
    }
    .kpi{
      border:1px solid var(--border); border-radius:14px; background:var(--soft);
      padding:10px 10px 9px; min-height:66px;
    }
    .kpi .label{ font-size:10px; text-transform:uppercase; letter-spacing:.14em; color:var(--muted2); font-weight:900; }
    .kpi .value{ margin-top:6px; font-size:18px; font-weight:1000; color:var(--ink); }
    .kpi .sub{ margin-top:2px; font-size:10px; color:var(--muted); font-weight:900; }

    .section{ margin-top:14px; }
    .sectionTitle{ display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin:14px 2px 8px; }
    .sectionTitle .h{ font-size:12px; font-weight:1000; letter-spacing:.18em; text-transform:uppercase; color:var(--brand); }
    .sectionTitle .s{ font-size:11px; color:var(--muted); font-weight:900; }

    .card{ border:1px solid var(--border); border-radius:16px; background:#fff; padding:12px; overflow:hidden; }
    .chart{ height:420px; width:100%; }
    .empty{ height:200px; display:flex; align-items:center; justify-content:center; color:var(--muted); font-weight:900; }

    table{ width:100%; border-collapse:separate; border-spacing:0; border-radius:14px; overflow:hidden; font-size:11px; }
    thead th{
      background:var(--soft); border-bottom:1px solid var(--border);
      color:var(--muted2); font-weight:1000; text-transform:uppercase;
      letter-spacing:.12em; font-size:9.5px; padding:10px 10px; text-align:left;
    }
    tbody td{ border-bottom:1px solid var(--border); padding:10px 10px; vertical-align:top; color:var(--ink); }
    tbody tr:last-child td{ border-bottom:none; }

    .right{ text-align:right; }
    td.name{ max-width:260px; font-weight:1000; }
    .sub2{ margin-top:4px; color:var(--muted); font-weight:900; font-size:10px; }
    td.users{ max-width: 320px; color: var(--muted); font-weight: 900; font-size: 10px; }
    .muted{ color: var(--muted); font-weight: 900; }

    .grid2{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid3{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .grid2 .card, .grid3 .card{ break-inside: avoid; }

    .exec{ border:1px solid var(--border); border-radius:16px; background:var(--soft); padding:14px; }
    .execHead{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .kicker2{ font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted2); font-weight:1000; }
    .execTitle{ margin-top:6px; font-size:16px; font-weight:1000; }
    .execList{ margin:10px 0 0 18px; padding:0; color:var(--ink); font-weight:800; line-height:1.55; }
    .note{ margin-top:10px; font-size:10px; color:var(--muted); font-weight:900; border-top:1px dashed var(--border); padding-top:10px; }

    .risk{ text-align:right; }
    .riskLabel{ font-size:10px; color:var(--muted2); font-weight:1000; letter-spacing:.12em; text-transform:uppercase; }
    .badge{ display:inline-flex; padding:6px 10px; border-radius:999px; border:1px solid; font-weight:1000; font-size:11px; }

    .foot{
      margin-top:10px; display:flex; justify-content:space-between;
      color:var(--muted); font-size:10px; font-weight:900;
      border-top:1px solid var(--border); padding-top:10px;
    }

    .card, .topbar, .exec { break-inside: avoid; }
    tr { break-inside: avoid; break-after: auto; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="toprow">
      <div>
        <div class="kicker">COSAIF · Reporte Ejecutivo · Administración</div>
        <h1>${etiqueta}${periodo ? ` <span class="periodo">· ${periodo}</span>` : ''}</h1>
      </div>
      <div class="meta">
        <div>
          <span class="pill">Rango (hora local)</span>
          <span class="code mono">${rangoMXDesde}</span>
          <span class="mono" style="color:var(--muted2);font-weight:1000;">→</span>
          <span class="code mono">${rangoMXHasta}</span>
        </div>
        <div>
          <span class="pill">Zona horaria</span>
          <span class="code mono">${tz}</span>
        </div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi">
        <div class="label">Movimientos</div>
        <div class="value mono">${safeNum(k.totalMovimientos)}</div>
        <div class="sub">Total en el periodo</div>
      </div>

      <div class="kpi">
        <div class="label">Concluidos</div>
        <div class="value mono">${safeNum(k.totalConFin)}</div>
        <div class="sub">Con fin registrado</div>
      </div>

      <div class="kpi">
        <div class="label">Sin fin</div>
        <div class="value mono">${safeNum(k.totalSinFin)}</div>
        <div class="sub">Pendientes / incompletos</div>
      </div>

      <div class="kpi">
        <div class="label">Promedio</div>
        <div class="value mono">${escapeHtml(fmtMin(k.durMeanMin))}</div>
        <div class="sub">Solicitud → fin</div>
      </div>

      <div class="kpi">
        <div class="label">Incidentes</div>
        <div class="value mono">${safeNum(k.totalIncidentes)}</div>
        <div class="sub">${safeNum(k.movimientosConIncidentePct)}% con incidente</div>
      </div>

      <div class="kpi">
        <div class="label">Anomalías</div>
        <div class="value mono">${safeNum(k.anomalias ?? 0)}</div>
        <div class="sub">${safeNum(k.anomaliasPct ?? 0)}% de concluidos (&lt;10m)</div>
      </div>
    </div>
  </div>

  <div class="section">
    ${exec.html}
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Duraciones e incidentes</div>
      <div class="s">Distribución por rangos de minutos</div>
    </div>

    <div class="card"><div class="chart">${chartDur}</div></div>
    <div style="height:10px"></div>
    <div class="card"><div class="chart">${chartInc}</div></div>
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Incidentes</div>
      <div class="s">Distribución global y % de movimientos con incidente por rango</div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="sectionTitle" style="margin:0 0 8px">
          <div class="h" style="letter-spacing:.12em">Por estado</div>
          <div class="s">Conteo</div>
        </div>
        <table>
          <thead><tr><th>Estado</th><th class="right">Total</th></tr></thead>
          <tbody>${incEstadoRows}</tbody>
        </table>
      </div>

      <div class="card">
        <div class="sectionTitle" style="margin:0 0 8px">
          <div class="h" style="letter-spacing:.12em">Tasa por rango</div>
          <div class="s">% movimientos con incidente</div>
        </div>
        <table>
          <thead><tr><th>Rango</th><th class="right">%</th></tr></thead>
          <tbody>${movIncBucketRows}</tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Anomalías (&lt; 10 min)</div>
      <div class="s">Dónde se concentran (operador / cliente / empresa / locomotora)</div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="sectionTitle" style="margin:0 0 8px">
          <div class="h" style="letter-spacing:.12em">Top operadores</div>
          <div class="s">Conteo y % sobre anomalías</div>
        </div>
        <table>
          <thead><tr><th>Operador</th><th class="right">Total</th><th class="right">%</th></tr></thead>
          <tbody>${anomOperRows}</tbody>
        </table>
      </div>

      <div class="card">
        <div class="sectionTitle" style="margin:0 0 8px">
          <div class="h" style="letter-spacing:.12em">Top clientes</div>
          <div class="s">Conteo y % sobre anomalías</div>
        </div>
        <table>
          <thead><tr><th>Cliente</th><th class="right">Total</th><th class="right">%</th></tr></thead>
          <tbody>${anomCliRows}</tbody>
        </table>
      </div>
    </div>

    <div style="height:10px"></div>

    <div class="grid2">
      <div class="card">
        <div class="sectionTitle" style="margin:0 0 8px">
          <div class="h" style="letter-spacing:.12em">Top empresas</div>
          <div class="s">Conteo y % sobre anomalías</div>
        </div>
        <table>
          <thead><tr><th>Empresa</th><th class="right">Total</th><th class="right">%</th></tr></thead>
          <tbody>${anomEmpRows}</tbody>
        </table>
      </div>

      <div class="card">
        <div class="sectionTitle" style="margin:0 0 8px">
          <div class="h" style="letter-spacing:.12em">Top locomotoras</div>
          <div class="s">Conteo y % sobre anomalías</div>
        </div>
        <table>
          <thead><tr><th>Locomotora</th><th class="right">Total</th><th class="right">%</th></tr></thead>
          <tbody>${anomLocoRows}</tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Bonos (09:00–09:00)</div>
      <div class="s">Auditoría de bonos otorgables: 1 por locomotora por día operativo</div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th class="right">#</th>
            <th class="right">Mov</th>
            <th>Locomotora</th>
            <th>Contexto</th>
            <th class="right">Dur</th>
            <th class="right">Inc</th>
            <th>Tramo (MX)</th>
            <th>Usuarios</th>
          </tr>
        </thead>
        <tbody>${topBonosRows}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Ranking por operador</div>
      <div class="s">Movimientos, bonos, tiempo promedio, incidentes, anomalías</div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th class="right">#</th>
            <th>Operador</th>
            <th class="right">Mov</th>
            <th class="right">Con fin</th>
            <th class="right">Bonos</th>
            <th class="right">Promedio</th>
            <th class="right">Inc</th>
            <th class="right">Anom</th>
          </tr>
        </thead>
        <tbody>${rankingOps}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Auditoría detallada</div>
      <div class="s">Movimientos clave para revisión</div>
    </div>

    <div class="card">
      <div class="sectionTitle" style="margin:0 0 8px">
        <div class="h" style="letter-spacing:.12em">Top lentos</div>
        <div class="s">Mayor duración solicitud → fin</div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="right">#</th>
            <th class="right">Mov</th>
            <th>Locomotora</th>
            <th>Contexto</th>
            <th class="right">Dur</th>
            <th class="right">Inc</th>
            <th>Tramo (MX)</th>
            <th>Usuarios</th>
          </tr>
        </thead>
        <tbody>${topLentosRows}</tbody>
      </table>
    </div>

    <div class="card" style="margin-top:10px">
      <div class="sectionTitle" style="margin:0 0 8px">
        <div class="h" style="letter-spacing:.12em">Top con incidentes</div>
        <div class="s">Mayor número de incidentes</div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="right">#</th>
            <th class="right">Mov</th>
            <th>Locomotora</th>
            <th>Contexto</th>
            <th class="right">Dur</th>
            <th class="right">Inc</th>
            <th>Tramo (MX)</th>
            <th>Usuarios</th>
          </tr>
        </thead>
        <tbody>${topIncRows}</tbody>
      </table>
    </div>

    <div class="card" style="margin-top:10px">
      <div class="sectionTitle" style="margin:0 0 8px">
        <div class="h" style="letter-spacing:.12em">Top anomalías</div>
        <div class="s">Concluidos &lt; 10 min (baseline 10–15)</div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="right">#</th>
            <th class="right">Mov</th>
            <th>Locomotora</th>
            <th>Contexto</th>
            <th class="right">Dur</th>
            <th class="right">Inc</th>
            <th>Tramo (MX)</th>
            <th>Usuarios</th>
          </tr>
        </thead>
        <tbody>${topAnomRows}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="sectionTitle">
      <div class="h">Métricas complementarias</div>
      <div class="s">Umbrales y comparación con/sin incidentes</div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Métrica</th>
            <th class="right">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="name">Promedio (solo ≥ 1 minuto)</td><td class="mono right"><b>${escapeHtml(fmtMin(k.avgGte1Min))}</b></td></tr>
          <tr><td class="name">Promedio (solo ≥ 10 minutos)</td><td class="mono right"><b>${escapeHtml(fmtMin(k.avgGte10Min))}</b></td></tr>
          <tr><td class="name">Promedio (solo ≥ 20 minutos)</td><td class="mono right"><b>${escapeHtml(fmtMin(k.avgGte20Min))}</b></td></tr>
          <tr><td class="name">Promedio (solo ≥ 30 minutos)</td><td class="mono right"><b>${escapeHtml(fmtMin(k.avgGte30Min))}</b></td></tr>
          <tr><td class="name">Promedio con incidentes</td><td class="mono right"><b>${escapeHtml(fmtMin(k.durMeanConIncidenteMin))}</b></td></tr>
          <tr><td class="name">Promedio sin incidentes</td><td class="mono right"><b>${escapeHtml(fmtMin(k.durMeanSinIncidenteMin))}</b></td></tr>
          <tr><td class="name">Mediana</td><td class="mono right"><b>${escapeHtml(fmtMin(k.durMedianMin))}</b></td></tr>
          <tr><td class="name">Desviación estándar</td><td class="mono right"><b>${escapeHtml(fmtMin(k.durStdMin))}</b></td></tr>
          <tr><td class="name">Correlación (duración vs incidentes)</td><td class="mono right"><b>${safeNum(k.corrDurMin_vs_Incidentes).toFixed(2)}</b></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="foot">
    <div>Generado automáticamente · Reportería Cosaif (Administración)</div>
    <div class="mono">Puppeteer + SVG</div>
  </div>
</body>
</html>`;
}

export async function exportarAdminPDF(reporte: AdminReporteBase): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  const etiquetaRaw = reporte.meta.etiqueta || 'Admin';
  const filename = `Reporte_${safeFilename(etiquetaRaw)}.pdf`;

  try {
    page.setDefaultTimeout(30000);
    await page.setViewport({ width: 1400, height: 1800, deviceScaleFactor: 2 });
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
