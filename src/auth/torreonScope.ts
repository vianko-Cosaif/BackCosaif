import type { RequestHandler } from 'express';
import { prismaTorreon } from '../lib/servicePrisma';
import { buildAuthorizationProfile, PERMISSIONS } from './accessPolicy';
import { resourceFitsAuthorizationScope } from './resourceScope';
import type { AuthenticatedUser } from '../types/auth';

export const requireTorreonScope: RequestHandler = (req, res, next) => {
  void (async () => {
    const user = req.user as AuthenticatedUser;
    const auth = req.authorization ?? buildAuthorizationProfile(user);
    const deny = () => res.status(403).json({ error: 'Recurso fuera de tu alcance' });
    if (!auth.permissions.includes(PERMISSIONS.TORREON_READ)) return deny();
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : (req.body = {});
    const path = req.path.replace(/\/+$/, '');
    const resources: { empresaId: number; localidadId: number }[] = [];
    const movimiento = path.match(/^\/movimientos\/(\d+)(?:\/|$)/);
    if (movimiento) {
      const row = await prismaTorreon.movimientoTorreonFerro.findUnique({ where: { id: Number(movimiento[1]) }, select: { empresaId: true, localidadId: true } });
      if (!row) return res.status(404).json({ error: 'Movimiento no encontrado' });
      resources.push(row);
    }
    const arrastre = path.match(/^\/arrastres\/(\d+)(?:\/|$)/);
    if (arrastre) {
      const row = await prismaTorreon.arrastreTorreon.findUnique({ where: { id: Number(arrastre[1]) }, select: { empresaId: true, localidadId: true } });
      if (!row) return res.status(404).json({ error: 'Arrastre no encontrado' });
      resources.push(row);
    }
    if (path === '/arrastres/orden-solicitudes') {
      if (!Array.isArray(body.arrastreIds) || !body.arrastreIds.length || body.arrastreIds.length > 100 || body.arrastreIds.some((id: any) => !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) return res.status(400).json({ error: 'arrastreIds inválidos' });
      const ids = [...new Set(body.arrastreIds.map(Number))];
      const rows = await prismaTorreon.arrastreTorreon.findMany({ where: { id: { in: ids } }, select: { empresaId: true, localidadId: true } });
      if (rows.length !== ids.length) return deny();
      resources.push(...rows);
    }
    if (path === '/rondas/movimientos/orden') {
      const id = Number(body.rondaMovimientoId);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'rondaMovimientoId inválido' });
      const row = await prismaTorreon.rondaTorreonMovimiento.findUnique({ where: { id }, select: { movimiento: { select: { empresaId: true, localidadId: true } } } });
      if (!row) return res.status(404).json({ error: 'Ronda no encontrada' });
      resources.push(row.movimiento);
    }
    if (req.method === 'POST' && ['/arrastres', '/movimientos'].includes(path)) {
      const scope = { empresaId: Number(body.empresaId ?? user.empresa?.id), localidadId: Number(body.localidadId ?? user.localidad?.id) };
      if (!Number.isSafeInteger(scope.empresaId) || !Number.isSafeInteger(scope.localidadId) || scope.empresaId <= 0 || scope.localidadId <= 0) return res.status(400).json({ error: 'Empresa y localidad son obligatorias' });
      resources.push(scope);
      body.empresaId = scope.empresaId; body.localidadId = scope.localidadId;
    }
    if (resources.some(row => !resourceFitsAuthorizationScope(auth, row))) return deny();
    if (new Set(resources.map(row => row.localidadId)).size > 1) return deny();
    if (resources.length) {
      if (body.localidadId != null && Number(body.localidadId) !== resources[0].localidadId) return deny();
      if (body.empresaId != null && resources.some(row => Number(body.empresaId) !== row.empresaId)) return deny();
    }
    // Actor identity always comes from the authenticated session.
    for (const field of ['creadoPorId', 'iniciadoPorId', 'finalizadoPorId', 'tomadaPorId', 'resueltoPorId', 'canceladoPorId', 'editadoPorId', 'operadorId']) {
      if (field in body) body[field] = user.id;
    }
    next();
  })().catch(next);
};
