const assert=require('node:assert/strict');const crypto=require('crypto');const fs=require('fs');const path=require('path');
const {loader,logger}=require('./support/load-ts.cjs');
const admin=process.env.SECURITY_TEST_DB_ADMIN_URL;
if(!admin||new URL(admin).hostname!=='127.0.0.1'||new URL(admin).port!=='55439')throw new Error('Requires isolated SECURITY_TEST_DB_ADMIN_URL on 127.0.0.1:55439');
const url=new URL(admin);url.pathname='/security_main';const db=new(require('@prisma/client').PrismaClient)({datasources:{db:{url:url.toString()}}});
const roundFile='src/models/Movimientos/Ronda/RondaModel.ts';
const mock={'src/lib/prisma':{prisma:db},'src/models/Movimientos/movimiento.logger':{movimientoError:logger},'src/utils/logger':{logger}};
const extra='module.exports.holdForTest = id => _hold10m.set(id, Date.now()+600000);';
async function main(){
 const tag='ROUND-TEST-'+crypto.randomUUID();
 const companies=await Promise.all([0,1,2].map(i=>db.empresa.create({data:{nombre:tag+i}})));
 async function fixture(label){const locality=await db.localidad.create({data:{nombre:tag+label,estado:'ACTIVA'}});const actor=await db.usuario.create({data:{nombre:tag+label,email:tag+label+'@example.invalid',contrasena:'SYNTHETIC',rol:'ADMINISTRADOR',empresaId:companies[0].id,localidadId:locality.id}});const ids=[];
 for(let i=0;i<31;i++) {const movement=await db.movimiento.create({data:{empresaId:companies[i%3].id,localidadId:locality.id,creadoPorId:actor.id,locomotiveNumber:1000+i,prioridad:i%11===0?'ALTA':'BAJA',estado:i>=27?'CONCLUIDO':i%7===0?'DETENIDO':'SOLICITADO',finalizado:i>=27,incidenteGlobal:i===7,fechaSolicitud:new Date(Date.UTC(2026,0,1,0,i)),createdAt:new Date(Date.UTC(2026,0,1,0,i))}});ids.push(movement.id);await db.ronda.create({data:{movimientoId:movement.id,empresaId:movement.empresaId,localidadId:locality.id,rondaNumero:i>=27?10:2+Math.floor(i/9)*2,orden:2*(i%9+1),concluido:i===30}});}
 return {locality,ids};}
 const current=loader(mock,{performance})(roundFile,extra);const fixtureNew=await fixture('new');current.holdForTest(fixtureNew.ids[0]);
 const read=async locality=>JSON.parse(JSON.stringify((await db.ronda.findMany({where:{localidadId:locality},orderBy:[{concluido:'asc'},{rondaNumero:'asc'},{orden:'asc'}],select:{rondaNumero:true,orden:true,concluido:true,movimiento:{select:{locomotiveNumber:true}}}})).map(r=>({round:r.rondaNumero,order:r.orden,completed:r.concluido,locomotive:r.movimiento.locomotiveNumber}))));
 let expected;
 if(process.env.PERFORMANCE_BASELINE_DIR){const source=fs.readFileSync(path.join(process.env.PERFORMANCE_BASELINE_DIR,roundFile),'utf8');const old=loader(mock,{performance},{[roundFile]:source})(roundFile,extra);const oldFixture=await fixture('old');old.holdForTest(oldFixture.ids[0]);await old.RondaModel.recomponerRondasLocalidad(oldFixture.locality.id);expected=await read(oldFixture.locality.id);}
 else expected=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/round-recomposition.json'),'utf8'));
 await current.RondaModel.recomponerRondasLocalidad(fixtureNew.locality.id);assert.deepEqual(await read(fixtureNew.locality.id),expected);
 await Promise.all([current.RondaModel.recomponerRondasLocalidad(fixtureNew.locality.id),current.RondaModel.recomponerRondasLocalidad(fixtureNew.locality.id)]);
 assert.deepEqual(await read(fixtureNew.locality.id),expected);
 // A saved characterization fixture covers FIFO priorities, holds, duplicate companies, stopped/zombie/completed rounds.
 if(process.argv.includes('--save-fixture')){fs.mkdirSync(path.join(__dirname,'fixtures'),{recursive:true});fs.writeFileSync(path.join(__dirname,'fixtures/round-recomposition.json'),JSON.stringify(expected,null,2)+'\n');}
 console.log('PASS PostgreSQL rounds: legacy characterization, FIFO/hold/companies/stopped/completed, concurrent serializable recomposition');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
