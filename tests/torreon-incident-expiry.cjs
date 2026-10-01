const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
const now = new Date('2026-10-01T12:00:00Z');
const original = { id: 10, empresaId: 4, localidadId: 2, clientRequestId: null, estado: 'DETENIDO', finalizado: false, viaOrigenId: 11, viaDestinoId: 12, seccionOrigenId: 3, seccionDestinoId: 5, prioridad: 'ALTA', locomotiveNumber: 80, instrucciones: 'Mover al taller', operadorId: 8, creadoPorId: 7, clienteId: 7 };
function fixture({ minutes = 10, attempts = 1, claim = true, terminal = false, fail = false } = {}) {
  let state = { incident: { id: 50, estado: 'ABIERTO', fechaInicio: new Date(now.getTime() - minutes * 60000), localidadId: 2, movimientoId: 10 }, movement: { ...original, ...(terminal ? { estado: 'CANCELADO', finalizado: true } : {}), ...(attempts > 1 ? { clientRequestId: 'incident-retry:49' } : {}) }, created: [], round: { id: 60, movimientoId: 10, fechaInicio: new Date(), estado: 'BLOQUEADO' } };
  let scanned = 0, tick, released = [], stopped = false;
  const tx = {
    incidenteTorreonFerro: {
      findUnique: async ({where}) => where.id === 50 ? { ...state.incident, movimiento: state.movement } : {id:49, localidadId:2, movimientoId:9, movimiento:{id:9, empresaId:4, localidadId:2,clientRequestId:null}},
      updateMany: async ({where,data}) => { assert.equal(where.estado,'ABIERTO'); assert.equal(where.fechaInicio.lte.getTime(),now.getTime()-600000); if (!claim || state.incident.estado!=='ABIERTO') return {count:0};Object.assign(state.incident,data);return {count:1}; },
      count: async ({where}) => { assert.equal(where.movimientoId.in[0],10); if(attempts>1) assert.equal(where.movimientoId.in[1],9); return attempts; },
      update: async ({data}) => Object.assign(state.incident,data),
      findMany: async query => { scanned++;assert.equal(query.where.estado,'ABIERTO');return state.incident.estado==='ABIERTO'?[{id:50}]:[]; },
    },
    movimientoTorreonFerro: {
      create: async ({data}) => { if(fail) throw new Error('database write failed');const next={id:11,...data};state.created.push(next);return next; },
      update: async ({data}) => Object.assign(state.movement,data),
    },
    rondaTorreonMovimiento: {findFirst:async()=>state.round,update:async({data})=>Object.assign(state.round,data)},
  };
  const prisma = {...tx,$transaction: async (callback, options) => { assert.equal(options.isolationLevel,'Serializable'); const before=structuredClone(state);try{return await callback(tx);}catch(e){state=before;throw e;} }};
  const module = loader({
    'ms_torreon/src/db/prisma':{prismaTorreon:prisma},
    'ms_torreon/src/modules/rondas/ronda.model':{RondaModel:{recalcularBloqueosLocalidad:async(_tx,id)=>released.push(['natural',id]),marcarMovimientoCancelado:async(_tx,id)=>{assert.equal(id,10);state.round.estado='CANCELADO';},insertarMovimiento:async()=>assert.fail('Existing slot should be reused')}},
    'ms_torreon/src/modules/arrastres/arrastre.model':{ArrastreModel:{recalcularBloqueosLocalidad:async(_tx,id)=>released.push(['arrastre',id])}},
  }, {Date: class extends Date { constructor(value) { super(value === undefined ? now.getTime() : value); } }, setInterval: fn => {tick=fn;return{unref(){}};},clearInterval:()=>{stopped=true;}})('ms_torreon/src/modules/incidentes/incidentExpiry.ts');
  return { ...module, state:()=>state, released, scanned:()=>scanned, tick:()=>tick(), stopped:()=>stopped };
}
async function main() {
  const early=fixture({minutes:9});assert.equal((await early.expireNaturalIncident(50,now)).changed,false);assert.equal(early.state().created.length,0);
  const due=fixture();const result=await due.expireNaturalIncident(50,now);assert.equal(result.nuevoMovimientoId,11);
  const state=due.state();assert.equal(state.incident.estado,'RESUELTO');assert.match(state.incident.solucion,/CIERRE_AUTOMATICO_10_MIN: Reprogramado en movimiento #11/);
  assert.equal(state.movement.finalizado,true);assert.equal(state.movement.estado,'CANCELADO');assert.equal(state.created.length,1);
  const next=state.created[0];for(const key of ['empresaId','localidadId','viaOrigenId','viaDestinoId','seccionOrigenId','seccionDestinoId','prioridad','locomotiveNumber','clienteId'])assert.equal(next[key],original[key],key);
  assert.equal(next.clientRequestId,'incident-retry:50');assert.equal(next.operadorId,null);assert.equal(next.estado,'SOLICITADO');assert.equal(next.fechaSolicitud,now);
  assert.equal(state.round.movimientoId,11);assert.equal(state.round.fechaInicio,null);assert.equal(state.round.bloqueadoPorIncidenteId,null);
  assert.deepEqual(due.released,[['natural',2],['arrastre',2]]);
  assert.equal((await due.expireNaturalIncident(50,now)).changed,false);assert.equal(due.state().created.length,1,'Repeated expiry does not clone twice');
  const lost=fixture({claim:false});assert.equal((await lost.expireNaturalIncident(50,now)).changed,false);assert.equal(lost.state().created.length,0,'Concurrent claim loser has no writes');
  const max=fixture({attempts:3});await max.expireNaturalIncident(50,now);assert.equal(max.state().created.length,0);assert.equal(max.state().round.estado,'CANCELADO');assert.match(max.state().incident.solucion,/Cancelado tras 3 incidentes/);
  const second=fixture({attempts:2});await second.expireNaturalIncident(50,now);assert.equal(second.state().created.length,1);
  const terminal=fixture({terminal:true});await terminal.expireNaturalIncident(50,now);assert.equal(terminal.state().created.length,0);assert.equal(terminal.released.length,2,'A historical movement still releases incident route locks');
  const failed=fixture({fail:true});await assert.rejects(()=>failed.expireNaturalIncident(50,now),/database write failed/);assert.equal(failed.state().incident.estado,'ABIERTO','A failed retry rolls closure back');assert.equal(failed.state().movement.estado,'DETENIDO');
  // A new scanner consults stored open incidents immediately, without a client timer.
  const recovery=fixture();const stop=recovery.startIncidentExpiry();for(let i=0;i<20;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(recovery.scanned(),1);assert.equal(recovery.state().created.length,1);stop();assert.equal(recovery.stopped(),true);
  console.log('PASS Torreón expiry: deadline, same-patio retry, round reuse, idempotency, claim race, retry limit, rollback and restart scan');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
