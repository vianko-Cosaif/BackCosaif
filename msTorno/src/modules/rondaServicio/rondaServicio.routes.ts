import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  concluirRondaServicio,
  createRondaServicio,
  deleteRondaServicio,
  finalizarEjeRondaServicio,
  getRondaServicio,
  historialRondasServicio,
  iniciarRondaServicio,
  listRondasServicio,
  updateRondaServicio,
} from "./rondaServicio.controller";

export const rondaServicioRouter = Router();

rondaServicioRouter.get("/", asyncHandler(listRondasServicio));
rondaServicioRouter.get("/historial", asyncHandler(historialRondasServicio));
rondaServicioRouter.get("/:id", asyncHandler(getRondaServicio));
rondaServicioRouter.post("/", asyncHandler(createRondaServicio));
rondaServicioRouter.post("/:id/iniciar", asyncHandler(iniciarRondaServicio));
rondaServicioRouter.post("/:id/ejes/:posicion/finalizar", asyncHandler(finalizarEjeRondaServicio));
rondaServicioRouter.post("/:id/concluir", asyncHandler(concluirRondaServicio));
rondaServicioRouter.patch("/:id", asyncHandler(updateRondaServicio));
rondaServicioRouter.delete("/:id", asyncHandler(deleteRondaServicio));
