// src/controllers/IncidenteController.ts
import { Request, Response, RequestHandler, ErrorRequestHandler } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import {
  IncidenteModel,
  EstadoFiltro,
  listarIncidentesPaginados, // sólo para RESUELTO/PASADOS con pageSize fijo
} from '../../models/Incidente/IncidenteModel';
import { incidenteControllerLogger } from './incidente.controller.logger';

// ─────────────────────────────────────────────────────────────
// Multer (memoria, máx. 4 imágenes de 10MB c/u, tipos permitidos)
// ─────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    ok.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Solo se permiten JPEG, JPG, PNG o WEBP'));
  },
});
export const uploadImagenes = upload.array('imagenes', 4);

// Manejo uniforme de errores de subida
export const manejarErroresUpload: ErrorRequestHandler = (err, _req, res, _next) => {
  if (!err) return res.status(500).json({ success: false, error: 'Error desconocido' });
  const msg = /File too large/i.test(err.message)
    ? 'Imagen demasiado grande (máx 10MB)'
    : /Solo se permiten/i.test(err.message)
    ? err.message
    : 'Error al subir imágenes';
  return res.status(400).json({ success: false, error: msg });
};

export class IncidenteController {
  /**
   * GET /incidentes
   * Listado paginado con filtros opcionales:
   * ?estado=&page=&pageSize=&empresaId=&localidadId=
   *
   * Reglas:
   * - Con empresa/localidad → se usan métodos específicos paginados del modelo.
   * - Sin filtros de empresa/localidad → obtenerIncidentesPaginados (acepta ABIERTO|CERRADO).
   * - Para RESUELTO/PASADOS → usar listarIncidentesPaginados (pageSize=20 fijo).
   */
  static listar: RequestHandler = async (req, res) => {
    try {
      const { estado: e, page: p, pageSize: ps, empresaId: emp, localidadId: loc } = req.query;

      const page = Math.max(1, Number(p) || 1);
      const pageSize = Math.max(1, Number(ps) || 20);
      const empresaId = emp ? Number(emp) : undefined;
      const localidadId = loc ? Number(loc) : undefined;

      const estadoStr = typeof e === 'string' ? e.toUpperCase() : undefined;
      const estado: EstadoFiltro | undefined = (['ABIERTO', 'CERRADO', 'RESUELTO', 'PASADOS'] as const).includes(
        estadoStr as any
      )
        ? (estadoStr as EstadoFiltro)
        : undefined;

      // Rama con filtros de empresa/localidad (los métodos del modelo no filtran por RESUELTO/PASADOS)
      if (empresaId && localidadId) {
        const r = await IncidenteModel.obtenerIncidentesPorEmpresaYLocalidad(empresaId, localidadId, page, pageSize);
        return res.json({ success: true, data: r.data, meta: r.meta });
      }
      if (empresaId && !localidadId) {
        const r = await IncidenteModel.obtenerIncidentesPorEmpresa(empresaId, page, pageSize);
        return res.json({ success: true, data: r.data, meta: r.meta });
      }
      if (!empresaId && localidadId) {
        const r = await IncidenteModel.obtenerIncidentesPorLocalidad(localidadId, page, pageSize);
        return res.json({ success: true, data: r.data, meta: r.meta });
      }

      // Sin empresa/localidad:
      // - Si piden RESUELTO o PASADOS, usamos el helper con pageSize fijo (20)
      if (estado === 'RESUELTO' || estado === 'PASADOS') {
        const r = await listarIncidentesPaginados({ page, estado });
        return res.json({ success: true, data: r.data, meta: r.meta });
      }

      // - Si piden ABIERTO/CERRADO o nada → método del modelo (acepta pageSize)
      const estadoSimple = estado === 'ABIERTO' || estado === 'CERRADO' ? estado : undefined;
      const r = await IncidenteModel.obtenerIncidentesPaginados(page, pageSize, estadoSimple);
      return res.json({ success: true, data: r.data, meta: r.meta });
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
      const errorMsg = error instanceof Error ? error.message : String(error);
      const status = /no (se )?encontr|no existe/i.test(errorMsg) ? 404 : 500;
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
        return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
      }
      const buffers = Array.isArray(req.files) ? (req.files as Express.Multer.File[]).map((f) => f.buffer) : [];
      const nuevo = await IncidenteModel.crearIncidente({
        descripcion: String(descripcion).trim(),
        movimientoId: Number(movimientoId),
        usuarioId: Number(usuarioId),
        imagenes: buffers.length ? buffers : undefined,
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
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      const { descripcion, estado } = req.body as { descripcion?: string; estado?: string };

      if (estado && !['ABIERTO', 'CERRADO', 'RESUELTO'].includes(estado.toUpperCase())) {
        return res.status(400).json({ success: false, error: 'Estado inválido (use ABIERTO, CERRADO o RESUELTO)' });
      }

      const buffers = Array.isArray(req.files) ? (req.files as Express.Multer.File[]).map((f) => f.buffer) : [];
      const actualizado = await IncidenteModel.editarIncidente(id, {
        descripcion: descripcion?.trim(),
        estado: estado ? (estado.toUpperCase() as 'ABIERTO' | 'CERRADO' | 'RESUELTO') : undefined,
        imagenes: buffers.length ? buffers : undefined,
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
   * Verifica periodo de verificación / bloqueo
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
   * Cambia estado a CERRADO (el modelo ya notifica si aplica)
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
   * POST /incidentes/:id/continuar
   * Marca CERRADO y dispara la reorganización desde el modelo de rondas
   */
  static continuar: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { comentario } = req.body as { comentario?: string };
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const inc = await IncidenteModel.continuarMovimiento(id, (comentario ?? '').toString());
      return res.json({ success: true, data: inc });
    } catch (error: any) {
      incidenteControllerLogger.error('continuar', { id: req.params.id, error });
      const msg = error instanceof Error ? error.message : 'Error al continuar movimiento';
      return res.status(/ya cerrado/i.test(msg) ? 409 : 500).json({ success: false, error: msg });
    }
  };

  /**
   * POST /incidentes/cerrar-vencidos
   * Cierra automáticamente incidentes vencidos (para cron/admin)
   */
  static cerrarVencidos: RequestHandler = async (_req, res) => {
    try {
      const cerrados = await IncidenteModel.cerrarIncidentesVencidos();
      return res.json({ success: true, data: { cerrados } });
    } catch (error) {
      incidenteControllerLogger.error('cerrarVencidos', { error });
      return res.status(500).json({ success: false, error: 'Error al cerrar incidentes vencidos' });
    }
  };

  /**
   * GET /incidentes/imagen  (?ruta=aaaa/mm/dd/archivo.jpg)
   * o GET /incidentes/imagen/:ruta (una sola parte)
   * Sirve la imagen correspondiente a la ruta relativa (con saneo)
   */
  static servirImagen: RequestHandler = async (req, res) => {
    try {
      const rutaParam = (req.query.ruta as string) ?? (req.params.ruta as string) ?? '';
      if (!rutaParam) return res.status(400).json({ success: false, error: 'Ruta requerida' });

      // saneo básico contra path traversal
      const normalizada = path.posix.normalize(rutaParam).replace(/^(\.\.\/)+/, '');
      if (normalizada.includes('..')) {
        return res.status(400).json({ success: false, error: 'Ruta inválida' });
      }

      const fullPath = IncidenteModel.obtenerRutaCompletaImagen(normalizada);
      await fs.access(fullPath);
      return res.sendFile(fullPath);
    } catch {
      return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }
  };

  /**
   * POST /incidentes/:id/resuelto
   * Marca un incidente como RESUELTO.
   * (No llamamos a Notificador aquí: el modelo ya notifica al cambiar estado)
   */
  static resolver: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      const actualizado = await IncidenteModel.editarIncidente(id, { estado: 'RESUELTO' });
      return res.json({ success: true, data: actualizado });
    } catch (error: any) {
      incidenteControllerLogger.error('resolver', { id: req.params.id, error });
      return res.status(500).json({ success: false, error: 'Error al resolver incidente' });
    }
  };
}
