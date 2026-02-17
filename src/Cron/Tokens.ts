// src/cron/revokeEvery2h.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ENV = process.env.NODE_ENV;
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

      // 3. borrar FCM para que no lleguen notificaciones a quien ya no debe
      const { count: fcmCount } = await prisma.fcmToken.deleteMany({});

      if(ENV === "development"){
        console.log(
        `[revokeEvery2h] usuarios rotados, ${tokenCount} tokens borrados, ${fcmCount} FCM borrados @ ${new Date().toISOString()}`
      );
      } else {
        console.log(
          `usuarios rotados, tokens borrados, FCM borrados @ ${new Date().toISOString()}`
        );
      }
      
    } catch (err) {
      if(ENV === "development"){
        console.error('[revokeEvery2h] error:', err, ' en revokeEvery2h');
      } else {
        console.error('error: Al revocar tokens');
      }
    } finally {
      running = false;
    }
  },
  { timezone: 'America/Mexico_City' }
);

export {};
