// reporteria/modelos/empresa-locomotoras-pdf.ts
// PDF Empresa: Concentrado locomotoras + detalle movimientos

import type { ReporteEmpresaLocomotoras } from './empresa-locomotoras-model';
import { getBrowser } from './pdf-browser';
import { baseCss, escapeHtml, fmtNum, safeFilename } from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function buildHtml(r: ReporteEmpresaLocomotoras) {
  const meta = r.meta;
  const empresa = escapeHtml(meta.empresaNombre ?? `Empresa ${meta.empresaId}`);
  const rangoDesde = escapeHtml(meta.rangoLocal?.desde ?? '');
  const rangoHasta = escapeHtml(meta.rangoLocal?.hastaExclusivo ?? '');

  const estadoBars = Object.entries(r.resumen.estadosGeneral)
    .map(([estado, total]) => `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(estado)}</div>
        <div class="bar-track"><div class="bar-fill warn" style="width:${Math.max(6, total ? 100 : 6)}%"></div></div>
        <div class="bar-val">${fmtNum(total)}</div>
      </div>
    `)
    .join('') || `<div class="empty">Sin datos.</div>`;

  const locoRows = (r.locomotoras ?? [])
    .map((l, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td class="mono">L-${escapeHtml(l.locomotiveNumber)}</td>
        <td class="mono right">${fmtNum(l.totalMovimientos)}</td>
        <td class="mono right">${fmtNum(l.estados.CONCLUIDO)}</td>
        <td class="mono right">${fmtNum(l.estados.CANCELADO)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="5" class="muted">Sin datos.</td></tr>`;

  const movRows = (r.movimientos ?? [])
    .map((m) => `
      <tr>
        <td class="mono right">${fmtNum(m.id)}</td>
        <td class="mono">L-${escapeHtml(m.locomotiveNumber)}</td>
        <td>${escapeHtml(m.estado)}</td>
        <td>${escapeHtml(m.viaOrigen ?? '—')}</td>
        <td>${escapeHtml(m.viaDestino ?? '—')}</td>
        <td>${escapeHtml(m.descripcion)}</td>
        <td class="mono">${escapeHtml(m.fechaSolicitudMX)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="7" class="muted">Sin datos.</td></tr>`;

  return `
    <html>
    <head><style>${baseCss()}</style></head>
    <body>
      <div class="page">
        <div class="hero">
          <div>
            <div class="pill">Empresa · Concentrado de Locomotoras</div>
            <div class="title">${empresa}</div>
            <div class="subtitle">Rango: ${rangoDesde} → ${rangoHasta}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi">
            <div class="label">Movimientos</div>
            <div class="value">${fmtNum(r.resumen.totalMovimientos)}</div>
            <div class="sub">Total del rango</div>
          </div>
          <div class="kpi">
            <div class="label">Locomotoras</div>
            <div class="value">${fmtNum(r.resumen.totalLocomotoras)}</div>
            <div class="sub">Únicas en el rango</div>
          </div>
          <div class="kpi">
            <div class="label">Concluidos</div>
            <div class="value">${fmtNum(r.resumen.estadosGeneral.CONCLUIDO)}</div>
            <div class="sub">Cancelados: ${fmtNum(r.resumen.estadosGeneral.CANCELADO)}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3>Estados de movimientos</h3>
            ${estadoBars}
          </div>
          <div class="card">
            <h3>Concentrado por locomotora</h3>
            <table>
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Locomotora</th>
                  <th class="right">Mov.</th>
                  <th class="right">Concl.</th>
                  <th class="right">Canc.</th>
                </tr>
              </thead>
              <tbody>${locoRows}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="page break">
        <div class="section-title">Detalle de movimientos</div>
        <div class="card">
          <table class="table-tight">
            <thead>
              <tr>
                <th class="right">ID</th>
                <th>Loc.</th>
                <th>Estado</th>
                <th>Vía origen</th>
                <th>Vía destino</th>
                <th>Descripción</th>
                <th>Solicitud MX</th>
              </tr>
            </thead>
            <tbody>${movRows}</tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function exportarEmpresaLocomotorasPDF(reporte: ReporteEmpresaLocomotoras): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const filename = `Reporte_${safeFilename(reporte.meta.empresaNombre ?? 'Empresa')}.pdf`;

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
