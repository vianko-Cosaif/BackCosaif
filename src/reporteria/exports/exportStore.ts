import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { enqueueJob } from '../../jobs/durableJobs';
import type { MovementFilters } from '../../application/movements/movementQuery';
import { authorizeExportFilters, exportAuthorization, reportError, type ExportActor } from './exportAccess';

export const exportFormatSchema = z.enum(['csv', 'xlsx', 'pdf']);
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type ExportRecord = {
  id: string; owner_id: number; authorization_hash: string; format: ExportFormat; filters: MovementFilters;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'; created_at: Date; expires_at: Date;
  artifact_token: string | null; row_count: number | null; bytes: bigint | number | null; error: string | null; attempts: number;
};
export async function createExport(actor: ExportActor, format: ExportFormat, value: unknown) {
  const filters = authorizeExportFilters(actor, value);
  const { hash } = exportAuthorization(actor);
  const id = randomUUID();
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(64092, 1)::text`;
    const [quota] = await tx.$queryRaw<{ active: number; own: number; daily: number; own_daily: number }[]>`
      SELECT COUNT(*) FILTER (WHERE status IN ('QUEUED', 'RUNNING') AND expires_at > NOW())::int AS active,
        COUNT(*) FILTER (WHERE owner_id = ${actor.id} AND status IN ('QUEUED', 'RUNNING') AND expires_at > NOW())::int AS own,
        COUNT(*)::int AS daily, COUNT(*) FILTER (WHERE owner_id = ${actor.id})::int AS own_daily
      FROM report_exports WHERE created_at >= NOW() - INTERVAL '1 day'`;
    if (quota.active >= 100 || quota.own >= 10 || quota.daily >= 200 || quota.own_daily >= 20) throw reportError(429, 'Límite de exportaciones alcanzado; inténtalo más tarde');
    const [record] = await tx.$queryRaw<ExportRecord[]>`
      INSERT INTO report_exports(id, owner_id, authorization_hash, format, filters)
      VALUES (${id}::uuid, ${actor.id}, ${hash}, ${format}, ${JSON.stringify(filters)}::jsonb) RETURNING *`;
    await enqueueJob(`report:${id}`, 'report.export', { id }, tx);
    return publicExport(record);
  });
}
export async function getExport(actor: ExportActor, id: string) {
  z.string().uuid().parse(id);
  const [record] = await prisma.$queryRaw<ExportRecord[]>`SELECT * FROM report_exports WHERE id = ${id}::uuid AND owner_id = ${actor.id}`;
  if (!record) throw reportError(404, 'Exportación no encontrada');
  if (record.expires_at <= new Date()) throw reportError(410, 'La exportación venció; solicita otra');
  if (record.authorization_hash !== exportAuthorization(actor).hash) throw reportError(403, 'Los permisos cambiaron; solicita otra exportación');
  authorizeExportFilters(actor, record.filters);
  return record;
}
export function publicExport(record: ExportRecord) {
  return { id: record.id, format: record.format, status: record.status, createdAt: record.created_at, expiresAt: record.expires_at, rows: record.row_count, bytes: record.bytes === null ? null : Number(record.bytes), error: record.error,
    downloadUrl: record.status === 'COMPLETED' ? `/reporteria/exportaciones/${record.id}/archivo` : null };
}
