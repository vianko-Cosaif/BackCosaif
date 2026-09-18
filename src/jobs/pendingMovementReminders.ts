import { prisma } from '../lib/prisma';
import { prismaTorreon } from '../lib/servicePrisma';
import { enqueueJob, registerJob } from './durableJobs';
import { NotificadorFCM } from '../services/NotificadorFCM';
import { resolverAudienciaFcmNatural } from '../services/naturalFcmRouting';
import { resolverAudienciaFcmTorreon } from '../services/torreonFcmRouting';
import { publishRealtimeEvent, type RealtimeEventType } from '../realtime/realtimeHub';
import { logger } from '../utils/logger';

export const HOUR_MS = 3_600_000;
const KIND = 'movement.pending-reminder';
type Source = 'cosaif' | 'torreon';
type Entity = 'movimiento' | 'arrastre';
type Candidate = {
  id: number; empresaId: number; localidadId: number; estado: string;
  fechaSolicitud: Date | string; fechaInicio?: Date | null; fechaFin?: Date | null;
  finalizado?: boolean | null; locomotiveNumber?: number | string | null;
};
type Reminder = { source: Source; entity: Entity; id: number; requestedAt: string; hour: number };

export function pendingHour(movement: Candidate, now = Date.now()) {
  // AGENDADO is not yet requested. DETENIDO/EN_PROCESO have already started.
  if (!['SOLICITADO', 'ESPERA', 'MODIFICADO', 'ASIGNADO'].includes(movement.estado)
    || movement.fechaInicio || movement.fechaFin || movement.finalizado
    || !(movement.empresaId > 0) || !(movement.localidadId > 0)) return null;
  const elapsed = now - new Date(movement.fechaSolicitud).getTime();
  return Number.isFinite(elapsed) && elapsed >= HOUR_MS ? Math.floor(elapsed / HOUR_MS) : null;
}

export function reminderKey(payload: Reminder) {
  return `pending:${payload.source}:${payload.entity}:${payload.id}:${new Date(payload.requestedAt).getTime()}:${payload.hour}`;
}

const sources = () => [
  { source: 'cosaif' as const, entity: 'movimiento' as const, model: prisma.movimiento,
    states: ['SOLICITADO', 'ESPERA', 'MODIFICADO'] },
  { source: 'torreon' as const, entity: 'movimiento' as const, model: prismaTorreon.movimientoTorreonFerro,
    states: ['SOLICITADO', 'ASIGNADO'] },
  { source: 'torreon' as const, entity: 'arrastre' as const, model: prismaTorreon.arrastreTorreon,
    states: ['SOLICITADO'] },
];

export async function enqueuePendingMovementReminders(now = Date.now()) {
  // Isolate a service outage so Guadalajara can still be scanned if Torreon is unavailable.
  const results = await Promise.allSettled(sources().map(async ({ source, entity, model, states }) => {
    let lastId = 0;
    while (true) {
      const movements: Candidate[] = await model.findMany({
        where: { id: { gt: lastId }, estado: { in: states }, fechaInicio: null, fechaFin: null,
          fechaSolicitud: { lte: new Date(now - HOUR_MS) },
          ...(entity === 'movimiento' ? { OR: [{ finalizado: false }, ...(source === 'cosaif' ? [{ finalizado: null }] : [])] } : {}) },
        orderBy: { id: 'asc' }, take: 200,
        select: { id: true, empresaId: true, localidadId: true, estado: true, fechaSolicitud: true },
      });
      for (const movement of movements) {
        const hour = pendingHour(movement, now);
        if (hour === null) continue;
        const payload: Reminder = { source, entity, id: movement.id, hour, requestedAt: new Date(movement.fechaSolicitud).toISOString() };
        // Only the current hour: never replay all missed reminders after downtime.
        await enqueueJob(reminderKey(payload), KIND, payload);
      }
      if (movements.length < 200) break;
      lastId = movements[movements.length - 1].id;
    }
  }));
  for (const result of results) if (result.status === 'rejected') {
    logger.error('notifications:pending_scan_failed', { message: result.reason?.message });
  }
}

export async function deliverPendingMovementReminder(payload: Reminder, now = Date.now()) {
  const entry = sources().find(item => item.source === payload.source && item.entity === payload.entity);
  if (!entry || !Number.isInteger(payload.hour) || payload.hour < 1) return;
  const movement: Candidate | null = await entry.model.findUnique({ where: { id: payload.id } });
  // A queued job may run after the movement started, was cancelled or rescheduled.
  if (!movement || new Date(movement.fechaSolicitud).toISOString() !== payload.requestedAt
    || pendingHour(movement, now) !== payload.hour) return;
  const tipo = payload.entity === 'arrastre' ? 'arrastre_pendiente_recordatorio' : 'movimiento_pendiente_recordatorio';
  const routing = payload.source === 'torreon' ? resolverAudienciaFcmTorreon(tipo) : resolverAudienciaFcmNatural(tipo);
  if (!routing) return;
  const [company, yard] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: movement.empresaId }, select: { nombre: true } }),
    prisma.localidad.findUnique({ where: { id: movement.localidadId }, select: { nombre: true } }),
  ]);
  const title = `${payload.entity === 'arrastre' ? 'Arrastre' : 'Movimiento'} pendiente de iniciar`;
  const body = `#${movement.id}${movement.locomotiveNumber ? ` · Locomotora ${movement.locomotiveNumber}` : ''} · ${company?.nombre ?? `Empresa ${movement.empresaId}`} · ${yard?.nombre ?? `Patio ${movement.localidadId}`} · ${payload.hour} ${payload.hour === 1 ? 'hora' : 'horas'} pendiente`;
  const eventId = reminderKey(payload);
  const eventType = `${payload.source === 'torreon' ? 'torreon.' : ''}${payload.entity}.recordatorio` as RealtimeEventType;
  const scope = { empresaId: movement.empresaId, localidadId: movement.localidadId,
    ...(payload.entity === 'arrastre' ? { arrastreId: movement.id } : { movimientoId: movement.id }) };
  const expiresAt = new Date(new Date(payload.requestedAt).getTime() + (payload.hour + 1) * HOUR_MS).toISOString();
  publishRealtimeEvent({ ...scope, type: eventType, source: payload.source, entity: payload.entity, entityId: movement.id,
    eventId, recipientRoles: routing.roles, notificationOnly: true, notificationTitle: title, notificationBody: body });
  await NotificadorFCM.notificarRecordatorioPendiente({ ...scope, tipo, titulo: title, mensaje: body,
    roles: routing.roles, url: routing.url,
    data: { ...scope, eventId, eventType, entity: payload.entity, entityId: movement.id, audience: routing.audience,
      horasPendiente: payload.hour, fechaSolicitud: payload.requestedAt, expiresAt },
  }, payload.source);
}

let timer: NodeJS.Timeout | undefined;
let running = false;
export function startPendingMovementReminders() {
  if (timer) return;
  registerJob(KIND, payload => deliverPendingMovementReminder(payload));
  const run = async () => {
    if (running) return;
    running = true;
    try { await enqueuePendingMovementReminders(); }
    catch (error: any) { logger.error('notifications:pending_scan_failed', { message: error.message }); }
    finally { running = false; }
  };
  timer = setInterval(() => void run(), 60_000);
  timer.unref();
  void run();
}
