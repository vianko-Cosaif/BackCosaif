const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
const handlers = new Map(), events = [], refreshEvents = [], notifications = [];
const movement = { id: 71, empresaId: 10, localidadId: 20, locomotiveNumber: 5, estado: 'EN_PROCESO' };
const arrastre = { id: 72, empresaId: 10, localidadId: 20, estado: 'EN_PROCESO', ordenSolicitud: 1, vagones: [{ id: 73, estado: 'EN_PROCESO' }] };
const noop = (_req, _res, next) => next?.();
loader({
  'src/jobs/durableJobs': { registerJob: (kind, handler) => handlers.set(kind, handler) },
  'src/lib/prisma': { prisma: {} },
  'src/lib/servicePrisma': { prismaTorreon: {
    movimientoTorreonFerro: { findUnique: async () => movement },
    arrastreTorreon: { findUnique: async () => arrastre },
    arrastreTorreonVagon: { findUnique: async () => ({ id: 73, arrastreId: 72, arrastre }) },
    incidenteArrastreTorreon: { findUnique: async () => ({ id: 74, arrastreId: 72, arrastre }) },
    incidenteTorreonFerro: { findUnique: async () => ({ id: 75, movimientoId: 71, movimiento: movement }) },
    rondaTorreonMovimiento: { findUnique: async () => ({ movimiento: movement }) },
  } },
  'src/auth/authenticateAccess': { authenticateAccess: noop },
  'src/auth/torreonScope': { requireTorreonScope: noop },
  'src/middlewares/idempotentMutation': { idempotentMutation: noop },
  'src/services/torreonMs/torreonMsClient': {},
  'src/services/NotificadorFCM': { NotificadorFCM: { notificarOperacionTorreon: async data => notifications.push(data) } },
  'src/realtime/realtimeHub': { publishRealtimeEvent: data => {
    (data.type === 'realtime.arrastre.refresh' ? refreshEvents : events).push(data);
  } },
})('src/Rutas/TorreonMs/TorreonMsRoutes.ts');
async function main() {
  const dispatch = handlers.get('torreon.event');
  await dispatch({ table: 'movimiento_torreon_ferro', action: 'UPDATE', row: { id: 71, estado: 'EN_PROCESO' }, previous: { estado: 'DETENIDO' } });
  assert.equal(notifications.at(-1).tipo, 'torreon_movimiento_reanudado');
  assert.equal(events.at(-1).empresaId, 10); assert.equal(events.at(-1).localidadId, 20);
  assert.equal(refreshEvents.length, 0, 'Un movimiento natural no refresca la cola de arrastres');
  await dispatch({ table: 'incidente_arrastre_torreon', action: 'UPDATE', row: { id: 74, estado: 'RESUELTO' }, previous: { estado: 'ABIERTO' } });
  assert.equal(notifications.at(-1).tipo, 'arrastre_incidente_resuelto');
  assert.equal(events.at(-1).incidenteId, 74);
  assert.equal(refreshEvents.length, 1);
  assert.deepEqual({ ...refreshEvents.at(-1) }, { type: 'realtime.arrastre.refresh', localidadId: 20 }, 'El refresco solo publica el patio, sin datos del incidente ni de la empresa');
  assert.deepEqual(Array.from(notifications.at(-1).roles).sort(), ['COORDINADOR', 'MAQUINISTA_ARRASTRE', 'SUPERVISOR']);
  assert.deepEqual(Array.from(events.at(-1).recipientRoles), Array.from(notifications.at(-1).roles));
  await dispatch({ table: 'incidente_torreon_ferro', action: 'INSERT', row: { id: 75, estado: 'ABIERTO' } });
  assert.equal(events.at(-1).incidenteId, 75);
  assert.equal(refreshEvents.length, 1, 'Un incidente natural no agrega refrescos de arrastres');
  assert.deepEqual(Array.from(notifications.at(-1).roles).sort(), ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR', 'COORDINADOR', 'MAQUINISTA', 'SUPERVISOR']);
  assert.deepEqual(Array.from(events.at(-1).recipientRoles), Array.from(notifications.at(-1).roles));
  const count = notifications.length;
  await dispatch({ table: 'arrastre_torreon', action: 'UPDATE', row: { id: 72, estado: 'EN_PROCESO', orden_solicitud: 2 }, previous: { estado: 'EN_PROCESO', orden_solicitud: 1 } });
  assert.equal(events.at(-1).accion, 'orden_solicitudes'); assert.equal(notifications.length, count);
  assert.equal(refreshEvents.length, 2);
  assert.deepEqual({ ...refreshEvents.at(-1) }, { type: 'realtime.arrastre.refresh', localidadId: 20 });
  await dispatch({ table: 'ronda_torreon_movimiento', action: 'UPDATE', row: { id: 76, orden: 2 }, previous: { orden: 1 } });
  assert.equal(events.at(-1).accion, 'orden_ronda');
  assert.equal(refreshEvents.length, 2);
  await dispatch({ table: 'ronda_torreon_movimiento', action: 'UPDATE', row: { id: 76, orden: 2, estado: 'BLOQUEADO', bloqueado_por_incidente_id: 75 }, previous: { orden: 2, estado: 'PENDIENTE', bloqueado_por_incidente_id: null } });
  assert.equal(events.at(-1).accion, 'orden_ronda');
  assert.equal(notifications.length, count, 'Bloquear una ronda refresca datos sin otro push');
  movement.estado='CANCELADO';
  await dispatch({ table: 'incidente_torreon_ferro', action: 'UPDATE', row: {id:75,estado:'RESUELTO'}, previous:{estado:'ABIERTO'} });
  assert.equal(events.at(-1).estado,'CANCELADO','El cierre conserva el estado del movimiento cancelado');
  assert.equal(events.at(-1).accion,'cerrar_incidente_cancelar_movimiento');
  assert.equal(notifications.at(-1).tipo,'incidente_cerrado_manual','El cierre no se anuncia como resolución para reanudar');
  const beforeTimeout = notifications.length;
  await dispatch({ table: 'incidente_torreon_ferro', action: 'UPDATE', row: {id:75,estado:'RESUELTO',solucion:'CIERRE_AUTOMATICO_10_MIN: Reprogramado en movimiento #76.'}, previous:{estado:'ABIERTO'} });
  assert.equal(notifications.at(-1).tipo,'incidente_timeout');
  assert.equal(events.at(-1).accion,'vencer_incidente');
  movement.clientRequestId='incident-retry:75';
  await dispatch({ table:'movimiento_torreon_ferro',action:'INSERT',row:{id:71,estado:'SOLICITADO'} });
  assert.equal(events.at(-1).type,'torreon.movimiento.creado');
  assert.equal(events.at(-1).recipientRoles.length,0);
  assert.equal(notifications.length,beforeTimeout+1,'Closure plus retry generates just one notification');
  console.log('Outbox: movement resume, incident IDs and queue order event delivery OK');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
