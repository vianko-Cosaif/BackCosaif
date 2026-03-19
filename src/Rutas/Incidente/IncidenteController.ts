// src/controllers/IncidenteController.ts
import { RequestHandler, ErrorRequestHandler } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import {
  IncidenteModel,
  type EstadoFiltro,
  listarIncidentesPaginados,
} from '../../models/Incidente';
import { incidenteControllerLogger } from './incidente.controller.logger';

/**
 * PROBLEMA REAL (lo que te está pegando en prod):
 * - memoryStorage + buffers grandes + creación con imágenes/notificaciones => request tarda o revienta RAM
 * - proxy (nginx) corta conexión => RN muestra "Network request failed"
 * - y tú además devuelves el objeto completo (posible BigInt / payload enorme) => json puede fallar
 *
 * FIXES aplicados:
 * 1) manejarErroresUpload: si no hay err => next() (no 500 fantasma)
 * 2) json-safe para BigInt (por si Prisma devuelve bigint)
 * 3) Respuesta mínima en crear/editar (solo {id} y campos claves) para que RN siempre reciba algo
 * 4) Hooks de res.on('finish'|'close') para detectar cortes de socket (cuando en prod “sí crea pero no responde”)
 * 5) Mejor validación de IDs (0 no válido)
 */

const okMime = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

// ─────────────────────────────────────────────────────────────
// Multer (MEMORIA) — recomendado cambiar a diskStorage en prod
// ─────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    okMime.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Solo se permiten JPEG, JPG, PNG o WEBP'));
  },
});

export const uploadImagenes = upload.array('imagenes', 4);

// Manejo uniforme de errores de subida
export const manejarErroresUpload: ErrorRequestHandler = (err, _req, res, next) => {
  if (!err) return next(); // ✅ FIX: antes devolvías 500 sin error real
  const msg =
    /File too large/i.test(err.message)
      ? 'Imagen demasiado grande (máx 10MB)'
      : /Solo se permiten/i.test(err.message)
      ? err.message
      : 'Error al subir imágenes';
  return res.status(400).json({ success: false, error: msg });
};

// BigInt-safe JSON (por si Prisma o driver regresa bigint)
const jsonSafe = <T,>(x: T): T =>
  JSON.parse(
    JSON.stringify(x, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))
  );

const toInt = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const isValidId = (n: number) => Number.isInteger(n) && n > 0;

export class IncidenteController {
  /**
   * GET /incidentes
   */
  static listar: RequestHandler = async (req, res) => {
    try {
      const { estado: e, page: p, pageSize: ps, empresaId: emp, localidadId: loc } = req.query;

      const page = Math.max(1, toInt(p) || 1);
      const pageSize = Math.max(1, toInt(ps) || 20);
      const empresaId = emp != null ? toInt(emp) : undefined;
      const localidadId = loc != null ? toInt(loc) : undefined;

      const estadoStr = typeof e === 'string' ? e.toUpperCase() : undefined;
      const estado: EstadoFiltro | undefined =
        (['ABIERTO', 'CERRADO', 'RESUELTO', 'PASADOS'] as const).includes(estadoStr as any)
          ? (estadoStr as EstadoFiltro)
          : undefined;

      if (empresaId && localidadId) {
        const r = await IncidenteModel.obtenerIncidentesPorEmpresaYLocalidad(empresaId, localidadId, page, pageSize);
        return res.json({ success: true, data: jsonSafe(r.data), meta: jsonSafe(r.meta) });
      }
      if (empresaId && !localidadId) {
        const r = await IncidenteModel.obtenerIncidentesPorEmpresa(empresaId, page, pageSize);
        return res.json({ success: true, data: jsonSafe(r.data), meta: jsonSafe(r.meta) });
      }
      if (!empresaId && localidadId) {
        const r = await IncidenteModel.obtenerIncidentesPorLocalidad(localidadId, page, pageSize);
        return res.json({ success: true, data: jsonSafe(r.data), meta: jsonSafe(r.meta) });
      }

      if (estado === 'RESUELTO' || estado === 'PASADOS') {
        const r = await listarIncidentesPaginados({ page, estado });
        return res.json({ success: true, data: jsonSafe(r.data), meta: jsonSafe(r.meta) });
      }

      const estadoSimple = estado === 'ABIERTO' || estado === 'CERRADO' ? estado : undefined;
      const r = await IncidenteModel.obtenerIncidentesPaginados(page, pageSize, estadoSimple);
      return res.json({ success: true, data: jsonSafe(r.data), meta: jsonSafe(r.meta) });
    } catch (error) {
      incidenteControllerLogger.error('listar', { error, query: req.query });
      return res.status(500).json({ success: false, error: 'Error al listar incidentes' });
    }
  };

  /**
   * GET /incidentes/:id
   */
  static obtenerPorId: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (!isValidId(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const incidente = await IncidenteModel.obtenerIncidentePorId(id);
      return res.json({ success: true, data: jsonSafe(incidente) });
    } catch (error) {
      incidenteControllerLogger.error('obtenerPorId', { id: req.params.id, error });
      const errorMsg = error instanceof Error ? error.message : String(error);
      const status = /no (se )?encontr|no existe/i.test(errorMsg) ? 404 : 500;
      return res.status(status).json({ success: false, error: errorMsg });
    }
  };

  /**
   * POST /incidentes
   * Crea un nuevo incidente (opcionalmente con imágenes)
   *
   * ✅ Cambios clave:
   * - Observa finish/close para detectar cortes de conexión en prod.
   * - Respuesta mínima (solo id) para evitar BigInt/payload enorme.
   */
  static crear: RequestHandler = async (req, res) => {
    const t0 = Date.now();
    res.on('finish', () =>
      incidenteControllerLogger.info('crear.finish', { ms: Date.now() - t0, status: res.statusCode })
    );
    res.on('close', () =>
      incidenteControllerLogger.warn('crear.close', { ms: Date.now() - t0, status: res.statusCode })
    );

    try {
      const { descripcion, movimientoId, usuarioId } = req.body;

      const movId = toInt(movimientoId);
      const usrId = toInt(usuarioId);

      if (!descripcion || !isValidId(movId) || !isValidId(usrId)) {
        return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
      }

      const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
      const buffers = files.map((f) => f.buffer);

      const nuevo = await IncidenteModel.crearIncidente({
        descripcion: String(descripcion).trim(),
        movimientoId: movId,
        usuarioId: usrId,
        imagenes: buffers.length ? buffers : undefined,
      });

      // ✅ Respuesta mínima y JSON-safe
      const id =
        (nuevo as any)?.id ??
        (nuevo as any)?.data?.id ??
        (nuevo as any)?.incidente?.id ??
        null;

      if (!id) {
        incidenteControllerLogger.warn('crear.respuesta_sin_id', { ms: Date.now() - t0 });
        return res.status(201).json({ success: true, data: jsonSafe(nuevo) }); // fallback
      }

      return res.status(201).json({ success: true, data: { id: typeof id === 'bigint' ? id.toString() : id } });
    } catch (error) {
      incidenteControllerLogger.error('crear', { ms: Date.now() - t0, body: req.body, error });
      return res.status(500).json({ success: false, error: 'Error al crear incidente' });
    }
  };

  /**
   * PUT /incidentes/:id
   */
  static editar: RequestHandler = async (req, res) => {
    const t0 = Date.now();
    res.on('finish', () =>
      incidenteControllerLogger.info('editar.finish', { ms: Date.now() - t0, status: res.statusCode })
    );
    res.on('close', () =>
      incidenteControllerLogger.warn('editar.close', { ms: Date.now() - t0, status: res.statusCode })
    );

    try {
      const id = toInt(req.params.id);
      if (!isValidId(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      const { descripcion, estado } = req.body as { descripcion?: string; estado?: string };

      if (estado && !['ABIERTO', 'CERRADO', 'RESUELTO'].includes(estado.toUpperCase())) {
        return res.status(400).json({ success: false, error: 'Estado inválido (use ABIERTO, CERRADO o RESUELTO)' });
      }

      const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
      const buffers = files.map((f) => f.buffer);

      const actualizado = await IncidenteModel.editarIncidente(id, {
        descripcion: descripcion?.trim(),
        estado: estado ? (estado.toUpperCase() as 'ABIERTO' | 'CERRADO' | 'RESUELTO') : undefined,
        imagenes: buffers.length ? buffers : undefined,
      });

      // ✅ Respuesta mínima (evita payload gigante)
      const outId =
        (actualizado as any)?.id ??
        (actualizado as any)?.data?.id ??
        id;

      return res.json({ success: true, data: { id: typeof outId === 'bigint' ? outId.toString() : outId } });
    } catch (error) {
      incidenteControllerLogger.error('editar', { id: req.params.id, error });
      return res.status(500).json({ success: false, error: 'Error al editar incidente' });
    }
  };

  /**
   * DELETE /incidentes/:id
   */
  static eliminar: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (!isValidId(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const eliminado = await IncidenteModel.eliminarIncidente(id);
      return res.json({ success: true, data: jsonSafe(eliminado) });
    } catch (error) {
      incidenteControllerLogger.error('eliminar', { id: req.params.id, error });
      return res.status(500).json({ success: false, error: 'Error al eliminar incidente' });
    }
  };

  /**
   * GET /incidentes/:id/verificacion
   */
  static verificarPeriodo: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (!isValidId(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const info = await IncidenteModel.verificarPeriodoVerificacion(id);
      return res.json({ success: true, data: jsonSafe(info) });
    } catch (error) {
      incidenteControllerLogger.error('verificarPeriodo', { id: req.params.id, error });
      return res.status(500).json({ success: false, error: 'Error al verificar periodo' });
    }
  };

  /**
   * POST /incidentes/:id/cerrar
   */
  static cerrar: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (!isValidId(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const cerrado = await IncidenteModel.editarIncidente(id, { estado: 'CERRADO' });
      return res.json({ success: true, data: jsonSafe(cerrado) });
    } catch (error) {
      incidenteControllerLogger.error('cerrar', { id: req.params.id, error });
      return res.status(500).json({ success: false, error: 'Error al cerrar incidente' });
    }
  };

  /**
   * POST /incidentes/:id/continuar
   */
  static continuar: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      const { comentario } = req.body as { comentario?: string };
      if (!isValidId(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }
      const inc = await IncidenteModel.continuarMovimiento(id, (comentario ?? '').toString());
      return res.json({ success: true, data: jsonSafe(inc) });
    } catch (error: any) {
      incidenteControllerLogger.error('continuar', { id: req.params.id, error });
      const msg = error instanceof Error ? error.message : 'Error al continuar movimiento';
      return res.status(/ya cerrado/i.test(msg) ? 409 : 500).json({ success: false, error: msg });
    }
  };

  /**
   * POST /incidentes/cerrar-vencidos
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
   * o GET /incidentes/imagen/:ruta
   */
  static servirImagen: RequestHandler = async (req, res) => {
    try {
      const rutaParam = (req.query.ruta as string) ?? (req.params.ruta as string) ?? '';
      if (!rutaParam) return res.status(400).json({ success: false, error: 'Ruta requerida' });

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
   */
  static resolver: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (!isValidId(id)) {
        return res.status(400).json({ success: false, error: 'ID inválido' });
      }

      const actualizado = await IncidenteModel.editarIncidente(id, { estado: 'RESUELTO' });
      return res.json({ success: true, data: jsonSafe(actualizado) });
    } catch (error: any) {
      incidenteControllerLogger.error('resolver', { id: req.params.id, error });
      return res.status(500).json({ success: false, error: 'Error al resolver incidente' });
    }
  };
}

