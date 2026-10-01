import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createTarifa, listTarifas, updateTarifa } from "./tarifa.controller";

export const tarifaRouter = Router();

tarifaRouter.get("/", asyncHandler(listTarifas));
tarifaRouter.post("/", asyncHandler(createTarifa));
tarifaRouter.patch("/:id", asyncHandler(updateTarifa));
