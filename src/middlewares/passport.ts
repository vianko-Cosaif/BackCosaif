import 'dotenv/config';

import passport from 'passport';
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  type StrategyOptions,
  type VerifiedCallback,
} from 'passport-jwt';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
// tu tipo original
import type { JwtPayload as BaseJwtPayload } from '../types/auth';
import * as tokenService from './token.service';

const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, NODE_ENV } = process.env;

if (!JWT_SECRET) {
  logger.error('JWT_SECRET no está definido en .env');
  throw new Error('JWT_SECRET no está definido en .env');
}

// extendemos aquí para evitar tocar tu ../types/auth
type JwtPayload = BaseJwtPayload & {
  sub?: string;        // lo que sí firma tu login
  userId?: number;     // por si algún día firmas así
};

const prisma = new PrismaClient();

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithms: ['HS256'],
  ignoreExpiration: NODE_ENV === 'development',
};

passport.use(
  new JwtStrategy(opts, async (jwtPayload: JwtPayload, done: VerifiedCallback) => {
    try {
      // 1. normalizar userId
      const userIdRaw =
        (typeof jwtPayload.id === 'number' ? jwtPayload.id : null) ??
        (typeof jwtPayload.sub === 'string' ? Number(jwtPayload.sub) : null) ??
        (typeof jwtPayload.userId === 'number' ? jwtPayload.userId : null);

      if (!userIdRaw || Number.isNaN(userIdRaw)) {
        logger.warn('Token inválido: ID/SUB faltante', { jwtPayload });
        return done(null, false, { message: 'Token inválido: ID/SUB faltante' });
      }

      // 2. jti obligatorio
      if (!jwtPayload.jti || typeof jwtPayload.jti !== 'string') {
        logger.warn('Token inválido: jti faltante', { jwtPayload });
        return done(null, false, { message: 'Token inválido: jti faltante' });
      }

      // 3. validar contra tabla Token (usa el nombre correcto del service)
      const esValido = await tokenService.esTokenVigente(jwtPayload.jti);
      if (!esValido) {
        logger.info('Token revocado o vencido', { jti: jwtPayload.jti, userId: userIdRaw });
        return done(null, false, { message: 'Token revocado o vencido' });
      }

      // 4. traer usuario
      const user = await prisma.usuario.findUnique({
        where: { id: userIdRaw },
        select: {
          id: true,
          nombre: true,
          rol: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
        },
      });

      if (!user) {
        logger.warn('Usuario no encontrado', { userId: userIdRaw });
        return done(null, false, { message: 'Usuario no encontrado' });
      }

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
  }),
);

export default passport;
