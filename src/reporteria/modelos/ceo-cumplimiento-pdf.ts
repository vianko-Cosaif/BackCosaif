// reporteria/modelos/ceo-cumplimiento-pdf.ts
// PDF CEO: Cumplimiento Operativo

import type { ReporteCumplimiento } from './ceo-cumplimiento-model';
import { getBrowser } from './pdf-browser';
import {
  baseCss,
  escapeHtml,
  fmtMin,
  fmtNum,
  svgBar,
  svgLine,
  safeFilename,
} from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function buildHtml(r: ReporteCumplimiento) {
  const k = r.kpis;
  const meta = r.meta;

  const etiqueta = escapeHtml(String(meta.etiqueta ?? 'CEO Cumplimiento').replace(/^CEO_/, 'CEO '));
  const periodo = escapeHtml(meta.periodo ?? '');
  const tz = escapeHtml(meta.tz ?? 'America/Mexico_City');
  const rangoDesde = escapeHtml(meta.rangoLocal?.desde ?? meta.rangoUTC?.desde ?? '');
  const rangoHasta = escapeHtml(meta.rangoLocal?.hastaExclusivo ?? meta.rangoUTC?.hastaExclusivo ?? '');

  const okBucket = r.ejecucionBuckets.find((b) => b.id === 'm10_89');
  const okPct = okBucket?.pct ?? 0;

  const execLabels = r.ejecucionBuckets.map((b) => b.label);
  const execValues = r.ejecucionBuckets.map((b) => b.movimientos);

  const chartExec = svgBar({
    title: 'Cumplimiento de ejecución',
    subtitle: 'Inicio → Fin (min)',
    labels: execLabels,
    values: execValues,
    height: 360,
    fill: '#2563EB',
  });

  const hourLabels = r.movimientosPorHora.map((h) => String(h.hora).padStart(2, '0'));
  const hourValues = r.movimientosPorHora.map((h) => h.movimientos);
  const chartHour = svgLine({
    title: 'Movimientos por hora',
    subtitle: 'Hora local (MX)',
    labels: hourLabels,
    values: hourValues,
    height: 340,
    stroke: '#0EA5E9',
    fill: 'rgba(14, 165, 233, 0.18)',
    xLabelEvery: 3,
  });

  const dayLabels = r.movimientosPorDiaSemana.map((d) => d.dia);
  const dayValues = r.movimientosPorDiaSemana.map((d) => d.movimientos);
  const chartDay = svgBar({
    title: 'Movimientos por día',
    subtitle: 'Semana local',
    labels: dayLabels,
    values: dayValues,
    height: 320,
    fill: '#10B981',
  });

  const estadoEntries = Object.entries(r.estadosGeneral ?? {});
  const estadoMax = Math.max(1, ...estadoEntries.map(([, v]) => Number(v)));
  const estadoBars = estadoEntries
    .map(([estado, total]) => {
      const pct = Math.max(6, Math.round((Number(total) / estadoMax) * 100));
      return `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(estado)}</div>
          <div class="bar-track"><div class="bar-fill warn" style="width:${pct}%"></div></div>
          <div class="bar-val">${fmtNum(total)}</div>
        </div>
      `;
    })
    .join('') || `<div class="empty">Sin datos.</div>`;

  const topEmp = (r.porEmpresa ?? []).slice(0, 10);
  const empRows = topEmp
    .map((e, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td>${escapeHtml(e.nombre)}</td>
        <td class="mono right">${fmtNum(e.totalMovimientos)}</td>
        <td class="mono right">${fmtNum(e.okPct)}%</td>
        <td class="mono right">${fmtNum(e.criticosTotal)}</td>
        <td class="mono right">${fmtNum(e.incidentesTotal)}</td>
        <td class="mono right">${fmtNum(e.canceladosConIncidente)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="7" class="muted">Sin datos.</td></tr>`;

  const turnRows = (r.porTurno ?? [])
    .map((t) => `
      <tr>
        <td>${escapeHtml(t.nombre)}</td>
        <td class="mono right">${fmtNum(t.totalMovimientos)}</td>
        <td class="mono right">${fmtNum(t.okPct)}%</td>
        <td class="mono right">${fmtNum(t.criticosTotal)}</td>
        <td class="mono right">${fmtNum(t.incidentesTotal)}</td>
        <td class="mono right">${fmtNum(t.canceladosConIncidente)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="6" class="muted">Sin datos.</td></tr>`;

  return `
    <html>
    <head>
      <style>${baseCss()}</style>
    </head>
    <body>
      <div class="page">
        <div class="hero">
          <div>
            <div class="pill">CEO · Cumplimiento Operativo</div>
            <div class="title">${etiqueta}${periodo ? ` · ${periodo}` : ''}</div>
            <div class="subtitle">TZ: ${tz}</div>
          </div>
          <div class="meta">
            <div><b>Rango (MX)</b></div>
            <div>${rangoDesde} → ${rangoHasta}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi">
            <div class="label">Movimientos</div>
            <div class="value">${fmtNum(k.totalMovimientos)}</div>
            <div class="sub">Total del periodo</div>
          </div>
          <div class="kpi">
            <div class="label">Cumplimiento OK</div>
            <div class="value">${fmtNum(okPct)}%</div>
            <div class="sub">10–89 min sobre cerrados</div>
          </div>
          <div class="kpi">
            <div class="label">Críticos</div>
            <div class="value">${fmtNum(k.criticosTotal)}</div>
            <div class="sub">&lt;2 min: ${fmtNum(k.criticosLt2)} · 90+: ${fmtNum(k.criticosGte90)}</div>
          </div>
          <div class="kpi">
            <div class="label">Incidentes</div>
            <div class="value">${fmtNum(k.totalIncidentes)}</div>
            <div class="sub">${fmtNum(k.movimientosConIncidente)} movs · ${fmtNum(k.movimientosConIncidentePct)}%</div>
          </div>
          <div class="kpi">
            <div class="label">Cancelados con incidente</div>
            <div class="value">${fmtNum(k.canceladosConIncidente)}</div>
            <div class="sub">Cancelados totales: ${fmtNum(k.cancelados)}</div>
          </div>
          <div class="kpi">
            <div class="label">Índice operativo</div>
            <div class="value">${fmtNum(k.indiceOperativo)}</div>
            <div class="sub">Variabilidad: ${fmtNum(k.variabilidadExecRatio)}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">${chartExec}</div>
          <div class="card">${chartHour}</div>
        </div>

        <div class="grid-2">
          <div class="card">${chartDay}</div>
          <div class="card">
            <h3>Estados de movimientos</h3>
            ${estadoBars}
          </div>
        </div>

        <div class="section-title">Top empresas (cumplimiento)</div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th class="right">#</th>
                <th>Empresa</th>
                <th class="right">Mov.</th>
                <th class="right">OK%</th>
                <th class="right">Crit.</th>
                <th class="right">Inc.</th>
                <th class="right">Canc. Inc.</th>
              </tr>
            </thead>
            <tbody>${empRows}</tbody>
          </table>
        </div>

        <div class="section-title">Desempeño por turno</div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>Turno</th>
                <th class="right">Mov.</th>
                <th class="right">OK%</th>
                <th class="right">Crit.</th>
                <th class="right">Inc.</th>
                <th class="right">Canc. Inc.</th>
              </tr>
            </thead>
            <tbody>${turnRows}</tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function exportarCumplimientoPDF(reporte: ReporteCumplimiento): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const etiquetaRaw = reporte.meta?.etiqueta || 'CEO_Cumplimiento';
  const filename = `Reporte_${safeFilename(etiquetaRaw)}.pdf`;

  try {
    page.setDefaultTimeout(30000);
    await page.setViewport({ width: 1600, height: 2200, deviceScaleFactor: 2 });
    await page.emulateMediaType('screen');
    await page.setContent(buildHtml(reporte), { waitUntil: 'domcontentloaded' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return { filename, contentType: 'application/pdf', buffer: Buffer.from(buffer) };
  } finally {
    await page.close();
  }
}
