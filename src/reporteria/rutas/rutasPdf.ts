// rutasPdf.ts (raíz de rutas)
// Centraliza PDFs bajo /reporteria (si lo montas con app.use('/reporteria', rutasPdf))

import { Router } from 'express';
import passport from '../../middlewares/passport';
import { MovimientoPdfController } from '../controller/movimeintoPdf';

const router = Router();

router.use(passport.authenticate('jwt', { session: false }));

/**
 * Montaje:
 *   app.use('/reporteria', rutasPdf)
 *
 * URL final:
 *   GET /reporteria/movimientos/pdf
 */
router.get('/movimientos/pdf', MovimientoPdfController.generar);

export default router;
