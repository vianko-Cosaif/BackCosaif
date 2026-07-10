import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { IncidenteController } from "./incidente.controller";

export const incidenteRouter = Router();

incidenteRouter.get("/", asyncHandler(IncidenteController.listar));
incidenteRouter.get("/:id", asyncHandler(IncidenteController.obtener));
incidenteRouter.patch("/:id/resolver", asyncHandler(IncidenteController.resolver));
incidenteRouter.patch("/:id/cerrar", asyncHandler(IncidenteController.cerrar));
