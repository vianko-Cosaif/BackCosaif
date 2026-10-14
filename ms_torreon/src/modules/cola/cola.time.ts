import type { Prisma } from '../../../generated';

type Instant = Date | string | null | undefined;
type ClockIncident = { id?: number; fechaInicio?: Instant; fechaResolucion?: Instant };
type ClockMovement = {
  id: number; estado: string; unidadId?: number | null;
  fechaInicio?: Instant; fechaFin?: Instant; fechaPausa?: Instant;
  incidentes?: ClockIncident[];
  unidad?: { id: number; incidentes?: ClockIncident[] } | null;
};
type ClockEvent = {
  id?: number; accion: string; fecha: Date | string;
  movimientoId?: number | null; unidadId?: number | null; incidenteId?: number | null;
};
const millis = (value: Instant) => value == null ? NaN : new Date(value).getTime();

export function calcularTiempoNatural(movement: ClockMovement, events: ClockEvent[], ahora = new Date()) {
  const start = millis(movement.fechaInicio);
  const finish = millis(movement.fechaFin);
  const end = Number.isFinite(finish) ? Math.min(finish, ahora.getTime()) : ahora.getTime();
  const total = Number.isFinite(start) ? Math.max(0, end - start) : 0;
  const unitId = movement.unidadId ?? movement.unidad?.id;
  const relevant = events.filter(event => event.movimientoId === movement.id
    || (event.accion === 'REPORTAR_INCIDENTE' && unitId != null && event.unidadId === unitId));
  const resumes = relevant.filter(event => event.accion === 'REANUDAR').map(event => millis(event.fecha))
    .filter(Number.isFinite).sort((a, b) => a - b);
  const pauses: [number, number][] = [];
  let estimated = false;
  const addPause = (from: number, to: number) => {
    if (!Number.isFinite(from) || !Number.isFinite(start) || from >= end) return;
    const range: [number, number] = [Math.max(start, from), Math.min(end, to)];
    if (range[1] > range[0]) pauses.push(range);
  };
  const reports = relevant.filter(event => event.accion === 'REPORTAR_INCIDENTE');
  for (const report of reports) {
    const from = millis(report.fecha);
    addPause(from, resumes.find(time => time >= from) ?? end);
  }
  // Migration keeps historical incidents even when their pause predates the audit log.
  const incidents = new Map((movement.unidad?.incidentes ?? []).map(incident => [incident.id, incident]));
  for (const incident of movement.incidentes ?? []) incidents.set(incident.id, incident);
  for (const incident of incidents.values()) {
    if (incident.id != null && reports.some(event => event.incidenteId === incident.id)) continue;
    const from = millis(incident.fechaInicio);
    const resume = resumes.find(time => time >= from);
    const resolution = millis(incident.fechaResolucion);
    if (resume != null) addPause(from, resume);
    else if (['EN_PROCESO', 'CONCLUIDO'].includes(movement.estado) && Number.isFinite(resolution)) {
      // Old records cannot recover the exact physical restart; expose that limitation.
      addPause(from, resolution);
      estimated = true;
    } else addPause(from, end);
  }
  if (movement.estado === 'DETENIDO') addPause(millis(movement.fechaPausa), end);
  pauses.sort((a, b) => a[0] - b[0]);
  let paused = 0;
  let coveredUntil = start;
  for (const [from, to] of pauses) {
    paused += Math.max(0, to - Math.max(from, coveredUntil));
    coveredUntil = Math.max(coveredUntil, to);
  }
  return {
    tiempoActivoSegundos: Math.floor(Math.max(0, total - paused) / 1000),
    tiempoTotalSegundos: Math.floor(total / 1000),
    tiempoCalculadoEn: ahora.toISOString(),
    tiempoActivoEstimado: estimated,
  };
}

/** One audit read for an entire page/queue; no client may supply elapsed durations. */
export async function enriquecerTiemposNaturales<T extends ClockMovement>(
  tx: Pick<Prisma.TransactionClient, 'bitacoraNaturalTorreon'>, movimientos: T[], ahora = new Date(),
) {
  const started = movimientos.filter(movement => Number.isFinite(millis(movement.fechaInicio)));
  const unitIds = [...new Set(started.map(movement => movement.unidadId ?? movement.unidad?.id)
    .filter((id): id is number => id != null))];
  const events = started.length ? await tx.bitacoraNaturalTorreon.findMany({
    where: {
      accion: { in: ['INICIAR', 'REANUDAR', 'REPORTAR_INCIDENTE', 'FINALIZAR'] },
      OR: [{ movimientoId: { in: started.map(movement => movement.id) } }, { unidadId: { in: unitIds } }],
    },
    select: { id: true, accion: true, fecha: true, movimientoId: true, unidadId: true, incidenteId: true },
    orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
  }) : [];
  return movimientos.map(movement => ({ ...movement, ...calcularTiempoNatural(movement, events, ahora) }));
}
