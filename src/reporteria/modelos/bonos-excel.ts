// reporteria/modelos/bonos-excel.ts
// Genera .xlsx para reporte de bonos por locomotora desde plantilla.

import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { BonosReporteriaModel, type BonosReporte, type PeriodoReporte, type BonoJustificacion } from './bonos-model';

export type ExcelFile = {
  filename: string;
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  buffer: Buffer;
};

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parametro de fecha invalido. Usa formato YYYY-MM-DD.');
  }
  return s;
}

function parsePeriodo(input: any): PeriodoReporte {
  const s = String(input ?? '').trim().toUpperCase();
  switch (s) {
    case 'DIA':
    case 'DAY':
      return 'DIA';
    case 'SEMANA':
    case 'WEEK':
      return 'SEMANA';
    case 'QUINCENA':
      return 'QUINCENA';
    case 'MES':
    case 'MONTH':
      return 'MES';
    case 'BIMESTRE':
      return 'BIMESTRE';
    case 'SEMESTRE':
      return 'SEMESTRE';
    case 'ANUAL':
    case 'ANIO':
    case 'AÑO':
      return 'ANUAL';
    default:
      throw new Error('Periodo invalido. Usa DIA, SEMANA, QUINCENA, MES, BIMESTRE, SEMESTRE o ANUAL.');
  }
}

function safeFilename(name: string) {
  return String(name || 'Bonos')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function findTemplatePath() {
  const candidates = [
    path.join(process.cwd(), 'reporteria', 'plantillas', 'Bonos_Reporteria.xlsx'),
    path.join(process.cwd(), 'src', 'reporteria', 'plantillas', 'Bonos_Reporteria.xlsx'),
    path.resolve(__dirname, '..', 'plantillas', 'Bonos_Reporteria.xlsx'),
    path.resolve(__dirname, '..', '..', 'reporteria', 'plantillas', 'Bonos_Reporteria.xlsx'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // noop
    }
  }

  throw new Error(
    `File not found: no se encontro la plantilla Bonos_Reporteria.xlsx. Probe: ${candidates.join(' | ')}`
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
    throw new Error(`Plantilla invalida: falta hoja "${name}". Hojas disponibles: ${available || '(ninguna)'}`);
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

function labelJustificacion(j: BonoJustificacion) {
  switch (j) {
    case 'PRIMER_BONO':
      return 'Primer bono';
    case 'BONO_24H':
      return 'Bono 24h';
    case 'AUN_NO_24H':
      return 'Aun no 24h';
    case 'SIN_FIN':
    default:
      return 'Sin fecha fin';
  }
}

function fillMovimientosSheet(ws: ExcelJS.Worksheet, data: BonosReporte) {
  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  for (const loco of data.locomotoras) {
    for (const m of loco.movimientos) {
      ws.addRow([
        loco.locomotiveNumber,
        m.movimientoId,
        fmtTZ(m.fechaSolicitudUTC, data.meta.tz),
        fmtTZ(m.fechaInicioUTC, data.meta.tz),
        fmtTZ(m.fechaFinUTC, data.meta.tz),
        m.duracionMin ?? null,
        fmtTZ(m.ultimoBonoUTC, data.meta.tz),
        m.tiempoDesdeUltimoBonoMin ?? null,
        m.bonoActual ? 'SI' : 'NO',
        labelJustificacion(m.justificacion),
        m.operadorNombre ?? '—',
        m.clienteNombre ?? '—',
        m.solicitadoPor ?? '—',
        m.empresa ?? '—',
        m.localidad ?? '—',
      ]);
    }
  }
}

function fillResumenSheet(ws: ExcelJS.Worksheet, data: BonosReporte, movSheetName: string) {
  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  const movRef = sheetRef(movSheetName);
  let rowIndex = 2;

  for (const loco of data.locomotoras) {
    const row = ws.addRow([
      loco.locomotiveNumber,
      null,
      null,
      fmtTZ(loco.ultimoBonoUTC, data.meta.tz),
      fmtTZ(loco.ultimoBonoEnPeriodoUTC, data.meta.tz),
    ]);

    row.getCell(2).value = {
      formula: `COUNTIF(${movRef}!$A:$A, A${rowIndex})`,
      result: loco.totalMovimientos,
    };
    row.getCell(3).value = {
      formula: `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$I:$I, "SI")`,
      result: loco.totalBonos,
    };

    rowIndex += 1;
  }
}

function tryWriteDashboard(wb: ExcelJS.Workbook, data: BonosReporte) {
  const ws = wsByNameLoose(wb, 'Dashboard');
  if (!ws) return;

  try {
    ws.getCell('B2').value = data.meta.periodo;
    ws.getCell('B3').value = data.meta.fechaLocal;
    ws.getCell('B4').value = data.meta.tz;
    ws.getCell('B5').value = `${data.meta.rangoLocal.desde} → ${data.meta.rangoLocal.hastaExclusivo}`;
  } catch {
    // noop
  }
}

export async function exportarReporteBonosExcel(params: {
  fecha: any;
  periodo: any;
  tz?: any;
}): Promise<ExcelFile> {
  const tz = String(params.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';
  const fecha = assertYYYYMMDD(params.fecha);
  const periodo = parsePeriodo(params.periodo);

  const data = await BonosReporteriaModel.reportePorPeriodo({
    fecha,
    periodo,
    tz,
  });

  const templatePath = findTemplatePath();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  const wsMov = wsOrThrow(wb, 'Movimientos', ['MOVIMIENTOS', 'Movimiento', 'MOVIMIENTO']);
  const wsRes = wsOrThrow(wb, 'Resumen', ['RESUMEN', 'Summary', 'RESUMEN_BONOS']);

  fillMovimientosSheet(wsMov, data);
  fillResumenSheet(wsRes, data, wsMov.name);
  tryWriteDashboard(wb, data);

  const etiqueta = `Bonos_${data.meta.periodo}_${data.meta.fechaLocal}`;
  const filename = `Reporte_${safeFilename(etiqueta)}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();

  return {
    filename,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(buffer),
  };
}
