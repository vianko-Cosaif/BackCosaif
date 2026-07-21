import ExcelJS from 'exceljs';
import sharp from 'sharp';
import {
  ComercialReporteriaModel,
  type ComercialFilters,
  type ComercialReporte,
} from './comercial-model';

export type ComercialExcelSections = {
  resumen: boolean;
  movimientos: boolean;
  empresas: boolean;
  locomotoras: boolean;
  incidentes: boolean;
  torno: boolean;
  lavado: boolean;
};

export type ComercialExcelCharts = {
  estados: boolean;
  tendencia: boolean;
  servicios: boolean;
  empresas: boolean;
};

export type ComercialExcelColumns = Partial<Record<keyof ComercialExcelSections, string[]>>;

export type ComercialExcelOptions = {
  titulo?: string;
  sections: ComercialExcelSections;
  charts: ComercialExcelCharts;
  columns?: ComercialExcelColumns;
};

export type ComercialExcelFile = {
  filename: string;
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  buffer: Buffer;
};

type TableColumn = { header: string; key: string; width?: number };
type ChartDatum = { label: string; value: number; color: string };

const HEADER_FILL = 'FF0F172A';
const HEADER_TEXT = 'FFFFFFFF';
const ACCENT = 'FF0F766E';
const SOFT = 'FFF0FDFA';
const BORDER = 'FFCBD5E1';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeFilename(value: string) {
  return String(value || 'reporte_comercial')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80) || 'reporte_comercial';
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER } },
      left: { style: 'thin', color: { argb: BORDER } },
      bottom: { style: 'thin', color: { argb: BORDER } },
      right: { style: 'thin', color: { argb: BORDER } },
    };
  });
}

function addTableSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: TableColumn[],
  rows: Array<Record<string, unknown>>,
) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ ...column, width: column.width || 16 }));
  rows.forEach((row) => sheet.addRow(row));
  styleHeader(sheet.getRow(1));
  sheet.autoFilter = { from: 'A1', to: `${sheet.getColumn(columns.length).letter}1` };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = 21;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
    });
  });
  return sheet;
}

function selectedColumns(columns: TableColumn[], selected?: string[]) {
  if (!selected?.length) return columns;
  const selectedSet = new Set(selected);
  const filtered = columns.filter((column) => selectedSet.has(column.key));
  return filtered.length ? filtered : columns;
}

function barChartSvg(title: string, data: ChartDatum[]) {
  const width = 900;
  const height = 360;
  const left = 72;
  const right = 28;
  const top = 66;
  const bottom = 74;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const max = Math.max(1, ...data.map((item) => item.value));
  const slot = chartWidth / Math.max(1, data.length);
  const barWidth = Math.min(76, slot * 0.6);

  const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = top + chartHeight - chartHeight * ratio;
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/><text x="${left - 12}" y="${y + 5}" text-anchor="end" font-size="13" fill="#64748b">${Math.round(max * ratio)}</text>`;
  }).join('');

  const bars = data.map((item, index) => {
    const h = Math.max(item.value > 0 ? 3 : 0, (item.value / max) * chartHeight);
    const x = left + slot * index + (slot - barWidth) / 2;
    const y = top + chartHeight - h;
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="8" fill="${item.color}"/><text x="${x + barWidth / 2}" y="${Math.max(top + 14, y - 8)}" text-anchor="middle" font-size="15" font-weight="700" fill="#0f172a">${item.value}</text><text x="${x + barWidth / 2}" y="${top + chartHeight + 28}" text-anchor="middle" font-size="13" fill="#475569">${escapeXml(item.label.slice(0, 18))}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" rx="22" fill="#ffffff"/><text x="${left}" y="36" font-size="22" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>${grid}<line x1="${left}" y1="${top + chartHeight}" x2="${width - right}" y2="${top + chartHeight}" stroke="#94a3b8" stroke-width="1.5"/>${bars}</svg>`;
}

async function addChartImage(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  title: string,
  data: ChartDatum[],
  range: string,
) {
  if (!data.length) return;
  const png = await sharp(Buffer.from(barChartSvg(title, data))).png().toBuffer();
  const imageId = workbook.addImage({ base64: png.toString('base64'), extension: 'png' });
  sheet.addImage(imageId, range);
}

function addKpi(
  sheet: ExcelJS.Worksheet,
  startColumn: number,
  row: number,
  label: string,
  value: number,
  color: string,
) {
  const endColumn = startColumn + 2;
  sheet.mergeCells(row, startColumn, row, endColumn);
  sheet.mergeCells(row + 1, startColumn, row + 2, endColumn);
  const labelCell = sheet.getCell(row, startColumn);
  const valueCell = sheet.getCell(row + 1, startColumn);
  labelCell.value = label;
  labelCell.font = { bold: true, size: 10, color: { argb: 'FF475569' } };
  labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
  valueCell.value = value;
  valueCell.font = { bold: true, size: 22, color: { argb: color } };
  valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
  valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  for (let r = row; r <= row + 2; r += 1) {
    for (let c = startColumn; c <= endColumn; c += 1) {
      sheet.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: BORDER } },
        left: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      };
    }
  }
}

async function buildDashboard(
  workbook: ExcelJS.Workbook,
  reporte: ComercialReporte,
  options: ComercialExcelOptions,
) {
  const sheet = workbook.addWorksheet('Dashboard', { views: [{ showGridLines: false }] });
  for (let column = 1; column <= 16; column += 1) sheet.getColumn(column).width = 12;
  sheet.mergeCells('A1:P2');
  const title = sheet.getCell('A1');
  title.value = options.titulo?.trim() || 'Reporte comercial COSAIF';
  title.font = { bold: true, size: 24, color: { argb: HEADER_TEXT } };
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  sheet.mergeCells('A3:P3');
  const meta = sheet.getCell('A3');
  meta.value = `${reporte.meta.periodo} · ${reporte.meta.rangoLocal.desde.slice(0, 10)} a ${reporte.meta.rangoLocal.hastaExclusivo.slice(0, 10)} · Generado ${new Date().toLocaleString('es-MX')}`;
  meta.font = { size: 11, color: { argb: 'FF475569' } };
  meta.alignment = { vertical: 'middle', indent: 1 };

  if (options.sections.resumen) {
    addKpi(sheet, 1, 5, 'Movimientos concluidos', reporte.concentrado.movimientosConcluidos, ACCENT);
    addKpi(sheet, 5, 5, 'Torneados concluidos', reporte.concentrado.torneadosConcluidos, 'FFD97706');
    addKpi(sheet, 9, 5, 'Lavados concluidos', reporte.concentrado.lavadosConcluidos, 'FF0284C7');
    addKpi(sheet, 13, 5, 'Incidentes', reporte.generales.incidentes, 'FFDC2626');
  }

  const charts: Array<{ title: string; data: ChartDatum[] }> = [];
  if (options.charts.estados) {
    charts.push({
      title: 'Movimientos por estado',
      data: [
        { label: 'Concluidos', value: reporte.generales.concluidos, color: '#059669' },
        { label: 'Detenidos', value: reporte.generales.detenidos, color: '#d97706' },
        { label: 'Cancelados', value: reporte.generales.cancelados, color: '#dc2626' },
        { label: 'Todos', value: reporte.generales.totalMovimientos, color: '#2563eb' },
      ],
    });
  }
  if (options.charts.servicios) {
    charts.push({
      title: 'Servicios concluidos',
      data: [
        { label: 'Torneados', value: reporte.concentrado.torneadosConcluidos, color: '#d97706' },
        { label: 'Lavados', value: reporte.concentrado.lavadosConcluidos, color: '#0891b2' },
      ],
    });
  }
  if (options.charts.empresas) {
    charts.push({
      title: 'Principales empresas',
      data: reporte.empresas.slice(0, 8).map((empresa, index) => ({
        label: empresa.empresa,
        value: empresa.total,
        color: ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#65a30d', '#0891b2', '#475569'][index] || '#0f766e',
      })),
    });
  }
  if (options.charts.tendencia) {
    charts.push({
      title: 'Tendencia de movimientos',
      data: reporte.tendencia.map((bucket) => ({ label: bucket.etiqueta, value: bucket.total, color: '#0f766e' })),
    });
  }

  for (let index = 0; index < charts.length; index += 1) {
    const chartRow = 10 + Math.floor(index / 2) * 18;
    const range = index % 2 === 0
      ? `A${chartRow}:H${chartRow + 15}`
      : `I${chartRow}:P${chartRow + 15}`;
    await addChartImage(workbook, sheet, charts[index].title, charts[index].data, range);
  }

  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

export async function exportarComercialExcel(
  filters: ComercialFilters,
  options: ComercialExcelOptions,
): Promise<ComercialExcelFile> {
  const reporte = await ComercialReporteriaModel.generar(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'COSAIF';
  workbook.lastModifiedBy = 'COSAIF Comercial';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;
  workbook.calcProperties.fullCalcOnLoad = true;

  if (options.sections.resumen || Object.values(options.charts).some(Boolean)) {
    await buildDashboard(workbook, reporte, options);
  }

  if (options.sections.movimientos) {
    addTableSheet(workbook, 'Movimientos', selectedColumns([
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Locomotora', key: 'locomotiveNumber', width: 14 },
      { header: 'Empresa', key: 'empresa', width: 24 },
      { header: 'Localidad', key: 'localidad', width: 20 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Torno', key: 'torno', width: 11 },
      { header: 'Lavado', key: 'lavado', width: 11 },
      { header: 'Solicitud', key: 'fechaSolicitud', width: 22 },
      { header: 'Inicio', key: 'fechaInicio', width: 22 },
      { header: 'Fin', key: 'fechaFin', width: 22 },
      { header: 'Duración min', key: 'duracionMin', width: 14 },
      { header: 'Cliente', key: 'cliente', width: 22 },
      { header: 'Creado por', key: 'creadoPor', width: 22 },
      { header: 'Operador', key: 'operador', width: 22 },
      { header: 'Vía origen', key: 'viaOrigen', width: 18 },
      { header: 'Vía destino', key: 'viaDestino', width: 18 },
      { header: 'Incidentes', key: 'incidentes', width: 12 },
    ], options.columns?.movimientos), reporte.movimientos.map((movimiento) => ({
      ...movimiento,
      torno: movimiento.torno ? 'Sí' : 'No',
      lavado: movimiento.lavado ? 'Sí' : 'No',
      fechaSolicitud: movimiento.fechaSolicitud.replace('T', ' ').slice(0, 19),
      fechaInicio: movimiento.fechaInicio?.replace('T', ' ').slice(0, 19) || '',
      fechaFin: movimiento.fechaFin?.replace('T', ' ').slice(0, 19) || '',
    })));
  }

  if (options.sections.empresas) {
    addTableSheet(workbook, 'Empresas', selectedColumns([
      { header: 'Empresa', key: 'empresa', width: 28 },
      { header: 'Total', key: 'total' },
      { header: 'Concluidos', key: 'concluidos' },
      { header: 'Detenidos', key: 'detenidos' },
      { header: 'Cancelados', key: 'cancelados' },
      { header: 'Torneados', key: 'torneados' },
      { header: 'Lavados', key: 'lavados' },
      { header: 'Locomotoras', key: 'locomotoras' },
      { header: 'Incidentes', key: 'incidentes' },
    ], options.columns?.empresas), reporte.empresas);
  }

  if (options.sections.locomotoras) {
    addTableSheet(workbook, 'Locomotoras', selectedColumns([
      { header: 'Locomotora', key: 'locomotiveNumber', width: 16 },
      { header: 'Empresas', key: 'empresas', width: 34 },
      { header: 'Total', key: 'total' },
      { header: 'Concluidos', key: 'concluidos' },
      { header: 'Detenidos', key: 'detenidos' },
      { header: 'Cancelados', key: 'cancelados' },
      { header: 'Torneados', key: 'torneados' },
      { header: 'Lavados', key: 'lavados' },
      { header: 'Incidentes', key: 'incidentes' },
      { header: 'Último movimiento', key: 'ultimoMovimiento', width: 22 },
    ], options.columns?.locomotoras), reporte.locomotoras.map((locomotora) => ({
      ...locomotora,
      empresas: locomotora.empresas.join(', '),
      ultimoMovimiento: locomotora.ultimoMovimiento.replace('T', ' ').slice(0, 19),
    })));
  }

  if (options.sections.incidentes) {
    addTableSheet(workbook, 'Incidentes', selectedColumns([
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Fuente', key: 'fuente', width: 14 },
      { header: 'Movimiento', key: 'movimientoId', width: 14 },
      { header: 'Locomotora', key: 'locomotiveNumber', width: 14 },
      { header: 'Empresa', key: 'empresa', width: 24 },
      { header: 'Localidad', key: 'localidad', width: 20 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Descripción', key: 'descripcion', width: 45 },
      { header: 'Reportado por', key: 'reportadoPor', width: 24 },
      { header: 'Inicio', key: 'fechaInicio', width: 22 },
      { header: 'Fin', key: 'fechaFin', width: 22 },
    ], options.columns?.incidentes), reporte.incidentes.map((incidente) => ({
      ...incidente,
      fechaInicio: incidente.fechaInicio.replace('T', ' ').slice(0, 19),
      fechaFin: incidente.fechaFin?.replace('T', ' ').slice(0, 19) || '',
    })));
  }

  if (options.sections.torno) {
    addTableSheet(workbook, 'Torneados concluidos', selectedColumns([
      { header: 'Movimiento', key: 'id' },
      { header: 'Locomotora', key: 'locomotiveNumber' },
      { header: 'Empresa', key: 'empresa', width: 26 },
      { header: 'Localidad', key: 'localidad', width: 20 },
      { header: 'Estado servicio', key: 'tornoStatus', width: 18 },
      { header: 'Fin movimiento', key: 'fechaFin', width: 22 },
      { header: 'Incidentes', key: 'incidentes' },
    ], options.columns?.torno), reporte.movimientos.filter((movimiento) => movimiento.concluido && movimiento.torno).map((movimiento) => ({
      ...movimiento,
      fechaFin: movimiento.fechaFin?.replace('T', ' ').slice(0, 19) || '',
    })));
  }

  if (options.sections.lavado) {
    addTableSheet(workbook, 'Lavados concluidos', selectedColumns([
      { header: 'Movimiento', key: 'id' },
      { header: 'Locomotora', key: 'locomotiveNumber' },
      { header: 'Empresa', key: 'empresa', width: 26 },
      { header: 'Localidad', key: 'localidad', width: 20 },
      { header: 'Estado servicio', key: 'lavadoStatus', width: 18 },
      { header: 'Fin movimiento', key: 'fechaFin', width: 22 },
      { header: 'Incidentes', key: 'incidentes' },
    ], options.columns?.lavado), reporte.movimientos.filter((movimiento) => movimiento.concluido && movimiento.lavado).map((movimiento) => ({
      ...movimiento,
      fechaFin: movimiento.fechaFin?.replace('T', ' ').slice(0, 19) || '',
    })));
  }

  const raw = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  return {
    filename: `${safeFilename(options.titulo || 'reporte_comercial')}_${filters.periodo.toLowerCase()}_${filters.fecha}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  };
}
