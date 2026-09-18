const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
async function verifyDeliveryStorage(dedicatedTable) {
const receipts = new Set();
const sent = [];
let jobKey = 'torreon:outbox:1';
let dbUnavailable = false;
const load = loader({
  'src/jobs/durableJobs': { getDurableJobKey: () => jobKey },
  'src/lib/prisma': { prisma: {
    $queryRaw: async () => [{ available: dedicatedTable }],
    $executeRaw: async (sql, event, recipient) => {
    if (dbUnavailable) throw new Error('DB unavailable');
    if (dedicatedTable) {
      assert.match(sql.join('?'), /INSERT INTO fcm_deliveries/);
    } else {
      assert.match(sql.join('?'), /INSERT INTO durable_jobs \(key, kind, payload, completed_at\)/);
      assert.match(sql.join('?'), /'fcm.delivery', '\{\}'::jsonb, NOW\(\)/);
      assert.match(event, /^fcm:delivery:v1:[a-f0-9]{64}$/);
      assert.equal(recipient, undefined, 'No se guarda el token ni el contenido del aviso');
    }
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
  const first = await send(message);
  assert.equal(sent.length, 2, 'Un token repetido se envía una sola vez');
  assert.equal(first.responses.length, 3, 'Se conserva la correspondencia con los tokens del llamador');
  await send({ ...message, data: { ...message.data, timestamp: 'changed' } });
  assert.equal(sent.length, 2, 'Reintentar no reenvía entregas aceptadas ni inciertas');
  const restarted = loader({
    'src/jobs/durableJobs': { getDurableJobKey: () => jobKey },
    'src/services/fcmDelivery': { claimFcmDelivery: loader({
      'src/lib/prisma': { prisma: {
        $queryRaw: async () => [{ available: dedicatedTable }],
        $executeRaw: async (_sql, event, recipient) => receipts.has(`${event}:${recipient}`) ? 0 : 1,
      } },
    })('src/services/fcmDelivery.ts').claimFcmDelivery },
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
  const beforeCreation = sent.length;
  const created = { tokens: ['ok'], data: { tipo: 'nuevo_movimiento', movimientoId: '15', localidadId: '1', source: 'cosaif' } };
  await Promise.all([send(created), send(created)]);
  await send({ ...created, data: { ...created.data, eventId: 'different-transport-id' } });
  assert.equal(sent.length, beforeCreation + 1, 'Direct creation is reserved once without an outbox job');
  assert.equal(sent.at(-1).android.notification.tag, sent.at(-1).data.eventId);
  assert.equal(sent.at(-1).notification.title, 'Nueva solicitud de movimiento');
  const logical = load('src/services/logicalNotificationId.ts').logicalNotificationId;
  assert.equal(sent.at(-1).data.eventId, logical({ type: 'movimiento.creado', movimientoId: 15, localidadId: 1 }));
  assert.notEqual(logical({ type: 'movimiento.creado', movimientoId: 15, localidadId: 1 }), logical({ type: 'movimiento.creado', movimientoId: 15, localidadId: 2 }));
  assert.equal(logical({ type: 'torreon.movimiento.estado', movimientoId: 15, localidadId: 2, estado: 'EN_PROCESO', accion: 'reanudado' }), null);
  jobKey = 'reminder-test';
  const expiry = new Date(Date.now() + 120000).toISOString();
  await send({ tokens: ['ok'], data: { tipo: 'movimiento_pendiente_recordatorio', source: 'cosaif', eventId: 'reminder-hour-1', expiresAt: expiry } });
  const reminder = sent.at(-1);
  assert.equal(reminder.data.eventId, 'reminder-hour-1', 'Realtime and push use the same logical ID');
  assert.ok(Number(reminder.webpush.headers.TTL) <= 120);
  assert.ok(reminder.android.ttl <= 120000);
  assert.match(reminder.data.recipientRoles, /COORDINADOR/);
  const beforeExpired = sent.length;
  await send({ tokens: ['ok'], data: { expiresAt: new Date(Date.now() - 1000).toISOString() } });
  assert.equal(sent.length, beforeExpired, 'Expired reminders are never sent');
  console.log(`PASS FCM (${dedicatedTable ? 'tabla anterior' : 'sin migración'}): duplicados, reintentos, reinicio, concurrencia, fallo de reserva y eventos independientes`);
}
(async () => {
  await verifyDeliveryStorage(false);
  await verifyDeliveryStorage(true);
  let lookupUnavailable = true;
  const claim = loader({ 'src/lib/prisma': { prisma: {
    $queryRaw: async () => {
      if (lookupUnavailable) throw new Error('DB unavailable');
      return [{ available: false }];
    },
    $executeRaw: async () => 1,
  } } })('src/services/fcmDelivery.ts').claimFcmDelivery;
  await assert.rejects(() => claim('retry-lookup', 'synthetic-token'), /DB unavailable/);
  lookupUnavailable = false;
  assert.equal(await claim('retry-lookup', 'synthetic-token'), true, 'La detección se recupera después de un fallo de conexión');
  const checkQueries = [];
  const checkDb = { $queryRaw: async sql => {
    const query = sql.join('?');
    assert.doesNotMatch(query, /fcm_deliveries/, 'El arranque no exige una tabla de entregas nueva');
    checkQueries.push(query);
    return [];
  }, $queryRawUnsafe: async () => [] };
  await loader({
    'src/lib/prisma': { prisma: checkDb },
    'src/lib/servicePrisma': { prismaTorno: checkDb, prismaTorreon: checkDb },
  })('src/jobs/schemaCheck.ts').verifyOperationalSchema();
  assert.equal(checkQueries.length, 4, 'Se conservan las comprobaciones operativas existentes');
})().catch(error => { console.error(error); process.exitCode = 1; });
