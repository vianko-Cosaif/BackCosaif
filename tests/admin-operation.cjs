const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true });
const a = require('../src/reporteria/operacion/analytics');
const { analyzeRetries } = require('../src/reporteria/operacion/retries');
const { analyzeDestinations } = require('../src/reporteria/operacion/destinations');
const svc = require('../src/reporteria/operacion/service');
const exportsModule = require('../src/reporteria/operacion/exports');
const D = s => new Date(s);
function input(overrides = {}) {
  return { id: 1, empresaId: 1, localidadId: 1, locomotiveNumber: 41, estado: 'CONCLUIDO', tipoMovimiento: 'REMOLCADA', finalizado: true,
    fechaSolicitud: D('2026-09-01T12:00:00Z'), fechaInicio: D('2026-09-01T13:00:00Z'), fechaFin: D('2026-09-01T13:05:00Z'),
    empresa: { nombre: 'Empresa A' }, localidad: { nombre: 'Patio' }, viaOrigen: { id: 1, nombre: 'Vía 1' }, viaDestino: { id: 2, nombre: 'Vía 2' },
    operador: null, supervisor: null, coordinador: null, cliente: { id: 7, nombre: 'Cliente A' }, incidentes: [], ...overrides };
}
function report() {
  const rows = [a.prepareRow(input({ incidentes: [{ id: 1, descripcion: '=2+2 <script>', estado: 'CERRADO', fechaInicio: D('2026-09-01T12:01:00Z'), fechaFin: D('2026-09-01T12:02:00Z') }] })), a.prepareRow(input({ id: 2, fechaInicio: null, fechaFin: null, finalizado: false, estado: 'SOLICITADO' }))];
  return { ...a.analyze(rows, [], 60), retries: analyzeRetries(rows), destinations: analyzeDestinations(rows, 60), rows, incidentRows: [{ id: 1, movementId: 1, company: 'Empresa A', locomotive: 41, description: '=2+2 <script>', state: 'CERRADO', startedAt: '2026-09-01T12:01:00Z', endedAt: '2026-09-01T12:02:00Z', duration: 1 }],
    meta: { id: '00000000-0000-4000-8000-000000000001', generatedAt: '2026-09-14T16:00:00Z', expiresAt: '2026-09-14T16:15:00Z', zone: a.ZONE, from: '2026-09-01', to: '2026-09-14', previousStart: '2026-08-18T06:00:00Z', previousEndExclusive: '2026-09-01T06:00:00Z', target: 60, company: 'Empresa A', client: 'Todos los clientes', locality: 'Patio', warnings: [], comparisonCovered: false, firstRequest: null, lastRequest: null },
    incidents: { resolved: 0, closed: 1, reporters: [], resolutionN: 0, resolutionMissing: 0, resolutionAverage: null, resolutionMedian: null, resolutionP90: null, total: 1, open: 0, medianClose: 1, durationN: 1, missingClose: 0, frequent: [{ description: '=2+2 <script>', count: 1, movements: 1, share: 100 }] }, catalogs: { companies: [], localities: [] } };
}
test('un movimiento con varios incidentes nunca multiplica el denominador', () => {
  const rows = [a.prepareRow(input({ incidentes: [{ id: 1 }, { id: 2 }, { id: 3 }] })), a.prepareRow(input({ id: 2 }))];
  const r = a.analyze(rows, [], 60);
  assert.equal(r.summary.total, 2); assert.equal(r.summary.incidents, 3); assert.equal(r.summary.affected, 1); assert.equal(r.summary.incidentRate, 50); assert.equal(r.companies[0].incidentRate, 50);
});
test('intervalos negativos y ausentes no son cero; un cero real sí es válido', () => {
  const rows = [a.prepareRow(input({ fechaInicio: D('2026-09-01T11:00:00Z'), fechaFin: D('2026-09-01T10:00:00Z') })), a.prepareRow(input({ id: 2, fechaInicio: null })), a.prepareRow(input({ id: 3, fechaInicio: D('2026-09-01T12:00:00Z') }))];
  const s = a.summarize(rows, 60); assert.equal(s.waitN, 1); assert.equal(s.waitMedian, 0); assert.equal(s.missingWait, 2); assert.equal(rows[0].execution, null); assert.ok(rows[0].issues.includes('invalidExecution'));
  assert.equal(a.summarize([], 60).targetRate, null); assert.equal(a.quantile([], .9), null);
});
test('objetivo inclusivo, percentiles interpolados y ejecución de concluidos y cancelados', () => {
  const rows = [a.prepareRow(input()), a.prepareRow(input({ id: 2, estado: 'CANCELADO', fechaInicio: D('2026-09-01T14:00:00Z'), fechaFin: D('2026-09-01T15:00:00Z') }))];
  const s = a.summarize(rows, 60); assert.equal(s.withinTarget, 1); assert.equal(s.targetRate, 50); assert.equal(s.waitP90, 114); assert.equal(s.executionN, 2); assert.equal(s.executionMedian, 32.5); assert.equal(s.clientDelayMinutes, 60);
});
test('hora local y límites de turno 07/15/23', () => {
  for (const [utc, expected] of [['12:59', '23:00 a 07:00'], ['13:00', '07:00 a 15:00'], ['21:00', '15:00 a 23:00'], ['05:00', '23:00 a 07:00']]) assert.equal(a.prepareRow(input({ fechaSolicitud: D(`2026-09-01T${utc}:00Z`) })).shift, expected);
  assert.equal(a.prepareRow(input({ fechaSolicitud: D('2026-09-01T05:59:59Z') })).day, '2026-08-31');
});
test('rangos inválidos, futuro, ids y objetivo fuera de rango dan 400', () => {
  for (const q of [{ from: '2026-02-30', to: '2026-03-01' }, { from: '2026-09-15', to: '2026-09-15' }, { from: '2025-01-01', to: '2026-09-01' }, { from: '2026-09-01', to: '2026-09-01', companyId: '1.1' }, { from: '2026-09-01', to: '2026-09-01', target: '0' }]) assert.throws(() => svc.parseFilters(q, D('2026-09-14T16:00:00Z')), /./);
  const f = svc.parseFilters({ from: '2026-09-01', to: '2026-09-14' }, D('2026-09-14T16:00:00Z'));
  assert.equal(f.start.toISOString(), '2026-09-01T06:00:00.000Z'); assert.equal(f.end - f.start, f.previousEnd - f.previousStart); assert.equal(f.partialDay, true);
});
test('consulta guardada aislada por usuario; vence y no filtra datos de sesión', () => {
  const r = report(); svc.storeSnapshot(1, r); assert.equal(svc.getSnapshot(1, r.meta.id).summary.total, 2);
  assert.throws(() => svc.getSnapshot(2, r.meta.id)); assert.equal('rows' in svc.publicReport(r), false);
  svc.snapshots.get(r.meta.id).expires = 0; assert.throws(() => svc.getSnapshot(1, r.meta.id));
});
test('detalle filtrado, ordenado y paginado con incidentes de la fila', () => {
  const r = report(); const page = svc.detailPage(r, { filter: 'incident' });
  assert.equal(page.total, 1); assert.equal(page.rows[0].incidents.length, 1);
  assert.equal(svc.detailPage(r, { filter: 'late' }).total, 0);
  assert.equal(svc.detailPage(r, { filter: 'pending' }).total, 1);
  assert.equal(svc.detailPage(r, { q: 'no existe' }).total, 0);
  assert.throws(() => svc.detailPage(r, { page: '-1' }));
});
test('PDF escapa descripciones y no emite HTML ejecutable', () => {
  const html = exportsModule.reportHtml(report()); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
});
test('Excel conserva totales, porcentajes, detalle, fechas locales y texto literal', async () => {
  const ExcelJS = require('exceljs'); const JSZip = require('jszip');
  const buffer = await exportsModule.exportExcel(report()); const w = new ExcelJS.Workbook(); await w.xlsx.load(buffer);
  const s = w.getWorksheet('Resumen'); assert.equal(s.getCell('B6').value, 2); assert.equal(s.getCell('B15').value.result, .5); assert.equal(s.getCell('B17').value.result, 1);
  assert.equal(w.getWorksheet('Movimientos').rowCount, 7); assert.equal(w.getWorksheet('Movimientos').getCell('I6').value.toISOString(), '2026-09-01T06:00:00.000Z');
  assert.equal(w.getWorksheet('Incidentes').getCell('I6').value, '=2+2 <script>');
  assert.equal(w.getWorksheet('Movimientos').views[0].ySplit, 5);
  const zip = await JSZip.loadAsync(buffer); assert.ok(Object.keys(zip.files).some(p => /xl\/charts\/chart\d+.xml/.test(p)));
});

test('bandas 10–30 exactas, incluyendo los límites y sin premiar tiempos cortos', () => {
  for (const [minutes, band] of [[0, 'short'], [9.9999, 'short'], [10, 'acceptable'], [30, 'acceptable'], [30.0001, 'long'], [null, 'unassessed'], [-1, 'unassessed']]) assert.equal(a.classifyDuration(minutes, 'CONCLUIDO'), band);
  assert.equal(a.classifyDuration(15, 'CANCELADO'), 'acceptable');
  assert.equal(a.classifyDuration(15, 'EN_PROCESO'), 'unassessed');
  const rows = [5, 10, 30, 40].map((minutes, i) => a.prepareRow(input({ id: i + 1, fechaFin: new Date(D('2026-09-01T13:00:00Z').getTime() + minutes * 60000) })));
  rows.push(a.prepareRow(input({ id: 5, fechaFin: null })));
  const summary = a.summarize(rows, 60);
  assert.deepEqual([summary.durationShort, summary.durationAcceptable, summary.durationLong, summary.durationUnassessed], [1, 2, 1, 1]);
  assert.equal(summary.acceptableRate, 50); assert.equal(summary.excessMinutes, 10); assert.equal(summary.executionAverage, 21.25);
});
test('cliente y empresa se filtran por identificadores, sin coincidencias parciales de nombres', () => {
  const rows = [
    a.prepareRow(input()),
    a.prepareRow(input({ id: 2, empresaId: 2, empresa: { nombre: 'Empresa AA' } })),
    a.prepareRow(input({ id: 3, cliente: null })),
    a.prepareRow(input({ id: 4, cliente: { id: 8, nombre: 'Cliente AA' } })),
  ];
  const r = { ...report(), ...a.analyze(rows, [], 60), rows };
  assert.equal(r.clients.length, 4);
  assert.deepEqual(svc.detailPage(r, { group: 'client', groupKey: '1:7' }).rows.map(r => r.id), [1]);
  assert.equal(svc.detailPage(r, { group: 'company', groupKey: '1' }).total, 3);
  assert.equal(svc.detailPage(r, { group: 'client', groupKey: '1:unassigned' }).total, 1);
  assert.equal(svc.parseFilters({ from: '2026-09-01', to: '2026-09-01', clientId: 'unassigned' }).clientId, 'unassigned');
});
test('vía origen y destino iguales cuenta una vez por movimiento', () => {
  const rows = [a.prepareRow(input({ viaDestino: { id: 1, nombre: 'Vía 1' } })), a.prepareRow(input({ id: 2 }))];
  const r = { ...report(), ...a.analyze(rows, [], 60), rows };
  assert.equal(r.vias.find(v => v.key === '1').total, 2);
  assert.equal(r.vias.find(v => v.key === '1').origins, 2);
  assert.equal(r.vias.find(v => v.key === '1').destinations, 1);
  assert.equal(svc.detailPage(r, { group: 'via', groupKey: '2' }).total, 1);
});
test('minutos de incidentes unen solapamientos, recortan extremos y omiten cierres sin fin', () => {
  const make = (start, end, state = 'RESUELTO') => ({ fechaInicio: D('2026-09-01T13:' + start + ':00Z'), fechaFin: end ? D('2026-09-01T13:' + end + ':00Z') : null, estado: state });
  const value = a.overlappingMinutes(D('2026-09-01T13:05:00Z'), D('2026-09-01T13:40:00Z'), [make('00', '15'), make('10', '25'), make('35', null, 'ABIERTO'), make('26', null), make('32', '30')], D('2026-09-01T13:39:00Z'));
  assert.equal(value, 24);
  assert.equal(a.overlappingMinutes(null, null, [], new Date()), null);
});
test('resolución excluye cierres automáticos y conserva denominadores de informantes', () => {
  const { analyzeIncidents } = require('../src/reporteria/operacion/incident-analytics');
  const rows = [
    { id: 1, movementId: 1, description: 'Bandera', state: 'RESUELTO', duration: 20, reporterId: 4, reporter: 'Informante' },
    { id: 2, movementId: 1, description: 'bandera', state: 'CERRADO', duration: 10, reporterId: 4, reporter: 'Informante' },
    { id: 3, movementId: 2, description: 'vía', state: 'RESUELTO', duration: null, reporterId: 4, reporter: 'Informante' },
    { id: 4, movementId: 3, description: 'vía', state: 'ABIERTO', duration: null, openAge: 40, reporterId: 5, reporter: 'Otro' },
  ];
  const r = analyzeIncidents(rows);
  assert.equal(r.resolutionN, 1); assert.equal(r.resolutionAverage, 20); assert.equal(r.resolved, 2); assert.equal(r.closed, 1); assert.equal(r.resolutionMissing, 1);
  assert.equal(r.reporters[0].total, 3); assert.equal(r.reporters[0].movements, 2); assert.equal(r.frequent[0].movements, 1);
  const snapshot = report(); snapshot.incidentRows = rows;
  assert.equal(svc.detailPage(snapshot, { group: 'reporter', groupKey: '4' }).total, 2);
});
test('cada banda abre exactamente los casos de sus cifras', () => {
  const r = report();
  for (const [filter, field] of [['short', 'durationShort'], ['acceptable', 'durationAcceptable'], ['long', 'durationLong'], ['unassessed', 'durationUnassessed']]) assert.equal(svc.detailPage(r, { filter }).total, r.summary[field]);
  const incomplete = a.prepareRow(input({ id: 3, fechaFin: null })); r.rows.push(incomplete);
  assert.deepEqual(svc.detailPage(r, { filter: 'not_concluded' }).rows.map(r => r.id), [2]);
  assert.deepEqual(svc.detailPage(r, { filter: 'duration_data' }).rows.map(r => r.id), [3]);
});
test('rutas administrativas rechazan anonimato, clientes y consultas de otro administrador', async () => {
  const express = require('express');
  const { operationReportRouter } = require('../src/reporteria/operacion/routes');
  const app = express();
  // Synthetic authentication fixture: exercises the real permission middleware and export routes.
  app.use((req, _res, next) => { if (req.headers['x-test-role']) req.user = { id: Number(req.headers['x-test-id'] || 1), rol: req.headers['x-test-role'], nombre: 'Synthetic', empresa: { id: 1 }, localidad: { id: 1 } }; next(); });
  app.use('/report', operationReportRouter);
  const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  try {
    const base = 'http://127.0.0.1:' + server.address().port + '/report';
    const r = report(); svc.storeSnapshot(1, r);
    for (const route of ['/' + r.meta.id + '/detalle', '/' + r.meta.id + '/excel', '/' + r.meta.id + '/pdf']) {
      assert.equal((await fetch(base + route)).status, 401);
      assert.equal((await fetch(base + route, { headers: { 'x-test-role': 'CLIENTE' } })).status, 403);
      assert.equal((await fetch(base + route, { headers: { 'x-test-role': 'ADMINISTRADOR', 'x-test-id': '2' } })).status, 410);
    }
    const allowed = await fetch(base + '/' + r.meta.id + '/detalle?filter=short', { headers: { 'x-test-role': 'ADMINISTRADOR' } });
    assert.equal(allowed.status, 200); assert.equal((await allowed.json()).total, 1);
    const file = await fetch(base + '/' + r.meta.id + '/excel', { headers: { 'x-test-role': 'ADMINISTRADOR' } });
    assert.equal(file.status, 200); assert.ok(file.headers.get('content-type').includes('spreadsheetml')); assert.ok((await file.arrayBuffer()).byteLength > 1000);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('detenidos y cancelados conservan inicio → corte como retraso del cliente, excluyendo espera', () => {
  const rows = [
    a.prepareRow(input({ estado: 'DETENIDO', fechaFin: null, finalizado: false, fechaPausa: D('2026-09-01T13:20:00Z') }), D('2026-09-01T14:00:00Z')),
    a.prepareRow(input({ id: 2, estado: 'CANCELADO', fechaFin: D('2026-09-01T13:40:00Z') })),
    a.prepareRow(input({ id: 3, estado: 'CANCELADO', fechaInicio: null })),
    a.prepareRow(input({ id: 4 })),
  ];
  const r = { ...report(), ...a.analyze(rows, [], 60), rows };
  assert.equal(rows[0].clientDelay, 20); assert.equal(rows[0].durationBand, 'acceptable'); assert.equal(rows[0].durationEnd, '2026-09-01T13:20:00.000Z');
  assert.equal(rows[1].clientDelay, 40); assert.equal(rows[1].durationBand, 'long');
  assert.equal(rows[2].clientDelay, null); assert.equal(rows[3].clientDelay, null);
  assert.equal(r.summary.clientDelayMinutes, 60); assert.equal(r.summary.clientDelayN, 2); assert.equal(r.summary.clientDelayMissing, 1);
  assert.equal(r.summary.concludedMinutes, 5); assert.equal(r.summary.executionN, 3);
  assert.equal(svc.detailPage(r, { filter: 'client_delay' }).total, 2);
  assert.equal(svc.detailPage(r, { filter: 'client_delay_missing' }).rows[0].id, 3);
  for (const groups of [r.companies, r.clients, r.states]) assert.equal(groups.reduce((sum, g) => sum + g.clientDelayMinutes, 0), 60);
});
test('reintentos enlazan IDs exactos y el límite de incidentes requiere evidencia explícita', () => {
  const rows = [
    a.prepareRow(input({ id: 1, estado: 'DETENIDO', instrucciones: 'Reprogramado en movimiento #12.' })),
    a.prepareRow(input({ id: 12, estado: 'DETENIDO', instrucciones: 'Reprogramado en movimiento #123.' })),
    a.prepareRow(input({ id: 123, estado: 'CANCELADO', instrucciones: 'Cancelado tras 3 incidentes en la misma solicitud.' })),
    a.prepareRow(input({ id: 99, estado: 'CANCELADO' })),
    a.prepareRow(input({ id: 100, estado: 'DETENIDO', instrucciones: 'Reprogramado en movimiento #999.' })),
  ];
  const chains = analyzeRetries(rows);
  assert.deepEqual(chains[0].ids, [1, 12, 123]); assert.equal(chains[0].clientDelayMinutes, 15); assert.equal(chains[0].cancelledByIncidentLimit, true);
  assert.equal(chains.find(c => c.ids[0] === 100).continuesOutside, true);
  assert.equal(chains.some(c => c.ids.includes(99)), false);
  assert.equal(analyzeRetries([rows[0], { ...rows[1], companyId: 2 }]).every(c => c.attempts === 1), true);
  const cyclic = analyzeRetries([{ ...rows[0], reprogrammedTo: 12 }, { ...rows[1], reprogrammedTo: 1 }]);
  assert.deepEqual(cyclic[0].ids, [1, 12]); assert.equal(cyclic[0].clientDelayMinutes, 10);
  const r = { ...report(), rows, retries: chains };
  assert.equal(svc.detailPage(r, { group: 'retry', groupKey: '1' }).total, 3);
  assert.equal(svc.detailPage(r, { filter: 'cancelled_limit' }).total, 1);
});
test('torno y lavado cuentan entradas concluidas, separan fallidos y excluyen salidas/misma vía', async () => {
  const rows = [
    a.prepareRow(input({ viaDestino: { id: 36, nombre: 'Torno' } })),
    a.prepareRow(input({ id: 2, estado: 'DETENIDO', viaDestino: { id: 36, nombre: 'Torno' } })),
    a.prepareRow(input({ id: 3, estado: 'CANCELADO', viaDestino: { id: 37, nombre: 'Lavado' } })),
    a.prepareRow(input({ id: 4, viaOrigen: { id: 36, nombre: 'Torno' } })),
    a.prepareRow(input({ id: 5, viaOrigen: { id: 36, nombre: 'Torno' }, viaDestino: { id: 36, nombre: 'Torno' } })),
    a.prepareRow(input({ id: 6, viaDestino: { id: 37, nombre: 'Vía para lavado' } })),
  ];
  const destinations = analyzeDestinations(rows, 60), [lathe, wash] = destinations;
  assert.equal(lathe.total, 2); assert.equal(lathe.concluded, 1); assert.equal(lathe.stopped, 1); assert.equal(lathe.clientDelayMinutes, 5);
  assert.equal(wash.concluded, 1); assert.equal(wash.cancelled, 1); assert.equal(wash.clientDelayMinutes, 5);
  assert.equal(lathe.clients[0].completed.executionN, 1);
  const r = { ...report(), ...a.analyze(rows, [], 60), rows, destinations };
  assert.equal(svc.detailPage(r, { group: 'destination', groupKey: 'lathe', state: 'CONCLUIDO' }).total, 1);
  assert.equal(svc.detailPage(r, { group: 'destination_client', groupKey: 'wash:1:7', filter: 'client_delay' }).total, 1);
  const ExcelJS = require('exceljs'); const w = new ExcelJS.Workbook(); await w.xlsx.load(await exportsModule.exportExcel(r));
  assert.equal(w.getWorksheet('Torno y lavado').getCell('D6').value, 1);
  assert.equal(w.getWorksheet('Torno y lavado').getCell('G6').value, 5);
  assert.equal(w.getWorksheet('Movimientos').getCell('X7').value, 5);
  assert.equal(w.getWorksheet('Resumen').getCell('B29').value, 10);
  const html = exportsModule.reportHtml(r); assert.ok(html.includes('Retraso del cliente')); assert.ok(!/sin evaluar/i.test(html));
});

test('sin vía destino usa servicio marcado, conserva evidencia y no mezcla salidas ni señales ambiguas', async () => {
  const rows = [
    a.prepareRow(input({ id: 101, viaDestino: null, torno: true })),
    a.prepareRow(input({ id: 102, viaDestino: null, lavado: true, estado: 'DETENIDO' })),
    a.prepareRow(input({ id: 103, viaDestino: null, lavado: true, estado: 'CANCELADO' })),
    a.prepareRow(input({ id: 104, viaDestino: null, lavado: true })),
    a.prepareRow(input({ id: 105, viaDestino: null })),
    a.prepareRow(input({ id: 106, viaDestino: null, torno: true, lavado: true })),
    a.prepareRow(input({ id: 107, viaOrigen: null, viaDestino: { id: 2, nombre: 'Vía 2' }, torno: true })),
    a.prepareRow(input({ id: 108, viaDestino: { id: 36, nombre: 'Torno' }, torno: true })),
  ];
  const r = { ...report(), ...a.analyze(rows, [], 60), rows, destinations: analyzeDestinations(rows,60) };
  assert.equal(rows[0].destination,'Torno'); assert.equal(rows[0].destinationId,null); assert.equal(rows[0].destinationRaw,null);
  assert.equal(rows[0].destinationEvidence,'service'); assert.equal(rows[0].issues.includes('missingDestination'),false);
  assert.equal(rows[4].issues.includes('missingDestination'),true);
  assert.equal(rows[5].issues.includes('ambiguousService'),true);
  assert.equal(rows[5].destinationService,null); assert.equal(rows[6].destinationService,null);
  assert.notEqual(rows[0].routeKey,rows[3].routeKey); assert.notEqual(rows[0].routeKey,rows[4].routeKey);
  assert.equal(r.destinations[0].concluded,2); assert.equal(r.destinations[0].completedVia,1); assert.equal(r.destinations[0].completedService,1);
  assert.equal(r.destinations[1].concluded,1); assert.equal(r.destinations[1].stopped,1); assert.equal(r.destinations[1].cancelled,1); assert.equal(r.destinations[1].clientDelayMinutes,10);
  assert.deepEqual(svc.detailPage(r,{group:'destination',groupKey:'lathe',state:'CONCLUIDO',filter:'destination_service'}).rows.map(r=>r.id),[101]);
  assert.equal(svc.detailPage(r,{filter:'quality',issue:'missingDestination'}).total,1);
  const ExcelJS=require('exceljs'), w=new ExcelJS.Workbook();await w.xlsx.load(await exportsModule.exportExcel(r));
  assert.equal(w.getWorksheet('Movimientos').getCell('H6').value,'Torno');
  assert.equal(w.getWorksheet('Movimientos').getCell('AC6').value,null);
  assert.equal(w.getWorksheet('Movimientos').getCell('AD6').value,'Servicio marcado en la solicitud');
  assert.equal(w.getWorksheet('Torno y lavado').getCell('M6').value,1);
  const html=exportsModule.reportHtml(r);assert.ok(html.includes('Identificadas por servicio marcado'));
});

test('días por cliente convierten 24 horas, reconcilian grupos y no duplican incidentes simultáneos', async () => {
  const incident = (id, start, end) => ({ id, descripcion: 'Incidente', estado: 'RESUELTO', fechaInicio: D(start), fechaFin: D(end) });
  const rows = [
    a.prepareRow(input({ estado: 'DETENIDO', fechaFin: D('2026-09-03T13:00:00Z'), incidentes: [
      incident(1, '2026-09-01T13:00:00Z', '2026-09-03T01:00:00Z'),
      incident(2, '2026-09-02T13:00:00Z', '2026-09-03T01:00:00Z'),
    ] })),
    a.prepareRow(input({ id: 2, estado: 'CANCELADO', cliente: { id: 8, nombre: 'Cliente B' }, fechaFin: D('2026-09-02T13:00:00Z') })),
  ];
  const r = { ...report(), ...a.analyze(rows, [], 60), rows, retries: analyzeRetries(rows), destinations: analyzeDestinations(rows, 60) };
  assert.equal(r.summary.clientDelayDays, 3); assert.equal(r.summary.incidentDays, 1.5);
  assert.equal(r.clients.find(c => c.clientId === 7).incidentMinutes, 2160);
  assert.equal(r.clients.reduce((s, c) => s + c.clientDelayDays, 0), r.summary.clientDelayDays);
  assert.equal(r.clients.reduce((s, c) => s + c.incidentDays, 0), r.summary.incidentDays);
  assert.equal(a.equivalentDays(1440), 1); assert.equal(a.equivalentDays(0), 0); assert.equal(a.equivalentDays(null), null);
  const Excel = require('exceljs'); const w = new Excel.Workbook(); await w.xlsx.load(await exportsModule.exportExcel(r));
  const sheet = w.getWorksheet('Retraso del cliente');
  assert.equal(sheet.getCell('C6').value, 2160); assert.deepEqual(sheet.getCell('D6').value, { formula: 'C6/1440', result: 1.5 });
  assert.equal(sheet.getCell('E6').value, 2880); assert.deepEqual(sheet.getCell('F6').value, { formula: 'E6/1440', result: 2 });
  assert.equal(w.getWorksheet('Movimientos').getCell('AE6').value, 2);
  const html = exportsModule.reportHtml(r);
  assert.ok(html.includes('1.5 días\n2,160 min')); assert.ok(html.includes('2 días\n2,880 min')); assert.ok(html.includes('1 día = 1,440 minutos'));
});
test('días distinguen intervalos ausentes, parciales y cero calculado por cliente', () => {
  const invalid = { id: 1, descripcion: 'Sin cierre', estado: 'CERRADO', fechaInicio: D('2026-09-01T13:00:00Z'), fechaFin: null };
  const missing = a.prepareRow(input({ estado: 'CANCELADO', fechaInicio: null, incidentes: [invalid] }));
  const s = a.summarize([missing], 60);
  assert.equal(s.clientDelayDays, null); assert.equal(s.incidentDays, null); assert.equal(s.incidentTimeMissing, 1);
  const noIncidentDates = a.summarize([a.prepareRow(input({ incidentes: [invalid] }))], 60);
  assert.equal(noIncidentDates.incidentDays, null); assert.equal(noIncidentDates.incidentTimeMissing, 1);
  const zero = a.prepareRow(input({ estado: 'CANCELADO', fechaFin: D('2026-09-01T13:00:00Z'), incidentes: [{ ...invalid, fechaFin: D('2026-09-01T14:00:00Z') }] }));
  assert.equal(a.summarize([zero], 60).clientDelayDays, 0); assert.equal(a.summarize([zero], 60).incidentDays, 0);
  const partial = a.summarize([missing, zero], 60);
  assert.equal(partial.clientDelayDays, 0); assert.equal(partial.clientDelayMissing, 1); assert.equal(partial.incidentDays, 0); assert.equal(partial.incidentTimeMissing, 1);
});
