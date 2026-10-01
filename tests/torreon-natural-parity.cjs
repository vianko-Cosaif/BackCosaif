const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');
const clean = x => JSON.parse(JSON.stringify(x));
async function main() {
  const plan = loader()('ms_torreon/src/modules/rondas/naturalRoundPlan.ts').naturalRoundPlan;
  const row = (id, empresaId, prioridad = 'BAJA', estado = 'PENDIENTE') => ({ id, empresaId, prioridad, estado });
  assert.deepEqual(clean(plan([row(1,1), row(2,1), row(3,2), row(4,3), row(5,4), row(6,2)]).map(xs => xs.map(x => x.id))), [[1,3,4,5],[2,6]], 'Una baja por empresa, sin corte artificial de tres');
  assert.deepEqual(clean(plan([row(1,1), row(2,2,'ALTA'), row(3,2,'ALTA'), row(4,1)]).map(xs => xs.map(x => x.id))), [[2,3],[1],[4]], 'Altas primero y bajas por turnos');
  assert.deepEqual(clean(plan([row(1,1), row(2,2), row(3,2), row(4,1)]).map(xs => xs.map(x => x.id))), [[1,2],[4,3]], 'Alternancia entre rondas');
  for (const group of plan(Array.from({length:120}, (_,i) => row(i,i%7)))) assert.equal(new Set(group.map(x=>x.empresaId)).size,group.length);

  const stable=[{...row(1,1),round:1},{...row(3,1),round:2},{...row(4,2),round:2}];
  assert.deepEqual(clean(plan(stable,x=>x.round).map(xs=>xs.map(x=>x.id))),[[1],[4,3]], 'No adelanta otra empresa cuando termina un movimiento en R1');

  let state='SOLICITADO', updateCount=1, data, recalculated=0, cancelled=0;
  const movement=()=>({id:7,empresaId:3,localidadId:2,estado:state,updatedAt:new Date(0),viaOrigenId:8,viaDestinoId:9,seccionOrigenId:10,seccionDestinoId:11});
  const table={findUnique:async()=>movement(),updateMany:async args=>{data=args;return {count:updateCount}}};
  const tx={movimientoTorreonFerro:table,rondaTorreonMovimiento:{updateMany:async()=>({count:1})}};
  const model=loader({
    'ms_torreon/src/db/prisma':{prismaTorreon:{...tx,$transaction:async fn=>fn(tx)}},
    'ms_torreon/src/utils/imagenesTorreon':{guardarFotoTorreon(){throw Error('No photos in edit')}},
    'ms_torreon/src/modules/rondas/ronda.model':{RondaModel:{marcarMovimientoCancelado:async()=>{cancelled++},recalcularBloqueosLocalidad:async()=>{recalculated++}}},
  })('ms_torreon/src/modules/movimientos/movimiento.model.ts').MovimientoModel;
  for (state of ['SOLICITADO','ASIGNADO']) {
    assert.equal((await model.obtenerEdicion(7)).editable,true);
    await model.editar(7,{viaDestinoId:12}); assert.equal(data.where.estado,state);
  }
  assert.equal(recalculated,2,'Se recalculan bloqueos al cambiar recorrido');
  for (state of ['EN_PROCESO','DETENIDO','CONCLUIDO','CANCELADO']) {
    assert.equal((await model.obtenerEdicion(7)).editable,false);
    await assert.rejects(()=>model.editar(7,{locomotiveNumber:9}),/no puede editarse/);
  }
  state='SOLICITADO';updateCount=0;
  await assert.rejects(()=>model.editar(7,{locomotiveNumber:9}),/cambió/);

  const prepare=loader({
    'src/lib/servicePrisma':{prismaTorreon:{movimientoTorreonFerro:{findUnique:async()=>movement()}}},
    'src/lib/prisma':{prisma:{via:{findUnique:async({where})=>({id:where.id,localidadId:where.id===99?1:2,nombre:`Via ${where.id}`})},seccionVia:{findUnique:async({where})=>({id:where.id,viaId:where.id===11?9:8,numero:1,nombre:'Sección'})}}},
  })('src/services/torreonMs/prepareNaturalEdit.ts').prepareNaturalEdit;
  await assert.rejects(()=>prepare(7,{viaDestinoId:99}),error=>error.status===403);
  await assert.rejects(()=>prepare(7,{viaDestinoId:9,seccionDestinoId:10}),error=>error.status===403);
  const edited=await prepare(7,{viaDestinoId:12,viaDestinoNombreSnapshot:'Spoof'});
  assert.equal(edited.viaDestinoNombreSnapshot,'Via 12'); assert.equal(edited.seccionDestinoId,null);
  assert.equal((await prepare(7,{viaDestinoNombreSnapshot:'Spoof'})).viaDestinoNombreSnapshot,undefined);

  const scope=loader({'src/lib/servicePrisma':{prismaTorreon:{rondaTorreonMovimiento:{findMany:async()=>[{movimiento:{empresaId:3,localidadId:2}},{movimiento:{empresaId:4,localidadId:2}}]}}}})('src/auth/torreonScope.ts').requireTorreonScope;
  const request={user:{id:7,rol:'CLIENTE',empresa:{id:3},localidad:{id:2}},method:'PATCH',path:'/rondas/intercambiar-movimientos',body:{rondaAId:1,rondaBId:2}};
  assert.equal((await invoke(scope,request)).statusCode,403,'No se intercambian movimientos ajenos aunque estén visibles en la cola');
  updateCount=1;state='SOLICITADO';
  await model.cancelar(7,'Duplicado');
  assert.equal(data.data.estado,'CANCELADO'); assert.equal(data.data.finalizado,true); assert.equal(cancelled,1);
  for(state of ['EN_PROCESO','DETENIDO','CONCLUIDO']) await assert.rejects(()=>model.cancelar(7,'Duplicado'),/pendientes/);
  state='CANCELADO';await model.cancelar(7,'Duplicado');assert.equal(cancelled,1,'Cancelar otra vez es idempotente');
  state='SOLICITADO';updateCount=0;await assert.rejects(()=>model.cancelar(7,'Duplicado'),/cambió/);assert.equal(cancelled,1);
  const schemas = loader()('ms_torreon/src/modules/movimientos/movimiento.schemas.ts');
  assert.equal(schemas.iniciarMovimientoSchema.parse({iniciadoPorId:7}).fotos.length,0);
  assert.equal(schemas.finalizarMovimientoSchema.parse({finalizadoPorId:7}).fotos.length,0);
  assert.throws(()=>schemas.registrarFotosMovimientoSchema.parse({tomadaPorId:7,tipo:'ANTES_MOVIMIENTO'}));
  const photo={url:'https://example.invalid/photo.jpg'};
  assert.throws(()=>schemas.iniciarMovimientoSchema.parse({iniciadoPorId:7,fotos:Array(5).fill(photo)}));

  let ownership = [{empresaId:3,localidadId:2},{empresaId:3,localidadId:2}];
  const ownScope = loader({'src/lib/servicePrisma':{prismaTorreon:{rondaTorreonMovimiento:{findMany:async()=>ownership.map(movimiento=>({movimiento}))}}}})('src/auth/torreonScope.ts').requireTorreonScope;
  let ownRequest={...request,body:{rondaAId:1,rondaBId:2}};
  assert.equal((await invoke(ownScope,ownRequest)).allowed,true);
  assert.equal(ownRequest.body.empresaId,3,'La empresa se impone desde la sesión');
  ownership[1].localidadId=1;
  assert.equal((await invoke(ownScope,{...request,body:{rondaAId:1,rondaBId:2}})).statusCode,403);

  let ownerId=7;
  const cancelScope=loader({'src/lib/servicePrisma':{prismaTorreon:{movimientoTorreonFerro:{findUnique:async()=>({empresaId:3,localidadId:2,clienteId:ownerId,creadoPorId:ownerId})}}}})('src/auth/torreonScope.ts').requireTorreonScope;
  const cancellation={...request,path:'/movimientos/7/cancelar',body:{razon:'Duplicado'}};
  assert.equal((await invoke(cancelScope,cancellation)).allowed,true);
  ownerId=8;assert.equal((await invoke(cancelScope,cancellation)).statusCode,403,'Cancelar requiere ser propietario incluso dentro de la empresa');

  const via={id:8,localidadId:2,nombre:'Vía 8'};
  const sections={10:{id:10,viaId:8,numero:2,nombre:'Sección 2'},11:{id:11,viaId:9,numero:3,nombre:'Sección 3'}};
  const helpers=loader({
    'src/lib/servicePrisma':{prismaTorreon:{movimientoTorreonFerro:{findUnique:async()=>movement()}}},
    'src/lib/prisma':{prisma:{via:{findUnique:async({where})=>({...via,id:where.id})},seccionVia:{findUnique:async({where})=>where.id?sections[where.id]:Object.values(sections).find(s=>s.viaId===where.viaId_numero.viaId&&s.numero===where.viaId_numero.numero)}}},
  })('src/services/torreonMs/prepareNaturalEdit.ts');
  const enriched=await helpers.enrichNaturalEdit({editableKeys:[],movimiento:movement()});
  assert.match(enriched.movimiento.instrucciones,/ORIGEN:2/);
  assert.match(enriched.movimiento.instrucciones,/DESTINO:3/);
  const prepared=await helpers.prepareNaturalEdit(7,{instrucciones:enriched.movimiento.instrucciones});
  assert.equal(prepared.seccionOrigenId,10); assert.equal(prepared.seccionDestinoId,11);
  assert.equal((await helpers.prepareNaturalEdit(7,{instrucciones:'Sin sección'})).seccionOrigenId,null);
  await assert.rejects(()=>helpers.prepareNaturalEdit(7,{viaOrigenId:9,instrucciones:'[META ORIGEN:2]'}),e=>e.status===400);

  const pending=(id,empresaId=3,localidadId=2,estado='PENDIENTE')=>({id,empresaId,estado,orden:id,ordenManual:null,prioridad:'BAJA',fechaAsignado:new Date(id),ronda:{localidadId,estado:'ABIERTA'},movimiento:{id,fechaSolicitud:new Date(id),estado:'SOLICITADO'}});
  let pair=[pending(1),pending(3)], writes=[], normalized=0;
  const all=[pair[0],pending(2,4),pair[1]];
  const swapTx={rondaTorreonMovimiento:{findMany:async args=>args.include.ronda?pair:all,aggregate:async()=>({_max:{orden:3}}),update:async args=>{writes.push(args);return args}}};
  const rounds=loader({'ms_torreon/src/db/prisma':{prismaTorreon:{$transaction:async fn=>fn(swapTx)}}})('ms_torreon/src/modules/rondas/ronda.model.ts').RondaModel;
  rounds.normalizarRondasActivas=async()=>{normalized++};
  await rounds.intercambiar({rondaAId:1,rondaBId:3,empresaId:3});
  assert.deepEqual(writes.filter(x=>x.data.ordenManual).map(x=>[x.where.id,x.data.ordenManual]),[[3,1],[2,2],[1,3]],'Intercambiar movimientos propios conserva la posición de otra empresa');
  assert.equal(normalized,1);
  writes=[]; pair[1].ronda.localidadId=1;
  await assert.rejects(()=>rounds.intercambiar({rondaAId:1,rondaBId:3,empresaId:3}),/localidades/);
  pair[1].ronda.localidadId=2; pair[1].empresaId=4;
  await assert.rejects(()=>rounds.intercambiar({rondaAId:1,rondaBId:3,empresaId:3}),/tu empresa/);
  pair[1].empresaId=3;pair[1].prioridad='ALTA';
  await assert.rejects(()=>rounds.intercambiar({rondaAId:1,rondaBId:3,empresaId:3}),/prioridad/);
  pair[1].prioridad='BAJA';pair[1].movimiento.estado='EN_PROCESO';
  await assert.rejects(()=>rounds.intercambiar({rondaAId:1,rondaBId:3,empresaId:3}),/pendientes/);
  assert.equal(writes.length,0);
  let insertedRound, createdRound;
  const activeRounds=[{id:10,numeroRonda:1,movimientos:[{empresaId:3,prioridad:'BAJA'}]},{id:20,numeroRonda:2,movimientos:[{empresaId:3,prioridad:'BAJA'}]}];
  const insertTx={rondaTorreon:{findMany:async()=>activeRounds,create:async({data})=>{createdRound=data;return{id:30,...data}}},rondaTorreonMovimiento:{create:async({data})=>{insertedRound=data.rondaId;return data}}};
  rounds.getOrCreateActiveRonda=async()=>activeRounds[1];rounds.resolveOrdenRonda=async()=>1;
  await rounds.insertarMovimiento(insertTx,{id:7,empresaId:4,localidadId:2,prioridad:'BAJA'});
  assert.equal(insertedRound,10,'Una empresa nueva entra al primer turno disponible');
  await rounds.insertarMovimiento(insertTx,{id:8,empresaId:3,localidadId:2,prioridad:'BAJA'});
  assert.equal(insertedRound,30);assert.equal(createdRound.numeroRonda,3,'Una solicitud se agrega después del último turno de su empresa');
  console.log('PASS Torreón natural parity: company rounds, priority, edit states, concurrent start, route scope, snapshots, ownership');
}
main().catch(error=>{console.error(error);process.exitCode=1});
