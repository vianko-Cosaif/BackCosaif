const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');
const load = loader();
const { canClientUseTorreonPath: allowed, scopeTorreonClientPath } = load('src/auth/torreonClientPolicy.ts');
const roles = ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR'];
const user = (rol) => ({ id: 7, nombre: 'Synthetic client', rol, empresa: { id: 3 }, localidad: { id: 2 } });
async function main() {
  for (const role of roles) {
    assert.equal(allowed(role, 'POST', '/movimientos'), true);
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
    const staleScope = loader({ 'src/lib/servicePrisma': { prismaTorreon: {} } })('src/auth/torreonScope.ts').requireTorreonScope;
    for (const path of ['/movimientos/701/edicion', '/rondas/movimientos/orden']) {
      assert.equal((await invoke(staleScope, { user: user(role), authorization: auth, method: 'PATCH', path })).statusCode, 403);
    }
  }
  let resource = { empresaId: 3, localidadId: 2 };
  const editScope = loader({ 'src/lib/servicePrisma': { prismaTorreon: { movimientoTorreonFerro: { findUnique: async () => resource } } } })('src/auth/torreonScope.ts').requireTorreonScope;
  for (const role of roles) {
    const req = { user: user(role), method: 'PATCH', path: '/movimientos/701/edicion', body: { locomotiveNumber: 1234 } };
    resource = { empresaId: 3, localidadId: 2 };
    assert.equal((await invoke(editScope, req)).allowed, true, role + ' puede editar su empresa');
    resource = { empresaId: 4, localidadId: 2 };
    assert.equal((await invoke(editScope, req)).statusCode, 403, role + ' no puede editar otra empresa');
  }
  const editableStates = load('src/models/Movimientos/movimiento.shared.ts').ESTADOS_EDITABLES;
  for (const state of ['EN_PROCESO', 'DETENIDO', 'CONCLUIDO', 'CANCELADO']) assert.equal(editableStates.has(state), false);

  const scope = loader({ 'src/lib/servicePrisma': { prismaTorreon: {} } })('src/auth/torreonScope.ts').requireTorreonScope;
  for (const role of roles) {
    const own = { empresaId: 3, localidadId: 2, creadoPorId: 999 };
    assert.equal((await invoke(scope, { user: user(role), method: 'POST', path: '/movimientos', body: own })).allowed, true);
    assert.equal(own.creadoPorId, 7);
    assert.equal((await invoke(scope, { user: user(role), method: 'POST', path: '/movimientos', body: { empresaId: 4, localidadId: 2 } })).statusCode, 403);
  }
  assert.equal((await invoke(scope, { user: user('CLIENTE'), method: 'POST', path: '/movimientos', body: { empresaId: 3, localidadId: 8 } })).statusCode, 403);

  let handler;
  const calls = [];
  const routeLoad = loader({
    express: { Router: () => ({ use() {}, all(_path, fn) { handler = fn; } }) },
    'src/jobs/durableJobs': { registerJob() {} },
    'src/auth/authenticateAccess': { authenticateAccess() {} },
    'src/auth/torreonScope': { requireTorreonScope() {} },
    'src/middlewares/idempotentMutation': { idempotentMutation() {} },
    'src/services/torreonMs/torreonMsClient': { proxyToTorreonMs: async (path, options) => { calls.push({path, ...options}); return { status: 201, data: { id: 701, empresaId: 3, localidadId: 2 } }; } },
    'src/services/NotificadorFCM': { NotificadorFCM: {} },
    'src/realtime/realtimeHub': { publishRealtimeEvent() {} },
    'src/lib/prisma': { prisma: { token: { findFirst: async () => ({ usuarioId: 5 }) }, usuario: { findMany: async () => [] } } },
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
  console.log('PASS Torreón clients: natural creation reaches service; company/locality and actor verified; domains separated; operational actions denied');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
