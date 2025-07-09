import { Router } from 'express';
import passport from '../../middlewares/passport';
import { IncidenteController } from './IncidenteController';

const router = Router();

// Autenticación JWT en todas las rutas
router.use(passport.authenticate('jwt', { session: false }));

// Rutas de consulta
router.get('/paginado', IncidenteController.obtenerIncidentesPaginados);
router.get('/localidad/:localidadId', IncidenteController.obtenerPorLocalidad);
router.get('/empresa/:empresaId', IncidenteController.obtenerPorEmpresa);
router.get('/:id/imagenes', IncidenteController.obtenerImagenes);
router.get('/imagen/:rutaImagen(*)', IncidenteController.servirImagen);
router.get('/', IncidenteController.obtenerIncidentes);

export default router;