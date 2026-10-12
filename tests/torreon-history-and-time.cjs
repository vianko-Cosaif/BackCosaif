const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');
const instant = seconds => new Date(seconds * 1000);

async function main() {
  const { calcularTiempoNatural, enriquecerTiemposNaturales } = loader()('ms_torreon/src/modules/cola/cola.time.ts');
  const movement = { id: 101, unidadId: 9, estado: 'EN_PROCESO', fechaInicio: instant(0), fechaFin: null, fechaPausa: null };
  const event = (id, accion, seconds, movimientoId = 101, more = {}) => ({ id, accion, fecha: instant(seconds), movimientoId, unidadId: 9, ...more });
  const events = [event(1, 'INICIAR', 0), event(2, 'REPORTAR_INCIDENTE', 10, 102, { incidenteId: 501 }),
    event(3, 'REPORTAR_INCIDENTE', 15, 101, { incidenteId: 502 }), event(4, 'REANUDAR', 30),
    event(5, 'REPORTAR_INCIDENTE', 40), event(6, 'REANUDAR', 50)];
  assert.deepEqual(JSON.parse(JSON.stringify(calcularTiempoNatural(movement, events, instant(70)))), {
    tiempoActivoSegundos: 40, tiempoTotalSegundos: 70, tiempoCalculadoEn: instant(70).toISOString(), tiempoActivoEstimado: false,
  });
  assert.equal(calcularTiempoNatural({ ...movement, estado: 'DETENIDO', fechaPausa: instant(65) }, events, instant(90)).tiempoActivoSegundos, 35);
  assert.equal(calcularTiempoNatural({ ...movement, estado: 'CONCLUIDO', fechaFin: instant(60) }, events, instant(900)).tiempoActivoSegundos, 30);
  assert.equal(calcularTiempoNatural({ ...movement, fechaInicio: null }, events, instant(90)).tiempoActivoSegundos, 0);
  assert.equal(calcularTiempoNatural(movement, [...events, event(7, 'REPORTAR_INCIDENTE', 60, 999, { unidadId: 8 })], instant(70)).tiempoActivoSegundos, 40);
  const waiting = { ...movement, estado: 'DETENIDO', fechaPausa: instant(10), incidentes: [{ id: 1, fechaInicio: instant(10), fechaResolucion: instant(20) }] };
  assert.equal(calcularTiempoNatural(waiting, [], instant(100)).tiempoActivoSegundos, 10, 'Resolved but not restarted remains paused');
  const legacy = calcularTiempoNatural({ ...waiting, estado: 'EN_PROCESO', fechaPausa: null }, [], instant(100));
  assert.equal(legacy.tiempoActivoSegundos, 90); assert.equal(legacy.tiempoActivoEstimado, true);
  assert.equal(calcularTiempoNatural(waiting, [event(1, 'REANUDAR', 50)], instant(100)).tiempoActivoSegundos, 10);
  let reads = 0;
  const clockDb = { bitacoraNaturalTorreon: { findMany: async () => { reads++; return events; } } };
  const enriched = await enriquecerTiemposNaturales(clockDb, [movement, { ...movement, id: 102 }], instant(70));
  assert.equal(reads, 1, 'A group/page uses one audit read');
  assert.equal(enriched[0].tiempoActivoSegundos, 40);
  assert.equal(enriched[1].tiempoActivoSegundos, 10, 'Another member cannot borrow the first member resume event');

  const client = rol => ({ id: 7, rol, empresa: { id: 3 }, localidad: { id: 2 } });
  let unit = { id: 9, localidadId: 2, movimientos: [{ id: 101, empresaId: 3, localidadId: 2 }, { id: 102, empresaId: 4, localidadId: 2 }] };
  const scope = loader({ 'src/lib/prisma': { prisma: {} }, 'src/lib/servicePrisma': { prismaTorreon: {
    unidadAtencionTorreon: { findMany: async () => [unit] },
  } } })('src/auth/torreonScope.ts').requireTorreonScope;
  for (const role of ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR']) {
    assert.equal((await invoke(scope, { user: client(role), method: 'GET', path: '/cola/9/historial' })).allowed, true);
    assert.equal((await invoke(scope, { user: client(role), method: 'PATCH', path: '/cola/9/asignar', body: { operadorId: 7 } })).statusCode, 403);
  }
  unit = { ...unit, movimientos: [{ id: 102, empresaId: 4, localidadId: 2 }] };
  assert.equal((await invoke(scope, { user: client('CLIENTE'), method: 'GET', path: '/cola/9/historial' })).statusCode, 403);
  unit = { ...unit, movimientos: [{ id: 101, empresaId: 3, localidadId: 8 }] };
  assert.equal((await invoke(scope, { user: client('CLIENTE'), method: 'GET', path: '/cola/9/historial' })).statusCode, 403);

  unit = { id: 9, localidadId: 2, movimientos: [{ id: 101, empresaId: 3 }, { id: 102, empresaId: 4 }] };
  const history = [
    { id: 1, unidadId: 1, movimientoId: 101, accion: 'SOLICITAR', datos: { empresaId: 3 } },
    { id: 2, unidadId: 2, movimientoId: 102, accion: 'SOLICITAR', datos: { secreto: 'otra empresa' } },
    { id: 3, unidadId: 2, movimientoId: null, accion: 'ASIGNAR', datos: { operadorId: 999 } },
    { id: 4, unidadId: 9, movimientoId: null, accion: 'FORMAR_CONJUNTO', datos: { unidadesOrigen: [1, 2], movimientoIds: [101, 102], secreto: 'otra empresa' } },
    { id: 5, unidadId: 9, movimientoId: 102, incidenteId: 502, usuarioId: 999, rol: 'MAQUINISTA', accion: 'REPORTAR_INCIDENTE', datos: { motivo: 'otra empresa', movimientoIds: [101, 102] } },
    { id: 6, unidadId: 9, movimientoId: 101, incidenteId: 501, accion: 'REPORTAR_INCIDENTE', datos: { motivo: 'propio', movimientoIds: [101, 102] } },
    { id: 7, unidadId: 9, movimientoId: null, usuarioId: 999, rol: 'CLIENTE', accion: 'HABILITAR_REANUDACION', datos: { fechaHabilitacion: instant(60).toISOString() } },
  ];
  const tx = { unidadAtencionTorreon: { findUnique: async () => unit }, bitacoraNaturalTorreon: {
    findFirst: async () => history[3], findMany: async () => history,
  } };
  const model = loader({ 'ms_torreon/src/db/prisma': { prismaTorreon: { $transaction: async fn => fn(tx) } } })('ms_torreon/src/modules/cola/cola.model.ts').ColaNaturalModel;
  const own = await model.historial(9, 3);
  assert.deepEqual(Array.from(own, row => row.id), [1, 4, 5, 6, 7]);
  assert.deepEqual(Array.from(own[1].datos.unidadesOrigen), [1]);
  assert.deepEqual(Array.from(own[1].datos.movimientoIds), [101]);
  assert.equal(own[2].movimientoId, null); assert.equal(own[2].incidenteId, null); assert.equal(own[2].usuarioId, 0);
  assert.equal(own[2].datos.efectoConjunto, true);
  assert.equal(JSON.stringify(own).includes('otra empresa'), false);
  assert.equal(JSON.stringify(own).includes('102'), false);
  assert.equal(JSON.stringify(own).includes('999'), false);
  assert.deepEqual(await model.historial(9), history, 'Operational roles preserve the full history');
  await assert.rejects(() => model.historial(9, 5), error => error.status === 403);
  const routes = [];
  loader({
    express: { Router: () => ({ get: (path, handler) => routes.push({ path, handler }), post() {}, patch() {} }) },
    'ms_torreon/src/db/prisma': { prismaTorreon: {} },
    'ms_torreon/src/modules/movimientos/movimiento.model': { MovimientoModel: {} },
    'ms_torreon/src/modules/cola/cola.model': { ColaNaturalModel: { historial: (id, company) => model.historial(id, company) } },
  })('ms_torreon/src/modules/cola/cola.routes.ts');
  const historyRoute = routes.find(route => route.path === '/:id/historial');
  await assert.rejects(() => invoke(historyRoute.handler, { headers: { 'x-user-rol': 'CLIENTE' }, params: { id: '9' } }), error => error.status === 403);
  const serviceOwn = await invoke(historyRoute.handler, { headers: { 'x-user-rol': 'CLIENTE' }, params: { id: '9' }, query: { empresaId: '3' } });
  assert.equal(JSON.stringify(serviceOwn.body).includes('otra empresa'), false);
  const serviceDriver = await invoke(historyRoute.handler, { headers: { 'x-user-rol': 'MAQUINISTA' }, params: { id: '9' } });
  assert.deepEqual(serviceDriver.body, history);

  console.log('PASS Torreón history and clocks: mixed-company access with redaction, full operator history, grouped/repeated pauses, stopped/finished/legacy clocks and one batched audit read');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
