import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createCambio, deleteCambio, getCambio, listCambios, updateCambio } from "./cambio.controller";

export const cambioRouter = Router();

cambioRouter.get("/", asyncHandler(listCambios));
cambioRouter.get("/:id", asyncHandler(getCambio));
cambioRouter.post("/", asyncHandler(createCambio));
cambioRouter.patch("/:id", asyncHandler(updateCambio));
cambioRouter.delete("/:id", asyncHandler(deleteCambio));

