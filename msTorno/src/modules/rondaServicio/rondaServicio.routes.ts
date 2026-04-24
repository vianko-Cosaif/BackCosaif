import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createRondaServicio,
  deleteRondaServicio,
  getRondaServicio,
  historialRondasServicio,
  listRondasServicio,
  updateRondaServicio,
} from "./rondaServicio.controller";

export const rondaServicioRouter = Router();

rondaServicioRouter.get("/", asyncHandler(listRondasServicio));
rondaServicioRouter.get("/historial", asyncHandler(historialRondasServicio));
rondaServicioRouter.get("/:id", asyncHandler(getRondaServicio));
rondaServicioRouter.post("/", asyncHandler(createRondaServicio));
rondaServicioRouter.patch("/:id", asyncHandler(updateRondaServicio));
rondaServicioRouter.delete("/:id", asyncHandler(deleteRondaServicio));
