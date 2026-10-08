const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');
const load = loader();
const { canClientUseTorreonPath: allowed, scopeTorreonClientPath } = load('src/auth/torreonClientPolicy.ts');
const roles = ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR'];
const user = (rol) => ({ id: 7, nombre: 'Synthetic client', rol, empresa: { id: 3 }, localidad: { id: 2 } });
async function main() {
  for (const role of roles) {
    assert.equal(allowed(role, 'POST', '/movimientos'), true);
    assert.equal(allowed(role, 'POST', '/movimientos/lote'), true);
    assert.equal(allowed(role, 'GET', '/cola?localidadId=2'), true);
    assert.equal(allowed(role, 'PATCH', '/cola/priorizar'), false);
    assert.equal(allowed(role, 'PATCH', '/movimientos/701'), true);
    assert.equal(allowed(role, 'PATCH', '/movimientos/701/iniciar'), false);
    assert.equal(allowed(role, 'GET', '/movimientos?localidadId=2'), true);
    for (const [method, path] of [['GET','/arrastres'],['POST','/arrastres'],['PATCH','/arrastres/1/vagones/2'],['POST','/movimientos/1/iniciar'],['PATCH','/movimientos/1/finalizar'],['GET','/incidentes?tipo=ARRASTRE']]) assert.equal(allowed(role, method, path), false);
    assert.equal(scopeTorreonClientPath(role, '/incidentes?empresaId=3'), '/incidentes?empresaId=3&tipo=NATURAL');
  }
  assert.equal(allowed('ARRASTRE_TORREON', 'POST', '/arrastres'), true);
  assert.equal(allowed('ARRASTRE_TORREON', 'GET', '/rondas'), false);
  assert.equal(allowed('ARRASTRE_TORREON', 'POST', '/movimientos'), false);
  for (const path of ['/arrastres/1', '/arrastres/1/cancelar', '/arrastres/1/vagones/2', '/arrastres/1/incidentes/3/resolver']) assert.equal(allowed('ARRASTRE_TORREON', 'PATCH', path), true);
  for (const path of ['/arrastres/1/vagones/2/iniciar', '/arrastres/1/vagones/2/finalizar']) assert.equal(allowed('ARRASTRE_TORREON', 'PATCH', path), false);

  const { buildAuthorizationProfile, hasPermission, PERMISSIONS } = load('src/auth/accessPolicy.ts');
  for (const role of ['SUPERVISOR', 'COORDINADOR']) {
    const auth = buildAuthorizationProfile(user(role));
    assert.equal(hasPermission(auth, PERMISSIONS.MOVEMENTS_EDIT), false);
    assert.equal(hasPermission(auth, PERMISSIONS.ROUNDS_EDIT), false);
    assert.equal(hasPermission(auth, PERMISSIONS.MOVEMENTS_OPERATE), true);
    auth.permissions.push(PERMISSIONS.MOVEMENTS_EDIT, PERMISSIONS.ROUNDS_EDIT);
    assert.equal(hasPermission(auth, PERMISSIONS.MOVEMENTS_EDIT), false, 'Las sesiones antiguas tampoco habilitan edición');
    const staleScope = loader({ 'src/lib/prisma': { prisma: {} }, 'src/lib/servicePrisma': { prismaTorreon: {} } })('src/auth/torreonScope.ts').requireTorreonScope;
    for (const path of ['/movimientos/701/edicion', '/rondas/movimientos/orden']) {
      assert.equal((await invoke(staleScope, { user: user(role), authorization: auth, method: 'PATCH', path })).statusCode, 403);
    }
  }
  let resource = { empresaId: 3, localidadId: 2 };
  const editScope = loader({ 'src/lib/prisma': { prisma: {} }, 'src/lib/servicePrisma': { prismaTorreon: { movimientoTorreonFerro: { findUnique: async () => resource } } } })('src/auth/torreonScope.ts').requireTorreonScope;
  for (const role of roles) {
    const req = { user: user(role), method: 'PATCH', path: '/movimientos/701/edicion', body: { locomotiveNumber: 1234 } };
    resource = { empresaId: 3, localidadId: 2 };
    assert.equal((await invoke(editScope, req)).allowed, true, role + ' puede editar su empresa');
    resource = { empresaId: 4, localidadId: 2 };
    assert.equal((await invoke(editScope, req)).statusCode, 403, role + ' no puede editar otra empresa');
  }
  const editableStates = load('src/models/Movimientos/movimiento.shared.ts').ESTADOS_EDITABLES;
  for (const state of ['EN_PROCESO', 'DETENIDO', 'CONCLUIDO', 'CANCELADO']) assert.equal(editableStates.has(state), false);

  const scope = loader({ 'src/lib/prisma': { prisma: {} }, 'src/lib/servicePrisma': { prismaTorreon: {} } })('src/auth/torreonScope.ts').requireTorreonScope;
  for (const role of roles) {
    const own = { empresaId: 3, localidadId: 2, creadoPorId: 999 };
    assert.equal((await invoke(scope, { user: user(role), method: 'POST', path: '/movimientos', body: own })).allowed, true);
    assert.equal(own.creadoPorId, 7);
    assert.equal((await invoke(scope, { user: user(role), method: 'POST', path: '/movimientos', body: { empresaId: 4, localidadId: 2 } })).statusCode, 403);
  }
  assert.equal((await invoke(scope, { user: user('CLIENTE'), method: 'POST', path: '/movimientos', body: { empresaId: 3, localidadId: 8 } })).statusCode, 403);

  let handler;
  const calls = [];
  const userLookups = [];
  const names = [
    { id: 7, nombre: 'Solicitante Torreón', rol: 'CLIENTE' },
    { id: 11, nombre: 'Coordinadora Torreón', rol: 'COORDINADOR' },
    { id: 12, nombre: 'Supervisor Torreón', rol: 'SUPERVISOR' },
    { id: 13, nombre: 'Maquinista Torreón', rol: 'MAQUINISTA' },
  ];
  let responseData = { id: 701, empresaId: 3, localidadId: 2 };
  const routeLoad = loader({
    express: { Router: () => ({ use() {}, all(_path, fn) { handler = fn; } }) },
    'src/jobs/durableJobs': { registerJob() {} },
    'src/auth/authenticateAccess': { authenticateAccess() {} },
    'src/auth/torreonScope': { requireTorreonScope() {} },
    'src/middlewares/idempotentMutation': { idempotentMutation() {} },
    'src/services/torreonMs/torreonMsClient': { proxyToTorreonMs: async (path, options) => { calls.push({path, ...options}); return { status: 201, data: responseData }; } },
    'src/services/NotificadorFCM': { NotificadorFCM: {} },
    'src/realtime/realtimeHub': { publishRealtimeEvent() {} },
    'src/lib/prisma': { prisma: { token: { findFirst: async () => ({ usuarioId: 5 }) }, usuario: { findMany: async ({ where }) => { userLookups.push(where.id.in); return names.filter(person => where.id.in.includes(person.id)); } } } },
    'src/services/torreonMs/prepareNaturalEdit': { prepareNaturalCreate: async body => body, prepareNaturalEdit: async (_id, body) => body, enrichNaturalEdit: async body => body },
    'src/services/torreonFcmRouting': { resolverAudienciaFcmTorreon() {} },
    'src/lib/servicePrisma': { prismaTorreon: {} },
  });
  routeLoad('src/Rutas/TorreonMs/TorreonMsRoutes.ts');
  const create = await invoke(handler, { user: user('CLIENTE'), method: 'POST', baseUrl: '/torreon', originalUrl: '/torreon/movimientos', body: { empresaId: 3, localidadId: 2, clienteId: 999 } });
  assert.equal(create.statusCode, 201);
  assert.equal(calls[0].path, '/movimientos');
  assert.equal(calls[0].body.clienteId, 7);
  assert.equal(calls[0].body.creadoPorId, 7);
  for (const [role, path] of [['CLIENTE','/arrastres'],['ARRASTRE_TORREON','/movimientos']]) {
    assert.equal((await invoke(handler, { user: user(role), method: 'POST', baseUrl: '/torreon', originalUrl: '/torreon' + path, body: {} })).statusCode, 403);
  }
  assert.equal(calls.length, 1);
  const group = { id: 20, localidadId: 2, modalidad: 'CONJUNTO', movimientos: [{ id: 701, empresaId: 3, localidadId: 2 }, { id: 702, empresaId: 4, localidadId: 2 }], incidentes: [{ id: 91, movimientoId: 701 }, { id: 92, movimientoId: 702 }] };
  responseData = { id: 701, empresaId: 3, localidadId: 2, unidad: group };
  const detail = await invoke(handler, { user: user('CLIENTE'), method: 'GET', baseUrl: '/torreon', originalUrl: '/torreon/movimientos/701', body: {} });
  assert.equal(detail.body.unidad.totalIntegrantes, 2);
  assert.deepEqual(Array.from(detail.body.unidad.movimientos, m => m.id), [701]);
  assert.deepEqual(Array.from(detail.body.unidad.incidentes, i => i.id), [91]);

  // Names are resolved after company redaction, from stored IDs rather than the viewing user.
  const natural = { id: 701, empresaId: 3, localidadId: 2, locomotiveNumber: 120,
    creadoPorId: 7, coordinadorId: 11, supervisorId: 12, operadorId: 13 };
  responseData = [{ id: 20, localidadId: 2, modalidad: 'CONJUNTO', operadorId: 13, movimientos: [natural] }];
  const queue = await invoke(handler, { user: user('CLIENTE'), method: 'GET', baseUrl: '/torreon', originalUrl: '/torreon/cola?localidadId=2' });
  const member = queue.body[0].movimientos[0];
  assert.equal(member.creadoPor.nombre, 'Solicitante Torreón');
  assert.equal(member.coordinador.nombre, 'Coordinadora Torreón');
  assert.equal(member.supervisor.nombre, 'Supervisor Torreón');
  assert.equal(member.operador.nombre, 'Maquinista Torreón');
  assert.equal(queue.body[0].operador.nombre, 'Maquinista Torreón');
  assert.equal(queue.body[0].movimientos.length, 1);
  responseData = { ...natural, unidad: { id: 20, localidadId: 2, modalidad: 'CONJUNTO', movimientos: [natural,
    { ...natural, id: 702, empresaId: 4, creadoPorId: 99 }] } };
  const namedDetail = await invoke(handler, { user: user('CLIENTE'), method: 'GET', baseUrl: '/torreon', originalUrl: '/torreon/movimientos/701' });
  assert.equal(namedDetail.body.unidad.movimientos.length, 1);
  assert.equal(userLookups.at(-1).includes(99), false, 'No name lookup for another company creator');
  responseData = { ...natural, creadoPorId: 88 };
  const unknownCreator = await invoke(handler, { user: user('CLIENTE'), method: 'GET', baseUrl: '/torreon', originalUrl: '/torreon/movimientos/701' });
  assert.equal(unknownCreator.body.creadoPor.nombre, 'Usuario #88', 'An unavailable creator is not replaced by a coordinator or viewer');
  console.log('PASS Torreón clients: natural creation reaches service; company/locality and actor verified; domains separated; operational actions denied');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
