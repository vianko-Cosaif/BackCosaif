import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { ViaController } from './viaController';

const router = Router();

// Middleware de autenticación JWT para las rutas siguientes
router.use(authenticateAccess);

// Ruta pública: obtener todas las vías
router.get('/', ViaController.obtenerVias);

// Crear una nueva vía
router.post('/', ViaController.crearVia);


// Ruta para obtener vías filtradas por localidad (ej: GET /vias/localidad/1)
router.get('/localidad/:localidadId', ViaController.obtenerViasPorLocalidad);


// Editar una vía (se espera el id en la URL)
router.put('/:id', ViaController.editarVia);

// Eliminar una vía por su ID
router.delete('/:id', ViaController.eliminarVia);

export default router;
