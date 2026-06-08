// reporteria/modelos/cliente-reportes-operativos-pdf.ts
// PDFs para suite de reportes operativos por empresa.

import type {
  CronologiaReporte,
  CumplimientoReporte,
  IncidentesReporte,
  ReportMeta,
  TurnosReporte,
  UsuariosReporte,
  ViasReporte,
} from './cliente-reportes-operativos-model';
import { getBrowser } from './pdf-browser';
import { baseCss, escapeHtml, fmtNum, safeFilename, svgBar, svgLine } from './pdf-helpers';

export type PdfFile = { filename: string; contentType: 'application/pdf'; buffer: Buffer };

function title(meta: ReportMeta, nombre: string) {
  const empresa = escapeHtml(meta.empresaNombre ?? `Empresa ${meta.empresaId}`);
  return `
    <div class="hero">
      <div>
        <div class="pill">Cliente · ${escapeHtml(nombre)}</div>
        <div class="title">${empresa}</div>
        <div class="subtitle">${escapeHtml(meta.periodo)} · ${escapeHtml(meta.periodoLabel)} · ${escapeHtml(meta.rangoTexto)}</div>
      </div>
      <div class="meta">
        <div><b>Base</b>: fecha de solicitud</div>
        <div>TZ: ${escapeHtml(meta.tz)}</div>
      </div>
    </div>
  `;
}

function css() {
  return `
    ${baseCss()}
    @page { margin: 10mm; }
    body { padding: 0; background: #f8fafc; }
    .hero {
      padding: 18px;
      border-radius: 14px;
      color: #fff;
      background: linear-gradient(135deg, #0f766e, #1d4ed8 58%, #7c3aed);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
    }
    .hero .title { font-size: 30px; font-weight: 900; }
    .hero .subtitle, .hero .meta { color: rgba(255,255,255,0.86); }
    .hero .pill { color: #0f172a; border: 0; background: rgba(255,255,255,0.90); }
    .kpi-grid { margin-top: 12px; grid-template-columns: repeat(4, 1fr); }
    .kpi { border-radius: 10px; min-height: 86px; }
    .card { border-radius: 10px; }
    .grid-2.cols { align-items: start; }
    .table-tight th, .table-tight td { font-size: 9px; padding: 4px 3px; }
    .small-note { margin-top: 8px; color: var(--muted); font-size: 10px; }
    .path {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 9px;
      color: #334155;
    }
    .chip {
      display: inline-block;
      padding: 3px 7px;
      border-radius: 999px;
      background: #ecfeff;
      color: #155e75;
      border: 1px solid #a5f3fc;
      font-size: 10px;
      font-weight: 800;
    }
  `;
}

async function renderPdf(html: string, filename: string): Promise<PdfFile> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(30000);
    await page.setViewport({ width: 1600, height: 2200, deviceScaleFactor: 2 });
    await page.emulateMediaType('screen');
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return { filename, contentType: 'application/pdf', buffer: Buffer.from(buffer) };
  } finally {
    await page.close();
  }
}

function wrap(meta: ReportMeta, nombre: string, body: string) {
  return `<html><head><style>${css()}</style></head><body><div class="page">${title(meta, nombre)}${body}</div></body></html>`;
}

export async function exportarClienteViasPDF(r: ViasReporte): Promise<PdfFile> {
  const top = r.vias.slice(0, 12);
  const chart = svgBar({
    title: 'Vias y servicios con mayor uso',
    subtitle: 'Entradas + salidas + servicios',
    labels: top.map((v) => v.via),
    values: top.map((v) => v.totalUsos),
    height: 340,
    fill: '#0F766E',
  });
  const rows = r.vias.slice(0, 30).map((v, idx) => `
    <tr>
      <td class="mono right">${idx + 1}</td>
      <td>${escapeHtml(v.via)}</td>
      <td>${escapeHtml(v.localidad)}</td>
      <td class="mono right">${fmtNum(v.totalUsos)}</td>
      <td class="mono right">${fmtNum(v.entradas)}</td>
      <td class="mono right">${fmtNum(v.salidas)}</td>
      <td class="mono right">${fmtNum(v.pendientes)}</td>
      <td class="mono right">${fmtNum(v.cancelados)}</td>
      <td class="mono right">${fmtNum(v.incidentes)}</td>
    </tr>
  `).join('') || `<tr><td colspan="9" class="muted">Sin datos.</td></tr>`;

  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Movimientos</div><div class="value">${fmtNum(r.resumen.totalMovimientos)}</div><div class="sub">Total</div></div>
      <div class="kpi"><div class="label">Vias y servicios</div><div class="value">${fmtNum(r.resumen.totalVias)}</div><div class="sub">Con actividad</div></div>
      <div class="kpi"><div class="label">Entradas</div><div class="value">${fmtNum(r.resumen.totalEntradas)}</div><div class="sub">Via destino</div></div>
      <div class="kpi"><div class="label">Salidas</div><div class="value">${fmtNum(r.resumen.totalSalidas)}</div><div class="sub">Via origen</div></div>
      <div class="kpi"><div class="label">Pendientes</div><div class="value">${fmtNum(r.resumen.pendientes)}</div><div class="sub">No concluidos/cancelados</div></div>
      <div class="kpi"><div class="label">Cancelados</div><div class="value">${fmtNum(r.resumen.cancelados)}</div><div class="sub">Del periodo</div></div>
      <div class="kpi"><div class="label">Incidentes</div><div class="value">${fmtNum(r.resumen.incidentes)}</div><div class="sub">Relacionados</div></div>
    </div>
    <div class="grid-2"><div class="card">${chart}</div></div>
    <div class="section-title">Detalle por via</div>
    <div class="card">
      <table class="table-tight">
        <thead><tr><th class="right">#</th><th>Via</th><th>Localidad</th><th class="right">Usos</th><th class="right">Ent.</th><th class="right">Sal.</th><th class="right">Pend.</th><th class="right">Canc.</th><th class="right">Inc.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  return renderPdf(wrap(r.meta, 'Movimientos por vias', body), `Reporte_Vias_${safeFilename(r.meta.empresaNombre ?? 'Empresa')}_${safeFilename(r.meta.rangoTexto)}.pdf`);
}

export async function exportarClienteTurnosPDF(r: TurnosReporte): Promise<PdfFile> {
  const rows = r.turnos.map((t) => `
    <tr>
      <td>${escapeHtml(t.turnoLabel)}</td>
      <td class="mono right">${fmtNum(t.solicitados)}</td>
      <td class="mono right">${fmtNum(t.iniciados)}</td>
      <td class="mono right">${fmtNum(t.finalizados)}</td>
      <td class="mono right">${fmtNum(t.conInicioFinPct)}%</td>
      <td class="mono right">${fmtNum(t.cancelados)}</td>
      <td class="mono right">${fmtNum(t.incidentes)}</td>
    </tr>
  `).join('');
  const body = `
    <div class="section-title">Resumen por turno</div>
    <div class="card">
      <table class="table-tight">
        <thead><tr><th>Turno</th><th class="right">Solic.</th><th class="right">Inic.</th><th class="right">Fin.</th><th class="right">Completos</th><th class="right">Canc.</th><th class="right">Inc.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  return renderPdf(wrap(r.meta, 'Reporte por turnos', body), `Reporte_Turnos_${safeFilename(r.meta.empresaNombre ?? 'Empresa')}_${safeFilename(r.meta.rangoTexto)}.pdf`);
}

export async function exportarClienteUsuariosPDF(r: UsuariosReporte): Promise<PdfFile> {
  const solChart = svgBar({
    title: 'Solicitudes por usuario',
    labels: r.solicitantes.slice(0, 10).map((u) => u.nombre),
    values: r.solicitantes.slice(0, 10).map((u) => u.solicitudes),
    height: 320,
    fill: '#7C3AED',
  });
  const solRows = r.solicitantes.slice(0, 25).map((u, idx) => `
    <tr><td class="mono right">${idx + 1}</td><td>${escapeHtml(u.nombre)}</td><td>${escapeHtml(u.rol)}</td><td class="mono right">${fmtNum(u.solicitudes)}</td><td class="mono right">${fmtNum(u.finalizados)}</td><td class="mono right">${fmtNum(u.cancelaciones)}</td><td class="mono right">${fmtNum(u.incidentes)}</td><td class="mono right">${fmtNum(u.turnos.T1)}</td><td class="mono right">${fmtNum(u.turnos.T2)}</td><td class="mono right">${fmtNum(u.turnos.T3)}</td></tr>
  `).join('') || `<tr><td colspan="10" class="muted">Sin datos.</td></tr>`;
  const actRows = r.actividadPorDia.slice(0, 35).map((d) => `
    <tr><td class="mono">${escapeHtml(d.fecha)}</td><td>${escapeHtml(d.diaSemana)}</td><td class="mono right">${fmtNum(d.solicitudes)}</td><td class="mono right">${fmtNum(d.atendidos)}</td><td class="mono right">${fmtNum(d.finalizados)}</td><td class="mono right">${fmtNum(d.cancelaciones)}</td></tr>
  `).join('') || `<tr><td colspan="6" class="muted">Sin datos.</td></tr>`;

  const body = `
    <div class="grid-2"><div class="card">${solChart}</div></div>
    <div class="page break">
      <div class="section-title">Usuarios solicitantes</div>
      <div class="card"><table class="table-tight"><thead><tr><th class="right">#</th><th>Usuario</th><th>Rol</th><th class="right">Solic.</th><th class="right">Fin.</th><th class="right">Canc.</th><th class="right">Inc.</th><th class="right">T1</th><th class="right">T2</th><th class="right">T3</th></tr></thead><tbody>${solRows}</tbody></table></div>
      <div class="section-title">Actividad por dia</div>
      <div class="card"><table><thead><tr><th>Fecha</th><th>Dia</th><th class="right">Solic.</th><th class="right">Atend.</th><th class="right">Fin.</th><th class="right">Canc.</th></tr></thead><tbody>${actRows}</tbody></table></div>
    </div>
  `;
  return renderPdf(wrap(r.meta, 'Comportamiento de usuarios', body), `Reporte_Usuarios_${safeFilename(r.meta.empresaNombre ?? 'Empresa')}_${safeFilename(r.meta.rangoTexto)}.pdf`);
}

export async function exportarClienteCumplimientoPDF(r: CumplimientoReporte): Promise<PdfFile> {
  const estadoChart = svgBar({
    title: 'Estados del periodo',
    labels: Object.keys(r.estados),
    values: Object.values(r.estados),
    height: 340,
    fill: '#0F766E',
  });
  const locoRows = r.porLocomotora.slice(0, 25).map((l, idx) => `
    <tr><td class="mono right">${idx + 1}</td><td class="mono">L-${escapeHtml(l.locomotiveNumber)}</td><td class="mono right">${fmtNum(l.totalMovimientos)}</td><td class="mono right">${fmtNum(l.concluidos)}</td><td class="mono right">${fmtNum(l.pendientes)}</td><td class="mono right">${fmtNum(l.cancelados)}</td><td class="mono right">${fmtNum(l.incidentes)}</td></tr>
  `).join('') || `<tr><td colspan="7" class="muted">Sin datos.</td></tr>`;
  const turnoRows = r.porTurno.map((t) => `
    <tr><td>${escapeHtml(t.turnoLabel)}</td><td class="mono right">${fmtNum(t.solicitados)}</td><td class="mono right">${fmtNum(t.finalizados)}</td><td class="mono right">${fmtNum(t.conInicioFinPct)}%</td><td class="mono right">${fmtNum(t.incidentes)}</td></tr>
  `).join('');
  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Movimientos</div><div class="value">${fmtNum(r.resumen.totalMovimientos)}</div><div class="sub">Total</div></div>
      <div class="kpi"><div class="label">Terminados</div><div class="value">${fmtNum(r.resumen.terminadosCorrectamente)}</div><div class="sub">Sin incidente: ${fmtNum(r.resumen.concluidosSinIncidente)}</div></div>
      <div class="kpi"><div class="label">Pendientes</div><div class="value">${fmtNum(r.resumen.pendientes)}</div><div class="sub">Activos</div></div>
      <div class="kpi"><div class="label">Cancelados</div><div class="value">${fmtNum(r.resumen.cancelados)}</div><div class="sub">Del periodo</div></div>
      <div class="kpi"><div class="label">Completos</div><div class="value">${fmtNum(r.resumen.conInicioFinPct)}%</div><div class="sub">Con registro completo</div></div>
      <div class="kpi"><div class="label">Estados</div><div class="value">${fmtNum(Object.values(r.estados).reduce((acc, n) => acc + Number(n), 0))}</div><div class="sub">Movimientos clasificados</div></div>
    </div>
    <div class="grid-2"><div class="card">${estadoChart}</div></div>
    <div class="grid-2 cols">
      <div class="card"><h3>Por turno</h3><table><thead><tr><th>Turno</th><th class="right">Total</th><th class="right">Fin.</th><th class="right">Completos</th><th class="right">Inc.</th></tr></thead><tbody>${turnoRows}</tbody></table></div>
      <div class="card"><h3>Por locomotora</h3><table class="table-tight"><thead><tr><th class="right">#</th><th>Loc.</th><th class="right">Total</th><th class="right">Conc.</th><th class="right">Pend.</th><th class="right">Canc.</th><th class="right">Inc.</th></tr></thead><tbody>${locoRows}</tbody></table></div>
    </div>
  `;
  return renderPdf(wrap(r.meta, 'Reporte de cumplimiento', body), `Reporte_Cumplimiento_${safeFilename(r.meta.empresaNombre ?? 'Empresa')}_${safeFilename(r.meta.rangoTexto)}.pdf`);
}

export async function exportarClienteIncidentesPDF(r: IncidentesReporte): Promise<PdfFile> {
  const locoChart = svgBar({
    title: 'Incidentes por locomotora',
    labels: r.porLocomotora.slice(0, 10).map((l) => `L-${l.locomotiveNumber}`),
    values: r.porLocomotora.slice(0, 10).map((l) => l.incidentes),
    height: 320,
    fill: '#EF4444',
  });
  const viaChart = svgBar({
    title: 'Incidentes por via',
    labels: r.porVia.slice(0, 10).map((v) => v.via),
    values: r.porVia.slice(0, 10).map((v) => v.incidentes),
    height: 320,
    fill: '#EA580C',
  });
  const turnoRows = r.porTurno.map((t) => `
    <tr><td>${escapeHtml(t.turnoLabel)}</td><td class="mono right">${fmtNum(t.incidentes)}</td><td class="mono right">${fmtNum(t.movimientos)}</td><td class="mono right">${fmtNum(t.cancelacionesRelacionadas)}</td></tr>
  `).join('');
  const detalleRows = r.detalle.slice(0, 80).map((i) => `
    <tr><td class="mono right">${fmtNum(i.incidenteId)}</td><td class="mono right">${fmtNum(i.movimientoId)}</td><td class="mono">L-${escapeHtml(i.locomotiveNumber)}</td><td>${escapeHtml(i.estadoIncidente)}</td><td>${escapeHtml(i.estadoMovimiento)}</td><td class="mono">${escapeHtml(i.fechaIncidenteMX.slice(0, 10))}</td><td>${escapeHtml(i.viaOrigen ?? '—')}</td><td>${escapeHtml(i.viaDestino ?? '—')}</td><td>${escapeHtml(i.turnoLabel)}</td><td>${escapeHtml(i.usuario ?? '—')}</td></tr>
  `).join('') || `<tr><td colspan="10" class="muted">Sin datos.</td></tr>`;
  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Incidentes</div><div class="value">${fmtNum(r.resumen.totalIncidentes)}</div><div class="sub">Total</div></div>
      <div class="kpi"><div class="label">Mov. con incidente</div><div class="value">${fmtNum(r.resumen.movimientosConIncidente)}</div><div class="sub">Relacionados</div></div>
      <div class="kpi"><div class="label">Abiertos</div><div class="value">${fmtNum(r.resumen.incidentesAbiertos)}</div><div class="sub">Pendientes</div></div>
      <div class="kpi"><div class="label">Canc. relacionadas</div><div class="value">${fmtNum(r.resumen.cancelacionesRelacionadas)}</div><div class="sub">Cancelado + incidente</div></div>
    </div>
    <div class="grid-2 cols"><div class="card">${locoChart}</div><div class="card">${viaChart}</div></div>
    <div class="grid-2 cols">
      <div class="card"><h3>Por turno</h3><table><thead><tr><th>Turno</th><th class="right">Inc.</th><th class="right">Mov.</th><th class="right">Canc. rel.</th></tr></thead><tbody>${turnoRows}</tbody></table></div>
      <div class="card"><h3>Detalle</h3><table class="table-tight"><thead><tr><th class="right">Inc.</th><th class="right">Mov.</th><th>Loc.</th><th>Inc.</th><th>Mov.</th><th>Fecha</th><th>Origen</th><th>Destino</th><th>Turno</th><th>Usuario</th></tr></thead><tbody>${detalleRows}</tbody></table><div class="small-note">Detalle incluido: ${fmtNum(r.detalleMeta.incluidos)} de ${fmtNum(r.detalleMeta.totalIncidentes)}.</div></div>
    </div>
  `;
  return renderPdf(wrap(r.meta, 'Incidentes', body), `Reporte_Incidentes_${safeFilename(r.meta.empresaNombre ?? 'Empresa')}_${safeFilename(r.meta.rangoTexto)}.pdf`);
}

export async function exportarClienteCronologiaPDF(r: CronologiaReporte): Promise<PdfFile> {
  const rows = r.movimientos.map((m) => `
    <tr>
      <td class="mono right">${fmtNum(m.id)}</td>
      <td class="mono">L-${escapeHtml(m.locomotiveNumber)}</td>
      <td>${escapeHtml(m.estadoActual)}</td>
      <td>${escapeHtml(m.localidad)}</td>
      <td>${escapeHtml(m.viaOrigen ?? '—')}</td>
      <td>${escapeHtml(m.viaDestino ?? '—')}</td>
      <td>${escapeHtml(m.servicio)}</td>
      <td>${escapeHtml(m.prioridad)}</td>
      <td>${escapeHtml(m.solicitadoPor)}</td>
      <td>${escapeHtml(m.operador ?? '—')}</td>
      <td class="mono">${escapeHtml(m.fechaSolicitud)}</td>
      <td class="mono">${escapeHtml(m.fechaInicio ?? '—')}</td>
      <td class="mono">${escapeHtml(m.fechaFin ?? '—')}</td>
      <td class="path">${escapeHtml(m.linea.join(' -> '))}</td>
      <td class="mono right">${fmtNum(m.incidentes)}</td>
    </tr>
  `).join('') || `<tr><td colspan="15" class="muted">Sin datos.</td></tr>`;

  const concluidos = r.movimientos.filter((m) => m.estadoActual === 'CONCLUIDO').length;
  const cancelados = r.movimientos.filter((m) => m.estadoActual === 'CANCELADO').length;
  const body = `
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Movimientos</div><div class="value">${fmtNum(r.detalleMeta.totalMovimientos)}</div><div class="sub">Total del periodo</div></div>
      <div class="kpi"><div class="label">Pagina</div><div class="value">${fmtNum(r.detalleMeta.page)} / ${fmtNum(r.detalleMeta.totalPages)}</div><div class="sub">${fmtNum(r.detalleMeta.from)}-${fmtNum(r.detalleMeta.to)}</div></div>
      <div class="kpi"><div class="label">Concluidos</div><div class="value">${fmtNum(concluidos)}</div><div class="sub">Estado actual</div></div>
      <div class="kpi"><div class="label">Cancelados</div><div class="value">${fmtNum(cancelados)}</div><div class="sub">Estado actual</div></div>
    </div>
    <div class="section-title">Cronologia de movimientos</div>
    <div class="card">
      <table class="table-tight">
        <thead><tr><th class="right">ID</th><th>Loc.</th><th>Estado</th><th>Localidad</th><th>Origen</th><th>Destino</th><th>Servicio</th><th>Prior.</th><th>Solicito</th><th>Operador</th><th>Solicitud</th><th>Inicio</th><th>Fin</th><th>Linea</th><th class="right">Inc.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  return renderPdf(wrap(r.meta, 'Cronologia de movimientos', body), `Reporte_Cronologia_${safeFilename(r.meta.empresaNombre ?? 'Empresa')}_${safeFilename(r.meta.rangoTexto)}.pdf`);
}
