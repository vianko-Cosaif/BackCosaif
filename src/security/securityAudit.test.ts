import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { SecurityAuditLog, verifySecurityAuditFile } from './securityAudit';

async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cosaif-audit-'));
  const filePath = path.join(directory, 'audit.jsonl');
  const key = 'test-key-with-more-than-thirty-two-characters';
  const audit = new SecurityAuditLog(filePath, key);
  const base = {
    actor: { userId: 1, role: 'ADMINISTRADOR' },
    request: { method: 'PATCH', path: '/movimientos/1', ipFingerprint: 'abc' },
    outcome: { statusCode: 200, allowed: true },
  };

  await Promise.all([
    audit.append({ ...base, eventId: 'event-1', occurredAt: '2026-01-01T00:00:00.000Z' }),
    audit.append({ ...base, eventId: 'event-2', occurredAt: '2026-01-01T00:00:01.000Z' }),
  ]);

  const valid = await verifySecurityAuditFile(filePath, key);
  assert.equal(valid.valid, true);
  if (valid.valid) assert.equal(valid.records, 2);

  const contents = await fs.readFile(filePath, 'utf8');
  await fs.writeFile(filePath, contents.replace('event-1', 'event-X'));
  const tampered = await verifySecurityAuditFile(filePath, key);
  assert.equal(tampered.valid, false);
  if (!tampered.valid) assert.equal(tampered.reason, 'hash_mismatch');

  await fs.rm(directory, { recursive: true, force: true });
  console.log('Cadena de auditoría de seguridad: OK');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
