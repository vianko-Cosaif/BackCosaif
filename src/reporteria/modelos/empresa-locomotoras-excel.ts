// reporteria/modelos/empresa-locomotoras-excel.ts
// Excel para concentrado de locomotoras por empresa.

import ExcelJS from 'exceljs';
import { EmpresaLocomotorasModel, type ReporteEmpresaLocomotoras } from './empresa-locomotoras-model';

export type ExcelFile = {
  filename: string;
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  buffer: Buffer;
};

type ExportFilters = {
  empresaId: number;
  desde: string;
  hasta: string;
  tz?: string;
  localidadId?: number;
  usuarioNombre?: string;
};

const CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const;

function safeFilename(name: string) {
  return String(name || 'Reporte')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function setHeader(ws: ExcelJS.Worksheet, values: string[]) {
  ws.addRow(values);
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  row.alignment = { vertical: 'middle' };
  row.height = 22;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: values.length },
  };
}

function finishSheet(ws: ExcelJS.Worksheet) {
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
  });
}

function addResumenSheet(wb: ExcelJS.Workbook, r: ReporteEmpresaLocomotoras) {
  const ws = wb.addWorksheet('Resumen');
  ws.columns = [
    { width: 28 },
    { width: 34 },
    { width: 18 },
  ];

  ws.addRow(['Reporte', 'Empresa locomotoras']);
  ws.addRow(['Empresa', r.meta.empresaNombre ?? `Empresa ${r.meta.empresaId}`]);
  ws.addRow(['Rango local', `${r.meta.rangoLocal.desde} -> ${r.meta.rangoLocal.hastaExclusivo}`]);
  ws.addRow(['Zona horaria', r.meta.tz]);
  ws.addRow([]);
  ws.addRow(['KPI', 'Valor']);
  ws.addRow(['Total movimientos', r.resumen.totalMovimientos]);
  ws.addRow(['Total locomotoras', r.resumen.totalLocomotoras]);
  ws.addRow(['Concluidos', r.resumen.estadosGeneral.CONCLUIDO]);
  ws.addRow(['Cancelados', r.resumen.estadosGeneral.CANCELADO]);
  ws.addRow([r.resumen.usuarioCliente, r.resumen.totalUsuarioCliente]);
  ws.addRow([]);
  ws.addRow(['Estado', 'General', r.resumen.usuarioCliente]);

  for (const [estado, total] of Object.entries(r.resumen.estadosGeneral)) {
    ws.addRow([
      estado,
      total,
      r.resumen.estadosUsuarioCliente[estado as keyof typeof r.resumen.estadosUsuarioCliente] ?? 0,
    ]);
  }

  ws.getRow(1).font = { bold: true, size: 16 };
  ws.getRow(6).font = { bold: true };
  ws.getRow(13).font = { bold: true };
  finishSheet(ws);
}

function addLocomotorasSheet(wb: ExcelJS.Workbook, r: ReporteEmpresaLocomotoras) {
  const ws = wb.addWorksheet('Locomotoras');
  setHeader(ws, ['Locomotora', 'Movimientos', 'Solicitado', 'En proceso', 'Detenido', 'Espera', 'Concluido', 'Cancelado']);
  ws.columns = [
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];

  for (const l of r.locomotoras) {
    ws.addRow([
      l.locomotiveNumber,
      l.totalMovimientos,
      l.estados.SOLICITADO,
      l.estados.EN_PROCESO,
      l.estados.DETENIDO,
      l.estados.ESPERA,
      l.estados.CONCLUIDO,
      l.estados.CANCELADO,
    ]);
  }
  finishSheet(ws);
}

function addMovimientosSheet(wb: ExcelJS.Workbook, name: string, rows: ReporteEmpresaLocomotoras['movimientos']) {
  const ws = wb.addWorksheet(name);
  setHeader(ws, [
    'ID',
    'Locomotora',
    'Estado',
    'Solicitud MX',
    'Inicio MX',
    'Fin MX',
    'Solicitado por',
    'Cliente',
    'Via origen',
    'Via destino',
    'Descripcion',
    'Tipo',
    'Prioridad',
    'Lavado',
    'Torno',
  ]);
  ws.columns = [
    { width: 12 },
    { width: 14 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 26 },
    { width: 26 },
    { width: 16 },
    { width: 16 },
    { width: 42 },
    { width: 18 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
  ];

  for (const m of rows) {
    ws.addRow([
      m.id,
      m.locomotiveNumber,
      m.estado,
      m.fechaSolicitudMX,
      m.fechaInicioMX ?? '',
      m.fechaFinMX ?? '',
      m.solicitadoPor ?? '',
      m.cliente ?? '',
      m.viaOrigen ?? '',
      m.viaDestino ?? '',
      m.descripcion,
      m.tipoMovimiento ?? '',
      m.prioridad,
      m.lavado ? 'SI' : 'NO',
      m.torno ? 'SI' : 'NO',
    ]);
  }
  finishSheet(ws);
}

export async function exportarEmpresaLocomotorasExcel(filters: ExportFilters): Promise<ExcelFile> {
  const reporte = await EmpresaLocomotorasModel.reporte(filters);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'COSAIF';
  wb.created = new Date();

  addResumenSheet(wb, reporte);
  addLocomotorasSheet(wb, reporte);
  addMovimientosSheet(wb, 'Movimientos', reporte.movimientos);
  addMovimientosSheet(wb, reporte.resumen.usuarioCliente.slice(0, 31), reporte.movimientosUsuarioCliente);

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const empresa = reporte.meta.empresaNombre ?? `Empresa_${reporte.meta.empresaId}`;
  const filename = `Empresa_Locomotoras_${safeFilename(empresa)}_${safeFilename(filters.desde)}_${safeFilename(filters.hasta)}.xlsx`;
  return { filename, contentType: CONTENT_TYPE, buffer };
}

export async function exportarEmpresaLocomotorasUsuarioExcel(filters: ExportFilters): Promise<ExcelFile> {
  const reporte = await EmpresaLocomotorasModel.reporte(filters);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'COSAIF';
  wb.created = new Date();

  const ws = wb.addWorksheet('Resumen');
  ws.columns = [{ width: 28 }, { width: 34 }];
  ws.addRow(['Reporte', 'Movimientos por usuario']);
  ws.addRow(['Empresa', reporte.meta.empresaNombre ?? `Empresa ${reporte.meta.empresaId}`]);
  ws.addRow(['Usuario', reporte.resumen.usuarioCliente]);
  ws.addRow(['Rango local', `${reporte.meta.rangoLocal.desde} -> ${reporte.meta.rangoLocal.hastaExclusivo}`]);
  ws.addRow(['Total movimientos', reporte.resumen.totalUsuarioCliente]);
  ws.addRow(['Concluidos', reporte.resumen.estadosUsuarioCliente.CONCLUIDO]);
  ws.addRow(['Detenidos', reporte.resumen.estadosUsuarioCliente.DETENIDO]);
  ws.addRow(['Cancelados', reporte.resumen.estadosUsuarioCliente.CANCELADO]);
  ws.getRow(1).font = { bold: true, size: 16 };
  finishSheet(ws);

  addMovimientosSheet(wb, 'Movimientos', reporte.movimientosUsuarioCliente);

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const empresa = reporte.meta.empresaNombre ?? `Empresa_${reporte.meta.empresaId}`;
  const usuario = reporte.resumen.usuarioCliente ?? 'Usuario';
  const filename = `Usuario_${safeFilename(usuario)}_${safeFilename(empresa)}_${safeFilename(filters.desde)}_${safeFilename(filters.hasta)}.xlsx`;
  return { filename, contentType: CONTENT_TYPE, buffer };
}
