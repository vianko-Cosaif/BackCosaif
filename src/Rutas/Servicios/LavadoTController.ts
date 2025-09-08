// src/controllers/Servicios/LavadoTController.ts
import { Request, Response, RequestHandler } from 'express';
import { ServicioEstado } from '@prisma/client';

import { LavadoTModel } from '../../models/Servicios/LavadoTModel';
import { lavadoTControllerLogger } from './lavadoT.controller.logger';

function parseFecha(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(String(v));
  return isNaN(+d) ? undefined : d;
}

export class LavadoTController {
  /**
   * POST /servicios/lavado
   * body: { movimientoId: number; status?: ServicioEstado; inicio?: Date; fin?: Date }
   */
  static crear: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { movimientoId, status } = req.body ?? {};
      const inicio = parseFecha(req.body?.inicio);
      const fin = parseFecha(req.body?.fin);

      if (!Number.isInteger(movimientoId)) {
        return res.status(400).json({ error: 'movimientoId es obligatorio y numérico' });
      }
      if (status !== undefined && !Object.values(ServicioEstado).includes(status)) {
        return res.status(400).json({ error: `status inválido. Valores: ${Object.values(ServicioEstado).join(', ')}` });
      }
      if (req.body?.inicio !== undefined && inicio === undefined) {
        return res.status(400).json({ error: 'inicio no es una fecha válida' });
      }
      if (req.body?.fin !== undefined && fin === undefined) {
        return res.status(400).json({ error: 'fin no es una fecha válida' });
      }

      const creado = await LavadoTModel.crear({ movimientoId, status, inicio: inicio ?? null, fin: fin ?? null });
      return res.status(201).json(creado);
    } catch (error) {
      lavadoTControllerLogger.error('Error al crear LavadoT', { error });
      return res.status(500).json({ error: 'Error al crear registro de lavado' });
    }
  };

  /**
   * PUT /servicios/lavado/:id
   * body: { status?: ServicioEstado; inicio?: Date|null; fin?: Date|null }
   */
  static editar: RequestHandler = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const { status } = req.body ?? {};
      const inicio = req.body?.hasOwnProperty('inicio') ? parseFecha(req.body.inicio) : undefined;
      const fin = req.body?.hasOwnProperty('fin') ? parseFecha(req.body.fin) : undefined;

      if (status !== undefined && !Object.values(ServicioEstado).includes(status)) {
        return res.status(400).json({ error: `status inválido. Valores: ${Object.values(ServicioEstado).join(', ')}` });
      }
      if (inicio === undefined && req.body?.hasOwnProperty('inicio')) {
        return res.status(400).json({ error: 'inicio no es una fecha válida (use ISO o null)' });
      }
      if (fin === undefined && req.body?.hasOwnProperty('fin')) {
        return res.status(400).json({ error: 'fin no es una fecha válida (use ISO o null)' });
      }

      const actualizado = await LavadoTModel.editar(id, {
        status,
        inicio, // puede ser Date | null | undefined
        fin,    // puede ser Date | null | undefined
      });
      return res.json(actualizado);
    } catch (error) {
      lavadoTControllerLogger.error('Error al editar LavadoT', { error });
      return res.status(500).json({ error: 'Error al editar registro de lavado' });
    }
  };

  /**
   * GET /servicios/lavado/:id
   */
  static obtener: RequestHandler = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const row = await LavadoTModel.obtener(id);
      return res.json(row);
    } catch (error) {
      lavadoTControllerLogger.error('Error al obtener LavadoT', { error });
      return res.status(500).json({ error: 'Error al obtener registro de lavado' });
    }
  };
}
