const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');
const clean = value => JSON.parse(JSON.stringify(value));

async function main() {
  const vias = [
    { id: 8, nombre: 'Vía Norte', localidadId: 2 },
    { id: 9, nombre: 'Vía Sur', localidadId: 2 },
    { id: 12, nombre: 'Sin secciones', localidadId: 2 },
    { id: 20, nombre: 'GDL', localidadId: 1 },
  ];
  const sections = [
    { id: 81, viaId: 8, numero: 1, nombre: 'Patio' },
    { id: 82, viaId: 9, numero: 2, nombre: null },
    { id: 83, viaId: 8, numero: 3, nombre: 'Sección 3' },
    { id: 91, viaId: 20, numero: 1, nombre: 'GDL' },
  ];
  const lookups = [];
  const catalog = {
    localidad: { findUnique: async ({ where }) => ({ id: where.id, nombre: where.id === 2 ? 'Torreón' : 'Guadalajara' }) },
    empresa: { findUnique: async () => ({ id: 3, nombre: 'Empresa' }) },
    via: { findUnique: async ({ where }) => {
      const via = vias.find(item => item.id === where.id);
      return via ? { ...via, secciones: sections.filter(section => section.viaId === via.id) } : null;
    } },
    seccionVia: {
      findUnique: async ({ where }) => sections.find(section => where.id ? section.id === where.id
        : section.viaId === where.viaId_numero.viaId && section.numero === where.viaId_numero.numero) ?? null,
      findMany: async ({ where }) => {
        lookups.push([...where.id.in]);
        return sections.filter(section => where.id.in.includes(section.id)).map(section => ({ ...section,
          via: { localidadId: vias.find(via => via.id === section.viaId).localidadId,
            localidad: { nombre: section.viaId === 20 ? 'Guadalajara' : 'Torreón' } } }));
      },
    },
    token: { findFirst: async () => ({ usuarioId: 7 }) },
    usuario: { findMany: async () => [] },
  };
  const movement = { id: 7, localidadId: 2, empresaId: 3, locomotiveNumber: 123,
    supervisorId: 11, coordinadorId: 12, viaOrigenId: 8, viaDestinoId: 9,
    seccionOrigenId: 81, seccionDestinoId: 82,
    seccionOrigenNombreSnapshot: 'Patio', seccionDestinoNombreSnapshot: 'Viejo nombre' };
  const mocks = {
    'src/lib/prisma': { prisma: catalog },
    'src/lib/servicePrisma': { prismaTorreon: { movimientoTorreonFerro: { findUnique: async () => movement } } },
  };
  const load = loader(mocks);
  const { prepareNaturalCreate, prepareNaturalEdit, enrichNaturalEdit } = load('src/services/torreonMs/prepareNaturalEdit.ts');
  const { enrichNaturalSections, naturalSectionLabel } = load('src/services/torreonMs/naturalSections.ts');
  const created = await prepareNaturalCreate({ ...movement, seccionOrigenNombreSnapshot: 'Spoof', seccionOrigenNumero: 81 });
  assert.equal(created.seccionOrigenId, 81);
  assert.equal(created.seccionOrigenNombreSnapshot, 'Sección 1 · Patio');
  assert.equal(created.seccionDestinoNombreSnapshot, 'Sección 2');
  assert.equal('seccionOrigenNumero' in created, false, 'Derived DTO fields never go to Prisma');
  assert.equal(naturalSectionLabel(sections[2]), 'Sección 3');
  assert.equal(naturalSectionLabel({ numero: 1, nombre: 'Sección 1 · Patio' }), 'Sección 1 · Patio');
  for (const [body, status] of [[{ seccionOrigenId: 82 }, 403], [{ seccionOrigenId: 999 }, 403],
    [{ seccionOrigenId: null, poloOrigen: 'CENTRO' }, 400], [{ viaOrigenId: 20, seccionOrigenId: 91 }, 403]]) {
    await assert.rejects(() => prepareNaturalCreate({ ...movement, ...body }), error => error.status === status);
  }
  for (const side of ['Origen', 'Destino']) {
    for (const polo of ['NORTE', 'SUR']) {
      const optional = await prepareNaturalCreate({ ...movement, [`polo${side}`]: polo, [`seccion${side}Id`]: undefined });
      assert.equal(optional[`seccion${side}NombreSnapshot`], undefined);
      const cleared = await prepareNaturalEdit(7, { [`polo${side}`]: polo, [`seccion${side}Id`]: null });
      assert.equal(cleared[`seccion${side}Id`], null);
      await assert.rejects(() => prepareNaturalEdit(7, { [`polo${side}`]: 'CENTRO', [`seccion${side}Id`]: null }), error => error.status === 400);
    }
    assert.equal((await prepareNaturalEdit(7, { [`polo${side}`]: 'CENTRO' }))[`seccion${side}Id`], movement[`seccion${side}Id`]);
  }
  const noteEdit = await prepareNaturalEdit(7, { instrucciones: 'Nueva indicación sin etiquetas' });
  assert.equal('seccionOrigenId' in noteEdit, false, 'Editing instructions keeps the existing origin');
  assert.equal('seccionDestinoId' in noteEdit, false, 'Editing instructions keeps the existing destination');
  const changed = await prepareNaturalEdit(7, { seccionOrigenId: 81, seccionOrigenNumero: 81 });
  assert.equal(changed.seccionOrigenNombreSnapshot, 'Sección 1 · Patio');
  assert.equal('seccionOrigenNumero' in changed, false);
  assert.equal((await prepareNaturalEdit(7, { viaDestinoId: 12 })).seccionDestinoId, null);
  assert.equal((await prepareNaturalEdit(7, { instrucciones: '[META ORIGEN:1] Cambiar' })).seccionOrigenId, 81);
  assert.equal((await prepareNaturalEdit(7, { poloOrigen: 'NORTE', seccionOrigenId: null, instrucciones: '[META ORIGEN:1] Cambiar' })).seccionOrigenId, null, 'Explicit optional section clearing wins over legacy metadata');
  await assert.rejects(() => prepareNaturalEdit(7, { seccionOrigenId: 82 }), error => error.status === 403);

  lookups.length = 0;
  const meta = { total: 126, page: 2, pageSize: 20, totalPages: 7 };
  const payload = { data: [{ ...movement, unidad: { id: 9, movimientos: [movement] } }], meta };
  const enriched = await enrichNaturalSections(payload);
  assert.equal(lookups.length, 1, 'A whole search page and groups use one catalogue lookup');
  assert.deepEqual(lookups[0].sort(), [81, 82]);
  assert.equal(enriched.data[0].seccionOrigenNumero, 1, 'Database key 81 is section number 1');
  assert.equal(enriched.data[0].seccionOrigenNombreSnapshot, 'Sección 1 · Patio', 'Legacy name-only snapshot gains its real number');
  assert.equal(enriched.data[0].unidad.movimientos[0].seccionDestinoNumero, 2);
  assert.deepEqual(clean(enriched.meta), meta);
  assert.equal(movement.seccionOrigenNombreSnapshot, 'Patio', 'Read enrichment does not mutate or persist legacy rows');
  for (const changedScope of [{ viaOrigenId: 9 }, { localidadId: 99 }, { seccionOrigenId: 999 },
    { localidadId: 1, viaOrigenId: 20, seccionOrigenId: 91 }]) {
    const missing = await enrichNaturalSections({ ...movement, ...changedScope, seccionOrigenNumero: 81 });
    assert.equal(missing.seccionOrigenNumero, null, 'Missing/mismatched scope never exposes a fabricated number');
    assert.equal(missing.seccionOrigenNombreSnapshot, 'Patio');
  }
  const editContext = await enrichNaturalEdit({ movimiento: movement, editableKeys: ['instrucciones'] });
  assert.match(editContext.movimiento.instrucciones, /\[META ORIGEN:1\]/);
  assert.doesNotMatch(editContext.movimiento.instrucciones, /ORIGEN:81/);

  let responseData;
  let handler;
  const forwarded = [];
  loader({ ...mocks,
    express: { Router: () => ({ use() {}, get() {}, all(_path, callback) { handler = callback; } }) },
    'src/jobs/durableJobs': { registerJob() {} },
    'src/auth/authenticateAccess': { authenticateAccess() {} },
    'src/auth/torreonScope': { requireTorreonScope() {} },
    'src/middlewares/idempotentMutation': { idempotentMutation() {} },
    'src/services/torreonMs/torreonMsClient': { proxyToTorreonMs: async (path, options) => {
      forwarded.push({ path, ...options }); return { status: 200, data: responseData };
    } },
    'src/services/NotificadorFCM': { NotificadorFCM: {} },
    'src/realtime/realtimeHub': { publishRealtimeEvent() {} },
    'src/services/torreonFcmRouting': { resolverAudienciaFcmTorreon() {} },
  })('src/Rutas/TorreonMs/TorreonMsRoutes.ts');
  const user = { id: 7, rol: 'CLIENTE', empresa: { id: 3 }, localidad: { id: 2 } };
  const group = { id: 9, localidadId: 2, modalidad: 'CONJUNTO', movimientos: [
    { ...movement, seccionDestinoId: null }, { ...movement, id: 8, empresaId: 4, seccionOrigenId: 83 },
  ] };
  for (const path of ['/cola?localidadId=2', '/cola/siguiente?localidadId=2', '/movimientos/7', '/movimientos/buscar', '/movimientos/7/edicion']) {
    responseData = path.startsWith('/cola') ? [{ ...group, movimientos: [group.movimientos[0]], totalIntegrantes: 2 }] : path.endsWith('/edicion') ? { movimiento: movement, editableKeys: ['instrucciones'] }
      : path.endsWith('/buscar') ? { data: [movement], meta } : { ...movement, unidad: group };
    lookups.length = 0;
    const result = await invoke(handler, { user, method: 'GET', baseUrl: '/torreon', originalUrl: '/torreon' + path });
    assert.equal(result.statusCode, 200, path + ': ' + JSON.stringify(result.body));
    assert.equal(lookups.length, 1, path + ' resolves sections once');
    assert.equal(lookups[0].includes(83), false, 'Foreign company members are redacted before the catalogue lookup');
    const row = path.startsWith('/cola') ? result.body[0].movimientos[0] : result.body.movimiento ?? result.body.data?.[0] ?? result.body;
    assert.equal(row.seccionOrigenNumero, 1, path);
    if (path.endsWith('/buscar')) assert.equal(result.body.meta.total, 126);
  }
  responseData = [movement];
  await invoke(handler, { user, method: 'POST', baseUrl: '/torreon', originalUrl: '/torreon/movimientos/lote',
    body: { movimientos: [{ ...movement, poloOrigen: 'NORTE', poloDestino: 'SUR', tipoMovimiento: 'MD_TRABAJANDO' }] } });
  assert.equal(forwarded.at(-1).body.movimientos[0].seccionOrigenNombreSnapshot, 'Sección 1 · Patio');
  responseData = { ...movement, vagones: [] };
  lookups.length = 0;
  const arrastre = await invoke(handler, { user: { ...user, rol: 'ADMINISTRADOR' }, method: 'GET', baseUrl: '/torreon', originalUrl: '/torreon/arrastres/7' });
  assert.equal(arrastre.statusCode, 200);
  assert.equal(lookups.length, 0, 'Arrastres retain their existing DTO and catalogue behavior');

  const search = loader({ ...mocks, 'src/services/torreonMs/torreonMsClient': {
    requestTorreonMs: async () => ({ data: { data: [movement], meta } }),
  } })('src/application/movements/torreonSearch.ts');
  const found = await search.buscarMovimientosTorreonNatural({ localidadId: 2, empresaId: 3, estados: [], fechaCampo: 'solicitud', pagination: { page: 2, pageSize: 20 } });
  assert.equal(found.data[0].viaOrigen.seccion.numero, 1);
  assert.equal(found.data[0].viaOrigen.seccion.nombre, 'Sección 1 · Patio');
  assert.equal(found.meta.total, 126);
  console.log('PASS Torreón sections: ID 81 is number 1, canonical write/batch/edit and legacy reads, scoped lookup, unchanged pagination, preserved instructions-only edits');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
