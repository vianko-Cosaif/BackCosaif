const assert = require('node:assert/strict');
const { loader, logger } = require('./support/load-ts.cjs');

function fixture(patch = {}, options = {}) {
  const initialDate = new Date('2026-09-01T12:00:00Z');
  let movement = {
    id: 71, localidadId: 1, empresaId: 3, estado: 'EN_PROCESO', finalizado: false,
    fechaInicio: initialDate, fechaFin: null, updatedAt: initialDate,
    instrucciones: 'Registro original', incidenteGlobal: false, ...patch,
  };
  let round = { id: 81, movimientoId: 71, localidadId: 1, rondaNumero: 1, orden: 1, concluido: false };
  const calls = { movementWrites: [], transactionReads: 0, recompositions: 0, generated: 0, cancelled: 0, concluded: 0, events: [] };
  let inTransaction = false;
  const read = () => ({ ...structuredClone(movement), ronda: round ? structuredClone(round) : null });
  const tx = {
    movimiento: {
      async findUnique({ where }) {
        if (where.id !== movement.id) return null;
        if (inTransaction) calls.transactionReads++;
        return !inTransaction && options.outsideSnapshot ? { ...read(), ...options.outsideSnapshot } : read();
      },
      async update({ where, data }) {
        assert.equal(where.id, movement.id);
        calls.movementWrites.push(structuredClone(data));
        movement = { ...movement, ...data };
        return read();
      },
    },
    ronda: {
      async update({ where, data }) {
        assert.ok(inTransaction, 'Ronda must close in the same transaction as its movement');
        assert.equal(where.id, round.id);
        round = { ...round, ...data };
        return structuredClone(round);
      },
      async findUnique({ where }) {
        assert.equal(where.movimientoId, movement.id);
        return round ? structuredClone(round) : null;
      },
    },
  };
  const prisma = {
    ...tx,
    async $transaction(run) {
      const before = { movement: structuredClone(movement), round: structuredClone(round) };
      inTransaction = true;
      try { return await run(tx); }
      catch (error) { movement = before.movement; round = before.round; throw error; }
      finally { inTransaction = false; }
    },
  };
  const notifications = {
    notificarMovimientoCancelado: async () => { calls.cancelled++; },
    notificarMovimientoFinalizado: async () => { calls.concluded++; },
  };
  const api = loader({
    'src/lib/prisma': { prisma },
    'src/models/Movimientos/movimiento.logger': { movimientoError: logger },
    'src/services/NotificadorFCM': { NotificadorFCM: {} },
    'src/models/Movimientos/movimiento.notifications': notifications,
    'src/realtime/realtimeHub': { publishMovimientoEstadoEvent: event => {
      assert.equal(inTransaction, false, 'Realtime must publish only after the transaction commits');
      calls.events.push(event);
    } },
    'src/models/Movimientos/Ronda/RondaModel': { RondaModel: {
      async recomponerRondasLocalidad(localidadId, transaction) {
        assert.equal(localidadId, 1); assert.equal(transaction, tx); assert.ok(inTransaction);
        calls.recompositions++;
        if (options.failRecomposition) throw new Error('Synthetic recomposition failure');
        if (options.removeCompletedRound && round?.concluido) round = null;
      },
      async siguienteInteligente() {},
      async generarRondaParaMovimiento() { calls.generated++; },
    } },
  })('src/models/Movimientos/movimientoWriteService.ts').MovimientoWriteService;
  return { api, calls, movement: () => structuredClone(movement), round: () => structuredClone(round) };
}

async function main() {
  // Normal closure updates the movement and round atomically, preserving movement history.
  {
    const f = fixture({}, { removeCompletedRound: true });
    const result = await f.api.finalizarMovimiento(71);
    assert.equal(result.estado, 'CONCLUIDO'); assert.equal(result.finalizado, true);
    assert.equal(result.instrucciones, 'Registro original'); assert.equal(result.ronda, null);
    assert.equal(f.movement().id, 71); assert.equal(f.calls.concluded, 1);
    const finishedAt = result.fechaFin.getTime();
    await f.api.finalizarMovimiento(71);
    assert.equal(f.movement().fechaFin.getTime(), finishedAt);
    assert.equal(f.calls.movementWrites.length, 1); assert.equal(f.calls.concluded, 1);
  }
  // A repeated cancel/finalize cannot convert CANCELADO to CONCLUIDO or rewrite its reason/date.
  {
    const f = fixture();
    await f.api.cancelarMovimiento(71, 'Razón original', 9);
    const original = f.movement();
    await f.api.cancelarMovimiento(71, 'Razón posterior', 10);
    await f.api.finalizarMovimiento(71);
    await f.api.cambiarEstadoMovimiento(71, 'CANCELADO');
    assert.equal(f.movement().estado, 'CANCELADO'); assert.equal(f.movement().finalizado, true);
    assert.equal(f.movement().fechaFin.getTime(), original.fechaFin.getTime());
    assert.equal(f.movement().updatedAt.getTime(), original.updatedAt.getTime());
    assert.equal(f.movement().instrucciones, 'CANCELADO: Razón original');
    assert.equal(f.round().concluido, true); assert.equal(f.calls.movementWrites.length, 1);
    assert.equal(f.calls.cancelled, 1); assert.equal(f.calls.concluded, 0); assert.equal(f.calls.events.length, 1);
  }
  // Repair a historical DETENIDO's stale active round without changing/re-enqueuing its movement.
  {
    const fechaFin = new Date('2026-09-01T13:00:00Z');
    const f = fixture({ estado: 'DETENIDO', finalizado: true, fechaFin });
    const result = await f.api.finalizarMovimiento(71);
    await f.api.cancelarMovimiento(71, 'No debe reemplazar historial');
    await f.api.cambiarEstadoMovimiento(71, 'DETENIDO');
    assert.equal(result.estado, 'DETENIDO'); assert.equal(f.movement().estado, 'DETENIDO');
    assert.equal(f.movement().fechaFin.getTime(), fechaFin.getTime());
    assert.equal(f.movement().instrucciones, 'Registro original'); assert.equal(f.round().concluido, true);
    assert.equal(f.calls.movementWrites.length, 0); assert.equal(f.calls.generated, 0);
    assert.equal(f.calls.cancelled + f.calls.concluded, 0);
  }
  // Terminal legacy rows missing finalizado are repaired even on same-state requests.
  for (const estado of ['CANCELADO', 'CONCLUIDO']) {
    const fechaFin = new Date('2026-09-01T13:00:00Z');
    const f = fixture({ estado, finalizado: false, fechaFin, incidenteGlobal: true });
    await f.api.cambiarEstadoMovimiento(71, estado);
    assert.equal(f.movement().estado, estado); assert.equal(f.movement().finalizado, true);
    assert.equal(f.movement().fechaFin.getTime(), fechaFin.getTime()); assert.equal(f.movement().incidenteGlobal, false);
    assert.equal(f.round().concluido, true); assert.equal(f.calls.generated, 0);
  }
  // Repairing a terminal's stale queue refreshes connected clients without repeating FCM.
  for (const method of ['cancelarMovimiento', 'finalizarMovimiento', 'cambiarEstadoMovimiento']) {
    const f = fixture({ estado: 'CANCELADO', finalizado: true, fechaFin: new Date('2026-09-01T13:00:00Z') }, { removeCompletedRound: true });
    await f.api[method](71, 'CANCELADO');
    assert.equal(f.round(), null); assert.equal(f.calls.events.length, 1);
    assert.equal(f.calls.events[0].estado, 'CANCELADO'); assert.equal(f.calls.events[0].ronda, null);
    assert.equal(f.calls.cancelled + f.calls.concluded, 0); assert.equal(f.calls.movementWrites.length, 0);
    await f.api[method](71, 'CANCELADO');
    assert.equal(f.calls.events.length, 1, 'A no-op retry must not emit another repair event');
  }
  // Same-state closure must use the current transaction snapshot rather than an obsolete outer read.
  {
    const fechaFin = new Date('2026-09-01T13:00:00Z');
    const f = fixture({ estado: 'CANCELADO', finalizado: true, fechaFin }, { outsideSnapshot: {
      finalizado: false, fechaFin: new Date('2026-08-01T13:00:00Z'), instrucciones: 'Snapshot obsoleto',
      ronda: { id: 999, movimientoId: 71, concluido: false },
    } });
    const result = await f.api.cambiarEstadoMovimiento(71, 'CANCELADO');
    assert.equal(f.calls.transactionReads, 1); assert.equal(f.calls.movementWrites.length, 0);
    assert.equal(result.fechaFin.getTime(), fechaFin.getTime()); assert.equal(result.instrucciones, 'Registro original');
    assert.equal(f.round().id, 81); assert.equal(f.round().concluido, true);
    assert.equal(f.calls.events.length, 1); assert.equal(f.calls.cancelled + f.calls.concluded, 0);
  }
  {
    const f = fixture({ estado: 'CANCELADO', finalizado: true }, { outsideSnapshot: { estado: 'CONCLUIDO' } });
    const result = await f.api.cambiarEstadoMovimiento(71, 'CONCLUIDO');
    assert.equal(result.estado, 'CANCELADO'); assert.equal(f.calls.movementWrites.length, 0);
    assert.equal(f.calls.events[0].estado, 'CANCELADO');
  }
  // Every entry point preserves the terminal state when completing an inconsistent old row.
  for (const method of ['cancelarMovimiento', 'finalizarMovimiento']) {
    for (const estado of ['CANCELADO', 'CONCLUIDO']) {
      const f = fixture({ estado, finalizado: false });
      await f.api[method](71, 'No debe reemplazar historial');
      assert.equal(f.movement().estado, estado); assert.equal(f.movement().finalizado, true);
      assert.ok(f.movement().fechaFin instanceof Date); assert.equal(f.round().concluido, true);
      assert.equal(f.movement().instrucciones, 'Registro original');
    }
  }
  // A live paused movement remains eligible, while transitions to either terminal state close its round.
  {
    const f = fixture({ estado: 'DETENIDO', finalizado: false });
    await f.api.cambiarEstadoMovimiento(71, 'DETENIDO');
    assert.equal(f.round().concluido, false); assert.equal(f.calls.recompositions, 0);
    await f.api.cambiarEstadoMovimiento(71, 'CONCLUIDO', { notificar: false });
    assert.equal(f.movement().estado, 'CONCLUIDO'); assert.equal(f.movement().finalizado, true);
    assert.equal(f.round().concluido, true);
  }
  {
    const f = fixture();
    await f.api.cambiarEstadoMovimiento(71, 'CANCELADO', { razon: 'Cancelado por operación', notificar: false });
    assert.equal(f.movement().estado, 'CANCELADO'); assert.equal(f.movement().finalizado, true);
    assert.equal(f.round().concluido, true);
  }
  // A cleanup failure rolls back both changes rather than leaving partially closed data.
  for (const method of ['cancelarMovimiento', 'finalizarMovimiento']) {
    const f = fixture({}, { failRecomposition: true });
    await assert.rejects(() => f.api[method](71, 'Razón de prueba'));
    assert.equal(f.movement().estado, 'EN_PROCESO'); assert.equal(f.movement().finalizado, false);
    assert.equal(f.round().concluido, false); assert.equal(f.calls.events.length, 0);
  }
  {
    const f = fixture({ estado: 'CANCELADO', finalizado: false }, { failRecomposition: true });
    await assert.rejects(() => f.api.cambiarEstadoMovimiento(71, 'CANCELADO'));
    assert.equal(f.movement().finalizado, false); assert.equal(f.round().concluido, false);
    assert.equal(f.calls.events.length, 0);
  }
  console.log('PASS movement terminal writes: closure, idempotent queue repair, fresh transaction reads, post-commit realtime and atomic rollback');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
