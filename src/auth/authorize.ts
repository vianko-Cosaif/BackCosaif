import type { Request, RequestHandler, Response } from 'express';
import { logger } from '../utils/logger';
import type { AuthenticatedUser } from '../types/auth';
import {
  buildAuthorizationProfile,
  hasPermission,
  type AuthorizationProfile,
  type Permission,
} from './accessPolicy';

type RequestWithAuthorization = Request & {
  authorization?: AuthorizationProfile;
};

const authorizedRequest = (req: Request) => req as RequestWithAuthorization;

const requestId = (headers: Record<string, unknown>) =>
  String(headers['x-request-id'] ?? headers['x-req-id'] ?? '').trim() || undefined;

const forbidden = (
  req: Request,
  res: Response,
  user: AuthenticatedUser,
  reason: string,
) => {
  logger.warn('authz:forbidden', {
    reqId: requestId(req.headers),
    userId: user.id,
    role: authorizedRequest(req).authorization?.role ?? user.rol,
    method: req.method,
    path: req.originalUrl.split('?')[0],
    reason,
  });

  return res.status(403).json({
    error: 'No tienes permisos para realizar esta acción',
    code: 'FORBIDDEN',
  });
};

export const requireAnyPermission = (...permissions: Permission[]): RequestHandler => (
  req,
  res,
  next,
) => {
  const user = req.user as AuthenticatedUser | undefined;
  if (!user) {
    return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  }

  const authRequest = authorizedRequest(req);
  const authorization = authRequest.authorization ?? buildAuthorizationProfile(user);
  authRequest.authorization = authorization;

  if (permissions.some((permission) => hasPermission(authorization, permission))) {
    return next();
  }

  return forbidden(req, res, user, 'missing_permission');
};

export const requirePermission = (permission: Permission): RequestHandler =>
  requireAnyPermission(permission);

const positiveInteger = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export type QueryScopeResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export function applyQueryScope(
  authorization: AuthorizationProfile,
  query: Record<string, unknown>,
): QueryScopeResult {
  const forceQueryValue = (key: 'empresaId' | 'localidadId', expected: number | null) => {
    if (!expected) return false;
    const requested = positiveInteger(query[key]);
    if (query[key] !== undefined && requested !== expected) return false;
    query[key] = String(expected);
    return true;
  };

  if (authorization.scope.mode === 'DENY') {
    return { allowed: false, reason: 'denied_scope' };
  }

  if (authorization.scope.mode === 'LOCALITY') {
    if (!forceQueryValue('localidadId', authorization.scope.localidadId)) {
      return { allowed: false, reason: 'locality_scope_mismatch' };
    }
  }

  if (authorization.scope.mode === 'COMPANY') {
    if (!forceQueryValue('empresaId', authorization.scope.empresaId)) {
      return { allowed: false, reason: 'company_scope_mismatch' };
    }
  }

  if (authorization.scope.mode === 'COMPANY_LOCALITY') {
    if (!forceQueryValue('empresaId', authorization.scope.empresaId)) {
      return { allowed: false, reason: 'company_scope_mismatch' };
    }
    if (!forceQueryValue('localidadId', authorization.scope.localidadId)) {
      return { allowed: false, reason: 'locality_scope_mismatch' };
    }
  }

  return { allowed: true };
}

export const enforceQueryScope: RequestHandler = (req, res, next) => {
  const user = req.user as AuthenticatedUser | undefined;
  if (!user) {
    return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  }

  const authRequest = authorizedRequest(req);
  const authorization = authRequest.authorization ?? buildAuthorizationProfile(user);
  authRequest.authorization = authorization;
  const query = req.query as Record<string, unknown>;
  const result = applyQueryScope(authorization, query);
  if (!result.allowed) return forbidden(req, res, user, result.reason);

  return next();
};
