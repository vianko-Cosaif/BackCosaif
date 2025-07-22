import dotenv from 'dotenv';
dotenv.config(); // 👈 Cargar variables de entorno antes de todo

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
  logger.warn('⚠️ JWT_ISSUER no está definido en .env. Revisa tus configuraciones');
}
if (!JWT_AUDIENCE) {
  logger.warn('⚠️ JWT_AUDIENCE no está definido en .env. Revisa tus configuraciones');
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
  ignoreExpiration: NODE_ENV === 'development', // Solo en dev puedes ignorar expiración si quieres (opcional)
};

// --- Passport JWT Strategy ---
passport.use(
  new JwtStrategy(opts, async (jwtPayload: JwtPayload, done: VerifiedCallback) => {
    try {
      if (!jwtPayload?.id || typeof jwtPayload.id !== 'number') {
        return done(null, false, { message: 'Token inválido: ID faltante' });
      }

      // Si usas revocación de JWTs, busca el token en DB
      if (jwtPayload.jti) {
        const tokenRevocado = await prisma.token.findUnique({
          where: { token: jwtPayload.jti },
        });
        if (tokenRevocado) {
          return done(null, false, { message: 'Token revocado' });
        }
      }

      // Obtén usuario y datos de empresa y localidad (incluyendo estado geográfico)
      const user = await prisma.usuario.findUnique({
        where: { id: jwtPayload.id },
        select: {
          id: true,
          nombre: true,
          rol: true,
          empresa: { select: { id: true, nombre: true } },
          localidad: { select: { id: true, nombre: true, estado: true } }, // Estado geográfico (Jalisco, NL, etc)
        },
      });

      if (!user) {
        return done(null, false, { message: 'Usuario no encontrado' });
      }

      // Usuario válido: solo pasamos información segura, incluyendo el estado geográfico
      const safeUser = {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        empresa: user.empresa,
        localidad: user.localidad, // Aquí va el estado geográfico
      };

      return done(null, safeUser);
    } catch (error) {
      logger.error('Error en validación de JWT con Passport', error);
      return done(error, false);
    }
  })
);

export default passport;
