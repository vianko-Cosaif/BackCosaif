import { Request, Response, RequestHandler } from 'express';
import { SeccionViaModel } from '../../../models/Via/Secciones/SeccionViasModel';
import { seccionError } from '../../../models/Via/Secciones//seccion.logger';

export class SeccionViaController {
  /**
   * GET /secciones
   * Devuelve todas las secciones.
   */
  static obtenerSecciones: RequestHandler = async (_req, res) => {
    try {
      const secciones = await SeccionViaModel.obtenerSecciones();
      res.json(secciones);
    } catch (error: any) {
      seccionError.error('Error al obtener secciones', { error });
      res.status(500).json({ error: 'Error al obtener secciones', details: error.message });
    }
  };

  /**
   * GET /secciones/via/:viaId
   * Devuelve todas las secciones de una vía.
   */
  static obtenerSeccionesPorVia: RequestHandler = async (req, res) => {
    const viaId = parseInt(req.params.viaId, 10);
    if (isNaN(viaId)) {
      res.status(400).json({ error: 'viaId inválido' });
      return;
    }
    try {
      const secciones = await SeccionViaModel.obtenerSeccionesPorVia(viaId);
      res.json(secciones);
    } catch (error: any) {
      seccionError.error('Error al obtener secciones por vía', { error, viaId });
      res.status(500).json({ error: 'Error al obtener secciones por vía', details: error.message });
    }
  };

  /**
   * POST /secciones/via/:viaId
   * Crea una nueva sección en una vía.
   */
  static crearSeccion: RequestHandler = async (req, res) => {
    const viaId = parseInt(req.params.viaId, 10);
    const { numero, nombre } = req.body;
    if (isNaN(viaId) || isNaN(numero)) {
      res.status(400).json({ error: 'viaId y numero deben ser números' });
      return;
    }
    try {
      const seccion = await SeccionViaModel.crearSeccion(viaId, numero, nombre);
      res.status(201).json(seccion);
    } catch (error: any) {
      seccionError.error('Error al crear sección', { error, viaId, numero, nombre });
      res.status(500).json({ error: 'Error al crear sección', details: error.message });
    }
  };

  /**
   * PUT /secciones/:id
   * Edita una sección existente.
   */
  static editarSeccion: RequestHandler = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    if (isNaN(id)) {
      res.status(400).json({ error: 'id de sección inválido' });
      return;
    }
    try {
      const seccion = await SeccionViaModel.editarSeccion(id, data);
      res.json(seccion);
    } catch (error: any) {
      seccionError.error('Error al editar sección', { error, id, data });
      res.status(500).json({ error: 'Error al editar sección', details: error.message });
    }
  };

  /**
   * DELETE /secciones/:id
   * Elimina una sección.
   */
  static eliminarSeccion: RequestHandler = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'id de sección inválido' });
      return;
    }
    try {
      await SeccionViaModel.eliminarSeccion(id);
      res.json({ message: 'Sección eliminada exitosamente' });
    } catch (error: any) {
      seccionError.error('Error al eliminar sección', { error, id });
      res.status(500).json({ error: 'Error al eliminar sección', details: error.message });
    }
  };
}
