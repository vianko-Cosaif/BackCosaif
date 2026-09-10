import { prisma } from '../lib/prisma';
import { prismaTorno } from '../lib/servicePrisma';
import { enqueueJob, registerJob } from './durableJobs';
import { logger } from '../utils/logger';

const RECOVERY_WINDOW_MS = 5 * 60 * 60_000;
export async function scanTornoRecoveries() {
  let cursor = 0;
  while (true) {
    const candidates = await prisma.movimiento.findMany({
      where: { id: { gt: cursor }, torno: true, estado: 'CANCELADO', fechaFin: { gte: new Date(Date.now() - RECOVERY_WINDOW_MS) } },
      orderBy: { id: 'asc' }, take: 100, select: { id: true, fechaFin: true },
    });
    for (const item of candidates) await enqueueJob(`torno:recovery:${item.id}:${item.fechaFin!.getTime()}`, 'torno.recovery', { movimientoId: item.id });
    if (candidates.length < 100) break;
    cursor = candidates[candidates.length - 1].id;
  }
}
export function startTornoRecovery() {
  registerJob('torno.recovery', async ({ movimientoId }) => {
    const movement = await prisma.movimiento.findUnique({ where: { id: movimientoId } });
    if (!movement?.torno || movement.estado !== 'CANCELADO' || !movement.fechaFin) return;
    const expiresAt = new Date(movement.fechaFin.getTime() + RECOVERY_WINDOW_MS);
    if (expiresAt.getTime() <= Date.now()) return;
    const [measurement, existing] = await Promise.all([
      prismaTorno.ruedaSolicitud.findFirst({ where: { movimientoId }, select: { id: true } }),
      prismaTorno.tornoAgendado.findUnique({ where: { idMovimiento: movimientoId }, select: { id: true } }),
    ]);
    // Do not resurrect a schedule that an operator has already consumed.
    if (!measurement || existing) return;
    await prismaTorno.tornoAgendado.createMany({ skipDuplicates: true, data: [{ idMovimiento: movimientoId, locomotive: movement.locomotiveNumber,
      tipo: 'TORNO_RECUPERACION', localidad: movement.localidadId, fechaProgramada: movement.fechaFin, fechaLimiteActivacion: expiresAt }] });
  });
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await scanTornoRecoveries(); }
    catch (error: any) { logger.error('torno:recovery_scan_failed', { message: error.message }); }
    finally { running = false; }
  };
  const timer = setInterval(() => void run(), 60_000); timer.unref(); void run();
}
