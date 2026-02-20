// rutasExcel.ts (raíz de rutas)
// Centraliza EXCEL bajo /reporteria (si lo montas con app.use('/reporteria', rutasExcel))

import { Router } from 'express';
import passport from '../../middlewares/passport';
import { MovimientoExcelController } from '../controller/movimientoExcel';

const router = Router();

router.use(passport.authenticate('jwt', { session: false }));

/**
 * Montaje:
 *   app.use('/reporteria', rutasExcel)
 *
 * URL final:
 *   GET /reporteria/movimientos/excel
 */
router.get('/movimientos/excel', MovimientoExcelController.generar);

export default router;
