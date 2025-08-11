// movimientos.routes.ts
import { Router } from 'express';
import passport from '../../middlewares/passport';
import { MovimientoController } from './MovimientoController';

const router = Router();

// Protegemos todo con JWT
router.use(passport.authenticate('jwt', { session: false }));

// -------- GETTERS --------
router.get('/', MovimientoController.obtenerMovimientos);
router.get('/all', MovimientoController.obtenerTodosLosMovimientos);
router.get('/pendientes', MovimientoController.obtenerMovimientosPendientes);
router.get('/pendientes/empresa/:empresaId', MovimientoController.obtenerMovimientosPendientesPorEmpresa);
router.get('/empresa/:empresaId', MovimientoController.obtenerMovimientosPorEmpresa);
router.get('/localidad/:localidadId/pendientes', MovimientoController.obtenerMovimientosPendientesPorLocalidad);
router.get('/localidad/:localidadId/all', MovimientoController.obtenerTodosMovimientosPorLocalidad);
router.get('/empresa/:empresaId/localidad/:localidadId', MovimientoController.obtenerMovimientosPorEmpresaYLocalidad);
router.get(
  '/empresa/:empresaId/localidad/:localidadId/pendientes',
  MovimientoController.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad
);
router.get('/ronda/:rondaId/info', MovimientoController.obtenerInfoPorRonda);

// -------- CREAR / EDITAR --------
router.post('/', MovimientoController.nuevoMovimiento);
router.put('/:id', MovimientoController.editarMovimiento);

// -------- PRIORIDAD --------
router.patch('/:id/prioridad', MovimientoController.cambiarPrioridad);

// -------- ACCIONES DE ESTADO --------
router.patch('/:id/iniciar', MovimientoController.iniciarMovimiento);
router.patch('/:id/pausar', MovimientoController.pausarMovimiento);
router.patch('/:id/reanudar', MovimientoController.reanudarMovimiento);
router.patch('/:id/finalizar', MovimientoController.finalizarMovimiento);
router.patch('/:id/cancelar', MovimientoController.cancelarMovimiento);
router.patch('/:id/estado', MovimientoController.cambiarEstado); // genérico (opcional)

// -------- ELIMINAR --------
router.delete('/:id', MovimientoController.eliminarMovimiento);

export default router;
