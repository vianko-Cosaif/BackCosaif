// reporteria/routes/rutasPdf.ts
// Centraliza PDFs bajo /reporteria (si lo montas con app.use('/reporteria', rutasPdf))

import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { MovimientoPdfController } from '../controller/movimeintoPdf';
import { AdminReporteriaController } from '../controller/adminController';
import { CeoReportsController } from '../controller/ceoReportsController';
import { CoordinadorReporteriaController } from '../controller/coordinadorController';
import { EmpresaLocomotorasController } from '../controller/empresaLocomotorasController';
import { CronologiaEmpresasController } from '../controller/cronologiaEmpresasController';
import { LocomotorasPdfController } from '../controller/locomotorasPdf';
import { EmpresasPdfController } from '../controller/empresasPdf';

const router = Router();

router.use(authenticateAccess);

/**
 * Montaje:
 *   app.use('/reporteria', rutasPdf)
 *
 * URLs finales:
 *   GET /reporteria/admin
 *   GET /reporteria/movimientos/pdf
 *   GET /reporteria/admin/pdf
 *   GET /reporteria/ceo/cumplimiento
 *   GET /reporteria/ceo/cumplimiento/pdf
 *   GET /reporteria/ceo/trafico-cliente
 *   GET /reporteria/ceo/trafico-cliente/pdf
 *   GET /reporteria/ceo/turnos
 *   GET /reporteria/ceo/turnos/pdf
 *   GET /reporteria/ceo/maquinistas
 *   GET /reporteria/ceo/maquinistas/pdf
 *   GET /reporteria/ceo/comparativo
 *   GET /reporteria/ceo/comparativo/pdf
 *   GET /reporteria/coordinador
 *   GET /reporteria/coordinador/pdf
 *   GET /reporteria/empresa-locomotoras
 *   GET /reporteria/empresa-locomotoras/pdf
 *   GET /reporteria/cronologia-empresas
 *   GET /reporteria/cronologia-empresas/pdf
 *   GET /reporteria/locomotoras/pdf
 *   GET /reporteria/empresas/pdf
 */
router.get('/movimientos/pdf', MovimientoPdfController.generar);
router.get('/admin', AdminReporteriaController.getJSON);
router.get('/admin/pdf', AdminReporteriaController.getPDF);
router.get('/ceo/cumplimiento', CeoReportsController.cumplimientoJSON);
router.get('/ceo/cumplimiento/pdf', CeoReportsController.cumplimientoPDF);
router.get('/ceo/trafico-cliente', CeoReportsController.traficoClienteJSON);
router.get('/ceo/trafico-cliente/pdf', CeoReportsController.traficoClientePDF);
router.get('/ceo/turnos', CeoReportsController.turnosJSON);
router.get('/ceo/turnos/pdf', CeoReportsController.turnosPDF);
router.get('/ceo/maquinistas', CeoReportsController.maquinistasJSON);
router.get('/ceo/maquinistas/pdf', CeoReportsController.maquinistasPDF);
router.get('/ceo/comparativo', CeoReportsController.comparativoJSON);
router.get('/ceo/comparativo/pdf', CeoReportsController.comparativoPDF);
router.get('/coordinador', CoordinadorReporteriaController.getJSON);
router.get('/coordinador/pdf', CoordinadorReporteriaController.getPDF);
router.get('/empresa-locomotoras', EmpresaLocomotorasController.getJSON);
router.get('/empresa-locomotoras/pdf', EmpresaLocomotorasController.getPDF);
router.get('/cronologia-empresas', CronologiaEmpresasController.getJSON);
router.get('/cronologia-empresas/pdf', CronologiaEmpresasController.getPDF);
router.get('/locomotoras/pdf', LocomotorasPdfController.generar);
router.get('/empresas/pdf', EmpresasPdfController.generar);

export default router;
