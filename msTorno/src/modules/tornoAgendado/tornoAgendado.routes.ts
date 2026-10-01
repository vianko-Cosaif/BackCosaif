import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createTornoAgendado,
  deleteTornoAgendadoByMovimiento,
  deleteTornoAgendadosVencidos,
  getTornoAgendadoActivable,
  listTornoAgendados,
} from "./tornoAgendado.controller";

export const tornoAgendadoRouter = Router();

tornoAgendadoRouter.get("/", asyncHandler(listTornoAgendados));
tornoAgendadoRouter.get("/activable", asyncHandler(getTornoAgendadoActivable));
tornoAgendadoRouter.delete("/vencidos", asyncHandler(deleteTornoAgendadosVencidos));
tornoAgendadoRouter.post("/", asyncHandler(createTornoAgendado));
tornoAgendadoRouter.delete("/:idMovimiento", asyncHandler(deleteTornoAgendadoByMovimiento));
