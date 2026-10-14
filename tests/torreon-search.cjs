const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');

async function main() {
  const { naturalSearchQuery, naturalSearchSql } = loader()('ms_torreon/src/modules/movimientos/naturalSearch.query.ts');
  for (const invalid of [{ page: 0 }, { pageSize: 101 }, { localidadId: 0 }, { estados: 'UNKNOWN' },
    { sortBy: 'id; DROP TABLE x' }, { locomotivePrefix: '1%' },
    { fechaDesde: '2026-10-12T00:00:00Z', fechaHasta: '2026-10-11T00:00:00Z' }]) {
    assert.equal(naturalSearchQuery.safeParse({ localidadId: 2, ...invalid }).success, false);
  }
  const q = naturalSearchQuery.parse({ localidadId: 2, empresaId: 3, page: 6, pageSize: 20,
    q: "O'Hare%_", locomotivePrefix: '12', estados: 'DETENIDO,EN_PROCESO', vista: 'ACTIVOS',
    fechaCampo: 'fin', fechaDesde: '2026-10-01T00:00:00Z', sortBy: 'locomotora', sortDir: 'asc' });
  const sql = naturalSearchSql(q);
  assert.ok(!sql.ids.text.includes(q.q), 'Search input must remain a bound SQL value');
  assert.ok(sql.ids.values.includes(q.q));
  assert.ok(sql.ids.text.includes('m.locomotive_number ASC'));
  assert.ok(sql.ids.text.includes('m.fecha_fin >='));
  assert.deepEqual(Array.from(sql.ids.values.slice(-2)), [20, 100]);
  assert.deepEqual(Array.from(sql.count.values), Array.from(sql.ids.values.slice(0, -2)), 'Count and page have exactly the same filters');

  let requested;
  let legacy = false;
  const meta = { total: 126, page: 6, pageSize: 20, totalPages: 7, hasNextPage: true, hasPreviousPage: true };
  const adapter = loader({ 'src/lib/prisma': { prisma: {} },
    'src/services/torreonMs/torreonMsClient': { requestTorreonMs: async path => {
      requested = new URL(path, 'http://example.invalid');
      return { data: { data: [{ id: 121, empresaId: 3, localidadId: 2, estado: 'DETENIDO', locomotiveNumber: 123,
        ...(legacy ? { polo: 'NORTE', poloOrigen: null, poloDestino: null } : { poloOrigen: 'NORTE', poloDestino: 'SUR' }),
        unidad: { id: 10, estado: 'DETENIDA', movimientos: [] } }], meta } };
    } },
  })('src/application/movements/torreonSearch.ts');
  const result = await adapter.buscarMovimientosTorreonNatural({ localidadId: 2, empresaId: 3, estados: ['DETENIDO'],
    ambito: 'actuales', q: "O'Hare%_", locomotivePrefix: '12', fechaCampo: 'fin',
    fechaDesde: new Date('2026-10-01T00:00:00Z'), sortBy: 'locomotora', sortDir: 'asc', pagination: { page: 6, pageSize: 20 } });
  assert.equal(requested.pathname, '/movimientos/buscar');
  for (const [key, value] of Object.entries({ page: '6', pageSize: '20', localidadId: '2', empresaId: '3',
    estados: 'DETENIDO', vista: 'ACTIVOS', q: "O'Hare%_", locomotivePrefix: '12', fechaCampo: 'fin',
    fechaDesde: '2026-10-01T00:00:00.000Z', sortBy: 'locomotora', sortDir: 'asc' })) assert.equal(requested.searchParams.get(key), value);
  assert.equal(result.data.length, 1, 'The gateway must not refilter a server page');
  assert.equal(result.data[0].estado, 'DETENIDO');
  assert.equal(result.data[0].source, 'torreon');
  assert.equal(result.data[0].poloOrigen, 'NORTE', 'Search responses retain the departure pole');
  assert.equal(result.data[0].poloDestino, 'SUR', 'Search responses retain the independent arrival pole');
  assert.equal(result.meta.total, 126, 'The gateway preserves the global total');
  assert.equal(result.meta.totalPages, 7);
  legacy = true;
  const oldResult = await adapter.buscarMovimientosTorreonNatural({ localidadId: 2, empresaId: 3, estados: [], fechaCampo: 'solicitud', pagination: { page: 1, pageSize: 20 } });
  assert.equal(oldResult.data[0].poloOrigen, null, 'Do not infer a departure from a legacy general pole');
  assert.equal(oldResult.data[0].poloDestino, null, 'Do not infer an arrival from a legacy general pole');
  console.log('PASS Torreón search: validated filters, parameterized SQL, consistent count/page and gateway contract');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
