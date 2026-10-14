import type { RequestHandler } from 'express';
import { buildAuthorizationProfile, hasPermission, PERMISSIONS } from '../../auth/accessPolicy';
import { prisma } from '../../lib/prisma';
import type { AuthenticatedUser } from '../../types/auth';

const dispatchRoles = new Set(['ADMINISTRADOR', 'COORDINADOR', 'SUPERVISOR']);

// Assignment needs an operational picker, without access to user administration.
export const listarMaquinistasNaturales: RequestHandler = (req, res, next) => {
  void (async () => {
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    const authorization = req.authorization ?? buildAuthorizationProfile(user);
    if (!dispatchRoles.has(user.rol) || !hasPermission(authorization, PERMISSIONS.TORREON_OPERATE)) {
      return res.status(403).json({ error: 'La asignación corresponde a coordinación o supervisión' });
    }
    const localidadId = Number(req.query.localidadId ?? authorization.scope.localidadId);
    if (!Number.isSafeInteger(localidadId) || localidadId <= 0) {
      return res.status(400).json({ error: 'Selecciona una localidad válida' });
    }
    if (localidadId !== 2 || (authorization.scope.mode !== 'GLOBAL' &&
      (authorization.scope.mode !== 'LOCALITY' || authorization.scope.localidadId !== localidadId))) {
      return res.status(403).json({ error: 'Consulta fuera de tu localidad de Torreón' });
    }
    const maquinistas = await prisma.usuario.findMany({
      where: { localidadId, rol: 'MAQUINISTA', activo: true },
      select: { id: true, nombre: true },
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.json(maquinistas);
  })().catch(next);
};
