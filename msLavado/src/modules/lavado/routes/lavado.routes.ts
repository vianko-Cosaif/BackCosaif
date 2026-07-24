import { Router } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { LavadoController } from "../controllers/lavado.controller";

export const lavadoRouter = Router();

lavadoRouter.get("/catalogos", asyncHandler(LavadoController.catalogos));
lavadoRouter.get("/", asyncHandler(LavadoController.listar));
lavadoRouter.post("/", asyncHandler(LavadoController.crear));
lavadoRouter.get("/:id", asyncHandler(LavadoController.obtener));
lavadoRouter.patch("/:id", asyncHandler(LavadoController.actualizar));
lavadoRouter.post(
  "/:id/fases/:faseId/iniciar",
  asyncHandler(LavadoController.iniciarFase)
);
lavadoRouter.post(
  "/:id/fases/:faseId/finalizar",
  asyncHandler(LavadoController.finalizarFase)
);
