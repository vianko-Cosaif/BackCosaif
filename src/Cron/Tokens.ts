// src/cron/revokeEvery2h.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let running = false;

cron.schedule(
  '0 */2 * * *', // cada 2 horas
  async () => {
    if (running) return;
    running = true;

    try {
      // 1. rotar versión de token para tumbar JWT viejos
      await prisma.usuario.updateMany({
        data: {
          tokenVersion: { increment: 1 },
        },
      });

      // 2. borrar sesiones (tokens de acceso)
      const { count: tokenCount } = await prisma.token.deleteMany({});

      // 3. Los tokens FCM no se borran por rotación de sesión.
      // Se eliminan solo al hacer logout/eliminar usuario o cuando Firebase los marca inválidos.

      console.log(
        `[revokeEvery2h] usuarios rotados, ${tokenCount} tokens de sesion borrados, FCM conservados @ ${new Date().toISOString()}`
      );
    } catch (err) {
      console.error('[revokeEvery2h] error:', err);
    } finally {
      running = false;
    }
  },
  { timezone: 'America/Mexico_City' }
);

export {};
