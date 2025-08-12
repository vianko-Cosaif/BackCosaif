/**
 * @file RondaController.ts
 * @author Isaac 
 * @version 1.2.0 2025-05-16
 *
 * @description
 * Controlador HTTP para la entidad **Ronda**. Expone los endpoints REST
 * necesarios para gestionar generación, consulta y eliminación de rondas
 * ferroviarias, incluyendo datos completos del movimiento y nombres de vías.
 * 
 * Ahora incluye soporte para el sistema de prioridades:
 * - ALTA: Reorganiza todas las rondas existentes
 * - BAJA: Mantiene el principio de una empresa por ronda
 */

import { Request, Response, RequestHandler } from "express";
import { RondaModel } from "../../../models/Movimientos/Ronda/RondaModel";
import { movimientoControllerLogger as logger } from "../movimiento.controller.logger";

export class RondaController {
  // POST /rondas/generar
  static generarRondaInteligente: RequestHandler = async (_req, res) => {
    try {
      const rondas = await RondaModel.generarRondaInteligente();
      res.status(201).json({ 
        message: "Rondas generadas exitosamente", 
        rondas,
        count: rondas.length
      });
    } catch (error) {
      logger.error("Error al generar ronda inteligente", { error });
      res.status(500).json({ message: "Error al generar ronda inteligente" });
    }
  };

  // POST /rondas/reorganizar
  static reorganizarRondas: RequestHandler = async (_req, res) => {
    try {
      await RondaModel.eliminarTodasLasRondas();
      const rondas = await RondaModel.generarRondaInteligente();
      res.status(200).json({ 
        message: "Rondas reorganizadas exitosamente", 
        rondas,
        count: rondas.length 
      });
    } catch (error) {
      logger.error("Error al reorganizar rondas", { error });
      res.status(500).json({ message: "Error al reorganizar rondas" });
    }
  };

  // DELETE /rondas
  static eliminarTodasLasRondas: RequestHandler = async (_req, res) => {
    try {
      await RondaModel.eliminarTodasLasRondas();
      res.sendStatus(204);
    } catch (error) {
      logger.error("Error al eliminar todas las rondas", { error });
      res.status(500).json({ message: "Error al eliminar todas las rondas" });
    }
  };

  // POST /rondas/movimiento/:movimientoId
  static generarRondaParaMovimiento: RequestHandler = async (req, res) => {
    const movimientoId = Number(req.params.movimientoId);
    const { empresaId, localidadId, prioridad } = req.body as {
      empresaId: unknown;
      localidadId: unknown;
      prioridad?: 'ALTA' | 'BAJA';
    };

    if (isNaN(movimientoId) || typeof empresaId !== "number" || typeof localidadId !== "number") {
      res.status(400).json({ message: "Parámetros inválidos" });
      return;
    }

    // Validar el parámetro de prioridad si viene
    if (prioridad !== undefined && prioridad !== 'ALTA' && prioridad !== 'BAJA') {
      res.status(400).json({ message: "Valor de prioridad inválido. Debe ser 'ALTA' o 'BAJA'" });
      return;
    }

    try {
      // Asignar valor por defecto a prioridad si no viene
      const prioridadFinal = prioridad || 'BAJA';
      
      await RondaModel.generarRondaParaMovimiento({
        movimientoId,
        empresaId,
        localidadId,
        prioridad: prioridadFinal
      });

      // Mensaje específico según prioridad
      let message = "Ronda creada exitosamente";
      if (prioridadFinal === 'ALTA') {
        message = "Ronda de ALTA prioridad creada. Se reorganizaron todas las rondas";
      }
      
      res.status(201).json({ 
        message,
        movimientoId,
        empresaId,
        localidadId,
        prioridad: prioridadFinal
      });
    } catch (error) {
      logger.error("Error al generar ronda para movimiento", { error, movimientoId, prioridad });
      res.status(500).json({ message: "Error al generar ronda para movimiento" });
    }
  };

  // GET /rondas
  static obtenerRondas: RequestHandler = async (_req, res) => {
    try {
      const rondas = await RondaModel.obtenerRondas();
      res.status(200).json(rondas);
    } catch (error) {
      logger.error("Error al obtener rondas", { error });
      res.status(500).json({ message: "Error al obtener rondas" });
    }
  };

  // DELETE /rondas/:id
  static eliminarRonda: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID de ronda inválido" });
      return;
    }
    try {
      await RondaModel.eliminarRonda(id);
      res.sendStatus(204);
    } catch (error) {
      logger.error("Error al eliminar ronda", { error, id });
      res.status(500).json({ message: "Error al eliminar ronda" });
    }
  };

  // GET /rondas/localidad/:localidadId
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

  // GET /rondas/localidad/:localidadId/estado/:concluido
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
      logger.error("Error al obtener rondas por localidad y estado", {
        error,
        localidadId,
        concluido,
      });
      res.status(500).json({ message: "Error al obtener rondas por localidad y estado" });
    }
  };

  // PATCH /rondas/intercambiar-movimientos
static intercambiarMovimientosEntreRondas: RequestHandler = async (req, res) => {
  const { rondaAId, rondaBId } = req.body;

  if (isNaN(Number(rondaAId)) || isNaN(Number(rondaBId))) {
    res.status(400).json({ message: "Parámetros inválidos" });
    return;
  }

  try {
    const rondasActualizadas = await RondaModel.intercambiarMovimientosEntreRondas(
      Number(rondaAId),
      Number(rondaBId)
    );
    res.status(200).json({
      message: "Movimientos de rondas intercambiados exitosamente",
      rondas: rondasActualizadas
    });
  } catch (error: any) {
    logger.error("Error al intercambiar movimientos entre rondas", { error, rondaAId, rondaBId });
    res.status(500).json({ message: error.message || "Error al intercambiar movimientos entre rondas" });
  }
};



  // PATCH /rondas/:id/intercambiar-movimiento
static intercambiarMovimientoEnRonda: RequestHandler = async (req, res) => {
  const rondaId = Number(req.params.id);
  const { nuevoMovimientoId } = req.body;

  if (isNaN(rondaId) || !nuevoMovimientoId || isNaN(Number(nuevoMovimientoId))) {
    res.status(400).json({ message: "Parámetros inválidos" });
    return;
  }

  try {
    const rondaActualizada = await RondaModel.intercambiarMovimientoEnRonda(
      rondaId,
      Number(nuevoMovimientoId)
    );
    res.status(200).json({
      message: "Movimiento de ronda intercambiado exitosamente",
      ronda: rondaActualizada
    });
  } catch (error: any) {
    logger.error("Error al intercambiar movimiento en ronda", { error, rondaId, nuevoMovimientoId });
    res.status(500).json({ message: error.message || "Error al intercambiar movimiento en ronda" });
  }
};



  // GET /rondas/localidad/:localidadId/siguiente
  static obtenerSiguienteEnRonda: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (isNaN(localidadId)) {
      res.status(400).json({ message: "ID de localidad inválido" });
      return;
    }
    try {
      const siguiente = await RondaModel.obtenerSiguienteEnRonda(localidadId);
      res.status(200).json(siguiente ?? {});
    } catch (error) {
      logger.error("Error al obtener el siguiente en la ronda", { error, localidadId });
      res.status(500).json({ message: "Error al obtener el siguiente en la ronda" });
    }
  };

  // GET /rondas/:id/info
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

  // PATCH /rondas/:id/concluir
  static marcarRondaComoConcluida: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "ID de ronda inválido" });
      return;
    }
    try {
      const ronda = await RondaModel.marcarRondaComoConcluida(id);
      res.status(200).json({ 
        message: "Ronda marcada como concluida",
        ronda
      });
    } catch (error) {
      logger.error("Error al marcar ronda como concluida", { error, id });
      res.status(500).json({ message: "Error al marcar ronda como concluida" });
    }
  };
}