const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
async function main() {
  const writes = [], audit = [], unit = { id: 9, localidadId: 2 };
  let state = 'ABIERTO', claim = 1, onLock, currentMovement;
  const record = { id: 50, movimientoId: 1, localidadId: 2, movimiento: { id: 1, unidadId: 9, estado: 'DETENIDO', operadorId: 42, fechaInicio: new Date(0) } };
  const tx = { incidenteTorreonFerro: { findUnique: async () => ({ ...record, movimiento: structuredClone(currentMovement ?? record.movimiento), estado: state }), updateMany: async args => { writes.push(args); return { count: claim }; } } };
  let recalculated = 0;
  const model = loader({
    'ms_torreon/src/db/prisma': { prismaTorreon: {} }, 'ms_torreon/src/utils/imagenesTorreon': {},
    'ms_torreon/src/modules/cola/cola.model': { ColaNaturalModel: { asegurarUnidad: async (_tx, movement) => { if (currentMovement) { assert.equal(movement.unidadId, 9, 'Uses unit established by concurrent cancellation'); assert.equal(movement.estado, 'CANCELADO', 'Rereads current movement after locality lock'); } return unit; }, recalcularTx: async (_tx, yard, actor) => { assert.equal(yard, 2); assert.equal(actor.rol, 'CLIENTE'); recalculated++; } }, lockNaturalLocality: async () => { onLock?.(); }, auditNatural: async (...args) => audit.push(args) },
    'ms_torreon/src/modules/arrastres/arrastre.model': { ArrastreModel: { recalcularBloqueosLocalidad: async () => {} } },
  })('ms_torreon/src/modules/incidentes/incidente.model.ts').IncidenteModel;
  const input = { resueltoPorId: 7, confirmadoPorRol: 'CLIENTE', solucion: 'Equipo reparado' };
  await model.resolverTx(tx, 50, input);
  assert.equal(writes[0].where.estado, 'ABIERTO'); assert.equal(writes[0].data.estado, 'RESUELTO');
  assert.equal(writes[0].data.confirmadoPorRol, 'CLIENTE'); assert.equal(writes[0].data.resueltoPorId, 7); assert.ok(writes[0].data.fechaResolucion);
  assert.equal(recalculated, 1); assert.equal(audit[0][3], 'CONFIRMAR_SOLUCION');
  assert.equal(record.movimiento.estado, 'DETENIDO'); assert.equal(record.movimiento.operadorId, 42); assert.equal(record.movimiento.fechaInicio.getTime(), 0);
  claim = 0;
  await assert.rejects(() => model.resolverTx(tx, 50, input), /ya fue atendido/);
  assert.equal(recalculated, 1, 'Lost concurrent solution never enables a second resumption');
  state = 'RESUELTO'; const count = writes.length; await model.resolverTx(tx, 50, input); assert.equal(writes.length, count);
  await assert.rejects(() => model.cerrarTx(tx, 50, input), e => e.status === 409);
  // A resolver waiting behind cancellation must discard its legacy unbound snapshot.
  state = 'ABIERTO'; claim = 1; currentMovement = { ...record.movimiento, unidadId: null };
  onLock = () => { currentMovement = { ...currentMovement, unidadId: 9, estado: 'CANCELADO' }; unit.estado = 'CANCELADA'; };
  await model.resolverTx(tx, 50, input);
  assert.equal(unit.estado, 'CANCELADA');
  const beforeResolvedRace = writes.length;
  state = 'ABIERTO'; onLock = () => { state = 'RESUELTO'; };
  await model.resolverTx(tx, 50, input);
  assert.equal(writes.length, beforeResolvedRace, 'An incident resolved while waiting is idempotent after reread');
  // The actual recalculator only loads DETENIDA units, so cancelled history cannot revive.
  let recalculationWrites = 0;
  const realQueue = loader({ 'ms_torreon/src/db/prisma': { prismaTorreon: {} } })('ms_torreon/src/modules/cola/cola.model.ts').ColaNaturalModel;
  await realQueue.recalcularTx({ unidadAtencionTorreon: {
    findMany: async ({ where }) => { assert.equal(where.estado, 'DETENIDA'); return unit.estado === where.estado ? [unit] : []; },
    update: async () => { recalculationWrites++; },
  } }, 2, { id: 7, rol: 'CLIENTE' });
  assert.equal(recalculationWrites, 0, 'Resolving the retained incident never revives a fully cancelled unit');
  const policy = loader()('ms_torreon/src/modules/cola/cola.policy.ts');
  const ordinary = id => ({ id, fechaRecepcion: new Date(id), fechaHabilitacion: null, ordenManual: null });
  const units = [ordinary(1), { ...ordinary(2), ordenManual: -5 }, { ...ordinary(3), fechaHabilitacion: new Date(20) }, { ...ordinary(4), fechaHabilitacion: new Date(10) }, { ...ordinary(5), ordenManual: -6 }, ordinary(6)];
  assert.deepEqual(units.sort(policy.compareNaturalUnits).map(u => u.id), [4, 3, 5, 2, 1, 6]);
  assert.ok(!policy.NATURAL_SOLUTION_ROLES.has('MAQUINISTA'));
  for (const role of ['CLIENTE', 'COORDINADOR', 'SUPERVISOR']) assert.ok(policy.NATURAL_SOLUTION_ROLES.has(role));
  console.log('PASS Torreón solution: authorized actor/role/time, same requests and clock, no physical auto-resume, concurrent claim, resumption FIFO before manual and ordinary queues');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
