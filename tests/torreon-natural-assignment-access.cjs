const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');

async function main() {
  const queries = [];
  const load = loader({
    'src/lib/prisma': { prisma: { usuario: { findMany: async query => {
      queries.push(query);
      return [{ id: 42, nombre: 'Maquinista de prueba' }];
    } } } },
  });
  const { listarMaquinistasNaturales } = load('src/Rutas/TorreonMs/naturalOperators.controller.ts');
  const { buildAuthorizationProfile, hasPermission, PERMISSIONS } = load('src/auth/accessPolicy.ts');
  const { requirePermission } = load('src/auth/authorize.ts');
  const user = (rol, localidadId = 2) => ({ id: 7, rol, localidad: { id: localidadId }, empresa: { id: 3 } });
  for (const rol of ['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR']) {
    const result = await invoke(listarMaquinistasNaturales, { user: user(rol), query: { localidadId: '2' } });
    assert.equal(result.statusCode, 200, `${rol} can load the assignment picker`);
    assert.equal(JSON.stringify(result.body), JSON.stringify([{ id: 42, nombre: 'Maquinista de prueba' }]));
    assert.equal(JSON.stringify(queries.at(-1)), JSON.stringify({
      where: { localidadId: 2, rol: 'MAQUINISTA', activo: true },
      select: { id: true, nombre: true },
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    }));
  }
  assert.equal((await invoke(listarMaquinistasNaturales, { user: user('SUPERVISOR') })).statusCode, 200);
  const callsBeforeDenials = queries.length;
  for (const rol of ['CLIENTE', 'MAQUINISTA', 'COMERCIAL', 'LAVADO', 'DESCONOCIDO']) {
    assert.equal((await invoke(listarMaquinistasNaturales, { user: user(rol), query: { localidadId: '2' } })).statusCode, 403);
  }
  for (const rol of ['COORDINADOR', 'SUPERVISOR']) {
    assert.equal((await invoke(listarMaquinistasNaturales, { user: user(rol, 1), query: { localidadId: '2' } })).statusCode, 403);
    assert.equal((await invoke(listarMaquinistasNaturales, { user: user(rol), query: { localidadId: '1' } })).statusCode, 403);
  }
  assert.equal((await invoke(listarMaquinistasNaturales, {})).statusCode, 401);
  for (const value of ['no-id', '0', '2.5']) {
    assert.equal((await invoke(listarMaquinistasNaturales, { user: user('SUPERVISOR'), query: { localidadId: value } })).statusCode, 400);
  }
  const supervisor = buildAuthorizationProfile(user('SUPERVISOR'));
  assert.equal(hasPermission(supervisor, PERMISSIONS.USERS_READ), false);
  assert.equal(hasPermission(supervisor, PERMISSIONS.USERS_MANAGE), false);
  assert.equal(supervisor.capabilities.canManageUsers, false);
  const create = await invoke(requirePermission(PERMISSIONS.USERS_MANAGE), {
    user: user('SUPERVISOR'), authorization: supervisor, method: 'POST', originalUrl: '/usuarios',
  });
  assert.equal(create.statusCode, 403, 'Supervisor cannot create users even with a direct request');
  assert.equal(queries.length, callsBeforeDenials, 'Denied requests never read user data');
  console.log('PASS Torreón assignment picker and supervisor user-creation restriction');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
