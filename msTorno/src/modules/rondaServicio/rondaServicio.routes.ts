import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  cancelarRondaServicioExterna,
  concluirRondaServicio,
  createRondaServicio,
  deleteRondaServicio,
  finalizarEjeRondaServicio,
  getRondaServicio,
  historialRondasServicio,
  iniciarEjeRondaServicio,
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
rondaServicioRouter.post("/:id/ejes/:posicion/iniciar", asyncHandler(iniciarEjeRondaServicio));
rondaServicioRouter.post("/:id/ejes/:posicion/finalizar", asyncHandler(finalizarEjeRondaServicio));
rondaServicioRouter.post("/:id/concluir", asyncHandler(concluirRondaServicio));
rondaServicioRouter.post("/:id/cancelar-externo", asyncHandler(cancelarRondaServicioExterna));
rondaServicioRouter.patch("/:id", asyncHandler(updateRondaServicio));
rondaServicioRouter.delete("/:id", asyncHandler(deleteRondaServicio));
