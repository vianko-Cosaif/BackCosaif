const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { loader, logger } = require('./support/load-ts.cjs');

const admin = process.env.SECURITY_TEST_DB_ADMIN_URL;
if (!admin || new URL(admin).hostname !== '127.0.0.1' || new URL(admin).port !== '55439') {
  throw new Error('Requires isolated SECURITY_TEST_DB_ADMIN_URL on 127.0.0.1:55439');
}
const url = new URL(admin);
url.pathname = '/security_main';
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const { RondaModel } = loader({
  'src/lib/prisma': { prisma: db },
  'src/models/Movimientos/movimiento.logger': { movimientoError: logger },
  'src/utils/logger': { logger },
  'src/services/fcmCompat': { sendMulticastCompat: async () => { throw new Error('Unexpected notification in round cleanup'); } },
})('src/models/Movimientos/Ronda/RondaModel.ts');

async function main() {
  const tag = `ROUND-TERMINAL-${crypto.randomUUID()}`;
  const company = await db.empresa.create({ data: { nombre: tag } });
  const locality = await db.localidad.create({ data: { nombre: `${tag}-GDL`, estado: 'ACTIVA' } });
  const other = await db.localidad.create({ data: { nombre: `${tag}-OTHER`, estado: 'ACTIVA' } });
  const actor = await db.usuario.create({ data: {
    nombre: tag, email: `${tag}@example.invalid`, contrasena: 'SYNTHETIC',
    rol: 'ADMINISTRADOR', empresaId: company.id, localidadId: locality.id,
  } });
  const finishedAt = new Date('2026-01-01T09:00:00Z');
  async function create(index, estado, finalizado, localityId = locality.id) {
    const movement = await db.movimiento.create({ data: {
      empresaId: company.id, localidadId: localityId, creadoPorId: actor.id,
      locomotiveNumber: 2000 + index, prioridad: 'ALTA', estado, finalizado,
      incidenteGlobal: false, fechaFin: finalizado || ['CANCELADO', 'CONCLUIDO'].includes(estado) ? finishedAt : null,
      createdAt: new Date(Date.UTC(2026, 0, 1, 8, index)),
      fechaSolicitud: new Date(Date.UTC(2026, 0, 1, 8, index)),
      instrucciones: `Historical reason ${index}`,
    } });
    await db.ronda.create({ data: {
      movimientoId: movement.id, empresaId: company.id, localidadId: localityId,
      rondaNumero: 1, orden: index, concluido: false,
    } });
    return movement;
  }
  const canceled = await create(1, 'CANCELADO', false);
  const concluded = await create(2, 'CONCLUIDO', false);
  const stoppedFinished = await create(3, 'DETENIDO', true);
  const requested = await create(4, 'SOLICITADO', false);
  const stoppedActive = await create(5, 'DETENIDO', false);
  const legacyPending = await create(6, 'SOLICITADO', null);
  const otherCanceled = await create(1, 'CANCELADO', false, other.id);
  const originals = [canceled, concluded, stoppedFinished, requested, stoppedActive, legacyPending];
  const pendingIds = [requested.id, stoppedActive.id, legacyPending.id];

  // Terminal slots sharing a still-active round must disappear immediately.
  const pending = await RondaModel.obtenerRondasPorLocalidadConEstado(locality.id, false);
  assert.deepEqual(pending.map(row => row.movimiento.id), pendingIds);
  assert.deepEqual(pending.map(row => row.orden), [1, 2, 3]);
  assert.equal(pending[0].movimiento.finalizado, false);
  assert.equal(pending[2].movimiento.finalizado, null);
  assert.equal(await db.ronda.count({ where: {
    localidadId: locality.id, concluido: false,
    movimientoId: { in: [canceled.id, concluded.id, stoppedFinished.id] },
  } }), 0);
  assert.equal((await db.ronda.findUnique({ where: { movimientoId: otherCanceled.id } })).concluido, false);
  for (const original of originals) {
    const saved = await db.movimiento.findUnique({ where: { id: original.id } });
    assert.equal(saved.estado, original.estado);
    assert.equal(saved.instrucciones, original.instrucciones);
    assert.equal(saved.fechaFin?.getTime(), original.fechaFin?.getTime());
  }
  assert.equal((await RondaModel.obtenerSiguienteEnRonda(locality.id)).movimientoId, requested.id);
  assert.equal((await RondaModel.siguienteParaMaquinista(locality.id)).movimientoId, requested.id);
  assert.equal((await RondaModel.siguienteInteligente(locality.id)).movimientoId, requested.id);

  // With no remaining work, maintenance must empty the round table even when order was valid.
  await db.movimiento.update({ where: { id: requested.id }, data: { estado: 'CANCELADO', finalizado: true, fechaFin: finishedAt } });
  await db.movimiento.update({ where: { id: stoppedActive.id }, data: { finalizado: true, fechaFin: finishedAt } });
  await RondaModel.asegurarOrdenRondasLocalidad(locality.id);
  const remaining = await RondaModel.obtenerRondasPorLocalidadConEstado(locality.id, false);
  assert.deepEqual(remaining.map(row => row.movimiento.id), [legacyPending.id]);
  assert.equal(remaining[0].orden, 1);
  await db.movimiento.update({ where: { id: legacyPending.id }, data: { estado: 'CONCLUIDO', finalizado: true, fechaFin: finishedAt } });
  await RondaModel.asegurarOrdenRondasLocalidad(locality.id);
  assert.equal(await db.ronda.count({ where: { localidadId: locality.id } }), 0);
  assert.equal(await db.movimiento.count({ where: { localidadId: locality.id } }), originals.length);
  assert.equal((await db.movimiento.findUnique({ where: { id: requested.id } })).estado, 'CANCELADO');
  assert.equal((await db.movimiento.findUnique({ where: { id: stoppedActive.id } })).estado, 'DETENIDO');

  await Promise.all([
    RondaModel.recomponerRondasLocalidad(locality.id),
    RondaModel.recomponerRondasLocalidad(locality.id),
  ]);
  assert.deepEqual(await RondaModel.obtenerRondasPorLocalidadConEstado(locality.id, false), []);
  assert.equal(await RondaModel.obtenerSiguienteEnRonda(locality.id), null);
  assert.equal((await RondaModel.siguienteParaMaquinista(locality.id)).vacio, true);
  assert.equal((await RondaModel.siguienteInteligente(locality.id)).vacio, true);

  // Closing a terminal slot must not erase nonterminal waiting or scheduled requests.
  const waitingLocality = await db.localidad.create({ data: { nombre: `${tag}-WAITING`, estado: 'ACTIVA' } });
  await create(1, 'CANCELADO', true, waitingLocality.id);
  const waiting = await create(2, 'ESPERA', false, waitingLocality.id);
  const modified = await create(3, 'MODIFICADO', false, waitingLocality.id);
  const scheduled = await create(4, 'AGENDADO', false, waitingLocality.id);
  const waitingRounds = await RondaModel.obtenerRondasPorLocalidadConEstado(waitingLocality.id, false);
  assert.deepEqual(waitingRounds.map(row => row.movimiento.id), [waiting.id, modified.id, scheduled.id]);
  assert.deepEqual(waitingRounds.map(row => row.orden), [1, 2, 3]);
  console.log('PASS PostgreSQL terminal rounds: mixed round closure, pending FIFO, active stopped/null flags, maintenance drain, preserved history, locality isolation, concurrent/idempotent cleanup');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
