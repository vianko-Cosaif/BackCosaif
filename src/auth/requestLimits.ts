import type { RequestHandler } from 'express';
import { LoginAttemptStore } from './loginRateLimit';

export function concurrencyLimit(maximum: number): RequestHandler {
  let active = 0;
  return (_req, res, next) => {
    if (active >= maximum) {
      res.setHeader('Retry-After', '2');
      return res.status(429).json({ error: 'Demasiadas operaciones simultáneas; vuelve a intentar' });
    }
    active++;
    let released = false;
    const release = () => { if (!released) { released = true; active--; } };
    res.once('finish', release); res.once('close', release);
    next();
  };
}
const ipAttempts = new LoginAttemptStore(120, 60_000, 60_000);
export const loginInputLimit: RequestHandler = (req, res, next) => {
  if (typeof req.body?.nombre !== 'string' || req.body.nombre.length > 160 || typeof req.body?.contrasena !== 'string' || Buffer.byteLength(req.body.contrasena) > 1024) {
    return res.status(400).json({ error: 'Credenciales inválidas' });
  }
  const key = String(req.ip || req.socket.remoteAddress);
  const retry = ipAttempts.retryAfterMs(key);
  if (retry) { res.setHeader('Retry-After', String(Math.ceil(retry / 1000))); return res.status(429).json({ error: 'Demasiados intentos desde esta dirección' }); }
  ipAttempts.recordFailure(key); // Count attempts before Argon2, including concurrent attempts.
  next();
};
