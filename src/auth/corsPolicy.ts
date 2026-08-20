import cors from 'cors';
import type { RequestHandler } from 'express';
import { logger } from '../utils/logger';

export type CorsMode = 'compat' | 'enforce';

const normalizeOrigin = (value: string) => value.trim().replace(/\/$/, '').toLowerCase();

export const parseAllowedOrigins = (value: string | undefined): Set<string> => new Set(
  String(value ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean),
);

export const isCorsOriginAllowed = (
  origin: string | undefined,
  mode: CorsMode,
  allowedOrigins: Set<string>,
) => !origin || mode === 'compat' || allowedOrigins.has(normalizeOrigin(origin));

const configuredMode = String(process.env.CORS_MODE ?? 'compat').trim().toLowerCase();
export const corsMode: CorsMode = configuredMode === 'enforce' ? 'enforce' : 'compat';
export const corsAllowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS);

if (process.env.NODE_ENV === 'production' && corsMode === 'compat') {
  logger.warn('security:cors_compat_enabled', {
    message: 'CORS permanece abierto por compatibilidad. Configure CORS_MODE=enforce y CORS_ORIGINS.',
  });
}

const rejectUnknownOrigin: RequestHandler = (req, res, next) => {
  const origin = req.header('Origin');
  if (isCorsOriginAllowed(origin, corsMode, corsAllowedOrigins)) return next();
  logger.warn('security:cors_origin_rejected', {
    origin,
    method: req.method,
    path: req.originalUrl.split('?')[0],
  });
  return res.status(403).json({
    error: 'Origen no permitido',
    code: 'CORS_ORIGIN_FORBIDDEN',
  });
};

const corsMiddleware = cors(corsMode === 'compat'
  ? undefined
  : {
      origin: (origin, callback) => callback(null, isCorsOriginAllowed(origin, corsMode, corsAllowedOrigins)),
      credentials: String(process.env.CORS_CREDENTIALS ?? 'true').toLowerCase() !== 'false',
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    });

export const corsPolicy: RequestHandler[] = [rejectUnknownOrigin, corsMiddleware];
