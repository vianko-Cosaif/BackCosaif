const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
const load = loader();
const instructions = load('src/models/Movimientos/movimiento.instructions.ts');
const { parseMetaFromInstrucciones } = load('src/models/Movimientos/movimiento.meta.ts');
const { presentarInstrucciones, presentarInstruccionesMovimiento } = load('src/middlewares/movementInstructions.ts');

const operation = 'De la via 21 para la via 10 (seccion 1) Meter retrocediendo hasta dentro';
const legacy = `[META DESTINO:10] [META DESTINO:1] ${operation} | Incidente #1547 no resuelto para movimiento #14130. Reprogramado en movimiento #14133.`;
assert.equal(instructions.instruccionesParaNuevoIntento(legacy), `[META DESTINO:10] ${operation}`);
assert.equal(instructions.instruccionesVisibles(legacy), `${operation} | No realizado por incidente. Reprogramado como #14133.`);

let text = legacy;
for (let index = 0; index < 20; index++) {
  const original = instructions.instruccionesConResultadoIncidente(text, `No realizado por incidente. Reprogramado en movimiento #${15000 + index}.`);
  assert.equal((original.match(/Reprogramado en movimiento/g) || []).length, 1);
  assert.ok(original.length < 200, 'Automatic history must not grow across attempts');
  text = instructions.instruccionesParaNuevoIntento(original);
  assert.equal(text, `[META DESTINO:10] ${operation}`);
}

const positioned = `[META DESTINO:10|SECCION:1|LIBERAR] ${operation} | Incidente #1 no resuelto para movimiento #2. Movimiento reprogramado en ronda 9, posición 2. | Incidente #1 no resuelto para movimiento #2. Movimiento reprogramado en ronda 3, posición 1.`;
const clean = instructions.instruccionesParaNuevoIntento(positioned);
assert.deepEqual(JSON.parse(JSON.stringify(parseMetaFromInstrucciones(clean))), { destinoId: 10, seccion: 1, liberar: true });
assert.equal(instructions.instruccionesVisibles(positioned), operation);
assert.equal(instructions.instruccionesParaNuevoIntento('Revisar incidente reportado por operador | Esperar autorización.'), 'Revisar incidente reportado por operador | Esperar autorización.');
for (const note of ['Movimiento reprogramado para mañana; esperar autorización.', 'No aceptar Cancelado por 3 incidentes sin validar con supervisor.']) {
  assert.equal(instructions.instruccionesVisibles(note), note);
  assert.equal(instructions.instruccionesParaNuevoIntento(note), note);
}
assert.equal(instructions.instruccionesVisibles(`${operation} | Cancelado tras 3 incidentes en la misma solicitud para la locomotora #99.`), `${operation} | Cancelado por 3 incidentes.`);
assert.equal(instructions.instruccionesVisibles(null), null);

const date = new Date('2026-10-01T12:00:00Z');
const payload = { data: [{ id: 7, movimiento: { id: 2, instrucciones: positioned, createdAt: date } }], meta: { page: 2, total: 10 } };
const view = presentarInstrucciones(payload);
assert.equal(view.data[0].movimiento.instrucciones, operation);
assert.equal(view.data[0].movimiento.meta.seccion, 1);
assert.equal(view.data[0].movimiento.createdAt, date);
assert.equal(view.meta.total, 10);
assert.equal(payload.data[0].movimiento.instrucciones, positioned, 'Presentation must not mutate internal records');
assert.deepEqual(JSON.parse(JSON.stringify(presentarInstrucciones(view))), JSON.parse(JSON.stringify(view)));
let sent;
const res = { json(value) { sent = value; return this; } };
let nextCalled = false;
presentarInstruccionesMovimiento({}, res, () => { nextCalled = true; });
assert.equal(res.json(payload), res);
assert.equal(nextCalled, true);
assert.equal(sent.data[0].movimiento.instrucciones, operation);
const torreon = { source: 'torreon', instrucciones: '[META ORIGEN:3] Servicio de Torreón' };
assert.equal(presentarInstrucciones(torreon), torreon);
presentarInstruccionesMovimiento({ path: '/7/edicion' }, { json() { throw new Error('Must not format the edit contract'); } }, () => {});
console.log('PASS movement instructions: legacy cleanup, bounded repeated attempts, metadata, operator notes and HTTP presentation');
