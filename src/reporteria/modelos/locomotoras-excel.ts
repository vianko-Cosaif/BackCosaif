// reporteria/modelos/locomotoras-excel.ts
// Genera .xlsx para reporte de locomotoras desde plantilla.
//
// Estrategia (sin SheetJS Pro):
// - La plantilla trae tablas/estilos/gráficas creadas manualmente en Excel.
// - Este código solo rellena las hojas de datos.
// - Las gráficas se refrescan al abrir el archivo.

import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { LocomotorasReporteriaModel, type LocomotorasReporte } from './locomotoras-model';

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

function safeFilename(name: string) {
  return String(name || 'Locomotoras')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function findTemplatePath() {
  const candidates = [
    path.join(process.cwd(), 'reporteria', 'plantillas', 'Locomotoras_Reporteria.xlsx'),
    path.join(process.cwd(), 'src', 'reporteria', 'plantillas', 'Locomotoras_Reporteria.xlsx'),
    path.resolve(__dirname, '..', 'plantillas', 'Locomotoras_Reporteria.xlsx'),
    path.resolve(__dirname, '..', '..', 'reporteria', 'plantillas', 'Locomotoras_Reporteria.xlsx'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // noop
    }
  }

  throw new Error(
    `File not found: no se encontró la plantilla Locomotoras_Reporteria.xlsx. Probé: ${candidates.join(' | ')}`
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
  // Excel requiere comillas simples si el nombre tiene espacios
  return `'${String(name).replace(/'/g, "''")}'`;
}

function fmtTZ(iso: string | null, tz: string) {
  if (!iso) return '—';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  const s = d.toLocaleString('sv-SE', { timeZone: tz, hour12: false }).replace(',', '');
  return s.length >= 16 ? s.slice(0, 16) : s;
}

function fillMovimientosSheet(ws: ExcelJS.Worksheet, data: LocomotorasReporte) {
  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  // Cada movimiento real genera una fila. Si no hay movimientos, no se agrega placeholder
  // para no afectar fórmulas de conteo en la hoja Resumen.
  for (const loco of data.locomotoras) {
    for (const m of loco.movimientos) {
      ws.addRow([
        loco.locomotiveNumber,
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
        m.empresa ?? '—',
        m.localidad ?? '—',
        m.solicitadoPor ?? '—',
      ]);
    }
  }
}

function fillResumenSheet(ws: ExcelJS.Worksheet, data: LocomotorasReporte, movSheetName: string) {
  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  const movRef = sheetRef(movSheetName);
  let rowIndex = 2; // fila 1 = header

  for (const loco of data.locomotoras) {
    const row = ws.addRow([
      loco.locomotiveNumber,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);

    // Fórmulas (con resultados precargados) para refresco automático en Excel
    row.getCell(2).value = {
      formula: `COUNTIF(${movRef}!$A:$A, A${rowIndex})`,
      result: loco.totalMovimientos,
    };
    row.getCell(3).value = {
      formula: `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$J:$J, "SI")`,
      result: loco.totalTorno,
    };
    row.getCell(4).value = {
      formula: `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$K:$K, "SI")`,
      result: loco.totalLavado,
    };
    row.getCell(5).value = {
      formula: `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$J:$J, "SI", ${movRef}!$K:$K, "SI")`,
      result: loco.totalTornoLavado,
    };
    row.getCell(6).value = {
      formula: `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$J:$J, "NO", ${movRef}!$K:$K, "NO")`,
      result: loco.totalSinTornoLavado,
    };
    row.getCell(7).value = {
      formula: `AVERAGEIF(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$E:$E)`,
      result: loco.promEsperaMin ?? undefined,
    };
    row.getCell(8).value = {
      formula: `AVERAGEIF(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$F:$F)`,
      result: loco.promDuracionMin ?? undefined,
    };
    row.getCell(9).value = {
      formula: `AVERAGEIF(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$G:$G)`,
      result: loco.promTotalMin ?? undefined,
    };

    rowIndex += 1;
  }
}

function tryWriteDashboard(wb: ExcelJS.Workbook, data: LocomotorasReporte) {
  const ws = wsByNameLoose(wb, 'Dashboard');
  if (!ws) return;

  try {
    ws.getCell('B2').value = `${data.meta.fechaInicio} → ${data.meta.fechaFin}`;
    ws.getCell('B3').value = data.meta.tz;
    ws.getCell('B4').value = data.meta.locomotoras.join(', ');
    ws.getCell('B5').value = `${data.meta.rangoLocal.desde} → ${data.meta.rangoLocal.hastaExclusivo}`;
  } catch {
    // noop
  }
}

export async function exportarReporteLocomotorasExcel(params: {
  fechaInicio: any;
  fechaFin: any;
  tz?: any;
  locomotoras: any[];
  localidadId?: any;
  empresaId?: any;
}): Promise<ExcelFile> {
  const tz = String(params.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';
  const fechaInicio = assertYYYYMMDD(params.fechaInicio);
  const fechaFin = assertYYYYMMDD(params.fechaFin);

  const locomotoras = Array.from(new Set((params.locomotoras ?? [])
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))));

  if (!locomotoras.length) {
    throw new Error('Debes enviar al menos una locomotora en la consulta.');
  }

  const localidadId = parseIntOpt(params.localidadId);
  const empresaId = parseIntOpt(params.empresaId);

  // 1) Data (ya hace conversión a UTC por fechaInicio local)
  const data = await LocomotorasReporteriaModel.reportePorFechas({
    fechaInicio,
    fechaFin,
    tz,
    locomotoras,
    localidadId,
    empresaId,
  });

  // 2) Plantilla
  const templatePath = findTemplatePath();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  // 3) Hojas base
  const wsMov = wsOrThrow(wb, 'Movimientos', ['MOVIMIENTOS', 'Movimiento', 'MOVIMIENTO']);
  const wsRes = wsOrThrow(wb, 'Resumen', ['RESUMEN', 'Summary', 'RESUMEN_LOCOMOTORAS']);

  fillMovimientosSheet(wsMov, data);
  fillResumenSheet(wsRes, data, wsMov.name);
  tryWriteDashboard(wb, data);

  const etiqueta = `Locomotoras_${data.meta.fechaInicio}_${data.meta.fechaFin}`;
  const filename = `Reporte_${safeFilename(etiqueta)}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();

  return {
    filename,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(buffer),
  };
}
