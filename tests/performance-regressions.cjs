const assert = require('node:assert/strict');
const { loader, logger } = require('./support/load-ts.cjs');
const { EventEmitter } = require('events');
const globals = { performance, setTimeout, clearTimeout };
const load = loader({ 'src/utils/logger': { logger }, 'src/lib/prisma': { prisma: {} } }, globals);
const metrics = load('src/performance/metrics.ts');
const query = load('src/application/movements/movementQuery.ts');
const plan = load('src/models/Movimientos/Ronda/roundPlan.ts');
const access = load('src/reporteria/exports/exportAccess.ts');
const files = load('src/reporteria/exports/exportFiles.ts');
const pagination = load('src/Rutas/Movimientos/movimiento.pagination.ts');
async function main() {
  const one = metrics.beginRequestCost(), two = metrics.beginRequestCost();
  await Promise.all([
    one.run(async () => { await metrics.measureOperation('main', 'Movimiento', 'findMany', async () => new Promise(r => setTimeout(r, 10))); await metrics.measureOperation('main', 'Movimiento', 'count', async () => 1); }),
    two.run(async () => { await assert.rejects(() => metrics.measureOperation('main', 'Usuario', 'findUnique', async () => { throw new Error('private-query-value'); })); }),
  ]);
  assert.equal(one.snapshot().operations, 2); assert.equal(two.snapshot().operations, 1);
  one.finish('GET', '/movimientos/listado'); one.finish('GET', '/movimientos/listado'); two.finish('POST', '/usuarios/login');
  const output = await metrics.performanceRegistry.metrics();
  assert(!output.includes('private-query-value'));
  assert(output.includes('cosaif_request_prisma_operations_count{method="GET",route="/movimientos/listado"} 1'));
  // A disconnected response must release active requests exactly once, even if finish follows close.
  const guardian = loader({ 'src/performance/metrics': metrics }, { process, performance, setTimeout, clearTimeout, setInterval, clearInterval }).call(null, 'src/guardian/guardianAgent.ts').createGuardianAgent({service:'cosaif-api'});
  const response = new EventEmitter(); response.statusCode=200; response.writableFinished=false; response.setHeader=()=>{};
  guardian.middleware({path:'/test/123',method:'GET',get:()=>undefined,headers:{},route:{path:'/test/:id'},baseUrl:''},response,()=>{});
  response.emit('close'); response.emit('finish');
  let emitted=''; await guardian.metrics({}, {setHeader(){},status(){return this},send(body){emitted=body}},error=>{throw error});
  assert(emitted.includes('cosaif_http_active_requests 0'));
  assert(emitted.includes('cosaif_http_requests_total{method="GET",route="/test/:id",status_code="499"} 1'));
  assert.throws(() => query.readMovementListQuery({pageSize:'51'}));
  assert.throws(() => query.readMovementListQuery({empresaId:['1','2']}));
  assert.throws(() => query.readMovementListQuery({estado:'anything'}));
  assert.throws(() => query.readMovementListQuery({desde:'2026-01-02T00:00:00Z',hasta:'2026-01-01T00:00:00Z'}));
  assert.throws(() => query.boundedReportFilters({desde:'2024-01-01T00:00:00Z',hasta:'2026-01-01T00:00:00Z'}));
  assert(pagination.readMovimientoPagination({page:'999999999999999999'}).error);
  assert(pagination.readMovimientoPagination({page:'9007199254740991',pageSize:'50'}).error);
  const admin = {id:1,rol:'ADMINISTRADOR',empresaId:1,localidadId:1,activo:true};
  const coordinator = {id:2,rol:'COORDINADOR',empresaId:1,localidadId:7,activo:true};
  const range = {desde:'2026-01-01T00:00:00Z',hasta:'2026-02-01T00:00:00Z'};
  assert.equal(access.authorizeExportFilters(coordinator,range).localidadId,7);
  assert.throws(()=>access.authorizeExportFilters(coordinator,{...range,localidadId:8}),/alcance/);
  assert.throws(()=>access.exportAuthorization({...admin,activo:false}),/permisos/);
  assert.notEqual(access.exportAuthorization(admin).hash,access.exportAuthorization({...admin,rol:'COORDINADOR'}).hash);
  assert.throws(()=>files.artifactPath('../x','../../secret','csv'));
  assert.equal(files.csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');
  assert.equal(files.csvCell('normal,comma'),'"normal,comma"');
  assert.equal(plan.firstFreeRound([1,2,4],1,500),3);
  assert.equal(plan.firstFreeRound([1,2,3],1,3),4);
  assert.deepEqual(Array.from(plan.duplicateRoundIds([{id:1,movimientoId:10},{id:2,movimientoId:10},{id:3,movimientoId:11}])),[2]);
  const changes=plan.compactRoundPlan([{id:1,rondaNumero:2,orden:4},{id:2,rondaNumero:2,orden:8},{id:3,rondaNumero:4,orden:2}]);
  assert.deepEqual(JSON.parse(JSON.stringify(changes)),[{id:1,rondaNumero:1,orden:1},{id:2,rondaNumero:1,orden:2},{id:3,rondaNumero:2,orden:1}]);
  const slots=plan.companySlotPlan([
    {id:1,rondaNumero:1,orden:1,empresaId:1,prioridad:'BAJA',fecha:1},
    {id:2,rondaNumero:1,orden:2,empresaId:1,prioridad:'BAJA',fecha:2},
    {id:3,rondaNumero:1,orden:3,empresaId:1,prioridad:'BAJA',fecha:3},
    {id:4,rondaNumero:2,orden:1,empresaId:1,prioridad:'BAJA',fecha:4},
    {id:5,rondaNumero:3,orden:1,empresaId:2,prioridad:'ALTA',fecha:5},
  ],500);
  assert.deepEqual(JSON.parse(JSON.stringify(slots)),[{id:2,rondaNumero:3,orden:2},{id:3,rondaNumero:4,orden:1}]);
  let clock = Date.parse('2026-01-15T12:00:00Z');
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  const scheduling = loader({
    'src/lib/prisma': { prisma: {} }, 'src/lib/servicePrisma': { prismaTorno: {} },
    'src/models/Movimientos': { MovimientoModel: {} },
    'src/Rutas/Movimientos/movimiento.controller.logger': { movimientoControllerLogger: logger },
    'src/services/tornoMs/tornoMsClient': { normalizeMedidasRuedaInput: value => value },
  }, { Date: FixedDate })('src/application/movements/tornoScheduling.ts');
  const meta = { version: 1, fechaProgramada: '2026-01-15T12:00:00Z', fechaLimiteActivacion: '2026-01-15T12:10:00Z', medidasTorno: {wheelCount:6}, creadoEn: '2026-01-15T11:00:00Z' };
  const scheduled = { instrucciones: scheduling.encodeTornoAgendadoMeta(meta) };
  assert.equal(scheduling.decodeTornoAgendadoMeta(scheduled.instrucciones).medidasTorno.wheelCount,6);
  assert(scheduling.isWithinActivationWindow(scheduled));
  clock += 600001;assert(!scheduling.isWithinActivationWindow(scheduled));assert(!scheduling.canActivateScheduledTorno(scheduled));
  assert.equal(scheduling.decodeTornoAgendadoMeta('[TORNO_AGENDADO:bad]'),null);
  console.log('PASS performance: request isolation/aborts, bounded input, export scope/formula safety, round plans');
}
main().catch(error=>{console.error(error);process.exitCode=1});
