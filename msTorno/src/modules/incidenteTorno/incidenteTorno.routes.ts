import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createHijo,
  createIncidente,
  deleteIncidente,
  getIncidente,
  listHijos,
  listIncidentes,
  updateIncidente,
  updateRondaStatusFromIncidente,
} from "./incidenteTorno.controller";

export const incidenteTornoRouter = Router();

incidenteTornoRouter.get("/", asyncHandler(listIncidentes));
incidenteTornoRouter.post("/", asyncHandler(createIncidente));
incidenteTornoRouter.patch("/:id/ronda-status", asyncHandler(updateRondaStatusFromIncidente));
incidenteTornoRouter.get("/:id", asyncHandler(getIncidente));
incidenteTornoRouter.patch("/:id", asyncHandler(updateIncidente));
incidenteTornoRouter.delete("/:id", asyncHandler(deleteIncidente));

incidenteTornoRouter.get("/:id/hijos", asyncHandler(listHijos));
incidenteTornoRouter.post("/:id/hijos", asyncHandler(createHijo));

