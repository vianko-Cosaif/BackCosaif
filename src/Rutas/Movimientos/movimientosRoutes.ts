import { Router } from 'express';
import passport from '../../middlewares/passport';
import { MovimientoController } from './MovimientoController';

const router = Router();

/**
 * Middleware global para proteger todas las rutas bajo autenticación JWT.
 */
router.use(passport.authenticate('jwt', { session: false }));

// ------------------ MOVIMIENTOS ------------------ //

router.get('/', MovimientoController.obtenerMovimientos);

router.get('/pendientes', MovimientoController.obtenerMovimientosPendientes);

router.get('/pendientes/empresa/:empresaId', MovimientoController.obtenerMovimientosPendientesPorEmpresa);

router.post('/', MovimientoController.nuevoMovimiento);


// NUEVO - Cambiar prioridad de un movimiento
router.patch('/:id/prioridad', MovimientoController.cambiarPrioridad);

router.delete('/:id', MovimientoController.eliminarMovimiento);

router.get(
  '/empresa/:empresaId/localidad/:localidadId',
  MovimientoController.obtenerMovimientosPorEmpresaYLocalidad
);

router.get(
  '/empresa/:empresaId/localidad/:localidadId/pendientes',
  MovimientoController.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad
);

router.get(
  '/ronda/:rondaId/info',
  MovimientoController.obtenerInfoPorRonda
);

// ------------------ ACCIONES DE ESTADO ------------------ //

/**
 * @route PATCH /movimientos/:id/iniciar
 * @desc Inicia un movimiento (estado EN_PROCESO)
 */
router.patch('/:id/iniciar', MovimientoController.iniciarMovimiento);

/**
 * @route PATCH /movimientos/:id/pausar
 * @desc Pausa un movimiento (estado DETENIDO)
 */
router.patch('/:id/pausar', MovimientoController.pausarMovimiento);

/**
 * @route PATCH /movimientos/:id/reanudar
 * @desc Reanuda un movimiento (estado EN_PROCESO)
 */
router.patch('/:id/reanudar', MovimientoController.reanudarMovimiento);

/**
 * @route PATCH /movimientos/:id/finalizar
 * @desc Finaliza un movimiento (estado CONCLUIDO)
 */
router.patch('/:id/finalizar', MovimientoController.finalizarMovimiento);

export default router;