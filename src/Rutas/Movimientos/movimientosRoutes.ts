// movimientos.routes.ts
import { Router } from 'express';
import passport from '../../middlewares/passport';
import { MovimientoController } from './MovimientoController';

const router = Router();

// Protección JWT para todas las rutas
router.use(passport.authenticate('jwt', { session: false }));

// ------------------ MOVIMIENTOS ------------------ //
router.get('/', MovimientoController.obtenerMovimientos);
router.get('/all', MovimientoController.obtenerTodosLosMovimientos);

router.get('/pendientes', MovimientoController.obtenerMovimientosPendientes);
router.get('/pendientes/empresa/:empresaId', MovimientoController.obtenerMovimientosPendientesPorEmpresa);

router.get('/empresa/:empresaId', MovimientoController.obtenerMovimientosPorEmpresa);
router.get('/empresa/:empresaId/localidad/:localidadId', MovimientoController.obtenerMovimientosPorEmpresaYLocalidad);
router.get(
  '/empresa/:empresaId/localidad/:localidadId/pendientes',
  MovimientoController.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad
);

router.get('/localidad/:localidadId/pendientes', MovimientoController.obtenerMovimientosPendientesPorLocalidad);
router.get('/localidad/:localidadId/all', MovimientoController.obtenerTodosMovimientosPorLocalidad);
router.get('/localidad/:localidadId/empresa/:empresaId', MovimientoController.obtenerMovimientosPorLocalidadEmpresa);

router.get('/ronda/:rondaId/info', MovimientoController.obtenerInfoPorRonda);

router.post('/', MovimientoController.nuevoMovimiento);

// Cambiar prioridad
router.patch('/:id/prioridad', MovimientoController.cambiarPrioridad);

// Eliminar
router.delete('/:id', MovimientoController.eliminarMovimiento);

// ------------------ ACCIONES DE ESTADO ------------------ //
router.patch('/:id/iniciar', MovimientoController.iniciarMovimiento);
router.patch('/:id/pausar', MovimientoController.pausarMovimiento);
router.patch('/:id/reanudar', MovimientoController.reanudarMovimiento);
router.patch('/:id/finalizar', MovimientoController.finalizarMovimiento);

export default router;
