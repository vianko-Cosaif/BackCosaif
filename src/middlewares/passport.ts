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

const prisma = new PrismaClient();

// ⚠️ si pones JWT_STRICT_JTI=true (o lo omites) → se comporta como hoy
// ⚠️ si pones JWT_STRICT_JTI=false → acepta tokens válidos aunque esa instancia no tenga el jti en DB
const STRICT_JTI = (process.env.JWT_STRICT_JTI ?? 'true').toLowerCase() === 'true';

const {
  JWT_SECRET,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = process.env;

if (!JWT_SECRET) {
  logger.error('JWT_SECRET no está definido en .env');
  throw new Error('JWT_SECRET no está definido en .env');
}

// Podemos aceptar el token desde varios lugares
const extractors = [
  (req: any) => req?.cookies?.at || null,                      // cookie
  ExtractJwt.fromAuthHeaderAsBearerToken(),                    // Authorization: Bearer ...
  ExtractJwt.fromHeader('x-access-token'),                     // móvil viejito
];

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors(extractors),
  secretOrKey: JWT_SECRET,
  algorithms: ['HS256'],
  ignoreExpiration: false,
  // solo los meto si existen, para que no rompa si en una instancia no los pones
  ...(JWT_ISSUER ? { issuer: JWT_ISSUER } : {}),
  ...(JWT_AUDIENCE ? { audience: JWT_AUDIENCE } : {}),
};

passport.use(
  new JwtStrategy(opts, async (payload: any, done: VerifiedCallback) => {
    try {
      // 1) sub obligatorio
      const sub = payload?.sub ?? payload?.id;
      if (!sub) {
        logger.info('auth:deny:sin_sub', { payload });
        return done(null, false, { message: 'Token sin sub' });
      }

      // 2) jti obligatorio en modo estricto
      const jti = payload?.jti ?? payload?.jwtid;
      if (!jti) {
        logger.info('auth:deny:sin_jti', { sub, STRICT_JTI });
        if (STRICT_JTI) {
          return done(null, false, { message: 'Token sin jti' });
        }
        // modo compatible: seguimos sin checar en DB
      }

      // 3) validar en tabla token (lo que hoy te está pateando)
      if (jti) {
        const vigente = await tokenService.esTokenVigente(jti);
        if (!vigente) {
          logger.info('auth:deny:jti_no_vigente', { sub, jti, STRICT_JTI });
          if (STRICT_JTI) {
            return done(null, false, { message: 'Token no vigente' });
          }
          // si no es estricto, seguimos
        }
      }

      // 4) traer usuario
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

      if (!user) {
        logger.info('auth:deny:user_not_found', { sub });
        return done(null, false, { message: 'Usuario no encontrado' });
      }

      // 5) respetar tokenVersion (logout global)
      if (typeof payload.v === 'number' && payload.v !== user.tokenVersion) {
        logger.info('auth:deny:token_version', {
          sub,
          payloadVersion: payload.v,
          userVersion: user.tokenVersion,
          STRICT_JTI,
        });
        if (STRICT_JTI) {
          return done(null, false, { message: 'Token invalidado por versión' });
        }
        // modo compatible: dejamos pasar
      }

      // 6) éxito
      return done(null, {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        empresa: user.empresa,
        localidad: user.localidad,
        jti,
      });
    } catch (error) {
      logger.error('Error en validación de JWT con Passport', { error });
      return done(error as Error, false);
    }
  }),
);

// exporta el middleware para las rutas
export const requireAuth = passport.authenticate('jwt', { session: false });

export default passport;
