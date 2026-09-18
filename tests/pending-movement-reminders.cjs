const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
const hour = 3600000;
const requested = Date.parse('2026-09-18T12:00:00.000Z');
const base = { id: 1, empresaId: 100, localidadId: 10, estado: 'SOLICITADO', fechaSolicitud: new Date(requested), fechaInicio: null, fechaFin: null, finalizado: false, locomotiveNumber: 22 };
const jobs = new Map(), sent = [], events = [], queries = [];
let current = { ...base }, outage = false;
function model(rows, source) { return {
  findMany: async q => { queries.push(q); if (outage && source === 'torreon') throw new Error('service unavailable'); return rows.filter(r => r.id > q.where.id.gt).slice(0, q.take); },
  findUnique: async () => current,
}; }
const records = Array.from({ length: 205 }, (_, i) => ({ ...base, id: i + 1 }));
const mocks = {
  'src/lib/prisma': { prisma: { movimiento: model(records, 'cosaif'), empresa: { findUnique: async () => ({ nombre: 'Empresa prueba' }) }, localidad: { findUnique: async () => ({ nombre: 'Guadalajara' }) } } },
  'src/lib/servicePrisma': { prismaTorreon: { movimientoTorreonFerro: model([base], 'torreon'), arrastreTorreon: model([base], 'torreon') } },
  'src/jobs/durableJobs': { registerJob() {}, enqueueJob: async (key, kind, payload) => { if (!jobs.has(key)) jobs.set(key, payload); } },
  'src/services/NotificadorFCM': { NotificadorFCM: { notificarRecordatorioPendiente: async (...args) => sent.push(args) } },
  'src/realtime/realtimeHub': { publishRealtimeEvent: e => events.push(e) },
  'src/utils/logger': { logger: { error() {} } },
};
(async () => {
  let api = loader(mocks)('src/jobs/pendingMovementReminders.ts');
  assert.equal(api.pendingHour(base, requested + hour - 1), null);
  assert.equal(api.pendingHour(base, requested + hour), 1);
  assert.equal(api.pendingHour(base, requested + 2 * hour), 2);
  for (const patch of [{ estado: 'EN_PROCESO' }, { estado: 'DETENIDO' }, { estado: 'CANCELADO' }, { estado: 'CONCLUIDO' }, { estado: 'AGENDADO' }, { finalizado: true }, { fechaInicio: new Date() }, { localidadId: null }]) assert.equal(api.pendingHour({ ...base, ...patch }, requested + 3 * hour), null);
  for (const estado of ['ESPERA', 'MODIFICADO', 'ASIGNADO']) assert.equal(api.pendingHour({ ...base, estado }, requested + hour), 1);
  await Promise.all([api.enqueuePendingMovementReminders(requested + hour), api.enqueuePendingMovementReminders(requested + hour)]);
  assert.equal(jobs.size, 207, 'pagination, distinct natural/arrastre/service keys, concurrent scans');
  assert.ok(queries.every(q => q.where.fechaInicio === null && q.where.fechaFin === null));
  api = loader(mocks)('src/jobs/pendingMovementReminders.ts');
  await api.enqueuePendingMovementReminders(requested + hour + 1000);
  assert.equal(jobs.size, 207, 'restart does not enqueue a duplicate hour');
  jobs.clear();
  await api.enqueuePendingMovementReminders(requested + 4 * hour + 1);
  assert.equal(jobs.size, 207);
  assert.ok([...jobs.values()].every(p => p.hour === 4), 'no accumulated historical reminders');
  const payload = [...jobs.values()].find(p => p.source === 'cosaif');
  current = { ...base, estado: 'EN_PROCESO' };
  await api.deliverPendingMovementReminder(payload, requested + 4 * hour + 1);
  assert.equal(sent.length, 0, 'rechecks state after enqueue');
  current = { ...base, fechaSolicitud: new Date(requested + hour) };
  await api.deliverPendingMovementReminder(payload, requested + 4 * hour + 1);
  assert.equal(sent.length, 0, 'rescheduling invalidates the old job');
  current = base;
  await api.deliverPendingMovementReminder(payload, requested + 5 * hour);
  assert.equal(sent.length, 0, 'stale hour expires');
  await api.deliverPendingMovementReminder(payload, requested + 4 * hour + 1);
  assert.equal(sent.length, 1);
  assert.deepEqual(Array.from(sent[0][0].roles).sort(), ['COORDINADOR', 'MAQUINISTA', 'SUPERVISOR']);
  assert.equal(sent[0][0].localidadId, 10);
  assert.equal(sent[0][0].data.eventId, events[0].eventId);
  assert.match(sent[0][0].mensaje, /4 horas pendiente/);
  const arrastre = [...jobs.values()].find(p => p.entity === 'arrastre');
  current = { ...base, localidadId: 20 };
  await api.deliverPendingMovementReminder(arrastre, requested + 4 * hour + 1);
  assert.equal(sent[1][0].roles.includes('MAQUINISTA_ARRASTRE'), true);
  assert.equal(sent[1][0].roles.includes('MAQUINISTA'), false);
  assert.equal(sent[1][0].localidadId, 20);
  jobs.clear(); outage = true;
  await api.enqueuePendingMovementReminders(requested + hour);
  assert.equal(jobs.size, 205, 'one service outage does not block another patio');
  console.log('PASS hourly reminders: boundary, pagination, restart, no backlog, cancellation, rescheduling and yard/driver isolation');
})().catch(error => { console.error(error); process.exitCode = 1; });
