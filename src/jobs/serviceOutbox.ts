import { prismaTorno, prismaTorreon } from '../lib/servicePrisma';
import { enqueueJob } from './durableJobs';
import { logger } from '../utils/logger';
let running = false;
export async function importServiceEvents() {
  if (running) return;
  running = true;
  try {
    for (const [service, db] of [['torno', prismaTorno], ['torreon', prismaTorreon]] as const) {
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
      } catch (error: any) { logger.error('outbox:import_failed', { service, message: error.message }); }
    }
  } finally { running = false; }
}
export function startServiceOutbox() {
  const timer = setInterval(() => void importServiceEvents(), 5000); timer.unref();
  void importServiceEvents();
}
