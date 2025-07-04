import passport from 'passport';
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  type StrategyOptions,
  type VerifiedCallback,
} from 'passport-jwt';
import { PrismaClient } from '@prisma/client';
import { env } from '../env';
import { logger } from '../utils/logger';
import type { JwtPayload } from '../types/auth';

const prisma = new PrismaClient();

// Validación crítica de configuración
if (!env.JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido');
}

// Opciones de estrategia JWT
const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_SECRET,
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
  algorithms: ['HS256'],
  ignoreExpiration: false,
};

passport.use(
  new JwtStrategy(opts, async (jwtPayload: JwtPayload, done: VerifiedCallback) => {
    try {
      if (!jwtPayload?.id || typeof jwtPayload.id !== 'number') {
        return done(null, false, { message: 'Token inválido: ID faltante' });
      }

      // Verificar si el token fue revocado (si se guarda el token JWT literal en la base de datos)
      if (jwtPayload.jti) {
        const tokenRevocado = await prisma.token.findUnique({
          where: { token: jwtPayload.jti },
        });
        if (tokenRevocado) {
          return done(null, false, { message: 'Token revocado' });
        }
      }

      // Obtener usuario
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
        return done(null, false, { message: 'Usuario no encontrado' });
      }

      // Usuario válido
      const safeUser = {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        empresa: user.empresa,
        localidad: user.localidad,
      };

      return done(null, safeUser);
    } catch (error) {
      logger.error('Error en validación de JWT con Passport', error);
      return done(error, false);
    }
  })
);

export default passport;
