import { prismaTorno, prismaTorreon } from '../lib/servicePrisma';
import { enqueueJob } from './durableJobs';
import { logger } from '../utils/logger';
import { isTornoModuleEnabled } from '../config/tornoFeature';
let running = false;
// An unavailable service is retried independently; startup/transient failures
// must never disable its outbox until the API restarts.
const retries = new Map<string, { failures: number; nextAttemptAt: number }>();

function scheduleRetry(service: string, error: any) {
  const failures = (retries.get(service)?.failures ?? 0) + 1;
  const delayMs = Math.min(300_000, 5_000 * 2 ** Math.min(failures - 1, 6));
  retries.set(service, { failures, nextAttemptAt: Date.now() + delayMs });
  const details = { service, failures, retryAfterSeconds: delayMs / 1000,
    code: typeof error?.code === 'string' ? error.code : 'unknown' };
  if (process.env.NODE_ENV === 'production') logger.error('outbox:import_retry', details);
  else logger.warn('outbox:import_retry', details);
}

export async function importServiceEvents() {
  if (running) return;
  running = true;
  try {
    for (const [service, db] of [['torno', prismaTorno], ['torreon', prismaTorreon]] as const) {
      if (service === 'torno' && !isTornoModuleEnabled()) continue;
      if ((retries.get(service)?.nextAttemptAt ?? 0) > Date.now()) continue;
      try {
        await db.$transaction(async (tx: any) => {
          const events = await tx.$queryRawUnsafe('SELECT * FROM operational_outbox WHERE processed_at IS NULL ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 50');
          for (const event of events) {
            // A crash after enqueue but before acknowledgement is safe: job keys are unique.
            await enqueueJob(`${service}:outbox:${event.id}`, `${service}.event`, {
              table: event.table_name, action: event.action, row: event.payload, previous: event.previous, occurredAt: event.created_at,
            });
            await tx.$executeRaw`UPDATE operational_outbox SET processed_at = NOW() WHERE id = ${event.id}`;
          }
        }, { timeout: 30_000 });
        if (retries.delete(service)) logger.info('outbox:import_recovered', { service });
      } catch (error: any) {
        scheduleRetry(service, error);
      }
    }
  } finally { running = false; }
}
export function startServiceOutbox() {
  const timer = setInterval(() => void importServiceEvents(), 5000); timer.unref();
  void importServiceEvents();
}
