const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');

async function main() {
  const driver = { id: 42, rol: 'MAQUINISTA' };
  const originalStart = new Date('2026-10-01T08:00:00Z');
  const movement = (id, unidadId, estado, viaOrigenId = 8, viaDestinoId = 9) => ({
    id, unidadId, localidadId: 2, empresaId: 3, estado, operadorId: driver.id,
    fechaSolicitud: new Date(id), fechaInicio: originalStart, fechaPausa: null,
    fechaFin: null, viaOrigenId, viaDestinoId, seccionOrigenId: null, seccionDestinoId: null,
  });
  const movements = [movement(1, 9, 'EN_PROCESO'), movement(2, 9, 'EN_PROCESO'), movement(3, 9, 'CANCELADO'), movement(4, 10, 'SOLICITADO', 18, 19)];
  movements[3].fechaInicio = null;
  const units = [
    { id: 9, localidadId: 2, modalidad: 'CONJUNTO', estado: 'EN_PROCESO', operadorId: driver.id, fechaRecepcion: new Date(1), fechaInicio: originalStart, fechaHabilitacion: null, ordenManual: null },
    { id: 10, localidadId: 2, modalidad: 'INDIVIDUAL', estado: 'PENDIENTE', operadorId: driver.id, fechaRecepcion: new Date(0), fechaInicio: null, fechaHabilitacion: null, ordenManual: -10 },
  ];
  const incidents = [], audit = [], photos = [];
  const expanded = unit => ({ ...unit, movimientos: movements.filter(m => m.unidadId === unit.id), incidentes: incidents.filter(i => i.unidadId === unit.id) });
  const stateMatches = (state, where) => !where || (typeof where === 'string' ? state === where : where.in ? where.in.includes(state) : !where.notIn.includes(state));
  const tx = {
    $queryRaw: async () => [],
    unidadAtencionTorreon: {
      findUnique: async ({ where }) => { const unit = units.find(u => u.id === where.id); return unit ? expanded(unit) : null; },
      findMany: async ({ where }) => units.filter(u => u.localidadId === where.localidadId && stateMatches(u.estado, where.estado)).map(expanded),
      update: async ({ where, data }) => Object.assign(units.find(u => u.id === where.id), data),
    },
    movimientoTorreonFerro: {
      findUnique: async ({ where }) => movements.find(m => m.id === where.id),
      update: async ({ where, data }) => Object.assign(movements.find(m => m.id === where.id), data),
      updateMany: async ({ where, data }) => { const rows = movements.filter(m => m.unidadId === where.unidadId && stateMatches(m.estado, where.estado)); rows.forEach(m => Object.assign(m, data)); return { count: rows.length }; },
    },
    incidenteTorreonFerro: {
      findFirst: async ({ where }) => incidents.find(i => i.localidadId === where.localidadId && i.estado === where.estado && where.OR.some(clause =>
        (clause.unidadId != null && i.unidadId === clause.unidadId) ||
        clause.movimientoId?.in.includes(i.movimientoId) ||
        (clause.viaBloqueadaId != null && i.viaBloqueadaId === clause.viaBloqueadaId) ||
        (clause.seccionBloqueadaId != null && i.seccionBloqueadaId === clause.seccionBloqueadaId))) ?? null,
      update: async ({ where, data }) => Object.assign(incidents.find(i => i.id === where.id), data),
    },
    bitacoraNaturalTorreon: { create: async ({ data }) => { audit.push(data); return data; } },
    movimientoTorreonFoto: {
      count: async ({ where }) => photos.filter(p => p.movimientoId === where.movimientoId && p.tipo === where.tipo).length,
      findFirst: async () => null,
      create: async ({ data }) => { photos.push(data); return data; },
    },
  };
  const db = { ...tx, $transaction: async run => run(tx) };
  const mocks = {
    'ms_torreon/src/db/prisma': { prismaTorreon: db },
    'ms_torreon/src/utils/imagenesTorreon': { guardarFotoTorreon: async foto => ({ url: foto.url }) },
    'ms_torreon/src/modules/incidentes/incidente.model': { IncidenteModel: { crearParaMovimiento: async (_tx, row, input) => {
      const incident = { id: incidents.length + 50, localidadId: row.localidadId, movimientoId: row.id, estado: 'ABIERTO', motivo: input.motivo };
      incidents.push(incident); return incident;
    } } },
  };
  const load = loader(mocks);
  const queue = load('ms_torreon/src/modules/cola/cola.model.ts').ColaNaturalModel;
  const listIds = async (...args) => Array.from(await queue.listar(...args), unit => unit.id);
  const moves = load('ms_torreon/src/modules/movimientos/movimiento.model.ts').MovimientoModel;
  const start = (id = driver.id, extra = {}) => ({ iniciadoPorId: id, fotos: [], ...extra });
  const first = await moves.detenerConIncidente(1, { creadoPorId: driver.id, motivo: 'Falla de equipo', fotos: [] }, driver);
  const second = await moves.detenerConIncidente(2, { creadoPorId: driver.id, motivo: 'Otra falla', fotos: [] }, driver);
  assert.equal(units[0].estado, 'DETENIDA');
  assert.ok(movements.slice(0, 2).every(m => m.estado === 'DETENIDO' && m.fechaPausa));
  assert.equal(movements[2].estado, 'CANCELADO', 'Stopping a group preserves closed members');
  assert.deepEqual(await listIds(2, undefined, false, driver), [10], 'Stopped group leaves the operator list');
  assert.ok((await queue.listar(2)).some(u => u.id === 9), 'Coordination keeps the stopped group visible');
  assert.equal((await queue.siguienteTx(tx, 2, driver.id)).id, 10, 'Next work does not return a stopped group');
  await assert.rejects(() => moves.iniciar(1, start(), driver), e => e.status === 409);
  const beforeExplicit = audit.length;
  await assert.rejects(() => moves.reanudar(1, { fotos: [], solucion: 'Operator cannot authorize this' }, driver), e => e.status === 403);
  assert.equal(audit.length, beforeExplicit, 'Explicit resume does not mutate or authorize the group');

  const resolver = { id: 7, rol: 'CLIENTE' };
  incidents.find(i => i.id === first.incidenteId).estado = 'RESUELTO';
  await queue.recalcularTx(tx, 2, resolver);
  assert.equal(units[0].estado, 'DETENIDA', 'One unresolved member keeps the entire group out');
  incidents.find(i => i.id === second.incidenteId).estado = 'RESUELTO';
  const resource = { id: 99, localidadId: 2, movimientoId: 99, estado: 'ABIERTO', viaBloqueadaId: 8 };
  incidents.push(resource);
  await queue.recalcularTx(tx, 2, resolver);
  assert.equal(units[0].estado, 'DETENIDA', 'External resource blockers also prevent re-entry');
  resource.estado = 'RESUELTO';
  await queue.recalcularTx(tx, 2, resolver);
  assert.equal(units[0].estado, 'LISTA_REANUDAR');
  assert.ok(units[0].fechaHabilitacion);
  assert.ok(movements.slice(0, 2).every(m => m.estado === 'DETENIDO'), 'Authorization does not automatically start physical work');
  assert.deepEqual(await listIds(2, undefined, false, driver), [9, 10], 'Externally enabled group returns before manual priorities');
  assert.equal(audit.find(e => e.accion === 'HABILITAR_REANUDACION').usuarioId, resolver.id);
  assert.equal((await queue.siguienteTx(tx, 2, driver.id)).id, 9);
  const enabledAt = units[0].fechaHabilitacion;
  await queue.asignar(9, 81, { id: 10, rol: 'SUPERVISOR' });
  assert.equal(units[0].operadorId, 81);
  assert.ok(movements.slice(0, 2).every(m => m.operadorId === 81), 'Reassignment synchronizes every open group member');
  assert.equal(movements[2].operadorId, driver.id, 'Closed member assignment stays historical');
  assert.equal(units[0].estado, 'LISTA_REANUDAR');
  assert.equal(units[0].fechaHabilitacion, enabledAt);
  await assert.rejects(() => moves.iniciar(1, start(), driver), e => e.status === 409);
  await queue.asignar(9, driver.id, { id: 10, rol: 'SUPERVISOR' });

  await assert.rejects(() => moves.iniciar(1, start(81), { id: 81, rol: 'MAQUINISTA' }), e => e.status === 409);
  await assert.rejects(() => moves.iniciar(1, start(driver.id, { operadorId: 81 }), driver), e => e.status === 403);
  units[1].estado = 'EN_PROCESO'; movements[3].estado = 'EN_PROCESO';
  await assert.rejects(() => moves.iniciar(1, start(), driver), e => e.status === 409);
  assert.equal((await queue.siguienteTx(tx, 2, driver.id)).id, 10, 'Ready priority never interrupts existing work');
  const currentBlock = { id: 100, localidadId: 2, movimientoId: 100, estado: 'ABIERTO', viaBloqueadaId: 18 };
  incidents.push(currentBlock);
  assert.equal(await queue.siguienteTx(tx, 2, driver.id), null, 'Blocked current work produces no next execution');
  assert.deepEqual(await listIds(2, undefined, false, driver), [9], 'Resource-blocked current work leaves the operational list');
  await assert.rejects(() => moves.iniciar(4, start(), driver), e => e.status === 409);
  await assert.rejects(() => moves.iniciar(1, start(), driver), e => e.status === 409);
  assert.equal(units.filter(u => u.estado === 'EN_PROCESO' && u.operadorId === driver.id).length, 1, 'A hidden blocked current job cannot create parallel work');
  currentBlock.estado = 'RESUELTO';
  assert.equal((await queue.siguienteTx(tx, 2, driver.id)).id, 10, 'The existing job returns when its external resource is unblocked');
  units[1].estado = 'CONCLUIDA'; movements[3].estado = 'CONCLUIDO';
  resource.estado = 'ABIERTO';
  await assert.rejects(() => moves.iniciar(1, start(), driver), e => e.status === 409);
  assert.deepEqual(await listIds(2, undefined, false, driver), [], 'New blockers hide even a previously enabled unit');
  resource.estado = 'RESUELTO';
  await moves.iniciar(1, start(), driver);
  assert.equal(units[0].estado, 'EN_PROCESO');
  assert.ok(movements.slice(0, 2).every(m => m.estado === 'EN_PROCESO' && m.fechaPausa === null && m.fechaInicio === originalStart));
  assert.equal(units[0].fechaInicio, originalStart);
  assert.deepEqual(movements.slice(0, 2).map(m => m.id), [1, 2]);
  assert.equal(movements[2].estado, 'CANCELADO');
  assert.equal(photos.length, 0, 'Previously started work does not require duplicate before evidence');
  const resumeAudit = audit.filter(e => e.accion === 'REANUDAR');
  assert.deepEqual(resumeAudit.map(e => e.movimientoId), [1, 2]);
  await moves.iniciar(2, start(), driver);
  assert.equal(audit.filter(e => e.accion === 'REANUDAR').length, 2, 'Repeated start remains idempotent');
  assert.deepEqual(await listIds(2, undefined, true, driver), [10], 'History remains available to the operator');

  // Direct service routes also reject the retired action; no gateway bypass can execute it.
  const routes = [];
  const router = {};
  for (const method of ['get', 'post', 'patch']) router[method] = (path, handler) => routes.push({ method, path, handler });
  const routeLoad = loader({ ...mocks, express: { Router: () => router } });
  routeLoad('ms_torreon/src/modules/cola/cola.routes.ts');
  const resumeRoute = routes.find(r => r.method === 'post' && r.path === '/:id/reanudar');
  await assert.rejects(() => invoke(resumeRoute.handler, { headers: { 'x-user-id': 42, 'x-user-rol': 'MAQUINISTA' }, params: { id: '9' } }), e => e.status === 403);
  const controller = routeLoad('ms_torreon/src/modules/movimientos/movimiento.controller.ts').MovimientoController;
  await assert.rejects(() => invoke(controller.reanudar, { headers: { 'x-user-id': 42, 'x-user-rol': 'MAQUINISTA' }, params: { id: '1' } }), e => e.status === 403);
  units[0].estado = 'DETENIDA';
  const listRoute = routes.find(r => r.method === 'get' && r.path === '/');
  const stoppedList = await invoke(listRoute.handler, { headers: { 'x-user-id': 42, 'x-user-rol': 'MAQUINISTA' }, query: { localidadId: '2' } });
  assert.equal(stoppedList.body.length, 0, 'Service list uses the authenticated operator role');
  const coordinationList = await invoke(listRoute.handler, { headers: { 'x-user-id': 10, 'x-user-rol': 'COORDINADOR' }, query: { localidadId: '2' } });
  assert.equal(coordinationList.body[0].id, 9, 'Service monitoring still includes incidents');

  units[0].estado = 'EN_PROCESO';
  await moves.finalizar(1, { finalizadoPorId: driver.id, fotos: [] }, driver);
  assert.equal(units[0].estado, 'CONCLUIDA', 'The whole group finishes without asking for photographs');
  assert.ok(movements.slice(0, 2).every(m => m.estado === 'CONCLUIDO' && m.fechaFin));
  assert.equal(photos.length, 0);
  units[1].estado = 'PENDIENTE'; movements[3].estado = 'SOLICITADO';
  await moves.iniciar(4, start(), driver);
  assert.equal(units[1].estado, 'EN_PROCESO', 'A new individual request starts without photographs');
  await moves.finalizar(4, { finalizadoPorId: driver.id, fotos: [] }, driver);
  assert.equal(units[1].estado, 'CONCLUIDA');
  assert.equal(photos.length, 0, 'Start and finish do not invent photo records');
  units[0].estado = 'PENDIENTE';
  movements.slice(0, 2).forEach(m => { m.estado = 'SOLICITADO'; m.fechaInicio = null; });
  await moves.iniciar(1, start(), driver);
  assert.equal(units[0].estado, 'EN_PROCESO', 'A fresh group also starts without photographs');
  assert.ok(movements.slice(0, 2).every(m => m.estado === 'EN_PROCESO'));
  await moves.finalizar(1, { finalizadoPorId: driver.id, fotos: [], fotosPorMovimiento: [{ movimientoId: 1, fotos: [{ url: 'https://example.invalid/optional.jpg' }] }] }, driver);
  assert.equal(photos.length, 1, 'Explicit optional evidence is still stored for its request');
  assert.equal(photos[0].movimientoId, 1);
  assert.equal(photos[0].tipo, 'FIN_MOVIMIENTO');
  console.log('PASS Torreón authorized start: whole-group removal, external readiness, all incident/resource blockers, resume priority without interruption, single start action, preserved history/evidence and denied manual resume');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
