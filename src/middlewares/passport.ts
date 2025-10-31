// src/middlewares/passport.ts
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
import * as tokenService from './token.service';

// Usa singleton si tienes ../db
const prisma = new PrismaClient();

// Extrae JWT también desde cookie 'at'
const cookieExtractor = (req: any) => req?.cookies?.at || null;

const {
  JWT_SECRET,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = process.env;

if (!JWT_SECRET) {
  logger.error('JWT_SECRET no está definido en .env');
  throw new Error('JWT_SECRET no está definido en .env');
}

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    cookieExtractor,
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  secretOrKey: JWT_SECRET,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithms: ['HS256'],
  ignoreExpiration: false, // no ocultes bugs en dev
};

passport.use(
  new JwtStrategy(opts, async (payload: any, done: VerifiedCallback) => {
    try {
      // 1) Claims mínimos
      const sub = payload?.sub ?? payload?.id;
      if (!sub) return done(null, false, { message: 'Token sin sub' });
      if (!payload?.jti || typeof payload.jti !== 'string') {
        return done(null, false, { message: 'Token sin jti' });
      }
      if (payload?.typ && payload.typ !== 'access') {
        return done(null, false, { message: 'Tipo de token inválido' });
      }

      // 2) Vigencia por jti (revocado/expirado)
      const vigente = await tokenService.esTokenVigente(payload.jti);
      if (!vigente) {
        logger.info('Token revocado o expirado', { jti: payload.jti, sub });
        return done(null, false, { message: 'Token no vigente' });
      }

      // 3) Usuario + tokenVersion
      const user = await prisma.usuario.findUnique({
        where: { id: Number(sub) },
        select: {
          id: true,
          nombre: true,
          rol: true,
          tokenVersion: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } },
        },
      });
      if (!user) return done(null, false, { message: 'Usuario no encontrado' });

      if (typeof payload.v === 'number' && payload.v !== user.tokenVersion) {
        return done(null, false, { message: 'Token invalidado por versión' });
      }

      // 4) Objeto seguro
      const safeUser = {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        empresa: user.empresa,
        localidad: user.localidad,
      };

      return done(null, safeUser);
    } catch (error) {
      logger.error('Error en validación de JWT con Passport', { error });
      return done(error as Error, false);
    }
  }),
);

export default passport;
