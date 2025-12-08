// src/controllers/Movimientos/RondaController.ts

/**
 * @file RondaController.ts
 * @author Isaac
 * @version 1.4.1 2025-08-18
 *
 * @overview
 * Controlador HTTP para **Rondas**. Expone handlers usados por `RondaRoutes`.
 *
 * Principios y límites de responsabilidad:
 * - Este controller **no** implementa lógica de negocio compleja; delega en `RondaModel`.
 * - Valida parámetros de entrada, controla códigos de estado HTTP y registra errores.
 * - Mantiene los contratos HTTP estables y documentados (requests/responses).
 *
 * Efectos colaterales relevantes (ejecutados en el modelo):
 * - Recomposición de rondas (reordenamientos, compactaciones).
 * - Reglas de prioridad (ALTAS/BJAS), HOLDs, y notificaciones (FCM) cuando aplique.
 *
 * Seguridad:
 * - Todas las rutas deben estar protegidas por JWT en el router (`router.use(passport.authenticate(...))`).
 *
 * Idempotencia:
 * - `generarRondaParaMovimiento` es segura frente a reintentos: si la ronda ya existe, el modelo no duplica.
 *
 * Convenciones de error:
 * - 400 Parámetros inválidos, 404 Recurso no encontrado (cuando aplique), 500 Error inesperado.
 *
 * Ejemplos de uso (cURL):
 * - Crear (BAJA):   `curl -X POST /rondas/movimiento/123 -H "Content-Type: application/json" -d '{"empresaId":1,"localidadId":10}'`
 * - Crear (ALTA):   `curl -X POST /rondas/movimiento/123 -H "Content-Type: application/json" -d '{"empresaId":1,"localidadId":10,"prioridad":"ALTA"}'`
 * - Siguiente:      `curl /rondas/localidad/10/siguiente`
 * - Intercambiar:   `curl -X PATCH /rondas/intercambiar-movimientos -H "Content-Type: application/json" -d '{"rondaAId":5,"rondaBId":9}'`
 */

import { RequestHandler } from "express";
import { RondaModel } from "../../../models/Movimientos/Ronda/RondaModel";
import { movimientoControllerLogger as logger } from "../movimiento.controller.logger";

export class RondaController {
  /**
   * POST /rondas/movimiento/:movimientoId
   *
   * @summary Crea una ronda para un movimiento dado.
   * @description
   * Inserta el movimiento en la estructura de rondas según reglas de negocio:
   * - ALTAS → preferencia por R1 (FIFO), con reordenamientos automáticos.
   * - BAJAS → balanceo tipo “robin-hood” (máx. 1 por empresa por ronda).
   * El modelo puede **recomponer** rondas tras la inserción.
   *
   * @auth Requiere JWT.
   *
   * @param {number} req.params.movimientoId - ID del movimiento (numérico).
   * @body {number} empresaId - Empresa dueña del movimiento.
   * @body {number} localidadId - Localidad donde se insertará.
   * @body {"ALTA"|"BAJA"} [prioridad="BAJA"] - Prioridad inicial.
   *
   * @returns 201 { message, movimientoId, empresaId, localidadId, prioridad, siguienteInteligente }
   * @returns 400 Parámetros inválidos
   * @returns 500 Error del servidor
   *
   * @notes Idempotente: si ya existe una ronda activa para el movimiento, el modelo evita duplicar.
   */
  static generarRondaParaMovimiento: RequestHandler = async (req, res) => {
    const movimientoId = Number(req.params.movimientoId);
    const { empresaId, localidadId, prioridad } = req.body as {
      empresaId: unknown;
      localidadId: unknown;
      prioridad?: "ALTA" | "BAJA";
    };

    if (isNaN(movimientoId) || typeof empresaId !== "number" || typeof localidadId !== "number") {
      res.status(400).json({ message: "Parámetros inválidos" });
      return;
    }
    if (prioridad !== undefined && prioridad !== "ALTA" && prioridad !== "BAJA") {
      res.status(400).json({ message: "Valor de prioridad inválido. Debe ser 'ALTA' o 'BAJA'" });
      return;
    }

    try {
      const prioridadFinal = prioridad || "BAJA";

      await RondaModel.generarRondaParaMovimiento({
        movimientoId,
        empresaId,
        localidadId,
        prioridad: prioridadFinal
      });

      // Se expone el “siguiente” post-inserción para que el cliente pueda refrescar UI.
      const next = await RondaModel.siguienteInteligente(localidadId);

      res.status(201).json({
        message:
          prioridadFinal === "ALTA"
            ? "Ronda de ALTA prioridad creada. Se reorganizaron las rondas."
            : "Ronda creada exitosamente.",
        movimientoId,
        empresaId,
        localidadId,
        prioridad: prioridadFinal,
        siguienteInteligente: next
      });
    } catch (error) {
      logger.error("Error al generar ronda para movimiento", { error, movimientoId, prioridad });
      res.status(500).json({ message: "Error al generar ronda para movimiento" });
    }
  };

  /**
   * GET /rondas
   *
   * @summary Lista todas las rondas (todas las localidades).
   * @auth Requiere JWT.
   * @returns 200 Rondas con empresa y movimiento embebidos.
   * @returns 500 Error del servidor.
   */
  static obtenerRondas: RequestHandler = async (_req, res) => {
    try {
      const rondas = await RondaModel.obtenerRondas();
      res.status(200).json(rondas);
    } catch (error) {
      logger.error("Error al obtener rondas", { error });
      res.status(500).json({ message: "Error al obtener rondas" });
    }
  };

  /**
   * DELETE /rondas/:id
   *
   * @summary Elimina una ronda por ID.
   * @description El modelo puede recomponer rondas tras la eliminación.
   * @auth Requiere JWT.
   * @param {number} req.params.id - ID de la ronda.
   * @returns 204 Sin contenido
   * @returns 400 ID inválido
   * @returns 500 Error del servidor
   */
  static eliminarRonda: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID de ronda inválido" });
      return;
    }
    try {
      const eliminada = await RondaModel.eliminarRonda(id);
      // Recalcula “siguiente” en la(s) localidad(es) afectada(s)
      await RondaModel.siguienteInteligente(eliminada.localidadId);
      res.sendStatus(204);
    } catch (error) {
      logger.error("Error al eliminar ronda", { error, id });
      res.status(500).json({ message: "Error al eliminar ronda" });
    }
  };

  /**
   * GET /rondas/localidad/:localidadId
   *
   * @summary Lista rondas para una localidad.
   * @auth Requiere JWT.
   * @param {number} req.params.localidadId - Localidad.
   * @returns 200 Rondas ordenadas por rondaNumero/orden
   * @returns 400 ID inválido
   * @returns 500 Error del servidor
   */
  static obtenerRondasPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (isNaN(localidadId)) {
      res.status(400).json({ message: "ID de localidad inválido" });
      return;
    }
    try {
      const rondas = await RondaModel.obtenerRondasPorLocalidad(localidadId);
      res.status(200).json(rondas);
    } catch (error) {
      logger.error("Error al obtener rondas por localidad", { error, localidadId });
      res.status(500).json({ message: "Error al obtener rondas por localidad" });
    }
  };

  /**
   * GET /rondas/localidad/:localidadId/estado/:concluido
   *
   * @summary Lista rondas por localidad y estado de conclusión.
   * @auth Requiere JWT.
   * @param {number} req.params.localidadId
   * @param {"true"|"false"} req.params.concluido
   * @returns 200 Rondas filtradas
   * @returns 400 Parámetros inválidos
   * @returns 500 Error del servidor
   */
  static obtenerRondasPorLocalidadConEstado: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    const concluidoParam = req.params.concluido?.toLowerCase();
    const concluido = concluidoParam === "true";

    if (isNaN(localidadId) || !["true", "false"].includes(concluidoParam)) {
      res.status(400).json({ message: "Parámetros inválidos" });
      return;
    }

    try {
      const rondas = await RondaModel.obtenerRondasPorLocalidadConEstado(localidadId, concluido);
      res.status(200).json(rondas);
    } catch (error) {
      logger.error("Error al obtener rondas por localidad y estado", { error, localidadId, concluido });
      res.status(500).json({ message: "Error al obtener rondas por localidad y estado" });
    }
  };

  /**
   * PATCH /rondas/intercambiar-movimientos
   *
   * @summary Intercambia los movimientos entre dos rondas.
   * @description
   * Mantiene orden/ronda de cada slot; solo intercambia `movimientoId` de A<->B.
   * El modelo valida consistencia (vías/secciones) y puede recomponer post-operación.
   *
   * @auth Requiere JWT.
   * @body {number} rondaAId
   * @body {number} rondaBId
   *
   * @returns 200 { message, rondas:[rondaA, rondaB] }
   * @returns 400 Parámetros inválidos
   * @returns 500 Error del servidor (mensaje del modelo si aplica)
   */
  static intercambiarMovimientosEntreRondas: RequestHandler = async (req, res) => {
    const { rondaAId, rondaBId } = req.body;

    if (isNaN(Number(rondaAId)) || isNaN(Number(rondaBId))) {
      res.status(400).json({ message: "Parámetros inválidos" });
      return;
    }

    try {
      const [ra, rb] = await RondaModel.intercambiarMovimientosEntreRondas(Number(rondaAId), Number(rondaBId));
      const locs = Array.from(new Set([ra.localidadId, rb.localidadId]));
      await Promise.all(locs.map(id => RondaModel.siguienteInteligente(id)));

      res.status(200).json({
        message: "Movimientos de rondas intercambiados exitosamente",
        rondas: [ra, rb]
      });
    } catch (error: any) {
      logger.error("Error al intercambiar movimientos entre rondas", { error, rondaAId, rondaBId });
      res.status(500).json({ message: error.message || "Error al intercambiar movimientos entre rondas" });
    }
  };

  /**
   * PATCH /rondas/:id/intercambiar-movimiento
   *
   * @summary Reemplaza el `movimientoId` de una ronda por otro movimiento.
   * @description El modelo valida consistencia (vías/secciones) y puede recomponer.
   * @auth Requiere JWT.
   * @param {number} req.params.id - Ronda objetivo.
   * @body {number} nuevoMovimientoId - Movimiento a insertar en la ronda.
   * @returns 200 { message, ronda }
   * @returns 400 Parámetros inválidos
   * @returns 500 Error del servidor (mensaje del modelo si aplica)
   */
  static intercambiarMovimientoEnRonda: RequestHandler = async (req, res) => {
    const rondaId = Number(req.params.id);
    const { nuevoMovimientoId } = req.body;

    if (isNaN(rondaId) || !nuevoMovimientoId || isNaN(Number(nuevoMovimientoId))) {
      res.status(400).json({ message: "Parámetros inválidos" });
      return;
    }

    try {
      const ronda = await RondaModel.intercambiarMovimientoEnRonda(rondaId, Number(nuevoMovimientoId));
      await RondaModel.siguienteInteligente(ronda.localidadId);

      res.status(200).json({
        message: "Movimiento de ronda intercambiado exitosamente",
        ronda
      });
    } catch (error: any) {
      logger.error("Error al intercambiar movimiento en ronda", { error, rondaId, nuevoMovimientoId });
      res.status(500).json({ message: error.message || "Error al intercambiar movimiento en ronda" });
    }
  };

  /**
   * GET /rondas/localidad/:localidadId/siguiente
   *
   * @summary Devuelve el siguiente candidato para el maquinista.
   * @description
   * El modelo filtra según reglas:
   * - Servicios (lavado/torno) solo visibles si están `EN_PROCESO`.
   * - Otros: salta los que ya están `EN_PROCESO`.
   * También puede **notificar** bloqueo (“tapado”) si detecta obstrucción.
   *
   * @auth Requiere JWT.
   * @param {number} req.params.localidadId
   * @returns 200 { vacio?:true, motivo? } | { rondaId, movimientoId, empresaId, prioridad, locomotiveNumber?, viaDestino?, bloqueado, permiteInicio:true }
   * @returns 400 ID inválido
   * @returns 500 Error del servidor
   */
static obtenerSiguienteEnRonda: RequestHandler = async (req, res) => {
  const localidadId = Number(req.params.localidadId);
  if (isNaN(localidadId)) {
    res.status(400).json({ message: "ID de localidad inválido" });
    return;
  }

  const userId = (req.user as any)?.id ? Number((req.user as any).id) : undefined;

  try {
    const result = await RondaModel.siguienteInteligente(localidadId, userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error("Error al obtener el siguiente (maquinista)", { error, localidadId, userId });
    res.status(500).json({ message: "Error al obtener el siguiente" });
  }
};




  /**
   * GET /rondas/localidad/:localidadId/siguiente-inteligentegit checkout -b master

   *
   * @summary Alias de `obtenerSiguienteEnRonda`.
   * @auth Requiere JWT.
   * @param {number} req.params.localidadId
   * @returns 200 Ver `obtenerSiguienteEnRonda`
   * @returns 400 ID inválido
   * @returns 500 Error del servidor
   */
static obtenerSiguienteInteligente: RequestHandler = async (req, res) => {
  const localidadId = Number(req.params.localidadId);
  if (isNaN(localidadId)) {
    res.status(400).json({ message: "ID de localidad inválido" });
    return;
  }

  const userId = (req.user as any)?.id ? Number((req.user as any).id) : undefined;
x
  try {
    const result = await RondaModel.siguienteInteligente(localidadId, userId);
    res.status(200).json(result);
  } catch (error) {
    logger.error("Error en siguiente inteligente", { error, localidadId, userId });
    res.status(500).json({ message: "Error al calcular siguiente inteligente" });
  }
};
  /**
   * GET /rondas/:id/info
   *
   * @summary Devuelve información detallada de una ronda.
   * @description Incluye datos de empresa y movimiento (vías, flags de servicio, prioridad).
   * @auth Requiere JWT.
   * @param {number} req.params.id - ID de la ronda.
   * @returns 200 { rondaId, rondaNumero, orden, concluido, empresa, movimiento:{...} }
   * @returns 400 ID inválido
   * @returns 500 Error del servidor
   */
  static obtenerInfoRonda: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID de ronda inválido" });
      return;
    }
    try {
      const info = await RondaModel.obtenerInfoPorRonda(id);
      res.status(200).json(info);
    } catch (error) {
      logger.error("Error al obtener información de ronda", { error, id });
      res.status(500).json({ message: "Error al obtener información de ronda" });
    }
  };

  /**
   * PATCH /rondas/:id/concluir
   *
   * @summary Marca una ronda como concluida.
   * @description El modelo limpia y **recompone** la estructura tras concluir.
   * @auth Requiere JWT.
   * @param {number} req.params.id - Ronda a concluir.
   * @returns 200 { message, ronda, siguienteInteligente }
   * @returns 400 ID inválido
   * @returns 500 Error del servidor
   */
  static marcarRondaComoConcluida: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID de ronda inválido" });
      return;
    }
    try {
      const ronda = await RondaModel.marcarRondaComoConcluida(id);
      const next = await RondaModel.siguienteInteligente(ronda.localidadId);
      res.status(200).json({
        message: "Ronda marcada como concluida",
        ronda,
        siguienteInteligente: next
      });
    } catch (error) {
      logger.error("Error al marcar ronda como concluida", { error, id });
      res.status(500).json({ message: "Error al marcar ronda como concluida" });
    }
  };
}
