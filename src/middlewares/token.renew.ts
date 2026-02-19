import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ms, { StringValue } from 'ms';
import { Rol } from '@prisma/client';
import { logger } from '../utils/logger';
import { renovarTokenSiPorVencer } from './token.service';

const SLIDING_TTL: StringValue = (process.env.JWT_SLIDING_TTL ?? '3h') as StringValue;
const RENEW_WINDOW: StringValue = (process.env.JWT_RENEW_WINDOW ?? '45m') as StringValue;

const RENEW_ROLES = new Set<Rol>([
  Rol.CLIENTE,
  Rol.SUPERVISOR,
  Rol.ADMINISTRADOR,
  Rol.COORDINADOR,
]);

const toMs = (v: StringValue, fallback: number): number => {
  if (typeof v === 'number') return v;
  const parsed = ms(v);
  return typeof parsed === 'number' ? parsed : fallback;
};

export async function renewAccessTokenIfNeeded(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = (req as any).user as { id: number; nombre: string; rol?: Rol } | undefined;
    if (!user?.rol || !RENEW_ROLES.has(user.rol)) return next();

    const auth = req.headers['authorization'];
    if (!auth || typeof auth !== 'string') return next();
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (!match) return next();
    const raw = match[1]?.trim();
    if (!raw) return next();

    const payload = jwt.decode(raw) as jwt.JwtPayload | null;
    if (!payload || typeof payload !== 'object') return next();

    const jti = typeof payload.jti === 'string' ? payload.jti : null;
    if (!jti) return next();

    const renewWindowMs = toMs(RENEW_WINDOW, 0);
    if (!renewWindowMs) return next();

    const ttlMs = toMs(SLIDING_TTL, 0);
    if (!ttlMs) return next();

    const newExpMs = Date.now() + ttlMs;
    await renovarTokenSiPorVencer(jti, new Date(newExpMs), renewWindowMs, { usuarioId: user.id });
  } catch (error: any) {
    logger.warn('token:renew:error', { message: error?.message ?? String(error) });
  } finally {
    next();
  }
}
