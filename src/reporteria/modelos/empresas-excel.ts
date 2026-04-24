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

const TIME_FMT = '[h]"h" mm"m"';

function toExcelTime(min: number | null | undefined) {
  if (min === null || min === undefined || !Number.isFinite(min)) return null;
  return min / 1440;
}

type FormulaResult = NonNullable<ExcelJS.CellFormulaValue['result']>;

function formulaCell(formula: string, result?: FormulaResult | null): ExcelJS.CellFormulaValue {
  const value: ExcelJS.CellFormulaValue = { formula, date1904: false };
  if (result !== null && result !== undefined) value.result = result;
  return value;
}

function fillMovimientosSheet(ws: ExcelJS.Worksheet, data: EmpresasReporte) {
  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  // Formato humano para tiempos
  ws.getColumn(7).numFmt = TIME_FMT; // Espera
  ws.getColumn(8).numFmt = TIME_FMT; // Duración
  ws.getColumn(9).numFmt = TIME_FMT; // Total

  for (const emp of data.empresas) {
    for (const m of emp.movimientos) {
      ws.addRow([
        m.empresaId,
        m.empresa,
        m.locomotiveNumber,
        fmtTZ(m.fechaSolicitudUTC, data.meta.tz),
        fmtTZ(m.fechaInicioUTC, data.meta.tz),
        fmtTZ(m.fechaFinUTC, data.meta.tz),
        toExcelTime(m.esperaMin),
        toExcelTime(m.duracionMin),
        toExcelTime(m.totalMin),
        m.estado,
        m.tipoMovimiento ?? '—',
        m.torno ? 'SI' : 'NO',
        m.lavado ? 'SI' : 'NO',
        m.clienteNombre ?? '—',
        m.operadorNombre ?? '—',
        m.solicitadoPor ?? '—',
        m.localidad ?? '—',
        m.viaOrigenNombre ?? '—',
        m.viaDestinoNombre ?? '—',
      ]);
    }
  }
}

function fillResumenSheet(ws: ExcelJS.Worksheet, data: EmpresasReporte, movSheetName: string) {
  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  // Formato humano para promedios
  ws.getColumn(9).numFmt = TIME_FMT;
  ws.getColumn(10).numFmt = TIME_FMT;
  ws.getColumn(11).numFmt = TIME_FMT;

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
    row.getCell(3).value = formulaCell(`COUNTIF(${movRef}!$A:$A, A${rowIndex})`, emp.totalMovimientos);
    row.getCell(5).value = formulaCell(`COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$L:$L, "SI")`, emp.totalTorno);
    row.getCell(6).value = formulaCell(`COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$M:$M, "SI")`, emp.totalLavado);
    row.getCell(7).value = formulaCell(
      `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$L:$L, "SI", ${movRef}!$M:$M, "SI")`,
      emp.totalTornoLavado
    );
    row.getCell(8).value = formulaCell(
      `COUNTIFS(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$L:$L, "NO", ${movRef}!$M:$M, "NO")`,
      emp.totalSinTornoLavado
    );
    row.getCell(9).value = formulaCell(`AVERAGEIF(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$G:$G)`, toExcelTime(emp.promEsperaMin));
    row.getCell(10).value = formulaCell(`AVERAGEIF(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$H:$H)`, toExcelTime(emp.promDuracionMin));
    row.getCell(11).value = formulaCell(`AVERAGEIF(${movRef}!$A:$A, A${rowIndex}, ${movRef}!$I:$I)`, toExcelTime(emp.promTotalMin));

    rowIndex += 1;
  }
}

function tryWriteDashboard(wb: ExcelJS.Workbook, data: EmpresasReporte) {
  const ws = wsByNameLoose(wb, 'Dashboard');
  if (!ws) return;

  try {
    // ---- Layout base ----
    ws.getCell('A1').value = 'Dashboard';
    ws.getCell('A2').value = 'Rango (MX):';
    ws.getCell('A3').value = 'TZ:';
    ws.getCell('A4').value = 'Empresas:';
    ws.getCell('A5').value = 'Rango Local ISO:';

    ws.getCell('A7').value = 'KPIs';
    ws.getCell('A8').value = 'Total empresas';
    ws.getCell('A9').value = 'Total movimientos';
    ws.getCell('A10').value = 'Locomotoras únicas';
    ws.getCell('A11').value = 'Torno';
    ws.getCell('A12').value = 'Lavado';
    ws.getCell('A13').value = 'Torno + Lavado';
    ws.getCell('A14').value = 'Sin TL';
    ws.getCell('A15').value = 'Prom Espera (min)';
    ws.getCell('A16').value = 'Prom Duración (min)';
    ws.getCell('A17').value = 'Prom Total (min)';

    ws.getCell('D7').value = 'Top movimientos';
    ws.getCell('D8').value = 'Empresa';
    ws.getCell('E8').value = 'Movimientos';
    ws.getCell('F8').value = 'Grafica';

    ws.getCell('H7').value = 'Tiempos promedio (min)';
    ws.getCell('H8').value = 'Empresa';
    ws.getCell('I8').value = 'Espera';
    ws.getCell('J8').value = 'Duración';
    ws.getCell('K8').value = 'Total';
    ws.getCell('L8').value = 'Grafica';

    ws.getCell('D20').value = 'Top vias';
    ws.getCell('D21').value = 'Via';
    ws.getCell('E21').value = 'Movimientos';
    ws.getCell('F21').value = 'Grafica';

    ws.getRow(1).font = { bold: true, size: 14 };
    ws.getRow(7).font = { bold: true };
    ws.getRow(8).font = { bold: true };
    ws.getColumn('A').width = 24;
    ws.getColumn('B').width = 34;
    ws.getColumn('D').width = 22;
    ws.getColumn('E').width = 16;
    ws.getColumn('F').width = 22;
    ws.getColumn('H').width = 22;
    ws.getColumn('I').width = 14;
    ws.getColumn('J').width = 14;
    ws.getColumn('K').width = 14;
    ws.getColumn('L').width = 22;

    // ---- Valores base ----
    ws.getCell('B2').value = `${data.meta.fechaInicio} → ${data.meta.fechaFin}`;
    ws.getCell('B3').value = data.meta.tz;
    ws.getCell('B4').value = data.meta.empresaIds?.length
      ? data.meta.empresaIds.join(', ')
      : 'Todas';
    ws.getCell('B5').value = `${data.meta.rangoLocal.desde} → ${data.meta.rangoLocal.hastaExclusivo}`;

    const allMovs = data.empresas.flatMap((e) => e.movimientos);
    const totalEmpresas = data.empresas.length;
    const totalMovs = allMovs.length;
    const uniqueLocos = new Set(allMovs.map((m) => m.locomotiveNumber)).size;
    const totalTorno = data.empresas.reduce((acc, e) => acc + e.totalTorno, 0);
    const totalLavado = data.empresas.reduce((acc, e) => acc + e.totalLavado, 0);
    const totalTornoLavado = data.empresas.reduce((acc, e) => acc + e.totalTornoLavado, 0);
    const totalSinTL = data.empresas.reduce((acc, e) => acc + e.totalSinTornoLavado, 0);

    let esperaSum = 0;
    let esperaN = 0;
    let durSum = 0;
    let durN = 0;
    let totalSum = 0;
    let totalN = 0;
    for (const m of allMovs) {
      if (m.esperaMin !== null && m.esperaMin !== undefined) {
        esperaSum += m.esperaMin;
        esperaN += 1;
      }
      if (m.duracionMin !== null && m.duracionMin !== undefined) {
        durSum += m.duracionMin;
        durN += 1;
      }
      if (m.totalMin !== null && m.totalMin !== undefined) {
        totalSum += m.totalMin;
        totalN += 1;
      }
    }
    const promEspera = esperaN ? Math.round(esperaSum / esperaN) : null;
    const promDuracion = durN ? Math.round(durSum / durN) : null;
    const promTotal = totalN ? Math.round(totalSum / totalN) : null;

    ws.getCell('B8').value = totalEmpresas;
    ws.getCell('B9').value = totalMovs;
    ws.getCell('B10').value = uniqueLocos;
    ws.getCell('B11').value = totalTorno;
    ws.getCell('B12').value = totalLavado;
    ws.getCell('B13').value = totalTornoLavado;
    ws.getCell('B14').value = totalSinTL;
    ws.getCell('B15').value = toExcelTime(promEspera ?? null) ?? '';
    ws.getCell('B16').value = toExcelTime(promDuracion ?? null) ?? '';
    ws.getCell('B17').value = toExcelTime(promTotal ?? null) ?? '';
    ws.getCell('B15').numFmt = TIME_FMT;
    ws.getCell('B16').numFmt = TIME_FMT;
    ws.getCell('B17').numFmt = TIME_FMT;

    // ---- Top movimientos + sparklines ----
    const top = [...data.empresas].sort((a, b) => b.totalMovimientos - a.totalMovimientos).slice(0, 10);
    const startRow = 9;
    const endRow = 18;

    for (let r = startRow; r <= endRow; r += 1) {
      ws.getCell(`D${r}`).value = '';
      ws.getCell(`E${r}`).value = '';
      ws.getCell(`F${r}`).value = '';
      ws.getCell(`H${r}`).value = '';
      ws.getCell(`I${r}`).value = '';
      ws.getCell(`J${r}`).value = '';
      ws.getCell(`K${r}`).value = '';
      ws.getCell(`L${r}`).value = '';
    }

    top.forEach((e, idx) => {
      const row = startRow + idx;
      ws.getCell(`D${row}`).value = e.empresa;
      ws.getCell(`E${row}`).value = e.totalMovimientos;
      ws.getCell(`F${row}`).value = formulaCell(
        `SPARKLINE(E${row}, {\"charttype\",\"bar\";\"max\",MAX($E$${startRow}:$E$${endRow})})`,
        0
      );

      ws.getCell(`H${row}`).value = e.empresa;
      ws.getCell(`I${row}`).value = toExcelTime(e.promEsperaMin);
      ws.getCell(`J${row}`).value = toExcelTime(e.promDuracionMin);
      ws.getCell(`K${row}`).value = toExcelTime(e.promTotalMin);
      ws.getCell(`I${row}`).numFmt = TIME_FMT;
      ws.getCell(`J${row}`).numFmt = TIME_FMT;
      ws.getCell(`K${row}`).numFmt = TIME_FMT;
      ws.getCell(`L${row}`).value = formulaCell(`SPARKLINE(I${row}:K${row}, {\"charttype\",\"column\"})`, 0);
    });

    // ---- Top vias + sparklines ----
    const viaCounts = new Map<string, number>();
    for (const m of allMovs) {
      const via = m.viaDestinoNombre ?? m.viaOrigenNombre;
      if (!via) continue;
      viaCounts.set(via, (viaCounts.get(via) ?? 0) + 1);
    }
    const viasTop = Array.from(viaCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const viaStart = 22;
    const viaEnd = 29;
    for (let r = viaStart; r <= viaEnd; r += 1) {
      ws.getCell(`D${r}`).value = '';
      ws.getCell(`E${r}`).value = '';
      ws.getCell(`F${r}`).value = '';
    }

    viasTop.forEach(([via, count], idx) => {
      const row = viaStart + idx;
      ws.getCell(`D${row}`).value = via;
      ws.getCell(`E${row}`).value = count;
      ws.getCell(`F${row}`).value = formulaCell(
        `SPARKLINE(E${row}, {\"charttype\",\"bar\";\"max\",MAX($E$${viaStart}:$E$${viaEnd})})`,
        0
      );
    });
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
