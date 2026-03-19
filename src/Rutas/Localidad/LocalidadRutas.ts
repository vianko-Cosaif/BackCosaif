import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { LocalidadController } from './LocalidadController';

const router = Router();
// Ruta pública para crear una nueva localidad
router.post('/', LocalidadController.crearLocalidad);

// Middleware de autenticación JWT aplicado a todas las rutas siguientes
router.use(authenticateAccess);



// Obtener todas las localidades (ruta protegida)
router.get('/', LocalidadController.obtenerLocalidades);

// Obtener localidades ligeras (ruta protegida)
router.get('/lite', LocalidadController.obtenerLocalidadesLite);

// Buscar localidad por nombre (ruta protegida, se espera el parámetro de consulta "nombre")
router.get('/buscar', LocalidadController.buscarLocalidadPorNombre);

// Obtener una localidad por ID (ruta protegida)
router.get('/:id', LocalidadController.obtenerLocalidadPorId);

export default router;
