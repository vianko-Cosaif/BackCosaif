// SeccionViaController.ts
import { RequestHandler } from 'express';
import {
  SeccionViaModel,
  NotFoundError,
  ConflictError,
} from '../../../models/Via/Secciones/SeccionViasModel';
import { seccionError } from '../../../models/Via/Secciones/seccion.logger';

// Helper: mapear errores de dominio → HTTP
function sendError(res: any, error: any, msg: string) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: msg, details: error.message });
  }
  if (error instanceof ConflictError) {
    return res.status(409).json({ error: msg, details: error.message });
  }
  if ((error as any)?.code === 'P2002') {
    return res.status(409).json({ error: msg, details: 'Registro duplicado (violación de unique).' });
  }
  return res.status(500).json({ error: msg, details: (error as any)?.message ?? String(error) });
}

export class SeccionViaController {
  // ------------------- LISTADOS -------------------

  /** GET /secciones?viaId=123 */
  static obtenerSecciones: RequestHandler = async (req, res) => {
    const viaId = Number(req.query.viaId);
    if (!Number.isInteger(viaId)) {
      return res.status(400).json({ error: 'viaId es requerido y debe ser numérico' });
    }
    try {
      const secciones = await SeccionViaModel.obtenerSeccionesPorVia(viaId);
      res.status(200).json(secciones);
    } catch (error: any) {
      seccionError.error('Error al obtener secciones (por viaId)', { error, viaId });
      sendError(res, error, 'Error al obtener secciones');
    }
  };

  /** GET /secciones/via/:viaId */
  static obtenerSeccionesPorVia: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    if (!Number.isInteger(viaId)) {
      return res.status(400).json({ error: 'viaId inválido' });
    }
    try {
      const secciones = await SeccionViaModel.obtenerSeccionesPorVia(viaId);
      res.status(200).json(secciones);
    } catch (error: any) {
      seccionError.error('Error al obtener secciones por vía', { error, viaId });
      sendError(res, error, 'Error al obtener secciones por vía');
    }
  };

  // ------------------- CRUD -------------------

  /** POST /secciones/via/:viaId  */
  static crearSeccion: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { numero, nombre } = req.body ?? {};
    if (!Number.isInteger(viaId) || !Number.isInteger(Number(numero))) {
      return res.status(400).json({ error: 'viaId y numero deben ser numéricos' });
    }
    try {
      const creada = await SeccionViaModel.crearSeccion(viaId, Number(numero), nombre ?? null);
      res.status(201).json(creada);
    } catch (error: any) {
      seccionError.error('Error al crear sección', { error, viaId, numero, nombre });
      sendError(res, error, 'Error al crear sección');
    }
  };

  /** PUT /secciones/:id */
  static editarSeccion: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { numero, nombre } = req.body ?? {};
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id inválido' });
    }
    try {
      const upd = await SeccionViaModel.editarSeccion(id, {
        numero: Number.isInteger(Number(numero)) ? Number(numero) : undefined,
        nombre: nombre ?? undefined,
      });
      res.status(200).json(upd);
    } catch (error: any) {
      seccionError.error('Error al editar sección', { error, id, numero, nombre });
      sendError(res, error, 'Error al editar sección');
    }
  };

  /** DELETE /secciones/:id */
  static eliminarSeccion: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id inválido' });
    }
    try {
      await SeccionViaModel.eliminarSeccion(id);
      res.status(204).send();
    } catch (error: any) {
      seccionError.error('Error al eliminar sección', { error, id });
      sendError(res, error, 'Error al eliminar sección');
    }
  };

  // ------------------- OCUPACIÓN -------------------

  /** POST /secciones/via/:viaId/asignar  body: { numero, movimientoId } */
  static asignarMovimiento: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { numero, movimientoId } = req.body ?? {};
    if (!Number.isInteger(viaId) || !Number.isInteger(Number(numero)) || !Number.isInteger(Number(movimientoId))) {
      return res.status(400).json({ error: 'viaId, numero y movimientoId deben ser numéricos' });
    }
    try {
      const seccion = await SeccionViaModel.asignarMovimientoASeccion(viaId, Number(numero), Number(movimientoId));
      res.status(200).json(seccion);
    } catch (error: any) {
      seccionError.error('Error al asignar movimiento a sección', { error, viaId, numero, movimientoId });
      sendError(res, error, 'Error al asignar movimiento a sección');
    }
  };

  /** POST /secciones/via/:viaId/liberar  body: { numero, movimientoId } */
  static liberarSeccion: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { numero, movimientoId } = req.body ?? {};
    if (!Number.isInteger(viaId) || !Number.isInteger(Number(numero)) || !Number.isInteger(Number(movimientoId))) {
      return res.status(400).json({ error: 'viaId, numero y movimientoId deben ser numéricos' });
    }
    try {
      const seccion = await SeccionViaModel.liberarSeccion(viaId, Number(numero), Number(movimientoId));
      res.status(200).json(seccion);
    } catch (error: any) {
      seccionError.error('Error al liberar sección', { error, viaId, numero, movimientoId });
      sendError(res, error, 'Error al liberar sección');
    }
  };

  /** POST /secciones/via/:viaId/liberar-todas  body: { movimientoId } */
  static liberarTodasPorMovimiento: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { movimientoId } = req.body ?? {};
    if (!Number.isInteger(viaId) || !Number.isInteger(Number(movimientoId))) {
      return res.status(400).json({ error: 'viaId y movimientoId deben ser numéricos' });
    }
    try {
      const via = await SeccionViaModel.liberarMovimientoDeSeccion(viaId, Number(movimientoId));
      res.status(200).json(via);
    } catch (error: any) {
      seccionError.error('Error al liberar todas las secciones del movimiento', { error, viaId, movimientoId });
      sendError(res, error, 'Error al liberar secciones del movimiento');
    }
  };
}
