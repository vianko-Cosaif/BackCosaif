const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
const fixedTime = '2026-09-17T12:00:00.000Z';
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixedTime])); }
  static now() { return Date.parse(fixedTime); }
}
async function observe(method, params, scenario = {}, sources = {}) {
  const calls = { audience: [], sent: [], deleted: [], warnings: [], errors: [], thrown: null };
  const notifier = loader({
    'src/jobs/durableJobs': { isDurableJobExecution: () => Boolean(scenario.durable) },
    'src/lib/prisma': { prisma: { fcmToken: { deleteMany: async arg => {
      calls.deleted.push(arg);
      if (scenario.deleteError) throw new Error('cleanup failure');
    } } } },
    'src/config/firebase': { messaging: {} },
    'src/services/fcmAudience': { tokensAudienciaOperacion: async args => {
      calls.audience.push(args);
      if (scenario.audienceError) throw new Error('audience failure');
      return { tokens: scenario.noTokens ? [] : ['first', 'second'], roleCounts: { SUPERVISOR: 2 } };
    } },
    'src/services/fcmCompat': { sendMulticastCompat: async payload => {
      calls.sent.push(payload);
      return { responses: [{ success: true }, scenario.failure ? { success: false, error: { code: scenario.failure } } : { success: true }] };
    } },
  }, {
    Date: FixedDate,
    console: { warn: (...args) => calls.warnings.push(args), error: (...args) => calls.errors.push(args.map(arg => arg instanceof Error ? arg.message : arg?.message ?? arg)) },
  }, sources)('src/services/NotificadorFCM.ts').NotificadorFCM;
  try { await notifier[method](params); } catch (error) { calls.thrown = error.message; }
  return JSON.parse(JSON.stringify(calls));
}
const base = { tipo: 'iniciado', titulo: 'Inicio', mensaje: 'Movimiento iniciado', empresaId: 1, localidadId: 2, usuarioIds: [3], roles: ['SUPERVISOR'] };
async function main() {
  const torreon = await observe('notificarOperacionTorreon', base);
  const service = await observe('notificarOperacionServicio', { ...base, servicio: 'TORNO', audience: 'operadores', movimientoId: 4 });
  assert.deepEqual(torreon.audience, service.audience);
  assert.deepEqual(torreon.sent[0].tokens, ['first', 'second']);
  assert.equal(torreon.sent[0].data.url, '/cliente/torreon');
  assert.equal(torreon.sent[0].android.notification.channelId, 'cosaif_operacion');
  assert.equal(service.sent[0].android.notification.channelId, undefined);
  assert.equal(service.sent[0].data.source, 'torno');
  assert.equal(service.sent[0].data.movimientoId, '4');
  assert.equal(service.sent[0].data.audience, 'operadores');
  for (const [method, params] of [['notificarOperacionTorreon', base], ['notificarOperacionServicio', { ...base, servicio: 'LAVADO', audience: 'cliente' }]]) {
    const custom = await observe(method, { ...params, url: '/custom', tag: 'custom', data: { extra: 7, tipo: 'ignored', source: 'ignored', nada: null } });
    assert.equal(custom.sent[0].data.extra, '7');
    assert.equal(custom.sent[0].data.nada, undefined);
    assert.equal(custom.sent[0].data.tipo, 'iniciado');
    assert.equal(custom.sent[0].data.url, '/custom');
    assert.equal(custom.sent[0].data.tag, 'custom');
    assert.equal((await observe(method, params, { noTokens: true })).sent.length, 0);
    const invalid = await observe(method, params, { durable: true, failure: 'messaging/registration-token-not-registered' });
    assert.deepEqual(invalid.deleted, [{ where: { token: { in: ['second'] } } }]);
    assert.equal(invalid.thrown, null);
    assert.match((await observe(method, params, { durable: true, failure: 'messaging/internal-error' })).thrown, /transitorio/);
    assert.equal((await observe(method, params, { failure: 'messaging/internal-error' })).thrown, null);
    assert.equal((await observe(method, params, { durable: true, audienceError: true })).thrown, 'audience failure');
  }
  console.log('PASS FCM operaciones: destinatarios, datos, canales, errores y limpieza de tokens conservados');
}
module.exports = { observe, base };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
