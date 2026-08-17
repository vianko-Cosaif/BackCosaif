import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { CatalogoArrastreController } from "./catalogoArrastre.controller";

export const catalogoArrastreRouter = Router();

catalogoArrastreRouter.get("/", asyncHandler(CatalogoArrastreController.listar));
catalogoArrastreRouter.post("/", asyncHandler(CatalogoArrastreController.guardar));
