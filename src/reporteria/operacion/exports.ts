import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import type { Snapshot } from './service';
import { Group, ISSUE_LABELS, ZONE, BAND_LABELS, equivalentDays } from './analytics';
import { newPdfPage } from '../modelos/pdf-browser';
import { escapeHtml } from '../modelos/pdf-helpers';
import { injectNativeExcelCharts, NativeExcelChartSpec } from '../modelos/native-excel-charts';

export const numberText = (v: number | null, decimals = 1) => v === null ? 'Sin datos' : v.toLocaleString('es-MX', { maximumFractionDigits: decimals });
export const localText = (v: string | null) => v ? DateTime.fromISO(v, { zone: ZONE }).toFormat('dd/LL/yyyy HH:mm') : 'Sin registro';
// Excel dates have no timezone. Store local wall time explicitly, with a labeled timezone.
const localDate = (v: string | null) => v ? new Date(DateTime.fromISO(v, { zone: ZONE }).toFormat("yyyy-LL-dd'T'HH:mm:ss.SSS'Z'")) : null;
export function exportFilename(r: Snapshot, ext: string) { return `Cosaif_Administracion_${r.meta.from}_${r.meta.to}_${r.meta.id.slice(0, 8)}.${ext}`; }
const pctValue = (v: number | null) => v === null ? null : v / 100;
type Cell = string | number | Date | null;
function table(w: ExcelJS.Workbook, name: string, title: string, context: string, headers: string[], rows: Cell[][], widths: number[], formats: Record<number, string> = {}) {
  const s = w.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 5, xSplit: 1, showGridLines: false }], properties: { defaultRowHeight: 22 } });
  widths.forEach((width, i) => { s.getColumn(i + 1).width = width; });
  s.getCell('A2').value = title; s.getCell('A2').font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF142C45' } };
  s.getCell('A3').value = context; s.getCell('A3').font = { name: 'Arial', size: 10, color: { argb: 'FF475569' } };
  s.getRow(5).values = headers; s.getRow(5).height = 44;
  rows.forEach(row => s.addRow(row));
  for (let r = 5; r <= 5 + rows.length; r++) {
    const row = s.getRow(r);
    row.eachCell({ includeEmpty: true }, (c, col) => {
      c.font = { name: 'Arial', size: 10, color: { argb: r === 5 ? 'FFFFFFFF' : 'FF142C45' }, bold: r === 5 };
      c.alignment = { vertical: 'middle', horizontal: r === 5 ? 'center' : typeof c.value === 'number' ? 'right' : 'left', wrapText: r === 5, indent: r === 5 ? 0 : 1 };
      if (r === 5 || r % 2 === 0) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r === 5 ? 'FF142C45' : 'FFF1F5F9' } };
      if (r > 5 && formats[col]) c.numFmt = formats[col];
    });
  }
  s.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + rows.length, column: headers.length } };
  s.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:5', margins: { left: .3, right: .3, top: .4, bottom: .4, header: .2, footer: .2 } };
  s.headerFooter.oddFooter = '&LCosaif - Administración&R&P / &N';
  return s;
}
export async function exportExcel(r: Snapshot): Promise<Buffer> {
  // Use the application's existing Excel engine; no desktop authoring runtime is required by the deployed API.
  const w = new ExcelJS.Workbook(); w.creator = 'Cosaif'; w.created = new Date(r.meta.generatedAt); w.calcProperties.fullCalcOnLoad = true;
  const context = `${r.meta.from} al ${r.meta.to} · ${r.meta.company} · ${r.meta.client} · ${r.meta.locality}`;
  const k = r.summary, b = r.baseline;
  const rows: Cell[][] = [
    ['Movimientos solicitados', k.total, b.total, 'Una solicitud cuenta una sola vez.'],
    ['Concluidos', k.concluded, b.concluded, 'Estado actual Concluido.'],
    ['Cancelados', k.cancelled, b.cancelled, 'Estado actual Cancelado.'],
    ['Detenidos', k.stopped, b.stopped, 'Puede incluir movimientos ya finalizados.'],
    ['Pendientes del periodo', k.pending, b.pending, 'Sin finalizar y sin estado Concluido o Cancelado.'],
    ['Tiempo habitual hasta comenzar (min)', k.waitMedian, b.waitMedian, `${k.waitN} intervalos válidos; ${k.missingWait} excluidos.`],
    ['Tiempo para 9 de cada 10 (min)', k.waitP90, b.waitP90, 'Percentil 90 interpolado de espera.'],
    ['Duración habitual del movimiento (min)', k.executionMedian, b.executionMedian, `${k.executionN} intentos con inicio y corte válidos. Incluye pausas.`],
    ['Movimientos con incidentes', k.affected, b.affected, 'Solicitudes distintas con uno o más incidentes.'],
    ['Tasa de movimientos con incidentes', pctValue(k.incidentRate), pctValue(b.incidentRate), 'Con incidente / total de movimientos.'],
    [`Iniciados dentro de ${r.meta.target} min`, k.withinTarget, b.withinTarget, 'Objetivo de análisis, no SLA contractual.'],
    ['Proporción dentro del objetivo', pctValue(k.targetRate), pctValue(b.targetRate), 'Dentro del objetivo / movimientos con espera válida.'],
    ['Movimientos con espera válida', k.waitN, b.waitN, 'Base del objetivo de atención.'],
    ['Incidentes vinculados', k.incidents, b.incidents, 'Todos los incidentes de las solicitudes seleccionadas.'],
    ['Duración menor de 10 min · Revisar', k.durationShort, b.durationShort, 'Concluidos, detenidos y cancelados con duración válida estrictamente menor de 10.'],
    ['Duración 10 a 30 min · Aceptable', k.durationAcceptable, b.durationAcceptable, 'Ambos límites incluidos.'],
    ['Duración mayor de 30 min · Atención', k.durationLong, b.durationLong, 'Concluidos, detenidos y cancelados con duración válida estrictamente mayor de 30.'],
    ['Registros con fechas por completar', k.durationUnassessed, b.durationUnassessed, `${k.durationOpen} abiertos sin corte; ${k.durationMissing} cerrados sin inicio/corte válidos. No entran en el porcentaje aceptable.`],
    ['Proporción de duración aceptable', pctValue(k.acceptableRate), pctValue(b.acceptableRate), 'Aceptables / intentos con duración válida. Estar en rango no significa haber concluido.'],
    ['Espera promedio (min)', k.waitAverage, b.waitAverage, 'Promedio de intervalos válidos entre solicitud e inicio.'],
    ['Duración promedio (min)', k.executionAverage, b.executionAverage, 'Promedio de concluidos, detenidos y cancelados con duración válida. Incluye pausas.'],
    ['Exceso sobre 30 minutos', k.excessMinutes, b.excessMinutes, 'Suma de max(duración - 30, 0) por intento válido. No es imputación de responsabilidad.'],
    ['Minutos coincidentes con incidentes', k.incidentMinutes, b.incidentMinutes, 'Intervalos unidos por movimiento observado. Puede coincidir con el exceso: no sumar.'],
    ['Retraso del cliente (min)', k.clientDelayMinutes, b.clientDelayMinutes, 'Detenidos y cancelados: inicio → corte de detención/cancelación. Criterio administrativo.'],
    ['Retraso del cliente: intentos con tiempo', k.clientDelayN, b.clientDelayN, 'Solo con inicio y corte válidos. La espera previa está separada.'],
    ['Retraso del cliente: fechas por completar', k.clientDelayMissing, b.clientDelayMissing, 'Conservan su estado; no se sustituyen por cero minutos.'],
    ['Duración acumulada de concluidos (min)', k.concludedMinutes, b.concludedMinutes, 'Tiempo inicio → fin de los concluidos.'],
    ['Cancelados por límite identificado', k.cancelledByIncidentLimit, b.cancelledByIncidentLimit, 'Comentario explícito de cancelación por al menos 3 incidentes de la solicitud.'],
    ['Movimientos con reprogramación identificada', k.reprogrammed, b.reprogrammed, 'Referencia explícita al siguiente movimiento; ver Reintentos.'],
    ['Retraso del cliente (días de 24 h)', k.clientDelayDays, b.clientDelayDays, 'Mismo tiempo que Retraso del cliente (min), dividido entre 1,440. No se suman las unidades.'],
    ['Tiempo con incidentes (días de 24 h)', k.incidentDays, b.incidentDays, 'Minutos coincidentes con incidentes / 1,440. Son días acumulados de movimientos, no días de paro del patio.'],
    ['Incidentes: movimientos con fechas pendientes', k.incidentTimeMissing, b.incidentTimeMissing, 'El tiempo con incidentes puede ser parcial; incluye fechas faltantes del movimiento o de algún incidente.'],
  ];
  const s = table(w, 'Resumen', 'Cosaif | Resumen de la operación', context, ['Indicador', 'Seleccionado', r.meta.comparisonCovered ? 'Anterior' : 'Anterior (sin cobertura)', 'Cómo leerlo'], rows, [48, 22, 22, 88], { 2: '#,##0.0', 3: '#,##0.0' });
  s.properties.tabColor = { argb: 'FF142C45' }; s.views = [{ showGridLines: false }];
  for (const n of [15, 17]) { s.getCell(n, 2).numFmt = '0.0%'; s.getCell(n, 3).numFmt = '0.0%'; }
  for (const n of [6, 7, 8, 9, 10, 14, 16, 18, 19]) { s.getCell(n, 2).numFmt = '#,##0'; s.getCell(n, 3).numFmt = '#,##0'; }
  // Ratios have transparent formulas plus verified cached values for readers without recalculation.
  for (const col of ['B', 'C']) {
    const data = col === 'B' ? k : b;
    s.getCell(`${col}15`).value = { formula: `IF(${col}6=0,"Sin datos",${col}14/${col}6)`, result: data.incidentRate === null ? 'Sin datos' : data.incidentRate / 100 };
    s.getCell(`${col}17`).value = { formula: `IF(${col}18=0,"Sin datos",${col}16/${col}18)`, result: data.targetRate === null ? 'Sin datos' : data.targetRate / 100 };
  }
  s.getCell('B24').numFmt = '0.0%'; s.getCell('C24').numFmt = '0.0%';
  for (const n of [20, 21, 22, 23, 30, 31, 33, 34]) for (const col of [2, 3]) s.getCell(n, col).numFmt = '#,##0';
  for (let n = 6; n <= rows.length + 5; n++) { s.getCell(n, 4).alignment = { wrapText: true, vertical: 'middle', indent: 1 }; s.getRow(n).height = 32; for (const col of [2, 3]) if (s.getCell(n, col).value === null) s.getCell(n, col).value = 'Sin datos'; }
  for (let row = 6; row <= rows.length + 5; row++) for (const col of [2, 3]) s.getCell(row, col).alignment = { horizontal: 'center', vertical: 'middle' };
  let row = rows.length + 9;
  for (const note of [`Generado: ${localText(r.meta.generatedAt)} (${ZONE}). Consulta: ${r.meta.id}`, `Comparación: ${localText(r.meta.previousStart)} a ${localText(r.meta.previousEndExclusive)} (fin exclusivo).`, ...r.meta.warnings, ...r.insights.map(i => `${i.title}. ${i.action}`)]) {
    s.mergeCells(row, 1, row, 4); s.getCell(row, 1).value = note; s.getCell(row, 1).font = { name: 'Arial', size: 10 }; s.getCell(row, 1).alignment = { wrapText: true, vertical: 'middle' }; s.getRow(row).height = 32; row++;
  }
  const groupHeaders = ['Grupo', 'Movimientos', 'Concluidos', 'Cancelados', 'Con incidentes', 'Tasa de incidentes', 'Espera válida (n)', 'Espera habitual (min)', 'Espera 9 de 10 (min)', 'Dentro del objetivo de espera', 'Muestra', 'Menos de 10 min', '10 a 30 min', 'Más de 30 min', 'Fechas por completar', 'Proporción aceptable', 'Evaluados (n)', 'Espera promedio (min)', 'Duración promedio (min)', 'Exceso sobre 30 (min)', 'Coincidencia incidentes (min)', 'Retraso del cliente (min)', 'Retraso válido (n)', 'Retraso: fechas pendientes', 'Detenidos', 'Retraso cliente (días 24 h)', 'Con incidentes (días 24 h)'];
  const groupSheet = (name: string, title: string, groups: Group[]) => table(w, name, title, context, groupHeaders,
    groups.map(g => [g.label, g.total, g.concluded, g.cancelled, g.affected, pctValue(g.incidentRate), g.waitN, g.waitMedian, g.waitP90, pctValue(g.targetRate), g.smallSample ? 'Menos de 30' : '30 o más', g.durationShort, g.durationAcceptable, g.durationLong, g.durationUnassessed, pctValue(g.acceptableRate), g.executionN, g.waitAverage, g.executionAverage, g.excessMinutes, g.incidentMinutes, g.clientDelayMinutes, g.clientDelayN, g.clientDelayMissing, g.stopped, g.clientDelayDays, g.incidentDays]),
    [46, 15, 15, 15, 17, 18, 17, 20, 20, 22, 18, 18, 18, 18, 20, 20, 18, 22, 22, 22, 25, 26, 22, 26, 18, 25, 25], { 26: '0.0000', 27: '0.0000', 6: '0.0%', 8: '0.0', 9: '0.0', 10: '0.0%', 16: '0.0%', 18: '0.0', 19: '0.0', 20: '0.0', 21: '0.0', 22: '0.0' });
  groupSheet('Empresas', 'Servicio por empresa', r.companies);
  table(w, 'Clientes por empresa', 'Empresa → cliente → operación', context,
    ['Empresa', 'Cliente', 'Solicitudes', 'Menos de 10', '10 a 30', 'Más de 30', 'Fechas por completar', 'Aceptable', 'Evaluados (n)', 'Con incidentes', 'Tasa de incidentes', 'Espera promedio (min)', 'Duración promedio (min)', 'Exceso sobre 30 (min)', 'Coincidencia incidentes (min)', 'Empresa ID', 'Cliente ID', 'Retraso del cliente (min)', 'Retraso válido (n)', 'Retraso: fechas pendientes', 'Detenidos', 'Cancelados', 'Retraso cliente (días 24 h)', 'Con incidentes (días 24 h)', 'Incidentes: movimientos con fechas pendientes'],
    r.clients.map(c => [c.company, c.client, c.total, c.durationShort, c.durationAcceptable, c.durationLong, c.durationUnassessed, pctValue(c.acceptableRate), c.executionN, c.affected, pctValue(c.incidentRate), c.waitAverage, c.executionAverage, c.excessMinutes, c.incidentMinutes, c.companyId, c.clientId, c.clientDelayMinutes, c.clientDelayN, c.clientDelayMissing, c.stopped, c.cancelled, c.clientDelayDays, c.incidentDays, c.incidentTimeMissing]),
    [24, 38, 16, 17, 17, 17, 17, 18, 18, 18, 20, 23, 23, 23, 25, 16, 16, 26, 22, 26, 18, 18, 25, 25, 30], { 23: '0.0000', 24: '0.0000', 18: '0.0', 8: '0.0%', 11: '0.0%', 12: '0.00', 13: '0.00', 14: '0.0', 15: '0.0' });

  const clientTimes = [...r.clients].sort((a, b) => b.incidentMinutes - a.incidentMinutes || b.clientDelayMinutes - a.clientDelayMinutes);
  const delay = table(w, 'Retraso del cliente', 'Por cliente | Retrasos e incidentes en días y minutos',
    context + '\n1 día = 1,440 min. Son dos unidades del mismo tiempo. Incidentes = coincidencia durante el movimiento; retraso cliente = inicio → detención/cancelación. Las dos lecturas pueden solaparse: no se suman. Fechas pendientes indica un total parcial; una celda vacía significa que no hay intervalo calculable.',
    ['Empresa', 'Cliente', 'Minutos con incidentes', 'Días de 24 h con incidentes', 'Minutos de retraso cliente', 'Días de 24 h de retraso cliente', 'Con incidentes (mov.)', 'Detenidos / cancelados', 'Fechas pendientes: incidentes (mov.)', 'Fechas pendientes: retraso (intentos)'],
    clientTimes.map(c => [c.company, c.client, c.incidentDays === null ? null : c.incidentMinutes, c.incidentDays, c.clientDelayDays === null ? null : c.clientDelayMinutes, c.clientDelayDays, c.affected, c.stopped + ' / ' + c.cancelled, c.incidentTimeMissing, c.clientDelayMissing]),
    [22, 31, 20, 20, 20, 20, 18, 20, 23, 23], { 3: '#,##0.0', 4: '0.0000', 5: '#,##0.0', 6: '0.0000' });
  delay.mergeCells('A2:J2'); delay.mergeCells('A3:J3');
  delay.getRow(2).height = 32; delay.getRow(3).height = 62; delay.getRow(5).height = 56;
  delay.getCell('A3').alignment = { wrapText: true, vertical: 'middle' };
  delay.views = [{ state: 'frozen', ySplit: 5, xSplit: 2, showGridLines: false }];
  delay.properties.tabColor = { argb: 'FF167D9A' };
  for (const [from, to, label, color] of [[1, 2, 'EMPRESA Y CLIENTE', 'FF142C45'], [3, 4, 'TIEMPO CON INCIDENTES', 'FF167D9A'], [5, 6, 'RETRASO DEL CLIENTE', 'FF8B5418'], [7, 8, 'MOVIMIENTOS', 'FF142C45'], [9, 10, 'COBERTURA DEL CÁLCULO', 'FF526477']] as const) {
    delay.mergeCells(4, from, 4, to);
    const cell = delay.getCell(4, from); cell.value = label;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  delay.getRow(4).height = 28;
  clientTimes.forEach((c, i) => {
    const row = i + 6; delay.getRow(row).height = 40;
    for (const col of [1, 2]) delay.getCell(row, col).alignment = { wrapText: true, vertical: 'middle', indent: 1 };
    for (const [col, source, days] of [[4, 'C', c.incidentDays], [6, 'E', c.clientDelayDays]] as const) {
      if (days !== null) delay.getCell(row, col).value = { formula: source + row + '/1440', result: days };
      delay.getCell(row, col).font = { name: 'Arial', size: 11, bold: true, color: { argb: col === 4 ? 'FF167D9A' : 'FF8B5418' } };
    }
  });
  table(w, 'Reintentos', 'Reprogramaciones identificadas', 'Solo referencias explícitas entre IDs. Suma por intento visible; la cadena puede ser parcial por periodo o filtros.',
    ['Empresa', 'Cliente', 'Locomotora', 'IDs de intentos', 'Intentos visibles', 'Último estado visible', 'Retraso del cliente (min)', 'Retraso: fechas pendientes', 'Espera acumulada (min)', 'Ejecución acumulada (min)', 'Incidentes', 'Cancelado por límite', 'Continuación fuera de selección'],
    r.retries.map(c => [c.company, c.client, c.locomotive, c.ids.join(' → '), c.attempts, c.state, c.clientDelayMinutes, c.clientDelayMissing, c.waitMinutes, c.executionMinutes, c.incidents, c.cancelledByIncidentLimit ? 'Sí' : 'No identificado', c.continuesOutside ? 'Sí' : 'No identificada']),
    [24, 38, 18, 48, 20, 25, 28, 28, 27, 28, 18, 25, 30], { 7: '0.0', 9: '0.0', 10: '0.0' });
  const destinationHeaders = ['Destino', 'Empresa / cliente', 'Solicitudes hacia la vía', 'Entradas concluidas', 'Detenidos', 'Cancelados', 'Retraso del cliente (min)', 'Retraso: fechas pendientes', 'Espera promedio entradas (min)', 'Ejecución promedio entradas (min)', 'Entradas con duración válida', 'Entradas por vía registrada', 'Entradas por servicio marcado', 'Retraso cliente (días 24 h)', 'Con incidentes (min)', 'Con incidentes (días 24 h)'];
  const destinationRows = r.destinations.flatMap(d => [[d.label, 'TOTAL', d.total, d.concluded, d.stopped, d.cancelled, d.clientDelayMinutes, d.clientDelayMissing, d.completed.waitAverage, d.completed.executionAverage, d.completed.executionN, d.completedVia, d.completedService, d.clientDelayDays, d.incidentMinutes, d.incidentDays], ...d.clients.map(c => [d.label, c.label, c.total, c.concluded, c.stopped, c.cancelled, c.clientDelayMinutes, c.clientDelayMissing, c.completed.waitAverage, c.completed.executionAverage, c.completed.executionN, c.completedVia, c.completedService, c.clientDelayDays, c.incidentMinutes, c.incidentDays])]);
  table(w, 'Torno y lavado', 'Entradas concluidas e intentos que retrasaron la operación', 'Destino por vía o por servicio Torno/Lavado cuando falta la vía. Entradas solo concluidas. Filas TOTAL no se suman con el detalle.',
    destinationHeaders, destinationRows, [20, 52, 25, 24, 18, 18, 27, 27, 31, 33, 27, 28, 30, 25, 25, 25], { 14: '0.0000', 15: '#,##0.0', 16: '0.0000', 7: '0.0', 9: '0.0', 10: '0.0' });

  const vias = groupSheet('Vías', 'Vías utilizadas como origen o destino', r.vias);
  vias.getCell('A3').value = context + ' · Cada movimiento cuenta una vez por vía; no mide ocupación.';
  const informer = table(w, 'Informantes', 'Incidentes por usuario informante', context,
    ['Informante', 'Incidentes', 'Movimientos distintos', 'Abiertos', 'Resueltos', 'Cerrados', 'Resolución válida (n)', 'Resolución promedio (min)', 'Resolución habitual (min)', 'Resolución 9 de 10 (min)'],
    r.incidents.reporters.map(i => [i.label, i.total, i.movements, i.open, i.resolved, i.closed, i.resolutionN, i.resolutionAverage, i.resolutionMedian, i.resolutionP90]),
    [40, 17, 23, 17, 17, 17, 24, 25, 25, 25], { 8: '0.0', 9: '0.0', 10: '0.0' });
  informer.getCell('A3').value = 'Informante registrado, no causante. CERRADO puede incluir cierre automático; resolución usa RESUELTO.';
  const resolution = table(w, 'Resolución', 'Estado y tiempos de resolución', context, ['Indicador', 'Valor', 'Cómo leerlo'], [
    ['Incidentes abiertos', r.incidents.open, 'Estado actual ABIERTO.'],
    ['Incidentes resueltos', r.incidents.resolved, 'Estado RESUELTO.'],
    ['Incidentes cerrados', r.incidents.closed, 'Estado CERRADO; puede incluir cierre automático sin resolución.'],
    ['Resoluciones válidas (n)', r.incidents.resolutionN, 'Resueltos con fecha de inicio y fin válidas.'],
    ['Resolución promedio (min)', r.incidents.resolutionAverage, 'Suma de minutos / resoluciones válidas.'],
    ['Resolución habitual (min)', r.incidents.resolutionMedian, 'Mediana.'],
    ['Resolución para 9 de 10 (min)', r.incidents.resolutionP90, 'Percentil 90 interpolado.'],
    ['Resueltos sin intervalo válido', r.incidents.resolutionMissing, 'Excluidos de los tiempos de resolución.'],
  ], [42, 22, 88], { 2: '0.0' });
  for (let row = 6; row <= 13; row++) resolution.getCell(row, 2).alignment = { horizontal: 'center', vertical: 'middle' };
  for (const row of [6, 7, 8, 9, 13]) resolution.getCell(row, 2).numFmt = '#,##0';
  groupSheet('Tendencia diaria', 'Solicitudes por día local', r.days);
  groupSheet('Horarios', `Demanda por hora (${ZONE})`, r.hours);
  groupSheet('Turnos', 'Turnos según la hora de solicitud', r.shifts);
  groupSheet('Rutas', 'Rutas de los movimientos', r.routes);
  groupSheet('Locomotoras', 'Historial por empresa y locomotora', r.locomotives);
  groupSheet('Operadores', 'Actividad registrada por operador', r.operators);
  const quality = table(w, 'Calidad', 'Registros para revisar', context, ['Revisión', 'Movimientos', 'Proporción del periodo'], r.quality.map(q => [q.label, q.count, k.total ? q.count / k.total : null]), [52, 20, 24], { 3: '0.0%' });
  quality.getCell('A3').value = 'Un movimiento puede aparecer en varias revisiones. Una ausencia no implica un error confirmado.';
  const detail = table(w, 'Movimientos', 'Detalle completo de solicitudes', `${context} · Horas locales: ${ZONE}`, ['ID', 'Empresa', 'Localidad', 'Locomotora', 'Estado', 'Tipo', 'Origen', 'Destino', 'Solicitud local', 'Inicio local', 'Fin local', 'Espera (min)', 'Duración (min)', 'Incidentes', 'Operador', 'Supervisor', 'Coordinador', 'Revisiones', 'Cliente asociado', 'Criterio de duración', 'Exceso sobre 30 (min)', 'Coincidencia incidentes (min)', 'Corte de duración local', 'Retraso del cliente (min)', 'Reprogramado como ID', 'Cancelado por límite identificado', 'Tiempo total desde solicitud (min)', 'Tiempo total provisional', 'Vía de destino original', 'Cómo se identificó el destino', 'Retraso cliente (días 24 h)', 'Con incidentes (días 24 h)'],
    r.rows.map(m => [m.id, m.company, m.locality, m.locomotive, m.stateLabel, m.type, m.origin, m.destination, localDate(m.requestedAt), localDate(m.startedAt), localDate(m.endedAt), m.wait, m.execution, m.incidentCount, m.operator, m.supervisor, m.coordinator, m.issues.map(i => ISSUE_LABELS[i]).join('; '), m.client, BAND_LABELS[m.durationBand], m.durationBand !== 'unassessed' && m.execution !== null ? Math.max(0, m.execution - 30) : null, m.incidentMinutes, localDate(m.durationEnd), m.clientDelay, m.reprogrammedTo, m.cancelledByIncidentLimit ? 'Sí' : 'No identificado', m.elapsed, m.elapsedProvisional ? 'Hasta la consulta' : 'Cerrado', m.destinationRaw, m.destinationEvidence === 'service' ? 'Servicio marcado en la solicitud' : m.destinationEvidence === 'via' ? 'Vía de destino registrada' : m.destinationEvidence === 'ambiguous' ? 'Torno y lavado: confirmar' : 'Sin vía ni servicio identificado', equivalentDays(m.clientDelay), equivalentDays(m.incidentMinutes)]),
    [12, 23, 20, 15, 18, 21, 20, 20, 23, 23, 23, 17, 17, 14, 27, 27, 27, 85, 32, 35, 23, 25, 24, 26, 23, 30, 30, 24, 28, 42, 25, 25], { 31: '0.0000', 32: '0.0000', 23: 'dd/mm/yyyy hh:mm', 24: '0.0', 27: '0.0', 9: 'dd/mm/yyyy hh:mm', 10: 'dd/mm/yyyy hh:mm', 11: 'dd/mm/yyyy hh:mm', 12: '0.0', 13: '0.0' });
  if (r.rows.length) detail.addConditionalFormatting({ ref: `L6:L${5 + r.rows.length}`, rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [r.meta.target], priority: 1, style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } } } }] });
  const inc = table(w, 'Incidentes', 'Incidentes vinculados a las solicitudes', context, ['ID', 'Movimiento', 'Empresa', 'Locomotora', 'Estado', 'Inicio local', 'Fin local', 'Duración (min)', 'Descripción', 'Cliente asociado', 'Informante', 'Antigüedad si abierto (min)'],
    r.incidentRows.map(i => [i.id, i.movementId, i.company, i.locomotive, i.state, localDate(i.startedAt), localDate(i.endedAt), i.duration, i.description, i.client, i.reporter, i.openAge]), [12, 15, 23, 15, 18, 23, 23, 18, 90, 32, 32, 26], { 6: 'dd/mm/yyyy hh:mm', 7: 'dd/mm/yyyy hh:mm', 8: '0.0' });
  for (let n = 6; n <= 5 + r.incidentRows.length; n++) { inc.getCell(n, 9).alignment = { wrapText: true, vertical: 'top' }; inc.getRow(n).height = Math.max(30, Math.ceil(r.incidentRows[n - 6].description.length / 90) * 15); }
  const guide = table(w, 'Guía de lectura', 'Definiciones y alcance', 'Fuente: base principal de Cosaif. Exportación de una misma consulta, sin datos de acceso.', ['Concepto', 'Explicación'], r.methodology.map(m => [m.label, m.text]), [35, 120]);
  for (let n = 6; n < 6 + r.methodology.length; n++) { guide.getCell(n, 2).alignment = { wrapText: true, vertical: 'top' }; guide.getRow(n).height = Math.max(62, Math.ceil(r.methodology[n - 6].text.length / 115) * 16 + 10); }
  const statusColors: Record<string, string> = { short: 'FFFFE9D8', acceptable: 'FFE6F4EB', long: 'FFFFDDDA', unassessed: 'FFEFF2F6' };
  r.rows.forEach((m, i) => { detail.getCell(i + 6, 20).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColors[m.durationBand] } }; });
  // Native charts reference the actual aggregate table; no duplicate data schedules.
  const charts: NativeExcelChartSpec[] = [];
  if (r.companies.length) charts.push({ sheetName: 'Resumen', title: 'Movimientos por empresa', categories: r.companies.map(c => c.label), categoriesFormula: `'Empresas'!$A$6:$A$${5 + r.companies.length}`, series: [{ name: 'Movimientos', nameFormula: "'Empresas'!$B$5", valuesFormula: `'Empresas'!$B$6:$B$${5 + r.companies.length}`, color: '167D9A', values: r.companies.map(c => c.total) }], anchor: { fromCol: 0, fromRow: row + 1, toCol: 4, toRow: row + 17 } });
  return injectNativeExcelCharts(Buffer.from(await w.xlsx.writeBuffer()), charts);
}

export { reportHtml } from './pdf-document';
import { reportHtml } from './pdf-document';
export async function exportPdf(r: Snapshot): Promise<Buffer> {
  const page = await newPdfPage();
  try {
    await page.setRequestInterception(true); page.on('request', req => { if (req.url() === 'about:blank' || req.url().startsWith('data:')) void req.continue(); else void req.abort(); });
    await page.setContent(reportHtml(r), { waitUntil: 'load' });
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;font-size:9px;color:#506174;padding:0 16mm;display:flex;justify-content:space-between"><span>COSAIF · Administración</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' }));
  } finally { await page.close(); }
}
