import { Router, Request, Response, NextFunction } from 'express';
import { requirePermission } from '../../auth/authorize';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { AuthenticatedUser } from '../../types/auth';
import { buildReport, detailPage, getSnapshot, publicReport, ReportError, storeSnapshot } from './service';
import { exportExcel, exportFilename, exportPdf } from './exports';

export const operationReportRouter = Router();
operationReportRouter.use(requirePermission(PERMISSIONS.REPORTS_ADMIN_READ));
operationReportRouter.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const owner = (req: Request) => (req.user as AuthenticatedUser).id;
// One expensive operation per administrator; global bound protects shared render resources.
let active = 0;
const busy = new Set<number>();
function run(handler: (req: Request, res: Response) => Promise<unknown>, heavy = false) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    const user = owner(req);
    if (heavy && (busy.has(user) || active >= 3)) { res.setHeader('Retry-After', '2'); res.status(429).json({ message: 'Hay un reporte en preparación. Espera unos segundos y vuelve a intentar.' }); return; }
    if (heavy) { active++; busy.add(user); }
    try { await handler(req, res); } catch (error) {
      const known = error instanceof ReportError;
      res.status(known ? error.status : 500).json({ message: known ? error.message : 'No fue posible preparar el reporte. Intenta actualizarlo.' });
    } finally { if (heavy) { active--; busy.delete(user); } }
  };
}
operationReportRouter.get('/', run(async (req, res) => {
  const report = await buildReport(req.query); storeSnapshot(owner(req), report); res.json(publicReport(report));
}, true));
operationReportRouter.get('/:id/detalle', run(async (req, res) => {
  res.json(detailPage(getSnapshot(owner(req), String(req.params.id)), req.query));
}));
for (const format of ['excel', 'pdf'] as const) operationReportRouter.get(`/:id/${format}`, requirePermission(PERMISSIONS.REPORTS_EXPORT), run(async (req, res) => {
  const report = getSnapshot(owner(req), String(req.params.id));
  const content = format === 'excel' ? await exportExcel(report) : await exportPdf(report);
  res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${exportFilename(report, format === 'excel' ? 'xlsx' : 'pdf')}"`);
  res.send(content);
}, true));
