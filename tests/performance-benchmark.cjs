// Local synthetic benchmark. This script refuses all non-test databases.
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loader, logger } = require('./support/load-ts.cjs');
const admin=process.env.SECURITY_TEST_DB_ADMIN_URL;
if(!admin||new URL(admin).hostname!=='127.0.0.1'||new URL(admin).port!=='55439')throw new Error('Requires isolated SECURITY_TEST_DB_ADMIN_URL on 127.0.0.1:55439');
const url=new URL(admin);url.pathname='/security_main';
const db=new (require('@prisma/client').PrismaClient)({datasources:{db:{url:url.toString()}},log:[{emit:'event',level:'query'}]});
let statements=0;db.$on('query',()=>statements++);
const load=loader({'src/lib/prisma':{prisma:db},'src/utils/logger':{logger},'src/models/Movimientos/movimiento.logger':{movimientoError:logger}},{performance});
const read=load('src/models/Movimientos/movimientoReadModel.ts').MovimientoReadModel;
const compact=load('src/application/movements/movementQuery.ts');
const planning=load('src/models/Movimientos/Ronda/roundPlan.ts');
const percentile=(rows,p)=>[...rows].sort((a,b)=>a-b)[Math.min(rows.length-1,Math.ceil(rows.length*p)-1)];
async function measure(fn,runs=15,before=async()=>{}){
 await before();await fn(); const times=[],counts=[];let result;
 for(let i=0;i<runs;i++){await before();const count=statements,start=performance.now();result=await fn();times.push(performance.now()-start);counts.push(statements-count);}
 return {p50Ms:+percentile(times,.5).toFixed(3),p95Ms:+percentile(times,.95).toFixed(3),sqlStatements:percentile(counts,.5),jsonBytes:result?Buffer.byteLength(JSON.stringify(result)):null};
}
async function main(){
 let fixture;
 const fixtureArg=process.argv.find(a=>a.startsWith('--fixture='));
 if(fixtureArg)fixture=JSON.parse(fs.readFileSync(fixtureArg.slice(10),'utf8')).fixture;
 else{
  const tag='BENCH-'+crypto.randomUUID();
  const companies=await Promise.all(Array.from({length:10},(_,i)=>db.empresa.create({data:{nombre:tag+'-E'+i}})));
  const localities=await Promise.all(Array.from({length:5},(_,i)=>db.localidad.create({data:{nombre:tag+'-L'+i,estado:'ACTIVA'}})));
  const actor=await db.usuario.create({data:{nombre:tag,email:tag+'@example.invalid',contrasena:'SYNTHETIC',rol:'ADMINISTRADOR',empresaId:companies[0].id,localidadId:localities[0].id}});
  await db.$executeRaw`INSERT INTO "Movimiento" ("empresaId","localidadId","creadoPorId","locomotiveNumber",estado,prioridad,"fechaSolicitud","createdAt","updatedAt",instrucciones)
   SELECT (${companies.map(c=>c.id)}::int[])[n%10+1],(${localities.map(c=>c.id)}::int[])[(n/10)%5+1],${actor.id},100000+n,'SOLICITADO'::"EstadoMovimiento",'BAJA'::"Prioridad",'2026-01-01'::timestamp+n*INTERVAL '1 minute','2026-01-01'::timestamp+n*INTERVAL '1 minute',NOW(),repeat('Synthetic instructions ',15) FROM generate_series(1,60000) n`;
  await db.$executeRaw`INSERT INTO "Incidente" ("movimientoId","usuarioId",descripcion,imagen1,"updatedAt") SELECT id,${actor.id},repeat('Synthetic incident ',10),repeat('synthetic-image-',80),NOW() FROM "Movimiento" WHERE "creadoPorId"=${actor.id} AND "locomotiveNumber"%2=0`;
  await db.$executeRaw`INSERT INTO "Ronda" ("movimientoId","empresaId","localidadId",concluido,orden,"rondaNumero","updatedAt") SELECT id,"empresaId","localidadId",false,ROW_NUMBER() OVER (ORDER BY id)::int*2,1,NOW() FROM "Movimiento" WHERE "creadoPorId"=${actor.id} AND "localidadId"=${localities[0].id} LIMIT 1000`;
  fixture={actor,companies,localities};
 }
 const company=fixture.companies[0].id,locality=fixture.localities[0].id;
 await db.$executeRawUnsafe('ANALYZE "Movimiento"');await db.$executeRawUnsafe('ANALYZE "Ronda"');
 const options=compact.readMovementListQuery({empresaId:String(company),localidadId:String(locality),pageSize:'20'});
 const full=()=>read.obtenerMovimientosPorEmpresaYLocalidadPaginados(company,locality,{page:1,pageSize:20});
 const small=()=>compact.listCompactMovements(options);
 assert.deepEqual((await full()).data.map(r=>r.id),(await small()).data.map(r=>r.id));
 const result={recordedAt:new Date().toISOString(),node:process.version,fixtureMovements:60000,samples:15,notes:'Local PostgreSQL 16, warm caches, sequential requests; not production throughput.',list:{legacy:await measure(full),compact:await measure(small)}};
 let cursor=null;
 for(let i=0;i<49;i++){const page=await compact.listCompactMovements({...options,cursor});cursor=page.meta.nextCursor;assert(cursor);}
 const cursorFn=()=>compact.listCompactMovements({...options,cursor});
 const offsetFn=()=>read.obtenerMovimientosPorEmpresaYLocalidadPaginados(company,locality,{page:50,pageSize:20});
 assert.deepEqual((await cursorFn()).data.map(r=>r.id),(await offsetFn()).data.map(r=>r.id));
 result.deepPage={offset:await measure(offsetFn),cursor:await measure(cursorFn)};
 const rows=await db.ronda.findMany({where:{localidadId:locality,rondaNumero:1,concluido:false},orderBy:{id:'asc'}});
 const reset=()=>db.$executeRaw`UPDATE "Ronda" SET orden = id * 2 WHERE "localidadId"=${locality} AND "rondaNumero"=1 AND concluido=false`;
 const oldCompact=async()=>{const rows=await db.ronda.findMany({where:{localidadId:locality,rondaNumero:1,concluido:false},select:{id:true,orden:true},orderBy:{orden:'asc'}});for(let i=0;i<rows.length;i++)if(rows[i].orden!==i+1)await db.ronda.update({where:{id:rows[i].id},data:{orden:i+1}});};
 const newCompact=async()=>{const rows=await db.ronda.findMany({where:{localidadId:locality,rondaNumero:1,concluido:false},select:{id:true,orden:true,rondaNumero:true},orderBy:{orden:'asc'}});await planning.persistRoundPlan(db,locality,planning.compactRoundPlan(rows));};
 result.roundCompaction={rows:rows.length,legacy:await measure(oldCompact,7,reset),batched:await measure(newCompact,7,reset)};
 const after=await db.ronda.findMany({where:{localidadId:locality,rondaNumero:1,concluido:false},orderBy:{orden:'asc'}});assert(after.every((r,i)=>r.orden===i+1));
 const rawSummary=()=>db.$queryRaw`SELECT estado::text,COUNT(*)::int AS cantidad FROM "Movimiento" WHERE "empresaId"=${company} AND "localidadId"=${locality} GROUP BY estado`;
 const rowSummary=async()=>{const rows=await db.movimiento.findMany({where:{empresaId:company,localidadId:locality},select:{estado:true}});const counts={};for(const row of rows)counts[row.estado]=(counts[row.estado]||0)+1;return counts;};
 result.summary={rowsInNode:await measure(rowSummary),databaseAggregate:await measure(rawSummary)};
 const outputArg=process.argv.find(a=>a.startsWith('--output='));
 if(outputArg)fs.writeFileSync(outputArg.slice(9),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect());
