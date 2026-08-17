// rutasExcel.ts (raíz de rutas)
// Centraliza EXCEL bajo /reporteria (si lo montas con app.use('/reporteria', rutasExcel))

import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { MovimientoExcelController } from '../controller/movimientoExcel';
import { LocomotorasExcelController } from '../controller/locomotorasExcel';
import { EmpresasExcelController } from '../controller/empresasExcel';
import { EmpresaLocomotorasExcelController } from '../controller/empresaLocomotorasExcel';
import { ComercialExcelController } from '../controller/comercialExcelController';
import { requireCommercialReportAccess } from '../commercialAccess';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { enforceQueryScope, requirePermission } from '../../auth/authorize';

const router = Router();

router.use(authenticateAccess);

/**
 * Montaje:
 *   app.use('/reporteria', rutasExcel)
 *
 * URL final:
 *   GET /reporteria/movimientos/excel
 *   GET /reporteria/locomotoras/excel
 *   GET /reporteria/empresas/excel
 *   GET /reporteria/empresa-locomotoras/excel
 */
const requireReportExport = requirePermission(PERMISSIONS.REPORTS_EXPORT);

router.get('/movimientos/excel', requireReportExport, enforceQueryScope, MovimientoExcelController.generar);
router.get('/locomotoras/excel', requireReportExport, enforceQueryScope, LocomotorasExcelController.generar);
router.get('/empresas/excel', requireReportExport, enforceQueryScope, EmpresasExcelController.generar);
router.get('/empresa-locomotoras/excel', requireReportExport, enforceQueryScope, EmpresaLocomotorasExcelController.generar);
router.post('/comercial/excel', requireCommercialReportAccess, ComercialExcelController.generar);

export default router;
