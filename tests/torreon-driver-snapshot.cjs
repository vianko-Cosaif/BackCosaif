const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
async function main() {
  const policy = loader()('src/offline/torreonNaturalSnapshotPolicy.ts');
  const movement = (id, state = 'SOLICITADO') => ({ id, estado: state, localidadId: 2, empresaId: 3, locomotiveNumber: id + 100, viaOrigenId: 5, viaDestinoId: 6, viaOrigenNombreSnapshot: 'Vía 5', viaDestinoNombreSnapshot: 'Vía 6', seccionOrigenId: 7, seccionOrigenNombreSnapshot: 'Patio sur', incidentes: [],
    ...(id === 30 ? { polo: 'SUR' } : { poloOrigen: id % 2 === 0 ? 'NORTE' : 'SUR', poloDestino: id % 2 === 0 ? 'SUR' : 'NORTE' }) });
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
    'src/lib/prisma': { prisma: {
      ronda: { findMany: async args => { gdlQuery = args; return []; } },
      seccionVia: { findMany: async () => [{ id: 7, viaId: 5, numero: 1, nombre: 'Patio sur', via: { localidadId: 2, localidad: { nombre: 'Torreón' } } }] },
    } },
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
  assert.ok(inserts.every(line => line.includes('"seccionOrigenNumero":1')));
  assert.ok(inserts.every(line => line.includes('"seccionOrigenNombreSnapshot":"Sección 1 · Patio sur"')));
  assert.match(sql, /Vía 5 · Sección 1 · Patio sur/, 'Offline route summaries keep the catalogue number, not the database ID');
  const payloadFromInsert = line => JSON.parse(line.match(/,'((?:''|[^'])*)'\);$/)[1].replace(/''/g, "'"));
  const units = inserts.map(payloadFromInsert);
  assert.equal(units[0].movimientos[0].poloOrigen, 'NORTE', 'The driver receives the departure pole in the offline unit');
  assert.equal(units[0].movimientos[0].poloDestino, 'SUR', 'The arrival pole remains independent');
  assert.equal(units[0].movimientos[1].poloOrigen, 'SUR');
  assert.equal(units[0].movimientos[1].poloDestino, 'NORTE');
  const movements = sql.split('\n').filter(line => line.startsWith('INSERT OR REPLACE INTO movements VALUES')).map(payloadFromInsert);
  assert.equal(movements.find(row => row.id === 10).poloDestino, 'SUR', 'The standalone movement payload also retains both poles');
  const legacy = movements.find(row => row.id === 30);
  assert.equal(legacy.polo, 'SUR');
  assert.equal(legacy.poloOrigen, undefined, 'A legacy general pole cannot identify the departure pole');
  assert.equal(legacy.poloDestino, undefined, 'A legacy general pole cannot identify the arrival pole');
  await read.snapshotSql('GDL_NATURAL', { ...user, localidad: { id: 1, nombre: 'Guadalajara' } }, new Date(1).toISOString(), new Date(10000).toISOString());
  assert.deepEqual(Array.from(gdlQuery.where.movimiento.estado.in), ['SOLICITADO', 'EN_PROCESO', 'DETENIDO']);
  console.log('PASS Torreón driver snapshot: requested/in-progress/externally-released groups, no stopped/open/member/resource blocks, consistent payload and order, GDL query unchanged');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
