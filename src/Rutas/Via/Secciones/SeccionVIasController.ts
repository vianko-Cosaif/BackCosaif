// SeccionViaController.ts
import { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  SeccionViaModel,
  NotFoundError,
  ConflictError,
} from '../../../models/Via/Secciones/SeccionViasModel';
import { seccionError } from '../../../models/Via/Secciones/seccion.logger';

const prisma = new PrismaClient();

// Helper: mapear errores de dominio → HTTP
function sendError(res: any, error: any, msg: string) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: msg, details: error.message });
  }
  if (error instanceof ConflictError) {
    return res.status(409).json({ error: msg, details: error.message });
  }
  if (error?.code === 'P2002') {
    return res
      .status(409)
      .json({ error: msg, details: 'Registro duplicado (violación de unique).' });
  }
  return res
    .status(500)
    .json({ error: msg, details: error?.message ?? String(error) });
}

export class SeccionViaController {
  /**
   * GET /secciones?viaId=123
   * Lista las secciones de una vía (query param).
   */
  static obtenerSecciones: RequestHandler = async (req, res) => {
    const viaId = Number(req.query.viaId);
    if (!Number.isInteger(viaId)) {
      return res
        .status(400)
        .json({ error: 'viaId es requerido y debe ser numérico' });
    }
    try {
      const secciones = await SeccionViaModel.obtenerSeccionesPorVia(viaId);
      res.status(200).json(secciones);
    } catch (error: any) {
      seccionError.error('Error al obtener secciones (por viaId)', {
        error,
        viaId,
      });
      sendError(res, error, 'Error al obtener secciones');
    }
  };

  /**
   * GET /secciones/via/:viaId
   * Lista las secciones de una vía (ruta REST explícita).
   */
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

  /**
   * GET /secciones/:id
   * Obtiene una sección por ID.
   */
  static obtenerSeccionPorId: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id inválido' });
    }
    try {
      const sec = await prisma.seccionVia.findUnique({ where: { id } });
      if (!sec) return res.status(404).json({ error: 'Sección no encontrada' });
      res.status(200).json(sec);
    } catch (error: any) {
      seccionError.error('Error al obtener sección por id', { error, id });
      sendError(res, error, 'Error al obtener sección');
    }
  };

  /**
   * GET /secciones/via/:viaId/numero/:numero
   * Obtiene una sección por clave compuesta (viaId, numero).
   */
  static obtenerSeccionPorClave: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const numero = Number(req.params.numero);
    if (!Number.isInteger(viaId) || !Number.isInteger(numero)) {
      return res.status(400).json({ error: 'viaId y numero deben ser numéricos' });
    }
    try {
      const sec = await SeccionViaModel.obtenerSeccion(viaId, numero);
      if (!sec) return res.status(404).json({ error: 'Sección no encontrada' });
      res.status(200).json(sec);
    } catch (error: any) {
      seccionError.error('Error al obtener sección por clave', { error, viaId, numero });
      sendError(res, error, 'Error al obtener sección');
    }
  };

  // ------------------- CRUD de secciones -------------------

  /**
   * POST /secciones
   * body: { viaId: number, nombre?: string, numero?: number }
   * Variante sin param en URL (útil para el front que llama /secciones).
   */
  static crearSeccion: RequestHandler = async (req, res) => {
    const { viaId, nombre, numero } = req.body ?? {};
    if (!Number.isInteger(Number(viaId))) {
      return res.status(400).json({ error: 'viaId es requerido y debe ser numérico' });
    }
    try {
      const creada = await SeccionViaModel.crearSeccion(
        Number(viaId),
        typeof nombre === 'string' ? nombre : undefined,
        Number.isInteger(Number(numero)) ? Number(numero) : undefined
      );
      return res.status(201).json(creada);
    } catch (error: any) {
      seccionError.error('Error al crear sección (POST /secciones)', {
        error, viaId, numero, nombre,
      });
      sendError(res, error, 'Error al crear sección');
    }
  };

  /**
   * POST /secciones/via/:viaId
   * body: { nombre?: string, numero?: number }
   * Alias por si prefieres crear con viaId en la ruta.
   */
  static crearSeccionEnVia: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { nombre, numero } = req.body ?? {};
    if (!Number.isInteger(viaId)) {
      return res.status(400).json({ error: 'viaId inválido' });
    }
    try {
      const creada = await SeccionViaModel.crearSeccion(
        viaId,
        typeof nombre === 'string' ? nombre : undefined,
        Number.isInteger(Number(numero)) ? Number(numero) : undefined
      );
      return res.status(201).json(creada);
    } catch (error: any) {
      seccionError.error('Error al crear sección (POST /secciones/via/:viaId)', {
        error, viaId, numero, nombre,
      });
      sendError(res, error, 'Error al crear sección');
    }
  };

  /**
   * PUT /secciones/:id
   * body: { nombre?: string, numero?: number }
   * Renombra y/o cambia el número de la sección.
   */
  static editarSeccion: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { nombre, numero } = req.body ?? {};
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const data: any = {};
    if (typeof nombre === 'string') data.nombre = nombre.trim() || null;
    if (Number.isInteger(Number(numero))) data.numero = Number(numero);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }

    try {
      const existe = await prisma.seccionVia.findUnique({
        where: { id },
        select: { id: true, viaId: true },
      });
      if (!existe) return res.status(404).json({ error: 'Sección no encontrada' });

      const actualizada = await prisma.seccionVia.update({
        where: { id },
        data,
      });

      // No cambia ocupación, pero si cambia el número mantenemos consistencia general
      // @ts-ignore (método private en la declaración)
      await SeccionViaModel.syncViaFromSections(prisma, existe.viaId);

      return res.status(200).json(actualizada);
    } catch (error: any) {
      seccionError.error('Error al editar sección', { error, id, nombre, numero });
      sendError(res, error, 'Error al editar sección');
    }
  };

  /**
   * DELETE /secciones/:id
   * Elimina la sección y resincroniza la vía.
   */
  static eliminarSeccion: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'id inválido' });
    }
    try {
      const sec = await prisma.seccionVia.findUnique({
        where: { id },
        select: { id: true, viaId: true },
      });
      if (!sec) return res.status(404).json({ error: 'Sección no encontrada' });

      await prisma.seccionVia.delete({ where: { id } });

      // @ts-ignore
      await SeccionViaModel.syncViaFromSections(prisma, sec.viaId);

      return res.status(204).send();
    } catch (error: any) {
      seccionError.error('Error al eliminar sección', { error, id });
      sendError(res, error, 'Error al eliminar sección');
    }
  };

  // ------------------- Ocupación de secciones -------------------

  /**
   * POST /secciones/via/:viaId/asignar
   * body: { numero: number, movimientoId: number }
   */
  static asignarMovimiento: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { numero, movimientoId } = req.body ?? {};
    if (
      !Number.isInteger(viaId) ||
      !Number.isInteger(Number(numero)) ||
      !Number.isInteger(Number(movimientoId))
    ) {
      return res.status(400).json({
        error: 'viaId, numero y movimientoId deben ser numéricos',
      });
    }
    try {
      const seccion = await SeccionViaModel.asignarMovimientoASeccion(
        viaId,
        Number(numero),
        Number(movimientoId)
      );
      res.status(200).json(seccion);
    } catch (error: any) {
      seccionError.error('Error al asignar movimiento a sección', {
        error,
        viaId,
        numero,
        movimientoId,
      });
      sendError(res, error, 'Error al asignar movimiento a sección');
    }
  };

  /**
   * POST /secciones/via/:viaId/liberar
   * body: { numero: number, movimientoId: number }
   */
  static liberarSeccion: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { numero, movimientoId } = req.body ?? {};
    if (
      !Number.isInteger(viaId) ||
      !Number.isInteger(Number(numero)) ||
      !Number.isInteger(Number(movimientoId))
    ) {
      return res.status(400).json({
        error: 'viaId, numero y movimientoId deben ser numéricos',
      });
    }
    try {
      const seccion = await SeccionViaModel.liberarSeccion(
        viaId,
        Number(numero),
        Number(movimientoId)
      );
      res.status(200).json(seccion);
    } catch (error: any) {
      seccionError.error('Error al liberar sección', {
        error,
        viaId,
        numero,
        movimientoId,
      });
      sendError(res, error, 'Error al liberar sección');
    }
  };

  /**
   * POST /secciones/via/:viaId/liberar-todas
   * body: { movimientoId: number }
   * Libera TODAS las secciones de la vía ocupadas por ese movimiento.
   */
  static liberarTodasPorMovimiento: RequestHandler = async (req, res) => {
    const viaId = Number(req.params.viaId);
    const { movimientoId } = req.body ?? {};
    if (!Number.isInteger(viaId) || !Number.isInteger(Number(movimientoId))) {
      return res
        .status(400)
        .json({ error: 'viaId y movimientoId deben ser numéricos' });
    }
    try {
      const via = await SeccionViaModel.liberarMovimientoDeSeccion(
        viaId,
        Number(movimientoId)
      );
      res.status(200).json(via);
    } catch (error: any) {
      seccionError.error('Error al liberar todas las secciones del movimiento', {
        error,
        viaId,
        movimientoId,
      });
      sendError(res, error, 'Error al liberar secciones del movimiento');
    }
  };
}
