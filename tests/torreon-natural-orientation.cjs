const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { loader } = require('./support/load-ts.cjs');
const clean = value => JSON.parse(JSON.stringify(value));

async function main() {
  const schemas = loader()('ms_torreon/src/modules/movimientos/movimiento.schemas.ts');
  const request = {
    localidadId: 2, empresaId: 3, creadoPorId: 7, locomotiveNumber: 121,
    viaOrigenId: 8, viaDestinoId: 9, seccionOrigenId: 81, seccionDestinoId: 93,
    tipoMovimiento: 'MD_TRABAJANDO', poloOrigen: 'NORTE', poloDestino: 'SUR',
  };
  for (const poloOrigen of ['NORTE', 'CENTRO', 'SUR']) for (const poloDestino of ['NORTE', 'CENTRO', 'SUR']) {
    const parsed = schemas.createMovimientoSchema.parse({ ...request, poloOrigen, poloDestino });
    assert.equal(schemas.validarCondicionesNaturales(parsed), null);
    assert.equal(parsed.posicionCabina, undefined);
    assert.equal(parsed.posicionChimenea, undefined);
    assert.equal(parsed.polo, undefined, 'Capturing separate poles never fabricates the legacy value');
    assert.equal(parsed.seccionOrigenId, 81);
    assert.equal(parsed.seccionDestinoId, 93);
  }
  for (const field of ['poloOrigen', 'poloDestino']) for (const invalid of [undefined, null, '', 'Sin_Solicitar', 'ESTE', 1]) {
    const input = { ...request, [field]: invalid, polo: 'NORTE', posicionChimenea: 'DENTRO', posicionCabina: 'AFUERA' };
    const parsed = schemas.createMovimientoSchema.safeParse(input);
    assert.equal(parsed.success, false, `New requests require ${field}, independent of the old fields`);
    assert.match(parsed.error.issues[0].message, /polo de (salida|llegada)/);
    assert.doesNotMatch(parsed.error.issues[0].message, /chimenea|cabina/);
    if (invalid !== undefined) assert.equal(schemas.editMovimientoSchema.safeParse({ [field]: invalid }).success, false);
  }
  assert.deepEqual(clean(schemas.editMovimientoSchema.parse({ poloDestino: 'NORTE' })), { poloDestino: 'NORTE' });
  assert.match(schemas.validarCondicionesNaturales({ ...request, tipoMovimiento: 'REMOLCADA' }), /remolque/);
  assert.equal(schemas.validarCondicionesNaturales({ ...request, tipoMovimiento: 'REMOLCADA', locomotoraRemolque: 800, direccionEmpuje: 'JALAR' }), null);

  const rows = [];
  const audit = [];
  const writes = [];
  const tx = {
    movimientoTorreonFerro: {
      create: async ({ data }) => {
        const row = { id: rows.length + 1, polo: null, poloOrigen: null, poloDestino: null,
          fechaInicio: null, fechaFin: null, updatedAt: new Date(1), ...data };
        rows.push(row); return row;
      },
      findUnique: async ({ where }) => rows.find(row => where.id ? row.id === where.id : row.clientRequestId === where.clientRequestId) ?? null,
      findMany: async ({ where }) => rows.filter(row => row.loteCapturaId === where.loteCapturaId),
      updateMany: async ({ where, data }) => {
        const row = rows.find(item => item.id === where.id && item.estado === where.estado);
        if (!row) return { count: 0 };
        writes.push(clean(data)); Object.assign(row, data); return { count: 1 };
      },
    },
    bitacoraNaturalTorreon: { findFirst: async ({ where }) => audit.find(event => event.movimientoId === where.movimientoId && event.accion === where.accion) ?? null },
  };
  const db = { ...tx, $transaction: async run => run(tx) };
  const model = loader({
    'ms_torreon/src/db/prisma': { prismaTorreon: db },
    'ms_torreon/src/utils/imagenesTorreon': { guardarFotoTorreon() { throw new Error('No photos are needed'); } },
    'ms_torreon/src/modules/incidentes/incidente.model': { IncidenteModel: {} },
    'ms_torreon/src/modules/cola/cola.model': {
      lockNaturalLocality: async () => {},
      ColaNaturalModel: { asegurarUnidad: async (_tx, movement) => ({ id: movement.id * 10, movimientos: [movement] }) },
      auditNatural: async (_tx, _unit, _actor, accion, datos, movimientoId) => { audit.push({ accion, datos, movimientoId }); },
    },
  })('ms_torreon/src/modules/movimientos/movimiento.model.ts').MovimientoModel;
  const input = schemas.createMovimientoSchema.parse({ ...request, poloOrigen: 'CENTRO', clientRequestId: 'poles-asymmetric-01' });
  const created = await model.crear(input);
  assert.equal(created.poloOrigen, 'CENTRO'); assert.equal(created.poloDestino, 'SUR');
  assert.equal(created.polo, null);
  assert.equal((await model.crear(input)).id, created.id, 'An identical retry reuses its request');
  for (const changed of [{ poloOrigen: 'SUR' }, { poloDestino: 'NORTE' }]) {
    await assert.rejects(() => model.crear({ ...input, ...changed }), error => error.status === 409,
      'Changing either endpoint with the same key must conflict');
  }
  const edited = await model.editar(created.id, schemas.editMovimientoSchema.parse({ instrucciones: 'Sólo cambiar indicaciones' }));
  assert.equal(edited.poloOrigen, 'CENTRO'); assert.equal(edited.poloDestino, 'SUR');
  assert.equal(edited.seccionOrigenId, 81); assert.equal(edited.seccionDestinoId, 93);
  assert.deepEqual(writes.at(-1), { instrucciones: 'Sólo cambiar indicaciones' });
  await model.editar(created.id, schemas.editMovimientoSchema.parse({ poloDestino: 'CENTRO' }));
  assert.equal(rows[0].poloOrigen, 'CENTRO'); assert.equal(rows[0].poloDestino, 'CENTRO');
  assert.equal(rows[0].seccionDestinoId, 93);
  const context = await model.obtenerEdicion(created.id);
  assert.equal(context.editableKeys.includes('poloOrigen'), true);
  assert.equal(context.editableKeys.includes('poloDestino'), true);
  for (const field of ['polo', 'posicionCabina', 'posicionChimenea']) assert.equal(context.editableKeys.includes(field), false);

  rows.push({ ...request, id: 100, estado: 'SOLICITADO', polo: 'SUR', poloOrigen: null, poloDestino: null,
    instrucciones: 'Polo norte antes de entrar', updatedAt: new Date(1), fechaInicio: null });
  const legacy = await model.editar(100, schemas.editMovimientoSchema.parse({ instrucciones: 'Polo norte mencionado sólo en texto' }));
  assert.equal(legacy.polo, 'SUR');
  assert.equal(legacy.poloOrigen, null); assert.equal(legacy.poloDestino, null, 'No inference from old polo or instructions');
  const partial = await model.editar(100, schemas.editMovimientoSchema.parse({ poloDestino: 'NORTE' }));
  assert.equal(partial.poloOrigen, null, 'Updating a legacy arrival does not invent its departure');
  assert.equal(partial.poloDestino, 'NORTE'); assert.equal(partial.polo, 'SUR');
  await assert.rejects(() => model.crearTx(tx, { ...input, poloOrigen: undefined }), error => error.status === 400,
    'The model also enforces both poles if called without the controller');
  const batch = schemas.createLoteSchema.parse({ clientRequestId: 'poles-batch-0001', movimientos: [request, { ...request, locomotiveNumber: 122, poloOrigen: 'CENTRO', poloDestino: 'NORTE' }] });
  const group = await model.crearLote(batch);
  assert.deepEqual(clean(group.map(row => [row.poloOrigen, row.poloDestino])), [['NORTE', 'SUR'], ['CENTRO', 'NORTE']]);
  assert.deepEqual(clean((await model.crearLote(batch)).map(row => row.id)), clean(group.map(row => row.id)));
  await assert.rejects(() => model.crearLote({ ...batch, movimientos: [{ ...batch.movimientos[0], poloDestino: 'NORTE' }, batch.movimientos[1]] }), error => error.status === 409);

  const sql = fs.readFileSync('migrations/torreon-polos-20261012/torreon.sql', 'utf8').replace(/--[^\n]*/g, '');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS polo_origen TEXT/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS polo_destino TEXT/);
  assert.doesNotMatch(sql, /\bUPDATE\b|\bDEFAULT\b|\bDROP\b|\bDELETE\b/i, 'Additive migration never infers or removes historical data');
  const preview = spawnSync(process.execPath, ['scripts/security-migrate.cjs', '--version=torreon-polos-20261012', '--target=torreon'], { encoding: 'utf8' });
  assert.equal(preview.status, 0); assert.match(preview.stdout, /sha256/);
  const wrongTarget = spawnSync(process.execPath, ['scripts/security-migrate.cjs', '--version=torreon-polos-20261012', '--target=main'], { encoding: 'utf8' });
  assert.notEqual(wrongTarget.status, 0, 'The migration runner rejects the Guadalajara/main target before connecting');
  const centroPreview = spawnSync(process.execPath, ['scripts/security-migrate.cjs', '--version=torreon-polo-centro-20261013', '--target=torreon'], { encoding: 'utf8' });
  assert.equal(centroPreview.status, 0); assert.match(centroPreview.stdout, /sha256/);
  const centroWrongTarget = spawnSync(process.execPath, ['scripts/security-migrate.cjs', '--version=torreon-polo-centro-20261013', '--target=main'], { encoding: 'utf8' });
  assert.notEqual(centroWrongTarget.status, 0, 'Centro is restricted to Torreón');
  console.log('PASS Torreón poles: independent origin/destination, asymmetry persisted, partial/legacy edits, section preservation, batch/retry fingerprints and additive Torreón-only migration preview');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
