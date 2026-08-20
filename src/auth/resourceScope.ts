import type { Request, RequestHandler, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthenticatedUser } from '../types/auth';
import { logger } from '../utils/logger';
import {
  buildAuthorizationProfile,
  type AuthorizationProfile,
} from './accessPolicy';

type ScopedResource = {
  empresaId: number;
  localidadId: number;
};

type LocalityScopedResource = Pick<ScopedResource, 'localidadId'>;

const CLIENT_ROLES = new Set(['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR']);

type AuthorizedRequest = Request & {
  authorization?: AuthorizationProfile;
};

const positiveInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const scopeMiddleware = (
  handler: (req: Request, res: Response, next: Parameters<RequestHandler>[2]) => Promise<unknown>,
): RequestHandler => (req, res, next) => {
  void handler(req, res, next).catch((error) => {
    logger.error('authz:resource_scope_error', {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      error: error instanceof Error ? error.message : String(error),
    });
    if (res.headersSent) return next(error);
    return res.status(500).json({
      error: 'No se pudo validar el alcance del recurso',
      code: 'RESOURCE_SCOPE_ERROR',
    });
  });
};

const authorizationFor = (req: Request): AuthorizationProfile | null => {
  const authorizedRequest = req as AuthorizedRequest;
  const user = req.user as AuthenticatedUser | undefined;
  if (!user) return null;
  const authorization = authorizedRequest.authorization ?? buildAuthorizationProfile(user);
  authorizedRequest.authorization = authorization;
  return authorization;
};

const deny = (req: Request, res: Response, reason: string) => {
  const authorization = (req as AuthorizedRequest).authorization;
  const user = req.user as AuthenticatedUser | undefined;
  logger.warn('authz:resource_forbidden', {
    userId: user?.id,
    role: authorization?.role ?? user?.rol,
    method: req.method,
    path: req.originalUrl.split('?')[0],
    reason,
  });
  return res.status(403).json({
    error: 'No tienes acceso a este recurso',
    code: 'RESOURCE_SCOPE_FORBIDDEN',
  });
};

const invalidId = (res: Response, field: string) => res.status(400).json({
  error: `${field} inválido`,
  code: 'INVALID_RESOURCE_ID',
});

const missing = (res: Response) => res.status(404).json({
  error: 'Recurso no encontrado',
  code: 'RESOURCE_NOT_FOUND',
});

export function resourceFitsAuthorizationScope(
  authorization: AuthorizationProfile,
  resource: ScopedResource,
): boolean {
  const { mode, empresaId, localidadId } = authorization.scope;
  if (mode === 'GLOBAL') return true;
  if (mode === 'LOCALITY') return Boolean(localidadId && resource.localidadId === localidadId);
  if (mode === 'COMPANY') return Boolean(empresaId && resource.empresaId === empresaId);
  if (mode === 'COMPANY_LOCALITY') {
    return Boolean(
      empresaId &&
      localidadId &&
      resource.empresaId === empresaId &&
      resource.localidadId === localidadId
    );
  }
  return false;
}

export function resourceFitsSharedLocalityReadScope(
  authorization: AuthorizationProfile,
  resource: LocalityScopedResource,
): boolean {
  const { mode, localidadId } = authorization.scope;
  if (mode === 'GLOBAL') return true;

  return Boolean(
    localidadId
    && (mode === 'LOCALITY' || authorization.capabilities.area === 'cliente')
    && resource.localidadId === localidadId
  );
}

export const enforcePathScope: RequestHandler = (req, res, next) => {
  const authorization = authorizationFor(req);
  if (!authorization) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });

  const requestedEmpresa = req.params.empresaId === undefined
    ? null
    : positiveInteger(req.params.empresaId);
  const requestedLocalidad = req.params.localidadId === undefined
    ? null
    : positiveInteger(req.params.localidadId);

  if (req.params.empresaId !== undefined && !requestedEmpresa) return invalidId(res, 'empresaId');
  if (req.params.localidadId !== undefined && !requestedLocalidad) return invalidId(res, 'localidadId');

  const { mode, empresaId, localidadId } = authorization.scope;
  if (mode === 'DENY' || mode === 'COMMERCIAL') return deny(req, res, 'path_denied_scope');
  if (requestedEmpresa && (mode === 'COMPANY' || mode === 'COMPANY_LOCALITY') && requestedEmpresa !== empresaId) {
    return deny(req, res, 'path_company_mismatch');
  }
  if (requestedLocalidad && (mode === 'LOCALITY' || mode === 'COMPANY_LOCALITY') && requestedLocalidad !== localidadId) {
    return deny(req, res, 'path_locality_mismatch');
  }
  return next();
};

export const enforceMovementCreationScope: RequestHandler = scopeMiddleware(async (req, res, next) => {
  const authorization = authorizationFor(req);
  const user = req.user as AuthenticatedUser | undefined;
  if (!authorization || !user) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });

  const empresaId = positiveInteger(req.body?.empresaId);
  const localidadId = positiveInteger(req.body?.localidadId);
  if (!empresaId || !localidadId) return res.status(400).json({
    error: 'empresaId y localidadId son obligatorios',
    code: 'INVALID_RESOURCE_SCOPE',
  });

  if (!resourceFitsAuthorizationScope(authorization, { empresaId, localidadId })) {
    return deny(req, res, 'movement_creation_scope_mismatch');
  }

  const viaIds = [req.body?.viaOrigenId, req.body?.viaDestinoId]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(positiveInteger);
  if (viaIds.some((id) => !id)) return res.status(400).json({
    error: 'viaOrigenId/viaDestinoId inválido',
    code: 'INVALID_RESOURCE_ID',
  });

  if (viaIds.length) {
    const uniqueIds = [...new Set(viaIds as number[])];
    const matchingVias = await prisma.via.count({
      where: { id: { in: uniqueIds }, localidadId },
    });
    if (matchingVias !== uniqueIds.length) return deny(req, res, 'movement_via_locality_mismatch');
  }

  const referencedMovementIds = [req.body?.activarAgendadoId, req.body?.recuperarTornoCanceladoId]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(positiveInteger);
  if (referencedMovementIds.some((id) => !id)) return res.status(400).json({
    error: 'Referencia de movimiento inválida',
    code: 'INVALID_RESOURCE_ID',
  });
  if (referencedMovementIds.length) {
    const uniqueIds = [...new Set(referencedMovementIds as number[])];
    const referenced = await prisma.movimiento.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, empresaId: true, localidadId: true },
    });
    if (
      referenced.length !== uniqueIds.length ||
      referenced.some((movement) =>
        movement.empresaId !== empresaId ||
        movement.localidadId !== localidadId ||
        !resourceFitsAuthorizationScope(authorization, movement)
      )
    ) return deny(req, res, 'movement_reference_scope_mismatch');
  }

  req.body.creadoPorId = user.id;
  if (CLIENT_ROLES.has(String(authorization.role).toUpperCase())) req.body.clienteId = user.id;
  return next();
});

export const requireMovementScope = (paramName = 'id'): RequestHandler => scopeMiddleware(async (req, res, next) => {
  const authorization = authorizationFor(req);
  if (!authorization) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  const id = positiveInteger(req.params[paramName]);
  if (!id) return invalidId(res, paramName);

  const movimiento = await prisma.movimiento.findUnique({
    where: { id },
    select: { id: true, empresaId: true, localidadId: true },
  });
  if (!movimiento) return missing(res);
  if (!resourceFitsAuthorizationScope(authorization, movimiento)) return deny(req, res, 'movement_scope_mismatch');

  if (req.method !== 'GET' && authorization.scope.mode !== 'GLOBAL') {
    const body = req.body && typeof req.body === 'object' ? req.body : (req.body = {});
    const requestedEmpresa = body.empresaId === undefined ? movimiento.empresaId : positiveInteger(body.empresaId);
    const requestedLocalidad = body.localidadId === undefined ? movimiento.localidadId : positiveInteger(body.localidadId);
    if (!requestedEmpresa || !requestedLocalidad) return res.status(400).json({
      error: 'Alcance de movimiento inválido',
      code: 'INVALID_RESOURCE_SCOPE',
    });
    if (!resourceFitsAuthorizationScope(authorization, {
      empresaId: requestedEmpresa,
      localidadId: requestedLocalidad,
    })) return deny(req, res, 'movement_update_scope_mismatch');

    const viaIds = [body.viaOrigenId, body.viaDestinoId]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map(positiveInteger);
    if (viaIds.some((viaId) => !viaId)) return res.status(400).json({
      error: 'viaOrigenId/viaDestinoId inválido',
      code: 'INVALID_RESOURCE_ID',
    });
    if (viaIds.length) {
      const uniqueIds = [...new Set(viaIds as number[])];
      const matchingVias = await prisma.via.count({
        where: { id: { in: uniqueIds }, localidadId: requestedLocalidad },
      });
      if (matchingVias !== uniqueIds.length) return deny(req, res, 'movement_update_via_scope_mismatch');
    }

    delete body.creadoPorId;
    delete body.clienteId;
    delete body.supervisorId;
    delete body.coordinadorId;
    delete body.operadorId;
  }
  return next();
});

const loadRound = async (id: number) => prisma.ronda.findUnique({
  where: { id },
  select: { id: true, empresaId: true, localidadId: true, movimientoId: true },
});

export const requireRoundScope = (paramName = 'id'): RequestHandler => scopeMiddleware(async (req, res, next) => {
  const authorization = authorizationFor(req);
  if (!authorization) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  const id = positiveInteger(req.params[paramName]);
  if (!id) return invalidId(res, paramName);
  const ronda = await loadRound(id);
  if (!ronda) return missing(res);
  if (!resourceFitsAuthorizationScope(authorization, ronda)) return deny(req, res, 'round_scope_mismatch');
  return next();
});

export const enforceRoundCreationScope: RequestHandler = scopeMiddleware(async (req, res, next) => {
  const authorization = authorizationFor(req);
  if (!authorization) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  const body = req.body && typeof req.body === 'object' ? req.body : (req.body = {});
  const movimientoId = positiveInteger(req.params.movimientoId);
  if (!movimientoId) return invalidId(res, 'movimientoId');
  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    select: { empresaId: true, localidadId: true },
  });
  if (!movimiento) return missing(res);
  if (!resourceFitsAuthorizationScope(authorization, movimiento)) return deny(req, res, 'round_creation_scope_mismatch');

  const empresaId = positiveInteger(body.empresaId);
  const localidadId = positiveInteger(body.localidadId);
  if (empresaId && empresaId !== movimiento.empresaId) return deny(req, res, 'round_company_mismatch');
  if (localidadId && localidadId !== movimiento.localidadId) return deny(req, res, 'round_locality_mismatch');
  body.empresaId = movimiento.empresaId;
  body.localidadId = movimiento.localidadId;
  return next();
});

export const requireRoundsInBodyScope = (...bodyKeys: string[]): RequestHandler => scopeMiddleware(async (req, res, next) => {
  const authorization = authorizationFor(req);
  if (!authorization) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  const ids = bodyKeys.map((key) => positiveInteger(req.body?.[key]));
  if (ids.some((id) => !id)) return res.status(400).json({ error: 'IDs de ronda inválidos', code: 'INVALID_RESOURCE_ID' });
  const rondas = await prisma.ronda.findMany({
    where: { id: { in: [...new Set(ids as number[])] } },
    select: { id: true, empresaId: true, localidadId: true },
  });
  if (rondas.length !== new Set(ids).size) return missing(res);
  if (rondas.some((ronda) => !resourceFitsAuthorizationScope(authorization, ronda))) {
    return deny(req, res, 'round_body_scope_mismatch');
  }
  if (new Set(rondas.map((ronda) => ronda.localidadId)).size > 1) {
    return deny(req, res, 'round_cross_locality_swap');
  }
  return next();
});

export const enforceRoundReplacementScope: RequestHandler = scopeMiddleware(async (req, res, next) => {
  const authorization = authorizationFor(req);
  if (!authorization) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  const rondaId = positiveInteger(req.params.id);
  const movimientoId = positiveInteger(req.body?.nuevoMovimientoId);
  if (!rondaId || !movimientoId) return res.status(400).json({ error: 'IDs inválidos', code: 'INVALID_RESOURCE_ID' });
  const [ronda, movimiento] = await Promise.all([
    loadRound(rondaId),
    prisma.movimiento.findUnique({ where: { id: movimientoId }, select: { empresaId: true, localidadId: true } }),
  ]);
  if (!ronda || !movimiento) return missing(res);
  if (
    !resourceFitsAuthorizationScope(authorization, ronda) ||
    !resourceFitsAuthorizationScope(authorization, movimiento)
  ) return deny(req, res, 'round_replacement_scope_mismatch');
  if (ronda.empresaId !== movimiento.empresaId || ronda.localidadId !== movimiento.localidadId) {
    return deny(req, res, 'round_replacement_cross_scope');
  }
  return next();
});

export const requireIncidentScope = (paramName = 'id'): RequestHandler => scopeMiddleware(async (req, res, next) => {
  const authorization = authorizationFor(req);
  if (!authorization) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  const id = positiveInteger(req.params[paramName]);
  if (!id) return invalidId(res, paramName);
  const incidente = await prisma.incidente.findUnique({
    where: { id },
    select: { movimiento: { select: { empresaId: true, localidadId: true } } },
  });
  if (!incidente) return missing(res);
  if (!resourceFitsAuthorizationScope(authorization, incidente.movimiento)) {
    return deny(req, res, 'incident_scope_mismatch');
  }
  return next();
});

export const requireIncidentImageScope: RequestHandler = scopeMiddleware(async (req, res, next) => {
  const authorization = authorizationFor(req);
  if (!authorization) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  if (authorization.scope.mode === 'GLOBAL') return next();
  const requestedPath = String(req.query.ruta ?? req.params.ruta ?? '').trim();
  if (!requestedPath || requestedPath.includes('..')) return res.status(400).json({
    error: 'Ruta de imagen inválida',
    code: 'INVALID_RESOURCE_ID',
  });
  const incidente = await prisma.incidente.findFirst({
    where: {
      OR: [
        { imagen1: requestedPath },
        { imagen2: requestedPath },
        { imagen3: requestedPath },
        { imagen4: requestedPath },
      ],
    },
    select: { movimiento: { select: { empresaId: true, localidadId: true } } },
  });
  if (!incidente) return missing(res);
  if (!resourceFitsAuthorizationScope(authorization, incidente.movimiento)) {
    return deny(req, res, 'incident_image_scope_mismatch');
  }
  return next();
});

export const enforceIncidentCreationScope: RequestHandler = scopeMiddleware(async (req, res, next) => {
  const authorization = authorizationFor(req);
  const user = req.user as AuthenticatedUser | undefined;
  if (!authorization || !user) return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHENTICATED' });
  const movimientoId = positiveInteger(req.body?.movimientoId);
  if (!movimientoId) return invalidId(res, 'movimientoId');
  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    select: { empresaId: true, localidadId: true },
  });
  if (!movimiento) return missing(res);
  if (!resourceFitsAuthorizationScope(authorization, movimiento)) {
    return deny(req, res, 'incident_creation_scope_mismatch');
  }
  req.body.usuarioId = user.id;
  return next();
});
