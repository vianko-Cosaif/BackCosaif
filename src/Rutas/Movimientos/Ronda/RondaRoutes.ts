/**
 * @file RondaRoutes.ts
 * @author Isaac
 * @version 1.2.1 2025-05-16
 *
 * @description
 * Rutas HTTP para **Ronda**, alineadas con el RondaController y el RondaModel.
 *
 * Montaje típico: `app.use('/rondas', router)`
 * Seguridad: TODAS las rutas requieren JWT.
 *
 * Notas de negocio (resumen):
 * - Inserción de rondas:
 *    • ALTAS → R1 (FIFO, sin límite por empresa; si hay HOLD, bajan a R2).
 *    • BAJAS → 1 por empresa por ronda, repartidas en “robin-hood” (comienzan en R2 si hay ALTAS activas).
 * - “Siguiente” (maquinista) **no bloquea** si hay obstrucción; informa `bloqueado` y permite inicio.
 * - Intercambios validan que la vía/las secciones destino no estén ocupadas para evitar inconsistencias.
 * - Muchas operaciones disparan recomposición y/o cálculo del “siguiente inteligente”.
 */

import { Router } from "express";
import { RondaController } from "./RondaController";
import { authenticateAccess } from "../../../auth/authenticateAccess";

const router = Router();

// ---------------------------------------------------------------------------
// 🔐 Protección JWT para todas las rutas
// ---------------------------------------------------------------------------
router.use(authenticateAccess);

// ---------------------------------------------------------------------------
// ➕ Crear / insertar en rondas
// ---------------------------------------------------------------------------

/**
 * POST /rondas/movimiento/:movimientoId
 * Crea una **ronda** para un movimiento existente.
 *
 * Params:
 *  - movimientoId: number
 * Body:
 *  - empresaId: number
 *  - localidadId: number
 *  - prioridad?: 'ALTA' | 'BAJA' (default: 'BAJA')
 *
 * Efecto:
 *  - Inserta siguiendo reglas del modelo (ALTAS a R1 FIFO; BAJAS “robin-hood”).
 *  - Recompone rondas y calcula el “siguiente inteligente”.
 *
 * Respuestas: 201 { message, movimientoId, empresaId, localidadId, prioridad, siguienteInteligente } | 400 | 500
 */
router.post("/movimiento/:movimientoId", RondaController.generarRondaParaMovimiento);

// ---------------------------------------------------------------------------
// 📋 Consultas generales
// ---------------------------------------------------------------------------

/**
 * GET /rondas
 * Lista todas las rondas (ordenadas por rondaNumero y orden).
 * Efecto: solo lectura.
 * 200 | 500
 */
router.get("/", RondaController.obtenerRondas);

/**
 * DELETE /rondas/:id
 * Elimina una ronda por ID.
 *
 * Params:
 *  - id: number
 *
 * Efecto:
 *  - Elimina la fila de ronda.
 *  - Recalcula “siguiente inteligente” para la localidad afectada.
 *
 * 204 | 400 | 500
 */
router.delete("/:id", RondaController.eliminarRonda);

// ---------------------------------------------------------------------------
/**
 * GET /rondas/localidad/:localidadId
 * Rondas por localidad (con datos de empresa y movimiento).
 *
 * Params:
 *  - localidadId: number
 * 200 | 400 | 500
 */
router.get("/localidad/:localidadId", RondaController.obtenerRondasPorLocalidad);

/**
 * GET /rondas/localidad/:localidadId/estado/:concluido
 * Rondas por localidad filtrando por `concluido`.
 *
 * Params:
 *  - localidadId: number
 *  - concluido: 'true' | 'false'
 * 200 | 400 | 500
 */
router.get("/localidad/:localidadId/estado/:concluido", RondaController.obtenerRondasPorLocalidadConEstado);

// ---------------------------------------------------------------------------
// ⏭️ Siguiente (maquinista)
// ---------------------------------------------------------------------------

/**
 * GET /rondas/localidad/:localidadId/siguiente
 * Devuelve el **siguiente elegible** para el maquinista.
 *
 * Reglas:
 *  - Servicios (lavado/torno) solo si están EN_PROCESO.
 *  - Resto: se salta los EN_PROCESO y ofrece el siguiente elegible.
 *  - Si el destino está bloqueado, devuelve `bloqueado: true` y datos del bloqueo,
 *    pero **permite** inicio (decisión del maquinista).
 *
 * Resp: 200 { rondaId, movimientoId, prioridad, viaDestino, bloqueado, permiteInicio } | 400 | 500
 */
router.get("/localidad/:localidadId/siguiente", RondaController.obtenerSiguienteEnRonda);

/**
 * GET /rondas/localidad/:localidadId/siguiente-inteligente
 * Alias de la anterior (misma salida, mismo comportamiento).
 */
router.get("/localidad/:localidadId/siguiente-inteligente", RondaController.obtenerSiguienteInteligente);

// ---------------------------------------------------------------------------
// 🔄 Intercambios / reemplazos
// ---------------------------------------------------------------------------

/**
 * PATCH /rondas/intercambiar-movimientos
 * Intercambia los **movimientos** entre dos rondas.
 *
 * Body:
 *  - rondaAId: number
 *  - rondaBId: number
 *
 * Efecto:
 *  - Valida que el intercambio no deje vías/sections destino inconsistente (assert).
 *  - Realiza el swap y luego recalcula el “siguiente inteligente” de las localidades implicadas.
 *
 * 200 { message, rondas: [rA, rB] } | 400 | 500
 */
router.patch("/intercambiar-movimientos", RondaController.intercambiarMovimientosEntreRondas);

/**
 * PATCH /rondas/:id/intercambiar-movimiento
 * Reemplaza el **movimiento** asociado a una ronda por otro movimiento.
 *
 * Params:
 *  - id: number (rondaId)
 * Body:
 *  - nuevoMovimientoId: number
 *
 * Efecto:
 *  - Valida físico (vía/sections destino) antes de aplicar.
 *  - Actualiza y recalcula “siguiente inteligente” para la localidad.
 *
 * 200 { message, ronda } | 400 | 500
 */
router.patch("/:id/intercambiar-movimiento", RondaController.intercambiarMovimientoEnRonda);

// ---------------------------------------------------------------------------
// 🔎 Detalle e implementación de cierre
// ---------------------------------------------------------------------------

/**
 * GET /rondas/:id/info
 * Información detallada de una ronda (empresa + movimiento + vías).
 *
 * Params:
 *  - id: number
 * 200 | 400 | 500
 */
router.get("/:id/info", RondaController.obtenerInfoRonda);

/**
 * PATCH /rondas/:id/concluir
 * Marca una ronda como **concluida** y devuelve el “siguiente inteligente”.
 *
 * Params:
 *  - id: number
 *
 * Efecto:
 *  - Marca `concluido = true`, recompone rondas y calcula siguiente.
 *
 * 200 { message, ronda, siguienteInteligente } | 400 | 500
 */
router.patch("/:id/concluir", RondaController.marcarRondaComoConcluida);
export default router;

