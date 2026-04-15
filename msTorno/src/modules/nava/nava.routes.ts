import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createNava, deleteNava, getNava, listNavas, updateNava } from "./nava.controller";

export const navaRouter = Router();

navaRouter.get("/", asyncHandler(listNavas));
navaRouter.get("/:id", asyncHandler(getNava));
navaRouter.post("/", asyncHandler(createNava));
navaRouter.patch("/:id", asyncHandler(updateNava));
navaRouter.delete("/:id", asyncHandler(deleteNava));

