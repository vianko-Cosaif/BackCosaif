import { prismaTorno, prismaTorreon } from '../lib/servicePrisma';
import { enqueueJob } from './durableJobs';
import { logger } from '../utils/logger';
import { isTornoModuleEnabled } from '../config/tornoFeature';
let running = false;
const disabledDevelopmentServices = new Set<string>();

function skipUnavailableServiceInDevelopment(service: string, error: any): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (!disabledDevelopmentServices.has(service)) {
    disabledDevelopmentServices.add(service);
    logger.warn('outbox:service_disabled_in_development', {
      service,
      message: error?.meta?.message || error?.message || 'No se pudo leer operational_outbox',
    });
  }
  return true;
}

export async function importServiceEvents() {
  if (running) return;
  running = true;
  try {
    for (const [service, db] of [['torno', prismaTorno], ['torreon', prismaTorreon]] as const) {
      if (service === 'torno' && !isTornoModuleEnabled()) continue;
      if (disabledDevelopmentServices.has(service)) continue;
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
      } catch (error: any) {
        if (!skipUnavailableServiceInDevelopment(service, error)) {
          logger.error('outbox:import_failed', { service, message: error.message });
        }
      }
    }
  } finally { running = false; }
}
export function startServiceOutbox() {
  const timer = setInterval(() => void importServiceEvents(), 5000); timer.unref();
  void importServiceEvents();
}
