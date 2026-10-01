import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { ViaController } from './viaController';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { requirePermission } from '../../auth/authorize';

const router = Router();

// Middleware de autenticación JWT para las rutas siguientes
router.use(authenticateAccess);

// Ruta pública: obtener todas las vías
router.get('/', requirePermission(PERMISSIONS.CATALOGS_READ), ViaController.obtenerVias);

// Ruta ligera: obtener vías (payload mínimo)
router.get('/lite', requirePermission(PERMISSIONS.CATALOGS_READ), ViaController.obtenerViasLite);

// Crear una nueva vía
router.post('/', requirePermission(PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE), ViaController.crearVia);


// Ruta para obtener vías filtradas por localidad (ej: GET /vias/localidad/1)
router.get('/localidad/:localidadId', requirePermission(PERMISSIONS.CATALOGS_READ), ViaController.obtenerViasPorLocalidad);

// Ruta para obtener vías ligeras por localidad
router.get('/localidad/:localidadId/lite', requirePermission(PERMISSIONS.CATALOGS_READ), ViaController.obtenerViasLitePorLocalidad);


// Editar una vía (se espera el id en la URL)
router.put('/:id', requirePermission(PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE), ViaController.editarVia);

// Eliminar una vía por su ID
router.delete('/:id', requirePermission(PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE), ViaController.eliminarVia);

export default router;
