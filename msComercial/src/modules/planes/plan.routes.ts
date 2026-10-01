import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  addPlanDetail,
  createPlan,
  deletePlanDetail,
  getPlan,
  listPlanes,
  updatePlan,
  updatePlanDetail,
} from "./plan.controller";

export const planRouter = Router();

planRouter.get("/", asyncHandler(listPlanes));
planRouter.post("/", asyncHandler(createPlan));
planRouter.get("/:id", asyncHandler(getPlan));
planRouter.patch("/:id", asyncHandler(updatePlan));
planRouter.post("/:id/detalles", asyncHandler(addPlanDetail));
planRouter.patch("/:id/detalles/:detailId", asyncHandler(updatePlanDetail));
planRouter.delete("/:id/detalles/:detailId", asyncHandler(deletePlanDetail));
