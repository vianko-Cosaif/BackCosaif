// secciones.routes.ts
import { Router } from 'express';
import { authenticateAccess } from '../../../auth/authenticateAccess';
import { SeccionViaController } from './SeccionVIasController'; // <- fijate el nombre/case

const router = Router();

router.use(authenticateAccess);

// LISTADOS
// Opción con query param (modelo NO expone "obtener todas", así que pedimos viaId)
router.get('/secciones', SeccionViaController.obtenerSecciones);
// Opción REST explícita por vía
router.get('/secciones/via/:viaId', SeccionViaController.obtenerSeccionesPorVia);

// CRUD (si en tu modelo aún no existen, el controller responde 501 Not Implemented)
router.post('/secciones/via/:viaId', SeccionViaController.crearSeccion);
router.put('/secciones/:id', SeccionViaController.editarSeccion);
router.delete('/secciones/:id', SeccionViaController.eliminarSeccion);

// OCUPACIÓN (alineado al modelo actual)
router.post('/secciones/via/:viaId/asignar', SeccionViaController.asignarMovimiento);
router.post('/secciones/via/:viaId/liberar', SeccionViaController.liberarSeccion);
router.post('/secciones/via/:viaId/liberar-todas', SeccionViaController.liberarTodasPorMovimiento);

export default router;
