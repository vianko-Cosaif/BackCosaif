// src/cron/cleanupTokens.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let running = false;

cron.schedule(
  '*/15 * * * *', // cada 15 minutos
  async () => {
    if (running) return;
    running = true;

    try {
      const now = new Date();

      // borra expirados o ya revocados
      const { count } = await prisma.token.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { not: null } },
          ],
        },
      });

      if (count > 0) {
        console.log(`[cleanupTokens] ${count} tokens purgados @ ${now.toISOString()}`);
      }
    } catch (err) {
      console.error('[cleanupTokens] error:', err);
    } finally {
      running = false;
    }
  },
  { timezone: 'America/Mexico_City' }
);

// opcional: export para pruebas
export {};
