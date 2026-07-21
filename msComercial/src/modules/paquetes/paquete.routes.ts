import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createPaquete, getPaquete, listPaquetes, updatePaquete } from "./paquete.controller";

export const paqueteRouter = Router();

paqueteRouter.get("/", asyncHandler(listPaquetes));
paqueteRouter.post("/", asyncHandler(createPaquete));
paqueteRouter.get("/:id", asyncHandler(getPaquete));
paqueteRouter.patch("/:id", asyncHandler(updatePaquete));
