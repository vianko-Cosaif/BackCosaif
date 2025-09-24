"use strict";
/**
 * @file movimientos.routes.ts
 * @description
 * Rutas HTTP para **Movimientos**. TODAS las rutas están protegidas con JWT.
 *
 * Convención: normalmente se monta como `app.use('/movimientos', router)`.
 * Asegúrate de que el nombre de archivo del controlador coincide con el import.
 *
 * Flujo general y efectos:
 * - Crear movimiento **NO** ocupa/libera vías ni secciones; solo guarda intención (META) en `instrucciones`.
 * - Los servicios (lavado/torno) solo aparecen al maquinista cuando están `EN_PROCESO`.
 * - Cambiar a prioridad **ALTA** puede reordenar rondas (ver `MovimientoController.cambiarPrioridad` y RondaModel).
 * - `finalizar` devuelve **acciones sugeridas** (liberar/ocupar) basadas en META, pero no ejecuta cambios físicos.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../../middlewares/passport"));
const MovimientoController_1 = require("./MovimientoController"); // <-- asegura que coincide con el nombre real del archivo
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// 🔐 Protección JWT para todas las rutas
// ---------------------------------------------------------------------------
router.use(passport_1.default.authenticate('jwt', { session: false }));
// ---------------------------------------------------------------------------
// 🧴 SERVICIOS (lavado / torno)
// ---------------------------------------------------------------------------
/**
 * GET /movimientos/servicios/pendientes
 * Lista servicios pendientes (lavado/torno) opcionalmente filtrados.
 *
 * Query:
 *  - localidadId?: number
 *  - empresaId?: number
 *
 * Efecto: solo lectura. Útil para tableros de coordinación.
 * Respuestas:
 *  - 200 OK: array de servicios
 *  - 400 Bad Request: parámetros inválidos
 *  - 500 Internal Server Error
 */
router.get('/servicios/pendientes', MovimientoController_1.MovimientoController.obtenerServiciosPendientes);
/**
 * POST /movimientos/servicios/:id/encolar
 * Encola un servicio al **frente de las BAJAS** (justo después del bloque de ALTAS).
 * No cambia el estado del movimiento. Reorganiza BAJAS (1 por empresa por ronda).
 *
 * Params:
 *  - id: number (ID del movimiento)
 * Query (opcional):
 *  - tipo: 'LAVADO' | 'TORNO'  (si no se envía, se intenta inferir por la vía destino)
 *
 * 200 OK | 400 | 500
 */
router.post('/servicios/:id/encolar', MovimientoController_1.MovimientoController.encolarServicioAlFrenteR1);
/**
 * PATCH /movimientos/servicios/:id/estado
 * Cambia el estado de un servicio de lavado/torno.
 *
 * Params:
 *  - id: number (ID de movimiento/servicio)
 * Body:
 *  - estado: 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CANCELADO'
 *  - operadorId?: number
 *  - razon?: string
 *
 * Efecto:
 *  - Si pasa a `EN_PROCESO`, el maquinista podrá verlo como elegible.
 * 200 OK | 400 | 500
 */
router.patch('/servicios/:id/estado', MovimientoController_1.MovimientoController.actualizarEstadoServicio);
router.post('/:id/encolar', MovimientoController_1.MovimientoController.encolarMovimiento);
// movimientos.routes.ts
router.get('/servicios/no-encolados', MovimientoController_1.MovimientoController.obtenerServiciosNoEncolados);
// ---------------------------------------------------------------------------
// 🚂 MOVIMIENTOS (CRUD + consultas)
// ---------------------------------------------------------------------------
/**
 * GET /movimientos
 * Lista movimientos (vista estándar).
 * 200 OK | 500
 */
router.get('/', MovimientoController_1.MovimientoController.obtenerMovimientos);
/**
 * GET /movimientos/all
 * Lista *todos* los movimientos (sin filtros).
 * 200 OK | 500
 */
router.get('/all', MovimientoController_1.MovimientoController.obtenerTodosLosMovimientos);
/**
 * GET /movimientos/pendientes
 * Movimientos no concluidos (global).
 * 200 OK | 500
 */
router.get('/pendientes', MovimientoController_1.MovimientoController.obtenerMovimientosPendientes);
/**
 * GET /movimientos/empresa/:empresaId/pendientes
 * Movimientos no concluidos por empresa.
 * 200 OK | 400 | 500
 */
router.get('/empresa/:empresaId/pendientes', MovimientoController_1.MovimientoController.obtenerMovimientosPendientesPorEmpresa);
/**
 * GET /movimientos/empresa/:empresaId
 * Movimientos por empresa.
 * 200 OK | 400 | 500
 */
router.get('/empresa/:empresaId', MovimientoController_1.MovimientoController.obtenerMovimientosPorEmpresa);
/**
 * GET /movimientos/empresa/:empresaId/localidad/:localidadId
 * Movimientos por empresa y localidad.
 * 200 OK | 400 | 500
 */
router.get('/empresa/:empresaId/localidad/:localidadId', MovimientoController_1.MovimientoController.obtenerMovimientosPorEmpresaYLocalidad);
/**
 * GET /movimientos/empresa/:empresaId/localidad/:localidadId/pendientes
 * No concluidos por empresa y localidad.
 * 200 OK | 400 | 500
 */
router.get('/empresa/:empresaId/localidad/:localidadId/pendientes', MovimientoController_1.MovimientoController.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad);
/**
 * GET /movimientos/localidad/:localidadId/pendientes
 * No concluidos por localidad.
 * 200 OK | 400 | 500
 */
router.get('/localidad/:localidadId/pendientes', MovimientoController_1.MovimientoController.obtenerMovimientosPendientesPorLocalidad);
/**
 * GET /movimientos/localidad/:localidadId/all
 * Todos los movimientos por localidad.
 * 200 OK | 400 | 500
 */
router.get('/localidad/:localidadId/all', MovimientoController_1.MovimientoController.obtenerTodosMovimientosPorLocalidad);
/**
 * GET /movimientos/localidad/:localidadId/empresa/:empresaId
 * Movimientos por localidad y empresa.
 * 200 OK | 400 | 500
 */
router.get('/localidad/:localidadId/empresa/:empresaId', MovimientoController_1.MovimientoController.obtenerMovimientosPorLocalidadEmpresa);
/**
 * GET /movimientos/ronda/:rondaId/info
 * Información enriquecida de una ronda (incluye META, si existe).
 * 200 OK | 400 | 500
 */
router.get('/ronda/:rondaId/info', MovimientoController_1.MovimientoController.obtenerInfoPorRonda);
/**
 * POST /movimientos
 * Crea un movimiento (no ocupa/libera vías/secciones).
 * 201 Created | 400 | 500
 */
router.post('/', MovimientoController_1.MovimientoController.nuevoMovimiento);
/**
 * PATCH /movimientos/:id/prioridad
 * Cambia prioridad del movimiento.
 * 200 OK | 400 | 404 | 500
 */
router.patch('/:id/prioridad', MovimientoController_1.MovimientoController.cambiarPrioridad);
/**
 * DELETE /movimientos/:id
 * Elimina un movimiento.
 * 204 No Content | 400 | 500
 */
router.delete('/:id', MovimientoController_1.MovimientoController.eliminarMovimiento);
// ---------------------------------------------------------------------------
// ⏯️ Acciones de estado (flujo operativo del movimiento)
// ---------------------------------------------------------------------------
/**
 * PATCH /movimientos/:id/iniciar
 * Marca un movimiento como iniciado por un operador.
 * 200 OK | 400 | 500
 */
router.patch('/:id/iniciar', MovimientoController_1.MovimientoController.iniciarMovimiento);
/**
 * PATCH /movimientos/:id/pausar
 * Pausa un movimiento en proceso.
 * 200 OK | 400 | 500
 */
router.patch('/:id/pausar', MovimientoController_1.MovimientoController.pausarMovimiento);
/**
 * PATCH /movimientos/:id/reanudar
 * Reanuda un movimiento previamente pausado.
 * 200 OK | 400 | 500
 */
router.patch('/:id/reanudar', MovimientoController_1.MovimientoController.reanudarMovimiento);
/**
 * PATCH /movimientos/:id/finalizar
 * Finaliza un movimiento (devuelve acciones sugeridas).
 * 200 OK | 400 | 404 | 500
 */
router.patch('/:id/finalizar', MovimientoController_1.MovimientoController.finalizarMovimiento);
exports.default = router;
