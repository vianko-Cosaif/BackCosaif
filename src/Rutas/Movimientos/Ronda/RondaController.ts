/**
 * @file RondaController.ts
 * @author Isaac
 * @version 1.3.1 2025-05-16
 */

import { RequestHandler } from "express";
import { RondaModel } from "../../../models/Movimientos/Ronda/RondaModel";
import { movimientoControllerLogger as logger } from "../movimiento.controller.logger";

export class RondaController {
  // POST /rondas/movimiento/:movimientoId
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
      const eliminada = await RondaModel.eliminarRonda(id);
      await RondaModel.siguienteInteligente(eliminada.localidadId);
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
      logger.error("Error al obtener rondas por localidad y estado", { error, localidadId, concluido });
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

  // PATCH /rondas/:id/intercambiar-movimiento
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

  // GET /rondas/localidad/:localidadId/siguiente (FIFO puro)
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

  // GET /rondas/localidad/:localidadId/siguiente-inteligente
  static obtenerSiguienteInteligente: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (isNaN(localidadId)) {
      res.status(400).json({ message: "ID de localidad inválido" });
      return;
    }
    try {
      const result = await RondaModel.siguienteInteligente(localidadId);
      res.status(200).json(result);
    } catch (error) {
      logger.error("Error en siguiente inteligente", { error, localidadId });
      res.status(500).json({ message: "Error al calcular siguiente inteligente" });
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
