const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
async function main() {
  const policy = loader()('src/offline/torreonNaturalSnapshotPolicy.ts');
  const movement = (id, state = 'SOLICITADO') => ({ id, estado: state, empresaId: 3, locomotiveNumber: id + 100, viaOrigenId: 5, viaDestinoId: 6, seccionOrigenId: 7, incidentes: [] });
  const unit = (id, state = 'PENDIENTE') => ({ id, estado: state, modalidad: 'CONJUNTO', operadorId: 42, fechaRecepcion: new Date(id), fechaHabilitacion: state === 'LISTA_REANUDAR' ? new Date(1) : null, ordenManual: null, movimientos: [movement(id * 10), movement(id * 10 + 1)], incidentes: [] });
  const ready = unit(1, 'LISTA_REANUDAR'); ready.movimientos.forEach(m => m.estado = 'DETENIDO');
  const stopped = unit(2, 'DETENIDA'); stopped.movimientos[0].estado = 'DETENIDO';
  const active = unit(3, 'EN_PROCESO'); active.movimientos.forEach(m => m.estado = 'EN_PROCESO');
  const blocked = unit(4); blocked.movimientos[1].incidentes = [{ estado: 'ABIERTO' }];
  assert.equal(policy.isTorreonNaturalSnapshotUnitAvailable(ready, []), true);
  assert.equal(policy.isTorreonNaturalSnapshotUnitAvailable(stopped, []), false);
  assert.equal(policy.isTorreonNaturalSnapshotUnitAvailable(blocked, []), false);
  assert.equal(policy.isTorreonNaturalSnapshotUnitAvailable(unit(5, 'CONCLUIDA'), []), false);
  for (const incident of [{ unidadId: ready.id }, { movimientoId: ready.movimientos[1].id }, { viaBloqueadaId: 5 }, { seccionBloqueadaId: 7 }]) {
    assert.equal(policy.isTorreonNaturalSnapshotUnitAvailable(ready, [{ estado: 'ABIERTO', ...incident }]), false);
    assert.equal(policy.isTorreonNaturalSnapshotUnitAvailable(ready, [{ estado: 'RESUELTO', ...incident }]), true);
  }
  assert.equal(policy.isTorreonNaturalSnapshotUnitAvailable(ready, [{ estado: 'ABIERTO', viaBloqueadaId: 90 }]), true);
  assert.equal(policy.isTorreonNaturalSnapshotUnitAvailable({ ...unit(7), movimientos: [] }, []), false);
  let unitQuery, incidentQuery, gdlQuery;
  const read = loader({
    'src/lib/prisma': { prisma: { ronda: { findMany: async args => { gdlQuery = args; return []; } } } },
    'src/lib/servicePrisma': { prismaTorreon: {
      unidadAtencionTorreon: { findMany: async args => { unitQuery = args; return [stopped, active, blocked, ready]; } },
      incidenteTorreonFerro: { findMany: async args => { incidentQuery = args; return []; } },
    } },
  })('src/offline/maquinistaOfflinePackage.ts', 'exports.snapshotSql = snapshotSql;');
  const user = { id: 42, rol: 'MAQUINISTA', localidad: { id: 2, nombre: 'Torreón' } };
  const sql = await read.snapshotSql('TORREON_NATURAL', user, new Date(1).toISOString(), new Date(10000).toISOString());
  assert.deepEqual(Array.from(unitQuery.where.estado.in), ['PENDIENTE', 'EN_PROCESO', 'LISTA_REANUDAR']);
  assert.equal(incidentQuery.where.localidadId, 2); assert.equal(incidentQuery.where.estado, 'ABIERTO');
  const inserts = sql.split('\n').filter(line => line.startsWith('INSERT INTO units VALUES'));
  assert.equal(inserts.length, 2);
  assert.match(inserts[0], /^INSERT INTO units VALUES \(1,/);
  assert.match(inserts[1], /^INSERT INTO units VALUES \(3,/);
  await read.snapshotSql('GDL_NATURAL', { ...user, localidad: { id: 1, nombre: 'Guadalajara' } }, new Date(1).toISOString(), new Date(10000).toISOString());
  assert.deepEqual(Array.from(gdlQuery.where.movimiento.estado.in), ['SOLICITADO', 'EN_PROCESO', 'DETENIDO']);
  console.log('PASS Torreón driver snapshot: requested/in-progress/externally-released groups, no stopped/open/member/resource blocks, consistent payload and order, GDL query unchanged');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
