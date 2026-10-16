import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { IncidenteController } from "./incidente.controller";
import { evidenciaNatural } from './incidente.evidencia';
import { z } from 'zod';

export const incidenteRouter = Router();

incidenteRouter.get("/", asyncHandler(IncidenteController.listar));
incidenteRouter.get("/:id", asyncHandler(IncidenteController.obtener));
incidenteRouter.get('/:id/fotos/:fotoId', asyncHandler(async (req, res) => {
  const tipo = z.enum(['NATURAL', 'ARRASTRE']).parse(String(req.query.tipo ?? 'NATURAL').toUpperCase());
  const id = z.coerce.number().int().positive();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(await evidenciaNatural(id.parse(req.params.id), id.parse(req.params.fotoId), tipo));
}));
incidenteRouter.patch("/:id/resolver", asyncHandler(IncidenteController.resolver));
incidenteRouter.patch("/:id/cerrar", asyncHandler(IncidenteController.cerrar));
