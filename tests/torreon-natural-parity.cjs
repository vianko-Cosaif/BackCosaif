const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');
async function main() {
  const catalog = { localidad: { findUnique: async ({ where }) => ({ id: where.id, nombre: where.id === 2 ? 'Torreón' : 'Guadalajara' }) }, empresa: { findUnique: async () => ({ id: 3, nombre: 'Empresa' }) },
    via: { findUnique: async ({ where }) => ({ id: where.id, localidadId: where.id === 99 ? 1 : 2, nombre: `Vía ${where.id}`, secciones: where.id === 8 ? [{ id: 10, viaId: 8, numero: 2, nombre: 'Sección 2' }] : [] }) },
    seccionVia: { findUnique: async ({ where }) => ({ id: where.id, viaId: where.id === 11 ? 9 : 8, numero: 2, nombre: 'Sección 2' }) } };
  const movement = { id: 7, localidadId: 2, empresaId: 3, viaOrigenId: 8, viaDestinoId: 9, seccionOrigenId: 10, seccionDestinoId: 11 };
  const helpers = loader({ 'src/lib/prisma': { prisma: catalog }, 'src/lib/servicePrisma': { prismaTorreon: { movimientoTorreonFerro: { findUnique: async () => movement } } } })('src/services/torreonMs/prepareNaturalEdit.ts');
  const input = { localidadId: 2, empresaId: 3, viaOrigenId: 8, viaDestinoId: 9, seccionOrigenId: 10, localidadNombreSnapshot: 'Spoof', viaOrigenNombreSnapshot: 'Spoof' };
  const create = await helpers.prepareNaturalCreate(input);
  assert.equal(create.viaOrigenNombreSnapshot, 'Vía 8'); assert.equal(create.seccionOrigenNombreSnapshot, 'Sección 2'); assert.equal(create.localidadNombreSnapshot, 'Torreón');
  await assert.rejects(() => helpers.prepareNaturalCreate({ ...input, localidadId: 1 }), e => e.status === 403);
  await assert.rejects(() => helpers.prepareNaturalCreate({ ...input, viaDestinoId: 99 }), e => e.status === 403);
  await assert.rejects(() => helpers.prepareNaturalCreate({ ...input, seccionOrigenId: undefined }), e => e.status === 400);
  await assert.rejects(() => helpers.prepareNaturalCreate({ ...input, seccionOrigenId: 11 }), e => e.status === 403);
  await assert.rejects(() => helpers.prepareNaturalEdit(7, { viaDestinoId: 99 }), e => e.status === 403);
  await assert.rejects(() => helpers.prepareNaturalEdit(7, { seccionDestinoId: 10 }), e => e.status === 403);
  assert.equal((await helpers.prepareNaturalEdit(7, { viaDestinoId: 12 })).seccionDestinoId, null);
  const schema = loader()('ms_torreon/src/modules/movimientos/movimiento.schemas.ts');
  const base = { creadoPorId: 7, empresaId: 3, localidadId: 2, locomotiveNumber: 120, viaOrigenId: 8, viaDestinoId: 9, tipoMovimiento: 'REMOLCADA', polo: 'NORTE' };
  assert.match(schema.validarCondicionesNaturales(base), /remolque/);
  assert.ok(schema.validarCondicionesNaturales({ ...base, locomotoraRemolque: 120, direccionEmpuje: 'JALAR' }));
  assert.equal(schema.validarCondicionesNaturales({ ...base, locomotoraRemolque: 800, direccionEmpuje: 'JALAR' }), null);
  assert.ok(schema.validarCondicionesNaturales({ ...base, tipoMovimiento: 'MD_TRABAJANDO', polo: 'Sin_Solicitar', posicionCabina: 'DENTRO' }), 'Cabin alone never replaces existing pole/chimney rules');
  for (const route of [{ viaOrigenId: undefined }, { viaDestinoId: undefined }, { tipoMovimiento: undefined }]) assert.throws(() => schema.createMovimientoSchema.parse({ ...base, ...route }));
  const user = role => ({ id: 7, rol: role, empresa: { id: 3 }, localidad: { id: 2 } });
  const scoped = loader({ 'src/lib/prisma': { prisma: { usuario: { findUnique: async () => ({ rol: 'MAQUINISTA', localidadId: 2, activo: true }) } } },
    'src/lib/servicePrisma': { prismaTorreon: { unidadAtencionTorreon: { findMany: async () => [{ id: 9, localidadId: 2, movimientos: [{ empresaId: 3, localidadId: 2 }] }] }, movimientoTorreonFerro: { findUnique: async () => ({ ...movement, clienteId: 7, creadoPorId: 7 }) } } } })('src/auth/torreonScope.ts').requireTorreonScope;
  const prioritize = role => invoke(scoped, { user: user(role), method: 'PATCH', path: '/cola/priorizar', body: { unidadIds: [9], enConjunto: false } });
  for (const role of ['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR']) assert.equal((await prioritize(role)).allowed, true);
  for (const role of ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR', 'MAQUINISTA']) assert.equal((await prioritize(role)).statusCode, 403);
  for (const role of ['CLIENTE', 'COORDINADOR', 'SUPERVISOR']) assert.equal((await invoke(scoped, { user: user(role), method: 'POST', path: '/cola/9/iniciar' })).statusCode, 403);
  assert.equal((await invoke(scoped, { user: user('MAQUINISTA'), method: 'POST', path: '/cola/9/reanudar' })).allowed, true);
  const assign = { user: user('SUPERVISOR'), method: 'PATCH', path: '/cola/9/asignar', body: { operadorId: 42 } };
  assert.equal((await invoke(scoped, assign)).allowed, true); assert.equal(assign.body.operadorId, 42);
  assert.equal((await invoke(scoped, { user: user('ADMINISTRADOR'), method: 'PATCH', path: '/rondas/intercambiar-movimientos' })).statusCode, 409);
  for (const role of ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR']) {
    const req = { user: user(role), method: 'POST', path: '/movimientos/lote', body: { movimientos: [{ empresaId: 3, localidadId: 2, creadoPorId: 999 }] } };
    assert.equal((await invoke(scoped, req)).allowed, true); assert.equal(req.body.movimientos[0].creadoPorId, 7);
    assert.equal((await invoke(scoped, { ...req, body: { movimientos: [{ empresaId: 4, localidadId: 2 }] } })).statusCode, 403);
  }
  console.log('PASS Torreón natural scope: catalogue and sections, canonical labels, original orientation, tow identity, dispatcher vs driver roles, batch ownership and retired round mutations');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
