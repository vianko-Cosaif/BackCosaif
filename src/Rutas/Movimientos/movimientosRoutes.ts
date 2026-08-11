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

import { Router } from 'express';
import { authenticateAccess } from '../../auth/authenticateAccess';
import { PERMISSIONS } from '../../auth/accessPolicy';
import { enforceQueryScope, requireAnyPermission, requirePermission } from '../../auth/authorize';
import {
  enforceMovementCreationScope,
  enforcePathScope,
  requireMovementScope,
  requireRoundScope,
} from '../../auth/resourceScope';
import { idempotentMutation } from '../../middlewares/idempotentMutation';
import { MovimientoController } from './MovimientoController'; // <-- asegura que coincide con el nombre real del archivo

const router = Router();

// ---------------------------------------------------------------------------
// 🔐 Protección JWT para todas las rutas
// ---------------------------------------------------------------------------

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
router.use(authenticateAccess);
router.use(idempotentMutation);
router.get(
  '/servicios/pendientes',
  requireAnyPermission(PERMISSIONS.MOVEMENTS_READ, PERMISSIONS.TORNO_READ),
  enforceQueryScope,
  MovimientoController.obtenerServiciosPendientes,
);

/**
 * PATCH /movimientos/servicios/:id/estado
 * Cambia el estado de un servicio de lavado/torno.
 *
 * Params:
 *  - id: number (ID de movimiento/servicio)
 * Body:
 *  - estado: 'SOLICITADO' | 'EN_PROCESO' | 'DETENIDO' | 'CANCELADO'
 *  - operadorId se ignora; el actor se toma de la sesión JWT
 *  - razon?: string
 *
 * Efecto:
 *  - Si pasa a `EN_PROCESO`, el maquinista podrá verlo como elegible (RondaModel.siguienteParaMaquinista).
 * Respuestas:
 *  - 200 OK: { message, movimiento }
 *  - 400 Bad Request: validación
 *  - 500 Internal Server Error
 */
router.patch(
  '/servicios/:id/estado',
  requireAnyPermission(PERMISSIONS.MOVEMENTS_OPERATE, PERMISSIONS.TORNO_OPERATE),
  requireMovementScope(),
  MovimientoController.actualizarEstadoServicio,
);

// ---------------------------------------------------------------------------
// 🚂 MOVIMIENTOS (CRUD + consultas)
// ---------------------------------------------------------------------------

/**
 * GET /movimientos
 * Lista movimientos (vista estándar).
 * Efecto: solo lectura.
 * 200 OK | 500
 */
router.get('/', requirePermission(PERMISSIONS.MOVEMENTS_READ), enforceQueryScope, MovimientoController.obtenerMovimientos);

/**
 * GET /movimientos/buscar
 * Búsqueda server-side con filtros y paginación obligatoria.
 */
router.get('/buscar', requirePermission(PERMISSIONS.MOVEMENTS_READ), enforceQueryScope, MovimientoController.buscarMovimientos);

/**
 * GET /movimientos/all
 * Lista *todos* los movimientos (sin filtros). 
 * Efecto: solo lectura.
 * 200 OK | 500
 */
router.get('/all', requirePermission(PERMISSIONS.MOVEMENTS_READ), enforceQueryScope, MovimientoController.obtenerTodosLosMovimientos);

/**
 * GET /movimientos/pendientes
 * Movimientos no concluidos (global).
 * Efecto: solo lectura.
 * 200 OK | 500
 */
router.get('/pendientes', requirePermission(PERMISSIONS.MOVEMENTS_READ), enforceQueryScope, MovimientoController.obtenerMovimientosPendientes);

/**
 * GET /movimientos/empresa/:empresaId/pendientes
 * Movimientos no concluidos por empresa.
 *
 * Params:
 *  - empresaId: number
 * Efecto: solo lectura.
 * 200 OK | 400 | 500
 */
router.get(
  '/empresa/:empresaId/pendientes',
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  enforcePathScope,
  enforceQueryScope,
  MovimientoController.obtenerMovimientosPendientesPorEmpresa,
);






router.get(
  '/servicios/espera',
  requireAnyPermission(PERMISSIONS.MOVEMENTS_READ, PERMISSIONS.TORNO_READ),
  enforceQueryScope,
  MovimientoController.listarServiciosPendientesFIFO,
);
router.patch(
  '/servicios/:id/solicitar',
  requireAnyPermission(PERMISSIONS.MOVEMENTS_OPERATE, PERMISSIONS.TORNO_OPERATE),
  requireMovementScope(),
  MovimientoController.solicitarServicioYEncolarFrenteR1,
);
router.get(
  '/torno/agendados/activable',
  requirePermission(PERMISSIONS.TORNO_READ),
  enforceQueryScope,
  MovimientoController.buscarTornoAgendadoActivable,
);
router.get(
  '/torno/agendados',
  requirePermission(PERMISSIONS.TORNO_READ),
  enforceQueryScope,
  MovimientoController.listarTornoAgendadosPendientes,
);
router.post(
  '/torno/agendados/:id/activar',
  requirePermission(PERMISSIONS.TORNO_OPERATE),
  requireMovementScope(),
  MovimientoController.activarTornoAgendadoDirecto,
);
router.delete(
  '/torno/agendados/vencidos',
  requirePermission(PERMISSIONS.MOVEMENTS_DELETE),
  MovimientoController.limpiarTornoAgendadosVencidos,
);

/**
 * GET /movimientos/empresa/:empresaId
 * Movimientos por empresa.
 *
 * Params:
 *  - empresaId: number
 * 200 OK | 400 | 500
 */
router.get(
  '/empresa/:empresaId',
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  enforcePathScope,
  enforceQueryScope,
  MovimientoController.obtenerMovimientosPorEmpresa,
);

/**
 * GET /movimientos/empresa/:empresaId/localidad/:localidadId
 * Movimientos por empresa y localidad.
 *
 * Params:
 *  - empresaId: number
 *  - localidadId: number
 * 200 OK | 400 | 500
 */
router.get(
  '/empresa/:empresaId/localidad/:localidadId',
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  enforcePathScope,
  enforceQueryScope,
  MovimientoController.obtenerMovimientosPorEmpresaYLocalidad,
);

/**
 * GET /movimientos/empresa/:empresaId/localidad/:localidadId/pendientes
 * No concluidos por empresa y localidad.
 *
 * Params:
 *  - empresaId: number
 *  - localidadId: number
 * 200 OK | 400 | 500
 */
router.get(
  '/empresa/:empresaId/localidad/:localidadId/pendientes',
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  enforcePathScope,
  enforceQueryScope,
  MovimientoController.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad
);

/**
 * GET /movimientos/localidad/:localidadId/pendientes
 * No concluidos por localidad.
 *
 * Params:
 *  - localidadId: number
 * 200 OK | 400 | 500
 */
router.get(
  '/localidad/:localidadId/pendientes',
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  enforcePathScope,
  enforceQueryScope,
  MovimientoController.obtenerMovimientosPendientesPorLocalidad,
);

/**
 * GET /movimientos/localidad/:localidadId/all
 * Todos los movimientos por localidad.
 *
 * Params:
 *  - localidadId: number
 * 200 OK | 400 | 500
 */
router.get(
  '/localidad/:localidadId/all',
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  enforcePathScope,
  enforceQueryScope,
  MovimientoController.obtenerTodosMovimientosPorLocalidad,
);

/**
 * GET /movimientos/localidad/:localidadId/empresa/:empresaId
 * Movimientos por localidad y empresa.
 *
 * Params:
 *  - localidadId: number
 *  - empresaId: number
 * 200 OK | 400 | 500
 */
router.get(
  '/localidad/:localidadId/empresa/:empresaId',
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  enforcePathScope,
  enforceQueryScope,
  MovimientoController.obtenerMovimientosPorLocalidadEmpresa,
);

/**
 * GET /movimientos/ronda/:rondaId/info
 * Información enriquecida de una ronda (incluye META de instrucciones si existe).
 *
 * Params:
 *  - rondaId: number
 *
 * Efecto: solo lectura; útil para el detalle en el editor de rondas.
 * 200 OK | 400 | 500
 */
router.get(
  '/ronda/:rondaId/info',
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  requireRoundScope('rondaId'),
  MovimientoController.obtenerInfoPorRonda,
);



router.patch(
  '/:id/cancelar',
  requirePermission(PERMISSIONS.MOVEMENTS_CANCEL),
  requireMovementScope(),
  MovimientoController.cancelarMovimiento,
);

/**
 * POST /movimientos
 * Crea un movimiento.
 *
 * Body (mínimo):
 *  - empresaId: number
 *  - creadoPorId se ignora; el creador se toma de la sesión JWT
 *  - localidadId: number
 *  - viaOrigenId: number
 *  - locomotiveNumber: number | string
 *  - viaDestinoId?: number
 *  - numeroSeccion?: number
 *  - instrucciones?: string
 *  - prioridad?: 'ALTA' | 'BAJA' (default: 'BAJA')
 *
 * Efecto:
 *  - NO ocupa/libera vías/sections aquí.
 *  - Inyecta META en `instrucciones` para uso al finalizar:
 *    [META DESTINO:xxx|SECCION:n|LIBERAR]
 *  - Para ponerlo en rondas, usar endpoint de RONDA (`POST /rondas/movimiento/:movimientoId`).
 *
 * 201 Created | 400 | 500
 */
router.post(
  '/',
  requirePermission(PERMISSIONS.MOVEMENTS_CREATE),
  enforceMovementCreationScope,
  MovimientoController.nuevoMovimiento,
);

/**
 * PATCH /movimientos/:id/prioridad
 * Cambia prioridad de un movimiento.
 *
 * Params:
 *  - id: number
 * Body:
 *  - prioridad: 'ALTA' | 'BAJA'
 *
 * Efecto:
 *  - Si pasa a 'ALTA' y estaba 'SOLICITADO', se puede disparar reorganización de rondas.
 * 200 OK | 400 | 404 | 500
 */
router.patch(
  '/:id/prioridad',
  requirePermission(PERMISSIONS.MOVEMENTS_EDIT),
  requireMovementScope(),
  MovimientoController.cambiarPrioridad,
);




router.get(
  '/:id/edicion',
  requirePermission(PERMISSIONS.MOVEMENTS_READ),
  requireMovementScope(),
  MovimientoController.obtenerInfoEdicion,
);



/**
 * DELETE /movimientos/:id
 * Elimina un movimiento.
 *
 * Params:
 *  - id: number
 *
 * Efecto:
 *  - Puede afectar la ronda si estaba asignado (depende del modelo/cascadas).
 * 204 No Content | 400 | 500
 */
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.MOVEMENTS_DELETE),
  requireMovementScope(),
  MovimientoController.eliminarMovimiento,
);

// ---------------------------------------------------------------------------
// ⏯️ Acciones de estado (flujo operativo del movimiento)
// ---------------------------------------------------------------------------

/**
 * PATCH /movimientos/:id/iniciar
 * Marca un movimiento como iniciado por un operador.
 *
 * Params:
 *  - id: number
 * El operador se toma de la sesión JWT; no se confía en un ID enviado por el cliente.
 *
 * Efecto:
 *  - Cambia estado interno a "EN_PROCESO".
 * 200 OK | 400 | 500
 */
router.patch(
  '/:id/iniciar',
  requirePermission(PERMISSIONS.MOVEMENTS_OPERATE),
  requireMovementScope(),
  MovimientoController.iniciarMovimiento,
);

/**
 * PATCH /movimientos/:id/pausar
 * Pausa un movimiento en proceso.
 *
 * Params:
 *  - id: number
 *
 * Efecto:
 *  - Estado pasa a "DETENIDO" (según implementación del modelo).
 * 200 OK | 400 | 500
 */
router.patch(
  '/:id/pausar',
  requirePermission(PERMISSIONS.MOVEMENTS_OPERATE),
  requireMovementScope(),
  MovimientoController.pausarMovimiento,
);

/**
 * PATCH /movimientos/:id/reanudar
 * Reanuda un movimiento previamente pausado.
 *
 * Params:
 *  - id: number
 *
 * Efecto:
 *  - Estado vuelve a "EN_PROCESO".
 * 200 OK | 400 | 500
 */
router.patch(
  '/:id/reanudar',
  requirePermission(PERMISSIONS.MOVEMENTS_OPERATE),
  requireMovementScope(),
  MovimientoController.reanudarMovimiento,
);

/**
 * PATCH /movimientos/:id/finalizar
 * Finaliza un movimiento.
 *
 * Params:
 *  - id: number
 *
 * Efecto:
 *  - **NO** ocupa/libera vías aquí.
 *  - Devuelve `accionesSugeridas` basadas en META:
 *     - liberarOrigen: { viaId }
 *     - ocuparDestino: { viaId, numeroSeccion: 'PRIMERA_LIBRE' | number }
 *  - Otro servicio debe ejecutar dichas acciones en infraestructura de Vías/Secciones.
 *
 * 200 OK | 400 | 404 | 500
 */

router.patch(
  '/:id/edicion',
  requirePermission(PERMISSIONS.MOVEMENTS_EDIT),
  requireMovementScope(),
  MovimientoController.guardarEdicion,
);
router.patch(
  '/:id/finalizar',
  requirePermission(PERMISSIONS.MOVEMENTS_OPERATE),
  requireMovementScope(),
  MovimientoController.finalizarMovimiento,
);

export default router;
