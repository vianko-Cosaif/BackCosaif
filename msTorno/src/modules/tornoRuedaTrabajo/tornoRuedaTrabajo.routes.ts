import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  createTornoRueda,
  deleteTornoRueda,
  getTornoRueda,
  listTornoRuedas,
  updateTornoRueda,
} from "./tornoRuedaTrabajo.controller";

export const tornoRuedaTrabajoRouter = Router();

tornoRuedaTrabajoRouter.get("/", asyncHandler(listTornoRuedas));
tornoRuedaTrabajoRouter.get("/:id", asyncHandler(getTornoRueda));
tornoRuedaTrabajoRouter.post("/", asyncHandler(createTornoRueda));
tornoRuedaTrabajoRouter.patch("/:id", asyncHandler(updateTornoRueda));
tornoRuedaTrabajoRouter.delete("/:id", asyncHandler(deleteTornoRueda));

