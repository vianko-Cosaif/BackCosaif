import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
export const requireViaMutationScope: RequestHandler = (req, res, next) => {
  void (async () => {
    const auth = req.authorization!;
    if (auth.scope.mode === 'GLOBAL') return next();
    if (auth.scope.mode !== 'LOCALITY' || !auth.scope.localidadId) return res.status(403).json({ error: 'No autorizado' });
    let locality = Number(req.body?.localidadId);
    if (req.params.id) {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
      const via = await prisma.via.findUnique({ where: { id }, select: { localidadId: true } });
      if (!via) return res.status(404).json({ error: 'Vía no encontrada' });
      if (via.localidadId !== auth.scope.localidadId) return res.status(403).json({ error: 'Vía fuera de tu localidad' });
      locality = req.body?.localidadId == null ? via.localidadId : locality;
    }
    if (locality !== auth.scope.localidadId) return res.status(403).json({ error: 'Localidad fuera de tu alcance' });
    // Occupation changes have their own scoped endpoints.
    if (req.body) for (const field of ['movimientoId', 'ocupada', 'movimiento', 'secciones']) delete req.body[field];
    next();
  })().catch(next);
};
