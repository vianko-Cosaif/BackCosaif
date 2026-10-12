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
const noop = () => undefined;
const load = loader({
  'src/lib/prisma': { prisma: db },
  'src/utils/logger': { logger },
  'src/models/Incidente/incidente.logger': { incidenteError: logger },
  'src/models/Movimientos/movimiento.logger': { movimientoError: logger },
  'src/services/NotificadorFCM': { NotificadorFCM: new Proxy({}, { get: () => async () => undefined }) },
  'src/services/tornoMs/tornoMsClient': {},
  'src/services/fcmCompat': { sendMulticastCompat: async () => { throw new Error('Unexpected service notification'); } },
  'src/realtime/realtimeHub': { publishMovimientoCreadoEvent: noop, publishMovimientoEstadoEvent: noop, publishRealtimeEvent: noop, publishRondaReordenadaEvent: noop },
});
const { IncidenteModel } = load('src/models/Incidente/IncidenteModel.ts');
const { instruccionesVisibles } = load('src/models/Movimientos/movimiento.instructions.ts');

async function main() {
  const tag = `INCIDENT-INSTRUCTIONS-${crypto.randomUUID()}`;
  const company = await db.empresa.create({ data: { nombre: tag } });
  const locality = await db.localidad.create({ data: { nombre: tag, estado: 'ACTIVA' } });
  const actor = await db.usuario.create({ data: {
    nombre: tag, email: `${tag}@example.invalid`, contrasena: 'SYNTHETIC', rol: 'ADMINISTRADOR',
    empresaId: company.id, localidadId: locality.id,
  } });
  const operation = 'De la via 21 para la via 10 (seccion 1) Meter retrocediendo hasta dentro';
  const clean = `[META DESTINO:10|SECCION:1|LIBERAR] ${operation}`;
  const movementData = { empresaId: company.id, localidadId: locality.id, creadoPorId: actor.id, prioridad: 'ALTA', finalizado: false, incidenteGlobal: false };
  const pending = await db.movimiento.create({ data: { ...movementData, locomotiveNumber: 999, estado: 'SOLICITADO' } });
  await db.ronda.create({ data: { movimientoId: pending.id, empresaId: company.id, localidadId: locality.id, rondaNumero: 1, orden: 1 } });

  // Cover both the normal active slot and a previously-concluded residual in the same group.
  for (const concluded of [false, true, null]) {
    const first = await db.movimiento.create({ data: {
      ...movementData, locomotiveNumber: concluded === false ? 901 : concluded === true ? 902 : 903, estado: 'DETENIDO',
      instrucciones: `${clean.replace('] ', '] [META DESTINO:1] ')} | Incidente #1547 no resuelto para movimiento #14130. Reprogramado en movimiento #14133. | Incidente #1547 no resuelto para movimiento #14130. Movimiento reprogramado en ronda 8, posición 2.`,
    } });
    await db.ronda.create({ data: { movimientoId: first.id, empresaId: company.id, localidadId: locality.id, rondaNumero: 1, orden: 2, concluido: concluded } });
    let current = first;
    const history = [];
    const incidents = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      await db.movimiento.update({ where: { id: current.id }, data: { estado: 'DETENIDO', incidenteGlobal: true } });
      const incident = await db.incidente.create({ data: {
        movimientoId: current.id, usuarioId: actor.id, descripcion: 'No fue posible realizar el movimiento',
        estado: 'CERRADO', fechaFin: new Date(),
      } });
      incidents.push(incident.id);
      const result = await IncidenteModel.reprogramarMovimientoPorIncidenteNoResuelto(incident.id);
      const saved = await db.movimiento.findUnique({ where: { id: current.id } });
      history.push(saved);
      assert.equal(saved.finalizado, true);
      assert.equal(await db.ronda.count({ where: { movimientoId: current.id } }), 0, 'Original attempt must leave the physical round table');
      assert.equal((saved.instrucciones.match(/\[META/g) || []).length, 1);
      assert.ok(saved.instrucciones.length < 240, 'Historical text must remain bounded');
      assert.ok(await db.ronda.findUnique({ where: { movimientoId: pending.id } }), 'Other pending work must survive');
      if (attempt < 2) {
        assert.equal(saved.estado, 'DETENIDO');
        assert.equal((saved.instrucciones.match(/Reprogramado en movimiento/g) || []).length, 1);
        current = await db.movimiento.findUnique({ where: { id: result.nuevoMovimientoId } });
        assert.equal(current.instrucciones, clean);
        assert.equal(instruccionesVisibles(current.instrucciones), operation);
        await IncidenteModel.reprogramarMovimientoPorIncidenteNoResuelto(incident.id);
        assert.equal((await db.movimiento.findUnique({ where: { id: current.id } })).instrucciones, clean, 'Worker retry must not append another comment');
        assert.equal(await db.ronda.count({ where: { movimientoId: current.id } }), 1);
      } else {
        assert.equal(saved.estado, 'CANCELADO', 'Three incidents still cancel the same request chain');
        assert.equal(result.nuevoMovimientoId, null);
        assert.equal(instruccionesVisibles(saved.instrucciones), `${operation} | Cancelado por 3 incidentes.`);
      }
    }
    // Replaying an old checkpoint must not erase the successor's own final outcome or lineage.
    await IncidenteModel.reprogramarMovimientoPorIncidenteNoResuelto(incidents[0]);
    for (const saved of history) {
      const actual = await db.movimiento.findUnique({ where: { id: saved.id } });
      assert.equal(actual.instrucciones, saved.instrucciones);
      assert.equal(actual.estado, saved.estado);
      assert.equal(actual.fechaFin.getTime(), saved.fechaFin.getTime());
    }
    assert.equal(await db.movimiento.count({ where: { localidadId: locality.id, locomotiveNumber: first.locomotiveNumber } }), 3);
  }
  console.log('PASS PostgreSQL incident instructions: active/concluded/null slots, physical cleanup, repeat jobs, clean replacements, preserved history and three-incident limit');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
