const assert = require('node:assert/strict');
const { loader } = require('./support/load-ts.cjs');
let now = 100000, failures = 1, torreonCalls = 0, tornoCalls = 0, enqueueFailure = false;
const enqueued = new Set(), acknowledged = [], warnings = [], recovery = [];
const row = { id: 17, table_name: 'movimiento_torreon_ferro', action: 'UPDATE', payload: { id: 42 }, previous: {}, created_at: new Date(0) };
const tx = { $queryRawUnsafe: async () => [row], $executeRaw: async (_sql, id) => acknowledged.push(id) };
const outbox = loader({
  'src/lib/servicePrisma': { prismaTorno: { $transaction: async fn => { tornoCalls++; await fn({ $queryRawUnsafe: async () => [] }); } },
    prismaTorreon: { $transaction: async fn => { torreonCalls++; if (failures-- > 0) throw Object.assign(Error('temporary'), { code: 'P1001' }); await fn(tx); } } },
  'src/jobs/durableJobs': { enqueueJob: async (key, kind, payload) => {
    if (enqueueFailure) throw Error('main database unavailable');
    assert.equal(kind, 'torreon.event'); assert.equal(payload.occurredAt, row.created_at);
    enqueued.add(key);
  } },
  'src/config/tornoFeature': { isTornoModuleEnabled: () => true },
  'src/utils/logger': { logger: { warn: (event, detail) => warnings.push({event, ...detail}), error() {}, info: event => recovery.push(event) } },
}, { Date: class extends Date { static now() { return now; } } })('src/jobs/serviceOutbox.ts');
(async () => {
  await outbox.importServiceEvents();
  assert.equal(torreonCalls, 1); assert.equal(warnings[0].retryAfterSeconds, 5);
  now += 4999; await outbox.importServiceEvents(); assert.equal(torreonCalls, 1); assert.equal(tornoCalls, 2);
  now++; await outbox.importServiceEvents(); assert.equal(torreonCalls, 2); assert.deepEqual([...enqueued], ['torreon:outbox:17']);
  assert.deepEqual(acknowledged, [17]); assert.deepEqual(recovery, ['outbox:import_recovered']);
  enqueueFailure = true; await outbox.importServiceEvents(); assert.equal(acknowledged.length, 1, 'No acknowledgement if main DB enqueue fails');
  enqueueFailure = false; now += 5000; await outbox.importServiceEvents();
  assert.equal(enqueued.size, 1, 'Recovery retains the same persistent job key'); assert.equal(acknowledged.length, 2);
  failures = 20;
  for (let i=0;i<12;i++) { now += 300000; await outbox.importServiceEvents(); }
  assert.equal(warnings.at(-1).retryAfterSeconds, 300, 'Retry delay is capped at five minutes');
  assert.ok(tornoCalls > torreonCalls, 'Unavailable service never blocks the other outbox');
  console.log('PASS outbox recovery: transient startup, bounded retries, independent services, enqueue-before-ack and persistent identity');
})().catch(error => { console.error(error); process.exitCode=1; });
