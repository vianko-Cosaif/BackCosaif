const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { loader, logger } = require('./support/load-ts.cjs');
const admin = process.env.SECURITY_TEST_DB_ADMIN_URL;
if (!admin || new URL(admin).hostname !== '127.0.0.1' || new URL(admin).port !== '55439') throw new Error('Requires isolated SECURITY_TEST_DB_ADMIN_URL on 127.0.0.1:55439');
const url = new URL(admin); url.pathname='/security_main';
const db = new (require('@prisma/client').PrismaClient)({datasources:{db:{url:url.toString()}}});
let outputDir;
let appDb;
let serviceDb;
async function main() {
  outputDir=await fs.mkdtemp(path.join(os.tmpdir(),'.backcosaif-export-tests-'));
  const tag='PERF-TEST-'+crypto.randomUUID();
  const companies=await Promise.all([0,1].map(i=>db.empresa.create({data:{nombre:tag+'-'+i}})));
  const localities=await Promise.all([0,1].map(i=>db.localidad.create({data:{nombre:tag+'-'+i,estado:'ACTIVA'}})));
  const actor=await db.usuario.create({data:{nombre:tag,email:tag+'@example.invalid',contrasena:'SYNTHETIC',rol:'ADMINISTRADOR',empresaId:companies[0].id,localidadId:localities[0].id}});
  const now=new Date('2026-01-15T12:00:00Z');
  await db.movimiento.createMany({data:Array.from({length:1050},(_,i)=>({empresaId:companies[i%2].id,localidadId:localities[i%2].id,creadoPorId:actor.id,locomotiveNumber:100000+i,createdAt:now,fechaSolicitud:now,estado:i%3===0?'CONCLUIDO':'SOLICITADO',fechaInicio:now,fechaFin:i%3===0?new Date(+now+60000):null,instrucciones:'SHOULD_NOT_APPEAR_IN_COMPACT'}))});
  Object.assign(process.env,{TORREON_DATABASE_URL:url.toString().replace('/security_main','/security_torreon'),TORNO_DATABASE_URL:url.toString().replace('/security_main','/security_torno'),DATABASE_URL:url.toString(),REPORT_EXPORT_DIR:outputDir,LOG_DIR:outputDir,NODE_ENV:'test',AUDIT_ENABLED:'false',JWT_SECRET:'synthetic-test-only'});
  require('ts-node/register/transpile-only');
  const load = file => require(path.resolve(__dirname,'..',file));
  appDb=load('src/lib/prisma.ts').prisma;
  const query=load('src/application/movements/movementQuery.ts');
  const metrics=load('src/performance/metrics.ts');
  const measured=metrics.instrumentPrisma(db,'main');
  const cost=metrics.beginRequestCost();
  await cost.run(async()=>{await measured.$transaction(async tx=>{await tx.movimiento.count({where:{creadoPorId:actor.id}});await tx.$queryRaw`SELECT 1`;});});
  assert.equal(cost.snapshot().operations,2,'instrumentation must cover model and raw queries inside transactions');
  const opts={empresaId:String(companies[0].id),localidadId:String(localities[0].id),pageSize:'50'};
  const first=await query.listCompactMovements(query.readMovementListQuery(opts));
  assert.equal(first.meta.total,null); assert(first.meta.hasNextPage);
  assert(!JSON.stringify(first).includes('SHOULD_NOT_APPEAR'));
  const second=await query.listCompactMovements(query.readMovementListQuery({...opts,cursor:first.meta.nextCursor}));
  assert(!second.data.some(r=>first.data.some(other=>other.id===r.id)));
  await assert.rejects(()=>query.listCompactMovements(query.readMovementListQuery({...opts,empresaId:String(companies[1].id),cursor:first.meta.nextCursor})),/Cursor/);
  await db.movimiento.delete({where:{id:first.data.at(-1).id}});
  const afterDelete=await query.listCompactMovements(query.readMovementListQuery({...opts,cursor:first.meta.nextCursor}));
  assert.deepEqual(afterDelete.data.map(r=>r.id),second.data.map(r=>r.id),'keyset cursor must survive deletion of anchor row');
  const total=await query.listCompactMovements(query.readMovementListQuery({...opts,includeTotal:'true'}));assert.equal(total.meta.total,524);
  const range={empresaId:companies[0].id,localidadId:localities[0].id,desde:'2026-01-01T00:00:00Z',hasta:'2026-02-01T00:00:00Z'};
  const summaryModel=load('src/application/movements/movementSummary.ts');
  const summary=await summaryModel.summarizeMovements(range);
  assert.equal(summary.total,524); assert.equal(summary.data.find(r=>r.estado==='CONCLUIDO').duracionMediaSegundos,60);
  assert.strictEqual(summaryModel.summarizeMovements(range),summaryModel.summarizeMovements(range));
  const store=load('src/reporteria/exports/exportStore.ts');
  const worker=load('src/reporteria/exports/exportWorker.ts');
  const files=load('src/reporteria/exports/exportFiles.ts');
  const jobs=load('src/jobs/durableJobs.ts');
  const record=await store.createExport(actor,'csv',range);
  assert.equal(record.status,'QUEUED');
  // Route permissions only apply to the new endpoints, leaving existing commercial report routes reachable.
  const express=require('express'); const app=express();app.use(express.json());
  const routeLoad=loader({'src/lib/prisma':{prisma:db},'src/utils/logger':{logger},
    'src/auth/authenticateAccess':{authenticateAccess(req,res,next){req.user={...actor,rol:req.headers['x-test-role']||actor.rol};next();}},
    'src/reporteria/exports/exportStore':store,
    'src/reporteria/exports/exportFiles':files,
  },{performance});
  app.use('/reporteria',routeLoad('src/reporteria/exports/exportRoutes.ts').default);
  app.get('/reporteria/comercial',(req,res)=>res.json({existingRoute:true}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const address=`http://127.0.0.1:${server.address().port}`;
  try {
    const existing=await fetch(address+'/reporteria/comercial',{headers:{'x-test-role':'COMERCIAL'}});assert.equal(existing.status,200);
    const status=await fetch(address+'/reporteria/exportaciones/'+record.id);assert.equal(status.status,200);assert.equal((await status.json()).status,'QUEUED');
    const pending=await fetch(address+'/reporteria/exportaciones/'+record.id+'/archivo');assert.equal(pending.status,409);
    worker.registerReportExportWorker();await jobs.runJobsOnce();
    const downloaded=await fetch(address+'/reporteria/exportaciones/'+record.id+'/archivo');assert.equal(downloaded.status,200);assert((await downloaded.text()).includes(companies[0].nombre));
    assert(downloaded.headers.get('content-disposition').includes('attachment'));
  } finally {await new Promise(resolve=>server.close(resolve));}

  assert.equal((await db.$queryRaw`SELECT key FROM durable_jobs WHERE key = ${'report:'+record.id}`).length,1);
  await assert.rejects(()=>store.getExport({...actor,id:actor.id+100000},record.id),/encontrada/);
  await assert.rejects(()=>store.getExport({...actor,rol:'COORDINADOR'},record.id),/permisos/);
  worker.registerReportExportWorker();
  await jobs.runJobsOnce();
  const complete=await store.getExport(actor,record.id);
  assert.equal(complete.status,'COMPLETED');assert.equal(complete.row_count,524);
  assert.doesNotThrow(()=>JSON.stringify(store.publicExport(complete)),'SQL bigint must be JSON-safe');
  const csv=await fs.readFile(files.artifactPath(complete.id,complete.artifact_token,'csv'),'utf8');
  assert(csv.includes(companies[0].nombre));assert(!csv.includes(companies[1].nombre));
  assert.equal(csv.trim().split('\r\n').length,525);
  assert.equal((await fs.stat(files.artifactPath(complete.id,complete.artifact_token,'csv'))).mode&0o777,0o600);
  await worker.runReportExport({id:record.id});
  assert.equal((await store.getExport(actor,record.id)).artifact_token,complete.artifact_token,'completed retries keep the same artifact');
  const excel=await store.createExport(actor,'xlsx',range);await worker.runReportExport({id:excel.id});
  const excelDone=await store.getExport(actor,excel.id);assert.equal(excelDone.status,'COMPLETED');
  const book=new (require('exceljs').Workbook)();await book.xlsx.readFile(files.artifactPath(excelDone.id,excelDone.artifact_token,'xlsx'));assert.equal(book.worksheets[0].rowCount,525);
  // Commercial analytics preserves counts for all five incident relations.
  const commercialMovement=await db.movimiento.findFirst({where:{empresaId:companies[0].id,localidadId:localities[0].id}});
  await db.incidente.createMany({data:[0,1].map(()=>({movimientoId:commercialMovement.id,usuarioId:actor.id,descripcion:'Synthetic report incident'}))});
  const torno=await db.tornoT.create({data:{movimientoId:commercialMovement.id,localidadId:localities[0].id}});
  const lavado=await db.lavadoT.create({data:{movimientoId:commercialMovement.id,localidadId:localities[0].id}});
  await db.incidenteTorno.createMany({data:[0,1,2].map(()=>({movimientoId:commercialMovement.id,tornoId:torno.id,usuarioId:actor.id,localidadId:localities[0].id,fotos:[]}))});
  await db.incidenteLavado.createMany({data:[0,1,2,3].map(()=>({lavadoId:lavado.id,usuarioId:actor.id,localidadId:localities[0].id,imagenes:[]}))});
  serviceDb=load('src/lib/servicePrisma.ts');
  const natural=await serviceDb.prismaTorreon.movimientoTorreonFerro.create({data:{empresaId:companies[0].id,localidadId:localities[0].id,creadoPorId:actor.id,locomotiveNumber:55,fechaSolicitud:now}});
  const arrastre=await serviceDb.prismaTorreon.arrastreTorreon.create({data:{empresaId:companies[0].id,localidadId:localities[0].id,creadoPorId:actor.id,fechaSolicitud:now}});
  await serviceDb.prismaTorreon.incidenteTorreonFerro.createMany({data:[0,1].map(()=>({movimientoId:natural.id,creadoPorId:actor.id,localidadId:localities[0].id,motivo:'Synthetic'}))});
  await serviceDb.prismaTorreon.incidenteArrastreTorreon.createMany({data:[0,1,2].map(()=>({arrastreId:arrastre.id,creadoPorId:actor.id,localidadId:localities[0].id,motivo:'Synthetic'}))});
  const analytics=await load('src/reporteria/modelos/comercial-crm-analytics.ts').CommercialCrmAnalyticsModel.generate({reference:'2026-01',empresaId:companies[0].id,localidadId:localities[0].id,exportAll:true,pageSize:10000});
  assert.equal(analytics.meta.torreonAvailable,true);
  assert.equal(analytics.kpis.incidents,14);
  assert.equal(analytics.operations.data.find(row=>row.key===`COSAIF:NATURAL:${commercialMovement.id}`).incidents,9);
  assert.equal(analytics.operations.data.find(row=>row.key===`TORREON:NATURAL:${natural.id}`).incidents,2);
  console.log('PASS commercial analytics: same incident counts across movement/turning/washing/Torreón/arrastre');
  // Permissions are checked again by the worker before reading data.
  const revoked=await store.createExport(actor,'csv',range);
  await db.usuario.update({where:{id:actor.id},data:{activo:false}});
  await worker.runReportExport({id:revoked.id});
  assert.equal((await db.$queryRaw`SELECT status FROM report_exports WHERE id = ${revoked.id}::uuid`)[0].status,'FAILED');
  await db.usuario.update({where:{id:actor.id},data:{activo:true}});
  // A transient disk failure is retried through the durable queue, leaving no published partial artifact.
  const retry=await store.createExport(actor,'csv',range);
  const failing=loader({'src/lib/prisma':{prisma:db},'src/utils/logger':{logger},'src/reporteria/exports/exportFiles':{writeExport:async()=>{throw new Error('synthetic disk failure')}}},{performance});
  await assert.rejects(()=>failing('src/reporteria/exports/exportWorker.ts').runReportExport({id:retry.id}),/synthetic disk/);
  assert.equal((await store.getExport(actor,retry.id)).artifact_token,null);
  await worker.runReportExport({id:retry.id});assert.equal((await store.getExport(actor,retry.id)).status,'COMPLETED');
  await db.$executeRaw`UPDATE report_exports SET expires_at=NOW()-INTERVAL '1 minute' WHERE id=${record.id}::uuid`;
  await assert.rejects(()=>store.getExport(actor,record.id),/venció/);
  await files.pruneExportFiles();
  await assert.rejects(()=>fs.stat(files.artifactPath(complete.id,complete.artifact_token,'csv')),/ENOENT/);
  // Updating the plan in a transaction must roll back all batches together.
  const moves=await db.movimiento.findMany({where:{creadoPorId:actor.id},take:501,orderBy:{id:'asc'}});
  await db.ronda.createMany({data:moves.map((m,i)=>({movimientoId:m.id,empresaId:m.empresaId,localidadId:m.localidadId,rondaNumero:2,orden:(i+1)*2}))});
  const rounds=await db.ronda.findMany({where:{localidadId:localities[0].id},orderBy:[{rondaNumero:'asc'},{orden:'asc'}]});
  const planning=load('src/models/Movimientos/Ronda/roundPlan.ts');
  await assert.rejects(()=>db.$transaction(async tx=>{await planning.persistRoundPlan(tx,localities[0].id,planning.compactRoundPlan(rounds));throw new Error('rollback');}),/rollback/);
  assert.equal((await db.ronda.findUnique({where:{id:rounds[0].id}})).rondaNumero,2);
  await db.$transaction(tx=>planning.persistRoundPlan(tx,localities[0].id,planning.compactRoundPlan(rounds)));
  const repaired=await db.ronda.findMany({where:{localidadId:localities[0].id},orderBy:{orden:'asc'}});
  assert(repaired.every((r,i)=>r.rondaNumero===1&&r.orden===i+1));
  assert.equal(await db.ronda.count({where:{localidadId:localities[1].id,rondaNumero:2}}),moves.filter(m=>m.localidadId===localities[1].id).length);
  console.log('PASS PostgreSQL performance: cursor ties/deleted anchor/scope, aggregates, transaction metrics, CSV/XLSX, durable retry/revocation/expiry, atomic round batches');
  if(process.argv.includes('--pdf')){
    const pdf=await store.createExport(actor,'pdf',range);await worker.runReportExport({id:pdf.id});const done=await store.getExport(actor,pdf.id);assert.equal(done.status,'COMPLETED');const content=await fs.readFile(files.artifactPath(done.id,done.artifact_token,'pdf'));assert.equal(content.subarray(0,4).toString(),'%PDF');await load('src/reporteria/modelos/pdf-browser.ts').closeBrowser();console.log('PASS PDF export in sandboxed Chrome: '+content.length+' bytes');
  }
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{await db.$disconnect();await appDb?.$disconnect();await serviceDb?.prismaTorreon.$disconnect();await serviceDb?.prismaTorno.$disconnect();if(outputDir)await fs.rm(outputDir,{recursive:true,force:true});});
