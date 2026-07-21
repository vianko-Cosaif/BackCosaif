import type { RequestHandler } from 'express';
import { Rol } from '@prisma/client';
import type { AuthenticatedUser } from '../types/auth';

const ALLOWED_ROLES = new Set<Rol>([Rol.ADMINISTRADOR, Rol.COMERCIAL]);

export const requireCommercialReportAccess: RequestHandler = (req, res, next) => {
  const role = String((req.user as AuthenticatedUser | undefined)?.rol || '').toUpperCase() as Rol;
  if (!ALLOWED_ROLES.has(role)) {
    return res.status(403).json({ error: 'Solo ADMINISTRADOR o COMERCIAL puede consultar esta reportería' });
  }
  next();
};
