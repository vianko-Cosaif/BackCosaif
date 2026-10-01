const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
const clean = (value) => JSON.parse(JSON.stringify(value));
const row = (id, empresaId = 3) => ({ id, empresaId, localidadId: 2, estado: 'SOLICITADO', ordenSolicitud: id, fechaSolicitud: new Date('2026-09-01T12:00:00Z'), fechaInicio: null, fechaFin: null, vagones: [{ id, orden: 1, estado: 'PENDIENTE', fechaSolicitud: new Date('2026-09-01T12:00:00Z'), fechaInicio: null, fechaFin: null }], incidentes: [] });
function modules(prisma = {}) {
  const load = loader({
    'ms_torreon/src/db/prisma': { prismaTorreon: prisma },
    'ms_torreon/src/utils/imagenesTorreon': { guardarFotoTorreon() { throw new Error('No filesystem writes in tests'); } },
    'ms_torreon/src/modules/rondas/ronda.model': { RondaModel: {} },
  });
  return { ...load('ms_torreon/src/modules/arrastres/arrastre.query.ts'), ...load('ms_torreon/src/modules/arrastres/arrastre.model.ts'), ...load('ms_torreon/src/modules/arrastres/arrastre.schemas.ts') };
}
async function main() {
  const { arrastrePageQuery, arrastrePageWhere, reordenarSolicitudesArrastreSchema } = modules();
  for (const invalid of [{page:0},{pageSize:101},{pageSize:'NaN'},{localidadId:0},{estado:'CONCLUIDO'},{vista:'historial',estado:'SOLICITADO'},{desde:'2026-09-02T00:00:00Z',hasta:'2026-09-01T00:00:00Z'}]) assert.throws(() => arrastrePageQuery.parse({localidadId:2,...invalid}));
  assert.throws(() => reordenarSolicitudesArrastreSchema.parse({arrastreIds:[1,2],direction:'up'}));
  assert.throws(() => reordenarSolicitudesArrastreSchema.parse({arrastreIds:[1,1]}));
  const query = arrastrePageQuery.parse({localidadId:2,empresaId:3,vista:'historial',page:5,pageSize:25,q:'#150',vagonEstado:'CONCLUIDO',fechaCampo:'fin',desde:'2026-09-01T00:00:00Z'});
  const where = arrastrePageWhere(query);
  assert.deepEqual(clean(where.estado),{in:['CONCLUIDO','CANCELADO']});
  assert.equal(where.localidadId,2);assert.equal(where.empresaId,3);assert.equal(where.OR[0].id,150);
  assert.equal(where.fechaFin.gte.toISOString(),'2026-09-01T00:00:00.000Z');
  assert.deepEqual(clean(where.vagones),{some:{estado:'CONCLUIDO'}});
  let selected, counted, transactionOptions, priorityWhere;
  const data = Array.from({length:25},(_,i)=>({...row(101+i),estado:'CONCLUIDO'}));
  const prisma = {
    arrastreTorreon: { findMany: async args => {selected=args;return data}, groupBy: async args => {counted=args;return [{estado:'CONCLUIDO',_count:{_all:150}}]} },
    arrastreTorreonVagon:{count:async()=>0},
    incidenteArrastreTorreon:{count:async()=>0,findFirst:async args=>{priorityWhere=args.where;return null}},
    $transaction:async (reads,options)=>{transactionOptions=options;return Promise.all(reads)},
  };
  const {ArrastreModel}=modules(prisma);
  const result=await ArrastreModel.listarPagina(query);
  assert.equal(selected.skip,100);assert.equal(selected.take,25);assert.equal(result.data[0].id,101);assert.equal(result.data[0].folioLabel,'#101');
  assert.equal(result.meta.total,150);assert.equal(result.meta.totalPages,6);
  assert.deepEqual(clean(selected.where),clean(counted.where));assert.equal(priorityWhere.arrastre.empresaId,3);
  assert.equal(transactionOptions.isolationLevel,'RepeatableRead');
  assert.equal(selected.include.incidentes.include.fotos,undefined);assert.equal(selected.include.incidentes.include.vagon,undefined);
  // Hundreds of affected wagons are updated in bounded batches with an expected-state guard.
  const updates=[];
  const wagons=Array.from({length:501},(_,i)=>({id:i+1,arrastreId:1,estado:'PENDIENTE',viaId:8}));
  wagons.push({id:700,arrastreId:1,estado:'BLOQUEADO',viaId:9},{id:701,arrastreId:1,estado:'EN_PROCESO',viaId:8});
  const tx={
    incidenteArrastreTorreon:{findMany:async()=>[{id:1,viaBloqueadaId:8}]},
    arrastreTorreon:{findMany:async()=>[{id:1}]},
    arrastreTorreonVagon:{findMany:async()=>wagons,updateMany:async args=>{updates.push(args);return {count:args.where.id.in.length}}},
  };
  await ArrastreModel.recalcularBloqueosLocalidad(tx,2);
  assert.equal(updates.length,3);assert.equal(updates[0].where.id.in.length,500);assert.equal(updates[1].where.id.in.length,1);
  assert.equal(updates[0].where.estado,'PENDIENTE');assert.equal(updates[2].where.estado,'BLOQUEADO');
  assert(!updates.some(update=>update.where.id.in.includes(701)));
  // A neighboring company keeps its queue slot. A move after page 100 sends one id, not a truncated order.
  const queue=Array.from({length:150},(_,i)=>row(i+1,i===148?4:3));
  let selectedReads=0;const writes=[];
  const reorderTx={arrastreTorreon:{
    findMany:async()=>++selectedReads===1?[queue[149]]:queue,
    update:async args=>{writes.push(clean(args));return {}},
  },incidenteArrastreTorreon:{findFirst:async()=>null}};
  const reorderPrisma={$transaction:async fn=>fn(reorderTx),arrastreTorreon:{findUnique:async()=>row(150)}};
  const reorderModel=modules(reorderPrisma).ArrastreModel;
  await reorderModel.reordenarSolicitudes({arrastreIds:[150],empresaId:3,direction:'up'});
  assert.equal(writes.length,2);assert.equal(writes[0].where.id,148);assert.equal(writes[0].data.ordenSolicitud,150);assert.equal(writes[1].data.ordenSolicitud,148);
  assert(!writes.some(write=>write.where.id===149));
  selectedReads=0;writes.length=0;
  await assert.rejects(()=>reorderModel.reordenarSolicitudes({arrastreIds:[150],empresaId:3,direction:'front'}),/incidente abierto/);
  assert.equal(writes.length,0);
  selectedReads=0;
  await assert.rejects(()=>reorderModel.reordenarSolicitudes({arrastreIds:[150],empresaId:4,direction:'up'}),/tu empresa/);
  reorderPrisma.$transaction=async()=>{throw {code:'P2034'}};
  await assert.rejects(()=>reorderModel.reordenarSolicitudes({arrastreIds:[150],empresaId:3,direction:'up'}),error=>error.status===409||error.statusCode===409);
  console.log('PASS Torreón: validated filters, page beyond 100, consistent counts, bounded blocking updates, cross-page/company reorder and priority rules');
}
main().catch(error=>{console.error(error);process.exitCode=1});
