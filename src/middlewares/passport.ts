import 'dotenv/config'; // carga .env antes de todo

import passport from 'passport';
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  type StrategyOptions,
  type VerifiedCallback,
} from 'passport-jwt';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import type { JwtPayload } from '../types/auth';
import * as tokenService from './token.service'; // asume que exporta isTokenValid()

// --- Variables de entorno ---
const {
  JWT_SECRET,
  JWT_ISSUER,
  JWT_AUDIENCE,
  NODE_ENV,
} = process.env;

// --- Validación crítica de configuración ---
if (!JWT_SECRET) {
  logger.error('❌ JWT_SECRET no está definido en .env');
  throw new Error('JWT_SECRET no está definido en .env');
}
if (!JWT_ISSUER) {
  logger.warn('⚠️ JWT_ISSUER no está definido en .env');
}
if (!JWT_AUDIENCE) {
  logger.warn('⚠️ JWT_AUDIENCE no está definido en .env');
}

// --- Prisma client ---
const prisma = new PrismaClient();

// --- Opciones de estrategia JWT ---
const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithms: ['HS256'],
  ignoreExpiration: NODE_ENV === 'development',
};

// --- Passport JWT Strategy ---
passport.use(
  new JwtStrategy(opts, async (jwtPayload: JwtPayload, done: VerifiedCallback) => {
    try {
      // 1) ID presente y numérico
      if (!jwtPayload?.id || typeof jwtPayload.id !== 'number') {
        logger.warn('Token inválido: ID faltante o tipo incorrecto', { jwtPayload });
        return done(null, false, { message: 'Token inválido: ID faltante' });
      }

      // 2) Revocación: sólo válido si está en la DB y no revocado
      if (jwtPayload.jti) {
        const valido = await tokenService.isTokenValid(jwtPayload.jti);
        if (!valido) {
          logger.info('Token revocado o no registrado', { jti: jwtPayload.jti, userId: jwtPayload.id });
          return done(null, false, { message: 'Token revocado' });
        }
      }

      // 3) Busca usuario con empresa, localidad y estado
      const user = await prisma.usuario.findUnique({
        where: { id: jwtPayload.id },
        select: {
          id: true,
          nombre: true,
          rol: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
        },
      });

      if (!user) {
        logger.warn('Usuario no encontrado', { userId: jwtPayload.id });
        return done(null, false, { message: 'Usuario no encontrado' });
      }

      // 4) Usuario safe
      const safeUser = {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        empresa: user.empresa,
        localidad: user.localidad,
      };

      logger.info('JWT válido, usuario autenticado', { userId: user.id });
      return done(null, safeUser);
    } catch (error) {
      logger.error('Error en validación de JWT con Passport', { error, jwtPayload });
      return done(error as Error, false);
    }
  })
);

export default passport;
