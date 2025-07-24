import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
  VerifiedCallback,
} from 'passport-jwt';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { JwtPayload } from '../types/auth';
import * as tokenService from './token.service';

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET no está definido en el archivo .env');
  throw new Error('JWT_SECRET no está definido');
}

const prisma = new PrismaClient();

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET as string,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
  algorithms: ['HS256'],
  ignoreExpiration: process.env.NODE_ENV === 'development',
};

passport.use(
  new JwtStrategy(opts, async (jwtPayload: JwtPayload, done: VerifiedCallback) => {
    try {
      if (
        !jwtPayload?.id ||
        (typeof jwtPayload.id !== 'number' && typeof jwtPayload.id !== 'string')
      ) {
        logger.warn('Token inválido: ID faltante/tipo incorrecto', { jwtPayload });
        return done(null, false, { message: 'Token inválido: ID faltante' });
      }

      // Verifica si el token JWT está registrado (no ha sido eliminado/revocado)
      if (jwtPayload.jti) {
        const isValid = await tokenService.isTokenValid(jwtPayload.jti);
        if (!isValid) {
          logger.info('Token eliminado/no válido', { jti: jwtPayload.jti, userId: jwtPayload.id });
          // Aquí NO necesitas enviar la notificación, ya la manda removeToken cuando se revoca
          return done(null, false, { message: 'Token eliminado/no válido' });
        }
      }

      // Busca el usuario autenticado
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
      logger.error('Error en validación JWT', { error, jwtPayload });
      return done(error as Error, false);
    }
  })
);

export default passport;
