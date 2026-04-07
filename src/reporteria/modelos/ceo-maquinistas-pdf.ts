// reporteria/modelos/ceo-maquinistas-pdf.ts
// PDF CEO: Ranking de Maquinistas (avanzado)

import type { ReporteMaquinistas } from './ceo-maquinistas-model';
import { getBrowser } from './pdf-browser';
import { baseCss, escapeHtml, fmtMin, fmtNum, safeFilename, svgBar } from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function buildHtml(r: ReporteMaquinistas) {
  const k = r.kpis;
  const meta = r.meta;

  const etiqueta = escapeHtml(String(meta.etiqueta ?? 'CEO Maquinistas').replace(/^CEO_/, 'CEO '));
  const periodo = escapeHtml(meta.periodo ?? '');
  const tz = escapeHtml(meta.tz ?? 'America/Mexico_City');
  const rangoDesde = escapeHtml(meta.rangoLocal?.desde ?? meta.rangoUTC?.desde ?? '');
  const rangoHasta = escapeHtml(meta.rangoLocal?.hastaExclusivo ?? meta.rangoUTC?.hastaExclusivo ?? '');

  const execLabels = r.ejecucionBuckets.map((b) => b.label);
  const execValues = r.ejecucionBuckets.map((b) => b.movimientos);
  const chartExec = svgBar({
    title: 'Rangos de ejecución',
    subtitle: 'Inicio → Fin (min)',
    labels: execLabels,
    values: execValues,
    height: 340,
    fill: '#2563EB',
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

  const rankingRows = (r.rankingOperadores ?? []).slice(0, 20)
    .map((o, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td>${escapeHtml(o.operadorNombre)}</td>
        <td class="mono right">${fmtNum(o.totalMovimientos)}</td>
        <td class="mono right">${fmtMin(o.execMeanMin)}</td>
        <td class="mono right">${fmtMin(o.execP90Min)}</td>
        <td class="mono right">${fmtNum(o.okPct)}%</td>
        <td class="mono right">${fmtNum(o.criticosTotal)}</td>
        <td class="mono right">${fmtNum(o.incidentesTotal)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="8" class="muted">Sin datos.</td></tr>`;

  const empBlocks = (r.operadoresPorEmpresa ?? []).slice(0, 4)
    .map((seg) => {
      const rows = (seg.operadores ?? []).slice(0, 6)
        .map((o, idx) => `
          <tr>
            <td class="mono right">${idx + 1}</td>
            <td>${escapeHtml(o.operadorNombre)}</td>
            <td class="mono right">${fmtNum(o.totalMovimientos)}</td>
            <td class="mono right">${fmtNum(o.okPct)}%</td>
            <td class="mono right">${fmtNum(o.criticosTotal)}</td>
          </tr>
        `)
        .join('') || `<tr><td colspan="5" class="muted">Sin datos.</td></tr>`;

      return `
        <div class="card compact">
          <h3>${escapeHtml(seg.nombre)}</h3>
          <table class="table-tight">
            <thead>
              <tr>
                <th class="right">#</th>
                <th>Maquinista</th>
                <th class="right">Mov.</th>
                <th class="right">OK%</th>
                <th class="right">Crit.</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    })
    .join('');

  const locBlocks = (r.operadoresPorLocalidad ?? []).slice(0, 4)
    .map((seg) => {
      const rows = (seg.operadores ?? []).slice(0, 6)
        .map((o, idx) => `
          <tr>
            <td class="mono right">${idx + 1}</td>
            <td>${escapeHtml(o.operadorNombre)}</td>
            <td class="mono right">${fmtNum(o.totalMovimientos)}</td>
            <td class="mono right">${fmtNum(o.okPct)}%</td>
            <td class="mono right">${fmtNum(o.criticosTotal)}</td>
          </tr>
        `)
        .join('') || `<tr><td colspan="5" class="muted">Sin datos.</td></tr>`;

      return `
        <div class="card compact">
          <h3>${escapeHtml(seg.nombre)}</h3>
          <table class="table-tight">
            <thead>
              <tr>
                <th class="right">#</th>
                <th>Maquinista</th>
                <th class="right">Mov.</th>
                <th class="right">OK%</th>
                <th class="right">Crit.</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    })
    .join('');

  const okBucket = r.ejecucionBuckets.find((b) => b.id === 'm10_89');
  const okPct = okBucket?.pct ?? 0;

  return `
    <html>
    <head><style>${baseCss()}</style></head>
    <body>
      <div class="page">
        <div class="hero">
          <div>
            <div class="pill">CEO · Ranking de Maquinistas</div>
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
          <div class="card">${chartExec}</div>
          <div class="card">${chartDay}</div>
        </div>

        <div class="section-title">Ranking general de maquinistas</div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th class="right">#</th>
                <th>Maquinista</th>
                <th class="right">Mov.</th>
                <th class="right">Prom. ejec.</th>
                <th class="right">P90 ejec.</th>
                <th class="right">OK%</th>
                <th class="right">Crit.</th>
                <th class="right">Inc.</th>
              </tr>
            </thead>
            <tbody>${rankingRows}</tbody>
          </table>
        </div>
      </div>

      <div class="page break">
        <div class="section-title">Top maquinistas por empresa</div>
        <div class="grid-2 cols">${empBlocks}</div>

        <div class="section-title">Top maquinistas por localidad</div>
        <div class="grid-2 cols">${locBlocks}</div>
      </div>
    </body>
    </html>
  `;
}

export async function exportarMaquinistasPDF(reporte: ReporteMaquinistas): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const etiquetaRaw = reporte.meta?.etiqueta || 'CEO_Maquinistas';
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
