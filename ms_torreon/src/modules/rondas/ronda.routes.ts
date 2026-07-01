import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { RondaController } from "./ronda.controller";

export const rondaRouter = Router();

rondaRouter.get("/", asyncHandler(RondaController.listar));
rondaRouter.get("/:id", asyncHandler(RondaController.obtener));
