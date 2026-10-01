import { Router, type RequestHandler } from 'express';
import { stat } from 'fs/promises';
import { z, ZodError } from 'zod';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { enforceQueryScope, requirePermission } from '../../auth/authorize';
import { boundedReportFilters } from '../../application/movements/movementQuery';
import { summarizeMovements } from '../../application/movements/movementSummary';
import { idempotentMutation } from '../../middlewares/idempotentMutation';
import { createExport, exportFormatSchema, getExport, publicExport } from './exportStore';
import { artifactPath } from './exportFiles';
import { reportError, type ExportActor } from './exportAccess';

const router = Router();
const readAccess = [authenticateAccess, requirePermission(PERMISSIONS.MOVEMENTS_READ)];
const handle = (action: RequestHandler): RequestHandler => async (req, res, next) => {
  try { await action(req, res, next); }
  catch (error: any) {
    if (res.headersSent) return next(error);
    if (error instanceof ZodError) { res.status(400).json({ error: 'Parámetros inválidos', details: error.issues }); return; }
    if ([403, 404, 409, 410, 422, 429].includes(error?.status)) { res.status(error.status).json({ error: error.message }); return; }
    next(error);
  }
};
router.get('/movimientos/resumen', ...readAccess, enforceQueryScope, handle(async (req, res) => {
  res.json(await summarizeMovements(boundedReportFilters(req.query)));
}));
router.use('/exportaciones', ...readAccess, requirePermission(PERMISSIONS.REPORTS_EXPORT), idempotentMutation);
router.post('/exportaciones', handle(async (req, res) => {
  const input = z.object({ format: exportFormatSchema, filters: z.unknown() }).strict().parse(req.body);
  const result = await createExport(req.user as ExportActor, input.format, input.filters);
  res.setHeader('Location', `/reporteria/exportaciones/${result.id}`);
  res.status(202).json(result);
}));
router.get('/exportaciones/:id', handle(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(publicExport(await getExport(req.user as ExportActor, String(req.params.id))));
}));
router.get('/exportaciones/:id/archivo', handle(async (req, res, next) => {
  const record = await getExport(req.user as ExportActor, String(req.params.id));
  if (record.status !== 'COMPLETED' || !record.artifact_token) throw reportError(409, 'El archivo todavía no está disponible');
  const file = artifactPath(record.id, record.artifact_token, record.format);
  const info = await stat(file).catch(() => null);
  if (!info) throw reportError(410, 'El archivo ya no está disponible; solicita otra exportación');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(file, `movimientos-${record.id}.${record.format}`, { dotfiles: 'allow' }, error => { if (error) next(error); });
}));
export default router;
