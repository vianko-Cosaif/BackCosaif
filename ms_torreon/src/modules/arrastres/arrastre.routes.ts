import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ArrastreController } from "./arrastre.controller";

export const arrastreRouter = Router();

arrastreRouter.get("/", asyncHandler(ArrastreController.listar));
arrastreRouter.post("/", asyncHandler(ArrastreController.crear));
arrastreRouter.get("/:id", asyncHandler(ArrastreController.obtener));
arrastreRouter.post("/:id/iniciar", asyncHandler(ArrastreController.iniciar));
arrastreRouter.patch("/:id/finalizar", asyncHandler(ArrastreController.finalizar));
arrastreRouter.patch("/:id/cancelar", asyncHandler(ArrastreController.cancelar));
arrastreRouter.patch("/:id/reanudar", asyncHandler(ArrastreController.reanudar));
arrastreRouter.patch("/:id/vagones/:vagonId", asyncHandler(ArrastreController.editarVagon));
arrastreRouter.patch("/:id/vagones/:vagonId/iniciar", asyncHandler(ArrastreController.iniciarVagon));
arrastreRouter.patch("/:id/vagones/:vagonId/finalizar", asyncHandler(ArrastreController.finalizarVagon));
arrastreRouter.post("/:id/incidentes", asyncHandler(ArrastreController.crearIncidente));
arrastreRouter.patch("/:id/incidentes/:incidenteId/resolver", asyncHandler(ArrastreController.resolverIncidente));
