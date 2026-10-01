const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');

async function verifyRetries(dedicatedTable) {
  const receipts = new Set();
  const attempts = [];
  const deletedTokens = [];
  let jobKey;
  let failureCode = 'app/invalid-credential';
  let failRelease = false;
  const db = {
    fcmToken: { deleteMany: async args => { deletedTokens.push(...args.where.token.in); } },
    $queryRaw: async () => [{ available: dedicatedTable }],
    $executeRaw: async (sql, event, recipient) => {
      const query = sql.join('?');
      const key = `${event}:${recipient}`;
      if (query.includes('DELETE')) {
        if (failRelease) throw Error('storage unavailable');
        assert.match(query, dedicatedTable ? /event_id = .*recipient_hash =/s : /kind = 'fcm.delivery' AND completed_at IS NOT NULL/);
        return receipts.delete(key) ? 1 : 0;
      }
      assert.match(query, /INSERT INTO/);
      if (receipts.has(key)) return 0;
      receipts.add(key);
      return 1;
    },
  };
  const logs = [];
  const mocks = {
    'src/jobs/durableJobs': { getDurableJobKey: () => jobKey },
    'src/lib/prisma': { prisma: db },
    'src/config/firebase': { messaging: { send: async message => {
      attempts.push(message.token);
      if (message.token === 'invalid-token') throw Object.assign(Error('invalid'), { code: 'messaging/registration-token-not-registered' });
      if (message.token === 'retry-token' && failureCode) {
        throw Object.assign(Error('sensitive-token-must-not-be-logged'), {
          code: failureCode, httpResponse: { headers: { 'retry-after': '120' } },
        });
      }
      return `accepted-${attempts.length}`;
    } } },
  };
  const globals = { console: { info: (...args) => logs.push(args), warn: (...args) => logs.push(args) } };
  const send = loader(mocks, globals)('src/services/fcmCompat.ts').sendMulticastCompat;
  const message = {
    tokens: ['accepted-token', 'retry-token', 'accepted-token'],
    data: { tipo: 'nuevo_movimiento', movimientoId: 99, localidadId: 1 },
  };
  const first = await send(message);
  assert.equal(first.successCount, 1);
  assert.equal(first.skippedCount, 1);
  assert.equal(first.failureCount, 1);
  assert.equal(first.retryableCount, 1);
  assert.equal(first.responses[1].retryAfterSeconds, 300);
  assert.equal(receipts.size, 1, 'El rechazo de credenciales libera solo su propia reserva');
  failureCode = undefined;
  const restarted = loader(mocks, globals)('src/services/fcmCompat.ts').sendMulticastCompat;
  const recovered = await restarted(message);
  assert.equal(recovered.successCount, 1);
  assert.equal(recovered.skippedCount, 2);
  assert.deepEqual(attempts, ['accepted-token', 'retry-token', 'retry-token'], 'Al recuperar credenciales no se reenvía al destinatario aceptado');

  jobKey = 'fcm-retry-test';
  failureCode = 'messaging/quota-exceeded';
  const next = { ...message, data: { ...message.data, movimientoId: 100 } };
  await assert.rejects(() => send(next), error => error.name === 'FcmRetryError' && error.retryAfterSeconds === 120);
  failureCode = undefined;
  const afterQuota = await send(next);
  assert.equal(afterQuota.successCount, 1);
  assert.equal(afterQuota.skippedCount, 2);
  assert.equal(attempts.filter(token => token === 'accepted-token').length, 2);

  failureCode = 'app/network-timeout';
  const uncertain = { tokens: ['retry-token'], data: { ...message.data, movimientoId: 101 } };
  const timedOut = await send(uncertain);
  assert.equal(timedOut.uncertainCount, 1);
  assert.equal(timedOut.retryableCount, 0);
  const before = attempts.length;
  failureCode = undefined;
  assert.equal((await send(uncertain)).skippedCount, 1);
  assert.equal(attempts.length, before, 'Un timeout no causa un segundo aviso potencialmente duplicado');

  failRelease = true;
  failureCode = 'messaging/server-unavailable';
  const releaseFailure = { tokens: ['retry-token'], data: { ...message.data, movimientoId: 102 } };
  const releaseResult = await send(releaseFailure);
  assert.equal(releaseResult.responses[0].error.code, 'fcm/release-failed');
  assert.equal(releaseResult.retryableCount, 0);
  failRelease = false;
  assert.equal((await send(releaseFailure)).skippedCount, 1, 'Una liberación fallida no habilita envío sin reserva');

  failureCode = 'messaging/registration-token-not-registered';
  const invalid = await send({ tokens: ['retry-token'], data: { ...message.data, movimientoId: 103 } });
  assert.equal(invalid.retryableCount, 0);
  assert.equal(invalid.responses[0].error.code, failureCode, 'Se conserva la correspondencia para retirar tokens inválidos');
  assert.equal(JSON.stringify(logs).includes('sensitive-token-must-not-be-logged'), false);
  assert.equal(JSON.stringify(logs).includes('accepted-token'), false);

  failureCode = 'messaging/quota-exceeded';
  await assert.rejects(() => send({ tokens: ['retry-token', 'invalid-token'], data: { ...message.data, movimientoId: 105 } }), error => error.name === 'FcmRetryError');
  assert.deepEqual(deletedTokens, ['invalid-token'], 'Se retiran tokens inválidos aunque otro destinatario obligue a reintentar el lote');

  // Un segundo emisor no puede liberar una reserva que pertenece al primero.
  let finishSend;
  let enteredSend;
  const started = new Promise(resolve => { enteredSend = resolve; });
  const held = new Promise(resolve => { finishSend = resolve; });
  const concurrent = loader({ ...mocks, 'src/config/firebase': { messaging: { send: async () => {
    enteredSend(); await held; return 'accepted-concurrent';
  } } } }, globals)('src/services/fcmCompat.ts').sendMulticastCompat;
  const concurrentMessage = { tokens: ['single-token'], data: { ...message.data, movimientoId: 104 } };
  const inFlight = concurrent(concurrentMessage);
  await started;
  assert.equal((await concurrent(concurrentMessage)).skippedCount, 1);
  finishSend();
  assert.equal((await inFlight).successCount, 1);
  console.log(`PASS FCM retries (${dedicatedTable ? 'dedicated' : 'existing jobs'}): partial recovery, restart, quota, timeout, release failure, concurrency, redaction`);
}

async function verifyWorkerDelay() {
  let pending = true;
  let savedDelay;
  let completed = false;
  const jobs = loader({
    'src/lib/prisma': { prisma: {
      $queryRaw: async () => {
        if (!pending) return [];
        pending = false;
        return [{ key: 'test', kind: 'fcm-test', payload: {}, attempts: 1, available_at: new Date() }];
      },
      $executeRaw: async (sql, ...values) => {
        if (sql.join('?').includes('available_at = NOW()')) savedDelay = values[0];
        if (sql.join('?').includes('completed_at = NOW()')) completed = true;
        return 1;
      },
    } },
    'src/performance/metrics': { recordJobCost() {}, recordJobWait() {} },
    'src/utils/logger': { logger: { error() {} } },
  })('src/jobs/durableJobs.ts');
  jobs.registerJob('fcm-test', async () => { throw Object.assign(Error('retry'), { retryAfterSeconds: 120 }); });
  await jobs.runJobsOnce();
  assert.equal(savedDelay, 120, 'El worker respeta Retry-After y no reintenta a los dos segundos');
  assert.equal(completed, false, 'Un rechazo recuperable no marca el trabajo como completado');
}

(async () => {
  await verifyRetries(false);
  await verifyRetries(true);
  await verifyWorkerDelay();
})().catch(error => { console.error(error); process.exitCode = 1; });
