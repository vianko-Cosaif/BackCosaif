import { prisma } from '../lib/prisma';
import { prismaTorno, prismaTorreon } from '../lib/servicePrisma';
import { logger } from '../utils/logger';
import { isTornoModuleEnabled } from '../config/tornoFeature';

async function verifyServiceOutbox(name: 'torno' | 'torreon', db: typeof prismaTorno) {
  try {
    await db.$queryRawUnsafe('SELECT id FROM operational_outbox LIMIT 0');
  } catch (error: any) {
    if (process.env.NODE_ENV === 'production') throw error;
    logger.warn('jobs:schema_check_service_skipped', {
      service: name,
      message: error?.meta?.message || error?.message || 'No se pudo validar operational_outbox',
    });
  }
}

export async function verifyOperationalSchema() {
  await prisma.$queryRaw`SELECT id FROM report_exports LIMIT 0`;
  await prisma.$queryRaw`SELECT key FROM durable_jobs LIMIT 0`;
  await prisma.$queryRaw`SELECT incident_id FROM incident_reprogramming LIMIT 0`;
  await prisma.$queryRaw`SELECT key FROM offline_idempotency LIMIT 0`;
  if (isTornoModuleEnabled()) await verifyServiceOutbox('torno', prismaTorno);
  await verifyServiceOutbox('torreon', prismaTorreon);
}
