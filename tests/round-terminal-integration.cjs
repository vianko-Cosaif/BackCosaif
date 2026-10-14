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
  const closedSlot = await create(7, 'SOLICITADO', false);
  await db.ronda.update({ where: { movimientoId: closedSlot.id }, data: { concluido: true } });
  const otherCanceled = await create(1, 'CANCELADO', false, other.id);
  const originals = [canceled, concluded, stoppedFinished, requested, stoppedActive, legacyPending, closedSlot];
  const pendingIds = [requested.id, stoppedActive.id, legacyPending.id];

  // Terminal slots sharing a still-active round must disappear immediately.
  const pending = await RondaModel.obtenerRondasPorLocalidadConEstado(locality.id, false);
  assert.deepEqual(pending.map(row => row.movimiento.id), pendingIds);
  assert.deepEqual(pending.map(row => row.orden), [1, 2, 3]);
  assert.equal(pending[0].movimiento.finalizado, false);
  assert.equal(pending[2].movimiento.finalizado, null);
  assert.equal(await db.ronda.count({ where: {
    localidadId: locality.id,
    movimientoId: { in: [canceled.id, concluded.id, stoppedFinished.id, closedSlot.id] },
  } }), 0);
  assert.equal(await db.ronda.count({ where: { localidadId: locality.id } }), pendingIds.length);
  assert.deepEqual((await RondaModel.obtenerRondasPorLocalidad(locality.id)).map(row => row.movimientoId), pendingIds);
  assert.deepEqual(await RondaModel.obtenerRondasPorLocalidadConEstado(locality.id, true), []);
  assert.equal((await db.ronda.findUnique({ where: { movimientoId: otherCanceled.id } })).concluido, false);
  for (const original of originals) {
    const saved = await db.movimiento.findUnique({ where: { id: original.id } });
    assert.equal(saved.estado, original.estado);
    assert.equal(saved.finalizado, original.finalizado);
    assert.equal(saved.instrucciones, original.instrucciones);
    assert.equal(saved.fechaFin?.getTime(), original.fechaFin?.getTime());
  }
  assert.equal((await RondaModel.obtenerSiguienteEnRonda(locality.id)).movimientoId, requested.id);
  assert.equal((await RondaModel.siguienteParaMaquinista(locality.id)).movimientoId, requested.id);
  assert.equal((await RondaModel.siguienteInteligente(locality.id)).movimientoId, requested.id);
  // An old insert/checkpoint retry cannot recreate a historical movement's slot.
  for (const movement of [canceled, concluded, stoppedFinished]) {
    await RondaModel.insertarRondaSolvente({
      movimientoId: movement.id, empresaId: company.id,
      localidadId: locality.id, prioridad: movement.prioridad,
    });
    assert.equal(await db.ronda.findUnique({ where: { movimientoId: movement.id } }), null);
  }

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

  // Already-concluded leftovers must be removed even when all active positions are valid.
  const staleSlot = await create(5, 'DETENIDO', true, waitingLocality.id);
  await db.ronda.update({ where: { movimientoId: staleSlot.id }, data: { concluido: true } });
  await RondaModel.asegurarOrdenRondasLocalidad(waitingLocality.id);
  assert.equal(await db.ronda.findUnique({ where: { movimientoId: staleSlot.id } }), null);
  assert.deepEqual((await db.ronda.findMany({ where: { localidadId: waitingLocality.id }, orderBy: { orden: 'asc' } })).map(row => row.movimientoId), [waiting.id, modified.id, scheduled.id]);

  // The periodic scan must include localities having ONLY concluded rows.
  const concludedLocality = await db.localidad.create({ data: { nombre: `${tag}-CONCLUDED`, estado: 'ACTIVA' } });
  const onlyConcluded = await create(1, 'DETENIDO', true, concludedLocality.id);
  await db.ronda.update({ where: { movimientoId: onlyConcluded.id }, data: { concluido: true } });
  const queued = [];
  let scannedCount = 0;
  let maintain;
  let resolveScan;
  let rejectScan;
  const scanned = new Promise((resolve, reject) => { resolveScan = resolve; rejectScan = reject; });
  const { startRoundMaintenance } = loader({
    'src/lib/prisma': { prisma: {
      localidad: { findMany: async args => {
        const localities = await db.localidad.findMany(args);
        scannedCount = localities.length;
        if (!scannedCount) resolveScan();
        return localities;
      } },
      $executeRaw: async (_sql, _key, payload) => {
        queued.push(JSON.parse(payload).localidadId);
        if (queued.length === scannedCount) resolveScan();
      },
    } },
    'src/models/Movimientos/Ronda/RondaModel': { RondaModel },
    'src/jobs/durableJobs': { registerJob: (kind, handler) => {
      assert.equal(kind, 'round.maintain');
      maintain = handler;
    } },
    'src/utils/logger': { logger: { ...logger, error: (_message, error) => rejectScan(error) } },
  })('src/jobs/roundMaintenance.ts');
  startRoundMaintenance();
  await scanned;
  assert.ok(queued.includes(concludedLocality.id), 'Maintenance must schedule concluded-only localities');
  await maintain({ localidadId: concludedLocality.id });
  assert.equal(await db.ronda.count({ where: { localidadId: concludedLocality.id } }), 0);
  assert.equal((await db.movimiento.findUnique({ where: { id: onlyConcluded.id } })).estado, 'DETENIDO');
  console.log('PASS PostgreSQL terminal rounds: physical mixed-row deletion, pending FIFO, active stopped/null flags, retry guards, concluded-only maintenance, preserved history, locality isolation, concurrent/idempotent cleanup');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
