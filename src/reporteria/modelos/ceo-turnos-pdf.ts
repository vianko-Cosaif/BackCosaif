// reporteria/modelos/ceo-turnos-pdf.ts
// PDF CEO: Desempeño por Turno

import type { ReporteTurnos } from './ceo-turnos-model';
import { getBrowser } from './pdf-browser';
import { baseCss, escapeHtml, fmtNum, safeFilename, svgLine } from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function buildHtml(r: ReporteTurnos) {
  const k = r.kpis;
  const meta = r.meta;
  const etiqueta = escapeHtml(String(meta.etiqueta ?? 'CEO Turnos').replace(/^CEO_/, 'CEO '));
  const periodo = escapeHtml(meta.periodo ?? '');
  const tz = escapeHtml(meta.tz ?? 'America/Mexico_City');
  const rangoDesde = escapeHtml(meta.rangoLocal?.desde ?? meta.rangoUTC?.desde ?? '');
  const rangoHasta = escapeHtml(meta.rangoLocal?.hastaExclusivo ?? meta.rangoUTC?.hastaExclusivo ?? '');

  const okBucket = r.ejecucionBuckets.find((b) => b.id === 'm10_89');
  const okPct = okBucket?.pct ?? 0;

  const hourLabels = r.movimientosPorHora.map((h) => String(h.hora).padStart(2, '0'));
  const hourValues = r.movimientosPorHora.map((h) => h.movimientos);
  const chartMov = svgLine({
    title: 'Movimientos por hora',
    subtitle: 'Hora local (MX)',
    labels: hourLabels,
    values: hourValues,
    height: 340,
    stroke: '#0EA5E9',
    fill: 'rgba(14, 165, 233, 0.18)',
    xLabelEvery: 3,
  });

  const incValues = r.incidentesPorHora.map((h) => h.incidentes);
  const chartInc = svgLine({
    title: 'Incidentes por hora',
    subtitle: 'Hora local (MX)',
    labels: hourLabels,
    values: incValues,
    height: 340,
    stroke: '#EF4444',
    fill: 'rgba(239, 68, 68, 0.18)',
    xLabelEvery: 3,
  });

  const turnRows = (r.turnos ?? [])
    .map((t) => `
      <tr>
        <td>${escapeHtml(t.turnoLabel)} (${escapeHtml(t.turnoRango)})</td>
        <td class="mono right">${fmtNum(t.totalMovimientos)}</td>
        <td class="mono right">${fmtNum(t.okPct)}%</td>
        <td class="mono right">${fmtNum(t.criticosTotal)}</td>
        <td class="mono right">${fmtNum(t.incidentesTotal)}</td>
        <td class="mono right">${fmtNum(t.canceladosConIncidente)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="6" class="muted">Sin datos.</td></tr>`;

  const rankingBlocks = (r.rankingOperadoresPorTurno ?? [])
    .map((t) => {
      const rows = t.operadores
        .map(
          (o, idx) => `
            <tr>
              <td class="mono right">${idx + 1}</td>
              <td>${escapeHtml(o.operadorNombre)}</td>
              <td class="mono right">${fmtNum(o.totalMovimientos)}</td>
              <td class="mono right">${fmtNum(o.okPct)}%</td>
              <td class="mono right">${fmtNum(o.criticosTotal)}</td>
              <td class="mono right">${fmtNum(o.incidentesTotal)}</td>
            </tr>
          `
        )
        .join('') || `<tr><td colspan="6" class="muted">Sin datos.</td></tr>`;

      return `
        <div class="card">
          <h3>${escapeHtml(t.turnoLabel)} · ${escapeHtml(t.turnoRango)}</h3>
          <table class="table-tight">
            <thead>
              <tr>
                <th class="right">#</th>
                <th>Maquinista</th>
                <th class="right">Mov.</th>
                <th class="right">OK%</th>
                <th class="right">Crit.</th>
                <th class="right">Inc.</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    })
    .join('');

  return `
    <html>
    <head><style>${baseCss()}</style></head>
    <body>
      <div class="page">
        <div class="hero">
          <div>
            <div class="pill">CEO · Desempeño por Turno</div>
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
            <div class="sub">10–89 min</div>
          </div>
          <div class="kpi">
            <div class="label">Críticos</div>
            <div class="value">${fmtNum(k.criticosTotal)}</div>
            <div class="sub">&lt;2: ${fmtNum(k.criticosLt2)} · 90+: ${fmtNum(k.criticosGte90)}</div>
          </div>
          <div class="kpi">
            <div class="label">Incidentes</div>
            <div class="value">${fmtNum(k.totalIncidentes)}</div>
            <div class="sub">${fmtNum(k.movimientosConIncidente)} movs · ${fmtNum(k.movimientosConIncidentePct)}%</div>
          </div>
          <div class="kpi">
            <div class="label">Cancelados con incidente</div>
            <div class="value">${fmtNum(k.canceladosConIncidente)}</div>
            <div class="sub">Cancelados: ${fmtNum(k.cancelados)}</div>
          </div>
          <div class="kpi">
            <div class="label">Índice operativo</div>
            <div class="value">${fmtNum(k.indiceOperativo)}</div>
            <div class="sub">Variabilidad: ${fmtNum(k.variabilidadExecRatio)}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">${chartMov}</div>
          <div class="card">${chartInc}</div>
        </div>

        <div class="section-title">Resumen por turno</div>
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

      <div class="page break">
        <div class="section-title">Ranking de maquinistas por turno</div>
        <div class="grid-2 cols">${rankingBlocks}</div>
      </div>
    </body>
    </html>
  `;
}

export async function exportarTurnosPDF(reporte: ReporteTurnos): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const etiquetaRaw = reporte.meta?.etiqueta || 'CEO_Turnos';
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
