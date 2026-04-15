import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createIncidenteHijo,
  deleteIncidenteHijo,
  getIncidenteHijo,
  listIncidentesHijos,
  updateIncidenteHijo,
} from "./incidenteTornoHijo.controller";

export const incidenteTornoHijoRouter = Router();

incidenteTornoHijoRouter.get("/", asyncHandler(listIncidentesHijos));
incidenteTornoHijoRouter.get("/:id", asyncHandler(getIncidenteHijo));
incidenteTornoHijoRouter.post("/", asyncHandler(createIncidenteHijo));
incidenteTornoHijoRouter.patch("/:id", asyncHandler(updateIncidenteHijo));
incidenteTornoHijoRouter.delete("/:id", asyncHandler(deleteIncidenteHijo));

