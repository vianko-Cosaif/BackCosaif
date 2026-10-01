const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
async function main() {
  let incidents=[{id:50,movimientoId:1,localidadId:2,viaBloqueadaId:8,seccionBloqueadaId:null}];
  let writes=[];
  const rows=[
    {id:10,estado:'ACTIVO',bloqueadoPorIncidenteId:null,movimiento:{id:1,localidadId:2,viaOrigenId:7,estado:'DETENIDO'}},
    {id:11,estado:'PENDIENTE',bloqueadoPorIncidenteId:null,movimiento:{id:2,localidadId:2,viaDestinoId:8,estado:'SOLICITADO'}},
    {id:12,estado:'BLOQUEADO',bloqueadoPorIncidenteId:49,movimiento:{id:3,localidadId:2,viaDestinoId:9,estado:'EN_PROCESO'}},
  ];
  const tx={incidenteTorreonFerro:{findMany:async query=>{assert.equal(query.where.localidadId,2);return incidents}},rondaTorreon:{findMany:async query=>{assert.equal(query.where.localidadId,2);return [{id:6}]}},rondaTorreonMovimiento:{findMany:async()=>rows,update:async args=>{writes.push(args)}}};
  const rounds=loader({'ms_torreon/src/db/prisma':{prismaTorreon:{}}})('ms_torreon/src/modules/rondas/ronda.model.ts').RondaModel;
  rounds.normalizarRondasActivas=async()=>({rondasActivas:1,movimientosEnCola:3});
  await rounds.recalcularBloqueosLocalidad(tx,2);
  assert.equal(writes.find(x=>x.where.id===10).data.estado,'BLOQUEADO','Incidente propio bloquea aunque se reportó otra vía');
  assert.equal(writes.find(x=>x.where.id===11).data.estado,'BLOQUEADO','Misma ruta se bloquea');
  assert.equal(writes.find(x=>x.where.id===12).data.estado,'ACTIVO','Al liberar una ruta no se pierde el estado en proceso');
  let count=1, state='ABIERTO', calls=[];
  const incident={id:50,localidadId:2,movimientoId:1,movimiento:{id:1,estado:'DETENIDO'}};
  const serviceTx={incidenteTorreonFerro:{findUnique:async()=>({...incident,estado:state}),updateMany:async args=>{assert.equal(args.where.estado,'ABIERTO');return{count}}},movimientoTorreonFerro:{update:async args=>calls.push(['movement',args])},rondaTorreonMovimiento:{updateMany:async args=>calls.push(['round',args])}};
  const model=loader({
    'ms_torreon/src/db/prisma':{prismaTorreon:{}},
    'ms_torreon/src/utils/imagenesTorreon':{},
    'ms_torreon/src/modules/rondas/ronda.model':{RondaModel:{recalcularBloqueosLocalidad:async(_tx,id)=>calls.push(['recalc',id]),promoverMovimientoPrimero:async()=>calls.push(['promote']),marcarMovimientoCancelado:async()=>calls.push(['cancel'])}},
    'ms_torreon/src/modules/arrastres/arrastre.model':{ArrastreModel:{recalcularBloqueosLocalidad:async()=>{}}},
  })('ms_torreon/src/modules/incidentes/incidente.model.ts').IncidenteModel;
  const input={resueltoPorId:7,solucion:'Vía liberada'};
  await model.resolverTx(serviceTx,50,input);
  assert.equal(calls.find(x=>x[0]==='movement')[1].data.estado,'SOLICITADO');
  assert.equal(calls.find(x=>x[0]==='round')[1].data.fechaInicio,null,'El siguiente intento no conserva el reloj anterior');
  assert.equal(calls.find(x=>x[0]==='recalc')[1],2);
  calls=[];count=0;
  await assert.rejects(()=>model.resolverTx(serviceTx,50,input),/ya fue atendido/);
  await assert.rejects(()=>model.cerrarTx(serviceTx,50,input),/ya fue atendido/);
  assert.equal(calls.length,0,'Resolver y cancelar simultáneamente no puede modificar dos veces el movimiento');
  state='RESUELTO';await model.resolverTx(serviceTx,50,input);assert.equal(calls.length,0);
  console.log('PASS Torreón incidents: patio scope, own/route blockage, active recovery, reset round clock and concurrent resolution');
}
main().catch(error=>{console.error(error);process.exitCode=1});
