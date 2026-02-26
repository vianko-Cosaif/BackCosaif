// reporteria/modelos/empresas-excel.ts
// Genera .xlsx para reporte por empresa desde plantilla.
//
// Estrategia (sin SheetJS Pro):
// - La plantilla trae tablas/estilos/gráficas creadas manualmente en Excel.
// - Este código solo rellena las hojas de datos.

import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { EmpresasReporteriaModel, type EmpresasReporte } from './empresas-model';

export type ExcelFile = {
  filename: string;
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  buffer: Buffer;
};

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parámetro de fecha inválido. Usa formato YYYY-MM-DD.');
  }
  return s;
}

function parseIntOpt(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function parseEmpresaIds(input: any): number[] {
  if (!input) return [];
  if (Array.isArray(input)) input = input.join(',');
  return String(input)
    .split(/[,\s]+/)
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isFinite(n));
}

function safeFilename(name: string) {
  return String(name || 'Empresas')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function findTemplatePath() {
  const candidates = [
    path.join(process.cwd(), 'reporteria', 'plantillas', 'Empresas_Reporteria.xlsx'),
    path.join(process.cwd(), 'src', 'reporteria', 'plantillas', 'Empresas_Reporteria.xlsx'),
    path.resolve(__dirname, '..', 'plantillas', 'Empresas_Reporteria.xlsx'),
    path.resolve(__dirname, '..', '..', 'reporteria', 'plantillas', 'Empresas_Reporteria.xlsx'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // noop
    }
  }

  throw new Error(
    `File not found: no se encontró la plantilla Empresas_Reporteria.xlsx. Probé: ${candidates.join(' | ')}`
  );
}

function normalizeSheetName(s: string) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function wsByNameLoose(wb: ExcelJS.Workbook, wanted: string) {
  const exact = wb.getWorksheet(wanted);
  if (exact) return exact;

  const wNorm = normalizeSheetName(wanted);
  return (wb.worksheets ?? []).find((w) => normalizeSheetName(w.name) === wNorm) ?? null;
}

function wsOrThrow(wb: ExcelJS.Workbook, name: string, aliases: string[] = []) {
  let ws = wsByNameLoose(wb, name);
  if (!ws && aliases.length) {
    for (const a of aliases) {
      ws = wsByNameLoose(wb, a);
      if (ws) break;
    }
  }

  if (!ws) {
    const available = (wb.worksheets ?? []).map((w) => w.name).join(', ');
    throw new Error(`Plantilla inválida: falta hoja "${name}". Hojas disponibles: ${available || '(ninguna)'}`);
  }

  return ws;
}

function clearSheetKeepHeader(ws: ExcelJS.Worksheet) {
  const rows = ws.rowCount;
  if (rows > 1) ws.spliceRows(2, rows - 1);
}

function setAutoFilterOnHeader(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  const lastCol = header.cellCount || ws.columnCount || 1;
  const endCol = String.fromCharCode(64 + Math.min(lastCol, 26));
  ws.autoFilter = `A1:${endCol}1`;
}

function sheetRef(name: string) {
  return `'${String(name).replace(/'/g, "''")}'`;
}

function fmtTZ(iso: string | null, tz: string) {
  if (!iso) return '—';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  const s = d.toLocaleString('sv-SE', { timeZone: tz, hour12: false }).replace(',', '');
  return s.length >= 16 ? s.slice(0, 16) : s;
}

function fillMovimientosSheet(ws: ExcelJS.Worksheet, data: EmpresasReporte) {
  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  for (const emp of data.empresas) {
    for (const m of emp.movimientos) {
      ws.addRow([
        m.empresaId,
        m.empresa,
        m.locomotiveNumber,
        fmtTZ(m.fechaSolicitudUTC, data.meta.tz),
        fmtTZ(m.fechaInicioUTC, data.meta.tz),
        fmtTZ(m.fechaFinUTC, data.meta.tz),
        m.esperaMin ?? null,
        m.duracionMin ?? null,
        m.totalMin ?? null,
        m.estado,
        m.tipoMovimiento ?? '—',
        m.torno ? 'SI' : 'NO',
        m.lavado ? 'SI' : 'NO',
        m.clienteNombre ?? '—',
        m.operadorNombre ?? '—',
        m.solicitadoPor ?? '—',
        m.localidad ?? '—',
      ]);
    }
  }
}

function fillResumenSheet(ws: ExcelJS.Worksheet, data: EmpresasReporte, movSheetName: string) {
  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  const movRef = sheetRef(movSheetName);
  let rowIndex = 2;

  for (const emp of data.empresas) {
    const row = ws.addRow([
      emp.empresaId,
      emp.empresa,
      null,
      emp.totalLocomotoras,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);

    // Fórmulas con resultados precargados
    row.getCell(3).value = {
      formula: `COUNTIF(${movRef}!$A:$A, A${rowIndex})`,
      result: emp.totalMovimientos,
    };
    row.getCell(5).value = {
      formula: `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$L:$L, "SI")`,
      result: emp.totalTorno,
    };
    row.getCell(6).value = {
      formula: `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$M:$M, "SI")`,
      result: emp.totalLavado,
    };
    row.getCell(7).value = {
      formula: `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$L:$L, "SI", ${movRef}!$M:$M, "SI")`,
      result: emp.totalTornoLavado,
    };
    row.getCell(8).value = {
      formula: `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$L:$L, "NO", ${movRef}!$M:$M, "NO")`,
      result: emp.totalSinTornoLavado,
    };
    row.getCell(9).value = {
      formula: `AVERAGEIF(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$G:$G)`,
      result: emp.promEsperaMin ?? undefined,
    };
    row.getCell(10).value = {
      formula: `AVERAGEIF(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$H:$H)`,
      result: emp.promDuracionMin ?? undefined,
    };
    row.getCell(11).value = {
      formula: `AVERAGEIF(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$I:$I)`,
      result: emp.promTotalMin ?? undefined,
    };

    rowIndex += 1;
  }
}

function tryWriteDashboard(wb: ExcelJS.Workbook, data: EmpresasReporte) {
  const ws = wsByNameLoose(wb, 'Dashboard');
  if (!ws) return;

  try {
    ws.getCell('B2').value = `${data.meta.fechaInicio} → ${data.meta.fechaFin}`;
    ws.getCell('B3').value = data.meta.tz;
    ws.getCell('B4').value = data.meta.empresaIds?.length
      ? data.meta.empresaIds.join(', ')
      : 'Todas';
    ws.getCell('B5').value = `${data.meta.rangoLocal.desde} → ${data.meta.rangoLocal.hastaExclusivo}`;
  } catch {
    // noop
  }
}

export async function exportarReporteEmpresasExcel(params: {
  fechaInicio: any;
  fechaFin: any;
  tz?: any;
  empresaIds?: any;
  localidadId?: any;
}): Promise<ExcelFile> {
  const tz = String(params.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';
  const fechaInicio = assertYYYYMMDD(params.fechaInicio);
  const fechaFin = assertYYYYMMDD(params.fechaFin);

  const empresaIds = parseEmpresaIds(params.empresaIds);
  const localidadId = parseIntOpt(params.localidadId);

  // 1) Data
  const data = await EmpresasReporteriaModel.reportePorFechas({
    fechaInicio,
    fechaFin,
    tz,
    empresaIds,
    localidadId,
  });

  // 2) Plantilla
  const templatePath = findTemplatePath();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  // 3) Hojas base
  const wsMov = wsOrThrow(wb, 'Movimientos', ['MOVIMIENTOS', 'Movimiento', 'MOVIMIENTO']);
  const wsRes = wsOrThrow(wb, 'Resumen', ['RESUMEN', 'Summary', 'RESUMEN_EMPRESAS']);

  fillMovimientosSheet(wsMov, data);
  fillResumenSheet(wsRes, data, wsMov.name);
  tryWriteDashboard(wb, data);

  const etiqueta = `Empresas_${data.meta.fechaInicio}_${data.meta.fechaFin}`;
  const filename = `Reporte_${safeFilename(etiqueta)}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();

  return {
    filename,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(buffer),
  };
}
