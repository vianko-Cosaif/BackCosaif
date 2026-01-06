// reporteria/modelos/reporteriaMovimiento-excel.ts
// Genera .xlsx desde PLANTILLA usando el motor de datos Excel.
//
// Requiere plantilla (se buscan varias rutas):
// - reporteria/plantillas/Movimientos_Reporteria.xlsx
// - src/reporteria/plantillas/Movimientos_Reporteria.xlsx
// - (relativo a este archivo) ../plantillas/Movimientos_Reporteria.xlsx
//
// Hojas (si existen, se llenan):
// - Dashboard (opcional)
// - Movimientos
// - Incidentes
// - Movimientos_Incidentes (opcional; si no existe, se crea)
// - General
// - PorEmpresa
// - PorCreador
// - PorOperador
// - PorCliente
// - SerieDia
// - SerieMes
// - SerieAnio
//
// Política por periodo:
// - DIA / SEMANA: usa SerieDia (y oculta SerieMes/SerieAnio si existen)
// - MES / BIMESTRE / SEMESTRE: usa SerieMes (y oculta SerieDia/SerieAnio)
// - ANUAL: usa SerieAnio (y oculta SerieDia/SerieMes)
//
// Nota: pivots/charts no se “crean” aquí (ExcelJS no es bueno en eso).
// La idea es: la plantilla trae pivots/gráficas conectadas a las tablas/hojas
// y este archivo solo actualiza datos + mantiene filtros/tablas.

import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import {
  ReporteriaMovimientoExcelModel,
  type PeriodoReporte,
  type ReporteExcel,
  type MovimientoExcelRow,
  type IncidenteExcelRow,
  type ResumenGrupo,
} from './reporteriaMovimiento-Modelexcel';

export type ExcelFile = {
  filename: string;
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  buffer: Buffer;
};

function parseIntOpt(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function assertYYYYMMDD(fecha: any) {
  const s = String(fecha ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Parámetro "fecha" inválido. Usa formato YYYY-MM-DD (día en México).');
  }
  return s;
}

function pickPeriodo(q: any): PeriodoReporte {
  const raw = String(q ?? 'dia').toLowerCase().trim();

  if (raw === 'diario' || raw === 'día' || raw === 'day') return 'DIA';
  if (raw === 'semana' || raw === 'weekly' || raw === 'week' || raw === 'semanal') return 'SEMANA';
  if (raw === 'mensual' || raw === 'month' || raw === 'mes') return 'MES';
  if (raw === 'bi' || raw === 'bim' || raw === 'bimestral' || raw === 'bimestre') return 'BIMESTRE';
  if (raw === 'semi' || raw === 'semestral' || raw === 'semestre') return 'SEMESTRE';
  if (raw === 'year' || raw === 'anual' || raw === 'año') return 'ANUAL';

  if (
    raw === 'dia' ||
    raw === 'semana' ||
    raw === 'mes' ||
    raw === 'bimestre' ||
    raw === 'semestre' ||
    raw === 'anual'
  ) {
    return raw.toUpperCase() as PeriodoReporte;
  }

  return 'DIA';
}

function safeFilename(name: string) {
  return String(name || 'Movimientos')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function normalizeSheetName(s: string) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, ''); // quita acentos
}

function listSheetNames(wb: ExcelJS.Workbook) {
  return (wb.worksheets ?? []).map((w) => w.name);
}

function wsByNameLoose(wb: ExcelJS.Workbook, wanted: string) {
  // 1) Exacto
  const exact = wb.getWorksheet(wanted);
  if (exact) return exact;

  // 2) Normalizado
  const wNorm = normalizeSheetName(wanted);
  const found = (wb.worksheets ?? []).find((w) => normalizeSheetName(w.name) === wNorm);
  if (found) return found;

  return null;
}

/**
 * Resolver de hojas:
 * - evita undefined (que luego explota con cosas tipo 'anchors')
 * - si no existe exacta, busca por normalización/alias
 * - si no existe, tira error con el listado de hojas reales
 */
function wsOrThrow(wb: ExcelJS.Workbook, name: string, aliases: string[] = []) {
  let ws = wsByNameLoose(wb, name);

  if (!ws && aliases.length) {
    for (const a of aliases) {
      ws = wsByNameLoose(wb, a);
      if (ws) break;
    }
  }

  if (!ws) {
    const available = listSheetNames(wb);
    throw new Error(
      `Plantilla inválida: falta hoja "${name}". Hojas disponibles: ${available.length ? available.join(', ') : '(ninguna)'}`
    );
  }

  return ws;
}

function tryWs(wb: ExcelJS.Workbook, name: string, aliases: string[] = []) {
  const ws = wsByNameLoose(wb, name);
  if (ws) return ws;

  for (const a of aliases) {
    const wa = wsByNameLoose(wb, a);
    if (wa) return wa;
  }

  return null;
}

function clearSheetKeepHeader(ws: ExcelJS.Worksheet) {
  const rows = ws.rowCount;
  if (rows > 1) ws.spliceRows(2, rows - 1);
}

function getExcelColumnLetter(colNumber: number): string {
  let dividend = colNumber;
  let columnName = '';
  let modulo: number;

  while (dividend > 0) {
    modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

function setAutoFilterOnHeader(ws: ExcelJS.Worksheet) {
  // aplica autofiltro en la fila 1 (de A1 hasta la última columna con header)
  const header = ws.getRow(1);
  const lastCol = header.cellCount || ws.columnCount || 1;
  const endColLetter = getExcelColumnLetter(lastCol);
  ws.autoFilter = `A1:${endColLetter}1`;
}

function hideIfExists(wb: ExcelJS.Workbook, name: string) {
  const ws = tryWs(wb, name);
  if (ws) ws.state = 'hidden';
}

function showIfExists(wb: ExcelJS.Workbook, name: string) {
  const ws = tryWs(wb, name);
  if (ws) ws.state = 'visible';
}

function applyPeriodoSheetPolicy(wb: ExcelJS.Workbook, periodo: PeriodoReporte) {
  const showDia = periodo === 'DIA' || periodo === 'SEMANA';
  const showMes = periodo === 'MES' || periodo === 'BIMESTRE' || periodo === 'SEMESTRE';
  const showAnio = periodo === 'ANUAL';

  if (showDia) {
    showIfExists(wb, 'SerieDia');
    hideIfExists(wb, 'SerieMes');
    hideIfExists(wb, 'SerieAnio');
  } else if (showMes) {
    showIfExists(wb, 'SerieMes');
    hideIfExists(wb, 'SerieDia');
    hideIfExists(wb, 'SerieAnio');
  } else if (showAnio) {
    showIfExists(wb, 'SerieAnio');
    hideIfExists(wb, 'SerieDia');
    hideIfExists(wb, 'SerieMes');
  }
}

function ensureWorksheet(wb: ExcelJS.Workbook, name: string) {
  // OJO: aquí sí “creamos” si no existe.
  // Si tu plantilla trae imágenes/gráficas, NO uses esto para hojas "core" (Movimientos, Incidentes),
  // porque crear una hoja nueva rompe el vínculo de pivots/charts.
  return wb.getWorksheet(name) ?? wb.addWorksheet(name);
}

function findTemplatePath() {
  // 1) donde corre el proceso (root del proyecto normalmente)
  const candidates = [
    path.join(process.cwd(), 'reporteria', 'plantillas', 'Movimientos_Reporteria.xlsx'),
    path.join(process.cwd(), 'src', 'reporteria', 'plantillas', 'Movimientos_Reporteria.xlsx'),
    // 2) relativo a este archivo (en ts es src/, en dist cambia)
    path.resolve(__dirname, '..', 'plantillas', 'Movimientos_Reporteria.xlsx'),
    path.resolve(__dirname, '..', '..', 'reporteria', 'plantillas', 'Movimientos_Reporteria.xlsx'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // noop
    }
  }

  throw new Error(
    `File not found: no se encontró la plantilla Movimientos_Reporteria.xlsx. Probé: ${candidates.join(' | ')}`
  );
}

/**
 * "Quién lo resolvió" en Incidente:
 * En tu modelo Incidente no existe “resolvedBy”.
 * Aquí interpretamos:
 * - Si estado != ABIERTO y fechaFin != null, el actor del incidente = “resueltoPor” (mejor proxy disponible).
 */
function incidenteResueltoPor(i: IncidenteExcelRow) {
  if (i.estado === 'ABIERTO') return null;
  if (!i.fechaFinUTC) return null;
  return i.actorNombre || null;
}

function fillResumenSheet(wb: ExcelJS.Workbook, sheetName: string, rows: ResumenGrupo[]) {
  const ws = tryWs(wb, sheetName);
  if (!ws) return;

  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  for (const g of rows) {
    ws.addRow([
      g.key,
      g.id ?? null,

      g.totalMov,
      g.concluidos,
      g.cancelados,
      g.enProceso,
      g.espera,
      g.solicitado,
      g.otrosEstado,

      g.totalInc,
      g.incAbiertos,
      g.incResueltos,
      g.incCerrados,

      g.movConIncidente,
      g.movConIncidenteAbierto,
      g.movConEvidencia,

      g.duracionPromMin,
      g.esperaPromMin,

      g.impacto,
    ]);
  }
}

function fillSerie(ws: ExcelJS.Worksheet, rows: any[], mapper: (r: any) => any[]) {
  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);
  for (const r of rows) ws.addRow(mapper(r));
}

function tryWriteDashboard(wb: ExcelJS.Workbook, data: ReporteExcel) {
  const wsDash = tryWs(wb, 'Dashboard');
  if (!wsDash) return;

  try {
    wsDash.getCell('B2').value = data.meta.periodo;
    wsDash.getCell('B3').value = data.meta.fechaLocal;
    wsDash.getCell('B4').value = data.meta.tz;
    wsDash.getCell('B5').value = `${data.meta.rangoLocal.desde} → ${data.meta.rangoLocal.hastaExclusivo}`;
    wsDash.getCell('B6').value = data.general.totalMov;
    wsDash.getCell('B7').value = data.general.totalInc;
    wsDash.getCell('B8').value = `${data.general.movConIncPct}%`;
    wsDash.getCell('B9').value = data.general.duracionPromMin ?? '—';
    wsDash.getCell('B10').value = data.general.esperaPromMin ?? '—';
  } catch {
    // noop
  }
}

function fillGeneralSheet(wb: ExcelJS.Workbook, data: ReporteExcel) {
  const ws = tryWs(wb, 'General');
  if (!ws) return;

  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  ws.addRow([
    data.meta.periodo,
    data.meta.fechaLocal,
    data.meta.tz,
    data.meta.rangoLocal.desde,
    data.meta.rangoLocal.hastaExclusivo,
    data.meta.rangoUTC.desde,
    data.meta.rangoUTC.hastaExclusivo,

    data.general.totalMov,
    data.general.totalInc,
    data.general.movConInc,
    data.general.movConIncPct,

    data.general.incAbiertos,
    data.general.incResueltos,
    data.general.incCerrados,

    data.general.duracionPromMin,
    data.general.esperaPromMin,
  ]);
}

function fillMovimientosSheet(wsMov: ExcelJS.Worksheet, movimientos: MovimientoExcelRow[]) {
  clearSheetKeepHeader(wsMov);
  setAutoFilterOnHeader(wsMov);

  for (const r of movimientos) {
    wsMov.addRow([
      r.movimientoId,

      r.empresaId,
      r.empresa,

      r.localidadId,
      r.localidad,

      r.estado,
      r.prioridad,
      r.tipoMovimiento,

      r.locomotiveNumber,

      r.fechaSolicitudUTC,
      r.fechaInicioUTC,
      r.fechaFinUTC,

      r.creadoPorId,
      r.creadoPorNombre,

      r.clienteId,
      r.clienteNombre,

      r.operadorId,
      r.operadorNombre,

      r.supervisorId,
      r.supervisorNombre,

      r.coordinadorId,
      r.coordinadorNombre,

      r.finalizado,

      r.duracionMin,
      r.esperaHastaInicioMin,
      r.tiempoHastaFinMin,

      r.tieneIncidentes,
      r.totalIncidentes,
      r.incAbiertos,
      r.incResueltos,
      r.incCerrados,

      r.primerIncidenteUTC,
      r.ultimoIncidenteUTC,
      r.tiempoHastaPrimerIncidenteMin,

      r.totalEvidenciasIncidentes,
      r.tieneEvidencia,

      r.incidentePendiente,

      r.diaMX,
      r.mesMX,
      r.anioMX,
      r.semanaISO,
    ]);
  }
}

function fillIncidentesSheet(wsInc: ExcelJS.Worksheet, incidentes: IncidenteExcelRow[]) {
  clearSheetKeepHeader(wsInc);
  setAutoFilterOnHeader(wsInc);

  for (const i of incidentes) {
    wsInc.addRow([
      i.incidenteId,
      i.movimientoId,

      i.estado,
      i.descripcion,

      i.fechaInicioUTC,
      i.fechaFinUTC,

      i.actorId,
      i.actorNombre,
      i.actorRol,

      i.imagen1,
      i.imagen2,
      i.imagen3,
      i.imagen4,

      i.totalEvidencias,
      i.tieneEvidencia,

      i.diaMX,
      i.mesMX,
      i.anioMX,
      i.semanaISO,
    ]);
  }
}

/**
 * Hoja “Movimientos_Incidentes”:
 * - Explota una fila por incidente (si no tiene incidentes, aún deja fila con flags).
 */
function fillMovimientosIncidentesSheet(wb: ExcelJS.Workbook, data: ReporteExcel) {
  const ws = ensureWorksheet(wb, 'Movimientos_Incidentes');

  // Header fijo (lo ponemos nosotros si la hoja estaba vacía)
  if (ws.rowCount === 0) {
    ws.addRow([
      'movimientoId',
      'fechaSolicitudUTC',
      'fechaInicioUTC',
      'fechaFinUTC',
      'diaMX',
      'mesMX',
      'anioMX',
      'semanaISO',

      'empresaId',
      'empresa',
      'localidadId',
      'localidad',
      'locomotiveNumber',
      'estado',
      'prioridad',
      'tipoMovimiento',

      'creadoPorId',
      'creadoPorNombre',
      'clienteId',
      'clienteNombre',
      'operadorId',
      'operadorNombre',
      'supervisorId',
      'supervisorNombre',
      'coordinadorId',
      'coordinadorNombre',

      'tieneIncidentes',
      'incidentePendiente',
      'totalIncidentes',
      'incAbiertos',
      'incResueltos',
      'incCerrados',
      'totalEvidenciasIncidentes',
      'tieneEvidencia',

      // Incidente (1 por fila)
      'incidenteId',
      'incEstado',
      'incDescripcion',
      'incFechaInicioUTC',
      'incFechaFinUTC',
      'incActorId',
      'incActorNombre',
      'incActorRol',
      'incResueltoPorProxy',
      'incTotalEvidencias',
      'incTieneEvidencia',
      'incImagen1',
      'incImagen2',
      'incImagen3',
      'incImagen4',
    ]);
  }

  clearSheetKeepHeader(ws);
  setAutoFilterOnHeader(ws);

  const byMov = new Map<number, IncidenteExcelRow[]>();
  for (const i of data.incidentes) {
    const arr = byMov.get(i.movimientoId) ?? [];
    arr.push(i);
    byMov.set(i.movimientoId, arr);
  }

  for (const m of data.movimientos) {
    const incs = byMov.get(m.movimientoId) ?? [];

    if (!incs.length) {
      ws.addRow([
        m.movimientoId,
        m.fechaSolicitudUTC,
        m.fechaInicioUTC,
        m.fechaFinUTC,
        m.diaMX,
        m.mesMX,
        m.anioMX,
        m.semanaISO,

        m.empresaId,
        m.empresa,
        m.localidadId,
        m.localidad,
        m.locomotiveNumber,
        m.estado,
        m.prioridad,
        m.tipoMovimiento,

        m.creadoPorId,
        m.creadoPorNombre,
        m.clienteId,
        m.clienteNombre,
        m.operadorId,
        m.operadorNombre,
        m.supervisorId,
        m.supervisorNombre,
        m.coordinadorId,
        m.coordinadorNombre,

        m.tieneIncidentes,
        m.incidentePendiente,
        m.totalIncidentes,
        m.incAbiertos,
        m.incResueltos,
        m.incCerrados,
        m.totalEvidenciasIncidentes,
        m.tieneEvidencia,

        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
      continue;
    }

    for (const i of incs) {
      ws.addRow([
        m.movimientoId,
        m.fechaSolicitudUTC,
        m.fechaInicioUTC,
        m.fechaFinUTC,
        m.diaMX,
        m.mesMX,
        m.anioMX,
        m.semanaISO,

        m.empresaId,
        m.empresa,
        m.localidadId,
        m.localidad,
        m.locomotiveNumber,
        m.estado,
        m.prioridad,
        m.tipoMovimiento,

        m.creadoPorId,
        m.creadoPorNombre,
        m.clienteId,
        m.clienteNombre,
        m.operadorId,
        m.operadorNombre,
        m.supervisorId,
        m.supervisorNombre,
        m.coordinadorId,
        m.coordinadorNombre,

        m.tieneIncidentes,
        m.incidentePendiente,
        m.totalIncidentes,
        m.incAbiertos,
        m.incResueltos,
        m.incCerrados,
        m.totalEvidenciasIncidentes,
        m.tieneEvidencia,

        i.incidenteId,
        i.estado,
        i.descripcion,
        i.fechaInicioUTC,
        i.fechaFinUTC,
        i.actorId,
        i.actorNombre,
        i.actorRol,
        incidenteResueltoPor(i),
        i.totalEvidencias,
        i.tieneEvidencia,
        i.imagen1,
        i.imagen2,
        i.imagen3,
        i.imagen4,
      ]);
    }
  }
}

export async function exportarReporteMovimientoExcel(params: {
  periodo?: any;
  fecha: any;
  tz?: any;
  localidadId?: any;
  empresaId?: any;
}): Promise<ExcelFile> {
  const periodo = pickPeriodo(params.periodo);
  const tz = String(params.tz ?? 'America/Mexico_City').trim() || 'America/Mexico_City';
  const fecha = assertYYYYMMDD(params.fecha);

  const localidadId = parseIntOpt(params.localidadId);
  const empresaId = parseIntOpt(params.empresaId);

  // 1) Data
  const data = await ReporteriaMovimientoExcelModel.reportePorPeriodo(
    { fecha, tz, localidadId, empresaId },
    periodo
  );

  // 2) Plantilla (resolver rutas)
  const templatePath = findTemplatePath();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  // 3) Política visual por periodo
  applyPeriodoSheetPolicy(wb, periodo);

  // 4) Hojas base (OBLIGATORIAS)
  // Alias por si tu plantilla trae nombres raros tipo "MOVIMIENTOS" / "Movimientos " / etc.
  const wsMov = wsOrThrow(wb, 'Movimientos', ['MOVIMIENTOS', 'Movimiento', 'MOVIMIENTO']);
  const wsInc = wsOrThrow(wb, 'Incidentes', ['INCIDENTES', 'Incidente', 'INCIDENTE']);

  fillMovimientosSheet(wsMov, data.movimientos);
  fillIncidentesSheet(wsInc, data.incidentes);

  // 5) Hoja combinada (si no existe, se crea)
  fillMovimientosIncidentesSheet(wb, data);

  // 6) Agregados (si existen)
  fillGeneralSheet(wb, data);

  fillResumenSheet(wb, 'PorEmpresa', data.porEmpresa);
  fillResumenSheet(wb, 'PorCreador', data.porCreador);
  fillResumenSheet(wb, 'PorOperador', data.porOperador);
  fillResumenSheet(wb, 'PorCliente', data.porCliente);

  // 7) Series (solo la que aplica por periodo)
  const wsSerieDia = tryWs(wb, 'SerieDia');
  if (wsSerieDia && (periodo === 'DIA' || periodo === 'SEMANA')) {
    fillSerie(wsSerieDia, data.seriePorDia, (s) => [s.diaMX, s.totalMov, s.totalInc, s.movConInc]);
  }

  const wsSerieMes = tryWs(wb, 'SerieMes');
  if (wsSerieMes && (periodo === 'MES' || periodo === 'BIMESTRE' || periodo === 'SEMESTRE')) {
    fillSerie(wsSerieMes, data.seriePorMes, (s) => [s.mesMX, s.totalMov, s.totalInc, s.movConInc]);
  }

  const wsSerieAnio = tryWs(wb, 'SerieAnio');
  if (wsSerieAnio && periodo === 'ANUAL') {
    fillSerie(wsSerieAnio, data.seriePorAnio, (s) => [s.anioMX, s.totalMov, s.totalInc, s.movConInc]);
  }

  // 8) Dashboard (si existe)
  tryWriteDashboard(wb, data);

  // 9) Output
  const etiquetaRaw = data.meta.etiqueta || data.meta.fechaLocal || 'Movimientos';
  const filename = `Reporte_Movimientos_${safeFilename(etiquetaRaw)}.xlsx`;

  // Si aquí te vuelve a tronar con "anchors", el problema YA NO es tu hoja:
  // es la plantilla (objetos/drawings) + versión de ExcelJS.
  const buffer = await wb.xlsx.writeBuffer();

  return {
    filename,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(buffer),
  };
}
