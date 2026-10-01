import type { RequestHandler } from 'express';

const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

export function isTornoModuleEnabled() {
  const value = String(process.env.TORNO_MODULE_ENABLED ?? 'true').trim().toLowerCase();
  return !FALSE_VALUES.has(value);
}

export const requireTornoModuleEnabled: RequestHandler = (_req, res, next) => {
  if (!isTornoModuleEnabled()) {
    return res.status(404).json({ message: 'Modulo de torno desactivado.' });
  }
  next();
};
