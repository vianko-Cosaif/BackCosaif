import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { IncidenteController } from "./incidente.controller";

export const incidenteRouter = Router();

incidenteRouter.patch("/:id/resolver", asyncHandler(IncidenteController.resolver));
