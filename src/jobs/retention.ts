import { prisma } from '../lib/prisma';
import { prismaTorno, prismaTorreon } from '../lib/servicePrisma';
import { logger } from '../utils/logger';

// Keep operation keys as tombstones so pruning payloads cannot enable a replay.
export async function pruneOperationalPayloads() {
  await prisma.$executeRaw`UPDATE durable_jobs SET payload = '{}'::jsonb WHERE key IN (
    SELECT key FROM durable_jobs WHERE completed_at < NOW() - INTERVAL '7 days'
    AND payload <> '{}'::jsonb ORDER BY completed_at LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
  await prisma.$executeRaw`DELETE FROM durable_jobs WHERE key IN (
    SELECT key FROM durable_jobs WHERE kind IN ('round.maintain', 'movement.pending-reminder') AND completed_at < NOW() - INTERVAL '30 days'
    ORDER BY completed_at LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
  await prisma.$executeRaw`UPDATE offline_idempotency SET response_body = NULL, response_status = 409, updated_at = NOW()
    WHERE key IN (SELECT key FROM offline_idempotency WHERE state = 'COMPLETED' AND expires_at < NOW()
    AND response_body IS NOT NULL ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED)`;
  for (const db of [prismaTorno, prismaTorreon]) {
    await db.$executeRawUnsafe(`DELETE FROM operational_outbox WHERE id IN (
      SELECT id FROM operational_outbox WHERE processed_at < NOW() - INTERVAL '30 days'
      ORDER BY processed_at LIMIT 1000 FOR UPDATE SKIP LOCKED)`);
  }
}

export function startOperationalRetention() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await pruneOperationalPayloads(); }
    catch (error: any) { logger.error('jobs:retention_failed', { message: error.message }); }
    finally { running = false; }
  };
  const timer = setInterval(() => void run(), 3600_000); timer.unref();
  void run();
}
