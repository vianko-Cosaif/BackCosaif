// reporteria/routes/rutasPdf.ts
// Centraliza PDFs bajo /reporteria (si lo montas con app.use('/reporteria', rutasPdf))

import { Router } from 'express';
import passport from '../../middlewares/passport';
import { renewAccessTokenIfNeeded } from '../../middlewares/token.renew';
import { MovimientoPdfController } from '../controller/movimeintoPdf';
import { AdminReporteriaController } from '../controller/adminController';

const router = Router();

router.use(passport.authenticate('jwt', { session: false }), renewAccessTokenIfNeeded);

/**
 * Montaje:
 *   app.use('/reporteria', rutasPdf)
 *
 * URLs finales:
 *   GET /reporteria/movimientos/pdf
 *   GET /reporteria/adminnpx tsc 
 */
router.get('/movimientos/pdf', MovimientoPdfController.generar);
router.get('/admin/pdf', AdminReporteriaController.getPDF);

export default router;
