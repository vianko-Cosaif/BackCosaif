const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
const receipts = new Set();
const sent = [];
let jobKey = 'torreon:outbox:1';
let dbUnavailable = false;
const load = loader({
  'src/jobs/durableJobs': { getDurableJobKey: () => jobKey },
  'src/lib/prisma': { prisma: { $executeRaw: async (_sql, event, recipient) => {
    if (dbUnavailable) throw new Error('DB unavailable');
    const key = `${event}:${recipient}`;
    if (receipts.has(key)) return 0;
    receipts.add(key); return 1;
  } } },
  'src/config/firebase': { messaging: { send: async message => {
    sent.push(message);
    if (message.token === 'uncertain') throw new Error('Timeout after send');
    return 'fcm-' + sent.length;
  } } },
});
const { sendMulticastCompat: send } = load('src/services/fcmCompat.ts');
const message = { tokens: ['ok', 'uncertain', 'ok'], notification: { title: 'Movimiento iniciado' }, data: { tipo: 'iniciado', movimientoId: 1 } };
(async () => {
  const first = await send(message);
  assert.equal(sent.length, 2, 'Un token repetido se envía una sola vez');
  assert.equal(first.responses.length, 3, 'Se conserva la correspondencia con los tokens del llamador');
  await send({ ...message, data: { ...message.data, timestamp: 'changed' } });
  assert.equal(sent.length, 2, 'Reintentar no reenvía entregas aceptadas ni inciertas');
  const restarted = loader({
    'src/jobs/durableJobs': { getDurableJobKey: () => jobKey },
    'src/services/fcmDelivery': { claimFcmDelivery: load('src/services/fcmDelivery.ts').claimFcmDelivery },
    'src/config/firebase': { messaging: { send: async () => { throw new Error('Duplicate after restart'); } } },
  })('src/services/fcmCompat.ts');
  assert.equal((await restarted.sendMulticastCompat(message)).failureCount, 0);
  jobKey = 'torreon:outbox:2';
  await Promise.all([send(message), send(message)]);
  assert.equal(sent.length, 4, 'Un evento distinto se notifica, una vez incluso con concurrencia');
  assert.notEqual(sent[0].data.eventId, sent[2].data.eventId);
  assert.equal(sent[0].webpush.notification.renotify, false);
  assert.equal(sent[0].webpush.notification.requireInteraction, false);
  jobKey = 'torreon:outbox:3'; dbUnavailable = true;
  assert.equal((await send(message)).failureCount, 3);
  assert.equal(sent.length, 4, 'Si falla la reserva no se envía sin deduplicar');
  dbUnavailable = false;
  await send(message);
  assert.equal(sent.length, 6, 'La reserva fallida permite recuperar el envío');
  jobKey = undefined;
  await send({ ...message, tokens: ['ok'] });
  await send({ ...message, tokens: ['ok'] });
  assert.notEqual(sent[6].data.eventId, sent[7].data.eventId);
  console.log('PASS FCM: duplicados, reintentos, reinicio, concurrencia, fallo de reserva y eventos independientes');
})().catch(error => { console.error(error); process.exitCode = 1; });
