// secciones.routes.ts
import { Router } from 'express';
import { authenticateAccess } from '../../../auth/authenticateAccess';
import { SeccionViaController } from './SeccionVIasController'; // <- fijate el nombre/case
import { PERMISSIONS } from '../../../auth/accessPolicy';
import { requireAnyPermission, requirePermission } from '../../../auth/authorize';

const router = Router();

router.use(authenticateAccess);

// LISTADOS
// Opción con query param (modelo NO expone "obtener todas", así que pedimos viaId)
router.get('/secciones', requirePermission(PERMISSIONS.CATALOGS_READ), SeccionViaController.obtenerSecciones);
// Opción REST explícita por vía
router.get('/secciones/via/:viaId', requirePermission(PERMISSIONS.CATALOGS_READ), SeccionViaController.obtenerSeccionesPorVia);

// CRUD (si en tu modelo aún no existen, el controller responde 501 Not Implemented)
router.post('/secciones/via/:viaId', requirePermission(PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE), SeccionViaController.crearSeccion);
router.put('/secciones/:id', requirePermission(PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE), SeccionViaController.editarSeccion);
router.delete('/secciones/:id', requirePermission(PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE), SeccionViaController.eliminarSeccion);

// OCUPACIÓN (alineado al modelo actual)
const canChangeOccupation = requireAnyPermission(
  PERMISSIONS.MOVEMENTS_CREATE,
  PERMISSIONS.MOVEMENTS_OPERATE,
);
router.post('/secciones/via/:viaId/asignar', canChangeOccupation, SeccionViaController.asignarMovimiento);
router.post('/secciones/via/:viaId/liberar', canChangeOccupation, SeccionViaController.liberarSeccion);
router.post('/secciones/via/:viaId/liberar-todas', canChangeOccupation, SeccionViaController.liberarTodasPorMovimiento);

export default router;
