const assert = require('node:assert/strict');
const { loader, invoke } = require('./support/load-ts.cjs');
async function main() {
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

  const rounds=loader({'ms_torreon/src/db/prisma':{prismaTorreon:{}}})('ms_torreon/src/modules/rondas/ronda.model.ts').RondaModel;
  const roundRows=[{id:10,numeroRonda:1,estado:'ABIERTA'},{id:20,numeroRonda:2,estado:'ABIERTA'}];
  const queued=(id,fechaSolicitud,rondaId,empresaId,prioridad,estado,ordenManual=null)=>({
    id,rondaId,empresaId,prioridad,estado,orden:id,ordenManual,fechaAsignado:new Date(id),
    movimiento:{id,fechaSolicitud:new Date(fechaSolicitud),estado:'SOLICITADO'},
  });
  const queue=[
    queued(14,'2026-10-08T10:04:00Z',10,4,'ALTA','ACTIVO'),
    queued(12,'2026-10-08T10:02:00Z',20,3,'BAJA','BLOQUEADO',0),
    queued(11,'2026-10-08T10:01:00Z',10,3,'BAJA','PENDIENTE',1),
    queued(13,'2026-10-08T10:03:00Z',20,4,'ALTA','PENDIENTE'),
  ];
  const updated=[],roundUpdates=[];
  const queueTx={
    rondaTorreon:{findMany:async()=>roundRows,updateMany:async args=>roundUpdates.push(args),update:async args=>roundUpdates.push(args)},
    rondaTorreonMovimiento:{findMany:async()=>queue,findFirst:async()=>({orden:14}),updateMany:async()=>({count:4}),update:async args=>updated.push(args)},
  };
  const normalized=await rounds.normalizarRondasActivas(queueTx,2);
  assert.equal(normalized.rondasActivas,1,'Solo queda una cola activa por localidad');
  assert.deepEqual(updated.map(x=>[x.where.id,x.data.rondaId,x.data.orden]),[[11,10,1],[12,10,2],[13,10,3],[14,10,4]],'Orden de llegada sin prioridad, estado ni empresa');
  assert.ok(updated.every(x=>x.data.ordenManual===null));
  assert.equal(roundUpdates.find(x=>x.where.id===10).data.estado,'EN_PROCESO');
  assert.deepEqual(roundUpdates.find(x=>x.where.id?.in).where.id.in,[20]);

  let inserted;
  const insertTx={rondaTorreonMovimiento:{create:async({data})=>{inserted=data;return data}}};
  rounds.getOrCreateActiveRonda=async()=>roundRows[0];
  rounds.resolveOrdenRonda=async()=>5;
  await rounds.insertarMovimiento(insertTx,{id:15,empresaId:3,localidadId:2,prioridad:'ALTA'});
  assert.deepEqual([inserted.rondaId,inserted.orden],[10,5],'La siguiente solicitud entra al final de la misma cola');
  await assert.rejects(()=>rounds.intercambiar({rondaAId:11,rondaBId:12}),/orden(a|e) por llegada/);
  await assert.rejects(()=>rounds.reordenarMovimiento({rondaMovimientoId:11,orden:1}),/orden(a|e) por llegada/);
  console.log('PASS Torreón natural parity: FIFO queue, edit states, route scope, snapshots, ownership');
}
main().catch(error=>{console.error(error);process.exitCode=1});
