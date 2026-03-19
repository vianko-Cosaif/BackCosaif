import { Request, Response, RequestHandler } from 'express';
import { ViaModel } from '../../models/Via';
import { viaControllerLogger } from './via.controller.logger';
import { ok, fail } from '../../utils/http';

export class ViaController {
  /**
   * GET /vias
   * Devuelve todas las vías.
   */
  static obtenerVias: RequestHandler = async (req: Request, res: Response) => {
    try {
      const vias = await ViaModel.obtenerVias();
      ok(res, vias);
    } catch (error) {
      viaControllerLogger.error('Error al obtener vías', { error });
      fail(res, 500, 'Error al obtener vías', { error: error as any });
    }
  };

  /**
   * GET /vias/lite
   * Devuelve vías ligeras.
   */
  static obtenerViasLite: RequestHandler = async (_req: Request, res: Response) => {
    try {
      const vias = await ViaModel.obtenerViasLite();
      ok(res, vias);
    } catch (error) {
      viaControllerLogger.error('Error al obtener vías lite', { error });
      fail(res, 500, 'Error al obtener vías', { error: error as any });
    }
  };

  /**
   * GET /vias/localidad/:localidadId
   * Devuelve todas las vías asociadas a una localidad.
   */
  static obtenerViasPorLocalidad: RequestHandler = async (req: Request, res: Response) => {
    const localidadId = parseInt(req.params.localidadId, 10);
    if (isNaN(localidadId)) {
      fail(res, 400, 'localidadId inválido');
      return;
    }
    try {
      const vias = await ViaModel.obtenerViasPorLocalidad(localidadId);
      ok(res, vias);
    } catch (error) {
      viaControllerLogger.error('Error al obtener vías por localidad', { error, localidadId });
      fail(res, 500, 'Error al obtener vías por localidad', { error: error as any });
    }
  };

  /**
   * GET /vias/localidad/:localidadId/lite
   * Devuelve vías ligeras por localidad.
   */
  static obtenerViasLitePorLocalidad: RequestHandler = async (req: Request, res: Response) => {
    const localidadId = parseInt(req.params.localidadId, 10);
    if (isNaN(localidadId)) {
      fail(res, 400, 'localidadId inválido');
      return;
    }
    try {
      const vias = await ViaModel.obtenerViasLitePorLocalidad(localidadId);
      ok(res, vias);
    } catch (error) {
      viaControllerLogger.error('Error al obtener vías lite por localidad', { error, localidadId });
      fail(res, 500, 'Error al obtener vías por localidad', { error: error as any });
    }
  };

  /**
   * POST /vias
   * Crea una nueva vía.
   */
  static crearVia: RequestHandler = async (req: Request, res: Response) => {
    const { numero, nombre, localidadId } = req.body;
    if (numero === undefined || !nombre || localidadId === undefined) {
      fail(res, 400, 'Datos incompletos. Se requieren numero, nombre y localidadId');
      return;
    }
    try {
      const nuevaVia = await ViaModel.crearVia(numero, nombre, parseInt(localidadId, 10));
      res.status(201);
      ok(res, nuevaVia);
    } catch (error) {
      viaControllerLogger.error('Error al crear vía', { error, numero, nombre, localidadId });
      fail(res, 500, 'Error al crear vía', { error: error as any });
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
      fail(res, 400, 'ID inválido');
      return;
    }
    try {
      const data: { numero?: number; nombre?: string; localidadId?: number } = {};
      if (numero !== undefined) data.numero = numero;
      if (nombre) data.nombre = nombre;
      if (localidadId !== undefined) data.localidadId = parseInt(localidadId, 10);
      
      const viaActualizada = await ViaModel.editarVia(id, data);
      ok(res, viaActualizada);
    } catch (error) {
      viaControllerLogger.error('Error al editar vía', { error, id, data: { numero, nombre, localidadId } });
      fail(res, 500, 'Error al editar vía', { error: error as any });
    }
  };

  /**
   * DELETE /vias/:id
   * Elimina una vía por su ID.
   */
  static eliminarVia: RequestHandler = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      fail(res, 400, 'ID inválido');
      return;
    }
    try {
      const viaEliminada = await ViaModel.eliminarVia(id);
      ok(res, { message: 'Vía eliminada exitosamente', viaEliminada });
    } catch (error) {
      viaControllerLogger.error('Error al eliminar vía', { error, id });
      fail(res, 500, 'Error al eliminar vía', { error: error as any });
    }
  };
}
