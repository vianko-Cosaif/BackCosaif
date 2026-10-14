const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { loader, invoke } = require('./support/load-ts.cjs');
const clean = value => JSON.parse(JSON.stringify(value));
let now = Date.parse('2026-10-12T01:00:00Z');
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
const user = { id: 42, rol: 'MAQUINISTA', localidad: { id: 1, nombre: 'Guadalajara' } };
const row = (id, changes = {}, roundChanges = {}) => ({
  id: id + 100, localidadId: 1, empresaId: 3, rondaNumero: 1, orden: id, concluido: false,
  createdAt: new Clock(1), empresa: { nombre: 'Empresa' },
  movimiento: { id, localidadId: 1, empresaId: 3, locomotiveNumber: 1000 + id, estado: 'SOLICITADO',
    finalizado: false, fechaFin: null, prioridad: 'BAJA', fechaSolicitud: new Clock(1), incidentes: [], ...changes },
  ...roundChanges,
});
function matches(value, where) {
  return Object.entries(where).every(([key, expected]) => {
    if (key === 'OR') return expected.some(option => matches(value, option));
    const actual = value?.[key];
    if (expected && typeof expected === 'object') {
      if (expected.in) return expected.in.includes(actual);
      return matches(actual, expected);
    }
    return actual === expected;
  });
}
async function main() {
  let rows = [row(1), row(2, { estado: 'DETENIDO' }), row(3, { estado: 'EN_PROCESO' }),
    row(4, { finalizado: true }), row(5, { fechaFin: new Clock(2) }), row(6, { estado: 'CANCELADO' }),
    row(7, { estado: 'CONCLUIDO' }), row(8, { localidadId: 2 }), row(9, {}, { concluido: true }),
    row(10, { finalizado: null })];
  const files = new Map();
  const reads = [];
  const fs = {
    mkdir: async () => {}, access: async () => {},
    rm: async path => { for (const key of files.keys()) if (key === path || key.startsWith(path + '/')) files.delete(key); },
    readFile: async path => { assert.ok(files.has(path)); return Buffer.from(files.get(path)); },
  };
  const module = loader({
    'src/lib/prisma': { prisma: { ronda: { findMany: async query => {
      reads.push(clean(query)); return rows.filter(value => matches(value, query.where));
    } } } },
    'src/lib/servicePrisma': { prismaTorreon: {} },
    fs: { promises: fs },
    child_process: { spawn: (_command, args) => {
      const child = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = () => {};
      child.stdin = { end: sql => { files.set(args[0], sql); setImmediate(() => child.emit('close', 0)); } };
      return child;
    } },
  }, { Date: Clock })('src/offline/maquinistaOfflinePackage.ts');
  const first = await module.createMaquinistaOfflinePackage(user);
  assert.equal(first.notModified, false);
  const snapshot = module.getMaquinistaOfflinePackageFile(first.manifest.packageId, 'snapshot', user);
  const sql = files.get(snapshot.path);
  const movementIds = source => source.split('\n').filter(line => line.startsWith('INSERT OR REPLACE INTO movements VALUES')).map(line => Number(line.match(/VALUES \((\d+),/)[1]));
  assert.deepEqual(movementIds(sql), [1, 2, 3, 10], 'Exclude terminal flags/dates and foreign locality; preserve active stopped work and legacy null finalizado');
  assert.deepEqual(reads[0].orderBy, [{ rondaNumero: 'asc' }, { orden: 'asc' }], 'The operational round order stays unchanged');
  assert.equal(reads[0].where.movimiento.operadorId, undefined, 'Do not invent a new assignment rule');
  const journal = module.getMaquinistaOfflinePackageFile(first.manifest.packageId, 'journal', user);
  for (const [key, value] of [['profile', 'GDL_NATURAL'], ['schemaVersion', '1'], ['userId', '42'], ['localidadId', '1']]) {
    const metadata = `('${key}','${value}')`;
    assert.ok(sql.includes(metadata)); assert.ok(files.get(journal.path).includes(metadata));
  }
  now += 1000;
  assert.equal((await module.createMaquinistaOfflinePackage(user, first.etag)).notModified, true);
  assert.equal(reads.length, 2, 'Every manifest request re-queries current rows, including 304');
  rows = rows.filter(item => item.movimiento.id !== 1); // Physical deletion.
  const deleted = await module.createMaquinistaOfflinePackage(user, first.etag);
  assert.equal(deleted.notModified, false); assert.notEqual(deleted.etag, first.etag);
  assert.equal(movementIds(files.get(module.getMaquinistaOfflinePackageFile(deleted.manifest.packageId, 'snapshot', user).path)).includes(1), false);
  rows.find(item => item.movimiento.id === 2).movimiento.estado = 'CANCELADO';
  rows.find(item => item.movimiento.id === 3).movimiento.finalizado = true;
  rows.find(item => item.movimiento.id === 10).movimiento.fechaFin = new Clock();
  const empty = await module.createMaquinistaOfflinePackage(user, deleted.etag);
  assert.equal(empty.notModified, false);
  assert.deepEqual(movementIds(files.get(module.getMaquinistaOfflinePackageFile(empty.manifest.packageId, 'snapshot', user).path)), [], 'An authoritative empty snapshot removes every former active movement');
  assert.throws(() => module.getMaquinistaOfflinePackageFile(empty.manifest.packageId, 'snapshot', { ...user, localidad: { id: 2, nombre: 'Guadalajara' } }), error => error.status === 403);
  assert.throws(() => module.getMaquinistaOfflinePackageFile(empty.manifest.packageId, 'snapshot', { ...user, localidad: { id: 1, nombre: 'Torreón' } }), error => error.status === 403);
  assert.throws(() => module.getMaquinistaOfflinePackageFile(empty.manifest.packageId, 'snapshot', { ...user, id: 43 }), error => error.status === 403);
  now += 12 * 60 * 60 * 1000 + 1;
  const renewed = await module.createMaquinistaOfflinePackage(user, empty.etag);
  assert.equal(renewed.notModified, false, 'An expired GDL snapshot cannot be kept alive forever through 304');
  assert.equal(renewed.manifest.dataVersion, empty.manifest.dataVersion, 'Content remains unchanged; only freshness requires renewal');
  assert.ok(Date.parse(renewed.manifest.expiresAt) > now);
  assert.throws(() => module.getMaquinistaOfflinePackageFile(empty.manifest.packageId, 'snapshot', user), error => error.status === 404);

  const routes = [];
  loader({
    express: { Router: () => ({ use() {}, get(path, fn) { routes.push({ method: 'GET', path, fn }); }, post(path, fn) { routes.push({ method: 'POST', path, fn }); } }) },
    'src/auth/authenticateAccess': { authenticateAccess() {} },
    'src/auth/authorize': { requirePermission: () => () => {} },
    'src/offline/maquinistaOfflinePackage': module,
  })('src/Rutas/Offline/OfflineRoutes.ts');
  const availability = routes.find(route => route.path.endsWith('/availability')).fn;
  const available = await invoke(availability, { user });
  assert.equal(available.statusCode, 200);
  assert.equal(available.body.localidadId, 1); assert.equal(available.body.profile, 'GDL_NATURAL');
  assert.equal((await invoke(availability, { user: { ...user, localidad: undefined } })).statusCode, 409);
  console.log('PASS GDL offline freshness: fresh queries/ETags after deletion or completion, empty snapshots, valid stopped work, matched metadata, scope-bound downloads and renewal after expiry');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
