import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { registerJob } from '../../jobs/durableJobs';
import { exportAuthorization, authorizeExportFilters, reportError } from './exportAccess';
import { writeExport } from './exportFiles';
import type { ExportRecord } from './exportStore';

export async function runReportExport(payload: unknown) {
  const { id } = z.object({ id: z.string().uuid() }).parse(payload);
  const runToken = randomUUID();
  const [record] = await prisma.$queryRaw<ExportRecord[]>`
    UPDATE report_exports SET status = 'RUNNING', attempts = attempts + 1, run_token = ${runToken}::uuid
    WHERE id = ${id}::uuid AND status IN ('QUEUED', 'RUNNING') RETURNING *`;
  if (!record) return;
  let artifact: Awaited<ReturnType<typeof writeExport>> | undefined;
  const authorize = async () => {
    if (record.expires_at <= new Date()) throw reportError(410, 'La exportación venció');
    const actor = await prisma.usuario.findUnique({ where: { id: record.owner_id }, select: { id: true, rol: true, empresaId: true, localidadId: true, activo: true } });
    if (!actor || exportAuthorization(actor).hash !== record.authorization_hash) throw reportError(403, 'Los permisos cambiaron; solicita otra exportación');
    authorizeExportFilters(actor, record.filters);
  };
  try {
    await authorize();
    artifact = await writeExport(record);
    await authorize();
    const updated = await prisma.$executeRaw`UPDATE report_exports SET status = 'COMPLETED', artifact_token = ${artifact.token}::uuid,
      row_count = ${artifact.rows}, bytes = ${artifact.bytes}, error = NULL
      WHERE id = ${id}::uuid AND run_token = ${runToken}::uuid`;
    if (!updated) await rm(artifact.path, { force: true });
  } catch (error: any) {
    if (artifact) await rm(artifact.path, { force: true });
    const permanent = [403, 410, 422].includes(error?.status);
    if (permanent || record.attempts >= 5) {
      const message = permanent ? error.message : 'No se pudo generar el archivo después de 5 intentos';
      await prisma.$executeRaw`UPDATE report_exports SET status = 'FAILED', error = ${message} WHERE id = ${id}::uuid AND run_token = ${runToken}::uuid`;
      return;
    }
    throw error;
  }
}
export function registerReportExportWorker() { registerJob('report.export', runReportExport); }
