// reporteria/modelos/ceo-comparativo-pdf.ts
// PDF CEO: Ejecutivo Comparativo

import type { ReporteComparativo } from './ceo-comparativo-model';
import { getBrowser } from './pdf-browser';
import { baseCss, escapeHtml, fmtNum, safeFilename, svgBar } from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function deltaBadge(delta: number, pct: number) {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${fmtNum(delta)} (${sign}${fmtNum(pct)}%)`;
}

function buildHtml(r: ReporteComparativo) {
  const meta = r.meta;
  const etiqueta = escapeHtml(String(meta.actual?.etiqueta ?? 'CEO Comparativo').replace(/^CEO_/, 'CEO '));
  const periodo = escapeHtml(meta.periodo ?? '');
  const tz = escapeHtml(meta.tz ?? 'America/Mexico_City');
  const rangoActual = `${escapeHtml(meta.actual?.rangoLocal?.desde ?? '')} → ${escapeHtml(meta.actual?.rangoLocal?.hastaExclusivo ?? '')}`;
  const rangoPrev = `${escapeHtml(meta.anterior?.rangoLocal?.desde ?? '')} → ${escapeHtml(meta.anterior?.rangoLocal?.hastaExclusivo ?? '')}`;

  const resumenRows = [
    ['Movimientos', r.resumen.totalMovimientos],
    ['Cumplimiento OK%', r.resumen.okPct],
    ['Críticos', r.resumen.criticosTotal],
    ['Incidentes', r.resumen.incidentesTotal],
    ['Cancelados', r.resumen.cancelados],
    ['Índice operativo', r.resumen.indiceOperativo],
    ['Backlog prom (min)', r.resumen.backlogProm],
  ]
    .map(([label, m]) => `
      <tr>
        <td>${escapeHtml(label as string)}</td>
        <td class="mono right">${fmtNum((m as any).actual)}</td>
        <td class="mono right">${fmtNum((m as any).anterior)}</td>
        <td class="mono right">${escapeHtml(deltaBadge((m as any).delta, (m as any).deltaPct))}</td>
      </tr>
    `)
    .join('');

  const chartActual = svgBar({
    title: 'Rangos ejecución · Actual',
    subtitle: etiqueta,
    labels: r.actual.ejecucionBuckets.map((b) => b.label),
    values: r.actual.ejecucionBuckets.map((b) => b.movimientos),
    height: 320,
    fill: '#2563EB',
  });
  const chartPrev = svgBar({
    title: 'Rangos ejecución · Anterior',
    subtitle: 'Periodo anterior',
    labels: r.anterior.ejecucionBuckets.map((b) => b.label),
    values: r.anterior.ejecucionBuckets.map((b) => b.movimientos),
    height: 320,
    fill: '#94A3B8',
  });

  const empRows = (r.cambiosEmpresas ?? [])
    .map((e, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td>${escapeHtml(e.empresa)}</td>
        <td class="mono right">${fmtNum(e.actual)}</td>
        <td class="mono right">${fmtNum(e.anterior)}</td>
        <td class="mono right">${escapeHtml(deltaBadge(e.delta, e.deltaPct))}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="5" class="muted">Sin datos.</td></tr>`;

  const cliRows = (r.cambiosClientes ?? [])
    .map((c, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td>${escapeHtml(c.clienteNombre)}</td>
        <td class="mono right">${fmtNum(c.actual)}</td>
        <td class="mono right">${fmtNum(c.anterior)}</td>
        <td class="mono right">${escapeHtml(deltaBadge(c.delta, c.deltaPct))}</td>
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
            <div class="pill">CEO · Comparativo Ejecutivo</div>
            <div class="title">${etiqueta}${periodo ? ` · ${periodo}` : ''}</div>
            <div class="subtitle">TZ: ${tz}</div>
          </div>
          <div class="meta">
            <div><b>Actual</b></div>
            <div>${rangoActual}</div>
            <div style="margin-top:6px"><b>Anterior</b></div>
            <div>${rangoPrev}</div>
          </div>
        </div>

        <div class="section-title">Resumen comparativo</div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>Métrica</th>
                <th class="right">Actual</th>
                <th class="right">Anterior</th>
                <th class="right">Delta</th>
              </tr>
            </thead>
            <tbody>${resumenRows}</tbody>
          </table>
        </div>

        <div class="grid-2">
          <div class="card">${chartActual}</div>
          <div class="card">${chartPrev}</div>
        </div>

        <div class="grid-2 cols">
          <div class="card">
            <h3>Cambios por empresa</h3>
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Empresa</th>
                  <th class="right">Actual</th>
                  <th class="right">Anterior</th>
                  <th class="right">Delta</th>
                </tr>
              </thead>
              <tbody>${empRows}</tbody>
            </table>
          </div>
          <div class="card">
            <h3>Cambios por cliente</h3>
            <table class="table-tight">
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Cliente</th>
                  <th class="right">Actual</th>
                  <th class="right">Anterior</th>
                  <th class="right">Delta</th>
                </tr>
              </thead>
              <tbody>${cliRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function exportarComparativoPDF(reporte: ReporteComparativo): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const etiquetaRaw = reporte.meta?.actual?.etiqueta || 'CEO_Comparativo';
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
