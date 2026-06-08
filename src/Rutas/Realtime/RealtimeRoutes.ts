import { Router, Request, Response } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import type { AuthenticatedUser } from '../../types/auth';
import { attachRealtimeClient, createRealtimeTicket, getRealtimeStats } from '../../realtime/realtimeHub';

const router = Router();

function toPositiveInt(value: unknown): number | null {
  if (Array.isArray(value)) return toPositiveInt(value[0]);
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

router.get('/events', authenticateAccess, (req: Request, res: Response) => {
  attachRealtimeClient(req, res, req.user as AuthenticatedUser);
});

router.get('/ws-ticket', authenticateAccess, (req: Request, res: Response) => {
  return res.json({
    ok: true,
    realtime: createRealtimeTicket(req.user as AuthenticatedUser, {
      localidadId: toPositiveInt(req.query.localidadId ?? req.query.localidad),
    }),
  });
});

router.get('/stats', authenticateAccess, (req: Request, res: Response) => {
  const user = req.user as AuthenticatedUser;
  if (String(user.rol || '').toUpperCase() !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  return res.json({ ok: true, realtime: getRealtimeStats() });
});

export default router;
