import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { IncidenteController } from "./incidente.controller";
import { evidenciaNatural } from './incidente.evidencia';
import { z } from 'zod';

export const incidenteRouter = Router();

incidenteRouter.get("/", asyncHandler(IncidenteController.listar));
incidenteRouter.get("/:id", asyncHandler(IncidenteController.obtener));
incidenteRouter.get('/:id/fotos/:fotoId', asyncHandler(async (req, res) => {
  if (String(req.query.tipo ?? 'NATURAL').toUpperCase() !== 'NATURAL') return res.status(400).json({ error: 'Este recurso corresponde a evidencia natural' });
  const id = z.coerce.number().int().positive();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(await evidenciaNatural(id.parse(req.params.id), id.parse(req.params.fotoId)));
}));
incidenteRouter.patch("/:id/resolver", asyncHandler(IncidenteController.resolver));
incidenteRouter.patch("/:id/cerrar", asyncHandler(IncidenteController.cerrar));
