import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { MovimientoController } from "./movimiento.controller";

export const movimientoRouter = Router();

movimientoRouter.get("/", asyncHandler(MovimientoController.listar));
movimientoRouter.post("/", asyncHandler(MovimientoController.crear));
movimientoRouter.get("/:id", asyncHandler(MovimientoController.obtener));
movimientoRouter.post("/:id/iniciar", asyncHandler(MovimientoController.iniciar));
movimientoRouter.post("/:id/fotos", asyncHandler(MovimientoController.registrarFotos));
movimientoRouter.patch("/:id/finalizar", asyncHandler(MovimientoController.finalizar));
movimientoRouter.post("/:id/detener", asyncHandler(MovimientoController.detener));
movimientoRouter.post("/:id/incidentes", asyncHandler(MovimientoController.detener));
movimientoRouter.patch("/:id/reanudar", asyncHandler(MovimientoController.reanudar));
