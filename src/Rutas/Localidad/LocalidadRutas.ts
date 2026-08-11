import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { LocalidadController } from './LocalidadController';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { requirePermission } from '../../auth/authorize';

const router = Router();

// Middleware de autenticación JWT aplicado a todas las rutas siguientes
router.use(authenticateAccess);

// Crear una nueva localidad
router.post('/', requirePermission(PERMISSIONS.OPERATIONAL_CATALOGS_MANAGE), LocalidadController.crearLocalidad);



// Obtener todas las localidades (ruta protegida)
router.get('/', requirePermission(PERMISSIONS.CATALOGS_READ), LocalidadController.obtenerLocalidades);

// Obtener localidades ligeras (ruta protegida)
router.get('/lite', requirePermission(PERMISSIONS.CATALOGS_READ), LocalidadController.obtenerLocalidadesLite);

// Buscar localidad por nombre (ruta protegida, se espera el parámetro de consulta "nombre")
router.get('/buscar', requirePermission(PERMISSIONS.CATALOGS_READ), LocalidadController.buscarLocalidadPorNombre);

// Obtener una localidad por ID (ruta protegida)
router.get('/:id', requirePermission(PERMISSIONS.CATALOGS_READ), LocalidadController.obtenerLocalidadPorId);

export default router;
