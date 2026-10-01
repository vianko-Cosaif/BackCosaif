import { prisma } from '../lib/prisma';
import { RondaModel } from '../models/Movimientos/Ronda/RondaModel';
import { registerJob } from './durableJobs';
import { logger } from '../utils/logger';
export function startRoundMaintenance() {
  registerJob('round.maintain', ({ localidadId }) => RondaModel.asegurarOrdenRondasLocalidad(localidadId));
  const scan = async () => {
    const localities = await prisma.localidad.findMany({
      where: { OR: [
        { rondas: { some: { concluido: false } } },
        { movimientos: { some: { estado: 'EN_PROCESO', finalizado: false } } },
      ] }, select: { id: true },
    });
    // One reusable job per locality; concurrent API instances cannot build up a minute-by-minute backlog.
    for (const locality of localities) {
      const key = `round:${locality.id}`;
      await prisma.$executeRaw`INSERT INTO durable_jobs (key, kind, payload)
        VALUES (${key}, 'round.maintain', ${JSON.stringify({ localidadId: locality.id })}::jsonb)
        ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, completed_at = NULL, available_at = NOW(),
          attempts = 0, locked_until = NULL, lock_token = NULL, last_error = NULL
        WHERE durable_jobs.completed_at IS NOT NULL`;
    }
  };
  const run = () => void scan().catch(error => logger.error('round:maintenance_failed', { message: error.message }));
  const timer = setInterval(run, 60_000); timer.unref(); run();
}
