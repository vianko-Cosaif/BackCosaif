import { Request, Response, RequestHandler } from 'express';
import { MovimientoModel } from '../../models/Movimientos/movimientosModel';
import { movimientoControllerLogger } from './movimiento.controller.logger';
import { RondaModel } from '../../models/Movimientos/Ronda/RondaModel';
import { NotificadorFCM } from '../../services/NotificadorFCM';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class MovimientoController {
  /**
   * GET /movimientos
   * Obtiene todos los movimientos.
   */
  static obtenerMovimientos: RequestHandler = async (_req, res) => {
    try {
      const movimientos = await MovimientoModel.obtenerMovimientos();
      res.status(200).json(movimientos);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener movimientos', { error });
      res.status(500).json({ message: 'Error al obtener movimientos', details: error });
    }
  };

  /**
   * POST /movimientos
   * Crea un nuevo movimiento y genera su ronda asociada según su prioridad.
   * Si el movimiento tiene prioridad ALTA, reorganizará todas las rondas existentes.
   */

  /**
 * POST /movimientos
 * Crea un movimiento y genera la ronda; luego notifica por FCM.
 */
static  nuevoMovimiento: RequestHandler = async (req, res) => {
  try {
    const data = req.body;
    
    const movimientoData: any = { ...data };

    // ?? Normalizar campos vac os
    movimientoData.posicionCabina   ||= 'Sin_Solicitar';
    movimientoData.posicionChimenea ||= 'Sin_Solicitar';
    movimientoData.direccionEmpuje  ||= 'Sin_Solicitar';

    // Valores predeterminados
    movimientoData.prioridad ||= 'BAJA';
    movimientoData.estado    ||= 'SOLICITADO';

    // Eliminar undefined
    for (const k in movimientoData) if (movimientoData[k] === undefined) delete movimientoData[k];

    // ?? Crear Movimiento (incluyendo empresa + creadoPor)
    const nuevoMovimiento = await prisma.movimiento.create({
      data: movimientoData,
      include: {
        empresa: true,
        localidad: true,
        creadoPor: true,          // ?? necesario para el mensaje
      },
    });

    // ?? Generar Ronda
    if (nuevoMovimiento.estado === 'SOLICITADO') {
      await RondaModel.generarRondaParaMovimiento({
        movimientoId: nuevoMovimiento.id,
        empresaId: nuevoMovimiento.empresaId,
        localidadId: nuevoMovimiento.localidadId,
        prioridad: nuevoMovimiento.prioridad as 'ALTA' | 'BAJA',
      });

      if (nuevoMovimiento.prioridad === 'ALTA') {
       console.log("error")      }
    }

    // ?? Notificar por FCM
    await NotificadorFCM.notificarNuevoMovimiento(nuevoMovimiento);

    res.status(201).json({ 
      message: 'Movimiento creado exitosamente', 
      movimiento: nuevoMovimiento 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear movimiento', details: error });
  }
};
  /**
   * PATCH /movimientos/:id/prioridad
   * Cambia la prioridad de un movimiento y reorganiza las rondas si es necesario.
   */
  static cambiarPrioridad: RequestHandler = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { prioridad } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ message: 'ID de movimiento inválido' });
      return;
    }

    if (prioridad !== 'ALTA' && prioridad !== 'BAJA') {
      res.status(400).json({ message: 'Valor de prioridad inválido. Debe ser "ALTA" o "BAJA"' });
      return;
    }

    try {
      // Obtener el movimiento actual (ya que obtenerMovimientoPorId aún no está implementado)
      const movimientos = await MovimientoModel.obtenerMovimientos();
      const movimientoOriginal = movimientos.find(m => m.id === id);
      
      if (!movimientoOriginal) {
        res.status(404).json({ message: 'Movimiento no encontrado' });
        return;
      }
      
      // Si ya tiene la misma prioridad, evitar operación innecesaria
      if (movimientoOriginal.prioridad === prioridad) {
        res.status(200).json({ 
          message: `El movimiento ya tiene prioridad ${prioridad}`, 
          movimiento: movimientoOriginal 
        });
        return;
      }
      
      // Registrar evento de cambio a alta prioridad
      if (prioridad === 'ALTA') {
        movimientoControllerLogger.info('Cambiando movimiento a ALTA prioridad', { 
          id, 
          estadoOriginal: movimientoOriginal.estado,
          localidadId: movimientoOriginal.localidadId
        });
      }

      // Cambiar prioridad y reorganizar rondas si es necesario
      const movimientoActualizado = await MovimientoModel.cambiarPrioridad(id, prioridad);

      let message = `Prioridad actualizada a ${prioridad}`;
      if (prioridad === 'ALTA' && movimientoOriginal.estado === 'SOLICITADO') {
        message = 'Prioridad actualizada a ALTA. Se reorganizaron todas las rondas.';
      }

      res.status(200).json({ 
        message,
        movimiento: movimientoActualizado,
        prioridadAnterior: movimientoOriginal.prioridad,
        prioridadNueva: prioridad
      });
    } catch (error) {
      movimientoControllerLogger.error('Error al cambiar prioridad del movimiento', { error, id, prioridad });
      res.status(500).json({ message: 'Error al cambiar prioridad del movimiento', details: error });
    }
  };

  /**
   * DELETE /movimientos/:id
   * Elimina un movimiento por su ID.
   */
  static eliminarMovimiento: RequestHandler = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }
    try {
      const eliminado = await MovimientoModel.eliminarMovimiento(id);
      res.status(200).json({ message: 'Movimiento eliminado correctamente', eliminado });
    } catch (error) {
      movimientoControllerLogger.error('Error al eliminar movimiento', { error, id });
      res.status(500).json({ message: 'Error al eliminar movimiento', details: error });
    }
  };

  /**
   * GET /movimientos/pendientes
   * Obtiene movimientos en estado SOLICITADO, EN_PROCESO o DETENIDO.
   */
  static obtenerMovimientosPendientes: RequestHandler = async (_req, res) => {
    try {
      const pendientes = await MovimientoModel.obtenerMovimientosPendientes();
      res.status(200).json(pendientes);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener movimientos pendientes', { error });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes', details: error });
    }
  };

  /**
   * GET /movimientos/empresa/:empresaId/pendientes
   * Obtiene movimientos pendientes de una empresa.
   */
  static obtenerMovimientosPendientesPorEmpresa: RequestHandler = async (req, res) => {
    const empresaId = parseInt(req.params.empresaId, 10);
    if (isNaN(empresaId)) {
      res.status(400).json({ message: 'ID de empresa inválido' });
      return;
    }
    try {
      const pendientes = await MovimientoModel.obtenerMovimientosPendientesPorEmpresa(empresaId);
      res.status(200).json(pendientes);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener movimientos pendientes por empresa', { error, empresaId });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes por empresa', details: error });
    }
  };

  /**
   * GET /movimientos/all
   * Obtiene todos los movimientos ordenados por fecha.
   */
  static obtenerTodosLosMovimientos: RequestHandler = async (_req, res) => {
    try {
      const movimientos = await MovimientoModel.obtenerTodosLosMovimientos();
      res.status(200).json(movimientos);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener todos los movimientos', { error });
      res.status(500).json({ message: 'Error al obtener todos los movimientos', details: error });
    }
  };

  /**
   * GET /movimientos/empresa/:empresaId
   * Obtiene movimientos de una empresa.
   */
  static obtenerMovimientosPorEmpresa: RequestHandler = async (req, res) => {
    const empresaId = parseInt(req.params.empresaId, 10);
    if (isNaN(empresaId)) {
      res.status(400).json({ message: 'ID de empresa inválido' });
      return;
    }
    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorEmpresa(empresaId);
      res.status(200).json(movimientos);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener movimientos por empresa', { error, empresaId });
      res.status(500).json({ message: 'Error al obtener movimientos por empresa', details: error });
    }
  };

  /**
   * GET /movimientos/localidad/:localidadId/pendientes
   * Obtiene movimientos pendientes por localidad.
   */
  static obtenerMovimientosPendientesPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = parseInt(req.params.localidadId, 10);
    if (isNaN(localidadId)) {
      res.status(400).json({ message: 'ID de localidad inválido' });
      return;
    }
    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPendientesPorLocalidad(localidadId);
      res.status(200).json(movimientos);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener movimientos pendientes por localidad', { error, localidadId });
      res.status(500).json({ message: 'Error al obtener movimientos pendientes por localidad', details: error });
    }
  };


  /**
   * GET /movimientos/localidad/:localidadId/all
   * Obtiene todos los movimientos por localidad.
   */
  static obtenerTodosMovimientosPorLocalidad: RequestHandler = async (req, res) => {
    const localidadId = parseInt(req.params.localidadId, 10);
    if (isNaN(localidadId)) {
      res.status(400).json({ message: 'ID de localidad inválido' });
      return;
    }
    try {
      const movimientos = await MovimientoModel.obtenerTodosMovimientosPorLocalidad(localidadId);
      res.status(200).json(movimientos);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener todos los movimientos por localidad', { error, localidadId });
      res.status(500).json({ message: 'Error al obtener todos los movimientos por localidad', details: error });
    }
  };

  /**
   * GET /movimientos/localidad/:localidadId/empresa/:empresaId
   * Obtiene movimientos por localidad y empresa.
   */
  static obtenerMovimientosPorLocalidadEmpresa: RequestHandler = async (req, res) => {
    const localidadId = parseInt(req.params.localidadId, 10);
    const empresaId = parseInt(req.params.empresaId, 10);
    if (isNaN(localidadId) || isNaN(empresaId)) {
      res.status(400).json({ message: 'ID de localidad o empresa inválido' });
      return;
    }
    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorLocalidadEmpresa(localidadId, empresaId);
      res.status(200).json(movimientos);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener movimientos por localidad y empresa', { error, localidadId, empresaId });
      res.status(500).json({ message: 'Error al obtener movimientos por localidad y empresa', details: error });
    }
  };

  /**
   * GET /movimientos/empresa/:empresaId/localidad/:localidadId
   * Obtiene movimientos de una empresa en una localidad.
   */
  static obtenerMovimientosPorEmpresaYLocalidad: RequestHandler = async (req, res) => {
    const empresaId = parseInt(req.params.empresaId, 10);
    const localidadId = parseInt(req.params.localidadId, 10);
    if (isNaN(empresaId) || isNaN(localidadId)) {
      res.status(400).json({ message: 'ID de empresa o localidad inválido' });
      return;
    }
    try {
      const movimientos = await MovimientoModel.obtenerMovimientosPorEmpresaYLocalidad(empresaId, localidadId);
      res.status(200).json(movimientos);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener movimientos por empresa y localidad', { error, empresaId, localidadId });
      res.status(500).json({ message: 'Error al obtener movimientos por empresa y localidad', details: error });
    }
  };

  /**
   * GET /movimientos/empresa/:empresaId/localidad/:localidadId/pendientes
   * Obtiene movimientos NO concluidos de una empresa en una localidad.
   */
  static obtenerMovimientosNoConcluidosPorEmpresaYLocalidad: RequestHandler = async (req, res) => {
    const empresaId = parseInt(req.params.empresaId, 10);
    const localidadId = parseInt(req.params.localidadId, 10);
    if (isNaN(empresaId) || isNaN(localidadId)) {
      res.status(400).json({ message: 'ID de empresa o localidad inválido' });
      return;
    }
    try {
      const pendientes = await MovimientoModel.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId, localidadId);
      res.status(200).json(pendientes);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener movimientos no concluidos por empresa y localidad', { error, empresaId, localidadId });
      res.status(500).json({ message: 'Error al obtener movimientos no concluidos por empresa y localidad', details: error });
    }
  };

  /**
   * GET /movimientos/ronda/:rondaId/info
   * Obtiene información detallada de una ronda y su movimiento asociado.
   */
  static obtenerInfoPorRonda: RequestHandler = async (req, res) => {
    const rondaId = parseInt(req.params.rondaId, 10);
    if (isNaN(rondaId)) {
      res.status(400).json({ message: 'ID de ronda inválido' });
      return;
    }
    try {
      const info = await MovimientoModel.obtenerInfoPorRonda(rondaId);
      res.status(200).json(info);
    } catch (error) {
      movimientoControllerLogger.error('Error al obtener info de ronda', { error, rondaId });
      res.status(500).json({ message: 'Error al obtener info de ronda', details: error });
    }
  };

  /**
   * PATCH /movimientos/:id/iniciar
   * Cambia el estado del movimiento a EN_PROCESO y asigna fechaInicio actual.
   */
  static iniciarMovimiento: RequestHandler = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { operadorId } = req.body;

    if (isNaN(id) || typeof operadorId !== 'number') {
      res.status(400).json({ message: 'Datos inválidos: id o operadorId faltante o incorrecto' });
      return;
    }

    try {
      const movimiento = await MovimientoModel.iniciarMovimiento(id, operadorId);
      res.status(200).json({ message: 'Movimiento iniciado', movimiento });
    } catch (error) {
      movimientoControllerLogger.error('Error al iniciar movimiento', { id, operadorId, error });
      res.status(500).json({ message: 'Error al iniciar movimiento', details: error });
    }
  };

  /**
   * PATCH /movimientos/:id/pausar
   * Cambia el estado del movimiento a DETENIDO y asigna fechaPausa actual.
   */
  static pausarMovimiento: RequestHandler = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    try {
      const movimiento = await MovimientoModel.pausarMovimiento(id);
      res.status(200).json({ message: 'Movimiento pausado', movimiento });
    } catch (error) {
      movimientoControllerLogger.error('Error al pausar movimiento', { id, error });
      res.status(500).json({ message: 'Error al pausar movimiento', details: error });
    }
  };

  /**
   * PATCH /movimientos/:id/reanudar
   * Cambia el estado del movimiento a EN_PROCESO nuevamente.
   */
  static reanudarMovimiento: RequestHandler = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    try {
      const movimiento = await MovimientoModel.reanudarMovimiento(id);
      res.status(200).json({ message: 'Movimiento reanudado', movimiento });
    } catch (error) {
      movimientoControllerLogger.error('Error al reanudar movimiento', { id, error });
      res.status(500).json({ message: 'Error al reanudar movimiento', details: error });
    }
  };

/**
 * PATCH /movimientos/:id/finalizar
 * Marca el movimiento como CONCLUIDO y compacta rondas.
 */
static finalizarMovimiento: RequestHandler = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ message: 'ID inv�lido' });
    return;
  }

  try {
    const movimiento = await MovimientoModel.finalizarMovimiento(id);
    res.status(200).json({ message: 'Movimiento finalizado', movimiento });
  } catch (error) {
    movimientoControllerLogger.error('Error al finalizar movimiento', { id, error });
    res.status(500).json({ message: 'Error al finalizar movimiento', details: error });
  }
};
}
