// src/cron/cleanupTokens.ts

import cron from 'node-cron';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import * as tokenService from '../middlewares/token.service';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET as string;

cron.schedule(
  '0 * * * *', // cada hora en el minuto 0
  async () => {
    let revokedCount = 0;
    const nowMs = Date.now();

    try {
      const stored = await prisma.token.findMany({ select: { token: true } });
      for (const { token } of stored) {
        let shouldRevoke = false;
        try {
          const payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as jwt.JwtPayload;
          if (payload.exp && payload.exp * 1000 < nowMs) shouldRevoke = true;
        } catch {
          shouldRevoke = true;
        }

        if (shouldRevoke) {
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
  },
  {
    timezone: 'America/Mexico_City',
  }
);
