import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createTornoG, deleteTornoG, getTornoG, listTornoG, updateTornoG } from "./tornoG.controller";

export const tornoGRouter = Router();

tornoGRouter.get("/", asyncHandler(listTornoG));
tornoGRouter.get("/:id", asyncHandler(getTornoG));
tornoGRouter.post("/", asyncHandler(createTornoG));
tornoGRouter.patch("/:id", asyncHandler(updateTornoG));
tornoGRouter.delete("/:id", asyncHandler(deleteTornoG));

