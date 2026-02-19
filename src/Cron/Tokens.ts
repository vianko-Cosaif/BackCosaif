// src/cron/revokeEveryHour.ts
import cron from 'node-cron';
import { PrismaClient, Rol } from '@prisma/client';

const prisma = new PrismaClient();
let running = false;

cron.schedule(
  '0 * * * *', // cada hora
  async () => {
    if (running) return;
    running = true;

    try {
      // 1. rotar versión de token solo para MAQUINISTA
      await prisma.usuario.updateMany({
        where: { rol: Rol.MAQUINISTA },
        data: { tokenVersion: { increment: 1 } },
      });

      // 2. borrar sesiones (tokens de acceso) solo de MAQUINISTA
      const { count: tokenCount } = await prisma.token.deleteMany({
        where: { usuario: { rol: Rol.MAQUINISTA } },
      });

      // 3. borrar FCM solo de MAQUINISTA
      const { count: fcmCount } = await prisma.fcmToken.deleteMany({
        where: { usuario: { rol: Rol.MAQUINISTA } },
      });

      console.log(
        `[revokeEveryHour] maquinistas rotados, ${tokenCount} tokens borrados, ${fcmCount} FCM borrados @ ${new Date().toISOString()}`
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
