const assert=require('node:assert/strict');
const path=require('path');const os=require('os');const fs=require('fs/promises');const crypto=require('crypto');const net=require('net');const {spawn}=require('child_process');
const admin=process.env.SECURITY_TEST_DB_ADMIN_URL;
if(!admin||new URL(admin).hostname!=='127.0.0.1'||new URL(admin).port!=='55439')throw new Error('Requires isolated SECURITY_TEST_DB_ADMIN_URL on 127.0.0.1:55439');
const url=new URL(admin);url.pathname='/security_main';let child,db,dir;
async function main(){
 dir=await fs.mkdtemp(path.join(os.tmpdir(),'backcosaif-worker-smoke-'));
 Object.assign(process.env,{DATABASE_URL:url.toString(),REPORT_EXPORT_DIR:dir,LOG_DIR:dir,NODE_ENV:'test',AUDIT_ENABLED:'false'});
 require('ts-node/register/transpile-only');db=require('../src/lib/prisma').prisma;
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
 const tag=crypto.randomUUID();const company=await db.empresa.create({data:{nombre:tag}});const locality=await db.localidad.create({data:{nombre:tag,estado:'ACTIVA'}});const actor=await db.usuario.create({data:{nombre:tag,email:tag+'@example.invalid',contrasena:'SYNTHETIC',rol:'ADMINISTRADOR',empresaId:company.id,localidadId:locality.id}});
 await db.movimiento.create({data:{creadoPorId:actor.id,empresaId:company.id,localidadId:locality.id,locomotiveNumber:101,createdAt:new Date('2026-01-01T00:00:00Z')}});
 const store=require('../src/reporteria/exports/exportStore');
 const record=await store.createExport(actor,'csv',{empresaId:company.id,desde:'2026-01-01T00:00:00Z',hasta:'2026-02-01T00:00:00Z'});
 child=spawn(process.execPath,['-r','ts-node/register/transpile-only','src/workers/reports.ts'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,REPORT_WORKER_METRICS_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);child.stdout.resume();
 let completed=false;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw new Error('Worker exited: '+stderr);
  if((await store.getExport(actor,record.id)).status==='COMPLETED'){completed=true;break;}
  await new Promise(r=>setTimeout(r,100));
 }
 assert(completed,'the standalone process must consume and finish the queued export');
 const metrics=await fetch(`http://127.0.0.1:${port}/metrics`);assert.equal(metrics.status,200);const text=await metrics.text();assert(text.includes('cosaif_job_duration_seconds_count{kind="report.export",outcome="ok"}'));
 const exit=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));child.kill('SIGTERM');
 const exited=await Promise.race([exit,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Worker did not shut down')),10000);timer.unref();})]);
 assert.equal(exited.code,0);console.log('PASS standalone report worker: queued export, loopback metrics and graceful SIGTERM');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(child&&child.exitCode===null)child.kill('SIGKILL');await db?.$disconnect();if(dir)await fs.rm(dir,{recursive:true,force:true});});
