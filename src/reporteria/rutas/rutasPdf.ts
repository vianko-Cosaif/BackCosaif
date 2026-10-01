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
import { ClienteCargaOperativaController } from '../controller/clienteCargaOperativaController';
import { ClienteReportesOperativosController } from '../controller/clienteReportesOperativosController';
import { ComercialReporteriaController } from '../controller/comercialController';
import { requireCommercialReportAccess } from '../commercialAccess';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { enforceQueryScope, requirePermission } from '../../auth/authorize';

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
 *   GET /reporteria/cliente/carga-operativa
 *   GET /reporteria/cliente/carga-operativa/pdf
 *   GET /reporteria/cliente/vias
 *   GET /reporteria/cliente/vias/pdf
 *   GET /reporteria/cliente/turnos
 *   GET /reporteria/cliente/turnos/pdf
 *   GET /reporteria/cliente/usuarios
 *   GET /reporteria/cliente/usuarios/pdf
 *   GET /reporteria/cliente/cumplimiento
 *   GET /reporteria/cliente/cumplimiento/pdf
 *   GET /reporteria/cliente/incidentes
 *   GET /reporteria/cliente/incidentes/pdf
 *   GET /reporteria/cliente/cronologia
 *   GET /reporteria/cliente/cronologia/pdf
 */
const requireAdminReports = requirePermission(PERMISSIONS.REPORTS_ADMIN_READ);
const requireCoordinatorReports = requirePermission(PERMISSIONS.REPORTS_COORDINATOR_READ);
const requireClientReports = requirePermission(PERMISSIONS.REPORTS_CLIENT_READ);
const requireReportExport = requirePermission(PERMISSIONS.REPORTS_EXPORT);

router.get('/movimientos/pdf', requireReportExport, enforceQueryScope, MovimientoPdfController.generar);
router.get('/admin', requireAdminReports, AdminReporteriaController.getJSON);
router.get('/comercial', requireCommercialReportAccess, ComercialReporteriaController.getJSON);
router.get('/admin/pdf', requireAdminReports, AdminReporteriaController.getPDF);
router.get('/ceo/cumplimiento', requireAdminReports, CeoReportsController.cumplimientoJSON);
router.get('/ceo/cumplimiento/pdf', requireAdminReports, CeoReportsController.cumplimientoPDF);
router.get('/ceo/trafico-cliente', requireAdminReports, CeoReportsController.traficoClienteJSON);
router.get('/ceo/trafico-cliente/pdf', requireAdminReports, CeoReportsController.traficoClientePDF);
router.get('/ceo/turnos', requireAdminReports, CeoReportsController.turnosJSON);
router.get('/ceo/turnos/pdf', requireAdminReports, CeoReportsController.turnosPDF);
router.get('/ceo/maquinistas', requireAdminReports, CeoReportsController.maquinistasJSON);
router.get('/ceo/maquinistas/pdf', requireAdminReports, CeoReportsController.maquinistasPDF);
router.get('/ceo/comparativo', requireAdminReports, CeoReportsController.comparativoJSON);
router.get('/ceo/comparativo/pdf', requireAdminReports, CeoReportsController.comparativoPDF);
router.get('/coordinador', requireCoordinatorReports, enforceQueryScope, CoordinadorReporteriaController.getJSON);
router.get('/coordinador/pdf', requireCoordinatorReports, enforceQueryScope, CoordinadorReporteriaController.getPDF);
router.get('/empresa-locomotoras', requireCoordinatorReports, enforceQueryScope, EmpresaLocomotorasController.getJSON);
router.get('/empresa-locomotoras/pdf', requireCoordinatorReports, enforceQueryScope, EmpresaLocomotorasController.getPDF);
router.get('/cronologia-empresas', requireCoordinatorReports, enforceQueryScope, CronologiaEmpresasController.getJSON);
router.get('/cronologia-empresas/pdf', requireCoordinatorReports, enforceQueryScope, CronologiaEmpresasController.getPDF);
router.get('/locomotoras/pdf', requireReportExport, enforceQueryScope, LocomotorasPdfController.generar);
router.get('/empresas/pdf', requireReportExport, enforceQueryScope, EmpresasPdfController.generar);
router.get('/cliente/carga-operativa', requireClientReports, enforceQueryScope, ClienteCargaOperativaController.getJSON);
router.get('/cliente/carga-operativa/pdf', requireClientReports, enforceQueryScope, ClienteCargaOperativaController.getPDF);
router.get('/cliente/vias', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.viasJSON);
router.get('/cliente/vias/pdf', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.viasPDF);
router.get('/cliente/turnos', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.turnosJSON);
router.get('/cliente/turnos/pdf', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.turnosPDF);
router.get('/cliente/usuarios', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.usuariosJSON);
router.get('/cliente/usuarios/pdf', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.usuariosPDF);
router.get('/cliente/cumplimiento', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.cumplimientoJSON);
router.get('/cliente/cumplimiento/pdf', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.cumplimientoPDF);
router.get('/cliente/incidentes', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.incidentesJSON);
router.get('/cliente/incidentes/pdf', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.incidentesPDF);
router.get('/cliente/cronologia', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.cronologiaJSON);
router.get('/cliente/cronologia/pdf', requireClientReports, enforceQueryScope, ClienteReportesOperativosController.cronologiaPDF);

export default router;
