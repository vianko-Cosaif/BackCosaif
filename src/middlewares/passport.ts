import 'dotenv/config';

import passport from 'passport';
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  type StrategyOptions,
  type VerifiedCallback,
} from 'passport-jwt';
import { logger } from '../utils/logger';
import type { AuthenticatedUser, JwtPayload } from '../types/auth';
import * as tokenService from './token.service';
import { prisma } from '../lib/prisma';

const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = process.env;

if (!JWT_SECRET) {
  logger.error('JWT_SECRET no está definido en .env');
  throw new Error('JWT_SECRET no está definido en .env');
}

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithms: ['HS256'],
  // La expiración efectiva vive en la tabla Token para permitir renovación por petición.
  ignoreExpiration: true,
};

const userIdFromPayload = (jwtPayload: JwtPayload) =>
  (typeof jwtPayload.id === 'number' ? jwtPayload.id : undefined) ??
  (typeof jwtPayload.sub === 'string' ? Number(jwtPayload.sub) : undefined) ??
  (typeof jwtPayload.userId === 'number' ? jwtPayload.userId : undefined);

passport.use(
  new JwtStrategy(opts, async (jwtPayload: JwtPayload, done: VerifiedCallback) => {
    try {
      // 1. normalizar userId
      const userIdRaw = userIdFromPayload(jwtPayload);

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
      const esValido = await tokenService.esSesionVigenteDeUsuario(
        jwtPayload.jti,
        userIdRaw,
        { usuarioId: userIdRaw },
      );
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
          activo: true,
          tokenVersion: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
        },
      });

      if (!user) {
        logger.warn('Usuario no encontrado', { userId: userIdRaw });
        return done(null, false, { message: 'Usuario no encontrado' });
      }

      if (!user.activo) {
        logger.info('Usuario desactivado', { userId: user.id });
        return done(null, false, { message: 'Usuario desactivado' });
      }

      const tokenVersion = typeof jwtPayload.v === 'number' ? jwtPayload.v : 0;
      if (tokenVersion !== user.tokenVersion) {
        logger.info('Token desactualizado por version', { userId: user.id, tokenVersion, currentVersion: user.tokenVersion });
        return done(null, false, { message: 'Token desactualizado' });
      }

      const safeUser: AuthenticatedUser = {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        empresa: user.empresa,
        localidad: user.localidad,
        auth: {
          jti: jwtPayload.jti,
          iat: jwtPayload.iat,
          exp: jwtPayload.exp,
          v: tokenVersion,
        },
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
