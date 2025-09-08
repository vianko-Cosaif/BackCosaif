// src/controllers/Servicios/TornoTController.ts
import { Request, Response, RequestHandler } from 'express';
import { TornoTModel } from '../../models/Servicios/TornoTmodel';
import { tornoTControllerLogger } from './tornoT.controller.logger';

function parseFecha(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(String(v));
  return isNaN(+d) ? undefined : d;
}

export class TornoTController {
  /** POST /servicios/torno  body: { movimientoId: number; inicio?: Date; fin?: Date } */
  static crear: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { movimientoId } = req.body ?? {};
      const inicio = parseFecha(req.body?.inicio);
      const fin = parseFecha(req.body?.fin);

      if (!Number.isInteger(movimientoId)) {
        return res.status(400).json({ error: 'movimientoId es obligatorio y numérico' });
      }
      if (req.body?.inicio !== undefined && inicio === undefined) {
        return res.status(400).json({ error: 'inicio no es una fecha válida' });
      }
      if (req.body?.fin !== undefined && fin === undefined) {
        return res.status(400).json({ error: 'fin no es una fecha válida' });
      }

      const creado = await TornoTModel.crear({ movimientoId, inicio: inicio ?? null, fin: fin ?? null });
      return res.status(201).json(creado);
    } catch (error) {
      tornoTControllerLogger.error('Error al crear TornoT', { error });
      return res.status(500).json({ error: 'Error al crear registro de torno' });
    }
  };

  /** PUT /servicios/torno/:id  body: { inicio?: Date|null; fin?: Date|null } */
  static editar: RequestHandler = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const inicio = req.body?.hasOwnProperty('inicio') ? parseFecha(req.body.inicio) : undefined;
      const fin = req.body?.hasOwnProperty('fin') ? parseFecha(req.body.fin) : undefined;

      if (inicio === undefined && req.body?.hasOwnProperty('inicio')) {
        return res.status(400).json({ error: 'inicio no es una fecha válida (use ISO o null)' });
      }
      if (fin === undefined && req.body?.hasOwnProperty('fin')) {
        return res.status(400).json({ error: 'fin no es una fecha válida (use ISO o null)' });
      }

      const actualizado = await TornoTModel.editar(id, { inicio, fin });
      return res.json(actualizado);
    } catch (error) {
      tornoTControllerLogger.error('Error al editar TornoT', { error });
      return res.status(500).json({ error: 'Error al editar registro de torno' });
    }
  };

  /** GET /servicios/torno/:id */
  static obtener: RequestHandler = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const row = await TornoTModel.obtener(id);
      return res.json(row);
    } catch (error) {
      tornoTControllerLogger.error('Error al obtener TornoT', { error });
      return res.status(500).json({ error: 'Error al obtener registro de torno' });
    }
  };
}
