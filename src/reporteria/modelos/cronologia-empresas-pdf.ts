// reporteria/modelos/cronologia-empresas-pdf.ts
// PDF: Cronologia por empresa con siguiente movimiento global

import type { ReporteCronologiaEmpresas } from './cronologia-empresas-model';
import { getBrowser } from './pdf-browser';
import { baseCss, escapeHtml, fmtNum, safeFilename } from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function buildHtml(r: ReporteCronologiaEmpresas) {
  const meta = r.meta;
  const etiqueta = escapeHtml(String(meta.etiqueta ?? 'CRONOLOGIA_EMPRESAS').replace(/^CEO_/, '')); 
  const periodo = escapeHtml(meta.periodo ?? '');
  const tz = escapeHtml(meta.tz ?? 'America/Mexico_City');
  const rangoDesde = escapeHtml(meta.rangoLocal?.desde ?? meta.rangoUTC?.desde ?? '');
  const rangoHasta = escapeHtml(meta.rangoLocal?.hastaExclusivo ?? meta.rangoUTC?.hastaExclusivo ?? '');

  const empresasBlocks = (r.empresas ?? [])
    .map((emp) => {
      const dias = emp.cronologia
        .map((dia) => {
          const rows = dia.movimientos
            .map((m) => `
              <tr>
                <td class="mono right">${m.ordenDia}</td>
                <td class="mono right">${m.id}</td>
                <td class="mono">L-${escapeHtml(m.locomotiveNumber)}</td>
                <td>${escapeHtml(m.estado)}</td>
                <td class="mono">${escapeHtml(m.fechaSolicitudMX)}</td>
                <td class="mono">${escapeHtml(m.fechaFinMX ?? '—')}</td>
                <td>${escapeHtml(m.solicitadoPor?.nombre ?? '—')}</td>
                <td>${escapeHtml(m.operador?.nombre ?? '—')}</td>
                <td>${escapeHtml(m.supervisor?.nombre ?? '—')}</td>
                <td>${escapeHtml(m.coordinador?.nombre ?? '—')}</td>
                <td>${escapeHtml(m.cliente?.nombre ?? '—')}</td>
                <td>${escapeHtml(m.viaOrigen ?? '—')} → ${escapeHtml(m.viaDestino ?? '—')}</td>
                <td>${m.siguiente ? `${escapeHtml(m.siguiente.empresa)} · #${m.siguiente.id} · L-${escapeHtml(m.siguiente.locomotiveNumber)}` : '—'}</td>
              </tr>
            `)
            .join('') || `<tr><td colspan="13" class="muted">Sin datos.</td></tr>`;

          return `
            <div class="section-title">${escapeHtml(dia.fecha)}</div>
            <div class="card">
              <table class="table-tight">
                <thead>
                  <tr>
                    <th class="right">#</th>
                    <th class="right">ID</th>
                    <th>Loc.</th>
                    <th>Estado</th>
                    <th>Solicitud</th>
                    <th>Fin</th>
                    <th>Solicita</th>
                    <th>Operador</th>
                    <th>Supervisor</th>
                    <th>Coord.</th>
                    <th>Cliente</th>
                    <th>Vía</th>
                    <th>Siguiente</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        })
        .join('') || `<div class="empty">Sin movimientos.</div>`;

      return `
        <div class="page break">
          <div class="section-title">Empresa: ${escapeHtml(emp.empresa)} · Movimientos: ${fmtNum(emp.totalMovimientos)}</div>
          ${dias}
        </div>
      `;
    })
    .join('') || '<div class="empty">Sin empresas.</div>';

  return `
    <html>
    <head><style>${baseCss()}</style></head>
    <body>
      <div class="page">
        <div class="hero">
          <div>
            <div class="pill">Cronología por empresa</div>
            <div class="title">${etiqueta}${periodo ? ` · ${periodo}` : ''}</div>
            <div class="subtitle">TZ: ${tz}</div>
          </div>
          <div class="meta">
            <div><b>Rango (MX)</b></div>
            <div>${rangoDesde} → ${rangoHasta}</div>
          </div>
        </div>
        <div class="card">
          <div class="muted">Este reporte lista movimientos por empresa en orden cronológico (fecha de solicitud) y muestra el movimiento siguiente global.</div>
        </div>
      </div>
      ${empresasBlocks}
    </body>
    </html>
  `;
}

export async function exportarCronologiaEmpresasPDF(reporte: ReporteCronologiaEmpresas): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const etiquetaRaw = reporte.meta?.etiqueta || 'CRONOLOGIA_EMPRESAS';
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
