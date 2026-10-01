import { DateTime } from 'luxon';
import { resolveDestination, DestinationEvidence, ServiceDestination } from './destination-resolution';

export const ZONE = 'America/Mexico_City';
export const DURATION_MIN = 10;
export const DURATION_MAX = 30;
export const equivalentDays = (minutes: number | null): number | null => minutes === null ? null : minutes / 1440;
export const BAND_LABELS = { short: 'Menos de 10 min · Revisar', acceptable: '10 a 30 min · Aceptable', long: 'Más de 30 min · Atención', unassessed: 'Fechas por completar' };
export type DurationBand = keyof typeof BAND_LABELS;
export function classifyDuration(minutes: number | null, state: string): DurationBand {
  if (!['CONCLUIDO', 'CANCELADO', 'DETENIDO'].includes(state) || minutes === null || !Number.isFinite(minutes) || minutes < 0) return 'unassessed';
  return minutes < DURATION_MIN ? 'short' : minutes <= DURATION_MAX ? 'acceptable' : 'long';
}
export const STATE_LABELS: Record<string, string> = { SOLICITADO: 'Solicitado', EN_PROCESO: 'En proceso', DETENIDO: 'Detenido', ESPERA: 'En espera', MODIFICADO: 'Modificado', CONCLUIDO: 'Concluido', CANCELADO: 'Cancelado' };
export const ISSUE_LABELS: Record<string, string> = {
  invalidWait: 'Inicio anterior a la solicitud', invalidExecution: 'Fin anterior al inicio',
  missingEnd: 'Finalizado sin fecha de fin', missingStart: 'Con fecha de fin pero sin inicio',
  stateMismatch: 'Estado y finalización no coinciden', missingOrigin: 'Sin vía de origen',
  missingDestination: 'Destino sin identificar', ambiguousService: 'Torno y lavado marcados: confirmar destino', missingOperator: 'Sin operador asignado',
  missingSupervisor: 'Sin supervisor registrado', missingCoordinator: 'Sin coordinador registrado',
  missingType: 'Sin tipo de movimiento',
  missingClient: 'Sin cliente asociado',
};
export type IncidentInput = { id: number; descripcion: string; estado: string; fechaInicio: Date; fechaFin: Date | null; usuario?: { id: number; nombre: string } };
export type MovementInput = {
  id: number; empresaId: number; localidadId: number; locomotiveNumber: number; estado: string;
  tipoMovimiento: string | null; finalizado: boolean | null; fechaSolicitud: Date; fechaInicio: Date | null; fechaFin: Date | null;
  empresa: { nombre: string }; localidad: { nombre: string }; viaOrigen: { id: number; nombre: string } | null;
  viaDestino: { id: number; nombre: string } | null; operador: { id: number; nombre: string } | null;
  supervisor: { id: number; nombre: string } | null; coordinador: { id: number; nombre: string } | null;
  incidentes: IncidentInput[];
  cliente: { id: number; nombre: string } | null; instrucciones?: string | null; fechaPausa?: Date | null; torno?: boolean | null; lavado?: boolean | null;
};
export type ReportRow = {
  id: number; companyId: number; company: string; localityId: number; locality: string; locomotive: number;
  state: string; stateLabel: string; type: string; origin: string; destination: string; routeKey: string;
  destinationRaw: string | null; destinationEvidence: DestinationEvidence; destinationService: ServiceDestination | null;
  operator: string; operatorId: number | null; supervisor: string; coordinator: string;
  requestedAt: string; startedAt: string | null; endedAt: string | null; day: string; hour: number; shift: string;
  wait: number | null; execution: number | null; incidentCount: number; incidentOpenCount: number;
  pending: boolean; finalized: boolean; issues: string[];
  clientId: number | null; client: string; clientKey: string; durationBand: DurationBand;
  originId: number | null; destinationId: number | null; incidentMinutes: number | null;
  incidentTimeMeasured: boolean; incidentTimeMissing: boolean;
  elapsed: number | null; elapsedProvisional: boolean; liveExecution: number | null; reprogrammedTo: number | null; cancelledByIncidentLimit: boolean;
  stoppedAt: string | null; durationEnd: string | null; clientDelay: number | null;
};
export function quantile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p, lo = Math.floor(index), hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}
export const ratio = (n: number, d: number): number | null => d ? n / d * 100 : null;
export const mean = (values: number[]) => values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
// Union intervals inside one movement so simultaneous incidents never duplicate minutes.
export function overlappingMinutes(start: Date | null, end: Date | null, incidents: IncidentInput[], now: Date): number | null {
  if (duration(start, end) === null) return null;
  const spans = incidents.flatMap(i => {
    const finish = i.estado === 'ABIERTO' ? now : i.fechaFin;
    if (!finish || finish < i.fechaInicio) return [];
    const a = Math.max(start!.getTime(), i.fechaInicio.getTime());
    const b = Math.min(end!.getTime(), finish.getTime());
    return b > a ? [[a, b]] : [];
  }).sort((a, b) => a[0] - b[0]);
  let total = 0, lastEnd = -Infinity;
  for (const [a, b] of spans) { total += Math.max(0, b - Math.max(a, lastEnd)); lastEnd = Math.max(lastEnd, b); }
  return total / 60000;
}
export function duration(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const minutes = (end.getTime() - start.getTime()) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
}
export function prepareRow(m: MovementInput, now = new Date()): ReportRow {
  const local = DateTime.fromJSDate(m.fechaSolicitud, { zone: ZONE });
  const destination = resolveDestination(m);
  const issues: string[] = [];
  const mark = (key: string, condition: boolean) => { if (condition) issues.push(key); };
  mark('invalidWait', !!m.fechaInicio && m.fechaInicio < m.fechaSolicitud);
  mark('invalidExecution', !!m.fechaFin && !!m.fechaInicio && m.fechaFin < m.fechaInicio);
  mark('missingEnd', m.finalizado === true && !m.fechaFin);
  mark('missingStart', !!m.fechaFin && !m.fechaInicio);
  mark('stateMismatch', ((m.estado === 'CONCLUIDO' || m.estado === 'CANCELADO') && m.finalizado !== true) || (m.finalizado === true && !['CONCLUIDO', 'CANCELADO', 'DETENIDO'].includes(m.estado)));
  mark('missingOrigin', !m.viaOrigen); mark('missingDestination', destination.evidence === 'missing');
  mark('ambiguousService', destination.evidence === 'ambiguous');
  mark('missingOperator', !m.operador); mark('missingSupervisor', !m.supervisor); mark('missingCoordinator', !m.coordinador);
  mark('missingType', !m.tipoMovimiento);
  mark('missingClient', !m.cliente);
  const pending = !m.finalizado && !['CONCLUIDO', 'CANCELADO'].includes(m.estado);
  const observedEnd = m.fechaFin || (pending ? now : null);
  const durationEnd = m.fechaFin || (m.estado === 'DETENIDO' ? m.fechaPausa ?? null : null);
  const execution = duration(m.fechaInicio, durationEnd);
  const reprogrammed = /Reprogramado en movimiento #(\d+)\b/i.exec(m.instrucciones || '');
  const cancelled = /Cancelado tras (\d+) incidentes en la misma solicitud/i.exec(m.instrucciones || '');
  const incidentIntervals = m.incidentes.filter(i => duration(i.fechaInicio, i.estado === 'ABIERTO' ? now : i.fechaFin) !== null).length;
  const observedInterval = duration(m.fechaInicio, observedEnd) !== null;
  return {
    id: m.id, companyId: m.empresaId, company: m.empresa.nombre, localityId: m.localidadId, locality: m.localidad.nombre,
    locomotive: m.locomotiveNumber, state: m.estado, stateLabel: STATE_LABELS[m.estado] || m.estado,
    clientId: m.cliente?.id ?? null, client: m.cliente?.nombre || 'Sin cliente asociado',
    clientKey: `${m.empresaId}:${m.cliente?.id ?? 'unassigned'}`,
    durationBand: classifyDuration(execution, m.estado),
    stoppedAt: m.fechaPausa?.toISOString() ?? null, durationEnd: durationEnd?.toISOString() ?? null,
    clientDelay: ['DETENIDO', 'CANCELADO'].includes(m.estado) ? execution : null,
    originId: m.viaOrigen?.id ?? null, destinationId: m.viaDestino?.id ?? null,
    incidentMinutes: overlappingMinutes(m.fechaInicio, observedEnd, m.incidentes, now),
    incidentTimeMeasured: observedInterval && incidentIntervals > 0,
    incidentTimeMissing: m.incidentes.length > 0 && (!observedInterval || incidentIntervals < m.incidentes.length),
    elapsed: duration(m.fechaSolicitud, observedEnd), elapsedProvisional: pending && !m.fechaFin,
    liveExecution: pending && !m.fechaFin ? duration(m.fechaInicio, now) : null,
    reprogrammedTo: reprogrammed ? Number(reprogrammed[1]) : null,
    cancelledByIncidentLimit: m.estado === 'CANCELADO' && !!cancelled && Number(cancelled[1]) >= 3,
    type: m.tipoMovimiento || 'Sin tipo', origin: m.viaOrigen?.nombre || 'Sin origen', destination: destination.label,
    destinationRaw: m.viaDestino?.nombre ?? null, destinationEvidence: destination.evidence, destinationService: destination.service,
    routeKey: `${m.localidadId}:${m.viaOrigen?.id ?? 'null'}:${m.viaDestino?.id ?? (destination.service ? 'service-' + destination.service : 'null')}`,
    operator: m.operador?.nombre || 'Sin asignar', operatorId: m.operador?.id ?? null,
    supervisor: m.supervisor?.nombre || 'Sin registro', coordinator: m.coordinador?.nombre || 'Sin registro',
    requestedAt: m.fechaSolicitud.toISOString(), startedAt: m.fechaInicio?.toISOString() ?? null, endedAt: m.fechaFin?.toISOString() ?? null,
    day: local.toISODate()!, hour: local.hour, shift: local.hour >= 7 && local.hour < 15 ? '07:00 a 15:00' : local.hour >= 15 && local.hour < 23 ? '15:00 a 23:00' : '23:00 a 07:00',
    wait: duration(m.fechaSolicitud, m.fechaInicio), execution,
    incidentCount: m.incidentes.length, incidentOpenCount: m.incidentes.filter(i => i.estado === 'ABIERTO').length,
    pending, finalized: m.finalizado === true, issues,
  };
}
export function summarize(rows: ReportRow[], target: number) {
  const waits = rows.flatMap(r => r.wait === null ? [] : [r.wait]);
  // Time is retained for concluded, stopped and cancelled attempts; outcome remains a separate dimension.
  const executions = rows.flatMap(r => r.durationBand === 'unassessed' ? [] : [r.execution!]);
  const elapsed = rows.flatMap(r => r.elapsed === null ? [] : [r.elapsed]);
  const withinTarget = waits.filter(w => w <= target).length;
  const clientDelayMinutes = rows.reduce((s, r) => s + (r.clientDelay ?? 0), 0);
  const clientDelayN = rows.filter(r => r.clientDelay !== null).length;
  const clientDelayMissing = rows.filter(r => ['DETENIDO', 'CANCELADO'].includes(r.state) && r.clientDelay === null).length;
  const incidentMinutes = rows.reduce((s, r) => s + (r.incidentMinutes ?? 0), 0);
  const incidentTimeN = rows.filter(r => r.incidentTimeMeasured).length;
  const incidentTimeMissing = rows.filter(r => r.incidentTimeMissing).length;
  return {
    total: rows.length, concluded: rows.filter(r => r.state === 'CONCLUIDO').length,
    cancelled: rows.filter(r => r.state === 'CANCELADO').length, stopped: rows.filter(r => r.state === 'DETENIDO').length,
    pending: rows.filter(r => r.pending).length, incidents: rows.reduce((s, r) => s + r.incidentCount, 0),
    affected: rows.filter(r => r.incidentCount > 0).length, incidentRate: ratio(rows.filter(r => r.incidentCount > 0).length, rows.length),
    waitN: waits.length, waitMedian: quantile(waits, .5), waitP90: quantile(waits, .9),
    executionN: executions.length, executionMedian: quantile(executions, .5), executionP90: quantile(executions, .9),
    waitAverage: mean(waits), executionAverage: mean(executions),
    excessMinutes: executions.reduce((s, v) => s + Math.max(0, v - DURATION_MAX), 0),
    incidentMinutes, incidentTimeN, incidentTimeMissing,
    incidentDays: equivalentDays(!incidentTimeN && incidentTimeMissing ? null : incidentMinutes),
    elapsedN: elapsed.length, elapsedTotal: elapsed.reduce((s, v) => s + v, 0), elapsedAverage: mean(elapsed),
    liveExecutionMinutes: rows.reduce((s, r) => s + (r.liveExecution ?? 0), 0),
    elapsedOpenN: rows.filter(r => r.elapsedProvisional).length,
    durationOpen: rows.filter(r => r.durationBand === 'unassessed' && r.pending).length,
    durationMissing: rows.filter(r => r.durationBand === 'unassessed' && !r.pending).length,
    cancelledByIncidentLimit: rows.filter(r => r.cancelledByIncidentLimit).length,
    reprogrammed: rows.filter(r => r.reprogrammedTo !== null).length,
    clientDelayMinutes, clientDelayN, clientDelayMissing,
    clientDelayDays: equivalentDays(!clientDelayN && clientDelayMissing ? null : clientDelayMinutes),
    concludedMinutes: rows.reduce((s, r) => s + (r.state === 'CONCLUIDO' ? r.execution ?? 0 : 0), 0),
    withinTarget, targetRate: ratio(withinTarget, waits.length), overTarget: waits.length - withinTarget,
    missingWait: rows.length - waits.length,
    withIssues: rows.filter(r => r.issues.length > 0).length,
    durationShort: rows.filter(r => r.durationBand === 'short').length,
    durationAcceptable: rows.filter(r => r.durationBand === 'acceptable').length,
    durationLong: rows.filter(r => r.durationBand === 'long').length,
    durationUnassessed: rows.filter(r => r.durationBand === 'unassessed').length,
    acceptableRate: ratio(rows.filter(r => r.durationBand === 'acceptable').length, executions.length),
  };
}
export type Summary = ReturnType<typeof summarize>;
export type Group = Summary & { key: string; label: string; smallSample: boolean };
export function groupRows(rows: ReportRow[], key: (r: ReportRow) => string, label: (r: ReportRow) => string, target: number): Group[] {
  const groups = new Map<string, { rows: ReportRow[]; label: string }>();
  for (const row of rows) { const k = key(row); if (!groups.has(k)) groups.set(k, { rows: [], label: label(row) }); groups.get(k)!.rows.push(row); }
  return [...groups].map(([k, v]) => ({ key: k, label: v.label, ...summarize(v.rows, target), smallSample: v.rows.length < 30 })).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}
export const METHOD = [
  { label: 'Días equivalentes de 24 horas', text: 'Días = minutos acumulados / 1,440, sin redondear los movimientos antes de sumarlos. Por ejemplo, 2,160 min = 1.5 días de 24 horas. Se muestran los días junto a los minutos del mismo indicador: son dos unidades del mismo tiempo. Son días equivalentes de movimientos, no días naturales distintos, jornadas laborales ni días completos de paro del patio. El retraso del cliente y el tiempo coincidente con incidentes pueden solaparse; no se suman. Cuando faltan fechas, el total calculado es parcial; si no hay ningún intervalo calculable, se indica sin datos.' },
  { label: 'Qué se cuenta', text: 'Una fila por movimiento, elegido por su fecha de solicitud. Los estados y las asignaciones son los registrados al generar el reporte; no reconstruyen el estado que tenía en una fecha pasada.' },
  { label: 'Tiempo hasta comenzar', text: 'Minutos entre solicitud e inicio, para todos los estados con ambas fechas válidas. Los registros sin inicio o con tiempo negativo quedan fuera; su cantidad se muestra junto al indicador. Una espera larga no prueba responsabilidad ni una causa específica.' },
  { label: 'Duración del movimiento', text: 'Minutos entre inicio y cierre o detención, en concluidos, detenidos y cancelados con fechas válidas. En un detenido sin fin se usa la fecha de pausa. Los intentos que se detuvieron o cancelaron también consumieron tiempo. Incluye pausas; no representa tiempo neto de trabajo. El resultado se muestra por separado.' },
  { label: 'Rango aceptable: 10 a 30 minutos', text: 'Criterio operativo del administrador aplicado a la duración: menos de 10 minutos requiere revisión; de 10 a 30, incluidos ambos límites, es aceptable; más de 30 requiere atención. Se clasifica el tiempo exacto antes de redondearlo. La proporción en rango usa concluidos, detenidos y cancelados con inicio y fin válidos. Estar en 10 a 30 minutos no significa que la operación concluyó correctamente. Un tiempo corto no se presenta como mejora ni confirma un error de captura.' },
  { label: 'Movimientos con fechas por completar', text: 'Incluye intentos abiertos o sin inicio/fin válidos. Los abiertos conservan su tiempo acumulado hasta la consulta, que puede aumentar. Si falta el inicio, el tiempo desde solicitud hasta cierre o consulta sigue visible como tiempo total; no se inventa una duración de maniobra.' },
  { label: 'Tiempo total y reintentos', text: 'Tiempo total de cada intento: solicitud hasta su fin, o hasta la consulta si sigue abierto. Incluye espera, movimiento y pausas. Los reintentos se enlazan solo por la referencia explícita Reprogramado en movimiento #ID y se muestran dentro del periodo filtrado. No se agrupan solicitudes diferentes solo por compartir locomotora. El tiempo de una cadena suma los tiempos de cada intento visible una sola vez; puede ser parcial si faltan intentos fuera del filtro. Son minutos de intentos, no tiempo de reloj de toda la solicitud.' },
  { label: 'Detenidos y cancelados', text: 'Ambos cuentan en los tiempos. Detenido puede conservar el intento histórico y volver a la cola como otro movimiento. La aplicación cancela al alcanzar el límite de incidentes de la cadena; el reporte identifica esta causa solo cuando el registro conserva el comentario explícito de cancelación por al menos tres incidentes. El estado y la causa no se deducen de una duración aceptable.' },
  { label: 'Retraso del cliente: criterio administrativo', text: 'Por criterio operativo definido por la administración, el tiempo de intentos DETENIDOS y CANCELADOS se atribuye al cliente asociado: inicio hasta fechaFin; en un detenido sin fechaFin se usa fechaPausa como corte de detención. Se separa de la espera previa y de la duración de concluidos. Si falta inicio o corte válido, no se inventan minutos y se indica cuántos casos faltan. Es una regla de clasificación del reporte, no una causa extraída del texto del incidente.' },
  { label: 'Empresa y cliente', text: 'Empresa es la asociada al movimiento. Cliente es el usuario guardado en el campo cliente de ese movimiento; no se sustituye por quien lo creó. El desglose empresa / cliente conserva ambos identificadores y muestra los casos sin cliente. La afiliación actual del usuario no cambia la empresa histórica del movimiento.' },
  { label: 'Promedio y exceso sobre 30 minutos', text: 'Promedio = suma de minutos válidos / cantidad de intervalos válidos. Los casos extremos pueden elevarlo. Exceso = suma de la parte que supera 30 minutos en cada intento con duración válida; no incluye los primeros 30 minutos y no equivale a un retraso imputable a una persona o empresa.' },
  { label: 'Tiempo coincidente con incidentes', text: 'Minutos de incidentes que coinciden con el intervalo inicio-fin de concluidos, detenidos y cancelados, y con el tiempo observado de los abiertos. Intervalos simultáneos se unen dentro de cada movimiento. Los abiertos se limitan a la fecha de consulta y los cerrados sin fin se omiten. El total son minutos de movimientos, no tiempo de reloj del patio. La coincidencia no prueba que el incidente haya causado todo el retraso; no se suma al exceso, porque pueden solaparse.' },
  { label: 'Resolución e informante', text: 'Resuelto significa estado RESUELTO; CERRADO puede incluir cierre automático sin resolución. Se muestran por separado. Tiempo de resolución usa únicamente resueltos con inicio y fin válidos. Usuario informante es el registrado en el incidente, no su causante. El retraso del cliente sigue la regla administrativa de detenidos y cancelados, independientemente de quién informó el incidente.' },
  { label: 'Entradas a torno y lavado', text: 'Se usa la vía de destino Torno o Lavado (también Lavadero). Si no hay vía de destino, se consulta la marca de servicio torno o lavado del movimiento: así se identifica hacia qué servicio iba. Una vía de destino registrada tiene prioridad; las marcas también existen en salidas de servicios. No se cuentan traslados con la misma vía de origen y destino. Si ambas marcas están activas y falta la vía, se pide confirmar el servicio. Entradas son solo los movimientos CONCLUIDOS; sus tiempos describen el traslado hasta esa vía, no el servicio de torno o lavado. Detenidos y cancelados hacia ese destino se muestran aparte con su duración y retraso del cliente. Cada reintento es una solicitud distinta; un intento fallido no se cuenta como entrada. La empresa y el cliente provienen del movimiento.' },
  { label: 'Destino identificado por servicio', text: 'Un movimiento sin vía de destino puede tener Torno o Lavado marcado en su solicitud. En ese caso se muestra ese destino, se incluye en su estadística y deja de aparecer como destino sin identificar. Se conserva la vía original vacía y se muestra que la identificación viene del servicio. Los IDs de vías no se inventan; el listado de vías físicas usa IDs registrados. El apartado Torno y lavado reúne entradas por vía y por servicio sin duplicar movimientos.' },
  { label: 'Vías más utilizadas', text: 'Solicitudes donde la vía aparece como origen o destino. Cada movimiento cuenta una sola vez por vía, aunque salga y llegue a ella; puede aparecer en dos vías diferentes. Los tiempos son del movimiento completo, no permanencia, ocupación ni saturación física de la vía.' },
  { label: 'Tiempo habitual y 9 de cada 10', text: 'Tiempo habitual es la mediana (percentil 50). El otro valor es el percentil 90 interpolado: describe la parte alta de los tiempos registrados, no una garantía de servicio.' },
  { label: 'Objetivo de atención', text: 'Umbral de análisis elegido por el administrador. Se calcula iniciados dentro del objetivo / movimientos con espera válida. No es un SLA contractual y excluye solicitudes aún sin inicio.' },
  { label: 'Movimientos con incidentes', text: 'Movimientos distintos que tienen al menos un incidente / total de movimientos del periodo. Los incidentes son todos los vinculados a esas solicitudes, aunque se hayan registrado después. Nunca se duplica un movimiento por tener varios incidentes ni se usa incidenteGlobal como historial.' },
  { label: 'Comparación', text: 'Se usa el bloque inmediatamente anterior de igual duración, con los mismos filtros. Si se incluye hoy se compara hasta la misma hora transcurrida. El cambio de una tasa se expresa en puntos porcentuales. Falta de cobertura histórica impide interpretar una caída como mejora.' },
  { label: 'Horarios', text: 'Fechas interpretadas como instantes UTC por Prisma y presentadas en America/Mexico_City, igual que el contrato actual de la aplicación. Turnos: 07-15, 15-23 y 23-07. Se asignan por hora de solicitud; no son asistencia ni horas trabajadas.' },
  { label: 'Calidad y personas', text: 'Ausencias de vías o responsables se muestran para revisión, porque pueden ser legítimas según la operación. Solo se usan responsables guardados en el movimiento. No se infieren desde sesiones ni se califican personas por cantidad o rapidez.' },
  { label: 'Cobertura', text: 'Primera y última solicitud indican el alcance observable, no certifican que todos los días estén completos. Este reporte cubre movimientos de la base principal; los servicios de Torno, Torreón y Comercial requieren sus propias fuentes.' },
];
export function analyze(rows: ReportRow[], previous: ReportRow[], target: number) {
  const summary = summarize(rows, target), baseline = summarize(previous, target);
  const companies = groupRows(rows, r => String(r.companyId), r => r.company, target);
  const clientRows = new Map(rows.map(r => [r.clientKey, r]));
  const clients = groupRows(rows, r => r.clientKey, r => `${r.client} · ${r.company}`, target).map(g => {
    const row = clientRows.get(g.key)!;
    return { ...g, companyId: row.companyId, company: row.company, clientId: row.clientId, client: row.client };
  });
  const shifts = groupRows(rows, r => r.shift, r => r.shift, target).sort((a, b) => a.key.localeCompare(b.key));
  const days = groupRows(rows, r => r.day, r => r.day, target).sort((a, b) => a.key.localeCompare(b.key));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ key: String(hour), label: `${String(hour).padStart(2, '0')}:00`, ...summarize(rows.filter(r => r.hour === hour), target), smallSample: rows.filter(r => r.hour === hour).length < 30 }));
  const routes = groupRows(rows, r => r.routeKey, r => `${r.locality}: ${r.origin} → ${r.destination}${r.destinationEvidence === 'service' ? ' (servicio)' : ''}`, target);
  const viaMap = new Map<string, { label: string; rows: ReportRow[]; origins: number; destinations: number }>();
  for (const row of rows) for (const viaId of new Set([row.originId, row.destinationId].filter((id): id is number => id !== null))) {
    const key = String(viaId), group = viaMap.get(key) || { label: `${row.locality}: ${row.originId === viaId ? row.origin : row.destination}`, rows: [], origins: 0, destinations: 0 };
    group.rows.push(row); group.origins += Number(row.originId === viaId); group.destinations += Number(row.destinationId === viaId); viaMap.set(key, group);
  }
  const vias = [...viaMap].map(([key, g]) => ({ key, label: g.label, origins: g.origins, destinations: g.destinations, ...summarize(g.rows, target), smallSample: g.rows.length < 30 })).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  const locomotives = groupRows(rows, r => `${r.companyId}:${r.locomotive}`, r => `${r.locomotive} · ${r.company}`, target);
  const operators = groupRows(rows, r => String(r.operatorId ?? 'unassigned'), r => r.operator, target);
  const states = groupRows(rows, r => r.state, r => r.stateLabel, target);
  const quality = Object.entries(ISSUE_LABELS).map(([key, label]) => ({ key, label, count: rows.filter(r => r.issues.includes(key)).length }));
  const insights: { title: string; detail: string; action: string; filter: string }[] = [];
  if (summary.clientDelayN) insights.push({ title: `${summary.clientDelayMinutes.toLocaleString('es-MX', { maximumFractionDigits: 1 })} minutos de retraso del cliente`, detail: `${summary.clientDelayN} intentos detenidos o cancelados con inicio y corte válidos; ${summary.clientDelayMissing} sin fechas suficientes.`, action: 'Revisar el desglose por empresa y cliente y la secuencia de reintentos.', filter: 'client_delay' });
  if (summary.durationShort) insights.push({ title: `${summary.durationShort.toLocaleString('es-MX')} movimientos duraron menos de 10 minutos`, detail: 'Fuera del rango aceptable de 10 a 30 minutos. Concluidos, detenidos y cancelados con inicio y fin válidos.', action: 'Verificar inicio, fin y tipo de maniobra con la bitácora. Confirmar si el registro refleja lo ocurrido.', filter: 'short' });
  if (summary.durationLong) insights.push({ title: `${summary.durationLong.toLocaleString('es-MX')} movimientos duraron más de 30 minutos`, detail: 'Casos de atención por duración, separados de la espera antes de comenzar.', action: 'Revisar pausas, incidentes, recorrido y condiciones de la maniobra para explicar la demora.', filter: 'long' });
  if (summary.overTarget) insights.push({ title: `${summary.overTarget.toLocaleString('es-MX')} movimientos superaron ${target} minutos para comenzar`, detail: `De ${summary.waitN.toLocaleString('es-MX')} movimientos con espera válida. Otros ${summary.missingWait} no permiten calcular este tiempo.`, action: 'Revisar la secuencia de solicitud, preparación y asignación con sus incidentes.', filter: 'late' });
  if (summary.affected) insights.push({ title: `${summary.affected.toLocaleString('es-MX')} movimientos tuvieron incidentes`, detail: `${summary.incidents.toLocaleString('es-MX')} incidentes vinculados. Un movimiento puede tener más de uno.`, action: 'Revisar descripciones recurrentes y confirmar causas antes de asignar responsables.', filter: 'incident' });
  if (summary.pending) insights.push({ title: `${summary.pending} solicitudes del periodo siguen pendientes`, detail: 'Estado actual de las solicitudes seleccionadas. No es el total de pendientes de toda la operación.', action: 'Verificar con coordinación si requieren atención o actualizar su cierre.', filter: 'pending' });
  const temporal = rows.filter(r => r.issues.some(i => ['invalidWait', 'invalidExecution', 'missingEnd', 'missingStart', 'stateMismatch'].includes(i))).length;
  if (temporal) insights.push({ title: `${temporal} movimientos requieren revisar fechas o cierre`, detail: 'Los intervalos negativos se excluyen de los tiempos; los movimientos se conservan en los totales.', action: 'Contrastar con la bitácora original antes de corregir los registros.', filter: 'timing' });
  return { summary, baseline, companies, clients, vias, shifts, days, hours, routes, locomotives, operators, states, quality, insights, methodology: METHOD };
}
export type Analysis = ReturnType<typeof analyze>;
