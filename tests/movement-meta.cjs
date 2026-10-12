const assert = require('node:assert/strict');
const { loader, logger } = require('./support/load-ts.cjs');
const { normalizarMetaInstrucciones, parseMetaFromInstrucciones } = loader()('src/models/Movimientos/movimiento.meta.ts');

const operation = 'De la vía 21 a la vía 10. Meter retrocediendo hasta dentro.';
const legacy = `[META DESTINO:10|SECCION:1|LIBERAR] [META DESTINO:1|SECCION:3] ${operation}`;
const normalized = `[META DESTINO:10|SECCION:1|LIBERAR] ${operation}`;
assert.equal(normalizarMetaInstrucciones(legacy), normalized);
assert.equal(normalizarMetaInstrucciones(normalized), normalized);
assert.equal(normalizarMetaInstrucciones(operation, {}, legacy), normalized);
assert.equal(normalizarMetaInstrucciones(operation, { viaDestinoId: 12 }, legacy), `[META DESTINO:12|SECCION:1|LIBERAR] ${operation}`);
assert.equal(normalizarMetaInstrucciones(legacy, { viaDestinoId: 12, numeroSeccion: 2, liberarOrigen: false }), `[META DESTINO:12|SECCION:2] ${operation}`);
assert.equal(normalizarMetaInstrucciones(legacy, { viaDestinoId: null, numeroSeccion: null, liberarOrigen: false }), operation);
assert.equal(normalizarMetaInstrucciones(`[META DESTINO:12] ${operation}`, {}, legacy), `[META DESTINO:12|SECCION:1|LIBERAR] ${operation}`);
assert.equal(normalizarMetaInstrucciones(null), '');
assert.equal(normalizarMetaInstrucciones(''), '');
assert.equal(normalizarMetaInstrucciones('', {}, legacy), '[META DESTINO:10|SECCION:1|LIBERAR]');
assert.equal(normalizarMetaInstrucciones(`[TORNO_AGENDADO:123] ${legacy}`), `[META DESTINO:10|SECCION:1|LIBERAR] [TORNO_AGENDADO:123] ${operation}`);
const withOrigin = `[META DESTINO:10|SECCION:1|LIBERAR] [META ORIGEN:2] [META CUSTOM:keep] ${operation}`;
assert.equal(normalizarMetaInstrucciones(`${withOrigin} [META ORIGEN:2] [META ORIGEN:9]`), withOrigin);
assert.equal(normalizarMetaInstrucciones(operation, {}, withOrigin), withOrigin);
assert.equal(normalizarMetaInstrucciones(`[META DESTINO:10|SECCION:1|LIBERAR] [META ORIGEN:3] ${operation}`, {}, withOrigin), withOrigin.replace('ORIGEN:2', 'ORIGEN:3'));

function fixture() {
  let movement = {
    id: 71, localidadId: 1, empresaId: 3, creadoPorId: 9, locomotiveNumber: 91,
    viaOrigenId: 21, viaDestinoId: 10, estado: 'SOLICITADO', finalizado: false,
    prioridad: 'BAJA', instrucciones: legacy, updatedAt: new Date('2026-10-01T12:00:00Z'),
    posicionCabina: 'Sin_Solicitar', posicionChimenea: 'Sin_Solicitar', direccionEmpuje: 'Sin_Solicitar',
    ronda: { id: 81 },
  };
  const writes = [];
  const read = () => structuredClone(movement);
  const tx = {
    movimiento: {
      async findUnique() { return read(); },
      async update({ data }) { writes.push(structuredClone(data)); movement = { ...movement, ...data }; return read(); },
      async create({ data }) { writes.push(structuredClone(data)); movement = { ...movement, ...data }; return read(); },
    },
    via: { async findUnique({ where }) { return { id: where.id, localidadId: 1 }; } },
  };
  const prisma = { ...tx, async $transaction(run) { return run(tx); } };
  const { MovimientoWriteService } = loader({
    'src/lib/prisma': { prisma },
    'src/models/Movimientos/movimiento.logger': { movimientoError: logger },
    'src/services/NotificadorFCM': { NotificadorFCM: { async notificarNuevoMovimiento() {} } },
    'src/models/Movimientos/movimiento.notifications': { async notificarMovimientoEditado() {} },
    'src/realtime/realtimeHub': { publishMovimientoCreadoEvent() {} },
    'src/models/Movimientos/Ronda/RondaModel': { RondaModel: {
      async siguienteInteligente() {}, async generarRondaParaMovimiento() {},
    } },
  })('src/models/Movimientos/movimientoWriteService.ts');
  return { api: MovimientoWriteService, read, writes };
}

async function main() {
  {
    const f = fixture();
    await f.api.nuevoMovimiento({
      empresaId: 3, localidadId: 1, creadoPorId: 9, locomotiveNumber: 91,
      viaOrigenId: 21, viaDestinoId: 12, numeroSeccion: 2, liberarOrigen: false, instrucciones: legacy,
    });
    assert.equal(f.read().instrucciones, `[META DESTINO:12|SECCION:2] ${operation}`);
    assert.equal('numeroSeccion' in f.writes[0], false);
    assert.equal('liberarOrigen' in f.writes[0], false);
  }
  // Visible instructions can be submitted back without losing execution metadata.
  for (const method of ['guardarEdicion', 'editarMovimiento']) {
    const f = fixture();
    await f.api[method](71, { instrucciones: 'Esperar autorización.' }, 9);
    assert.equal(f.read().instrucciones, '[META DESTINO:10|SECCION:1|LIBERAR] Esperar autorización.');
    assert.equal(parseMetaFromInstrucciones(f.read().instrucciones).seccion, 1);
    await f.api[method](71, { viaDestinoId: 12 }, 9);
    assert.equal(f.read().instrucciones, '[META DESTINO:12|SECCION:1|LIBERAR] Esperar autorización.');
    await f.api[method](71, { instrucciones: '' }, 9);
    assert.equal(f.read().instrucciones, '[META DESTINO:12|SECCION:1|LIBERAR]');
    await f.api[method](71, { instrucciones: legacy, viaDestinoId: 14 }, 9);
    assert.equal(f.read().instrucciones, `[META DESTINO:14|SECCION:1|LIBERAR] ${operation}`);
    await f.api[method](71, { instrucciones: '[META DESTINO:1] Esperar autorización.' }, 9);
    assert.equal(f.read().instrucciones, '[META DESTINO:14|SECCION:1|LIBERAR] Esperar autorización.');
  }
  {
    const f = fixture();
    await f.api.editarMovimiento(71, { numeroSeccion: 2, liberarOrigen: false });
    assert.equal(f.read().instrucciones, `[META DESTINO:10|SECCION:2] ${operation}`);
    assert.equal('numeroSeccion' in f.writes[0], false);
    assert.equal('liberarOrigen' in f.writes[0], false);
  }
  console.log('PASS movement metadata: duplicate cleanup, first-tag precedence and preservation through create/edit writes');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
