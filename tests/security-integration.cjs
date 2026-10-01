// Real PostgreSQL transactions, synthetic data, stubbed notifications/network.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { loader, logger } = require('./support/load-ts.cjs');
const admin = process.env.SECURITY_TEST_DB_ADMIN_URL;
if (!admin || new URL(admin).hostname !== '127.0.0.1' || new URL(admin).port !== '55439') throw new Error('Requires isolated SECURITY_TEST_DB_ADMIN_URL on 127.0.0.1:55439');
const databaseUrl = target => { const u = new URL(admin); u.pathname = `/security_${target}`; return u.toString(); };
const mainDb = new (require('@prisma/client').PrismaClient)({ datasources: { db: { url: databaseUrl('main') } } });
const commercialDb = new (require('../msComercial/generated').PrismaClient)({ datasources: { db: { url: databaseUrl('comercial') } } });
const tornoDb = new (require('../msTorno/generated').PrismaClient)({ datasources: { db: { url: databaseUrl('torno') } } });
const torreonDb = new (require('../ms_torreon/generated').PrismaClient)({ datasources: { db: { url: databaseUrl('torreon') } } });
const noop = () => undefined;
const notifications = new Proxy({}, { get: () => async () => undefined });
let roundAttempts = 0;
const mocks = {
  'src/lib/prisma': { prisma: mainDb }, 'msComercial/src/db/prisma': { prismaComercial: commercialDb },
  'src/lib/servicePrisma': { prismaTorno: tornoDb, prismaTorreon: torreonDb },
  'src/utils/logger': { logger }, 'src/models/Incidente/incidente.logger': { incidenteError: logger },
  'src/models/Movimientos/movimiento.logger': { movimientoError: logger },
  'src/services/NotificadorFCM': { NotificadorFCM: notifications },
  'src/services/tornoMs/tornoMsClient': {},
  'src/realtime/realtimeHub': { publishMovimientoCreadoEvent: noop, publishMovimientoEstadoEvent: noop, publishRealtimeEvent: noop, publishRondaReordenadaEvent: noop },
  'src/models/Movimientos/Ronda/RondaModel': { RondaModel: {
    gestionarIncidente: async () => undefined,
    generarRondaParaMovimiento: async data => {
      if (++roundAttempts === 1) throw new Error('Simulated crash after movement commit');
      return mainDb.ronda.create({ data: { ...data, prioridad: undefined, orden: 1, rondaNumero: 1 } });
    }, siguienteInteligente: async () => undefined,
  } },
};
const load = loader(mocks);
const commerce = load('msComercial/src/modules/cobranza/cobranza.controller.ts');
function res() { return { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } }; }
function request(id, body) { return { params: { id: String(id) }, body, commercialActor: { id: 1, role: 'COMERCIAL' }, header() { return undefined; } }; }
const run = async (handler, req) => { const r = res(); await handler(req, r); return r.body; };
async function main() {
  const tag = crypto.randomUUID();
  const client = await commercialDb.clienteComercial.create({ data: { empresaId: Math.floor(Math.random()*1e9), empresaNombre: tag, createdById: 1, updatedById: 1 } });
  const cut = total => commercialDb.corteCobro.create({ data: { clienteComercialId: client.id, folio: crypto.randomUUID(), periodoInicio: new Date(), periodoFin: new Date(), fechaCorte: new Date(), estado: 'FACTURADO', total, facturaFolio: 'TEST', createdById: 1, updatedById: 1 } });
  const pay = (c, amount, key = crypto.randomUUID()) => run(commerce.addPago, request(c.id, { monto: amount, fechaPago: '2026-09-01', operacionId: key }));
  const a = await cut(100);
  await assert.rejects(() => run(commerce.updateCorte, request(a.id, { estado: 'PAGADO' })), /saldo es cero/);
  const parallel = await Promise.allSettled([pay(a, 80), pay(a, 80)]);
  assert.equal(parallel.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(await commercialDb.pagoCobranza.count({ where: { corteId: a.id } }), 1);
  const b = await cut(100), key = crypto.randomUUID();
  const duplicate = await Promise.all([pay(b, 80, key), pay(b, 80, key)]);
  assert.equal(await commercialDb.pagoCobranza.count({ where: { corteId: b.id } }), 1);
  assert.equal(duplicate[0].cobranza.saldo, duplicate[1].cobranza.saldo);
  await assert.rejects(() => pay(b, 10, key), /otra operación/);
  const c = await cut(0.3);
  await pay(c, 0.1); const paid = await pay(c, 0.2);
  assert.equal(paid.estado, 'PAGADO'); assert.equal(paid.cobranza.saldo, 0);
  await assert.rejects(() => pay(a, 0.001));
  const d = await cut(100);
  await Promise.allSettled([pay(d, 80), run(commerce.updateCorte, request(d.id, { total: 50 }))]);
  const race = await commercialDb.corteCobro.findUnique({ where: { id: d.id }, include: { pagos: true } });
  assert(race.pagos.reduce((sum, p) => sum + Number(p.monto), 0) <= Number(race.total));
  console.log('PostgreSQL: payment locks, exact cents, state validation and retry deduplication OK');

  const empresa = await mainDb.empresa.create({ data: { nombre: tag } });
  const localidad = await mainDb.localidad.create({ data: { nombre: tag, estado: 'ACTIVA' } });
  const actor = await mainDb.usuario.create({ data: { nombre: tag, email: `${tag}@example.invalid`, contrasena: 'SYNTHETIC_HASH_NOT_REAL', rol: 'CLIENTE', empresaId: empresa.id, localidadId: localidad.id } });
  const movement = await mainDb.movimiento.create({ data: { creadoPorId: actor.id, empresaId: empresa.id, localidadId: localidad.id, locomotiveNumber: 100, estado: 'DETENIDO' } });
  const read = load('src/models/Movimientos/movimientoReadModel.ts').MovimientoReadModel;
  assert(!JSON.stringify(await read.obtenerMovimientoPorId(movement.id)).includes('SYNTHETIC_HASH_NOT_REAL'));
  const incident = await mainDb.incidente.create({ data: { descripcion: 'Synthetic expired incident', usuarioId: actor.id, movimientoId: movement.id, fechaInicio: new Date(Date.now()-11*60000) } });
  const incidents = load('src/models/Incidente/IncidenteModel.ts').IncidenteModel;
  await Promise.all([incidents.cerrarIncidenteProgramado(incident.id), incidents.cerrarIncidenteProgramado(incident.id)]);
  assert.equal((await mainDb.incidente.findUnique({ where: { id: incident.id } })).estado, 'CERRADO');
  const queued = await mainDb.$queryRaw`SELECT * FROM durable_jobs WHERE key = ${`incident:${incident.id}:reprogram`}`;
  assert.equal(queued.length, 1);
  await assert.rejects(() => incidents.reprogramarMovimientoPorIncidenteNoResuelto(incident.id), /Simulated crash/);
  const checkpoint = await mainDb.$queryRaw`SELECT result FROM incident_reprogramming WHERE incident_id = ${incident.id}`;
  assert.equal(checkpoint.length, 1);
  await incidents.reprogramarMovimientoPorIncidenteNoResuelto(incident.id);
  await incidents.reprogramarMovimientoPorIncidenteNoResuelto(incident.id);
  assert.equal(await mainDb.movimiento.count({ where: { empresaId: empresa.id } }), 2);
  assert.equal(await mainDb.ronda.count({ where: { movimientoId: checkpoint[0].result.nuevoMovimientoId } }), 1);
  console.log('PostgreSQL: safe user output, atomic incident close/enqueue and resume after committed movement OK');

  const concurrentMovement = await mainDb.movimiento.create({ data: { creadoPorId: actor.id, empresaId: empresa.id, localidadId: localidad.id, locomotiveNumber: 101, estado: 'DETENIDO' } });
  const parallelIncidents = await Promise.all([1, 2].map(n => mainDb.incidente.create({ data: { descripcion: `Concurrent test ${n}`, usuarioId: actor.id, movimientoId: concurrentMovement.id, estado: 'CERRADO', fechaInicio: new Date(), fechaFin: new Date() } })));
  const beforeCount = await mainDb.movimiento.count({ where: { empresaId: empresa.id } });
  await Promise.all(parallelIncidents.map(i => incidents.reprogramarMovimientoPorIncidenteNoResuelto(i.id)));
  assert.equal(await mainDb.movimiento.count({ where: { empresaId: empresa.id } }), beforeCount + 1);
  console.log('PostgreSQL: concurrent incidents cannot duplicate the replacement movement OK');

  const start = await torreonDb.$queryRawUnsafe('SELECT count(*)::int AS count FROM operational_outbox');
  await assert.rejects(() => torreonDb.$transaction(async tx => {
    await tx.movimientoTorreonFerro.create({ data: { empresaId: 1, localidadId: 1, creadoPorId: 1, locomotiveNumber: 1 } });
    throw new Error('rollback test');
  }));
  assert.equal((await torreonDb.$queryRawUnsafe('SELECT count(*)::int AS count FROM operational_outbox'))[0].count, start[0].count);
  await torreonDb.movimientoTorreonFerro.create({ data: { empresaId: 1, localidadId: 1, creadoPorId: 1, locomotiveNumber: 2 } });
  const outbox = load('src/jobs/serviceOutbox.ts');
  await outbox.importServiceEvents(); await outbox.importServiceEvents();
  const jobs = load('src/jobs/durableJobs.ts');
  let calls = 0;
  jobs.registerJob('torreon.event', async () => { if (++calls === 1) throw new Error('Transient test failure'); });
  await jobs.runJobsOnce();
  const retry = await mainDb.$queryRawUnsafe("SELECT * FROM durable_jobs WHERE kind = 'torreon.event' AND completed_at IS NULL");
  assert(retry.length >= 1); assert(retry[0].last_error.includes('Transient'));
  await mainDb.$executeRawUnsafe("UPDATE durable_jobs SET available_at = NOW() WHERE kind = 'torreon.event'");
  await jobs.runJobsOnce();
  assert.equal((await mainDb.$queryRawUnsafe("SELECT count(*)::int AS count FROM durable_jobs WHERE kind = 'torreon.event' AND completed_at IS NULL"))[0].count, 0);
  console.log('PostgreSQL: transactional outbox rollback, import deduplication and job retry OK');

  const retentionKey = `retention:${tag}`;
  await mainDb.$executeRaw`INSERT INTO durable_jobs (key, kind, payload, completed_at) VALUES (${retentionKey}, 'test', '{"sensitive":"synthetic"}'::jsonb, NOW() - INTERVAL '8 days')`;
  await load('src/jobs/retention.ts').pruneOperationalPayloads();
  const tombstone = await mainDb.$queryRaw`SELECT payload FROM durable_jobs WHERE key = ${retentionKey}`;
  assert.equal(JSON.stringify(tombstone[0].payload), '{}');
  console.log('PostgreSQL: payload retention preserves operation tombstones OK');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await Promise.all([mainDb, commercialDb, tornoDb, torreonDb].map(db => db.$disconnect())); });
