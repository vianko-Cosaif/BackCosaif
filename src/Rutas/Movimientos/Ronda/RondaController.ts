/**
 * @file RondaController.ts
 * @author Isaac
 * @version 1.3.0 2025-08-11
 *
 * Controlador HTTP para **Ronda**.
 * Cubre generación, consulta, intercambio, siguiente en ronda y conclusión.
 */

import { RequestHandler } from "express";
import { RondaModel } from "../../../models/Movimientos/Ronda/RondaModel";
import { movimientoControllerLogger as logger } from "../movimiento.controller.logger";

// Helpers
const isBoolStr = (v?: string) => v === "true" || v === "false";

export class RondaController {
  // POST /rondas/generar
  static generarRondaInteligente: RequestHandler = async (_req, res) => {
    try {
      const rondas = await RondaModel.generarRondaInteligente();
      res.status(201).json({ message: "Rondas generadas", count: rondas.length, rondas });
    } catch (error) {
      logger.error("generarRondaInteligente", { error });
      res.status(500).json({ message: "Error al generar rondas" });
    }
  };

  // POST /rondas/reorganizar
  static reorganizarRondas: RequestHandler = async (_req, res) => {
    try {
      await RondaModel.eliminarTodasLasRondas();
      const rondas = await RondaModel.generarRondaInteligente();
      res.status(200).json({ message: "Rondas reorganizadas", count: rondas.length, rondas });
    } catch (error) {
      logger.error("reorganizarRondas", { error });
      res.status(500).json({ message: "Error al reorganizar rondas" });
    }
  };

  // DELETE /rondas
  static eliminarTodasLasRondas: RequestHandler = async (_req, res) => {
    try {
      await RondaModel.eliminarTodasLasRondas();
      res.sendStatus(204);
    } catch (error) {
      logger.error("eliminarTodasLasRondas", { error });
      res.status(500).json({ message: "Error al eliminar todas las rondas" });
    }
  };

  // POST /rondas/movimiento/:movimientoId
  static generarRondaParaMovimiento: RequestHandler = async (req, res) => {
    const movimientoId = Number(req.params.movimientoId);
    const { empresaId, localidadId, prioridad } = req.body as {
      empresaId: unknown;
      localidadId: unknown;
      prioridad?: "ALTA" | "BAJA";
    };

    if (!Number.isInteger(movimientoId) || typeof empresaId !== "number" || typeof localidadId !== "number") {
      return res.status(400).json({ message: "Parámetros inválidos" });
    }
    if (prioridad && prioridad !== "ALTA" && prioridad !== "BAJA") {
      return res.status(400).json({ message: "prioridad inválida (ALTA|BAJA)" });
    }

    try {
      const prioridadFinal = prioridad ?? "BAJA";
      await RondaModel.generarRondaParaMovimiento({ movimientoId, empresaId, localidadId, prioridad: prioridadFinal });

      res.status(201).json({
        message:
          prioridadFinal === "ALTA"
            ? "Ronda de ALTA prioridad creada y rondas reorganizadas"
            : "Ronda creada",
        movimientoId,
        empresaId,
        localidadId,
        prioridad: prioridadFinal,
      });
    } catch (error) {
      logger.error("generarRondaParaMovimiento", { error, movimientoId, empresaId, localidadId, prioridad });
      res.status(500).json({ message: "Error al generar ronda para movimiento" });
    }
  };

  // GET /rondas
  static obtenerRondas: RequestHandler = async (_req, res) => {
    try {
      const rondas = await RondaModel.obtenerRondas();
      res.status(200).json(rondas);
    } catch (error) {
      logger.error("obtenerRondas", { error });
      res.status(500).json({ message: "Error al obtener rondas" });
    }
  };

  // DELETE /rondas/:id
  static eliminarRonda: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID de ronda inválido" });

    try {
      await RondaModel.eliminarRonda(id);
      res.sendStatus(204);
    } catch (error) {
      logger.error("eliminarRonda", { error, id });
      res.status(500).json({ message: "Error al eliminar ronda" });
    }
  };

  // GET /rondas/localidad/:localidadId
  static obtenerRondasPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId)) return res.status(400).json({ message: "ID de localidad inválido" });

    try {
      const rondas = await RondaModel.obtenerRondasPorLocalidad(localidadId);
      res.status(200).json(rondas);
    } catch (error) {
      logger.error("obtenerRondasPorLocalidad", { error, localidadId });
      res.status(500).json({ message: "Error al obtener rondas por localidad" });
    }
  };

  // GET /rondas/localidad/:localidadId/estado/:concluido
  static obtenerRondasPorLocalidadConEstado: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    const concluidoParam = req.params.concluido?.toLowerCase();

    if (!Number.isInteger(localidadId) || !isBoolStr(concluidoParam)) {
      return res.status(400).json({ message: "Parámetros inválidos" });
    }

    try {
      const rondas = await RondaModel.obtenerRondasPorLocalidadConEstado(localidadId, concluidoParam === "true");
      res.status(200).json(rondas);
    } catch (error) {
      logger.error("obtenerRondasPorLocalidadConEstado", { error, localidadId, concluido: concluidoParam });
      res.status(500).json({ message: "Error al obtener rondas por localidad y estado" });
    }
  };

  // PATCH /rondas/intercambiar-movimientos
  static intercambiarMovimientosEntreRondas: RequestHandler = async (req, res) => {
    const { rondaAId, rondaBId } = req.body;
    if (!Number.isInteger(Number(rondaAId)) || !Number.isInteger(Number(rondaBId))) {
      return res.status(400).json({ message: "Parámetros inválidos" });
    }

    try {
      const rondas = await RondaModel.intercambiarMovimientosEntreRondas(Number(rondaAId), Number(rondaBId));
      res.status(200).json({ message: "Intercambio realizado", rondas });
    } catch (error: any) {
      logger.error("intercambiarMovimientosEntreRondas", { error, rondaAId, rondaBId });
      res.status(500).json({ message: error?.message || "Error al intercambiar movimientos" });
    }
  };

  // PATCH /rondas/:id/intercambiar-movimiento
  static intercambiarMovimientoEnRonda: RequestHandler = async (req, res) => {
    const rondaId = Number(req.params.id);
    const { nuevoMovimientoId } = req.body;

    if (!Number.isInteger(rondaId) || !Number.isInteger(Number(nuevoMovimientoId))) {
      return res.status(400).json({ message: "Parámetros inválidos" });
    }

    try {
      const ronda = await RondaModel.intercambiarMovimientoEnRonda(rondaId, Number(nuevoMovimientoId));
      res.status(200).json({ message: "Movimiento intercambiado", ronda });
    } catch (error: any) {
      logger.error("intercambiarMovimientoEnRonda", { error, rondaId, nuevoMovimientoId });
      res.status(500).json({ message: error?.message || "Error al intercambiar movimiento" });
    }
  };

  // GET /rondas/localidad/:localidadId/siguiente
  static obtenerSiguienteEnRonda: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId)) return res.status(400).json({ message: "ID de localidad inválido" });

    try {
      const siguiente = await RondaModel.obtenerSiguienteEnRonda(localidadId);
      res.status(200).json(siguiente ?? {});
    } catch (error) {
      logger.error("obtenerSiguienteEnRonda", { error, localidadId });
      res.status(500).json({ message: "Error al obtener el siguiente" });
    }
  };

  // GET /rondas/:id/info
  static obtenerInfoRonda: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID de ronda inválido" });

    try {
      const info = await RondaModel.obtenerInfoPorRonda(id);
      res.status(200).json(info);
    } catch (error) {
      logger.error("obtenerInfoRonda", { error, id });
      res.status(500).json({ message: "Error al obtener info de ronda" });
    }
  };

  // PATCH /rondas/:id/concluir
  static marcarRondaComoConcluida: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "ID de ronda inválido" });

    try {
      const ronda = await RondaModel.marcarRondaComoConcluida(id);
      res.status(200).json({ message: "Ronda concluida", ronda });
    } catch (error) {
      logger.error("marcarRondaComoConcluida", { error, id });
      res.status(500).json({ message: "Error al concluir ronda" });
    }
  };
}

export default RondaController;
