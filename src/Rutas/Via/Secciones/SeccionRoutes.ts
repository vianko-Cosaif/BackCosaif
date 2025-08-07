

import { Router } from 'express';
import { SeccionViaController } from './SeccionVIasController';

const router = Router();

// Rutas para SeccionViaController
router.get('/secciones', SeccionViaController.obtenerSecciones);
router.get('/secciones/via/:viaId', SeccionViaController.obtenerSeccionesPorVia);
router.post('/secciones/via/:viaId', SeccionViaController.crearSeccion);
router.put('/secciones/:id', SeccionViaController.editarSeccion);
router.delete('/secciones/:id', SeccionViaController.eliminarSeccion);

export default router;
