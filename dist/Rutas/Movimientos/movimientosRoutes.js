"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const MovimientoController_1 = require("./MovimientoController");
const router = (0, express_1.Router)();
/**
 * Middleware global para proteger todas las rutas bajo autenticación JWT.
 */
router.use(passport_1.default.authenticate('jwt', { session: false }));
// ------------------ MOVIMIENTOS ------------------ //
router.get('/', MovimientoController_1.MovimientoController.obtenerMovimientos);
router.get('/pendientes', MovimientoController_1.MovimientoController.obtenerMovimientosPendientes);
router.get('/pendientes/empresa/:empresaId', MovimientoController_1.MovimientoController.obtenerMovimientosPendientesPorEmpresa);
router.post('/', MovimientoController_1.MovimientoController.nuevoMovimiento);
// NUEVO - Cambiar prioridad de un movimiento
router.patch('/:id/prioridad', MovimientoController_1.MovimientoController.cambiarPrioridad);
router.delete('/:id', MovimientoController_1.MovimientoController.eliminarMovimiento);
router.get('/empresa/:empresaId/localidad/:localidadId', MovimientoController_1.MovimientoController.obtenerMovimientosPorEmpresaYLocalidad);
router.get('/empresa/:empresaId/localidad/:localidadId/pendientes', MovimientoController_1.MovimientoController.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad);
router.get('/ronda/:rondaId/info', MovimientoController_1.MovimientoController.obtenerInfoPorRonda);
// ------------------ ACCIONES DE ESTADO ------------------ //
/**
 * @route PATCH /movimientos/:id/iniciar
 * @desc Inicia un movimiento (estado EN_PROCESO)
 */
router.patch('/:id/iniciar', MovimientoController_1.MovimientoController.iniciarMovimiento);
/**
 * @route PATCH /movimientos/:id/pausar
 * @desc Pausa un movimiento (estado DETENIDO)
 */
router.patch('/:id/pausar', MovimientoController_1.MovimientoController.pausarMovimiento);
/**
 * @route PATCH /movimientos/:id/reanudar
 * @desc Reanuda un movimiento (estado EN_PROCESO)
 */
router.patch('/:id/reanudar', MovimientoController_1.MovimientoController.reanudarMovimiento);
/**
 * @route PATCH /movimientos/:id/finalizar
 * @desc Finaliza un movimiento (estado CONCLUIDO)
 */
router.patch('/:id/finalizar', MovimientoController_1.MovimientoController.finalizarMovimiento);
exports.default = router;
