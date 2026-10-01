import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createContrato, getContrato, listContratos, updateContrato } from "./contrato.controller";

export const contratoRouter = Router();

contratoRouter.get("/", asyncHandler(listContratos));
contratoRouter.post("/", asyncHandler(createContrato));
contratoRouter.get("/:id", asyncHandler(getContrato));
contratoRouter.patch("/:id", asyncHandler(updateContrato));
