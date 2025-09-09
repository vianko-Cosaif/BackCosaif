// src/controllers/Servicios/TornoTController.ts
import { Request, Response, RequestHandler } from 'express';
import { ServicioEstado } from '@prisma/client';
import { TornoTModel } from '../../models/Servicios/TornoTmodel';
import { tornoTControllerLogger } from './tornoT.controller.logger';

// Helpers
function parseFecha(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(String(v));
  return isNaN(+d) ? undefined : d;
}
function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}
function isServicioEstado(v: any): v is ServicioEstado {
  return Object.values(ServicioEstado).includes(v);
}

export class TornoTController {
  /** POST /torno  body: { movimientoId: number; status?: ServicioEstado; inicio?: ISO|null; fin?: ISO|null } */
  static crear: RequestHandler = async (req, res) => {
    try {
      const { movimientoId, status } = req.body ?? {};
      const inicio = parseFecha(req.body?.inicio);
      const fin = parseFecha(req.body?.fin);

      if (!Number.isInteger(movimientoId)) {
        return res.status(400).json({ error: 'movimientoId es obligatorio y numérico' });
      }
      if (status !== undefined && !isServicioEstado(status)) {
        return res.status(400).json({ error: `status inválido. Valores: ${Object.values(ServicioEstado).join(', ')}` });
      }
      if (req.body?.inicio !== undefined && inicio === undefined) {
        return res.status(400).json({ error: 'inicio no es una fecha válida (ISO o null)' });
      }
      if (req.body?.fin !== undefined && fin === undefined) {
        return res.status(400).json({ error: 'fin no es una fecha válida (ISO o null)' });
      }

      const creado = await TornoTModel.crear({ movimientoId, status, inicio: inicio ?? null, fin: fin ?? null });
      return res.status(201).json(creado);
    } catch (error) {
      tornoTControllerLogger.error('Error al crear TornoT', { error });
      return res.status(500).json({ error: 'Error al crear registro de torno' });
    }
  };

  /** PUT /torno/:id  body: { status?: ServicioEstado; inicio?: ISO|null; fin?: ISO|null } */
  static editar: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

      const { status } = req.body ?? {};
      const inicio = req.body?.hasOwnProperty('inicio') ? parseFecha(req.body.inicio) : undefined;
      const fin = req.body?.hasOwnProperty('fin') ? parseFecha(req.body.fin) : undefined;

      if (status !== undefined && !isServicioEstado(status)) {
        return res.status(400).json({ error: `status inválido. Valores: ${Object.values(ServicioEstado).join(', ')}` });
      }
      if (inicio === undefined && req.body?.hasOwnProperty('inicio')) {
        return res.status(400).json({ error: 'inicio no es una fecha válida (use ISO o null)' });
      }
      if (fin === undefined && req.body?.hasOwnProperty('fin')) {
        return res.status(400).json({ error: 'fin no es una fecha válida (use ISO o null)' });
      }

      const actualizado = await TornoTModel.editar(id, { status, inicio, fin });
      return res.json(actualizado);
    } catch (error) {
      tornoTControllerLogger.error('Error al editar TornoT', { error });
      return res.status(500).json({ error: 'Error al editar registro de torno' });
    }
  };

  /** POST /torno/:id/iniciar  body: { usuarioId?: number; inicio?: ISO|null } */
  static iniciar: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

      const usuarioId = parseNum(req.body?.usuarioId);
      const inicio = parseFecha(req.body?.inicio);
      if (req.body?.usuarioId !== undefined && usuarioId === undefined) {
        return res.status(400).json({ error: 'usuarioId inválido' });
      }
      if (req.body?.inicio !== undefined && inicio === undefined) {
        return res.status(400).json({ error: 'inicio no es una fecha válida (ISO o null)' });
      }

      const row = await TornoTModel.iniciar(id, usuarioId, inicio ?? undefined);
      return res.json(row);
    } catch (error) {
      tornoTControllerLogger.error('Error al iniciar TornoT', { error });
      return res.status(500).json({ error: 'Error al iniciar el torno' });
    }
  };

  /** POST /torno/:id/finalizar  body: { fin?: ISO|null } */
  static finalizar: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });

      const fin = parseFecha(req.body?.fin);
      if (req.body?.fin !== undefined && fin === undefined) {
        return res.status(400).json({ error: 'fin no es una fecha válida (ISO o null)' });
      }

      const row = await TornoTModel.finalizar(id, fin ?? undefined);
      return res.json(row);
    } catch (error) {
      tornoTControllerLogger.error('Error al finalizar TornoT', { error });
      return res.status(500).json({ error: 'Error al finalizar el torno' });
    }
  };

  /** POST /torno/:id/asignar-operador  body: { usuarioId: number } */
  static asignarOperador: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      const usuarioId = Number(req.body?.usuarioId);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
      if (!Number.isInteger(usuarioId)) return res.status(400).json({ error: 'usuarioId inválido' });

      await TornoTModel.asignarOperador(id, usuarioId);
      return res.json({ ok: true });
    } catch (error) {
      tornoTControllerLogger.error('Error al asignar operador a TornoT', { error });
      return res.status(500).json({ error: 'Error al asignar operador' });
    }
  };

  /** GET /torno/en-servicio  → devuelve SOLO UNO (primero por prioridad/antigüedad) */
  static enServicioUno: RequestHandler = async (req, res) => {
    try {
      const empresaId = parseNum(req.query.empresaId);
      const localidadId = parseNum(req.query.localidadId);
      const movimientoId = parseNum(req.query.movimientoId);
      if ([req.query.empresaId, req.query.localidadId, req.query.movimientoId]
          .some(v => v !== undefined && parseNum(v) === undefined)) {
        return res.status(400).json({ error: 'Parámetros numéricos inválidos' });
      }
      const row = await TornoTModel.enServicioUno({ empresaId, localidadId, movimientoId });
      return res.json(row); // puede ser null
    } catch (error) {
      tornoTControllerLogger.error('Error listando TornoT en servicio (uno)', { error });
      return res.status(500).json({ error: 'Error al obtener torno en servicio' });
    }
  };

  /** GET /torno/pendientes  → DETENIDO (no EN_SERVICIO/FINALIZADO) */
  static listarNoEnProceso: RequestHandler = async (req, res) => {
    try {
      const empresaId = parseNum(req.query.empresaId);
      const localidadId = parseNum(req.query.localidadId);
      const movimientoId = parseNum(req.query.movimientoId);
      if ([req.query.empresaId, req.query.localidadId, req.query.movimientoId]
          .some(v => v !== undefined && parseNum(v) === undefined)) {
        return res.status(400).json({ error: 'Parámetros numéricos inválidos' });
      }
      const rows = await TornoTModel.listarNoEnProceso({ empresaId, localidadId, movimientoId });
      return res.json(rows);
    } catch (error) {
      tornoTControllerLogger.error('Error listando TornoT no en proceso', { error });
      return res.status(500).json({ error: 'Error al listar tornos pendientes' });
    }
  };

  /** GET /torno/paginado?status=EN_SERVICIO|FINALIZADO|DETENIDO|PENDIENTES&page=&pageSize=&empresaId=&localidadId=&movimientoId= */
  static listarPaginado: RequestHandler = async (req, res) => {
    try {
      const page = parseNum(req.query.page) ?? 1;
      const pageSize = parseNum(req.query.pageSize) ?? 20;
      const empresaId = parseNum(req.query.empresaId);
      const localidadId = parseNum(req.query.localidadId);
      const movimientoId = parseNum(req.query.movimientoId);
      const statusRaw = req.query.status as string | undefined;

      if (page < 1 || pageSize < 1) return res.status(400).json({ error: 'Paginación inválida' });
      if ([req.query.empresaId, req.query.localidadId, req.query.movimientoId]
          .some(v => v !== undefined && parseNum(v) === undefined)) {
        return res.status(400).json({ error: 'Parámetros numéricos inválidos' });
      }

      let status: ServicioEstado | 'PENDIENTES' | undefined = undefined;
      if (statusRaw) {
        if (statusRaw === 'PENDIENTES') status = 'PENDIENTES';
        else if (isServicioEstado(statusRaw)) status = statusRaw;
        else return res.status(400).json({ error: `status inválido. Use ${Object.values(ServicioEstado).join(', ')} o PENDIENTES` });
      }

      const data = await TornoTModel.listarPaginado({ page, pageSize, empresaId, localidadId, movimientoId, status });
      return res.json(data);
    } catch (error) {
      tornoTControllerLogger.error('Error en paginado TornoT', { error });
      return res.status(500).json({ error: 'Error al listar tornos' });
    }
  };

  /** GET /torno/siguiente  → siguiente para iniciar (SOLO UNO) */
  static siguienteParaIniciar: RequestHandler = async (req, res) => {
    try {
      const empresaId = parseNum(req.query.empresaId);
      const localidadId = parseNum(req.query.localidadId);
      if ([req.query.empresaId, req.query.localidadId]
          .some(v => v !== undefined && parseNum(v) === undefined)) {
        return res.status(400).json({ error: 'Parámetros numéricos inválidos' });
      }
      const row = await TornoTModel.siguienteParaIniciar({ empresaId, localidadId });
      return res.json(row); // puede ser null
    } catch (error) {
      tornoTControllerLogger.error('Error obteniendo siguiente TornoT para iniciar', { error });
      return res.status(500).json({ error: 'Error al obtener siguiente' });
    }
  };

  /** GET /torno/:id */
  static obtener: RequestHandler = async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
      const row = await TornoTModel.obtener(id);
      return res.json(row);
    } catch (error) {
      tornoTControllerLogger.error('Error al obtener TornoT', { error });
      return res.status(500).json({ error: 'Error al obtener registro de torno' });
    }
  };
}
