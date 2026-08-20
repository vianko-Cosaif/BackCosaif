import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  addPago,
  cobranzaSummary,
  createCorte,
  createGestion,
  getCorte,
  listCorteHistorial,
  listCortes,
  listGestiones,
  updateCorte,
  updateGestion,
} from "./cobranza.controller";

export const cobranzaRouter = Router();

cobranzaRouter.get("/resumen", asyncHandler(cobranzaSummary));
cobranzaRouter.get("/cortes", asyncHandler(listCortes));
cobranzaRouter.post("/cortes", asyncHandler(createCorte));
cobranzaRouter.get("/cortes/:id", asyncHandler(getCorte));
cobranzaRouter.get("/cortes/:id/historial", asyncHandler(listCorteHistorial));
cobranzaRouter.patch("/cortes/:id", asyncHandler(updateCorte));
cobranzaRouter.post("/cortes/:id/pagos", asyncHandler(addPago));
cobranzaRouter.get("/gestiones", asyncHandler(listGestiones));
cobranzaRouter.post("/gestiones", asyncHandler(createGestion));
cobranzaRouter.patch("/gestiones/:id", asyncHandler(updateGestion));
