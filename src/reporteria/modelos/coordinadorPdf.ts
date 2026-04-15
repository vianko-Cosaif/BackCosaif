// reporteria/modelos/coordinadorPdf.ts
// PDF COORDINADOR: volumen e incidentes sin tiempos ni roles

import type { ReporteCoordinador } from './coordinador-model';
import { getBrowser } from './pdf-browser';
import { baseCss, escapeHtml, fmtNum, safeFilename, svgBar, svgLine } from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function buildHtml(r: ReporteCoordinador) {
  const k = r.kpis;
  const meta = r.meta;

  const etiqueta = escapeHtml(String(meta.etiqueta ?? 'COORDINADOR').replace(/^CEO_/, 'COORDINADOR '));
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

  const empRows = (r.topEmpresas ?? [])
    .map((e, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td>${escapeHtml(e.empresa)}</td>
        <td class="mono right">${fmtNum(e.totalMovimientos)}</td>
        <td class="mono right">${fmtNum(e.incidentesTotal)}</td>
        <td class="mono right">${fmtNum(e.incidentesPct)}%</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="5" class="muted">Sin datos.</td></tr>`;

  const locoRows = (r.topLocomotoras ?? [])
    .map((l, idx) => `
      <tr>
        <td class="mono right">${idx + 1}</td>
        <td class="mono">L-${escapeHtml(l.locomotiveNumber)}</td>
        <td class="mono right">${fmtNum(l.totalMovimientos)}</td>
        <td class="mono right">${fmtNum(l.incidentesTotal)}</td>
      </tr>
    `)
    .join('') || `<tr><td colspan="4" class="muted">Sin datos.</td></tr>`;

  const detailCards = (r.movimientosDetalle ?? [])
    .map((m) => {
      const incs = (m.incidentes ?? [])
        .map((i) => {
          const imgs = (i.imagenUrls ?? []).slice(0, 4).map((u) => `<span class="mono">${escapeHtml(u)}</span>`).join('<br/>');
          return `
            <li>
              <b>#${i.id}</b> · ${escapeHtml(i.estado)} · ${escapeHtml(i.descripcion)}
              <div class="muted">Inicio: ${escapeHtml(i.fechaInicioMX)} · Fin: ${escapeHtml(i.fechaFinMX ?? '—')}</div>
              ${imgs ? `<div class="muted">Imgs:<br/>${imgs}</div>` : '<div class="muted">Imgs: —</div>'}
            </li>
          `;
        })
        .join('') || '<li class="muted">Sin incidentes</li>';

      const tiempos = `S→I ${m.minSolicitudAInicio ?? '—'}m · I→F ${m.minInicioAFin ?? '—'}m · S→F ${m.minSolicitudAFin ?? '—'}m`;

      return `
        <div class="card compact">
          <div><b>#${m.id}</b> · L-${escapeHtml(m.locomotiveNumber)} · ${escapeHtml(m.estado)}</div>
          <div class="muted">Solicita: ${escapeHtml(m.solicitadoPor?.nombre ?? '—')} · Operador: ${escapeHtml(m.operador?.nombre ?? '—')} · Cliente: ${escapeHtml(m.cliente?.nombre ?? '—')}</div>
          <div class="muted">Creado: ${escapeHtml(m.fechaCreacionMX)} · Actualizado: ${escapeHtml(m.fechaActualizacionMX)}</div>
          <div class="muted">Solicitud: ${escapeHtml(m.fechaSolicitudMX)} · Inicio: ${escapeHtml(m.fechaInicioMX ?? '—')} · Fin: ${escapeHtml(m.fechaFinMX ?? '—')}</div>
          <div class="muted">Tiempos: ${escapeHtml(tiempos)}</div>
          <div class="muted">Vía: ${escapeHtml(m.viaOrigen ?? '—')} → ${escapeHtml(m.viaDestino ?? '—')} · Tipo: ${escapeHtml(m.tipoMovimiento ?? '—')} · Prioridad: ${escapeHtml(m.prioridad ?? '—')}</div>
          <div class="muted">Comentarios: ${escapeHtml(m.comentarios ?? '—')}</div>
          <div class="section-title" style="margin-top:8px;">Incidentes</div>
          <ul>${incs}</ul>
        </div>
      `;
    })
    .join('') || `<div class="empty">Sin movimientos.</div>`;

  const cronologiaBlocks = (r.cronologiaCierres ?? [])
    .map((dia) => {
      const items = (dia.movimientos ?? [])
        .map((m) => `
          <div class="card compact">
            <div><b>${m.ordenDia}</b> · #${m.id} · L-${escapeHtml(m.locomotiveNumber)} · ${escapeHtml(m.estado)}</div>
            <div class="muted">Empresa: ${escapeHtml(m.empresa ?? '—')} · Localidad: ${escapeHtml(m.localidad ?? '—')}</div>
            <div class="muted">Fin: ${escapeHtml(m.fechaFinMX ?? '—')} · Solicita: ${escapeHtml(m.solicitadoPor?.nombre ?? '—')}</div>
            <div class="muted">Operador: ${escapeHtml(m.operador?.nombre ?? '—')} · Cliente: ${escapeHtml(m.cliente?.nombre ?? '—')}</div>
            <div class="muted">Supervisor: ${escapeHtml(m.supervisor?.nombre ?? '—')} · Coordinador: ${escapeHtml(m.coordinador?.nombre ?? '—')}</div>
            <div class="muted">Vía: ${escapeHtml(m.viaOrigen ?? '—')} → ${escapeHtml(m.viaDestino ?? '—')}</div>
            <div class="muted">Comentarios: ${escapeHtml(m.comentarios ?? '—')}</div>
          </div>
        `)
        .join('') || `<div class="empty">Sin movimientos.</div>`;

      return `
        <div class="section-title">${escapeHtml(dia.fecha)}</div>
        ${items}
      `;
    })
    .join('') || `<div class="empty">Sin cierres.</div>`;

  const cronologiaMovBlocks = (r.cronologiaMovimientos ?? [])
    .map((dia) => {
      const items = (dia.movimientos ?? [])
        .map((m) => `
          <div class="card compact">
            <div><b>${m.ordenDia}</b> · #${m.id} · L-${escapeHtml(m.locomotiveNumber)} · ${escapeHtml(m.estado)}</div>
            <div class="muted">Empresa: ${escapeHtml(m.empresa ?? '—')} · Localidad: ${escapeHtml(m.localidad ?? '—')}</div>
            <div class="muted">Solicitud: ${escapeHtml(m.fechaSolicitudMX)} · Fin: ${escapeHtml(m.fechaFinMX ?? '—')}</div>
            <div class="muted">Solicita: ${escapeHtml(m.solicitadoPor?.nombre ?? '—')} · Operador: ${escapeHtml(m.operador?.nombre ?? '—')} · Cliente: ${escapeHtml(m.cliente?.nombre ?? '—')}</div>
            <div class="muted">Supervisor: ${escapeHtml(m.supervisor?.nombre ?? '—')} · Coordinador: ${escapeHtml(m.coordinador?.nombre ?? '—')}</div>
            <div class="muted">Vía: ${escapeHtml(m.viaOrigen ?? '—')} → ${escapeHtml(m.viaDestino ?? '—')}</div>
            <div class="muted">Comentarios: ${escapeHtml(m.comentarios ?? '—')}</div>
          </div>
        `)
        .join('') || `<div class="empty">Sin movimientos.</div>`;

      return `
        <div class="section-title">${escapeHtml(dia.fecha)}</div>
        ${items}
      `;
    })
    .join('') || `<div class="empty">Sin movimientos.</div>`;

  return `
    <html>
    <head><style>${baseCss()}</style></head>
    <body>
      <div class="page">
        <div class="hero">
          <div>
            <div class="pill">Coordinador · Reporte Operativo</div>
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
            <div class="label">Con fin</div>
            <div class="value">${fmtNum(k.totalConFin)}</div>
            <div class="sub">Sin fin: ${fmtNum(k.totalSinFin)}</div>
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
        </div>

        <div class="grid-2">
          <div class="card">${chartHour}</div>
          <div class="card">${chartDay}</div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3>Estados de movimientos</h3>
            ${estadoBars}
          </div>
          <div class="card">
            <h3>Empresas con más movimientos</h3>
            <table>
              <thead>
                <tr>
                  <th class="right">#</th>
                  <th>Empresa</th>
                  <th class="right">Mov.</th>
                  <th class="right">Inc.</th>
                  <th class="right">Inc.%</th>
                </tr>
              </thead>
              <tbody>${empRows}</tbody>
            </table>
          </div>
        </div>

        <div class="section-title">Resumen por locomotora</div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th class="right">#</th>
                <th>Locomotora</th>
                <th class="right">Mov.</th>
                <th class="right">Inc.</th>
              </tr>
            </thead>
            <tbody>${locoRows}</tbody>
          </table>
        </div>
      </div>

      <div class="page break">
        <div class="section-title">Detalle de movimientos</div>
        ${detailCards}
      </div>

      <div class="page break">
        <div class="section-title">Cronología de cierres (por día)</div>
        ${cronologiaBlocks}
      </div>

      <div class="page break">
        <div class="section-title">Cronología por solicitud (por día)</div>
        ${cronologiaMovBlocks}
      </div>
    </body>
    </html>
  `;
}

export async function exportarCoordinadorPDF(reporte: ReporteCoordinador): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const etiquetaRaw = reporte.meta?.etiqueta || 'COORDINADOR';
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
