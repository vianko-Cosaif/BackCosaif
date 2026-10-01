import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  listRuedasFinal,
  getRuedasFinal,
  createRuedasFinal,
  updateRuedasFinal,
  deleteRuedasFinal,
} from "./ruedasFinal.controller";

export const ruedasFinalRouter = Router();

ruedasFinalRouter.get("/", asyncHandler(listRuedasFinal));
ruedasFinalRouter.get("/:id", asyncHandler(getRuedasFinal));
ruedasFinalRouter.post("/", asyncHandler(createRuedasFinal));
ruedasFinalRouter.patch("/:id", asyncHandler(updateRuedasFinal));
ruedasFinalRouter.delete("/:id", asyncHandler(deleteRuedasFinal));

