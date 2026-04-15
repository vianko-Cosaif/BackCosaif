// reporteria/modelos/ceo-trafico-cliente-pdf.ts
// PDF CEO: Tráfico por Cliente

import type { ReporteTraficoCliente } from './ceo-trafico-cliente-model';
import { getBrowser } from './pdf-browser';
import { baseCss, escapeHtml, fmtNum, safeFilename, svgBar, svgLine } from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function buildHtml(r: ReporteTraficoCliente) {
  const k = r.kpis;
  const meta = r.meta;

  const etiqueta = escapeHtml(String(meta.etiqueta ?? 'CEO Trafico').replace(/^CEO_/, 'CEO '));
  const periodo = escapeHtml(meta.periodo ?? '');
  const tz = escapeHtml(meta.tz ?? 'America/Mexico_City');
  const rangoDesde = escapeHtml(meta.rangoLocal?.desde ?? meta.rangoUTC?.desde ?? '');
  const rangoHasta = escapeHtml(meta.rangoLocal?.hastaExclusivo ?? meta.rangoUTC?.hastaExclusivo ?? '');

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

  const topMov = r.topClientesMovimientos ?? [];
  const topInc = r.topClientesIncidentes ?? [];

  const maxMov = Math.max(1, ...topMov.map((c) => c.totalMovimientos));
  const movBars = topMov
    .map((c) => {
      const pct = Math.max(6, Math.round((c.totalMovimientos / maxMov) * 100));
      return `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(c.clienteNombre)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-val">${fmtNum(c.totalMovimientos)}</div>
        </div>
      `;
    })
    .join('') || `<div class="empty">Sin datos.</div>`;

  const maxInc = Math.max(1, ...topInc.map((c) => c.incidentesTotal));
  const incBars = topInc
    .map((c) => {
      const pct = Math.max(6, Math.round((c.incidentesTotal / maxInc) * 100));
      return `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(c.clienteNombre)}</div>
          <div class="bar-track"><div class="bar-fill danger" style="width:${pct}%"></div></div>
          <div class="bar-val">${fmtNum(c.incidentesTotal)}</div>
        </div>
      `;
    })
    .join('') || `<div class="empty">Sin datos.</div>`;

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

  const topEmpRows = (r.porEmpresa ?? []).slice(0, 10)
    .map((e, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td>${escapeHtml(e.empresa)}</td>
        <td class="mono right">${fmtNum(e.totalMovimientos)}</td>
        <td class="mono right">${fmtNum(e.clientesUnicos)}</td>
        <td class="mono right">${fmtNum(e.incidentesTotal)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="5" class="muted">Sin datos.</td></tr>`;

  return `
    <html>
    <head><style>${baseCss()}</style></head>
    <body>
      <div class="page">
        <div class="hero">
          <div>
            <div class="pill">CEO · Tráfico por Cliente</div>
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
            <div class="label">Incidentes</div>
            <div class="value">${fmtNum(k.totalIncidentes)}</div>
            <div class="sub">${fmtNum(k.movimientosConIncidente)} movs · ${fmtNum(k.movimientosConIncidentePct)}%</div>
          </div>
          <div class="kpi">
            <div class="label">Cancelados con incidente</div>
            <div class="value">${fmtNum(k.canceladosConIncidente)}</div>
            <div class="sub">Cancelados totales: ${fmtNum(k.cancelados)}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">${chartHour}</div>
          <div class="card">${chartDay}</div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3>Top clientes por movimientos</h3>
            ${movBars}
          </div>
          <div class="card">
            <h3>Top clientes por incidentes</h3>
            ${incBars}
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3>Estados de movimientos</h3>
            ${estadoBars}
          </div>
          <div class="card">
            <h3>Empresas con mayor tráfico</h3>
            <table>
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Empresa</th>
                  <th class="right">Mov.</th>
                  <th class="right">Clientes</th>
                  <th class="right">Inc.</th>
                </tr>
              </thead>
              <tbody>${topEmpRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function exportarTraficoClientePDF(reporte: ReporteTraficoCliente): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const etiquetaRaw = reporte.meta?.etiqueta || 'CEO_Trafico_Cliente';
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
