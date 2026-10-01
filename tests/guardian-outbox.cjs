const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
const { GuardianOutbox } = require('../src/guardian/guardianOutbox.ts');
const test = require('node:test');
function fixture(t, capacity = 2000) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-outbox-test-'));
  let outbox = new GuardianOutbox(directory, capacity);
  t.after(() => { outbox.close(); fs.rmSync(directory, { recursive: true }); });
  return { directory, get box() { return outbox; }, restart() { outbox.close(); outbox = new GuardianOutbox(directory, capacity); return outbox; } };
}
const event = () => ({ eventId: randomUUID(), message: 'evidencia' });
const stored = batch => ({ requestId: batch.requestId, status: 'STORED', acceptedEvents: batch.eventIds.length });
test('an acknowledgement cannot remove events enqueued while the request is in flight', t => {
  const f = fixture(t, 3); const first = event(); f.box.enqueue(first);
  const batch = f.box.batch({ instanceId: 'one' });
  const second = event(); f.box.enqueue(second); f.box.enqueue(event());
  assert.throws(() => f.box.enqueue(event()), /full/);
  f.box.acknowledge(batch.requestId, stored(batch));
  assert.equal(f.box.size, 2);
  assert.ok(f.box.batch({}).eventIds.includes(second.eventId));
});
test('network failure and process restart preserve exact body and idempotency key', t => {
  const f = fixture(t); f.box.enqueue(event());
  const pending = f.box.batch({ instanceId: 'old' }); f.box.enqueue(event());
  assert.deepEqual(f.box.batch({ instanceId: 'new' }), pending);
  assert.deepEqual(f.restart().batch({ instanceId: 'restarted' }), pending);
  f.box.acknowledge(pending.requestId, { requestId: pending.requestId, status: 'DUPLICATE', acceptedEvents: 0 });
  assert.equal(f.restart().size, 1);
});
test('batch is bounded in UTF-8 bytes and event count', t => {
  const f = fixture(t);
  for (let i = 0; i < 110; i++) f.box.enqueue({ ...event(), message: 'á'.repeat(4000) });
  const pending = f.box.batch({});
  assert.ok(Buffer.byteLength(pending.body) <= 60000);
  assert.ok(pending.eventIds.length < 100);
  assert.throws(() => f.box.acknowledge(randomUUID()), /mismatch/);
});
test('one process owns a spool and pending data has private permissions', t => {
  const f = fixture(t); f.box.enqueue(event()); f.box.batch({});
  assert.throws(() => new GuardianOutbox(f.directory), /owner/);
  assert.equal(fs.statSync(path.join(f.directory, 'events.jsonl')).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(f.directory, 'pending.json')).mode & 0o777, 0o600);
});
test('a success response without a matching complete receipt cannot discard events', t => {
  const f = fixture(t); f.box.enqueue(event()); const batch = f.box.batch({});
  for (const receipt of [undefined, {}, { ...stored(batch), requestId: randomUUID() },
    { ...stored(batch), acceptedEvents: 0 }, { ...stored(batch), status: 'OK' }]) {
    assert.throws(() => f.box.acknowledge(batch.requestId, receipt), /receipt/);
    assert.equal(f.box.size, 1);
    assert.equal(f.box.batch({}).requestId, batch.requestId);
  }
});
test('a failed append stops further writes and restart recovers only complete records', t => {
  const f = fixture(t); f.box.enqueue(event());
  const originalWrite = fs.writeFileSync;
  try {
    fs.writeFileSync = (fd, value, ...args) => {
      if (typeof fd === 'number') { originalWrite(fd, '{"partial":'); throw new Error('simulated disk failure'); }
      return originalWrite(fd, value, ...args);
    };
    assert.throws(() => f.box.enqueue(event()), /disk failure/);
  } finally { fs.writeFileSync = originalWrite; }
  assert.throws(() => f.box.enqueue(event()), /storage failed/);
  assert.throws(() => f.box.batch({}), /storage failed/);
  assert.equal(f.restart().size, 1);
  f.box.enqueue(event());
  assert.equal(f.restart().size, 2);
});
test('pending events retain their original process identity across a restart', t => {
  const f = fixture(t); f.box.enqueue({ ...event(), instanceId: 'previous-process' });
  f.restart().enqueue({ ...event(), instanceId: 'current-process' });
  const body = JSON.parse(f.box.batch({ instanceId: 'current-process' }).body);
  assert.deepEqual(body.events.map(e => e.instanceId), ['previous-process', 'current-process']);
  assert.equal(body.telemetry.instanceId, 'current-process');
});
