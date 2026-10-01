import { z } from "zod";
import { RondaModel } from "./ronda.model";
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { RondaController } from "./ronda.controller";

export const rondaRouter = Router();

rondaRouter.get("/", asyncHandler(RondaController.listar));
rondaRouter.patch("/movimientos/orden", asyncHandler(RondaController.reordenarMovimiento));
rondaRouter.get("/:id", asyncHandler(RondaController.obtener));

rondaRouter.patch('/intercambiar-movimientos', asyncHandler(async (req, res) => {
  const body = z.object({ rondaAId: z.number().int().positive(), rondaBId: z.number().int().positive(), empresaId: z.number().int().positive().optional() }).parse(req.body);
  res.json(await RondaModel.intercambiar(body));
}));
