// src/cron/cleanupTokens.ts

import cron from 'node-cron';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import * as tokenService from '../middlewares/token.service';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET as string;

// Cada hora en el minuto 0, hora CDMX
cron.schedule('0 * * * *', async () => {
  let revokedCount = 0;
  const nowMs = Date.now();

  try {
    // Trae todos los tokens (JWT) almacenados
    const stored = await prisma.token.findMany({
      select: { token: true }
    });

    for (const { token } of stored) {
      let shouldRevoke = false;

      try {
        // Decodifica sin considerar expiración para leer el claim exp
        const payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as jwt.JwtPayload;
        if (payload.exp && payload.exp * 1000 < nowMs) {
          shouldRevoke = true;
        }
      } catch {
        // Si no pasa la verificación (firma corrupta), también lo revoke
        shouldRevoke = true;
      }

      if (shouldRevoke) {
        // Usa tu servicio: borra + notifica
        await tokenService.removeToken(token);
        revokedCount++;
      }
    }

    if (revokedCount > 0) {
      console.log(`[${new Date().toISOString()}] Revocados ${revokedCount} tokens expirados.`);
    }
  } catch (err) {
    console.error('Error en limpieza de tokens expirados:', err);
  }
}, {
  timezone: 'America/Mexico_City',
});
