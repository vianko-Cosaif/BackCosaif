"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovimientoController = void 0;
const movimientosModel_1 = require("../../models/Movimientos/movimientosModel");
const movimiento_controller_logger_1 = require("./movimiento.controller.logger");
const NotificadorFCM_1 = require("../../services/NotificadorFCM");
class MovimientoController {
}
exports.MovimientoController = MovimientoController;
_a = MovimientoController;
/**
 * GET /movimientos
 */
MovimientoController.obtenerMovimientos = async (_req, res) => {
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientos();
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos', { error });
        res.status(500).json({ message: 'Error al obtener movimientos' });
    }
};
/**
 * POST /movimientos
 * Crea un movimiento (el modelo intentará ocupar vía/sección y generar la ronda).
 * Acepta opcionalmente `numeroSeccion`.
 */
MovimientoController.nuevoMovimiento = async (req, res) => {
    try {
        const data = { ...req.body };
        // Normalización (el modelo también lo hace, pero aquí evitamos basura)
        data.prioridad ?? (data.prioridad = 'BAJA');
        data.estado ?? (data.estado = 'SOLICITADO');
        data.posicionCabina ?? (data.posicionCabina = 'Sin_Solicitar');
        data.posicionChimenea ?? (data.posicionChimenea = 'Sin_Solicitar');
        data.direccionEmpuje ?? (data.direccionEmpuje = 'Sin_Solicitar');
        // Validaciones simples
        if (!data.empresaId || !data.creadoPorId || !data.localidadId || !data.viaOrigenId || !data.locomotiveNumber) {
            return res.status(400).json({ message: 'Faltan campos obligatorios.' });
        }
        if (data.prioridad && !['ALTA', 'BAJA'].includes(data.prioridad)) {
            return res.status(400).json({ message: 'prioridad inválida (ALTA|BAJA)' });
        }
        if (data.numeroSeccion != null && Number.isNaN(Number(data.numeroSeccion))) {
            return res.status(400).json({ message: 'numeroSeccion debe ser numérico' });
        }
        const movimiento = await movimientosModel_1.MovimientoModel.nuevoMovimiento(data);
        // Notificar por FCM (no bloquea la creación)
        try {
            await NotificadorFCM_1.NotificadorFCM.notificarNuevoMovimiento(movimiento);
        }
        catch (e) {
            movimiento_controller_logger_1.movimientoControllerLogger.warn('No se pudo notificar por FCM', { error: e, movimientoId: movimiento?.id });
        }
        res.status(201).json({ message: 'Movimiento creado exitosamente', movimiento });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al crear movimiento', { error, body: req.body });
        res.status(500).json({ message: 'Error al crear movimiento', details: error?.message });
    }
};
/**
 * PATCH /movimientos/:id/prioridad
 */
MovimientoController.cambiarPrioridad = async (req, res) => {
    const id = Number(req.params.id);
    const { prioridad } = req.body;
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID de movimiento inválido' });
    if (!['ALTA', 'BAJA'].includes(prioridad)) {
        return res.status(400).json({ message: 'Valor de prioridad inválido. Debe ser "ALTA" o "BAJA"' });
    }
    try {
        // (Opcional) podrías crear MovimientoModel.obtenerMovimientoPorId para evitar traer todo
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientos();
        const original = movimientos.find(m => m.id === id);
        if (!original)
            return res.status(404).json({ message: 'Movimiento no encontrado' });
        if (original.prioridad === prioridad) {
            return res.status(200).json({ message: `El movimiento ya tiene prioridad ${prioridad}`, movimiento: original });
        }
        if (prioridad === 'ALTA') {
            movimiento_controller_logger_1.movimientoControllerLogger.info('Cambiando movimiento a ALTA prioridad', {
                id,
                estadoOriginal: original.estado,
                localidadId: original.localidadId,
            });
        }
        const movimiento = await movimientosModel_1.MovimientoModel.cambiarPrioridad(id, prioridad);
        const message = prioridad === 'ALTA' && original.estado === 'SOLICITADO'
            ? 'Prioridad actualizada a ALTA. Se reorganizaron todas las rondas.'
            : `Prioridad actualizada a ${prioridad}`;
        res.status(200).json({ message, movimiento, prioridadAnterior: original.prioridad, prioridadNueva: prioridad });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al cambiar prioridad del movimiento', { error, id, prioridad });
        res.status(500).json({ message: 'Error al cambiar prioridad del movimiento' });
    }
};
/**
 * DELETE /movimientos/:id
 */
MovimientoController.eliminarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        const eliminado = await movimientosModel_1.MovimientoModel.eliminarMovimiento(id);
        res.status(200).json({ message: 'Movimiento eliminado correctamente', eliminado });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al eliminar movimiento', { error, id });
        res.status(500).json({ message: 'Error al eliminar movimiento' });
    }
};
/**
 * GET /movimientos/pendientes
 */
MovimientoController.obtenerMovimientosPendientes = async (_req, res) => {
    try {
        const pendientes = await movimientosModel_1.MovimientoModel.obtenerMovimientosPendientes();
        res.status(200).json(pendientes);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos pendientes', { error });
        res.status(500).json({ message: 'Error al obtener movimientos pendientes' });
    }
};
/**
 * GET /movimientos/empresa/:empresaId/pendientes
 */
MovimientoController.obtenerMovimientosPendientesPorEmpresa = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId))
        return res.status(400).json({ message: 'ID de empresa inválido' });
    try {
        const pendientes = await movimientosModel_1.MovimientoModel.obtenerMovimientosPendientesPorEmpresa(empresaId);
        res.status(200).json(pendientes);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos pendientes por empresa', { error, empresaId });
        res.status(500).json({ message: 'Error al obtener movimientos pendientes por empresa' });
    }
};
/**
 * GET /movimientos/all
 */
MovimientoController.obtenerTodosLosMovimientos = async (_req, res) => {
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerTodosLosMovimientos();
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener todos los movimientos', { error });
        res.status(500).json({ message: 'Error al obtener todos los movimientos' });
    }
};
/**
 * GET /movimientos/empresa/:empresaId
 */
MovimientoController.obtenerMovimientosPorEmpresa = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId))
        return res.status(400).json({ message: 'ID de empresa inválido' });
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientosPorEmpresa(empresaId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos por empresa', { error, empresaId });
        res.status(500).json({ message: 'Error al obtener movimientos por empresa' });
    }
};
/**
 * GET /movimientos/localidad/:localidadId/pendientes
 */
MovimientoController.obtenerMovimientosPendientesPorLocalidad = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId))
        return res.status(400).json({ message: 'ID de localidad inválido' });
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientosPendientesPorLocalidad(localidadId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos pendientes por localidad', { error, localidadId });
        res.status(500).json({ message: 'Error al obtener movimientos pendientes por localidad' });
    }
};
/**
 * GET /movimientos/localidad/:localidadId/all
 */
MovimientoController.obtenerTodosMovimientosPorLocalidad = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(localidadId))
        return res.status(400).json({ message: 'ID de localidad inválido' });
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerTodosMovimientosPorLocalidad(localidadId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener todos los movimientos por localidad', { error, localidadId });
        res.status(500).json({ message: 'Error al obtener todos los movimientos por localidad' });
    }
};
/**
 * GET /movimientos/localidad/:localidadId/empresa/:empresaId
 */
MovimientoController.obtenerMovimientosPorLocalidadEmpresa = async (req, res) => {
    const localidadId = Number(req.params.localidadId);
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(localidadId) || !Number.isInteger(empresaId)) {
        return res.status(400).json({ message: 'ID de localidad o empresa inválido' });
    }
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientosPorLocalidadEmpresa(localidadId, empresaId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos por localidad y empresa', { error, localidadId, empresaId });
        res.status(500).json({ message: 'Error al obtener movimientos por localidad y empresa' });
    }
};
/**
 * GET /movimientos/empresa/:empresaId/localidad/:localidadId
 */
MovimientoController.obtenerMovimientosPorEmpresaYLocalidad = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(empresaId) || !Number.isInteger(localidadId)) {
        return res.status(400).json({ message: 'ID de empresa o localidad inválido' });
    }
    try {
        const movimientos = await movimientosModel_1.MovimientoModel.obtenerMovimientosPorEmpresaYLocalidad(empresaId, localidadId);
        res.status(200).json(movimientos);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos por empresa y localidad', { error, empresaId, localidadId });
        res.status(500).json({ message: 'Error al obtener movimientos por empresa y localidad' });
    }
};
/**
 * GET /movimientos/empresa/:empresaId/localidad/:localidadId/pendientes
 */
MovimientoController.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad = async (req, res) => {
    const empresaId = Number(req.params.empresaId);
    const localidadId = Number(req.params.localidadId);
    if (!Number.isInteger(empresaId) || !Number.isInteger(localidadId)) {
        return res.status(400).json({ message: 'ID de empresa o localidad inválido' });
    }
    try {
        const pendientes = await movimientosModel_1.MovimientoModel.obtenerMovimientosNoConcluidosPorEmpresaYLocalidad(empresaId, localidadId);
        res.status(200).json(pendientes);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener movimientos no concluidos por empresa y localidad', { error, empresaId, localidadId });
        res.status(500).json({ message: 'Error al obtener movimientos no concluidos por empresa y localidad' });
    }
};
/**
 * GET /movimientos/ronda/:rondaId/info
 */
MovimientoController.obtenerInfoPorRonda = async (req, res) => {
    const rondaId = Number(req.params.rondaId);
    if (!Number.isInteger(rondaId))
        return res.status(400).json({ message: 'ID de ronda inválido' });
    try {
        const info = await movimientosModel_1.MovimientoModel.obtenerInfoPorRonda(rondaId);
        res.status(200).json(info);
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al obtener info de ronda', { error, rondaId });
        res.status(500).json({ message: 'Error al obtener info de ronda' });
    }
};
/**
 * PATCH /movimientos/:id/iniciar
 */
MovimientoController.iniciarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    const { operadorId } = req.body;
    if (!Number.isInteger(id) || typeof operadorId !== 'number') {
        return res.status(400).json({ message: 'Datos inválidos: id o operadorId faltante o incorrecto' });
    }
    try {
        const movimiento = await movimientosModel_1.MovimientoModel.iniciarMovimiento(id, operadorId);
        res.status(200).json({ message: 'Movimiento iniciado', movimiento });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al iniciar movimiento', { id, operadorId, error });
        res.status(500).json({ message: 'Error al iniciar movimiento' });
    }
};
/**
 * PATCH /movimientos/:id/pausar
 */
MovimientoController.pausarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        const movimiento = await movimientosModel_1.MovimientoModel.pausarMovimiento(id);
        res.status(200).json({ message: 'Movimiento pausado', movimiento });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al pausar movimiento', { id, error });
        res.status(500).json({ message: 'Error al pausar movimiento' });
    }
};
/**
 * PATCH /movimientos/:id/reanudar
 */
MovimientoController.reanudarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        const movimiento = await movimientosModel_1.MovimientoModel.reanudarMovimiento(id);
        res.status(200).json({ message: 'Movimiento reanudado', movimiento });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al reanudar movimiento', { id, error });
        res.status(500).json({ message: 'Error al reanudar movimiento' });
    }
};
/**
 * PATCH /movimientos/:id/finalizar
 */
MovimientoController.finalizarMovimiento = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id))
        return res.status(400).json({ message: 'ID inválido' });
    try {
        const movimiento = await movimientosModel_1.MovimientoModel.finalizarMovimiento(id);
        res.status(200).json({ message: 'Movimiento finalizado', movimiento });
    }
    catch (error) {
        movimiento_controller_logger_1.movimientoControllerLogger.error('Error al finalizar movimiento', { id, error });
        res.status(500).json({ message: 'Error al finalizar movimiento' });
    }
};
