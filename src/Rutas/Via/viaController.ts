import { Request, Response, RequestHandler } from 'express';
import { ViaModel } from '../../models/Via/viaModel';
import { viaControllerLogger } from './via.controller.logger';
import { attachLifeLineRulesToVias } from './via.lifeLineRules';

export class ViaController {
  /**
   * GET /vias
   * Devuelve todas las vías.
   */
  static obtenerVias: RequestHandler = async (req: Request, res: Response) => {
    try {
      const vias = await ViaModel.obtenerVias();
      res.json(vias);
    } catch (error) {
      viaControllerLogger.error('Error al obtener vías', { error });
      res.status(500).json({ error: 'Error al obtener vías', details: error });
    }
  };

  /**
   * GET /vias/localidad/:localidadId
   * Devuelve todas las vías asociadas a una localidad.
   */
  static obtenerViasPorLocalidad: RequestHandler = async (req: Request, res: Response) => {
    const localidadId = parseInt(req.params.localidadId, 10);
    if (isNaN(localidadId)) {
      res.status(400).json({ error: 'localidadId inválido' });
      return;
    }
    try {
      const vias = await ViaModel.obtenerViasPorLocalidad(localidadId);
      const viasConLineaDeVida = attachLifeLineRulesToVias(vias);
      res.json(viasConLineaDeVida);
    } catch (error) {
      viaControllerLogger.error('Error al obtener vías por localidad', { error, localidadId });
      res.status(500).json({ error: 'Error al obtener vías por localidad', details: error });
    }
  };

  /**
   * POST /vias
   * Crea una nueva vía.
   */
  static crearVia: RequestHandler = async (req: Request, res: Response) => {
    const { numero, nombre, localidadId } = req.body;
    if (numero === undefined || !nombre || localidadId === undefined) {
      res
        .status(400)
        .json({ error: 'Datos incompletos. Se requieren numero, nombre y localidadId' });
      return;
    }
    try {
      const nuevaVia = await ViaModel.crearVia(numero, nombre, parseInt(localidadId, 10));
      res.status(201).json(nuevaVia);
    } catch (error) {
      viaControllerLogger.error('Error al crear vía', { error, numero, nombre, localidadId });
      res.status(500).json({ error: 'Error al crear vía', details: error });
    }
  };

  /**
   * PUT /vias/:id
   * Edita una vía existente.
   */
  static editarVia: RequestHandler = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { numero, nombre, localidadId } = req.body;
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    try {
      const data: { numero?: number; nombre?: string; localidadId?: number } = {};
      if (numero !== undefined) data.numero = numero;
      if (nombre) data.nombre = nombre;
      if (localidadId !== undefined) data.localidadId = parseInt(localidadId, 10);
      
      const viaActualizada = await ViaModel.editarVia(id, data);
      res.json(viaActualizada);
    } catch (error) {
      viaControllerLogger.error('Error al editar vía', { error, id, data: { numero, nombre, localidadId } });
      res.status(500).json({ error: 'Error al editar vía', details: error });
    }
  };

  /**
   * DELETE /vias/:id
   * Elimina una vía por su ID.
   */
  static eliminarVia: RequestHandler = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    try {
      const viaEliminada = await ViaModel.eliminarVia(id);
      res.json({ message: 'Vía eliminada exitosamente', viaEliminada });
    } catch (error) {
      viaControllerLogger.error('Error al eliminar vía', { error, id });
      res.status(500).json({ error: 'Error al eliminar vía', details: error });
    }
  };
}
