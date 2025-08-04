// src/controllers/IncidenteController.ts

import { Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import {
  IncidenteModel,
  EstadoFiltro,
  listarIncidentesPaginados
} from '../../models/Incidente/IncidenteModel';
import { incidenteControllerLogger } from './incidente.controller.logger';
import { NotificadorFCM } from '../../services/NotificadorFCM';

// Configuración de multer (memoria, max. 4 imágenes de 10MB c/u)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    const permitidos = ['image/jpeg','image/jpg','image/png','image/webp'];
    permitidos.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Solo se permiten JPEG, JPG, PNG o WEBP'));
  }
});
export const uploadImagenes = upload.array('imagenes', 4);

export class IncidenteController {
  /**
   * GET /incidentes
   * Listado paginado con filtros opcionales:
   * ?estado=&page=&pageSize=&empresaId=&localidadId=
   */
  static listar: RequestHandler = async (req, res) => {
    try {
      const {
        estado: e,
        page: p,
        pageSize: ps,
        empresaId: emp,
        localidadId: loc
      } = req.query;
      const page     = Math.max(1, Number(p)  || 1);
      const pageSize = Math.max(1, Number(ps) || 20);
      const estado: EstadoFiltro | undefined =
        ['ABIERTO','CERRADO','RESUELTO','PASADOS'].includes(e as string)
          ? (e as EstadoFiltro)
          : undefined;
      const result = await listarIncidentesPaginados({
        page,
        pageSize,
        estado,
        empresaId:   emp ? Number(emp) : undefined,
        localidadId: loc ? Number(loc) : undefined
      });
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      incidenteControllerLogger.error('listar', { error, query: req.query });
      res.status(500).json({ success: false, error: 'Error al listar incidentes' });
    }
  };

  /**
   * GET /incidentes/:id
   * Obtener un incidente por su ID (con relaciones)
   */
  static obtenerPorId: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const incidente = await IncidenteModel.obtenerIncidentePorId(id);
      res.json({ success: true, data: incidente });
    } catch (error) {
      incidenteControllerLogger.error('obtenerPorId', { id: req.params.id, error });
      const errorMsg = (error instanceof Error) ? error.message : String(error);
      const status = /no encontrado/i.test(errorMsg) ? 404 : 500;
      res.status(status).json({ success: false, error: errorMsg });
    }
  };

  /**
   * POST /incidentes
   * Crea un nuevo incidente (opcionalmente con imágenes)
   */
  static crear: RequestHandler = async (req, res) => {
    try {
      const { descripcion, movimientoId, usuarioId } = req.body;
      if (!descripcion || !movimientoId || !usuarioId) {
        return res
          .status(400)
          .json({ success: false, error: 'Faltan campos obligatorios' });
      }
      const buffers = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[]).map(f => f.buffer)
        : [];
      const nuevo = await IncidenteModel.crearIncidente({
        descripcion : descripcion.trim(),
        movimientoId: Number(movimientoId),
        usuarioId   : Number(usuarioId),
        imagenes    : buffers.length ? buffers : undefined
      });
      res.status(201).json({ success: true, data: nuevo });
    } catch (error) {
      incidenteControllerLogger.error('crear', { body: req.body, error });
      res.status(500).json({ success: false, error: 'Error al crear incidente' });
    }
  };

  /**
   * PUT /incidentes/:id
   * Edita descripción, estado y/o imágenes de un incidente
   */
  static editar: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { descripcion, estado } = req.body;
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      if (estado && !['ABIERTO','CERRADO','RESUELTO','PASADOS'].includes(estado)) {
        return res.status(400).json({ success: false, error: 'Estado inválido' });
      }
      const buffers = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[]).map(f => f.buffer)
        : [];
      const actualizado = await IncidenteModel.editarIncidente(id, {
        descripcion: descripcion?.trim(),
        estado:      estado as EstadoFiltro,
        imagenes:    buffers.length ? buffers : undefined
      });
      res.json({ success: true, data: actualizado });
    } catch (error) {
      incidenteControllerLogger.error('editar', { id: req.params.id, error });
      res.status(500).json({ success: false, error: 'Error al editar incidente' });
    }
  };

  /**
   * DELETE /incidentes/:id
   * Elimina un incidente y sus imágenes del disco
   */
  static eliminar: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const eliminado = await IncidenteModel.eliminarIncidente(id);
      res.json({ success: true, data: eliminado });
    } catch (error) {
      incidenteControllerLogger.error('eliminar', { id: req.params.id, error });
      res.status(500).json({ success: false, error: 'Error al eliminar incidente' });
    }
  };

  /**
   * GET /incidentes/:id/verificacion
   * Verifica periodo de verificación / bloqueo (simplificado)
   */
  static verificarPeriodo: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const info = await IncidenteModel.verificarPeriodoVerificacion(id);
      res.json({ success: true, data: info });
    } catch (error) {
      incidenteControllerLogger.error('verificarPeriodo', { id: req.params.id, error });
      res.status(500).json({ success: false, error: 'Error al verificar periodo' });
    }
  };

  /**
   * POST /incidentes/:id/cerrar
   * Cierra manualmente un incidente (cambia estado a CERRADO)
   */
  static cerrar: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const cerrado = await IncidenteModel.editarIncidente(id, { estado: 'CERRADO' });
      res.json({ success: true, data: cerrado });
    } catch (error) {
      incidenteControllerLogger.error('cerrar', { id: req.params.id, error });
      res.status(500).json({ success: false, error: 'Error al cerrar incidente' });
    }
  };

  /**
   * GET /incidentes/imagen/:ruta
   * Sirve la imagen correspondiente a la ruta relativa
   */
  static servirImagen: RequestHandler = async (req, res) => {
    try {
      const ruta      = req.params.ruta as string;
      const fullPath  = IncidenteModel.obtenerRutaCompletaImagen(ruta);
      await fs.access(fullPath);
      res.sendFile(fullPath);
    } catch {
      res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }
  };
}
