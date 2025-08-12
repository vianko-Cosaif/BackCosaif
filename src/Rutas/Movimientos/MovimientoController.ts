// src/Rutas/Movimientos/MovimientoController.ts
import { RequestHandler } from 'express';
import { EstadoMovimiento, Prioridad } from '@prisma/client';
import { MovimientoModel } from '../../models/Movimientos/movimientosModel';
import { movimientoControllerLogger as log } from './movimiento.controller.logger';
import { NotificadorFCM } from '../../services/NotificadorFCM';

export class MovimientoController {
  // GET /movimientos
  static obtenerMovimientos: RequestHandler = async (_req, res) => {
    try {
      const movimientos = await MovimientoModel.obtenerMovimientos();
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos', { error });
      res.status(500).json({ message: 'Error al obtener movimientos' });
    }
  };

  // POST /movimientos
  static nuevoMovimiento: RequestHandler = async (req, res) => {
    try {
      const data = { ...req.body };

      // Normalización ligera (el modelo también sanea)
      data.prioridad ??= 'BAJA';
      data.estado ??= 'SOLICITADO';
      data.posicionCabina ??= 'Sin_Solicitar';
      data.posicionChimenea ??= 'Sin_Solicitar';
      data.direccionEmpuje ??= 'Sin_Solicitar';

      // Validaciones mínimas
      if (!data.empresaId || !data.creadoPorId || !data.localidadId || !data.viaOrigenId || !data.locomotiveNumber) {
        return res.status(400).json({ message: 'Faltan campos obligatorios.' });
      }
      if (data.prioridad && !['ALTA', 'BAJA'].includes(data.prioridad)) {
        return res.status(400).json({ message: 'prioridad inválida (ALTA|BAJA)' });
      }
      if (data.numeroSeccion != null && Number.isNaN(Number(data.numeroSeccion))) {
        return res.status(400).json({ message: 'numeroSeccion debe ser numérico' });
      }

      const movimiento = await MovimientoModel.nuevoMovimiento(data);

      try {
        await NotificadorFCM.notificarNuevoMovimiento(movimiento);
      } catch (e) {
        log.warn('No se pudo notificar por FCM', { error: e, movimientoId: movimiento?.id });
      }

      res.status(201).json({ message: 'Movimiento creado exitosamente', movimiento });
    } catch (error: any) {
      log.error('Error al crear movimiento', { error, body: req.body });
      res.status(500).json({ message: 'Error al crear movimiento', details: error?.message });
    }
  };

  // PUT /movimientos/:id
  static editarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });

    try {
      const movimiento = await MovimientoModel.editarMovimiento(id, req.body ?? {});
      res.status(200).json({ message: 'Movimiento actualizado', movimiento });
    } catch (error) {
      log.error('Error al editar movimiento', { id, body: req.body, error });
      res.status(500).json({ message: 'Error al editar movimiento' });
    }
  };

  // PATCH /movimientos/:id/prioridad
  static cambiarPrioridad: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { prioridad } = req.body as { prioridad: Prioridad };

    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID de movimiento inválido' });
    if (!Object.values(Prioridad).includes(prioridad)) {
      return res.status(400).json({ message: 'Valor de prioridad inválido. Debe ser "ALTA" o "BAJA"' });
    }

    try {
      const movimientos = await MovimientoModel.obtenerMovimientos();
      const original = movimientos.find(m => m.id === id);
      if (!original) return res.status(404).json({ message: 'Movimiento no encontrado' });

      if (original.prioridad === prioridad) {
        return res.status(200).json({ message: `El movimiento ya tiene prioridad ${prioridad}`, movimiento: original });
      }

      if (prioridad === 'ALTA') {
        log.info('Cambiando movimiento a ALTA prioridad', {
          id,
          estadoOriginal: original.estado,
          localidadId: original.localidadId,
        });
      }

      const movimiento = await MovimientoModel.cambiarPrioridad(id, prioridad);
      const message =
        prioridad === 'ALTA' && original.estado === 'SOLICITADO'
          ? 'Prioridad actualizada a ALTA. Se reorganizaron todas las rondas.'
          : `Prioridad actualizada a ${prioridad}`;

      res.status(200).json({ message, movimiento, prioridadAnterior: original.prioridad, prioridadNueva: prioridad });
    } catch (error) {
      log.error('Error al cambiar prioridad del movimiento', { error, id, prioridad });
      res.status(500).json({ message: 'Error al cambiar prioridad del movimiento' });
    }
  };

  // PATCH /movimientos/:id/cancelar
  static cancelarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { razon, usuarioId } = req.body ?? {};
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });
    if (!razon || typeof razon !== 'string') return res.status(400).json({ message: 'Debe indicar la razón' });

    try {
      const movimiento = await MovimientoModel.cancelarMovimiento(id, razon, usuarioId);
      res.status(200).json({ message: 'Movimiento cancelado', movimiento });
    } catch (error) {
      log.error('Error al cancelar movimiento', { id, razon, usuarioId, error });
      res.status(500).json({ message: 'Error al cancelar movimiento' });
    }
  };

  // DELETE /movimientos/:id
  static eliminarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });

    try {
      const eliminado = await MovimientoModel.eliminarMovimiento(id);
      res.status(200).json({ message: 'Movimiento eliminado correctamente', eliminado });
    } catch (error) {
      log.error('Error al eliminar movimiento', { error, id });
      res.status(500).json({ message: 'Error al eliminar movimiento' });
    }
  };

  // GET /movimientos/pendientes
  static obtenerMovimientosPendientes: RequestHandler = async (_req, res) => {
    try {
      const pendientes = await MovimientoModel.obtenerMovimientosPendientes();
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes', { error });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes' });
    }
  };

  // GET /movimientos/empresa/:empresaId/pendientes
  static obtenerMovimientosPendientesPorEmpresa: RequestHandler = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId)) return res.status(400).json({ message: 'ID de empresa inválido' });

    try {
      const pendientes = await MovimientoModel.obtenerMovimientosPendientesPorEmpresa(empresaId);
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes por empresa', { error, empresaId });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes por empresa' });
    }
  };

  // GET /movimientos/all
  static obtenerTodosLosMovimientos: RequestHandler = async (_req, res) => {
    try {
      const movimientos = await MovimientoModel.obtenerTodosLosMovimientos();
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener todos los movimientos', { error });
      res.status(500).json({ message: 'Error al obtener todos los movimientos' });
    }
  };

  // GET /movimientos/empresa/:empresaId
  static obtenerMovimientosPorEmpresa: RequestHandler = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId)) return res.status(400).json({ message: 'ID de empresa inválido' });

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorEmpresa(empresaId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos por empresa', { error, empresaId });
      res.status(500).json({ message: 'Error al obtener movimientos por empresa' });
    }
  };

  // GET /movimientos/localidad/:localidadId/pendientes
  static obtenerMovimientosPendientesPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId)) return res.status(400).json({ message: 'ID de localidad inválido' });

    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPendientesPorLocalidad(localidadId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos pendientes por localidad', { error, localidadId });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes por localidad' });
    }
  };

  // GET /movimientos/localidad/:localidadId/all
  static obtenerTodosMovimientosPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId)) return res.status(400).json({ message: 'ID de localidad inválido' });

    try {
      const movimientos = await MovimientoModel.obtenerTodosMovimientosPorLocalidad(localidadId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener todos los movimientos por localidad', { error, localidadId });
      res.status(500).json({ message: 'Error al obtener todos los movimientos por localidad' });
    }
  };

  // GET /movimientos/localidad/:localidadId/empresa/:empresaId
  static obtenerMovimientosPorLocalidadEmpresa: RequestHandler = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(localidadId) || !Number.isInteger(empresaId)) {
      return res.status(400).json({ message: 'ID de localidad o empresa inválido' });
    }
    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorLocalidadEmpresa(localidadId, empresaId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos por localidad y empresa', { error, localidadId, empresaId });
      res.status(500).json({ message: 'Error al obtener movimientos por localidad y empresa' });
    }
  };

  // GET /movimientos/empresa/:empresaId/localidad/:localidadId
  static obtenerMovimientosPorEmpresaYLocalidad: RequestHandler = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(empresaId) || !Number.isInteger(localidadId)) {
      return res.status(400).json({ message: 'ID de empresa o localidad inválido' });
    }
    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorEmpresaYLocalidad(empresaId, localidadId);
      res.status(200).json(movimientos);
    } catch (error) {
      log.error('Error al obtener movimientos por empresa y localidad', { error, empresaId, localidadId });
      res.status(500).json({ message: 'Error al obtener movimientos por empresa y localidad' });
    }
  };

  // GET /movimientos/empresa/:empresaId/localidad/:localidadId/pendientes
  static obtenerMovimientosNoConcluidosPorEmpresaYLocalidad: RequestHandler = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(empresaId) || !Number.isInteger(localidadId)) {
      return res.status(400).json({ message: 'ID de empresa o localidad inválido' });
    }
    try {
      const pendientes = await MovimientoModel.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId, localidadId);
      res.status(200).json(pendientes);
    } catch (error) {
      log.error('Error al obtener movimientos no concluidos por empresa y localidad', { error, empresaId, localidadId });
      res.status(500).json({ message: 'Error al obtener movimientos no concluidos por empresa y localidad' });
    }
  };

  // GET /movimientos/ronda/:rondaId/info
  static obtenerInfoPorRonda: RequestHandler = async (req, res) => {
    const rondaId = Number(req.params.rondaId);
    if (!Number.isInteger(rondaId)) return res.status(400).json({ message: 'ID de ronda inválido' });

    try {
      const info = await MovimientoModel.obtenerInfoPorRonda(rondaId);
      res.status(200).json(info);
    } catch (error) {
      log.error('Error al obtener info de ronda', { error, rondaId });
      res.status(500).json({ message: 'Error al obtener info de ronda' });
    }
  };

  // PATCH /movimientos/:id/iniciar
  static iniciarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const { operadorId } = req.body;

    if (!Number.isInteger(id) || typeof operadorId !== 'number') {
      return res.status(400).json({ message: 'Datos inválidos: id o operadorId faltante o incorrecto' });
    }

    try {
      const movimiento = await MovimientoModel.iniciarMovimiento(id, operadorId);
      res.status(200).json({ message: 'Movimiento iniciado', movimiento });
    } catch (error) {
      log.error('Error al iniciar movimiento', { id, operadorId, error });
      res.status(500).json({ message: 'Error al iniciar movimiento' });
    }
  };

  // PATCH /movimientos/:id/pausar
  static pausarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });

    try {
      const movimiento = await MovimientoModel.pausarMovimiento(id);
      res.status(200).json({ message: 'Movimiento pausado', movimiento });
    } catch (error) {
      log.error('Error al pausar movimiento', { id, error });
      res.status(500).json({ message: 'Error al pausar movimiento' });
    }
  };

  // PATCH /movimientos/:id/reanudar
  static reanudarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });

    try {
      const movimiento = await MovimientoModel.reanudarMovimiento(id);
      res.status(200).json({ message: 'Movimiento reanudado', movimiento });
    } catch (error) {
      log.error('Error al reanudar movimiento', { id, error });
      res.status(500).json({ message: 'Error al reanudar movimiento' });
    }
  };

  // PATCH /movimientos/:id/finalizar
  static finalizarMovimiento: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });

    try {
      const movimiento = await MovimientoModel.finalizarMovimiento(id);
      res.status(200).json({ message: 'Movimiento finalizado', movimiento });
    } catch (error) {
      log.error('Error al finalizar movimiento', { id, error });
      res.status(500).json({ message: 'Error al finalizar movimiento' });
    }
  };

  // PATCH /movimientos/:id/estado
  static cambiarEstado: RequestHandler = async (req, res) => {
    const id = Number(req.params.id);
    const estado = req.body?.estado as EstadoMovimiento | undefined;
    const operadorId = typeof req.body?.operadorId === 'number' ? req.body.operadorId : undefined;
    const razon = typeof req.body?.razon === 'string' ? req.body.razon : undefined;
    const forzar = !!req.body?.forzar;

    if (!Number.isInteger(id)) return res.status(400).json({ message: 'ID inválido' });
    if (!estado || !Object.values(EstadoMovimiento).includes(estado)) {
      return res.status(400).json({ message: 'Debe indicar un estado válido' });
    }

    try {
      const movimiento = await MovimientoModel.cambiarEstadoMovimiento(id, estado, {
        operadorId,
        razon,
        forzar,
      });
      res.status(200).json({ message: `Movimiento → ${estado}`, movimiento });
    } catch (error) {
      log.error('Error al cambiar estado de movimiento', { id, estado, error });
      res.status(500).json({ message: 'Error al cambiar estado de movimiento' });
    }
  };
}
