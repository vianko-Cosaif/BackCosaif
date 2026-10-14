// Explicitly isolated PostgreSQL only. Never use the operational Torreón database.
const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
const url = process.env.TORREON_TEST_DATABASE_URL;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  || !/^torreon_search_test(?:_[a-z0-9]+)?$/.test(new URL(url).pathname.slice(1))) {
  throw new Error('Requires local disposable TORREON_TEST_DATABASE_URL named torreon_search_test (optional suffix)');
}
const db = new (require('../ms_torreon/generated').PrismaClient)({ datasources: { db: { url } } });
const load = loader({ 'ms_torreon/src/db/prisma': { prismaTorreon: db },
  'ms_torreon/src/utils/imagenesTorreon': { guardarFotoTorreon() { throw new Error('No evidence writes in search tests'); } } });
const { MovimientoModel } = load('ms_torreon/src/modules/movimientos/movimiento.model.ts');
const { naturalSearchQuery } = load('ms_torreon/src/modules/movimientos/naturalSearch.query.ts');
const search = input => MovimientoModel.buscar(naturalSearchQuery.parse({ localidadId: 2, empresaId: 3, ...input }));
async function main() {
  assert.equal(await db.movimientoTorreonFerro.count(), 0, 'Use a fresh disposable database');
  await db.movimientoTorreonFerro.createMany({ data: Array.from({ length: 150 }, (_, index) => ({
    id: index + 1, localidadId: 2, empresaId: 3, creadoPorId: 7, locomotiveNumber: 1000 + index,
    estado: index < 140 ? 'SOLICITADO' : 'CONCLUIDO', fechaSolicitud: new Date(Date.UTC(2026, 9, 1, 0, index)),
    fechaInicio: index >= 140 ? new Date('2026-10-01T10:00:00Z') : null,
    fechaFin: index >= 140 ? new Date('2026-10-01T11:00:00Z') : null,
    instrucciones: index === 0 ? "Aguja O'Hare%_ lista" : 'Maniobra ordinaria', empresaNombreSnapshot: 'Empresa propia',
  })) });
  await db.movimientoTorreonFerro.createMany({ data: [
    { id: 151, localidadId: 2, empresaId: 4, creadoPorId: 8, locomotiveNumber: 9999, instrucciones: 'Secreto ajeno' },
    { id: 152, localidadId: 8, empresaId: 3, creadoPorId: 7, locomotiveNumber: 9999 },
    { id: 153, localidadId: 2, empresaId: 3, creadoPorId: 7, locomotiveNumber: 9999, estado: 'DETENIDO' },
  ] });
  let result = await search({ q: "O'Hare%_" });
  assert.deepEqual(result.data.map(row => row.id), [1], 'Search finds matching record beyond the first page');
  assert.equal(result.meta.total, 1);
  result = await search({ vista: 'ACTIVOS', page: 6, pageSize: 25, sortBy: 'id', sortDir: 'asc' });
  assert.deepEqual(result.data.map(row => row.id), [...Array.from({ length: 15 }, (_, i) => i + 126), 153]);
  assert.equal(result.meta.total, 141); assert.equal(result.meta.totalPages, 6); assert.equal(result.meta.hasNextPage, false);
  result = await search({ vista: 'ACTIVOS', page: 7 });
  assert.equal(result.data.length, 0); assert.equal(result.meta.total, 141, 'An empty page keeps the global total');
  result = await search({ vista: 'ACTIVOS', estados: 'DETENIDO' });
  assert.deepEqual(result.data.map(row => row.id), [153]);
  result = await search({ vista: 'PASADOS' });
  assert.equal(result.meta.total, 10); assert.ok(result.data.every(row => row.estado === 'CONCLUIDO'));
  assert.equal((await search({ vista: 'PASADOS', estados: 'DETENIDO' })).meta.total, 0);
  result = await search({ locomotivePrefix: '100', sortBy: 'locomotora', sortDir: 'asc', pageSize: 3, page: 2 });
  assert.deepEqual(result.data.map(row => row.locomotiveNumber), [1003, 1004, 1005]);
  assert.equal(result.meta.total, 10);
  result = await search({ fechaCampo: 'solicitud', fechaDesde: '2026-10-01T00:00:00Z', fechaHasta: '2026-10-01T00:04:00Z', sortDir: 'asc' });
  assert.deepEqual(result.data.map(row => row.id), [1, 2, 3, 4, 5]);
  assert.equal((await search({ q: "' OR 1=1 --" })).meta.total, 0);
  assert.equal((await search({ q: 'Secreto ajeno' })).meta.total, 0, 'Company scope applies before counting');
  result = await search({ locomotiveNumber: 9999 });
  assert.deepEqual(result.data.map(row => row.id), [153], 'Company and locality stay scoped');
  const unit = await db.unidadAtencionTorreon.create({ data: { localidadId: 2, modalidad: 'CONJUNTO' } });
  await db.movimientoTorreonFerro.updateMany({ where: { id: { in: [1, 151] } }, data: { unidadId: unit.id } });
  result = await search({ q: '#1' });
  assert.equal(result.data[0].unidad.totalIntegrantes, 2);
  assert.deepEqual(result.data[0].unidad.movimientos.map(row => row.id), [1], 'Group members from another company are never exposed');
  console.log('PASS PostgreSQL Torreón: global search, pages after 100, exact totals, stable ordering, dates, literal text, active pauses and company/locality isolation');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
