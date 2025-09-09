// src/controllers/Servicios/LavadoTController.ts
import { Request, Response, RequestHandler } from 'express';
import { ServicioEstado } from '@prisma/client';

import { LavadoTModel } from '../../models/Servicios/LavadoTModel';
import { lavadoTControllerLogger } from './lavadoT.controller.logger';

// ---------- helpers ----------
function toInt(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}
function parseFecha(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(String(v));
  return isNaN(+d) ? undefined : d;
}
function parseStatusQuery(q: unknown): ServicioEstado | 'PENDIENTES' | undefined {
  const s = typeof q === 'string' ? q.toUpperCase() : undefined;
  if (!s) return undefined;
  if (s === 'PENDIENTES') return 'PENDIENTES';
  return (Object.values(ServicioEstado) as string[]).includes(s) ? (s as ServicioEstado) : undefined;
}
const bad = (res: Response, error: string, code = 400) => res.status(code).json({ error });

// ---------- Controller ----------
/**
 * Endpoints sugeridos:
 *  - POST   /lavado                     -> crear
 *  - PUT    /lavado/:id                 -> editar
 *  - GET    /lavado/:id                 -> obtener
 *  - GET    /lavado                     -> listar paginado (?status=EN_SERVICIO|FINALIZADO|DETENIDO|PENDIENTES&empresaId&localidadId&movimientoId&page&pageSize)
 *  - GET    /lavado/en-servicio         -> listar EN_SERVICIO (con filtros)
 *  - GET    /lavado/siguientes          -> siguientes para iniciar (?empresaId&localidadId&limit=2)
 *  - POST   /lavado/:id/iniciar         -> iniciar { usuarioId?, inicio? }
 *  - POST   /lavado/:id/finalizar       -> finalizar { fin? }
 *  - GET    /lavado/no-en-proceso       -> compat: pendientes (no EN_SERVICIO ni FINALIZADO)
 */
export class LavadoTController {
  /** POST /lavado */
  static crear: RequestHandler = async (req, res) => {
    try {
      const movimientoId = toInt(req.body?.movimientoId);
      const status = req.body?.status as ServicioEstado | undefined;
      const inicio = parseFecha(req.body?.inicio);
      const fin = parseFecha(req.body?.fin);

      if (movimientoId === undefined) return bad(res, 'movimientoId es obligatorio y numérico');
      if (status !== undefined && !Object.values(ServicioEstado).includes(status))
        return bad(res, `status inválido. Valores: ${Object.values(ServicioEstado).join(', ')}`);
      if (req.body?.inicio !== undefined && inicio === undefined) return bad(res, 'inicio no es una fecha válida (ISO o null)');
      if (req.body?.fin !== undefined && fin === undefined) return bad(res, 'fin no es una fecha válida (ISO o null)');

      const creado = await LavadoTModel.crear({ movimientoId, status, inicio: inicio ?? null, fin: fin ?? null });
      return res.status(201).json(creado);
    } catch (error) {
      lavadoTControllerLogger.error('Error al crear LavadoT', { error });
      return bad(res, 'Error al crear registro de lavado', 500);
    }
  };

  /** PUT /lavado/:id */
  static editar: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (id === undefined) return bad(res, 'ID inválido');

      const status = req.body?.status as ServicioEstado | undefined;
      const inicio = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'inicio') ? parseFecha(req.body?.inicio) : undefined;
      const fin = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'fin') ? parseFecha(req.body?.fin) : undefined;

      if (status !== undefined && !Object.values(ServicioEstado).includes(status))
        return bad(res, `status inválido. Valores: ${Object.values(ServicioEstado).join(', ')}`);
      if (inicio === undefined && Object.prototype.hasOwnProperty.call(req.body ?? {}, 'inicio'))
        return bad(res, 'inicio no es una fecha válida (use ISO o null)');
      if (fin === undefined && Object.prototype.hasOwnProperty.call(req.body ?? {}, 'fin'))
        return bad(res, 'fin no es una fecha válida (use ISO o null)');

      const actualizado = await LavadoTModel.editar(id, { status, inicio, fin });
      return res.json(actualizado);
    } catch (error) {
      lavadoTControllerLogger.error('Error al editar LavadoT', { error });
      return bad(res, 'Error al editar registro de lavado', 500);
    }
  };

  /** GET /lavado/:id */
  static obtener: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (id === undefined) return bad(res, 'ID inválido');
      const row = await LavadoTModel.obtener(id);
      return res.json(row);
    } catch (error) {
      lavadoTControllerLogger.error('Error al obtener LavadoT', { error });
      return bad(res, 'Error al obtener registro de lavado', 500);
    }
  };

  /** GET /lavado  (paginado + filtros + status|PENDIENTES) */
  static listar: RequestHandler = async (req, res) => {
    try {
      const page = toInt(req.query.page) ?? 1;
      const pageSize = toInt(req.query.pageSize) ?? 20;
      const empresaId = toInt(req.query.empresaId);
      const localidadId = toInt(req.query.localidadId);
      const movimientoId = toInt(req.query.movimientoId);
      const status = parseStatusQuery(req.query.status);

      const data = await LavadoTModel.listarPaginado({ page, pageSize, empresaId, localidadId, movimientoId, status: status as any });
      return res.json(data);
    } catch (error) {
      lavadoTControllerLogger.error('Error al listar LavadoT', { error });
      return bad(res, 'Error al listar', 500);
    }
  };

  /** GET /lavado/en-servicio  (lista directos EN_SERVICIO) */
  static enServicio: RequestHandler = async (req, res) => {
    try {
      const empresaId = toInt(req.query.empresaId);
      const localidadId = toInt(req.query.localidadId);
      const movimientoId = toInt(req.query.movimientoId);
      const rows = await LavadoTModel.listarEnServicio({ empresaId, localidadId, movimientoId });
      return res.json(rows);
    } catch (error) {
      lavadoTControllerLogger.error('Error al listar EN_SERVICIO', { error });
      return bad(res, 'Error al listar EN_SERVICIO', 500);
    }
  };

  /** GET /lavado/siguientes?empresaId&localidadId&limit=2  (siguientes para iniciar) */
  static siguientes: RequestHandler = async (req, res) => {
    try {
      const empresaId = toInt(req.query.empresaId);
      const localidadId = toInt(req.query.localidadId);
      const limitRaw = toInt(req.query.limit);
      const limit = limitRaw ? Math.min(10, Math.max(1, limitRaw)) : undefined;
      const rows = await LavadoTModel.siguientesParaIniciar({ empresaId, localidadId, limit });
      return res.json(rows);
    } catch (error) {
      lavadoTControllerLogger.error('Error en siguientesParaIniciar', { error });
      return bad(res, 'Error al obtener siguientes', 500);
    }
  };

  /** POST /lavado/:id/iniciar  body: { usuarioId?, inicio? } */
  static iniciar: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (id === undefined) return bad(res, 'ID inválido');

      const usuarioId = toInt(req.body?.usuarioId);
      const inicio = parseFecha(req.body?.inicio);
      if (req.body?.inicio !== undefined && inicio === undefined) return bad(res, 'inicio no es una fecha válida (ISO o null)');

      const row = await LavadoTModel.iniciar(id, usuarioId, inicio ?? undefined);
      return res.json(row);
    } catch (error) {
      lavadoTControllerLogger.error('Error al iniciar LavadoT', { error });
      return bad(res, 'Error al iniciar', 500);
    }
  };

  /** POST /lavado/:id/finalizar  body: { fin? } */
  static finalizar: RequestHandler = async (req, res) => {
    try {
      const id = toInt(req.params.id);
      if (id === undefined) return bad(res, 'ID inválido');

      const fin = parseFecha(req.body?.fin);
      if (req.body?.fin !== undefined && fin === undefined) return bad(res, 'fin no es una fecha válida (ISO o null)');

      const row = await LavadoTModel.finalizar(id, fin ?? undefined);
      return res.json(row);
    } catch (error) {
      lavadoTControllerLogger.error('Error al finalizar LavadoT', { error });
      return bad(res, 'Error al finalizar', 500);
    }
  };

  /** GET /lavado/no-en-proceso  (compat) */
  static listarNoEnProceso: RequestHandler = async (req, res) => {
    try {
      const empresaId = toInt(req.query.empresaId);
      const localidadId = toInt(req.query.localidadId);
      const movimientoId = toInt(req.query.movimientoId);

      const rows = await LavadoTModel.listarNoEnProceso({ empresaId, localidadId, movimientoId });
      return res.json(rows);
    } catch (error) {
      lavadoTControllerLogger.error('Error al listar LavadoT no en proceso', { error });
      return bad(res, 'Error al listar lavados pendientes', 500);
    }
  };
}
