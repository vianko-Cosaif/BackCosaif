import { Router } from 'express';
import passport from '../../middlewares/passport';
import { LocalidadController } from './LocalidadController';

const router = Router();


// Middleware de autenticación JWT aplicado a todas las rutas siguientes
router.use(passport.authenticate('jwt', { session: false }));

// Ruta pública para crear una nueva localidad
router.post('/', LocalidadController.crearLocalidad);

// Obtener todas las localidades (ruta protegida)
router.get('/', LocalidadController.obtenerLocalidades);

// Buscar localidad por nombre (ruta protegida, se espera el parámetro de consulta "nombre")
router.get('/buscar', LocalidadController.buscarLocalidadPorNombre);

// Obtener una localidad por ID (ruta protegida)
router.get('/:id', LocalidadController.obtenerLocalidadPorId);

export default router;
