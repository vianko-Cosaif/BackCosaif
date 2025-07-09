import { Request, Response, RequestHandler } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { IncidenteModel } from '../../models/Incidente/IncidenteModel';
import { IMAGEN_CONFIG } from '../../models/Incidente/IncidenteModel';

/**
 * Controlador HTTP para la gestión de incidentes.
 * Utiliza únicamente los métodos expuestos por IncidenteModel.
 */
export class IncidenteController {
  /**
   * GET /incidentes
   * Lista todos los incidentes sin paginar.
   */
  static obtenerIncidentes: RequestHandler = async (_req, res) => {
    try {
      const incidentes = await IncidenteModel.obtenerIncidentes();
      res.json({ success: true, data: incidentes });
    } catch (error) {
      console.error('Error al listar incidentes', error);
      res.status(500).json({ success: false, error: 'Error al obtener incidentes' });
    }
  };

  /**
   * GET /incidentes/paginado?page=&pageSize=&estado=
   * Lista incidentes paginados con filtro opcional por estado.
   */
  static obtenerIncidentesPaginados: RequestHandler = async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const estado = ['ABIERTO', 'CERRADO'].includes(String(req.query.estado))
      ? (req.query.estado as 'ABIERTO' | 'CERRADO')
      : undefined;

    try {
      let result;
      if (estado) {
        result = await IncidenteModel.obtenerIncidentesPorEstado(estado, page, pageSize);
      } else {
        result = await IncidenteModel.obtenerIncidentesPaginados(page, pageSize);
      }
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      console.error('Error en paginar incidentes', error, req.query);
      res.status(500).json({ success: false, error: 'Error al obtener incidentes paginados' });
    }
  };

  /**
   * GET /incidentes/localidad/:localidadId?page=&pageSize=
   * Lista incidentes de una localidad dada.
   */
  static obtenerPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (isNaN(localidadId)) {
      res.status(400).json({ success: false, error: 'localidadId inválido' });
      return;
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    try {
      const result = await IncidenteModel.obtenerIncidentesPorLocalidad(localidadId, page, pageSize);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      console.error('Error al obtener incidentes por localidad', { localidadId, error });
      res.status(500).json({ success: false, error: 'Error al obtener incidentes por localidad' });
    }
  };

  /**
   * GET /incidentes/empresa/:empresaId?page=&pageSize=
   * Lista incidentes de una empresa dada.
   */
  static obtenerPorEmpresa: RequestHandler = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (isNaN(empresaId)) {
      res.status(400).json({ success: false, error: 'empresaId inválido' });
      return;
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    try {
      const result = await IncidenteModel.obtenerIncidentesPorEmpresa(empresaId, page, pageSize);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      console.error('Error al obtener incidentes por empresa', { empresaId, error });
      res.status(500).json({ success: false, error: 'Error al obtener incidentes por empresa' });
    }
  };

  /**
   * GET /incidentes/:id/imagenes
   * Devuelve URLs de las imágenes de un incidente.
   */
  static obtenerImagenes: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'ID de incidente inválido' });
      return;
    }

    try {
      const rutas = await IncidenteModel.obtenerImagenesIncidente(id);
      const host = `${req.protocol}://${req.get('host')}`;
      const urls = rutas.map(r => `${host}/incidentes/imagen/${encodeURIComponent(r)}`);
      res.json({ success: true, data: urls });
    } catch (error) {
      console.error('Error al obtener imágenes', { id, error });
      res.status(500).json({ success: false, error: 'Error al obtener imágenes de incidente' });
    }
  };

  /**
   * GET /incidentes/imagen/:rutaImagen
   * Sirve un archivo de imagen almacenado.
   */
  static servirImagen: RequestHandler = async (req, res) => {
    try {
      const rutaRel = req.params.rutaImagen;
      const fullPath = path.join(IMAGEN_CONFIG.basePath, rutaRel);
      await fs.access(fullPath);
      res.sendFile(fullPath);
    } catch {
      res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }
  };
}
