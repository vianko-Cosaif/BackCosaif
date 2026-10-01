import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  listRuedaSolicitudes,
  getRuedaSolicitud,
  createRuedaSolicitud,
  updateRuedaSolicitud,
  deleteRuedaSolicitud,
} from "./ruedaSolicitud.controller";

export const ruedaSolicitudRouter = Router();

ruedaSolicitudRouter.get("/", asyncHandler(listRuedaSolicitudes));
ruedaSolicitudRouter.get("/:id", asyncHandler(getRuedaSolicitud));
ruedaSolicitudRouter.post("/", asyncHandler(createRuedaSolicitud));
ruedaSolicitudRouter.patch("/:id", asyncHandler(updateRuedaSolicitud));
ruedaSolicitudRouter.delete("/:id", asyncHandler(deleteRuedaSolicitud));

