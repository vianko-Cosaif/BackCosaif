// rutasExcel.ts (raíz de rutas)
// Centraliza EXCEL bajo /reporteria (si lo montas con app.use('/reporteria', rutasExcel))

import { Router } from 'express';
import passport from '../../middlewares/passport';
import { MovimientoExcelController } from '../controller/movimientoExcel';
import { LocomotorasExcelController } from '../controller/locomotorasExcel';
import { EmpresasExcelController } from '../controller/empresasExcel';
import { BonosExcelController } from '../controller/bonosExcel';

const router = Router();

router.use(passport.authenticate('jwt', { session: false }));

/**
 * Montaje:
 *   app.use('/reporteria', rutasExcel)
 *
 * URL final:
 *   GET /reporteria/movimientos/excel
 *   GET /reporteria/locomotoras/excel
 *   GET /reporteria/empresas/excel
 *   GET /reporteria/bonos/excel
 */
router.get('/movimientos/excel', MovimientoExcelController.generar);
router.get('/locomotoras/excel', LocomotorasExcelController.generar);
router.get('/empresas/excel', EmpresasExcelController.generar);
router.get('/bonos/excel', BonosExcelController.generar);

export default router;
