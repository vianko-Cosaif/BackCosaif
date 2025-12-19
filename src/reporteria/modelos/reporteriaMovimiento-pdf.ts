// reporteria/reporteriaMovimiento-pdf.ts
// PDF empresarial con gráficas (Chart.js) vía Puppeteer (HTML -> PDF)
// Gráficas por empresa:
// - Movimientos CONCLUIDOS
// - Movimientos CANCELADOS
// - Total INCIDENTES
// - INCIDENTES resueltos vs no resueltos (ABIERTO + CERRADO)

import * as puppeteer from 'puppeteer';

export type ReporteBase = {
  meta: {
    fechaLocal?: string;
    etiqueta?: string; // recomendado: "2025-12-19" | "2025-12" | "2025-S2" | "2025"
    periodo?: string;  // texto libre: "Día", "Mes", "Semestre", "Anual", etc.
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

  // Nota: headless: 'new' es la opción moderna (Puppeteer reciente)
  browserSingleton = await puppeteer.launch({
    headless: 'new' as any,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-dev-shm-usage',
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

function jsonForScript(obj: any) {
  // evita romper <script> con </script> y edge-cases unicode
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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
      // orden: concluidos + incidentes como “impacto”
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

  // Altura dinámica para que no se aplasten labels con muchas empresas.
  // (A4 no crece mágicamente, pero esto mejora legibilidad dentro del área)
  const hBars = clamp(340 + data.length * 18, 380, 820);
  const hStack = clamp(360 + data.length * 16, 420, 880);

  const payload = {
    labels: data.map((d) => d.name),
    concluidos: data.map((d) => d.concluidos),
    cancelados: data.map((d) => d.cancelados),
    incTotal: data.map((d) => d.incTotal),
    incResueltos: data.map((d) => d.incResueltos),
    incNoResueltos: data.map((d) => d.incNoResueltos),
  };

  // Tabla ejecutiva (top 12) para lectura rápida
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

  const dataJson = jsonForScript(payload);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 10mm; }
    :root{
      --bg:#0b1220;
      --panel:#0f1930;
      --card:#111a2e;
      --card2:#0f172a;
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
    canvas{ width:100% !important; height:100% !important; }

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

    .muted{ color: var(--muted); }
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
    <small>Escala horizontal para nombres largos · Sin animación (PDF estable)</small>
  </div>

  <div class="grid">
    <div class="card">
      <div class="chartWrap" style="height:${hBars}px"><canvas id="chConcluidos"></canvas></div>
    </div>
    <div class="card">
      <div class="chartWrap" style="height:${hBars}px"><canvas id="chCancelados"></canvas></div>
    </div>
    <div class="card">
      <div class="chartWrap" style="height:${hBars}px"><canvas id="chIncTotal"></canvas></div>
    </div>
    <div class="card">
      <div class="chartWrap" style="height:${hStack}px"><canvas id="chResVsNoRes"></canvas></div>
    </div>
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
    <div class="mono">Engine: Puppeteer + Chart.js</div>
  </div>

  <script>window.__REPORT_PAYLOAD__ = ${dataJson};</script>
</body>
</html>`;
}

// ---------- Charts Script ----------
function buildChartScript() {
  return `
(function(){
  try{
    const p = window.__REPORT_PAYLOAD__ || {};
    const labels = p.labels || [];
    const concluidos = p.concluidos || [];
    const cancelados = p.cancelados || [];
    const incTotal = p.incTotal || [];
    const incResueltos = p.incResueltos || [];
    const incNoResueltos = p.incNoResueltos || [];

    Chart.defaults.color = '#93a4c7';
    Chart.defaults.font.family = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
    Chart.defaults.animation = false;

    const baseScales = {
      x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { font: { size: 10 } } },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 10 },
          callback: function(v){
            const lbl = this.getLabelForValue(v) || '';
            return lbl.length > 22 ? (lbl.slice(0, 22) + '…') : lbl;
          }
        }
      }
    };

    function makeBar(id, title, arr, color){
      new Chart(document.getElementById(id), {
        type: 'bar',
        data: { labels, datasets: [{ data: arr, backgroundColor: color, borderRadius: 6, barThickness: 12, borderWidth: 0 }] },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: title, color: '#f8fafc', font: { size: 14, weight: '700' }, align: 'start', padding: 18 }
          },
          scales: baseScales
        }
      });
    }

    makeBar('chConcluidos', 'MOVIMIENTOS CONCLUIDOS (por empresa)', concluidos, 'rgba(16,185,129,0.85)');
    makeBar('chCancelados', 'MOVIMIENTOS CANCELADOS (por empresa)', cancelados, 'rgba(244,63,94,0.85)');
    makeBar('chIncTotal', 'TOTAL INCIDENTES (por empresa)', incTotal, 'rgba(56,189,248,0.85)');

    // Stacked: resueltos vs no resueltos
    new Chart(document.getElementById('chResVsNoRes'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'RESUELTO', data: incResueltos, backgroundColor: 'rgba(16,185,129,0.85)', borderWidth: 0, barThickness: 18, borderRadius: 6 },
          { label: 'NO RESUELTO (ABIERTO+CERRADO)', data: incNoResueltos, backgroundColor: 'rgba(245,158,11,0.85)', borderWidth: 0, barThickness: 18, borderRadius: 6 }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 16, color: '#e6eefc' } },
          title: { display: true, text: 'INCIDENTES: RESUELTOS VS NO RESUELTOS (por empresa)', color: '#f8fafc', font: { size: 14, weight: '700' }, align: 'start', padding: 18 }
        },
        scales: {
          x: { ...baseScales.x, stacked: true },
          y: { ...baseScales.y, stacked: true }
        }
      }
    });

    window.__CHARTS_DONE__ = true;
  }catch(err){
    window.__CHARTS_ERR__ = String(err && err.message ? err.message : err);
  }
})();`;
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

    // DOM listo es suficiente (no dependemos de red)
    await page.setContent(buildHtml(reporte, normalized), { waitUntil: 'domcontentloaded' });

    // Inyectar Chart.js + script
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chartPath = require.resolve('chart.js/dist/chart.umd.js');
    await page.addScriptTag({ path: chartPath });
    await page.addScriptTag({ content: buildChartScript() });

    // Esperar charts o error
    await page.waitForFunction(
      'window.__CHARTS_DONE__ === true || typeof window.__CHARTS_ERR__ === "string"',
      { timeout: 15000 }
    );

    const chartErr = await page.evaluate(() => (window as any).__CHARTS_ERR__);
    if (chartErr) {
      throw new Error(`Chart render failed: ${chartErr}`);
    }

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
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
