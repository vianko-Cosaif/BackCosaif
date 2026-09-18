import { prisma } from '../lib/prisma';
import { prismaTorno, prismaTorreon } from '../lib/servicePrisma';
export async function verifyOperationalSchema() {
  await prisma.$queryRaw`SELECT id FROM report_exports LIMIT 0`;
  await prisma.$queryRaw`SELECT key FROM durable_jobs LIMIT 0`;
  await prisma.$queryRaw`SELECT event_id FROM fcm_deliveries LIMIT 0`;
  await prisma.$queryRaw`SELECT incident_id FROM incident_reprogramming LIMIT 0`;
  await prisma.$queryRaw`SELECT key FROM offline_idempotency LIMIT 0`;
  for (const db of [prismaTorno, prismaTorreon]) await db.$queryRawUnsafe('SELECT id FROM operational_outbox LIMIT 0');
}
