import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { buildAuthorizationProfile } from './accessPolicy';
import { resourceFitsAuthorizationScope, resourceFitsSharedLocalityReadScope } from './resourceScope';
import type { AuthenticatedUser } from '../types/auth';

export const requireSectionScope: RequestHandler = (req, res, next) => {
  void (async () => {
    const user = req.user as AuthenticatedUser;
    const auth = req.authorization ?? buildAuthorizationProfile(user);
    let viaId = Number(req.params.viaId ?? req.query.viaId);
    if (req.params.id) {
      const section = await prisma.seccionVia.findUnique({ where: { id: Number(req.params.id) }, select: { viaId: true } });
      if (!section) return res.status(404).json({ error: 'Sección no encontrada' });
      viaId = section.viaId;
    }
    if (!Number.isSafeInteger(viaId) || viaId <= 0) return res.status(400).json({ error: 'viaId inválido' });
    const via = await prisma.via.findUnique({ where: { id: viaId }, select: { localidadId: true } });
    if (!via) return res.status(404).json({ error: 'Vía no encontrada' });
    if (!resourceFitsSharedLocalityReadScope(auth, via)) return res.status(403).json({ error: 'Vía fuera de tu localidad' });
    if (/\/(asignar|liberar|liberar-todas)$/.test(req.path)) {
      const id = Number(req.body?.movimientoId);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'movimientoId inválido' });
      const movement = await prisma.movimiento.findUnique({ where: { id }, select: { empresaId: true, localidadId: true } });
      if (!movement) return res.status(404).json({ error: 'Movimiento no encontrado' });
      if (movement.localidadId !== via.localidadId || !resourceFitsAuthorizationScope(auth, movement)) {
        return res.status(403).json({ error: 'Movimiento fuera del alcance de la vía o del usuario' });
      }
    }
    next();
  })().catch(next);
};
