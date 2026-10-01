import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createCambio, deleteCambio, getCambio, getCambioStats, listCambios, updateCambio } from "./cambio.controller";

export const cambioRouter = Router();

cambioRouter.get("/", asyncHandler(listCambios));
cambioRouter.get("/estadisticas", asyncHandler(getCambioStats));
cambioRouter.get("/:id", asyncHandler(getCambio));
cambioRouter.post("/", asyncHandler(createCambio));
cambioRouter.patch("/:id", asyncHandler(updateCambio));
cambioRouter.delete("/:id", asyncHandler(deleteCambio));
