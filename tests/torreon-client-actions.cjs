// Model tests use only in-memory adapters. Never connect to a database.
const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');
const clone = value => structuredClone(value);
const roles = ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR'];
const rows = new Map();
const audits = [];
const writes = [];
const incidents = [];
let unit, onLock, compareConflict, locks;
const tx = {
  $queryRaw: async () => { locks++; onLock?.(); return []; },
  movimientoTorreonFerro: {
    findUnique: async ({ where, include }) => {
      const row = rows.get(where.id);
      return row ? { ...clone(row), ...(include ? { unidad: unit ? clone(unit) : null, incidentes: incidents.filter(i => i.movimientoId === row.id).map(clone) } : {}) } : null;
    },
    updateMany: async ({ where, data }) => {
      const row = rows.get(where.id);
      if (compareConflict || !row || row.estado !== where.estado || row.updatedAt.getTime() !== where.updatedAt.getTime()
        || ('fechaInicio' in where && row.fechaInicio !== where.fechaInicio)
        || ('empresaId' in where && row.empresaId !== where.empresaId)
        || ('localidadId' in where && row.localidadId !== where.localidadId)) return { count: 0 };
      writes.push({ where: clone(where), data: clone(data) });
      Object.assign(row, clone(data)); row.updatedAt = new Date(row.updatedAt.getTime() + 1);
      return { count: 1 };
    },
    count: async ({ where }) => [...rows.values()].filter(row => row.unidadId === where.unidadId && !where.estado.notIn.includes(row.estado)).length,
  },
  unidadAtencionTorreon: {
    findUnique: async () => unit ? { ...clone(unit), movimientos: [...rows.values()].map(clone), incidentes: incidents.map(clone) } : null,
    findMany: async ({ where }) => unit && unit.localidadId === where.localidadId && (typeof where.estado === 'string' ? unit.estado === where.estado : where.estado.in ? where.estado.in.includes(unit.estado) : !where.estado.notIn.includes(unit.estado))
      ? [{ ...clone(unit), movimientos: [...rows.values()].map(clone), incidentes: incidents.map(clone) }] : [],
    update: async ({ data }) => Object.assign(unit, clone(data)),
  },
  incidenteTorreonFerro: {
    findFirst: async ({ where }) => incidents.find(i => i.estado === where.estado && i.localidadId === where.localidadId && where.OR.some(part =>
      part.unidadId === i.unidadId || part.movimientoId?.in.includes(i.movimientoId) || (part.viaBloqueadaId && part.viaBloqueadaId === i.viaBloqueadaId))) ?? null,
  },
  bitacoraNaturalTorreon: {
    create: async ({ data }) => { audits.push(clone(data)); return data; },
    findMany: async () => [],
  },
};
const db = { ...tx, $transaction: async run => run(tx) };
const load = loader({
  'ms_torreon/src/db/prisma': { prismaTorreon: db },
  'ms_torreon/src/utils/imagenesTorreon': { guardarFotoTorreon() { throw new Error('Unexpected photo write'); } },
  'ms_torreon/src/modules/incidentes/incidente.model': { IncidenteModel: {} },
});
const model = load('ms_torreon/src/modules/movimientos/movimiento.model.ts').MovimientoModel;
const queue = load('ms_torreon/src/modules/cola/cola.model.ts').ColaNaturalModel;
const clock = load('ms_torreon/src/modules/cola/cola.time.ts').calcularTiempoNatural;
const schemas = load('ms_torreon/src/modules/movimientos/movimiento.schemas.ts');
function reset() {
  rows.clear(); audits.length = 0; writes.length = 0; incidents.length = 0; onLock = null; compareConflict = false; locks = 0;
  unit = { id: 77, localidadId: 2, estado: 'PENDIENTE', fechaInicio: null, modalidad: 'CONJUNTO', operadorId: 42, ordenManual: -10 };
  for (const id of [1, 2]) rows.set(id, {
    id, unidadId: 77, localidadId: 2, empresaId: 3, creadoPorId: 8, clienteId: 7,
    estado: 'SOLICITADO', operadorId: 42, fechaSolicitud: new Date(1), fechaInicio: null,
    fechaFin: null, updatedAt: new Date(1), locomotiveNumber: 100 + id,
    viaOrigenId: 8, viaDestinoId: 9, seccionOrigenId: null, seccionDestinoId: null,
    tipoMovimiento: 'MD_TRABAJANDO', poloOrigen: null, poloDestino: null,
    instrucciones: 'Original',
  });
}
const change = (action, actor) => action === 'editar'
  ? model.editar(1, schemas.editMovimientoSchema.parse({ instrucciones: 'Corregida' }), actor)
  : model.cancelar(1, 'Solicitud duplicada', actor);
async function rejected(action, actor, status) {
  await assert.rejects(() => change(action, actor), error => error.status === status);
  assert.equal(writes.length, 0, 'Rejected actions never write the movement');
  assert.equal(audits.length, 0, 'Rejected actions never create an audit');
}
async function main() {
  for (const rol of roles) {
    const actor = { id: 7, rol, empresaId: 3, localidadId: 2 };
    for (const ownership of [{ clienteId: 7, creadoPorId: 8 }, { clienteId: 8, creadoPorId: 7 }]) {
      reset(); Object.assign(rows.get(1), ownership);
      const sibling = clone(rows.get(2));
      assert.equal((await model.obtenerEdicion(1, actor)).editable, true);
      await model.editar(1, { instrucciones: 'Corregida' }, actor);
      assert.equal(rows.get(1).instrucciones, 'Corregida');
      assert.equal(rows.get(1).poloOrigen, null); assert.equal(rows.get(1).poloDestino, null);
      assert.deepEqual(rows.get(2), sibling); assert.equal(rows.get(1).unidadId, 77);
      assert.equal(rows.get(1).operadorId, 42); assert.equal(unit.ordenManual, -10);
      assert.equal(writes[0].where.fechaInicio, null);
      assert.equal(audits[0].accion, 'EDITAR_SOLICITUD'); assert.equal(audits[0].usuarioId, 7);
      await model.cancelar(1, 'Solicitud duplicada', actor);
      assert.equal(rows.get(1).estado, 'CANCELADO'); assert.equal(rows.get(1).finalizado, true);
      assert.deepEqual(rows.get(2), sibling); assert.equal(unit.estado, 'PENDIENTE');
      assert.equal(audits.at(-1).accion, 'CANCELAR_SOLICITUD');
      assert.equal(audits.at(-1).datos.razon, 'Solicitud duplicada');
      const previous = clone(rows.get(1)), auditCount = audits.length;
      await assert.rejects(() => model.cancelar(1, 'Otro intento', actor), error => error.status === 409);
      assert.deepEqual(rows.get(1), previous); assert.equal(audits.length, auditCount);
      await model.cancelar(2, 'Última solicitud', actor);
      assert.equal(unit.estado, 'CANCELADA'); assert.ok(unit.fechaFin instanceof Date);
    }
    for (const action of ['editar', 'cancelar']) {
      reset(); rows.get(1).clienteId = 9; rows.get(1).creadoPorId = 10;
      if (action === 'editar') await rejected(action, actor, 403);
      else { await change(action, actor); assert.equal(rows.get(1).estado, 'CANCELADO', 'Another creator in the same company is cancelable'); }
      await assert.rejects(() => model.obtenerEdicion(1, actor), error => error.status === 403);
      for (const estado of ['EN_PROCESO', 'CONCLUIDO', 'CANCELADO', ...(action === 'editar' ? ['DETENIDO'] : [])]) {
        reset(); rows.get(1).estado = estado;
        assert.equal((await model.obtenerEdicion(1, actor)).editable, false);
        await rejected(action, actor, 409);
      }
      for (const state of ['EN_PROCESO', 'CONCLUIDA', 'CANCELADA', ...(action === 'editar' ? ['DETENIDA', 'LISTA_REANUDAR'] : [])]) {
        reset(); unit.estado = state;
        assert.equal((await model.obtenerEdicion(1, actor)).editable, false);
        await rejected(action, actor, 409);
      }
      for (const inconsistent of ['missing-unit', ...(action === 'editar' ? ['movement-start', 'unit-start'] : [])]) {
        reset();
        if (inconsistent === 'movement-start') rows.get(1).fechaInicio = new Date(1);
        if (inconsistent === 'unit-start') unit.fechaInicio = new Date(1);
        if (inconsistent === 'missing-unit') unit = null;
        assert.equal((await model.obtenerEdicion(1, actor)).editable, false);
        await rejected(action, actor, 409);
      }
      for (const race of ['state', 'unit', ...(action === 'editar' ? ['date', 'owner'] : ['company', 'locality', 'sibling'])]) {
        reset(); onLock = () => {
          if (race === 'state') rows.get(1).estado = 'EN_PROCESO';
          if (race === 'date') rows.get(1).fechaInicio = new Date(1);
          if (race === 'unit') { unit.estado = 'EN_PROCESO'; unit.fechaInicio = new Date(1); }
          if (race === 'sibling') rows.get(2).estado = 'EN_PROCESO';
          if (race === 'company') rows.get(1).empresaId = 4;
          if (race === 'locality') rows.get(1).localidadId = 8;
          if (race === 'owner') { rows.get(1).clienteId = 9; rows.get(1).creadoPorId = 10; }
        };
        await rejected(action, actor, ['owner', 'company', 'locality'].includes(race) ? 403 : 409);
        assert.equal(locks, 1, 'The model rereads ownership and start state after the locality lock');
      }
      if (action === 'cancelar') {
        for (const scope of [{ empresaId: 4 }, { localidadId: 8 }, { empresaId: undefined }, { localidadId: undefined }]) {
          reset(); await rejected(action, { ...actor, ...scope }, 403);
        }
      }
      reset(); compareConflict = true; await rejected(action, actor, 409);
      reset(); rows.get(1).estado = 'ASIGNADO'; await change(action, actor);
      assert.equal(writes.length, 1, 'Assigned but not started requests remain editable/cancelable');
    }
  }
  // The screenshot case: resolved stopped work remains DETENIDO with its original start.
  for (const rol of roles) {
    const actor = { id: 7, rol, empresaId: 3, localidadId: 2 };
    for (const state of ['PENDIENTE', 'DETENIDA', 'LISTA_REANUDAR']) {
      reset(); unit.estado = state; unit.fechaInicio = new Date(Date.now() - 3600000);
      for (const row of rows.values()) Object.assign(row, { estado: 'DETENIDO', fechaInicio: unit.fechaInicio, fechaPausa: new Date(Date.now() - 1800000) });
      rows.get(2).empresaId = 4;
      incidents.push({ id: 51, unidadId: unit.id, movimientoId: 1, localidadId: 2, estado: state === 'DETENIDA' ? 'ABIERTO' : 'RESUELTO', fechaInicio: rows.get(1).fechaPausa, fotos: [{ id: 52, url: 'historical-evidence.jpeg' }] });
      const sibling = clone(rows.get(2)), previousUnit = clone(unit), evidence = clone(incidents);
      assert.equal((await model.obtenerEdicion(1, actor)).editable, false, 'Historical starts never become editable');
      await model.cancelar(1, 'No continuar trabajo', actor);
      const canceled = rows.get(1);
      assert.equal(canceled.estado, 'CANCELADO'); assert.equal(canceled.fechaPausa.getTime(), sibling.fechaPausa.getTime());
      assert.equal(canceled.fechaInicio.getTime(), previousUnit.fechaInicio.getTime());
      assert.ok(canceled.fechaFin instanceof Date);
      assert.deepEqual(rows.get(2), sibling, 'Other-company sibling and execution history stay untouched');
      assert.deepEqual(unit, previousUnit, 'Partial cancellation preserves unit state, operator and manual order');
      assert.deepEqual(incidents, evidence, 'Cancellation never resolves an incident or removes its photo');
      assert.equal('fechaInicio' in writes[0].where, false, 'CAS checks current state/version rather than forbidding historical start');
      assert.equal(writes[0].where.empresaId, 3); assert.equal(writes[0].where.localidadId, 2);
      const active = await queue.listar(2); assert.equal(active.length, 1);
      if (state === 'DETENIDA') { assert.equal(active[0].disponible, false); assert.equal(active[0].incidenteBloqueanteId, 51); }
      const frozen = { ...canceled, incidentes: incidents };
      const now = clock(frozen, [], new Date(canceled.fechaFin));
      const later = clock(frozen, [], new Date(canceled.fechaFin.getTime() + 600000));
      assert.equal(now.tiempoActivoSegundos, later.tiempoActivoSegundos);
      assert.equal(now.tiempoTotalSegundos, later.tiempoTotalSegundos);
      assert.ok(now.tiempoActivoSegundos > 0, 'Work already performed remains accounted for after cancellation');
      await model.cancelar(2, 'Última solicitud', { ...actor, empresaId: 4 });
      assert.equal(unit.estado, 'CANCELADA');
      assert.equal((await queue.listar(2)).length, 0, 'Last canceled member leaves no active unit');
      assert.equal((await queue.listar(2, undefined, true)).length, 1, 'Closed unit remains in history');
      assert.deepEqual(incidents, evidence, 'Even the final cancellation retains the real incident until confirmation');
    }
    reset(); unit.estado = 'LISTA_REANUDAR'; unit.fechaInicio = new Date(Date.now() - 3600000);
    Object.assign(rows.get(1), { estado: 'DETENIDO', fechaInicio: unit.fechaInicio, fechaPausa: new Date(Date.now() - 1800000) });
    const beforeCancel = clock(rows.get(1), []);
    const pause = rows.get(1).fechaPausa.getTime();
    await model.cancelar(1, 'Legado sin bitácora', actor);
    const afterCancel = clock(rows.get(1), [], new Date(rows.get(1).fechaFin.getTime() + 600000));
    assert.equal(rows.get(1).fechaPausa.getTime(), pause);
    assert.equal(afterCancel.tiempoActivoSegundos, beforeCancel.tiempoActivoSegundos, 'Canceling a legacy pause does not turn waiting time into performed work');
    reset(); rows.get(1).fechaInicio = new Date(1); unit.fechaInicio = new Date(1);
    await model.cancelar(1, 'Fecha histórica no es trabajo activo', actor);
    reset(); rows.get(1).estado = 'DETENIDO'; unit.estado = 'LISTA_REANUDAR'; rows.get(2).estado = 'EN_PROCESO';
    await rejected('cancelar', actor, 409);
  }
  reset(); rows.get(1).estado = 'CANCELADO';
  await model.cancelar(1, 'Existing administrative retry', { id: 99, rol: 'ADMINISTRADOR' });
  assert.equal(writes.length, 0); assert.equal(audits.length, 0, 'Operational idempotence is unchanged');
  reset(); await model.editar(1, { instrucciones: 'Administrator edit' }, { id: 99, rol: 'ADMINISTRADOR' });
  assert.equal(writes.length, 1, 'Existing administrator access is unchanged');
  for (const field of ['estado', 'empresaId', 'localidadId', 'clienteId', 'creadoPorId', 'operadorId', 'unidadId', 'fechaInicio']) {
    assert.equal(schemas.editMovimientoSchema.safeParse({ [field]: 9 }).success, false);
  }
  let received;
  const controller = loader({
    'ms_torreon/src/modules/movimientos/movimiento.model': { MovimientoModel: { obtenerEdicion: async (...args) => { received = args; return { editable: true }; } } },
  })('ms_torreon/src/modules/movimientos/movimiento.controller.ts').MovimientoController;
  await invoke(controller.obtenerEdicion, { params: { id: '1' }, headers: { 'x-user-id': '7', 'x-user-rol': 'CLIENTE' } });
  assert.deepEqual(JSON.parse(JSON.stringify(received)), [1, { id: 7, rol: 'CLIENTE' }]);
  console.log('PASS Torreón client actions: 3 client roles edit own requests, cancel same-company/locality requests; cancel pending/stopped/ready by current state, edit only before start; canceled retry409; locked state/owner races and CAS; individual group cancellation/audit; legacy partial edits; operational behavior preserved; controller forwards verified actor');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
