const assert = require('node:assert/strict');
const express = require('express');
const { loader, logger } = require('./support/load-ts.cjs');
const operations = new Map();
let allowPersist;
let persistenceGate = Promise.resolve();
const prisma = {
  async $queryRawUnsafe(sql, key, userId, hash) {
    if (sql.includes('INSERT')) {
      if (operations.has(key)) return [];
      operations.set(key, { key, user_id: userId, request_hash: hash, state: 'PROCESSING', created_at: new Date() });
      return [{ key }];
    }
    return operations.has(key) ? [operations.get(key)] : [];
  },
  async $executeRawUnsafe(sql, key, state, status, body, type) {
    await persistenceGate;
    Object.assign(operations.get(key), { state, response_status: status, response_body: body, response_content_type: type });
    return 1;
  },
};
const middleware = loader({ 'src/lib/prisma': { prisma }, 'src/utils/logger': { logger } })('src/middlewares/idempotentMutation.ts').idempotentMutation;
function request(key, overrides = {}) {
  return { method: 'POST', originalUrl: '/example', body: { value: 1 }, user: { id: 1, auth: { v: 0 } }, authorization: { role: 'CLIENTE', scope: { empresaId: 1 } }, header: () => key, ...overrides };
}
function response() {
  const r = Object.create(express.response);
  const headers = new Map();
  const sent = new Promise(resolve => { r.end = body => { r.body = String(body ?? ''); resolve(r); return r; }; });
  r.app = express(); r.req = { method: 'POST', fresh: false }; r.statusCode = 200;
  r.getHeader = name => headers.get(name.toLowerCase());
  r.setHeader = (name, value) => headers.set(name.toLowerCase(), value);
  r.removeHeader = name => headers.delete(name.toLowerCase());
  return { r, sent };
}
async function main() {
  const first = response(); let executions = 0;
  persistenceGate = new Promise(resolve => { allowPersist = resolve; });
  await middleware(request('operation-test-1'), first.r, () => { executions++; first.r.status(201).send({ id: 42 }); });
  assert.equal(first.r.body, undefined, 'No acknowledgement before persistence');
  allowPersist(); await first.sent;
  assert.equal(JSON.parse(first.r.body).id, 42, 'Express send(object) must complete');
  const replay = response();
  await middleware(request('operation-test-1'), replay.r, () => { executions++; });
  await replay.sent;
  assert.equal(replay.r.body, first.r.body); assert.equal(executions, 1);
  const changed = response();
  await middleware(request('operation-test-1', { authorization: { role: 'CLIENTE', scope: { empresaId: 2 } } }), changed.r, () => { executions++; });
  await changed.sent; assert.equal(changed.r.statusCode, 409); assert.equal(executions, 1);
  const old = operations.get('operation-test-1'); old.state = 'PROCESSING'; old.created_at = new Date(Date.now() - 6 * 60000);
  const uncertain = response();
  await middleware(request('operation-test-1'), uncertain.r, () => { executions++; });
  await uncertain.sent; assert.equal(JSON.parse(uncertain.r.body).code, 'IDEMPOTENCY_REVIEW_REQUIRED'); assert.equal(executions, 1);
  const failed = response();
  await middleware(request('operation-test-2'), failed.r, () => failed.r.status(500).json({ error: 'Simulated post-commit failure' }));
  await failed.sent; assert.equal(operations.get('operation-test-2').state, 'REVIEW');
  const retry = response();
  await middleware(request('operation-test-2'), retry.r, () => { executions++; });
  await retry.sent; assert.equal(retry.r.statusCode, 409); assert.equal(executions, 1);
  persistenceGate = Promise.reject(new Error('Simulated persistence failure'));
  // Attach immediately; this rejection is intentionally consumed by the middleware.
  persistenceGate.catch(() => {});
  const unavailable = response();
  await middleware(request('operation-test-3'), unavailable.r, () => unavailable.r.status(201).send({ id: 43 }));
  await unavailable.sent; assert.equal(unavailable.r.statusCode, 503);
  assert.equal(operations.get('operation-test-3').state, 'PROCESSING');
  console.log('Idempotency: Express responses, persistence ordering, ambiguous failures and authorization replay OK');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
