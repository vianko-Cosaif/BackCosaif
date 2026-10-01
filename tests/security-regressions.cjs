const assert = require('node:assert/strict');
const { loader, invoke, logger } = require('./support/load-ts.cjs');
const user = (rol, empresaId = 10, localidadId = 20) => ({ id: 1, nombre: 'Test', rol, empresa: { id: empresaId }, localidad: { id: localidadId }, auth: { jti: 'session-test', v: 0, expiresAt: new Date(Date.now() + 3600000).toISOString() } });
async function main() {
  let resource = { empresaId: 10, localidadId: 99 };
  const prisma = {
    movimiento: { findUnique: async () => resource, findMany: async () => [{ id: 88, ...resource }] },
    via: { findUnique: async () => ({ localidadId: 20 }) },
    usuario: { findFirst: async () => null },
  };
  const serviceDb = {
    nava: { findMany: async () => [{ id: 77, localidadId: 20 }] },
    tornoAgendado: { findMany: async () => [{ id: 7, idMovimiento: 88 }] },
    movimientoTorreonFerro: { findUnique: async () => resource },
    arrastreTorreon: { findUnique: async () => resource, findMany: async () => [resource, { empresaId: 99, localidadId: 20 }] },
  };
  const load = loader({ 'src/lib/prisma': { prisma }, 'src/lib/servicePrisma': { prismaTorno: serviceDb, prismaTorreon: serviceDb }, 'src/utils/logger': { logger } });
  const { requireTornoScope, filterTornoResponse } = load('src/auth/tornoScope.ts');
  assert.equal((await invoke(requireTornoScope, { user: user('COMERCIAL'), method: 'DELETE', path: '/navajas/77' })).statusCode, 403);
  assert.equal((await invoke(requireTornoScope, { user: user('CLIENTE'), method: 'DELETE', path: '/navajas/77' })).statusCode, 403);
  assert.equal((await invoke(requireTornoScope, { user: user('TORNO'), method: 'DELETE', path: '/navajas/77' })).allowed, true);
  assert.equal((await invoke(requireTornoScope, { user: user('TORNO', 10, 99), method: 'DELETE', path: '/navajas/77' })).statusCode, 403);
  const query = { localidadId: '99' };
  assert.equal((await invoke(requireTornoScope, { user: user('TORNO'), method: 'GET', path: '/cambios-navaja/estadisticas', query })).allowed, true);
  assert.equal(query.localidadId, '20');
  assert.equal((await invoke(requireTornoScope, { user: user('CLIENTE'), method: 'GET', path: '/cambios-navaja/estadisticas' })).statusCode, 403);
  assert.equal((await invoke(requireTornoScope, { user: user('TORNO'), method: 'POST', path: '/navajas/77/futura-operacion' })).statusCode, 404);
  assert.equal((await filterTornoResponse({ items: [{ id: 7 }] }, '/torno/agendados', user('CLIENTE'))).items.length, 0);
  assert.equal((await filterTornoResponse({ activable: true, scheduled: { id: 7 } }, '/torno/agendados/activable', user('CLIENTE'))).activable, false);
  const section = load('src/auth/sectionScope.ts').requireSectionScope;
  assert.equal((await invoke(section, { user: user('CLIENTE'), method: 'POST', path: '/via/77/asignar', params: { viaId: '77' }, body: { movimientoId: 88 } })).statusCode, 403);
  resource = { empresaId: 99, localidadId: 20 };
  assert.equal((await invoke(section, { user: user('CLIENTE'), method: 'POST', path: '/via/77/asignar', params: { viaId: '77' }, body: { movimientoId: 88 } })).statusCode, 403);
  resource = { empresaId: 10, localidadId: 20 };
  assert.equal((await invoke(section, { user: user('CLIENTE'), method: 'POST', path: '/via/77/asignar', params: { viaId: '77' }, body: { movimientoId: 88 } })).allowed, true);
  const torreon = load('src/auth/torreonScope.ts').requireTorreonScope;
  resource = { empresaId: 10, localidadId: 99 };
  assert.equal((await invoke(torreon, { user: user('MAQUINISTA'), method: 'PATCH', path: '/movimientos/77/finalizar' })).statusCode, 403);
  assert.equal((await invoke(torreon, { user: user('COORDINADOR'), method: 'PATCH', path: '/movimientos/77/finalizar' })).statusCode, 403);
  resource = { empresaId: 10, localidadId: 20 };
  const body = { finalizadoPorId: 987 };
  assert.equal((await invoke(torreon, { user: user('MAQUINISTA'), method: 'PATCH', path: '/movimientos/77/finalizar', body })).allowed, true);
  assert.equal(body.finalizadoPorId, 1);
  assert.equal((await invoke(torreon, { user: user('CLIENTE'), method: 'POST', path: '/arrastres', body: { empresaId: 99, localidadId: 20 } })).statusCode, 403);
  assert.equal((await invoke(torreon, { user: user('CLIENTE'), method: 'PATCH', path: '/arrastres/orden-solicitudes', body: { arrastreIds: [1, 2] } })).statusCode, 403);
  const publicUser = load('src/auth/publicUser.ts').publicUserSelect;
  assert.equal(publicUser.contrasena, undefined);
  assert.equal(publicUser.tokenVersion, undefined);
  const fcmLoad = loader({ 'src/lib/prisma': { prisma }, 'src/models/FMC/modelFMC': { FmcModel: {} }, 'src/FMC/fmc.controller.logger': { fmcControllerLogger: logger } });
  const fcm = fcmLoad('src/FMC/FmcController.ts').FmcController;
  assert.equal((await invoke(fcm.eliminarTokensPorUsuario, { user: user('COORDINADOR'), params: { usuarioId: '99' } })).statusCode, 403);

  const session = { usuarioId: 1, tipo: 'ACCESS', revokedAt: null, issuedAt: new Date(Date.now() - 8 * 86400000), expiresAt: new Date(Date.now() + 86400000) };
  let renewals = 0;
  const tokens = loader({ 'src/lib/prisma': { prisma: { token: { findUnique: async () => session, updateMany: async () => { renewals++; return { count: 1 }; } } } }, 'src/services/NotificadorFCM': { NotificadorFCM: {} }, 'src/utils/logger': { logger } });
  const tokenService = tokens('src/middlewares/token.service.ts');
  assert.equal(await tokenService.esSesionVigenteDeUsuario('session-test', 1), false);
  await assert.rejects(() => tokenService.extenderSesionPorJti('session-test', '24h'));
  session.issuedAt = new Date();
  assert.equal(await tokenService.esSesionVigenteDeUsuario('session-test', 99), false);
  await tokenService.extenderSesionPorJti('session-test', '24h');
  assert.equal(renewals, 0, 'Fresh sessions must not write on every request');

  let activeSessions = [];
  const realtime = loader({
    'src/lib/prisma': { prisma: { token: { findMany: async () => activeSessions } } },
    'src/middlewares/token.service': {},
    'src/realtime/realtimeBus': { publishRealtimeBus: async () => undefined, getRealtimeBusStats: () => ({}) },
    'src/auth/corsPolicy': { corsMode: 'compat', corsAllowedOrigins: new Set(), isCorsOriginAllowed: () => true },
  })('src/realtime/realtimeHub.ts', 'export const probe = { handleWebSocketData, safeWrite, clients, deliverRealtimeEvent };');
  let destroyed = false;
  const socket = { destroyed: false, writable: true, write: () => false, destroy() { destroyed = true; } };
  const ws = { id: 'ws', transport: 'websocket', socket, buffer: Buffer.alloc(0) };
  realtime.probe.clients.set(ws.id, ws);
  const frame = Buffer.alloc(10); frame[0] = 0x81; frame[1] = 0xff; frame.writeBigUInt64BE(64n * 1024n * 1024n, 2);
  realtime.probe.handleWebSocketData(ws, frame);
  assert.equal(destroyed, true); assert.equal(ws.buffer.length, 0);
  destroyed = false; realtime.probe.clients.set(ws.id, ws);
  assert.equal(realtime.probe.safeWrite(ws, 'event'), false); assert.equal(destroyed, true);
  let delivered = 0;
  const authUser = user('COORDINADOR');
  const sse = { id: 'sse', transport: 'sse', user: authUser, userId: 1, role: 'COORDINADOR', audience: { mode: 'localidad', id: 20 }, expiresAt: Date.now() + 60000, res: { write() { delivered++; return true; }, destroy() {} } };
  realtime.probe.clients.set(sse.id, sse);
  await realtime.probe.deliverRealtimeEvent({ type: 'movimiento.estado', localidadId: 20, eventId: 'after-revoke' });
  assert.equal(delivered, 0); assert.equal(realtime.probe.clients.size, 0);
  console.log('Security regressions: permission/scope/actor/FCM/session/WebSocket/revocation OK');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
