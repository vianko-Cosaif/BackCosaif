const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
const users = [
  { id: 1, rol: 'CLIENTE', empresaId: 100, localidadId: 10, fcmTokens: [{ token: 'correct', localidadId: 10 }] },
  { id: 2, rol: 'CLIENTE', empresaId: 200, localidadId: 10, fcmTokens: [{ token: 'other-company', localidadId: 10 }] },
  { id: 3, rol: 'COORDINADOR', empresaId: null, localidadId: 20, fcmTokens: [{ token: 'stale-yard', localidadId: 10 }] },
  { id: 4, rol: 'SUPERVISOR', empresaId: null, localidadId: 10, fcmTokens: [{ token: 'legacy-yard', localidadId: null }] },
  { id: 5, rol: 'CLIENTE_COOR', empresaId: 100, localidadId: 20, fcmTokens: [{ token: 'selected-yard', localidadId: 10 }, { token: 'other-device', localidadId: 20 }] },
  { id: 6, rol: 'CLIENTE_COOR', empresaId: 100, localidadId: null, fcmTokens: [{ token: 'unscoped', localidadId: null }] },
  { id: 7, rol: 'MAQUINISTA', empresaId: null, localidadId: 10, fcmTokens: [{ token: 'driver', localidadId: 10 }] },
];
let query;
const load = loader({ 'src/lib/prisma': { prisma: { usuario: { findMany: async q => { query = q; return users; } } } } });
const { tokensAudienciaOperacion, uniqueTokensFromUsers } = load('src/services/fcmAudience.ts');
(async () => {
  const params = { empresaId: 100, localidadId: 10, usuarioIds: [2, 3, 6], roles: ['CLIENTE', 'CLIENTE_COOR', 'SUPERVISOR', 'COORDINADOR'] };
  const result = await tokensAudienciaOperacion(params);
  assert.deepEqual(Array.from(result.tokens).sort(), ['correct', 'legacy-yard', 'selected-yard']);
  assert.equal(query.where.activo, true);
  assert.equal(query.where.AND.length, 2, 'Database query restricts both company and yard');
  assert.equal((await tokensAudienciaOperacion({ ...params, localidadId: null })).tokens.length, 0);
  assert.equal((await tokensAudienciaOperacion({ ...params, empresaId: null })).tokens.length, 0);
  assert.equal(uniqueTokensFromUsers(users).length, 0);
  assert.equal((await tokensAudienciaOperacion({ ...params, roles: undefined })).tokens.length, 0, 'Unknown events cannot broadcast to all roles');
  const { realtimeNotificationRoles } = load('src/services/realtimeNotificationPolicy.ts');
  for (const state of ['RESUELTO', 'CERRADO']) assert.deepEqual(Array.from(realtimeNotificationRoles({ type: 'incidente.estado', estado: state })).sort(), ['COORDINADOR', 'MAQUINISTA', 'SUPERVISOR']);
  assert.equal(realtimeNotificationRoles({ type: 'ronda.reordenada' }).length, 0);
  assert.equal(realtimeNotificationRoles({ type: 'movimiento.incidente' }).includes('MAQUINISTA'), true);
  assert.deepEqual(Array.from((await tokensAudienciaOperacion({ ...params, tipo: 'movimiento_iniciado' })).tokens).sort(), ['correct', 'legacy-yard', 'other-company', 'selected-yard']);
  assert.equal((await tokensAudienciaOperacion({ ...params, tipo: 'nuevo_incidente' })).tokens.includes('other-company'), false);
  const { canReceivePatioStart, patioStartNotice } = load('src/services/patioNotificationPolicy.ts');
  const started = { type: 'movimiento.estado', estado: 'EN_PROCESO', localidadId: 10, movimientoId: 1, snapshot: { private: true }, descripcion: 'private detail' };
  assert.equal(canReceivePatioStart('CLIENTE', 10, started), true);
  assert.equal(canReceivePatioStart('CLIENTE', 20, started), false);
  assert.equal(canReceivePatioStart('ARRASTRE_TORREON', 10, started), false);
  assert.equal(canReceivePatioStart('CLIENTE', 10, { ...started, estadoAnterior: 'DETENIDO' }), false);
  assert.equal(canReceivePatioStart('CLIENTE', 10, { ...started, type: 'torreon.arrastre.estado' }), false);
  assert.equal(patioStartNotice(started).snapshot, undefined);
  assert.equal(patioStartNotice(started).descripcion, undefined);
  console.log('PASS notification audiences: roles, same company, same yard, stale tokens and forced user IDs');
})().catch(error => { console.error(error); process.exitCode = 1; });
