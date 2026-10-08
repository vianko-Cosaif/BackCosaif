import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { prismaTorreon } from '../lib/servicePrisma';
import { buildAuthorizationProfile, hasPermission, PERMISSIONS } from './accessPolicy';
import { resourceFitsAuthorizationScope } from './resourceScope';
import type { AuthenticatedUser } from '../types/auth';

export const requireTorreonScope: RequestHandler = (req, res, next) => {
  void (async () => {
    const user = req.user as AuthenticatedUser;
    const auth = req.authorization ?? buildAuthorizationProfile(user);
    const deny = () => res.status(403).json({ error: 'Recurso fuera de tu alcance' });
    if (!auth.permissions.includes(PERMISSIONS.TORREON_READ)) return deny();
    if ((req.method === 'GET' || req.method === 'HEAD') && !/^\/(?:cola\/\d+|incidentes\/\d+\/fotos)/.test(req.path)) return next();
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : (req.body = {});
    const path = req.path.replace(/\/+$/, '');
    if (req.method === 'PATCH' && /^\/movimientos\/\d+(?:\/edicion)?$/.test(path) && !hasPermission(auth, PERMISSIONS.MOVEMENTS_EDIT)) return deny();
    if (path.startsWith('/rondas/') && !hasPermission(auth, PERMISSIONS.ROUNDS_EDIT)) return deny();
    if (/^\/movimientos\/\d+\/cancelar$/.test(path) && !auth.permissions.includes(PERMISSIONS.MOVEMENTS_CANCEL)) return deny();
    if (/^\/movimientos\/\d+\/(?:iniciar|finalizar|detener|reanudar|fotos)$/.test(path) && !auth.permissions.includes(PERMISSIONS.MOVEMENTS_OPERATE)) return deny();
    if (/^\/movimientos\/\d+\/(?:iniciar|finalizar|detener|incidentes|reanudar|fotos)$/.test(path) && user.rol !== 'MAQUINISTA') return deny();
    const resources: { empresaId: number; localidadId: number }[] = [];
    const evidence = path.match(/^\/incidentes\/(\d+)\/fotos\/\d+$/);
    if (evidence) {
      const incident = await prismaTorreon.incidenteTorreonFerro.findUnique({ where: { id: Number(evidence[1]) }, select: { movimiento: { select: { empresaId: true, localidadId: true } } } });
      if (!incident) return res.status(404).json({ error: 'Incidente no encontrado' });
      resources.push(incident.movimiento);
    }
    const isDispatch = ['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR'].includes(user.rol);
    if (path.startsWith('/rondas/') && req.method !== 'GET') return res.status(409).json({ error: 'Torreón opera mediante cola, sin rondas' });
    if (/^\/cola.*(?:priorizar|asignar)$/.test(path) && !isDispatch) return deny();
    if (/^\/cola\/\d+\/(?:iniciar|reanudar|finalizar)$/.test(path) && user.rol !== 'MAQUINISTA') return deny();
    const unitId = path.match(/^\/cola\/(\d+)(?:\/|$)/);
    const unitIds = path === '/cola/priorizar' ? body.unidadIds : unitId ? [Number(unitId[1])] : [];
    if (!Array.isArray(unitIds) || unitIds.length > 100 || unitIds.some((id: unknown) => !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) return res.status(400).json({ error: 'Selecciona unidades válidas' });
    if (unitIds.length) {
      const ids: number[] = [...new Set<number>(unitIds.map(Number))];
      const units = await prismaTorreon.unidadAtencionTorreon.findMany({ where: { id: { in: ids } }, include: { movimientos: { select: { empresaId: true, localidadId: true } } } });
      if (units.length !== ids.length) return res.status(404).json({ error: 'Unidad no encontrada' });
      resources.push(...units.flatMap((u: any) => u.movimientos));
      if (path.endsWith('/asignar')) {
        const operator = await prisma.usuario.findUnique({ where: { id: Number(body.operadorId) }, select: { rol: true, localidadId: true, activo: true } });
        if (!operator?.activo || operator.rol !== 'MAQUINISTA' || operator.localidadId !== units[0].localidadId) return res.status(400).json({ error: 'Selecciona un maquinista activo de esta localidad' });
      }
    }
    if (path === '/movimientos/lote' && req.method === 'POST') {
      if (!Array.isArray(body.movimientos) || body.movimientos.length < 1 || body.movimientos.length > 5) return res.status(400).json({ error: 'El envío admite entre una y cinco solicitudes' });
      for (const movement of body.movimientos) {
        const scope = { empresaId: Number(movement.empresaId ?? user.empresa?.id), localidadId: Number(movement.localidadId ?? user.localidad?.id) };
        if (!Number.isSafeInteger(scope.empresaId) || !Number.isSafeInteger(scope.localidadId) || scope.empresaId <= 0 || scope.localidadId <= 0) return res.status(400).json({ error: 'Empresa y localidad son obligatorias en cada solicitud' });
        Object.assign(movement, scope, { creadoPorId: user.id });
        resources.push(scope);
      }
    }
    if (req.method === 'POST' && /^\/movimientos(?:\/lote)?$/.test(path) && (body.operadorId || body.movimientos?.some((m: any) => m.operadorId))) return res.status(400).json({ error: 'La asignación se realiza desde coordinación o supervisión' });

    const movimiento = path.match(/^\/movimientos\/(\d+)(?:\/|$)/);
    if (movimiento) {
      const row = await prismaTorreon.movimientoTorreonFerro.findUnique({ where: { id: Number(movimiento[1]) }, select: { empresaId: true, localidadId: true } });
      if (!row) return res.status(404).json({ error: 'Movimiento no encontrado' });
      resources.push(row);
      if (path.endsWith('/cancelar') && ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR'].includes(user.rol)) {
        const owner = await prismaTorreon.movimientoTorreonFerro.findUnique({ where: { id: Number(movimiento[1]) }, select: { clienteId: true, creadoPorId: true } });
        if (!owner || (owner.clienteId !== user.id && owner.creadoPorId !== user.id)) return deny();
      }
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
    if (path === '/rondas/intercambiar-movimientos') {
      const ids = [Number(body.rondaAId), Number(body.rondaBId)];
      if (ids.some(id => !Number.isSafeInteger(id) || id <= 0) || ids[0] === ids[1]) return res.status(400).json({ error: 'Selecciona dos movimientos distintos' });
      const rows = await prismaTorreon.rondaTorreonMovimiento.findMany({ where: { id: { in: ids } }, select: { movimiento: { select: { empresaId: true, localidadId: true } } } });
      if (rows.length !== 2) return res.status(404).json({ error: 'Ronda no encontrada' });
      resources.push(...rows.map((row: { movimiento: { empresaId: number; localidadId: number } }) => row.movimiento));
    }
    if (req.method === 'POST' && ['/arrastres', '/movimientos'].includes(path)) {
      const scope = { empresaId: Number(body.empresaId ?? user.empresa?.id), localidadId: Number(body.localidadId ?? user.localidad?.id) };
      if (!Number.isSafeInteger(scope.empresaId) || !Number.isSafeInteger(scope.localidadId) || scope.empresaId <= 0 || scope.localidadId <= 0) return res.status(400).json({ error: 'Empresa y localidad son obligatorias' });
      resources.push(scope);
      body.empresaId = scope.empresaId; body.localidadId = scope.localidadId;
    }
    if (resources.some(row => !resourceFitsAuthorizationScope(auth, row))) return deny();
    if (new Set(resources.map(row => row.localidadId)).size > 1) return deny();
    if (path.startsWith('/rondas/') && ['CLIENTE', 'CLIENTE_ADMIN', 'CLIENTE_COOR'].includes(user.rol)) {
      if (!user.empresa?.id || resources.some(row => row.empresaId !== user.empresa?.id)) return deny();
      body.empresaId = user.empresa.id;
    }
    if (resources.length) {
      if (body.localidadId != null && Number(body.localidadId) !== resources[0].localidadId) return deny();
      if (body.empresaId != null && resources.some(row => Number(body.empresaId) !== row.empresaId)) return deny();
    }
    // Actor identity always comes from the authenticated session.
    for (const field of ['creadoPorId', 'iniciadoPorId', 'finalizadoPorId', 'tomadaPorId', 'resueltoPorId', 'canceladoPorId', 'editadoPorId', 'operadorId']) {
      if (field in body && !(field === 'operadorId' && path.endsWith('/asignar'))) body[field] = user.id;
    }
    next();
  })().catch(next);
};
