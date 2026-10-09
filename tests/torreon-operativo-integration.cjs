// Runs only against an explicitly supplied disposable PostgreSQL database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const url = process.env.TORREON_TEST_DATABASE_URL;
if (!url || !/^torreon_operativo_test(?:_[a-z0-9]+)?$/.test(new URL(url).pathname.slice(1))) {
  throw new Error('Set TORREON_TEST_DATABASE_URL to a disposable database named torreon_operativo_test (optional suffix).');
}
process.env.TORREON_DATABASE_URL = url;
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../ms_torreon/tsconfig.json');
require('ts-node/register/transpile-only');
const { prismaTorreon: db } = require('../ms_torreon/src/db/prisma');
const { MovimientoModel: moves } = require('../ms_torreon/src/modules/movimientos/movimiento.model');
const { ColaNaturalModel: queue } = require('../ms_torreon/src/modules/cola/cola.model');
const { IncidenteModel: incidents } = require('../ms_torreon/src/modules/incidentes/incidente.model');
const { expireNaturalIncident } = require('../ms_torreon/src/modules/incidentes/incidentExpiry');
const schemas = require('../ms_torreon/src/modules/movimientos/movimiento.schemas');
const baselinePath = process.env.TORREON_TEST_BASELINE || '/private/tmp/torreon-operativo-baseline.json';
const photo = { url: 'https://example.invalid/synthetic-evidence.jpg' };
const dispatch = { id: 10, rol: 'SUPERVISOR' }, driver = { id: 42, rol: 'MAQUINISTA' }, client = { id: 7, rol: 'CLIENTE' };
const row = (number, index = 0) => ({ empresaId: 3, localidadId: 20261008, creadoPorId: client.id, clienteId: client.id,
  locomotiveNumber: number, viaOrigenId: 11 + index * 10, viaDestinoId: 12 + index * 10,
  tipoMovimiento: 'MD_TRABAJANDO', polo: 'NORTE', posicionCabina: 'DENTRO', posicionChimenea: 'Sin_Solicitar', direccionEmpuje: 'Sin_Solicitar' });
const finish = unit => schemas.finalizarMovimientoSchema.parse({ finalizadoPorId: driver.id });
const start = (unit, operator = driver.id) => schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: operator });
const next = operator => db.$transaction(tx => queue.siguienteTx(tx, 20261008, operator));
const unit = id => db.$transaction(tx => queue.obtenerTx(tx, id));
async function legacySnapshot() {
  const result = {};
  for (const table of ['movimiento_torreon_ferro', 'incidente_torreon_ferro', 'movimiento_torreon_foto', 'incidente_torreon_foto', 'ronda_torreon', 'ronda_torreon_movimiento']) {
    const rows = await db.$queryRawUnsafe(`SELECT to_jsonb(t) AS row FROM ${table} t WHERE id >= 900001 AND id <= 900020 ORDER BY id`);
    result[table] = rows.map(({ row }) => { delete row.unidad_id; delete row.confirmado_por_rol; delete row.lote_captura_id; delete row.locomotora_remolque; delete row.polo; return row; });
  }
  return result;
}
async function seedLegacy() {
  assert.equal(await db.movimientoTorreonFerro.count(), 0, 'Seed only an empty disposable database');
  await db.$transaction(async tx => {
  await tx.$executeRawUnsafe(`INSERT INTO movimiento_torreon_ferro (id,empresa_id,creado_por_id,cliente_id,localidad_id,locomotive_number,estado,fecha_solicitud,fecha_inicio,fecha_pausa,fecha_fin,via_origen_id,via_destino_id,updated_at)
    VALUES (900001,3,7,7,2,101,'SOLICITADO','2026-09-01',NULL,NULL,NULL,11,12,NOW()),
    (900002,3,7,7,2,102,'EN_PROCESO','2026-09-01','2026-09-02',NULL,NULL,21,22,NOW()),
    (900003,3,7,7,2,103,'DETENIDO','2026-09-01','2026-09-02','2026-09-03',NULL,31,32,NOW()),
    (900004,3,7,7,2,104,'DETENIDO','2026-09-01','2026-09-02','2026-09-03',NULL,41,42,NOW()),
    (900005,3,7,7,2,105,'CONCLUIDO','2026-09-01','2026-09-02',NULL,'2026-09-03',51,52,NOW()),
    (900006,3,7,7,2,106,'CANCELADO','2026-09-01',NULL,NULL,'2026-09-03',61,62,NOW())`);
  await tx.$executeRawUnsafe(`INSERT INTO incidente_torreon_ferro (id,movimiento_id,localidad_id,creado_por_id,motivo,estado,fecha_inicio,solucion,resuelto_por_id,fecha_resolucion,updated_at)
    VALUES (900001,900003,2,42,'Bloqueo histórico','ABIERTO','2026-09-03',NULL,NULL,NULL,NOW()),
    (900002,900004,2,42,'Solución histórica','RESUELTO','2026-09-03','Equipo reparado',7,'2026-09-04',NOW())`);
  await tx.$executeRawUnsafe(`INSERT INTO movimiento_torreon_foto (id,movimiento_id,tipo,orden,url,tomada_por_id,updated_at) VALUES (900001,900003,'ANTES_MOVIMIENTO',1,'https://example.invalid/legacy.jpg',42,NOW())`);
  await tx.$executeRawUnsafe(`INSERT INTO incidente_torreon_foto (id,incidente_id,orden,url,tomada_por_id,updated_at) VALUES (900001,900001,1,'https://example.invalid/legacy-incident.jpg',42,NOW())`);
  await tx.$executeRawUnsafe(`INSERT INTO ronda_torreon (id,localidad_id,numero_ronda,estado,updated_at) VALUES (900001,2,1,'ABIERTA',NOW())`);
  await tx.$executeRawUnsafe(`INSERT INTO ronda_torreon_movimiento (id,ronda_id,movimiento_id,empresa_id,prioridad,estado,orden,updated_at) VALUES (900001,900001,900003,3,'BAJA','BLOQUEADO',1,NOW())`);
  });
  fs.writeFileSync(baselinePath, JSON.stringify(await legacySnapshot()));
  console.log('PASS migration fixture: historical requests, incidents, evidence and rounds seeded');
}
async function main() {
  if (process.argv.includes('--seed-legacy')) return seedLegacy();
  if (fs.existsSync(baselinePath)) {
    assert.deepEqual(await legacySnapshot(), JSON.parse(fs.readFileSync(baselinePath)), 'Migration preserves all original fields, IDs, evidence and historical rounds');
    const migrated = await db.movimientoTorreonFerro.findMany({ where: { id: { gte: 900001, lte: 900006 } }, include: { unidad: true }, orderBy: { id: 'asc' } });
    assert.deepEqual(migrated.map(m => m.unidad.estado), ['PENDIENTE', 'EN_PROCESO', 'DETENIDA', 'LISTA_REANUDAR', 'CONCLUIDA', 'CANCELADA']);
    assert.equal(new Set(migrated.map(m => m.unidadId)).size, 6, 'Migration never invents groups');
    console.log('PASS migration: original data preserved; open pauses remain stopped; solved pauses become ready');
  }
  assert.equal(await db.movimientoTorreonFerro.count({ where: { localidadId: 20261008 } }), 0, 'Use a fresh disposable database for each integration run');
  const payload = schemas.createLoteSchema.parse({ clientRequestId: 'integration-batch-0001', movimientos: Array.from({ length: 5 }, (_, i) => ({ ...row(120 + i, i), ...(i === 1 ? { tipoMovimiento: 'REMOLCADA', locomotoraRemolque: 800, direccionEmpuje: 'JALAR' } : {}) })) });
  const created = await moves.crearLote(payload, client);
  assert.equal(new Set(created.map(m => m.unidadId)).size, 5);
  assert.equal(created[1].locomotoraRemolque, 800);
  assert.deepEqual((await moves.crearLote(payload, client)).map(m => m.id), created.map(m => m.id));
  await assert.rejects(() => moves.crearLote({ ...payload, movimientos: payload.movimientos.map((r, i) => i === 1 ? { ...r, locomotiveNumber: 999 } : r) }, client), e => e.status === 409);
  for (const count of [0, 6]) assert.throws(() => schemas.createLoteSchema.parse({ ...payload, movimientos: Array(count).fill(payload.movimientos[0]) }));
  await assert.rejects(() => moves.crearLote({ clientRequestId: 'invalid-batch-0001', movimientos: [row(125), { ...row(126), tipoMovimiento: 'REMOLCADA' }] }, client), e => e.status === 400);
  assert.equal(await db.movimientoTorreonFerro.count({ where: { localidadId: 20261008 } }), 5, 'Incomplete batch rolls back every row');
  assert.deepEqual((await queue.listar(20261008)).map(u => u.movimientos[0].id), created.map(m => m.id));
  await queue.priorizar([created[1].unidadId, created[2].unidadId], false, dispatch);
  assert.equal((await next(driver.id)).movimientos.length, 1, 'Raising multiple rows never groups them');
  assert.equal((await next(driver.id)).id, created[1].unidadId);
  await queue.priorizar([created[1].unidadId, created[2].unidadId], true, dispatch);
  let group = (await queue.listar(20261008)).find(u => u.modalidad === 'CONJUNTO');
  assert.deepEqual(group.movimientos.map(m => m.id), [created[1].id, created[2].id]);
  await queue.asignar(group.id, driver.id, dispatch);
  group = await unit(group.id);
  await assert.rejects(() => moves.iniciar(created[0].id, schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: driver.id, fotos: [photo] }), driver), e => e.status === 409);
  await Promise.all([moves.iniciar(group.movimientos[0].id, start(group), driver), moves.iniciar(group.movimientos[0].id, start(group), driver)]);
  group = await unit(group.id);
  assert.equal(group.estado, 'EN_PROCESO');
  assert.ok(group.movimientos.every(m => m.estado === 'EN_PROCESO'));
  assert.equal(await db.movimientoTorreonFoto.count({ where: { movimientoId: { in: group.movimientos.map(m => m.id) } } }), 0, 'Starting a group does not require or invent photographs');
  const originalStarts = group.movimientos.map(m => m.fechaInicio.toISOString());
  const report = index => moves.detenerConIncidente(group.movimientos[index].id, { creadoPorId: driver.id, motivo: `Problema en locomotora ${group.movimientos[index].locomotiveNumber}`, fotos: [photo] }, driver);
  const firstIncident = await report(0), secondIncident = await report(1);
  group = await unit(group.id);
  assert.ok(group.movimientos.every(m => m.estado === 'DETENIDO'));
  assert.equal(group.estado, 'DETENIDA');
  assert.ok(!(await queue.listar(20261008)).find(u => u.id === group.id).disponible);
  await db.incidenteTorreonFerro.update({ where: { id: firstIncident.incidenteId }, data: { fechaInicio: new Date(Date.now() - 30 * 86400000) } });
  assert.equal((await expireNaturalIncident(firstIncident.incidenteId, new Date())).changed, false);
  assert.equal((await db.incidenteTorreonFerro.findUnique({ where: { id: firstIncident.incidenteId } })).estado, 'ABIERTO');
  const other = await next(driver.id);
  assert.equal(other.id, created[0].unidadId);
  await moves.iniciar(other.movimientos[0].id, start(other), driver);
  const solve = id => incidents.resolver(id, { solucion: 'Impedimento reparado y comprobado', resueltoPorId: client.id, confirmadoPorRol: client.rol }, 'NATURAL');
  await solve(firstIncident.incidenteId);
  assert.equal((await unit(group.id)).estado, 'DETENIDA', 'A second open impediment prevents re-entry');
  await solve(secondIncident.incidenteId);
  group = await unit(group.id);
  assert.equal(group.estado, 'LISTA_REANUDAR');
  assert.ok(group.fechaHabilitacion);
  assert.ok(group.movimientos.every(m => m.estado === 'DETENIDO'), 'Confirming a solution does not start physical work');
  assert.deepEqual(group.movimientos.map(m => m.fechaInicio.toISOString()), originalStarts);
  assert.equal(group.operadorId, driver.id);
  assert.equal((await next(driver.id)).id, other.id, 'A resumption never interrupts the current job');
  await assert.rejects(() => moves.reanudar(group.movimientos[0].id, { fotos: [] }, driver), e => e.status === 403);
  await assert.rejects(() => moves.iniciar(group.movimientos[0].id, schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: driver.id }), driver), e => e.status === 409);
  await moves.finalizar(other.movimientos[0].id, finish(other), driver);
  assert.equal((await next(driver.id)).id, group.id, 'Ready group is the next job before ordinary pending work');
  await assert.rejects(() => moves.iniciar(created[3].id, schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: driver.id, fotos: [photo] }), driver), e => e.status === 409);
  await moves.iniciar(group.movimientos[0].id, schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: driver.id }), driver);
  for (let i = 0; i < 4; i++) {
    const reported = await report(0);
    await solve(reported.incidenteId);
    await moves.iniciar(group.movimientos[0].id, schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: driver.id }), driver);
  }
  await assert.rejects(() => incidents.cerrar(firstIncident.incidenteId, { solucion: 'Cancelar por tiempo', resueltoPorId: dispatch.id }, 'NATURAL'), e => e.status === 409);
  group = await unit(group.id);
  assert.deepEqual(group.movimientos.map(m => m.id), [created[1].id, created[2].id]);
  assert.deepEqual(group.movimientos.map(m => m.fechaInicio.toISOString()), originalStarts);
  assert.equal(await db.movimientoTorreonFerro.count({ where: { localidadId: 20261008 } }), 5, 'More than three incidents never cancels or creates replacement requests');
  await moves.finalizar(group.movimientos[0].id, finish(group), driver);
  group = await unit(group.id);
  assert.equal(group.estado, 'CONCLUIDA');
  assert.ok(group.movimientos.every(m => m.estado === 'CONCLUIDO' && m.finalizado && m.fechaFin));
  assert.equal(await db.movimientoTorreonFoto.count({ where: { movimientoId: { in: group.movimientos.map(m => m.id) } } }), 0, 'Finishing a group does not require photographs either');
  const trace = await db.bitacoraNaturalTorreon.findMany({ where: { unidadId: group.id } });
  for (const action of ['FORMAR_CONJUNTO', 'PRIORIZAR', 'ASIGNAR', 'INICIAR', 'REPORTAR_INCIDENTE', 'CONFIRMAR_SOLUCION', 'HABILITAR_REANUDACION', 'REANUDAR', 'FINALIZAR']) assert.ok(trace.some(e => e.accion === action), action);
  assert.equal(trace.filter(e => e.accion === 'FINALIZAR').length, 2, 'Independent completion record for every original request');
  assert.ok(trace.filter(e => e.accion === 'CONFIRMAR_SOLUCION').every(e => e.usuarioId === client.id && e.rol === client.rol));
  const history = await queue.historial(group.id);
  assert.ok(history.filter(e => e.accion === 'SOLICITAR').length === 2, 'Group history keeps both original independent request records');
  assert.ok((await queue.listar(20261008, undefined, true)).every(u => u.movimientos.length), 'Superseded empty containers never appear as cancelled requests');
  // Concurrent claims for one driver cannot start two distinct units.
  await queue.priorizar([created[3].unidadId, created[4].unidadId], false, dispatch);
  const claims = await Promise.allSettled([3, 4].map(i => moves.iniciar(created[i].id, schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: 81, fotos: [photo] }), { id: 81, rol: 'MAQUINISTA' })));
  assert.equal(claims.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await db.unidadAtencionTorreon.count({ where: { localidadId: 20261008, estado: 'EN_PROCESO', operadorId: 81 } }), 1);

  // A second locality proves resource blocking, reassignment and FIFO resumptions.
  const yard = 20261009;
  const extra = await moves.crearLote({ clientRequestId: 'integration-batch-0002', movimientos: [201, 202, 203].map((n, i) => ({ ...row(n, i), localidadId: yard })) }, client);
  const drivers = [101, 102, 103].map(id => ({ id, rol: 'MAQUINISTA' }));
  for (let i = 0; i < extra.length; i++) await queue.asignar(extra[i].unidadId, drivers[i].id, dispatch);
  for (let i = 0; i < 2; i++) await moves.iniciar(extra[i].id, start(await unit(extra[i].unidadId), drivers[i].id), drivers[i]);
  const pauses = [];
  for (let i = 0; i < 2; i++) pauses.push(await moves.detenerConIncidente(extra[i].id, { creadoPorId: drivers[i].id, motivo: 'Impedimento independiente', fotos: [photo] }, drivers[i]));
  await solve(pauses[1].incidenteId);
  await solve(pauses[0].incidenteId);
  const readyA = await unit(extra[0].unidadId), readyB = await unit(extra[1].unidadId);
  // Fix distinct habilitation timestamps so this assertion is independent of clock resolution.
  await db.unidadAtencionTorreon.update({ where: { id: readyB.id }, data: { fechaHabilitacion: new Date(readyA.fechaHabilitacion.getTime() - 1000) } });
  await queue.asignar(readyB.id, drivers[0].id, dispatch);
  await queue.asignar(extra[2].unidadId, drivers[0].id, dispatch);
  await queue.priorizar([extra[2].unidadId], false, dispatch);
  const nextExtra = () => db.$transaction(tx => queue.siguienteTx(tx, yard, drivers[0].id));
  assert.equal((await nextExtra()).id, readyB.id, 'Resumptions use habilitation FIFO before even manually prioritized pending work');
  for (const ready of [readyB, readyA]) {
    assert.equal((await nextExtra()).id, ready.id);
    await moves.iniciar(ready.movimientos[0].id, schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: drivers[0].id }), drivers[0]);
    await moves.finalizar(ready.movimientos[0].id, finish(await unit(ready.id)), drivers[0]);
  }
  await queue.asignar(extra[2].unidadId, drivers[2].id, dispatch);
  await moves.iniciar(extra[2].id, start(await unit(extra[2].unidadId), drivers[2].id), drivers[2]);
  const ownPause = await moves.detenerConIncidente(extra[2].id, { creadoPorId: drivers[2].id, motivo: 'Falla propia', fotos: [photo] }, drivers[2]);
  const [resourceMove] = await moves.crearLote({ clientRequestId: 'integration-batch-0003', movimientos: [{ ...row(204, 3), localidadId: yard }] }, client);
  const resourceDriver = { id: 104, rol: 'MAQUINISTA' };
  await queue.asignar(resourceMove.unidadId, resourceDriver.id, dispatch);
  await moves.iniciar(resourceMove.id, start(await unit(resourceMove.unidadId), resourceDriver.id), resourceDriver);
  const resourcePause = await moves.detenerConIncidente(resourceMove.id, { creadoPorId: resourceDriver.id, motivo: 'Vía compartida bloqueada', viaBloqueadaId: 31, fotos: [photo] }, resourceDriver);
  await solve(ownPause.incidenteId);
  assert.equal((await unit(extra[2].unidadId)).estado, 'DETENIDA', 'Solving the own incident cannot bypass an open shared track impediment');
  await solve(resourcePause.incidenteId);
  assert.equal((await unit(extra[2].unidadId)).estado, 'LISTA_REANUDAR');
  const reassigned = { id: 105, rol: 'MAQUINISTA' };
  await queue.asignar(extra[2].unidadId, reassigned.id, dispatch);
  assert.equal((await unit(extra[2].unidadId)).operadorId, reassigned.id);
  assert.equal((await unit(extra[2].unidadId)).movimientos[0].operadorId, reassigned.id);
  await assert.rejects(() => moves.iniciar(extra[2].id, schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: drivers[2].id }), drivers[2]), e => e.status === 409);
  await moves.iniciar(extra[2].id, schemas.iniciarMovimientoSchema.parse({ iniciadoPorId: reassigned.id }), reassigned);
  await moves.finalizar(extra[2].id, finish(await unit(extra[2].unidadId)), reassigned);
  if (fs.existsSync(baselinePath)) assert.deepEqual(await legacySnapshot(), JSON.parse(fs.readFileSync(baselinePath)), 'All historical data and rounds stay unchanged after new operations');
  console.log('PASS Torreón integration: atomic 1–5 capture, retry identity, FIFO/manual order, explicit groups, per-request evidence, all-member pause, persistent incidents, all-impediment solution, next resumption without interruption, original IDs/history, individual completion and concurrent claims');
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
