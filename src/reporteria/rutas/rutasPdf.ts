// reporteria/routes/rutasPdf.ts
// Centraliza PDFs bajo /reporteria (si lo montas con app.use('/reporteria', rutasPdf))

import { Router } from 'express';
import passport from '../../middlewares/passport';
import { MovimientoPdfController } from '../controller/movimeintoPdf';
import { AdminReporteriaController } from '../controller/adminController';
import { LocomotorasPdfController } from '../controller/locomotorasPdf';
import { EmpresasPdfController } from '../controller/empresasPdf';

const router = Router();

router.use(passport.authenticate('jwt', { session: false }));

/**
 * Montaje:
 *   app.use('/reporteria', rutasPdf)
 *
 * URLs finales:
 *   GET /reporteria/movimientos/pdf
 *   GET /reporteria/admin/pdf
 *   GET /reporteria/locomotoras/pdf
 *   GET /reporteria/empresas/pdf
 */
router.get('/movimientos/pdf', MovimientoPdfController.generar);
router.get('/admin/pdf', AdminReporteriaController.getPDF);
router.get('/locomotoras/pdf', LocomotorasPdfController.generar);
router.get('/empresas/pdf', EmpresasPdfController.generar);

export default router;
