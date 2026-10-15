const assert = require('node:assert/strict');
const { loader, logger } = require('./support/load-ts.cjs');
const handlers = new Map(), notices = [], realtime = [], reconciled = [];
let incident = { id:1,movimientoId:41,estado:'CERRADO',movimiento:{locomotiveNumber:1234},fechaFin:new Date(Date.now()-3600000) };
const movement = {id:42,empresaId:1,localidadId:2,clienteId:3,finalizado:true,estado:'CONCLUIDO',ronda:{id:7},instrucciones:''};
const load = loader({
  'src/lib/prisma': {prisma:{incidente:{findUnique:async()=>incident},movimiento:{findUnique:async()=>movement}}},
  'src/jobs/durableJobs': {registerJob:(kind,fn)=>handlers.set(kind,fn),isDurableJobExecution:()=>true},
  'src/utils/logger': {logger},
  'src/models/Incidente/incidente.logger': {incidenteError:logger},
  'src/models/Movimientos/Ronda/RondaModel': {RondaModel:{siguienteInteligente:async()=>reconciled.push('next'),recomponerRondasLocalidad:async()=>reconciled.push('rounds')}},
  'src/services/tornoMs/tornoMsClient': {},
  'src/services/NotificadorFCM': {NotificadorFCM:new Proxy({}, {get:(_,key)=>async()=>notices.push(key)})},
  'src/realtime/realtimeHub': {
    publishMovimientoCreadoEvent: data=>realtime.push({type:'created',...data}),
    publishMovimientoEstadoEvent: data=>realtime.push({type:'state',...data}),
    publishRealtimeEvent:data=>realtime.push(data),publishRondaReordenadaEvent:()=>{},
  },
});
const {IncidenteModel:model}=load('src/models/Incidente/IncidenteModel.ts');
(async()=>{
  const result={reutilizoRonda:true,nuevoMovimientoId:42,originalMovimientoId:41,localidadId:2};
  await model.completeReprogramming(result,incident,'test');
  assert.equal(notices.length,0,'An old reprogramming still reconciles without repeating creation push');
  assert.equal(reconciled.length,1); assert.equal(realtime.at(-1).recipientRoles.length,0); assert.equal(realtime.at(-1).estado,undefined);
  await model.completeCancelledReprogramming(result,incident,'test',3,'synthetic',incident.fechaFin);
  assert.equal(notices.length,0,'An old cancellation does not emit a fresh push');
  assert.equal(reconciled.length,3);
  model.cerrarIncidentesVencidos=async()=>{};
  model.reprogramarMovimientoPorIncidenteNoResuelto=async()=>reconciled.push('business');
  model.ensureIncidentScheduler();
  const run=handlers.get('incident.reprogram');
  await run({incidenteId:1}); assert.equal(notices.length,0); assert.equal(reconciled.at(-1),'business');
  incident={...incident,fechaFin:new Date()};
  await run({incidenteId:1}); assert.deepEqual(notices,['notificarCambioEstado']);
  incident={...incident,estado:'RESUELTO'};
  await run({incidenteId:1}); assert.equal(notices.length,1,'A resolved incident must not be announced as timed out');
  console.log('PASS incident retry: business reconciliation preserved; obsolete creation/cancellation/timeout alerts suppressed');
})().catch(error=>{console.error(error);process.exitCode=1;});
